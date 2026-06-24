/* ============================================================
   SHARED CORE ENGINE  (extracted verbatim from Chart × Motion Atlas)
   svg helpers · scales · easing · replay-safe tween · registry · card harness
   Every package inlines this unchanged so the house engine is identical.
   ============================================================ */
const SVGNS='http://www.w3.org/2000/svg';
const REDUCE=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* bilingual in-chart text helper — builders use LB('English','中文') for any SVG label;
   the toggle re-renders the cards, so in-chart text switches with the page. */
function LB(en,cn){return (typeof document!=='undefined'&&document.body&&document.body.classList.contains('lang-en'))?en:cn;}

/* ---- EN / CN language toggle (top-right, persisted in localStorage) ---- */
(function(){
  const KEY='d2m-lang';
  function set(l,rerender){const b=document.body;if(!b)return;b.classList.remove('lang-en','lang-cn');b.classList.add('lang-'+l);try{localStorage.setItem(KEY,l);}catch(e){}
    if(rerender&&typeof cards!=='undefined')cards.forEach(c=>{try{c.render&&c.render();}catch(e){}});}
  let lang='cn';const qp=new URLSearchParams(location.search);
  if(qp.get('lang')==='en'||qp.get('lang')==='cn'){lang=qp.get('lang');}
  else{try{lang=localStorage.getItem(KEY)||'cn';}catch(e){}}
  set(lang,false);
  function wire(){const btn=document.getElementById('langToggle');if(btn)btn.addEventListener('click',()=>set(document.body.classList.contains('lang-cn')?'en':'cn',true));}
  if(document.readyState!=='loading')wire();else document.addEventListener('DOMContentLoaded',wire);
})();

