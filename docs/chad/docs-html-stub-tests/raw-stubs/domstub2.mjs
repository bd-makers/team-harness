import fs from 'node:fs';
function mkEl(id){
  const el={ id, _html:'', _cache:new Map(), textContent:'', value:'auth-redesign',
    classList:{add(){},remove(){},contains(){return false}}, dataset:{}, style:{},
    onclick:null, oninput:null, onchange:null, checked:false, appendChild(){} };
  Object.defineProperty(el,'innerHTML',{ get(){return el._html}, set(v){el._html=v; el._cache.clear();} });
  el.querySelectorAll=(sel)=>{
    if(el._cache.has(sel)) return el._cache.get(sel);
    const h=el._html, out=[];
    const add=(ds,extra={})=>{ const e=mkEl(); e.dataset=ds; Object.assign(e,extra); out.push(e); };
    if(sel==='.seg button'){ for(const m of h.matchAll(/data-k="([^"]+)" data-v="([^"]+)"/g)) add({k:m[1],v:m[2]}); }
    else if(sel==='button'){ for(const m of h.matchAll(/data-p="([^"]+)"/g)) add({p:m[1]}); }
    else if(/^\[data-(ck|pk|tk)\]$/.test(sel)){ const k=sel.slice(6,8);
      for(const m of h.matchAll(new RegExp(`data-${k}="([^"]+)"([^>]*)`,'g')))
        add({[k]:m[1]},{checked:/\bchecked\b/.test(m[2])}); }
    el._cache.set(sel,out); return out;
  };
  return el;
}
const store={};
globalThis.document={ getElementById:id=>store[id]||(store[id]=mkEl(id)), querySelectorAll:()=>[],
  createRange:()=>({selectNode(){}}), execCommand(){} };
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async()=>{}}},configurable:true});
globalThis.getSelection=()=>({removeAllRanges(){},addRange(){}});

const src=fs.readFileSync('/tmp/pg.js','utf8');
const api=new Function(src+'\n;return {state,PRESETS,updateAll};')();
const {state,PRESETS}=api;
const C=()=>document.getElementById('controls');
const click=(k,v)=>{ const b=C().querySelectorAll('.seg button').find(x=>x.dataset.k===k&&x.dataset.v===v);
  if(!b) throw new Error('no seg button '+k+'='+v); b.onclick(); };
const toggle=(attr,key)=>{ const i=C().querySelectorAll(`[data-${attr}]`).find(x=>x.dataset[attr]===key);
  if(!i) throw new Error('no '+attr+' '+key); i.checked=!i.checked; i.onchange(); };
const preset=(name)=>{ const b=document.getElementById('presets').querySelectorAll('button').find(x=>x.dataset.p===name);
  if(!b) throw new Error('no preset '+name); b.onclick(); };
const P=()=>document.getElementById('prompt').textContent;

let fail=0; const t=(n,ok,extra='')=>{ console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' — '+extra)); if(!ok)fail++; };

console.log('\n[1] Ambiguity 수동 해제 후 시나리오/규모를 바꿔도 유지되는가');
toggle('ck','ambiguity');                      t('해제됨', state.ambiguity===false);
click('scale','small');                        t('규모 변경 후에도 해제 유지', state.ambiguity===false, 'state.ambiguity='+state.ambiguity);
click('scenario','bug');                       t('시나리오 변경 후에도 해제 유지', state.ambiguity===false);
toggle('ck','ambiguity');                      t('작은 버그에서도 다시 켤 수 있다 (disabled 아님)', state.ambiguity===true);

console.log('\n[2] taskState=resume 이면 다이어그램이 꺼진다');
click('scenario','feature'); click('scale','medium');
toggle('ck','diagram');                        t('다이어그램 켬', state.diagram===true);
click('taskState','resume');                   t('재활성화 시 자동 해제', state.diagram===false);
click('taskState','new');

console.log('\n[3] 프리셋 5종 — 클릭 경로로 프롬프트가 생성되는가');
for(const name of Object.keys(PRESETS)){
  preset(name);
  const p=P(), steps=(p.match(/^\d+\. /gm)||[]).length;
  const closesTask=/\/harness-task done/.test(p);
  const noEntity=!/&lt;|&gt;|&amp;/.test(p);
  const noImplForDocs=state.scenario!=='docs'||!/구현 — 가장 작은/.test(p);
  t(`${name}: ${steps}단계 · ${p.length}자`, steps>0&&p.length>300);
  t(`${name}: task를 닫는다`, closesTask, 'done 단계 없음');
  t(`${name}: HTML 엔티티 누출 없음`, noEntity);
  t(`${name}: 시나리오에 맞는 본작업 단계`, noImplForDocs);
}

console.log('\n[4] docs 시나리오 직접 선택');
preset('핫픽스 (최소)'); click('scenario','docs');
t('구현 대신 문서·규칙 수정', /문서·규칙 수정/.test(P()) && !/구현 — 가장 작은/.test(P()));

console.log('\n[5] verify:required 인데 증거원이 shipcheck 하나뿐이면 경고');
preset('핫픽스 (최소)'); toggle('tk','unit'); click('ev:verify','required');
const pv=document.getElementById('preview').innerHTML;
t('shipcheck 단독 → 경고 행', /증거원이 ship의 shipcheck 하나뿐/.test(pv));
click('reviewKind','adversarial');
t('적대적 리뷰 추가 → 통과 행', /verify: required — 검증 프레이밍 마커를 남기는 단계가 있음/.test(document.getElementById('preview').innerHTML));

console.log(fail? `\n${fail} FAILED\n` : '\n전체 통과\n');
process.exit(fail?1:0);
