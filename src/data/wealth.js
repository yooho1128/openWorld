// Parents' wealth, rolled once at character creation. Middle class is by far
// the most likely outcome; both extremes are rare — poor a bit more common
// than filthy rich, matching how real income distributions skew.
export const WEALTH_TIERS = [
  { id: 'poor', label: '빈민층', weight: 8, startMoney: 200000 },
  { id: 'workingClass', label: '서민층', weight: 27, startMoney: 800000 },
  { id: 'middle', label: '중산층', weight: 45, startMoney: 2000000 },
  { id: 'upperMiddle', label: '부유층', weight: 16, startMoney: 8000000 },
  { id: 'conglomerate', label: '재벌급', weight: 4, startMoney: 50000000 },
];

export function rollWealthTier() {
  const total = WEALTH_TIERS.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const tier of WEALTH_TIERS) {
    if (roll < tier.weight) return tier;
    roll -= tier.weight;
  }
  return WEALTH_TIERS[WEALTH_TIERS.length - 1];
}

export function getWealthTier(id) {
  return WEALTH_TIERS.find((t) => t.id === id) ?? WEALTH_TIERS[2];
}
