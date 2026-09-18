import { MONSTERS } from './monsters.js';

export const EQUIPMENT_SLOTS = [
  { id: 'helmet', name: '투구', icon: '♛' }, { id: 'armor', name: '갑옷', icon: '♜' },
  { id: 'gloves', name: '장갑', icon: '✥' }, { id: 'boots', name: '신발', icon: '♟' },
  { id: 'weapon', name: '무기', icon: '⚔' }, { id: 'ring', name: '반지', icon: '◉' },
  { id: 'necklace', name: '목걸이', icon: '◇' }, { id: 'earring', name: '귀걸이', icon: '◈' },
];

export const RARITIES = {
  normal: { name: '노멀', color: 0xb8b4aa, multiplier: 1, order: 0, className: 'normal' },
  rare: { name: '레어', color: 0x4a9fe8, multiplier: 1.55, order: 1, className: 'rare' },
  unique: { name: '유니크', color: 0xb45de0, multiplier: 2.35, order: 2, className: 'unique' },
  legendary: { name: '레전더리', color: 0xf09a38, multiplier: 3.6, order: 3, className: 'legendary' },
  mythic: { name: '신화', color: 0xff4f5e, multiplier: 5.4, order: 4, className: 'mythic' },
};

const BIOMES = [
  ['forest', '숲의', 0x5d9b45], ['frozen', '설원의', 0x88cbe8], ['blood', '피빛', 0x9f2738],
  ['swamp', '늪지의', 0x65783c], ['desert', '사막의', 0xc99548], ['volcanic', '화염의', 0xd64a2e],
  ['storm', '폭풍의', 0x586e9e], ['abyss', '심연의', 0x49386f], ['undead', '망령의', 0x66766f],
  ['demonic', '마계의', 0x70273f], ['celestial', '성광의', 0xc9b66a], ['crystal', '수정의', 0x6e62b5],
];
const VARIANTS = ['추적자', '수호자', '파수꾼', '정복자', '방랑자', '군주의'];
const CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric', 'rogue'];
const CLASS_WEAPONS = { warrior: '대검', mage: '마도 지팡이', ranger: '장궁', cleric: '성전 철퇴', rogue: '쌍단검' };

function baseStats(slot, power) {
  const stats = { attack: 0, defense: 0, hp: 0, mp: 0, agility: 0 };
  if (slot === 'weapon') { stats.attack = 7 + power * 3; stats.agility = Math.round(power * 0.18); }
  if (slot === 'armor') { stats.defense = 6 + power * 2; stats.hp = 15 + power * 5; }
  if (slot === 'helmet') { stats.defense = 3 + power; stats.hp = 8 + power * 3; }
  if (slot === 'gloves') { stats.attack = 2 + power; stats.defense = 2 + power; stats.agility = 2 + Math.round(power * 0.5); }
  if (slot === 'boots') { stats.defense = 2 + power; stats.hp = 5 + power * 2; stats.agility = 3 + power; }
  if (slot === 'ring') { stats.attack = 2 + power * 2; stats.agility = 2 + Math.round(power * 0.8); }
  if (slot === 'necklace') { stats.hp = 10 + power * 4; stats.mp = 5 + power * 3; stats.agility = Math.round(power * 0.25); }
  if (slot === 'earring') { stats.attack = 1 + power; stats.mp = 4 + power * 2; stats.agility = 2 + Math.round(power * 0.6); }
  return stats;
}

function createEquipment({ id, name, slot, rarity, biome, color, variant, classId = null, source = null }) {
  const rarityData = RARITIES[rarity];
  const slotIndex = EQUIPMENT_SLOTS.findIndex((entry) => entry.id === slot) + 1;
  // Variants only add a small roll. Keeping that roll inside a 10% band means
  // the weakest item of a higher rarity always beats the strongest item of
  // the previous rarity in the same slot.
  const power = Math.round((slotIndex + 4) * rarityData.multiplier * (1 + variant * 0.02));
  const stats = baseStats(slot, power);
  return {
    id, catalogId: id, name, type: 'equipment', slot, rarity, biome, color,
    classId, enhancement: 0, stats, value: Math.round((35 + power * 13) * rarityData.multiplier),
    source, quantity: 1, durability: 100, maxDurability: 100,
  };
}

