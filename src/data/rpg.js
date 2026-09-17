export const CLASSES = [
  { id: 'warrior', name: '수호 전사', icon: '⚔', color: 0xb95d46, hp: 145, mp: 35, attack: 18, defense: 13, skill: '방패 강타', skillPower: 1.7, description: '높은 체력과 방어력으로 전선을 지킨다.' },
  { id: 'mage', name: '원소 마도사', icon: '✦', color: 0x745fc7, hp: 92, mp: 90, attack: 24, defense: 7, skill: '별불꽃', skillPower: 2.25, description: '강력한 마법으로 한 번에 큰 피해를 준다.' },
  { id: 'ranger', name: '황야 추적자', icon: '➶', color: 0x4f9860, hp: 112, mp: 55, attack: 21, defense: 9, skill: '삼연사', skillPower: 1.95, description: '빠르고 안정적인 원거리 공격에 능하다.' },
  { id: 'cleric', name: '새벽 성직자', icon: '✚', color: 0xd0aa55, hp: 120, mp: 75, attack: 15, defense: 11, skill: '성스러운 빛', skillPower: 1.55, heal: 30, description: '회복과 성광으로 오래 싸울 수 있다.' },
  { id: 'rogue', name: '그림자 도적', icon: '◆', color: 0x4f596b, hp: 104, mp: 50, attack: 23, defense: 8, skill: '급소 찌르기', skillPower: 2.1, description: '치명타와 전리품 획득에 유리하다.' },
];

export const REGIONS = [
  { id: 'forest', name: '속삭이는 숲', subtitle: '초보 사냥터', minLevel: 1, danger: 1, color: 0x4c8b4b },
  { id: 'frozen', name: '서리왕의 설원', subtitle: '빙결 몬스터 출몰', minLevel: 3, danger: 2, color: 0x79b9d9 },
  { id: 'blood', name: '피의 협곡', subtitle: '광폭한 오크 부족', minLevel: 5, danger: 3, color: 0xa63843 },
  { id: 'swamp', name: '독안개 늪지', subtitle: '맹독에 주의', minLevel: 7, danger: 4, color: 0x687746 },
  { id: 'volcanic', name: '용암 심장부', subtitle: '화염룡의 둥지', minLevel: 10, danger: 5, color: 0xc54a30 },
  { id: 'abyss', name: '끝없는 심연', subtitle: '마족의 왕좌', minLevel: 14, danger: 6, color: 0x59437f },
];

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
export function getNpc(id) { return NPCS.find((entry) => entry.id === id); }
export function getCompanion(id) { return COMPANIONS.find((entry) => entry.id === id); }

export function xpForLevel(level) { return 80 + level * 45; }

export function affinityPriceMultiplier(affinity = 0) {
  return Math.max(0.7, Math.min(1.3, 1 - affinity * 0.006));
}
