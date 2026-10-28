"""Export the public guide from Unity source; Pillow required. No scene generation."""
import argparse,json,re,subprocess
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[2]/'unityGame');args=parser.parse_args()
root=args.source.resolve();dest=Path(__file__).resolve().parents[1]/'public/shadow-codex';src=root/'Assets/Resources/Data'
def load(name):return json.loads((src/(name+'.json')).read_text())
regions=load('RegionCatalog')['regions'];byid={r['regionId']:r for r in regions};scenes={r['sceneName']:r for r in regions}
quests=load('QuestCatalog')['quests'];dialogues={d['dialogueId']:d for d in load('DialogueCatalog')['dialogues']}
code=(root/'Assets/Editor/PlayablePrologueGenerator.cs').read_text();placements={};portals={}
def unquote(value):return json.loads(value) if value.startswith('"') else value
def split_args(s):
 result=[];start=0;depth=0;quote=False;escape=False
 for i,c in enumerate(s):
  if quote:
   if escape:escape=False
   elif c=='\\':escape=True
   elif c=='"':quote=False
  elif c=='"':quote=True
  elif c in '([{':depth+=1
  elif c in ')]}':depth-=1
  elif c==',' and depth==0:result.append(s[start:i].strip());start=i+1
 result.append(s[start:].strip());return result
def calls(body,name):
 for match in re.finditer(r'\b'+name+r'\(',body):
  start=match.end();depth=1;quote=False;escape=False
  for i in range(start,len(body)):
   c=body[i]
   if quote:
    if escape:escape=False
    elif c=='\\':escape=True
    elif c=='"':quote=False
   elif c=='"':quote=True
   elif c=='(':depth+=1
   elif c==')':
    depth-=1
    if depth==0:yield split_args(body[start:i]);break
def cell(value):return [int(x) for x in re.search(r'Vector2Int\(\s*(-?\d+),\s*(-?\d+)\)',value).groups()]
for body in re.split(r'        private static void ',code):
 scene=re.search(r'BeginFieldScene\("([^"]+)"',body)
 if not scene or scene[1] not in scenes:continue
 region=scenes[scene[1]];rid=region['regionId']
 for a in calls(body,'CreateNpc'):
  if a[0]!='map.fieldRoot':continue
  placements[unquote(a[3])]=dict(region=rid,cell=cell(a[2]),dialogue=unquote(a[4]),condition='상시')
 for a in calls(body,'CreatePortal'):
  if a[0]!='map.fieldRoot' or unquote(a[3]) not in scenes:continue
  target=scenes[unquote(a[3])]['regionId'];portals[rid+'/'+target]=dict(cell=cell(a[2]),flag=unquote(a[7]) if len(a)>7 else '')
for case in re.finditer(r'case "([^"]+)":([\s\S]*?)break;',code):
 body=case[2];npc=re.search(r'npcId = "([^"]+)"',body)
 if case[1] in byid and npc:
  placements[npc[1]]=dict(region=case[1],cell=[0,5],dialogue=re.search(r'npcFirst = "([^"]+)"',body)[1],condition='이 지역의 순서 퍼즐을 해결한 뒤 등장')
items={i['itemId']:i['displayName'] for i in load('CoreContentCatalog')['items']}
services={
 'healer':([ -8,4],'회복','파티를 쉬게 하고 회복합니다. 기본 비용은 금화 30이며 소문 해결과 마을 복구에 따라 할인됩니다.',0),
 'rumor':([8,4],'소문','주변 지역의 소문과 탐험 단서를 알려줍니다.',0),
 'investigator':([0,5],'조사','현재 막의 보스 조사 정보를 안내합니다.',0),
 'craftsman':([-2,5],'장인','복구 인력이 돌아오며 늘어나는 전문 판매품의 소식을 전합니다.',2),
 'merchant':([2,5],'상인','마을에 돌아온 상인과 희귀 물자의 소식을 전합니다. 물품 구매는 마을 상점 메뉴에서 합니다.',3),
 'requester':([-8,-4],'주민 부탁','',0)}
