import Phaser from 'phaser';
import { ensureRpgCharacter, saveCharacter, claimMail, claimAllMail } from '../state/rpgCharacter.js';
import { equipmentDisplayName, getRarity } from '../data/equipment.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

function attachLabel(entry) {
  if (entry.gachaEquipment) return '무작위 장비 1개';
  if (entry.item) return `${entry.item.name}${entry.item.quantity > 1 ? ` x${entry.item.quantity}` : ''}`;
  if (entry.gold) return `골드 ${entry.gold.toLocaleString()}`;
  return '-';
}

export class MailboxScene extends Phaser.Scene {
  constructor() { super('Mailbox'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    saveCharacter(this);
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '우편함', '받은 편지의 첨부물을 수령하면 즉시 가방으로 들어갑니다');
    this.render();
  }

  render(message = '') {
    const mail = this.character.mailbox;
    const rows = mail.length
      ? mail.map((entry) => `
        <div class="mail-row">
          <div class="mail-copy"><strong>${entry.title}</strong><small>${entry.body}</small><small class="mail-attach">첨부: ${attachLabel(entry)}</small></div>
          <button id="claim-${entry.id}">수령</button>
        </div>`).join('')
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

  describeResult(result) {
    const parts = [];
    if (result.gold) parts.push(`골드 ${result.gold.toLocaleString()}`);
    if (result.item) parts.push(`${getRarity(result.item.rarity).name} 「${equipmentDisplayName(result.item)}」`);
    return parts.length ? `${parts.join(' · ')} 획득!` : '수령했습니다.';
  }

  claimOne(mailId) {
    const result = claimMail(this.character, mailId);
    if (!result) return;
    saveCharacter(this);
    this.render(this.describeResult(result));
  }

  claimAll() {
    const results = claimAllMail(this.character);
    if (!results.length) return;
    saveCharacter(this);
    const goldTotal = results.reduce((sum, r) => sum + (r.gold || 0), 0);
    const itemCount = results.filter((r) => r.item).length;
    const parts = [];
    if (goldTotal) parts.push(`골드 ${goldTotal.toLocaleString()}`);
    if (itemCount) parts.push(`장비 ${itemCount}개`);
    this.render(`편지 ${results.length}통을 모두 수령했습니다 (${parts.join(' · ') || '내용 없음'}).`);
  }
}
