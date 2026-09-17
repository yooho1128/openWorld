import Phaser from 'phaser';
import { ensureRpgCharacter, saveCharacter, claimMail, claimAllMail } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class MailboxScene extends Phaser.Scene {
  constructor() { super('Mailbox'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    saveCharacter(this);
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '우편함', '받은 편지의 첨부물을 수령하면 가방으로 들어갑니다');
    this.render();
  }

  render(message = '') {
    const mail = this.character.mailbox;
    const rows = mail.length
      ? mail.map((entry) => {
          const attach = entry.gold
            ? `골드 ${entry.gold.toLocaleString()}`
            : `${entry.item.name}${entry.item.quantity > 1 ? ` x${entry.item.quantity}` : ''}`;
          return `
        <div class="mail-row">
          <div class="mail-copy"><strong>${entry.title}</strong><small>${entry.body}</small><small class="mail-attach">첨부: ${attach}</small></div>
          <button id="claim-${entry.id}">수령</button>
        </div>`;
        }).join('')
      : '<p class="empty-state">받은 편지가 없습니다.</p>';
    openPanel(`
      <div class="panel mail-panel">
        <h2>우편함</h2>
        <p class="gold-line">받은 편지 ${mail.length}통</p>
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <div class="mail-list">${rows}</div>
        ${mail.length ? '<button id="claim-all">전체 수령</button>' : ''}
        <button id="mail-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    mail.forEach((entry) => qs(`claim-${entry.id}`)?.addEventListener('click', () => this.claimOne(entry.id)));
    qs('claim-all')?.addEventListener('click', () => this.claimAll());
    qs('mail-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  claimOne(mailId) {
    if (!claimMail(this.character, mailId)) return;
    saveCharacter(this);
    this.render('첨부물을 가방으로 옮겼습니다.');
  }

  claimAll() {
    const count = claimAllMail(this.character);
    if (!count) return;
    saveCharacter(this);
    this.render(`편지 ${count}통을 모두 수령했습니다.`);
  }
}