// SVG palette — themeable per package via window.__THEME (injected before this script).
// Light themes override txt/axis/grid/surf/bg so charts read on a light background.
const _THDEF={
  teal:'#46b8a5', amber:'#d9933d', red:'#c0171f',
  cool:'#6f7d96', tealL:'#8eccc0', amberL:'#e6bd86', redL:'#e0696f',
  line:'#2a2f38', grid:'#20242b', axis:'#3a404b',
  txt:'#9aa0ab', faint:'#5c626d', bg:'#0e1013', surf:'#1b1f26'
};
const _TH=(typeof window!=='undefined'&&window.__THEME)||{};
const C=Object.assign({},_THDEF,_TH.C||{});
const PAL=(_TH.PAL&&_TH.PAL.length)?_TH.PAL:[C.teal,C.amber,C.red,C.cool,C.tealL,C.amberL];
// hex -> rgba (for pale per-category stage tints, FT-poster style)
function hexRGBA(hex,a){hex=(hex||'').replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const n=parseInt(hex,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}

/* ---- theme switcher: 3 colour schemes × night/light. Sets CSS vars on :root +
   mutates the SVG palette (C/PAL) + re-renders. Active only when build injects
   window.__SCHEMES_ON (config "schemes":true). Persisted; ?scheme=0..2 & ?mode= override. */
(function(){
  if(!window.__SCHEMES_ON) return;
  const STRUCT={
    dark:{vars:{'--bg':'#0c0d10','--bg2':'#111317','--surface':'#14161b','--surface2':'#191c22','--line':'#262a33','--line-bright':'#373d48','--text':'#e9eaed','--text-dim':'#9aa0ab','--text-faint':'#5c626d','--card-border':'#242833','--stage-bg':'#0e1014','--stage-img':'radial-gradient(circle, rgba(255,255,255,.022) 1px, transparent 1px)','--stage-size':'13px 13px','--topbar-bg':'rgba(12,13,16,.85)','--bg-glow':'rgba(120,150,170,.05)'},
      C:{txt:'#9aa0ab',faint:'#5c626d',axis:'#3a404b',grid:'#20242b',surf:'#1b1f26',line:'#2a2f38',bg:'#0e1013'}},
    light:{vars:{'--bg':'#fafaf7','--bg2':'#ffffff','--surface':'#ffffff','--surface2':'#f3f4f1','--line':'#e6e7e2','--line-bright':'#cdcfc8','--text':'#16181d','--text-dim':'#545a63','--text-faint':'#8a8f99','--card-border':'#e8e9e4','--stage-bg':'#fbfcf8','--stage-img':'radial-gradient(circle, rgba(0,0,0,.045) 1px, transparent 1px)','--stage-size':'13px 13px','--topbar-bg':'rgba(250,250,247,.88)','--bg-glow':'rgba(120,150,170,.05)'},
      C:{txt:'#3a3f47',faint:'#9098a3',axis:'#b0b5bd',grid:'#e9eae6',surf:'#eef0ea',line:'#dfe1db',bg:'#fbfcf8'}}
  };
  const SCHEMES=[
    {name:'Aqua',  sw:'#2bb0a0', ac:{teal:'#2bb0a0',amber:'#d9933d',red:'#c0392b',cool:'#7d8794',tealL:'#5fc7b8',amberL:'#e6bd86',redL:'#e0696f'}, PAL:['#2bb0a0','#d9933d','#c0392b','#7d8794','#5fc7b8','#e6bd86']},
    {name:'Indigo',sw:'#6366f1', ac:{teal:'#6366f1',amber:'#0ea5b7',red:'#f43f5e',cool:'#7d8794',tealL:'#8b8df5',amberL:'#34c3d4',redL:'#fb7185'}, PAL:['#6366f1','#0ea5b7','#f43f5e','#7d8794','#8b8df5','#34c3d4']},
    {name:'Ember', sw:'#e8702a', ac:{teal:'#e8702a',amber:'#d9a521',red:'#d6336c',cool:'#8a8678',tealL:'#f0945a',amberL:'#e6c45a',redL:'#e85a8a'}, PAL:['#e8702a','#d9a521','#d6336c','#8a8678','#f0945a','#e6c45a']}
  ];
  let s=0,m='dark';const q=new URLSearchParams(location.search);
  try{m=q.get('mode')||localStorage.getItem('d2m-mode')||'dark';s=+(q.get('scheme')||localStorage.getItem('d2m-scheme')||0);}catch(e){}
  if(m!=='light'&&m!=='dark')m='dark'; if(!(s>=0&&s<SCHEMES.length))s=0;
  function apply(rerender){
    const sd=STRUCT[m],sc=SCHEMES[s],rs=document.documentElement.style;
    for(const k in sd.vars)rs.setProperty(k,sd.vars[k]);
    rs.setProperty('--accent',sc.ac.teal);
    rs.setProperty('--teal',sc.ac.teal);rs.setProperty('--amber',sc.ac.amber);rs.setProperty('--red',sc.ac.red);
    Object.assign(C,sd.C,sc.ac);PAL.length=0;sc.PAL.forEach(x=>PAL.push(x));
    document.body.classList[m==='light'?'add':'remove']('light');
    const mb=document.getElementById('modeToggle');if(mb)mb.textContent=(m==='light'?'☀':'☾');
    document.querySelectorAll('.schemeBtn').forEach((b,i)=>b.classList.toggle('on',i===s));
    if(rerender&&typeof cards!=='undefined')cards.forEach(c=>{try{c.render&&c.render();}catch(e){}});
  }
  apply(false);   // before boot mounts cards
  function wire(){
    const mb=document.getElementById('modeToggle');
    if(mb)mb.addEventListener('click',()=>{m=(m==='light'?'dark':'light');try{localStorage.setItem('d2m-mode',m);}catch(e){}apply(true);});
    document.querySelectorAll('.schemeBtn').forEach((b,i)=>{if(SCHEMES[i]){const a=SCHEMES[i].ac;b.style.background='linear-gradient(90deg,'+a.teal+' 0 33%,'+a.amber+' 33% 66%,'+a.red+' 66% 100%)';b.title=SCHEMES[i].name+' — '+(s===i?'active':'click to use');b.addEventListener('click',()=>{s=i;try{localStorage.setItem('d2m-scheme',i);}catch(e){}apply(true);});}});
  }
  if(document.readyState!=='loading')wire();else document.addEventListener('DOMContentLoaded',wire);
})();

/* element factory */
function E(tag,attrs={},kids){
  const e=document.createElementNS(SVGNS,tag);
  for(const k in attrs) e.setAttribute(k,attrs[k]);
  if(kids) (Array.isArray(kids)?kids:[kids]).forEach(c=>e.appendChild(c));
  return e;
}
function SVG(w=280,h=152){return E('svg',{viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'xMidYMid meet'});}
const lin=(d0,d1,r0,r1)=>v=>r0+(v-d0)/(d1-d0||1)*(r1-r0);
const lerp=(a,b,t)=>a+(b-a)*t;
const rng=n=>[...Array(n).keys()];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function seeded(s){return ()=>{s=(s*9301+49297)%233280;return s/233280;};}

/* ---- easing ---- */
const Ease={
  linear:t=>t,
  outCubic:t=>1-Math.pow(1-t,3),
  inCubic:t=>t*t*t,
  inOutCubic:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  outQuint:t=>1-Math.pow(1-t,5),
  inBack:t=>{const c=1.70158;return (c+1)*t*t*t-c*t*t;},
  outBack:t=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(t-1,3)+c*Math.pow(t-1,2);},
  outElastic:t=>{const c=(2*Math.PI)/3;return t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t*10-.75)*c)+1;},
  outBounce:t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;}
};

