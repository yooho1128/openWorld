import Phaser from 'phaser';
import { MONSTERS } from '../data/monsters.js';

const RANK_POWER = { F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 8 };

// Shared encounter roller so selecting a region and choosing "continue hunting"
// always use the same monster, boss, and reinforcement rules.
export function rollHuntEncounter(region) {
  const maxPower = region.minLevel < 5 ? 3 : region.minLevel < 20 ? 4 : region.minLevel < 60 ? 5 : region.minLevel < 150 ? 6 : 8;
  const pool = MONSTERS.filter((monster) => monster.biome === region.biome && RANK_POWER[monster.rank] <= maxPower);
  const fallbackPool = MONSTERS.filter((monster) => monster.biome === region.biome);
  const candidates = pool.length ? pool : fallbackPool;
  const eventRoll = Math.random();
  const bossChance = 0.04 + region.danger * 0.005;
  const eventType = eventRoll < bossChance ? 'boss' : eventRoll < bossChance + 0.12 ? 'reinforcement' : 'normal';
  const sorted = [...candidates].sort((a, b) => RANK_POWER[b.rank] - RANK_POWER[a.rank]);
  const monster = eventType === 'boss'
    ? sorted[Phaser.Math.Between(0, Math.min(3, sorted.length - 1))]
    : candidates[Phaser.Math.Between(0, candidates.length - 1)];
  const reinforcement = candidates.filter((entry) => entry.id !== monster.id);
  const reinforcementId = eventType === 'reinforcement'
    ? reinforcement[Phaser.Math.Between(0, reinforcement.length - 1)]?.id ?? monster.id
    : null;
  return { regionId: region.id, monsterId: monster.id, eventType, reinforcementId };
}
