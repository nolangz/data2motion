/* FT VISUAL VOCABULARY — cards, grouped by the 9 FT data-relationship categories.
   ~22 builders reused from the Chart×Motion Atlas (re-tagged to FT categories),
   ~17 new FT-specific builders. Section id 'main' (boot groups by category). */

/* shared stylized "country" mask reused by all 5 SPATIAL cards for coherence */
const MAP=["..####..",".######.","########","########",".######.","..####.."];
function mapCells(){const out=[];MAP.forEach((row,ry)=>[...row].forEach((ch,cx)=>{if(ch==='#')out.push([cx,ry]);}));return out;}
const M_CW=(W-40)/8, M_CH=(H-24)/6, M_OX=20, M_OY=12;
const mCtr=c=>[M_OX+c[0]*M_CW+M_CW/2, M_OY+c[1]*M_CH+M_CH/2];
function mapBase(s){mapCells().forEach(([cx,ry])=>s.appendChild(E('rect',{x:M_OX+cx*M_CW+1,y:M_OY+ry*M_CH+1,width:M_CW-2,height:M_CH-2,rx:2,fill:C.surf})));}

/* ============== 1 · DEVIATION ============== */
chart('Diverging bar','发散条形','DEVIATION','围绕固定参考点（通常为零）强调正负偏离 —— 谁高于、谁低于基准。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=22,pr=22,pt=14,pb=14,d=[34,12,-8,-22,46,-14],n=d.length,maxA=Math.max(...d.map(Math.abs)),zx=pl+(W-pl-pr)*0.5,half=(W-pl-pr)/2,rowH=(H-pt-pb)/n,bh=rowH*0.6;
  s.appendChild(E('line',{x1:zx,y1:pt-2,x2:zx,y2:H-pb+2,stroke:C.axis,'stroke-width':1}));
  const bars=d.map((v,i)=>{const by=pt+rowH*i+(rowH-bh)/2,col=v>=0?C.teal:C.red,r=E('rect',{x:zx,y:by,height:bh,rx:1.5,fill:col,width:0});s.appendChild(r);return {r,w:Math.abs(v)/maxA*half,neg:v<0};});
  const set=(b,t)=>{const w=b.w*t;b.r.setAttribute('width',w);b.r.setAttribute('x',b.neg?zx-w:zx);};
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:560,delay:i*55,ease:Ease.outCubic,onUpdate:t=>set(b,t)})),reset:()=>bars.forEach(b=>set(b,0))};
}, "YoY growth · surplus/deficit · vs benchmark @@ 同比变化 · 盈亏 · 对比基准");
chart('Diverging stacked','发散堆叠','DEVIATION','量表数据（强烈反对…强烈赞成）从中心向两侧堆叠，看正负倾向。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,pt=16,pb=16,rows=[{neg:[3,2],pos:[4,2]},{neg:[1,3],pos:[5,1]},{neg:[4,2],pos:[2,3]},{neg:[2,1],pos:[3,4]}],n=rows.length,negCol=[C.red,C.redL],posCol=[C.tealL,C.teal];
  const maxA=Math.max(...rows.map(r=>Math.max(r.neg.reduce((a,b)=>a+b,0),r.pos.reduce((a,b)=>a+b,0)))),zx=pl+(W-pl-pr)/2,half=(W-pl-pr)/2-4,sc=half/maxA,rowH=(H-pt-pb)/n,bh=rowH*0.6;
  s.appendChild(E('line',{x1:zx,y1:pt-2,x2:zx,y2:H-pb+2,stroke:C.axis,'stroke-width':1}));
  const id=uid();const clipR=E('clipPath',{id:id+'r'},E('rect',{x:zx,y:0,width:0,height:H})),clipL=E('clipPath',{id:id+'l'},E('rect',{x:zx,y:0,width:0,height:H}));const crR=clipR.firstChild,crL=clipL.firstChild;s.appendChild(E('defs',{},[clipR,clipL]));
  rows.forEach((r,i)=>{const by=pt+rowH*i+(rowH-bh)/2;let acc=0;r.neg.forEach((v,j)=>{acc+=v;s.appendChild(E('rect',{x:zx-acc*sc,y:by,width:v*sc,height:bh,fill:negCol[j%2],'clip-path':`url(#${id}l)`}));});acc=0;r.pos.forEach((v,j)=>{s.appendChild(E('rect',{x:zx+acc*sc,y:by,width:v*sc,height:bh,fill:posCol[j%2],'clip-path':`url(#${id}r)`}));acc+=v;});});
  const set=t=>{const w=half*t;crR.setAttribute('width',w);crL.setAttribute('x',zx-w);crL.setAttribute('width',w);};
  return {play:()=>tween(stage,{dur:780,ease:Ease.outCubic,onUpdate:set}),reset:()=>set(0)};
}, "Likert survey scales · agree/disagree sentiment @@ 李克特量表 · 赞成/反对情感");
chart('Surplus / deficit','盈余 / 赤字','DEVIATION','一条线与基准线之间的区域，高于基准填绿、低于填红。',stage=>{
  const {s,p}=plot(stage,{l:16,r:14,t:14,b:14});const d=[8,18,12,-6,-14,-8,6,16,10,-4],n=d.length,maxA=Math.max(...d.map(Math.abs)),x=lin(0,n-1,p.l,W-p.r),base=H/2,y=v=>base-(v/maxA)*((H/2)-p.t);
  const linePts=d.map((v,i)=>[x(i),y(v)]),areaPath='M'+linePts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L')+` L${x(n-1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`,id=uid();
  s.appendChild(E('defs',{},[E('clipPath',{id:id+'a'},E('rect',{x:0,y:0,width:W,height:base})),E('clipPath',{id:id+'b'},E('rect',{x:0,y:base,width:W,height:H-base})),E('clipPath',{id:id+'m'},E('rect',{x:0,y:0,width:0,height:H}))]));
  const mcr=s.querySelector(`#${id}m rect`);
  const g=E('g',{'clip-path':`url(#${id}m)`});
  g.appendChild(E('path',{d:areaPath,fill:C.teal,'fill-opacity':.32,'clip-path':`url(#${id}a)`}));
  g.appendChild(E('path',{d:areaPath,fill:C.red,'fill-opacity':.32,'clip-path':`url(#${id}b)`}));
  g.appendChild(E('path',{d:'M'+linePts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:C.txt,'stroke-width':2,'stroke-linejoin':'round'}));
  s.appendChild(g);
  s.appendChild(E('line',{x1:p.l,y1:base,x2:W-p.r,y2:base,stroke:C.axis,'stroke-width':1,'stroke-dasharray':'3 3'}));
  return {play:()=>tween(stage,{dur:900,ease:Ease.outCubic,onUpdate:t=>mcr.setAttribute('width',W*t)}),reset:()=>mcr.setAttribute('width',0)};
}, "budget surplus/deficit · trade balance over time @@ 财政盈亏 · 贸易差额随时间");

