import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { applyStatDeltas } from '../state/character.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const TICKET_COST = 5000;
const JACKPOT = 200000;

export class LotteryScene extends Phaser.Scene {
  constructor() {
    super('Lottery');
  }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) {
      this.scene.start('Town');
      return;
    }

    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '운명의 수정구', '별빛이 선택한 숫자를 맞혀 보세요');
    this.add.circle(240, 285, 98, 0x8d62cf, 0.16);
    this.add.circle(240, 285, 68, 0x9d7fe3, 0.35).setStrokeStyle(3, 0xf1d790, 0.8);
    this.add.circle(220, 263, 20, 0xffffff, 0.17);
    this.add.text(240, 285, '?', { fontFamily: 'Georgia, serif', fontSize: '64px', color: '#f7e8b7' }).setOrigin(0.5);
    this.add.sprite(240, 380, 'goblin').setScale(1.2);

    this.renderPanel();
  }

  renderPanel(resultHtml = '') {
    const options = Array.from({ length: 10 }, (_, i) => i + 1)
      .map((n) => `<option value="${n}">${n}</option>`)
      .join('');

    openPanel(`
      <div class="panel">
        <h2>예언 한 번 (${TICKET_COST.toLocaleString()}원)</h2>
        <p>수정구가 택할 1부터 10까지의 숫자를 맞히면 ${JACKPOT.toLocaleString()}원을 얻습니다.</p>
        <label for="lotto-number">운명의 숫자</label>
        <select id="lotto-number">${options}</select>
        <div class="error" id="lotto-error"></div>
        ${resultHtml}
        <button id="lotto-buy">수정구에 묻기</button>
        <button id="lotto-back" class="secondary">돌아가기</button>
      </div>
    `);

    qs('lotto-buy').addEventListener('click', () => this.handleBuy());
    qs('lotto-back').addEventListener('click', () => {
      this.persist();
      closePanel();
      this.scene.start('Town');
    });
  }

  handleBuy() {
    const errorEl = qs('lotto-error');
    if (this.character.money < TICKET_COST) {
      errorEl.textContent = '돈이 부족하다.';
      return;
    }
    const picked = Number(qs('lotto-number').value);
    const drawn = Phaser.Math.Between(1, 10);
    this.character.money -= TICKET_COST;

    let resultHtml;
    if (picked === drawn) {
      this.character.money += JACKPOT;
      applyStatDeltas(this.character, { happiness: 15 });
      this.character.history.push(`${this.character.age}세 - 복권 1등 당첨! (${JACKPOT.toLocaleString()}원)`);
      resultHtml = `<p>당첨 번호: ${drawn}. 축하합니다! ${JACKPOT.toLocaleString()}원에 당첨됐다!</p>`;
    } else {
      applyStatDeltas(this.character, { happiness: -2 });
      resultHtml = `<p>당첨 번호: ${drawn}. 꽝... 다음 기회에.</p>`;
    }

    this.persist();
    this.renderPanel(resultHtml);
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
