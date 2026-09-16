// Each location is a building on the walkable town map. `minAge`/`maxAge`
// gate when it appears (school disappears once you're grown, adult-only
// job sites don't exist yet for a kid). `jobRequired`, when set, is a list
// of job ids — only characters who chose that job path can walk in, since
// wandering into a gang hideout or a hacker's den only makes sense once
// that's the life you're living. `riskTags`/`dangerLevel` feed the
// death/injury rolls in src/data/mortality.js.
export const LOCATIONS = [
  {
    id: 'home',
    name: '집',
    emoji: '🏠',
    color: 0xd8c3a5,
    npcName: '부모님',
    npcPersona: '당신은 플레이어의 다정한 부모님입니다. 편안한 반말로 안부를 묻고 소소한 잔소리와 응원을 섞어 말합니다.',
    statGains: { happiness: 6, stamina: 2 },
    dangerLevel: 0,
    events: [
      '갑자기 부모님이 진로에 대해 진지하게 물어보신다. 뭐라고 답할까?',
      '집안일을 도와달라는 부탁을 받았다. 어떻게 반응할까?',
    ],
  },
  {
    id: 'school',
    name: '학교',
    emoji: '🏫',
    color: 0xf5c518,
    npcName: '담임 선생님',
    npcPersona: '당신은 성실하고 다정한 담임 선생님입니다. 존댓말로 학생을 대합니다.',
    statGains: { intelligence: 7 },
    dangerLevel: 0,
    minAge: 7,
    maxAge: 18,
    events: [
      '갑자기 어려운 문제를 풀어보라고 칠판 앞으로 불려나갔다. 어떻게 할까?',
      '친구와 다툼이 생겨서 선생님이 중재하러 왔다. 뭐라고 설명할까?',
    ],
  },
  {
    id: 'gym',
    name: '헬스장',
    emoji: '💪',
    color: 0xe08a2b,
    npcName: '트레이너',
    npcPersona: '당신은 열정 넘치는 헬스 트레이너입니다. 텐션 높은 반말로 운동을 독려합니다.',
    statGains: { stamina: 7 },
    dangerLevel: 0,
    minAge: 10,
    events: [
      '트레이너가 평소보다 훨씬 힘든 운동을 제안한다. 어떻게 할까?',
      '운동 중 다른 회원과 시비가 붙을 뻔했다. 어떻게 넘길까?',
    ],
  },
  {
    id: 'languageAcademy',
    name: '어학원',
    emoji: '🗣️',
    color: 0x5f83b9,
    npcName: '어학원 선생님',
    npcPersona: '당신은 친절하고 또박또박 말하는 외국어 학원 선생님입니다. 존댓말로 학습을 도와줍니다.',
    statGains: { language: 7 },
    dangerLevel: 0,
    minAge: 7,
    events: [
      '수업 중 갑자기 외국인 손님 앞에서 통역을 부탁받았다. 어떻게 할까?',
      '어려운 발표 과제가 주어졌다. 어떻게 준비할까?',
    ],
  },
  {
    id: 'restaurant',
    name: '식당',
    emoji: '🍜',
    color: 0x9a6a3d,
    npcName: '식당 사장님',
    npcPersona: '당신은 정 많고 걸걸한 동네 식당 사장님입니다. 반말로 손님을 살갑게 챙깁니다.',
    statGains: { happiness: 4, stamina: 3 },
    dangerLevel: 0,
    cost: 5000,
    minAge: 10,
    events: [
      '사장님이 오늘 신메뉴를 시식해달라고 한다. 뭐라고 반응할까?',
      '옆자리 손님이 시비를 건다. 어떻게 대처할까?',
    ],
  },
  {
    id: 'company',
    name: '회사',
    emoji: '🏢',
    color: 0x6c7a89,
    npcName: '박 팀장',
    npcPersona: '당신은 무뚝뚝하지만 속으론 챙겨주는 회사 팀장입니다. 존댓말 반, 반말 반 섞어서 업무 이야기를 합니다.',
    statGains: { money: 1, charm: 2 },
    dangerLevel: 1,
    riskTags: ['whitecollar'],
    minAge: 19,
    jobRequired: ['scholar', 'diplomat', 'civilServant', 'entertainer', 'entrepreneur'],
    events: [
      '중요한 회의에서 갑자기 의견을 말해보라는 지목을 받았다. 뭐라고 할까?',
      '동료와 의견 충돌이 생겼다. 어떻게 대처할까?',
    ],
  },
  {
    id: 'factory',
    name: '공장',
    emoji: '🏭',
    color: 0x8a8a8a,
    npcName: '공장장',
    npcPersona: '당신은 거칠지만 책임감 있는 공장장입니다. 짧고 투박한 반말로 안전과 작업을 챙깁니다.',
    statGains: { stamina: 4, money: 2 },
    dangerLevel: 2,
    riskTags: ['industrial', 'physical'],
    minAge: 19,
    jobRequired: ['factoryWorker'],
    events: [
      '기계 라인에 문제가 생겨서 급하게 처리해야 한다. 어떻게 대응할까?',
      '안전 수칙을 생략하고 빨리 끝내라는 압박을 받는다. 어떻게 할까?',
    ],
  },
  {
    id: 'hackerDen',
    name: '해커의 방',
    emoji: '💻',
    color: 0x2ecc71,
    npcName: '정체불명의 브로커',
    npcPersona: '당신은 다크웹에서 일감을 중개하는 정체불명의 브로커입니다. 짧고 은어 섞인 반말로 거래를 제안합니다.',
    statGains: { intelligence: 5, money: 3 },
    dangerLevel: 2,
    riskTags: ['digital', 'criminal'],
    minAge: 19,
    jobRequired: ['hacker'],
    events: [
      '의뢰받은 작업이 생각보다 훨씬 위험한 표적이라는 걸 알게 됐다. 계속할까?',
      '갑자기 접속 로그에 추적 흔적이 보인다. 어떻게 할까?',
    ],
  },
  {
    id: 'spyField',
    name: '스파이 현장',
    emoji: '🕵️',
    color: 0x34495e,
    npcName: '접선책',
    npcPersona: '당신은 정보를 주고받는 접선책입니다. 낮고 신중한 존댓말로 위장 임무를 지시합니다.',
    statGains: { intelligence: 3, charm: 3, money: 3 },
    dangerLevel: 3,
    riskTags: ['espionage', 'criminal'],
    minAge: 19,
    jobRequired: ['industrialSpy'],
    events: [
      '경쟁사 내부 인물이 당신의 정체를 의심하는 눈치다. 어떻게 넘길까?',
      '넘겨받은 자료가 예상보다 훨씬 민감한 정보다. 어떻게 처리할까?',
    ],
  },
  {
    id: 'gangHideout',
    name: '조직 아지트',
    emoji: '🥊',
    color: 0x7f2020,
    npcName: '형님',
    npcPersona: '당신은 조직의 중간 보스 "형님"입니다. 거칠고 위압적인 반말을 씁니다.',
    statGains: { stamina: 4, charm: 2, money: 3 },
    dangerLevel: 3,
    riskTags: ['violence', 'criminal'],
    minAge: 19,
    jobRequired: ['gangster'],
    events: [
      '다른 조직과 구역 문제로 시비가 붙었다. 어떻게 처리할까?',
      '형님이 위험한 심부름을 시킨다. 어떻게 대응할까?',
    ],
  },
  {
    id: 'convenienceStore',
    name: '편의점',
    emoji: '🏪',
    color: 0x3498db,
    npcName: '점장님',
    npcPersona: '당신은 야간 편의점 점장입니다. 피곤하지만 친절한 존댓말을 씁니다.',
    statGains: { stamina: 2, money: 2 },
    dangerLevel: 1,
    riskTags: ['labor'],
    minAge: 16,
    jobRequired: ['partTimer'],
    events: [
      '진상 손님이 새벽에 소란을 피운다. 어떻게 대처할까?',
      '갑자기 동료가 펑크를 내서 혼자 마감을 해야 한다. 어떻게 할까?',
    ],
  },
  {
    id: 'parentCafe',
    name: '부모찬스 카페',
    emoji: '☕',
    color: 0xb5854a,
    npcName: '단골 손님',
    npcPersona: '당신은 이 카페의 단골 손님입니다. 편안한 반말로 사장(플레이어)에게 이런저런 말을 건넵니다.',
    statGains: { charm: 4, money: 2 },
    dangerLevel: 0,
    minAge: 19,
    jobRequired: ['parentFundedBusiness'],
    events: [
      '부모님이 갑자기 매장에 방문해 운영에 대해 한마디 하신다. 어떻게 반응할까?',
      'SNS에 카페가 "부모 찬스"라는 댓글이 달려 화제가 됐다. 어떻게 대응할까?',
    ],
  },
];

export function getLocation(id) {
  return LOCATIONS.find((l) => l.id === id);
}

export function availableLocations(character) {
  const age = character.age;
  return LOCATIONS.filter((loc) => {
    if (loc.minAge !== undefined && age < loc.minAge) return false;
    if (loc.maxAge !== undefined && age > loc.maxAge) return false;
    if (loc.jobRequired && !loc.jobRequired.includes(character.job)) return false;
    return true;
  });
}
