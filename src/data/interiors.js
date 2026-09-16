import { getLifeStage } from '../state/character.js';

// Locations with an entry here get a walkable indoor room (see
// scenes/IndoorScene.js) instead of the plain chat modal every other
// location uses. Each interior lists the props in its room, an age-gated
// chore list (required chores get you scolded if skipped, optional ones get
// you praised if you bother), and a pool of random flavor moments rolled on
// the way out — either a flat array, or split by life stage (child/teen/
// adult) for interiors like home that span a much wider age range.
export const INTERIORS = {
  home: {
    floorTint: 0xffffff,
    objects: [
      { id: 'bed', name: '침대', x: 80, y: 180, tint: 0xdd6688 },
      { id: 'desk', name: '책상', x: 240, y: 180, tint: 0x6a8a5a },
      { id: 'sink', name: '세면대', x: 400, y: 180, tint: 0x66aadd },
      { id: 'table', name: '식탁', x: 80, y: 340, tint: 0x9a6a3d },
      { id: 'parent', isNpc: true, x: 240, y: 340, tint: 0xffd27a, texture: 'player' },
      { id: 'trash', name: '쓰레기통', x: 400, y: 340, tint: 0x777777 },
    ],
    tasks: [
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
    ],
    flavor: {
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
    },
  },

  school: {
    floorTint: 0xdfe6e9,
    objects: [
      { id: 'desk', name: '내 자리', x: 80, y: 180, tint: 0x8899aa },
      { id: 'blackboard', name: '칠판', x: 240, y: 180, tint: 0x2d5a3d },
      { id: 'playground', name: '운동장', x: 400, y: 180, tint: 0x6fbf5a },
      { id: 'teacher', isNpc: true, x: 240, y: 340, tint: 0x555577, texture: 'player' },
    ],
    tasks: [
      {
        id: 'attendClass',
        object: 'desk',
        label: '수업 듣기',
        required: true,
        doneMessage: '수업에 집중해서 열심히 들었다.',
        doneDelta: { intelligence: 3 },
        missMessage: '선생님: "수업 시간에 대체 뭘 하는 거니?!"',
        missDelta: { intelligence: -3, happiness: -2 },
      },
      {
        id: 'presentation',
        object: 'blackboard',
        label: '발표하기 (선택)',
        required: false,
        doneMessage: '칠판 앞에 나가 발표했다. 친구들의 박수를 받았다!',
        doneDelta: { charm: 3, happiness: 2 },
      },
      {
        id: 'playWithFriends',
        object: 'playground',
        label: '친구들과 놀기 (선택)',
        required: false,
        doneMessage: '쉬는 시간에 친구들과 신나게 놀았다.',
        doneDelta: { happiness: 3, stamina: 1 },
      },
    ],
    flavor: {
      child: [
        { text: '짝꿍이랑 준비물을 나눠 썼다.', delta: { happiness: 2 }, type: 'praise' },
        { text: '수업 중에 졸다가 선생님한테 들켰다.', delta: { happiness: -2, intelligence: -1 }, type: 'scold' },
        { text: '쪽지시험을 잘 봐서 칭찬받았다.', delta: { intelligence: 2, happiness: 1 }, type: 'praise' },
      ],
      teen: [
        { text: '친구와 사소한 일로 다퉜다.', delta: { happiness: -3 }, type: 'scold' },
        { text: '모의고사 성적이 많이 올랐다.', delta: { intelligence: 3, happiness: 2 }, type: 'praise' },
        { text: '수행평가 과제를 깜빡해서 혼났다.', delta: { happiness: -3, intelligence: -1 }, type: 'scold' },
      ],
    },
  },

  company: {
    floorTint: 0x9aa7c7,
    objects: [
      { id: 'deskWork', name: '내 자리', x: 80, y: 180, tint: 0x6b7a99 },
      { id: 'meetingRoom', name: '회의실', x: 240, y: 180, tint: 0x2e8b8b },
      { id: 'breakRoom', name: '휴게실', x: 400, y: 180, tint: 0x9a6a3d },
      { id: 'boss', isNpc: true, x: 240, y: 340, tint: 0x445566, texture: 'player' },
    ],
    tasks: [
      {
        id: 'handleWork',
        object: 'deskWork',
        label: '업무 처리하기',
        required: true,
        doneMessage: '맡은 업무를 깔끔하게 처리했다.',
        doneDelta: { intelligence: 2, happiness: 1 },
        missMessage: '팀장: "보고서는 대체 언제 주는 거야?!"',
        missDelta: { happiness: -4, charm: -2 },
      },
      {
        id: 'joinMeeting',
        object: 'meetingRoom',
        label: '회의 참여하기 (선택)',
        required: false,
        doneMessage: '회의에서 적극적으로 의견을 냈다.',
        doneDelta: { charm: 3, intelligence: 1 },
      },
      {
        id: 'takeBreak',
        object: 'breakRoom',
        label: '휴식하기 (선택)',
        required: false,
        doneMessage: '잠깐 커피 한 잔 하며 숨을 돌렸다.',
        doneDelta: { happiness: 3, stamina: 1 },
      },
    ],
    flavor: [
      { text: '동료의 실수를 대신 덮어줘서 고마워했다.', delta: { charm: 2, happiness: 1 }, type: 'praise' },
      { text: '갑작스러운 야근을 하게 됐다.', delta: { happiness: -4, stamina: -2 }, type: 'scold' },
      { text: '팀장님께 성과를 인정받아 칭찬을 들었다.', delta: { happiness: 3, charm: 1 }, type: 'praise' },
      { text: '회식 자리에서 과음을 했다.', delta: { health: -3, happiness: -1 }, type: 'scold' },
    ],
  },
};

export function getInterior(locationId) {
  return INTERIORS[locationId];
}

export function activeTasks(tasks, age) {
  return tasks.filter((t) => {
    if (t.minAge !== undefined && age < t.minAge) return false;
    if (t.maxAge !== undefined && age > t.maxAge) return false;
    return true;
  });
}

export function rollRandomFlavor(flavor, age) {
  const pool = Array.isArray(flavor) ? flavor : flavor[getLifeStage(age)] ?? [];
  if (!pool.length || Math.random() >= 0.5) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
