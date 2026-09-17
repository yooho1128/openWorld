import { getClass, xpForLevel } from '../data/rpg.js';

export function createRpgCharacter({ nickname, name, gender }) {
  return {
    version: 'rpg-1', nickname, name, gender, classId: null,
    level: 1, xp: 0, gold: 500, hp: 100, maxHp: 100, mp: 40, maxMp: 40,
    attack: 12, defense: 8, potions: 3,
    inventory: [], companions: [], activeCompanionId: null,
    affinity: { merchant: 0, guildmaster: 0, innkeeper: 0, blacksmith: 0 },
    dialogueHistory: {}, victories: 0, defeats: 0, hunted: {}, createdAt: Date.now(),
  };
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
  const existing = character.inventory.find((item) => item.id === loot.id);
  if (existing) existing.quantity += loot.quantity ?? 1;
  else character.inventory.push({ ...loot, quantity: loot.quantity ?? 1 });
}

export function adjustAffinity(character, npcId, delta) {
  const current = character.affinity[npcId] ?? 0;
  character.affinity[npcId] = Math.max(-50, Math.min(50, current + delta));
  return character.affinity[npcId];
}

export function saveCharacter(scene) {
  const nickname = scene.registry.get('nickname');
  const character = scene.registry.get('character');
  if (!nickname || !character) return;
  fetch('/api/character', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, character }),
  }).catch(() => {});
}
