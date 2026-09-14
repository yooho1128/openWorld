import Phaser from 'phaser';

const RANK_COLORS = ['#f5c518', '#d8d3c6', '#c97b3d'];
const INFINITE_STAGE_ID = 0;

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create() {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, 'runner_bg').setOrigin(0, 0).setAlpha(0.35);

    this.add
      .text(width / 2, 40, '🏆 명예의 전당', { fontFamily: 'monospace', fontSize: '24px', fontStyle: 'bold', color: '#f5c518' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 72, '♾️ 무한모드 최고 거리', { fontFamily: 'monospace', fontSize: '14px', color: '#d8d3c6' })
      .setOrigin(0.5);

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

  async loadEntries() {
    this.statusText.setText('불러오는 중...').setVisible(true);
    this.listContainer.removeAll(true);

    try {
      const res = await fetch(`/api/leaderboard?stageId=${INFINITE_STAGE_ID}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const entries = data.entries ?? [];

      if (entries.length === 0) {
        this.statusText.setText('아직 무한모드 기록이 없습니다.\n첫 기록의 주인공이 되어보세요!');
        return;
      }

      this.statusText.setVisible(false);
      entries.forEach((entry, i) => {
        const y = 116 + i * 46;
        const rankColor = RANK_COLORS[i] ?? '#aaaaaa';
        const rank = this.add.text(40, y, `${i + 1}.`, { fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: rankColor }).setOrigin(0, 0.5);
        const name = this.add.text(90, y, entry.name, { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5);
        const stat = this.add
          .text(this.scale.width - 32, y, `${entry.distance}m`, { fontFamily: 'monospace', fontSize: '14px', color: '#f5c518' })
          .setOrigin(1, 0.5);
        this.listContainer.add([rank, name, stat]);
      });
    } catch (err) {
      console.error('Leaderboard load failed:', err);
      this.statusText.setText('랭킹 서버 준비 안됨\n(Vercel에 Neon DB(DATABASE_URL) 연동이 필요합니다)');
    }
  }
}
