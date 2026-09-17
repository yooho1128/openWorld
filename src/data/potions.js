export const POTIONS = [
  { id: 'potion-hp-small', name: '소형 회복 물약', kind: 'hp', tier: 1, heal: 60, healPercent: 0, price: 90 },
  { id: 'potion-hp-medium', name: '중형 회복 물약', kind: 'hp', tier: 2, heal: 160, healPercent: 0.08, price: 280 },
  { id: 'potion-hp-large', name: '대형 회복 물약', kind: 'hp', tier: 3, heal: 380, healPercent: 0.18, price: 700 },
  { id: 'potion-hp-superior', name: '최상급 회복 물약', kind: 'hp', tier: 4, heal: 0, healPercent: 1, price: 1900 },
  { id: 'potion-mp-small', name: '마나 물약', kind: 'mp', tier: 1, heal: 35, healPercent: 0, price: 120 },
  { id: 'potion-mp-large', name: '상급 마나 물약', kind: 'mp', tier: 2, heal: 100, healPercent: 0.22, price: 420 },
  { id: 'potion-elixir', name: '만능 엘릭서', kind: 'both', tier: 5, heal: 0, healPercent: 1, price: 3600 },
];

export const DEFAULT_POTION_ID = 'potion-hp-small';

export function getPotion(id) {
  return POTIONS.find((potion) => potion.id === id);
}

// HP/MP 회복량은 고정치 + 최대치 비율로 계산해서, 저레벨에서도 쓸만하고
// 고레벨이 되어도 도태되지 않게 한다. kind가 hp/mp가 아니면 해당 값은 0.
export function potionHealValues(potion, stats) {
  const pct = potion.healPercent ?? 0;
  const hpHeal = potion.kind === 'hp' || potion.kind === 'both' ? Math.round((potion.heal ?? 0) + (stats?.maxHp ?? 0) * pct) : 0;
  const mpHeal = potion.kind === 'mp' || potion.kind === 'both' ? Math.round((potion.heal ?? 0) + (stats?.maxMp ?? 0) * pct) : 0;
  return { hpHeal, mpHeal };
}

export function potionDescription(potion) {
  const parts = [];
  if (potion.kind === 'hp' || potion.kind === 'both') {
    parts.push(potion.healPercent >= 1 ? 'HP 100% 회복' : `HP ${potion.heal}${potion.healPercent ? ` + 최대 HP ${Math.round(potion.healPercent * 100)}%` : ''} 회복`);
  }
  if (potion.kind === 'mp' || potion.kind === 'both') {
    parts.push(potion.healPercent >= 1 ? 'MP 100% 회복' : `MP ${potion.heal}${potion.healPercent ? ` + 최대 MP ${Math.round(potion.healPercent * 100)}%` : ''} 회복`);
  }
  return parts.join(' · ');
}
