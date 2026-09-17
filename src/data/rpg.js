export const CLASSES = [
  { id: 'warrior', name: '수호 전사', icon: '⚔', color: 0xb95d46, hp: 145, mp: 35, attack: 18, defense: 13, agility: 8, skill: '방패 강타', skillPower: 1.7, description: '높은 체력과 방어력으로 전선을 지킨다.' },
  { id: 'mage', name: '원소 마도사', icon: '✦', color: 0x745fc7, hp: 92, mp: 90, attack: 24, defense: 7, agility: 11, skill: '별불꽃', skillPower: 2.25, description: '강력한 마법으로 한 번에 큰 피해를 준다.' },
  { id: 'ranger', name: '황야 추적자', icon: '➶', color: 0x4f9860, hp: 112, mp: 55, attack: 21, defense: 9, agility: 18, skill: '삼연사', skillPower: 1.95, description: '빠르고 안정적인 원거리 공격에 능하다.' },
  { id: 'cleric', name: '새벽 성직자', icon: '✚', color: 0xd0aa55, hp: 120, mp: 75, attack: 15, defense: 11, agility: 9, skill: '성스러운 빛', skillPower: 1.55, heal: 30, description: '회복과 성광으로 오래 싸울 수 있다.' },
  { id: 'rogue', name: '그림자 도적', icon: '◆', color: 0x4f596b, hp: 104, mp: 50, attack: 23, defense: 8, agility: 23, skill: '급소 찌르기', skillPower: 2.1, description: '치명타와 전리품 획득에 유리하다.' },
];

const BASE_ADVANCEMENTS = {
  warrior: [
    { id: 'berserker', name: '광전사', color: 0xc9473c, skills: [{ name: '피의 폭주', power: 2.8, cost: 18, effect: 'rage' }, { name: '대지 가르기', power: 2.2, cost: 14, effect: 'quake' }] },
    { id: 'guardian', name: '성벽 기사', color: 0x6485a8, skills: [{ name: '철벽 반격', power: 1.7, cost: 12, effect: 'shield' }, { name: '왕국의 방패', power: 1.2, cost: 16, effect: 'barrier' }] },
  ],
  mage: [
    { id: 'archmage', name: '대마도사', color: 0x8d63df, skills: [{ name: '메테오', power: 3.2, cost: 24, effect: 'meteor' }, { name: '마력 폭풍', power: 2.45, cost: 17, effect: 'arcane' }] },
    { id: 'frostweaver', name: '빙결술사', color: 0x6abfe6, skills: [{ name: '절대영도', power: 2.6, cost: 20, effect: 'frost' }, { name: '서리 감옥', power: 1.9, cost: 14, effect: 'freeze' }] },
  ],
  ranger: [
    { id: 'sniper', name: '천공 저격수', color: 0x65a95f, skills: [{ name: '혜성 저격', power: 3.0, cost: 20, effect: 'snipe' }, { name: '화살비', power: 2.2, cost: 15, effect: 'arrows' }] },
    { id: 'beastmaster', name: '마수 조련사', color: 0x8b7946, skills: [{ name: '야수의 포효', power: 2.35, cost: 17, effect: 'beast' }, { name: '독수리 강습', power: 2.0, cost: 13, effect: 'eagle' }] },
  ],
  cleric: [
    { id: 'paladin', name: '성광 성기사', color: 0xe0bb55, skills: [{ name: '천벌', power: 2.6, cost: 19, effect: 'holy' }, { name: '성역', power: 1.4, cost: 17, effect: 'sanctuary', heal: 42 }] },
    { id: 'oracle', name: '별의 예언자', color: 0xd3c68c, skills: [{ name: '운명의 별빛', power: 2.3, cost: 17, effect: 'stars' }, { name: '시간 치유', power: 1.2, cost: 15, effect: 'time', heal: 55 }] },
  ],
  rogue: [
    { id: 'assassin', name: '심연 암살자', color: 0x494461, skills: [{ name: '그림자 처형', power: 3.15, cost: 21, effect: 'shadow' }, { name: '독무', power: 2.1, cost: 14, effect: 'poison' }] },
    { id: 'trickster', name: '환영 괴도', color: 0x7d689b, skills: [{ name: '환영 난무', power: 2.65, cost: 18, effect: 'illusion' }, { name: '운명 훔치기', power: 2.0, cost: 13, effect: 'fortune' }] },
  ],
};

export const ADVANCEMENT_STAGES = [
  { stage: 1, level: 10, label: '2차 전직' },
  { stage: 2, level: 100, label: '3차 전직' },
  { stage: 3, level: 300, label: '4차 전직' },
  { stage: 4, level: 600, label: '5차 전직' },
  { stage: 5, level: 900, label: '6차 전직' },
];

