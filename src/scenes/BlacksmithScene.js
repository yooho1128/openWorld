import Phaser from 'phaser';
import { ENHANCEMENT_BLESSINGS, ENHANCEMENT_DESTROY_RATES as DESTROY_RATES, baseItemPower, getRarity, equipmentDisplayName, enhancementStats, enhancementVisualClass, enhancementSuccessRate, isSafeEnhancement, levelEffectiveness } from '../data/equipment.js';
import { affinityPriceMultiplier } from '../data/rpg.js';
import { adjustAffinity, ensureRpgCharacter, equippedItems, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

// 강화는 돈과 축복을 태워서 스탯을 영구히 굳히는 행위라, 가방에 같은
// 부위의 더 좋은 장비가 있으면 그걸 먼저 장착하고 강화하는 게 맞다.
// 착용 중인 장비를 가방 속 같은 부위 후보들과 비교해 안내/차단한다.
function bestBagAlternative(character, slot) {
  const candidates = character.inventory.filter((entry) => entry.type === 'equipment' && entry.slot === slot);
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => (baseItemPower(cur, character.level) > baseItemPower(best, character.level) ? cur : best));
}

function forgeCompareBadge(item, character) {
  const alt = bestBagAlternative(character, item.slot);
  if (!alt) return { html: '<small class="compare-badge compare-up">▲ 가방에 대체 장비 없음 · 강화 추천</small>', blockedBy: null };
  const diff = baseItemPower(alt, character.level) - baseItemPower(item, character.level);
  if (diff > 0) return { html: `<small class="compare-badge compare-down">▼ 가방의 ${equipmentDisplayName(alt)}이(가) 더 강함 (+${diff}) · 먼저 장착하세요</small>`, blockedBy: alt };
  if (diff < 0) return { html: `<small class="compare-badge compare-up">▲ 가방보다 강함 (+${-diff}) · 강화 추천</small>`, blockedBy: null };
  return { html: '<small class="compare-badge compare-equal">- 가방과 동일함</small>', blockedBy: null };
}

export class BlacksmithScene extends Phaser.Scene {
  constructor() { super('Blacksmith'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '토르간의 대장간', '+10까지 안전 강화 · +10부터 하락/파괴 위험 · 별의 축복 사용 가능');
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
      const cost = this.cost(item);
      const rate = level < 20 ? enhancementSuccessRate(level, blessingBonus) : 0;
      const destroy = level < 20 ? DESTROY_RATES[level] : 0;
      const repairCost = this.repairCost(item);
      const statText = Object.entries(enhancementStats(item, this.character.level)).filter(([, value]) => value).map(([key, value]) => `${key.toUpperCase()} ${value}`).join(' · ');
      const effectiveness = levelEffectiveness(item.level ?? 1, this.character.level);
      const levelNote = effectiveness < 1 ? `<small class="forge-risk">아이템 Lv.${item.level ?? 1} · 레벨 차이로 효과 ${Math.round(effectiveness * 100)}%</small>` : '';
      const blessingText = activeBlessing ? ` · ${activeBlessing.name} +${activeBlessing.bonus}%` : '';
      const failText = isSafeEnhancement(level) ? ' · 실패 시 유지' : ' · 실패 시 -1';
      const compare = forgeCompareBadge(item, this.character);
      const forgeDisabled = level >= 20 || compare.blockedBy;
      return `<div class="forge-card rarity-${item.rarity} ${enhancementVisualClass(item)}"><div><strong>${equipmentDisplayName(item)}</strong><small>${getRarity(item.rarity).name} · ${statText}</small><small>내구도 ${item.durability}/${item.maxDurability}</small>${levelNote}${compare.html}<small class="forge-risk">성공 ${rate}%${blessingText}${destroy ? ` · 파괴 ${destroy}%` : ''}${failText}</small></div><div class="forge-actions"><button id="forge-${index}" ${forgeDisabled ? 'disabled' : ''}>${level >= 20 ? '최대 강화' : compare.blockedBy ? '더 좋은 장비 먼저' : `강화 ${cost.toLocaleString()}G`}</button><button id="repair-${index}" class="repair" ${repairCost <= 0 ? 'disabled' : ''}>${repairCost > 0 ? `수리 ${repairCost.toLocaleString()}G` : '내구도 최대'}</button></div></div>`;
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
        <p class="gold-line">보유 골드 <strong>${this.character.gold.toLocaleString()}G</strong></p>
        ${message ? `<p class="forge-message ${messageClass}">${message}</p>` : ''}
        <div class="forge-list">${html}</div>
        <button id="forge-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    items.forEach((item, index) => qs(`forge-${index}`)?.addEventListener('click', () => this.enhance(item)));
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
    if (forgeCompareBadge(item, this.character).blockedBy) return this.render('가방에 더 좋은 장비가 있습니다. 먼저 장착한 뒤 강화해주세요.', 'fail');
    const cost = this.cost(item);
    if (this.character.gold < cost) return this.render('강화 비용이 부족합니다.', 'fail');
    this.character.gold -= cost;
    adjustAffinity(this.character, 'blacksmith', 1);
    const blessingKey = this.character.activeEnhancementBlessing;
    const blessing = (this.character.enhancementBlessings?.[blessingKey] ?? 0) > 0 ? ENHANCEMENT_BLESSINGS[blessingKey] : null;
    const successRate = enhancementSuccessRate(level, blessing?.bonus ?? 0);
    if (blessing) this.character.enhancementBlessings[blessingKey] -= 1;
    this.character.activeEnhancementBlessing = null;
    if (Math.random() * 100 < successRate) {
      item.enhancement = level + 1;
      this.character.highestEnhancement = Math.max(this.character.highestEnhancement ?? 0, item.enhancement);
      saveCharacter(this);
      return this.render(`${item.name} 강화 성공! +${item.enhancement}`, 'success');
    }
    if (level >= 10 && Math.random() * 100 < DESTROY_RATES[level]) {
      this.removeItem(item.id);
      saveCharacter(this);
      return this.render(`${equipmentDisplayName(item)}이(가) 강화 중 파괴되었습니다...`, 'destroyed');
    }
    if (isSafeEnhancement(level)) {
      saveCharacter(this);
      return this.render(`강화 실패. +10 이하 안전 구간이라 강화 수치가 +${level}로 유지됩니다.`, 'fail');
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
