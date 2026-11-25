import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderBrief, runBrief, stripComments } from '../src/commands/brief.mjs';
import { parseDoneEvidenceDeclaration } from '../src/commands/task.mjs';
import { listTaskRefs, taskFilePath } from '../src/task-paths.mjs';

// task-brief(결정 A3-1): 브리프는 spec 절을 그대로 옮긴 슬라이드다. 핵심 계약은 "새 사실 0" — 렌더 결과의 텍스트 노드가 모두
// spec 원문의 부분 문자열이다. 판정기는 엔티티를 풀고 공백을 접은 뒤 본다(HTML 은 공백을 접어 그린다). scenarios 값은 JSON 을 푼
// 문자열이라 그 spec 이 선언한 값도 원문으로 센다(spec R1).

const REPO = fileURLToPath(new URL('..', import.meta.url));

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const squash = (s) => s.replace(/\s+/g, ' ').trim();

function textNodes(html) {
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
  return body.split(/<[^>]*>/).map(t => squash(decode(t))).filter(Boolean);
}

// spec 에 없는 텍스트 노드 목록 — 비어 있어야 한다.
// JSON 을 푼 키·값도 원문으로 센다 — escape 를 푸는 것은 엔티티를 푸는 것과 같은 표현 변환이다(spec R1, codex 1차 P1).
function newFacts(html, spec) {
  const declaration = parseDoneEvidenceDeclaration(spec);
  const decoded = declaration.scenarios ? ['scenarios', ...declaration.scenarios.flatMap(s => [...Object.keys(s), ...Object.values(s)])] : [];
  const sources = [spec, ...decoded].map(squash);
  return textNodes(html).filter(t => !sources.some(src => src.includes(t)));
}

// 외부 참조·script 판정은 텍스트가 아니라 **마크업**을 본다 — 본문이 URL 을 언급하는 것은 괜찮다. 허용 목록이다(diagram-svg 학습).
// 그림 슬라이드(brief-diagram-svg-embed)의 `<figure><img>` 는 허용하되 `src` 는 값이 SVG data URI 일 때만 — 문서 밖 자원을 부르는
// 유일한 통로라 값까지 본다. `alt` 는 속성이라 텍스트 노드(새 사실 판정)가 아니다.
const ALLOWED_TAGS = new Set(['html', 'head', 'meta', 'title', 'style', 'body', 'main', 'section', 'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li',
  'strong', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'img']);
const ALLOWED_ATTRS = new Set(['lang', 'charset', 'name', 'content', 'class', 'alt']);
const SVG_DATA_SRC_RE = /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/;