/* ---- tween: rAF, replay-safe, reduced-motion aware ---- */
function tween(stage,o){
  const {dur=700,ease=Ease.outCubic,from=0,to=1,delay=0,onUpdate,onDone}=o;
  if(REDUCE){onUpdate&&onUpdate(to,1);onDone&&onDone();return {alive:false};}
  const tok={alive:true};(stage.__tw=stage.__tw||[]).push(tok);
  const t0=performance.now()+delay;
  (function frame(now){
    if(!tok.alive)return;
    if(now<t0){requestAnimationFrame(frame);return;}
    const p=dur<=0?1:clamp((now-t0)/dur,0,1);
    onUpdate&&onUpdate(from+(to-from)*ease(p),p);
    if(p<1)requestAnimationFrame(frame); else onDone&&onDone();
  })(performance.now());
  return tok;
}
function killAnims(stage){
  (stage.__tw||[]).forEach(t=>t.alive=false);stage.__tw=[];
  if(stage.__int){clearInterval(stage.__int);stage.__int=null;}
  try{stage.getAnimations({subtree:true}).forEach(a=>a.cancel());}catch(e){}
}

/* ---- generalized registry ----
   card({sec,name,cn,cat,use,build,spec,kind}). chart()/motion() are thin
   wrappers so atlas blocks paste in verbatim; sec() routes following calls. */
const Cards=[];
let _curSec='main';
function sec(id){_curSec=id;}
function card(o){Cards.push(Object.assign({sec:_curSec,kind:'chart'},o));}
function chart(name,cn,cat,use,build,data){card({name,cn,cat,use,build,data,kind:'chart'});}
function motion(name,cn,cat,spec,build,data){card({name,cn,cat,use:'',spec,build,data,kind:'motion'});}

