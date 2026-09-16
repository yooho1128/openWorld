// Growth stats tracked on every character. Money is tracked separately since
// it behaves like currency, not a 0-100 growth stat.
export const STAT_KEYS = ['stamina', 'intelligence', 'language', 'charm', 'happiness', 'health'];

export const STATS = {
  stamina: { label: '체력', emoji: '💪' },
  intelligence: { label: '지능', emoji: '📚' },
  language: { label: '언어능력', emoji: '🗣️' },
  charm: { label: '매력', emoji: '✨' },
  happiness: { label: '행복', emoji: '😊' },
  health: { label: '건강', emoji: '❤️' },
};

export function createBaseStats() {
  const stats = {};
  for (const key of STAT_KEYS) stats[key] = 30;
  return stats;
}

export function clampStat(value) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
