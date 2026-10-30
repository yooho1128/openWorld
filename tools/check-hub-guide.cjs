const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs');const data=JSON.parse(fs.readFileSync('public/shadow-codex/world-data.json','utf8'));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://127.0.0.1'))errors.push(response.url())});
  for(const region of data.regions.filter(r=>r.hub)){
   await page.goto('http://127.0.0.1:4174/shadow-codex/atlas/#'+region.regionId);
   await page.locator('.hub-guide').waitFor();
   assert.match(await page.locator('.hub-guide').innerText(),new RegExp(region.hub.name));
   assert.match(await page.locator('.hub-guide').innerText(),/북서쪽|북서/);
   assert.match(await page.locator('.hub-guide').innerText(),/30금화/);
   assert.match(await page.locator('#detail').innerText(),/야생 조우/);
   assert.equal(await page.locator('.hub-guide a').count(),8);
   await page.locator('#kind').selectOption('hub');assert.equal(await page.locator('.region-card').count(),2);
   await page.locator('#search').fill(region.hub.name);assert.equal(await page.locator('.region-card').count(),1);
   for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'hub overflow '+width);
   }
   await page.locator('.hub-guide a').first().click();
   await page.waitForFunction(name=>document.querySelector('#detail')?.textContent.includes(name),region.hub.name);
   assert.match(await page.locator('#detail').innerText(),/보급대/);
  }
  assert.deepEqual(errors,[]);console.log('PASS: 2 outpost details, 8 supplies each, hub search/filter, item acquisition links, 320/390/1440 widths, no JS/HTTP errors');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
