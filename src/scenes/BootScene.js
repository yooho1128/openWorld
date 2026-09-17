import Phaser from 'phaser';
import { generateMonsterTextures } from '../ui/monsterTextures.js';

function makeTexture(scene, key, width, height, draw) {
  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(gfx);
  gfx.generateTexture(key, width, height);
  gfx.destroy();
}

// Generate a complete illustrated RPG tileset at boot. This keeps the game
// fast and asset-free without falling back to plain geometric placeholders.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    makeTexture(this, 'ground', 64, 64, (g) => {
      g.fillStyle(0x315b3a).fillRect(0, 0, 64, 64);
      g.fillStyle(0x3f7046, 0.75);
      [[7, 11], [31, 7], [52, 19], [19, 38], [43, 47], [5, 57]].forEach(([x, y]) => g.fillCircle(x, y, 2));
      g.lineStyle(1, 0x284d31, 0.55);
      g.lineBetween(11, 17, 13, 12).lineBetween(36, 31, 38, 26).lineBetween(55, 59, 58, 54);
    });

    makeTexture(this, 'cobble', 64, 64, (g) => {
      g.fillStyle(0x8b816c).fillRect(0, 0, 64, 64);
      g.lineStyle(2, 0x625c4f, 0.65);
      for (let y = 0; y < 64; y += 16) {
        const offset = (y / 16) % 2 ? 10 : 0;
        for (let x = -offset; x < 64; x += 22) g.strokeRoundedRect(x, y, 20, 14, 5);
      }
    });

    makeTexture(this, 'building', 104, 104, (g) => {
      g.fillStyle(0x231b18, 0.3).fillEllipse(52, 98, 92, 12);
      g.fillStyle(0x59402f).fillRoundedRect(10, 42, 84, 56, 5);
      g.fillStyle(0xb69a68).fillRoundedRect(16, 46, 72, 47, 3);
      g.fillStyle(0x553126).fillTriangle(3, 47, 52, 7, 101, 47);
      g.fillStyle(0x7d4a32).fillTriangle(10, 43, 52, 13, 94, 43);
      g.lineStyle(3, 0x2c211b, 1).strokeTriangle(3, 47, 52, 7, 101, 47);
      g.fillStyle(0x34251f).fillRoundedRect(42, 65, 21, 33, 3);
      g.fillStyle(0xd9a441).fillCircle(58, 81, 2);
      g.fillStyle(0x7fc4d6).fillRect(22, 57, 14, 14).fillRect(69, 57, 14, 14);
      g.lineStyle(2, 0x3c3028, 1);
      g.strokeRect(22, 57, 14, 14).strokeRect(69, 57, 14, 14);
      g.lineBetween(29, 57, 29, 71).lineBetween(22, 64, 36, 64);
      g.lineBetween(76, 57, 76, 71).lineBetween(69, 64, 83, 64);
      g.fillStyle(0xb43b35).fillTriangle(86, 30, 86, 52, 101, 41);
      g.lineStyle(2, 0x35251f, 1).lineBetween(86, 27, 86, 56);
    });

    makeTexture(this, 'player', 40, 50, (g) => {
      g.fillStyle(0x1b1716, 0.28).fillEllipse(20, 46, 28, 7);
      g.fillStyle(0x56364f).fillTriangle(7, 45, 20, 19, 34, 45);
      g.fillStyle(0x273b55).fillRoundedRect(10, 21, 20, 23, 6);
      g.fillStyle(0x493629).fillCircle(20, 13, 11);
      g.fillStyle(0xe2bc80).fillCircle(20, 16, 8);
      g.fillStyle(0x29201d).fillCircle(17, 15, 1).fillCircle(23, 15, 1);
      g.fillStyle(0xc9973f).fillRect(9, 26, 22, 4);
      g.lineStyle(3, 0xc9d2d6, 1).lineBetween(31, 25, 36, 6);
      g.lineStyle(2, 0x6f4d2d, 1).lineBetween(33, 31, 38, 12);
    });

    makeTexture(this, 'goblin', 38, 42, (g) => {
      g.fillStyle(0x17130f, 0.3).fillEllipse(19, 38, 27, 6);
      g.fillStyle(0x79502c).fillRoundedRect(11, 24, 16, 15, 4);
      g.fillStyle(0x75a843).fillCircle(19, 17, 11);
      g.fillTriangle(8, 15, 0, 10, 9, 21).fillTriangle(30, 15, 38, 10, 29, 21);
      g.fillStyle(0xf2d45c).fillCircle(15, 16, 2).fillCircle(23, 16, 2);
      g.fillStyle(0x312218).fillRect(14, 26, 10, 3);
      g.lineStyle(2, 0x342319, 1).lineBetween(29, 25, 36, 36);
    });

    makeTexture(this, 'slime', 38, 31, (g) => {
      g.fillStyle(0x15110e, 0.25).fillEllipse(19, 28, 31, 6);
      g.fillStyle(0x5ecb9b).fillRoundedRect(3, 10, 32, 18, 10);
      g.fillTriangle(7, 14, 18, 1, 31, 14);
      g.fillStyle(0xdffbea).fillCircle(14, 17, 3).fillCircle(25, 17, 3);
      g.fillStyle(0x173a32).fillCircle(14, 18, 1).fillCircle(25, 18, 1);
    });

    makeTexture(this, 'orc', 42, 48, (g) => {
      g.fillStyle(0x1a1511, 0.3).fillEllipse(21, 44, 34, 7);
      g.fillStyle(0x542d28).fillRoundedRect(7, 25, 28, 20, 5);
      g.fillStyle(0x597e3c).fillCircle(21, 17, 13);
      g.fillTriangle(10, 15, 2, 9, 10, 22).fillTriangle(32, 15, 40, 9, 32, 22);
      g.fillStyle(0xefcb61).fillCircle(16, 16, 2).fillCircle(26, 16, 2);
      g.fillStyle(0xe6d3ad).fillTriangle(14, 24, 18, 18, 19, 25).fillTriangle(23, 25, 24, 18, 28, 24);
      g.fillStyle(0xb0a2a0).fillRect(5, 28, 32, 5);
    });

    makeTexture(this, 'floor', 64, 64, (g) => {
      g.fillStyle(0x6e5b43).fillRect(0, 0, 64, 64);
      g.fillStyle(0x9a7d55).fillRect(1, 1, 62, 14).fillRect(1, 17, 62, 14).fillRect(1, 33, 62, 14).fillRect(1, 49, 62, 14);
      g.lineStyle(1, 0x4d3d2c, 0.8);
      g.lineBetween(0, 16, 64, 16).lineBetween(0, 32, 64, 32).lineBetween(0, 48, 64, 48);
      g.lineBetween(19, 0, 19, 16).lineBetween(48, 16, 48, 32).lineBetween(27, 32, 27, 48).lineBetween(54, 48, 54, 64);
    });

    makeTexture(this, 'prop', 52, 52, (g) => {
      g.fillStyle(0x211a16, 0.35).fillEllipse(26, 47, 42, 8);
      g.fillStyle(0x8b633d).fillRoundedRect(4, 8, 44, 38, 7);
      g.fillStyle(0xb58a52).fillRoundedRect(8, 11, 36, 28, 5);
      g.lineStyle(3, 0x3b2a20, 1).strokeRoundedRect(4, 8, 44, 38, 7);
      g.fillStyle(0xd8b45f).fillCircle(26, 25, 4);
    });

    makeTexture(this, 'marker', 14, 14, (g) => {
      g.fillStyle(0xf6d675, 0.25).fillCircle(7, 7, 7);
      g.fillStyle(0xffe69b).fillCircle(7, 7, 4);
    });

    makeTexture(this, 'torch', 20, 40, (g) => {
      g.fillStyle(0x6b4128).fillRect(8, 17, 4, 23);
      g.fillStyle(0xff8a2a, 0.3).fillCircle(10, 12, 10);
      g.fillStyle(0xf5c64d).fillTriangle(4, 16, 10, 0, 16, 16);
      g.fillStyle(0xfff0a0).fillTriangle(7, 15, 11, 6, 13, 15);
    });

    generateMonsterTextures(this);

    this.scene.start('Login');
  }
}
