import Phaser from 'phaser';
import { getRarity, equipmentDisplayName, enhancementStats, enhancementVisualClass, levelEffectiveness } from '../data/equipment.js';
import { affinityPriceMultiplier } from '../data/rpg.js';
import { adjustAffinity, ensureRpgCharacter, equippedItems, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const SUCCESS_RATES = [100, 96, 92, 87, 80, 72, 63, 54, 45, 36, 28, 22, 17, 13, 10, 7, 5, 3, 2, 1];
const DESTROY_RATES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 8, 12, 18, 25, 33, 43, 55, 70, 85];

export class BlacksmithScene extends Phaser.Scene {
  constructor() { super('Blacksmith'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '토르간의 대장간', '+20까지 강화 · 실패 시 하락 · +10부터 파괴 위험 · 이용할수록 우호도 상승');
    this.render();
  }

  ownedEquipment() {
    return equippedItems(this.character);
  }

  render(message = '', messageClass = '') {
    const items = this.ownedEquipment();
    const html = items.length ? items.map((item, index) => {
      const level = item.enhancement ?? 0;
      const cost = this.cost(item);
      const rate = level < 20 ? SUCCESS_RATES[level] : 0;
      const destroy = level < 20 ? DESTROY_RATES[level] : 0;
      const repairCost = this.repairCost(item);
      const statText = Object.entries(enhancementStats(item, this.character.level)).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()} ${value}`).join(' · ');
      const effectiveness = levelEffectiveness(item.level ?? 1, this.character.level);
      const levelNote = effectiveness < 1 ? `<small class="forge-risk">아이템 Lv.${item.level ?? 1} · 레벨 차이로 효과 ${Math.round(effectiveness * 100)}%</small>` : '';
      return `<div class="forge-card rarity-${item.rarity} ${enhancementVisualClass(item)}"><div><strong>${equipmentDisplayName(item)}</strong><small>${getRarity(item.rarity).name} · ${statText}</small><small>내구도 ${item.durability}/${item.maxDurability}</small>${levelNote}<small class="forge-risk">성공 ${rate}%${destroy ? ` · 파괴 ${destroy}%` : ''} · 실패 시 -1</small></div><div class="forge-actions"><button id="forge-${index}" ${level >= 20 ? 'disabled' : ''}>${level >= 20 ? '최대 강화' : `강화 ${cost.toLocaleString()}G`}</button><button id="repair-${index}" class="repair" ${repairCost <= 0 ? 'disabled' : ''}>${repairCost > 0 ? `수리 ${repairCost.toLocaleString()}G` : '내구도 최대'}</button></div></div>`;
    }).join('') : '<p class="empty-state">착용 중인 장비가 없습니다. 상태창에서 먼저 장비를 착용해주세요.</p>';
    const affinity = this.character.affinity.blacksmith ?? 0;
    openPanel(`
      <div class="panel forge-panel">
        <h2>장비 강화</h2>
        <div class="relationship ${affinity >= 0 ? 'friendly' : 'hostile'}">토르간 우호도 ${affinity >= 0 ? '+' : ''}${affinity} · 비용 ${Math.round(affinityPriceMultiplier(affinity) * 100)}%</div>
        <p class="gold-line">보유 골드 <strong>${this.character.gold.toLocaleString()}G</strong></p>
        ${message ? `<p class="forge-message ${messageClass}">${message}</p>` : ''}
        <div class="forge-list">${html}</div>
        <button id="forge-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    items.forEach((item, index) => qs(`forge-${index}`)?.addEventListener('click', () => this.enhance(item)));
    items.forEach((item, index) => qs(`repair-${index}`)?.addEventListener('click', () => this.repair(item)));
    qs('forge-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  cost(item) {
    const multiplier = affinityPriceMultiplier(this.character.affinity.blacksmith ?? 0);
    return Math.max(50, Math.round(item.value * (1 + (item.enhancement ?? 0) * 0.8) * multiplier));
  }

  repairCost(item) {
    const multiplier = affinityPriceMultiplier(this.character.affinity.blacksmith ?? 0);
    return Math.ceil(((item.maxDurability ?? 100) - (item.durability ?? 100)) * Math.max(2, item.value * 0.025) * multiplier);
  }

  repair(item) {
    const cost = this.repairCost(item);
    if (cost <= 0) return this.render('이미 내구도가 최대입니다.');
    if (this.character.gold < cost) return this.render('수리 비용이 부족합니다. 낮은 레벨 사냥터에서 골드를 모아보세요.', 'fail');
    this.character.gold -= cost;
    item.durability = item.maxDurability ?? 100;
    adjustAffinity(this.character, 'blacksmith', 1);
    saveCharacter(this);
    this.render(`${equipmentDisplayName(item)} 수리 완료! 장비 성능이 복구되었습니다.`, 'success');
  }

  enhance(item) {
    const level = item.enhancement ?? 0;
    if (level >= 20) return this.render('이미 최대 강화에 도달했습니다.');
    const cost = this.cost(item);
    if (this.character.gold < cost) return this.render('강화 비용이 부족합니다.', 'fail');
    this.character.gold -= cost;
    adjustAffinity(this.character, 'blacksmith', 1);
    if (Math.random() * 100 < SUCCESS_RATES[level]) {
      item.enhancement = level + 1;
      saveCharacter(this);
      return this.render(`${item.name} 강화 성공! +${item.enhancement}`, 'success');
    }
    if (level >= 10 && Math.random() * 100 < DESTROY_RATES[level]) {
      this.removeItem(item.id);
      saveCharacter(this);
      return this.render(`${equipmentDisplayName(item)}이(가) 강화 중 파괴되었습니다...`, 'destroyed');
    }
    item.enhancement = Math.max(0, level - 1);
    saveCharacter(this);
    this.render(`강화 실패. 강화 수치가 +${item.enhancement}(으)로 내려갔습니다.`, 'fail');
  }

  removeItem(itemId) {
    this.character.inventory = this.character.inventory.filter((item) => item.id !== itemId);
    const equipment = this.character.equipment;
    for (const key of ['helmet', 'armor', 'gloves', 'boots', 'weapon', 'necklace']) if (equipment[key]?.id === itemId) equipment[key] = null;
    equipment.rings = equipment.rings.map((item) => item?.id === itemId ? null : item);
    equipment.earrings = equipment.earrings.map((item) => item?.id === itemId ? null : item);
  }
}