const cards=[];
function mountCard(host,def,kind){
  const card=document.createElement('button');card.className='card';card.type='button';
  card.setAttribute('aria-label',def.name);
  const stage=document.createElement('div');stage.className='stage'+(def.tall?' tall':'');
  if(def._stageTint){stage.style.background=def._stageTint;stage.style.backgroundImage='none';}
  stage.innerHTML='<span class="replay">↻ replay</span>';
  const foot=document.createElement('div');foot.className='foot';
  const pip=def._catColor||PAL[(def._ci||0)%PAL.length];
  const metaR=def.kind==='motion'
    ? `<span class="meta"><span class="pip" style="background:${C.teal}"></span>${def.cat}${def.spec?' · '+def.spec:''}</span>`
    : `<span class="meta"><span class="pip" style="background:${pip}"></span>${def.cat}</span>`;
  const nameHTML=`<span class="name"><span class="t-en">${def.name}</span>${def.cn?`<span class="t-cn">${def.cn}</span>`:''}</span>`;
  let useHTML='';
  if(def.use){const ps=def.use.split('@@');useHTML=ps.length===2
    ?`<span class="use"><span class="t-en">${ps[0].trim()}</span><span class="t-cn">${ps[1].trim()}</span></span>`
    :`<span class="use t-cn">${def.use}</span>`;}
  let dataHTML='';
  if(def.data){const ps=def.data.split('@@');const val=ps.length===2
    ?`<span class="t-en">${ps[0].trim()}</span><span class="t-cn">${ps[1].trim()}</span>`
    :`<span class="t-cn">${def.data}</span>`;
    dataHTML=`<span class="data"><span class="data-k t-en">Best for</span><span class="data-k t-cn">适合</span>${val}</span>`;}
  foot.innerHTML=`${nameHTML}${metaR}${useHTML}${dataHTML}`;
  card.appendChild(stage);card.appendChild(foot);host.appendChild(card);

  let api={};
  function render(){killAnims(stage);const keep=stage.querySelector('.replay');stage.innerHTML='';stage.appendChild(keep);api=def.build(stage)||{};}
  render();
  function replay(){if(api.play){killAnims(stage);api.reset&&api.reset();api.play();}else render();}
  card.addEventListener('click',replay);
  cards.push({play:replay,render,stage,card});
  return {play:replay};
}

/* ---- shared chart-drawing helpers (W/H stage, plot, baseline, arc) ---- */
const W=280,H=152;
const MONO="'JetBrains Mono',ui-monospace,monospace";
let UID=0; const uid=()=>'u'+(++UID);
function plot(stage,pad){const s=SVG(W,H);stage.appendChild(s);const p=Object.assign({l:16,r:16,t:16,b:18},pad||{});return {s,p};}
function baseline(s,p){s.appendChild(E('line',{x1:p.l,y1:H-p.b,x2:W-p.r,y2:H-p.b,stroke:C.axis,'stroke-width':1,'stroke-linecap':'round'}));}
function arc(cx,cy,r,a0,a1,r0){
  const p0=[cx+Math.cos(a0)*r,cy+Math.sin(a0)*r],p1=[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r];
  const large=(a1-a0)>Math.PI?1:0;
  if(!r0||r0<=0) return `M${cx} ${cy} L${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${r} ${r} 0 ${large} 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} Z`;
  const q0=[cx+Math.cos(a1)*r0,cy+Math.sin(a1)*r0],q1=[cx+Math.cos(a0)*r0,cy+Math.sin(a0)*r0];
  return `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${r} ${r} 0 ${large} 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} L${q0[0].toFixed(2)} ${q0[1].toFixed(2)} A${r0} ${r0} 0 ${large} 0 ${q1[0].toFixed(2)} ${q1[1].toFixed(2)} Z`;
}
/* a 5-bar entry scaffold reused by several motion/encoding demos */
function entryBars(stage,data){
  const s=SVG(W,H);stage.appendChild(s);const pl=24,pr=24,pt=20,pb=20,d=data||[40,64,48,72,56],max=Math.max(...d)*1.1,y0=H-pb,n=d.length,gw=(W-pl-pr)/n,bw=gw*0.56;
  s.appendChild(E('line',{x1:pl,y1:y0,x2:W-pr,y2:y0,stroke:C.axis,'stroke-width':1}));
  const bars=d.map((v,i)=>{const bx=pl+gw*i+(gw-bw)/2;const r=E('rect',{x:bx,width:bw,rx:2,fill:PAL[0]});s.appendChild(r);return {r,v,bx,h:(v/max)*(y0-pt)};});
  return {s,bars,y0,pt,pl,pr,gw,bw};
}
