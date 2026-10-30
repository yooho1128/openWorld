"""Trace every enabled evolution condition to actual quest/dialogue/boss/event producers."""
import argparse,json,re,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[2]/'unityGame');a=p.parse_args();root=a.source.resolve();web=Path(__file__).resolve().parents[1]/'public/shadow-codex';src=root/'Assets/Resources/Data'
def load(name):return json.loads((src/(name+'.json')).read_text())
html=(web/'index.html').read_text();pattern=r'(<script id="data" type="application/json">)([\s\S]*?)(</script>)';book=json.loads(re.search(pattern,html)[2]);shadows={s['id']:s for s in book['shadows']};world=json.loads((web/'world-data.json').read_text());regions={r['regionId']:r for r in world['regions']};scenes={r['sceneName']:r['regionId'] for r in world['regions']};npcs={n['id']:n for n in world['npcs']};quests=load('QuestCatalog')['quests'];dialogues={d['dialogueId']:d for d in load('DialogueCatalog')['dialogues']};events=load('CompanionEventCatalog')['events'];code=(root/'Assets/Editor/PlayablePrologueGenerator.cs').read_text();service=(root/'Assets/Scripts/Story/MemoryAwakeningService.cs').read_text()
def table(name):
 body=service[service.index(' '+name+' ='):];body=body[:body.index('};')];return dict(re.findall(r'\{ "([^"]+)", "([^"]+)" \}',body))
aliases=table('StoryMilestoneAliases');personal=table('PersonalMemoryQuests')
def args(s):
 out=[];start=0;depth=0;quote=False;escaped=False
 for i,c in enumerate(s):
  if quote:
   if escaped:escaped=False
   elif c=='\\':escaped=True
   elif c=='"':quote=False
  elif c=='"':quote=True
  elif c in '([{':depth+=1
  elif c in ')]}':depth-=1
  elif c==',' and depth==0:out.append(s[start:i].strip());start=i+1
 return out+[s[start:].strip()]
def calls(body,name):
 for m in re.finditer(r'\b'+name+r'\(',body):
  start=m.end();depth=1;quote=False;escaped=False
  for i in range(start,len(body)):
   c=body[i]
   if quote:
    if escaped:escaped=False
    elif c=='\\':escaped=True
    elif c=='"':quote=False
   elif c=='"':quote=True
   elif c=='(':depth+=1
   elif c==')':
    depth-=1
    if depth==0:yield args(body[start:i]);break
def value(s):return json.loads(s) if s.startswith('"') else s
def ref(kind,id,label=None):
 if kind=='region':label=label or regions[id]['displayName'];href='/shadow-codex/atlas/#'+id
 elif kind=='npc':label=label or npcs[id]['name'];href='/shadow-codex/npcs/#'+id
 elif kind=='item':label=label or items[id]['displayName'];href='/shadow-codex/items/#'+id
 else:label=label or shadows[id]['n'];href='/shadow-codex/#'+id
 return dict(kind=kind,id=id,label=label,href=href)
def step(text,*refs,note=''):return dict(text=text,refs=list(refs),note=note)
def event_steps(e):
 rid=e['regionId'];sid=e['requiredShadowId']
 return [step(f'{shadows[sid]["n"]}를 필드 동행으로 지정하고 {regions[rid]["displayName"]}로 이동합니다.',ref('shadow',sid),ref('region',rid)),step(f'이 지역에서 이동하면 {e["minSteps"]}걸음부터 이벤트가 발동할 수 있습니다. 같은 동행을 유지해 {e["guaranteedSteps"]}걸음에 도달하면 발동을 시도합니다.',note='전투·대화 중에는 진행할 수 없습니다. 동행을 바꾸면 이 이벤트의 걸음 수가 초기화됩니다.'),step('동행 이벤트 대화를 끝까지 마칩니다.')]
roots=[];boss_flags={}
for body in re.split(r'        private static void ',code):
 scene=re.search(r'BeginFieldScene\("([^"]+)"',body)
 if not scene or scene[1] not in scenes:continue
 rid=scenes[scene[1]]
 for aa in calls(body,'CreateNpc'):
  if aa[0]!='map.fieldRoot':continue
  for dlg in (aa[4],aa[5]):roots.append(dict(dialogue=value(dlg),kind='npc',npc=value(aa[3]),region=rid))
 for aa in calls(body,'CreateBossEncounter'):
  boss=dict(kind='boss',shadow=value(aa[3]),region=rid);boss_flags[value(aa[8])]=boss;roots.append(dict(dialogue=value(aa[7]),**boss))
 for aa in calls(body,'CreateInteractable'):
  if aa[0]=='map.fieldRoot':roots.append(dict(dialogue=value(aa[3]),kind='object',name=value(aa[1]),region=rid))
 if list(calls(body,'CreateBoss')):
  boss=dict(kind='boss',shadow='boss_moonlit_widow',region=rid);boss_flags['boss_moonlit_story_complete']=boss;roots.append(dict(dialogue='boss_moonlit_post',**boss))
