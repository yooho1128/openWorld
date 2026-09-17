import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';
import { createMasterCharacter, ensureRpgCharacter, saveCharacter } from '../state/rpgCharacter.js';

const MASTER_ACCOUNTS = {
  '마스터_전사': 'warrior', '마스터_마법사': 'mage', '마스터_궁수': 'ranger', '마스터_성직자': 'cleric', '마스터_도적': 'rogue',
};

export class LoginScene extends Phaser.Scene {
  constructor() { super('Login'); }

  create() {
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '에버글렌 사냥단', '몬스터를 사냥하고 동료와 전설을 만드세요');
    this.add.sprite(240, 235, 'player').setScale(2.4);
    this.add.sprite(140, 280, 'monster-blood-orc').setScale(1.35);
    this.add.sprite(340, 275, 'monster-volcanic-dragon').setScale(1.35);
    this.render();
  }

  render() {
    openPanel(`
      <div class="panel">
        <h2>모험가 길드 출입증</h2>
        <label for="nickname">계정 별명</label>
        <input id="nickname" maxlength="20" placeholder="예: 은빛사냥꾼" autocomplete="off" />
        <div class="error" id="login-error"></div>
        <button id="login-submit">길드 입장</button>
      </div>
    `);
    qs('login-submit').addEventListener('click', () => this.submit());
    qs('nickname').addEventListener('keydown', (event) => { if (event.key === 'Enter') this.submit(); });
    qs('nickname').focus();
  }

  async submit() {
    const nickname = qs('nickname').value.trim();
    if (!nickname) { qs('login-error').textContent = '별명을 입력해주세요.'; return; }
    if (MASTER_ACCOUNTS[nickname]) {
      const character = createMasterCharacter(nickname, MASTER_ACCOUNTS[nickname]);
      this.registry.set('nickname', nickname);
      this.registry.set('character', character);
      saveCharacter(this);
      closePanel();
      this.scene.start('Town');
      return;
    }
    qs('login-error').textContent = '길드 기록을 찾는 중...';
    try {
      const response = await fetch(`/api/character?nickname=${encodeURIComponent(nickname)}`);
      if (response.ok) {
        const { character } = await response.json();
        if (character?.version === 'rpg-1') {
          this.registry.set('nickname', nickname);
          this.registry.set('character', ensureRpgCharacter(character));
          closePanel();
          this.scene.start(character.classId ? 'Town' : 'ClassSelect');
          return;
        }
      }
    } catch { /* local preview or unavailable storage starts a new hero */ }
    closePanel();
    this.scene.start('Create', { nickname });
  }
}
