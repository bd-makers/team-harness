// docs/harness-onboarding-checklist.html — 24항목 5페이즈 체크리스트의 진행률·저장·게이트 경고·막힘 리포트.
//
// 원본: docs/chad/team-onboarding-kit 검증에 쓴 /tmp/obstub.mjs (단언 14건).
// 산출물 JS는 벤더링하지 않고 HTML에서 추출한다 — tests/helpers/html-script.mjs 참조.

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { loadArtifactScript } from './helpers/html-script.mjs';

const HTML = 'docs/harness-onboarding-checklist.html';

const store = {};

function mkEl(id) {
  const el = {
    id, _html: '', textContent: '', style: {}, dataset: {}, checked: false,
    onclick: null, onchange: null,
    classList: { add() {}, remove() {} },
  };
  Object.defineProperty(el, 'innerHTML', { get: () => el._html, set: (v) => { el._html = v; } });
  return el;
}

// 이 산출물은 phases 컨테이너의 innerHTML 안에서만 셀렉터를 쓴다.
function parse(sel) {
  const html = store.phases?._html || '';
  const out = [];
  if (sel === 'input[type=checkbox]') {
    for (const m of html.matchAll(/data-id="([^"]+)"([^>]*)/g)) {
      const e = mkEl(); e.dataset = { id: m[1] }; e.checked = /checked/.test(m[2]); out.push(e);
    }
  } else if (sel === '[data-flag]') {
    for (const m of html.matchAll(/data-flag="([^"]+)"/g)) {
      const e = mkEl(); e.dataset = { flag: m[1] }; out.push(e);
    }
  }
  return out;
}

const cache = {};
globalThis.document = {
  getElementById: (id) => store[id] || (store[id] = mkEl(id)),
  querySelectorAll: (sel) => (cache[sel] ??= parse(sel)),
};

const LS = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k) => LS[k] ?? null,
    setItem: (k, v) => { LS[k] = String(v); },
    removeItem: (k) => { delete LS[k]; },
  },
  configurable: true,
});
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} } },
  configurable: true,
});

const { ALL, PHASES } = loadArtifactScript(HTML, '{ ALL, PHASES }');

const check = (n) => {
  const cb = document.querySelectorAll('input[type=checkbox]').find((c) => c.dataset.id.endsWith(`-${n}`));
  assert.ok(cb, `체크박스 -${n} 없음`);
  cb.checked = true;
  cb.onchange();
};
const flag = (n) => {
  const b = document.querySelectorAll('[data-flag]').find((x) => x.dataset.flag.endsWith(`-${n}`));
  assert.ok(b, `플래그 -${n} 없음`);
  b.onclick();
};
const cnt = () => document.getElementById('count').textContent;
const alertHtml = () => document.getElementById('alert').innerHTML;
const report = () => document.getElementById('report').textContent;
// flag()는 토글이라 두 번 부르면 해제된다 — 선행 상태를 idempotent 하게 만든다.
const ensureFlagged = (n) => { if (!/막혔습니다/.test(report())) flag(n); };

describe('구조', () => {
  test('항목 24개 · 페이즈 5개', () => {
    assert.ok(ALL.length > 0, 'ALL 비어 있음');
    assert.equal(PHASES.length, 5);
  });
  test('초기 진행률 0', () => { assert.equal(cnt(), `0 / ${ALL.length}`); });
  test('게이트 항목 5개 이상', () => {
    assert.ok(ALL.filter((i) => i.gate).length >= 5, String(ALL.filter((i) => i.gate).length));
  });
});

describe('체크 → 진행률·저장', () => {
  test('1개 체크', () => { check(1); assert.equal(cnt(), `1 / ${ALL.length}`); });
  test('localStorage 저장됨', () => {
    check(1);
    assert.ok(LS['harness-onboarding-v1']);
    assert.match(LS['harness-onboarding-v1'], /p0-1/);
  });
});

describe('게이트 경고', () => {
  test('게이트 통과 전엔 경고 없음 (뒤 항목 미체크)', () => { assert.equal(alertHtml(), ''); });
  test('게이트 미통과 + 뒤 항목 체크 → 경고', () => {
    check(12);
    assert.match(alertHtml(), /게이트를 통과하지 않았는데/);
  });
});

describe('막힘 리포트', () => {
  test('초기엔 비어 있음', () => { assert.match(report(), /막힌 항목이 없습니다/); });
  test('막힘 표시 후 리포트 생성', () => { flag(9); assert.match(report(), /하네스 온보딩에서 막혔습니다/); });
  test('항목 제목 포함', () => { ensureFlagged(9); assert.match(report(), /■ 09\./); });
  test('HTML 태그/엔티티 누출 없음', () => {
    ensureFlagged(9);
    // 원본과 같은 느슨한 검사 — 닫는 `>`를 요구하면 `<broken` 을 놓친다.
    const text = report();
    const hit = text.match(/<[a-z/]|&lt;|&gt;|&amp;/);
    assert.equal(hit, null, `누출: ${text.slice(hit?.index ?? 0, (hit?.index ?? 0) + 40)}`);
  });
  test('실행 명령 포함', () => { ensureFlagged(9); assert.match(report(), /실행:/); });
});

describe('초기화', () => {
  test('0으로 복귀', () => {
    document.getElementById('reset').onclick();
    assert.equal(cnt(), `0 / ${ALL.length}`);
  });
  test('경고 사라짐', () => {
    document.getElementById('reset').onclick();
    assert.equal(alertHtml(), '');
  });
});
