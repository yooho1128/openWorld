import Phaser from 'phaser';
import { STAGES } from '../data/stages.js';
import { loadSave, writeSave } from '../state/save.js';
import { getEquipmentEffects } from '../data/equipment.js';
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
    this.stage = STAGES.find((s) => s.id === data.stageId) ?? STAGES[0];
    this.save = loadSave();
    this.effects = getEquipmentEffects(this.save);

    this.laneX = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      this.laneX.push((this.scale.width / LANE_COUNT) * (i + 0.5));
    }
    this.lane = 1;

    this.elapsedSeconds = 0;
    this.distance = 0;
    this.lives = 3 + this.effects.extraLives;
    this.sessionCoffee = 0;
    this.hits = 0;
    this.running = true;
    this.invulnerableUntil = 0;

    this.obstacles = [];
    this.coffees = [];
    this.obstacleTimer = 600;
    this.coffeeTimer = Phaser.Math.Between(...COFFEE_SPAWN_RANGE_MS);
  }

  create() {
    const { width, height } = this.scale;

    this.bg = this.add.tileSprite(0, 0, width, height, 'runner_bg').setOrigin(0, 0);

    this.player = this.add.image(this.laneX[this.lane], height * PLAYER_Y_FRAC, 'player_runner');
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

    // Mobile/touch: tap the left or right half of the screen to switch lanes.
    this.input.on('pointerdown', (pointer) => {
      this.moveLane(pointer.x < width / 2 ? -1 : 1);
    });

    const hint = this.add
      .text(width / 2, height * PLAYER_Y_FRAC - 70, '화면 좌/우 탭 · ←/→ 키로 이동', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({ targets: hint, alpha: 0, delay: 1800, duration: 500, onComplete: () => hint.destroy() });

    this.resultLayer = null;
  }

  moveLane(delta) {
    if (!this.running) return;
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

  spawnObstacleRow() {
    const progress = Phaser.Math.Clamp(this.distance / this.stage.goalDistance, 0, 1);
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
      const obj = this.add.image(this.laneX[lane], -40, texture);
      this.obstacles.push({ obj, lane });
    }
  }

  spawnCoffee() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const obj = this.add.image(this.laneX[lane], -40, 'coin_coffee');
    this.coffees.push({ obj, lane });
  }

  updateHud() {
    this.livesText.setText(`${'❤️'.repeat(Math.max(0, this.lives))}`);
    this.distanceText.setText(`${Math.floor(this.distance)} / ${this.stage.goalDistance}m`);
    this.coffeeText.setText(`☕ ${this.sessionCoffee}`);
  }

  collectCoffee(entry) {
    entry.obj.destroy();
    this.coffees.splice(this.coffees.indexOf(entry), 1);
    this.sessionCoffee += 1;
    this.updateHud();
    sfx.playCoffee();
  }

  hitObstacle(entry) {
    entry.obj.destroy();
    this.obstacles.splice(this.obstacles.indexOf(entry), 1);

    if (this.time.now < this.invulnerableUntil) return;

    this.lives -= 1;
    this.hits += 1;
    this.invulnerableUntil = this.time.now + HIT_INVULN_MS;
    this.updateHud();

    sfx.playCaught();
    this.cameras.main.shake(180, 0.01);
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 90, yoyo: true, repeat: 4 });

    if (this.lives <= 0) this.endRun(false);
  }

  endRun(cleared) {
    if (!this.running) return;
    this.running = false;

    const coffeeEarned = Math.round(this.sessionCoffee * this.effects.coffeeMult);
    const save = loadSave();
    save.coffee += coffeeEarned;
    const prevBest = save.bestDistance[this.stage.id] ?? 0;
    save.bestDistance[this.stage.id] = Math.max(prevBest, Math.floor(this.distance));
    if (cleared && !save.clearedStages.includes(this.stage.id)) {
      save.clearedStages.push(this.stage.id);
    }
    writeSave(save);

    if (cleared) sfx.playClear();
    else sfx.playGameOver();

    this.showResult({ cleared, coffeeEarned });
  }

  showResult({ cleared, coffeeEarned }) {
    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setDepth(200);
    this.resultLayer = layer;

    layer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0));
    const panel = this.add.rectangle(width / 2, height / 2, width - 56, 360, 0x1b1b22, 0.96).setStrokeStyle(3, 0xf5c518);
    layer.add(panel);

    const title = cleared ? '출근 성공! 🎉' : '중도 낙오... 😵';
    layer.add(
      this.add
        .text(width / 2, height / 2 - 150, title, { fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#ffffff' })
        .setOrigin(0.5),
    );

    const stats = `이동 거리: ${Math.floor(this.distance)}m / ${this.stage.goalDistance}m\n모은 커피: ${this.sessionCoffee} (+${coffeeEarned} 정산)\n부딪힌 횟수: ${this.hits}`;
    layer.add(
      this.add
        .text(width / 2, height / 2 - 90, stats, { fontFamily: 'monospace', fontSize: '14px', color: '#d8d3c6', align: 'center' })
        .setOrigin(0.5),
    );

    const reviewLabel = this.add
      .text(width / 2, height / 2 - 20, '💬 김 팀장의 한마디', { fontFamily: 'monospace', fontSize: '13px', color: '#f5c518' })
      .setOrigin(0.5);
    layer.add(reviewLabel);

    const reviewText = this.add
      .text(width / 2, height / 2 + 15, '(인사고과 작성 중...)', {
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

    const retryBtn = this.add.rectangle(width / 2 - 84, height / 2 + 130, 150, 48, 0x2e86de).setStrokeStyle(2, 0xffffff);
    const retryLabel = this.add.text(width / 2 - 84, height / 2 + 130, '다시 도전', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setOrigin(0.5);
    retryBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart({ stageId: this.stage.id }));

    const menuBtn = this.add.rectangle(width / 2 + 84, height / 2 + 130, 150, 48, 0x4a4a55).setStrokeStyle(2, 0xffffff);
    const menuLabel = this.add.text(width / 2 + 84, height / 2 + 130, '스테이지 선택', { fontFamily: 'monospace', fontSize: '13px', color: '#fff' }).setOrigin(0.5);
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
          goalDistance: this.stage.goalDistance,
          coffee: this.sessionCoffee,
          hits: this.hits,
          cleared,
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

  update(time, delta) {
    if (!this.running) return;

    this.elapsedSeconds += delta / 1000;
    const speed = Math.min(this.stage.maxSpeed, this.stage.baseSpeed + this.stage.speedRamp * this.elapsedSeconds);
    this.distance += (speed * delta) / 1000 / PIXELS_PER_METER;
    this.bg.tilePositionY -= (speed * delta) / 1000;

    const dy = (speed * delta) / 1000;
    for (const entry of this.obstacles) entry.obj.y += dy;
    for (const entry of this.coffees) entry.obj.y += dy;

    const bottomLimit = this.scale.height + 40;
    this.obstacles = this.obstacles.filter((entry) => {
      if (entry.obj.y > bottomLimit) {
        entry.obj.destroy();
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
        if (!this.running) break;
      }
    }

    if (this.running) {
      const coffeeBounds = this.effects.magnet
        ? Phaser.Geom.Rectangle.Inflate(Phaser.Geom.Rectangle.Clone(this.player.getBounds()), 50, 140)
        : playerBounds;
      for (const entry of [...this.coffees]) {
        if (Phaser.Geom.Intersects.RectangleToRectangle(coffeeBounds, entry.obj.getBounds())) {
          this.collectCoffee(entry);
        }
      }
    }

    if (this.running) {
      this.updateHud();
      if (this.distance >= this.stage.goalDistance) this.endRun(true);
    }
  }
}