/* ============== 2 · CORRELATION ============== */
chart('Scatterplot','散点图','CORRELATION','检验两个连续变量的相关性、聚类与离群 —— 注意读者会默认你展示的是因果。',stage=>{
  const {s,p}=plot(stage);s.appendChild(E('line',{x1:p.l,y1:H-p.b,x2:W-p.r,y2:H-p.b,stroke:C.axis,'stroke-width':1}));s.appendChild(E('line',{x1:p.l,y1:p.t,x2:p.l,y2:H-p.b,stroke:C.axis,'stroke-width':1}));
  const r=seeded(11),n=26,x=lin(0,1,p.l+6,W-p.r),y=lin(0,1,H-p.b,p.t+4);
  const dots=rng(n).map(()=>{const xx=r(),yy=clamp(xx*.7+.15+(r()-.5)*.4,0,1);const c=E('circle',{cx:x(xx),cy:y(yy),r:3.4,fill:PAL[0],'fill-opacity':.8});s.appendChild(c);return c;});
  return {play:()=>dots.forEach((d,i)=>tween(stage,{dur:300,delay:i*22,ease:Ease.outBack,onUpdate:t=>{d.setAttribute('opacity',t);d.setAttribute('r',3.4*Math.max(.01,t));}})),reset:()=>dots.forEach(d=>d.setAttribute('opacity',0))};
}, "correlation of two metrics · height vs weight · price vs demand @@ 两个指标的相关 · 身高与体重 · 价格与需求");
chart('Bubble','气泡图','CORRELATION','散点 + 第三维（气泡大小），同时看三个变量。',stage=>{
  const {s,p}=plot(stage);s.appendChild(E('line',{x1:p.l,y1:H-p.b,x2:W-p.r,y2:H-p.b,stroke:C.axis,'stroke-width':1}));s.appendChild(E('line',{x1:p.l,y1:p.t,x2:p.l,y2:H-p.b,stroke:C.axis,'stroke-width':1}));
  const pts=[[.2,.7,10],[.4,.4,18],[.6,.65,8],[.7,.3,14],[.5,.8,6],[.85,.55,12],[.3,.25,9]],x=lin(0,1,p.l+10,W-p.r-6),y=lin(0,1,H-p.b-6,p.t+6);
  const bubbles=pts.map((q,i)=>{const c=E('circle',{cx:x(q[0]),cy:y(q[1]),r:0,fill:PAL[i%PAL.length],'fill-opacity':.55,stroke:PAL[i%PAL.length],'stroke-width':1.2});s.appendChild(c);return {c,r:q[2]};});
  return {play:()=>bubbles.forEach((b,i)=>tween(stage,{dur:560,delay:i*60,ease:Ease.outElastic,onUpdate:t=>b.c.setAttribute('r',Math.max(0,b.r*t))})),reset:()=>bubbles.forEach(b=>b.c.setAttribute('r',0))};
}, "GDP vs life expectancy vs population · three metrics at once @@ GDP 与预期寿命与人口 · 三指标同时");
chart('Connected scatter','连接散点','CORRELATION','按时间顺序把散点连起来，展示两个变量随时间的联合轨迹。',stage=>{
  const {s,p}=plot(stage,{l:18,r:14,t:14,b:16});s.appendChild(E('line',{x1:p.l,y1:H-p.b,x2:W-p.r,y2:H-p.b,stroke:C.axis,'stroke-width':1}));s.appendChild(E('line',{x1:p.l,y1:p.t,x2:p.l,y2:H-p.b,stroke:C.axis,'stroke-width':1}));
  const pts=[[.15,.3],[.3,.5],[.42,.42],[.55,.68],[.6,.55],[.75,.8],[.85,.72]],x=lin(0,1,p.l+6,W-p.r),y=lin(0,1,H-p.b,p.t+4),P=pts.map(q=>[x(q[0]),y(q[1])]);
  const pa=E('path',{d:'M'+P.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:C.cool,'stroke-width':2,'stroke-linejoin':'round'});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():300;pa.setAttribute('stroke-dasharray',L);
  const dots=P.map(q=>{const c=E('circle',{cx:q[0],cy:q[1],r:3.6,fill:PAL[0],opacity:0});s.appendChild(c);return c;});
  return {play:()=>tween(stage,{dur:1100,ease:Ease.inOutCubic,onUpdate:t=>{pa.setAttribute('stroke-dashoffset',L*(1-t));const k=Math.floor(t*dots.length);dots.forEach((d,i)=>d.setAttribute('opacity',i<=k?1:0));}}),reset:()=>{pa.setAttribute('stroke-dashoffset',L);dots.forEach(d=>d.setAttribute('opacity',0));}};
}, "Phillips curve · inflation vs unemployment over years @@ 菲利普斯曲线 · 通胀与失业随年份");
chart('XY heatmap','XY 热力图','CORRELATION','用颜色编码二维网格中每格的数值，看二维模式与聚集。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cols=9,rows=5,pad=14,cw=(W-pad*2)/cols,ch=(H-pad*2)/rows,r=seeded(5);
  const mix=t=>{const a=[236,234,226],b=[33,33,37];return `rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;};
  const cells=[];for(let ry=0;ry<rows;ry++)for(let cx=0;cx<cols;cx++){const v=clamp(.5+.4*Math.sin(cx*.6+ry*.5)+(r()-.5)*.3,0,1);const rect=E('rect',{x:pad+cw*cx+1,y:pad+ch*ry+1,width:cw-2,height:ch-2,rx:2,fill:mix(v)});s.appendChild(rect);cells.push(rect);}
  return {play:()=>cells.forEach((c,i)=>tween(stage,{dur:300,delay:(i%cols)*30+Math.floor(i/cols)*40,ease:Ease.outCubic,onUpdate:t=>c.setAttribute('opacity',t)})),reset:()=>cells.forEach(c=>c.setAttribute('opacity',0))};
}, "activity by hour×day · correlation matrix · two-factor patterns @@ 按小时×天的活跃度 · 相关矩阵 · 双因子模式");

/* ============== 3 · RANKING ============== */
chart('Ordered bar','有序条形','RANKING','当「名次」比绝对值更重要时使用；别怕高亮关注点。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,pt=12,pb=12,d=[72,58,46,38,28],max=80,n=d.length,bh=(H-pt-pb)/n*0.6,x0=pl,full=W-pr-pl;
  s.appendChild(E('line',{x1:x0,y1:pt-2,x2:x0,y2:H-pb+2,stroke:C.axis,'stroke-width':1}));
  const bars=d.map((v,i)=>{const by=pt+(H-pt-pb)/n*i+((H-pt-pb)/n-bh)/2;const r=E('rect',{x:x0,y:by,height:bh,rx:2,fill:i===0?C.amber:PAL[0],width:0});s.appendChild(r);return {r,v};});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:600,delay:i*70,ease:Ease.outCubic,onUpdate:t=>b.r.setAttribute('width',(b.v/max)*full*t)})),reset:()=>bars.forEach(b=>b.r.setAttribute('width',0))};
}, "league tables · top countries by metric · sales leaderboard @@ 排行榜 · 各国指标排名 · 销售榜单");
chart('Lollipop','棒棒糖图','RANKING','条形的轻量替代，减少墨水、突出端点的名次。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);
  const d=[36,60,44,72,50,64],max=80,y0=H-p.b,x=lin(0,d.length-1,p.l+8,W-p.r-8);
  const items=d.map((v,i)=>{const cx=x(i);const ln=E('line',{x1:cx,y1:y0,x2:cx,y2:y0,stroke:C.line,'stroke-width':2});const c=E('circle',{cx,cy:y0,r:5,fill:PAL[0]});s.appendChild(ln);s.appendChild(c);return {ln,c,v};});
  const set=(it,t)=>{const yy=y0-(it.v/max)*(y0-p.t)*t;it.ln.setAttribute('y2',yy);it.c.setAttribute('cy',yy);};
  return {play:()=>items.forEach((it,i)=>tween(stage,{dur:560,delay:i*60,ease:Ease.outBack,onUpdate:t=>set(it,t)})),reset:()=>items.forEach(it=>set(it,0))};
}, "ranked values with sparse data · category scores @@ 数据稀疏的排序值 · 类别得分");
chart('Slope','斜率图','RANKING','只比较两个时间点之间名次/数值的升降，斜率就是变化。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const xL=64,xR=W-64,pt=22,pb=18,A=[62,46,34,22],B=[38,56,28,50],y=lin(0,70,H-pb,pt);
  s.appendChild(E('line',{x1:xL,y1:pt-8,x2:xL,y2:H-pb+6,stroke:C.grid,'stroke-width':1}));s.appendChild(E('line',{x1:xR,y1:pt-8,x2:xR,y2:H-pb+6,stroke:C.grid,'stroke-width':1}));
  const lines=A.map((a,i)=>{const b=B[i],col=PAL[i%PAL.length];const ln=E('line',{x1:xL,y1:y(a),x2:xL,y2:y(a),stroke:col,'stroke-width':2,'stroke-opacity':.85});s.appendChild(ln);s.appendChild(E('circle',{cx:xL,cy:y(a),r:3.5,fill:col}));const cb=E('circle',{cx:xR,cy:y(b),r:3.5,fill:col,opacity:0});s.appendChild(cb);return {ln,a,b,cb};});
  return {play:()=>lines.forEach((o,i)=>tween(stage,{dur:700,delay:i*80,ease:Ease.inOutCubic,onUpdate:t=>{o.ln.setAttribute('x2',lerp(xL,xR,t));o.ln.setAttribute('y2',lerp(y(o.a),y(o.b),t));o.cb.setAttribute('opacity',t);}})),reset:()=>lines.forEach(o=>{o.ln.setAttribute('x2',xL);o.ln.setAttribute('y2',y(o.a));o.cb.setAttribute('opacity',0);})};
}, "before/after across categories · two-year rank shifts @@ 前后两期对照 · 两年名次变化");
chart('Bump','名次变化','RANKING','多个时间点上各项的名次连线 —— 谁超越了谁、何时反超。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cols=5,n=4,pl=24,pr=24,pt=20,pb=20,X=lin(0,cols-1,pl,W-pr),Y=lin(1,n,pt,H-pb),series=[[1,2,1,3,2],[2,1,3,1,1],[3,4,2,2,4],[4,3,4,4,3]];
  const paths=series.map((ranks,i)=>{const col=PAL[i%PAL.length],P=ranks.map((r,c)=>[X(c),Y(r)]);let dd='M'+P[0][0].toFixed(1)+' '+P[0][1].toFixed(1);for(let k=1;k<P.length;k++){const pr0=P[k-1],q=P[k],mx=(pr0[0]+q[0])/2;dd+=` C${mx} ${pr0[1]} ${mx} ${q[1]} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`;}const pa=E('path',{d:dd,fill:'none',stroke:col,'stroke-width':2.4,'stroke-linecap':'round'});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():300;pa.setAttribute('stroke-dasharray',L);P.forEach(q=>s.appendChild(E('circle',{cx:q[0],cy:q[1],r:3,fill:col})));return {pa,L};});
  return {play:()=>paths.forEach((o,i)=>tween(stage,{dur:1000,delay:i*70,ease:Ease.outCubic,onUpdate:t=>o.pa.setAttribute('stroke-dashoffset',o.L*(1-t))})),reset:()=>paths.forEach(o=>o.pa.setAttribute('stroke-dashoffset',o.L))};
}, "rank over many periods · league standings by season @@ 多期名次变化 · 各赛季排名");

/* ============== 4 · DISTRIBUTION ============== */
chart('Histogram','直方图','DISTRIBUTION','展示单变量的分布形态：集中趋势、离散与偏态。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const bins=[3,7,13,20,24,19,12,7,3],max=26,n=bins.length,y0=H-p.b,bw=(W-p.l-p.r)/n;
  const bars=bins.map((v,i)=>{const bx=p.l+bw*i;const r=E('rect',{x:bx+.6,width:bw-1.2,fill:PAL[0],y:y0,height:0});s.appendChild(r);return {r,h:(v/max)*(y0-p.t)};});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:520,delay:i*40,ease:Ease.outCubic,onUpdate:t=>{b.r.setAttribute('y',y0-b.h*t);b.r.setAttribute('height',b.h*t);}})),reset:()=>bars.forEach(b=>{b.r.setAttribute('y',y0);b.r.setAttribute('height',0);})};
}, "spread of one variable · test scores · income distribution @@ 单变量的分布 · 考试分数 · 收入分布");
chart('Boxplot','箱线图','DISTRIBUTION','用五数概括对比多组分布：中位、四分位、极值与离群。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const groups=[{min:18,q1:34,med:46,q3:58,max:72},{min:24,q1:38,med:44,q3:52,max:66},{min:14,q1:28,med:40,q3:50,max:74}],y=lin(10,78,H-16,16),n=groups.length,gw=(W-32)/n,items=[];
  groups.forEach((g,i)=>{const cx=16+gw*i+gw/2,bw=26,grp=E('g',{});s.appendChild(grp);grp.appendChild(E('line',{x1:cx,x2:cx,y1:y(g.min),y2:y(g.max),stroke:C.cool,'stroke-width':1.5}));grp.appendChild(E('line',{x1:cx-7,x2:cx+7,y1:y(g.min),y2:y(g.min),stroke:C.cool,'stroke-width':1.5}));grp.appendChild(E('line',{x1:cx-7,x2:cx+7,y1:y(g.max),y2:y(g.max),stroke:C.cool,'stroke-width':1.5}));grp.appendChild(E('rect',{x:cx-bw/2,y:y(g.q3),width:bw,height:y(g.q1)-y(g.q3),fill:PAL[i%PAL.length],'fill-opacity':.25,stroke:PAL[i%PAL.length],'stroke-width':1.6}));grp.appendChild(E('line',{x1:cx-bw/2,x2:cx+bw/2,y1:y(g.med),y2:y(g.med),stroke:PAL[i%PAL.length],'stroke-width':2.4}));grp.style.transformBox='fill-box';grp.style.transformOrigin='center';items.push(grp);});
  const reset=()=>items.forEach(g=>{g.style.opacity=0;g.style.transform='scaleY(0.2)';});
  const play=()=>items.forEach((g,i)=>tween(stage,{dur:520,delay:i*100,ease:Ease.outBack,onUpdate:t=>{g.style.opacity=t;g.style.transform=`scaleY(${.2+.8*t})`;}}));
  return {play,reset};
}, "compare spread across groups · median & quartiles · outliers @@ 跨组比较分布 · 中位数与四分位 · 离群值");
chart('Violin','小提琴图','DISTRIBUTION','箱线 + 密度曲线，既给统计量又显示分布形状。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const groups=3,gw=(W-32)/groups,y=lin(0,1,H-14,14),items=[];
  rng(groups).forEach(gi=>{const cx=16+gw*gi+gw/2,center=.4+gi*.1,spread=.18+gi*.03,maxW=26,N=20,left=[],right=[];for(let k=0;k<=N;k++){const yy=k/N,d=Math.exp(-Math.pow((yy-center)/spread,2)),w=d*maxW;left.push([cx-w,y(yy)]);right.push([cx+w,y(yy)]);}const pts=left.concat(right.reverse());const pa=E('path',{d:'M'+pts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L')+' Z',fill:PAL[gi%PAL.length],'fill-opacity':.7});s.appendChild(pa);pa.style.transformBox='fill-box';pa.style.transformOrigin='center';items.push(pa);});
  const reset=()=>items.forEach(p=>{p.style.opacity=0;p.style.transform='scaleX(0.1)';});
  const play=()=>items.forEach((p,i)=>tween(stage,{dur:560,delay:i*100,ease:Ease.outCubic,onUpdate:t=>{p.style.opacity=t;p.style.transform=`scaleX(${.1+.9*t})`;}}));
  return {play,reset};
}, "shape of distributions across groups · multimodal data @@ 各组分布形状 · 多峰数据");
chart('Population pyramid','人口金字塔','DISTRIBUTION','按年龄段左右对称的条形 —— 同时比较两组（如男/女）的分布。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=18,pr=18,pt=12,pb=12,bands=7,L=[30,42,52,46,38,26,14],R=[28,40,50,48,40,30,18],maxA=Math.max(...L,...R),zx=pl+(W-pl-pr)/2,half=(W-pl-pr)/2-6,rowH=(H-pt-pb)/bands,bh=rowH*0.74;
  s.appendChild(E('line',{x1:zx,y1:pt-2,x2:zx,y2:H-pb+2,stroke:C.axis,'stroke-width':1}));
  const bars=[];for(let i=0;i<bands;i++){const by=pt+rowH*i+(rowH-bh)/2,lw=L[i]/maxA*half,rw=R[i]/maxA*half,lr=E('rect',{x:zx,y:by,height:bh,fill:C.teal,width:0}),rr=E('rect',{x:zx,y:by,height:bh,fill:C.amber,width:0});s.appendChild(lr);s.appendChild(rr);bars.push({lr,rr,lw,rw});}
  const set=(b,t)=>{b.lr.setAttribute('width',b.lw*t);b.lr.setAttribute('x',zx-b.lw*t);b.rr.setAttribute('width',b.rw*t);};
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:520,delay:i*45,ease:Ease.outCubic,onUpdate:t=>set(b,t)})),reset:()=>bars.forEach(b=>set(b,0))};
}, "age structure by sex · demographics over cohorts @@ 按性别的年龄结构 · 人口队列");

/* ============== 5 · CHANGE OVER TIME ============== */
chart('Line','折线图','CHANGE OVER TIME','展示数值随连续区间（通常是时间）的变化趋势。',stage=>{
  const {s,p}=plot(stage);const d=[20,32,28,46,40,58,52,70],max=80,x=lin(0,d.length-1,p.l,W-p.r),y=lin(0,max,H-p.b,p.t);
  const pts=d.map((v,i)=>[x(i),y(v)]),dd=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');
  const pa=E('path',{d:dd,fill:'none',stroke:PAL[0],'stroke-width':2.4,'stroke-linejoin':'round','stroke-linecap':'round'});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():400;pa.setAttribute('stroke-dasharray',L);
  const last=pts[pts.length-1],dot=E('circle',{r:3.5,fill:PAL[0],cx:last[0],cy:last[1],opacity:0});s.appendChild(dot);
  return {play:()=>tween(stage,{dur:900,ease:Ease.outCubic,onUpdate:t=>pa.setAttribute('stroke-dashoffset',L*(1-t)),onDone:()=>dot.setAttribute('opacity',1)}),reset:()=>{pa.setAttribute('stroke-dashoffset',L);dot.setAttribute('opacity',0);}};
}, "time series · stock prices · trends over years @@ 时间序列 · 股价 · 多年趋势");
chart('Area','面积图','CHANGE OVER TIME','在折线的基础上填充，强调累积量或体量感。',stage=>{
  const {s,p}=plot(stage);const d=[18,30,24,42,36,54,48,66],max=80,x=lin(0,d.length-1,p.l,W-p.r),y=lin(0,max,H-p.b,p.t);
  const pts=d.map((v,i)=>[x(i),y(v)]),line=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' '),area=line+` L${(W-p.r).toFixed(1)} ${H-p.b} L${p.l} ${H-p.b} Z`,id=uid();
  const grad=E('linearGradient',{id:id+'g',x1:0,y1:0,x2:0,y2:1},[E('stop',{offset:0,'stop-color':PAL[0],'stop-opacity':.45}),E('stop',{offset:1,'stop-color':PAL[0],'stop-opacity':.03})]);
  const clip=E('clipPath',{id:id+'c'},E('rect',{x:p.l,y:0,width:0,height:H}));const cr=clip.firstChild;s.appendChild(E('defs',{},[grad,clip]));
  s.appendChild(E('path',{d:area,fill:`url(#${id+'g'})`,'clip-path':`url(#${id+'c'})`}));s.appendChild(E('path',{d:line,fill:'none',stroke:PAL[0],'stroke-width':2.2,'clip-path':`url(#${id+'c'})`,'stroke-linejoin':'round'}));
  const full=W-p.r-p.l;
  return {play:()=>tween(stage,{dur:850,ease:Ease.outCubic,onUpdate:t=>cr.setAttribute('width',full*t)}),reset:()=>cr.setAttribute('width',0)};
}, "cumulative volume over time · total sales trend @@ 累计量随时间 · 总销量趋势");
chart('Candlestick','K 线图','CHANGE OVER TIME','金融时序：每根烛同时编码 开/收/高/低 四个价格。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const r=seeded(7),n=11;let price=40;
  const data=rng(n).map(()=>{const o=price,c=clamp(o+(r()-.5)*18,12,70),hi=Math.max(o,c)+r()*8,lo=Math.min(o,c)-r()*8;price=c;return {o,c,hi,lo};});
  const y=lin(8,78,H-p.b,p.t),x=lin(0,n-1,p.l+8,W-p.r-8),cw=7;
  const cells=data.map((d,i)=>{const cx=x(i),up=d.c>=d.o,col=up?C.teal:C.red,wick=E('line',{x1:cx,x2:cx,y1:y(d.hi),y2:y(d.lo),stroke:col,'stroke-width':1.4,opacity:0}),body=E('rect',{x:cx-cw/2,y:Math.min(y(d.o),y(d.c)),width:cw,height:Math.max(2,Math.abs(y(d.o)-y(d.c))),fill:col,opacity:0});s.appendChild(wick);s.appendChild(body);return {wick,body};});
  return {play:()=>cells.forEach((c,i)=>tween(stage,{dur:160,delay:i*55,ease:Ease.outCubic,onUpdate:t=>{c.wick.setAttribute('opacity',t);c.body.setAttribute('opacity',t);}})),reset:()=>cells.forEach(c=>{c.wick.setAttribute('opacity',0);c.body.setAttribute('opacity',0);})};
}, "OHLC stock/FX prices · daily trading ranges @@ 股票/外汇开高低收 · 每日交易区间");
chart('Streamgraph','流图','CHANGE OVER TIME','堆叠面积的居中变体，强调主题此消彼长、形态优美。',stage=>{
  const {s,p}=plot(stage,{t:8,b:8});const series=[[6,10,16,12,8,5],[10,14,10,16,20,14],[8,6,10,8,12,18],[5,8,6,10,8,6]],n=series[0].length,totals=rng(n).map(i=>series.reduce((a,sd)=>a+sd[i],0)),max=Math.max(...totals),x=lin(0,n-1,p.l,W-p.r),mid=H/2,sc=(H-16)/max,id=uid();
  const clip=E('clipPath',{id},E('rect',{x:p.l,y:0,width:0,height:H}));const cr=clip.firstChild;s.appendChild(E('defs',{},clip));
  let base=rng(n).map(i=>mid-totals[i]*sc/2);
  series.forEach((d,si)=>{const top=d.map((v,i)=>base[i]+v*sc),up=top.map((v,i)=>[x(i),v]),lo=base.map((v,i)=>[x(i),v]).reverse();const dd='M'+up.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L')+' L'+lo.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L')+' Z';s.appendChild(E('path',{d:dd,fill:PAL[si],'fill-opacity':.85,'clip-path':`url(#${id})`}));base=top;});
  const full=W-p.r-p.l;
  return {play:()=>tween(stage,{dur:900,ease:Ease.outCubic,onUpdate:t=>cr.setAttribute('width',full*t)}),reset:()=>cr.setAttribute('width',0)};
}, "shifting category mix over time · genre share by year @@ 类别构成随时间消长 · 各年题材占比");
chart('Fan chart','扇形预测','CHANGE OVER TIME','历史实线 + 未来逐渐展开的不确定区间（预测置信带）。',stage=>{
  const {s,p}=plot(stage,{l:16,r:14,t:14,b:16});baseline(s,p);const d=[24,30,28,40,44,50],x=lin(0,11,p.l,W-p.r),y=lin(0,80,H-p.b,p.t),fc=[50,54,57,59,60,62],fx=i=>x(5+i);
  const hist=d.map((v,i)=>[x(i),y(v)]),band1=[],band2=[];fc.forEach((v,i)=>{const sp=2+i*5;band1.push([fx(i),y(v+sp)]);band2.push([fx(i),y(v-sp)]);});
  const band=E('path',{d:'M'+band1.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L')+' L'+band2.reverse().map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L')+' Z',fill:C.teal,'fill-opacity':.16,opacity:0});s.appendChild(band);
  const fcPa=E('path',{d:'M'+fc.map((v,i)=>fx(i).toFixed(1)+' '+y(v).toFixed(1)).join(' L'),fill:'none',stroke:C.teal,'stroke-width':1.8,'stroke-dasharray':'4 3',opacity:0});s.appendChild(fcPa);
  const histPa=E('path',{d:'M'+hist.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:C.teal,'stroke-width':2.4,'stroke-linejoin':'round'});s.appendChild(histPa);
  const Lh=histPa.getTotalLength?histPa.getTotalLength():200;histPa.setAttribute('stroke-dasharray',Lh);
  return {play:()=>tween(stage,{dur:700,ease:Ease.outCubic,onUpdate:t=>histPa.setAttribute('stroke-dashoffset',Lh*(1-t)),onDone:()=>{[band,fcPa].forEach(el=>{el.style.transition='opacity .5s';el.style.opacity=1;});}}),reset:()=>{histPa.setAttribute('stroke-dashoffset',Lh);band.style.opacity=0;fcPa.style.opacity=0;}};
}, "forecasts with uncertainty · GDP/inflation projections @@ 带不确定性的预测 · GDP/通胀预测");