// 2차 전직에서 선택한 계열을 끝까지 유지하되, 각 구간마다 두 가지 상위 직업 중 하나를 선택한다.
const ADVANCEMENT_BRANCH_NAMES = {
  berserker: [['폭풍 투사', '혈검 군주'], ['거신 파괴자', '적월 전쟁왕'], ['천붕 패왕', '불멸의 학살자'], ['종말의 무신', '피의 전쟁신']],
  guardian: [['왕국 수호자', '성철 기사'], ['요새 지배자', '신성 방패군주'], ['천공 성벽', '불멸의 수호왕'], ['세계의 방패', '창세의 기사왕']],
  archmage: [['비전 현자', '천체술사'], ['마력 지배자', '별폭풍 군주'], ['차원 대현자', '천궁의 마도왕'], ['창세의 마신', '무한의 대마도사']],
  frostweaver: [['빙하술사', '서리 현자'], ['동토 지배자', '백야 마녀'], ['영겁빙제', '절대영도 군주'], ['시간을 얼린 자', '태초의 겨울신']],
  sniper: [['성운 사수', '바람 저격수'], ['천궁 추적자', '혜성 사냥꾼'], ['별궤도 군주', '신궁'], ['운명을 꾰뚝는 자', '천공의 사냥신']],
  beastmaster: [['정령 조련사', '야수 지배자'], ['고대 수호 조련왕', '환수 군주'], ['태고의 소환왕', '만수의 제왕'], ['세계수의 벗', '야생의 신']],
  paladin: [['성역 기사', '심판관'], ['천벌 군주', '황금 수호왕'], ['천군 대원수', '신성 요새'], ['창세의 성기사', '광명의 전신']],
  oracle: [['성좌 예언자', '시간 사제'], ['운명 관측자', '은하 성녀'], ['영원의 예지자', '성계의 군주'], ['운명을 짜는 자', '별빛의 신']],
  assassin: [['야행 처형자', '독혈 살수'], ['심연 추적자', '적월 암살군주'], ['무영의 지배자', '멸혼의 왕'], ['종말의 처형자', '죽음의 신']],
  trickster: [['신기루 도적', '운명 사기꾼'], ['환영 지배자', '월광 괴도'], ['천명을 훔친 자', '이면의 군주'], ['세계를 속인 자', '혼돈의 신']],
};

function advancedSkills(root, name, stage, optionIndex) {
  const isAuthority = optionIndex === 1;
  return root.skills.map((skill, index) => ({
    ...skill,
    name: `${name}의 ${index === 0 ? '오의' : '권능'}`,
    // 각 단계의 A 선택지는 저비용·정밀형, B 선택지는 고비용·폭발형으로 분리한다.
    power: Number((skill.power + (stage - 1) * (isAuthority ? 0.85 : 0.65) + (isAuthority ? 0.35 : 0) + index * 0.08).toFixed(2)),
    cost: skill.cost + (stage - 1) * (isAuthority ? 6 : 4) + (isAuthority ? 4 : 0) + index,
    effect: `ascended:${skill.effect}:${stage}:${optionIndex}:${index}`,
    ...(skill.heal ? { heal: skill.heal + (stage - 1) * (isAuthority ? 24 : 16) + (isAuthority ? 10 : 0) } : {}),
  }));
}

export const ADVANCEMENTS = Object.fromEntries(Object.entries(BASE_ADVANCEMENTS).map(([classId, roots]) => [
  classId,
  roots.flatMap((root) => {
    const first = { ...root, stage: 1, requiredLevel: 10, pathId: root.id };
    const later = (ADVANCEMENT_BRANCH_NAMES[root.id] ?? []).flatMap((names, tierIndex) => {
      const stage = tierIndex + 2;
      return names.map((name, optionIndex) => ({
        id: `${root.id}-t${stage}-${optionIndex === 0 ? 'a' : 'b'}`,
        name,
        color: root.color,
        stage,
        requiredLevel: ADVANCEMENT_STAGES[stage - 1].level,
        pathId: root.id,
        skills: advancedSkills(root, name, stage, optionIndex),
      }));
    });
    return [first, ...later];
  }),
]));

