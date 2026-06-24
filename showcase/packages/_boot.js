/* ============================================================
   BOOT — group registered Cards by section → category, mount,
   play-on-scroll, wire "replay all". Reads window.PKG (sections + cats CN).
   ============================================================ */
(function boot(){
  // QA/figure hook: ?solo=q1,q2 mounts only cards whose name matches a query (for clean figure capture)
  const _solo=(new URLSearchParams(location.search)).get('solo');
  if(_solo){const qs=_solo.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
    const keep=Cards.filter(d=>qs.some(q=>(d.name||'').toLowerCase().includes(q)));Cards.length=0;keep.forEach(d=>Cards.push(d));
    document.body.classList.add('solo');}
  const SECTIONS = (window.PKG&&PKG.sections)||[{id:_curSec}];
  const CATS = (window.PKG&&PKG.cats)||{};
  const CC = (window.PKG&&PKG.catColors)||{};   // optional per-category accent (FT-style)
  const CT = (window.PKG&&PKG.catTints)||{};    // optional explicit per-category stage tint
  const NM = (window.PKG&&PKG.catNames)||{};    // optional pretty display name per category
  const TINT = !!(window.PKG&&PKG.stageTint);   // pale per-category stage tint (FT poster)
  function build(secId, host){
    const list = Cards.filter(d=>d.sec===secId);
    const cats=[];list.forEach(d=>{if(!cats.includes(d.cat))cats.push(d.cat);});
    cats.forEach((cat,ci)=>{
      const col=CC[cat]||null;
      const band=document.createElement('div');band.className='cat';
      band.innerHTML=`<span class="cat-label">${NM[cat]||cat}</span><span class="cat-cn">${CATS[cat]||''}</span><span class="cat-rule"></span>`;
      if(col){band.querySelector('.cat-label').style.color=col;
        band.querySelector('.cat-rule').style.background=TINT?col:`linear-gradient(90deg,${col},transparent)`;}
      host.appendChild(band);
      const grid=document.createElement('div');grid.className='grid'+(host.dataset.wide==='1'?' wide':'');host.appendChild(grid);
      list.filter(d=>d.cat===cat).forEach(d=>{d._ci=ci;if(col){d._catColor=col;if(TINT)d._stageTint=CT[cat]||hexRGBA(col,0.18);}mountCard(grid,d,d.kind);});
    });
  }
  SECTIONS.forEach(sct=>{const host=document.getElementById(sct.id+'-body');if(host)build(sct.id,host);});

  // play each card once when it scrolls into view
  if('IntersectionObserver' in window && !REDUCE){
    const seen=new WeakSet();
    const io=new IntersectionObserver(ents=>{
      ents.forEach(e=>{if(e.isIntersecting){const c=cards.find(x=>x.card===e.target);if(c&&!seen.has(e.target)){seen.add(e.target);setTimeout(c.play,80);}io.unobserve(e.target);}});
    },{threshold:0.3});
    cards.forEach(c=>io.observe(c.card));
  }
  // QA hook: ?playall plays every card immediately (for full-page render checks)
  if(/[?&]playall/.test(location.search)){setTimeout(()=>cards.forEach(c=>c.play()),60);}

  const inView=el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;};
  const ra=document.getElementById('replayAll');
  ra&&ra.addEventListener('click',()=>{let n=0;cards.forEach(c=>{if(inView(c.card)){setTimeout(c.play,(n%8)*45);n++;}});});
})();
