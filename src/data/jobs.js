// 장래희망: chosen at creation. Drives which stat the player is nudged to
// grow, which adult-only locations unlock once the character turns 19, and
// how risky that life path is (dangerLevel + riskTags feed src/data/mortality.js).
// Deliberately mixes wholesome dream jobs with grittier, "잘 안 풀린 인생" style
// paths so the select box reflects a realistic range of outcomes, not just
// success stories.
export const JOBS = [
  { id: 'athlete', label: '운동선수', emoji: '🏃', primaryStat: 'stamina', dangerLevel: 1, riskTags: ['physical'] },
  { id: 'scholar', label: '학자', emoji: '📚', primaryStat: 'intelligence', dangerLevel: 0, riskTags: ['whitecollar'] },
  { id: 'diplomat', label: '외교관', emoji: '🌐', primaryStat: 'language', dangerLevel: 0, riskTags: ['whitecollar'] },
  { id: 'entertainer', label: '연예인', emoji: '🎤', primaryStat: 'charm', dangerLevel: 1, riskTags: ['public', 'whitecollar'] },
  { id: 'entrepreneur', label: '사업가', emoji: '💼', primaryStat: 'charm', secondaryStat: 'money', dangerLevel: 1, riskTags: ['whitecollar'] },
  { id: 'civilServant', label: '공무원', emoji: '🏛️', primaryStat: 'intelligence', dangerLevel: 0, riskTags: ['whitecollar'] },
  { id: 'factoryWorker', label: '공장 노동자', emoji: '🏭', primaryStat: 'stamina', dangerLevel: 2, riskTags: ['industrial', 'physical'] },
  { id: 'hacker', label: '해커', emoji: '💻', primaryStat: 'intelligence', dangerLevel: 2, riskTags: ['criminal', 'digital'] },
  { id: 'industrialSpy', label: '산업 스파이', emoji: '🕵️', primaryStat: 'charm', secondaryStat: 'intelligence', dangerLevel: 3, riskTags: ['criminal', 'espionage'] },
  { id: 'gangster', label: '깡패', emoji: '🥊', primaryStat: 'stamina', secondaryStat: 'charm', dangerLevel: 3, riskTags: ['criminal', 'violence'] },
  { id: 'partTimer', label: '알바생', emoji: '🛒', primaryStat: 'stamina', dangerLevel: 1, riskTags: ['labor'] },
  { id: 'unemployed', label: '백수', emoji: '🛋️', primaryStat: 'happiness', dangerLevel: 0, riskTags: [] },
  { id: 'parentFundedBusiness', label: '부모찬스 카페 사장', emoji: '☕', primaryStat: 'charm', secondaryStat: 'money', dangerLevel: 0, riskTags: ['whitecollar'] },
];

export function getJob(id) {
  return JOBS.find((j) => j.id === id) ?? JOBS[0];
}
