export const EQUIPMENT = [
  {
    id: 'lanyard',
    name: '사원증 목걸이',
    emoji: '💳',
    desc: '목숨 +1',
    cost: 50,
    effect: { extraLives: 1 },
  },
  {
    id: 'sneakers',
    name: '편한 운동화',
    emoji: '👟',
    desc: '레인 이동이 더 빨라짐',
    cost: 80,
    effect: { laneSpeedMult: 1.6 },
  },
  {
    id: 'tumbler',
    name: '커피 텀블러',
    emoji: '☕',
    desc: '획득 커피 +20%',
    cost: 60,
    effect: { coffeeMult: 1.2 },
  },
  {
    id: 'umbrella',
    name: '접이식 우산',
    emoji: '☂️',
    desc: '출근 시작 시 무적 시간 연장',
    cost: 70,
    effect: { startInvulnBonusMs: 1500 },
  },
  {
    id: 'earbuds',
    name: '노이즈캔슬링 이어폰',
    emoji: '🎧',
    desc: '커피 자동 흡수 범위 증가',
    cost: 120,
    effect: { magnet: true },
  },
];

export function getEquipmentEffects(save) {
  const owned = EQUIPMENT.filter((item) => save.owned.includes(item.id));
  return owned.reduce(
    (acc, item) => ({
      extraLives: acc.extraLives + (item.effect.extraLives ?? 0),
      laneSpeedMult: Math.max(acc.laneSpeedMult, item.effect.laneSpeedMult ?? 1),
      coffeeMult: acc.coffeeMult * (item.effect.coffeeMult ?? 1),
      startInvulnBonusMs: acc.startInvulnBonusMs + (item.effect.startInvulnBonusMs ?? 0),
      magnet: acc.magnet || Boolean(item.effect.magnet),
    }),
    { extraLives: 0, laneSpeedMult: 1, coffeeMult: 1, startInvulnBonusMs: 0, magnet: false },
  );
}