/* ============== 6 · MAGNITUDE ============== */
chart('Column','柱状图','MAGNITUDE','比较各分类的「计数」大小（桶、美元、人数）—— 最基础、最易读。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const d=[34,58,46,72,40,64],max=80,y0=H-p.b,n=d.length,gw=(W-p.l-p.r)/n,bw=gw*0.62;
  const bars=d.map((v,i)=>{const bx=p.l+gw*i+(gw-bw)/2;const r=E('rect',{x:bx,width:bw,rx:2,fill:PAL[0],y:y0,height:0});s.appendChild(r);return {r,h:(v/max)*(y0-p.t)};});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:620,delay:i*70,ease:Ease.outCubic,onUpdate:t=>{b.r.setAttribute('y',y0-b.h*t);b.r.setAttribute('height',b.h*t);}})),reset:()=>bars.forEach(b=>{b.r.setAttribute('y',y0);b.r.setAttribute('height',0);})};
}, "counts by category · revenue by product · votes per party @@ 各类别计数 · 各产品营收 · 各党得票");
chart('Proportional symbol','比例符号','MAGNITUDE','用圆面积编码绝对数量 —— 适合差距很大的计数对比。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const vals=[64,40,26,14,8],n=vals.length,maxV=Math.max(...vals),gap=(W-20)/n,cy=H/2+4;
  const syms=vals.map((v,i)=>{const r=Math.sqrt(v/maxV)*28,cx=10+gap*i+gap/2,c=E('circle',{cx,cy,r:0,fill:PAL[i%PAL.length],'fill-opacity':.7,stroke:PAL[i%PAL.length],'stroke-width':1.2});s.appendChild(c);const t=E('text',{x:cx,y:H-8,'text-anchor':'middle',fill:C.faint,'font-family':MONO,'font-size':10});t.textContent=v;s.appendChild(t);return {c,r};});
  return {play:()=>syms.forEach((o,i)=>tween(stage,{dur:600,delay:i*70,ease:Ease.outBack,onUpdate:t=>o.c.setAttribute('r',Math.max(0,o.r*t))})),reset:()=>syms.forEach(o=>o.c.setAttribute('r',0))};
}, "magnitudes with huge gaps · city populations · company sizes @@ 差距悬殊的量级 · 城市人口 · 公司规模");
chart('Isotype','象形单位','MAGNITUDE','用重复图标表示数量（每个 = N 个单位），直观且亲和。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const rows=[9,6,4],cols=9,pad=16,iconW=(W-pad*2)/cols,iconR=iconW*0.3,rowH=(H-pad*2)/3,icons=[];
  rows.forEach((cnt,ri)=>{for(let c=0;c<cols;c++){const cx=pad+iconW*c+iconW/2,cy=pad+rowH*ri+rowH/2,on=c<cnt,dot=E('circle',{cx,cy,r:iconR,fill:on?PAL[ri%PAL.length]:C.surf});s.appendChild(dot);if(on){dot.setAttribute('opacity',0);icons.push(dot);}}});
  return {play:()=>icons.forEach((d,i)=>tween(stage,{dur:240,delay:i*45,ease:Ease.outBack,onUpdate:t=>{d.style.transformBox='fill-box';d.style.transformOrigin='center';d.style.transform=`scale(${Math.max(0,t)})`;d.setAttribute('opacity',1);}})),reset:()=>icons.forEach(d=>{d.setAttribute('opacity',0);d.style.transform='scale(0)';})};
}, "approachable counts for a general audience · people · units @@ 面向大众的直观计数 · 人数 · 单位数");
chart('Radar','雷达图','MAGNITUDE','在多个维度上比较一个或多个对象的综合表现。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cx=W/2,cy=H/2+2,R=58,n=6,ang=i=>-Math.PI/2+i/n*2*Math.PI,vals=[.8,.55,.9,.6,.75,.5];
  for(let r=1;r<=3;r++){const pp=rng(n).map(i=>[cx+Math.cos(ang(i))*R*r/3,cy+Math.sin(ang(i))*R*r/3]);s.appendChild(E('polygon',{points:pp.map(q=>q.join(',')).join(' '),fill:'none',stroke:C.grid,'stroke-width':1}));}
  rng(n).forEach(i=>s.appendChild(E('line',{x1:cx,y1:cy,x2:cx+Math.cos(ang(i))*R,y2:cy+Math.sin(ang(i))*R,stroke:C.grid,'stroke-width':1})));
  const poly=E('polygon',{points:'',fill:PAL[0],'fill-opacity':.18,stroke:PAL[0],'stroke-width':2,'stroke-linejoin':'round'});s.appendChild(poly);
  const set=t=>poly.setAttribute('points',vals.map((v,i)=>[cx+Math.cos(ang(i))*R*v*t,cy+Math.sin(ang(i))*R*v*t]).map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' '));
  return {play:()=>tween(stage,{dur:700,ease:Ease.outBack,onUpdate:set}),reset:()=>set(0)};
}, "profile across several attributes · product/skill ratings @@ 多属性的综合画像 · 产品/技能评分");
chart('Bullet','子弹图','MAGNITUDE','在一条带上对比 实际/目标/区间 —— KPI 仪表的紧凑替代。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cx=20,cw=W-40,cy=H/2,bh=26,val=0.68;
  [[0,.45,'#20242b'],[.45,.75,'#2a2f38'],[.75,1,'#343a44']].forEach(([a,b,col])=>s.appendChild(E('rect',{x:cx+cw*a,y:cy-bh/2,width:cw*(b-a),height:bh,fill:col})));
  const measure=E('rect',{x:cx,y:cy-7,width:0,height:14,rx:2,fill:PAL[0]});s.appendChild(measure);
  const target=cx+cw*0.82;s.appendChild(E('line',{x1:target,y1:cy-bh/2-3,x2:target,y2:cy+bh/2+3,stroke:C.amber,'stroke-width':3,'stroke-linecap':'round'}));
  return {play:()=>tween(stage,{dur:780,ease:Ease.outCubic,onUpdate:t=>measure.setAttribute('width',cw*val*t)}),reset:()=>measure.setAttribute('width',0)};
}, "KPI vs target · actual against goal bands @@ KPI 对目标 · 实际对目标区间");

