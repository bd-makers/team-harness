import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDoneMarker, hasDoneMarker } from '../src/handoff-marker.mjs';

// task handoff 의 완료 마커는 **파일에 남는 완료 증거**다. meta.json 이 없는 레거시 task 에서는
// `inferLegacyMeta` 가 원장과 함께 이것만 보고 done 을 판정한다.
//
// 이 파일이 생기기 전에는 생산자(`runDone`)와 소비자(`inferLegacyMeta`)가 서로 다른 모듈에
// 손으로 복사한 리터럴로만 묶여 있었다. 실측: 생산자의 em-dash 를 하이픈으로 바꾸면
// 완료된 레거시 task 가 `open` 으로 오분류되는데 609개 테스트가 전부 통과했다.
//
// 아래 테스트는 두 방향의 드리프트를 각각 막는다 —
// 왕복/바이트 모양은 **생산자** 드리프트를, 동결 fixture 는 **소비자** 드리프트를 잡는다.

test('왕복: 렌더러가 만든 마커를 파서가 반드시 알아본다', () => {
  assert.ok(hasDoneMarker(renderDoneMarker('2026-01-01T00:00:00.000Z')));
});

test('왕복: 어떤 ISO 타임스탬프에도 성립한다', () => {
  for (const ts of [
    '2026-01-01T00:00:00.000Z',
    '2026-09-06T11:22:45.611Z',
    '1999-12-31T23:59:59.999Z',
  ]) {
    assert.ok(hasDoneMarker(renderDoneMarker(ts)), ts);
  }
});

// 아래 두 fixture 는 **렌더러에서 생성하지 않는다.** 이미 디스크에 쓰인 과거 형태를 그대로
// 못박아 두는 것이 목적이므로, 렌더러가 바뀌어도 이 리터럴은 따라 바뀌면 안 된다.
// 파서를 좁히면(예: ISO 형태만 허용) 여기서 깨진다 — 그것이 지금 고치려는 사고와 같은 사고다.

test('동결 fixture: ISO 형태의 과거 마커를 계속 읽는다', () => {
  const historical = '# demo — Handoff\n\n## 2026-01-01T00:00:00.000Z — 완료\n\n태스크 종료.\n';
  assert.ok(hasDoneMarker(historical));
});

test('동결 fixture: 날짜만 있는 과거 마커도 계속 읽는다', () => {
  // tests/summary.test.mjs 가 실제로 쓰는 형태 — 타임스탬프가 아니라 날짜뿐이다.
  assert.ok(hasDoneMarker('## 2026-01-01 — 완료\n'));
});

test('마커가 없는 handoff 는 완료가 아니다', () => {
  const fresh = '# demo — Handoff\n\n(세션 종료 시 post-commit hook이 자동 갱신합니다)\n';
  assert.equal(hasDoneMarker(fresh), false);
});

// post-commit 훅이 커밋마다 쌓는 항목은 같은 `## <시각> — <텍스트>` 모양이다. 커밋 메시지가
// 하필 "완료" 로 끝나도 종결로 읽히면 안 된다 — 파서를 `/완료/` 같은 단순 포함 검사로
// "정리" 하려는 시도를 여기서 막는다.
test('커밋 항목은 메시지가 완료로 끝나도 완료 마커가 아니다', () => {
  const entry = '# demo — Handoff\n\n## 2026-01-01T00:00:00.000Z — abc1234 리팩터링 완료\n';
  assert.equal(hasDoneMarker(entry), false);
});

test('본문에 완료라는 단어가 있어도 헤딩이 아니면 완료가 아니다', () => {
  assert.equal(hasDoneMarker('# demo — Handoff\n\n이 단계는 완료\n'), false);
});

// append-only 파일에 과거 항목과 섞여 쌓이므로 출력 바이트가 바뀌면 이력이 어긋난다.
// `renderUserHandoff` 의 바이트 모양 테스트와 같은 이유로 못박는다.
test('바이트 모양: 오늘의 출력을 그대로 고정한다', () => {
  const ts = '2026-01-01T00:00:00.000Z';
  assert.equal(renderDoneMarker(ts), '\n## 2026-01-01T00:00:00.000Z — 완료\n\n태스크 종료.\n');
});
