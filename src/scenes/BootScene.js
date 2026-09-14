import Phaser from 'phaser';
import { PLAY_WIDTH } from '../data/layout.js';

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
    g.clear();

    // full-width obstacle: low cable reel — jump over it (orange + up-arrow)
    const obH = 34;
    g.fillStyle(0xe08a2b, 1);
    g.fillRoundedRect(0, obH - 16, PLAY_WIDTH, 16, 4);
    g.fillStyle(0xc06a10, 1);
    for (let x = 6; x < PLAY_WIDTH - 6; x += 16) {
      g.fillRect(x, obH - 16, 3, 16);
    }
    g.fillStyle(0xffffff, 1);
    const cx = PLAY_WIDTH / 2;
    g.fillTriangle(cx, obH - 32, cx - 10, obH - 18, cx + 10, obH - 18);
    g.generateTexture('ob_low', PLAY_WIDTH, obH);
    g.clear();

    // full-width obstacle: hanging banner — duck under it (blue + down-arrow)
    const obH2 = 34;
    g.fillStyle(0x3f5fc4, 1);
    g.fillRoundedRect(0, 0, PLAY_WIDTH, 16, 4);
    g.fillStyle(0x2c4494, 1);
    for (let x = 6; x < PLAY_WIDTH - 6; x += 16) {
      g.fillRect(x, 0, 3, 16);
    }
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(cx, obH2 - 2, cx - 10, obH2 - 16, cx + 10, obH2 - 16);
    g.generateTexture('ob_high', PLAY_WIDTH, obH2);
    g.clear();

    // side parallax scenery (a window-grid facade sliding past); tinted per
    // stage at runtime so the same texture reads as a different mood.
    const sceneryW = 64;
    const sceneryH = 200;
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, sceneryW, sceneryH);
    g.fillStyle(0xd6d6d6, 1);
    for (let y = 12; y < sceneryH; y += 42) {
      for (let x = 8; x < sceneryW - 12; x += 24) {
        g.fillRoundedRect(x, y, 16, 26, 2);
      }
    }
    g.generateTexture('scenery_strip', sceneryW, sceneryH);
    g.clear();

    // intro: a front door, for the "leaving home" opening beat
    g.fillStyle(0xd8c3a5, 1);
    g.fillRoundedRect(0, 20, 200, 220, 8);
    g.fillStyle(0x8a5a35, 1);
    g.fillRoundedRect(60, 60, 80, 180, 6);
    g.fillStyle(0xf5c518, 1);
    g.fillCircle(128, 150, 4);
    g.fillStyle(0x6a4a2b, 1);
    g.fillTriangle(-10, 20, 100, -30, 210, 20);
    g.generateTexture('house_door', 200, 240);
    g.destroy();
  }
}
