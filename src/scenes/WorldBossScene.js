import Phaser from 'phaser';
import { getAdvancement, getClass, getCompanion } from '../data/rpg.js';
import { equipmentDisplayName, getRarity, guaranteedBossEquipment } from '../data/equipment.js';
import { addLoot, addXp, combatStats, companionStats, ensureRpgCharacter, grantCompanionXp, saveCharacter } from '../state/rpgCharacter.js';
import { createEquippedHero } from '../ui/equipmentVisuals.js';
import { addFantasyBackdrop, addOrnatePanel } from '../ui/fantasyTheme.js';

const WORLD_DRAGON = {
  id: 'world-dragon-aurex', name: '천공을 삼키는 고룡 · 아우렉스', rank: 'S', biome: 'storm', trait: '천공 붕괴',
};
const LANES = [{ id: 'left', label: '좌익', x: 82 }, { id: 'center', label: '중앙', x: 240 }, { id: 'right', label: '우익', x: 398 }];

function createWorldDragon(scene) {
  const dragon = scene.add.container(342, 225).setDepth(8);
  const aura = scene.add.graphics();
  aura.fillStyle(0x7c3cff, 0.1).fillCircle(0, 0, 104);
  aura.lineStyle(3, 0xffcc65, 0.38).strokeCircle(0, 0, 91);
  aura.lineStyle(2, 0x8ee9ff, 0.3).strokeEllipse(0, 0, 205, 56);
  const wings = scene.add.graphics();
  wings.fillStyle(0x401d62, 0.96)
    .fillTriangle(-18, -8, -112, -74, -80, 48)
    .fillTriangle(18, -8, 112, -74, 80, 48);
  wings.fillStyle(0x8a416e, 0.7)
    .fillTriangle(-22, -8, -94, -56, -70, 30)
    .fillTriangle(22, -8, 94, -56, 70, 30);
  wings.lineStyle(4, 0xd97a9e, 0.72)
    .lineBetween(-18, -5, -110, -72).lineBetween(-18, -5, -78, 46)
    .lineBetween(18, -5, 110, -72).lineBetween(18, -5, 78, 46);
  const body = scene.add.graphics();
  body.fillStyle(0x1b1129, 0.45).fillEllipse(0, 71, 155, 25);
  body.fillStyle(0x5d2d71, 1).fillEllipse(0, 23, 100, 108);
  body.fillStyle(0x9b4e77, 0.88).fillEllipse(0, 29, 49, 87);
  body.fillStyle(0x4d245f, 1).fillCircle(8, -26, 38).fillTriangle(36, 18, 101, 62, 43, 52);
  body.fillStyle(0xbf6a8c, 0.92).fillTriangle(35, -34, 84, -21, 39, -4);
  body.fillStyle(0x2a1638, 1).fillTriangle(-21, -49, -33, -82, -7, -55).fillTriangle(22, -51, 42, -80, 43, -43);
  body.lineStyle(3, 0xf2bc64, 0.92).strokeEllipse(0, 23, 100, 108).strokeCircle(8, -26, 38);
  body.fillStyle(0xffde67, 1).fillCircle(-4, -31, 5).fillCircle(21, -31, 5);
  body.fillStyle(0xff512f, 1).fillCircle(-4, -31, 2).fillCircle(21, -31, 2);
  body.fillStyle(0xe9c371, 0.9);
  for (let index = 0; index < 5; index += 1) body.fillTriangle(-19 + index * 10, 2 + index * 10, -14 + index * 10, -10 + index * 9, -8 + index * 10, 3 + index * 10);
  const crown = scene.add.text(8, -75, '♛', { fontFamily: 'Georgia, serif', fontSize: '32px', color: '#ffe386', stroke: '#6b1948', strokeThickness: 4 }).setOrigin(0.5);
  const core = scene.add.circle(0, 25, 11, 0xffe375, 0.92).setStrokeStyle(5, 0xb348df, 0.7);
  dragon.add([aura, wings, body, crown, core]);
  scene.tweens.add({ targets: dragon, y: 215, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: wings, scaleY: 1.13, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: aura, angle: 360, duration: 6500, repeat: -1 });
  scene.tweens.add({ targets: core, scale: 1.45, alpha: 0.45, duration: 650, yoyo: true, repeat: -1 });
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index) / 10;
    const rune = scene.add.text(Math.cos(angle) * 98, Math.sin(angle) * 72, index % 2 ? '✦' : '◇', {
      fontFamily: 'Georgia, serif', fontSize: `${8 + index % 3}px`, color: index % 2 ? '#ffe286' : '#a78cff',
    }).setOrigin(0.5);
    dragon.add(rune);
    scene.tweens.add({ targets: rune, alpha: 0.2, scale: 1.7, duration: 650 + index * 70, yoyo: true, repeat: -1 });
  }
  return dragon;
}

