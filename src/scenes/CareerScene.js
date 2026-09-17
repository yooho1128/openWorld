import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { JOBS } from '../data/jobs.js';
import { STATS } from '../data/stats.js';
import { chooseJob } from '../state/character.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

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

    addFantasyBackdrop(this);
    addSceneTitle(this, '길드의 부름', '성인이 된 모험가는 자신의 길을 선택해야 합니다');

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
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:6px 0;color:${recommended ? '#8a4b13' : '#2b2017'};">
          <input type="radio" name="job-pick" value="${j.id}" />
          ${j.emoji} ${j.label} <span style="color:#755d40;font-size:11px;">(${hint}${recommended ? ' · 추천' : ''})</span>
        </label>
      `;
    }).join('');

    openPanel(`
      <div class="panel">
        <h2>운명의 길 선택</h2>
        <p style="font-size:12px;color:#60482f;">지금까지 쌓은 능력치: ${statLines}</p>
        <p style="font-size:12px;color:#60482f;">가장 뛰어난 재능: <strong>${topStatLabel}</strong></p>
        <div id="job-list">${jobOptions}</div>
        <div class="error" id="career-error"></div>
        <button id="career-submit">이 운명을 선택한다</button>
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
