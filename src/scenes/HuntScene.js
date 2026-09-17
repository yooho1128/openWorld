import Phaser from 'phaser';
import { REGIONS } from '../data/rpg.js';
import { MONSTERS } from '../data/monsters.js';
import { addFantasyBackdrop, addOrnatePanel, addSceneTitle } from '../ui/fantasyTheme.js';

export class HuntScene extends Phaser.Scene {
  constructor() { super('Hunt'); }
  init(data) { this.page = data?.page ?? 0; }
  create() {
    this.character = this.registry.get('character');
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true, accent: 0x6d7f65 });
    addSceneTitle(this, '왕국 사냥 지도', '보스·난입·도주 등 돌발 상황이 발생할 수 있습니다');
    this.renderPage();
    this.addButton(240, 758, 180, 42, '길드로 돌아가기', () => this.scene.start('Town'), 0x4d4237);
  }

  renderPage() {
    this.pageLayer?.destroy(true);
    this.pageLayer = this.add.container();
    const pageCount = Math.ceil(REGIONS.length / 6);
    this.page = Phaser.Math.Clamp(this.page, 0, pageCount - 1);
    REGIONS.slice(this.page * 6, this.page * 6 + 6).forEach((region, index) => this.addRegion(region, index));
    const pageText = this.add.text(240, 704, `${this.page + 1} / ${pageCount}`, { fontSize: '12px', color: '#d7c59e' }).setOrigin(0.5);
    this.pageLayer.add(pageText);
    if (this.page > 0) this.addPageButton(92, '◀ 이전', -1);
    if (this.page < pageCount - 1) this.addPageButton(388, '다음 ▶', 1);
  }

  addRegion(region, index) {
    const locked = this.character.level < region.minLevel;
    const y = 166 + index * 86;
    const card = addOrnatePanel(this, 240, y, 420, 70, {
      color: locked ? 0x232b27 : 0x203129, border: locked ? 0x59615d : region.color, alpha: 0.96,
    });
    const bg = this.add.rectangle(240, y, 420, 70, 0xffffff, 0.001);
    if (!locked) bg.setInteractive({ useHandCursor: true });
    const icon = this.add.circle(72, y, 23, locked ? 0x4a4a4a : region.color, 0.8);
    const iconText = this.add.text(72, y, locked ? '🔒' : '⚔', { fontSize: '17px' }).setOrigin(0.5);
    const name = this.add.text(112, y - 18, region.name, { fontSize: '15px', fontStyle: 'bold', color: locked ? '#777' : '#ffe8ad' });
    const subtitle = this.add.text(112, y + 7, `${region.subtitle} · 권장 Lv.${region.minLevel}`, { fontSize: '10px', color: locked ? '#666' : '#b9aa8d' });
    const danger = this.add.text(402, y, `위험 ${region.danger}`, { fontSize: '9px', color: locked ? '#666' : '#e28a69' }).setOrigin(1, 0.5);
    this.pageLayer.add([card.shadow, card.panel, bg, icon, iconText, name, subtitle, danger]);
    if (!locked) {
      bg.on('pointerdown', () => this.startHunt(region));
      bg.on('pointerover', () => { card.panel.setAlpha(0.82); bg.setScale(1.01); });
      bg.on('pointerout', () => { card.panel.setAlpha(1); bg.setScale(1); });
    }
  }

  startHunt(region) {
    const rankPower = { F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 8 };
    const maxPower = region.minLevel < 5 ? 3 : region.minLevel < 20 ? 4 : region.minLevel < 60 ? 5 : region.minLevel < 150 ? 6 : 8;
    const pool = MONSTERS.filter((monster) => monster.biome === region.biome && rankPower[monster.rank] <= maxPower);
    const eventRoll = Math.random();
    const bossChance = 0.04 + region.danger * 0.005;
    const eventType = eventRoll < bossChance ? 'boss' : eventRoll < bossChance + 0.12 ? 'reinforcement' : 'normal';
    const sorted = [...pool].sort((a, b) => rankPower[b.rank] - rankPower[a.rank]);
    const monster = eventType === 'boss' ? sorted[Phaser.Math.Between(0, Math.min(3, sorted.length - 1))] : pool[Phaser.Math.Between(0, pool.length - 1)];
    let reinforcementId = null;
    if (eventType === 'reinforcement') {
      const reinforcement = pool.filter((entry) => entry.id !== monster.id);
      reinforcementId = reinforcement[Phaser.Math.Between(0, reinforcement.length - 1)]?.id ?? monster.id;
    }
    this.scene.start('Battle', { regionId: region.id, monsterId: monster.id, eventType, reinforcementId });
  }

  addPageButton(x, label, delta) {
    const bg = this.add.rectangle(x, 704, 120, 38, 0x563526, 0.98).setStrokeStyle(1, 0xc99d52).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, 704, label, { fontSize: '12px', fontStyle: 'bold', color: '#ffe8ad' }).setOrigin(0.5);
    bg.on('pointerdown', () => { this.page += delta; this.renderPage(); });
    this.pageLayer.add([bg, text]);
  }

  addButton(x, y, width, height, label, action, color) {
    const bg = this.add.rectangle(x, y, width, height, color, 0.96).setStrokeStyle(2, 0xc99d52).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '13px', fontStyle: 'bold', color: '#ffe8ad' }).setOrigin(0.5);
    bg.on('pointerdown', action);
  }
}