/* ============== 7 · PART-TO-WHOLE ============== */
chart('Stacked column','堆叠柱状','PART-TO-WHOLE','把整体拆成组成部分，跨分类比较构成比例（100% 归一化）。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,pt=14,pb=14,cats=[[5,3,2],[4,4,3],[6,2,3],[3,5,2],[5,3,3]],n=cats.length,gw=(W-pl-pr)/n,bw=gw*0.56,H0=H-pt-pb,all=[];
  cats.forEach((c,i)=>{const tot=c.reduce((a,b)=>a+b);let off=0;const bx=pl+gw*i+(gw-bw)/2;c.forEach((v,j)=>{const frac=v/tot;const r=E('rect',{x:bx,width:bw,fill:PAL[j],y:pt+H0*off,height:H0*frac});s.appendChild(r);all.push({r,frac,off});off+=frac;});});
  const reset=()=>all.forEach(o=>{o.r.setAttribute('height',0);o.r.setAttribute('y',pt+H0*o.off);});
  const play=()=>all.forEach((o,i)=>tween(stage,{dur:600,delay:Math.floor(i/3)*40,ease:Ease.outCubic,onUpdate:t=>{o.r.setAttribute('height',H0*o.frac*t);o.r.setAttribute('y',pt+H0*o.off);}}));
  return {play,reset};
}, "composition across categories · 100% revenue mix by region @@ 跨类别的构成 · 各地区 100% 营收构成");
chart('Pie','饼图','PART-TO-WHOLE','展示构成占比。建议 ≤5 个扇区，否则改用条形图。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cx=W/2,cy=H/2+2,R=58,vals=[34,26,20,12,8],tot=vals.reduce((a,b)=>a+b);let acc=-Math.PI/2;
  const segs=vals.map((v,i)=>{const a0=acc,a1=acc+v/tot*2*Math.PI;acc=a1;const pa=E('path',{d:'',fill:PAL[i%PAL.length]});s.appendChild(pa);return {pa,a0,a1};});
  const draw=t=>{const end=-Math.PI/2+Math.min(t,.9999)*2*Math.PI;segs.forEach(g=>g.pa.setAttribute('d',end<=g.a0?'':arc(cx,cy,R,g.a0,Math.min(end,g.a1))));};
  return {play:()=>tween(stage,{dur:850,ease:Ease.outCubic,onUpdate:draw}),reset:()=>draw(0)};
}, "a few parts of one whole · budget split (≤5 slices) @@ 单一整体的少数构成 · 预算分配（≤5 块）");
chart('Donut','环形图','PART-TO-WHOLE','饼图的留白版本，中心可放总量/标题，更现代。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cx=W/2,cy=H/2+2,R=58,r0=34,vals=[40,28,18,14],tot=vals.reduce((a,b)=>a+b);let acc=-Math.PI/2;
  const segs=vals.map((v,i)=>{const a0=acc,a1=acc+v/tot*2*Math.PI;acc=a1;const pa=E('path',{d:'',fill:PAL[i%PAL.length]});s.appendChild(pa);return {pa,a0,a1};});
  const lab=E('text',{x:cx,y:cy+1,'text-anchor':'middle','dominant-baseline':'middle',fill:C.txt,'font-family':MONO,'font-size':16,'font-weight':700,opacity:0});lab.textContent='100%';s.appendChild(lab);
  const draw=t=>{const end=-Math.PI/2+Math.min(t,.9999)*2*Math.PI;segs.forEach(g=>g.pa.setAttribute('d',end<=g.a0?'':arc(cx,cy,R,g.a0,Math.min(end,g.a1),r0)));};
  return {play:()=>tween(stage,{dur:850,ease:Ease.outCubic,onUpdate:draw,onDone:()=>lab.setAttribute('opacity',1)}),reset:()=>{draw(0);lab.setAttribute('opacity',0);}};
}, "share with total in center · market share with headline figure @@ 中心带总量的占比 · 含总量的市场份额");
chart('Treemap','矩形树图','PART-TO-WHOLE','用面积编码层级占比，空间利用率高，适合很多类别。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pad=14,vals=[34,22,16,12,9,7],rects=[];
  (function layout(items,rx,ry,rw,rh,horiz){if(!items.length)return;if(items.length===1){rects.push([rx,ry,rw,rh,items[0].c]);return;}const sum=items.reduce((a,b)=>a+b.v,0),half=sum/2;let acc=0,k=0;while(k<items.length-1&&acc+items[k].v<half){acc+=items[k].v;k++;}const aI=items.slice(0,k+1),bI=items.slice(k+1),frac=aI.reduce((a,b)=>a+b.v,0)/sum;if(horiz){const ww=rw*frac;layout(aI,rx,ry,ww,rh,!horiz);layout(bI,rx+ww,ry,rw-ww,rh,!horiz);}else{const hh=rh*frac;layout(aI,rx,ry,rw,hh,!horiz);layout(bI,rx,ry+hh,rw,rh-hh,!horiz);}})(vals.map((v,i)=>({v,c:i})),pad,pad,W-pad*2,H-pad*2,true);
  const nodes=rects.map(([rx,ry,rw,rh,ci])=>{const r=E('rect',{x:rx+1,y:ry+1,width:Math.max(0,rw-2),height:Math.max(0,rh-2),rx:2,fill:PAL[ci%PAL.length],'fill-opacity':.9,opacity:0});s.appendChild(r);return r;});
  return {play:()=>nodes.forEach((nd,i)=>tween(stage,{dur:420,delay:i*55,ease:Ease.outCubic,onUpdate:t=>nd.setAttribute('opacity',t)})),reset:()=>nodes.forEach(nd=>nd.setAttribute('opacity',0))};
}, "hierarchical share with many categories · budget/disk by folder @@ 多类别的层级占比 · 各目录的预算/磁盘");
chart('Gridplot (waffle)','网格图','PART-TO-WHOLE','把整体画成 100 个格子按占比上色 —— 比饼图更易精确读数。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cols=10,rowsN=10,parts=[42,28,18,12],catArr=[];parts.forEach((p,ci)=>{for(let k=0;k<p;k++)catArr.push(ci);});while(catArr.length<100)catArr.push(parts.length);
  const size=Math.min((W-28)/cols,(H-20)/rowsN),ox=(W-size*cols)/2,oy=(H-size*rowsN)/2,cells=[];
  for(let i=0;i<100;i++){const r=Math.floor(i/cols),c=i%cols,rect=E('rect',{x:ox+c*size+1,y:oy+(rowsN-1-r)*size+1,width:size-2,height:size-2,rx:1.5,fill:PAL[catArr[i]%PAL.length],opacity:0});s.appendChild(rect);cells.push(rect);}
  return {play:()=>cells.forEach((c,i)=>tween(stage,{dur:200,delay:i*9,ease:Ease.outCubic,onUpdate:t=>c.setAttribute('opacity',t)})),reset:()=>cells.forEach(c=>c.setAttribute('opacity',0))};
}, "percentage of a whole · 1-in-X risk · poll share @@ 整体的百分比 · X 分之一的风险 · 民调占比");
chart('Waterfall','瀑布图','PART-TO-WHOLE','拆解一个总量如何被一系列增减累积出来（盈亏构成）。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const steps=[{v:40,t:'base'},{v:18,t:'up'},{v:-10,t:'down'},{v:14,t:'up'},{v:-8,t:'down'}],y0=H-p.b,max=70,n=steps.length,gw=(W-p.l-p.r)/n,bw=gw*0.56;let cum=0;const bars=[];
  steps.forEach((st,i)=>{const start=st.t==='base'?0:cum,end=st.t==='base'?st.v:cum+st.v,lo=Math.min(start,end),hi=Math.max(start,end),yTop=y0-(hi/max)*(y0-p.t),h=((hi-lo)/max)*(y0-p.t),col=st.t==='base'?C.cool:st.v>=0?C.teal:C.red,bx=p.l+gw*i+(gw-bw)/2;const r=E('rect',{x:bx,y:yTop,width:bw,height:h,rx:1.5,fill:col});s.appendChild(r);bars.push({r,yTop,h});cum=end;});
  const reset=()=>bars.forEach(b=>{b.r.setAttribute('y',y0);b.r.setAttribute('height',0);});
  const play=()=>bars.forEach((b,i)=>tween(stage,{dur:420,delay:i*120,ease:Ease.outCubic,onUpdate:t=>{b.r.setAttribute('height',b.h*t);b.r.setAttribute('y',b.yTop+b.h*(1-t));}}));
  return {play,reset};
}, "how a total breaks down · profit bridge · revenue to net income @@ 总量如何拆解 · 利润桥 · 营收到净利");

