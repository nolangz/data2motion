#!/usr/bin/env python3
"""
build.py — data2motion-lite engine.

Turns one small JSON spec (see references/spec.md) into a single, self-contained,
dependency-free, JS-rendered animated-chart HTML in the data2motion house style
(dark console, Barlow, three-colour system, replay-safe eased reveal, reduced-motion
+ ?static=/?t= QA hooks, persistent control bar).

This script owns 100% of the look and the motion. A text-only model never hand-writes
HTML/CSS/SVG/animation — it writes a spec and runs:

    python3 build.py <spec.json> <out.html>

On success it writes the HTML and prints "OK ...". On a bad spec it prints a clear
one-line error to stderr and exits non-zero.

Chart types (exactly these; `hbar` is an alias of `bar`):
    kpi · bar · column · diverging · line · multiline · area · stacked
    · scatter · lollipop · dumbbell

ARCHITECTURE: one PAGE template whose <script> contains the ENGINE + RAIL + every
chart as a JS draw module + a dispatcher `draw(t){switch(SPEC.chart){...}}`. Python's
only job is: validate the spec, inject SPEC + title/takeaway/source, write the file.
All drawing happens in JS. Colours flow through CSS vars / colorFor so the theme +
scheme switcher keeps working.
"""
import json
import sys
import html

# =====================================================================
# ENGINE — replay-safe tween, eased reveal, one shared clock, QA hooks.
# Ported verbatim-in-spirit from scaffold_data_motion.py (the hardened engine),
# with the RAIL safety-rail helpers.
# =====================================================================
ENGINE = r"""
const qs = new URLSearchParams(location.search);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches || qs.has('static');
let   SEEK   = qs.has('t') ? +qs.get('t') : null;
const Ease = {
  linear:    t => t,
  outCubic:  t => 1 - Math.pow(1 - t, 3),
  inCubic:   t => t*t*t,
  inOutCubic:t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
  outQuint:  t => 1 - Math.pow(1 - t, 5),
  outBack:   t => { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); },
};
const _run = new WeakMap();
function killAnims(stage){ const a=_run.get(stage); if(a){a.forEach(id=>cancelAnimationFrame(id)); _run.set(stage,[]);} }
function tween(stage, {dur, ease=Ease.outCubic, onUpdate, onDone}){
  if (SEEK !== null){ const t=Math.max(0,Math.min(1,SEEK/dur)); onUpdate(ease(t)); if(SEEK>=dur&&onDone)onDone(); return; }
  if (REDUCE){ onUpdate(1); if(onDone)onDone(); return; }
  const list=_run.get(stage)||[]; _run.set(stage,list); let start=null;
  const step=ts=>{ if(start===null)start=ts; const t=Math.min(1,(ts-start)/dur);
    onUpdate(ease(t)); if(t<1) list.push(requestAnimationFrame(step)); else if(onDone) onDone(); };
  list.push(requestAnimationFrame(step));
}
// per-mark sub-clock: map global t -> local 0..1 over [start,start+dur] (fractions)
const sub = (t,start,dur) => Math.max(0, Math.min(1,(t-start)/dur));

/* =====================================================================
   SILK — Disney's 12 principles, mapped to data-viz, as shared timing.
   Every builder choreographs on ONE global clock t∈[0,1] through these so
   the "silk" (anticipation → axis-first → staggered grow → trailing labels →
   value-safe elastic settle) is consistent and can't drift per chart.

   • WIND  — anticipation: a brief wind-up hold before any mark moves. The
     whole data cascade lives in [WIND..1]; phase() remaps a [0..1] design
     window into that post-wind band so axes can still fade in during 0..WIND.
   • cascade() — follow-through/overlapping: returns the [start,dur] slice for
     the i-th of n marks, each offset STAG of its own slice apart, all finishing
     by CAS_END. EVERY mark/series enters this way — uniform, no protagonist,
     none singled out as "enters last + slowest" (that mechanism was removed).
   • settleQ — slow-out grow ease (outQuint: quick start, long gentle settle).
   • elastic() — squash&stretch SETTLE that is VALUE-SAFE: it returns a scalar
     ~1.0 that may overshoot by ≤OVER (3%) but is pinned to EXACTLY 1 by t=1 and
     resolves within the last RESOLVE of the local reveal. Use it ONLY on a
     non-value dimension (dot radius, scale-pulse) OR clamp its effect ≤OVER on a
     value-length and let it land exact. At local lt>=1 it returns exactly 1.
   • labelFade(localMark) — secondary action: a value/direct label settles in
     slightly AFTER its own mark passes ~LAB_AFTER of its grow (a short rise),
     never before. Pass the mark's OWN local progress; returns 0..1 opacity.
   ===================================================================== */
const WIND     = 0.07;   // ~100ms @1400ms wind-up before the cascade
const CAS_END  = 0.82;   // the staggered cascade (ALL marks, uniform) has entered by here
const STAG     = 0.13;   // each indexed mark starts ~13% of its own slice after the previous
const OVER     = 0.03;   // max value-safe overshoot (≤3%)
const RESOLVE  = 0.12;   // the overshoot fully resolves within the last 12% of a reveal
const LAB_AFTER= 0.70;   // a label begins only after its mark passes ~70% grown
// remap a design window [a,b]⊂[0,1] into the post-wind band [WIND,1]
function phase(a,b){ const s=WIND+a*(1-WIND), e=WIND+b*(1-WIND); return [s, Math.max(1e-3,e-s)]; }
// [start,dur] for the i-th of n marks — the uniform staggered cascade EVERY mark
// rides. No mark is excluded or treated specially; there is no protagonist slot.
function cascade(i, n, opts){
  opts=opts||{}; const a=opts.from==null?0:opts.from, b=opts.to==null?CAS_END:opts.to;
  const span=Math.max(1e-3,b-a);
  // each mark owns a slice; neighbours overlap heavily (offset = STAG of a slice)
  const slice = span/(1+(Math.max(1,n)-1)*STAG);
  const start = a + i*STAG*slice;
  const [s,d] = phase(start, start+slice);
  return [s, d];
}
const settleQ = Ease.outQuint;
// Length/scale factor → 1.0. A CLEAN slow-out (outQuint): quick start, long gentle
// decelerate, lands EXACTLY on the value and STOPS. No overshoot, no settle bump,
// no end-of-reveal jitter — the "振动弛豫" was removed by request (it read as a shake).
function valLen(lt, over){
  if(lt>=1) return 1;
  return settleQ(lt);
}
// Same clean ease for non-value dims (dot radius / scale-in): grows 0→1 smoothly,
// no pulse. (over arg kept for call-site compatibility; ignored.)
function elastic(lt, over){
  if(lt>=1) return 1;
  return settleQ(lt);
}
// label opacity that trails its own mark: 0 until the mark passes LAB_AFTER,
// then a short rise. localMark = the mark's OWN local progress (0..1, eased ok).
function labelFade(localMark){
  if(localMark>=1) return 1;
  const start=LAB_AFTER, span=1-LAB_AFTER;
  return Math.max(0, Math.min(1, (localMark-start)/span));
}

/* =====================================================================
   RAIL — shared safety rails. EVERY builder routes its labels/axis through
   these so a chart type can't be added without inheriting the de-collision,
   honest-direction, gutter, and inset guarantees.
   ===================================================================== */
const RAIL = (function(){
  const INSET = 16;                          // min inset on all four sides of the viewBox
  function textW(s, fs){ return (''+s).length * fs * 0.58; }   // dependency-free width estimate
  function reserveGutter(labels, fs, pad){
    fs=fs||14; pad=pad==null?16:pad; let w=0;
    (labels||[]).forEach(l=>{ w=Math.max(w, textW(l,fs)); });
    return Math.max(INSET+8, Math.ceil(w + pad + INSET));
  }
  function placeValueLabel(xEnd, x0, opts){
    opts=opts||{}; const pad=opts.pad==null?8:opts.pad;
    const neg = xEnd < x0;
    if(!neg) return { x:xEnd+pad, anchor:'start' };
    const barW=Math.abs(x0-xEnd);
    if(opts.textW!=null && opts.textW+pad*2 < barW) return { x:x0-pad, anchor:'end' };
    return { x:x0+pad, anchor:'start' };
  }
  function orderTimeAxis(items, xLeft, xRight){
    const s=items.map((d,i)=>({...d,_orig:i})).sort((a,b)=>a.t-b.t), n=s.length;
    s.forEach((d,k)=>{ d._ti=k; d.x = n>1 ? xLeft+(k/(n-1))*(xRight-xLeft) : xLeft; });
    return s;
  }
  function orderPair(startVal, endVal, xLeft, xRight){
    const down=endVal<startVal;
    const deltaPct = startVal!==0 ? Math.round((endVal-startVal)/Math.abs(startVal)*100) : 0;
    const arrow = down?'↓':(endVal>startVal?'↑':'→'), sign = deltaPct>0?'+':'';
    return { xStart:xLeft, xEnd:xRight, down, deltaPct, deltaLabel:arrow+' '+sign+deltaPct+'%' };
  }
  function noOverlap(boxes, lineH){
    lineH=lineH||18;
    const o=boxes.map((b,i)=>({i,y:b.y,h:b.h||lineH})).sort((a,b)=>a.y-b.y);
    for(let k=1;k<o.length;k++){ const m=o[k-1].y+Math.max(o[k-1].h,lineH); if(o[k].y<m)o[k].y=m; }
    o.forEach(x=>{ boxes[x.i].y=x.y; }); return boxes;
  }
  function externalize(segLenPx, label, fs){ return textW(label,fs||12)+10 > segLenPx; }
  return { INSET, textW, reserveGutter, placeValueLabel, orderTimeAxis, orderPair, noOverlap, externalize };
})();
"""

