// Home isn't just "wash your hands or get yelled at" — it's a handful of
// small chores that shift as the character grows up, each one either
// required (skip it and get scolded) or optional (do it anyway and get
// praised), plus a pool of pure-flavor random moments per life stage so two
// visits at the same age don't always play out the same way.
export const HOME_TASKS = [
  {
    id: 'handwash',
    object: 'sink',
    label: '손 씻기',
    required: true,
    doneMessage: '손을 깨끗이 씻었다! 상쾌하다.',
    doneDelta: { happiness: 2 },
    missMessage: '엄마: "손도 안 씻고 그냥 가니?!"',
    missDelta: { happiness: -5 },
  },
  {
    id: 'homework',
    object: 'desk',
    label: '숙제하기',
    required: true,
    minAge: 7,
    maxAge: 18,
    doneMessage: '책상에 앉아 오늘 숙제를 끝냈다.',
    doneDelta: { intelligence: 3 },
    missMessage: '엄마: "숙제도 안 하고 어디를 가!"',
    missDelta: { happiness: -4, intelligence: -2 },
  },
  {
    id: 'tidyRoom',
    object: 'bed',
    label: '방 정리하기 (선택)',
    required: false,
    doneMessage: '이불을 정리하고 방을 깔끔하게 치웠다.',
    doneDelta: { happiness: 3 },
  },
  {
    id: 'dinner',
    object: 'table',
    label: '가족과 저녁 먹기 (선택)',
    required: false,
    doneMessage: '가족과 함께 저녁을 먹으며 오늘 있었던 일을 이야기했다.',
    doneDelta: { happiness: 4 },
  },
  {
    id: 'takeOutTrash',
    object: 'trash',
    label: '쓰레기 버리기 (선택)',
    required: false,
    minAge: 13,
    doneMessage: '쓰레기를 내다 버렸다. 부모님이 기특해하신다.',
    doneDelta: { happiness: 2 },
  },
  {
    id: 'checkIn',
    object: 'parent',
    label: '부모님과 이야기하기',
    required: true,
    minAge: 19,
    doneMessage: '부모님과 이런저런 이야기를 나눴다.',
    doneDelta: { happiness: 1 },
    missMessage: '엄마: "다 커서는 얼굴 보기도 힘드네..."',
    missDelta: { happiness: -3 },
  },
];

export function activeHomeTasks(age) {
  return HOME_TASKS.filter((t) => {
    if (t.minAge !== undefined && age < t.minAge) return false;
    if (t.maxAge !== undefined && age > t.maxAge) return false;
    return true;
  });
}

// Pure-flavor moments with no associated object — just texture that varies
// by life stage, independent of whatever chores were done this visit.
export const RANDOM_FLAVOR = {
  child: [
    { text: '동생이랑 장난감 때문에 다퉜다.', delta: { happiness: -2 }, type: 'scold' },
    { text: '그림을 그렸는데 엄마가 냉장고에 붙여주셨다!', delta: { happiness: 3 }, type: 'praise' },
    { text: '만화책을 재밌게 봤다.', delta: { happiness: 2 }, type: 'praise' },
  ],
  teen: [
    { text: '통금 시간을 어겨서 크게 혼났다.', delta: { happiness: -6 }, type: 'scold' },
    { text: '휴대폰을 너무 오래 봐서 잔소리를 들었다.', delta: { happiness: -3 }, type: 'scold' },
    { text: '시험 성적이 올라서 부모님이 칭찬해주셨다.', delta: { happiness: 3, intelligence: 1 }, type: 'praise' },
  ],
  adult: [
    { text: '부모님께 용돈을 드렸더니 정말 좋아하셨다.', delta: { happiness: 4, money: -50000 }, type: 'praise' },
    { text: '밀린 집안일을 도와드려서 칭찬받았다.', delta: { happiness: 3 }, type: 'praise' },
    { text: '본가에 너무 소홀했다고 서운해하셨다.', delta: { happiness: -3 }, type: 'scold' },
  ],
};

export function rollRandomFlavor(stage) {
  const pool = RANDOM_FLAVOR[stage] ?? RANDOM_FLAVOR.adult;
  if (Math.random() >= 0.5) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