/* ============== 8 · SPATIAL ============== */
chart('Choropleth','分级统计图','SPATIAL','按地理单元用颜色深浅编码「比率/比例」（如各地区的密度）。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const r=seeded(4);
  const cells=mapCells().map(([cx,ry])=>{const v=clamp(.45+.45*Math.sin(cx*.6+ry*.7)+(r()-.5)*.25,0,1);const a=[236,234,226],b=[33,33,37],fill=`rgb(${Math.round(lerp(a[0],b[0],v))},${Math.round(lerp(a[1],b[1],v))},${Math.round(lerp(a[2],b[2],v))})`,rect=E('rect',{x:M_OX+cx*M_CW+1,y:M_OY+ry*M_CH+1,width:M_CW-2,height:M_CH-2,rx:2,fill,opacity:0});s.appendChild(rect);return rect;});
  return {play:()=>cells.forEach((c,i)=>tween(stage,{dur:240,delay:i*18,ease:Ease.outCubic,onUpdate:t=>c.setAttribute('opacity',t)})),reset:()=>cells.forEach(c=>c.setAttribute('opacity',0))};
}, "rates by region · population density · election results @@ 各地区的比率 · 人口密度 · 选举结果");
chart('Symbol map','符号地图','SPATIAL','在地图上用比例圆表示各地的「计数/量级」。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);mapBase(s);const r=seeded(6);
  const picks=mapCells().filter(()=>r()>0.5).slice(0,7);
  const syms=picks.map(([cx,ry])=>{const rad=4+(.3+r())*9,c=E('circle',{cx:M_OX+cx*M_CW+M_CW/2,cy:M_OY+ry*M_CH+M_CH/2,r:0,fill:C.amber,'fill-opacity':.65,stroke:C.amber,'stroke-width':1});s.appendChild(c);return {c,rad};});
  return {play:()=>syms.forEach((o,i)=>tween(stage,{dur:520,delay:i*60,ease:Ease.outElastic,onUpdate:t=>o.c.setAttribute('r',Math.max(0,o.rad*t))})),reset:()=>syms.forEach(o=>o.c.setAttribute('r',0))};
}, "counts by place · city populations · store sales by location @@ 各地点的计数 · 城市人口 · 各门店销量");
chart('Cartogram','统计变形图','SPATIAL','把地理单元变形为等大小的块 —— 让面积很小的地区也能被看见。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);
  const cells=mapCells().map(([cx,ry])=>{const col=cx<3?C.teal:cx<6?C.amber:C.red,sq=Math.min(M_CW,M_CH)-4,rect=E('rect',{x:M_OX+cx*M_CW+(M_CW-sq)/2,y:M_OY+ry*M_CH+(M_CH-sq)/2,width:sq,height:sq,rx:2,fill:col,'fill-opacity':.8});s.appendChild(rect);rect.style.transformBox='fill-box';rect.style.transformOrigin='center';rect.style.transform='scale(0)';return rect;});
  return {play:()=>cells.forEach((c,i)=>tween(stage,{dur:360,delay:i*22,ease:Ease.outBack,onUpdate:t=>c.style.transform=`scale(${Math.max(0,t)})`})),reset:()=>cells.forEach(c=>c.style.transform='scale(0)')};
}, "values by region where land area misleads · electoral votes @@ 面积易误导时的各地区值 · 选举人票");
chart('Dot density','点密度图','SPATIAL','用点的疏密表示数量分布 —— 每个点 = N 个单位。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);mapBase(s);const r=seeded(13),dots=[];
  mapCells().forEach(([cx,ry])=>{const dens=clamp(.3+.6*Math.sin(cx*.5+ry*.8),0,1),N=Math.round(dens*6);for(let k=0;k<N;k++){const d=E('circle',{cx:M_OX+cx*M_CW+2+r()*(M_CW-4),cy:M_OY+ry*M_CH+2+r()*(M_CH-4),r:1.6,fill:C.teal,opacity:0});s.appendChild(d);dots.push(d);}});
  return {play:()=>dots.forEach((d,i)=>tween(stage,{dur:160,delay:i*8,ease:Ease.outCubic,onUpdate:t=>d.setAttribute('opacity',t)})),reset:()=>dots.forEach(d=>d.setAttribute('opacity',0))};
}, "geographic spread of counts · population · land use @@ 计数的地理分布 · 人口 · 土地利用");
chart('Flow map','流向地图','SPATIAL','在地图上用线/弧表示地点之间的移动量（迁徙、贸易、航线）。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);mapBase(s);const O=mCtr([3,3]);s.appendChild(E('circle',{cx:O[0],cy:O[1],r:4,fill:C.amber}));
  const dests=[[0,0],[7,1],[6,4],[1,5],[7,5]];
  const arcs=dests.map(d=>{const D=mCtr(d),mx=(O[0]+D[0])/2,my=Math.min(O[1],D[1])-22,pa=E('path',{d:`M${O[0]} ${O[1]} Q${mx} ${my} ${D[0]} ${D[1]}`,fill:'none',stroke:C.teal,'stroke-width':1.8,'stroke-opacity':.7});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():100;pa.setAttribute('stroke-dasharray',L);const dot=E('circle',{cx:D[0],cy:D[1],r:2.6,fill:C.teal,opacity:0});s.appendChild(dot);return {pa,L,dot};});
  return {play:()=>arcs.forEach((o,i)=>tween(stage,{dur:600,delay:i*90,ease:Ease.outCubic,onUpdate:t=>{o.pa.setAttribute('stroke-dashoffset',o.L*(1-t));o.dot.setAttribute('opacity',t);}})),reset:()=>arcs.forEach(o=>{o.pa.setAttribute('stroke-dashoffset',o.L);o.dot.setAttribute('opacity',0);})};
}, "movement between places · migration · trade routes · airline flows @@ 地点间的流动 · 迁徙 · 贸易路线 · 航线");

/* ============== 9 · FLOW ============== */
chart('Sankey','桑基图','FLOW','展示流量在节点间的分配与守恒（来源→去向、能量流）。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pad=14,leftX=pad+8,rightX=W-pad-8,nw=8;
  const lefts=[{y:24,h:40},{y:74,h:30},{y:112,h:24}],rights=[{y:22,h:34},{y:64,h:30},{y:102,h:34}];
  lefts.forEach((n,i)=>s.appendChild(E('rect',{x:leftX-nw,y:n.y,width:nw,height:n.h,rx:1,fill:PAL[i%PAL.length]})));
  rights.forEach(n=>s.appendChild(E('rect',{x:rightX,y:n.y,width:nw,height:n.h,rx:1,fill:C.cool})));
  let lo=lefts.map(n=>n.y),ro=rights.map(n=>n.y);const flows=[[0,0,22],[0,1,16],[1,1,14],[1,2,14],[2,2,18],[2,0,6]];
  const links=flows.map(([li,ri,w])=>{const sy=lo[li],ty=ro[ri];lo[li]+=w;ro[ri]+=w;const mx=(leftX+rightX)/2,d=`M${leftX} ${sy+w/2} C${mx} ${sy+w/2} ${mx} ${ty+w/2} ${rightX} ${ty+w/2}`,pa=E('path',{d,fill:'none',stroke:PAL[li%PAL.length],'stroke-width':w,'stroke-opacity':.3});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():300;pa.setAttribute('stroke-dasharray',L);return {pa,L};});
  return {play:()=>links.forEach((o,i)=>tween(stage,{dur:700,delay:i*70,ease:Ease.outCubic,onUpdate:t=>o.pa.setAttribute('stroke-dashoffset',o.L*(1-t))})),reset:()=>links.forEach(o=>o.pa.setAttribute('stroke-dashoffset',o.L))};
}, "flow allocation source→destination · energy · budget · web traffic @@ 来源→去向的流量分配 · 能源 · 预算 · 网站流量");
chart('Chord','弦图','FLOW','展示实体之间的双向关系强度（迁移、贸易、引用）。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cx=W/2,cy=H/2+2,R=58,n=5,seg=2*Math.PI/n,gap=.08,segs=[];
  for(let i=0;i<n;i++){const a0=-Math.PI/2+i*seg+gap,a1=-Math.PI/2+(i+1)*seg-gap;s.appendChild(E('path',{d:arc(cx,cy,R,a0,a1,R-7),fill:PAL[i%PAL.length]}));segs.push((a0+a1)/2);}
  const chords=[[0,2],[1,3],[0,4],[2,4],[1,2],[3,0]];
  const ribs=chords.map(([a,b])=>{const pa=segs[a],pb=segs[b],r=R-9,x0=cx+Math.cos(pa)*r,y0=cy+Math.sin(pa)*r,x1=cx+Math.cos(pb)*r,y1=cy+Math.sin(pb)*r,path=E('path',{d:`M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx} ${cy} ${x1.toFixed(1)} ${y1.toFixed(1)}`,fill:'none',stroke:PAL[a%PAL.length],'stroke-width':2.4,'stroke-opacity':.4});s.appendChild(path);const L=path.getTotalLength?path.getTotalLength():200;path.setAttribute('stroke-dasharray',L);return {path,L};});
  return {play:()=>ribs.forEach((o,i)=>tween(stage,{dur:600,delay:i*70,ease:Ease.inOutCubic,onUpdate:t=>o.path.setAttribute('stroke-dashoffset',o.L*(1-t))})),reset:()=>ribs.forEach(o=>o.path.setAttribute('stroke-dashoffset',o.L))};
}, "bilateral flows between entities · migration · trade matrix @@ 实体间的双向流动 · 移民 · 贸易矩阵");
chart('Network','网络图','FLOW','展示实体之间的连接结构（社交、依赖、引用）—— 节点度数编码大小。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const nodes=[[60,40],[120,28],[180,46],[230,70],[150,80],[90,100],[200,110],[140,122]],edges=[[0,1],[1,2],[2,3],[1,4],[4,5],[0,5],[4,6],[3,6],[5,7],[4,7],[2,4]];
  const lines=edges.map(([a,b])=>{const ln=E('line',{x1:nodes[a][0],y1:nodes[a][1],x2:nodes[a][0],y2:nodes[a][1],stroke:C.line,'stroke-width':1.4});s.appendChild(ln);return {ln,a,b};});
  const dots=nodes.map((nd,i)=>{const deg=edges.filter(e=>e[0]===i||e[1]===i).length,c=E('circle',{cx:nd[0],cy:nd[1],r:0,fill:PAL[i%PAL.length]});s.appendChild(c);return {c,r:3+deg*1.4};});
  return {play:()=>{lines.forEach((o,i)=>tween(stage,{dur:400,delay:i*40,ease:Ease.outCubic,onUpdate:t=>{o.ln.setAttribute('x2',lerp(nodes[o.a][0],nodes[o.b][0],t));o.ln.setAttribute('y2',lerp(nodes[o.a][1],nodes[o.b][1],t));}}));dots.forEach((o,i)=>tween(stage,{dur:400,delay:200+i*40,ease:Ease.outBack,onUpdate:t=>o.c.setAttribute('r',Math.max(0,o.r*t))}));},reset:()=>{lines.forEach(o=>{o.ln.setAttribute('x2',nodes[o.a][0]);o.ln.setAttribute('y2',nodes[o.a][1]);});dots.forEach(o=>o.c.setAttribute('r',0));}};
}, "connection structure · social networks · dependency graphs @@ 连接结构 · 社交网络 · 依赖图");

