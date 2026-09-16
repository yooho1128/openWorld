import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { LoginScene } from './scenes/LoginScene.js';
import { CreateScene } from './scenes/CreateScene.js';
import { BirthScene } from './scenes/BirthScene.js';
import { CareerScene } from './scenes/CareerScene.js';
import { TownScene } from './scenes/TownScene.js';
import { IndoorScene } from './scenes/IndoorScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { LotteryScene } from './scenes/LotteryScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { MonsterDexScene } from './scenes/MonsterDexScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 480,
  height: 800,
  backgroundColor: '#101812',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    // 2 so a thumb can hold a d-pad direction while the other taps interact.
    activePointers: 2,
  },
  scene: [BootScene, LoginScene, CreateScene, BirthScene, CareerScene, TownScene, IndoorScene, LocationScene, LotteryScene, EndingScene, MonsterDexScene],
};

new Phaser.Game(config);
