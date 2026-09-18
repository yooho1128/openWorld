import Phaser from 'phaser';
import { affinityPriceMultiplier } from '../data/rpg.js';
import { EQUIPMENT_SLOTS, enhancementVisualClass, equipmentDisplayName, getRarity, getSlot, shopEquipment } from '../data/equipment.js';
import { getPotion, POTIONS, potionDescription } from '../data/potions.js';
import { addLoot, addPotion, adjustAffinity, ensureRpgCharacter, saveCharacter, totalPotionCount } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const SLOT_ORDER = EQUIPMENT_SLOTS.map((slot) => slot.id);
const SORT_OPTIONS = [
  { id: 'slot', label: '부위순' },
  { id: 'name', label: '가나다순' },
  { id: 'level', label: '레벨순' },
  { id: 'rarity', label: '희귀도순' },
];
const CATEGORY_LABELS = { equipment: '장비', consumable: '소비', junk: '잡템' };

function itemCategory(item) {
  if (item.type === 'equipment') return 'equipment';
  if (item.type === 'consumable') return 'consumable';
  return 'junk';
}

function sortEquipmentEntries(entries, sortKey) {
  const sorted = [...entries];
  if (sortKey === 'name') sorted.sort((a, b) => a.item.name.localeCompare(b.item.name, 'ko'));
  else if (sortKey === 'level') sorted.sort((a, b) => (b.item.level ?? 1) - (a.item.level ?? 1));
  else if (sortKey === 'rarity') sorted.sort((a, b) => getRarity(b.item.rarity).order - getRarity(a.item.rarity).order);
  else sorted.sort((a, b) => SLOT_ORDER.indexOf(a.item.slot) - SLOT_ORDER.indexOf(b.item.slot));
  return sorted;
}

function tabsHtml(prefix, activeTab) {
  return `<div class="filter-tabs">${Object.entries(CATEGORY_LABELS).map(([id, label]) => `<button id="${prefix}-tab-${id}" class="${activeTab === id ? '' : 'inactive'}">${label}</button>`).join('')}</div>`;
}

function sortRowHtml(id, activeSort) {
  const options = SORT_OPTIONS.map((option) => `<option value="${option.id}" ${option.id === activeSort ? 'selected' : ''}>${option.label}</option>`).join('');
  return `<div class="sort-row"><label for="${id}">정렬</label><select id="${id}">${options}</select></div>`;
}

export class InventoryScene extends Phaser.Scene {
  constructor() { super('Inventory'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this);
    addSceneTitle(this, '리아의 교역소', '우호도에 따라 매입과 판매 가격이 달라집니다');
    this.bagTab = 'equipment';
    this.bagSort = 'slot';
    this.shopTab = 'equipment';
    this.shopSort = 'slot';
    this.render();
  }

