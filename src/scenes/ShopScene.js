import Phaser from 'phaser';
import { EQUIPMENT } from '../data/equipment.js';
import { loadSave, writeSave } from '../state/save.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    const { width, height } = this.scale;
    this.save = loadSave();

    this.add.tileSprite(0, 0, width, height, 'runner_bg').setOrigin(0, 0).setAlpha(0.5);

    this.add
      .text(width / 2, 40, '🛒 상점', { fontFamily: 'monospace', fontSize: '26px', fontStyle: 'bold', color: '#f5c518' })
      .setOrigin(0.5);

    this.coffeeText = this.add
      .text(width / 2, 74, '', { fontFamily: 'monospace', fontSize: '16px', color: '#f5f0e6' })
      .setOrigin(0.5);

    this.cardRefs = [];
    const startY = 106;
    const gap = 78;
    EQUIPMENT.forEach((item, i) => {
      const y = startY + i * gap;
      const owned = this.save.owned.includes(item.id);

      const box = this.add.rectangle(width / 2, y, width - 48, 68, owned ? 0x2f8f4e : 0x2a2a33).setStrokeStyle(2, 0x555555);

      const info = this.add.text(
        40,
        y,
        `${item.emoji} ${item.name}\n${item.desc}`,
        { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' },
      ).setOrigin(0, 0.5);

      const actionText = owned ? '보유중' : `${item.cost} ☕`;
      const action = this.add
        .text(width - 40, y, actionText, {
          fontFamily: 'monospace',
          fontSize: '13px',
          fontStyle: 'bold',
          color: owned ? '#8fd6a8' : '#f5c518',
          backgroundColor: owned ? '' : '#00000060',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(1, 0.5);

      if (!owned) {
        box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.buy(item));
      }

      this.cardRefs.push({ box, action, item });
    });

    const backY = startY + EQUIPMENT.length * gap + 20;
    const backBtn = this.add
      .rectangle(width / 2, backY, width - 64, 56, 0x4a4a55)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('StageSelect'));

    this.add
      .text(width / 2, backY, '⬅ 스테이지 선택으로', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    this.updateCoffeeText();
  }

  updateCoffeeText() {
    this.coffeeText.setText(`보유 커피: ${this.save.coffee} ☕`);
  }

  buy(item) {
    if (this.save.owned.includes(item.id)) return;
    if (this.save.coffee < item.cost) return;

    this.save.coffee -= item.cost;
    this.save.owned.push(item.id);
    writeSave(this.save);
    this.updateCoffeeText();

    const ref = this.cardRefs.find((r) => r.item.id === item.id);
    if (ref) {
      ref.box.setFillStyle(0x2f8f4e);
      ref.box.disableInteractive();
      ref.action.setText('보유중').setColor('#8fd6a8').setBackgroundColor('');
    }
  }
}