const REGION_BLUEPRINTS = [
  ['forest', '속삭이는 숲', '초보 사냥터', 1, 0x4c8b4b], ['frozen', '서리왕의 설원', '빙결 몬스터 출몰', 3, 0x79b9d9],
  ['blood', '피의 협곡', '광폭한 오크 부족', 5, 0xa63843], ['swamp', '독안개 늪지', '맹독에 주의', 7, 0x687746],
  ['volcanic', '용암 심장부', '화염룡의 둥지', 10, 0xc54a30], ['abyss', '끝없는 심연', '마족의 전초기지', 14, 0x59437f],
  ['desert', '태양이 잠든 사막', '모래 아래의 포식자', 20, 0xc99548], ['storm', '뇌명의 고원', '번개를 먹는 마수', 30, 0x586e9e],
  ['undead', '망자의 공동묘지', '죽지 못한 군단', 45, 0x66766f], ['crystal', '수정 미궁', '반사되는 마력', 60, 0x6e62b5],
  ['demonic', '마계 균열', '악마 군단의 침공', 80, 0x70273f], ['celestial', '별빛 성역', '타락한 천상의 수호자', 105, 0xc9b66a],
  ['forest', '세계수의 뿌리', '고대 정령의 시험', 135, 0x397d45], ['frozen', '영겁빙하', '시간마저 얼어붙은 땅', 170, 0x64b6dc],
  ['blood', '붉은 왕의 전장', '피로 물든 정복자의 길', 210, 0x8f2635], ['swamp', '멸망의 독해', '숨 쉬는 늪의 심장', 255, 0x536936],
  ['volcanic', '태초 화산', '고룡이 깨어난 불바다', 305, 0xb93d26], ['storm', '폭풍신의 계단', '하늘을 찢는 천둥', 360, 0x4b6295],
  ['abyss', '공허의 회랑', '별을 삼킨 그림자', 420, 0x433268], ['undead', '영혼왕의 묘역', '망령 군주의 궁전', 485, 0x566961],
  ['crystal', '천공 수정궁', '차원을 비추는 보석', 555, 0x6255aa], ['demonic', '일곱 지옥문', '마왕들의 사냥터', 630, 0x612034],
  ['celestial', '신들의 폐허', '몰락한 신성의 잔향', 710, 0xbca653], ['desert', '시간의 모래바다', '천 년을 걷는 거신', 795, 0xb6813b],
  ['frozen', '절대영도의 왕좌', '빙하룡 황제의 영토', 885, 0x5ea9cd], ['blood', '종말의 붉은 달', '재앙이 내려앉은 전장', 950, 0x7f1f30],
  ['abyss', '세계의 끝', '최후의 마신이 기다리는 곳', 999, 0x33244f],
];

export const REGIONS = REGION_BLUEPRINTS.map(([biome, name, subtitle, minLevel, color], index) => ({
  id: index < 6 ? biome : `${biome}-${minLevel}`,
  biome, name, subtitle, minLevel, color,
  danger: Math.min(10, 1 + Math.floor(index / 3)),
  requiredPower: Math.round(150 + (minLevel - 1) * 28 + Math.floor(index / 3) * 110),
}));

export const NPCS = [
  { id: 'merchant', name: '상인 리아', role: '왕국 상인', persona: '눈치가 빠르고 실용적인 여성 상인. 친한 손님에게는 정이 많지만 무례한 손님에게는 값을 올린다.', color: 0xc18a45 },
  { id: 'guildmaster', name: '길드장 브란', role: '모험가 길드장', persona: '수많은 전장을 겪은 노련한 전사. 용기와 책임감을 중시하고 허풍을 싫어한다.', color: 0x9a4c3b },
  { id: 'innkeeper', name: '여관주인 미엘', role: '달빛 여관주인', persona: '소문에 밝고 따뜻한 성격. 모험가들의 고민을 잘 들어주며 장난기도 있다.', color: 0x6c8b62 },
  { id: 'blacksmith', name: '대장장이 토르간', role: '드워프 대장장이', persona: '말은 거칠지만 장비와 노력에 진심인 드워프. 성실한 모험가를 인정한다.', color: 0x7b5c50 },
];

export const COMPANIONS = [
  { id: 'kael', name: '카엘', className: '용병 전사', level: 2, cost: 350, hp: 100, attack: 15, defense: 11, color: 0xae5545, ability: '강철 베기' },
  { id: 'luna', name: '루나', className: '달빛 마법사', level: 3, cost: 550, hp: 72, attack: 21, defense: 6, color: 0x7766c8, ability: '달빛 화살' },
  { id: 'eris', name: '에리스', className: '숲의 궁수', level: 3, cost: 500, hp: 82, attack: 18, defense: 8, color: 0x4e9662, ability: '매의 사격' },
  { id: 'seraph', name: '세라프', className: '치유 사제', level: 4, cost: 800, hp: 90, attack: 13, defense: 10, color: 0xd0ad58, ability: '치유의 기도', heal: 18 },
  { id: 'nyx', name: '닉스', className: '그림자 암살자', level: 5, cost: 1100, hp: 76, attack: 25, defense: 7, color: 0x555e70, ability: '그림자 일격' },
  { id: 'brom', name: '브롬', className: '드워프 방패병', level: 6, cost: 1400, hp: 135, attack: 17, defense: 16, color: 0x8a6248, ability: '대지 분쇄' },
];

export function getClass(id) { return CLASSES.find((entry) => entry.id === id); }
export function getAdvancement(id) {
  return Object.values(ADVANCEMENTS).flat().find((entry) => entry.id === id);
}
export function advancementStageForLevel(level) {
  return ADVANCEMENT_STAGES.filter((entry) => level >= entry.level).at(-1)?.stage ?? 0;
}
export function getAdvancementOptions(classId, stage, pathId = null) {
  return (ADVANCEMENTS[classId] ?? []).filter((entry) => entry.stage === stage && (stage === 1 || entry.pathId === pathId));
}
export function getNpc(id) { return NPCS.find((entry) => entry.id === id); }
export function getCompanion(id) { return COMPANIONS.find((entry) => entry.id === id); }

export function xpForLevel(level) {
  const base = 80 + level * 45;
  if (level < 200) return base;
  return base + Math.floor(((level - 199) ** 2) * 0.5);
}

export function affinityPriceMultiplier(affinity = 0) {
  return Math.max(0.7, Math.min(1.3, 1 - affinity * 0.006));
}
