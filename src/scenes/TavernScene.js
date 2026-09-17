import Phaser from 'phaser';
import { COMPANIONS } from '../data/rpg.js';
import { saveCharacter, companionStats } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class TavernScene extends Phaser.Scene {
  constructor() { super('Tavern'); }
  create() {
    this.character = this.registry.get('character');
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this);
    addSceneTitle(this, '황금 뿔피리 여관', '동료를 모집하고 출전 파티를 정하세요');
    this.render();
  }

  render(message = '') {
    const c = this.character;
    const cards = COMPANIONS.map((ally) => {
      const owned = c.companions.includes(ally.id);
      const active = c.activeCompanionId === ally.id;
      const bond = owned ? companionStats(c, ally.id) : null;
      const bondLine = bond
        ? `<small>유대 Lv.${bond.level} (${bond.xp}/${bond.xpToNext}) · 공격 ${bond.attack} · 방어 ${bond.defense}${bond.awakenings ? ` · 각성 ${bond.awakenings}단계 (위력 +${Math.round((bond.abilityMultiplier - 1) * 100)}%)` : ''}</small>`
        : `<small>공격 ${ally.attack} · 방어 ${ally.defense} · ${ally.ability}</small>`;
      return `<div class="companion-card ${active ? 'active' : ''}"><div class="companion-avatar" style="background:#${ally.color.toString(16).padStart(6, '0')}">${ally.name[0]}</div><div class="companion-copy"><strong>${ally.name}</strong><small>${ally.className} · ${ally.ability}</small>${bondLine}</div><button id="ally-${ally.id}">${active ? '출전 중' : owned ? '파티 선택' : `${ally.cost}G 모집`}</button></div>`;
    }).join('');
    openPanel(`
      <div class="panel companion-panel">
        <h2>동료 모집</h2>
        <p class="gold-line">보유 골드 <strong>${c.gold.toLocaleString()}G</strong></p>
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <div class="companion-list">${cards}</div>
        <button id="tavern-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    COMPANIONS.forEach((ally) => qs(`ally-${ally.id}`).addEventListener('click', () => this.choose(ally)));
    qs('tavern-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  choose(ally) {
    const c = this.character;
    if (c.activeCompanionId === ally.id) return this.render(`${ally.name}(은)는 이미 함께 출전 중입니다.`);
    if (!c.companions.includes(ally.id)) {
      if (c.gold < ally.cost) return this.render('골드가 부족해 동료를 모집할 수 없습니다.');
      c.gold -= ally.cost;
      c.companions.push(ally.id);
    }
    c.activeCompanionId = ally.id;
    saveCharacter(this);
    this.render(`${ally.name}(이)가 파티에 합류했습니다!`);
  }
}
