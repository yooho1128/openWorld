export const EQUIPMENT = [
  {
    id: 'lanyard',
    name: '사원증 목걸이',
    emoji: '💳',
    desc: '목숨 +1',
    cost: 60,
    effect: { extraLives: 1 },
  },
  {
    id: 'sneakers',
    name: '편한 운동화',
    emoji: '👟',
    desc: '레인 이동이 훨씬 빨라짐',
    cost: 90,
    effect: { laneSpeedMult: 2.2 },
  },
  {
    id: 'tumbler',
    name: '커피 텀블러',
    emoji: '☕',
    desc: '획득 커피 +50%',
    cost: 70,
    effect: { coffeeMult: 1.5 },
  },
  {
    id: 'umbrella',
    name: '접이식 우산',
    emoji: '☂️',
    desc: '출근 시작 시 무적 시간 대폭 연장',
    cost: 80,
    effect: { startInvulnBonusMs: 2500 },
  },
  {
    id: 'earbuds',
    name: '노이즈캔슬링 이어폰',
    emoji: '🎧',
    desc: '커피 자동 흡수 범위 크게 증가',
    cost: 130,
    effect: { magnet: true },
  },
  {
    id: 'kneepads',
    name: '무릎 보호대',
    emoji: '🦵',
    desc: '점프/숙이기 판정 타이밍이 더 널널해짐',
    cost: 90,
    effect: { actionInvulnBonusMs: 180 },
  },
  {
    id: 'springshoes',
    name: '스프링 구두',
    emoji: '🥾',
    desc: '런당 1회, 점프/숙이기를 놓쳐도 자동으로 회피',
    cost: 160,
    effect: { autoSave: 1 },
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
      actionInvulnBonusMs: acc.actionInvulnBonusMs + (item.effect.actionInvulnBonusMs ?? 0),
      autoSave: acc.autoSave + (item.effect.autoSave ?? 0),
      magnet: acc.magnet || Boolean(item.effect.magnet),
    }),
    { extraLives: 0, laneSpeedMult: 1, coffeeMult: 1, startInvulnBonusMs: 0, actionInvulnBonusMs: 0, autoSave: 0, magnet: false },
  );
}
