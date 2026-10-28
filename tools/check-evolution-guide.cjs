const {chromium}=require('playwright');const fs=require('node:fs');const assert=require('node:assert/strict');
const D=JSON.parse(fs.readFileSync('public/shadow-codex/evolution-data.json','utf8'));
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url())});
await page.goto('http://127.0.0.1:4174/shadow-codex/#puppet');await page.locator('.evo-guide-link').first().waitFor();await page.locator('.evo-guide-link').first().click();await page.locator('#content').waitFor({state:'visible'});
assert.equal(await page.locator('.evolution-card').count(),173);assert.match(await page.locator('#detail').innerText(),/초침 무희/);assert.match(await page.locator('#detail').innerText(),/방법 중 하나/);
await page.locator('#detail a[href="/shadow-codex/npcs/#npc_second_dancer"]').first().click();await page.waitForFunction(()=>document.querySelector('#detail h2')?.textContent==='초침 무희');assert.match(await page.locator('#detail').innerText(),/태엽|초침/);
await page.locator('#detail details').filter({hasText:'연결된 진화 안내'}).locator('summary').click();await page.locator('#detail a[href="/shadow-codex/evolution/#puppet/restored"]').click();await page.locator('#content').waitFor({state:'visible'});
for(const f of D.forms){await page.evaluate(id=>location.hash=encodeURIComponent(id),f.id);await page.waitForFunction(name=>document.querySelector('#detail h2')?.textContent===name,f.name);await page.locator('.npc-portrait img').evaluate(i=>i.decode());assert.match(await page.locator('#detail').innerText(),/아이템 소모 없음/);assert.match(await page.locator('#detail').innerText(),/게임에서 마지막으로 할 일/)}
await page.locator('#search').fill('초침 무희');assert.ok(await page.locator('.evolution-card').count()>1);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);await page.locator('#kind').selectOption('grudge');assert.equal(await page.locator('.evolution-card').count(),30);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);

await page.evaluate(()=>location.hash='puppet/restored');await page.waitForFunction(()=>document.querySelector('#detail').textContent.includes('초침 무희'));
await page.screenshot({path:'/tmp/evolution-guide-desktop.png'});
await page.locator('#detail a[href="/shadow-codex/items/#greater_potion"]').click();await page.locator('#content').waitFor({state:'visible'});
for(const item of D.items){await page.evaluate(id=>location.hash=id,item.itemId);await page.waitForFunction(name=>document.querySelector('#detail h2')?.textContent===name,item.displayName);assert.ok(await page.locator('.item-source').count()>0)}
await page.locator('#kind').selectOption('event');assert.equal(await page.locator('.item-card').count(),3);await page.locator('#filters').evaluate(f=>f.reset());await page.waitForTimeout(40);
for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Item overflow '+width)}
await page.goto('http://127.0.0.1:4174/shadow-codex/evolution/#ticketless_passenger%2Fsalvation');await page.locator('#content').waitFor({state:'visible'});assert.match(await page.locator('#detail').innerText(),/20걸음/);
for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Evolution overflow '+width)}
await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#content').waitFor({state:'visible'});await page.waitForTimeout(100);assert.ok(Math.abs(await page.locator('#detail').evaluate(e=>e.getBoundingClientRect().top))<25);await page.screenshot({path:'/tmp/evolution-guide-mobile.png'});await page.locator('.back-to-list').click();await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>document.activeElement.id),'search');
await page.goto('http://127.0.0.1:4174/shadow-codex/evolution/#invalid');await page.locator('#content').waitFor({state:'visible'});assert.equal(await page.locator('.evolution-card[aria-pressed=true]').count(),1);
assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS: 173 guides, 21 item sources, codex→evolution→NPC→evolution→item links, OR paths, 20-step event, filters, mobile widths, no JS/HTTP errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
