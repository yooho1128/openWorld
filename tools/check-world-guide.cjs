const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const D=JSON.parse(fs.readFileSync('public/shadow-codex/world-data.json','utf8'));
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url())});
 await page.goto('http://127.0.0.1:4174/shadow-codex/atlas/');await page.locator('#content').waitFor({state:'visible'});
 for(const r of D.regions){await page.evaluate(id=>location.hash=id,r.regionId);await page.waitForFunction(name=>document.querySelector('#detail h2')?.textContent===name,r.displayName);assert.equal(await page.locator('.map-pin[aria-pressed=true]').count(),1)}
 await page.evaluate(()=>location.hash='prologue_theater');await page.waitForFunction(()=>document.querySelector('#detail h2')?.textContent==='웃음막 유랑촌');
 assert.match(await page.locator('#detail').innerText(),/아리아/);assert.match(await page.locator('#detail').innerText(),/동쪽 출구/);assert.doesNotMatch(await page.locator('#detail .condition').allTextContents().then(a=>a.join('')),/막이 오르다/);
 await page.locator('#search').fill('목 없는 호위기사');assert.ok(await page.locator('.region-card').count()>0);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);
 await page.locator('#kind').selectOption('settlement');assert.equal(await page.locator('.region-card').count(),7);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);
 await page.evaluate(()=>location.hash='final_curtain');await page.waitForFunction(()=>document.querySelector('#detail h2')?.textContent==='최후의 막'||document.querySelector('#detail h2')?.textContent===document.querySelector('.map-pin[aria-pressed=true]')?.title);
 assert.ok(await page.locator('#route-result li').count()>10);await page.locator('#route-start').selectOption('final_curtain');assert.match(await page.locator('#route-result').innerText(),/같은 지역/);
 await page.evaluate(()=>location.hash='prologue_theater');await page.waitForFunction(()=>document.querySelector('#detail h2')?.textContent==='웃음막 유랑촌');
 await page.locator('#map-zoom').click();assert.equal(await page.locator('#map-zoom').getAttribute('aria-pressed'),'true');await page.locator('#map-zoom').click();
 await page.screenshot({path:'/tmp/world-atlas-desktop.png'});
 await page.locator('.npc-link').filter({hasText:'아리아'}).click();await page.locator('#content').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#detail h2')?.textContent==='아리아');assert.equal(await page.locator('.person-card').count(),65);
 for(const n of D.npcs){await page.evaluate(id=>location.hash=id,n.id);await page.waitForFunction(name=>document.querySelector('#detail h2')?.textContent===name,n.name);await page.locator('.npc-portrait img').evaluate(i=>i.decode());assert.match(await page.locator('#detail').innerText(),new RegExp(n.condition.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))}
 await page.locator('#search').fill('아리아');assert.equal(await page.locator('.person-card').count(),1);await page.locator('#search').fill('없는이름123');assert.equal(await page.locator('.person-card').count(),0);assert.match(await page.locator('#results').innerText(),/없습니다/);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);
 await page.locator('#kind').selectOption('기억');assert.equal(await page.locator('.person-card').count(),3);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);
 await page.locator('#region').selectOption('prologue_theater');assert.equal(await page.locator('.person-card').count(),7);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'NPC overflow '+width);assert.equal(await page.locator('.npc-portrait').evaluate(box=>{const a=box.getBoundingClientRect(),b=box.querySelector('img').getBoundingClientRect();return b.top>=a.top&&b.bottom<=a.bottom}),true,'Portrait bounds '+width)}
 await page.setViewportSize({width:390,height:844});await page.locator('#search').fill('아리아');await page.locator('.person-card').click();await page.screenshot({path:'/tmp/world-npc-mobile.png'});
 await page.locator('#detail .place-link').click();await page.locator('#content').waitFor({state:'visible'});
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Atlas overflow '+width)}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/world-atlas-mobile.png'});
 await page.goto('http://127.0.0.1:4174/shadow-codex/');assert.equal(await page.locator('.guide-entry-nav a').count(),3);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS: 63 region details, 65 NPC details/art, service conditions, routes, filters, cross links, 320–1440px widths, no JS/HTTP errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
