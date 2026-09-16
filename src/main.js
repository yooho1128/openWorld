import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { LoginScene } from './scenes/LoginScene.js';
import { CreateScene } from './scenes/CreateScene.js';
import { CareerScene } from './scenes/CareerScene.js';
import { TownScene } from './scenes/TownScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { LotteryScene } from './scenes/LotteryScene.js';
import { EndingScene } from './scenes/EndingScene.js';

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
  scene: [BootScene, LoginScene, CreateScene, CareerScene, TownScene, LocationScene, LotteryScene, EndingScene],
};

new Phaser.Game(config);