# =====================================================================
# CHARTS — every builder as JS. Each exposes build() + render(t) and is
# registered in CHARTS; the dispatcher draw(t)/buildChart() routes by SPEC.chart.
# All read the SHARED helpers: NS, C, colorFor, fmt, ACCENT, root, SPEC, RAIL, Ease, sub.
# =====================================================================
CHARTS_JS = r"""
const SPEC = __SPEC__;
const NS='http://www.w3.org/2000/svg';
const root=document.getElementById('chart-root');
let CHART = (SPEC.chart||'bar'); if(CHART==='hbar') CHART='bar';

// House colours. ACCENT is the single colour every single-series mark shares
// (the amber in essential; the FT/style accent — the spec's `accent` hue under FT).
// good/up→teal, bad/down→red are honest SEMANTIC roles. No "protagonist"/"context":
// the script no longer singles out one mark or greys the rest.
const C = {accent:'var(--amber)', good:'var(--teal)', up:'var(--teal)',
           bad:'var(--red)', down:'var(--red)'};

/* ---- CATEGORICAL palette: multi-series charts (multiline, stacked, and any
   grouped form) give EACH series/segment a distinct, equal house colour assigned
   by index — none highlighted, none greyed. ≥5 legible, style-safe hues that map
   through CSS vars so both the essential console and the FT poster stay on-brand.
   PALETTE(i) returns the i-th colour, wrapping if there are more series than hues. */
const _PALETTE = ['var(--amber)','var(--teal)','var(--red)','var(--blue)',
                  'var(--purple)','var(--green)'];
function PALETTE(i){ return _PALETTE[((i%_PALETTE.length)+_PALETTE.length)%_PALETTE.length]; }

// colour for a SINGLE-series row/point: honest role semantics first, then the
// diverging sign split (structural, not emphasis), else the uniform house accent.
function colorFor(o){
  const role=o.role;
  if(role==='good'||role==='up') return C.good;
  if(role==='bad'||role==='down') return C.bad;
  if(CHART==='diverging' && typeof o.value==='number')
    return o.value<0 ? C.down : (o.value>0?C.up:C.accent);
  return C.accent;
}
function fmt(v){
  const f=SPEC.value_format||'0';
  const u=SPEC.unit||'';
  if(f.indexOf('%')>=0) return (Math.round(v*10)/10)+'%';
  let s = f.indexOf('.')>=0 ? (+v).toFixed(1) : Math.round(v).toString();
  if(f[0]==='+' && v>0) s='+'+s;
  return s + (u && u!=='%' ? '' : (u==='%'?'%':''));
}
// value + unit for end/value labels (unit shown unless format already is a %)
function fmtU(v){
  const f=SPEC.value_format||'0', u=SPEC.unit||'';
  let base=fmt(v);
  if(u && u!=='%' && f.indexOf('%')<0) base = base+u;
  return base;
}

/* =====================================================================
   LOG — shared log10 value-axis helper. Only the bar/hbar/column/lollipop
   modules consult it; everything else ignores SPEC.log entirely so their
   linear scale is byte-for-byte unchanged. When on, the value axis maps
   log10(value) across [10^floor(log10(min)) .. 10^ceil(log10(max))] so a
   450-vs-2 bar shows BOTH; value LABELS keep showing the real numbers
   (only the bar length / dot position is log-scaled). It also supplies the
   power-of-ten reference ticks the builders draw as hairline gridlines.
   ===================================================================== */
const LOG = (function(){
  const LOG_CHARTS = {bar:1, hbar:1, column:1, lollipop:1};
  const on = (SPEC.log===true) && !!LOG_CHARTS[(SPEC.chart||'bar')];
  // collect the positive values that define the domain (rows-based charts only)
  let lo=1, hi=10;
  if(on){
    const vs=((SPEC.rows||[]).map(r=>+r.value)).filter(v=>v>0);
    if(vs.length){
      const vmin=Math.min(...vs), vmax=Math.max(...vs);
      lo=Math.pow(10, Math.floor(Math.log10(vmin)));
      hi=Math.pow(10, Math.ceil (Math.log10(vmax)));
      if(hi<=lo) hi=lo*10;                     // guarantee >=1 decade of range
    }
  }
  const L0=Math.log10(lo), L1=Math.log10(hi), span=(L1-L0)||1;
  // value -> fraction 0..1 across the axis (clamped so the floor is the baseline)
  function frac(v){
    if(v<=0) return 0;
    return Math.max(0, Math.min(1, (Math.log10(v)-L0)/span));
  }
  // power-of-ten tick values within [lo..hi] inclusive, for reference gridlines
  function ticks(){
    const out=[]; const e0=Math.round(L0), e1=Math.round(L1);
    for(let e=e0;e<=e1;e++) out.push(Math.pow(10,e));
    return out;
  }
  // compact tick label: 10, 100, 1k, 10k, 100k, 1M ...
  function tickLabel(v){
    const e=Math.round(Math.log10(v));
    if(e<3)  return String(Math.round(v));
    if(e<6)  return (v/1e3).toString().replace(/\.0$/,'')+'k';
    if(e<9)  return (v/1e6).toString().replace(/\.0$/,'')+'M';
    return (v/1e9).toString().replace(/\.0$/,'')+'B';
  }
  return {on, lo, hi, frac, ticks, tickLabel};
})();

/* Draw subtle power-of-ten reference gridlines, themed via CSS vars so both the
   essential and FT poster inherit. Two orientations: vertical lines for a
   HORIZONTAL value axis (bar, lollipop), horizontal lines for a VERTICAL value
   axis (column). Lightly labelled (10, 100, 1k …) so the reader can tell it's log.
   Returns nothing; the gridlines are appended BEFORE the bars so marks sit on top. */
function drawLogGridV(svg, xOf, yTop, yBot, yLab){
  const g=document.createElementNS(NS,'g'); g.setAttribute('class','d2m-grid'); svg.appendChild(g);
  LOG.ticks().forEach(tv=>{
    const x=xOf(tv);
    const ln=document.createElementNS(NS,'line');
    ln.setAttribute('x1',x);ln.setAttribute('x2',x);ln.setAttribute('y1',yTop);ln.setAttribute('y2',yBot);
    ln.setAttribute('stroke','var(--grid)');ln.setAttribute('stroke-width','1');ln.setAttribute('opacity','0.5');
    g.appendChild(ln);
    const t=document.createElementNS(NS,'text');
    t.setAttribute('x',x);t.setAttribute('y',yLab);t.setAttribute('text-anchor','middle');
    t.setAttribute('fill','var(--muted)');t.setAttribute('font-size','10');t.setAttribute('opacity','0.8');
    t.textContent=LOG.tickLabel(tv); g.appendChild(t);
  });
}
function drawLogGridH(svg, yOf, xLeft, xRight, xLab){
  const g=document.createElementNS(NS,'g'); g.setAttribute('class','d2m-grid'); svg.appendChild(g);
  LOG.ticks().forEach(tv=>{
    const y=yOf(tv);
    const ln=document.createElementNS(NS,'line');
    ln.setAttribute('x1',xLeft);ln.setAttribute('x2',xRight);ln.setAttribute('y1',y);ln.setAttribute('y2',y);
    ln.setAttribute('stroke','var(--grid)');ln.setAttribute('stroke-width','1');ln.setAttribute('opacity','0.5');
    g.appendChild(ln);
    const t=document.createElementNS(NS,'text');
    t.setAttribute('x',xLab);t.setAttribute('y',y+3);t.setAttribute('text-anchor','end');
    t.setAttribute('fill','var(--muted)');t.setAttribute('font-size','10');t.setAttribute('opacity','0.8');
    t.textContent=LOG.tickLabel(tv); g.appendChild(t);
  });
}
/* Secondary-action helper: fade the axis line + any gridline group + (optional)
   diverging zero-label in FIRST, during 0..~15% of the clock (the wind-up band).
   Pure function of t; at the final frame it lands at opacity 1. Each builder
   tags its axis with class 'd2m-axis' and we fade everything in that group. */
function fadeAxis(t){
  const a=Ease.outCubic(sub(t,0.0, WIND+0.07));
  document.querySelectorAll('.d2m-axis,.d2m-grid').forEach(el=>el.setAttribute('opacity',a));
}

/* =====================================================================
   KPI — one big number 0->value, context sub-label + optional sparkline.
   ===================================================================== */
const KPI = (function(){
  const W=860, H=300, cx=W/2;
  const val = (typeof SPEC.value==='number') ? SPEC.value
            : (SPEC.rows && SPEC.rows.length ? +SPEC.rows[0].value : 0);
  const spark = Array.isArray(SPEC.sparkline) ? SPEC.sparkline
              : (Array.isArray(SPEC.spark) ? SPEC.spark : null);
  let numEl;
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    if(spark && spark.length>1){
      const sw=320, sh=54, sx=cx-sw/2, sy=44;
      const lo=Math.min(...spark), hi=Math.max(...spark), rng=(hi-lo)||1;
      const X=i=>sx+(i/(spark.length-1))*sw, Y=v=>sy+sh-((v-lo)/rng)*sh;
      const dd=spark.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
      const pa=document.createElementNS(NS,'path');
      pa.setAttribute('d',dd);pa.setAttribute('fill','none');pa.setAttribute('stroke','var(--muted)');
      pa.setAttribute('stroke-width','2');pa.setAttribute('stroke-linejoin','round');pa.setAttribute('stroke-linecap','round');
      pa.id='kspark'; svg.appendChild(pa);
      const dot=document.createElementNS(NS,'circle');
      dot.setAttribute('cx',X(spark.length-1));dot.setAttribute('cy',Y(spark[spark.length-1]));dot.setAttribute('r',3.5);
      dot.setAttribute('fill','var(--amber)'); dot.id='ksparkdot'; svg.appendChild(dot);
    }
    numEl=document.createElementNS(NS,'text');
    numEl.setAttribute('x',cx);numEl.setAttribute('y', spark?168:150);numEl.setAttribute('text-anchor','middle');
    numEl.setAttribute('fill','var(--amber)');numEl.setAttribute('font-size','96');numEl.setAttribute('font-weight','700');
    numEl.setAttribute('class','val'); numEl.id='knum'; svg.appendChild(numEl);
    const subl=document.createElementNS(NS,'text');
    subl.setAttribute('x',cx);subl.setAttribute('y', spark?210:194);subl.setAttribute('text-anchor','middle');
    subl.setAttribute('fill','var(--muted)');subl.setAttribute('font-size','17');subl.setAttribute('letter-spacing','.3');
    subl.textContent=SPEC.kpi_label||SPEC.unit||''; svg.appendChild(subl);
    root.appendChild(svg);
  }
  function render(t){
    // Anticipation: the counter HOLDS at 0 through the wind-up beat, then counts
    // up with a slow-out (outQuint: accelerate then long, gentle decelerate).
    const [cs,cd]=phase(0.0, 0.92);
    const lt=sub(t,cs,cd), e=settleQ(lt);
    if(numEl) numEl.textContent=fmt(val*e);
    // Secondary action: the sparkline draws in FIRST (during/just after the wind-up),
    // its end-dot pops slightly AFTER the line, with a tiny value-safe scale-pulse.
    const sp=document.getElementById('kspark'), spd=document.getElementById('ksparkdot');
    if(sp){
      const [ss,sdur]=phase(0.0,0.55); sp.setAttribute('opacity',Ease.outCubic(sub(t,ss,sdur)));
      if(spd){
        const [ds,dd]=phase(0.55,0.9); const dlt=sub(t,ds,dd);
        spd.setAttribute('opacity',Ease.outCubic(dlt));
        spd.setAttribute('r', (3.5*elastic(dlt, 0.18)).toFixed(2));   // non-value dot may pulse
      }
    }
  }
  return {build,render};
})();

/* =====================================================================
   BAR / hbar / diverging — horizontal bars grow from baseline.
   Single-series: every bar the SAME house accent. Diverging: split by sign.
   Uniform staggered cascade — no row singled out. RAIL gutter + value labels.
   ===================================================================== */
const BAR = (function(){
  const rows=SPEC.rows||[], n=rows.length;
  const W=860, rowH=46, padR=70, padT=28, padB=34;
  const H=padT+padB+Math.max(1,n)*rowH;
  const padL = Math.max(120, RAIL.reserveGutter(rows.map(r=>r.label), 14, 16));
  const innerW = W-padL-padR;
  const _vals=rows.map(r=>+r.value);
  const _lo=Math.min(0,..._vals), _hi=Math.max(0,..._vals);
  const _pad=((_hi-_lo)||1)*0.10;
  const DLO=_lo-(_lo<0?_pad:0), DHI=_hi+(_hi>0?_pad:0);
  const diverging = (CHART==='diverging');
  function xOf(v){
    if(diverging){ return padL + ((v-DLO)/((DHI-DLO)||1))*innerW; }
    if(LOG.on){ return padL + LOG.frac(v)*innerW; }
    return padL + (Math.max(0,v)/(DHI||1))*innerW;
  }
  function xZero(){ return diverging ? xOf(0) : padL; }
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const zx=xZero();
    if(LOG.on) drawLogGridV(svg, xOf, padT-6, H-padB+4, H-padB+18);
    const axis=document.createElementNS(NS,'line'); axis.setAttribute('class','d2m-axis');
    axis.setAttribute('x1',zx);axis.setAttribute('x2',zx);axis.setAttribute('y1',padT-6);axis.setAttribute('y2',H-padB+4);
    axis.setAttribute('stroke','var(--grid)');axis.setAttribute('stroke-width','1.5'); svg.appendChild(axis);
    if(diverging){
      const zlab=document.createElementNS(NS,'text'); zlab.setAttribute('class','d2m-axis');
      zlab.setAttribute('x',zx);zlab.setAttribute('y',H-padB+20);zlab.setAttribute('text-anchor','middle');
      zlab.setAttribute('fill','var(--muted)');zlab.setAttribute('font-size','11');
      zlab.textContent = SPEC.baseline_label||'0'; svg.appendChild(zlab);
    }
    rows.forEach((r,i)=>{
      const y=padT+i*rowH, h=rowH*0.52;
      const g=document.createElementNS(NS,'g'); g.dataset.i=i;
      const lab=document.createElementNS(NS,'text');
      lab.setAttribute('x',padL-16);lab.setAttribute('y',y+h*0.5+5);lab.setAttribute('text-anchor','end');
      lab.setAttribute('fill','var(--ink)');lab.setAttribute('font-size','14');lab.setAttribute('font-weight','500');
      lab.textContent=r.label; lab.id='lab'+i; g.appendChild(lab);
      const bar=document.createElementNS(NS,'rect');
      bar.setAttribute('y',y);bar.setAttribute('height',h);bar.setAttribute('rx',3);
      bar.setAttribute('fill',colorFor(r)); bar.id='bar'+i; g.appendChild(bar);
      const v=document.createElementNS(NS,'text');
      v.setAttribute('y',y+h*0.5+5);v.setAttribute('font-size','13');v.setAttribute('class','val');
      v.setAttribute('fill',colorFor(r)); v.id='val'+i; g.appendChild(v);
      svg.appendChild(g);
    });
    root.appendChild(svg);
  }
  // lt = the mark's own local progress 0..1 (raw). The value-LENGTH grows with a
  // slow-out (outQuint) and gets a value-safe ≤3% overshoot that resolves in the
  // last ~10%, landing EXACTLY on the true value at lt>=1. The value NUMBER shown
  // is the honest grow value (never overshot). The label trails (secondary action).
  function drawRow(i, lt){
    const r=rows[i], y=padT+i*rowH, h=rowH*0.52;
    const grow=settleQ(lt);
    const lenF=valLen(lt);                          // grow + tail overshoot, exact at lt>=1
    const cur=r.value*grow;                         // honest number
    const x=xOf(r.value*lenF), x0=xOf(0);
    const bar=document.getElementById('bar'+i);
    bar.setAttribute('x',Math.min(x0,x)); bar.setAttribute('width',Math.max(1,Math.abs(x-x0)));
    const v=document.getElementById('val'+i);
    v.textContent = fmtU(cur);
    const tw = RAIL.textW(v.textContent, 13);
    const pos = RAIL.placeValueLabel(x, x0, {textW:tw, pad:8});
    v.setAttribute('x', pos.x);
    v.setAttribute('text-anchor', pos.anchor);
    // RAIL anchor:'end' means the label sits INSIDE the (negative) bar near zero;
    // a coloured label on its own coloured fill is unreadable, so switch to bg ink.
    v.setAttribute('fill', pos.anchor==='end' ? 'var(--bg)' : colorFor(r));
    v.setAttribute('opacity', labelFade(lt));
  }
  function render(t){
    fadeAxis(t);
    // every bar rides the same uniform staggered cascade — none singled out
    rows.forEach((r,i)=>{ const [s,d]=cascade(i, rows.length); drawRow(i, sub(t,s,d)); });
  }
  return {build,render};
})();

/* =====================================================================
   COLUMN — vertical bars grow from baseline.
   ===================================================================== */
const COL = (function(){
  const W=860, padR=24, padT=30, padB=46;
  const rows=SPEC.rows||[], n=rows.length, H=360;
  // log mode parks power-of-ten labels in a left gutter, so reserve room for them.
  const padL = LOG.on ? 52 : Math.max(46, RAIL.INSET+8);
  const innerW=W-padL-padR, y0=H-padB;
  const _vals=rows.map(r=>+r.value);
  const DHI=Math.max(0,..._vals)*1.10 || 1;
  const gw=innerW/Math.max(1,n), bw=Math.min(gw*0.60, 84);
  // value -> bar height (px above baseline). Log uses the shared log domain;
  // linear path is byte-for-byte the original (cur/DHI).
  function hOf(v){
    if(LOG.on) return LOG.frac(v)*(y0-padT);
    return Math.max(0,(v/DHI))*(y0-padT);
  }
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    if(LOG.on) drawLogGridH(svg, tv=>y0-hOf(tv), padL-6, W-padR, padL-10);
    const ax=document.createElementNS(NS,'line'); ax.setAttribute('class','d2m-axis');
    ax.setAttribute('x1',padL-6);ax.setAttribute('x2',W-padR);ax.setAttribute('y1',y0);ax.setAttribute('y2',y0);
    ax.setAttribute('stroke','var(--grid)');ax.setAttribute('stroke-width','1.5'); svg.appendChild(ax);
    rows.forEach((r,i)=>{
      const cx=padL+gw*i+gw/2, bx=cx-bw/2;
      const g=document.createElementNS(NS,'g'); g.dataset.i=i;
      const bar=document.createElementNS(NS,'rect');
      bar.setAttribute('x',bx);bar.setAttribute('width',bw);bar.setAttribute('rx',3);
      bar.setAttribute('fill',colorFor(r)); bar.id='cbar'+i; g.appendChild(bar);
      const v=document.createElementNS(NS,'text');
      v.setAttribute('x',cx);v.setAttribute('text-anchor','middle');v.setAttribute('font-size','14');
      v.setAttribute('class','val');v.setAttribute('fill',colorFor(r)); v.id='cval'+i; g.appendChild(v);
      const lab=document.createElementNS(NS,'text');
      lab.setAttribute('x',cx);lab.setAttribute('y',y0+22);lab.setAttribute('text-anchor','middle');
      lab.setAttribute('fill','var(--ink)');lab.setAttribute('font-size','13');lab.setAttribute('font-weight','500');
      lab.textContent=r.label; lab.id='clab'+i; g.appendChild(lab);
      svg.appendChild(g);
    });
    root.appendChild(svg);
  }
  // lt = mark's own local progress 0..1 (raw). Value-HEIGHT carries the value-safe
  // grow+overshoot (exact at lt>=1); value NUMBER is honest; label trails the bar.
  function drawCol(i,lt){
    const r=rows[i], cx=padL+gw*i+gw/2;
    const grow=settleQ(lt), lenF=valLen(lt);
    const cur=r.value*grow;                         // honest number
    const h=hOf(r.value*lenF);                      // value-safe height (≤3% overshoot, exact end)
    const bar=document.getElementById('cbar'+i);
    bar.setAttribute('y',y0-h); bar.setAttribute('height',h);
    const v=document.getElementById('cval'+i);
    v.setAttribute('y', y0-h-7); v.textContent=fmtU(cur);
    v.setAttribute('opacity', labelFade(lt));
  }
  function render(t){
    fadeAxis(t);
    // every column rides the same uniform staggered cascade — none singled out
    rows.forEach((r,i)=>{ const [s,d]=cascade(i, rows.length); drawCol(i, sub(t,s,d)); });
  }
  return {build,render};
})();

/* =====================================================================
   LOLLIPOP — ranking; stem draws + dot pops. Every row the same house accent,
   uniform staggered cascade — none singled out.
   ===================================================================== */
const LOLLI = (function(){
  const rows=SPEC.rows||[], n=rows.length;
  // log mode adds a row of power-of-ten tick labels below the axis -> more padB.
  const W=860, padT=24, rowH=46, padB=(LOG.on?28:20);
  // In log mode the largest dot lands at the axis end (frac=1 when max is a power
  // of ten), so its value label needs room — reserve padR for the widest label.
  const _maxValW=Math.max(0,...rows.map(r=>RAIL.textW(fmtU(+r.value),13)));
  const padR=LOG.on ? Math.max(70, Math.ceil(_maxValW+10+RAIL.INSET)) : 70;
  const padL=Math.max(120, RAIL.reserveGutter(rows.map(r=>r.label),14,16));
  const H=padT+padB+Math.max(1,n)*rowH, innerW=W-padL-padR;
  const DHI=Math.max(...rows.map(r=>+r.value), 0)*1.08 || 1;
  const X=v=> LOG.on ? padL+LOG.frac(v)*innerW : padL+(Math.max(0,v)/DHI)*innerW;
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    if(LOG.on) drawLogGridV(svg, X, padT-4, H-padB+4, H-padB+16);
    const ax=document.createElementNS(NS,'line'); ax.setAttribute('class','d2m-axis');
    ax.setAttribute('x1',padL);ax.setAttribute('x2',padL);ax.setAttribute('y1',padT-4);ax.setAttribute('y2',H-padB+4);
    ax.setAttribute('stroke','var(--grid)');ax.setAttribute('stroke-width','1.5'); svg.appendChild(ax);
    rows.forEach((r,i)=>{
      const y=padT+i*rowH+rowH/2, col=colorFor(r);
      const lab=document.createElementNS(NS,'text');
      lab.setAttribute('x',padL-16);lab.setAttribute('y',y+5);lab.setAttribute('text-anchor','end');
      lab.setAttribute('fill','var(--ink)');lab.setAttribute('font-size','14');
      lab.setAttribute('font-weight',500);lab.textContent=r.label; lab.id='llab'+i; svg.appendChild(lab);
      const stem=document.createElementNS(NS,'line');
      stem.setAttribute('x1',padL);stem.setAttribute('y1',y);stem.setAttribute('x2',padL);stem.setAttribute('y2',y);
      stem.setAttribute('stroke',col);stem.setAttribute('stroke-width',2);
      stem.id='lstem'+i; svg.appendChild(stem);
      const dot=document.createElementNS(NS,'circle');
      dot.setAttribute('cx',padL);dot.setAttribute('cy',y);dot.setAttribute('r',0);dot.setAttribute('fill',col);
      dot.id='ldot'+i; svg.appendChild(dot);
      const v=document.createElementNS(NS,'text');
      v.setAttribute('y',y+5);v.setAttribute('font-size','13');v.setAttribute('class','val');v.setAttribute('fill',col);
      v.id='lval'+i; svg.appendChild(v);
    });
    root.appendChild(svg);
  }
  // lt = mark's own local progress (raw). Dot POSITION is value-encoding (value-safe
  // valLen, exact at lt>=1); dot RADIUS does a small non-value scale-pulse settle;
  // value NUMBER is honest; value label trails the dot.
  function drawRow(i,lt){
    const r=rows[i], y=padT+i*rowH+rowH/2;
    const grow=settleQ(lt), x=X(r.value*valLen(lt)), cur=r.value*grow;
    document.getElementById('lstem'+i).setAttribute('x2',x);
    const dot=document.getElementById('ldot'+i); dot.setAttribute('cx',x);
    dot.setAttribute('r',(6*elastic(Math.min(1,lt*1.15),0.10)).toFixed(2));
    const v=document.getElementById('lval'+i); v.setAttribute('x',x+10);
    v.textContent=fmtU(cur); v.setAttribute('opacity', labelFade(lt));
  }
  function render(t){
    fadeAxis(t);
    // every row rides the same uniform staggered cascade — none singled out
    rows.forEach((r,i)=>{ const [s,d]=cascade(i, rows.length); drawRow(i, sub(t,s,d)); });
  }
  return {build,render};
})();

/* =====================================================================
   LINE / AREA — single series over an ordered x. Draw-on / wipe reveal.
   Spec: series:[{label, points:[[x,y],...]}]. Uses first series.
   ===================================================================== */
const LINE = (function(){
  const isArea = (CHART==='area');
  const s = (SPEC.series && SPEC.series[0]) ? SPEC.series[0] : {label:'', points:[]};
  const pts = (s.points||[]).slice().sort((a,b)=>a[0]-b[0]);
  const xs=pts.map(p=>+p[0]), ys=pts.map(p=>+p[1]), n=pts.length;
  const endTxt = fmtU(ys.length?ys[n-1]:0);
  const endLbl = (s.label? s.label+'  ':'') + endTxt;   // direct end-label = series + value
  const W=860, padL=Math.max(40,RAIL.INSET+24), padT=30, padB=52;
  const padR=Math.max(64, Math.ceil(RAIL.textW(endLbl,15)+14+RAIL.INSET));
  const H=360, innerW=W-padL-padR, baseY=H-padB;
  const xlo=Math.min(...xs), xhi=Math.max(...xs), xr=(xhi-xlo)||1;
  const ylo=Math.min(isArea?0:Math.min(...ys),...ys), yhi=Math.max(...ys), yr=(yhi-ylo)||1;
  const X=v=>padL+((v-xlo)/xr)*innerW, Y=v=>baseY-((v-ylo)/yr)*(baseY-padT);
  let pathEl, fillEl, clipRect, L, dotEl;
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const uid='ln'+Math.random().toString(36).slice(2,7);
    if(isArea){
      const defs=document.createElementNS(NS,'defs');
      const grad=document.createElementNS(NS,'linearGradient');
      grad.id=uid+'g';grad.setAttribute('x1','0');grad.setAttribute('y1','0');grad.setAttribute('x2','0');grad.setAttribute('y2','1');
      [['0','0.42'],['1','0.03']].forEach(([off,op])=>{const st=document.createElementNS(NS,'stop');
        st.setAttribute('offset',off);st.setAttribute('stop-color','var(--amber)');st.setAttribute('stop-opacity',op);grad.appendChild(st);});
      const clip=document.createElementNS(NS,'clipPath'); clip.id=uid+'c';
      clipRect=document.createElementNS(NS,'rect');
      clipRect.setAttribute('x',padL);clipRect.setAttribute('y','0');clipRect.setAttribute('width','0');clipRect.setAttribute('height',H);
      clip.appendChild(clipRect); defs.appendChild(grad); defs.appendChild(clip); svg.appendChild(defs);
      svg.dataset.uid=uid;
    }
    const ax=document.createElementNS(NS,'line'); ax.setAttribute('class','d2m-axis');
    ax.setAttribute('x1',padL);ax.setAttribute('x2',W-padR);ax.setAttribute('y1',baseY);ax.setAttribute('y2',baseY);
    ax.setAttribute('stroke','var(--grid)');ax.setAttribute('stroke-width','1.5'); svg.appendChild(ax);
    // axis label (x_label) — sits below the axis, inside the bottom inset
    if(SPEC.x_label){ const t=document.createElementNS(NS,'text'); t.setAttribute('class','d2m-axis');
      t.setAttribute('x',(padL+W-padR)/2);t.setAttribute('y',baseY+26);t.setAttribute('text-anchor','middle');
      t.setAttribute('fill','var(--muted)');t.setAttribute('font-size','12'); t.textContent=SPEC.x_label; svg.appendChild(t); }
    const dd=pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
    if(isArea){
      fillEl=document.createElementNS(NS,'path');
      fillEl.setAttribute('d',dd+` L${X(xs[n-1]).toFixed(1)} ${baseY} L${X(xs[0]).toFixed(1)} ${baseY} Z`);
      fillEl.setAttribute('fill',`url(#${uid}g)`);fillEl.setAttribute('clip-path',`url(#${uid}c)`); svg.appendChild(fillEl);
    }
    pathEl=document.createElementNS(NS,'path');
    pathEl.setAttribute('d',dd);pathEl.setAttribute('fill','none');pathEl.setAttribute('stroke','var(--amber)');
    pathEl.setAttribute('stroke-width','2.6');pathEl.setAttribute('stroke-linejoin','round');pathEl.setAttribute('stroke-linecap','round');
    if(isArea) pathEl.setAttribute('clip-path',`url(#${uid}c)`);
    svg.appendChild(pathEl);
    L = pathEl.getTotalLength ? pathEl.getTotalLength() : innerW;
    if(!isArea) pathEl.setAttribute('stroke-dasharray',L);
    const lx=X(xs[n-1]), ly=Y(ys[n-1]);
    dotEl=document.createElementNS(NS,'circle');
    dotEl.setAttribute('cx',lx);dotEl.setAttribute('cy',ly);dotEl.setAttribute('r',4);dotEl.setAttribute('fill','var(--amber)');
    svg.appendChild(dotEl);
    const vl=document.createElementNS(NS,'text');
    const lyc=Math.max(padT+RAIL.INSET, Math.min(H-padB-RAIL.INSET, ly+5));
    vl.setAttribute('x',lx+10);vl.setAttribute('y',lyc);vl.setAttribute('fill','var(--amber)');
    vl.setAttribute('font-size','15');vl.setAttribute('class','val');vl.setAttribute('font-weight','600');
    vl.textContent = endLbl; vl.id='lend'; svg.appendChild(vl);
    root.appendChild(svg);
  }
  function render(t){
    fadeAxis(t);
    // Secondary action: axis is in first; the line draws on with a slow-out
    // (outQuint) eased ALONG the path; the end dot + direct label settle in only
    // AFTER the draw passes ~70% (label trails its mark).
    const [ds,dd]=phase(0.04, 0.84);
    const drLt=sub(t,ds,dd), dr=settleQ(drLt);
    if(isArea){ if(clipRect) clipRect.setAttribute('width',innerW*dr); }
    else { pathEl.setAttribute('stroke-dashoffset',L*(1-dr)); }
    const o=labelFade(drLt);
    dotEl.setAttribute('opacity',o); const e=document.getElementById('lend'); if(e)e.setAttribute('opacity',o);
  }
  return {build,render};
})();

/* =====================================================================
   MULTILINE — 2-4 series, draw-on, DIRECT de-collided end-labels.
   MULTI-SERIES: each series a DISTINCT categorical house colour (PALETTE by
   index) — all equal, none highlighted, none greyed. Uniform staggered draw-on.
   Spec: series:[{label, points:[[x,y],...], role?}].
   ===================================================================== */
const MULTI = (function(){
  const S=(SPEC.series||[]).map(s=>({label:s.label, role:s.role,
    points:(s.points||[]).slice().sort((a,b)=>a[0]-b[0])}));
  const lblFs=15, LINEH=22;   // de-collision line-height (real Barlow @15px renders ~20px tall)
  const W=860, padL=Math.max(40,RAIL.INSET+24), padT=30, padB=52;
  const padR=Math.max(80, Math.ceil(Math.max(0,...S.map(s=>RAIL.textW(s.label,lblFs)))+16+RAIL.INSET));
  const H=360, innerW=W-padL-padR, baseY=H-padB;
  const allX=S.flatMap(s=>s.points.map(p=>+p[0]));
  const allY=S.flatMap(s=>s.points.map(p=>+p[1]));
  const xlo=Math.min(...allX), xhi=Math.max(...allX), xr=(xhi-xlo)||1;
  const ylo=Math.min(...allY), yhi=Math.max(...allY), yr=(yhi-ylo)||1;
  const X=v=>padL+((v-xlo)/xr)*innerW, Y=v=>baseY-((v-ylo)/yr)*(baseY-padT);
  // each series owns a distinct categorical hue (role override stays honest)
  function seriesColor(s,si){ return (s.role&&colorFor(s)!==C.accent)?colorFor(s):PALETTE(si); }
  const paths=[];
  function endY(s){ const p=s.points; return Y(p[p.length-1][1]); }
  function labelYs(){
    // clamp the top floor FIRST so the de-collision sees real positions, then
    // de-collide downward (so a label parked at the floor can't be re-buried).
    const top=padT+RAIL.INSET, bot=H-padB-RAIL.INSET;
    const boxes=S.map((s,si)=>({si,y:Math.max(top, Math.min(bot, endY(s))),h:LINEH}));
    RAIL.noOverlap(boxes,LINEH);
    const out=[]; boxes.forEach(b=>{ out[b.si]=Math.min(bot, b.y); });
    return out;
  }
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const ax=document.createElementNS(NS,'line'); ax.setAttribute('class','d2m-axis');
    ax.setAttribute('x1',padL);ax.setAttribute('x2',W-padR);ax.setAttribute('y1',baseY);ax.setAttribute('y2',baseY);
    ax.setAttribute('stroke','var(--grid)');ax.setAttribute('stroke-width','1.5'); svg.appendChild(ax);
    if(SPEC.x_label){ const t=document.createElementNS(NS,'text'); t.setAttribute('class','d2m-axis');
      t.setAttribute('x',(padL+W-padR)/2);t.setAttribute('y',baseY+26);t.setAttribute('text-anchor','middle');
      t.setAttribute('fill','var(--muted)');t.setAttribute('font-size','12'); t.textContent=SPEC.x_label; svg.appendChild(t); }
    paths.length=0; const lys=labelYs();
    S.forEach((s,si)=>{
      const col= seriesColor(s,si);
      const dd=s.points.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
      const pa=document.createElementNS(NS,'path');
      pa.setAttribute('d',dd);pa.setAttribute('fill','none');pa.setAttribute('stroke',col);
      pa.setAttribute('stroke-width', 2.4);pa.setAttribute('stroke-linejoin','round');pa.setAttribute('stroke-linecap','round');
      svg.appendChild(pa);
      const L = pa.getTotalLength ? pa.getTotalLength() : innerW; pa.setAttribute('stroke-dasharray',L);
      const lp=s.points[s.points.length-1];
      const lx=X(lp[0]);
      // leader if the label was nudged off its line endpoint
      if(Math.abs(lys[si]-endY(s))>2){
        const ld=document.createElementNS(NS,'path');
        ld.setAttribute('d',`M${lx} ${endY(s).toFixed(1)} L${(lx+8).toFixed(1)} ${lys[si].toFixed(1)}`);
        ld.setAttribute('fill','none');ld.setAttribute('stroke',col);ld.setAttribute('stroke-width','1');ld.setAttribute('opacity','.5');
        ld.id='mld'+si; svg.appendChild(ld);
      }
      const lab=document.createElementNS(NS,'text');
      lab.setAttribute('x',lx+10);lab.setAttribute('y',lys[si]+5);lab.setAttribute('fill',col);
      lab.setAttribute('font-size', 14);lab.setAttribute('font-weight', 600);
      lab.textContent=s.label; lab.id='mlab'+si; svg.appendChild(lab);
      paths.push({pa,L});
    });
    root.appendChild(svg);
  }
  function render(t){
    fadeAxis(t);
    // Follow-through: every series draws on in the SAME uniform staggered cascade
    // (none singled out). Each series' direct label trails its OWN line.
    S.forEach((s,si)=>{
      const [st,du]=cascade(si, S.length);
      const drLt=sub(t,st,du), dr=settleQ(drLt);
      paths[si].pa.setAttribute('stroke-dashoffset',paths[si].L*(1-dr));
      const o=labelFade(drLt);
      document.getElementById('mlab'+si).setAttribute('opacity',o);
      const ld=document.getElementById('mld'+si); if(ld)ld.setAttribute('opacity',0.5*o);
    });
  }
  return {build,render};
})();

/* =====================================================================
   STACKED — parts of a whole across categories (pie replacement).
   MULTI-SERIES: each series a DISTINCT categorical house colour (PALETTE by
   index) — all equal, none highlighted, none greyed. Uniform staggered grow.
   Spec: categories:[...], series:[{label, values:[...], role?}].
   ===================================================================== */
const STACK = (function(){
  const cats=SPEC.categories||[];
  const series=(SPEC.series||[]);
  const m=cats.length, k=series.length;
  // build D[ci][si]
  const D=[]; for(let ci=0;ci<m;ci++){ D.push(series.map(s=>+(s.values&&s.values[ci]||0))); }
  const segFs=14;
  const W=860, padL=Math.max(70,RAIL.INSET+8), padT=24, padB=44;
  const padR=Math.max(120, Math.ceil(Math.max(0,...series.map(s=>RAIL.textW(s.label,segFs)))+24+RAIL.INSET));
  const H=360, innerH=H-padT-padB, innerW=W-padL-padR;
  const gw=innerW/Math.max(1,m), bw=Math.min(gw*0.5,96);
  const totals=D.map(row=>row.reduce((a,b)=>a+b,0));
  // each series owns a distinct categorical hue (role override stays honest)
  const segColor=si=>{ const s=series[si];
    return (s&&s.role&&colorFor(s)!==C.accent)?colorFor(s):PALETTE(si); };
  const cells=[];
  function geom(){
    cells.length=0;
    D.forEach((row,ci)=>{
      const tot=totals[ci]||1;
      const x=padL+gw*ci+(gw-bw)/2; let accFrac=0;
      row.forEach((v,si)=>{
        const frac=v/tot;
        const yTop=padT+innerH*accFrac, h=innerH*frac;
        cells.push({ci,si,x,yTop,h,frac:v/(totals[ci]||1)});
        accFrac+=frac;
      });
    });
  }
  function build(){
    root.innerHTML=''; geom();
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    cells.forEach((c,idx)=>{
      const r=document.createElementNS(NS,'rect');
      r.setAttribute('x',c.x);r.setAttribute('width',bw);
      r.setAttribute('fill',segColor(c.si));
      r.setAttribute('opacity', 1);
      r.id='seg'+idx; svg.appendChild(r);
    });
    cats.forEach((cat,ci)=>{
      const cx=padL+gw*ci+gw/2;
      const t=document.createElementNS(NS,'text');
      t.setAttribute('x',cx);t.setAttribute('y',H-padB+22);t.setAttribute('text-anchor','middle');
      t.setAttribute('fill','var(--ink)');t.setAttribute('font-size','13');t.setAttribute('font-weight','500');
      t.textContent=cat; svg.appendChild(t);
    });
    const lastX=padL+gw*(m-1)+(gw-bw)/2, labX=lastX+bw+14;
    const boxes=series.map((s,si)=>{ const c=cells.find(c=>c.ci===m-1&&c.si===si)||{yTop:padT,h:0};
      return {si, y:c.yTop+c.h/2, h:18, segMidY:c.yTop+c.h/2, segH:c.h, name:s.label}; });
    RAIL.noOverlap(boxes,18);
    boxes.forEach(b=>{ b.y=Math.max(padT+RAIL.INSET, Math.min(H-padB-RAIL.INSET, b.y)); });
    boxes.forEach(b=>{
      const off = Math.abs(b.y-b.segMidY)>2 || RAIL.externalize(b.segH, b.name, segFs);
      if(off){
        const ld=document.createElementNS(NS,'path');
        ld.setAttribute('d',`M${lastX+bw} ${b.segMidY} L${labX-6} ${b.y}`);
        ld.setAttribute('fill','none');ld.setAttribute('stroke',segColor(b.si));
        ld.setAttribute('stroke-width','1');ld.setAttribute('opacity','.5');
        ld.id='sld'+b.si; svg.appendChild(ld);
      }
      const lab=document.createElementNS(NS,'text');
      lab.setAttribute('x',labX);lab.setAttribute('y',b.y+4);
      lab.setAttribute('fill',segColor(b.si));
      lab.setAttribute('font-size', 13);
      lab.setAttribute('font-weight', 600);
      // every series gets its last-column share (all equal — none singled out)
      let txt=b.name;
      const c=cells.find(c=>c.ci===m-1&&c.si===b.si);
      if(c) txt=b.name+'  '+Math.round(c.frac*100)+'%';
      lab.textContent=txt; lab.id='sl'+b.si; svg.appendChild(lab);
    });
    root.appendChild(svg);
  }
  function render(t){
    // Follow-through: stacks grow column-by-column in a uniform CASCADE (one slice
    // per category), each ~STAG apart; outQuint slow-out grow. No segment is
    // singled out — every series grows on the same clock.
    cells.forEach((c,idx)=>{
      const [s,d]=cascade(c.ci, m, {to:0.74});
      const lt=settleQ(sub(t, s, d));
      const r=document.getElementById('seg'+idx);
      r.setAttribute('y',c.yTop); r.setAttribute('height',Math.max(0,c.h*lt));
    });
    // direct labels trail their segments (secondary action): tie the fade to the
    // last column's grow so a label never appears before its segment is there.
    const o=labelFade(settleQ(sub(t, cascade(m-1,m,{to:0.74})[0], cascade(m-1,m,{to:0.74})[1])));
    series.forEach((s,si)=>{ const el=document.getElementById('sl'+si); if(el)el.setAttribute('opacity',o);
      const ld=document.getElementById('sld'+si); if(ld)ld.setAttribute('opacity',0.5*o); });
  }
  return {build,render};
})();

/* =====================================================================
   SCATTER — points pop/scale in. Single-series: every point the SAME house
   accent, uniform staggered pop — none singled out. Spec: points:[{label,x,y,size?}].
   ===================================================================== */
const SCAT = (function(){
  const P=(SPEC.points||[]);
  const W=860, padL=56, padR=40, padB=52;
  const padT = SPEC.y_label ? 44 : 28;   // headroom for the horizontal y-axis caption
  const H=360, innerW=W-padL-padR, innerH=H-padT-padB;
  const xs=P.map(p=>+p.x), ys=P.map(p=>+p.y);
  const xlo=Math.min(...xs), xhi=Math.max(...xs), xr=(xhi-xlo)||1;
  const ylo=Math.min(...ys), yhi=Math.max(...ys), yr=(yhi-ylo)||1;
  // pad domains 8% so points don't sit on the axis
  const xpad=xr*0.08, ypad=yr*0.08;
  const X=v=>padL+((v-(xlo-xpad))/((xr+2*xpad)||1))*innerW;
  const Y=v=>(H-padB)-((v-(ylo-ypad))/((yr+2*ypad)||1))*innerH;
  const hasSize=P.some(p=>typeof p.size==='number');
  const smax=Math.max(1,...P.map(p=>+(p.size||0)));
  function rad(p){ return hasSize ? (7+18*Math.sqrt((+(p.size||0))/smax)) : 6; }
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    [['x',padL,H-padB,W-padR,H-padB],['y',padL,padT,padL,H-padB]].forEach(([,x1,y1,x2,y2])=>{
      const ax=document.createElementNS(NS,'line'); ax.setAttribute('class','d2m-axis');
      ax.setAttribute('x1',x1);ax.setAttribute('y1',y1);ax.setAttribute('x2',x2);ax.setAttribute('y2',y2);
      ax.setAttribute('stroke','var(--grid)');ax.setAttribute('stroke-width','1.5'); svg.appendChild(ax);
    });
    if(SPEC.x_label){ const t=document.createElementNS(NS,'text');
      t.setAttribute('x',(padL+W-padR)/2);t.setAttribute('y',(H-padB)+30);t.setAttribute('text-anchor','middle');
      t.setAttribute('fill','var(--muted)');t.setAttribute('font-size','12'); t.textContent=SPEC.x_label; svg.appendChild(t); }
    if(SPEC.y_label){ const t=document.createElementNS(NS,'text');   // horizontal caption above the y-axis top
      t.setAttribute('x',padL);t.setAttribute('y',padT-16);t.setAttribute('text-anchor','start');
      t.setAttribute('fill','var(--muted)');t.setAttribute('font-size','12'); t.textContent=SPEC.y_label; svg.appendChild(t); }
    P.forEach((p,i)=>{
      const col=colorFor(p);
      const c=document.createElementNS(NS,'circle');
      c.setAttribute('cx',X(p.x));c.setAttribute('cy',Y(p.y));
      c.setAttribute('fill',col);c.setAttribute('fill-opacity',0.8);
      c.id='pt'+i; svg.appendChild(c);
      if(p.label){
        const lab=document.createElementNS(NS,'text');
        const lx=Math.min(W-RAIL.INSET-RAIL.textW(p.label,13), X(p.x)+rad(p)+7);
        lab.setAttribute('x',lx);lab.setAttribute('y',Y(p.y)+5);
        lab.setAttribute('fill','var(--ink)');
        lab.setAttribute('font-size',13);lab.setAttribute('font-weight',500);
        lab.setAttribute('opacity',0.9);
        lab.textContent=p.label; lab.id='ptlab'+i; svg.appendChild(lab);
      }
    });
    root.appendChild(svg);
  }
  function render(t){
    fadeAxis(t);
    // Follow-through: every point pops in the SAME uniform staggered cascade —
    // none singled out. Radius settle: when size encodes a VALUE it is value-safe
    // (valLen, ≤3%); otherwise a dot uses a scale-pulse (elastic). Labels trail.
    P.forEach((p,i)=>{
      const [st,du]=cascade(i, P.length);
      const lt=sub(t,st,du);
      const rf = hasSize ? valLen(lt) : elastic(Math.min(1,lt*1.05), 0.06);
      const c=document.getElementById('pt'+i);
      c.setAttribute('r',Math.max(0,rad(p)*rf));
      c.setAttribute('opacity',Ease.outCubic(lt));
      const ll=document.getElementById('ptlab'+i);
      if(ll) ll.setAttribute('opacity', labelFade(lt));
    });
  }
  return {build,render};
})();

/* =====================================================================
   DUMBBELL / SLOPE — before(LEFT) -> after(RIGHT), y=value. Direction-locked.
   Each row coloured by its honest DIRECTION (down→red, up→teal) — semantic, not
   emphasis. Uniform staggered move — no row singled out.
   Spec: start_label, end_label, rows:[{label, start, end, role?}].
   ===================================================================== */
const DUMB = (function(){
  const rows=SPEC.rows||[];
  const W=860, padT=40, padB=46;
  const padL=Math.max(120, RAIL.reserveGutter(rows.map(r=>r.label),14,16));
  const deltaW=Math.max(0,...rows.map(r=>RAIL.textW('↓ -99%',13)));
  const padR=Math.max(96, Math.ceil(deltaW+18+RAIL.INSET));
  const H=360, innerW=W-padL-padR, innerH=H-padT-padB;
  const xL=padL, xR=W-padR;
  const allV=rows.flatMap(r=>[+r.start,+r.end]);
  const vlo=Math.min(...allV), vhi=Math.max(...allV), vr=(vhi-vlo)||1;
  const Y=v=>padT+innerH-((v-vlo)/vr)*innerH;
  // honest direction colour (down→red, up→teal); explicit role overrides; flat→accent
  function rowColor(r){
    if(r.role==='good'||r.role==='up') return 'var(--teal)';
    if(r.role==='bad'||r.role==='down') return 'var(--red)';
    return r.end<r.start ? 'var(--red)' : (r.end>r.start ? 'var(--teal)' : 'var(--amber)'); }
  function build(){
    root.innerHTML='';
    const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    [[xL,SPEC.start_label||'before'],[xR,SPEC.end_label||'after']].forEach(([x,lbl])=>{
      const ln=document.createElementNS(NS,'line'); ln.setAttribute('class','d2m-axis');
      ln.setAttribute('x1',x);ln.setAttribute('x2',x);ln.setAttribute('y1',padT-6);ln.setAttribute('y2',H-padB+4);
      ln.setAttribute('stroke','var(--grid)');ln.setAttribute('stroke-width','1.5'); svg.appendChild(ln);
      const t=document.createElementNS(NS,'text'); t.setAttribute('class','d2m-axis');
      t.setAttribute('x',x);t.setAttribute('y',H-padB+22);t.setAttribute('text-anchor','middle');
      t.setAttribute('fill','var(--muted)');t.setAttribute('font-size','12'); t.textContent=lbl; svg.appendChild(t);
    });
    rows.forEach((r,i)=>{
      const col=rowColor(r);
      const dir=RAIL.orderPair(+r.start, +r.end, xL, xR);
      const yB=Y(r.start), yA=Y(r.end);
      const seg=document.createElementNS(NS,'line');
      seg.setAttribute('x1',dir.xStart);seg.setAttribute('y1',yB);seg.setAttribute('x2',dir.xStart);seg.setAttribute('y2',yB);
      seg.setAttribute('stroke',col);seg.setAttribute('stroke-width',2.6);seg.setAttribute('opacity',1);
      seg.dataset.x1=dir.xStart;seg.dataset.y1=yB;seg.dataset.x2=dir.xEnd;seg.dataset.y2=yA;
      seg.id='sg'+i; svg.appendChild(seg);
      const d1=document.createElementNS(NS,'circle');
      d1.setAttribute('cx',dir.xStart);d1.setAttribute('cy',yB);d1.setAttribute('r',5.5);
      d1.setAttribute('fill','var(--muted)');d1.setAttribute('opacity',1); d1.id='sa'+i; svg.appendChild(d1);
      const d2=document.createElementNS(NS,'circle');
      d2.setAttribute('cx',dir.xEnd);d2.setAttribute('cy',yA);
      d2.setAttribute('fill',col);d2.setAttribute('opacity',1);d2.setAttribute('r',0); d2.id='sb'+i; svg.appendChild(d2);
      const lab=document.createElementNS(NS,'text');
      lab.setAttribute('x',padL-16);lab.setAttribute('y',yB+5);lab.setAttribute('text-anchor','end');
      lab.setAttribute('fill','var(--ink)');lab.setAttribute('font-size','14');
      lab.setAttribute('font-weight',500); lab.textContent=r.label; lab.id='snm'+i; svg.appendChild(lab);
      const dl=document.createElementNS(NS,'text');
      const dly=Math.max(padT+RAIL.INSET, Math.min(H-padB-RAIL.INSET, yA+4));
      dl.setAttribute('x',dir.xEnd+12);dl.setAttribute('y',dly);dl.setAttribute('text-anchor','start');
      dl.setAttribute('fill',col);dl.setAttribute('font-size','13');dl.setAttribute('class','val');
      dl.setAttribute('font-weight',600); dl.textContent=dir.deltaLabel; dl.id='sd'+i; svg.appendChild(dl);
    });
    root.appendChild(svg);
  }
  // lt = raw local progress. The slope is an A→B reposition, so it travels with
  // inOutCubic (the house convention for a reorder/move); the end dot pops with a
  // small non-value scale-pulse; the delta label trails the segment.
  function drawSlope(i,lt){
    const seg=document.getElementById('sg'+i);
    const x1=+seg.dataset.x1,y1=+seg.dataset.y1,x2=+seg.dataset.x2,y2=+seg.dataset.y2;
    const e=Ease.inOutCubic(lt);
    seg.setAttribute('x2',x1+(x2-x1)*e); seg.setAttribute('y2',y1+(y2-y1)*e);
    const d2=document.getElementById('sb'+i);
    d2.setAttribute('r',(6*elastic(Math.min(1,lt*1.1),0.10)).toFixed(2));
    const dl=document.getElementById('sd'+i);
    if(dl)dl.setAttribute('opacity',labelFade(lt));
  }
  function render(t){
    fadeAxis(t);
    // every row rides the same uniform staggered move — none singled out
    rows.forEach((r,i)=>{ const [s,d]=cascade(i, rows.length); drawSlope(i, sub(t,s,d)); });
  }
  return {build,render};
})();

/* ---- dispatcher: route SPEC.chart to its module (one shared clock/theme/controls) ---- */
const CHARTS = {
  kpi:KPI, bar:BAR, diverging:BAR, column:COL, lollipop:LOLLI,
  line:LINE, area:LINE, multiline:MULTI, stacked:STACK, scatter:SCAT, dumbbell:DUMB
};
function chartMod(){ return CHARTS[CHART] || BAR; }
function buildChart(){ chartMod().build(); }
function draw(t){ chartMod().render(t); }

let DUR = SPEC.duration||1400, slow=false, speedMul=1;
const stage = ()=>document.getElementById('stage');
function play(){
  killAnims(stage()); buildChart();
  const dur = DUR * (slow?3:1) / speedMul;
  tween(stage(), {dur, ease:Ease.linear, onUpdate:draw, onDone:()=>{ window.__d2mReady=true; }});
}
function finalState(){ killAnims(stage()); buildChart(); draw(1); window.__d2mReady=true; }

// boot
if(REDUCE){ finalState(); }
else if(SEEK!==null){ buildChart(); draw(Math.max(0,Math.min(1,SEEK/DUR))); window.__d2mReady=true; }
else {
  buildChart();
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){play();io.disconnect();}});},{threshold:.3});
    io.observe(stage());
  } else play();
}
// controls
document.getElementById('replay').onclick=play;
document.getElementById('stage').onclick=play;
document.getElementById('freeze').onclick=finalState;
__THEMEJS__
// ---- view / copy code ----
document.getElementById('code').onclick=()=>{const dlg=document.getElementById('codeDlg');dlg.querySelector('pre').textContent='<!doctype html>\n'+document.documentElement.outerHTML;dlg.showModal();};
document.getElementById('codeClose').onclick=()=>document.getElementById('codeDlg').close();
document.getElementById('codeCopy').onclick=()=>{const t=document.getElementById('codeDlg').querySelector('pre').textContent;navigator.clipboard&&navigator.clipboard.writeText(t);};

window.__d2mReady = window.__d2mReady||false;
"""