def reachable(dialogue,seen=None):
 seen=set() if seen is None else seen
 if dialogue in seen or dialogue not in dialogues:return []
 seen.add(dialogue);d=dialogues[dialogue];result=[dialogue]
 for c in d.get('choices',[]):result+=reachable(c.get('nextDialogueId',''),seen)
 return result
def direct_flags(d):return {x['setFlag'] for x in d.get('lines',[])+d.get('choices',[]) if x.get('setFlag') and x.get('setFlagValue',1)>0}
producers={}
for origin in roots:
 for dlg in reachable(origin['dialogue']):
  for flag in direct_flags(dialogues[dlg]):
   choices=[c['text'] for c in dialogues[origin['dialogue']].get('choices',[]) if any(flag in direct_flags(dialogues[x]) for x in reachable(c.get('nextDialogueId','')))]
   producers.setdefault(flag,[]).append((origin,choices))
items={}
for name in ['CoreContentCatalog','Act2ContentCatalog','Act3ContentCatalog','Act4ContentCatalog','Act5ContentCatalog','Act6ContentCatalog','Act7ContentCatalog','Act8ContentCatalog','ItemExpansionCatalog']:
 for it in load(name).get('items',[]):items[it['itemId']]=dict(it)
limits={r['itemId']:r for r in load('TrainingItemLimits')['entries']}
for it in items.values():
 it['sources']=[]
 if it['effectType']=='GainExperience':
  assert it['itemId'] in limits,it['itemId']
  it['trainingRange']=limits[it['itemId']]

policy=(root/'Assets/Scripts/Story/TownServices.cs').read_text();common_section=policy[policy.index(' CommonItems ='):];common_section=common_section[:common_section.index('};')];common=set(re.findall(r'"([^"]+)"',common_section));spec_section=policy[policy.index(' Specialties ='):];spec_section=spec_section[:spec_section.index('};')];specialties={rid:re.findall(r'"([^"]+)"',rest) for rid,rest in re.findall(r'\{ "([^"]+)", new\[\] \{([^}]+)\}',spec_section)}
for it in items.values():
 if not it.get('isEventOnly'):
  for rid,special in specialties.items():
   if regions[rid]['act']<it['shopUnlockAct']:continue
   if it['itemId'] in common:cond='이 마을의 상점 메뉴에서 구매'
   elif it['itemId'] in special:cond='소문 해결 후 마을 복구 '+str(1 if special.index(it['itemId'])==0 else 2)+'단계부터 전문 판매품에 추가'
   else:continue
   it['sources'].append(dict(title=regions[rid]['displayName']+' · 마을 상점',steps=[step(cond,ref('region',rid),ref('npc','town_'+rid+'_rumor'))]))
for hub in load('JourneyHubCatalog')['entries']:
 for id in hub['itemIds']:
  it=items[id];rid=hub['regionId']
  assert not it.get('isEventOnly') and not it.get('isKeyItem') and it['shopUnlockAct']<=regions[rid]['act']
  it['sources'].append(dict(title=hub['name']+' · 보급대',steps=[step(regions[rid]['displayName']+' 북서쪽의 보급대에서 구매합니다. 해당 지역을 방문하면 빠른 이동과 귀환 지점을 이용할 수 있습니다.',ref('region',rid))]))
for q in quests:
 if q.get('rewardItemId') in items:items[q['rewardItemId']]['sources'].append(dict(title='퀘스트 보상 · '+q['title'],quest=q['questId'],count=q['rewardItemCount'],steps=[]))
for e in events:
 if e.get('rewardItemId') in items:items[e['rewardItemId']]['sources'].append(dict(title='동행 이벤트 보상',count=e.get('rewardItemCount',1),steps=event_steps(e)))
def quest_way(q,personal_quest=False):
 steps=[]
 if personal_quest:steps.append(step('게임의 각본집에서 보유한 그림자를 선택하고 「기억 여정 시작」을 누릅니다.'))
 else:steps.append(step('퀘스트 「'+q['title']+'」를 진행합니다.'))
 for o in q['objectives']:
  rs=[];target=o.get('targetId');note=''
  if o['type']=='Talk' and target in npcs:rs=[ref('npc',target),ref('region',npcs[target]['region'])]
  if o['type']=='Reach' and target.removeprefix('area_') in regions:rs=[ref('region',target.removeprefix('area_'))]
  if o['type']=='Record' and target=='*':
   note=('현재까지 기록한 종을 셉니다.' if o.get('countKnownRecords') else '여정 시작 이후 새로 기록한 종을 셉니다.')+' 기록 확률을 높이는 잉크는 선택 사항입니다.';rs=[ref('item','ink'),ref('item','pale_ink')]
  if o['type']=='Defeat' and target=='*':note='여정 시작 이후 야생 전투 승리를 셉니다.'
  steps.append(step(o['description'],*rs,note=note))
 return dict(title=('개인 기억 여정 · ' if personal_quest else '퀘스트 · ')+q['title'],steps=steps,rewards=[dict(item=q['rewardItemId'],count=q['rewardItemCount'])] if q.get('rewardItemId') else [])
