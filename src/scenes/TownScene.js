import Phaser from 'phaser';
import { availableLocations } from '../data/locations.js';
import { getInterior } from '../data/interiors.js';
import { getLifeStage } from '../state/character.js';
import { getWealthTier } from '../data/wealth.js';

const GRID_COLS = 3;
const GRID_START_X = 90;
const GRID_START_Y = 150;
const GRID_SPACING_X = 150;
const GRID_SPACING_Y = 130;
const INTERACT_DISTANCE = 55;

const STAGE_LABEL = { infant: '유아기', child: '유년기', teen: '청소년기', adult: '성인' };

export class TownScene extends Phaser.Scene {
  constructor() {
    super('Town');
  }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) {
      this.scene.start('Login');
      return;
    }
    if (!this.character.alive) {
      this.scene.start('Ending');
      return;
    }

    // Ages 0-6 pass in a blink so play starts once there's something to do.
    if (this.character.age < 7) {
      this.character.age = 7;
      this.character.history.push('7세 - 유아기를 지나 어린이가 되었다.');
    }

    // School years are spent stat-building; the job/path choice happens once,
    // right at the doorstep of adulthood, informed by whatever stats grew.
    if (this.character.age >= 19 && !this.character.job) {
      this.scene.start('Career');
      return;
    }

    this.add.tileSprite(0, 0, 480, 800, 'ground').setOrigin(0, 0);

    this.buildings = this.buildBuildings();

    this.playerSprite = this.add.sprite(240, 720, 'player');
    this.playerPos = { x: 240, y: 720 };

    this.promptText = this.add.text(240, 690, '', {
      fontSize: '13px',
      color: '#ffffaa',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setVisible(false);

    this.hud = this.add.text(8, 4, '', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    });
    this.refreshHud();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D,E,SPACE');

    this.persist();
  }

  buildBuildings() {
    const locations = availableLocations(this.character);
    const entries = locations.map((loc) => ({ kind: 'location', data: loc }));
    entries.push({ kind: 'lottery', data: { id: 'lottery', name: '복권방', emoji: '🎟️', color: 0xaa55ff, minAge: 19 } });

    return entries.map((entry, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = GRID_START_X + col * GRID_SPACING_X;
      const y = GRID_START_Y + row * GRID_SPACING_Y;
      const locked = entry.data.minAge !== undefined && this.character.age < entry.data.minAge;

      const sprite = this.add.sprite(x, y, 'building').setScale(0.7);
      sprite.setTint(locked ? 0x555555 : entry.data.color);
      const housingSuffix = entry.data.id === 'home' ? ` (${getWealthTier(this.character.wealthTier).housing})` : '';
      this.add.text(x, y + 38, `${entry.data.emoji} ${entry.data.name}${housingSuffix}`, {
        fontSize: '11px',
        color: locked ? '#888888' : '#ffffff',
        align: 'center',
      }).setOrigin(0.5);

      return { ...entry, x, y, locked };
    });
  }

  refreshHud() {
    const c = this.character;
    const stage = STAGE_LABEL[getLifeStage(c.age)];
    const statLine = Object.entries(c.stats).map(([k, v]) => `${k[0].toUpperCase()}${v}`).join(' ');
    this.hud.setText(
      `${c.name} (${c.gender === 'male' ? '남' : '여'}) | ${c.age}세 · ${stage}\n` +
      `${c.money.toLocaleString()}원 | ${statLine}`
    );
  }

  update(_, delta) {
    if (!this.character.alive) return;
    const speed = 160 * (delta / 1000);
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= speed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += speed;

    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x + dx, 16, 464);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y + dy, 90, 780);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    const near = this.buildings.find(
      (b) => Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, b.x, b.y) < INTERACT_DISTANCE
    );

    if (near) {
      this.promptText.setPosition(this.playerPos.x, this.playerPos.y - 30);
      this.promptText.setText(near.locked ? `${near.data.name}: 아직 이용할 수 없다` : `[E] ${near.data.name} 들어가기`);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }

    const interactPressed = Phaser.Input.Keyboard.JustDown(this.wasd.E) || Phaser.Input.Keyboard.JustDown(this.wasd.SPACE);
    if (near && !near.locked && interactPressed) {
      this.enter(near);
    }
  }

  enter(entry) {
    if (entry.kind === 'lottery') {
      this.scene.start('Lottery');
      return;
    }
    if (getInterior(entry.data.id)) {
      this.scene.start('Indoor', { locationId: entry.data.id });
      return;
    }
    this.scene.start('Location', { locationId: entry.data.id });
  }

  persist() {
    const nickname = this.registry.get('nickname');
    if (!nickname) return;
    fetch('/api/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, character: this.character }),
    }).catch(() => {});
  }
}