/* ════════════════ EXPANSION · fuller FT poster list (appended) ════════════════ */

/* ---- DEVIATION ---- */
chart('Spine','脊柱图','DEVIATION','把单一总量拆成左右两个对照分量（如男/女），按多个分组沿中央脊柱左右展开。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=22,pr=22,pt=16,pb=16,rows=5,L=[34,46,40,30,18],R=[30,42,44,34,20],maxA=Math.max(...L,...R),zx=pl+(W-pl-pr)*0.5,half=(W-pl-pr)/2-4,rowH=(H-pt-pb)/rows,bh=rowH*0.66;
  s.appendChild(E('line',{x1:zx,y1:pt-3,x2:zx,y2:H-pb+3,stroke:C.axis,'stroke-width':1.2}));
  const bars=[];for(let i=0;i<rows;i++){const by=pt+rowH*i+(rowH-bh)/2,lw=L[i]/maxA*half,rw=R[i]/maxA*half,lr=E('rect',{x:zx,y:by,height:bh,fill:C.cool,width:0}),rr=E('rect',{x:zx,y:by,height:bh,fill:C.teal,width:0});s.appendChild(lr);s.appendChild(rr);bars.push({lr,rr,lw,rw});}
  const set=(b,t)=>{b.lr.setAttribute('width',b.lw*t);b.lr.setAttribute('x',zx-b.lw*t);b.rr.setAttribute('width',b.rw*t);};
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:520,delay:i*50,ease:Ease.outCubic,onUpdate:t=>set(b,t)})),reset:()=>bars.forEach(b=>set(b,0))};
}, "split a total into two opposed parts · male/female by group @@ 把总量拆成对立两半 · 各组的男/女");

/* ---- CORRELATION ---- */
chart('Column + line timeline','柱+线时间轴','CORRELATION','共享时间轴上的柱与叠加折线 —— 同一时间双重编码两个量。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const cols=[30,46,38,58,50,66,60,74],line=[60,40,52,44,56,48,62,54],n=cols.length,max=80,y0=H-p.b,gw=(W-p.l-p.r)/n,bw=gw*0.5,x=lin(0,n-1,p.l+gw/2,W-p.r-gw/2),y=v=>y0-(v/max)*(y0-p.t);
  const bars=cols.map((v,i)=>{const bx=p.l+gw*i+(gw-bw)/2,r=E('rect',{x:bx,width:bw,rx:1.5,fill:C.cool,y:y0,height:0});s.appendChild(r);return {r,h:(v/max)*(y0-p.t)};});
  const P=line.map((v,i)=>[x(i),y(v)]),pa=E('path',{d:'M'+P.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:C.amber,'stroke-width':2.2,'stroke-linejoin':'round'});s.appendChild(pa);const Lp=pa.getTotalLength?pa.getTotalLength():300;pa.setAttribute('stroke-dasharray',Lp);
  return {play:()=>{bars.forEach((b,i)=>tween(stage,{dur:460,delay:i*45,ease:Ease.outCubic,onUpdate:t=>{b.r.setAttribute('y',y0-b.h*t);b.r.setAttribute('height',b.h*t);}}));tween(stage,{dur:900,delay:260,ease:Ease.outCubic,onUpdate:t=>pa.setAttribute('stroke-dashoffset',Lp*(1-t))});},reset:()=>{bars.forEach(b=>{b.r.setAttribute('y',y0);b.r.setAttribute('height',0);});pa.setAttribute('stroke-dashoffset',Lp);}};
}, "volume vs price over time · sales bars with margin line @@ 量与价随时间 · 销量柱配毛利线");

/* ---- RANKING ---- */
chart('Ordered column','有序柱状','RANKING','按值排序的竖直柱 —— 当名次比绝对值更重要时，高亮第一名。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const d=[74,62,52,44,34,24],max=80,y0=H-p.b,n=d.length,gw=(W-p.l-p.r)/n,bw=gw*0.62;
  const bars=d.map((v,i)=>{const bx=p.l+gw*i+(gw-bw)/2,r=E('rect',{x:bx,width:bw,rx:2,fill:i===0?C.amber:PAL[0],y:y0,height:0});s.appendChild(r);return {r,h:(v/max)*(y0-p.t)};});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:560,delay:i*65,ease:Ease.outCubic,onUpdate:t=>{b.r.setAttribute('y',y0-b.h*t);b.r.setAttribute('height',b.h*t);}})),reset:()=>bars.forEach(b=>{b.r.setAttribute('y',y0);b.r.setAttribute('height',0);})};
}, "ranked values, short labels · top categories by score @@ 标签短的排序值 · 按分数排名的类别");
chart('Ordered proportional symbol','有序比例符号','RANKING','按值排序的一行圆，圆面积编码量级 —— 名次与大小同时可读。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const vals=[64,48,36,26,16,9],n=vals.length,maxV=Math.max(...vals),gap=(W-20)/n,cy=H/2+2;
  const syms=vals.map((v,i)=>{const r=Math.sqrt(v/maxV)*24,cx=10+gap*i+gap/2,c=E('circle',{cx,cy,r:0,fill:i===0?C.amber:PAL[0],'fill-opacity':.72,stroke:i===0?C.amber:PAL[0],'stroke-width':1});s.appendChild(c);const t=E('text',{x:cx,y:H-8,'text-anchor':'middle',fill:C.faint,'font-family':MONO,'font-size':9});t.textContent=v;s.appendChild(t);return {c,r};});
  return {play:()=>syms.forEach((o,i)=>tween(stage,{dur:560,delay:i*65,ease:Ease.outBack,onUpdate:t=>o.c.setAttribute('r',Math.max(0,o.r*t))})),reset:()=>syms.forEach(o=>o.c.setAttribute('r',0))};
}, "ranked magnitudes with wide gaps · top funds by assets @@ 差距大的排序量级 · 按资产排名的基金");
chart('Dot strip plot','点带图','RANKING','把数值画成沿一条水平轴的点 —— 强调相对位置，墨水极少。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=18,pr=18,cy=H/2,x=lin(0,1,pl,W-pr),vals=[.08,.14,.22,.31,.34,.46,.52,.58,.71,.78,.9],hi=8;
  s.appendChild(E('line',{x1:pl,y1:cy,x2:W-pr,y2:cy,stroke:C.axis,'stroke-width':1}));
  const dots=vals.map((v,i)=>{const c=E('circle',{cx:x(v),cy,r:4.4,fill:i===hi?C.amber:PAL[0],'fill-opacity':i===hi?1:.6,opacity:0});s.appendChild(c);return c;});
  return {play:()=>dots.forEach((d,i)=>tween(stage,{dur:300,delay:i*40,ease:Ease.outBack,onUpdate:t=>{d.setAttribute('opacity',t);d.setAttribute('r',4.4*Math.max(.01,t));}})),reset:()=>dots.forEach(d=>d.setAttribute('opacity',0))};
}, "ranked values, minimal ink · scores along one axis @@ 墨水极少的排序值 · 沿单轴的得分");

