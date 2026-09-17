import Phaser from 'phaser';
import { affinityPriceMultiplier } from '../data/rpg.js';
import { equipmentDisplayName, getRarity, getSlot, rollGachaEquipment, shopEquipment } from '../data/equipment.js';
import { addLoot, ensureRpgCharacter, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class InventoryScene extends Phaser.Scene {
  constructor() { super('Inventory'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this);
    addSceneTitle(this, '리아의 교역소', '우호도에 따라 매입과 판매 가격이 달라집니다');
    this.render();
  }

  render(message = '') {
    const c = this.character;
    const affinity = c.affinity.merchant ?? 0;
    const multiplier = affinityPriceMultiplier(affinity);
    const buyPrice = Math.round(90 * multiplier);
    const sellBonus = Math.max(0.7, Math.min(1.3, 1 + affinity * 0.006));
    const items = c.inventory.length ? c.inventory.map((item, index) => {
      if (item.type === 'ticket') {
        return `<div class="inventory-row"><div><strong>${item.name}</strong><small>사용하면 무작위 부위 · 무작위 등급 장비 1개 획득</small></div><button id="use-${index}">사용하기</button></div>`;
      }
      const price = Math.max(1, Math.round(item.value * sellBonus));
      const rarity = item.type === 'equipment' ? getRarity(item.rarity).name : `${item.rarity}급`;
      const detail = item.type === 'equipment' ? `${rarity} · ${getSlot(item.slot).name} · 내구도 ${item.durability}/${item.maxDurability}` : `${rarity} · ${item.quantity}개`;
      return `<div class="inventory-row ${item.type === 'equipment' ? `rarity-${item.rarity}` : ''}"><div><strong>${item.type === 'equipment' ? equipmentDisplayName(item) : item.name}</strong><small>${detail}</small></div><button id="sell-${index}">${price}G에 판매</button></div>`;
    }).join('') : '<p class="empty-state">가방이 비어 있습니다. 사냥에서 전리품을 얻어보세요.</p>';
    this.shopItems = shopEquipment(c.classId, c.level);
    const shopHtml = this.shopItems.map((item, index) => {
      const price = Math.round(item.value * 1.8 * multiplier);
      const stats = Object.entries(item.stats).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()} +${value}`).join(' · ');
      return `<div class="gear-card rarity-${item.rarity}"><div><strong>${item.name}</strong><small>${getRarity(item.rarity).name} · ${getSlot(item.slot).name}</small><small>${stats}</small></div><button id="buy-gear-${index}">${price.toLocaleString()}G</button></div>`;
    }).join('');
    openPanel(`
      <div class="panel inventory-panel">
        <h2>전리품 가방</h2>
        <div class="relationship ${affinity >= 0 ? 'friendly' : 'hostile'}">리아 우호도 ${affinity >= 0 ? '+' : ''}${affinity} · 가격 ${Math.round(multiplier * 100)}%</div>
        <p class="gold-line">보유 골드 <strong>${c.gold.toLocaleString()}G</strong> · 물약 ${c.potions}개</p>
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <h3>내 가방</h3><div class="inventory-list">${items}</div>
        <h3>오늘의 장비 · 노멀/레어</h3><div class="gear-list">${shopHtml}</div>
        <button id="buy-potion">회복 물약 구매 · ${buyPrice}G</button>
        <button id="inventory-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    c.inventory.forEach((item, index) => {
      if (item.type === 'ticket') qs(`use-${index}`)?.addEventListener('click', () => this.useTicket(index));
      else qs(`sell-${index}`)?.addEventListener('click', () => this.sell(index, sellBonus));
    });
    this.shopItems.forEach((item, index) => qs(`buy-gear-${index}`)?.addEventListener('click', () => this.buyGear(index, multiplier)));
    qs('buy-potion').addEventListener('click', () => this.buyPotion(buyPrice));
    qs('inventory-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  useTicket(index) {
    const item = this.character.inventory[index];
    if (!item || item.type !== 'ticket') return;
    item.quantity -= 1;
    if (item.quantity <= 0) this.character.inventory.splice(index, 1);
    const reward = rollGachaEquipment(this.character.classId, this.character.level);
    if (reward) addLoot(this.character, reward);
    saveCharacter(this);
    this.render(reward ? `${getRarity(reward.rarity).name} 등급 「${equipmentDisplayName(reward)}」을(를) 획득했습니다!` : '뽑기에 실패했습니다.');
  }

  sell(index, bonus) {
    const item = this.character.inventory[index];
    if (!item) return;
    const price = Math.max(1, Math.round(item.value * bonus));
    this.character.gold += price;
    item.quantity -= 1;
    if (item.quantity <= 0) this.character.inventory.splice(index, 1);
    saveCharacter(this);
    this.render(`${item.name}을(를) ${price}G에 판매했습니다.`);
  }

  buyPotion(price) {
    if (this.character.gold < price) return this.render('골드가 부족합니다.');
    this.character.gold -= price;
    this.character.potions += 1;
    saveCharacter(this);
    this.render(`회복 물약을 ${price}G에 구매했습니다.`);
  }

  buyGear(index, multiplier) {
    const item = this.shopItems[index];
    if (!item) return;
    const price = Math.round(item.value * 1.8 * multiplier);
    if (this.character.gold < price) return this.render('골드가 부족합니다.');
    this.character.gold -= price;
    addLoot(this.character, item);
    saveCharacter(this);
    this.render(`${item.name}을(를) ${price.toLocaleString()}G에 구매했습니다.`);
  }
}
