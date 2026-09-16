import Phaser from 'phaser';
import { availableLocations } from '../data/locations.js';
import { getInterior } from '../data/interiors.js';
import { getLifeStage, getJobInfo, computeLifeScore, updateQuest } from '../state/character.js';
import { getWealthTier } from '../data/wealth.js';
import { STATS } from '../data/stats.js';
import { createTouchControls } from '../ui/touchControls.js';
import { fantasyName, HUD_STYLE, PROMPT_STYLE } from '../ui/fantasyTheme.js';
import { monstersForLocation } from '../data/monsters.js';

const GRID_COLS = 3;
const GRID_START_X = 90;
const GRID_START_Y = 150;
const GRID_SPACING_X = 150;
const GRID_SPACING_Y = 130;
const INTERACT_DISTANCE = 65;
const MOVE_SPEED = 190;
const DREAM_TARGET = 70;

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
    this.buildTownBackdrop();

    this.buildings = this.buildBuildings();

    this.playerSprite = this.add.sprite(240, 720, 'player').setDepth(20);
    this.playerPos = { x: 240, y: 720 };

    this.promptText = this.add.text(240, 690, '', PROMPT_STYLE).setOrigin(0.5).setDepth(30).setVisible(false);

    this.hud = this.add.text(8, 4, '', HUD_STYLE).setDepth(50);

    const completedQuest = updateQuest(this.character);
    this.refreshHud();
    if (completedQuest) {
      this.toast(`목표 달성! ${STATS[completedQuest.statKey]?.label ?? completedQuest.statKey} ${completedQuest.target} 도달 — 보너스 획득!`);
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D,E,SPACE');
    this.touch = createTouchControls(this);
    this.wasd.M = this.input.keyboard.addKey('M');
    this.buildDexButton();

    this.persist();
  }

  buildDexButton() {
    const bg = this.add.rectangle(426, 38, 90, 44, 0x332218, 0.94)
      .setStrokeStyle(2, 0xd1a75a, 0.9).setDepth(100).setInteractive({ useHandCursor: true });
    this.add.text(426, 38, '도감 120', {
      fontSize: '12px', fontStyle: 'bold', color: '#ffe7a9',
    }).setOrigin(0.5).setDepth(101);
    bg.on('pointerdown', () => this.scene.start('MonsterDex'));
  }

  buildTownBackdrop() {
    this.add.tileSprite(0, 112, 480, 54, 'cobble').setOrigin(0).setAlpha(0.72);
    this.add.tileSprite(215, 110, 52, 690, 'cobble').setOrigin(0).setAlpha(0.72);
    const decor = this.add.graphics();
    decor.fillStyle(0x172f23, 0.75);
    decor.fillCircle(25, 185, 28).fillCircle(458, 230, 32).fillCircle(24, 495, 34).fillCircle(458, 545, 30);
    decor.fillStyle(0x6a5c43, 0.8);
    [[35, 300], [445, 390], [35, 620], [452, 700]].forEach(([x, y]) => decor.fillEllipse(x, y, 18, 10));
    this.add.text(240, 113, '✦  에버글렌 왕국  ✦', {
      fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '15px', fontStyle: 'bold',
      color: '#f4dda0', backgroundColor: '#1a160fdd', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(5);

    const creatures = [
      this.add.sprite(35, 560, 'monster-forest-slime').setScale(0.72),
      this.add.sprite(445, 650, 'monster-forest-goblin').setScale(0.68),
    ];
    creatures.forEach((creature, i) => {
      creature.setAlpha(0.9).setDepth(4);
      this.tweens.add({ targets: creature, y: creature.y - 5, duration: 850 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  toast(message) {
    const text = this.add.text(240, 100, message, {
      fontSize: '13px',
      color: '#ffeab4',
      backgroundColor: '#24170eef',
      padding: { x: 10, y: 7 },
      wordWrap: { width: 420 },
      align: 'center',
    }).setOrigin(0.5).setDepth(100);
    this.time.delayedCall(2200, () => text.destroy());
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

      this.add.circle(x, y + 8, 43, locked ? 0x343434 : entry.data.color, locked ? 0.16 : 0.2);
      const sprite = this.add.sprite(x, y, 'building').setScale(0.72).setDepth(3);
      if (locked) sprite.setTint(0x565656);
      const housingSuffix = entry.data.id === 'home' ? ` (${getWealthTier(this.character.wealthTier).housing})` : '';
      this.add.text(x, y + 43, `${fantasyName(entry.data)}${housingSuffix}`, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: locked ? '#908b80' : '#fff0c5',
        backgroundColor: '#1d160fd9',
        padding: { x: 5, y: 3 },
        align: 'center',
      }).setOrigin(0.5).setDepth(6);

      if (!locked && (entry.data.dangerLevel ?? 0) >= 2) {
        const localMonsters = monstersForLocation(entry.data.id, 3);
        const monsterData = localMonsters[entry.data.dangerLevel >= 3 ? 2 : 1] ?? localMonsters[0];
        const monster = this.add.sprite(x + 38, y + 16, monsterData.texture).setScale(0.42).setDepth(5);
        this.tweens.add({ targets: monster, angle: 4, duration: 600, yoyo: true, repeat: -1 });
      }

      return { ...entry, x, y, locked };
    });
  }

  refreshHud() {
    const c = this.character;
    const stage = STAGE_LABEL[getLifeStage(c.age)];
    const statLine = Object.entries(c.stats).map(([k, v]) => `${k[0].toUpperCase()}${v}`).join(' ');
    const lifeScore = computeLifeScore(c);

    const job = getJobInfo(c);
    const goalLine = job
      ? `꿈: ${job.label} — ${STATS[job.primaryStat]?.label ?? job.primaryStat} ${Math.min(c.stats[job.primaryStat] ?? 0, DREAM_TARGET)}/${DREAM_TARGET}`
      : '꿈: 아직 못 정했다 (성인이 되면 정하게 된다)';

    const q = c.quest;
    const questLine = q
      ? `목표: ${STATS[q.statKey]?.label ?? q.statKey} ${Math.min(c.stats[q.statKey] ?? 0, q.target)}/${q.target} (보너스 있음)`
      : '';

    this.hud.setText(
      `${c.name} (${c.gender === 'male' ? '남' : '여'}) | ${c.age}세 · ${stage} | 인생점수 ${lifeScore}\n` +
      `${c.money.toLocaleString()}원 | ${statLine}\n` +
      `${goalLine}\n${questLine}`
    );
  }

  update(_, delta) {
    if (!this.character.alive) return;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown || this.touch.state.left) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown || this.touch.state.right) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown || this.touch.state.up) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown || this.touch.state.down) dy += 1;

    if (dx !== 0 || dy !== 0) {
      // Normalize so diagonal movement isn't ~41% faster than cardinal moves.
      const len = Math.hypot(dx, dy);
      const speed = MOVE_SPEED * (delta / 1000);
      dx = (dx / len) * speed;
      dy = (dy / len) * speed;
    }

    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x + dx, 16, 464);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y + dy, 90, 780);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    const near = this.buildings.find(
      (b) => Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, b.x, b.y) < INTERACT_DISTANCE
    );

    if (near) {
      this.promptText.setPosition(this.playerPos.x, this.playerPos.y - 30);
      const placeName = fantasyName(near.data);
      this.promptText.setText(near.locked ? `${placeName}: 아직 봉인이 풀리지 않았다` : `[E] ${placeName} 입장`);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }

    const interactPressed = Phaser.Input.Keyboard.JustDown(this.wasd.E)
      || Phaser.Input.Keyboard.JustDown(this.wasd.SPACE)
      || this.touch.consumeInteract();
    if (near && !near.locked && interactPressed) {
      this.enter(near);
    }
    if (Phaser.Input.Keyboard.JustDown(this.wasd.M)) this.scene.start('MonsterDex');
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
