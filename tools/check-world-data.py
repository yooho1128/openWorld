"""Validate guide references, placement coverage and packaged public assets."""
import json
from collections import Counter
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'public/shadow-codex'
d=json.loads((root/'world-data.json').read_text());regions={r['regionId']:r for r in d['regions']};npcs={n['id']:n for n in d['npcs']}
assert len(d['regions'])==len(regions)==63
assert len(d['npcs'])==len(npcs)==65
assert len(d['pages'])==4
assert Counter(n['category'] for n in npcs.values())==Counter({'이야기':20,'기억':3,'회복':7,'소문':7,'조사':7,'장인':7,'상인':7,'주민 부탁':7})
for page in d['pages']:
 assert Image.open(root/page['image']).size==(1536,1024)
for rid,r in regions.items():
 assert r['recommendedLevelMin']<=r['recommendedLevelMax']
 assert r['atlas']['regionId']==rid and 0<=r['atlas']['page']<4
 assert 0<r['atlas']['x']<1 and 0<r['atlas']['y']<1
 assert set(r['connectedRegionIds'])=={e['target'] for e in r['exits']}
 for e in r['exits']:assert e['target'] in regions and len(e['cell'])==2
 assert set(r['npcs'])=={n['id'] for n in npcs.values() if n['region']==rid}
 if not r.get('isHidden') and r.get('requiredFlag','').startswith('quest_'):assert not r['condition']
for n in npcs.values():
 assert n['name'] and n['description'] and n['condition'] and n['region'] in regions
 assert abs(n['cell'][0])<11 and abs(n['cell'][1])<9
 im=Image.open(root/n['image']).convert('RGBA');assert im.width>0 and im.height>0 and im.getbbox()
 if n['category']=='장인':assert '2단계' in n['condition']
 if n['category']=='상인':assert '3단계' in n['condition']
 if n['category']=='기억':assert '퍼즐' in n['condition']
for start in regions:
 seen={start};pending=[start]
 for rid in pending:
  for target in regions[rid]['connectedRegionIds']:
   if target not in seen:seen.add(target);pending.append(target)
 assert len(seen)==63,(start,len(seen))
print('PASS: 63 connected regions, 65 NPC identities/positions/conditions, 69 art files, all references and ordinary quest travel policy')
