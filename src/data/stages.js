// obstacleTypes weights control which hazard kinds appear on a stage. Only
// 'ground' (dodge by switching lanes) is used in normal vertical play now —
// jump/duck live exclusively in the sidescroll event (see RunScene).
export const STAGES = [
  {
    id: 1,
    name: '1스테이지 · 인턴',
    goalDistance: 260,
    baseSpeed: 260,
    speedRamp: 6,
    maxSpeed: 480,
    obstacleGapPx: 260,
    floorTint: 0xffffff,
    sceneryTint: 0x8fa8bd,
    obstacleTypes: [{ type: 'ground', weight: 1 }],
  },
  {
    id: 2,
    name: '2스테이지 · 대리',
    goalDistance: 400,
    baseSpeed: 300,
    speedRamp: 7,
    maxSpeed: 540,
    obstacleGapPx: 230,
    floorTint: 0xcfe0ff,
    sceneryTint: 0x5f83b9,
    obstacleTypes: [{ type: 'ground', weight: 1 }],
  },
  {
    id: 3,
    name: '3스테이지 · 과장',
    goalDistance: 560,
    baseSpeed: 340,
    speedRamp: 8,
    maxSpeed: 600,
    obstacleGapPx: 200,
    floorTint: 0xffd6a8,
    sceneryTint: 0xd9793f,
    obstacleTypes: [{ type: 'ground', weight: 1 }],
  },
  {
    id: 4,
    name: '4스테이지 · 부장',
    goalDistance: 740,
    baseSpeed: 380,
    speedRamp: 9,
    maxSpeed: 660,
    obstacleGapPx: 175,
    floorTint: 0xf3e2a8,
    sceneryTint: 0xb0903c,
    obstacleTypes: [{ type: 'ground', weight: 1 }],
  },
];

// Endless mode: no goal distance, difficulty ramps forever (capped at
// maxSpeed so it stays playable), ends only when you run out of lives.
// This is the only mode the global leaderboard tracks.
export const INFINITE_MODE = {
  id: 'infinite',
  name: '무한모드',
  baseSpeed: 260,
  speedRamp: 5,
  maxSpeed: 820,
  obstacleGapPx: 240,
  floorTint: 0xd9d0ff,
  sceneryTint: 0x7a5fc9,
  obstacleTypes: [{ type: 'ground', weight: 1 }],
};

export function isStageUnlocked(save, stageId) {
  if (stageId === STAGES[0].id) return true;
  const prev = STAGES.find((s, i) => STAGES[i + 1]?.id === stageId);
  return prev ? save.clearedStages.includes(prev.id) : false;
}

export function pickObstacleType(stage) {
  const total = stage.obstacleTypes.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const t of stage.obstacleTypes) {
    if (roll < t.weight) return t.type;
    roll -= t.weight;
  }
  return stage.obstacleTypes[stage.obstacleTypes.length - 1].type;
}