const generated = [];
for (const [biome, biomeName, color] of BIOMES) {
  for (const slot of EQUIPMENT_SLOTS) {
    for (const [rarity, rarityData] of Object.entries(RARITIES)) {
      for (let variant = 0; variant < 6; variant += 1) {
        const weaponClass = slot.id === 'weapon' ? CLASS_IDS[variant % CLASS_IDS.length] : null;
        const baseName = slot.id === 'weapon' ? CLASS_WEAPONS[weaponClass] : slot.name;
        generated.push(createEquipment({
          id: `eq-${biome}-${slot.id}-${rarity}-${variant}`,
          name: `${biomeName} ${VARIANTS[variant]} ${baseName}`,
          slot: slot.id, rarity, biome, color, variant, classId: weaponClass,
        }));
      }
    }
  }
}

// 120 named class relics complete the catalog at exactly 3,000 pieces.
for (const classId of CLASS_IDS) {
  for (let variant = 0; variant < 24; variant += 1) {
    const [biome, biomeName, color] = BIOMES[variant % BIOMES.length];
    generated.push(createEquipment({
      id: `relic-${classId}-${variant}`,
      name: `${biomeName} 서약의 ${CLASS_WEAPONS[classId]} · ${variant + 1}식`,
      slot: 'weapon', rarity: 'unique', biome, color, variant: variant % 6, classId, source: 'class-relic',
    }));
  }
}

export const EQUIPMENT_CATALOG = generated;
export const EQUIPMENT_COUNT = EQUIPMENT_CATALOG.length;
const EQUIPMENT_BY_CATALOG_ID = new Map(EQUIPMENT_CATALOG.map((item) => [item.catalogId, item]));
export const getRarity = (id) => RARITIES[id] ?? RARITIES.normal;
export const getSlot = (id) => EQUIPMENT_SLOTS.find((slot) => slot.id === id);

export function normalizeEquipmentStats(item) {
  if (!item || item.type !== 'equipment') return item;
  const catalog = EQUIPMENT_BY_CATALOG_ID.get(item.catalogId);
  if (!catalog) return item;
  const level = Math.max(1, Math.min(999, Math.round(Number(item.level) || 1)));
  const levelMultiplier = 1 + (level - 1) * 0.008;
  const sourceMultiplier = String(item.source ?? '').startsWith('fallen-') ? 1.12 : 1;
  item.level = level;
  item.stats = Object.fromEntries(Object.entries(catalog.stats).map(([key, value]) => [key, Math.round(value * levelMultiplier * sourceMultiplier)]));
  item.statVersion = 2;
  return item;
}

const RARITY_SEQUENCE = ['normal', 'rare', 'unique', 'legendary', 'mythic'];
export const FUSION_UPGRADE_RATES = { normal: 30, rare: 20, unique: 12, legendary: 5, mythic: 0 };

export function nextRarity(rarity) {
  const index = RARITY_SEQUENCE.indexOf(rarity);
  return index >= 0 && index < RARITY_SEQUENCE.length - 1 ? RARITY_SEQUENCE[index + 1] : null;
}

export function fusionUpgradeChance(first, second) {
  if (!first || !second || first.rarity !== second.rarity || !nextRarity(first.rarity)) return 0;
  const enhancementBonus = Math.min(10, ((Number(first.enhancement) || 0) + (Number(second.enhancement) || 0)) * 0.5);
  return Math.min(100, FUSION_UPGRADE_RATES[first.rarity] + enhancementBonus);
}

export function rollFusionEquipment(first, second, classId) {
  if (!first || !second || first.rarity !== second.rarity) return null;
  const upgraded = Math.random() * 100 < fusionUpgradeChance(first, second);
  const rarity = upgraded ? nextRarity(first.rarity) : first.rarity;
  const pool = EQUIPMENT_CATALOG.filter((item) => item.rarity === rarity && (!item.classId || item.classId === classId));
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (!base) return null;
  const item = cloneItem(base, '-fusion');
  item.level = Math.max(1, Math.min(999, Math.round(((Number(first.level) || 1) + (Number(second.level) || 1)) / 2)));
  item.enhancement = 0;
  item.durability = item.maxDurability ?? 100;
  item.source = 'equipment-fusion';
  normalizeEquipmentStats(item);
  return { item, upgraded, chance: fusionUpgradeChance(first, second) };
}

function cloneItem(item, suffix = '') {
  return { ...item, id: `${item.catalogId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}${suffix}`, stats: { ...item.stats } };
}

