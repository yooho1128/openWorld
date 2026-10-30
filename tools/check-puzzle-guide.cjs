const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs');const data=JSON.parse(fs.readFileSync('public/shadow-codex/world-data.json','utf8'));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))errors.push(r.url())});
  const regions=data.regions.filter(r=>r.puzzle);assert.equal(regions.length,3);
  for(const region of regions){
   await page.goto('http://127.0.0.1:4174/shadow-codex/atlas/#'+region.regionId);
   const guide=page.locator('.puzzle-guide');await guide.waitFor();
   assert.match(await guide.innerText(),new RegExp(region.puzzle.title));
   assert.equal(await guide.locator('.puzzle-pin').count(),6);
   assert.equal(await page.locator('.puzzle-clue').getAttribute('open'),null);
   assert.equal(await page.locator('.puzzle-solution').getAttribute('open'),null);
   await guide.locator('.puzzle-clue > summary').click();
   assert.match(await guide.innerText(),new RegExp(region.puzzle.clue.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   await guide.locator('.puzzle-solution > summary').click();
   assert.equal(await guide.locator('.puzzle-solution li').count(),region.puzzle.steps.length);
   for(const step of region.puzzle.steps)assert.ok((await guide.innerText()).includes(step));
   await page.locator('#kind').selectOption('puzzle');assert.equal(await page.locator('.region-card').count(),3);
   await page.locator('#search').fill(region.puzzle.title);assert.equal(await page.locator('.region-card').count(),1);
   for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:900});
    const boxes=await guide.locator('.puzzle-pin').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
     const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'overlapping location markers '+region.regionId+' '+width);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
   }
   await page.reload();await guide.waitFor();assert.equal(await page.locator('.puzzle-clue').getAttribute('open'),null);
  }
  assert.deepEqual(errors,[]);console.log('PASS: 3 puzzle details/6 markers each; clues and solutions closed by default; derived steps; title search/filter; 320/390/1440 widths; no JS/HTTP errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
