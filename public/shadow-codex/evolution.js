'use strict';
(async()=>{
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),base='/shadow-codex/',mode=document.body.dataset.page;
 const labels={restored:'기억 복원',salvation:'진명 · 구원',grudge:'진명 · 원한'};
 try{
  const response=await fetch(base+'evolution-data.json');if(!response.ok)throw Error('Guide unavailable');const D=await response.json();
  const forms=new Map(D.forms.map(f=>[f.id,f])),items=new Map(D.items.map(i=>[i.itemId,i]));let selected='';
  const link=(href,label)=>`<a class="guide-chip" href="${esc(href)}">${esc(label)} <span aria-hidden="true">↗</span></a>`;
  const itemLink=id=>link(base+'items/#'+encodeURIComponent(id),items.get(id).displayName);
  const formLink=id=>link(base+'evolution/#'+encodeURIComponent(id),forms.get(id).name);
  function hash(){try{return decodeURIComponent(location.hash.slice(1))}catch{return ''}}
  function renderSteps(steps){return `<ol class="action-steps">${steps.map(s=>`<li><p>${esc(s.text)}</p>${s.refs?.length?`<div class="guide-links">${s.refs.map(r=>link(r.href,r.label)).join('')}</div>`:''}${s.note?`<p class="quiet">${esc(s.note)}</p>`:''}</li>`).join('')}</ol>`}
  function renderList(){
   const q=$('search').value.trim().normalize('NFKC').toLocaleLowerCase('ko'),kind=$('kind').value;
   const list=(mode==='evolution'?D.forms:D.items).filter(x=>{
    if(mode==='evolution'&&kind&&x.stage!==kind)return false;
    if(mode==='items'&&kind==='event'&&!x.isEventOnly)return false;
    if(mode==='items'&&kind==='shop'&&!x.sources.some(s=>s.title.includes('상점')))return false;
    const text=mode==='evolution'?[x.name,x.baseName,...x.routes.flatMap(r=>[r.title,...r.steps.flatMap(s=>[s.text,...s.refs.map(r=>r.label)])])].join(' '):[x.displayName,x.description,...x.sources.flatMap(s=>[s.title,...s.steps.flatMap(s=>s.refs.map(r=>r.label))])].join(' ');
    return text.normalize('NFKC').toLocaleLowerCase('ko').includes(q);
   });
   $('count').textContent=`${list.length} / 전체 ${mode==='evolution'?D.forms.length:D.items.length}${mode==='evolution'?'개 형태':'종'}`;
   $('results').innerHTML=list.map(x=>mode==='evolution'?`<button type="button" class="person-card evolution-card" data-id="${esc(x.id)}" aria-pressed="${x.id===selected}"><span class="role">${labels[x.stage]} · Lv.${x.level}</span><br><img src="${base}img/${esc(x.image)}" alt="" width="110" height="138" loading="lazy"><h3>${esc(x.name)}</h3><p>${esc(x.baseName)}</p></button>`:`<button type="button" class="person-card item-card" data-id="${esc(x.itemId)}" aria-pressed="${x.itemId===selected}"><span class="item-symbol" aria-hidden="true">${symbol(x)}</span><h3>${esc(x.displayName)}</h3><p>${x.isEventOnly?'이벤트 전용':'기본 구매가 · '+x.buyPrice+' 금화'}</p></button>`).join('')||'<p class="empty">검색 결과가 없습니다. 이름이나 조건을 바꿔 보세요.</p>';
  }
  function symbol(item){return ({HealRatio:'HP',HealFlat:'HP',GainFP:'FP',CaptureBoost:'잉크',GainExperience:'EXP',RestoreAndCleanse:'정화'})[item.effectType]||'도구'}
  function renderForm(){
   const f=forms.get(selected),prior=f.prior;
   $('detail').innerHTML=`<div class="npc-portrait"><img src="${base}img/${esc(f.image)}" alt="${esc(f.name)}의 모습"></div><span class="eyebrow">${labels[f.stage]}</span><h2>${esc(f.name)}</h2><a class="inline" href="${base}#${encodeURIComponent(f.shadow)}">${esc(f.baseName)} 도감 보기 ↗</a><div class="badges"><span class="badge level">Lv.${f.level} 이상</span><span class="badge">아이템 소모 없음</span></div><h3>진화에 필요한 기본 조건</h3><ul class="prerequisites"><li>이 그림자의 개체를 파티 또는 보관함에 보유합니다.</li>${prior?`<li>먼저 기억을 복원합니다.<div class="guide-links">${formLink(prior)}</div></li>`:''}<li>해당 개체를 레벨 ${f.level} 이상으로 키웁니다.</li></ul><h3>기억 조건을 충족하는 방법</h3><p class="quiet">이미 완료한 이정표는 유지됩니다. 아래 방법을 이전에 끝냈다면 마지막 단계로 진행하세요.</p>${f.routes.length>1?'<p class="condition">아래 방법 중 하나를 완료하면 됩니다.</p>':''}${f.routes.length?f.routes.map((r,i)=>`<section class="route-method"><span class="eyebrow">METHOD ${String(i+1).padStart(2,'0')}</span><h3>${esc(r.title)}</h3>${renderSteps(r.steps)}${r.rewards?.length?`<div class="quest-rewards"><small>여정 완료 보상</small><div class="guide-links">${r.rewards.map(r=>itemLink(r.item)+' <span>×'+r.count+'</span>').join('')}</div></div>`:''}</section>`).join(''):'<p class="summary">레벨 조건을 충족한 뒤 아래 마지막 단계를 진행하세요.</p>'}<section class="finish-step"><h3>게임에서 마지막으로 할 일</h3><p>각본집 → 보유한 ${esc(f.baseName)} 선택 → <b>「${labels[f.stage]}」</b> 버튼을 누릅니다.</p><p class="quiet">${prior?'구원과 원한은 각본집에서 직접 고릅니다. 한 번 진명을 각성하면 다른 방향으로 다시 선택할 수 없습니다.':'기억 조건을 이미 완료했다면 같은 NPC·보스를 다시 진행할 필요가 없습니다.'}</p></section><details><summary>레벨 올리기에 도움이 되는 아이템</summary><p class="quiet">선택해서 사용할 수 있는 경험치 도구입니다. 진화 재료로 소모하지 않습니다.</p><div class="guide-links">${['rehearsal_script','annotated_script','complete_script'].map(itemLink).join('')}</div></details>`;
  }
  function renderItem(){
   const it=items.get(selected);
   $('detail').innerHTML=`<div class="item-hero"><span class="item-symbol">${symbol(it)}</span></div><span class="eyebrow">ITEM & ACQUISITION</span><h2>${esc(it.displayName)}</h2><p class="summary">${esc(it.description)}</p><div class="badges">${it.isEventOnly?'<span class="badge">이벤트 전용</span>':`<span class="badge level">기본 구매가 ${it.buyPrice} 금화</span>`}<span class="badge">${it.usableInBattle?'전투 사용':'필드/탐험 도구'}</span></div><p class="condition">현재 진화에는 아이템이 소모되지 않습니다. 아래는 이 아이템의 효과와 획득처 안내입니다.</p><h3>어디서 구하나요?</h3>${it.sources.map((s,i)=>`<details class="item-source" ${i===0?'open':''}><summary>${esc(s.title)}${s.count?' · '+s.count+'개':''}</summary>${renderSteps(s.steps)}</details>`).join('')}${it.relatedForms?.length?`<h3>이 아이템과 연결된 기억 여정</h3><p class="quiet">보상이나 선택 도구로 연결된 여정입니다.</p><div class="guide-links">${it.relatedForms.map(f=>link(f.href,f.label)).join('')}</div>`:''}`;
  }
  function select(id){selected=(mode==='evolution'?forms:items).has(id)?id:mode==='evolution'?D.forms[0].id:D.items[0].itemId;renderList();mode==='evolution'?renderForm():renderItem();$('detail').insertAdjacentHTML('afterbegin','<button type="button" class="back-to-list">다른 조건 검색하기 ↑</button>');$('detail').scrollTop=0}
  $('filters').addEventListener('submit',e=>e.preventDefault());$('filters').addEventListener('input',renderList);$('filters').addEventListener('reset',()=>requestAnimationFrame(renderList));
  $('results').addEventListener('click',e=>{const b=e.target.closest('button[data-id]');if(!b)return;history.pushState(null,'','#'+encodeURIComponent(b.dataset.id));select(b.dataset.id);if(matchMedia('(max-width:800px)').matches)$('detail').scrollIntoView({block:'start'});$('detail').focus({preventScroll:true})});
  const navigate=()=>{select(hash());if(matchMedia('(max-width:800px)').matches)$('detail').scrollIntoView({block:'start'});$('detail').focus({preventScroll:true})};window.addEventListener('hashchange',navigate);window.addEventListener('popstate',navigate);
  $('detail').addEventListener('click',e=>{if(e.target.closest('.back-to-list')){$('filters').scrollIntoView({block:'start'});$('search').focus({preventScroll:true})}});
  select(hash());$('content').hidden=false;$('loading').hidden=true;
  if(hash())requestAnimationFrame(()=>{$('detail').scrollIntoView({block:'start'});$('detail').focus({preventScroll:true})});
 }catch(e){console.error(e);$('loading').textContent='안내를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.';$('loading').setAttribute('role','alert')}
})();
