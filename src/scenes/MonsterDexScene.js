import Phaser from 'phaser';
import { MONSTERS, MONSTER_COUNT, BIOME_LABELS } from '../data/monsters.js';
import { addFantasyBackdrop } from '../ui/fantasyTheme.js';

const BIOMES = [...new Set(MONSTERS.map((monster) => monster.biome))];
const RANK_COLORS = { F: '#aeb6a5', E: '#99c77c', D: '#68b7d6', C: '#8e82df', B: '#c77dde', A: '#e98b55', S: '#f5d66f' };

export class MonsterDexScene extends Phaser.Scene {
  constructor() { super('MonsterDex'); }

  init(data) { this.page = Phaser.Math.Clamp(data?.page ?? 0, 0, BIOMES.length - 1); }

  create() {
    addFantasyBackdrop(this, { dark: true });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,ESC');
    this.renderPage();
  }

  renderPage() {
    this.pageLayer?.destroy(true);
    this.pageLayer = this.add.container(0, 0);
    const biome = BIOMES[this.page];
    const monsters = MONSTERS.filter((monster) => monster.biome === biome);
    const panel = this.add.graphics();
    panel.fillStyle(0x17120f, 0.9).fillRoundedRect(16, 18, 448, 764, 12);
    panel.lineStyle(2, 0xc79a4b, 0.9).strokeRoundedRect(16, 18, 448, 764, 12);
    panel.lineStyle(1, 0xf1d58a, 0.3).strokeRoundedRect(23, 25, 434, 750, 8);
    this.pageLayer.add(panel);

    const title = this.add.text(240, 48, '왕립 몬스터 도감', {
      fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '23px', fontStyle: 'bold',
      color: '#f4dc9c', stroke: '#2a170e', strokeThickness: 4,
    }).setOrigin(0.5);
    const sub = this.add.text(240, 80, `${this.page + 1} / ${BIOMES.length}  ·  ${BIOME_LABELS[biome]} 지역  ·  총 ${MONSTER_COUNT}종`, {
      fontSize: '12px', color: '#cdbf9d',
    }).setOrigin(0.5);
    this.pageLayer.add([title, sub]);

    monsters.forEach((monster, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 34 + col * 215;
      const y = 108 + row * 119;
      const card = this.add.graphics();
      card.fillStyle(0x35291f, 0.9).fillRoundedRect(x, y, 197, 103, 8);
      card.lineStyle(1, monster.accent, 0.75).strokeRoundedRect(x, y, 197, 103, 8);
      const sprite = this.add.sprite(x + 48, y + 48, monster.texture).setScale(1.12);
      const name = this.add.text(x + 88, y + 17, monster.name, {
        fontSize: '13px', fontStyle: 'bold', color: '#fff0c5',
      });
      const rank = this.add.text(x + 88, y + 42, `${monster.rank}급 · ${monster.trait}`, {
        fontSize: '10px', color: RANK_COLORS[monster.rank] ?? '#ddd', wordWrap: { width: 98 },
      });
      const number = this.add.text(x + 88, y + 73, `No.${String(this.page * 10 + index + 1).padStart(3, '0')}`, {
        fontFamily: 'Georgia, serif', fontSize: '10px', color: '#9f927b',
      });
      this.pageLayer.add([card, sprite, name, rank, number]);
    });

    this.addNavButton(75, 742, '◀ 이전', () => this.changePage(-1));
    this.addNavButton(240, 742, '마을로', () => this.scene.start('Town'));
    this.addNavButton(405, 742, '다음 ▶', () => this.changePage(1));
  }

  addNavButton(x, y, label, action) {
    const bg = this.add.rectangle(x, y, 118, 42, 0x563526, 1).setStrokeStyle(2, 0xc79a4b, 0.9).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontSize: '13px', fontStyle: 'bold', color: '#ffe8ad' }).setOrigin(0.5);
    bg.on('pointerdown', action);
    bg.on('pointerover', () => bg.setFillStyle(0x795038));
    bg.on('pointerout', () => bg.setFillStyle(0x563526));
    this.pageLayer.add([bg, text]);
  }

  changePage(delta) {
    this.page = Phaser.Math.Wrap(this.page + delta, 0, BIOMES.length);
    this.renderPage();
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.keys.A)) this.changePage(-1);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.keys.D)) this.changePage(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.scene.start('Town');
  }
}
