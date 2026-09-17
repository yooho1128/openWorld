import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { WEALTH_TIERS } from '../data/wealth.js';
import { createCharacter } from '../state/character.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

// Hidden dev-only override: entering this key sequence on the creation
// screen reveals a manual "부모님 재산" select so the developer can force a
// wealth tier instead of taking the weighted roll everyone else gets.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export class CreateScene extends Phaser.Scene {
  constructor() {
    super('Create');
  }

  init(data) {
    this.nickname = data?.nickname ?? '';
    this.konamiProgress = 0;
  }

  create() {
    addFantasyBackdrop(this);
    addSceneTitle(this, '새로운 모험가', '운명의 두루마리에 이름을 새기세요');

    openPanel(`
      <div class="panel">
        <h2>모험가의 서약</h2>
        <label for="char-name">모험가 이름</label>
        <input id="char-name" type="text" maxlength="10" placeholder="이름을 입력하세요" autocomplete="off" />

        <label for="char-gender">성별</label>
        <select id="char-gender">
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
        <p style="font-size:12px;color:#6b5134;">성장하며 능력을 쌓은 뒤, 성인이 되면 당신만의 길을 선택합니다.</p>

        <div id="wealth-override-field" style="display:none;">
          <label for="wealth-override">부모님 재산 (직접 지정)</label>
          <select id="wealth-override">
            <option value="">-- 랜덤 --</option>
            ${WEALTH_TIERS.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}
          </select>
        </div>

        <div class="error" id="create-error"></div>
        <button id="create-submit">전설 시작하기</button>
      </div>
    `);

    this._keydownHandler = (e) => this.handleKonamiKey(e);
    document.addEventListener('keydown', this._keydownHandler);
    this.events.once('shutdown', () => document.removeEventListener('keydown', this._keydownHandler));

    qs('create-submit').addEventListener('click', () => this.handleSubmit());
    qs('char-name').focus();
  }

  handleKonamiKey(e) {
    const expected = KONAMI[this.konamiProgress];
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === expected) {
      this.konamiProgress += 1;
      if (this.konamiProgress === KONAMI.length) {
        this.konamiProgress = 0;
        const field = qs('wealth-override-field');
        if (field) field.style.display = 'block';
      }
    } else {
      this.konamiProgress = key === KONAMI[0] ? 1 : 0;
    }
  }

  async handleSubmit() {
    const name = qs('char-name').value.trim();
    const gender = qs('char-gender').value;
    const wealthOverrideId = qs('wealth-override')?.value || undefined;
    const errorEl = qs('create-error');

    if (!name) {
      errorEl.textContent = '이름을 입력해주세요.';
      return;
    }

    const character = createCharacter({ nickname: this.nickname, name, gender, wealthOverrideId });
    this.registry.set('nickname', this.nickname);
    this.registry.set('character', character);

    fetch('/api/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: this.nickname, character }),
    }).catch(() => {});

    closePanel();
    this.scene.start('Birth');
  }
}
