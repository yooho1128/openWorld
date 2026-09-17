import Phaser from 'phaser';
import { REGIONS } from '../data/rpg.js';
import { MONSTERS } from '../data/monsters.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class HuntScene extends Phaser.Scene {
  constructor() { super('Hunt'); }
  create() {
    this.character = this.registry.get('character');
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '왕국 사냥 지도', '지역을 선택하면 몬스터와 턴제 전투를 시작합니다');
    REGIONS.forEach((region, index) => this.addRegion(region, index));
    this.addButton(240, 758, 180, 42, '길드로 돌아가기', () => this.scene.start('Town'), 0x4d4237);
  }

  addRegion(region, index) {
    const locked = this.character.level < region.minLevel;
    const y = 176 + index * 94;
    const bg = this.add.rectangle(240, y, 420, 78, locked ? 0x242424 : 0x2b211a, 0.95)
      .setStrokeStyle(2, locked ? 0x555555 : region.color, 0.9);
    if (!locked) bg.setInteractive({ useHandCursor: true });
    this.add.circle(72, y, 25, locked ? 0x4a4a4a : region.color, 0.8);
    this.add.text(72, y, locked ? '🔒' : '⚔', { fontSize: '19px' }).setOrigin(0.5);
    this.add.text(112, y - 20, region.name, { fontSize: '16px', fontStyle: 'bold', color: locked ? '#777' : '#ffe8ad' });
    this.add.text(112, y + 7, `${region.subtitle} · 권장 Lv.${region.minLevel}`, { fontSize: '11px', color: locked ? '#666' : '#b9aa8d' });
    this.add.text(402, y, `위험 ${'◆'.repeat(region.danger)}`, { fontSize: '9px', color: locked ? '#666' : '#e28a69' }).setOrigin(1, 0.5);
    if (!locked) {
      bg.on('pointerdown', () => this.startHunt(region));
      bg.on('pointerover', () => bg.setFillStyle(0x49372a));
      bg.on('pointerout', () => bg.setFillStyle(0x2b211a));
    }
  }

  startHunt(region) {
    const pool = MONSTERS.filter((monster) => monster.biome === region.id);
    const maxIndex = Math.min(pool.length - 1, Math.max(2, Math.floor(this.character.level / 2) + 2));
    const monster = pool[Phaser.Math.Between(0, maxIndex)];
    this.scene.start('Battle', { regionId: region.id, monsterId: monster.id });
  }

  addButton(x, y, width, height, label, action, color) {
    const bg = this.add.rectangle(x, y, width, height, color, 0.96).setStrokeStyle(2, 0xc99d52).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '13px', fontStyle: 'bold', color: '#ffe8ad' }).setOrigin(0.5);
    bg.on('pointerdown', action);
  }
}
