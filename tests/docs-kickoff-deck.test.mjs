// docs/harness-kickoff-deck.html — 16장 자립형 덱의 구성·키보드 네비게이션·노트/개요·진행률.
//
// 원본: docs/chad/team-onboarding-kit 검증에 쓴 /tmp/dkstub.mjs (단언 22건).
// 산출물 JS는 벤더링하지 않고 HTML에서 추출한다 — tests/helpers/html-script.mjs 참조.

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { loadArtifactScript } from './helpers/html-script.mjs';

const HTML = 'docs/harness-kickoff-deck.html';

// ── 이 산출물이 실제로 건드리는 DOM 표면만 흉내 낸다 (jsdom 없음: 의존성 0개 유지) ──
const store = {};
const listeners = {};

function mkEl(id) {
  const el = {
    id,
    _html: '',
    style: {},
    dataset: {},
    onclick: null,
    classList: {
      _s: new Set(),
      toggle(c, v) {
        if (v === undefined) this._s.has(c) ? this._s.delete(c) : this._s.add(c);
        else v ? this._s.add(c) : this._s.delete(c);
      },
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    addEventListener(type, fn) { (listeners[`${id}:${type}`] ??= []).push(fn); },
  };
  Object.defineProperty(el, 'innerHTML', { get: () => el._html, set: (v) => { el._html = v; } });
  el._qc = new Map();
  el.querySelectorAll = (sel) => {
    if (!el._qc.has(sel)) el._qc.set(sel, parse(el._html, sel));
    return el._qc.get(sel);
  };
  return el;
}

function parse(html, sel) {
  const out = [];
  if (sel === '.slide') {
    for (const m of html.matchAll(/<section class="slide" data-i="(\d+)"/g)) {
      const e = mkEl(); e.dataset = { i: m[1] }; out.push(e);
    }
  }
  if (sel === '#ovg .th' || sel === '[data-go]') {
    for (const m of html.matchAll(/data-go="(\d+)"/g)) {
      const e = mkEl(); e.dataset = { go: m[1] }; out.push(e);
    }
  }
  return out;
}

globalThis.document = {
  getElementById: (id) => store[id] || (store[id] = mkEl(id)),
  querySelectorAll(sel) {
    for (const k of ['stage', 'ovg']) {
      const e = store[k];
      if (!e) continue;
      const r = e.querySelectorAll(sel);
      if (r.length) return r;
    }
    return [];
  },
  documentElement: { requestFullscreen() {} },
  fullscreenElement: null,
  exitFullscreen() {},
};
globalThis.addEventListener = (type, fn) => { (listeners[`win:${type}`] ??= []).push(fn); };
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;

const loc = { _h: '' };
Object.defineProperty(loc, 'hash', { get: () => loc._h, set: (v) => { loc._h = String(v); } });
Object.defineProperty(globalThis, 'location', { value: loc, configurable: true });

const { SLIDES, go } = loadArtifactScript(HTML, '{ SLIDES, go }');

const key = (k) => listeners['win:keydown'].forEach((f) => f({ key: k, preventDefault() {} }));
const onIdx = () => store.stage.querySelectorAll('.slide').findIndex((s) => s.classList.contains('on'));
// 각 테스트가 자기 선행 상태를 직접 만든다 — --test-name-pattern 으로 골라 돌려도 통과해야 한다.
// 클래스를 직접 add/remove 하면 스크립트 내부의 토글 상태와 어긋나므로 실제 키로 몰아간다.
// store[id] 대신 getElementById 를 쓴다 — overview 는 스크립트가 keydown 핸들러 안에서
// 조회하므로 키 입력 전에는 store 에 없다.
const el = (id) => document.getElementById(id);
const ensureOn = (id, want) => {
  if (el(id).classList.contains('on') !== want) key(id === 'notes' ? 's' : 'o');
};

describe('구성', () => {
  test('슬라이드 15~18장', () => {
    assert.ok(SLIDES.length >= 15 && SLIDES.length <= 18, `SLIDES.length=${SLIDES.length}`);
  });
  test('모든 슬라이드에 제목', () => {
    assert.ok(SLIDES.every((s) => s.t && s.t.length > 1));
  });
  test('발표자 노트 누락 없음', () => {
    const missing = SLIDES.filter((s) => !s.note || s.note.length <= 5).map((s) => s.t);
    assert.deepEqual(missing, []);
  });
  test('DOM에 section 렌더', () => {
    assert.equal(store.stage._html.split('<section class="slide"').length - 1, SLIDES.length);
  });
  test('개요 썸네일 개수 일치', () => {
    assert.equal(store.ovg._html.split('data-go=').length - 1, SLIDES.length);
  });
  test('미치환 템플릿 리터럴 없음', () => {
    // 원본과 같은 느슨한 검사 — 닫는 `}`를 요구하면 `${unfinished` 를 놓친다.
    const html = store.stage._html;
    const hit = html.match(/\$\{/);
    assert.equal(hit, null, `미치환: ${html.slice(hit?.index ?? 0, (hit?.index ?? 0) + 60)}`);
  });
  test('SVG 렌더됨 (루프·게이트 2개)', () => {
    assert.equal((store.stage._html.match(/<svg/g) || []).length, 2);
  });
});

describe('네비게이션', () => {
  test('초기 0번', () => { go(0); assert.equal(onIdx(), 0); });
  test('→ 1번', () => { go(0); key('ArrowRight'); assert.equal(onIdx(), 1); });
  test('Space 2번', () => { go(1); key(' '); assert.equal(onIdx(), 2); });
  test('← 1번', () => { go(2); key('ArrowLeft'); assert.equal(onIdx(), 1); });
  test('End 마지막', () => { go(0); key('End'); assert.equal(onIdx(), SLIDES.length - 1); });
  test('마지막에서 더 가도 클램프', () => { key('End'); key('ArrowRight'); assert.equal(onIdx(), SLIDES.length - 1); });
  test('Home 0번', () => { go(3); key('Home'); assert.equal(onIdx(), 0); });
  test('0번에서 더 가도 클램프', () => { key('Home'); key('ArrowLeft'); assert.equal(onIdx(), 0); });
});

describe('노트·개요', () => {
  test('노트에 현재 슬라이드', () => {
    go(0);
    assert.match(el('notes')._html, /01 하네스란/);
  });
  test('S로 노트 on', () => { ensureOn('notes', false); key('s'); assert.ok(el('notes').classList.contains('on')); });
  test('S로 노트 off', () => { ensureOn('notes', true); key('s'); assert.ok(!el('notes').classList.contains('on')); });
  test('O로 개요 on', () => { ensureOn('overview', false); key('o'); assert.ok(el('overview').classList.contains('on')); });
  test('Esc로 개요 off', () => { ensureOn('overview', true); key('Escape'); assert.ok(!el('overview').classList.contains('on')); });
});

describe('진행률·해시', () => {
  test('진행률 계산', () => {
    go(7);
    assert.equal(store.prog.style.width, `${(8 / SLIDES.length) * 100}%`);
  });
  test('해시 갱신', () => { go(7); assert.equal(location.hash, '8'); });
});