// 일반 사냥 드랍 확률(누적 아님, 각 등급이 걸릴 개별 확률).
// B/A/S급 몬스터만 unique 이상을 노려볼 수 있고, A/S급(우두머리)만 legendary/mythic이 뜬다.
export const HUNT_DROP_RATES = {
  bossMythic: 0.0002,
  bossLegendary: 0.0015,
  specialUnique: 0.012,
  rare: 0.09,
  normal: 0.38,
};

export function equipmentForMonster(monster, classId, level = 1) {
  const special = ['B', 'A', 'S'].includes(monster.rank);
  const boss = ['A', 'S'].includes(monster.rank);
  const roll = Math.random();
  let rarity = null;
  if (boss && roll < HUNT_DROP_RATES.bossMythic) rarity = 'mythic';
  else if (boss && roll < HUNT_DROP_RATES.bossLegendary) rarity = 'legendary';
  else if (special && roll < HUNT_DROP_RATES.specialUnique) rarity = 'unique';
  else if (roll < HUNT_DROP_RATES.rare) rarity = 'rare';
  else if (roll < HUNT_DROP_RATES.normal) rarity = 'normal';
  if (!rarity) return null;
  const eligible = EQUIPMENT_CATALOG.filter((item) => item.biome === monster.biome && item.rarity === rarity && (!item.classId || item.classId === classId));
  const base = eligible[Math.floor(Math.random() * eligible.length)];
  if (!base) return null;
  const item = cloneItem(base);
  item.level = Math.max(1, level);
  if (Math.random() < 0.16) {
    item.name = `쓰러진 모험가의 ${base.name}`;
    item.source = `fallen-${monster.id}`;
  } else item.source = monster.id;
  normalizeEquipmentStats(item);
  return item;
}

// 우두머리(보스) 처치 확정 지급 등급 확률 (2% 신화 / 13% 전설 / 나머지 85% 유니크).
export const BOSS_GUARANTEED_RATES = { mythic: 0.02, legendary: 0.15 };

// 우두머리(보스) 몬스터를 처치하면 등급과 무관하게 항상 유니크 이상 장비를 확정 지급한다.
export function guaranteedBossEquipment(monster, classId, level = 1) {
  const roll = Math.random();
  const rarity = roll < BOSS_GUARANTEED_RATES.mythic ? 'mythic' : roll < BOSS_GUARANTEED_RATES.legendary ? 'legendary' : 'unique';
  const pool = EQUIPMENT_CATALOG.filter((item) => item.rarity === rarity && (!item.classId || item.classId === classId));
  const eligible = pool.filter((item) => item.biome === monster.biome);
  const base = (eligible.length ? eligible : pool)[Math.floor(Math.random() * (eligible.length ? eligible.length : pool.length))];
  if (!base) return null;
  const item = cloneItem(base);
  item.level = Math.max(1, level);
  item.name = `${monster.name}의 유산 · ${base.name}`;
  item.source = `boss-${monster.id}`;
  normalizeEquipmentStats(item);
  return item;
}

// 장비 랜덤 뽑기권: 부위 전체 랜덤, 등급은 노멀 50%/레어 25%/유니크 15%/레전더리 8%/신화 2%.
export const GACHA_RARITY_TABLE = [
  ['normal', 0.5],
  ['rare', 0.25],
  ['unique', 0.15],
  ['legendary', 0.08],
  ['mythic', 0.02],
];

export function rollGachaRarity() {
  const roll = Math.random();
  let acc = 0;
  for (const [rarity, weight] of GACHA_RARITY_TABLE) {
    acc += weight;
    if (roll < acc) return rarity;
  }
  return GACHA_RARITY_TABLE[0][0];
}

export function rollGachaEquipment(classId, level = 1) {
  const rarity = rollGachaRarity();
  const slot = EQUIPMENT_SLOTS[Math.floor(Math.random() * EQUIPMENT_SLOTS.length)].id;
  const pool = EQUIPMENT_CATALOG.filter((item) => item.slot === slot && item.rarity === rarity && (!item.classId || item.classId === classId));
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (!base) return null;
  const item = cloneItem(base, '-gacha');
  item.level = Math.max(1, level);
  item.source = 'gacha-ticket';
  normalizeEquipmentStats(item);
  return item;
}

