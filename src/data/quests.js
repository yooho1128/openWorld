import { BIOME_LABELS } from './monsters.js';

// 매일 갱신되는 의뢰 풀. describe(target, biomeLabel)로 문구를 만들고,
// goldPerUnit/xpPerUnit * target으로 보상을 계산한다.
export const DAILY_QUEST_POOL = [
  { id: 'hunt', name: '사냥 의뢰', type: 'hunt', minTarget: 6, maxTarget: 16, goldPerUnit: 35, xpPerUnit: 18, describe: (t) => `아무 몬스터나 ${t}마리 사냥하기` },
  { id: 'biome', name: '지역 토벌', type: 'biome', minTarget: 3, maxTarget: 8, goldPerUnit: 55, xpPerUnit: 28, describe: (t, biomeLabel) => `${biomeLabel} 계열 몬스터 ${t}마리 사냥하기` },
  { id: 'gold', name: '수금 의뢰', type: 'gold', minTarget: 300, maxTarget: 1200, goldPerUnit: 0.35, xpPerUnit: 0.12, describe: (t) => `사냥으로 골드 ${t.toLocaleString()} 벌기` },
  { id: 'boss', name: '토벌 의뢰', type: 'boss', minTarget: 1, maxTarget: 1, goldPerUnit: 450, xpPerUnit: 260, describe: () => '우두머리 몬스터 1회 처치하기' },
];

export const BIOME_IDS = Object.keys(BIOME_LABELS);

