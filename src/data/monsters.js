// Twelve regional families x ten species = 120 illustrated monsters.
// Every entry is deterministic so saves and the bestiary keep stable ids.
const BIOMES = [
  { id: 'forest', label: '숲', primary: 0x5d9b45, secondary: 0xb7d86a, accent: 0xf5d66f },
  { id: 'frozen', label: '설원', primary: 0x88cbe8, secondary: 0xe8f7ff, accent: 0x6d89d8 },
  { id: 'blood', label: '피빛', primary: 0x9f2738, secondary: 0xe26055, accent: 0x32151c },
  { id: 'swamp', label: '늪지', primary: 0x65783c, secondary: 0x9a9f55, accent: 0x392d37 },
  { id: 'desert', label: '사막', primary: 0xc99548, secondary: 0xf0cf77, accent: 0x8c4e32 },
  { id: 'volcanic', label: '화염', primary: 0xd64a2e, secondary: 0xff9b35, accent: 0x3b2421 },
  { id: 'storm', label: '폭풍', primary: 0x586e9e, secondary: 0x9fc9e8, accent: 0xf2e684 },
  { id: 'abyss', label: '심연', primary: 0x49386f, secondary: 0x8362ad, accent: 0x42d4bb },
  { id: 'undead', label: '망령', primary: 0x66766f, secondary: 0xb9d1bd, accent: 0x89ffbf },
  { id: 'demonic', label: '마계', primary: 0x70273f, secondary: 0xc64054, accent: 0xf08a3c },
  { id: 'celestial', label: '성광', primary: 0xc9b66a, secondary: 0xfff1b7, accent: 0x79bddd },
  { id: 'crystal', label: '수정', primary: 0x6e62b5, secondary: 0xc79bea, accent: 0x74e2e2 },
];

const SPECIES = [
  { id: 'slime', label: '슬라임', rank: 'F', body: 'ooze' },
  { id: 'goblin', label: '고블린', rank: 'E', body: 'goblin' },
  { id: 'orc', label: '오크', rank: 'D', body: 'orc' },
  { id: 'ogre', label: '오우거', rank: 'C', body: 'ogre' },
  { id: 'wolf', label: '마수 늑대', rank: 'D', body: 'beast' },
  { id: 'golem', label: '골렘', rank: 'B', body: 'golem' },
  { id: 'wyvern', label: '와이번', rank: 'B', body: 'wyvern' },
  { id: 'dragon', label: '드래곤', rank: 'S', body: 'dragon' },
  { id: 'demon', label: '악마', rank: 'A', body: 'demon' },
  { id: 'mazoku', label: '마족', rank: 'A', body: 'mazoku' },
];

const TRAITS = {
  forest: '독과 덩굴', frozen: '빙결 숨결', blood: '흡혈과 광폭화', swamp: '맹독 안개',
  desert: '모래 잠복', volcanic: '화염 갑주', storm: '연쇄 번개', abyss: '공허 침식',
  undead: '영혼 흡수', demonic: '지옥불', celestial: '성광 방벽', crystal: '수정 반사',
};

export const MONSTERS = BIOMES.flatMap((biome, biomeIndex) => SPECIES.map((species, speciesIndex) => ({
  id: `${biome.id}-${species.id}`,
  texture: `monster-${biome.id}-${species.id}`,
  name: `${biome.label} ${species.label}`,
  biome: biome.id,
  biomeLabel: biome.label,
  species: species.id,
  body: species.body,
  rank: species.rank,
  trait: TRAITS[biome.id],
  primary: biome.primary,
  secondary: biome.secondary,
  accent: biome.accent,
  variant: (biomeIndex + speciesIndex) % 4,
})));

export const MONSTER_COUNT = MONSTERS.length;

export const BIOME_LABELS = Object.fromEntries(BIOMES.map((b) => [b.id, b.label]));

const LOCATION_BIOMES = {
  home: 'forest', school: 'crystal', gym: 'storm', languageAcademy: 'celestial',
  restaurant: 'forest', company: 'abyss', factory: 'volcanic', hackerDen: 'abyss',
  spyField: 'frozen', gangHideout: 'blood', convenienceStore: 'undead', parentCafe: 'crystal',
  lottery: 'demonic',
};

export function monstersForBiome(biome) {
  return MONSTERS.filter((monster) => monster.biome === biome);
}

export function monstersForLocation(locationId, count = 3) {
  const biome = LOCATION_BIOMES[locationId] ?? 'forest';
  const pool = monstersForBiome(biome);
  const preferred = ['goblin', 'orc', 'ogre', 'dragon', 'demon'];
  return preferred.slice(0, count).map((species, index) => (
    pool.find((monster) => monster.species === species) ?? pool[index]
  ));
}
