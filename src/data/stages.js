export const STAGES = [
  { id: 1, name: '1스테이지 · 인턴', goalDistance: 800, baseSpeed: 220, speedRamp: 4, maxSpeed: 420, obstacleGapPx: 340 },
  { id: 2, name: '2스테이지 · 대리', goalDistance: 1400, baseSpeed: 250, speedRamp: 5, maxSpeed: 480, obstacleGapPx: 310 },
  { id: 3, name: '3스테이지 · 과장', goalDistance: 2200, baseSpeed: 280, speedRamp: 6, maxSpeed: 540, obstacleGapPx: 280 },
  { id: 4, name: '4스테이지 · 부장', goalDistance: 3200, baseSpeed: 310, speedRamp: 7, maxSpeed: 600, obstacleGapPx: 250 },
];

export function isStageUnlocked(save, stageId) {
  if (stageId === STAGES[0].id) return true;
  const prev = STAGES.find((s, i) => STAGES[i + 1]?.id === stageId);
  return prev ? save.clearedStages.includes(prev.id) : false;
}
