import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '에버글렌 연대기', '당신의 운명이 전설이 되는 곳');
    const hero = this.add.sprite(240, 238, 'player').setScale(2.4);
    this.tweens.add({ targets: hero, y: 230, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.sprite(145, 276, 'goblin').setScale(1.25).setAlpha(0.8);
    this.add.sprite(335, 282, 'slime').setScale(1.35).setAlpha(0.8);
    this.add.text(240, 330, '모험가의 이름으로 여정을 이어가거나\n새로운 운명을 시작하세요.', {
      fontSize: '13px', color: '#ddcfad', align: 'center', lineSpacing: 7,
    }).setOrigin(0.5);

    this.renderLoginForm();
  }

  renderLoginForm() {
    openPanel(`
      <div class="panel">
        <h2>모험가 등록</h2>
        <label for="nickname">모험가 별명</label>
        <input id="nickname" type="text" maxlength="20" placeholder="예: 은빛여우" autocomplete="off" />
        <div class="error" id="login-error"></div>
        <button id="login-submit">운명의 문 열기</button>
        <button id="login-leaderboard" class="secondary">영웅의 전당</button>
      </div>
    `);

    const submit = () => this.handleSubmit();
    qs('login-submit').addEventListener('click', submit);
    qs('login-leaderboard').addEventListener('click', () => this.showLeaderboard());
    qs('nickname').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    qs('nickname').focus();
  }

  async showLeaderboard() {
    openPanel(`
      <div class="panel">
        <h2>영웅의 전당</h2>
        <p><em>불러오는 중...</em></p>
      </div>
    `);

    let rowsHtml = '<p>기록을 불러올 수 없다.</p>';
    try {
      const res = await fetch('/api/leaderboard');
      const { entries } = await res.json();
      rowsHtml = entries.length
        ? entries
          .map((e, i) => `<div>${i + 1}. ${e.name} — ${e.score}점 (${e.age}세, ${e.job ?? '무직'}, ${e.deathCause ?? '?'})</div>`)
          .join('')
        : '<p>아직 아무도 기록을 남기지 않았다. 첫 번째 기록의 주인공이 되어보자!</p>';
    } catch {
      // keep default error text
    }

    openPanel(`
      <div class="panel">
        <h2>영웅의 전당</h2>
        ${rowsHtml}
        <button id="leaderboard-back">돌아가기</button>
      </div>
    `);
    qs('leaderboard-back').addEventListener('click', () => this.renderLoginForm());
  }

  async handleSubmit() {
    const nickname = qs('nickname').value.trim();
    const errorEl = qs('login-error');
    if (!nickname) {
      errorEl.textContent = '닉네임을 입력해주세요.';
      return;
    }

    errorEl.textContent = '불러오는 중...';
    try {
      const res = await fetch(`/api/character?nickname=${encodeURIComponent(nickname)}`);
      if (res.ok) {
        const { character } = await res.json();
        this.registry.set('nickname', nickname);
        this.registry.set('character', character);
        closePanel();
        this.scene.start('Town');
        return;
      }
      if (res.status === 404) {
        closePanel();
        this.scene.start('Create', { nickname });
        return;
      }
      errorEl.textContent = '저장소에 연결할 수 없어 새 캐릭터로 시작합니다.';
      setTimeout(() => {
        closePanel();
        this.scene.start('Create', { nickname });
      }, 900);
    } catch {
      errorEl.textContent = '저장소에 연결할 수 없어 새 캐릭터로 시작합니다.';
      setTimeout(() => {
        closePanel();
        this.scene.start('Create', { nickname });
      }, 900);
    }
  }
}
