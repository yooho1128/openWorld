import Phaser from 'phaser';
import { NPC } from '../entities/NPC.js';
import { initDialogueUI, openDialogue, closeDialogue, isDialogueOpen, appendMessage, setLoading } from '../ui/dialogueUI.js';
import { initElevatorUI, openElevatorPanel, closeElevatorPanel, isElevatorOpen } from '../ui/elevatorUI.js';

const FLOOR_WIDTH = 1800;
const FLOOR_HEIGHT = 1100;
const TILE_SIZE = 64;
const PLAYER_SPEED = 220;
const ELEVATOR_X = FLOOR_WIDTH / 2;
const ELEVATOR_Y = FLOOR_HEIGHT - 90;
const ELEVATOR_INTERACT_RADIUS = 90;
const SPAWN_X = ELEVATOR_X;
const SPAWN_Y = ELEVATOR_Y - 70;

// Building runs from B5 up to 17F, listed top-down like a real elevator panel.
const FLOOR_INDEXES = [];
for (let f = 17; f >= 1; f--) FLOOR_INDEXES.push(f);
for (let b = 1; b <= 5; b++) FLOOR_INDEXES.push(-b);

const FLOOR_NPCS = {
  1: [{ id: 'reception', name: '안내데스크 직원', x: FLOOR_WIDTH * 0.5, y: 220, texture: 'npc_reception' }],
  9: [{ id: 'teamlead', name: '김 팀장', x: FLOOR_WIDTH * 0.62, y: FLOOR_HEIGHT * 0.45, texture: 'npc_teamlead' }],
  17: [{ id: 'secretary', name: '대표님 비서', x: FLOOR_WIDTH * 0.5, y: 220, texture: 'npc_secretary' }],
  [-3]: [{ id: 'security', name: '경비원 아저씨', x: 220, y: FLOOR_HEIGHT - 220, texture: 'npc_security' }],
};

// Per-floor decor themes. Each theme picks a floor tile and a weighted mix
// of obstacle textures; unlisted floors fall back to 'office'.
const THEMES = {
  office: { tile: 'floor_office', obstacles: [{ tex: 'desk', weight: 0.75 }, { tex: 'plant', weight: 0.25 }], count: 26 },
  lobby: { tile: 'floor_lobby', obstacles: [{ tex: 'plant', weight: 0.6 }, { tex: 'desk', weight: 0.4 }], count: 14 },
  cafe: { tile: 'floor_cafe', obstacles: [{ tex: 'cafe_table', weight: 0.8 }, { tex: 'plant', weight: 0.2 }], count: 18 },
  cafeteria: { tile: 'floor_cafeteria', obstacles: [{ tex: 'dining_table', weight: 0.8 }, { tex: 'plant', weight: 0.2 }], count: 16 },
  server: { tile: 'floor_basement', obstacles: [{ tex: 'server_rack', weight: 1 }], count: 22 },
  parking: { tile: 'floor_basement', obstacles: [{ tex: 'pillar', weight: 0.4 }, { tex: 'car', weight: 0.6 }], count: 24 },
  lounge: { tile: 'floor_lounge', obstacles: [{ tex: 'sofa', weight: 0.7 }, { tex: 'plant', weight: 0.3 }], count: 12, coffeeCount: 8 },
  ceo: { tile: 'floor_lobby', obstacles: [{ tex: 'ceo_desk', weight: 0.3 }, { tex: 'plant', weight: 0.4 }, { tex: 'desk', weight: 0.3 }], count: 10, coffeeCount: 4 },
};

const FLOOR_THEME_MAP = { 1: 'lobby', 2: 'cafe', 15: 'lounge', 17: 'ceo', [-1]: 'server', [-2]: 'cafeteria' };
for (let b = 3; b <= 5; b++) FLOOR_THEME_MAP[-b] = 'parking';

const DEFAULT_COFFEE_COUNT = 12;

function getTheme(floorIndex) {
  return THEMES[FLOOR_THEME_MAP[floorIndex] ?? 'office'];
}

function pickWeighted(rand, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rand() * total;
  for (const item of items) {
    if (roll < item.weight) return item.tex;
    roll -= item.weight;
  }
  return items[items.length - 1].tex;
}

const OBSTACLE_BODY = {
  desk: [48, 22, 4, 10],
  car: [52, 26, 4, 4],
  dining_table: [52, 26, 4, 4],
  cafe_table: [30, 30, 5, 4],
  server_rack: [26, 48, 3, 2],
  sofa: [50, 26, 3, 4],
  ceo_desk: [60, 28, 4, 6],
};

