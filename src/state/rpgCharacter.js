import { ADVANCEMENTS, getClass, xpForLevel } from '../data/rpg.js';
import { enhancementStats, masterEquipmentSet } from '../data/equipment.js';

export function ensureRpgCharacter(character) {
  character.inventory ??= [];
  character.companions ??= [];
  character.affinity ??= { merchant: 0, guildmaster: 0, innkeeper: 0, blacksmith: 0 };
  character.dialogueHistory ??= {};
  character.hunted ??= {};
  character.equipment ??= { helmet: null, armor: null, gloves: null, boots: null, weapon: null, necklace: null, rings: [null, null], earrings: [null, null] };
  character.equipment.rings ??= [null, null];
  character.equipment.earrings ??= [null, null];
  character.redeemedCoupons ??= [];
  character.advancementId ??= null;
  character.agility ??= getClass(character.classId)?.agility ?? 10;
  const equipment = character.equipment;
  const allItems = [...character.inventory, equipment.helmet, equipment.armor, equipment.gloves, equipment.boots, equipment.weapon, equipment.necklace, ...equipment.rings, ...equipment.earrings].filter((item) => item?.type === 'equipment');
  allItems.forEach((item) => { item.maxDurability ??= 100; item.durability ??= item.maxDurability; });
  return character;
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
    character.hp = character.maxHp;
    character.mp = character.maxMp;
    levels.push(character.level);
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

export function combatStats(character) {
  ensureRpgCharacter(character);
  const totals = { attack: character.attack, defense: character.defense, agility: character.agility ?? 10, maxHp: character.maxHp, maxMp: character.maxMp };
  for (const item of equippedItems(character)) {
    const stats = enhancementStats(item);
    totals.attack += stats.attack ?? 0;
    totals.defense += stats.defense ?? 0;
    totals.maxHp += stats.hp ?? 0;
    totals.maxMp += stats.mp ?? 0;
    totals.agility += stats.agility ?? 0;
  }
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
  character.hp = character.maxHp;
  character.mp = character.maxMp;
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
