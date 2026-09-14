import Phaser from 'phaser';
import { STAGES, INFINITE_MODE, pickObstacleType } from '../data/stages.js';
import { FLIP_EVENT_MESSAGES, SIDESCROLL_EVENT_MESSAGES } from '../data/events.js';
import { loadSave, writeSave } from '../state/save.js';
import { getEquipmentEffects } from '../data/equipment.js';
import { PLAY_MARGIN } from '../data/layout.js';
import * as sfx from '../audio/sfx.js';

const LANE_COUNT = 3;
const PLAYER_Y_FRAC = 0.8;
const BASE_LANE_SWITCH_MS = 140;
const HIT_INVULN_MS = 1200;
const BASE_START_INVULN_MS = 800;
const COFFEE_SPAWN_RANGE_MS = [500, 900];
const OBSTACLE_TEXTURES = ['ob_box', 'ob_folder', 'ob_cabinet'];
// Scales raw scroll pixels down to a calmer "meters" number for the HUD/goal,
// independent of the actual on-screen scroll speed (which stays in pixels/sec).
const PIXELS_PER_METER = 60;
// Obstacles/coffee spawn tiny and grow to full size as they reach the
// player, for a cheap "coming at you" depth cue without a real 3D engine.
const SPAWN_SCALE = 0.35;
const STREAK_MILESTONE = 5;
const JUMP_DURATION_MS = 380;
const JUMP_INVULN_MS = 460;
const DUCK_DURATION_MS = 380;
const DUCK_INVULN_MS = 460;
const INTRO_DURATION_MS = 1300;
const ACTION_BUTTON_ZONE_PX = 100;
const EVENT_DISTANCE_RANGE = [80, 140]; // meters between random events
const FLIP_EVENT_DURATION_MS = 5000;
const SIDESCROLL_OBSTACLE_COUNT = 6;
const SIDESCROLL_SPAWN_RANGE_MS = [700, 1000];

function shrinkRect(rect, factor) {
  const dw = (rect.width * (1 - factor)) / 2;
  const dh = (rect.height * (1 - factor)) / 2;
  return new Phaser.Geom.Rectangle(rect.x + dw, rect.y + dh, rect.width - dw * 2, rect.height - dh * 2);
}

export class RunScene extends Phaser.Scene {
  constructor() {
    super('Run');
  }

  init(data) {
    this.isInfinite = data.stageId === 'infinite';
    this.stage = this.isInfinite ? INFINITE_MODE : STAGES.find((s) => s.id === data.stageId) ?? STAGES[0];
    this.skipIntro = data.skipIntro === true;

    this.save = loadSave();
    if (!this.isInfinite) {
      this.save.attempts[this.stage.id] = (this.save.attempts[this.stage.id] ?? 0) + 1;
      this.currentAttempt = this.save.attempts[this.stage.id];
      writeSave(this.save);
    }
    this.effects = getEquipmentEffects(this.save);

    const playWidth = this.scale.width - PLAY_MARGIN * 2;
    this.laneX = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      this.laneX.push(PLAY_MARGIN + (playWidth / LANE_COUNT) * (i + 0.5));
    }
    this.lane = 1;

    this.elapsedSeconds = 0;
    this.distance = 0;
    this.lives = 3 + this.effects.extraLives;
    this.sessionCoffee = 0;
    this.hits = 0;
    this.streak = 0;
    this.running = true;
    this.introActive = !this.skipIntro;
    this.invulnerableUntil = 0;
    this.jumpUntil = 0;
    this.duckUntil = 0;
    this.jumpActive = false;
    this.duckActive = false;
    this.autoSavesRemaining = this.effects.autoSave;

    this.obstacles = [];
    this.coffees = [];
    this.obstacleTimer = 600;
    this.coffeeTimer = Phaser.Math.Between(...COFFEE_SPAWN_RANGE_MS);