// 영구 마일스톤(업적) 의뢰. 한 번 달성하면 그 즉시 청구할 수 있고, 청구 후에는 다시 등장하지 않는다.
export const MILESTONE_QUESTS = [
  { id: 'hunt-10', category: '사냥', stat: 'huntedTotal', target: 10, name: '초보 사냥꾼', title: '발자국을 읽는 자', rewardGold: 300, rewardXp: 150 },
  { id: 'hunt-50', category: '사냥', stat: 'huntedTotal', target: 50, name: '숙련 사냥꾼', title: '야수 추적자', rewardGold: 800, rewardXp: 400 },
  { id: 'hunt-200', category: '사냥', stat: 'huntedTotal', target: 200, name: '베테랑 사냥꾼', title: '백수의 천적', rewardGold: 2500, rewardXp: 1200 },
  { id: 'hunt-1000', category: '사냥', stat: 'huntedTotal', target: 1000, name: '전설의 사냥꾼', title: '천벌의 사냥꾼', rewardGold: 12000, rewardXp: 6000, rewardPotions: 5 },
  { id: 'win-10', category: '승리', stat: 'victories', target: 10, name: '떠오르는 용사', title: '새벽의 검', rewardGold: 300, rewardXp: 150 },
  { id: 'win-50', category: '승리', stat: 'victories', target: 50, name: '숙련된 용사', title: '승전의 기수', rewardGold: 900, rewardXp: 450 },
  { id: 'win-200', category: '승리', stat: 'victories', target: 200, name: '백전노장', title: '백전불굴', rewardGold: 3000, rewardXp: 1500 },
  { id: 'win-1000', category: '승리', stat: 'victories', target: 1000, name: '천 번의 승리', title: '무패의 전설', rewardGold: 15000, rewardXp: 7500 },
  { id: 'boss-1', category: '보스', stat: 'bossVictories', target: 1, name: '첫 우두머리 토벌', title: '거인의 도전자', rewardGold: 600, rewardXp: 300 },
  { id: 'boss-10', category: '보스', stat: 'bossVictories', target: 10, name: '우두머리 사냥꾼', title: '왕관 파괴자', rewardGold: 2500, rewardXp: 1200 },
  { id: 'boss-50', category: '보스', stat: 'bossVictories', target: 50, name: '재앙의 대적자', title: '재앙을 넘은 자', rewardGold: 9000, rewardXp: 4500 },
  { id: 'boss-200', category: '보스', stat: 'bossVictories', target: 200, name: '왕들의 종말', title: '왕을 사냥하는 왕', rewardGold: 30000, rewardXp: 15000 },
  { id: 'level-10', category: '레벨', stat: 'level', target: 10, name: '첫 전직', title: '새 길을 걷는 자', rewardGold: 500, rewardXp: 0 },
  { id: 'level-30', category: '레벨', stat: 'level', target: 30, name: '성장하는 모험가', title: '왕국의 유망주', rewardGold: 1500, rewardXp: 0 },
  { id: 'level-60', category: '레벨', stat: 'level', target: 60, name: '숙련된 모험가', title: '노련한 방랑자', rewardGold: 4000, rewardXp: 0 },
  { id: 'level-100', category: '레벨', stat: 'level', target: 100, name: '백의 경지', title: '백의 경지', rewardGold: 10000, rewardXp: 0, rewardPotions: 10 },
  { id: 'level-200', category: '레벨', stat: 'level', target: 200, name: '신화의 문턱', title: '신화에 닿은 자', rewardGold: 20000, rewardXp: 0 },
  { id: 'level-400', category: '레벨', stat: 'level', target: 400, name: '초월의 여정', title: '초월자', rewardGold: 40000, rewardXp: 0 },
  { id: 'level-700', category: '레벨', stat: 'level', target: 700, name: '별들의 동료', title: '성좌의 벗', rewardGold: 70000, rewardXp: 0 },
  { id: 'level-999', category: '레벨', stat: 'level', target: 999, name: '여정의 끝', title: '에버글렌의 전설', rewardGold: 99999, rewardXp: 0 },
  { id: 'power-500', category: '전투력', stat: 'combatPower', target: 500, name: '단단한 기반', title: '강철의 신예', rewardGold: 800, rewardXp: 300 },
  { id: 'power-2000', category: '전투력', stat: 'combatPower', target: 2000, name: '전장의 핵심', title: '전장의 중심', rewardGold: 3000, rewardXp: 1200 },
  { id: 'power-5000', category: '전투력', stat: 'combatPower', target: 5000, name: '왕국의 방패', title: '왕국의 방패', rewardGold: 8000, rewardXp: 3500 },
  { id: 'power-10000', category: '전투력', stat: 'combatPower', target: 10000, name: '초월한 힘', title: '만인의 대적자', rewardGold: 20000, rewardXp: 8000 },
  { id: 'power-20000', category: '전투력', stat: 'combatPower', target: 20000, name: '절대 강자', title: '천상천하', rewardGold: 50000, rewardXp: 20000 },
  { id: 'enhance-5', category: '강화', stat: 'highestEnhancement', target: 5, name: '빛나는 장비', title: '불꽃을 견딘 자', rewardGold: 1200, rewardXp: 500 },
  { id: 'enhance-10', category: '강화', stat: 'highestEnhancement', target: 10, name: '십강의 벽', title: '황금의 손', rewardGold: 5000, rewardXp: 2000 },
  { id: 'enhance-15', category: '강화', stat: 'highestEnhancement', target: 15, name: '별빛 강화', title: '별을 두드리는 자', rewardGold: 15000, rewardXp: 6000 },
  { id: 'enhance-20', category: '강화', stat: 'highestEnhancement', target: 20, name: '강화의 끝', title: '신의 대장장이', rewardGold: 50000, rewardXp: 20000 },
  { id: 'advance-1', category: '전직', stat: 'advancementCount', target: 1, name: '운명의 선택', title: '운명을 고른 자', rewardGold: 1000, rewardXp: 300 },
  { id: 'advance-3', category: '전직', stat: 'advancementCount', target: 3, name: '세 번째 각성', title: '세 번 깨어난 자', rewardGold: 8000, rewardXp: 2500 },
  { id: 'advance-5', category: '전직', stat: 'advancementCount', target: 5, name: '최후의 전직', title: '궁극의 계승자', rewardGold: 30000, rewardXp: 10000 },
  { id: 'attendance-1', category: '출석', stat: 'attendanceDays', target: 1, name: '왕국의 첫 서약', title: '약속을 지키는 자', rewardGold: 500, rewardXp: 200 },
  { id: 'attendance-7', category: '출석', stat: 'attendanceDays', target: 7, name: '칠일의 맹세', title: '칠일의 서약자', rewardGold: 7000, rewardXp: 3000 },
  { id: 'gold-10000', category: '재화', stat: 'goldEarnedTotal', target: 10000, name: '자산가', title: '금화를 세는 자', rewardGold: 0, rewardXp: 500 },
  { id: 'gold-100000', category: '재화', stat: 'goldEarnedTotal', target: 100000, name: '거상', title: '황금의 주인', rewardGold: 0, rewardXp: 3000, rewardPotions: 3 },
  { id: 'gold-1000000', category: '재화', stat: 'goldEarnedTotal', target: 1000000, name: '왕국의 금고', title: '백만장자', rewardGold: 0, rewardXp: 10000, rewardPotions: 10 },
];

export const SPECIAL_TITLES = [
  { id: 'lucky-lottery', name: '그 운이면 로또를 사라', category: '특별', bossChanceBonus: 0.02 },
];
export const TITLES = [...MILESTONE_QUESTS.map((quest) => ({ id: quest.id, name: quest.title, category: quest.category })), ...SPECIAL_TITLES];
export function getTitle(id) { return TITLES.find((title) => title.id === id) ?? null; }
