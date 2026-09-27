import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// 현행 package.json 버전을 표방하는 docs/*.html의 버전 표지가 실제 버전과 어긋나는지 검사한다.
// `npm run docs:check`가 호출한다. 표지 옆의 산문(🆕 배너 본문 등)은 사람이 쓰며 여기서 검사하지 않는다.
//
// 분류 규칙 (docs/ 최상위 *.html, 위에서부터 첫 일치):
//   1. snapshot   — 파일명이 `-<버전>.html`로 끝난다. 그 시점의 기록이라 검사하지 않는다.
//   2. baseline   — 버전을 담은 hero 태그(`<span class="tag …">`)나 footer 중 하나라도 "기준"을 단다.
//                   기준 버전을 스스로 밝힌 문서라 현행을 표방하지 않는다 — 현행화하려면 "기준"을 떼고 등록한다.
//   3. current    — 버전을 담은 hero 태그나 footer가 있고 "기준"이 없다. documents에 표지를 등록하거나,
//                   exclusions에 사유와 함께 올려야 한다. 어느 쪽에도 없으면 검사가 실패한다.
//   4. unversioned — 그 밖. <title> 속 버전은 분류에 쓰지 않는다.

const versionPattern = /\d+\.\d+\.\d+/;
const snapshotPattern = /-\d+\.\d+(?:\.\d+)?\.html$/;

export const overviewMarkers = [
  { name: 'hero badge', pattern: /<span class="tag tag-purple">v(\d+\.\d+\.\d+)<\/span>/ },
  // 묶음 배너(`🆕 0.37.0–0.39.1`)는 상한으로 판정한다.
  { name: 'latest banner', pattern: /🆕 (?:\d+\.\d+\.\d+–)?(\d+\.\d+\.\d+)/ },
  { name: 'footer', pattern: /<footer>[^<]*?\bv(\d+\.\d+\.\d+)/ },
];

export const currentVersionDocuments = [
  { path: 'docs/harness-overview.template.html', markers: overviewMarkers },
  { path: 'docs/harness-overview.html', markers: overviewMarkers },
  // title·요약 dd는 tests/what-changes-latest-version.test.mjs가 강제한다 — 여기서는 그 테스트가 안 보는 footer만.
  {
    path: 'docs/what-changes-latest-version.html',
    markers: [{ name: 'footer', pattern: /<footer>Harness Aijient Team Plugin (\d+\.\d+\.\d+)/ }],
  },
  {
    path: 'docs/index.html',
    markers: [{ name: 'newest what-changes entry', pattern: /href="what-changes-(\d+\.\d+\.\d+)\.html"/ }],
  },
];

export const excludedCurrentDocuments = [
  {
    path: 'docs/harness-workflow-simulation.html',
    reason: '본문 시나리오가 0.40.0 기준이라 표지만 고칠 수 없다 — 본문 현행화 후 documents로 옮긴다 (docs/followups.md)',
  },
];

function versionSurfaces(html) {
  const tags = [...html.matchAll(/<span class="tag[^"]*">([^<]*)<\/span>/g)].map((match) => match[1]);
  const footers = [...html.matchAll(/<footer[^>]*>([\s\S]*?)<\/footer>|<div class="footer">([\s\S]*?)<\/div>/g)]
    .map((match) => match[1] ?? match[2]);
  return [...tags, ...footers].filter((text) => versionPattern.test(text));
}

export function classifyDocument(path, html) {
  if (snapshotPattern.test(path)) return 'snapshot';
  const surfaces = versionSurfaces(html);
  if (surfaces.some((text) => text.includes('기준'))) return 'baseline';
  return surfaces.length > 0 ? 'current' : 'unversioned';
}

export function findMarkerDrift(html, markers, version) {
  return markers.flatMap(({ name, pattern }) => {
    const found = html.match(pattern)?.[1] ?? null;
    return found === version ? [] : [{ marker: name, found }];
  });
}

export async function checkDocsVersionDrift(
  root,
  { documents = currentVersionDocuments, exclusions = excludedCurrentDocuments } = {},
) {
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const registered = new Set(documents.map((document) => document.path));
  const excluded = new Set(exclusions.map((exclusion) => exclusion.path));
  const problems = [];

  for (const { path, markers } of documents) {
    const html = await readFile(join(root, path), 'utf8');
    for (const drift of findMarkerDrift(html, markers, version)) {
      problems.push({
        path,
        message: `${drift.marker}이(가) ${drift.found ?? '없음'} — package.json은 ${version}`,
      });
    }
  }

  const names = (await readdir(join(root, 'docs'))).filter((name) => name.endsWith('.html')).sort();
  for (const name of names) {
    const path = `docs/${name}`;
    if (registered.has(path)) continue;
    const kind = classifyDocument(path, await readFile(join(root, path), 'utf8'));
    if (kind === 'current' && !excluded.has(path)) {
      problems.push({ path, message: '현행 버전을 표방하지만 검사 대상에 없다 — documents 또는 exclusions에 등록하라' });
    } else if (kind !== 'current' && excluded.has(path)) {
      problems.push({ path, message: `exclusions에 있지만 분류가 ${kind}다 — 낡은 제외 항목을 지워라` });
    }
  }
  return problems;
}
