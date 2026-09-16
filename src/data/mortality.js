// Death and injury are real mechanics, not scripted story beats: every year
// lived past childhood carries some chance of a realistic accident or health
// event, weighted by age, the danger of the character's job/location, and
// mitigated by their health/stamina stats. Causes are drawn from a pool so
// no two playthroughs end (or get hurt) the same way.
export const DEATH_CAUSES = [
  { id: 'traffic_accident', label: '교통사고', tags: null, weight: 5 },
  { id: 'industrial_accident', label: '산업재해', tags: ['industrial'], weight: 7 },
  { id: 'overwork_collapse', label: '과로로 인한 급성 심장마비', tags: ['whitecollar'], weight: 3, minAge: 30 },
  { id: 'gang_conflict', label: '조직 간 충돌', tags: ['violence', 'criminal'], weight: 6 },
  { id: 'police_crackdown', label: '단속 중 발생한 사고', tags: ['digital', 'criminal'], weight: 4 },
  { id: 'espionage_backfire', label: '스파이 활동이 발각되며 벌어진 사고', tags: ['espionage'], weight: 5 },
  { id: 'sudden_illness', label: '갑작스러운 지병 악화', tags: null, weight: 4 },
  { id: 'home_accident', label: '안전사고', tags: null, weight: 2 },
  { id: 'old_age', label: '노환', tags: null, weight: 20, minAge: 78 },
];

export const INJURY_CAUSES = [
  { id: 'traffic_injury', label: '교통사고 부상', tags: null, weight: 5, statPenalty: { stamina: -15, health: -15 } },
  { id: 'industrial_injury', label: '산업재해 부상', tags: ['industrial', 'physical'], weight: 7, statPenalty: { stamina: -20, health: -10 } },
  { id: 'assault_injury', label: '폭행 사건에 휘말려 부상', tags: ['violence', 'criminal'], weight: 6, statPenalty: { health: -15, happiness: -10 } },
  { id: 'burnout', label: '번아웃', tags: ['whitecollar'], weight: 4, statPenalty: { happiness: -20, health: -10 } },
  { id: 'crackdown_injury', label: '단속 중 부상', tags: ['digital', 'criminal'], weight: 4, statPenalty: { health: -10, happiness: -15 } },
];

function ageRiskFactor(age) {
  if (age < 13) return 0;
  if (age < 19) return 0.002;
  if (age < 40) return 0.01;
  if (age < 60) return 0.02;
  if (age < 75) return 0.05;
  return 0.12;
}

function pickWeighted(pool, tags, age) {
  const eligible = pool.filter((c) => {
    if (c.minAge && age < c.minAge) return false;
    if (!c.tags) return true;
    return c.tags.some((t) => tags.includes(t));
  });
  const usable = eligible.length ? eligible : pool.filter((c) => !c.tags);
  const total = usable.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * total;
  for (const c of usable) {
    if (roll < c.weight) return c;
    roll -= c.weight;
  }
  return usable[usable.length - 1];
}

// Rolls whether this year of life ends in death, injury, or nothing.
// `job` and `location` may be null (e.g. before a job path is chosen).
export function rollLifeOutcome({ age, stats, job, location }) {
  if (age < 13) return null;

  const tags = [...(job?.riskTags ?? []), ...(location?.riskTags ?? [])];
  const jobDanger = (job?.dangerLevel ?? 0) * 0.01;
  const locationDanger = (location?.dangerLevel ?? 0) * 0.015;
  const mitigation = ((stats.health + stats.stamina) / 200) * 0.5;

  const baseChance = (ageRiskFactor(age) + jobDanger + locationDanger) * (1 - mitigation);
  const deathChance = Math.min(baseChance, 0.35);
  const injuryChance = Math.min(baseChance * 3, 0.45);

  const roll = Math.random();
  if (roll < deathChance) {
    return { type: 'death', cause: pickWeighted(DEATH_CAUSES, tags, age) };
  }
  if (roll < deathChance + injuryChance) {
    return { type: 'injury', cause: pickWeighted(INJURY_CAUSES, tags, age) };
  }
  return null;
}
