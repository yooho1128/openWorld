const KEY = 'openworld_save_v1';

const DEFAULT_SAVE = {
  coffee: 0,
  owned: [],
  clearedStages: [],
  bestDistance: {},
  attempts: {},
  playerName: '',
  infiniteBest: 0,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    return { ...structuredClone(DEFAULT_SAVE), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSave(save) {
  localStorage.setItem(KEY, JSON.stringify(save));
}