  render(message = '') {
    const c = this.character;
    const affinity = c.affinity.merchant ?? 0;
    const multiplier = affinityPriceMultiplier(affinity);
    const sellBonus = Math.max(0.7, Math.min(1.3, 1 + affinity * 0.006));

    const bagEntries = c.inventory.map((item, index) => ({ item, index })).filter(({ item }) => itemCategory(item) === this.bagTab);
    const bagSorted = this.bagTab === 'equipment' ? sortEquipmentEntries(bagEntries, this.bagSort) : bagEntries;
    const bagCardsHtml = bagSorted.map(({ item, index }) => {
      const price = Math.max(1, Math.round(item.value * sellBonus));
      const rarity = item.type === 'equipment' ? getRarity(item.rarity).name : `${item.rarity}급`;
      const detail = item.type === 'equipment' ? `${rarity} · ${getSlot(item.slot).name} · 내구도 ${item.durability}/${item.maxDurability}` : `${rarity} · ${item.quantity}개`;
      return `<div class="inventory-row ${item.type === 'equipment' ? `rarity-${item.rarity} ${enhancementVisualClass(item)}` : ''}"><div><strong>${item.type === 'equipment' ? equipmentDisplayName(item) : item.name}</strong><small>${detail}</small></div><button id="sell-${index}">${price}G에 판매</button></div>`;
    }).join('');
    const ownedPotions = Object.entries(c.potions ?? {}).filter(([, qty]) => qty > 0);
    const bagPotionHtml = this.bagTab === 'consumable' ? ownedPotions.map(([id, qty]) => {
      const potion = getPotion(id);
      if (!potion) return '';
      return `<div class="inventory-row"><div><strong>${potion.name}</strong><small>${potionDescription(potion)} · 전투 중 사용</small></div><span class="item-count">${qty}개</span></div>`;
    }).join('') : '';
    const bagHtml = bagCardsHtml || bagPotionHtml || `<p class="empty-state">보유한 ${CATEGORY_LABELS[this.bagTab]} 아이템이 없습니다.</p>`;

    this.shopItems = shopEquipment(c.classId, c.level);
    const shopEntries = this.shopItems.map((item, index) => ({ item, index }));
    const shopSorted = this.shopTab === 'equipment' ? sortEquipmentEntries(shopEntries, this.shopSort) : [];
    const shopCardsHtml = shopSorted.map(({ item, index }) => {
      const price = Math.round(item.value * 1.8 * multiplier);
      const stats = Object.entries(item.stats).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()} +${value}`).join(' · ');
      return `<div class="gear-card rarity-${item.rarity}"><div><strong>${item.name}</strong><small>${getRarity(item.rarity).name} · ${getSlot(item.slot).name}</small><small>${stats}</small></div><button id="buy-gear-${index}">${price.toLocaleString()}G</button></div>`;
    }).join('');
    const shopPotionHtml = this.shopTab === 'consumable' ? POTIONS.map((potion) => {
      const price = Math.round(potion.price * multiplier);
      return `<div class="gear-card"><div><strong>${potion.name}</strong><small>${potionDescription(potion)}</small></div><button id="buy-potion-${potion.id}">${price.toLocaleString()}G</button></div>`;
    }).join('') : '';
    const shopHtml = shopCardsHtml || shopPotionHtml || `<p class="empty-state">오늘 판매 중인 ${CATEGORY_LABELS[this.shopTab]} 아이템이 없습니다.</p>`;

    openPanel(`
      <div class="panel inventory-panel">
        <h2>전리품 가방</h2>
        <div class="relationship ${affinity >= 0 ? 'friendly' : 'hostile'}">리아 우호도 ${affinity >= 0 ? '+' : ''}${affinity} · 가격 ${Math.round(multiplier * 100)}%</div>
        <p class="gold-line">보유 골드 <strong>${c.gold.toLocaleString()}G</strong> · 물약 ${totalPotionCount(c)}개</p>
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <h3>내 가방</h3>
        ${tabsHtml('bag', this.bagTab)}
        ${this.bagTab === 'equipment' ? sortRowHtml('bag-sort', this.bagSort) : ''}
        <div class="inventory-list">${bagHtml}</div>
        <h3>오늘의 장비 · 노멀/레어</h3>
        ${tabsHtml('shop', this.shopTab)}
        ${this.shopTab === 'equipment' ? sortRowHtml('shop-sort', this.shopSort) : ''}
        <div class="gear-list">${shopHtml}</div>
        <button id="inventory-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    Object.keys(CATEGORY_LABELS).forEach((id) => {
      qs(`bag-tab-${id}`).addEventListener('click', () => { this.bagTab = id; this.render(); });
      qs(`shop-tab-${id}`).addEventListener('click', () => { this.shopTab = id; this.render(); });
    });
    qs('bag-sort')?.addEventListener('change', (event) => { this.bagSort = event.target.value; this.render(); });
    qs('shop-sort')?.addEventListener('change', (event) => { this.shopSort = event.target.value; this.render(); });
    bagSorted.forEach(({ index }) => qs(`sell-${index}`)?.addEventListener('click', () => this.sell(index, sellBonus)));
    shopSorted.forEach(({ index }) => qs(`buy-gear-${index}`)?.addEventListener('click', () => this.buyGear(index, multiplier)));
    POTIONS.forEach((potion) => qs(`buy-potion-${potion.id}`)?.addEventListener('click', () => this.buyPotion(potion.id, Math.round(potion.price * multiplier))));
    qs('inventory-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  sell(index, bonus) {
    const item = this.character.inventory[index];
    if (!item) return;
    const price = Math.max(1, Math.round(item.value * bonus));
    this.character.gold += price;
    item.quantity -= 1;
    if (item.quantity <= 0) this.character.inventory.splice(index, 1);
    adjustAffinity(this.character, 'merchant', 1);
    saveCharacter(this);
    this.render(`${item.name}을(를) ${price}G에 판매했습니다.`);
  }

  buyPotion(potionId, price) {
    if (this.character.gold < price) return this.render('골드가 부족합니다.');
    this.character.gold -= price;
    addPotion(this.character, potionId, 1);
    adjustAffinity(this.character, 'merchant', 1);
    saveCharacter(this);
    this.render(`${getPotion(potionId).name}을(를) ${price.toLocaleString()}G에 구매했습니다.`);
  }

  buyGear(index, multiplier) {
    const item = this.shopItems[index];
    if (!item) return;
    const price = Math.round(item.value * 1.8 * multiplier);
    if (this.character.gold < price) return this.render('골드가 부족합니다.');
    this.character.gold -= price;
    addLoot(this.character, item);
    adjustAffinity(this.character, 'merchant', 1);
    saveCharacter(this);
    this.render(`${item.name}을(를) ${price.toLocaleString()}G에 구매했습니다.`);
  }
}
