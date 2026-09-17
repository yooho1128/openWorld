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
  { id: 'hunt-10', stat: 'huntedTotal', target: 10, name: '초보 사냥꾼', rewardGold: 300, rewardXp: 150 },
  { id: 'hunt-50', stat: 'huntedTotal', target: 50, name: '숙련 사냥꾼', rewardGold: 800, rewardXp: 400 },
  { id: 'hunt-200', stat: 'huntedTotal', target: 200, name: '베테랑 사냥꾼', rewardGold: 2500, rewardXp: 1200 },
  { id: 'hunt-1000', stat: 'huntedTotal', target: 1000, name: '전설의 사냥꾼', rewardGold: 12000, rewardXp: 6000, rewardPotions: 5 },
  { id: 'win-10', stat: 'victories', target: 10, name: '떠오르는 용사', rewardGold: 300, rewardXp: 150 },
  { id: 'win-50', stat: 'victories', target: 50, name: '숙련된 용사', rewardGold: 900, rewardXp: 450 },
  { id: 'win-200', stat: 'victories', target: 200, name: '백전노장', rewardGold: 3000, rewardXp: 1500 },
  { id: 'level-10', stat: 'level', target: 10, name: '첫 전직', rewardGold: 500, rewardXp: 0 },
  { id: 'level-30', stat: 'level', target: 30, name: '성장하는 모험가', rewardGold: 1500, rewardXp: 0 },
  { id: 'level-60', stat: 'level', target: 60, name: '숙련된 모험가', rewardGold: 4000, rewardXp: 0 },
  { id: 'level-100', stat: 'level', target: 100, name: '전설의 모험가', rewardGold: 10000, rewardXp: 0, rewardPotions: 10 },
  { id: 'gold-10000', stat: 'goldEarnedTotal', target: 10000, name: '자산가', rewardGold: 0, rewardXp: 500 },
  { id: 'gold-100000', stat: 'goldEarnedTotal', target: 100000, name: '거상', rewardGold: 0, rewardXp: 3000, rewardPotions: 3 },
];
