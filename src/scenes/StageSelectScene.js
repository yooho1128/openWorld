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
      .text(width / 2, 40, '☕ 출근런 ☕', { fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#f5c518' })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 74, `보유 커피: ${save.coffee}`, { fontFamily: 'monospace', fontSize: '15px', color: '#f5f0e6' })
      .setOrigin(0.5);

    const startY = 120;
    const gap = 84;
    STAGES.forEach((stage, i) => {
      const y = startY + i * gap;
      const unlocked = isStageUnlocked(save, stage.id);
      const cleared = save.clearedStages.includes(stage.id);

      const box = this.add
        .rectangle(width / 2, y, width - 64, 68, unlocked ? 0x2e86de : 0x33333d)
        .setStrokeStyle(2, unlocked ? 0xf5c518 : 0x555555);

      const best = save.bestDistance[stage.id] ?? 0;
      const label = unlocked
        ? `${stage.name}${cleared ? ' ✅' : ''}\n목표 ${stage.goalDistance}m · 최고 ${best}m`
        : `🔒 ${stage.name}\n이전 스테이지 클리어 필요`;

      this.add
        .text(width / 2, y, label, {
          fontFamily: 'monospace',
          fontSize: '14px',
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

    const infiniteY = startY + STAGES.length * gap + 14;
    const infiniteBtn = this.add
      .rectangle(width / 2, infiniteY, width - 64, 68, 0x6c5ce7)
      .setStrokeStyle(2, 0xf5c518)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Run', { stageId: 'infinite' }));
    this.add
      .text(width / 2, infiniteY, `♾️ 무한모드\n최고 기록 ${save.infiniteBest ?? 0}m · 랭킹 등록 가능`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    const shopY = infiniteY + gap + 6;
    const usableW = width - 64;
    const btnGap = 12;
    const halfW = (usableW - btnGap) / 2;
    const leftX = 32 + halfW / 2;
    const rightX = width - 32 - halfW / 2;

    const shopBtn = this.add
      .rectangle(leftX, shopY, halfW, 56, 0x4a7a5c)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Shop'));
    this.add.text(leftX, shopY, '🛒 상점', { fontFamily: 'monospace', fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);

    const rankBtn = this.add
      .rectangle(rightX, shopY, halfW, 56, 0x8a6a2f)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Leaderboard'));
    this.add.text(rightX, shopY, '🏆 랭킹', { fontFamily: 'monospace', fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);
  }
}
