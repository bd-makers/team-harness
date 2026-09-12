// docs/*.html 의 인라인 <script> 본문을 실행 시점에 추출한다.
//
// 사본을 저장소에 두지 않는 이유: 2026-09-13 실측에서 /tmp 에 떠 있던 추출본 셋 중
// 하나(kickoff-deck)가 이미 HTML보다 낡아 있었다. 사본은 조용히 썩고, 그 동안
// 테스트는 통과를 계속 보고한다. 추출은 그 실패 모드를 구조적으로 없앤다.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/**
 * HTML에서 인라인 <script> 본문을 꺼낸다.
 * 블록이 정확히 1개가 아니거나 외부 src를 가리키면 throw 한다 —
 * HTML 구조가 바뀌었는데 테스트가 엉뚱한 블록을 조용히 집는 것을 막는다.
 */
export function extractInlineScript(relPath) {
  const html = readFileSync(join(root, relPath), 'utf8');
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) {
    throw new Error(`${relPath}: <script> 블록이 1개여야 하는데 ${blocks.length}개 발견. 추출 전제가 깨졌다.`);
  }
  const [, attrs, body] = blocks[0];
  if (/\bsrc\s*=/.test(attrs)) {
    throw new Error(`${relPath}: 외부 script(src=)는 추출할 수 없다. 산출물은 자립형이어야 한다.`);
  }
  if (body.trim().length === 0) {
    throw new Error(`${relPath}: <script> 본문이 비어 있다.`);
  }
  return body;
}

/**
 * 추출한 산출물 스크립트를 평가하고 내부 심볼을 꺼낸다.
 * 산출물은 ESM이 아니라 클래식 스크립트라 new Function 평가가 맞는다.
 * 호출 전에 필요한 브라우저 전역(document 등)이 준비돼 있어야 한다.
 *
 * @param {string} relPath  저장소 루트 기준 HTML 경로
 * @param {string} returnExpr  스크립트 끝에 붙일 반환식 — 예: "{ SLIDES, go }"
 */
export function loadArtifactScript(relPath, returnExpr) {
  const src = extractInlineScript(relPath);
  return new Function(`${src}\n;return ${returnExpr};`)();
}