function floorLabel(index) {
  return index > 0 ? `${index}F` : `B${Math.abs(index)}`;
}

// Deterministic PRNG so a floor's desk layout looks the same each time you revisit it.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.score = 0;
    this.currentFloor = 1;
    this.activeNpc = null;
    this.overlayPaused = false;
    this.npcs = [];
  }

  preload() {
    this.generateTextures();
  }

  create() {
    this.physics.world.setBounds(0, 0, FLOOR_WIDTH, FLOOR_HEIGHT);

    this.floorTile = this.add.tileSprite(0, 0, FLOOR_WIDTH, FLOOR_HEIGHT, 'floor_office').setOrigin(0, 0);

    this.obstacles = this.physics.add.staticGroup();
    this.coffees = this.physics.add.group();

    this.elevator = this.physics.add.staticSprite(ELEVATOR_X, ELEVATOR_Y, 'elevator');

    this.player = this.physics.add.sprite(SPAWN_X, SPAWN_Y, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(28, 28).setOffset(2, 4);

    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.overlap(this.player, this.coffees, this.collectCoffee, null, this);

    this.cameras.main.setBounds(0, 0, FLOOR_WIDTH, FLOOR_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-E', (event) => {
      if (isDialogueOpen() || isElevatorOpen()) return; // let 'e' be typed normally in chat
      event.preventDefault();
      this.handleInteractKey();
    });

    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;
    this.movementKeyCodes = [
      KeyCodes.UP, KeyCodes.DOWN, KeyCodes.LEFT, KeyCodes.RIGHT,
      KeyCodes.W, KeyCodes.A, KeyCodes.S, KeyCodes.D,
    ];

    this.scoreText = this.add
      .text(16, 16, '커피: 0', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.floorText = this.add
      .text(this.scale.width - 16, 16, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f5c518',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.interactPrompt = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#00000090',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100)
      .setVisible(false);

    initDialogueUI({
      onSend: (text) => this.sendToNpc(text),
      onClose: () => this.endDialogue(),
    });

    initElevatorUI(FLOOR_INDEXES, {
      onSelect: (floorIndex) => this.changeFloor(floorIndex),
      onClose: () => this.endElevator(),
    });

    this.buildFloor(this.currentFloor);
  }

  generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // office floor tile (carpet)
    g.fillStyle(0xcac2b0, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xbdb49f, 1);
    g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
    g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('floor_office', TILE_SIZE, TILE_SIZE);
    g.clear();

    // basement floor tile (concrete)
    g.fillStyle(0x5a5c62, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x53555b, 1);
    g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
    g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('floor_basement', TILE_SIZE, TILE_SIZE);
    g.clear();

    // lobby floor tile (marble)
    g.fillStyle(0xe9e4d6, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xddd6c4, 1);
    g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
    g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('floor_lobby', TILE_SIZE, TILE_SIZE);
    g.clear();

    // cafe floor tile (warm wood)
    g.fillStyle(0xd8c3a5, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xccb48d, 1);
    g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
    g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('floor_cafe', TILE_SIZE, TILE_SIZE);
    g.clear();

    // cafeteria floor tile (canteen)
    g.fillStyle(0xefe7d0, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xe4dabb, 1);
    g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
    g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('floor_cafeteria', TILE_SIZE, TILE_SIZE);
    g.clear();

    // lounge floor tile (soft carpet)
    g.fillStyle(0xb9c6d0, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xaebbc5, 1);
    g.fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2);
    g.fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('floor_lounge', TILE_SIZE, TILE_SIZE);
    g.clear();

    // player
    g.fillStyle(0x2e86de, 1);
    g.fillRoundedRect(0, 0, 32, 32, 6);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 0, 8, 12, 24, 12);
    g.generateTexture('player', 32, 32);
    g.clear();

    // desk
    g.fillStyle(0x8a5a35, 1);
    g.fillRoundedRect(0, 8, 56, 30, 4);
    g.fillStyle(0x2c2c2c, 1);
    g.fillRect(8, 0, 20, 12);
    g.generateTexture('desk', 56, 40);
    g.clear();

    // plant
    g.fillStyle(0x7a4a2b, 1);
    g.fillRect(8, 22, 16, 10);
    g.fillStyle(0x2f8f4e, 1);
    g.fillCircle(16, 14, 14);
    g.generateTexture('plant', 32, 32);
    g.clear();

    // pillar (basement)
    g.fillStyle(0x8d8f94, 1);
    g.fillRect(0, 0, 36, 36);
    g.fillStyle(0x77797e, 1);
    g.fillRect(4, 4, 28, 28);
    g.generateTexture('pillar', 36, 36);
    g.clear();

    // parked car (top-down)
    g.fillStyle(0x3b5fc4, 1);
    g.fillRoundedRect(0, 4, 52, 22, 8);
    g.fillStyle(0x1f3a80, 1);
    g.fillRoundedRect(14, 0, 24, 12, 4);
    g.generateTexture('car', 52, 28);
    g.clear();

    // server rack (basement)
    g.fillStyle(0x24262b, 1);
    g.fillRect(0, 0, 26, 48);
    g.fillStyle(0x2ecc71, 1);
    g.fillRect(4, 6, 4, 4);
    g.fillStyle(0xf5c518, 1);
    g.fillRect(4, 16, 4, 4);
    g.fillStyle(0xe74c3c, 1);
    g.fillRect(4, 26, 4, 4);
    g.generateTexture('server_rack', 26, 48);
    g.clear();

    // long dining table (cafeteria)
    g.fillStyle(0x9a7550, 1);
    g.fillRoundedRect(0, 6, 52, 16, 4);
    g.fillStyle(0x6f6f6f, 1);
    g.fillRect(4, 0, 8, 26);
    g.fillRect(40, 0, 8, 26);
    g.generateTexture('dining_table', 52, 26);
    g.clear();

    // round cafe table
    g.fillStyle(0x8a5a35, 1);
    g.fillCircle(15, 15, 15);
    g.fillStyle(0x6f6f6f, 1);
    g.fillCircle(4, 26, 5);
    g.fillCircle(26, 26, 5);
    g.generateTexture('cafe_table', 30, 30);
    g.clear();

    // sofa (lounge)
    g.fillStyle(0x3f7f74, 1);
    g.fillRoundedRect(0, 4, 50, 20, 6);
    g.fillStyle(0x336a60, 1);
    g.fillRect(0, 0, 8, 26);
    g.fillRect(42, 0, 8, 26);
    g.generateTexture('sofa', 50, 26);
    g.clear();

    // CEO desk
    g.fillStyle(0x5c3a21, 1);
    g.fillRoundedRect(0, 6, 60, 22, 5);
    g.fillStyle(0xc9a94f, 1);
    g.fillRect(0, 6, 60, 3);
    g.fillStyle(0x2c2c2c, 1);
    g.fillRect(10, 0, 18, 10);
    g.generateTexture('ceo_desk', 60, 28);
    g.clear();

    // coffee cup
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(2, 4, 14, 14, 3);
    g.fillStyle(0x6f4527, 1);
    g.fillRoundedRect(4, 6, 10, 8, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(16, 8, 4, 6);
    g.generateTexture('coffee', 20, 20);
    g.clear();

    // elevator
    g.fillStyle(0x9aa0a6, 1);
    g.fillRoundedRect(0, 0, 64, 40, 4);
    g.fillStyle(0x5c6066, 1);
    g.fillRect(30, 4, 4, 32);
    g.fillStyle(0x2ecc71, 1);
    g.fillCircle(32, 10, 4);
    g.generateTexture('elevator', 64, 40);
    g.clear();

    this.generateNpcTextures(g);
    g.destroy();
  }

  generateNpcTextures(g) {
    const bodies = [
      ['npc_reception', 0xd66ba0],
      ['npc_teamlead', 0x2c3e6b],
      ['npc_secretary', 0x6c5ce7],
      ['npc_security', 0x35424a],
    ];
    for (const [key, color] of bodies) {
      g.clear();
      g.fillStyle(color, 1);
      g.fillRoundedRect(4, 8, 24, 26, 6);
      g.fillStyle(0xf0d9b5, 1);
      g.fillCircle(16, 8, 8);
      g.generateTexture(key, 32, 36);
    }
  }

  buildFloor(floorIndex) {
    this.currentFloor = floorIndex;
    const theme = getTheme(floorIndex);

    this.floorTile.setTexture(theme.tile);
    this.floorText.setText(`현재 층: ${floorLabel(floorIndex)}`);

    this.obstacles.clear(true, true);
    this.coffees.clear(true, true);
    for (const npc of this.npcs) npc.sprite.destroy();
    this.npcs = [];

    const rand = mulberry32(floorIndex * 7919 + 12345);
    const safeRadius = 150;

    for (let i = 0; i < theme.count; i++) {
      const { x, y } = this.randomFloorPoint(rand, safeRadius);
      const texture = pickWeighted(rand, theme.obstacles);
      const obj = this.obstacles.create(x, y, texture);
      const body = OBSTACLE_BODY[texture];
      if (body) {
        const [w, h, ox, oy] = body;
        obj.setSize(w, h).setOffset(ox, oy);
      }
    }

    const coffeeCount = theme.coffeeCount ?? DEFAULT_COFFEE_COUNT;
    for (let i = 0; i < coffeeCount; i++) {
      const { x, y } = this.randomFloorPoint(rand, 80);
      this.coffees.create(x, y, 'coffee');
    }

    const npcDefs = FLOOR_NPCS[floorIndex] ?? [];
    for (const def of npcDefs) {
      const npc = new NPC(this, def.x, def.y, def.id, def.name, def.texture);
      this.obstacles.add(npc.sprite);
      this.npcs.push(npc);
    }
  }

  randomFloorPoint(rand, avoidRadius) {
    let x;
    let y;
    do {
      x = TILE_SIZE + rand() * (FLOOR_WIDTH - TILE_SIZE * 2);
      y = TILE_SIZE + rand() * (FLOOR_HEIGHT - TILE_SIZE * 2);
    } while (Phaser.Math.Distance.Between(x, y, ELEVATOR_X, ELEVATOR_Y) < avoidRadius);
    return { x, y };
  }

  changeFloor(floorIndex) {
    this.buildFloor(floorIndex);
    this.player.setPosition(SPAWN_X, SPAWN_Y);
    this.player.setVelocity(0, 0);
    this.endElevator();
  }

  collectCoffee(player, coffee) {
    coffee.destroy();
    this.score += 1;
    this.scoreText.setText(`커피: ${this.score}`);
  }

  findNearestNpc() {
    let nearest = null;
    let nearestDist = Infinity;
    for (const npc of this.npcs) {
      const dist = npc.distanceTo(this.player.x, this.player.y);
      if (dist < npc.interactRadius && dist < nearestDist) {
        nearest = npc;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  distanceToElevator() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, ELEVATOR_X, ELEVATOR_Y);
  }

  handleInteractKey() {
    if (isDialogueOpen() || isElevatorOpen()) return;

    const npc = this.findNearestNpc();
    const nearElevator = this.distanceToElevator() < ELEVATOR_INTERACT_RADIUS;

    if (npc) {
      this.startDialogue(npc);
    } else if (nearElevator) {
      this.startElevator();
    }
  }

  startDialogue(npc) {
    this.activeNpc = npc;
    this.overlayPaused = true;
    this.player.setVelocity(0, 0);
    this.interactPrompt.setVisible(false);
    this.input.keyboard.clearCaptures();
    openDialogue(npc.name);
  }

  endDialogue() {
    this.activeNpc = null;
    this.overlayPaused = false;
    this.input.keyboard.addCapture(this.movementKeyCodes);
    closeDialogue();
  }

  startElevator() {
    this.overlayPaused = true;
    this.player.setVelocity(0, 0);
    this.interactPrompt.setVisible(false);
    openElevatorPanel(this.currentFloor);
  }

  endElevator() {
    this.overlayPaused = false;
    closeElevatorPanel();
  }

  async sendToNpc(text) {
    const npc = this.activeNpc;
    if (!npc) return;

    appendMessage('player', text);
    setLoading(true);

    try {
      const res = await fetch(`/api/npc/${npc.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error(`status ${res.status}`);

      const data = await res.json();
      appendMessage('npc', data.reply ?? '...');
    } catch (err) {
      console.error('NPC chat failed:', err);
      appendMessage('npc', '(...대답이 없다. 서버 연결을 확인해 주세요.)');
    } finally {
      setLoading(false);
    }
  }

  update() {
    if (this.overlayPaused) {
      this.player.setVelocity(0, 0);
      return;
    }

    const npc = this.findNearestNpc();
    const nearElevator = this.distanceToElevator() < ELEVATOR_INTERACT_RADIUS;

    if (npc) {
      this.interactPrompt.setVisible(true);
      this.interactPrompt.setText('E: 대화하기');
      this.interactPrompt.setPosition(npc.sprite.x, npc.sprite.y - 26);
    } else if (nearElevator) {
      this.interactPrompt.setVisible(true);
      this.interactPrompt.setText('E: 엘리베이터 이용');
      this.interactPrompt.setPosition(ELEVATOR_X, ELEVATOR_Y - 30);
    } else {
      this.interactPrompt.setVisible(false);
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    const vec = new Phaser.Math.Vector2(vx, vy);
    if (vec.length() > 0) vec.normalize().scale(PLAYER_SPEED);
    this.player.setVelocity(vec.x, vec.y);
    if (vx !== 0) this.player.setFlipX(vx < 0);
  }
}
