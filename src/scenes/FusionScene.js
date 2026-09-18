import Phaser from 'phaser';
import { equipmentDisplayName, fusionUpgradeChance, getRarity, getSlot, nextRarity, rollFusionEquipment } from '../data/equipment.js';
import { addLoot, ensureRpgCharacter, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class FusionScene extends Phaser.Scene {
  constructor() { super('Fusion'); }

  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    this.selectedIds = [];
    addFantasyBackdrop(this, { dark: true, accent: 0x9b68bd });
    addSceneTitle(this, '별빛 장비 합성소', '같은 등급 장비 2개를 합쳐 새로운 장비를 만듭니다');
    this.add.circle(240, 235, 76, 0x442754, 0.65).setStrokeStyle(3, 0xd49af0, 0.75);
    const core = this.add.text(240, 235, '◇ + ◇', { fontSize: '32px', fontStyle: 'bold', color: '#f5d8ff', shadow: { color: '#b35de3', blur: 14, fill: true } }).setOrigin(0.5);
    this.tweens.add({ targets: core, scale: 1.1, alpha: 0.75, duration: 900, yoyo: true, repeat: -1 });
    this.render();
  }

  selectedItems() {
    return this.selectedIds.map((id) => this.character.inventory.find((item) => item.id === id)).filter(Boolean);
  }

  render(message = '', messageClass = '') {
    const items = this.character.inventory.filter((item) => item.type === 'equipment');
    const selected = this.selectedItems();
    const selectedRarity = selected[0]?.rarity ?? null;
    const chance = selected.length === 2 ? fusionUpgradeChance(selected[0], selected[1]) : 0;
    const upper = selectedRarity ? nextRarity(selectedRarity) : null;
    const selectionText = selected.length
      ? selected.map((item) => `${equipmentDisplayName(item)} · Lv.${item.level ?? 1}`).join('<br>')
      : '아직 선택한 장비가 없습니다.';
    const resultText = selected.length === 2
      ? `${getRarity(selectedRarity).name} 확정${upper ? ` · ${getRarity(upper).name} 승급 ${chance}%` : ' · 최고 등급이라 승급 없음'} · 결과 강화 +0`
      : '같은 등급 장비를 2개 선택하세요.';
    const cards = [...items].sort((a, b) => getRarity(b.rarity).order - getRarity(a.rarity).order).map((item, index) => {
      const isSelected = this.selectedIds.includes(item.id);
      const blocked = selectedRarity && item.rarity !== selectedRarity && !isSelected;
      return `<div class="fusion-card rarity-${item.rarity} ${isSelected ? 'selected' : ''}"><div><strong>${equipmentDisplayName(item)}</strong><small>${getRarity(item.rarity).name} · ${getSlot(item.slot).name} · Lv.${item.level ?? 1} · 강화 +${item.enhancement ?? 0}</small></div><button id="fusion-pick-${index}" ${blocked ? 'disabled' : ''}>${isSelected ? '선택 해제' : '재료 선택'}</button></div>`;
    }).join('') || '<p class="empty-state">합성할 수 있는 가방 장비가 없습니다.</p>';

    openPanel(`
      <div class="panel fusion-panel">
        <h2>장비 합성</h2>
        <div class="fusion-guide">노멀 30% · 레어 20% · 유니크 12% · 레전더리 5%<br>두 재료의 강화 합계에 따라 최대 +10%p</div>
        ${message ? `<p class="forge-message ${messageClass}">${message}</p>` : ''}
        <div class="fusion-selected"><strong>${selectionText}</strong><small>${resultText}</small></div>
        <button id="fusion-submit" class="fusion-submit" ${selected.length !== 2 ? 'disabled' : ''}>선택한 장비 2개 합성</button>
        <div class="fusion-list">${cards}</div>
        <button id="fusion-back" class="secondary">상태창으로 돌아가기</button>
      </div>
    `);
    [...items].sort((a, b) => getRarity(b.rarity).order - getRarity(a.rarity).order).forEach((item, index) => qs(`fusion-pick-${index}`)?.addEventListener('click', () => this.toggle(item)));
    qs('fusion-submit')?.addEventListener('click', () => this.fuse());
    qs('fusion-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Status'); });
  }

  toggle(item) {
    if (this.selectedIds.includes(item.id)) this.selectedIds = this.selectedIds.filter((id) => id !== item.id);
    else {
      const selected = this.selectedItems();
      if (selected.length >= 2) return this.render('재료는 2개까지만 선택할 수 있습니다.', 'fail');
      if (selected[0] && selected[0].rarity !== item.rarity) return this.render('같은 등급의 장비만 합성할 수 있습니다.', 'fail');
      this.selectedIds.push(item.id);
    }
    this.render();
  }

  fuse() {
    const selected = this.selectedItems();
    if (selected.length !== 2 || selected[0].rarity !== selected[1].rarity) return this.render('같은 등급 장비 2개를 선택해주세요.', 'fail');
    const result = rollFusionEquipment(selected[0], selected[1], this.character.classId);
    if (!result) return this.render('합성할 수 없는 장비 조합입니다.', 'fail');
    const consumed = new Set(selected.map((item) => item.id));
    this.character.inventory = this.character.inventory.filter((item) => !consumed.has(item.id));
    addLoot(this.character, result.item);
    this.selectedIds = [];
    saveCharacter(this);
    this.render(`${result.upgraded ? '★ 상위 등급 승급 성공!' : '장비 합성 완료!'} ${getRarity(result.item.rarity).name} 「${equipmentDisplayName(result.item)}」 획득`, result.upgraded ? 'success' : '');
  }
}
