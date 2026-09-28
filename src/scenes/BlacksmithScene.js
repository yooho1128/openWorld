import Phaser from 'phaser';
import { ENHANCEMENT_BLESSINGS, ENHANCEMENT_PITY_FAILURES, baseItemPower, getRarity, equipmentDisplayName, enhancementFailureCount, enhancementStats, enhancementVisualClass, enhancementSuccessRate, isEnhancementGuaranteed, levelEffectiveness, strongerBagAlternative } from '../data/equipment.js';
import { affinityPriceMultiplier } from '../data/rpg.js';
import { adjustAffinity, ensureRpgCharacter, equippedItems, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class BlacksmithScene extends Phaser.Scene {
  constructor() { super('Blacksmith'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '토르간의 대장간', '실패해도 강화 유지 · 10회 실패 후 다음 강화 확정 성공');
    this.render();
  }

  ownedEquipment() {
    return equippedItems(this.character);
  }

  render(message = '', messageClass = '') {
    const items = this.ownedEquipment();
    const activeKey = this.character.activeEnhancementBlessing;
    const activeBlessing = (this.character.enhancementBlessings?.[activeKey] ?? 0) > 0 ? ENHANCEMENT_BLESSINGS[activeKey] : null;
    if (!activeBlessing) this.character.activeEnhancementBlessing = null;
    const blessingBonus = activeBlessing?.bonus ?? 0;
    const html = items.length ? items.map((item, index) => {
      const level = item.enhancement ?? 0;
      const failureCount = enhancementFailureCount(item);
      const guaranteed = isEnhancementGuaranteed(item);
      const cost = this.cost(item);
      const rate = level < 20 ? (guaranteed ? 100 : enhancementSuccessRate(level, blessingBonus)) : 0;
      const repairCost = this.repairCost(item);
      const statText = Object.entries(enhancementStats(item, this.character.level)).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()} ${value}`).join(' · ');
      const effectiveness = levelEffectiveness(item.level ?? 1, this.character.level);
      const levelNote = effectiveness < 1 ? `<small class="forge-risk">아이템 Lv.${item.level ?? 1} · 레벨 차이로 효과 ${Math.round(effectiveness * 100)}%</small>` : '';
      const blessingText = activeBlessing ? ` · ${activeBlessing.name} +${activeBlessing.bonus}%` : '';
      const pityText = guaranteed ? ' · 다음 시도 확정 성공' : ` · 실패 누적 ${failureCount}/${ENHANCEMENT_PITY_FAILURES}`;
      const alt = strongerBagAlternative(item, this.character, this.character.level);
      const altDiff = alt ? baseItemPower(alt, this.character.level) - baseItemPower(item, this.character.level) : 0;
      const altHtml = alt ? `<small class="compare-badge compare-down">▼ 가방의 ${equipmentDisplayName(alt)}이(가) 더 강함 (+${altDiff}) · 여기 강화하기 전에 상태창에서 교체를 고려하세요</small>` : '';
      return `<div class="forge-card rarity-${item.rarity} ${enhancementVisualClass(item)}"><div><strong>${equipmentDisplayName(item)}</strong><small>${getRarity(item.rarity).name} · ${statText}</small><small>내구도 ${item.durability}/${item.maxDurability}</small>${levelNote}<small class="forge-risk">성공 ${rate}%${blessingText} · 실패 시 강화 유지${pityText}</small>${altHtml}</div><div class="forge-actions"><button id="forge-${index}" ${level >= 20 ? 'disabled' : ''}>${level >= 20 ? '최대 강화' : `강화 ${cost.toLocaleString()}G`}</button><button id="scroll-${index}" ${level >= 20 || this.character.enhancementScrolls <= 0 ? 'disabled' : ''}>+1 주문서</button><button id="repair-${index}" class="repair" ${repairCost <= 0 ? 'disabled' : ''}>${repairCost > 0 ? `수리 ${repairCost.toLocaleString()}G` : '내구도 최대'}</button></div></div>`;
    }).join('') : '<p class="empty-state">착용 중인 장비가 없습니다. 상태창에서 먼저 장비를 착용해주세요.</p>';
    const affinity = this.character.affinity.blacksmith ?? 0;
    const blessingButtons = Object.entries(ENHANCEMENT_BLESSINGS).map(([key, blessing]) => {
      const count = this.character.enhancementBlessings?.[key] ?? 0;
      const active = this.character.activeEnhancementBlessing === key;
      return `<button id="blessing-${key}" class="${active ? 'active' : ''}" ${count <= 0 ? 'disabled' : ''}>${blessing.symbol} ${blessing.name} +${blessing.bonus}% (${count})</button>`;
    }).join('');
    openPanel(`
      <div class="panel forge-panel">
        <h2>장비 강화</h2>
        <div class="relationship ${affinity >= 0 ? 'friendly' : 'hostile'}">토르간 우호도 ${affinity >= 0 ? '+' : ''}${affinity} · 비용 ${Math.round(affinityPriceMultiplier(affinity) * 100)}%</div>
        <div class="blessing-picker"><strong>강화에 사용할 축복</strong><div>${blessingButtons}</div><button id="blessing-none" class="secondary">사용하지 않기</button></div>
        ${activeBlessing ? `<div class="star-blessing">${activeBlessing.symbol} 선택됨: 다음 강화 1회 성공률 +${activeBlessing.bonus}%</div>` : ''}
        <p class="gold-line">보유 골드 <strong>${this.character.gold.toLocaleString()}G</strong> · +1 강화 주문서 <strong>${this.character.enhancementScrolls}장</strong></p>
        ${message ? `<p class="forge-message ${messageClass}">${message}</p>` : ''}
        <div class="forge-list">${html}</div>
        <button id="forge-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    items.forEach((item, index) => qs(`forge-${index}`)?.addEventListener('click', () => this.enhance(item)));
    items.forEach((item, index) => qs(`scroll-${index}`)?.addEventListener('click', () => this.useEnhancementScroll(item)));
    items.forEach((item, index) => qs(`repair-${index}`)?.addEventListener('click', () => this.repair(item)));
    Object.keys(ENHANCEMENT_BLESSINGS).forEach((key) => qs(`blessing-${key}`)?.addEventListener('click', () => this.selectBlessing(key)));
    qs('blessing-none')?.addEventListener('click', () => this.selectBlessing(null));
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

  selectBlessing(key) {
    if (key && (this.character.enhancementBlessings?.[key] ?? 0) <= 0) return this.render('보유하지 않은 축복입니다.', 'fail');
    this.character.activeEnhancementBlessing = key;
    saveCharacter(this);
    this.render(key ? `${ENHANCEMENT_BLESSINGS[key].name}을(를) 선택했습니다. 실제 강화 시 1개가 소모됩니다.` : '축복을 사용하지 않도록 설정했습니다.', key ? 'success' : '');
  }

  enhance(item) {
    const level = item.enhancement ?? 0;
    if (level >= 20) return this.render('이미 최대 강화에 도달했습니다.');
    const cost = this.cost(item);
    if (this.character.gold < cost) return this.render('강화 비용이 부족합니다.', 'fail');
    this.character.gold -= cost;
    adjustAffinity(this.character, 'blacksmith', 1);
    const blessingKey = this.character.activeEnhancementBlessing;
    const blessing = (this.character.enhancementBlessings?.[blessingKey] ?? 0) > 0 ? ENHANCEMENT_BLESSINGS[blessingKey] : null;
    const successRate = enhancementSuccessRate(level, blessing?.bonus ?? 0);
    const failureCount = enhancementFailureCount(item);
    const guaranteed = isEnhancementGuaranteed(item);
    if (blessing) this.character.enhancementBlessings[blessingKey] -= 1;
    this.character.activeEnhancementBlessing = null;
    if (guaranteed || Math.random() * 100 < successRate) {
      item.enhancement = level + 1;
      item.enhancementFailureCount = 0;
      this.character.highestEnhancement = Math.max(this.character.highestEnhancement ?? 0, item.enhancement);
      saveCharacter(this);
      return this.render(`${guaranteed ? '10회 실패 보상 확정 강화 성공!' : `${item.name} 강화 성공!`} +${item.enhancement}`, 'success');
    }
    item.enhancementFailureCount = failureCount + 1;
    saveCharacter(this);
    this.render(`강화 실패. 강화 수치는 +${level}로 유지됩니다. 실패 누적 ${item.enhancementFailureCount}/${ENHANCEMENT_PITY_FAILURES}${item.enhancementFailureCount >= ENHANCEMENT_PITY_FAILURES ? ' · 다음 시도 확정 성공!' : ''}`, 'fail');
  }

  useEnhancementScroll(item) {
    const level = item.enhancement ?? 0;
    if (level >= 20) return this.render('이미 최대 강화에 도달했습니다.');
    if (this.character.enhancementScrolls <= 0) return this.render('+1 강화 주문서가 없습니다.', 'fail');
    this.character.enhancementScrolls -= 1;
    item.enhancement = level + 1;
    item.enhancementFailureCount = 0;
    this.character.highestEnhancement = Math.max(this.character.highestEnhancement ?? 0, item.enhancement);
    adjustAffinity(this.character, 'blacksmith', 1);
    saveCharacter(this);
    this.render(`+1 강화 주문서 사용! ${item.name}이(가) +${item.enhancement}(이)가 되었습니다. 실패·하락 없음.`, 'success');
  }
}
