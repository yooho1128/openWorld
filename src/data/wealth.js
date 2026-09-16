// Parents' wealth, rolled once at character creation. Middle-of-the-road
// tiers are by far the most likely outcome; both extremes are rare — poor
// a bit more common than filthy rich, matching how real income distributions
// skew. `housing` is the home the character is born into (shown in the birth
// intro and on the town map's home building) and doubles as a quick visual
// cue for the wealth tier during play.
export const WEALTH_TIERS = [
  { id: 'poor', label: '빈민', housing: '원룸', weight: 8, startMoney: 200000 },
  { id: 'workingClass', label: '중하', housing: '빌라', weight: 27, startMoney: 800000 },
  { id: 'middle', label: '중상', housing: '아파트', weight: 45, startMoney: 2000000 },
  { id: 'upperMiddle', label: '상', housing: '고급 아파트', weight: 16, startMoney: 8000000 },
  { id: 'conglomerate', label: '재벌', housing: '대저택', weight: 4, startMoney: 50000000 },
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