export function shopEquipment(classId, level = 1) {
  const pool = EQUIPMENT_CATALOG.filter((item) => ['normal', 'rare'].includes(item.rarity) && (!item.classId || item.classId === classId));
  const seed = Math.floor(Date.now() / 3600000) + level * 17;
  return Array.from({ length: 8 }, (_, index) => {
    const item = cloneItem(pool[(seed * (index + 3) * 97) % pool.length], `-shop-${index}`);
    item.level = Math.max(1, level);
    normalizeEquipmentStats(item);
    return item;
  });
}

export function classCouponWeapon(classId, level = 1) {
  const base = EQUIPMENT_CATALOG.find((item) => item.source === 'class-relic' && item.classId === classId);
  if (!base) return null;
  const item = cloneItem(base, '-coupon');
  item.level = Math.max(1, level);
  normalizeEquipmentStats(item);
  return item;
}

export function level200MythicWeapon(classId) {
  const pool = EQUIPMENT_CATALOG.filter((item) => item.slot === 'weapon' && item.rarity === 'mythic' && item.classId === classId);
  const base = pool.find((item) => item.biome === 'celestial') ?? pool[0];
  if (!base) return null;
  const item = cloneItem(base, '-level-200');
  item.level = 200;
  item.name = `영웅의 서약 · ${CLASS_WEAPONS[classId]}`;
  item.source = 'level-200-mythic';
  normalizeEquipmentStats(item);
  return item;
}

// 쿠폰용 신화급 무기: 직업 전용 무기가 있으면 그중 하나를, 없으면 아무 신화급
// 무기나 무작위로 지급한다(레벨 200 마일스톤 보상과는 별개의 지급 경로).
export function mythicWeaponCoupon(classId, level = 1) {
  const classPool = EQUIPMENT_CATALOG.filter((item) => item.slot === 'weapon' && item.rarity === 'mythic' && item.classId === classId);
  const pool = classPool.length ? classPool : EQUIPMENT_CATALOG.filter((item) => item.slot === 'weapon' && item.rarity === 'mythic');
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (!base) return null;
  const item = cloneItem(base, '-coupon-mythic');
  item.level = Math.max(1, level);
  normalizeEquipmentStats(item);
  return item;
}

const ACCESSORY_SLOTS = ['ring', 'necklace', 'earring'];

// 쿠폰용 신화급 악세서리: 반지/목걸이/귀걸이 중 하나를 무작위로 지급한다.
export function mythicAccessoryCoupon(level = 1) {
  const slot = ACCESSORY_SLOTS[Math.floor(Math.random() * ACCESSORY_SLOTS.length)];
  const pool = EQUIPMENT_CATALOG.filter((item) => item.slot === slot && item.rarity === 'mythic');
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (!base) return null;
  const item = cloneItem(base, '-coupon-mythic');
  item.level = Math.max(1, level);
  normalizeEquipmentStats(item);
  return item;
}

// 캐릭터 레벨이 장비 레벨보다 20 이상 높아지면 서서히 성능이 떨어진다
// (초과분 1레벨당 1%씩, 최대 80% 감소 - 완전히 못 쓰게 되진 않는다).
// 저레벨 사냥터에서 얻은 장비를 고레벨에서 계속 우려먹지 못하게 하기 위함.
export function levelEffectiveness(itemLevel, characterLevel) {
  const gap = (characterLevel ?? 1) - (itemLevel ?? 1);
  if (gap <= 20) return 1;
  return 1 - Math.min(0.8, (gap - 20) * 0.01);
}

// 장비 자체의 "타고난" 값어치 - 강화 수치와 내구도는 나중에 돈을 들이면 얼마든지
// 같아질 수 있는 값이라 빼고, 부위/희귀도/변형에서 오는 순수 스탯만으로 비교한다.
// combatPower()와 같은 가중치를 써서 캐릭터 종합 전투력과 같은 척도로 비교 가능하다.
export function baseItemPower(item, characterLevel = null) {
  if (!item || item.type !== 'equipment') return 0;
  const stats = item.stats ?? {};
  const raw = (stats.attack ?? 0) * 5 + (stats.defense ?? 0) * 4 + (stats.agility ?? 0) * 2 + (stats.hp ?? 0) * 0.35 + (stats.mp ?? 0) * 0.1;
  const levelFactor = characterLevel != null ? levelEffectiveness(item.level ?? 1, characterLevel) : 1;
  return Math.round(raw * levelFactor);
}

