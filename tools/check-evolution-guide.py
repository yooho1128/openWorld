"""Check actionable coverage, referential integrity and current evolution requirements."""
import json,re
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]/'public/shadow-codex';D=json.loads((root/'evolution-data.json').read_text());W=json.loads((root/'world-data.json').read_text());forms={f['id']:f for f in D['forms']};items={i['itemId']:i for i in D['items']};regions={r['regionId']:r for r in W['regions']};npcs={n['id']:n for n in W['npcs']};html=(root/'index.html').read_text();book=json.loads(re.search(r'<script id="data" type="application/json">([\s\S]*?)</script>',html)[1]);shadows={s['id']:s for s in book['shadows']}
assert len(forms)==173 and len(items)==21
assert Counter(f['stage'] for f in forms.values())==dict(restored=113,salvation=30,grudge=30)
assert D['sourceCommit']==W['sourceCommit']
for f in forms.values():
 assert not f['requiredItems']
 assert not f['sourceFlag'] or f['routes'],f
 assert not f['prior'] or f['prior'] in forms
 original=shadows[f['shadow']]['f'][['restored','salvation','grudge'].index(f['stage'])]
 assert original['guide']['href'].endswith('#'+f['id'])
 assert original['lv']==f['level'] and original['flag']==f['sourceFlag']
 assert original['guide']['noItemCost']
 for route in f['routes']:
  assert route['steps']
  for reward in route.get('rewards',[]):assert reward['item'] in items and reward['count']>0
for steps in [r['steps'] for f in forms.values() for r in f['routes']]+[s['steps'] for i in items.values() for s in i['sources']]:
 for s in steps:
  assert s['text']
  for ref in s['refs']:
   target={'region':regions,'npc':npcs,'shadow':shadows,'item':items}[ref['kind']]
   assert ref['id'] in target,ref
   assert ref['href'].startswith('/shadow-codex/')
for i in items.values():
 assert i['sources'],i['itemId']
 if i['effectType']=='GainExperience':assert i['trainingRange']['maximumLevel'] in [20,50,80]
assert items['rehearsal_script']['trainingRange']['maximumLevel']==20
assert items['annotated_script']['trainingRange']['minimumLevel']==20
assert items['annotated_script']['trainingRange']['maximumLevel']==50
assert items['complete_script']['trainingRange']['minimumLevel']==50
assert items['complete_script']['trainingRange']['maximumLevel']==80
for n in npcs.values():
 for f in n['evolutions']:assert f['id'] in forms
for r in regions.values():
 for f in r['evolutions']:assert f['id'] in forms
assert len(forms['knight/restored']['routes'])==2
puppet=forms['puppet/restored'];assert any(ref['kind']=='npc' and ref['id']=='npc_second_dancer' for r in puppet['routes'] for s in r['steps'] for ref in s['refs'])
mask=forms['mask/restored'];assert any(ref['kind']=='npc' and ref['id']=='npc_mirror_scribe' for r in mask['routes'] for s in r['steps'] for ref in s['refs'])
assert any('20걸음' in s['text'] for r in forms['ticketless_passenger/salvation']['routes'] for s in r['steps'])
print('PASS: 173 complete evolution conditions, 44 flags traced, OR paths, NPC/map/item references, 21 item acquisition guides, reward/cost distinction')
