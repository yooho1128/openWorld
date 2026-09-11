import Phaser from 'phaser';

export class NPC {
  constructor(scene, x, y, id, name, texture) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.sprite = scene.physics.add.staticSprite(x, y, texture);
    this.sprite.setData('owner', this);
    this.interactRadius = 80;
  }

  distanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }
}
