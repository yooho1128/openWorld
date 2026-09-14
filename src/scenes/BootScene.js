import Phaser from 'phaser';

const TILE_W = 480;
const TILE_H = 80;
const LANE_COUNT = 3;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.generateTextures();
  }

  create() {
    this.scene.start('StageSelect');
  }

  generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Scrolling corridor floor, with faint lane divider hints baked in.
    g.fillStyle(0xcac2b0, 1);
    g.fillRect(0, 0, TILE_W, TILE_H);
    g.fillStyle(0xbdb49f, 1);
    for (let y = 0; y < TILE_H; y += 20) {
      g.fillRect(0, y, TILE_W, 10);
    }
    g.fillStyle(0x9a9280, 1);
    const laneW = TILE_W / LANE_COUNT;
    for (let i = 1; i < LANE_COUNT; i++) {
      g.fillRect(laneW * i - 2, 0, 4, TILE_H);
    }
    g.generateTexture('runner_bg', TILE_W, TILE_H);
    g.clear();

    // player (facing up, since they're climbing the corporate ladder upward)
    g.fillStyle(0x2e86de, 1);
    g.fillRoundedRect(0, 0, 32, 32, 8);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 0, 7, 14, 25, 14);
    g.generateTexture('player_runner', 32, 32);
    g.clear();

    // coffee coin
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(2, 4, 14, 14, 3);
    g.fillStyle(0x6f4527, 1);
    g.fillRoundedRect(4, 6, 10, 8, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(16, 8, 4, 6);
    g.generateTexture('coin_coffee', 20, 20);
    g.clear();

    // obstacle: box stack
    g.fillStyle(0x9a6a3d, 1);
    g.fillRect(2, 16, 40, 26);
    g.fillStyle(0x7a5230, 1);
    g.fillRect(2, 16, 40, 4);
    g.fillStyle(0xb98a55, 1);
    g.fillRect(6, 2, 28, 18);
    g.fillStyle(0x9a6a3d, 1);
    g.fillRect(6, 2, 28, 4);
    g.generateTexture('ob_box', 44, 44);
    g.clear();

    // obstacle: report/folder stack
    g.fillStyle(0xc0392b, 1);
    g.fillRoundedRect(2, 10, 40, 30, 3);
    g.fillStyle(0xf5f0e6, 1);
    g.fillRect(6, 6, 32, 6);
    g.fillRect(6, 16, 32, 3);
    g.fillRect(6, 22, 32, 3);
    g.generateTexture('ob_folder', 44, 44);
    g.clear();

    // obstacle: filing cabinet
    g.fillStyle(0x35424a, 1);
    g.fillRect(4, 2, 36, 40);
    g.fillStyle(0x24303a, 1);
    g.fillRect(4, 16, 36, 3);
    g.fillRect(4, 30, 36, 3);
    g.fillStyle(0xf5c518, 1);
    g.fillRect(18, 9, 8, 3);
    g.fillRect(18, 23, 8, 3);
    g.generateTexture('ob_cabinet', 44, 44);
    g.destroy();
  }
}
