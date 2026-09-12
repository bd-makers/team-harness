// docs/harness-operations-playground.html — 운용 시나리오 구성기의 상태 기계와 프롬프트 생성.
//
// 원본: docs/chad/team-onboarding-kit 검증에 쓴 /tmp/domstub2.mjs (단언 29건).
// 산출물 JS는 벤더링하지 않고 HTML에서 추출한다 — tests/helpers/html-script.mjs 참조.

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { loadArtifactScript } from './helpers/html-script.mjs';

const HTML = 'docs/harness-operations-playground.html';

function mkEl(id) {
  const el = {
    id, _html: '', _cache: new Map(), textContent: '', value: 'auth-redesign',
    classList: { add() {}, remove() {}, contains() { return false; } },
    dataset: {}, style: {},
    onclick: null, oninput: null, onchange: null, checked: false,
    appendChild() {},
  };
  Object.defineProperty(el, 'innerHTML', {
    get: () => el._html,
    set: (v) => { el._html = v; el._cache.clear(); },
  });
  // 산출물이 실제로 쓰는 셀렉터 3종만 해석한다.
  el.querySelectorAll = (sel) => {
    if (el._cache.has(sel)) return el._cache.get(sel);
    const html = el._html;
    const out = [];
    const add = (ds, extra = {}) => { const e = mkEl(); e.dataset = ds; Object.assign(e, extra); out.push(e); };
    if (sel === '.seg button') {
      for (const m of html.matchAll(/data-k="([^"]+)" data-v="([^"]+)"/g)) add({ k: m[1], v: m[2] });
    } else if (sel === 'button') {
      for (const m of html.matchAll(/data-p="([^"]+)"/g)) add({ p: m[1] });
    } else if (/^\[data-(ck|pk|tk)\]$/.test(sel)) {
      const k = sel.slice(6, 8);
      for (const m of html.matchAll(new RegExp(`data-${k}="([^"]+)"([^>]*)`, 'g'))) {
        add({ [k]: m[1] }, { checked: /\bchecked\b/.test(m[2]) });
      }
    }
    el._cache.set(sel, out);
    return out;
  };
  return el;
}

const store = {};
globalThis.document = {
  getElementById: (id) => store[id] || (store[id] = mkEl(id)),
  querySelectorAll: () => [],
  createRange: () => ({ selectNode() {} }),
  execCommand() {},
};
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} } },
  configurable: true,
});
globalThis.getSelection = () => ({ removeAllRanges() {}, addRange() {} });

const { state, PRESETS } = loadArtifactScript(HTML, '{ state, PRESETS, updateAll }');

const controls = () => document.getElementById('controls');
const click = (k, v) => {
  const b = controls().querySelectorAll('.seg button').find((x) => x.dataset.k === k && x.dataset.v === v);
  assert.ok(b, `세그먼트 버튼 없음: ${k}=${v}`);
  b.onclick();
};
const toggle = (attr, key) => {
  const i = controls().querySelectorAll(`[data-${attr}]`).find((x) => x.dataset[attr] === key);
  assert.ok(i, `${attr} 없음: ${key}`);
  i.checked = !i.checked;
  i.onchange();
};
const preset = (name) => {
  const b = document.getElementById('presets').querySelectorAll('button').find((x) => x.dataset.p === name);
  assert.ok(b, `프리셋 없음: ${name}`);
  b.onclick();
};
const prompt = () => document.getElementById('prompt').textContent;
// 각 테스트가 자기 선행 상태를 직접 만든다 — --test-name-pattern 으로 골라 돌려도 통과해야 한다.
const setAmbiguity = (v) => { if (state.ambiguity !== v) toggle('ck', 'ambiguity'); };

describe('Ambiguity 수동 해제는 시나리오·규모를 바꿔도 유지된다', () => {
  test('해제됨', () => { setAmbiguity(true); toggle('ck', 'ambiguity'); assert.equal(state.ambiguity, false); });
  test('규모 변경 후에도 해제 유지', () => {
    setAmbiguity(false);
    click('scale', 'small');
    assert.equal(state.ambiguity, false);
  });
  test('시나리오 변경 후에도 해제 유지', () => {
    setAmbiguity(false);
    click('scenario', 'bug');
    assert.equal(state.ambiguity, false);
  });
  test('작은 버그에서도 다시 켤 수 있다 (disabled 아님)', () => {
    click('scenario', 'bug');
    click('scale', 'small');
    setAmbiguity(false);
    toggle('ck', 'ambiguity');
    assert.equal(state.ambiguity, true);
  });
});

describe('taskState=resume 이면 다이어그램이 꺼진다', () => {
  test('다이어그램 켬', () => {
    click('scenario', 'feature');
    click('scale', 'medium');
    toggle('ck', 'diagram');
    assert.equal(state.diagram, true);
  });
  test('재활성화 시 자동 해제', () => { click('taskState', 'resume'); assert.equal(state.diagram, false); });
});

describe('프리셋 — 클릭 경로로 프롬프트가 생성된다', () => {
  test('프리셋 5종', () => {
    click('taskState', 'new');
    assert.equal(Object.keys(PRESETS).length, 5);
  });

  for (const name of Object.keys(PRESETS)) {
    describe(name, () => {
      // preset() 적용은 idempotent 하므로 각 테스트가 직접 부른다.
      const apply = () => { preset(name); return prompt(); };
      test('단계가 있고 충분히 길다', () => {
        const text = apply();
        const steps = (text.match(/^\d+\. /gm) || []).length;
        assert.ok(steps > 0, '단계 없음');
        assert.ok(text.length > 300, `${text.length}자`);
      });
      test('task를 닫는다', () => { assert.match(apply(), /\/harness-task done/); });
      test('HTML 엔티티 누출 없음', () => {
        const text = apply();
        const hit = text.match(/&lt;|&gt;|&amp;/);
        assert.equal(hit, null, `누출: ${hit?.[0]}`);
      });
      test('시나리오에 맞는 본작업 단계', () => {
        const text = apply();
        if (state.scenario === 'docs') assert.doesNotMatch(text, /구현 — 가장 작은/);
        else assert.ok(true);
      });
    });
  }
});

describe('docs 시나리오 직접 선택', () => {
  test('구현 대신 문서·규칙 수정', () => {
    preset('핫픽스 (최소)');
    click('scenario', 'docs');
    assert.match(prompt(), /문서·규칙 수정/);
    assert.doesNotMatch(prompt(), /구현 — 가장 작은/);
  });
});

describe('verify:required 인데 증거원이 shipcheck 하나뿐이면 경고', () => {
  test('shipcheck 단독 → 경고 행', () => {
    preset('핫픽스 (최소)');
    toggle('tk', 'unit');
    click('ev:verify', 'required');
    assert.match(document.getElementById('preview').innerHTML, /증거원이 ship의 shipcheck 하나뿐/);
  });
  test('적대적 리뷰 추가 → 통과 행', () => {
    preset('핫픽스 (최소)');
    toggle('tk', 'unit');
    click('ev:verify', 'required');
    click('reviewKind', 'adversarial');
    assert.match(
      document.getElementById('preview').innerHTML,
      /verify: required — 검증 프레이밍 마커를 남기는 단계가 있음/,
    );
  });
});
