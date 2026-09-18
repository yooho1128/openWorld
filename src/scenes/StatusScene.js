import Phaser from 'phaser';
import { getClass, getAdvancement } from '../data/rpg.js';
import { getRarity, getSlot, equipmentDisplayName, enhancementStats, enhancementVisualClass, levelEffectiveness, rollGachaEquipment } from '../data/equipment.js';
import { BIOME_LABELS } from '../data/monsters.js';
import { getTitle } from '../data/quests.js';
import { addLoot, combatPower, combatStats, ensureRpgCharacter, equipItem, unequipItem, saveCharacter } from '../state/rpgCharacter.js';
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
    const equippedTitle = getTitle(c.equippedTitle);
    const titleOptions = (c.unlockedTitles ?? []).map((id) => getTitle(id)).filter(Boolean);
    const titleOptionsHtml = titleOptions.map((title) => `<option value="${title.id}" ${title.id === c.equippedTitle ? 'selected' : ''}>[${title.category}] ${title.name}${title.bossChanceBonus ? ' · 보스 조우 +2%p' : ''}</option>`).join('');
    const equippedHtml = EQUIPPED_POSITIONS.map(([slot, index, label], position) => {
      const item = this.equippedAt(slot, index);
      const eff = item ? levelEffectiveness(item.level ?? 1, c.level) : 1;
      const levelNote = item && eff < 1 ? `<small class="forge-risk">Lv.${item.level ?? 1} · 효과 ${Math.round(eff * 100)}%</small>` : '';
      return `<div class="equip-slot ${item ? `rarity-${item.rarity} ${enhancementVisualClass(item)}` : 'empty'}"><span>${label}</span><strong>${item ? equipmentDisplayName(item) : '비어 있음'}</strong>${item ? `<small>내구도 ${item.durability}/${item.maxDurability}</small>${levelNote}<button id="unequip-${position}">해제</button>` : ''}</div>`;
    }).join('');
    const ticketItems = c.inventory.filter((item) => item.type === 'ticket');
    const ticketHtml = ticketItems.length
      ? ticketItems.map((item, index) => `<div class="gear-card"><div><strong>${item.name}</strong><small>사용하면 무작위 부위 · 무작위 등급 장비 1개 획득</small></div><button id="use-ticket-${index}">사용하기</button></div>`).join('')
      : '';
    const bagItems = c.inventory.filter((item) => item.type === 'equipment');
    const bagHtml = bagItems.length ? bagItems.map((item, index) => {
      const statsText = Object.entries(enhancementStats(item, c.level)).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()} +${value}`).join(' · ');
      const blocked = item.classId && item.classId !== c.classId;
      const eff = levelEffectiveness(item.level ?? 1, c.level);
      const levelNote = eff < 1 ? ` · Lv.${item.level ?? 1} (효과 ${Math.round(eff * 100)}%)` : '';
      return `<div class="gear-card rarity-${item.rarity} ${enhancementVisualClass(item)}"><div><strong>${equipmentDisplayName(item)}</strong><small>${getRarity(item.rarity).name} · ${getSlot(item.slot).name} · 내구도 ${item.durability}/${item.maxDurability}${levelNote}</small><small>${statsText}</small></div><button id="equip-${index}" ${blocked ? 'disabled' : ''}>${blocked ? '타 직업' : '착용'}</button></div>`;
    }).join('') : '<p class="empty-state">착용할 장비가 없습니다.</p>';
    const setBonus = stats.setBonus;
    const setBonusHtml = setBonus?.count >= 10
      ? `<div class="relationship friendly set-awakened set-${setBonus.biome}">✦ ${BIOME_LABELS[setBonus.biome]} 완전 공명 ✦<small>10세트 전용 특수 외형 활성화 · 전체 스탯 +${Math.round(setBonus.tier.statMultiplier * 100)}%</small></div>`
      : setBonus?.tier
      ? `<div class="relationship friendly">세트 효과 · ${BIOME_LABELS[setBonus.biome]} 계열 ${setBonus.count}종 · 전체 스탯 +${Math.round(setBonus.tier.statMultiplier * 100)}%</div>`
      : setBonus?.count > 0
        ? `<div class="relationship hostile">세트 효과 없음 · ${BIOME_LABELS[setBonus.biome]} 계열 ${setBonus.count}종 (3종부터 발동)</div>`
        : '';
    openPanel(`
      <div class="panel status-panel">
        <h2>${equippedTitle ? `[${equippedTitle.name}] ` : ''}${c.name} · Lv.${c.level}</h2>
        <div class="class-badge">${advancement?.name ?? job.name} · 전투력 ${combatPower(c).toLocaleString()}</div>
        <div class="title-picker"><label for="title-select">장착 칭호</label><select id="title-select"><option value="">칭호 없음</option>${titleOptionsHtml}</select><small>${equippedTitle?.bossChanceBonus ? '현재 효과: 보스 조우 확률 +2%p' : '업적 보상을 수령하면 새로운 칭호가 해금됩니다.'}</small></div>
        <div class="stat-grid"><span>HP <strong>${c.hp}/${stats.maxHp}</strong></span><span>MP <strong>${c.mp}/${stats.maxMp}</strong></span><span>공격력 <strong>${stats.attack}</strong></span><span>방어력 <strong>${stats.defense}</strong></span><span>민첩 <strong>${stats.agility}</strong></span><span>탈주 확률 <strong>적과 비교 계산</strong></span></div>
        ${setBonusHtml}
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <button id="open-fusion" class="fusion-link">✦ 장비 합성소</button>
        <h3>착용 장비</h3><div class="equipped-grid">${equippedHtml}</div>
        ${ticketItems.length ? `<h3>보유 아이템</h3><div class="gear-list">${ticketHtml}</div>` : ''}
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
    ticketItems.forEach((item, index) => qs(`use-ticket-${index}`)?.addEventListener('click', () => this.useTicket(item.id)));
    qs('open-fusion')?.addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Fusion'); });
    qs('title-select')?.addEventListener('change', (event) => {
      const id = event.target.value || null;
      c.equippedTitle = id && c.unlockedTitles.includes(id) ? id : null;
      saveCharacter(this);
      this.render(c.equippedTitle ? `칭호 「${getTitle(c.equippedTitle)?.name}」을(를) 장착했습니다.` : '칭호를 해제했습니다.');
    });
    qs('status-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  useTicket(itemId) {
    const c = this.character;
    const index = c.inventory.findIndex((entry) => entry.id === itemId);
    if (index < 0) return;
    const item = c.inventory[index];
    item.quantity -= 1;
    if (item.quantity <= 0) c.inventory.splice(index, 1);
    const reward = rollGachaEquipment(c.classId, c.level);
    if (reward) addLoot(c, reward);
    saveCharacter(this);
    this.render(reward ? `${getRarity(reward.rarity).name} 등급 「${equipmentDisplayName(reward)}」을(를) 획득했습니다!` : '뽑기에 실패했습니다.');
  }
}