/* ---- DISTRIBUTION ---- */
chart('Dot plot','点阵图','DISTRIBUTION','威尔金森点阵 —— 每个分箱里把观测堆成一列点，看分布形态。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,pb=16,y0=H-pb,counts=[1,2,4,6,7,5,3,2,1],n=counts.length,bw=(W-pl-pr)/n,dr=3.1,gap=2*dr+1.4,dots=[];
  s.appendChild(E('line',{x1:pl,y1:y0,x2:W-pr,y2:y0,stroke:C.axis,'stroke-width':1}));
  counts.forEach((cnt,i)=>{const cx=pl+bw*i+bw/2;for(let k=0;k<cnt;k++){const cy=y0-dr-2-k*gap,c=E('circle',{cx,cy,r:0,fill:PAL[0],'fill-opacity':.85});s.appendChild(c);dots.push({c,r:dr});}});
  return {play:()=>dots.forEach((o,i)=>tween(stage,{dur:240,delay:i*22,ease:Ease.outBack,onUpdate:t=>o.c.setAttribute('r',Math.max(0,o.r*t))})),reset:()=>dots.forEach(o=>o.c.setAttribute('r',0))};
}, "small-sample distribution · exact counts per bin @@ 小样本的分布 · 每个分箱的确切计数");
chart('Barcode plot','条码图','DISTRIBUTION','沿一条轴的细竖线刻度 —— 每条 = 一个观测，密处即聚集。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=18,pr=18,cy=H/2,th=22,r=seeded(21),x=lin(0,1,pl,W-pr),N=34;
  s.appendChild(E('line',{x1:pl,y1:cy+th/2+5,x2:W-pr,y2:cy+th/2+5,stroke:C.axis,'stroke-width':1}));
  const ticks=rng(N).map(()=>{const v=clamp(.5+(r()-.5)*.9+(r()-.5)*.5,0,1),tk=E('line',{x1:x(v),x2:x(v),y1:cy-th/2,y2:cy+th/2,stroke:PAL[0],'stroke-width':1.4,'stroke-opacity':.55,opacity:0});s.appendChild(tk);return tk;});
  return {play:()=>ticks.forEach((tk,i)=>tween(stage,{dur:200,delay:i*22,ease:Ease.outCubic,onUpdate:t=>tk.setAttribute('opacity',t)})),reset:()=>ticks.forEach(tk=>tk.setAttribute('opacity',0))};
}, "every observation along one axis · spotting clusters & gaps @@ 单轴上的每个观测 · 发现聚集与空隙");
chart('Cumulative curve','累积曲线','DISTRIBUTION','逐步上升的累积分布线（S 形）—— 看到某点为止累计了多少。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const pdf=[2,5,9,15,22,24,20,13,7,3],tot=pdf.reduce((a,b)=>a+b),n=pdf.length,x=lin(0,n-1,p.l,W-p.r),y0=H-p.b;let acc=0;const cum=pdf.map(v=>{acc+=v;return acc/tot;});
  const P=cum.map((v,i)=>[x(i),y0-v*(y0-p.t)]),pa=E('path',{d:'M'+P.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:PAL[0],'stroke-width':2.4,'stroke-linejoin':'round','stroke-linecap':'round'});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():300;pa.setAttribute('stroke-dasharray',L);
  const last=P[P.length-1],dot=E('circle',{cx:last[0],cy:last[1],r:3.4,fill:C.amber,opacity:0});s.appendChild(dot);
  return {play:()=>tween(stage,{dur:1000,ease:Ease.outCubic,onUpdate:t=>pa.setAttribute('stroke-dashoffset',L*(1-t)),onDone:()=>dot.setAttribute('opacity',1)}),reset:()=>{pa.setAttribute('stroke-dashoffset',L);dot.setAttribute('opacity',0);}};
}, "cumulative share · percentiles · income up to a threshold @@ 累计占比 · 百分位 · 某阈值以下的收入");
chart('Frequency polygons','频率多边形','DISTRIBUTION','2~3 条叠加的平滑频率线 —— 不靠分箱直接对比多个分布。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const specs=[{c:.34,sp:.12,col:PAL[0]},{c:.56,sp:.15,col:C.amber}],x=lin(0,1,p.l,W-p.r),y0=H-p.b,N=40;
  const paths=specs.map(sp=>{const P=rng(N+1).map(k=>{const xx=k/N,d=Math.exp(-Math.pow((xx-sp.c)/sp.sp,2)/2);return [x(xx),y0-d*(y0-p.t)];}),pa=E('path',{d:'M'+P.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:sp.col,'stroke-width':2.2,'stroke-linejoin':'round'});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():300;pa.setAttribute('stroke-dasharray',L);return {pa,L};});
  return {play:()=>paths.forEach((o,i)=>tween(stage,{dur:850,delay:i*150,ease:Ease.outCubic,onUpdate:t=>o.pa.setAttribute('stroke-dashoffset',o.L*(1-t))})),reset:()=>paths.forEach(o=>o.pa.setAttribute('stroke-dashoffset',o.L))};
}, "overlay multiple distributions · compare groups' shapes @@ 叠加多个分布 · 比较各组形状");
chart('Beeswarm','蜂群图','DISTRIBUTION','抖动避让、互不重叠的点 —— 既显示每个观测又显示整体分布。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,cy=H/2+4,r=seeded(33),x=lin(0,1,pl,W-pr),N=46,rad=3.2;
  s.appendChild(E('line',{x1:pl,y1:cy+34,x2:W-pr,y2:cy+34,stroke:C.axis,'stroke-width':1}));
  const placed=[],dots=[];rng(N).forEach(()=>{const v=clamp(.5+(r()-.5)*.7+(r()-.5)*.5,0,1),px=x(v);let py=cy,dir=1,step=0;while(placed.some(q=>Math.hypot(q[0]-px,q[1]-py)<rad*2)){step++;py=cy+dir*step*(rad*1.6);dir*=-1;if(Math.abs(py-cy)>30){py=cy+(r()-.5)*56;break;}}placed.push([px,py]);const c=E('circle',{cx:px,cy:py,r:0,fill:PAL[0],'fill-opacity':.8});s.appendChild(c);dots.push({c,r:rad});});
  return {play:()=>dots.forEach((o,i)=>tween(stage,{dur:260,delay:i*16,ease:Ease.outBack,onUpdate:t=>o.c.setAttribute('r',Math.max(0,o.r*t))})),reset:()=>dots.forEach(o=>o.c.setAttribute('r',0))};
}, "every point plus distribution shape · salaries by team @@ 每个点加分布形状 · 各团队薪资");

