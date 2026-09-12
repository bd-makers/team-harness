import fs from 'node:fs';
const store={};
function mkEl(id){
  const el={ id,_html:'',textContent:'',style:{},dataset:{},checked:false,
    onclick:null,onchange:null,classList:{add(){},remove(){}} };
  Object.defineProperty(el,'innerHTML',{get:()=>el._html,set:v=>{el._html=v;}});
  return el;
}
const parse=(sel)=>{
  const h=store.phases?._html||'', out=[];
  if(sel==='input[type=checkbox]')
    for(const m of h.matchAll(/data-id="([^"]+)"([^>]*)/g)){ const e=mkEl(); e.dataset={id:m[1]}; e.checked=/checked/.test(m[2]); out.push(e); }
  else if(sel==='[data-flag]')
    for(const m of h.matchAll(/data-flag="([^"]+)"/g)){ const e=mkEl(); e.dataset={flag:m[1]}; out.push(e); }
  return out;
};
let cache={};
globalThis.document={ getElementById:id=>store[id]||(store[id]=mkEl(id)),
  querySelectorAll:sel=>(cache[sel]??=parse(sel)) };
const LS={}; Object.defineProperty(globalThis,'localStorage',{value:{
  getItem:k=>LS[k]??null, setItem:(k,v)=>{LS[k]=String(v)}, removeItem:k=>{delete LS[k]} },configurable:true});
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async()=>{}}},configurable:true});

const api=new Function(fs.readFileSync('/tmp/ob.js','utf8')+'\n;return {ALL,PHASES,render,saved:()=>saved};')();
const {ALL,PHASES}=api;
const refresh=()=>{cache={};};
const check=n=>{ const cb=document.querySelectorAll('input[type=checkbox]').find(c=>c.dataset.id.endsWith('-'+n));
  cb.checked=true; cb.onchange(); };
const flag=n=>{ const b=document.querySelectorAll('[data-flag]').find(x=>x.dataset.flag.endsWith('-'+n));
  b.onclick(); };
const cnt=()=>document.getElementById('count').textContent;
const alert_=()=>document.getElementById('alert').innerHTML;
const report=()=>document.getElementById('report').textContent;

let fail=0; const t=(n,ok,x='')=>{console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' — '+x)); if(!ok)fail++;};
console.log('\n[1] 구조');
t(`항목 ${ALL.length}개 · 페이즈 ${PHASES.length}개`, ALL.length>0&&PHASES.length===5);
t('초기 0 / '+ALL.length, cnt()===`0 / ${ALL.length}`, cnt());
t('게이트 항목 존재', ALL.filter(i=>i.gate).length>=5, String(ALL.filter(i=>i.gate).length));

console.log('\n[2] 체크 → 진행률·저장');
check(1); t('1개 체크', cnt()===`1 / ${ALL.length}`, cnt());
t('localStorage 저장됨', !!LS['harness-onboarding-v1'] && /p0-1/.test(LS['harness-onboarding-v1']));

console.log('\n[3] 게이트 경고');
t('게이트 통과 전엔 경고 없음(뒤 항목 미체크)', alert_()==='' , alert_());
check(12); t('게이트 미통과 + 뒤 항목 체크 → 경고', /게이트를 통과하지 않았는데/.test(alert_()), alert_().slice(0,80));

console.log('\n[4] 막힘 리포트');
t('초기엔 비어 있음', /막힌 항목이 없습니다/.test(report()));
flag(9); const r=report();
t('막힘 표시 후 리포트 생성', /하네스 온보딩에서 막혔습니다/.test(r));
t('항목 제목 포함', /■ 09\./.test(r), r.split('\n')[2]);
t('HTML 태그/엔티티 누출 없음', !/<[a-z/]|&lt;|&gt;|&amp;/.test(r), (r.match(/<[a-z/][^>]*>|&lt;|&gt;|&amp;/)||[''])[0]);
t('실행 명령 포함', /실행:/.test(r));

console.log('\n[5] 초기화');
document.getElementById('reset').onclick();
t('0으로 복귀', cnt()===`0 / ${ALL.length}`, cnt());
t('경고 사라짐', alert_()==='');
console.log(fail?`\n${fail} FAILED\n`:'\n전체 통과\n'); process.exit(fail?1:0);
