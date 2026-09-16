import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { JOBS } from '../data/jobs.js';
import { STATS } from '../data/stats.js';
import { chooseJob } from '../state/character.js';

// Fires once, when a character turns 19 with no job chosen yet: school years
// are spent stat-building first, and only now does the player pick a path,
// informed by whichever stats they actually grew.
export class CareerScene extends Phaser.Scene {
  constructor() {
    super('Career');
  }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) {
      this.scene.start('Login');
      return;
    }

    this.add.tileSprite(0, 0, 480, 800, 'ground').setOrigin(0, 0);
    this.add.text(240, 100, '성인이 되었다', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    const c = this.character;
    const topStatKey = Object.entries(c.stats).sort((a, b) => b[1] - a[1])[0][0];
    const topStatLabel = STATS[topStatKey]?.label ?? topStatKey;

    const statLines = Object.entries(c.stats)
      .map(([k, v]) => `${STATS[k]?.label ?? k} ${v}`)
      .join(' · ');

    const jobOptions = JOBS.map((j) => {
      const recommended = j.primaryStat === topStatKey;
      const hint = STATS[j.primaryStat]?.label ?? j.primaryStat;
      return `
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:6px 0;color:${recommended ? '#ffe066' : '#f0f0f5'};">
          <input type="radio" name="job-pick" value="${j.id}" />
          ${j.emoji} ${j.label} <span style="color:#999;font-size:11px;">(${hint}${recommended ? ' · 추천' : ''})</span>
        </label>
      `;
    }).join('');

    openPanel(`
      <div class="panel">
        <h2>진로를 정하자</h2>
        <p style="font-size:12px;color:#ccc;">학창시절을 보내며 쌓은 능력치: ${statLines}</p>
        <p style="font-size:12px;color:#ccc;">가장 뛰어난 능력: <strong>${topStatLabel}</strong></p>
        <div id="job-list">${jobOptions}</div>
        <div class="error" id="career-error"></div>
        <button id="career-submit">이 길을 가겠다</button>
      </div>
    `);

    qs('career-submit').addEventListener('click', () => this.handleSubmit());
  }

  handleSubmit() {
    const picked = document.querySelector('input[name="job-pick"]:checked');
    const errorEl = qs('career-error');
    if (!picked) {
      errorEl.textContent = '진로를 하나 선택해주세요.';
      return;
    }

    chooseJob(this.character, picked.value);
    this.persist();
    closePanel();
    this.scene.start('Town');
  }

  persist() {
    const nickname = this.registry.get('nickname');
    if (!nickname) return;
    fetch('/api/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, character: this.character }),
    }).catch(() => {});
  }
}
