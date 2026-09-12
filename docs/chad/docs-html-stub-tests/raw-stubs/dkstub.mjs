import fs from 'node:fs';
const store={}; const listeners={};
function mkEl(id){
  const el={id,_html:'',style:{},classList:{_s:new Set(),
    toggle(c,v){ v===undefined? (this._s.has(c)?this._s.delete(c):this._s.add(c)) : (v?this._s.add(c):this._s.delete(c)); },
    add(c){this._s.add(c)}, remove(c){this._s.delete(c)}, contains(c){return this._s.has(c)}},
    dataset:{},onclick:null,addEventListener(t,f){ (listeners[id+':'+t] ??= []).push(f); }};
  Object.defineProperty(el,'innerHTML',{get:()=>el._html,set:v=>{el._html=v}});
  el._qc=new Map();
  el.querySelectorAll=sel=>{ if(!el._qc.has(sel)) el._qc.set(sel,parse(el._html,sel)); return el._qc.get(sel); };
  return el;
}
function parse(h,sel){
  const out=[];
  if(sel==='.slide') for(const m of h.matchAll(/<section class="slide" data-i="(\d+)"/g)){const e=mkEl();e.dataset={i:m[1]};out.push(e);}
  if(sel==='#ovg .th'||sel==='[data-go]') for(const m of h.matchAll(/data-go="(\d+)"/g)){const e=mkEl();e.dataset={go:m[1]};out.push(e);}
  return out;
}
globalThis.document={ getElementById:id=>store[id]||(store[id]=mkEl(id)),
  querySelectorAll:sel=>{ for(const k of ['stage','ovg']) { const e=store[k]; if(!e) continue; const r=e.querySelectorAll(sel); if(r.length) return r; } return []; },
  documentElement:{requestFullscreen(){}}, fullscreenElement:null, exitFullscreen(){} };
globalThis.addEventListener=(t,f)=>{ (listeners['win:'+t] ??= []).push(f); };
globalThis.innerWidth=1440; globalThis.innerHeight=900;
const _loc={_h:''}; Object.defineProperty(_loc,'hash',{get(){return _loc._h}, set(v){_loc._h=String(v)}});
Object.defineProperty(globalThis,'location',{value:_loc,configurable:true});

const api=new Function(fs.readFileSync('/tmp/dk.js','utf8')+'\n;return {SLIDES,go,cur:()=>cur};')();
const {SLIDES,go}=api;
const key=k=>listeners['win:keydown'].forEach(f=>f({key:k,preventDefault(){}}));
const onIdx=()=>store.stage.querySelectorAll('.slide').findIndex(s=>s.classList.contains('on'));
let fail=0; const t=(n,ok,x='')=>{console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' — '+x)); if(!ok)fail++;};

console.log('\n[1] 구성');
t(`슬라이드 ${SLIDES.length}장`, SLIDES.length>=15 && SLIDES.length<=18, String(SLIDES.length));
t('모든 슬라이드에 제목', SLIDES.every(s=>s.t&&s.t.length>1));
t('발표자 노트 누락 없음', SLIDES.every(s=>s.note&&s.note.length>5), SLIDES.filter(s=>!s.note).map(s=>s.t).join(','));
t('DOM에 section 렌더', store.stage._html.split('<section class="slide"').length-1===SLIDES.length);
t('개요 썸네일 개수 일치', store.ovg._html.split('data-go=').length-1===SLIDES.length);
t('미치환 템플릿 리터럴 없음', !/\$\{/.test(store.stage._html), (store.stage._html.match(/\$\{[^}]*\}/)||[''])[0]);
t('SVG 렌더됨(루프·게이트)', (store.stage._html.match(/<svg/g)||[]).length===2);

console.log('\n[2] 네비게이션');
t('초기 0번', onIdx()===0, String(onIdx()));
key('ArrowRight'); t('→ 1번', onIdx()===1, String(onIdx()));
key(' '); t('Space 2번', onIdx()===2, String(onIdx()));
key('ArrowLeft'); t('← 1번', onIdx()===1, String(onIdx()));
key('End'); t('End 마지막', onIdx()===SLIDES.length-1, String(onIdx()));
key('ArrowRight'); t('마지막에서 더 가도 클램프', onIdx()===SLIDES.length-1);
key('Home'); t('Home 0번', onIdx()===0);
key('ArrowLeft'); t('0번에서 더 가도 클램프', onIdx()===0);

console.log('\n[3] 노트·개요');
t('노트에 현재 슬라이드', /01 하네스란/.test(store.notes._html), store.notes._html.slice(0,50));
key('s'); t('S로 노트 on', store.notes.classList.contains('on'));
key('s'); t('S로 노트 off', !store.notes.classList.contains('on'));
key('o'); t('O로 개요 on', store.overview.classList.contains('on'));
key('Escape'); t('Esc로 개요 off', !store.overview.classList.contains('on'));

console.log('\n[4] 진행률·해시');
go(7); t('진행률 계산', store.prog.style.width===((8/SLIDES.length*100)+'%'), store.prog.style.width);
t('해시 갱신', location.hash==='8', location.hash);
console.log(fail?`\n${fail} FAILED\n`:'\n전체 통과\n'); process.exit(fail?1:0);