export function enhancementStats(item, characterLevel = null) {
  const multiplier = 1 + (item.enhancement ?? 0) * 0.11 + Math.max(0, (item.enhancement ?? 0) - 10) * 0.025;
  const durability = durabilityMultiplier(item);
  const levelFactor = characterLevel != null ? levelEffectiveness(item.level ?? 1, characterLevel) : 1;
  return Object.fromEntries(Object.entries(item.stats).map(([key, value]) => [key, Math.round(value * multiplier * durability * levelFactor)]));
}

export function durabilityMultiplier(item) {
  const ratio = (item.durability ?? 100) / (item.maxDurability ?? 100);
  if (ratio <= 0) return 0.1;
  if (ratio < 0.25) return 0.25;
  if (ratio < 0.5) return 0.5;
  if (ratio < 0.75) return 0.75;
  return 1;
}

export function masterEquipmentSet(classId) {
  const desired = ['helmet', 'armor', 'gloves', 'boots', 'weapon', 'necklace', 'ring', 'ring', 'earring', 'earring'];
  const usage = {};
  return desired.map((slot) => {
    const candidates = EQUIPMENT_CATALOG.filter((item) => item.slot === slot && item.rarity === 'mythic' && (!item.classId || item.classId === classId));
    const index = usage[slot] ?? 0;
    usage[slot] = index + 1;
    const item = cloneItem(candidates[index % candidates.length], '-master');
    Object.assign(item, { level: 999, enhancement: 20, durability: 100, maxDurability: 100, source: 'master-account' });
    return normalizeEquipmentStats(item);
  });
}

// 같은 지역(biome) 장비를 여러 개 착용하면 전체 스탯에 보너스를 준다.
export const SET_BONUS_TIERS = [
  { count: 3, statMultiplier: 0.06 },
  { count: 5, statMultiplier: 0.14 },
  { count: 8, statMultiplier: 0.25 },
];

export function equipmentSetBonus(items) {
  const counts = {};
  for (const item of items) {
    if (!item?.biome) continue;
    counts[item.biome] = (counts[item.biome] ?? 0) + 1;
  }
  let bestBiome = null;
  let bestCount = 0;
  for (const [biome, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      bestBiome = biome;
    }
  }
  let tier = null;
  for (const candidate of SET_BONUS_TIERS) {
    if (bestCount >= candidate.count) tier = candidate;
  }
  return { biome: bestBiome, count: bestCount, tier, multiplier: tier?.statMultiplier ?? 0 };
}

export function equipmentDisplayName(item) {
  return `${item.enhancement > 0 ? `+${item.enhancement} ` : ''}${item.name}`;
}

export function enhancementVisualClass(item) {
  const level = item?.enhancement ?? 0;
  if (level >= 20) return 'enhancement-max';
  if (level >= 10) return 'enhancement-high';
  if (level >= 5) return 'enhancement-mid';
  return '';
}

// +10까지는 성장 구간으로 보고 높은 성공률과 실패 안전장치를 적용한다.
// +10 이후부터는 기존의 고위험 강화 곡선을 그대로 사용한다.
export const ENHANCEMENT_SUCCESS_RATES = [100, 100, 98, 96, 93, 90, 86, 82, 76, 70, 28, 22, 17, 13, 10, 7, 5, 3, 2, 1];
// 실패 시 파괴될 확률(%). +10부터 존재하며, 파괴되지 않으면(+10 이후 구간만) 강화 수치가 1 하락한다.
export const ENHANCEMENT_DESTROY_RATES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 8, 12, 18, 25, 33, 43, 55, 70, 85];

export const ENHANCEMENT_BLESSINGS = {
  small: { name: '작은 축복', bonus: 10, symbol: '✧' },
  normal: { name: '별의 축복', bonus: 20, symbol: '✦' },
  great: { name: '대축복', bonus: 30, symbol: '★' },
};

export function enhancementSuccessRate(level, blessingBonus = 0) {
  const base = ENHANCEMENT_SUCCESS_RATES[Math.max(0, Math.min(19, level))] ?? 0;
  return Math.min(100, base + Math.max(0, Math.min(30, blessingBonus)));
}

export function isSafeEnhancement(level) {
  return level < 10;
}

export function catalogStats() {
  return { total: EQUIPMENT_COUNT, rarities: Object.keys(RARITIES).length, monsterFamilies: new Set(MONSTERS.map((monster) => monster.biome)).size };
}
