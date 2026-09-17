import { ADVANCEMENTS, getClass, getCompanion, xpForLevel } from '../data/rpg.js';
import { enhancementStats, masterEquipmentSet, equipmentSetBonus, rollGachaEquipment } from '../data/equipment.js';

export function ensureRpgCharacter(character) {
  character.inventory ??= [];
  character.companions ??= [];
  character.companionProgress ??= {};
  character.affinity ??= { merchant: 0, guildmaster: 0, innkeeper: 0, blacksmith: 0 };
  character.dialogueHistory ??= {};
  character.hunted ??= {};
  character.equipment ??= { helmet: null, armor: null, gloves: null, boots: null, weapon: null, necklace: null, rings: [null, null], earrings: [null, null] };
  character.equipment.rings ??= [null, null];
  character.equipment.earrings ??= [null, null];
  character.redeemedCoupons ??= [];
  character.advancementId ??= null;
  character.agility ??= getClass(character.classId)?.agility ?? 10;
  character.mailbox ??= [];
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
  allItems.forEach((item) => { item.maxDurability ??= 100; item.durability ??= item.maxDurability; });
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

export function claimMail(character, mailId) {
  ensureRpgCharacter(character);
  const index = character.mailbox.findIndex((mail) => mail.id === mailId);
  if (index < 0) return null;
  const [mail] = character.mailbox.splice(index, 1);
  return { gold: mail.gold ?? 0, item: grantMail(character, mail) };
}

export function claimAllMail(character) {
  ensureRpgCharacter(character);
  const claimed = character.mailbox.splice(0, character.mailbox.length);
  const results = claimed.map((mail) => ({ gold: mail.gold ?? 0, item: grantMail(character, mail) }));
  return results;
}

export function createRpgCharacter({ nickname, name, gender }) {
  return ensureRpgCharacter({
    version: 'rpg-1', nickname, name, gender, classId: null,
    level: 1, xp: 0, gold: 500, hp: 100, maxHp: 100, mp: 40, maxMp: 40,
    attack: 12, defense: 8, agility: 10, potions: 3,
    inventory: [], companions: [], activeCompanionId: null,
    affinity: { merchant: 0, guildmaster: 0, innkeeper: 0, blacksmith: 0 },
    dialogueHistory: {}, victories: 0, defeats: 0, hunted: {}, createdAt: Date.now(),
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
  character.xp += amount;
  const levels = [];
  while (character.xp >= xpForLevel(character.level)) {
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

// 동료는 모집 후에도 전투마다 유대 경험치를 얻어 성장한다 (5레벨마다 각성으로 위력 강화).
export function companionBondXpForLevel(level) {
  return 40 + level * 20;
}

export function ensureCompanionProgress(character, companionId) {
  ensureRpgCharacter(character);
  if (!character.companionProgress[companionId]) {
    character.companionProgress[companionId] = { level: 1, xp: 0 };
  }
  return character.companionProgress[companionId];
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
    xpToNext: companionBondXpForLevel(bondLevel),
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
  progress.xp += Math.max(0, amount);
  while (progress.level < 60 && progress.xp >= companionBondXpForLevel(progress.level)) {
    progress.xp -= companionBondXpForLevel(progress.level);
    progress.level += 1;
    levels.push(progress.level);
  }
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

export function createMasterCharacter(nickname, classId) {
  const job = getClass(classId);
  const levelUps = 998;
  const advancement = ADVANCEMENTS[classId]?.[0];
  const items = masterEquipmentSet(classId);
  const bySlot = (slot, index = 0) => items.filter((item) => item.slot === slot)[index] ?? null;
  const character = ensureRpgCharacter({
    version: 'rpg-1', nickname, name: nickname, gender: 'master', classId, isAdmin: true,
    level: 999, xp: 0, gold: 99999999,
    maxHp: job.hp + levelUps * 12 + 35, hp: job.hp + levelUps * 12 + 35,
    maxMp: job.mp + levelUps * 5 + 25, mp: job.mp + levelUps * 5 + 25,
    attack: job.attack + levelUps * 3 + 8, defense: job.defense + levelUps * 2 + 5, agility: job.agility,
    potions: 999, inventory: [], companions: [], activeCompanionId: null,
    affinity: { merchant: 50, guildmaster: 50, innkeeper: 50, blacksmith: 50 }, dialogueHistory: {},
    victories: 0, defeats: 0, hunted: {}, advancementId: advancement?.id ?? null,
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

export function chooseAdvancement(character, advancementId) {
  if (character.level < 10) return false;
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

export function saveCharacter(scene) {
  const nickname = scene.registry.get('nickname');
  const character = scene.registry.get('character');
  if (!nickname || !character) return;
  ensureRpgCharacter(character);
  fetch('/api/character', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, character }),
  }).catch(() => {});
}
