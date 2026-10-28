'use strict';
(async()=>{
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const base='/shadow-codex/',mode=document.body.dataset.page;
 try{
  const response=await fetch(base+'world-data.json');if(!response.ok)throw Error('Guide unavailable');const D=await response.json();
  const regions=new Map(D.regions.map(r=>[r.regionId,r])),npcs=new Map(D.npcs.map(n=>[n.id,n]));
  let selected='',page=0,routeStart='prologue_theater';
  const regionHref=id=>base+'atlas/#'+encodeURIComponent(id),npcHref=id=>base+'npcs/#'+encodeURIComponent(id);
  const names={settlement:'마을',dungeon:'던전',boss:'보스 무대',hidden:'숨겨진 지역',legendary:'전설 지역'};
  const isKind=(r,k)=>!k||({settlement:r.isSettlement,dungeon:r.isDungeon,boss:r.isBossStage,hidden:r.isHidden,legendary:r.isLegendary})[k];
  const tags=r=>`<div class="badges"><span class="badge level">Lv.${r.recommendedLevelMin}–${r.recommendedLevelMax}</span>${Object.entries(names).filter(([k])=>isKind(r,k)).map(([k,n])=>`<span class="badge ${k==='hidden'?'hidden':''}">${n}</span>`).join('')}${!r.isSettlement&&!r.isBossStage?'<span class="badge">야생 조우</span>':''}</div>`;
  const direction=pos=>!pos?'출구 방향 확인 필요':Math.abs(pos[0])>Math.abs(pos[1])?(pos[0]<0?'서쪽 출구':'동쪽 출구'):(pos[1]>0?'북쪽 출구':'남쪽 출구');
  const location=pos=>(pos[1]>1?'북':pos[1]<-1?'남':'')+(pos[0]>1?'동':pos[0]<-1?'서':'')||'중앙';
  const npcLink=n=>`<a class="npc-link" href="${npcHref(n.id)}"><img src="${base+esc(n.image)}" alt="" loading="lazy"><span>${esc(n.name)}<small>${esc(n.category)} · ${esc(location(n.cell))}${n.condition.includes('단계')?' · '+esc(n.condition):''}</small></span><span aria-hidden="true">↗</span></a>`;
  const regionLink=r=>`<a class="place-link" href="${regionHref(r.regionId)}"><span>${esc(r.displayName)}<small>${r.act}막 · ${esc(r.actTitle)} · Lv.${r.recommendedLevelMin}–${r.recommendedLevelMax}</small></span><span aria-hidden="true">↗</span></a>`;
  const related=e=>e.evolutions?.length?`<details><summary>연결된 진화 안내 ${e.evolutions.length}개</summary><div class="guide-links">${e.evolutions.map(f=>`<a class="guide-chip" href="${esc(f.href)}">${esc(f.label)} ↗</a>`).join('')}</div></details>`:'';
  const searchMatch=(values,q)=>values.join(' ').normalize('NFKC').toLocaleLowerCase('ko').includes(q);
  function query(){return $('search').value.trim().normalize('NFKC').toLocaleLowerCase('ko')}
  function setHash(id){if(locationHash()!==id)history.pushState(null,'','#'+encodeURIComponent(id));select(id);$('detail').focus({preventScroll:true})}
  function locationHash(){try{return decodeURIComponent(window.location.hash.slice(1))}catch{return ''}}
  function select(id,scroll=false){
   const valid=mode==='atlas'?regions.has(id):npcs.has(id);selected=valid?id:mode==='atlas'?D.regions[0].regionId:D.npcs[0].id;
   if(mode==='atlas'){page=regions.get(selected).atlas.page;renderAtlas();renderRegion()}else{renderPeople();renderNpc()}
   $('detail').insertAdjacentHTML('afterbegin','<button type="button" class="back-to-list">목록에서 다시 찾기 ↑</button>');
   if(scroll&&matchMedia('(max-width:800px)').matches){$('detail').scrollIntoView({block:'start'});$('detail').focus({preventScroll:true})}
  }
  function renderAtlas(){
   $('chapters').innerHTML=D.pages.map((p,i)=>`<button type="button" data-page="${i}" aria-pressed="${i===page}">${i*2+1}–${i*2+2}막 · ${esc(p.title)}</button>`).join('');
   const places=D.regions.filter(r=>r.atlas.page===page);$('map-title').textContent=D.pages[page].title;
   $('map').innerHTML=`<img class="map-image" src="${base+esc(D.pages[page].image)}" alt="${esc(D.pages[page].title)}의 마을과 길을 그린 월드맵" width="1536" height="1024">`+places.map(r=>`<button type="button" class="map-pin ${r.isHidden?'hidden-region':''}" data-region="${esc(r.regionId)}" style="left:${r.atlas.x*100}%;top:${(1-r.atlas.y)*100}%" aria-label="${esc(r.displayName)} · ${r.act}막" title="${esc(r.displayName)}" aria-pressed="${selected===r.regionId}">${String(r.order).padStart(2,'0')}</button>`).join('');
   renderRegionList();
  }
  function renderRegionList(){
   const q=query(),kind=$('kind').value;const cross=!!q||!!kind;
   const list=D.regions.filter(r=>(cross||r.atlas.page===page)&&isKind(r,kind)&&searchMatch([r.displayName,r.environment,r.summary,r.actTitle,...(r.featuredShadows||[])],q));
   $('count').textContent=`${cross?'전체 여정 검색':'선택한 아틀라스'} · ${list.length}곳 / 전체 ${D.regions.length}곳`;
   $('results').innerHTML=list.map(r=>`<button type="button" class="region-card" data-region="${esc(r.regionId)}" style="--accent:#${esc(r.accentHex)}" aria-pressed="${selected===r.regionId}"><span class="number">${String(r.order).padStart(2,'0')} / ACT ${r.act}</span><span class="go" aria-hidden="true">↗</span><h3>${esc(r.displayName)}</h3><p>${esc(r.environment)}</p>${tags(r)}</button>`).join('')||'<p class="empty">조건에 맞는 지역이 없습니다. 검색어나 유형을 바꿔 보세요.</p>';
  }
  function renderRegion(){
   const r=regions.get(selected);
   $('detail').innerHTML=`<span class="eyebrow">ACT ${r.act} · ${esc(r.actTitle)}</span><h2>${esc(r.displayName)}</h2>${tags(r)}<p class="summary">${esc(r.summary)}</p><p>${esc(r.environment)}</p>${r.condition?`<p class="condition">입장 조건 · ${esc(r.condition)}</p>`:''}<h3>이곳에서 만나는 인물</h3><div class="link-list">${r.npcs.length?r.npcs.map(id=>npcLink(npcs.get(id))).join(''):'<p class="quiet">배치된 안내 NPC가 없습니다.</p>'}</div>${r.shadows.length?`<h3>대표 그림자</h3><div class="link-list">${r.shadows.map(s=>s.id?`<a class="place-link" href="${base}#${encodeURIComponent(s.id)}">${esc(s.name)} <span aria-hidden="true">↗</span></a>`:`<span>${esc(s.name)}</span>`).join('')}</div>`:''}<h3>다음 지역으로</h3><div class="link-list">${r.exits.map(e=>`<a class="place-link" href="${regionHref(e.target)}"><span>${esc(regions.get(e.target).displayName)}<small>현재 지역 ${direction(e.cell)}${e.condition?' · '+esc(e.condition):''}</small></span><span aria-hidden="true">→</span></a>`).join('')}</div>${r.quests.length?`<details><summary>관련 퀘스트 ${r.quests.length}개 보기</summary>${r.quests.map(q=>`<p><b>${esc(q.title)}</b><br>${esc(q.summary)}</p>`).join('')}</details>`:''}${related(r)}<div class="route"><h3>여기까지 오는 길</h3><label>출발 지역<select id="route-start">${D.regions.map(p=>`<option value="${p.regionId}" ${p.regionId===routeStart?'selected':''}>${esc(p.displayName)}</option>`).join('')}</select></label><div id="route-result"></div><p class="quiet route-note">지역 연결 기준 경로입니다. 아직 열리지 않은 길은 해당 퀘스트·보스·동행 이벤트를 먼저 진행해야 합니다.</p></div>`;
   $('route-start').addEventListener('change',()=>{routeStart=$('route-start').value;renderRoute()});renderRoute();
  }
  function findRoute(start,end){const queue=[[start]],seen=new Set([start]);for(let i=0;i<queue.length;i++){const path=queue[i],last=path.at(-1);if(last===end)return path;for(const to of regions.get(last).connectedRegionIds||[])if(!seen.has(to)){seen.add(to);queue.push([...path,to])}}return null}
  function renderRoute(){
   const path=findRoute(routeStart,selected);
   $('route-result').innerHTML=!path?'<p>연결 경로를 찾지 못했습니다.</p>':path.length===1?'<p>선택한 출발지와 같은 지역입니다.</p>':`<ol>${path.map((id,i)=>{const r=regions.get(id);const exit=i?regions.get(path[i-1]).exits.find(e=>e.target===id):null;return `<li><a href="${regionHref(id)}">${esc(r.displayName)}</a>${exit?.cell?` · 이전 지역의 ${direction(exit.cell)} 이용`:''}${exit?.condition||r.condition?`<br><span class="quiet">${esc(exit?.condition||r.condition)}</span>`:''}</li>`}).join('')}</ol>`;
  }
  function renderPeople(){
   const q=query(),kind=$('kind').value,region=$('region').value;
   const list=D.npcs.filter(n=>(!kind||n.category===kind)&&(!region||n.region===region)&&searchMatch([n.name,n.role,n.category,regions.get(n.region).displayName,n.description],q));
   $('count').textContent=`${list.length}명 / 전체 ${D.npcs.length}명`;
   $('results').innerHTML=list.map(n=>`<button type="button" class="person-card" data-npc="${esc(n.id)}" aria-pressed="${selected===n.id}"><span class="role">${esc(n.category)}</span><br><img src="${base+esc(n.image)}" alt="" width="110" height="138" loading="lazy"><h3>${esc(n.name)}</h3><p>${esc(regions.get(n.region).displayName)}</p></button>`).join('')||'<p class="empty">조건에 맞는 인물이 없습니다. 검색어나 필터를 바꿔 보세요.</p>';
  }
  function renderNpc(){
   const n=npcs.get(selected),r=regions.get(n.region);
   $('detail').innerHTML=`<div class="npc-portrait"><img src="${base+esc(n.image)}" alt="${esc(n.name)}의 모습"></div><span class="eyebrow">ACT ${r.act} · ${esc(n.category)}</span><h2>${esc(n.name)}</h2><div class="badges"><span class="badge">${esc(n.role)}</span></div><p class="summary">${esc(n.description)}</p><p class="condition">${esc(n.condition)}</p><h3>어디서 만나나요?</h3>${regionLink(r)}<p>${esc(r.displayName)}의 <b>${esc(location(n.cell))} 부근</b></p><div class="location-plan" role="img" aria-label="${esc(r.displayName)} ${esc(location(n.cell))} 부근에 있는 ${esc(n.name)}의 대략 위치"><span class="north">↑ 북</span><span class="origin"></span><span class="arrival" style="left:${50+r.arrivalX*4}%;top:${50-r.arrivalY*4}%"></span><img class="location-pin" src="${base+esc(n.image)}" alt="" style="left:${50+n.cell[0]*4}%;top:${50-n.cell[1]*4}%"></div><p class="quiet">위는 북쪽입니다. 초기 배치 기준의 위치 안내도이며 실제 지형도는 아닙니다.${n.approximate?' 마을 NPC는 가까운 통행 가능 칸에 배치되고 주변을 순찰합니다.':''}</p><a class="inline" href="${regionHref(r.regionId)}">맵에서 연결 경로와 주변 정보 보기 ↗</a>${n.quests.length?`<h3>관련 퀘스트</h3>${n.quests.map(q=>`<p><b>${esc(q.title)}</b><br>${q.objectives.map(esc).join('<br>')}</p>`).join('')}`:''}${related(n)}${n.quote?`<details><summary>이 인물의 대화 한 구절 보기 · 이야기 내용 포함</summary><blockquote>“${esc(n.quote)}”</blockquote></details>`:''}`;
  }
  if(mode==='atlas')$('map-zoom').addEventListener('click',()=>{
   const zoomed=$('map-viewport').classList.toggle('zoomed');$('map-zoom').setAttribute('aria-pressed',String(zoomed));$('map-zoom').textContent=zoomed?'전체 지도 보기 −':'지도 크게 보기 ＋';
  });
  $('filters').addEventListener('submit',e=>e.preventDefault());
  $('filters').addEventListener('input',()=>mode==='atlas'?renderRegionList():renderPeople());
  $('filters').addEventListener('reset',()=>requestAnimationFrame(()=>mode==='atlas'?renderRegionList():renderPeople()));
  $('content').addEventListener('click',e=>{
   const button=e.target.closest('button');if(!button)return;
   if(button.dataset.page!==undefined){page=Number(button.dataset.page);const r=D.regions.find(r=>r.atlas.page===page);selected=r.regionId;history.replaceState(null,'','#'+encodeURIComponent(selected));renderAtlas();renderRegion()}
   if(button.dataset.region){setHash(button.dataset.region);if(matchMedia('(max-width:800px)').matches){$('detail').scrollIntoView({block:'start'});$('detail').focus({preventScroll:true})}}
   if(button.dataset.npc){setHash(button.dataset.npc);if(matchMedia('(max-width:800px)').matches){$('detail').scrollIntoView({block:'start'});$('detail').focus({preventScroll:true})}}
  });
  if(mode==='npcs'){
   $('kind').innerHTML+=[...new Set(D.npcs.map(n=>n.category))].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
   $('region').innerHTML+=D.regions.filter(r=>r.npcs.length).map(r=>`<option value="${r.regionId}">${esc(r.displayName)}</option>`).join('');
   const region=new URLSearchParams(window.location.search).get('region');if(regions.has(region))$('region').value=region;
  }
  const navigate=()=>{select(locationHash(),true);$('detail').focus({preventScroll:true})};window.addEventListener('hashchange',navigate);window.addEventListener('popstate',navigate);
  $('detail').addEventListener('click',e=>{if(e.target.closest('.back-to-list')){$('filters').scrollIntoView({block:'start'});$('search').focus({preventScroll:true})}});
  select(locationHash());$('content').hidden=false;$('loading').hidden=true;
  if(locationHash())requestAnimationFrame(()=>{$('detail').scrollIntoView({block:'start'});$('detail').focus({preventScroll:true})});
 }catch(error){console.error(error);$('loading').innerHTML='기록을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요. <a href="/shadow-codex/">그림자 도감으로 돌아가기 ↗</a>';$('loading').setAttribute('role','alert')}
})();