/* ---- CHANGE OVER TIME ---- */
chart('Calendar heatmap','日历热力图','CHANGE OVER TIME','7×N 的日格网格按数值深浅着色 —— 看一周/一年的节律。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const rows=7,cols=14,pad=14,cw=(W-pad*2)/cols,ch=(H-pad*2)/rows,r=seeded(9);
  const mix=t=>{const a=[238,236,228],b=[58,59,66];return `rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;};
  const cells=[];for(let cx=0;cx<cols;cx++)for(let ry=0;ry<rows;ry++){const v=clamp(.45+.4*Math.sin(cx*.55+ry*.4)+(r()-.5)*.35,0,1),rect=E('rect',{x:pad+cw*cx+1,y:pad+ch*ry+1,width:cw-2,height:ch-2,rx:1.5,fill:mix(v),opacity:0});s.appendChild(rect);cells.push(rect);}
  return {play:()=>cells.forEach((c,i)=>tween(stage,{dur:260,delay:Math.floor(i/rows)*30+(i%rows)*16,ease:Ease.outCubic,onUpdate:t=>c.setAttribute('opacity',t)})),reset:()=>cells.forEach(c=>c.setAttribute('opacity',0))};
}, "daily activity over a year · commits · steps · weekly rhythm @@ 一年的每日活动 · 提交 · 步数 · 每周节律");
chart('Priestley timeline','普里斯特利时间线','CHANGE OVER TIME','按行堆叠的时长条（起→止跨度）—— 比较事件何时发生、持续多久。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,pt=14,pb=14,spans=[[0,.55],[.2,.9],[.1,.45],[.4,1],[.32,.7],[.6,.95]],n=spans.length,x=lin(0,1,pl,W-pr),rowH=(H-pt-pb)/n,bh=rowH*0.56;
  s.appendChild(E('line',{x1:pl,y1:pt-2,x2:pl,y2:H-pb+2,stroke:C.axis,'stroke-width':1}));
  const bars=spans.map((sp,i)=>{const by=pt+rowH*i+(rowH-bh)/2,x0=x(sp[0]),x1=x(sp[1]),r=E('rect',{x:x0,y:by,height:bh,rx:bh/2,fill:i===3?C.amber:PAL[0],'fill-opacity':.85,width:0});s.appendChild(r);return {r,x0,w:x1-x0};});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:520,delay:i*70,ease:Ease.outCubic,onUpdate:t=>b.r.setAttribute('width',b.w*t)})),reset:()=>bars.forEach(b=>b.r.setAttribute('width',0))};
}, "event durations on a timeline · project tasks · reigns/tenures @@ 时间线上的事件时长 · 项目任务 · 任期");
chart('Circle timeline','圆点时间线','CHANGE OVER TIME','水平时间轴上在各时间点放圆，圆大小编码量级 —— 看冲击的节奏。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=18,pr=18,cy=H/2,x=lin(0,1,pl,W-pr),pts=[[.05,8],[.18,16],[.3,11],[.44,22],[.56,14],[.68,26],[.82,18],[.94,30]],maxV=30;
  s.appendChild(E('line',{x1:pl,y1:cy,x2:W-pr,y2:cy,stroke:C.axis,'stroke-width':1}));
  const syms=pts.map(([t,v],i)=>{const r=Math.sqrt(v/maxV)*16,c=E('circle',{cx:x(t),cy,r:0,fill:i===pts.length-1?C.amber:PAL[0],'fill-opacity':.55,stroke:i===pts.length-1?C.amber:PAL[0],'stroke-width':1});s.appendChild(c);return {c,r};});
  return {play:()=>syms.forEach((o,i)=>tween(stage,{dur:520,delay:i*55,ease:Ease.outElastic,onUpdate:t=>o.c.setAttribute('r',Math.max(0,o.r*t))})),reset:()=>syms.forEach(o=>o.c.setAttribute('r',0))};
}, "event magnitude over time · deal sizes · earthquake counts @@ 事件量级随时间 · 交易规模 · 地震次数");
chart('Seismogram','地震波图','CHANGE OVER TIME','沿时间的密集上下尖峰波形 —— 强调短促爆发与突变（如波动率）。',stage=>{
  const {s,p}=plot(stage,{l:14,r:14,t:10,b:10});const mid=H/2,r=seeded(17),N=64,x=lin(0,N-1,p.l,W-p.r);
  s.appendChild(E('line',{x1:p.l,y1:mid,x2:W-p.r,y2:mid,stroke:C.grid,'stroke-width':1}));
  const amp=rng(N).map(i=>{const env=Math.exp(-Math.pow((i-N*0.46)/(N*0.22),2))*0.7+0.25;return (r()-.5)*2*env*(mid-p.t);});
  const P=amp.map((a,i)=>[x(i),mid-a]),pa=E('path',{d:'M'+P.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:PAL[0],'stroke-width':1.4,'stroke-linejoin':'round'});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():600;pa.setAttribute('stroke-dasharray',L);
  return {play:()=>tween(stage,{dur:1100,ease:Ease.linear,onUpdate:t=>pa.setAttribute('stroke-dashoffset',L*(1-t))}),reset:()=>pa.setAttribute('stroke-dashoffset',L)};
}, "high-frequency bursts · volatility · sensor/seismic signals @@ 高频突变 · 波动率 · 传感器/地震信号");

/* ---- MAGNITUDE ---- */
chart('Bar','条形图','MAGNITUDE','水平的量级条（不排序）—— 类别名长或类别多时比柱状更好读。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,pt=12,pb=12,d=[46,72,34,58,40,64],max=80,n=d.length,bh=(H-pt-pb)/n*0.6,x0=pl,full=W-pr-pl;
  s.appendChild(E('line',{x1:x0,y1:pt-2,x2:x0,y2:H-pb+2,stroke:C.axis,'stroke-width':1}));
  const bars=d.map((v,i)=>{const by=pt+(H-pt-pb)/n*i+((H-pt-pb)/n-bh)/2,r=E('rect',{x:x0,y:by,height:bh,rx:2,fill:PAL[0],width:0});s.appendChild(r);return {r,w:(v/max)*full};});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:560,delay:i*55,ease:Ease.outCubic,onUpdate:t=>b.r.setAttribute('width',b.w*t)})),reset:()=>bars.forEach(b=>b.r.setAttribute('width',0))};
}, "magnitudes with long category names · survey items · countries @@ 类别名长的量级 · 调查项 · 国家");
chart('Paired column','成对柱状','MAGNITUDE','每个分类并排两根柱 —— 同分类内比较两个量（如两年/两组）。',stage=>{
  const {s,p}=plot(stage);baseline(s,p);const groups=[[40,58],[52,34],[64,48],[46,62],[58,40]],max=80,y0=H-p.b,gw=(W-p.l-p.r)/groups.length,bw=gw*0.3,bars=[];
  groups.forEach((g,i)=>{const gx=p.l+gw*i+gw*0.18;g.forEach((v,j)=>{const bx=gx+j*(bw+2),r=E('rect',{x:bx,width:bw,rx:1.5,fill:j===0?PAL[0]:C.amber,y:y0,height:0});s.appendChild(r);bars.push({r,h:(v/max)*(y0-p.t)});});});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:520,delay:i*42,ease:Ease.outCubic,onUpdate:t=>{b.r.setAttribute('y',y0-b.h*t);b.r.setAttribute('height',b.h*t);}})),reset:()=>bars.forEach(b=>{b.r.setAttribute('y',y0);b.r.setAttribute('height',0);})};
}, "two values per category · this year vs last · male vs female @@ 每类两个值 · 今年对去年 · 男对女");
chart('Paired bar','成对条形','MAGNITUDE','每个分类两根水平条 —— 横向对比同分类内的两个量。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=16,pr=16,pt=12,pb=12,groups=[[60,44],[48,68],[72,52],[38,58]],max=80,n=groups.length,rowH=(H-pt-pb)/n,bh=rowH*0.34,full=W-pr-pl-2,x0=pl,bars=[];
  s.appendChild(E('line',{x1:x0,y1:pt-2,x2:x0,y2:H-pb+2,stroke:C.axis,'stroke-width':1}));
  groups.forEach((g,i)=>{g.forEach((v,j)=>{const by=pt+rowH*i+rowH*0.12+j*(bh+2),r=E('rect',{x:x0,y:by,height:bh,rx:1.5,fill:j===0?PAL[0]:C.amber,width:0});s.appendChild(r);bars.push({r,w:(v/max)*full});});});
  return {play:()=>bars.forEach((b,i)=>tween(stage,{dur:520,delay:i*42,ease:Ease.outCubic,onUpdate:t=>b.r.setAttribute('width',b.w*t)})),reset:()=>bars.forEach(b=>b.r.setAttribute('width',0))};
}, "two values per category, long labels · before/after by item @@ 每类两个值且标签长 · 各项前后对比");
chart('Marimekko','马赛克图','MAGNITUDE','堆叠柱的宽度也随分类总量变化 —— 二维同时编码占比与量级。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=14,pr=14,pt=14,pb=14,cols=[{w:30,segs:[5,3,2]},{w:18,segs:[4,4,2]},{w:24,segs:[3,2,5]},{w:14,segs:[6,2,2]}],W0=W-pl-pr,H0=H-pt-pb,totW=cols.reduce((a,c)=>a+c.w,0);let ox=pl;const all=[];
  cols.forEach(col=>{const cw=W0*col.w/totW,tot=col.segs.reduce((a,b)=>a+b);let oy=pt;col.segs.forEach((v,j)=>{const ch=H0*v/tot,r=E('rect',{x:ox+1,y:oy+0.5,width:Math.max(0,cw-2),height:Math.max(0,ch-1),fill:PAL[j],'fill-opacity':.88,opacity:0});s.appendChild(r);all.push(r);oy+=ch;});ox+=cw;});
  return {play:()=>all.forEach((r,i)=>tween(stage,{dur:360,delay:i*55,ease:Ease.outCubic,onUpdate:t=>r.setAttribute('opacity',t)})),reset:()=>all.forEach(r=>r.setAttribute('opacity',0))};
}, "share within segments of differing size · market by segment @@ 不同规模分段内的占比 · 按细分的市场");
chart('Parallel coordinates','平行坐标','MAGNITUDE','多条竖直坐标轴 + 横穿它们的折线 —— 在多维度上比较多个对象。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pl=22,pr=22,pt=18,pb=18,axes=4,X=lin(0,axes-1,pl,W-pr),yT=pt,yB=H-pb,r=seeded(27);
  for(let a=0;a<axes;a++)s.appendChild(E('line',{x1:X(a),y1:yT,x2:X(a),y2:yB,stroke:C.grid,'stroke-width':1}));
  const rows=rng(6).map(()=>rng(axes).map(()=>r())),paths=rows.map((vals,i)=>{const P=vals.map((v,a)=>[X(a),lerp(yB,yT,v)]),pa=E('path',{d:'M'+P.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'),fill:'none',stroke:i===0?C.amber:PAL[0],'stroke-width':i===0?2.2:1.5,'stroke-opacity':i===0?1:.5,'stroke-linejoin':'round'});s.appendChild(pa);const L=pa.getTotalLength?pa.getTotalLength():300;pa.setAttribute('stroke-dasharray',L);return {pa,L};});
  return {play:()=>paths.forEach((o,i)=>tween(stage,{dur:760,delay:i*70,ease:Ease.outCubic,onUpdate:t=>o.pa.setAttribute('stroke-dashoffset',o.L*(1-t))})),reset:()=>paths.forEach(o=>o.pa.setAttribute('stroke-dashoffset',o.L))};
}, "compare items across many metrics · car specs · player stats @@ 多指标对比多个对象 · 车型参数 · 球员数据");

/* ---- PART-TO-WHOLE ---- */
chart('Voronoi','沃罗诺伊图','PART-TO-WHOLE','不规则单元铺满一块区域（树图的替代）—— 用面积编码占比。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const pad=12,W0=W-pad*2,H0=H-pad*2;
  const cells=[[pad,pad,W0*.46,H0*.55],[pad+W0*.46,pad,W0*.54,H0*.34],[pad+W0*.46,pad+H0*.34,W0*.30,H0*.66],[pad+W0*.76,pad+H0*.34,W0*.24,H0*.66],[pad,pad+H0*.55,W0*.46,H0*.45]];
  const nodes=cells.map((c,i)=>{const inset=2.5,pts=[[c[0]+inset,c[1]+c[3]*.18],[c[0]+c[2]*.5,c[1]+inset],[c[0]+c[2]-inset,c[1]+c[3]*.3],[c[0]+c[2]-inset,c[1]+c[3]-inset],[c[0]+c[2]*.35,c[1]+c[3]-inset],[c[0]+inset,c[1]+c[3]*.7]],pg=E('polygon',{points:pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' '),fill:PAL[i%PAL.length],'fill-opacity':.85,stroke:C.bg,'stroke-width':1.5,opacity:0});s.appendChild(pg);return pg;});
  return {play:()=>nodes.forEach((nd,i)=>tween(stage,{dur:420,delay:i*70,ease:Ease.outCubic,onUpdate:t=>nd.setAttribute('opacity',t)})),reset:()=>nodes.forEach(nd=>nd.setAttribute('opacity',0))};
}, "share of a whole, irregular packing · market share by player @@ 整体的占比、不规则铺排 · 各厂商份额");
chart('Arc','弧形图','PART-TO-WHOLE','半圆被分成比例楔形（议会式半环）—— 适合席位/构成占比。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cx=W/2,cy=H-22,R=64,r0=30,vals=[30,24,18,16,12],tot=vals.reduce((a,b)=>a+b);let acc=Math.PI;
  const segs=vals.map((v,i)=>{const a0=acc,a1=acc+v/tot*Math.PI;acc=a1;const pa=E('path',{d:'',fill:PAL[i%PAL.length],'fill-opacity':.9});s.appendChild(pa);return {pa,a0,a1};});
  const draw=t=>{const end=Math.PI+Math.min(t,.9999)*Math.PI;segs.forEach(g=>g.pa.setAttribute('d',end<=g.a0?'':arc(cx,cy,R,g.a0,Math.min(end,g.a1),r0)));};
  return {play:()=>tween(stage,{dur:820,ease:Ease.outCubic,onUpdate:draw}),reset:()=>draw(0)};
}, "parliament seats by party · composition share (half-ring) @@ 各党议会席位 · 构成占比（半环）");
chart('Venn','韦恩图','PART-TO-WHOLE','2~3 个半透明圆相互重叠 —— 展示集合的交集与独有部分。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cy=H/2,R=42,specs=[[W/2-26,cy-8,PAL[0]],[W/2+26,cy-8,C.amber],[W/2,cy+24,C.cool]];
  const circs=specs.map(([cx,ccy,col])=>{const c=E('circle',{cx,cy:ccy,r:R,fill:col,'fill-opacity':.34,stroke:col,'stroke-width':1.6,opacity:0});s.appendChild(c);c.style.transformBox='fill-box';c.style.transformOrigin='center';return c;});
  return {play:()=>circs.forEach((c,i)=>tween(stage,{dur:520,delay:i*120,ease:Ease.outBack,onUpdate:t=>{c.setAttribute('opacity',1);c.style.transform=`scale(${Math.max(0,t)})`;}})),reset:()=>circs.forEach(c=>{c.setAttribute('opacity',0);c.style.transform='scale(0)';})};
}, "overlap between 2-3 sets · shared vs unique audiences @@ 2-3 个集合的重叠 · 共有与独有受众");

/* ---- SPATIAL ---- */
chart('Contour map','等高线图','SPATIAL','同心嵌套的等高线圈（如高程）—— 用层层闭合线表示连续场。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cx=W/2,cy=H/2+2,rings=6,wob=[[0,1],[.18,.9],[.36,1.05],[.5,.92],[.7,1.08],[.85,.95]];
  const paths=rng(rings).map(k=>{const rad=14+k*11,N=22,pts=rng(N+1).map(j=>{const a=j/N*2*Math.PI,m=wob[k%wob.length][1]*(1+0.08*Math.sin(a*3+k));return [cx+Math.cos(a)*rad*m,cy+Math.sin(a)*rad*m*0.78];}),pa=E('path',{d:'M'+pts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L')+' Z',fill:'none',stroke:PAL[0],'stroke-width':1.4,'stroke-opacity':.4+k*0.08,opacity:0});s.appendChild(pa);return pa;});
  return {play:()=>paths.forEach((pa,i)=>tween(stage,{dur:360,delay:(paths.length-1-i)*70,ease:Ease.outCubic,onUpdate:t=>pa.setAttribute('opacity',t)})),reset:()=>paths.forEach(pa=>pa.setAttribute('opacity',0))};
}, "continuous fields · elevation · temperature · pressure @@ 连续场 · 高程 · 温度 · 气压");
chart('Heat map (grid)','栅格热力图','SPATIAL','基于网格的空间热度梯度 —— 与分级统计的不规则地块不同，规整成格。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const cols=12,rows=7,pad=12,cw=(W-pad*2)/cols,ch=(H-pad*2)/rows,fx=cols*.62,fy=rows*.4;
  const mix=t=>{const a=[238,236,228],b=[58,59,66];return `rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;};
  const cells=[];for(let ry=0;ry<rows;ry++)for(let cx=0;cx<cols;cx++){const d=Math.hypot(cx-fx,ry-fy),v=clamp(1-d/7,0,1),rect=E('rect',{x:pad+cw*cx,y:pad+ch*ry,width:cw,height:ch,fill:mix(v),opacity:0});s.appendChild(rect);cells.push({rect,d});}
  return {play:()=>cells.forEach((o,i)=>tween(stage,{dur:300,delay:o.d*45,ease:Ease.outCubic,onUpdate:t=>o.rect.setAttribute('opacity',t)})),reset:()=>cells.forEach(o=>o.rect.setAttribute('opacity',0))};
}, "spatial intensity on a grid · signal strength · foot traffic @@ 网格上的空间强度 · 信号强度 · 人流量");
chart('Scaled cartogram','比例变形图','SPATIAL','把国家网格的每格按数值缩放 —— 让数值大的地区在地图上更突出。',stage=>{
  const s=SVG(W,H);stage.appendChild(s);const r=seeded(8);
  const cells=mapCells().map(([cx,ry])=>{const v=clamp(.35+.5*Math.sin(cx*.7+ry*.5)+(r()-.5)*.3,.12,1),sq=(Math.min(M_CW,M_CH)-2)*v,col=v>.66?C.amber:PAL[0],rect=E('rect',{x:M_OX+cx*M_CW+M_CW/2-sq/2,y:M_OY+ry*M_CH+M_CH/2-sq/2,width:sq,height:sq,rx:1.5,fill:col,'fill-opacity':.85});s.appendChild(rect);rect.style.transformBox='fill-box';rect.style.transformOrigin='center';rect.style.transform='scale(0)';return rect;});
  return {play:()=>cells.forEach((c,i)=>tween(stage,{dur:380,delay:i*20,ease:Ease.outBack,onUpdate:t=>c.style.transform=`scale(${Math.max(0,t)})`})),reset:()=>cells.forEach(c=>c.style.transform='scale(0)')};
}, "value by region scaled by size · GDP/population by country @@ 按数值缩放的各地区 · 各国 GDP/人口");