# =====================================================================
# PAGE — the dark-console template. Barlow via <link>, control bar, dialog.
# =====================================================================
PAGE = r"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
__FONTLINK__
<style>
  :root{
    --bg:#0d0f12; --panel:#14171c; --grid:#222831; --ink:#e8edf2; --muted:#7d8794;
    --red:#c0171f; --teal:#46b8a5; --amber:#d9933d;
    /* categorical palette — multi-series only; each series a distinct equal hue */
    --blue:#4a90d9; --purple:#a87bd1; --green:#6cb86a;
  }
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);
    font-family:'Barlow',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;}
  .wrap{max-width:900px;margin:0 auto;padding:34px 28px 26px;}
  header h1{font-size:19px;font-weight:600;letter-spacing:.2px;margin:0 0 6px;}
  header .take{font-size:14px;color:var(--muted);line-height:1.5;margin:0;max-width:64ch;}
  #stage{margin:26px 0 14px;background:var(--panel);border:1px solid var(--grid);
    border-radius:12px;padding:18px 20px 10px;cursor:pointer;}
  svg{display:block;width:100%;height:auto;font-variant-numeric:tabular-nums;}
  .val{font-variant-numeric:tabular-nums;font-weight:600;}
  footer{display:flex;flex-wrap:wrap;align-items:center;gap:14px;
    font-size:12px;color:var(--muted);}
  button,.ctrl{background:var(--panel);color:var(--ink);border:1px solid var(--grid);
    border-radius:7px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer;}
  button:hover{border-color:var(--muted);}
  input[type=range]{accent-color:var(--amber);vertical-align:middle;}
  .src{margin-left:auto;text-align:right;max-width:46ch;line-height:1.4;}
  .src a{color:var(--muted);}
  .pill{display:inline-block;padding:2px 8px;border:1px solid var(--grid);border-radius:20px;font-size:11px;}
  body.light{--bg:#fafaf7;--panel:#ffffff;--grid:#e6e7e2;--ink:#16181d;--muted:#6b7280;}
  .tools{display:flex;gap:7px;align-items:center;flex:none;}
  .schemeBtn{width:28px;height:14px;padding:0;border-radius:4px;border:1.5px solid transparent;cursor:pointer;box-shadow:0 0 0 1px var(--grid);}
  .schemeBtn.on{border-color:var(--ink);}
  dialog#codeDlg{background:var(--panel);color:var(--ink);border:1px solid var(--grid);border-radius:12px;max-width:90vw;width:760px;padding:0;}
  dialog#codeDlg .dh{display:flex;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--grid);}
  dialog#codeDlg pre{margin:0;padding:14px;overflow:auto;max-height:64vh;font:12px/1.5 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;word-break:break-all;}
  dialog::backdrop{background:rgba(0,0,0,.55);}
__FTSTYLE__</style></head>
<body__BODYCLASS__><div class="wrap">
  <header style="display:flex;align-items:flex-start;gap:16px">
    <div style="flex:1;min-width:0">
      <h1>__TITLE__</h1>
      <p class="take">__TAKE__</p>
    </div>
__HEADERTOOLS__
  </header>
  <main id="stage" title="click to replay"><div id="chart-root"></div></main>
  <footer>
__FOOTERCTRLS__    <button id="code">&lt;/&gt; Code</button>
    <span class="src">__SOURCE__</span>
  </footer>
  <dialog id="codeDlg">
    <div class="dh"><strong style="font-size:12px">Source &mdash; single self-contained file</strong>
      <button id="codeCopy" style="margin-left:auto">Copy</button><button id="codeClose">Close</button></div>
    <pre></pre>
  </dialog>
</div>
<script>
__ENGINE__
__CHARTS__
</script>
</body></html>
"""

# =====================================================================
# THEME FRAGMENTS — the only thing that differs between the two visual styles.
# A theme is purely a token swap + a control-bar swap; the chart builders (which
# drive every colour through CSS vars / colorFor) are NEVER touched. The
# `essential` fragments below reproduce today's output byte-for-byte; the `ft`
# fragments emit the Financial Times light-poster look.
# =====================================================================

# ---- font <link> ---------------------------------------------------
FONTLINK_ESSENTIAL = (
    '<link href="https://fonts.googleapis.com/css2?'
    'family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">'
)
FONTLINK_FT = (
    '<link href="https://fonts.googleapis.com/css2?'
    'family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;'
    '1,8..60,300;1,8..60,400&family=Inter:wght@400;500;600;700&display=swap" '
    'rel="stylesheet">'
)

# ---- extra <style> appended for FT (essential appends nothing) -----
# A `body.ft` override that (a) re-points the three house tokens at the FT
# palette so colorFor/C resolve to FT ink+accent without any builder change,
# and (b) restyles the surface, type and chrome to the FT light poster.
# __FTACCENT__ is the per-spec accent hue (spec "accent" or the FT default).
FTSTYLE_FT = r"""  body.ft{
    --bg:#ffffff; --bg2:#f7f6f2; --surface:#ffffff; --surface2:#f8f7f2;
    --line:#e4e1d7; --line-bright:#cfcabb; --r:2px;
    --panel:#ffffff; --grid:#cfcabb;
    --ink:#1c1c1e; --text:#1c1c1e; --text-dim:#54545b; --text-faint:#8c8980;
    /* token swap — the builders read these three for protagonist / good / bad */
    --amber:__FTACCENT__;   /* single-series house accent = the FT accent hue */
    --teal:#479e4f;         /* up / good = FT green */
    --red:#c0392b;          /* down / bad = FT red  */
    --muted:#b3ada0;        /* warm grey (axes, neutral chrome) */
    /* categorical palette — multi-series only; distinct FT editorial hues */
    --blue:#0f5499; --purple:#9c4a92; --green:#479e4f;
    --display:'Source Serif 4',Georgia,serif;
    --font:'Inter',-apple-system,system-ui,sans-serif;
  }
  body.ft{background:var(--bg);color:var(--text);font-family:var(--font);}
  body.ft .wrap{padding:38px 30px 28px;}
  body.ft header h1{font-family:var(--display);font-weight:400;font-size:27px;
    letter-spacing:-.2px;line-height:1.18;color:var(--text);}
  body.ft header .take{font-style:italic;font-size:15px;color:var(--text-dim);
    line-height:1.5;max-width:62ch;}
  body.ft #stage{background:var(--surface);border:1px solid var(--line);
    border-radius:var(--r);box-shadow:none;}
  body.ft footer{color:var(--text-faint);}
  body.ft button,body.ft .ctrl{background:var(--surface2);color:var(--text);
    border:1px solid var(--line);border-radius:var(--r);}
  body.ft button:hover{border-color:var(--line-bright);}
  body.ft input[type=range]{accent-color:var(--amber);}
  body.ft .src a{color:var(--text-dim);}
  body.ft dialog#codeDlg{background:var(--surface);color:var(--text);
    border:1px solid var(--line);border-radius:var(--r);}
  body.ft dialog#codeDlg .dh{border-bottom:1px solid var(--line);}