identities=load('NpcIdentityCatalog');npcs=[]
for e in identities['entries']:
 n={k:e[k] for k in ['id','name','role']};n['image']=f'guide-art/{e["id"]}.webp'
 if e['region']:
  rid=e['region'];r=byid[rid];kind=e['id'].rsplit('_',1)[1];pos,category,description,stage=services[kind]
  n.update(region=rid,cell=pos,category=category,description=description,condition=f'마을 복구 {stage}단계 · '+('재건' if stage==2 else '번영')+'부터 등장' if stage else '마을에서 만날 수 있습니다',approximate=True)
  if kind=='requester':n['description']=f'게임 내 하루에 한 번 {items["ink" if r["act"]>=5 else "tonic" if r["act"]>=3 else "salve"]} 1개를 부탁합니다. 보상은 금화 {35+r["act"]*15}와 주민 호감도입니다.'
 else:
  assert e['id'] in placements,e['id'];n.update(placements[e['id']]);n['category']='기억' if e['role']=='기억' else '이야기';n['approximate']=False
  n['condition']='이 지역에서 만날 수 있습니다' if n['condition']=='상시' else n['condition']
  lines=dialogues.get(n.pop('dialogue'),{}).get('lines',[]);n['quote']=next((l['text'] for l in lines if l.get('speaker')==e['name']),lines[0]['text'] if lines else '')
  n['description']='잊힌 기억과 지역의 이야기를 전하는 인물입니다.' if n['category']=='기억' else '지역의 이야기를 따라 만나게 되는 인물입니다.'
 n['quests']=[dict(title=q['title'],objectives=[o['description'] for o in q['objectives'] if o.get('targetId')==e['id']]) for q in quests if any(o.get('targetId')==e['id'] for o in q['objectives'])]
 npcs.append(n)
 # Reproduce the game's atlas crop exactly; do not redraw or alter the source atlas.
 im=Image.open(root/f'Assets/Resources/Art/Npcs/npc_atlas_{e["sheet"]:02}.png');w,h=im.width//identities['columns'],im.height//identities['rows'];x=e['cell']%identities['columns']*w;y=e['cell']//identities['columns']*h+e.get('cropTop',0)
 im.crop((x,y,x+w,y+e.get('cropHeight',h))).save(dest/n['image'],lossless=True)
world=load('WorldMapAtlas');locations={p['regionId']:p for p in world['locations']}
shadowdata=json.loads(re.search(r'<script id="data" type="application/json">([\s\S]*?)</script>',(dest/'index.html').read_text())[1]);shadows={s['n']:s['id'] for s in shadowdata['shadows']}
events=load('CompanionEventCatalog')['events'];shadow_names={s['id']:s['n'] for s in shadowdata['shadows']}
def condition(flag,target):
 if not flag:return ''
 if flag=='act2_complete':return '제2막 「왕관의 재」 이야기 완료'
 if flag=='boss_moonlit_story_complete':return '달빛 무대의 보스 이야기 완료'
 if flag=='boss_barracks_story_complete':return '무너진 병영의 보스 이야기 완료'
 # RegionProgress.MeetsTravelRequirement permits ordinary quest gates.
 if not byid[target].get('isHidden') and flag.startswith('quest_') and flag.endswith('_complete'):return ''
 q=next((q for q in quests if 'quest_'+q['questId']+'_complete'==flag),None)
 if q:return '퀘스트 「'+q['title']+'」 완료'
 event=next((e for e in events if 'companion_event_'+e['eventId']+'_complete'==flag),None)
 if event:return byid[event['regionId']]['displayName']+'에서 '+shadow_names[event['requiredShadowId']]+' 동행 이벤트 완료'
 return '해당 구간의 이야기 진행 조건을 완료해야 합니다'
for r in regions:
 rid=r['regionId'];r['atlas']=locations[rid];r['npcs']=[n['id'] for n in npcs if n['region']==rid];r['condition']=condition(r.get('requiredFlag'),rid)
 r['shadows']=[dict(name=name,id=shadows.get(name)) for name in r.get('featuredShadows',[])];r['quests']=[dict(title=q['title'],summary=q['summary']) for q in quests if any(o.get('targetId')=='area_'+rid for o in q['objectives'])]
 r['exits']=[]
 for i,target in enumerate(r.get('connectedRegionIds',[])):
  p=portals.get(rid+'/'+target)
  if not p and r['order']>40:p=dict(cell=[[-9,0],[9,0],[0,8],[0,-8]][i],flag='')
  r['exits'].append(dict(target=target,cell=p['cell'] if p else None,condition=condition(p['flag'],target) if p else ''))
for i,p in enumerate(world['pages']):
 path=root/'Assets/Resources'/(p['resource']+'.png');Image.open(path).save(dest/f'guide-art/world-{i}.webp',quality=88);p['image']=f'guide-art/world-{i}.webp';p.pop('resource')
assert len(regions)==63 and len(npcs)==65
commit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
data=dict(sourceCommit=commit,pages=world['pages'],regions=regions,npcs=npcs)
(dest/'world-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'Exported {len(regions)} regions, {len(npcs)} NPCs, 4 illustrated atlas pages from {commit[:7]}')
