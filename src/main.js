import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { StageSelectScene } from './scenes/StageSelectScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { RunScene } from './scenes/RunScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 480,
  height: 800,
  backgroundColor: '#1b1b22',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 1,
  },
  scene: [BootScene, StageSelectScene, ShopScene, RunScene, LeaderboardScene],
};

new Phaser.Game(config);
