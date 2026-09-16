import Phaser from 'phaser';

// All game-critical sprites are drawn with Graphics rather than emoji glyphs:
// headless/some browsers have no color-emoji font, which makes emoji Text
// objects silently invisible. Emoji only ever appear as decorative HUD text.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const groundGfx = this.make.graphics({ x: 0, y: 0, add: false });
    groundGfx.fillStyle(0x3f7d3f, 1);
    groundGfx.fillRect(0, 0, 64, 64);
    groundGfx.lineStyle(1, 0x356b35, 1);
    groundGfx.strokeRect(0, 0, 64, 64);
    groundGfx.generateTexture('ground', 64, 64);
    groundGfx.destroy();

    const buildingGfx = this.make.graphics({ x: 0, y: 0, add: false });
    buildingGfx.fillStyle(0xffffff, 1);
    buildingGfx.fillRoundedRect(0, 0, 96, 96, 10);
    buildingGfx.lineStyle(3, 0x1b1b22, 1);
    buildingGfx.strokeRoundedRect(0, 0, 96, 96, 10);
    buildingGfx.fillStyle(0x1b1b22, 1);
    buildingGfx.fillRoundedRect(32, 60, 32, 36, 4);
    buildingGfx.generateTexture('building', 96, 96);
    buildingGfx.destroy();

    const playerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    playerGfx.fillStyle(0xffd27a, 1);
    playerGfx.fillCircle(16, 14, 12);
    playerGfx.fillStyle(0x3454d1, 1);
    playerGfx.fillRoundedRect(4, 22, 24, 16, 6);
    playerGfx.generateTexture('player', 32, 40);
    playerGfx.destroy();

    const markerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    markerGfx.fillStyle(0xffe066, 1);
    markerGfx.fillCircle(6, 6, 6);
    markerGfx.generateTexture('marker', 12, 12);
    markerGfx.destroy();

    const floorGfx = this.make.graphics({ x: 0, y: 0, add: false });
    floorGfx.fillStyle(0xc9a66b, 1);
    floorGfx.fillRect(0, 0, 64, 64);
    floorGfx.lineStyle(1, 0xa9865a, 1);
    floorGfx.strokeRect(0, 0, 64, 64);
    floorGfx.generateTexture('floor', 64, 64);
    floorGfx.destroy();

    // Plain tintable rounded rect for indoor furniture/props.
    const propGfx = this.make.graphics({ x: 0, y: 0, add: false });
    propGfx.fillStyle(0xffffff, 1);
    propGfx.fillRoundedRect(0, 0, 48, 48, 8);
    propGfx.lineStyle(2, 0x1b1b22, 1);
    propGfx.strokeRoundedRect(0, 0, 48, 48, 8);
    propGfx.generateTexture('prop', 48, 48);
    propGfx.destroy();

    this.scene.start('Login');
  }
}
