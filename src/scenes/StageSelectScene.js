import Phaser from 'phaser';
import { STAGES, isStageUnlocked } from '../data/stages.js';
import { loadSave } from '../state/save.js';

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelect');
  }

  create() {
    const { width, height } = this.scale;
    const save = loadSave();

    this.add.tileSprite(0, 0, width, height, 'runner_bg').setOrigin(0, 0).setAlpha(0.5);

    this.add
      .text(width / 2, 48, '☕ 출근런 ☕', { fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold', color: '#f5c518' })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 84, `보유 커피: ${save.coffee}`, { fontFamily: 'monospace', fontSize: '16px', color: '#f5f0e6' })
      .setOrigin(0.5);

    const startY = 140;
    const gap = 96;
    STAGES.forEach((stage, i) => {
      const y = startY + i * gap;
      const unlocked = isStageUnlocked(save, stage.id);
      const cleared = save.clearedStages.includes(stage.id);

      const box = this.add
        .rectangle(width / 2, y, width - 64, 76, unlocked ? 0x2e86de : 0x33333d)
        .setStrokeStyle(2, unlocked ? 0xf5c518 : 0x555555);

      const best = save.bestDistance[stage.id] ?? 0;
      const label = unlocked
        ? `${stage.name}${cleared ? ' ✅' : ''}\n목표 ${stage.goalDistance}m · 최고 ${best}m`
        : `🔒 ${stage.name}\n이전 스테이지 클리어 필요`;

      this.add
        .text(width / 2, y, label, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);

      if (unlocked) {
        box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          this.scene.start('Run', { stageId: stage.id });
        });
      }
    });

    const shopY = startY + STAGES.length * gap + 20;
    const shopBtn = this.add
      .rectangle(width / 2, shopY, width - 64, 56, 0x4a7a5c)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Shop'));

    this.add
      .text(width / 2, shopY, '🛒 상점 (장비 구매)', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}
