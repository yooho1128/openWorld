import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { getJobInfo } from '../state/character.js';
import { STATS } from '../data/stats.js';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) {
      this.scene.start('Login');
      return;
    }

    this.add.tileSprite(0, 0, 480, 800, 'ground').setOrigin(0, 0);
    this.add.text(240, 120, '🕊️', { fontSize: '40px' }).setOrigin(0.5);
    this.add.text(240, 180, `${this.character.name}의 생애`, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    this.job = getJobInfo(this.character);
    this.dreamAchieved = this.character.stats[this.job.primaryStat] !== undefined
      && this.character.stats[this.job.primaryStat] >= 70;

    this.renderPanel('<p><em>저승에서 생애를 심판하는 중...</em></p>');
    this.fetchJudgment();
  }

  renderPanel(judgmentHtml) {
    const c = this.character;
    const statRows = Object.entries(c.stats)
      .map(([key, value]) => `<div>${STATS[key]?.label ?? key}: ${value}</div>`)
      .join('');
    const historyRows = c.history.slice(-8).map((line) => `<div>${line}</div>`).join('');

    openPanel(`
      <div class="panel">
        <h2>${c.name} (${c.age}세)</h2>
        <p>사인: ${c.deathCause?.label ?? '알 수 없음'}</p>
        <p>장래희망 "${this.job.label}"의 꿈은 ${this.dreamAchieved ? '이루어졌다.' : '끝내 이루지 못했다.'}</p>
        <p><strong>최종 스탯</strong></p>
        ${statRows}
        <p><strong>최근 발자취</strong></p>
        ${historyRows || '<div>...</div>'}
        <p><strong>생애 심판</strong></p>
        ${judgmentHtml}
        <button id="ending-restart">새로운 인생 시작하기</button>
      </div>
    `);

    qs('ending-restart').addEventListener('click', () => {
      this.registry.remove('character');
      this.registry.remove('nickname');
      closePanel();
      this.scene.start('Login');
    });
  }

  characterSummary() {
    const c = this.character;
    return `이름 ${c.name}, ${c.gender === 'male' ? '남성' : '여성'}, ${c.age}세에 사망, 직업 ${this.job.label}, 재산 ${c.money.toLocaleString()}원`;
  }

  async fetchJudgment() {
    try {
      const res = await fetch('/api/epilogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterSummary: this.characterSummary(),
          history: this.character.history,
          deathCause: this.character.deathCause?.label ?? '알 수 없음',
          dreamJob: this.job.label,
          dreamAchieved: this.dreamAchieved,
        }),
      });
      const judgment = await res.json();
      if (!judgment.epilogue) throw new Error('no epilogue');
      this.renderPanel(`
        <p>${judgment.epilogue}</p>
        <p><strong>판결: ${judgment.verdict}</strong> — ${judgment.reason ?? ''}</p>
      `);
    } catch {
      this.renderPanel('<p><em>(저승과 연결할 수 없어 심판을 내리지 못했다...)</em></p>');
    }
  }
}