function externalViolations(html) {
  const out = [];
  const markup = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const [tag] of markup.matchAll(/<[^>]+>/g)) {
    if (/^<!doctype/i.test(tag)) continue;
    const name = (tag.match(/^<\/?([a-zA-Z][\w-]*)/)?.[1] ?? '').toLowerCase();
    if (!ALLOWED_TAGS.has(name)) out.push(`tag ${tag}`);
    for (const [, attr, dq, sq, bare] of tag.matchAll(/\s([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const value = dq ?? sq ?? bare ?? '';
      if (attr.toLowerCase() === 'src' && name === 'img' && SVG_DATA_SRC_RE.test(value)) continue;
      if (!ALLOWED_ATTRS.has(attr.toLowerCase())) out.push(`attr ${attr} in ${tag}`);
    }
  }
  const style = markup.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  if (/url\(|@import|@font-face|expression\(/i.test(style)) out.push('style 외부 참조');
  return out;
}

const SPEC = [
  '# demo — Spec',
  '',
  '## 목적 / 요구사항',
  '*안내 문단 — 템플릿이 넣은 글이다.',
  '두 줄이다.*',
  '',
  '- **문제**: 검토가 느리다 `<name>-brief.html` 을',
  '  이어지는 줄이 있다.',
  '- **기대 결과**: **굵게 안의 `코드` 표기** 렌더.',
  '  1. 순서 하나',
  '  2. 순서 둘',
  '- 위험 문자 <script>alert(1)</script> 와 [링크](https://example.com/x) 는 글자다.',
  '',
  '주석 앞 문단',
  '<!-- 줄 사이 주석 -->',
  '주석 뒤 문단',
  '',
  '## 범위 (In / Out)',
  '**굵게** 로 시작하고 *기울임* 으로 끝나는 문단도 안내가 아니다 *',
  '',
  '- **In**: 브리프 렌더러',
  '',
  '## 원천 검토 (R1)',
  '*R1 안내 문단.*',
  '',
  '### 원천',
  '- 원천 목록은 슬라이드에 없다',
  '',
  '### 발견',
  '- (unresolved) 두 원천이 충돌한다 → 결정: 첫째를 따른다',
  '- 백틱 안 `(open)` 은 언급이다',
  '- 검토 완료: 2026-11-18',
  '',
  '## 설계 / 접근',
  '설계 머리 문단이다.',
  '',
  '| 구분 줄이 없으면 - 표가 아니다',
  '| 둘째 - 줄도 글자다',
  '',
  '*본문 중간의 기울임 문단은 작성자 글이다*',
  '',
  '### 렌더러',
  '| 요소 | 렌더 |',
  '|---|:---:|',
  '| 목록 | `<ul>` |',
  '| 굵게 | **strong** |',
  '',
  '```js',
  'const x = "<b>코드 펜스</b>";',
  '## 펜스 안 제목은 제목이 아니다',
  '```',
  '',
  '#### 작은 제목',
  '- 중첩 상위',
  '  - 중첩 하위 (ask:디자이너) 색상 토큰은?',
  '',
  '## Ontology',
  '**굵게로 시작하는 문단은 안내가 아니다**',
  '',
  '- **브리프**: 슬라이드다',
  '- 코드 안 `a**b` 와 `c**d` 는 굵게가 아니다',
  '',
  '## Ambiguity 자가진단',
  '- [x] **Goal 명확도** 자가진단 문구는 슬라이드에 없다',
  '',
  '<!-- 선택 선언. 아래 주석 예시',
  '     { "version": 1, "review": "required" } -->',
  '## Done evidence',
  '',
  '```json',
  '{ "version": 1, "scenarios": [{ "id": "S1", "given": "spec 이 있다", "when": "brief 를 돌린다", "then": "슬라이드가 생긴다",',
  '  "test": "tests/brief-command.test.mjs", "cmd": "node --test --test-name-pattern=\\"brief\\" tests/brief-command.test.mjs" }] }',
  '```',
  '',
  '## 참고',
  '- (open) 열람 플러그인은 미검증',
  '- (open → 후속 task) ship 단계',
  '- (asked:PM 2026-11-18 https://example.com/q) 일정은?',
  '- (answered https://example.com/a) 답은 왔다',
  '- (interview, unresolved) 출처와 묶인 충돌',
  '- 참고의 일반 항목은 슬라이드에 없다',
  '- (openness) 는 태그가 아니다',
  '- (open 아님, 의도적 제외) 산문이다',
  '- (ask:) 역할 없는 태그는 태그가 아니다',
  '',
].join('\n');

// <li> 텍스트 목록(태그 제거) — 열린 항목 슬라이드처럼 항목 단위로 비교할 때 쓴다.
const liTexts = (html) => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => squash(decode(m[1].replace(/<[^>]+>/g, ''))));
const slidesOf = (html) => [...html.matchAll(/<section class="slide[^"]*">([\s\S]*?)<\/section>/g)].map(m => m[1]);

// ---- 새 사실 0 ----

test('brief: 렌더 결과의 텍스트 노드가 모두 spec 원문(또는 그 spec 이 선언한 scenarios 값)의 부분 문자열이다', () => {
  const { html } = renderBrief(SPEC);
  assert.deepEqual(newFacts(html, SPEC), []);
  const nodes = textNodes(html);
  for (const phrase of ['demo — Spec', '검토가 느리다', '중첩 하위', '<b>코드 펜스</b>', 'S1', 'node --test --test-name-pattern="brief" tests/brief-command.test.mjs']) {
    assert.ok(nodes.some(n => n.includes(phrase)), `텍스트 노드에 "${phrase}"`);
  }
});

test('brief: 판정기 음성 대조 — spec 에 없는 문자열·장식 글자를 하나 넣으면 판정이 실패한다', () => {
  const { html } = renderBrief(SPEC);
  for (const foreign of ['<p>spec 에 없는 문장</p>', '<p>1 / 7</p>', '<p>출처: 설계</p>']) {
    const injected = html.replace('</main>', `${foreign}</main>`);
    assert.equal(newFacts(injected, SPEC).length, 1, foreign);
  }
});

// 표본이 아니라 실제 입력 전체에 대한 성질 — 렌더러가 텍스트를 붙이거나 지어내면 여기서 잡힌다.
test('brief: 이 저장소의 모든 task spec 이 새 사실 0·외부 참조 0 을 통과한다', async () => {
  const refs = await listTaskRefs(REPO);
  assert.ok(refs.length >= 100, `task spec ${refs.length}개`);
  for (const { user, task } of refs) {
    const spec = readFileSync(taskFilePath(REPO, user, task, 'spec.md'), 'utf8');
    const { html } = renderBrief(spec);
    assert.deepEqual(newFacts(html, spec), [], `${user}/${task}`);
    assert.deepEqual(externalViolations(html), [], `${user}/${task}`);
  }
});

// ---- 외부 참조 0·escape ----

test('brief: script·외부 참조 0 — spec 의 <script>·링크 문법은 글자로 escape 된다', () => {
  const { html } = renderBrief(SPEC);
  assert.deepEqual(externalViolations(html), []);
  assert.ok(html.includes('위험 문자 &lt;script&gt;alert(1)&lt;/script&gt; 와 [링크](https://example.com/x) 는 글자다.'));
  assert.doesNotMatch(html, /<script|<a\s|href=|src=/i);
});

test('brief: 외부 참조 판정기 음성 대조 — 금지 태그·속성·style 참조를 넣으면 잡는다', () => {
  const { html } = renderBrief(SPEC);
  const cases = [
    html.replace('</main>', '<img src="x.png"></main>'),
    html.replace('</main>', '<img src="http://example.com/x.svg"></main>'),
    html.replace('</main>', '<img src="data:text/html;base64,PHNjcmlwdD4="></main>'),
    html.replace('</main>', '<img src="data:image/svg+xml,<svg/>"></main>'),
    html.replace('</main>', '<p src="data:image/svg+xml;base64,PHN2Zy8+">a</p></main>'),
    html.replace('</main>', '<p onclick="x()">a</p></main>'),
    html.replace('</main>', '<script>1</script></main>'),
    html.replace('<style>', '<style>@import "x.css";'),
    html.replace('<style>', '<style>body{background:url(x.png)}'),
  ];
  for (const bad of cases) assert.ok(externalViolations(bad).length > 0, bad.slice(0, 80));
});

// ---- 렌더 범위 ----

test('brief: 정해진 절만 spec 순서로 — 원천 목록·자가진단·참고 일반 항목·안내 문단·주석 예시는 없다', () => {
  const result = renderBrief(SPEC);
  const { html } = result;
  for (const absent of ['원천 목록은 슬라이드에 없다', '자가진단 문구는 슬라이드에 없다', '참고의 일반 항목은 슬라이드에 없다',
    '안내 문단', 'R1 안내 문단', '&quot;review&quot;', '선택 선언']) {
    assert.ok(!html.includes(absent), `없어야 함: ${absent}`);
  }
  assert.ok(html.includes('<p><strong>굵게로 시작하는 문단은 안내가 아니다</strong></p>'), '굵게로 시작·끝나는 문단은 안내 문단이 아니다');
  assert.ok(html.includes('<p><strong>굵게</strong> 로 시작하고 *기울임* 으로 끝나는 문단도 안내가 아니다 *</p>'), '단일 * 로 끝나도 ** 로 시작하면 안내 문단이 아니다');
  assert.deepEqual(result.titles, [
    '목적 / 요구사항', '범위 (In / Out)', '원천 검토 (R1) › 발견', '설계 / 접근', '설계 / 접근 › 렌더러', 'Ontology', '(open)', 'Done evidence › scenarios',
  ]);
  assert.equal(result.slides, 8);
  const slides = slidesOf(html);
  assert.equal(slides.length, 9, '표지 + 8');
  assert.equal(slides[0], '<h1>demo — Spec</h1>');
  assert.ok(slides[3].startsWith('<p class="src">원천 검토 (R1)</p><h2>발견</h2>'), '하위 절 슬라이드는 위 절 제목을 출처 표지로 단다');
  assert.ok(slides[5].startsWith('<p class="src">설계 / 접근</p><h2>렌더러</h2>'));
  assert.ok(slides[4].startsWith('<h2>설계 / 접근</h2><p>설계 머리 문단이다.</p>'));
  assert.match(html, /<title>demo — Spec<\/title>/);
  assert.deepEqual(result.missing, []);
});

test('brief: 마크다운 부분집합 — 목록 중첩·이음 줄·굵게 안 코드·표·코드 펜스·작은 제목', () => {
  const { html } = renderBrief(SPEC);
  assert.ok(html.includes('<li><strong>문제</strong>: 검토가 느리다 <code>&lt;name&gt;-brief.html</code> 을\n이어지는 줄이 있다.</li>'), '이음 줄');
  assert.ok(html.includes('<strong>굵게 안의 <code>코드</code> 표기</strong> 렌더.<ol><li>순서 하나</li><li>순서 둘</li></ol></li>'), '굵게 안 코드·순서 목록 중첩');
  assert.ok(html.includes('<table><thead><tr><th>요소</th><th>렌더</th></tr></thead><tbody><tr><td>목록</td><td><code>&lt;ul&gt;</code></td></tr><tr><td>굵게</td><td><strong>strong</strong></td></tr></tbody></table>'), '표');
  assert.ok(html.includes('<pre><code>const x = &quot;&lt;b&gt;코드 펜스&lt;/b&gt;&quot;;\n## 펜스 안 제목은 제목이 아니다</code></pre>'), '펜스 안 # 은 제목이 아니다');
  assert.ok(html.includes('<h3>작은 제목</h3><ul><li>중첩 상위<ul><li>중첩 하위 (ask:디자이너) 색상 토큰은?</li></ul></li></ul>'), '작은 제목·중첩');
  assert.ok(html.includes('<p>| 구분 줄이 없으면 - 표가 아니다\n| 둘째 - 줄도 글자다</p>'), '구분 줄 없는 파이프 줄은 표가 아니다 — 둘째 줄을 잃지 않는다');
  assert.ok(html.includes('<p>주석 앞 문단</p><p>주석 뒤 문단</p>'), '걷은 주석 자리는 문단 경계다 — 앞뒤 줄이 붙지 않는다');
  assert.ok(html.includes('<p>*본문 중간의 기울임 문단은 작성자 글이다*</p>'), '안내 문단은 절 첫 블록일 때만 버린다');
  assert.ok(html.includes('<li>코드 안 <code>a**b</code> 와 <code>c**d</code> 는 굵게가 아니다</li>'), '코드 안 ** 는 굵게 짝이 아니다');
});

test('brief: 열린 항목 — 목록 항목의 맨 글자 태그만 모아 그 절 제목으로 묶는다(백틱 안·태그 아닌 괄호 제외)', () => {
  const result = renderBrief(SPEC);
  const open = slidesOf(result.html).find(s => !s.includes('<h1>') && !s.includes('<h2>'));
  assert.ok(open, '열린 항목 슬라이드');
  assert.deepEqual([...open.matchAll(/<p class="src">([^<]*)<\/p>/g)].map(m => m[1]), ['발견', '렌더러', '참고']);
  assert.deepEqual(liTexts(open), [
    '(unresolved) 두 원천이 충돌한다 → 결정: 첫째를 따른다',
    '중첩 하위 (ask:디자이너) 색상 토큰은?',
    '(open) 열람 플러그인은 미검증',
    '(open → 후속 task) ship 단계',
    '(asked:PM 2026-11-18 https://example.com/q) 일정은?',
    '(answered https://example.com/a) 답은 왔다',
    '(interview, unresolved) 출처와 묶인 충돌',
  ]);
  assert.equal(result.openItems, 7);
});

test('brief: 열린 항목이 없으면 그 슬라이드도 없다', () => {
  const result = renderBrief('# x\n\n## 목적 / 요구사항\n- 백틱 안 `(open)` 은 언급이다\n');
  assert.equal(result.openItems, 0);
  assert.deepEqual(result.titles, ['목적 / 요구사항']);
});

// codex 1차 리뷰 회귀 — 각 항목이 고친 동작 하나를 고정한다.
test('brief: 느슨한 목록·목록 종류 전환·칸 수가 다른 구분 줄·escape 된 굵게', () => {
  const md = (body) => renderBrief(`# x\n\n## Ontology\n${body}\n`).html;
  assert.ok(md('- 상위\n\n  - 빈 줄 뒤 하위\n\n- 같은 목록 다음 항목').includes('<ul><li>상위<ul><li>빈 줄 뒤 하위</li></ul></li><li>같은 목록 다음 항목</li></ul>'));
  assert.ok(md('- 상위\n\n  항목 안 문단').includes('<ul><li>상위\n항목 안 문단</li></ul>'));
  assert.ok(md('- 글머리\n1. 번호').includes('<ul><li>글머리</li></ul><ol><li>번호</li></ol>'));
  assert.ok(md('- 앞 목록\n\n뒤 문단').includes('<ul><li>앞 목록</li></ul><p>뒤 문단</p>'));
  assert.ok(md('| a | b |\n|---|\n| c | d |').includes('<p>| a | b |\n|---|\n| c | d |</p>'), '구분 줄 칸 수가 다르면 표가 아니다');
  assert.ok(!md('\\**글자 그대로**').includes('<strong>'), '\\** 는 굵게를 열지 않는다');
});

test('brief: JSON escape 로 쓴 scenarios 키·값도 판정은 푼 문자열을 원문으로 센다', () => {
  const spec = '# x\n\n## Done evidence\n\n```json\n{ "version": 1, "\\u0073cenarios": [{ "id": "S1", "\\u0067iven": "a\\u0020b", "when": "w", "then": "t", "test": "x", "cmd": "true" }] }\n```\n';
  const { html, scenarios } = renderBrief(spec);
  assert.equal(scenarios, 1);
  assert.ok(html.includes('<th>given</th><td>a b</td>'));
  assert.deepEqual(newFacts(html, spec), []);
});

// ---- scenarios ----

test('brief: scenarios 는 done 가드가 configured 로 읽은 선언만 렌더한다', () => {
  const { html, scenarios } = renderBrief(SPEC);
  assert.equal(scenarios, 1);
  assert.ok(html.includes('<p class="src">Done evidence</p><h2>scenarios</h2><table><tbody><tr><th>id</th><td>S1</td></tr><tr><th>given</th><td>spec 이 있다</td></tr>'));
  assert.ok(html.includes('<tr><th>cmd</th><td>node --test --test-name-pattern=&quot;brief&quot; tests/brief-command.test.mjs</td></tr>'));

  const commented = SPEC.replace('```json\n{ "version": 1, "scenarios"', '<!--\n```json\n{ "version": 1, "scenarios"').replace('tests/brief-command.test.mjs" }] }\n```', 'tests/brief-command.test.mjs" }] }\n```\n-->');
  const c = renderBrief(commented);
  assert.equal(c.scenarios, 0, '주석 처리된 예시는 선언이 아니다');
  assert.ok(!c.html.includes('<h2>scenarios</h2>'));
  assert.ok(!c.html.includes('spec 이 있다'));

  const invalid = renderBrief(SPEC.replace(/```json\n[\s\S]*?\n```/, '```json\n{ "version": 1, "scenarios": [] }\n```'));
  assert.equal(invalid.scenarios, 0);
  assert.match(invalid.scenarioIssue, /scenarios/);
  assert.ok(!invalid.html.includes('<h2>scenarios</h2>'));
});

// ---- 결정론·고정 산출물 ----

test('brief: 결정론 — 같은 spec 이면 같은 바이트, style 은 spec 과 무관한 고정 문자열이다', () => {
  assert.equal(renderBrief(SPEC).html, renderBrief(SPEC).html);
  const styleOf = (html) => html.match(/<style>[\s\S]*?<\/style>/)[0];
  assert.equal(styleOf(renderBrief(SPEC).html), styleOf(renderBrief('# 다른 spec\n\n## Ontology\n- 하나\n').html));
});

test('brief: 슬라이드는 CSS scroll-snap 이고 글꼴은 system font stack 이다(외부 글꼴 없음)', () => {
  const { html } = renderBrief(SPEC);
  assert.ok(html.includes('html{scroll-snap-type:y mandatory}'));
  assert.match(html, /\.slide\{[^}]*min-height:100vh[^}]*scroll-snap-align:start/);
  assert.match(html, /body\{[^}]*font:[^;}]*system-ui,-apple-system/);
  assert.match(html, /^<!doctype html>\n/);
});

test('stripComments: 줄머리 주석 블록만 걷고 꼬리는 남긴다 — 펜스 안·줄 중간 주석은 글자다', () => {
  assert.deepEqual(stripComments(['a', '<!-- x', 'y --> 꼬리', 'b']), ['a', '', ' 꼬리', 'b']);
  assert.deepEqual(stripComments(['  <!-- 한 줄 -->', 'b']), ['', 'b']);
  assert.deepEqual(stripComments(['```', '<!-- 펜스 안 -->', '```']), ['```', '<!-- 펜스 안 -->', '```']);
  assert.deepEqual(stripComments(['글 <!-- 중간 --> 뒤']), ['글 <!-- 중간 --> 뒤']);
});

// ---- 뷰 SVG 그림 슬라이드 (brief-diagram-svg-embed) ----

// 0.58.4 의 `renderBrief(SPEC).html` — 인자 하나 호출은 이 바이트를 지킨다(다운스트림 래퍼가 직접 import 한다).
const BASELINE_0584_SHA256 = '4e4a0e4baa1bc91433f4f43aa27cf15e59669d1f128062a497187762a1dc393b';
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// 자립성 판정(svgSelfContainmentViolations)을 통과하는 SVG. 안의 글자는 spec 에 없는 문자열이라 새 나가면 새 사실 판정이 잡는다.
const svgOf = (label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><style>.t{fill:#111}</style><rect id="r" width="120" height="40" fill="#eef"/><text class="t" x="8" y="24">SVG-ONLY ${label}</text></svg>\n`;
const DIAGRAMS = [
  { view: 'sequence', rel: 'docs/tester/demo/demo-diagram-sequence.svg', svg: svgOf('sequence') },
  { view: 'module', rel: 'docs/tester/demo/demo-diagram-module.svg', svg: svgOf('module') },
];
const figureSlides = (html) => slidesOf(html).filter(s => s.startsWith('<figure>'));

test('brief: 뷰 없는 renderBrief 는 0.58.4 와 같은 바이트다 — 인자 하나·빈 옵션·빈 목록 모두', () => {
  const one = renderBrief(SPEC).html;
  assert.equal(sha256(one), BASELINE_0584_SHA256);
  assert.equal(renderBrief(SPEC, {}).html, one);
  assert.equal(renderBrief(SPEC, { diagrams: [] }).html, one);
  assert.equal(renderBrief(SPEC).diagrams, 0);
  assert.doesNotMatch(one, /figure/);
});

test('brief: 뷰는 설계 절의 마지막 슬라이드 뒤에 sequence → module 순서로 실린다', () => {
  const result = renderBrief(SPEC, { diagrams: DIAGRAMS });
  assert.deepEqual(result.titles, [
    '목적 / 요구사항', '범위 (In / Out)', '원천 검토 (R1) › 발견', '설계 / 접근', '설계 / 접근 › 렌더러', 'diagram:sequence', 'diagram:module',
    'Ontology', '(open)', 'Done evidence › scenarios',
  ]);
  assert.equal(result.slides, 10);
  assert.equal(result.diagrams, 2);
  const slides = slidesOf(result.html);
  assert.ok(slides[5].startsWith('<p class="src">설계 / 접근</p><h2>렌더러</h2>'), '설계 하위 절 슬라이드를 가르지 않는다');
  for (const [i, d] of DIAGRAMS.entries()) {
    const b64 = Buffer.from(d.svg, 'utf8').toString('base64');
    assert.equal(slides[6 + i], `<figure><img src="data:image/svg+xml;base64,${b64}" alt="${d.rel}"></figure>`);
  }
  assert.ok(slides[8].startsWith('<h2>Ontology</h2>'));
});

test('brief: 설계 절이 없으면 마지막 spec 절 슬라이드 뒤(열린 항목 앞), spec 절이 없으면 맨 앞이다', () => {
  const noDesign = renderBrief('# x\n\n## 목적 / 요구사항\n- 하나\n\n## Ontology\n- 둘\n\n## 참고\n- (open) 미정\n', { diagrams: DIAGRAMS });
  assert.deepEqual(noDesign.titles, ['목적 / 요구사항', 'Ontology', 'diagram:sequence', 'diagram:module', '(open)']);
  const onlyOpen = renderBrief('# x\n\n## 참고\n- (open) 미정\n', { diagrams: DIAGRAMS.slice(1) });
  assert.deepEqual(onlyOpen.titles, ['diagram:module', '(open)']);
});

test('brief: 그림 슬라이드도 새 사실 0·script 0·외부 자산 0 — SVG 안 글자는 텍스트 노드가 아니다', () => {
  const { html } = renderBrief(SPEC, { diagrams: DIAGRAMS });
  assert.deepEqual(newFacts(html, SPEC), []);
  assert.deepEqual(externalViolations(html), []);
  assert.ok(!textNodes(html).some(t => t.includes('SVG-ONLY')), 'SVG 글자가 문서 텍스트로 새지 않는다');
  assert.doesNotMatch(html, /<script|src="http|url\(http/i);
  assert.equal(figureSlides(html).length, 2);
  assert.match(html, /<style>[\s\S]*figure img\{[^}]*\}\n<\/style>/, '그림 CSS 는 뷰가 있을 때만 붙는다');
  // 음성 대조: 그림 슬라이드에 보이는 글자를 붙이면 판정이 잡는다.
  assert.equal(newFacts(html.replace('</figure>', '<p>sequence diagram</p></figure>'), SPEC).length, 1);
});

test('brief: 이 저장소의 모든 task spec 에 뷰를 실어도 새 사실 0·외부 참조 0 이다', async () => {
  for (const { user, task } of await listTaskRefs(REPO)) {
    const spec = readFileSync(taskFilePath(REPO, user, task, 'spec.md'), 'utf8');
    const { html } = renderBrief(spec, { diagrams: DIAGRAMS });
    assert.deepEqual(newFacts(html, spec), [], `${user}/${task}`);
    assert.deepEqual(externalViolations(html), [], `${user}/${task}`);
  }
});

test('brief: 뷰를 실어도 결정론 — 같은 spec·같은 SVG 면 같은 바이트', () => {
  assert.equal(renderBrief(SPEC, { diagrams: DIAGRAMS }).html, renderBrief(SPEC, { diagrams: DIAGRAMS.map(d => ({ ...d })) }).html);
});

// ---- CLI ----

async function fixture({ spec = SPEC, active = true, views = {} } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-brief-cmd-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  if (active) await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  await mkdir(join(dir, 'docs', 'tester', 'demo'), { recursive: true });
  if (spec !== null) await writeFile(join(dir, 'docs', 'tester', 'demo', 'demo-spec.md'), spec);
  for (const [view, svg] of Object.entries(views)) await writeFile(join(dir, 'docs', 'tester', 'demo', `demo-diagram-${view}.svg`), svg);
  return dir;
}

async function capture(fn) {
  const logs = [];
  const errs = [];
  const origLog = console.log;
  const origErr = console.error;
  const prevExit = process.exitCode;
  process.exitCode = undefined;
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => errs.push(a.join(' '));
  try {
    await fn();
    return { logs, errs, exitCode: process.exitCode };
  } finally {
    console.log = origLog;
    console.error = origErr;
    process.exitCode = prevExit;
  }
}

const run = (dir, flags = {}, args = []) => runBrief({ targetDir: dir, flags, taskArgs: args });
const briefPath = (dir) => join(dir, 'docs', 'tester', 'demo', 'demo-brief.html');

test('brief CLI: 활성 task spec 을 <name>-brief.html 로 쓰고, spec 을 고쳐 다시 돌리면 덮어쓴다', async () => {
  const dir = await fixture();
  try {
    const r = await capture(() => run(dir));
    assert.equal(r.exitCode, undefined, r.logs.join('\n'));
    assert.match(r.logs[0], /^✓ brief: docs\/tester\/demo\/demo-brief\.html 에 슬라이드 8장/);
    assert.equal(await readFile(briefPath(dir), 'utf8'), renderBrief(SPEC).html);

    const changed = SPEC.replace('브리프 렌더러', '바뀐 범위');
    await writeFile(join(dir, 'docs', 'tester', 'demo', 'demo-spec.md'), changed);
    await capture(() => run(dir));
    assert.equal(await readFile(briefPath(dir), 'utf8'), renderBrief(changed).html);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: --json envelope 은 산출물·슬라이드 수·절·빠진 절을 싣는다', async () => {
  const dir = await fixture({ spec: '# demo — Spec\n\n## 목적 / 요구사항\n- 하나\n\n## Ontology\n- 둘\n' });
  try {
    const r = await capture(() => run(dir, { json: true }));
    const env = JSON.parse(r.logs.join('\n'));
    assert.equal(env.command, 'brief');
    assert.equal(env.status, 'success');
    assert.deepEqual(env.artifacts, ['docs/tester/demo/demo-brief.html']);
    assert.equal(env.stage, 'spec');
    assert.equal(env.slides, 2);
    assert.deepEqual(env.sections, ['목적 / 요구사항', 'Ontology']);
    assert.deepEqual(env.missing, ['## 범위', '## 원천 검토 › ### 발견', '## 설계']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 빠진 절은 슬라이드 없이 출력에만 알린다 — 자리표시 슬라이드를 만들지 않는다', async () => {
  const dir = await fixture({ spec: '# demo — Spec\n\n## 목적 / 요구사항\n- 하나\n\n## 범위 (In / Out)\n*안내뿐*\n\n## 원천 검토 (R1)\n### 원천\n- 목록만\n\n## Ontology\n' });
  try {
    const r = await capture(() => run(dir));
    assert.equal(r.exitCode, undefined);
    assert.ok(r.logs.some(l => l === '  빠진 절(없거나 비어 있음): ## 범위 · ## 원천 검토 › ### 발견 · ## 설계 · ## Ontology'), r.logs.join('\n'));
    assert.equal(slidesOf(await readFile(briefPath(dir), 'utf8')).length, 2, '표지 + 목적');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 자립성을 통과한 뷰 SVG 만 싣고, 없음·거부는 실패 없이 콘솔과 JSON 에 남긴다', async () => {
  const bad = svgOf('module').replace('<rect', '<script>alert(1)</script><a href="https://example.com/x"><rect onclick="x()"').replace('</svg>', '</a></svg>');
  const dir = await fixture({ views: { sequence: svgOf('sequence'), module: bad } });
  try {
    const r = await capture(() => run(dir));
    assert.equal(r.exitCode, undefined, r.logs.join('\n'));
    assert.match(r.logs[0], /슬라이드 9장 \(spec 절 \+ 뷰 SVG 1장 — 새 사실 0\)$/);
    assert.ok(r.logs.some(l => /^ {2}뷰 SVG: sequence 실림 · module 거부\(.+ 외 \d+건\)$/.test(l)), r.logs.join('\n'));
    const html = await readFile(briefPath(dir), 'utf8');
    assert.equal(html, renderBrief(SPEC, { diagrams: [{ view: 'sequence', rel: 'docs/tester/demo/demo-diagram-sequence.svg', svg: svgOf('sequence') }] }).html);
    assert.equal(figureSlides(html).length, 1);
    assert.ok(!html.includes(Buffer.from(bad, 'utf8').toString('base64')), '거부된 SVG 는 슬라이드에 없다');
    assert.doesNotMatch(html, /<script|src="http|url\(http/i);

    const j = await capture(() => run(dir, { json: true }));
    const env = JSON.parse(j.logs.join('\n'));
    assert.equal(env.status, 'success');
    assert.deepEqual(env.diagrams.map(d => [d.view, d.path, d.status]), [
      ['sequence', 'docs/tester/demo/demo-diagram-sequence.svg', 'embedded'],
      ['module', 'docs/tester/demo/demo-diagram-module.svg', 'rejected'],
    ]);
    assert.deepEqual(env.diagrams[0].violations, []);
    const v = env.diagrams[1].violations.join('\n');
    for (const re of [/스크립트 요소/, /외부 href/, /이벤트 핸들러/]) assert.match(v, re);
    assert.ok(env.sections.includes('diagram:sequence') && !env.sections.includes('diagram:module'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 태그 짝이 어긋난 뷰 SVG 는 rejected — 깨진 그림을 embedded 로 싣지 않는다', async () => {
  const bad = svgOf('module').replace('<rect', '<g><rect').replace('fill="#eef"/>', 'fill="#eef"></g></rect>');
  const dir = await fixture({ views: { sequence: svgOf('sequence'), module: bad } });
  try {
    const r = await capture(() => run(dir, { json: true }));
    assert.equal(r.exitCode, undefined, r.logs.join('\n'));
    const env = JSON.parse(r.logs.join('\n'));
    assert.equal(env.status, 'success');
    assert.deepEqual(env.diagrams.map(d => [d.view, d.status, d.violations]), [
      ['sequence', 'embedded', []],
      ['module', 'rejected', ['태그 구조: </g> 가 <rect> 를 닫음']],
    ]);
    const html = await readFile(briefPath(dir), 'utf8');
    assert.equal(figureSlides(html).length, 1);
    assert.ok(!html.includes(Buffer.from(bad, 'utf8').toString('base64')), '거부된 SVG 는 슬라이드에 없다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 뷰 파일이 없으면 missing — 출력 HTML 은 뷰 없는 렌더와 같고 summary 도 그대로다', async () => {
  const dir = await fixture();
  try {
    const r = await capture(() => run(dir, { json: true }));
    const env = JSON.parse(r.logs.join('\n'));
    assert.deepEqual(env.diagrams, [
      { view: 'sequence', path: 'docs/tester/demo/demo-diagram-sequence.svg', status: 'missing', violations: [] },
      { view: 'module', path: 'docs/tester/demo/demo-diagram-module.svg', status: 'missing', violations: [] },
    ]);
    assert.match(env.summary, /슬라이드 8장 \(spec 절만 — 새 사실 0\)$/);
    assert.equal(await readFile(briefPath(dir), 'utf8'), renderBrief(SPEC).html);
    const t = await capture(() => run(dir));
    assert.ok(t.logs.includes('  뷰 SVG: sequence 없음 · module 없음'), t.logs.join('\n'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 뷰 경로를 읽을 수 없으면(디렉터리) 그 뷰만 rejected 로 빼고 brief 는 성공한다', async () => {
  const dir = await fixture({ views: { module: svgOf('module') } });
  try {
    await mkdir(join(dir, 'docs', 'tester', 'demo', 'demo-diagram-sequence.svg'));
    const r = await capture(() => run(dir, { json: true }));
    const env = JSON.parse(r.logs.join('\n'));
    assert.equal(r.exitCode, undefined);
    assert.equal(env.status, 'success');
    assert.deepEqual(env.diagrams.map(d => [d.view, d.status]), [['sequence', 'rejected'], ['module', 'embedded']]);
    assert.match(env.diagrams[0].violations[0], /^읽기 실패: EISDIR$/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 레거시 <name>-diagram.html 은 싣지 않는다', async () => {
  const dir = await fixture();
  try {
    await writeFile(join(dir, 'docs', 'tester', 'demo', 'demo-diagram.html'), `<!doctype html><html><body>${svgOf('legacy')}<script>1</script></body></html>`);
    await capture(() => run(dir));
    assert.equal(await readFile(briefPath(dir), 'utf8'), renderBrief(SPEC).html);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 뷰 SVG 만 있고 렌더할 spec 절이 없으면 exit 1 이고 아무것도 쓰지 않는다', async () => {
  const dir = await fixture({ spec: '# demo — Spec\n\n## 목적 / 요구사항\n*안내뿐*\n\n## 참고\n- 일반 항목\n', views: { sequence: svgOf('sequence'), module: svgOf('module') } });
  try {
    const r = await capture(() => run(dir));
    assert.equal(r.exitCode, 1);
    assert.match(r.logs[0], /렌더할 절이 없음/);
    assert.equal(existsSync(briefPath(dir)), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 렌더할 절이 하나도 없으면 exit 1 이고 아무것도 쓰지 않는다', async () => {
  const dir = await fixture({ spec: '# demo — Spec\n\n## 목적 / 요구사항\n*안내뿐*\n\n## 범위 (In / Out)\n\n## 참고\n- 일반 항목\n' });
  try {
    const r = await capture(() => run(dir));
    assert.equal(r.exitCode, 1);
    assert.match(r.logs[0], /렌더할 절이 없음/);
    assert.equal(existsSync(briefPath(dir)), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('brief CLI: 활성 task 없음·spec 없음은 exit 1, 아무것도 쓰지 않는다', async () => {
  for (const opts of [{ active: false }, { spec: null }]) {
    const dir = await fixture(opts);
    try {
      const r = await capture(() => run(dir));
      assert.equal(r.exitCode, 1, JSON.stringify(opts));
      assert.match(r.logs[0], opts.active === false ? /활성 task 없음/ : /demo-spec\.md 이 없음/);
      assert.equal(existsSync(briefPath(dir)), false);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('brief CLI: 위치 인자·모르는 --stage 는 exit 2, 아무것도 쓰지 않는다', async () => {
  const dir = await fixture();
  try {
    for (const [flags, args, re] of [[{}, ['extra'], /위치 인자를 받지 않음: extra/], [{ stage: 'ship' }, [], /알 수 없는 --stage "ship"/]]) {
      const r = await capture(() => run(dir, flags, args));
      assert.equal(r.exitCode, 2);
      assert.match(r.errs[0], re);
    }
    assert.equal(existsSync(briefPath(dir)), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
