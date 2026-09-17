import Phaser from 'phaser';
import { getClass, getAdvancement } from '../data/rpg.js';
import { getRarity, getSlot, equipmentDisplayName, enhancementStats } from '../data/equipment.js';
import { combatStats, ensureRpgCharacter, equipItem, unequipItem, saveCharacter } from '../state/rpgCharacter.js';
import { createEquippedHero } from '../ui/equipmentVisuals.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const EQUIPPED_POSITIONS = [
  ['helmet', 0, '투구'], ['armor', 0, '갑옷'], ['gloves', 0, '장갑'], ['boots', 0, '신발'], ['weapon', 0, '무기'],
  ['ring', 0, '반지 1'], ['ring', 1, '반지 2'], ['necklace', 0, '목걸이'], ['earring', 0, '귀걸이 1'], ['earring', 1, '귀걸이 2'],
];

export class StatusScene extends Phaser.Scene {
  constructor() { super('Status'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '모험가 상태창', '장비를 착용하면 외형과 전투 능력치가 함께 변합니다');
    createEquippedHero(this, this.character, 240, 245, 3);
    this.render();
  }

  equippedAt(slot, index) {
    if (slot === 'ring') return this.character.equipment.rings[index];
    if (slot === 'earring') return this.character.equipment.earrings[index];
    return this.character.equipment[slot];
  }

  render(message = '') {
    const c = this.character;
    const stats = combatStats(c);
    const job = getClass(c.classId);
    const advancement = getAdvancement(c.advancementId);
    const equippedHtml = EQUIPPED_POSITIONS.map(([slot, index, label], position) => {
      const item = this.equippedAt(slot, index);
      return `<div class="equip-slot ${item ? `rarity-${item.rarity}` : 'empty'}"><span>${label}</span><strong>${item ? equipmentDisplayName(item) : '비어 있음'}</strong>${item ? `<small>내구도 ${item.durability}/${item.maxDurability}</small><button id="unequip-${position}">해제</button>` : ''}</div>`;
    }).join('');
    const bagItems = c.inventory.filter((item) => item.type === 'equipment');
    const bagHtml = bagItems.length ? bagItems.map((item, index) => {
      const statsText = Object.entries(enhancementStats(item)).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()} +${value}`).join(' · ');
      const blocked = item.classId && item.classId !== c.classId;
      return `<div class="gear-card rarity-${item.rarity}"><div><strong>${equipmentDisplayName(item)}</strong><small>${getRarity(item.rarity).name} · ${getSlot(item.slot).name} · 내구도 ${item.durability}/${item.maxDurability}</small><small>${statsText}</small></div><button id="equip-${index}" ${blocked ? 'disabled' : ''}>${blocked ? '타 직업' : '착용'}</button></div>`;
    }).join('') : '<p class="empty-state">착용할 장비가 없습니다.</p>';
    openPanel(`
      <div class="panel status-panel">
        <h2>${c.name} · Lv.${c.level}</h2>
        <div class="class-badge">${advancement?.name ?? job.name}</div>
        <div class="stat-grid"><span>HP <strong>${c.hp}/${stats.maxHp}</strong></span><span>MP <strong>${c.mp}/${stats.maxMp}</strong></span><span>공격력 <strong>${stats.attack}</strong></span><span>방어력 <strong>${stats.defense}</strong></span><span>민첩 <strong>${stats.agility}</strong></span><span>탈주 확률 <strong>적과 비교 계산</strong></span></div>
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <h3>착용 장비</h3><div class="equipped-grid">${equippedHtml}</div>
        <h3>장비 가방</h3><div class="gear-list">${bagHtml}</div>
        <button id="status-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    EQUIPPED_POSITIONS.forEach(([slot, index], position) => qs(`unequip-${position}`)?.addEventListener('click', () => {
      unequipItem(c, slot, index); saveCharacter(this); this.scene.restart();
    }));
    bagItems.forEach((item, index) => qs(`equip-${index}`)?.addEventListener('click', () => {
      if (equipItem(c, item.id)) { saveCharacter(this); this.scene.restart(); }
    }));
    qs('status-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }
}