export class WorldBossScene extends Phaser.Scene {
  constructor() { super('WorldBoss'); }

  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character?.classId) return this.scene.start('Town');
    this.job = getClass(this.character.classId);
    this.advancement = getAdvancement(this.character.advancementId);
    this.playerStats = combatStats(this.character);
    this.companion = getCompanion(this.character.activeCompanionId);
    this.companionCombat = this.companion ? companionStats(this.character, this.companion.id) : null;
    this.phase = 1;
    this.turn = 1;
    this.busy = true;
    this.guard = false;
    this.dodgeLane = null;
    this.patternLayer = null;
    const power = Math.max(1, this.playerStats.attack * 5 + this.playerStats.defense * 4 + this.playerStats.maxHp * 0.35);
    this.boss = {
      level: Math.max(100, this.character.level),
      maxHp: Math.max(18000, Math.round(this.playerStats.attack * 135 + power * 10)),
      attack: Math.round(this.playerStats.defense * 0.46 + this.playerStats.maxHp * 0.115),
      defense: Math.round(this.playerStats.attack * 0.36),
    };
    this.boss.hp = this.boss.maxHp;
    this.buildArena();
    this.dragon = createWorldDragon(this);
    this.hero = createEquippedHero(this, this.character, 112, 425, 2.15).setDepth(11);
    this.add.ellipse(112, 468, 112, 25, 0x030207, 0.48).setDepth(10);
    this.statusGraphics = this.add.graphics().setDepth(18);
    this.playerText = this.add.text(22, 476, '', { fontSize: '9px', color: '#f1dfc3', lineSpacing: 1, fixedWidth: 215 }).setDepth(19);
    this.bossText = this.add.text(456, 88, '', { fontSize: '10px', fontStyle: 'bold', color: '#ffe6b2', align: 'right', fixedWidth: 245 }).setOrigin(1, 0).setDepth(19);
    this.intentText = this.add.text(240, 105, '', {
      fontSize: '11px', fontStyle: 'bold', color: '#fff0ae', align: 'center', backgroundColor: '#1b0822dd', padding: { x: 9, y: 5 },
    }).setOrigin(0.5).setDepth(25);
    addOrnatePanel(this, 240, 559, 442, 68, { color: 0x1a1020, border: 0xd6895a, alpha: 0.97 });
    this.logText = this.add.text(240, 557, '하늘이 갈라지고, 고룡 아우렉스가 강림한다!', {
      fontSize: '12px', fontStyle: 'bold', color: '#ffe0a2', align: 'center', wordWrap: { width: 414 }, lineSpacing: 3,
    }).setOrigin(0.5).setDepth(22);
    this.buildCommands();
    this.refreshStatus();
    this.playEntrance();
  }

  buildArena() {
    addFantasyBackdrop(this, { dark: true, accent: 0x7c3cff });
    const sky = this.add.graphics().setDepth(1);
    sky.fillGradientStyle(0x080612, 0x13051d, 0x3f1733, 0x120b23, 0.82).fillRect(0, 0, 480, 470);
    sky.fillStyle(0xc8455d, 0.48).fillCircle(386, 92, 69);
    sky.fillStyle(0x17091d, 0.96).fillCircle(402, 77, 58);
    sky.lineStyle(4, 0xff6c64, 0.32).strokeCircle(386, 92, 76);
    sky.fillStyle(0x080611, 0.92);
    for (let index = 0; index < 7; index += 1) sky.fillTriangle(index * 82 - 36, 405, index * 82 + 18, 218 - (index % 3) * 30, index * 82 + 72, 405);
    sky.fillStyle(0x5e2c68, 0.16).fillEllipse(240, 382, 540, 115);
    for (let index = 0; index < 18; index += 1) {
      const mote = this.add.circle((index * 83 + 17) % 480, 80 + (index * 47) % 330, 1 + index % 3, index % 2 ? 0xff8a57 : 0xb77cff, 0.45).setDepth(4);
      this.tweens.add({ targets: mote, y: mote.y - 85, x: mote.x + (index % 2 ? 18 : -14), alpha: 0.05, duration: 1200 + index * 80, yoyo: true, repeat: -1 });
    }
    this.add.text(240, 28, 'WORLD BOSS', { fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold', color: '#ff846a', letterSpacing: 6 }).setOrigin(0.5).setDepth(20);
    this.titleText = this.add.text(240, 52, '천공을 삼키는 고룡 · 아우렉스', {
      fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '20px', fontStyle: 'bold', color: '#fff0bc', stroke: '#390f2d', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);
    this.phaseText = this.add.text(240, 77, 'PHASE I · 지상 대치', { fontSize: '10px', fontStyle: 'bold', color: '#e4b6ff' }).setOrigin(0.5).setDepth(20);
  }

  buildCommands() {
    this.commandLayer = this.add.container().setDepth(30);
    const primarySkill = this.advancement?.skills?.[0] ?? { name: this.job.skill, power: this.job.skillPower, cost: 12, effect: this.character.classId, heal: this.job.heal };
    this.addCommand(84, 620, '⚔ 공격', () => this.playerAction('attack'), 0x77332d);
    this.addCommand(240, 620, `✦ ${primarySkill.name}\n${primarySkill.cost}MP`, () => this.playerAction('skill', primarySkill), this.advancement?.color ?? this.job.color);
    this.addCommand(396, 620, '♜ 방어', () => this.playerAction('guard'), 0x405878);
    LANES.forEach((lane) => {
      const button = this.addCommand(lane.x, 683, `회피 · ${lane.label}`, () => this.playerAction('dodge', lane.id), 0x51446e);
      this.laneButtons ??= {};
      this.laneButtons[lane.id] = button;
    });
    const leave = this.add.rectangle(240, 751, 180, 38, 0x332c35, 0.96).setStrokeStyle(1, 0x9c7f72).setInteractive({ useHandCursor: true });
    const leaveText = this.add.text(240, 751, '길드로 철수', { fontSize: '12px', color: '#cbbcb1' }).setOrigin(0.5);
    leave.on('pointerdown', () => { if (!this.busy) { saveCharacter(this); this.scene.start('Town'); } });
    this.commandLayer.add([leave, leaveText]);
  }

  addCommand(x, y, label, action, color) {
    const shadow = this.add.rectangle(x + 2, y + 4, 140, 50, 0x06040a, 0.45);
    const bg = this.add.rectangle(x, y, 140, 50, color, 0.94).setStrokeStyle(2, 0xe4ba68).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontSize: label.length > 14 ? '10px' : '12px', fontStyle: 'bold', color: '#fff0bd', align: 'center', lineSpacing: 2 }).setOrigin(0.5);
    bg.on('pointerdown', action);
    bg.on('pointerover', () => bg.setScale(1.025));
    bg.on('pointerout', () => bg.setScale(1));
    this.commandLayer.add([shadow, bg, text]);
    return { bg, text };
  }

  async playEntrance() {
    this.commandLayer.setAlpha(0.25);
    this.dragon.setAlpha(0).setScale(2.1).setAngle(-12);
    const seal = this.add.circle(240, 238, 125, 0x4d174f, 0.18).setStrokeStyle(8, 0xff6e65, 0.72).setDepth(40);
    const warning = this.add.text(240, 230, '⚠  WORLD BOSS  ⚠\n아우렉스 강림', {
      fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '24px', fontStyle: 'bold', color: '#fff0b0', align: 'center', stroke: '#5a0b25', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(42);
    this.cameras.main.flash(480, 120, 30, 55, false);
    this.cameras.main.shake(900, 0.024);
    this.tweens.add({ targets: this.dragon, alpha: 1, scale: 1, angle: 0, duration: 1050, ease: 'Back.easeOut' });
    this.tweens.add({ targets: seal, scale: 2.2, angle: 240, alpha: 0, duration: 1100, onComplete: () => seal.destroy() });
    this.tweens.add({ targets: warning, scale: 1.12, alpha: 0, delay: 650, duration: 430, onComplete: () => warning.destroy() });
    await this.pause(1150);
    this.selectIntent();
    this.commandLayer.setAlpha(1);
    this.busy = false;
  }

  refreshStatus() {
    this.statusGraphics.clear();
    this.drawBar(22, 510, 204, 11, this.character.hp / this.playerStats.maxHp, 0x59bf77);
    this.drawBar(22, 524, 204, 7, this.character.mp / this.playerStats.maxMp, 0x7397e8);
    this.drawBar(252, 129, 206, 16, this.boss.hp / this.boss.maxHp, this.phase === 3 ? 0xff3757 : this.phase === 2 ? 0xb958e6 : 0xdd654e);
    this.playerText.setText(`${this.character.name} · Lv.${this.character.level}\nHP ${Math.max(0, this.character.hp)}/${this.playerStats.maxHp} · MP ${this.character.mp}/${this.playerStats.maxMp}\n공격 ${this.playerStats.attack} · 방어 ${this.playerStats.defense}`);
    this.bossText.setText(`★ 월드 보스 · Lv.${this.boss.level}\nHP ${Math.max(0, this.boss.hp).toLocaleString()} / ${this.boss.maxHp.toLocaleString()}`);
  }

  drawBar(x, y, width, height, ratio, color) {
    this.statusGraphics.fillStyle(0x0d0811, 0.96).fillRoundedRect(x, y, width, height, 4);
    this.statusGraphics.fillStyle(color, 1).fillRoundedRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), height - 4, 3);
    this.statusGraphics.lineStyle(1, 0xffe4a0, 0.45).strokeRoundedRect(x, y, width, height, 4);
  }

  async playerAction(type, payload = null) {
    if (this.busy) return;
    if (type === 'skill' && this.character.mp < payload.cost) { this.logText.setText('마력이 부족하다!'); return; }
    this.busy = true;
    this.guard = type === 'guard';
    this.dodgeLane = type === 'dodge' ? payload : null;
    let message;
    if (type === 'attack') {
      const critical = Math.random() < (this.character.classId === 'rogue' ? 0.27 : 0.12);
      const damage = this.damage(this.playerStats.attack * (critical ? 1.8 : 1), this.boss.defense);
      this.boss.hp -= damage;
      message = `${critical ? '치명타! ' : ''}${this.character.name}의 공격 · ${damage.toLocaleString()} 피해!`;
      this.slashBurst(0xffd27a);
    } else if (type === 'skill') {
      this.character.mp -= payload.cost;
      const damage = this.damage(this.playerStats.attack * payload.power, this.boss.defense * 0.68);
      this.boss.hp -= damage;
      message = `${payload.name}! ${damage.toLocaleString()} 피해!`;
      if (payload.heal) this.character.hp = Math.min(this.playerStats.maxHp, this.character.hp + Math.round(payload.heal + this.playerStats.maxHp * 0.1));
      this.magicBurst(this.advancement?.color ?? this.job.color);
    } else if (type === 'guard') message = '방패를 세우고 재앙의 충격에 대비한다.';
    else message = `${LANES.find((lane) => lane.id === payload)?.label} 방향으로 몸을 날렸다!`;
    this.logText.setText(message);
    this.refreshStatus();
    await this.pause(type === 'skill' ? 720 : 430);
    if (this.boss.hp <= 0) return this.victory();
    await this.checkPhaseTransition();
    if (this.companion) await this.companionTurn();
    if (this.boss.hp <= 0) return this.victory();
    await this.bossTurn();
    if (this.character.hp <= 0) return this.defeat();
    this.turn += 1;
    this.selectIntent();
    this.busy = false;
  }

  async companionTurn() {
    const cc = this.companionCombat;
    if (cc.heal && this.character.hp < this.playerStats.maxHp * 0.42) {
      const healed = Math.round(cc.heal * cc.abilityMultiplier);
      this.character.hp = Math.min(this.playerStats.maxHp, this.character.hp + healed);
      this.logText.setText(`${this.companion.name}의 ${this.companion.ability} · HP ${healed} 회복!`);
    } else {
      const damage = this.damage((cc.attack + cc.level) * cc.abilityMultiplier, this.boss.defense * 0.72);
      this.boss.hp -= damage;
      this.logText.setText(`${this.companion.name}의 ${this.companion.ability} · ${damage.toLocaleString()} 피해!`);
    }
    this.refreshStatus();
    await this.pause(360);
  }

  selectIntent() {
    this.clearPattern();
    const patternTurn = this.phase >= 2 && (this.phase === 3 || this.turn % 2 === 0);
    if (patternTurn) {
      const safe = Phaser.Utils.Array.GetRandom(LANES);
      this.intent = { type: this.phase === 3 ? 'apocalypse' : 'meteor', safeLane: safe.id, label: this.phase === 3 ? '종말의 천궁' : '천공 운석우' };
      this.showPattern(safe.id);
      this.intentText.setText(`${this.intent.label}\n붉은 구역을 피하라!`);
    } else {
      const pool = this.phase === 1
        ? [{ type: 'claw', label: '왕룡의 발톱' }, { type: 'breath', label: '성운 브레스' }, { type: 'wing', label: '하늘 찢기' }]
        : [{ type: 'breath', label: '보랏빛 겁화' }, { type: 'wing', label: '차원 날갯짓' }, { type: 'claw', label: '황제의 강습' }];
      this.intent = Phaser.Utils.Array.GetRandom(pool);
      this.intentText.setText(`${this.intent.label}\n${this.intent.type === 'breath' ? '강력한 일격 · 방어 권장' : '회피 또는 방어 가능'}`);
    }
  }

  showPattern(safeLane) {
    this.patternLayer = this.add.container().setDepth(16);
    LANES.forEach((lane) => {
      const safe = lane.id === safeLane;
      const zone = this.add.rectangle(lane.x, 330, 140, 292, safe ? 0x4ed6b0 : 0xff324f, safe ? 0.045 : 0.18).setStrokeStyle(3, safe ? 0x5ee7c5 : 0xff5b62, safe ? 0.18 : 0.72);
      const mark = this.add.text(lane.x, 342, safe ? '◇' : '!', { fontFamily: 'Georgia, serif', fontSize: safe ? '28px' : '44px', fontStyle: 'bold', color: safe ? '#6ee8ce' : '#ff9b76' }).setOrigin(0.5).setAlpha(safe ? 0.16 : 0.8);
      this.patternLayer.add([zone, mark]);
      this.tweens.add({ targets: [zone, mark], alpha: safe ? 0.08 : 0.34, duration: 360, yoyo: true, repeat: -1 });
      this.laneButtons?.[lane.id]?.bg.setStrokeStyle(3, safe ? 0x58d8bd : 0xff6c5f, safe ? 0.35 : 0.9);
    });
  }

  clearPattern() {
    this.patternLayer?.destroy(true);
    this.patternLayer = null;
    LANES.forEach((lane) => this.laneButtons?.[lane.id]?.bg.setStrokeStyle(2, 0xe4ba68));
  }

  async bossTurn() {
    const intent = this.intent;
    let multiplier = { claw: 1, breath: 1.55, wing: 1.18, meteor: 2.05, apocalypse: 2.65 }[intent.type] ?? 1;
    let avoided = false;
    if (intent.safeLane) avoided = this.dodgeLane === intent.safeLane;
    else if (this.dodgeLane) multiplier *= 0.48;
    if (avoided) {
      this.logText.setText(`${LANES.find((lane) => lane.id === this.dodgeLane)?.label}의 틈으로 파고들어 ${intent.label}을 완전히 회피했다!`);
      this.patternExplosion(intent.safeLane, true);
      await this.pause(760);
      this.clearPattern();
      return;
    }
    const raw = this.damage(this.boss.attack * multiplier, this.playerStats.defense);
    const incoming = Math.ceil(raw * (this.guard ? (intent.type === 'apocalypse' ? 0.55 : 0.38) : 1));
    this.character.hp -= incoming;
    this.logText.setText(`${WORLD_DRAGON.name}의 ${intent.label}! ${incoming.toLocaleString()} 피해.`);
    if (intent.safeLane) this.patternExplosion(intent.safeLane, false);
    else if (intent.type === 'breath') this.breathEffect();
    else this.clawEffect();
    this.refreshStatus();
    this.cameras.main.shake(intent.type === 'apocalypse' ? 720 : 320, intent.type === 'apocalypse' ? 0.028 : 0.014);
    await this.pause(intent.type === 'apocalypse' ? 920 : 620);
    this.clearPattern();
  }

  async checkPhaseTransition() {
    const ratio = this.boss.hp / this.boss.maxHp;
    if (this.phase === 1 && ratio <= 0.66) await this.transitionToPhase(2);
    else if (this.phase === 2 && ratio <= 0.33) await this.transitionToPhase(3);
  }

  async transitionToPhase(nextPhase) {
    this.phase = nextPhase;
    this.clearPattern();
    this.boss.attack = Math.round(this.boss.attack * (nextPhase === 2 ? 1.17 : 1.24));
    this.boss.defense = Math.round(this.boss.defense * (nextPhase === 2 ? 1.08 : 1.12));
    const veil = this.add.rectangle(240, 240, 480, 480, nextPhase === 2 ? 0x351452 : 0x4f061d, 0.45).setDepth(35);
    const banner = this.add.text(240, 230, nextPhase === 2 ? 'PHASE II\n공중 추격전' : 'FINAL PHASE\n용의 눈 · 종말 시점', {
      fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: nextPhase === 2 ? '28px' : '25px', fontStyle: 'bold', color: '#fff0ad', align: 'center', stroke: '#4f102d', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(40);
    this.phaseText.setText(nextPhase === 2 ? 'PHASE II · 공중 추격 시점' : 'PHASE III · 용의 눈 시점').setColor(nextPhase === 2 ? '#dca7ff' : '#ff9a8f');
    if (nextPhase === 2) {
      this.tweens.add({ targets: this.dragon, x: 240, y: 186, scale: 1.18, duration: 900, ease: 'Cubic.easeInOut' });
      this.tweens.add({ targets: this.hero, x: 82, y: 405, angle: -5, duration: 900, ease: 'Cubic.easeInOut' });
      this.cameras.main.zoomTo(1.055, 720, 'Sine.easeInOut', true);
    } else {
      this.tweens.add({ targets: this.dragon, x: 240, y: 175, scale: 1.48, duration: 950, ease: 'Back.easeOut' });
      this.tweens.add({ targets: this.hero, x: 112, y: 435, angle: 0, duration: 850 });
      const eclipse = this.add.circle(240, 170, 138, 0x15000b, 0.52).setStrokeStyle(9, 0xff3953, 0.48).setDepth(5);
      this.tweens.add({ targets: eclipse, scale: 1.16, alpha: 0.2, duration: 850, yoyo: true, repeat: -1 });
      for (let index = 0; index < 12; index += 1) {
        const ray = this.add.rectangle(240, 170, 4, 225, index % 2 ? 0xff485b : 0xad54ff, 0.24).setOrigin(0.5, 1).setAngle(index * 30).setDepth(5);
        this.tweens.add({ targets: ray, angle: ray.angle + 80, alpha: 0.05, duration: 2400 + index * 70, yoyo: true, repeat: -1 });
      }
      this.cameras.main.zoomTo(1.095, 720, 'Sine.easeInOut', true);
    }
    this.cameras.main.flash(450, nextPhase === 2 ? 120 : 255, 25, nextPhase === 2 ? 210 : 70, false);
    this.cameras.main.shake(950, nextPhase === 2 ? 0.022 : 0.032);
    this.logText.setText(nextPhase === 2 ? '아우렉스가 하늘로 솟구친다. 붉게 물든 공격 구역을 피해라!' : '고룡의 눈이 전장을 집어삼킨다. 한 번의 판단이 생사를 가른다!');
    this.tweens.add({ targets: [veil, banner], alpha: 0, delay: 720, duration: 430, onComplete: () => { veil.destroy(); banner.destroy(); } });
    await this.pause(1250);
  }

  damage(attack, defense) { return Math.max(1, Math.round(attack - defense * 0.42 + Phaser.Math.Between(-3, 5))); }
  pause(ms) { return new Promise((resolve) => this.time.delayedCall(ms, resolve)); }

  slashBurst(color) {
    for (let index = 0; index < 5; index += 1) {
      const slash = this.add.rectangle(310 + index * 18, 215, 7, 150, index % 2 ? color : 0xffffff, 0.9).setAngle(-58 + index * 24).setDepth(32);
      this.tweens.add({ targets: slash, scaleY: 0.12, alpha: 0, duration: 330, delay: index * 35, onComplete: () => slash.destroy() });
    }
  }

  magicBurst(color) {
    for (let index = 0; index < 14; index += 1) {
      const angle = (Math.PI * 2 * index) / 14;
      const orb = this.add.circle(342 + Math.cos(angle) * 95, 220 + Math.sin(angle) * 75, 5 + index % 4, index % 2 ? color : 0xffe990, 0.9).setDepth(33);
      this.tweens.add({ targets: orb, x: this.dragon.x, y: this.dragon.y, scale: 0.15, alpha: 0, duration: 480 + index * 20, onComplete: () => orb.destroy() });
    }
    this.cameras.main.flash(120, 190, 145, 255, false);
  }

  breathEffect() {
    const beam = this.add.triangle(260, 260, 0, 0, 355, 225, 0, 100, 0xb448e8, 0.6).setAngle(28).setDepth(31);
    const core = this.add.triangle(270, 260, 0, 20, 330, 225, 0, 72, 0xffe08a, 0.75).setAngle(28).setDepth(32);
    this.tweens.add({ targets: [beam, core], alpha: 0, scaleX: 1.3, duration: 620, onComplete: () => { beam.destroy(); core.destroy(); } });
  }

  clawEffect() {
    for (let index = 0; index < 4; index += 1) {
      const claw = this.add.rectangle(105 + index * 16, 410, 7, 150, index % 2 ? 0xffdc83 : 0xd14762, 0.95).setAngle(-32).setDepth(33);
      this.tweens.add({ targets: claw, x: claw.x - 45, y: claw.y + 25, alpha: 0, scaleY: 0.2, duration: 380, delay: index * 45, onComplete: () => claw.destroy() });
    }
  }

  patternExplosion(safeLane, avoided) {
    LANES.filter((lane) => lane.id !== safeLane).forEach((lane, laneIndex) => {
      for (let index = 0; index < (this.phase === 3 ? 8 : 5); index += 1) {
        const meteor = this.add.circle(lane.x + Phaser.Math.Between(-45, 45), 80 - Phaser.Math.Between(0, 150), 8 + index % 4, index % 2 ? 0xffc35a : 0xff4057, 0.95).setStrokeStyle(4, 0x8a1746, 0.7).setDepth(34);
        this.tweens.add({ targets: meteor, y: 450, x: meteor.x - 28, scale: 1.7, alpha: 0, duration: 460 + index * 45, delay: laneIndex * 90 + index * 35, onComplete: () => meteor.destroy() });
      }
    });
    if (avoided) {
      const ward = this.add.ellipse(LANES.find((lane) => lane.id === safeLane).x, 415, 110, 42, 0x55e2c0, 0.15).setStrokeStyle(4, 0x9affdc, 0.75).setDepth(35);
      this.tweens.add({ targets: ward, scale: 1.45, alpha: 0, duration: 720, onComplete: () => ward.destroy() });
    }
    this.cameras.main.flash(160, 255, 70, 45, false);
  }

  victory() {
    this.busy = true;
    this.clearPattern();
    const xp = Math.max(5000, Math.round(1200 + this.boss.level * 65));
    const gold = Math.max(25000, Math.round(8000 + this.boss.level * 110));
    const drops = Array.from({ length: 3 }, () => guaranteedBossEquipment(WORLD_DRAGON, this.character.classId, this.boss.level)).filter(Boolean);
    this.character.gold += gold;
    this.character.goldEarnedTotal = (this.character.goldEarnedTotal ?? 0) + gold;
    this.character.victories += 1;
    this.character.bossVictories = (this.character.bossVictories ?? 0) + 1;
    this.character.worldBossVictories = (this.character.worldBossVictories ?? 0) + 1;
    this.character.hunted[WORLD_DRAGON.id] = (this.character.hunted[WORLD_DRAGON.id] ?? 0) + 1;
    drops.forEach((item) => addLoot(this.character, item));
    const levels = addXp(this.character, xp);
    const companionLevels = this.companion ? grantCompanionXp(this.character, this.companion.id, Math.round(xp * 0.16)) : [];
    saveCharacter(this);
    this.cameras.main.flash(700, 255, 224, 130, false);
    for (let index = 0; index < 28; index += 1) {
      const star = this.add.text(Phaser.Math.Between(20, 460), Phaser.Math.Between(40, 430), index % 3 ? '✦' : '♛', { fontSize: `${10 + index % 5 * 3}px`, color: index % 2 ? '#ffe68c' : '#c795ff' }).setDepth(50);
      this.tweens.add({ targets: star, y: star.y - 120, angle: 360, alpha: 0, duration: 900 + index * 35, onComplete: () => star.destroy() });
    }
    const gearLines = drops.map((item) => `${getRarity(item.rarity).name} · ${equipmentDisplayName(item)}`).join('\n');
    const extra = `${levels.length ? `\n레벨 ${levels.at(-1)} 달성!` : ''}${companionLevels.length ? `\n${this.companion.name} 유대 Lv.${companionLevels.at(-1)}!` : ''}`;
    this.finish(`월드 보스 토벌 성공!\n${xp.toLocaleString()} XP · ${gold.toLocaleString()} 골드\n전설의 전리품 3개 획득\n${gearLines}${extra}`, 0x8a55bd, true);
  }

  defeat() {
    this.busy = true;
    this.character.defeats += 1;
    this.character.hp = Math.ceil(this.playerStats.maxHp * 0.45);
    this.character.mp = Math.ceil(this.playerStats.maxMp * 0.45);
    saveCharacter(this);
    this.finish(`아우렉스의 포효가 하늘을 뒤덮었다...\n도전 기록은 남지만 골드와 장비는 잃지 않는다.\n패턴을 읽고 다시 도전하라.`, 0x7d3048, false);
  }

  finish(message, color, victory) {
    this.commandLayer.destroy(true);
    this.intentText.setVisible(false);
    this.add.rectangle(240, 662, 448, 220, 0x140b17, 0.98).setStrokeStyle(3, color).setDepth(60);
    this.add.text(240, 602, message, { fontSize: message.split('\n').length > 6 ? '10px' : '12px', color: '#ffecbc', align: 'center', lineSpacing: 4, wordWrap: { width: 414 } }).setOrigin(0.5).setDepth(61);
    const retry = this.add.rectangle(132, 736, 198, 46, victory ? 0x68408c : 0x7d3048, 0.98).setStrokeStyle(2, 0xf0c575).setInteractive({ useHandCursor: true }).setDepth(61);
    this.add.text(132, 736, '다시 도전', { fontSize: '14px', fontStyle: 'bold', color: '#fff0bd' }).setOrigin(0.5).setDepth(62);
    const back = this.add.rectangle(348, 736, 198, 46, 0x3d4f4a, 0.98).setStrokeStyle(2, 0xf0c575).setInteractive({ useHandCursor: true }).setDepth(61);
    this.add.text(348, 736, '길드로 귀환', { fontSize: '14px', fontStyle: 'bold', color: '#fff0bd' }).setOrigin(0.5).setDepth(62);
    retry.on('pointerdown', () => this.scene.restart());
    back.on('pointerdown', () => this.scene.start('Town'));
  }
}
