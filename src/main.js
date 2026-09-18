import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { LoginScene } from './scenes/LoginScene.js';
import { CreateScene } from './scenes/CreateScene.js';
import { TownScene } from './scenes/TownScene.js';
import { ClassScene } from './scenes/ClassScene.js';
import { HuntScene } from './scenes/HuntScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { TavernScene } from './scenes/TavernScene.js';
import { NPCScene } from './scenes/NPCScene.js';
import { StatusScene } from './scenes/StatusScene.js';
import { BlacksmithScene } from './scenes/BlacksmithScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { AdvancementScene } from './scenes/AdvancementScene.js';
import { QuestScene } from './scenes/QuestScene.js';
import { RankingScene } from './scenes/RankingScene.js';
import { MailboxScene } from './scenes/MailboxScene.js';
import { EventScene } from './scenes/EventScene.js';
import { AstrologerScene } from './scenes/AstrologerScene.js';

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
  scene: [BootScene, LoginScene, CreateScene, ClassScene, TownScene, HuntScene, BattleScene, InventoryScene, TavernScene, NPCScene, StatusScene, BlacksmithScene, SettingsScene, AdvancementScene, QuestScene, RankingScene, MailboxScene, EventScene, AstrologerScene],
};

new Phaser.Game(config);
