import Phaser from 'phaser';

const WORLD_SIZE = 4000;
const TILE_SIZE = 64;
const TREE_COUNT = 140;
const ROCK_COUNT = 80;
const COIN_COUNT = 60;
const PLAYER_SPEED = 220;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.score = 0;
  }

  preload() {
    this.generateTextures();
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    this.add
      .tileSprite(0, 0, WORLD_SIZE, WORLD_SIZE, 'grass')
      .setOrigin(0, 0);

    this.obstacles = this.physics.add.staticGroup();
    this.placeObstacles();

    this.coins = this.physics.add.group();
    this.placeCoins();

    this.player = this.physics.add.sprite(WORLD_SIZE / 2, WORLD_SIZE / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(28, 28).setOffset(2, 4);

    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.scoreText = this.add
      .text(16, 16, 'Coins: 0', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.createMinimap();
  }

  generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // grass tile
    g.fillStyle(0x3a6b35, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x437a3d, 1);
    g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
    g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('grass', TILE_SIZE, TILE_SIZE);
    g.clear();

    // player
    g.fillStyle(0x2e86de, 1);
    g.fillRoundedRect(0, 0, 32, 32, 6);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 0, 8, 12, 24, 12);
    g.generateTexture('player', 32, 32);
    g.clear();

    // tree
    g.fillStyle(0x5b3a29, 1);
    g.fillRect(20, 30, 8, 18);
    g.fillStyle(0x1f5e2e, 1);
    g.fillCircle(24, 20, 20);
    g.generateTexture('tree', 48, 48);
    g.clear();

    // rock
    g.fillStyle(0x7a7a7a, 1);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x8f8f8f, 1);
    g.fillCircle(12, 12, 6);
    g.generateTexture('rock', 32, 32);
    g.clear();

    // coin
    g.fillStyle(0xf5c518, 1);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xffe27a, 1);
    g.fillCircle(10, 10, 5);
    g.generateTexture('coin', 20, 20);
    g.destroy();
  }

  placeObstacles() {
    const safeRadius = 200;
    const centerX = WORLD_SIZE / 2;
    const centerY = WORLD_SIZE / 2;

    for (let i = 0; i < TREE_COUNT; i++) {
      const { x, y } = this.randomWorldPoint(centerX, centerY, safeRadius);
      this.obstacles.create(x, y, 'tree').setSize(20, 16).setOffset(14, 30);
    }

    for (let i = 0; i < ROCK_COUNT; i++) {
      const { x, y } = this.randomWorldPoint(centerX, centerY, safeRadius);
      this.obstacles.create(x, y, 'rock');
    }
  }

  placeCoins() {
    const safeRadius = 100;
    const centerX = WORLD_SIZE / 2;
    const centerY = WORLD_SIZE / 2;

    for (let i = 0; i < COIN_COUNT; i++) {
      const { x, y } = this.randomWorldPoint(centerX, centerY, safeRadius);
      this.coins.create(x, y, 'coin');
    }
  }

  randomWorldPoint(avoidX, avoidY, avoidRadius) {
    let x;
    let y;
    do {
      x = Phaser.Math.Between(TILE_SIZE, WORLD_SIZE - TILE_SIZE);
      y = Phaser.Math.Between(TILE_SIZE, WORLD_SIZE - TILE_SIZE);
    } while (Phaser.Math.Distance.Between(x, y, avoidX, avoidY) < avoidRadius);
    return { x, y };
  }

  createMinimap() {
    const mapSize = 180;
    const padding = 12;
    const zoom = mapSize / WORLD_SIZE;

    this.minimap = this.cameras
      .add(
        this.scale.width - mapSize - padding,
        padding,
        mapSize,
        mapSize
      )
      .setZoom(zoom)
      .setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
      .setName('minimap')
      .setBackgroundColor(0x000000);

    this.minimap.scrollX = 0;
    this.minimap.scrollY = 0;
    this.minimap.centerOn(WORLD_SIZE / 2, WORLD_SIZE / 2);
    this.minimap.ignore(this.scoreText);
  }

  collectCoin(player, coin) {
    coin.destroy();
    this.score += 1;
    this.scoreText.setText(`Coins: ${this.score}`);
  }

  update() {
    const speed = PLAYER_SPEED;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    const vec = new Phaser.Math.Vector2(vx, vy);
    if (vec.length() > 0) {
      vec.normalize().scale(speed);
    }
    this.player.setVelocity(vec.x, vec.y);

    if (vx !== 0) {
      this.player.setFlipX(vx < 0);
    }
  }
}
