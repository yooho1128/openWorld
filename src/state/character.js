import { createBaseStats, clampStat } from '../data/stats.js';
import { rollWealthTier, getWealthTier } from '../data/wealth.js';
import { getJob } from '../data/jobs.js';

export function getLifeStage(age) {
  if (age < 7) return 'infant';
  if (age < 13) return 'child';
  if (age < 19) return 'teen';
  return 'adult';
}

// wealthOverrideId is the hidden easter-egg hook (see CreateScene's Konami
// listener) — normal play always leaves it undefined and gets the weighted roll.
// job/dream start out null: the character picks a path at the end of school
// (see CareerScene), not at birth.
export function createCharacter({ nickname, name, gender, wealthOverrideId }) {
  const tier = wealthOverrideId ? getWealthTier(wealthOverrideId) : rollWealthTier();
  return {
    nickname,
    name,
    gender,
    job: null,
    dream: null,
    wealthTier: tier.id,
    money: tier.startMoney,
    age: 0,
    turn: 0,
    stats: createBaseStats(),
    alive: true,
    deathCause: null,
    injuries: [],
    history: [],
    createdAt: Date.now(),
  };
}

export function applyStatDeltas(character, deltas = {}) {
  for (const [key, delta] of Object.entries(deltas)) {
    if (key === 'money') {
      character.money = Math.max(0, Math.round(character.money + delta));
    } else if (key in character.stats) {
      character.stats[key] = clampStat(character.stats[key] + delta);
    }
  }
}

export function visitLocation(character, location) {
  if (location.cost) {
    if (character.money < location.cost) return { ok: false, reason: 'not_enough_money' };
    character.money -= location.cost;
  }
  applyStatDeltas(character, location.statGains);
  character.history.push(`${character.age}세 - ${location.name}에서 시간을 보냈다.`);
  return { ok: true };
}

export function applyInjury(character, cause) {
  applyStatDeltas(character, cause.statPenalty);
  character.injuries.push({ age: character.age, id: cause.id, label: cause.label });
  character.history.push(`${character.age}세 - ${cause.label}으로 다쳤다.`);
}

export function applyDeath(character, cause) {
  character.alive = false;
  character.deathCause = { id: cause.id, label: cause.label };
  character.history.push(`${character.age}세 - ${cause.label}(으)로 세상을 떠났다.`);
}

export function advanceAge(character) {
  character.age += 1;
  character.turn += 1;
}

export function getJobInfo(character) {
  return character.job ? getJob(character.job) : null;
}

export function chooseJob(character, jobId) {
  character.job = jobId;
  character.dream = jobId;
  character.history.push(`${character.age}세 - 진로를 "${getJob(jobId)?.label ?? jobId}"(으)로 정했다.`);
}

// The one number the whole game is chasing: shown live on the town HUD and
// submitted to the global leaderboard on death.
export function computeLifeScore(character) {
  const statSum = Object.values(character.stats).reduce((sum, v) => sum + v, 0);
  return statSum + Math.floor(character.money / 10000);
}

const QUEST_STAT_KEYS = ['stamina', 'intelligence', 'language', 'charm', 'happiness', 'health'];
const QUEST_STEP = 8;
const QUEST_BONUS_MONEY = 30000;
const QUEST_BONUS_HAPPINESS = 5;

// A rotating short-term goal shown on the town HUD alongside the long-term
// dream stat, so there's always something small and concrete to chase
// between visits, not just the eventual "reach 70" dream check. Call this
// once per Town visit; it clears+rewards a finished quest and always leaves
// a fresh one queued up. Returns the just-completed quest, or null.
export function updateQuest(character) {
  let completed = null;
  if (character.quest) {
    const { statKey, target } = character.quest;
    if ((character.stats[statKey] ?? 0) >= target) {
      completed = character.quest;
      applyStatDeltas(character, { happiness: QUEST_BONUS_HAPPINESS, money: QUEST_BONUS_MONEY });
      character.history.push(`${character.age}세 - 목표 달성(${statKey} ${target})! 보너스를 받았다.`);
      character.quest = null;
    }
  }
  if (!character.quest) {
    const statKey = QUEST_STAT_KEYS[Math.floor(Math.random() * QUEST_STAT_KEYS.length)];
    const target = Math.min(100, (character.stats[statKey] ?? 0) + QUEST_STEP);
    character.quest = { statKey, target };
  }
  return completed;
}
