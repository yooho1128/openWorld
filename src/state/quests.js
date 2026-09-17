import { DAILY_QUEST_POOL, MILESTONE_QUESTS, BIOME_IDS } from '../data/quests.js';
import { BIOME_LABELS } from '../data/monsters.js';
import { DEFAULT_POTION_ID } from '../data/potions.js';
import { addPotion, addXp } from './rpgCharacter.js';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function buildDailyQuest(template) {
  const biome = template.type === 'biome' ? BIOME_IDS[randInt(0, BIOME_IDS.length - 1)] : null;
  let target;
  if (template.type === 'boss') target = 1;
  else if (template.type === 'gold') target = Math.round(randInt(template.minTarget, template.maxTarget) / 50) * 50;
  else target = randInt(template.minTarget, template.maxTarget);
  return {
    id: `${template.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    templateId: template.id,
    type: template.type,
    biome,
    target,
    progress: 0,
    claimed: false,
    label: template.describe(target, biome ? BIOME_LABELS[biome] : null),
    rewardGold: Math.round(template.goldPerUnit * target),
    rewardXp: Math.round(template.xpPerUnit * target),
    rewardPotions: template.type === 'boss' ? 1 : 0,
  };
}

function generateDailyQuests() {
  const shuffled = [...DAILY_QUEST_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(buildDailyQuest);
}

// 캐릭터에 의뢰 관련 필드가 없으면 만들고, 날짜가 바뀌었으면 오늘의 의뢰 3개를 새로 뽑는다.
export function ensureQuestState(character) {
  character.quests ??= { daily: null, milestoneClaims: [] };
  character.quests.milestoneClaims ??= [];
  character.goldEarnedTotal ??= character.gold ?? 0;
  const today = todayKey();
  if (!character.quests.daily || character.quests.daily.date !== today) {
    character.quests.daily = { date: today, list: generateDailyQuests() };
  }
  return character.quests;
}

// 전투 승리 시 호출해 오늘의 의뢰 진행도를 갱신한다.
export function advanceDailyQuests(character, event) {
  const quests = ensureQuestState(character);
  quests.daily.list.forEach((quest) => {
    if (quest.claimed || quest.progress >= quest.target) return;
    if (quest.type === 'hunt') quest.progress += 1;
    else if (quest.type === 'biome' && event.biome === quest.biome) quest.progress += 1;
    else if (quest.type === 'boss' && event.isBoss) quest.progress += 1;
    else if (quest.type === 'gold') quest.progress += Math.max(0, event.goldEarned ?? 0);
    quest.progress = Math.min(quest.progress, quest.target);
  });
}

export function claimDailyQuest(character, questId) {
  const quests = ensureQuestState(character);
  const quest = quests.daily.list.find((entry) => entry.id === questId);
  if (!quest || quest.claimed || quest.progress < quest.target) return null;
  quest.claimed = true;
  character.gold += quest.rewardGold;
  character.goldEarnedTotal = (character.goldEarnedTotal ?? 0) + quest.rewardGold;
  addPotion(character, DEFAULT_POTION_ID, quest.rewardPotions ?? 0);
  const levels = addXp(character, quest.rewardXp);
  return { quest, levels };
}

function milestoneStatValue(character, stat) {
  if (stat === 'huntedTotal') return Object.values(character.hunted ?? {}).reduce((sum, n) => sum + n, 0);
  if (stat === 'goldEarnedTotal') return character.goldEarnedTotal ?? 0;
  return character[stat] ?? 0;
}

export function milestoneStatus(character) {
  ensureQuestState(character);
  const claimed = new Set(character.quests.milestoneClaims);
  return MILESTONE_QUESTS.map((entry) => {
    const value = milestoneStatValue(character, entry.stat);
    return { ...entry, value, claimedAlready: claimed.has(entry.id), achieved: value >= entry.target };
  });
}

export function claimMilestone(character, id) {
  const quests = ensureQuestState(character);
  const entry = MILESTONE_QUESTS.find((item) => item.id === id);
  if (!entry || quests.milestoneClaims.includes(id)) return null;
  const value = milestoneStatValue(character, entry.stat);
  if (value < entry.target) return null;
  quests.milestoneClaims.push(id);
  character.gold += entry.rewardGold ?? 0;
  character.goldEarnedTotal = (character.goldEarnedTotal ?? 0) + (entry.rewardGold ?? 0);
  addPotion(character, DEFAULT_POTION_ID, entry.rewardPotions ?? 0);
  const levels = addXp(character, entry.rewardXp ?? 0);
  return { entry, levels };
}

export function claimableCount(character) {
  const quests = ensureQuestState(character);
  const dailyClaimable = quests.daily.list.filter((q) => !q.claimed && q.progress >= q.target).length;
  const milestoneClaimable = milestoneStatus(character).filter((m) => m.achieved && !m.claimedAlready).length;
  return dailyClaimable + milestoneClaimable;
}