"""

# ---- header tools (scheme picker + dark/light) ---------------------
# Essential keeps the 3-scheme swatches + mode toggle. FT is the inherent light
# poster, so it shows NO theme chrome in the header (the slim editorial bar lives
# entirely in the footer).
HEADERTOOLS_ESSENTIAL = (
    '    <div class="tools">\n'
    '      <button class="schemeBtn" data-s="0" title="Aqua"></button>\n'
    '      <button class="schemeBtn" data-s="1" title="Indigo"></button>\n'
    '      <button class="schemeBtn" data-s="2" title="Ember"></button>\n'
    '      <button id="mode" title="dark / light">&#9790;</button>\n'
    '    </div>'
)
HEADERTOOLS_FT = '    <div class="tools"></div>'

# ---- footer controls (left of the always-present Code button) ------
FOOTERCTRLS_ESSENTIAL = (
    '    <button id="replay">&#8635; Replay</button>\n'
    '    <button id="slow" aria-pressed="false">&#128034; Slow-mo</button>\n'
    '    <label class="ctrl">Speed <input id="speed" type="range" min="0.25" max="2" step="0.05" value="1"></label>\n'
    '    <button id="freeze">&#9167; Freeze final</button>\n'
)
# FT: slim editorial bar — Replay · speed · Freeze final (no slow-mo toggle).
FOOTERCTRLS_FT = (
    '    <button id="replay">&#8635; Replay</button>\n'
    '    <label class="ctrl">Speed <input id="speed" type="range" min="0.25" max="2" step="0.05" value="1"></label>\n'
    '    <button id="freeze">&#9167; Freeze final</button>\n'
)

# ---- theme-switcher JS (between the freeze handler and the code dialog) -----
# Essential: slow-mo handler + speed handler + dark/light + 3 scheme swatches.
# FT: only the speed handler (no slow-mo button, no scheme/mode buttons exist),
#     so we must NOT query/wire them — that would throw on the missing nodes.
THEMEJS_ESSENTIAL = r"""document.getElementById('slow').onclick=e=>{slow=!slow;e.target.setAttribute('aria-pressed',slow);e.target.textContent=slow?'\u{1F422} Slow ON':'\u{1F422} Slow-mo';play();};
document.getElementById('speed').oninput=e=>{speedMul=+e.target.value;play();};

