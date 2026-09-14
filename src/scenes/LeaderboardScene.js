import Phaser from 'phaser';
import { STAGES } from '../data/stages.js';

const RANK_COLORS = ['#f5c518', '#d8d3c6', '#c97b3d'];

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  init(data) {
    this.stageId = data?.stageId ?? STAGES[0].id;
  }

  create() {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, 'runner_bg').setOrigin(0, 0).setAlpha(0.35);

    this.add
      .text(width / 2, 34, '🏆 명예의 전당', { fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#f5c518' })
      .setOrigin(0.5);

    this.tabRefs = [];
    const tabY = 76;
    const tabW = (width - 64) / STAGES.length;
    STAGES.forEach((stage, i) => {
      const x = 32 + tabW * i + tabW / 2;
      const btn = this.add
        .rectangle(x, tabY, tabW - 6, 34, stage.id === this.stageId ? 0x2e86de : 0x33333d)
        .setStrokeStyle(1, 0x555555)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, tabY, `${stage.id}`, { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
      btn.on('pointerdown', () => {
        this.stageId = stage.id;
        this.refreshTabs();
        this.loadEntries();
      });
      this.tabRefs.push({ btn, stage });
    });

    this.listContainer = this.add.container(0, 0);
    this.statusText = this.add
      .text(width / 2, 150, '불러오는 중...', { fontFamily: 'monospace', fontSize: '14px', color: '#d8d3c6', align: 'center' })
      .setOrigin(0.5);

    const backY = height - 60;
    const backBtn = this.add
      .rectangle(width / 2, backY, width - 64, 56, 0x4a4a55)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('StageSelect'));

    this.add.text(width / 2, backY, '⬅ 스테이지 선택으로', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);

    this.loadEntries();
  }

  refreshTabs() {
    for (const { btn, stage } of this.tabRefs) {
      btn.setFillStyle(stage.id === this.stageId ? 0x2e86de : 0x33333d);
    }
  }

  async loadEntries() {
    this.statusText.setText('불러오는 중...').setVisible(true);
    this.listContainer.removeAll(true);

    try {
      const res = await fetch(`/api/leaderboard?stageId=${this.stageId}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const entries = data.entries ?? [];

      if (entries.length === 0) {
        this.statusText.setText('아직 이 스테이지 클리어 기록이 없습니다.\n첫 기록의 주인공이 되어보세요!');
        return;
      }

      this.statusText.setVisible(false);
      entries.forEach((entry, i) => {
        const y = 120 + i * 42;
        const rankColor = RANK_COLORS[i] ?? '#aaaaaa';
        const rank = this.add.text(40, y, `${i + 1}.`, { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: rankColor }).setOrigin(0, 0.5);
        const name = this.add.text(88, y, entry.name, { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' }).setOrigin(0, 0.5);
        const stat = this.add
          .text(this.scale.width - 32, y, `${entry.attempts}트 · ${entry.distance}m`, { fontFamily: 'monospace', fontSize: '12px', color: '#f5c518' })
          .setOrigin(1, 0.5);
        this.listContainer.add([rank, name, stat]);
      });
    } catch (err) {
      console.error('Leaderboard load failed:', err);
      this.statusText.setText('랭킹 서버 준비 안됨\n(Vercel의 Redis(Upstash) 연동이 필요합니다)');
    }
  }
}