    // Random mid-run events.
    this.mode = 'vertical';
    this.controlsReversed = false;
    this.flipActive = false;
    this.nextEventAt = Phaser.Math.Between(70, 110);
    this.sidescrollObstacles = [];
  }

  create() {
    const { width, height } = this.scale;
    const playWidth = width - PLAY_MARGIN * 2;
    this.playerY = height * PLAYER_Y_FRAC;

    this.sceneryLeft = this.add
      .tileSprite(0, 0, PLAY_MARGIN, height, 'scenery_strip')
      .setOrigin(0, 0)
      .setTint(this.stage.sceneryTint ?? 0x888888);
    this.sceneryRight = this.add
      .tileSprite(width - PLAY_MARGIN, 0, PLAY_MARGIN, height, 'scenery_strip')
      .setOrigin(0, 0)
      .setFlipX(true)
      .setTint(this.stage.sceneryTint ?? 0x888888);

    this.bg = this.add
      .tileSprite(PLAY_MARGIN, 0, playWidth, height, 'runner_bg')
      .setOrigin(0, 0)
      .setTint(this.stage.floorTint ?? 0xffffff);

    this.player = this.add.image(this.laneX[this.lane], this.playerY, 'player_runner');
    this.invulnerableUntil = this.time.now + BASE_START_INVULN_MS + this.effects.startInvulnBonusMs;

    this.add
      .text(width / 2, 6, this.stage.name, { fontFamily: 'monospace', fontSize: '14px', color: '#f5c518', backgroundColor: '#00000080', padding: { x: 6, y: 2 } })
      .setOrigin(0.5, 0)
      .setDepth(100);

    this.livesText = this.add
      .text(12, 30, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ff6b6b', backgroundColor: '#00000080', padding: { x: 6, y: 3 } })
      .setScrollFactor(0)
      .setDepth(100);

    this.distanceText = this.add
      .text(width / 2, 30, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', backgroundColor: '#00000080', padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 0)
      .setDepth(100);

    this.coffeeText = this.add
      .text(width - 12, 30, '', { fontFamily: 'monospace', fontSize: '18px', color: '#f5c518', backgroundColor: '#00000080', padding: { x: 6, y: 3 } })
      .setOrigin(1, 0)
      .setDepth(100);

    this.updateHud();

    this.input.keyboard.on('keydown-LEFT', () => this.moveLane(-1));
    this.input.keyboard.on('keydown-A', () => this.moveLane(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.moveLane(1));
    this.input.keyboard.on('keydown-D', () => this.moveLane(1));
    this.input.keyboard.on('keydown-UP', () => this.jump());
    this.input.keyboard.on('keydown-SPACE', () => this.jump());
    this.input.keyboard.on('keydown-DOWN', () => this.duck());
    this.input.keyboard.on('keydown-S', () => this.duck());

    // Mobile/touch: tap the left or right half of the screen to switch lanes.
    // The bottom strip is reserved for the on-screen buttons.
    this.input.on('pointerdown', (pointer) => {
      if (this.introActive) {
        this.finishIntro();
        return;
      }
      if (pointer.y > height - ACTION_BUTTON_ZONE_PX) return;
      this.moveLane(pointer.x < width / 2 ? -1 : 1);
    });

    this.createActionButtons();

    const hint = this.add
      .text(width / 2, height * PLAYER_Y_FRAC - 90, '화면 좌/우 탭 · ←/→ 이동', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({ targets: hint, alpha: 0, delay: 2400, duration: 500, onComplete: () => hint.destroy() });

    this.resultLayer = null;

    if (this.introActive) this.playIntro();
  }

  createActionButtons() {
    const { width, height } = this.scale;
    const btnY = height - ACTION_BUTTON_ZONE_PX / 2 - 10;

    this.rightBtn = this.add
      .rectangle(width - 66, btnY, 108, 70, 0x2e86de, 0.55)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(120)
      .setInteractive({ useHandCursor: true });
    this.rightBtnLabel = this.add
      .text(width - 66, btnY, '➡\n오른쪽', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(121);
    this.rightBtn.on('pointerdown', () => this.moveLane(1));

    this.leftBtn = this.add
      .rectangle(66, btnY, 108, 70, 0xc0392b, 0.55)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(120)
      .setInteractive({ useHandCursor: true });
    this.leftBtnLabel = this.add
      .text(66, btnY, '⬅\n왼쪽', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(121);
    this.leftBtn.on('pointerdown', () => this.moveLane(-1));

    this.jumpBtn = this.add
      .rectangle(width - 66, btnY, 108, 70, 0x2e86de, 0.55)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(120)
      .setInteractive({ useHandCursor: true });
    this.jumpBtnLabel = this.add
      .text(width - 66, btnY, '⬆\n점프', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(121);
    this.jumpBtn.on('pointerdown', () => this.jump());

    this.duckBtn = this.add
      .rectangle(66, btnY, 108, 70, 0xc0392b, 0.55)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(120)
      .setInteractive({ useHandCursor: true });
    this.duckBtnLabel = this.add
      .text(66, btnY, '⬇\n숙이기', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(121);
    this.duckBtn.on('pointerdown', () => this.duck());

    this.setSidescrollButtons(false);
  }

  setSidescrollButtons(active) {
    this.leftBtn.setVisible(!active);
    this.leftBtnLabel.setVisible(!active);
    this.rightBtn.setVisible(!active);
    this.rightBtnLabel.setVisible(!active);
    this.jumpBtn.setVisible(active);
    this.jumpBtnLabel.setVisible(active);
    this.duckBtn.setVisible(active);
    this.duckBtnLabel.setVisible(active);

    if (active) {
      this.leftBtn.disableInteractive();
      this.rightBtn.disableInteractive();
      this.jumpBtn.setInteractive({ useHandCursor: true });
      this.duckBtn.setInteractive({ useHandCursor: true });
    } else {
      this.jumpBtn.disableInteractive();
      this.duckBtn.disableInteractive();
      this.leftBtn.setInteractive({ useHandCursor: true });
      this.rightBtn.setInteractive({ useHandCursor: true });
    }
  }

  playIntro() {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0, 0).setDepth(300);
    const door = this.add.image(width / 2, height / 2 - 70, 'house_door').setDepth(301);
    const line1 = this.add
      .text(width / 2, height / 2 + 100, '출근길, 대문을 나선다...', { fontFamily: 'monospace', fontSize: '17px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(301);
    const line2 = this.add
      .text(width / 2, height / 2 + 130, `(${this.stage.name} · 탭하면 건너뛰기)`, { fontFamily: 'monospace', fontSize: '12px', color: '#999999' })
      .setOrigin(0.5)
      .setDepth(301);
    this.introObjects = [overlay, door, line1, line2];
    this.introTimer = this.time.delayedCall(INTRO_DURATION_MS, () => this.finishIntro());
  }

  finishIntro() {
    if (!this.introActive) return;
    this.introActive = false;
    if (this.introTimer) {
      this.introTimer.remove();
      this.introTimer = null;
    }
    for (const obj of this.introObjects ?? []) obj.destroy();
    this.introObjects = null;
  }

  moveLane(delta) {
    if (this.introActive) {
      this.finishIntro();
      return;
    }
    if (!this.running || this.mode !== 'vertical') return;
    if (this.controlsReversed) delta = -delta;
    const next = Phaser.Math.Clamp(this.lane + delta, 0, LANE_COUNT - 1);
    if (next === this.lane) return;
    this.lane = next;
    this.tweens.add({
      targets: this.player,
      x: this.laneX[this.lane],
      duration: BASE_LANE_SWITCH_MS / this.effects.laneSpeedMult,
      ease: 'Quad.Out',
    });
  }

  jump() {
    if (this.introActive) {
      this.finishIntro();
      return;
    }
    if (!this.running || this.mode !== 'sidescroll' || this.jumpActive || this.duckActive) return;
    this.jumpActive = true;
    this.jumpUntil = this.time.now + JUMP_INVULN_MS + this.effects.actionInvulnBonusMs;
    sfx.playJump();
    this.tweens.add({
      targets: this.player,
      y: this.playerY - 34,
      scale: 1.15,
      duration: JUMP_DURATION_MS / 2,
      yoyo: true,
      ease: 'Sine.Out',
      onComplete: () => {
        this.jumpActive = false;
        this.player.setScale(1);
        this.player.y = this.playerY;
      },
    });
  }

  duck() {
    if (this.introActive) {
      this.finishIntro();
      return;
    }
    if (!this.running || this.mode !== 'sidescroll' || this.jumpActive || this.duckActive) return;
    this.duckActive = true;
    this.duckUntil = this.time.now + DUCK_INVULN_MS + this.effects.actionInvulnBonusMs;
    sfx.playDuck();
    this.tweens.add({
      targets: this.player,
      scaleY: 0.45,
      duration: DUCK_DURATION_MS / 2,
      yoyo: true,
      ease: 'Sine.Out',
      onComplete: () => {
        this.duckActive = false;
        this.player.setScale(1);
      },
    });
  }

  showEventBanner(text) {
    const { width } = this.scale;
    const banner = this.add
      .text(width / 2, 60, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#000000a0',
        padding: { x: 10, y: 6 },
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5)
      .setDepth(160)
      .setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 200 });
    this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: banner, alpha: 0, duration: 400, onComplete: () => banner.destroy() });
    });
  }

  scheduleNextEvent() {
    this.nextEventAt = this.distance + Phaser.Math.Between(...EVENT_DISTANCE_RANGE);
  }

  triggerRandomEvent() {
    this.scheduleNextEvent();
    if (Math.random() < 0.5) this.startFlipEvent();
    else this.startSidescrollEvent();
  }

  startFlipEvent() {
    this.flipActive = true;
    this.controlsReversed = true;
    this.showEventBanner(Phaser.Utils.Array.GetRandom(FLIP_EVENT_MESSAGES));
    this.flipIndicator = this.add
      .text(this.scale.width / 2, 56, '⚠ 조작 반전!', { fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#ff8fa8', backgroundColor: '#00000090', padding: { x: 8, y: 3 } })
      .setOrigin(0.5)
      .setDepth(140);
    this.time.delayedCall(FLIP_EVENT_DURATION_MS, () => {
      this.controlsReversed = false;
      this.flipActive = false;
      this.flipIndicator?.destroy();
      this.flipIndicator = null;
    });
  }

  startSidescrollEvent() {
    this.mode = 'sidescroll';

    for (const entry of this.obstacles) entry.obj.destroy();
    this.obstacles = [];
    for (const entry of this.coffees) entry.obj.destroy();
    this.coffees = [];

    this.bg.setVisible(false);
    this.sceneryLeft.setVisible(false);
    this.sceneryRight.setVisible(false);

    this.sideBg = this.add
      .tileSprite(0, this.playerY - 90, this.scale.width, 180, 'runner_bg')
      .setOrigin(0, 0)
      .setTint(this.stage.floorTint ?? 0xffffff)
      .setDepth(1);

    this.player.x = this.scale.width * 0.28;
    this.player.setAngle(90);

    this.sidescrollObstacles = [];
    this.sidescrollCleared = 0;
    this.sidescrollObstacleTimer = 500;

    this.showEventBanner(Phaser.Utils.Array.GetRandom(SIDESCROLL_EVENT_MESSAGES));
    this.setSidescrollButtons(true);
  }

  endSidescrollEvent() {
    this.mode = 'vertical';
    this.sideBg.destroy();
    this.sideBg = null;
    for (const entry of this.sidescrollObstacles) entry.obj.destroy();
    this.sidescrollObstacles = [];

    this.bg.setVisible(true);
    this.sceneryLeft.setVisible(true);
    this.sceneryRight.setVisible(true);

    this.player.setAngle(0);
    this.player.setScale(1);
    this.player.y = this.playerY;
    this.player.x = this.laneX[this.lane];

    this.setSidescrollButtons(false);
  }

  spawnSidescrollObstacle() {
    const isLow = Math.random() < 0.5;
    const texture = isLow ? 'ob_box' : 'ob_overhead';
    const y = isLow ? this.playerY + 14 : this.playerY - 30;
    const obj = this.add.image(this.scale.width + 40, y, texture).setDepth(2);
    this.sidescrollObstacles.push({ obj, type: isLow ? 'low' : 'high', resolved: false });
  }

  resolveSideObstacle(entry) {
    entry.obj.destroy();
    this.sidescrollObstacles.splice(this.sidescrollObstacles.indexOf(entry), 1);
    this.sidescrollCleared += 1;

    const now = this.time.now;
    const dodged = entry.type === 'low' ? now < this.jumpUntil : now < this.duckUntil;
    if (dodged) {
      this.onObstacleDodged();
      return;
    }

    if (this.autoSavesRemaining > 0) {
      this.autoSavesRemaining -= 1;
      this.onObstacleDodged();
      this.spawnPopup(this.player.x, this.playerY - 60, '🛡 자동 회피!', '#8fd6ff');
      sfx.playMilestone();
      return;
    }

    this.applyHit();
  }

  updateSidescroll(delta, speed) {
    const dx = (speed * delta) / 1000;
    this.sideBg.tilePositionX += dx;

    for (const entry of this.sidescrollObstacles) entry.obj.x -= dx;
    this.sidescrollObstacles = this.sidescrollObstacles.filter((entry) => {
      if (entry.obj.x < -40) {
        entry.obj.destroy();
        return false;
      }
      return true;
    });

    this.sidescrollObstacleTimer -= delta;
    if (this.sidescrollObstacleTimer <= 0 && this.sidescrollCleared < SIDESCROLL_OBSTACLE_COUNT) {
      this.spawnSidescrollObstacle();
      this.sidescrollObstacleTimer = Phaser.Math.Between(...SIDESCROLL_SPAWN_RANGE_MS);
    }

    for (const entry of [...this.sidescrollObstacles]) {
      if (!entry.resolved && entry.obj.x <= this.player.x + 12) {
        entry.resolved = true;
        this.resolveSideObstacle(entry);
        if (!this.running) return;
      }
    }

    if (this.sidescrollCleared >= SIDESCROLL_OBSTACLE_COUNT && this.sidescrollObstacles.length === 0) {
      this.endSidescrollEvent();
    }
  }

  spawnObstacleRow() {
    const type = pickObstacleType(this.stage);

    if (type !== 'ground') return; // only 'ground' is used in normal vertical play

    const progress = this.isInfinite ? 0.5 : Phaser.Math.Clamp(this.distance / this.stage.goalDistance, 0, 1);
    const twoLaneChance = Phaser.Math.Clamp(0.28 + progress * 0.42, 0.28, 0.7);

    let blockedLanes;
    if (Math.random() < twoLaneChance) {
      const openLane = Phaser.Math.Between(0, LANE_COUNT - 1);
      blockedLanes = [0, 1, 2].filter((l) => l !== openLane);
    } else {
      blockedLanes = [Phaser.Math.Between(0, LANE_COUNT - 1)];
    }

    for (const lane of blockedLanes) {
      const texture = Phaser.Utils.Array.GetRandom(OBSTACLE_TEXTURES);
      const obj = this.add.image(this.laneX[lane], -40, texture).setScale(SPAWN_SCALE);
      this.obstacles.push({ obj, lane, type: 'ground' });
    }
  }

  spawnCoffee() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const obj = this.add.image(this.laneX[lane], -40, 'coin_coffee').setScale(SPAWN_SCALE);
    this.coffees.push({ obj, lane });
  }

  updateHud() {
    this.livesText.setText(`${'❤️'.repeat(Math.max(0, this.lives))}`);
    const goal = this.isInfinite ? '∞' : `${this.stage.goalDistance}m`;
    this.distanceText.setText(`${Math.floor(this.distance)} / ${goal}`);
    this.coffeeText.setText(`☕ ${this.sessionCoffee}`);
  }

  collectCoffee(entry) {
    entry.obj.destroy();
    this.coffees.splice(this.coffees.indexOf(entry), 1);
    this.sessionCoffee += 1;
    this.updateHud();
    sfx.playCoffee();
  }

  applyHit() {
    if (this.time.now < this.invulnerableUntil) return;

    this.lives -= 1;
    this.hits += 1;
    this.streak = 0;
    this.invulnerableUntil = this.time.now + HIT_INVULN_MS;
    this.updateHud();

    sfx.playCaught();
    this.cameras.main.shake(180, 0.01);
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 90, yoyo: true, repeat: 4 });

    if (this.lives <= 0) this.endRun(false);
  }

  hitObstacle(entry) {
    entry.obj.destroy();
    this.obstacles.splice(this.obstacles.indexOf(entry), 1);
    this.applyHit();
  }

  spawnPopup(x, y, text, color = '#f5c518') {
    const t = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color, stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(150);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  onObstacleDodged() {
    this.streak += 1;
    if (this.streak % STREAK_MILESTONE === 0) {
      const bonus = Math.min(5, Math.floor(this.streak / STREAK_MILESTONE));
      this.sessionCoffee += bonus;
      this.updateHud();
      this.spawnPopup(this.player.x, this.playerY - 60, `🔥 ${this.streak}연속 회피! +${bonus}`, '#f5c518');
      sfx.playMilestone();
    }
  }

  endRun(cleared) {
    if (!this.running) return;
    this.running = false;

    const coffeeEarned = Math.round(this.sessionCoffee * this.effects.coffeeMult);
    const save = loadSave();
    save.coffee += coffeeEarned;

    let isNewBest = false;
    if (this.isInfinite) {
      const prevBest = save.infiniteBest ?? 0;
      isNewBest = Math.floor(this.distance) > prevBest;
      if (isNewBest) save.infiniteBest = Math.floor(this.distance);
    } else {
      const prevBest = save.bestDistance[this.stage.id] ?? 0;
      save.bestDistance[this.stage.id] = Math.max(prevBest, Math.floor(this.distance));
      if (cleared && !save.clearedStages.includes(this.stage.id)) {
        save.clearedStages.push(this.stage.id);
      }
    }
    writeSave(save);

    if (!this.isInfinite && cleared) sfx.playClear();
    else sfx.playGameOver();

    this.showResult({ cleared, coffeeEarned, isNewBest });
  }

  showResult({ cleared, coffeeEarned, isNewBest }) {
    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setDepth(200);
    this.resultLayer = layer;

    layer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0));
    const panel = this.add.rectangle(width / 2, height / 2, width - 56, 380, 0x1b1b22, 0.96).setStrokeStyle(3, 0xf5c518);
    layer.add(panel);

    const title = this.isInfinite ? '질주 종료! 🏃' : cleared ? '출근 성공! 🎉' : '중도 낙오... 😵';
    layer.add(
      this.add
        .text(width / 2, height / 2 - 160, title, { fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#ffffff' })
        .setOrigin(0.5),
    );

    const stats = this.isInfinite
      ? `이동 거리: ${Math.floor(this.distance)}m (최고 ${this.save.infiniteBest ?? 0}m)\n모은 커피: ${this.sessionCoffee} (+${coffeeEarned} 정산)\n부딪힌 횟수: ${this.hits}`
      : `이동 거리: ${Math.floor(this.distance)}m / ${this.stage.goalDistance}m\n모은 커피: ${this.sessionCoffee} (+${coffeeEarned} 정산)\n부딪힌 횟수: ${this.hits} · 시도: ${this.currentAttempt}트`;
    layer.add(
      this.add
        .text(width / 2, height / 2 - 100, stats, { fontFamily: 'monospace', fontSize: '13px', color: '#d8d3c6', align: 'center' })
        .setOrigin(0.5),
    );

    const reviewLabel = this.add
      .text(width / 2, height / 2 - 35, '💬 김 팀장의 한마디', { fontFamily: 'monospace', fontSize: '13px', color: '#f5c518' })
      .setOrigin(0.5);
    layer.add(reviewLabel);

    const reviewText = this.add
      .text(width / 2, height / 2, '(인사고과 작성 중...)', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: width - 100 },
      })
      .setOrigin(0.5, 0);
    layer.add(reviewText);

    this.fetchReview(cleared).then((review) => {
      if (reviewText.active) reviewText.setText(review);
    });

    if (this.isInfinite && isNewBest) {
      layer.add(
        this.add
          .text(width / 2, height / 2 + 95, '🏆 신기록! 무한모드 랭킹에 등록됩니다', { fontFamily: 'monospace', fontSize: '11px', color: '#8fd6ff' })
          .setOrigin(0.5),
      );
      this.submitToLeaderboard();
    }

    const retryBtn = this.add.rectangle(width / 2 - 84, height / 2 + 150, 150, 48, 0x2e86de).setStrokeStyle(2, 0xffffff);
    const retryLabel = this.add.text(width / 2 - 84, height / 2 + 150, '다시 도전', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setOrigin(0.5);
    retryBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart({ stageId: this.isInfinite ? 'infinite' : this.stage.id, skipIntro: true }));

    const menuBtn = this.add.rectangle(width / 2 + 84, height / 2 + 150, 150, 48, 0x4a4a55).setStrokeStyle(2, 0xffffff);
    const menuLabel = this.add.text(width / 2 + 84, height / 2 + 150, '스테이지 선택', { fontFamily: 'monospace', fontSize: '13px', color: '#fff' }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('StageSelect'));

    layer.add([retryBtn, retryLabel, menuBtn, menuLabel]);
  }

  async fetchReview(cleared) {
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageName: this.stage.name,
          distance: Math.floor(this.distance),
          goalDistance: this.isInfinite ? Math.floor(this.distance) : this.stage.goalDistance,
          coffee: this.sessionCoffee,
          hits: this.hits,
          cleared: this.isInfinite ? false : cleared,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      return data.review ?? '...';
    } catch (err) {
      console.error('Review fetch failed:', err);
      return '(팀장님이 자리를 비우셨는지 대답이 없다...)';
    }
  }

  async submitToLeaderboard() {
    const save = loadSave();
    let name = save.playerName;
    if (!name) {
      const entered = (window.prompt('오락실 랭킹에 남길 이름을 입력하세요 (최대 8자)', '') || '').trim();
      name = entered ? entered.slice(0, 8) : '무명';
      save.playerName = name;
      writeSave(save);
    }

    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: 0,
          name,
          distance: Math.floor(this.distance),
        }),
      });
    } catch (err) {
      console.error('Leaderboard submit failed:', err);
    }
  }

  update(time, delta) {
    if (!this.running || this.introActive) return;

    this.elapsedSeconds += delta / 1000;
    const speed = Math.min(this.stage.maxSpeed, this.stage.baseSpeed + this.stage.speedRamp * this.elapsedSeconds);
    this.distance += (speed * delta) / 1000 / PIXELS_PER_METER;

    if (this.mode === 'sidescroll') {
      this.updateSidescroll(delta, speed);
    } else {
      this.updateVertical(delta, speed);
    }

    if (!this.running) return;

    if (this.mode === 'vertical' && !this.flipActive && this.distance >= this.nextEventAt) {
      const nearStageEnd = !this.isInfinite && this.distance > this.stage.goalDistance - 40;
      if (nearStageEnd) {
        this.nextEventAt = this.distance + 20;
      } else {
        this.triggerRandomEvent();
      }
    }

    this.updateHud();
    if (!this.isInfinite && this.distance >= this.stage.goalDistance) this.endRun(true);
  }

  updateVertical(delta, speed) {
    const dy = (speed * delta) / 1000;
    this.bg.tilePositionY -= dy;
    this.sceneryLeft.tilePositionY -= dy * 0.5;
    this.sceneryRight.tilePositionY -= dy * 0.5;

    for (const entry of this.obstacles) {
      entry.obj.y += dy;
      const depthT = Phaser.Math.Clamp(entry.obj.y / this.playerY, 0, 1);
      entry.obj.setScale(Phaser.Math.Linear(SPAWN_SCALE, 1, depthT));
    }
    for (const entry of this.coffees) {
      entry.obj.y += dy;
      const depthT = Phaser.Math.Clamp(entry.obj.y / this.playerY, 0, 1);
      entry.obj.setScale(Phaser.Math.Linear(SPAWN_SCALE, 1, depthT));
    }

    const bottomLimit = this.scale.height + 40;
    this.obstacles = this.obstacles.filter((entry) => {
      if (entry.obj.y > bottomLimit) {
        entry.obj.destroy();
        this.onObstacleDodged();
        return false;
      }
      return true;
    });
    this.coffees = this.coffees.filter((entry) => {
      if (entry.obj.y > bottomLimit) {
        entry.obj.destroy();
        return false;
      }
      return true;
    });

    this.obstacleTimer -= delta;
    if (this.obstacleTimer <= 0) {
      this.spawnObstacleRow();
      this.obstacleTimer = (this.stage.obstacleGapPx / speed) * 1000;
    }

    this.coffeeTimer -= delta;
    if (this.coffeeTimer <= 0) {
      this.spawnCoffee();
      this.coffeeTimer = Phaser.Math.Between(...COFFEE_SPAWN_RANGE_MS);
    }

    const playerBounds = shrinkRect(this.player.getBounds(), 0.55);

    for (const entry of [...this.obstacles]) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, shrinkRect(entry.obj.getBounds(), 0.7))) {
        this.hitObstacle(entry);
        if (!this.running) return;
      }
    }

    const coffeeBounds = this.effects.magnet
      ? Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(this.player.getBounds()), 70, 180)
      : playerBounds;
    for (const entry of [...this.coffees]) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(coffeeBounds, entry.obj.getBounds())) {
        this.collectCoffee(entry);
      }
    }
  }
}
