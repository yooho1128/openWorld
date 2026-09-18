import Phaser from 'phaser';
import { ENHANCEMENT_BLESSINGS } from '../data/equipment.js';
import { ensureRpgCharacter, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const QUESTIONS = [
  { id: 'math-1', question: '별 조각 7개씩 든 주머니가 6개라면 모두 몇 개인가?', choices: ['36개', '40개', '42개', '48개'], answer: 2 },
  { id: 'math-2', question: '마력 80의 절반에 15를 더하면?', choices: ['45', '50', '55', '60'], answer: 2 },
  { id: 'math-3', question: '강화석 54개를 6명이 똑같이 나누면 한 명당 몇 개인가?', choices: ['7개', '8개', '9개', '10개'], answer: 2 },
  { id: 'math-4', question: '120에서 35를 두 번 빼면 얼마인가?', choices: ['40', '45', '50', '55'], answer: 2 },
  { id: 'game-1', question: '장비의 공격력을 직접 올려주는 대표 장비 부위는?', choices: ['무기', '신발', '갑옷', '투구'], answer: 0 },
  { id: 'game-2', question: '전투력이 높아지면 무엇이 가능해지는가?', choices: ['레벨 감소', '상위 사냥터 입장', '직업 삭제', '골드 초기화'], answer: 1 },
  { id: 'game-3', question: '체력을 회복할 때 사용하는 것은?', choices: ['강화석', '반지', 'HP 물약', '전직 증표'], answer: 2 },
  { id: 'game-4', question: '신화 장비보다 낮은 등급은?', choices: ['전설', '초월', '우주', '영원'], answer: 0 },
  { id: 'lore-1', question: '밤하늘에서 방향을 찾는 데 오래전부터 쓰인 별은?', choices: ['북극성', '샛별', '시리우스', '태양'], answer: 0 },
  { id: 'lore-2', question: '달이 태양을 가리는 현상은?', choices: ['월식', '일식', '유성우', '오로라'], answer: 1 },
  { id: 'lore-3', question: '별똥별의 다른 이름은?', choices: ['혜성', '행성', '유성', '위성'], answer: 2 },
  { id: 'lore-4', question: '태양계에서 가장 큰 행성은?', choices: ['지구', '화성', '토성', '목성'], answer: 3 },
];

function kstDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function hashText(value) {
  let hash = 0;
  for (const char of value) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return hash;
}

function dailyState(character) {
  const date = kstDate();
  if (character.astrologerDaily?.date !== date) character.astrologerDaily = { date, answered: 0, correct: 0 };
  character.astrologerDaily.answered = Math.max(0, Math.min(3, Number(character.astrologerDaily.answered) || 0));
  character.astrologerDaily.correct = Math.max(0, Math.min(3, Number(character.astrologerDaily.correct) || 0));
  return character.astrologerDaily;
}

export class AstrologerScene extends Phaser.Scene {
  constructor() { super('Astrologer'); }

  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true, accent: 0x9570c5 });
    addSceneTitle(this, '점성술사 셀레네', '정답마다 +10~30% 축복을 무작위로 받아 원하는 강화에 사용하세요');
    const orbit = this.add.circle(240, 232, 82, 0x392651, 0.72).setStrokeStyle(2, 0xc99aff, 0.8);
    this.add.circle(240, 232, 48, 0x6f4b92, 0.82).setStrokeStyle(2, 0xffe9a6, 0.65);
    this.add.text(240, 232, '✦', { fontSize: '58px', color: '#ffe59a', shadow: { color: '#b066ff', blur: 16, fill: true } }).setOrigin(0.5);
    this.tweens.add({ targets: orbit, angle: 360, duration: 6500, repeat: -1 });
    this.render();
  }

  questionFor(state) {
    const seed = `${state.date}:${this.character.nickname}:${state.answered}`;
    return QUESTIONS[hashText(seed) % QUESTIONS.length];
  }

  render(message = '', messageClass = '') {
    const state = dailyState(this.character);
    const finished = state.answered >= 3;
    const question = !finished ? this.questionFor(state) : null;
    const stars = [0, 1, 2].map((index) => `<span class="${index < state.answered ? 'done' : ''}">${index < state.answered ? '✦' : index + 1}</span>`).join('');
    const answers = question?.choices.map((choice, index) => `<button id="star-answer-${index}">${choice}</button>`).join('') ?? '';
    const guidance = finished ? '오늘의 별자리 시련을 모두 마쳤습니다. 내일 다시 찾아오세요.' : question.question;
    const inventory = Object.entries(ENHANCEMENT_BLESSINGS).map(([key, blessing]) => `<span>${blessing.symbol} ${blessing.name} +${blessing.bonus}% <strong>${this.character.enhancementBlessings?.[key] ?? 0}개</strong></span>`).join('');
    openPanel(`
      <div class="panel astrologer-panel">
        <h2>별자리 지혜의 시련</h2>
        <div class="blessing-inventory">${inventory}</div>
        <div class="star-progress">${stars}</div>
        ${message ? `<p class="forge-message ${messageClass}">${message}</p>` : ''}
        <div class="star-oracle">${guidance}</div>
        ${question ? `<div class="star-answers">${answers}</div>` : ''}
        <button id="star-forge">대장간으로 이동</button>
        <button id="star-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    question?.choices.forEach((_, index) => qs(`star-answer-${index}`)?.addEventListener('click', () => this.answer(question, index)));
    qs('star-forge').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Blacksmith'); });
    qs('star-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  answer(question, selected) {
    const state = dailyState(this.character);
    if (state.answered >= 3) return this.render();
    state.answered += 1;
    const correct = selected === question.answer;
    if (correct) {
      state.correct += 1;
      const keys = Object.keys(ENHANCEMENT_BLESSINGS);
      const rewardKey = keys[Math.floor(Math.random() * keys.length)];
      this.character.enhancementBlessings[rewardKey] += 1;
      const reward = ENHANCEMENT_BLESSINGS[rewardKey];
      saveCharacter(this);
      return this.render(`정답입니다! ${reward.symbol} ${reward.name}(성공률 +${reward.bonus}%)을 획득했습니다.`, 'success');
    }
    saveCharacter(this);
    this.render(`오답입니다. 정답은 「${question.choices[question.answer]}」입니다.`, 'fail');
  }
}
