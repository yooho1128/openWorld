import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';
import { createRpgCharacter } from '../state/rpgCharacter.js';

export class CreateScene extends Phaser.Scene {
  constructor() { super('Create'); }
  init(data) { this.nickname = data?.nickname ?? ''; }

  create() {
    addFantasyBackdrop(this);
    addSceneTitle(this, '새로운 사냥꾼', '왕국 길드에 모험가를 등록합니다');
    openPanel(`
      <div class="panel">
        <h2>모험가 등록</h2>
        <label for="char-name">이름</label>
        <input id="char-name" maxlength="12" placeholder="모험가 이름" autocomplete="off" />
        <label for="char-gender">성별</label>
        <select id="char-gender"><option value="male">남성</option><option value="female">여성</option></select>
        <p style="font-size:12px;color:#60482f;">다음 단계에서 전투 직업을 선택합니다.</p>
        <div class="error" id="create-error"></div>
        <button id="create-submit">직업 선택으로</button>
      </div>
    `);
    qs('create-submit').addEventListener('click', () => this.submit());
    qs('char-name').focus();
  }

  submit() {
    const name = qs('char-name').value.trim();
    if (!name) { qs('create-error').textContent = '이름을 입력해주세요.'; return; }
    const character = createRpgCharacter({ nickname: this.nickname, name, gender: qs('char-gender').value });
    this.registry.set('nickname', this.nickname);
    this.registry.set('character', character);
    closePanel();
    this.scene.start('ClassSelect');
  }
}