// ---- theme: dark/light + 3 colour schemes (CSS vars consumed by the SVG) ----
const SCHEMES=[['#2bb0a0','#d9933d','#c0392b'],['#6366f1','#0ea5b7','#f43f5e'],['#e8702a','#d9a521','#d6336c']];
let _scheme=0,_mode='dark';
try{const q=new URLSearchParams(location.search);_mode=q.get('mode')||localStorage.getItem('d2m-mode')||'dark';_scheme=+(q.get('scheme')||localStorage.getItem('d2m-scheme')||0);}catch(e){}
if(!(_scheme>=0&&_scheme<3))_scheme=0;
function applyTheme(){
  const rs=document.documentElement.style,a=SCHEMES[_scheme];
  rs.setProperty('--teal',a[0]);rs.setProperty('--amber',a[1]);rs.setProperty('--red',a[2]);
  document.body.classList.toggle('light',_mode==='light');
  const mb=document.getElementById('mode');if(mb)mb.textContent=_mode==='light'?'☀':'☾';
  document.querySelectorAll('.schemeBtn').forEach((b,i)=>{b.style.background='linear-gradient(90deg,'+SCHEMES[i][0]+' 0 33%,'+SCHEMES[i][1]+' 33% 66%,'+SCHEMES[i][2]+' 66%)';b.classList.toggle('on',i===_scheme);});
}
applyTheme();
document.getElementById('mode').onclick=()=>{_mode=_mode==='light'?'dark':'light';try{localStorage.setItem('d2m-mode',_mode);}catch(e){}applyTheme();};
document.querySelectorAll('.schemeBtn').forEach(b=>b.onclick=()=>{_scheme=+b.dataset.s;try{localStorage.setItem('d2m-scheme',_scheme);}catch(e){}applyTheme();});
"""
# FT: the FT poster fixes the palette in CSS (body.ft tokens), so the JS only
# wires the surviving speed slider. The body.ft class is set in markup, not JS.
THEMEJS_FT = r"""document.getElementById('speed').oninput=e=>{speedMul=+e.target.value;play();};
"""

# Default FT accent if the spec doesn't name one (FT teal-blue).
FT_DEFAULT_ACCENT = "#1198ab"


# =====================================================================
# Validation — clear, one-line errors; exit non-zero on a bad spec.
# =====================================================================
VALID_CHARTS = {"kpi", "bar", "hbar", "column", "diverging", "line", "multiline",
                "area", "stacked", "scatter", "lollipop", "dumbbell"}
ROWS_CHARTS = {"bar", "hbar", "column", "diverging", "lollipop"}
# Charts whose value axis can be log10-scaled (`"log": true`). For any other
# chart a `log` flag is silently ignored (still type-checked, never crashes).
LOG_CHARTS = {"bar", "hbar", "column", "lollipop"}
VALID_STYLES = {"essential", "ft"}


class SpecError(Exception):
    pass


def _is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def validate_spec(spec):
    """Raise SpecError(one-line message) on anything unrenderable."""
    if not isinstance(spec, dict):
        raise SpecError("spec must be a JSON object.")
    chart = spec.get("chart")
    if chart is None:
        raise SpecError("missing 'chart'. Valid: " + " ".join(sorted(VALID_CHARTS)))
    if chart not in VALID_CHARTS:
        raise SpecError(
            "unknown chart '%s'. Valid values: %s" % (chart, " ".join(sorted(VALID_CHARTS)))
        )
    style = spec.get("style", "essential")
    if style not in VALID_STYLES:
        raise SpecError(
            "unknown style '%s'. Valid values: %s" % (style, " ".join(sorted(VALID_STYLES)))
        )
    if spec.get("accent") is not None and not (
        isinstance(spec["accent"], str) and spec["accent"].strip()
    ):
        raise SpecError("'accent' must be a hex colour string (e.g. '#1198ab').")
    if "log" in spec and not isinstance(spec["log"], bool):
        raise SpecError("'log' must be a boolean (true/false).")
    # log10 needs strictly-positive values; a 0/negative row would be undefined.
    # Only enforce for charts where `log` actually applies (elsewhere it's ignored).
    if spec.get("log") is True and chart in LOG_CHARTS:
        for i, r in enumerate(spec.get("rows") or []):
            if _is_num(r.get("value")) and r["value"] <= 0:
                raise SpecError(
                    "chart '%s' with log:true needs every value > 0, but rows[%d] ('%s') = %s. "
                    "Log axes are undefined at or below zero — drop log, or remove the non-positive row."
                    % (chart, i, r.get("label", "?"), r.get("value"))
                )
    if not spec.get("source"):
        raise SpecError("missing 'source' (publisher + period required for honesty).")

    if chart in ROWS_CHARTS:
        rows = spec.get("rows")
        if not isinstance(rows, list) or not rows:
            raise SpecError("chart '%s' needs a non-empty 'rows' array." % chart)
        for i, r in enumerate(rows):
            if not isinstance(r, dict) or not str(r.get("label", "")).strip():
                raise SpecError("chart '%s': rows[%d] needs a non-empty 'label'." % (chart, i))
            if not _is_num(r.get("value")):
                raise SpecError(
                    "chart '%s': rows[%d] ('%s') needs a numeric 'value'." %
                    (chart, i, r.get("label", "?"))
                )

    elif chart == "kpi":
        has_val = _is_num(spec.get("value"))
        rows = spec.get("rows") or []
        has_row = bool(rows) and _is_num(rows[0].get("value"))
        if not (has_val or has_row):
            raise SpecError("chart 'kpi' needs a numeric 'value' (the number to count up to).")
        sp = spec.get("sparkline")
        if sp is not None and (not isinstance(sp, list) or not all(_is_num(x) for x in sp)):
            raise SpecError("chart 'kpi': 'sparkline' must be a list of numbers.")

    elif chart in ("line", "area"):
        series = spec.get("series")
        if not isinstance(series, list) or not series:
            raise SpecError("chart '%s' needs a 'series' array with one series." % chart)
        pts = series[0].get("points")
        if not isinstance(pts, list) or len(pts) < 2:
            raise SpecError("chart '%s': series[0].points needs >=2 [x,y] pairs." % chart)
        for j, p in enumerate(pts):
            if not (isinstance(p, list) and len(p) == 2 and _is_num(p[0]) and _is_num(p[1])):
                raise SpecError("chart '%s': series[0].points[%d] must be [number, number]." % (chart, j))

    elif chart == "multiline":
        series = spec.get("series")
        if not isinstance(series, list) or len(series) < 2:
            raise SpecError("chart 'multiline' needs a 'series' array of 2+ series.")
        for si, s in enumerate(series):
            if not str(s.get("label", "")).strip():
                raise SpecError("chart 'multiline': series[%d] needs a 'label' (for the end-label)." % si)
            pts = s.get("points")
            if not isinstance(pts, list) or len(pts) < 2:
                raise SpecError("chart 'multiline': series[%d] ('%s') needs >=2 [x,y] points." %
                                (si, s.get("label", "?")))
            for j, p in enumerate(pts):
                if not (isinstance(p, list) and len(p) == 2 and _is_num(p[0]) and _is_num(p[1])):
                    raise SpecError("chart 'multiline': series[%d].points[%d] must be [number, number]." % (si, j))

    elif chart == "stacked":
        cats = spec.get("categories")
        series = spec.get("series")
        if not isinstance(cats, list) or not cats:
            raise SpecError("chart 'stacked' needs a non-empty 'categories' array.")
        if not isinstance(series, list) or not series:
            raise SpecError("chart 'stacked' needs a 'series' array (the parts of the whole).")
        for si, s in enumerate(series):
            if not str(s.get("label", "")).strip():
                raise SpecError("chart 'stacked': series[%d] needs a 'label'." % si)
            vals = s.get("values")
            if not isinstance(vals, list) or len(vals) != len(cats):
                raise SpecError("chart 'stacked': series[%d] ('%s') 'values' must have %d numbers (one per category)." %
                                (si, s.get("label", "?"), len(cats)))
            if not all(_is_num(v) for v in vals):
                raise SpecError("chart 'stacked': series[%d] ('%s') 'values' must all be numbers." %
                                (si, s.get("label", "?")))

    elif chart == "scatter":
        pts = spec.get("points")
        if not isinstance(pts, list) or not pts:
            raise SpecError("chart 'scatter' needs a non-empty 'points' array.")
        for i, p in enumerate(pts):
            if not _is_num(p.get("x")) or not _is_num(p.get("y")):
                raise SpecError("chart 'scatter': points[%d] needs numeric 'x' and 'y'." % i)
            if p.get("size") is not None and not _is_num(p.get("size")):
                raise SpecError("chart 'scatter': points[%d] 'size' must be a number." % i)

    elif chart == "dumbbell":
        rows = spec.get("rows")
        if not isinstance(rows, list) or not rows:
            raise SpecError("chart 'dumbbell' needs a non-empty 'rows' array.")
        for i, r in enumerate(rows):
            if not str(r.get("label", "")).strip():
                raise SpecError("chart 'dumbbell': rows[%d] needs a 'label'." % i)
            if not _is_num(r.get("start")) or not _is_num(r.get("end")):
                raise SpecError("chart 'dumbbell': rows[%d] ('%s') needs numeric 'start' and 'end'." %
                                (i, r.get("label", "?")))


def render_html(spec):
    validate_spec(spec)
    style = spec.get("style", "essential")
    ft = (style == "ft")

    # Pick the theme fragments. Essential reproduces today's output byte-for-byte.
    if ft:
        accent = (spec.get("accent") or FT_DEFAULT_ACCENT).strip()
        fontlink = FONTLINK_FT
        ftstyle = FTSTYLE_FT.replace("__FTACCENT__", accent)
        bodyclass = ' class="ft"'
        headertools = HEADERTOOLS_FT
        footerctrls = FOOTERCTRLS_FT
        themejs = THEMEJS_FT
    else:
        fontlink = FONTLINK_ESSENTIAL
        ftstyle = ""
        bodyclass = ""
        headertools = HEADERTOOLS_ESSENTIAL
        footerctrls = FOOTERCTRLS_ESSENTIAL
        themejs = THEMEJS_ESSENTIAL

    charts = CHARTS_JS.replace("__SPEC__", json.dumps(spec))
    charts = charts.replace("__THEMEJS__", themejs)
    page = PAGE
    page = page.replace("__ENGINE__", ENGINE)
    page = page.replace("__CHARTS__", charts)
    page = page.replace("__FONTLINK__", fontlink)
    page = page.replace("__FTSTYLE__", ftstyle)
    page = page.replace("__BODYCLASS__", bodyclass)
    page = page.replace("__HEADERTOOLS__", headertools)
    page = page.replace("__FOOTERCTRLS__", footerctrls)
    page = page.replace("__TITLE__", html.escape(spec.get("title", "Data Motion")))
    page = page.replace("__TAKE__", html.escape(spec.get("takeaway", "")))
    src = spec.get("source", "")
    if spec.get("source_url"):
        src = '%s &middot; <a href="%s">source</a>' % (html.escape(src), html.escape(spec["source_url"]))
    else:
        src = html.escape(src)
    page = page.replace("__SOURCE__", src)
    return page


def main(argv):
    if len(argv) != 3:
        sys.stderr.write("usage: python3 build.py <spec.json> <out.html>\n")
        return 2
    spec_path, out_path = argv[1], argv[2]
    try:
        with open(spec_path) as f:
            spec = json.load(f)
    except FileNotFoundError:
        sys.stderr.write("error: spec file not found: %s\n" % spec_path)
        return 1
    except json.JSONDecodeError as e:
        sys.stderr.write("error: %s is not valid JSON (%s)\n" % (spec_path, e))
        return 1
    try:
        out = render_html(spec)
    except SpecError as e:
        sys.stderr.write("error: %s\n" % e)
        return 1
    with open(out_path, "w") as f:
        f.write(out)
    chart = spec.get("chart", "bar")
    print("OK wrote %s (chart=%s)" % (out_path, chart))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
