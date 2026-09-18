import { ADVANCEMENTS, advancementStageForLevel, getAdvancement, getAdvancementOptions, getClass, getCompanion, xpForLevel } from '../data/rpg.js';
import { enhancementStats, masterEquipmentSet, equipmentSetBonus, level200MythicWeapon, normalizeEquipmentStats, rollGachaEquipment } from '../data/equipment.js';
import { DEFAULT_POTION_ID, getPotion } from '../data/potions.js';

const GLOBAL_BOSS_TITLE_ID = 'lucky-lottery';
export const MAX_COMPANION_LEVEL = 999;

export function ensureRpgCharacter(character) {
  character.inventory ??= [];
  // Older saves stored a single flat potion counter; fold it into the new
  // per-type stash instead of discarding it.
  if (typeof character.potions === 'number') {
    character.potions = character.potions > 0 ? { [DEFAULT_POTION_ID]: character.potions } : {};
  }
  if (!character.potions || typeof character.potions !== 'object' || Array.isArray(character.potions)) character.potions = {};
  character.companions ??= [];
  character.companionProgress ??= {};
  character.affinity ??= { merchant: 0, guildmaster: 0, innkeeper: 0, blacksmith: 0 };
  character.dialogueHistory ??= {};
  character.hunted ??= {};
  character.bossVictories = Math.max(0, Math.floor(Number(character.bossVictories) || 0));
  character.attendanceDays = Math.max(0, Math.min(7, Math.floor(Number(character.attendanceDays) || 0)));
  character.unlockedTitles = Array.isArray(character.unlockedTitles) ? [...new Set(character.unlockedTitles.filter((id) => typeof id === 'string'))] : [];
  if (!character.unlockedTitles.includes(GLOBAL_BOSS_TITLE_ID)) character.unlockedTitles.push(GLOBAL_BOSS_TITLE_ID);
  character.equippedTitle = character.unlockedTitles.includes(character.equippedTitle) ? character.equippedTitle : null;
  character.equipment ??= { helmet: null, armor: null, gloves: null, boots: null, weapon: null, necklace: null, rings: [null, null], earrings: [null, null] };
  character.equipment.rings ??= [null, null];
  character.equipment.earrings ??= [null, null];
  character.redeemedCoupons ??= [];
  character.enhancementBlessings ??= { small: 0, normal: 0, great: 0 };
  for (const key of ['small', 'normal', 'great']) character.enhancementBlessings[key] = Math.max(0, Math.floor(Number(character.enhancementBlessings[key]) || 0));
  character.activeEnhancementBlessing = ['small', 'normal', 'great'].includes(character.activeEnhancementBlessing) ? character.activeEnhancementBlessing : null;
  // 짧게 사용됐던 숫자형 축복 저장값도 새 소모품 구조로 안전하게 옮긴다.
  if (Number(character.enhancementBlessing) > 0) {
    const migratedKey = Number(character.enhancementBlessing) >= 30 ? 'great' : Number(character.enhancementBlessing) >= 20 ? 'normal' : 'small';
    character.enhancementBlessings[migratedKey] += 1;
    delete character.enhancementBlessing;
  }
  character.astrologerDaily ??= { date: '', answered: 0, correct: 0 };
  character.advancementId ??= null;
  if (!Array.isArray(character.advancementHistory)) character.advancementHistory = [];
  const classAdvancementIds = new Set((ADVANCEMENTS[character.classId] ?? []).map((entry) => entry.id));
  character.advancementHistory = character.advancementHistory
    .filter((id, index, entries) => classAdvancementIds.has(id) && entries.indexOf(id) === index)
    .slice(0, 5);
  if (!character.advancementHistory.length && classAdvancementIds.has(character.advancementId)) {
    character.advancementHistory = [character.advancementId];
  } else if (character.advancementHistory.length && character.advancementId !== character.advancementHistory.at(-1)) {
    // advancementId drives which skills show up in battle; advancementHistory
    // is what actually gets pushed to on each 전직. Keep the former in sync
    // with the latest entry of the latter so a stage the player already
    // earned can never fail to show its skills (e.g. after a save that only
    // persisted one of the two fields).
    character.advancementId = character.advancementHistory.at(-1);
  }
  character.agility ??= getClass(character.classId)?.agility ?? 10;
  character.mailbox ??= [];
  character.level200WeaponGranted ??= false;
  if (character.level >= 200 && character.classId && !character.level200WeaponGranted) {
    character.level200WeaponGranted = true;
    const reward = level200MythicWeapon(character.classId);
    if (reward) character.inventory.unshift(reward);
  }
  if (!character.mailboxWelcomeGranted) {
    character.mailboxWelcomeGranted = true;
    for (let i = 0; i < 10; i += 1) {
      character.mailbox.push({
        id: `mail-welcome-${i}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        title: '길드의 환영 선물',
        body: '모험을 시작한 것을 축하하며, 무작위 장비를 보냅니다.',
        gachaEquipment: true,
        createdAt: Date.now(),
      });
    }
    character.mailbox.push({
      id: `mail-welcome-gold-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      title: '길드의 후원금',
      body: '모험 자금에 보태 쓰라며 길드에서 골드를 보냈습니다.',
      gold: 50000,
      createdAt: Date.now(),
    });
  }
  const equipment = character.equipment;
  const allItems = [...character.inventory, equipment.helmet, equipment.armor, equipment.gloves, equipment.boots, equipment.weapon, equipment.necklace, ...equipment.rings, ...equipment.earrings].filter((item) => item?.type === 'equipment');
  allItems.forEach((item) => {
    item.maxDurability ??= 100;
    item.durability ??= item.maxDurability;
    normalizeEquipmentStats(item);
  });
  const earnedEnhancements = allItems.filter((item) => !['attendance-7day', 'master-account'].includes(item.source)).map((item) => Number(item.enhancement) || 0);
  character.highestEnhancement = Math.max(Number(character.highestEnhancement) || 0, ...earnedEnhancements, 0);
  return character;
}

// 우편을 실제로 지급한다. gachaEquipment 우편은 미리 정해둔 아이템이 없고,
// 수령하는 바로 그 시점의 직업/레벨 기준으로 그 자리에서 장비를 뽑는다.
function grantMail(character, mail) {
  let grantedItem = null;
  if (mail.gold) {
    character.gold += mail.gold;
    character.goldEarnedTotal = (character.goldEarnedTotal ?? 0) + mail.gold;
  }
  if (mail.gachaEquipment) {
    grantedItem = rollGachaEquipment(character.classId, character.level);
    if (grantedItem) addLoot(character, grantedItem);
  } else if (mail.item) {
    grantedItem = mail.item;
    addLoot(character, mail.item);
  }
  return grantedItem;
}

function grantMailTitle(character, mail) {
  const title = mail.titleReward;
  if (!title || typeof title.id !== 'string' || typeof title.name !== 'string') return null;
  character.unlockedTitles ??= [];
  if (!character.unlockedTitles.includes(title.id)) character.unlockedTitles.push(title.id);
  return title;
}

export function claimMail(character, mailId) {
  ensureRpgCharacter(character);
  const index = character.mailbox.findIndex((mail) => mail.id === mailId);
  if (index < 0) return null;
  const [mail] = character.mailbox.splice(index, 1);
  return { gold: mail.gold ?? 0, item: grantMail(character, mail), title: grantMailTitle(character, mail) };
}

export function claimAllMail(character) {
  ensureRpgCharacter(character);
  const claimed = character.mailbox.splice(0, character.mailbox.length);
  const results = claimed.map((mail) => ({ gold: mail.gold ?? 0, item: grantMail(character, mail), title: grantMailTitle(character, mail) }));
  return results;
}

export function createRpgCharacter({ nickname, name, gender }) {
  return ensureRpgCharacter({
    version: 'rpg-1', nickname, name, gender, classId: null,
    level: 1, xp: 0, gold: 500, hp: 100, maxHp: 100, mp: 40, maxMp: 40,
    attack: 12, defense: 8, agility: 10, potions: 3,
    inventory: [], companions: [], activeCompanionId: null,
    affinity: { merchant: 0, guildmaster: 0, innkeeper: 0, blacksmith: 0 },
    dialogueHistory: {}, victories: 0, defeats: 0, bossVictories: 0, hunted: {}, createdAt: Date.now(),
    attendanceDays: 0, highestEnhancement: 0, unlockedTitles: [], equippedTitle: null,
    enhancementBlessings: { small: 0, normal: 0, great: 0 }, activeEnhancementBlessing: null,
    astrologerDaily: { date: '', answered: 0, correct: 0 },
  });
}

export function chooseClass(character, classId) {
  const job = getClass(classId);
  if (!job) return;
  character.classId = classId;
  character.maxHp = job.hp;
  character.hp = job.hp;
  character.maxMp = job.mp;
  character.mp = job.mp;
  character.attack = job.attack;
  character.defense = job.defense;
  character.agility = job.agility;
}

export function addXp(character, amount) {
  if (character.level >= 999) { character.level = 999; character.xp = 0; return []; }
  character.xp += amount;
  const levels = [];
  while (character.level < 999 && character.xp >= xpForLevel(character.level)) {
    character.xp -= xpForLevel(character.level);
    character.level += 1;
    character.maxHp += 12;
    character.maxMp += 5;
    character.attack += 3;
    character.defense += 2;
    levels.push(character.level);
  }
  if (levels.length) {
    // character.maxHp/maxMp are base-only; heal to the equipment-inclusive
    // max (combatStats) instead, or a geared character's HP bar looks like
    // it barely filled after "leveling up to full HP".
    const stats = combatStats(character);
    character.hp = stats.maxHp;
    character.mp = stats.maxMp;
  }
  if (character.level >= 999) character.xp = 0;
  if (character.level >= 200 && character.classId && !character.level200WeaponGranted) {
    character.level200WeaponGranted = true;
    const reward = level200MythicWeapon(character.classId);
    if (reward) character.inventory.unshift(reward);
  }
  return levels;
}

export function addLoot(character, loot) {
  ensureRpgCharacter(character);
  const existing = character.inventory.find((item) => item.id === loot.id);
  if (existing) existing.quantity += loot.quantity ?? 1;
  else character.inventory.push({ ...loot, quantity: loot.quantity ?? 1 });
}

export function equippedItems(character) {
  ensureRpgCharacter(character);
  const equipment = character.equipment;
  return [equipment.helmet, equipment.armor, equipment.gloves, equipment.boots, equipment.weapon, equipment.necklace, ...equipment.rings, ...equipment.earrings].filter(Boolean);
}

export function potionCount(character, potionId) {
  return character.potions?.[potionId] ?? 0;
}

export function totalPotionCount(character) {
  return Object.values(character.potions ?? {}).reduce((sum, qty) => sum + qty, 0);
}

export function addPotion(character, potionId, amount = 1) {
  ensureRpgCharacter(character);
  if (amount <= 0) return;
  character.potions[potionId] = (character.potions[potionId] ?? 0) + amount;
}

export function usePotion(character, potionId) {
  ensureRpgCharacter(character);
  if ((character.potions[potionId] ?? 0) <= 0) return null;
  const potion = getPotion(potionId);
  if (!potion) return null;
  character.potions[potionId] -= 1;
  if (character.potions[potionId] <= 0) delete character.potions[potionId];
  return potion;
}

// 동료는 모집 후에도 전투마다 유대 경험치를 얻어 성장한다 (5레벨마다 각성으로 위력 강화).
export function companionBondXpForLevel(level) {
  return 40 + level * 20;
}

export function ensureCompanionProgress(character, companionId) {
  ensureRpgCharacter(character);
  if (!character.companionProgress[companionId]) {
    character.companionProgress[companionId] = { level: 1, xp: 0 };
  }
  const progress = character.companionProgress[companionId];
  progress.level = Math.max(1, Math.min(MAX_COMPANION_LEVEL, Math.floor(Number(progress.level) || 1)));
  progress.xp = progress.level >= MAX_COMPANION_LEVEL ? 0 : Math.max(0, Number(progress.xp) || 0);
  return progress;
}

export function companionStats(character, companionId) {
  const base = getCompanion(companionId);
  if (!base) return null;
  const progress = ensureCompanionProgress(character, companionId);
  const bondLevel = progress.level;
  const awakenings = Math.floor((bondLevel - 1) / 5);
  return {
    id: companionId,
    level: bondLevel,
    xp: progress.xp,
    xpToNext: bondLevel >= MAX_COMPANION_LEVEL ? 0 : companionBondXpForLevel(bondLevel),
    attack: base.attack + Math.round((bondLevel - 1) * 2.2),
    defense: base.defense + Math.round((bondLevel - 1) * 1.4),
    hp: base.hp + Math.round((bondLevel - 1) * 8),
    heal: base.heal ? base.heal + Math.round((bondLevel - 1) * 1.2) : undefined,
    abilityMultiplier: 1 + awakenings * 0.15,
    awakenings,
  };
}

export function grantCompanionXp(character, companionId, amount) {
  const progress = ensureCompanionProgress(character, companionId);
  const levels = [];
  if (progress.level >= MAX_COMPANION_LEVEL) return levels;
  progress.xp += Math.max(0, amount);
  while (progress.level < MAX_COMPANION_LEVEL && progress.xp >= companionBondXpForLevel(progress.level)) {
    progress.xp -= companionBondXpForLevel(progress.level);
    progress.level += 1;
    levels.push(progress.level);
  }
  if (progress.level >= MAX_COMPANION_LEVEL) progress.xp = 0;
  return levels;
}

export function combatStats(character) {
  ensureRpgCharacter(character);
  const totals = { attack: character.attack, defense: character.defense, agility: character.agility ?? 10, maxHp: character.maxHp, maxMp: character.maxMp };
  const items = equippedItems(character);
  for (const item of items) {
    const stats = enhancementStats(item, character.level);
    totals.attack += stats.attack ?? 0;
    totals.defense += stats.defense ?? 0;
    totals.maxHp += stats.hp ?? 0;
    totals.maxMp += stats.mp ?? 0;
    totals.agility += stats.agility ?? 0;
  }
  const setBonus = equipmentSetBonus(items);
  if (setBonus.multiplier > 0) {
    const boost = 1 + setBonus.multiplier;
    totals.attack = Math.round(totals.attack * boost);
    totals.defense = Math.round(totals.defense * boost);
    totals.maxHp = Math.round(totals.maxHp * boost);
    totals.maxMp = Math.round(totals.maxMp * boost);
  }
  totals.setBonus = setBonus;
  return totals;
}

export function combatPower(character) {
  const stats = combatStats(character);
  return Math.max(1, Math.round(
    stats.attack * 5
    + stats.defense * 4
    + stats.agility * 2
    + stats.maxHp * 0.35
    + stats.maxMp * 0.1,
  ));
}

export function createMasterCharacter(nickname, classId) {
  const job = getClass(classId);
  const levelUps = 998;
  const firstAdvancement = ADVANCEMENTS[classId]?.find((entry) => entry.stage === 1);
  const advancementHistory = firstAdvancement
    ? [firstAdvancement, ...[2, 3, 4, 5].map((stage) => getAdvancementOptions(classId, stage, firstAdvancement.id)[0]).filter(Boolean)]
    : [];
  const advancement = advancementHistory.at(-1);
  const advancementBonuses = advancementHistory.length;
  const items = masterEquipmentSet(classId);
  const bySlot = (slot, index = 0) => items.filter((item) => item.slot === slot)[index] ?? null;
  const character = ensureRpgCharacter({
    version: 'rpg-1', nickname, name: nickname, gender: 'master', classId, isAdmin: true,
    level: 999, xp: 0, gold: 99999999,
    maxHp: job.hp + levelUps * 12 + 35 * advancementBonuses, hp: job.hp + levelUps * 12 + 35 * advancementBonuses,
    maxMp: job.mp + levelUps * 5 + 25 * advancementBonuses, mp: job.mp + levelUps * 5 + 25 * advancementBonuses,
    attack: job.attack + levelUps * 3 + 8 * advancementBonuses, defense: job.defense + levelUps * 2 + 5 * advancementBonuses, agility: job.agility,
    potions: 999, inventory: [], companions: [], activeCompanionId: null,
    affinity: { merchant: 50, guildmaster: 50, innkeeper: 50, blacksmith: 50 }, dialogueHistory: {},
    victories: 0, defeats: 0, hunted: {}, advancementId: advancement?.id ?? null,
    advancementHistory: advancementHistory.map((entry) => entry.id),
    redeemedCoupons: [], createdAt: Date.now(),
    equipment: {
      helmet: bySlot('helmet'), armor: bySlot('armor'), gloves: bySlot('gloves'), boots: bySlot('boots'), weapon: bySlot('weapon'), necklace: bySlot('necklace'),
      rings: [bySlot('ring', 0), bySlot('ring', 1)], earrings: [bySlot('earring', 0), bySlot('earring', 1)],
    },
  });
  const totals = combatStats(character);
  character.hp = totals.maxHp;
  character.mp = totals.maxMp;
  return character;
}

export function equipItem(character, itemId, preferredIndex = 0) {
  ensureRpgCharacter(character);
  const itemIndex = character.inventory.findIndex((item) => item.id === itemId && item.type === 'equipment');
  if (itemIndex < 0) return false;
  const item = character.inventory[itemIndex];
  if (item.classId && item.classId !== character.classId) return false;
  character.inventory.splice(itemIndex, 1);
  if (item.slot === 'ring' || item.slot === 'earring') {
    const key = item.slot === 'ring' ? 'rings' : 'earrings';
    const empty = character.equipment[key].findIndex((entry) => !entry);
    const target = empty >= 0 ? empty : Math.max(0, Math.min(1, preferredIndex));
    if (character.equipment[key][target]) character.inventory.push(character.equipment[key][target]);
    character.equipment[key][target] = item;
  } else {
    if (character.equipment[item.slot]) character.inventory.push(character.equipment[item.slot]);
    character.equipment[item.slot] = item;
  }
  const stats = combatStats(character);
  character.hp = Math.min(character.hp, stats.maxHp);
  character.mp = Math.min(character.mp, stats.maxMp);
  return true;
}

export function unequipItem(character, slot, index = 0) {
  ensureRpgCharacter(character);
  const key = slot === 'ring' ? 'rings' : slot === 'earring' ? 'earrings' : slot;
  const item = Array.isArray(character.equipment[key]) ? character.equipment[key][index] : character.equipment[key];
  if (!item) return false;
  character.inventory.push(item);
  if (Array.isArray(character.equipment[key])) character.equipment[key][index] = null;
  else character.equipment[key] = null;
  return true;
}

export function nextAdvancementStage(character) {
  ensureRpgCharacter(character);
  const unlockedStage = advancementStageForLevel(character.level);
  for (let stage = 1; stage <= unlockedStage; stage += 1) {
    const chosen = character.advancementHistory.some((id) => getAdvancement(id)?.stage === stage);
    if (!chosen) return stage;
  }
  return null;
}

export function availableAdvancements(character) {
  const stage = nextAdvancementStage(character);
  if (!stage) return [];
  const pathId = getAdvancement(character.advancementHistory[0])?.pathId ?? null;
  return getAdvancementOptions(character.classId, stage, pathId);
}

export function chooseAdvancement(character, advancementId) {
  const stage = nextAdvancementStage(character);
  const job = getAdvancement(advancementId);
  if (!stage || !job || job.stage !== stage || !availableAdvancements(character).some((entry) => entry.id === advancementId)) return false;
  character.advancementHistory.push(advancementId);
  character.advancementId = advancementId;
  character.attack += 8;
  character.defense += 5;
  character.maxHp += 35;
  character.maxMp += 25;
  const stats = combatStats(character);
  character.hp = stats.maxHp;
  character.mp = stats.maxMp;
  return true;
}

export function adjustAffinity(character, npcId, delta) {
  ensureRpgCharacter(character);
  const current = character.affinity[npcId] ?? 0;
  character.affinity[npcId] = Math.max(-50, Math.min(50, current + delta));
  return character.affinity[npcId];
}

// Scenes call this after nearly every action, so several saves can be
// triggered within the same second (e.g. choosing an advancement right
// before a battle screen also saves). Firing them all as parallel requests
// lets an older, slower request land at the server after a newer one and
// silently overwrite it - which is how a just-picked advancement skill (or
// any other fresh change) could quietly vanish on reload. Serializing sends
// - queueing the latest snapshot and only sending the next one once the
// in-flight request settles - guarantees the DB always ends up with the
// most recent state instead of whichever request happened to finish last.
let activeSave = null;
let queuedSaveBody = null;

function flushSaveQueue() {
  const body = queuedSaveBody;
  queuedSaveBody = null;
  activeSave = fetch('/api/character', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  }).catch(() => {}).finally(() => {
    activeSave = null;
    if (queuedSaveBody) flushSaveQueue();
  });
}

export async function waitForPendingSaves() {
  while (activeSave) await activeSave;
}

export function saveCharacter(scene) {
  const nickname = scene.registry.get('nickname');
  const character = scene.registry.get('character');
  if (!nickname || !character) return;
  ensureRpgCharacter(character);
  queuedSaveBody = JSON.stringify({ nickname, character });
  if (!activeSave) flushSaveQueue();
}