def boss_way(b):return dict(title='스토리 보스 · '+shadows[b['shadow']]['n'],steps=[step(regions[b['region']]['displayName']+'로 이동합니다.',ref('region',b['region'])),step(shadows[b['shadow']]['n']+'에게 승리하고 전투 후 대화를 끝까지 마칩니다.',ref('shadow',b['shadow']))])
def ways(flag,seen=None):
 seen=set() if seen is None else seen
 if flag in seen:return []
 seen.add(flag);result=[]
 for q in quests:
  if q.get('completionFlag')==flag:result.append(quest_way(q,q['questId'] in personal.values()))
 if flag in boss_flags:result.append(boss_way(boss_flags[flag]))
 for origin,choices in producers.get(flag,[]):
  if origin['kind']=='boss':result.append(boss_way(origin))
  elif origin['kind']=='npc':
   npc=origin['npc'];ss=[step(npcs[npc]['name']+'와 대화합니다.',ref('npc',npc),ref('region',origin['region']))]
   ss.append(step('아래 선택지 중 하나를 고르고 후속 대화까지 마칩니다.' if len(choices)>1 else '선택지 「'+choices[0]+'」를 고르고 후속 대화를 마칩니다.' if choices else '대화를 끝까지 마칩니다.',note=' / '.join(choices) if len(choices)>1 else ''))
   result.append(dict(title='NPC 대화 · '+npcs[npc]['name'],steps=ss))
  else:result.append(dict(title='지역 조사',steps=[step(regions[origin['region']]['displayName']+'의 조사 대상과 상호작용하고 대화를 마칩니다.',ref('region',origin['region']))]))
 for e in events:
  if e.get('rewardFlag')==flag or 'companion_event_'+e['eventId']+'_complete'==flag:result.append(dict(title='동행 이벤트 · '+shadows[e['requiredShadowId']]['n'],steps=event_steps(e)))
 if flag in aliases:result+=ways(aliases[flag],seen)
 unique=[];keys=set()
 for w in result:
  key=json.dumps(w,ensure_ascii=False,sort_keys=True)
  if key not in keys:keys.add(key);unique.append(w)
 return unique
forms=[];missing=[]
for s in book['shadows']:
 for i,f in enumerate(s['f']):
  if not f:continue
  stage=['restored','salvation','grudge'][i];routes=ways(f['flag']) if f['flag'] else []
  if f['flag'] and not routes:missing.append(f['flag'])
  form=dict(id=s['id']+'/'+stage,shadow=s['id'],baseName=s['n'],stage=stage,name=f['name'],level=f['lv'],image=f['image'],requiredItems=[],routes=routes,sourceFlag=f['flag'],prior=s['id']+'/restored' if i else None)
  forms.append(form)
  summary='' if not routes else ' / '.join(w['title'] for w in routes)
  if not routes:summary='추가 기억 조건 없이 레벨을 충족하면 됩니다.'
  f['guide']=dict(href='/shadow-codex/evolution/#'+form['id'],summary=summary,noItemCost=True)
# Link quest reward cards back to their actual actionable quest routes.
quest_map={q['questId']:q for q in quests}
for it in items.values():
 for source in it['sources']:
  if source.get('quest'):source['steps']=quest_way(quest_map[source['quest']],source['quest'] in personal.values())['steps']
for n in world['npcs']:n['evolutions']=[]
for r in world['regions']:r['evolutions']=[]
for it in items.values():it['relatedForms']=[]
for f in forms:
 link=dict(href='/shadow-codex/evolution/#'+f['id'],label=f['name'],id=f['id'])
 found=set()
 for route in f['routes']:
  for st in route['steps']:
   for rr in st['refs']:
    key=(rr['kind'],rr['id'])
    if key in found:continue
    found.add(key)
    if rr['kind']=='npc':npcs[rr['id']]['evolutions'].append(link)
    if rr['kind']=='region':regions[rr['id']]['evolutions'].append(link)
    if rr['kind']=='item':items[rr['id']]['relatedForms'].append(link)
  for reward in route.get('rewards',[]):
   if ('item',reward['item']) not in found:items[reward['item']]['relatedForms'].append(link);found.add(('item',reward['item']))
(web/'world-data.json').write_text(json.dumps(world,ensure_ascii=False,indent=2)+'\n')
assert not missing,sorted(set(missing))
assert len(forms)==173
assert all(it['sources'] for it in items.values())
data=dict(sourceCommit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip(),forms=forms,items=list(items.values()))
(web/'evolution-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
html=re.sub(pattern,lambda m:m[1]+json.dumps(book,ensure_ascii=False,separators=(',',':'))+m[3],html,count=1);(web/'index.html').write_text(html)
print(f'Exported {len(forms)} linked evolution guides, {len(items)} items; {len(set(f["sourceFlag"] for f in forms if f["sourceFlag"]))} conditions traced')
