import Phaser from 'phaser';
import { getAdvancement, getClass, getCompanion } from '../data/rpg.js';
import { equipmentDisplayName, getRarity, worldBossEquipment } from '../data/equipment.js';
import { getPotion, potionHealValues } from '../data/potions.js';
import { addLoot, addPotion, addXp, combatStats, companionStats, ensureRpgCharacter, grantCompanionXp, potionCount, saveCharacter, totalPotionCount, usePotion } from '../state/rpgCharacter.js';
import { createEquippedHero } from '../ui/equipmentVisuals.js';
import { addFantasyBackdrop, addOrnatePanel } from '../ui/fantasyTheme.js';
import { closePanel, openPanel, qs } from '../ui/domForms.js';

const WORLD_DRAGON = {
  id: 'world-dragon-aurex', name: '천공을 삼키는 고룡 · 아우렉스', rank: 'S', biome: 'storm', trait: '천공 붕괴',
};
const LANES = [{ id: 'left', label: '좌익', x: 82 }, { id: 'center', label: '중앙', x: 240 }, { id: 'right', label: '우익', x: 398 }];
const BOSS_DAMAGE_SCALE = 0.5;
const DODGE_CLUES = {
  left: {
    sigil: '지는 별의 꼬리',
    clue: '고룡의 오른눈이 타오른다. 그 시선을 거슬러 지는 별을 따라라.',
  },
  center: {
    sigil: '고요한 심장',
    clue: '두 날개가 바깥 하늘을 찢는다. 폭풍 속 고요한 심장 아래로 파고들어라.',
  },
  right: {
    sigil: '떠오르는 달의 뿔',
    clue: '고룡의 왼눈이 타오른다. 그 시선을 거슬러 떠오르는 달을 따라라.',
  },
};

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
    this.patternSequence = null;
    this.forcePhasePattern = false;
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
    this.mainCommandPage = this.add.container();
    this.dodgeCommandPage = this.add.container();
    this.commandLayer.add([this.mainCommandPage, this.dodgeCommandPage]);
    const primarySkill = this.advancement?.skills?.[0] ?? { name: this.job.skill, power: this.job.skillPower, cost: 12, effect: this.character.classId, heal: this.job.heal };
    this.addCommand(84, 620, '⚔ 공격', () => this.playerAction('attack'), 0x77332d, this.mainCommandPage);
    this.addCommand(240, 620, `✦ ${primarySkill.name}\n${primarySkill.cost}MP`, () => this.playerAction('skill', primarySkill), this.advancement?.color ?? this.job.color, this.mainCommandPage);
    this.addCommand(396, 620, '♜ 방어', () => this.playerAction('guard'), 0x405878, this.mainCommandPage);
    this.potionCommands = [];
    this.potionCommands.push(this.addCommand(84, 683, '', () => this.openPotionMenu(), 0x3f7456, this.mainCommandPage));
    this.addCommand(240, 683, '회피 전술 ▶', () => this.setCommandPage('dodge'), 0x51446e, this.mainCommandPage);
    this.addCommand(396, 683, '길드로 철수', () => {
      if (!this.busy) { saveCharacter(this); this.scene.start('Town'); }
    }, 0x332c35, this.mainCommandPage);
    LANES.forEach((lane) => {
      const button = this.addCommand(lane.x, 620, `회피 · ${lane.label}`, () => this.playerAction('dodge', lane.id), 0x51446e, this.dodgeCommandPage);
      this.laneButtons ??= {};
      this.laneButtons[lane.id] = button;
    });
    this.addCommand(84, 683, '단서 다시 읽기', () => this.repeatPatternClue(), 0x405878, this.dodgeCommandPage);
    this.addCommand(240, 683, '오직 회피만 가능', () => this.repeatPatternClue(), 0x643347, this.dodgeCommandPage);
    this.addCommand(396, 683, '◀ 전투 명령', () => this.setCommandPage('main'), 0x59434f, this.dodgeCommandPage);
    this.commandPageText = this.add.text(240, 733, '', { fontSize: '10px', fontStyle: 'bold', color: '#bda9c8' }).setOrigin(0.5);
    this.commandLayer.add(this.commandPageText);
    this.setCommandPage('main');
  }

  addCommand(x, y, label, action, color, layer = this.commandLayer) {
    const shadow = this.add.rectangle(x + 2, y + 4, 140, 50, 0x06040a, 0.45);
    const bg = this.add.rectangle(x, y, 140, 50, color, 0.94).setStrokeStyle(2, 0xe4ba68).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontSize: label.length > 14 ? '10px' : '12px', fontStyle: 'bold', color: '#fff0bd', align: 'center', lineSpacing: 2 }).setOrigin(0.5);
    bg.on('pointerdown', action);
    bg.on('pointerover', () => bg.setScale(1.025));
    bg.on('pointerout', () => bg.setScale(1));
    layer.add([shadow, bg, text]);
    return { bg, text };
  }

  setCommandPage(page) {
    this.commandPage = page;
    this.mainCommandPage.setVisible(page === 'main');
    this.dodgeCommandPage.setVisible(page === 'dodge');
    this.commandPageText.setText(page === 'main' ? '전투 명령  1 / 2' : '회피 전술  2 / 2');
  }

  refreshPotionLabels() {
    const label = `◆ 물약 (${totalPotionCount(this.character)})`;
    this.potionCommands?.forEach((command) => command.text.setText(label));
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
    this.refreshPotionLabels();
  }

  drawBar(x, y, width, height, ratio, color) {
    this.statusGraphics.fillStyle(0x0d0811, 0.96).fillRoundedRect(x, y, width, height, 4);
    this.statusGraphics.fillStyle(color, 1).fillRoundedRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), height - 4, 3);
    this.statusGraphics.lineStyle(1, 0xffe4a0, 0.45).strokeRoundedRect(x, y, width, height, 4);
  }

  openPotionMenu() {
    if (this.busy) return;
    const owned = Object.entries(this.character.potions ?? {})
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({ potion: getPotion(id), quantity }))
      .filter((entry) => entry.potion)
      .sort((a, b) => a.potion.tier - b.potion.tier);
    if (!owned.length) { this.logText.setText('보유한 물약이 없다!'); return; }
    const rows = owned.map(({ potion, quantity }) => {
      const { hpHeal, mpHeal } = potionHealValues(potion, this.playerStats);
      const healText = [hpHeal ? `HP +${hpHeal}` : null, mpHeal ? `MP +${mpHeal}` : null].filter(Boolean).join(' · ');
      return `<div class="gear-card"><div><strong>${potion.name}</strong><small>${healText}</small><small>보유 ${quantity}개</small></div><button id="use-potion-${potion.id}">사용</button></div>`;
    }).join('');
    openPanel(`
      <div class="panel">
        <h2>월드 보스 · 물약 사용</h2>
        <div class="gear-list">${rows}</div>
        <button id="potion-cancel" class="secondary">닫기</button>
      </div>
    `);
    owned.forEach(({ potion }) => qs(`use-potion-${potion.id}`)?.addEventListener('click', () => {
      closePanel();
      this.playerAction('potion', potion);
    }));
    qs('potion-cancel')?.addEventListener('click', () => closePanel());
  }

  async playerAction(type, payload = null) {
    if (this.busy) return;
    if (type === 'skill' && this.character.mp < payload.cost) { this.logText.setText('마력이 부족하다!'); return; }
    if (type === 'potion' && (!payload || potionCount(this.character, payload.id) <= 0)) { this.logText.setText('물약이 부족하다!'); return; }
    if (type === 'dodge' && !this.intent?.lethal) {
      this.logText.setText('아직 필멸의 징조는 없다. 전투 명령에 집중하자.');
      this.setCommandPage('main');
      return;
    }
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
    else if (type === 'potion') {
      usePotion(this.character, payload.id);
      const { hpHeal, mpHeal } = potionHealValues(payload, this.playerStats);
      const healedHp = Math.max(0, Math.min(hpHeal, this.playerStats.maxHp - this.character.hp));
      const healedMp = Math.max(0, Math.min(mpHeal, this.playerStats.maxMp - this.character.mp));
      this.character.hp = Math.min(this.playerStats.maxHp, this.character.hp + hpHeal);
      this.character.mp = Math.min(this.playerStats.maxMp, this.character.mp + mpHeal);
      const healedParts = [healedHp ? `HP ${healedHp}` : null, healedMp ? `MP ${healedMp}` : null].filter(Boolean).join(' · ');
      message = `${payload.name} 사용! ${healedParts || '변화 없음'} 회복.`;
    }
    else message = `${LANES.find((lane) => lane.id === payload)?.label} 방향으로 운명을 걸고 몸을 날렸다!`;
    this.logText.setText(message);
    this.refreshStatus();
    await this.pause(type === 'skill' ? 720 : 430);
    if (this.boss.hp <= 0) return this.victory();
    await this.checkPhaseTransition();
    if (this.companion && !this.intent?.lethal) await this.companionTurn();
    if (this.boss.hp <= 0) return this.victory();
    const bossResult = await this.bossTurn();
    if (this.character.hp <= 0) return this.defeat();
    if (this.boss.hp <= 0) return this.victory();
    if (bossResult === 'continue-pattern') {
      this.busy = false;
      return;
    }
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
    const patternTurn = this.forcePhasePattern
      || (this.phase === 1 && this.turn % 3 === 0)
      || (this.phase === 2 && this.turn % 2 === 0)
      || (this.phase === 3 && this.turn % 2 === 1);
    if (patternTurn) {
      this.forcePhasePattern = false;
      const count = this.phase === 1 ? 1 : this.phase === 2 ? Phaser.Math.Between(2, 3) : 3;
      this.startLethalSequence(count, this.phase === 3);
      return;
    }
    const pool = this.phase === 1
      ? [{ type: 'claw', label: '왕룡의 발톱' }, { type: 'breath', label: '성운 브레스' }, { type: 'wing', label: '하늘 찢기' }]
      : [{ type: 'breath', label: '보랏빛 겁화' }, { type: 'wing', label: '차원 날갯짓' }, { type: 'claw', label: '황제의 강습' }];
    this.intent = { ...Phaser.Utils.Array.GetRandom(pool), lethal: false };
    this.setCommandPage('main');
    this.intentText.setText(`${this.intent.label}\n${this.intent.type === 'breath' ? '강력한 일격 · 방어 권장' : '일반 공격 · 방어 가능'}`);
  }

  startLethalSequence(count, memoryTrial = false) {
    const lanes = [];
    while (lanes.length < count) {
      const lane = Phaser.Utils.Array.GetRandom(LANES).id;
      if (lanes.length === 0 || lanes.at(-1) !== lane) lanes.push(lane);
    }
    this.patternSequence = { lanes, index: 0, memoryTrial };
    this.preparePatternStep();
  }

  preparePatternStep() {
    const { lanes, index, memoryTrial } = this.patternSequence;
    const safeLane = lanes[index];
    const clueData = DODGE_CLUES[safeLane];
    const total = lanes.length;
    const label = memoryTrial ? '용의 눈 · 시간 붕괴' : this.phase === 2 ? '연쇄 천공 붕괴' : '천공의 단죄';
    this.intent = { type: memoryTrial ? 'apocalypse' : 'meteor', safeLane, label, lethal: true };
    this.showLethalWarning(memoryTrial);
    this.setCommandPage('dodge');
    if (memoryTrial && index === 0) {
      const prophecy = lanes.map((lane, order) => `${order + 1}. ${DODGE_CLUES[lane].sigil}`).join('  →  ');
      this.currentPatternClue = `세 개의 예언을 기억하라. ${prophecy}`;
      this.logText.setText(this.currentPatternClue);
      this.intentText.setText(`용의 눈 · 시간 붕괴\n세 예언을 기억하라`);
    } else if (memoryTrial) {
      this.currentPatternClue = `${index + 1}번째 예언을 기억해 내라. 용의 눈은 이미 닫혔다.`;
      this.logText.setText(this.currentPatternClue);
      this.intentText.setText(`시간 붕괴 ${index + 1} / ${total}\n기억만이 살길이다`);
    } else {
      this.currentPatternClue = clueData.clue;
      this.logText.setText(this.currentPatternClue);
      this.intentText.setText(`${label} ${index + 1} / ${total}\n암시를 읽고 피하라`);
    }
  }

  repeatPatternClue() {
    if (!this.intent?.lethal) {
      this.logText.setText('아직 필멸의 징조는 없다.');
      return;
    }
    this.logText.setText(this.currentPatternClue);
  }

  showLethalWarning(memoryTrial) {
    this.clearPattern();
    this.patternLayer = this.add.container().setDepth(16);
    const veil = this.add.rectangle(240, 292, 470, 360, memoryTrial ? 0x24001c : 0x2a0710, memoryTrial ? 0.32 : 0.2).setStrokeStyle(4, memoryTrial ? 0xb85cff : 0xff4c59, 0.48);
    const rune = this.add.text(240, 322, memoryTrial ? '◉  ◇  ◉' : '♛   ?   ♛', {
      fontFamily: 'Georgia, serif', fontSize: memoryTrial ? '48px' : '38px', fontStyle: 'bold', color: memoryTrial ? '#d89cff' : '#ff8b72', stroke: '#2b0417', strokeThickness: 7,
    }).setOrigin(0.5).setAlpha(0.62);
    this.patternLayer.add([veil, rune]);
    this.tweens.add({ targets: [veil, rune], alpha: memoryTrial ? 0.2 : 0.34, scale: 1.035, duration: 420, yoyo: true, repeat: -1 });
    LANES.forEach((lane) => this.laneButtons?.[lane.id]?.bg.setStrokeStyle(3, 0xff695f, 0.78));
    this.cameras.main.flash(150, memoryTrial ? 150 : 255, 20, memoryTrial ? 210 : 70, false);
  }

  clearPattern() {
    this.patternLayer?.destroy(true);
    this.patternLayer = null;
    LANES.forEach((lane) => this.laneButtons?.[lane.id]?.bg.setStrokeStyle(2, 0xe4ba68));
  }

  async bossTurn() {
    const intent = this.intent;
    if (intent.lethal) {
      const avoided = this.dodgeLane === intent.safeLane;
      if (!avoided) {
        this.character.hp = 0;
        this.logText.setText(`${intent.label} 발동! 암시를 잘못 읽었다. 생명력이 완전히 소멸한다.`);
        this.patternExplosion(intent.safeLane, false);
        this.refreshStatus();
        this.cameras.main.flash(650, 255, 0, 32, false);
        this.cameras.main.shake(1050, 0.045);
        await this.pause(1100);
        this.clearPattern();
        return 'lethal-hit';
      }
      const step = this.patternSequence.index + 1;
      const total = this.patternSequence.lanes.length;
      this.logText.setText(`${DODGE_CLUES[intent.safeLane].sigil}의 흐름을 읽었다. ${step}/${total} 회피 성공!`);
      this.patternExplosion(intent.safeLane, true);
      await this.pause(650);
      this.clearPattern();
      this.patternSequence.index += 1;
      if (this.patternSequence.index < total) {
        this.dodgeLane = null;
        this.preparePatternStep();
        return 'continue-pattern';
      }
      const memoryTrial = this.patternSequence.memoryTrial;
      this.patternSequence = null;
      if (memoryTrial) {
        const heartDamage = Math.max(1, Math.round(this.boss.maxHp * 0.08));
        this.boss.hp -= heartDamage;
        this.refreshStatus();
        this.magicBurst(0xff486f);
        this.logText.setText(`세 갈래 미래를 돌파했다! 용의 심장에 ${heartDamage.toLocaleString()} 피해.`);
      } else this.logText.setText('필멸의 연격을 모두 흘려냈다!');
      return 'pattern-complete';
    }
    let multiplier = { claw: 1, breath: 1.55, wing: 1.18, meteor: 2.05, apocalypse: 2.65 }[intent.type] ?? 1;
    const raw = this.damage(this.boss.attack * multiplier, this.playerStats.defense);
    const incoming = Math.max(1, Math.ceil(raw * BOSS_DAMAGE_SCALE * (this.guard ? (intent.type === 'apocalypse' ? 0.55 : 0.38) : 1)));
    this.character.hp -= incoming;
    this.logText.setText(`${WORLD_DRAGON.name}의 ${intent.label}! ${incoming.toLocaleString()} 피해.`);
    if (intent.type === 'breath') this.breathEffect();
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
    this.forcePhasePattern = true;
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
    this.logText.setText(nextPhase === 2 ? '아우렉스가 하늘로 솟구친다. 연속된 필멸의 징조를 읽어라!' : '고룡의 눈이 세 갈래 미래를 새긴다. 예언의 순서를 기억하라!');
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
    const guaranteedEquipment = worldBossEquipment(WORLD_DRAGON, this.character.classId, this.boss.level);
    const chestRewards = Phaser.Utils.Array.Shuffle([
      { type: 'empty' },
      guaranteedEquipment ? { type: 'equipment', item: guaranteedEquipment } : { type: 'gold', amount: 100000 },
      this.rollWorldBossSpecialChest(),
    ]);
    this.character.victories += 1;
    this.character.bossVictories = (this.character.bossVictories ?? 0) + 1;
    this.character.worldBossVictories = (this.character.worldBossVictories ?? 0) + 1;
    this.character.hunted[WORLD_DRAGON.id] = (this.character.hunted[WORLD_DRAGON.id] ?? 0) + 1;
    const levels = addXp(this.character, xp);
    const companionLevels = this.companion ? grantCompanionXp(this.character, this.companion.id, Math.round(xp * 0.16)) : [];
    saveCharacter(this);
    this.cameras.main.flash(700, 255, 224, 130, false);
    for (let index = 0; index < 28; index += 1) {
      const star = this.add.text(Phaser.Math.Between(20, 460), Phaser.Math.Between(40, 430), index % 3 ? '✦' : '♛', { fontSize: `${10 + index % 5 * 3}px`, color: index % 2 ? '#ffe68c' : '#c795ff' }).setDepth(50);
      this.tweens.add({ targets: star, y: star.y - 120, angle: 360, alpha: 0, duration: 900 + index * 35, onComplete: () => star.destroy() });
    }
    const extra = `${levels.length ? ` · Lv.${levels.at(-1)} 달성` : ''}${companionLevels.length ? ` · ${this.companion.name} 유대 Lv.${companionLevels.at(-1)}` : ''}`;
    this.showVictoryChests(chestRewards, `${xp.toLocaleString()} XP${extra}`);
  }

  rollWorldBossSpecialChest() {
    const roll = Math.random();
    if (roll < 0.5) return { type: 'gold', amount: 100000 };
    if (roll < 0.75) return { type: 'potion', potionId: 'potion-hp-superior', amount: 1 };
    if (roll < 0.95) {
      const junk = Phaser.Utils.Array.GetRandom([
        { id: 'junk-aurex-scale', name: '아우렉스의 황금 비늘', value: 28000 },
        { id: 'junk-aurex-horn', name: '균열 난 고룡의 뿔', value: 36000 },
        { id: 'junk-aurex-ash', name: '별을 삼킨 용의 잿가루', value: 22000 },
      ]);
      return { type: 'junk', item: { ...junk, type: 'junk', rarity: 'S', quantity: Phaser.Math.Between(1, 2) } };
    }
    return { type: 'scroll', amount: 1 };
  }

  grantWorldBossReward(reward) {
    if (reward.type === 'equipment' || reward.type === 'junk') addLoot(this.character, reward.item);
    else if (reward.type === 'scroll') this.character.enhancementScrolls += reward.amount;
    else if (reward.type === 'potion') addPotion(this.character, reward.potionId, reward.amount);
    else if (reward.type === 'gold') {
      this.character.gold += reward.amount;
      this.character.goldEarnedTotal = (this.character.goldEarnedTotal ?? 0) + reward.amount;
    }
  }

  worldBossRewardLabel(reward) {
    if (reward.type === 'empty') return '꽝\n텅 빈 상자';
    if (reward.type === 'equipment') return `${getRarity(reward.item.rarity).name}\n${equipmentDisplayName(reward.item)}`;
    if (reward.type === 'scroll') return '+1 확정 강화 주문서\n1장';
    if (reward.type === 'potion') return `${getPotion(reward.potionId)?.name ?? '상급 물약'}\n${reward.amount}개`;
    if (reward.type === 'junk') return `${reward.item.name}\n${reward.item.quantity}개`;
    return `황금 보따리\n${reward.amount.toLocaleString()}G`;
  }

  showVictoryChests(rewards, summary) {
    this.commandLayer.destroy(true);
    this.intentText.setVisible(false);
    this.add.rectangle(240, 590, 462, 390, 0x100914, 0.97).setStrokeStyle(4, 0xd6a95e).setDepth(60);
    this.add.text(240, 420, 'WORLD BOSS TREASURE', { fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold', color: '#ffd977', letterSpacing: 3 }).setOrigin(0.5).setDepth(62);
    this.add.text(240, 448, '상자 3개 중 2개를 선택하라', { fontSize: '19px', fontStyle: 'bold', color: '#fff0bd' }).setOrigin(0.5).setDepth(62);
    const selectionText = this.add.text(240, 474, `${summary} · 남은 선택 2회`, { fontSize: '10px', color: '#d9c89f', align: 'center' }).setOrigin(0.5).setDepth(62);
    const chestCards = [];
    let openedCount = 0;
    rewards.forEach((reward, index) => {
      const x = 82 + index * 158;
      const glow = this.add.circle(x, 548, 56, 0xffd45f, 0.08).setStrokeStyle(3, 0xffd45f, 0.25).setDepth(61);
      const chest = this.add.container(x, 540).setDepth(63).setSize(112, 92).setInteractive({ useHandCursor: true });
      const body = this.add.rectangle(0, 12, 94, 54, 0x7a421f, 1).setStrokeStyle(4, 0xf0c66f);
      const band = this.add.rectangle(0, 10, 16, 55, 0xdba54c, 1);
      const lid = this.add.rectangle(0, -18, 100, 28, 0x9a5828, 1).setStrokeStyle(4, 0xf5d17a);
      const lock = this.add.rectangle(0, 5, 18, 19, 0xf5cf67, 1).setStrokeStyle(2, 0x5d3218);
      chest.add([body, band, lid, lock]);
      const label = this.add.text(x, 615, this.worldBossRewardLabel(reward), { fontSize: '9px', fontStyle: 'bold', color: '#fff0bd', align: 'center', fixedWidth: 142, wordWrap: { width: 136 }, lineSpacing: 2 }).setOrigin(0.5).setDepth(64).setAlpha(0);
      const card = { chest, lid, glow, label, reward, opened: false };
      chestCards.push(card);
      chest.on('pointerover', () => { if (!card.opened && openedCount < 2) chest.setScale(1.06); });
      chest.on('pointerout', () => chest.setScale(1));
      chest.on('pointerdown', () => {
        if (card.opened || openedCount >= 2) return;
        card.opened = true;
        openedCount += 1;
        chest.disableInteractive().setScale(1);
        this.grantWorldBossReward(reward);
        saveCharacter(this);
        const rewardColor = reward.type === 'empty' ? 0x756b70 : reward.type === 'scroll' ? 0xb96cff : reward.type === 'equipment' ? getRarity(reward.item.rarity).color : reward.type === 'gold' ? 0xffd45f : 0x65cba1;
        glow.setFillStyle(rewardColor, 0.14).setStrokeStyle(3, rewardColor, 0.7);
        this.tweens.add({ targets: lid, y: -34, angle: index % 2 ? 7 : -7, duration: 260, ease: 'Back.easeOut' });
        this.tweens.add({ targets: glow, alpha: 0.7, scale: 1.18, duration: 300, yoyo: true, repeat: 1 });
        this.tweens.add({ targets: label, alpha: 1, y: 608, duration: 280 });
        this.playChestRewardEffect(x, reward);
        selectionText.setText(`${summary} · 남은 선택 ${2 - openedCount}회`);
        if (openedCount === 2) {
          const sealed = chestCards.find((entry) => !entry.opened);
          if (sealed) {
            sealed.chest.disableInteractive();
            sealed.label.setText('선택하지 않은 상자\n안개 속으로 사라짐').setAlpha(0.65);
            this.tweens.add({ targets: [sealed.chest, sealed.glow], alpha: 0.2, duration: 420 });
          }
          selectionText.setText(`${summary} · 선택 완료`);
          retry.setAlpha(1).setInteractive({ useHandCursor: true });
          back.setAlpha(1).setInteractive({ useHandCursor: true });
          retryText.setAlpha(1);
          backText.setAlpha(1);
        }
      });
    });
    const retry = this.add.rectangle(132, 744, 198, 44, 0x68408c, 0.98).setStrokeStyle(2, 0xf0c575).setDepth(64).setAlpha(0.22);
    const retryText = this.add.text(132, 744, '다시 도전', { fontSize: '14px', fontStyle: 'bold', color: '#fff0bd' }).setOrigin(0.5).setDepth(65).setAlpha(0.22);
    const back = this.add.rectangle(348, 744, 198, 44, 0x3d4f4a, 0.98).setStrokeStyle(2, 0xf0c575).setDepth(64).setAlpha(0.22);
    const backText = this.add.text(348, 744, '길드로 귀환', { fontSize: '14px', fontStyle: 'bold', color: '#fff0bd' }).setOrigin(0.5).setDepth(65).setAlpha(0.22);
    retry.on('pointerdown', () => this.scene.restart());
    back.on('pointerdown', () => this.scene.start('Town'));
  }

  playChestRewardEffect(x, reward) {
    if (reward.type === 'empty') {
      const taunt = this.add.text(x, 505, '꽝! 다음 기회에~', { fontSize: '12px', fontStyle: 'bold', color: '#b6aeb3', stroke: '#251d22', strokeThickness: 4 }).setOrigin(0.5).setDepth(68);
      this.tweens.add({ targets: taunt, x: x + 7, angle: 5, yoyo: true, repeat: 4, duration: 75, onComplete: () => this.tweens.add({ targets: taunt, alpha: 0, y: 480, duration: 420, onComplete: () => taunt.destroy() }) });
      for (let index = 0; index < 10; index += 1) {
        const dust = this.add.circle(x + Phaser.Math.Between(-28, 28), 532, 4 + index % 4, 0x756b70, 0.58).setDepth(66);
        this.tweens.add({ targets: dust, x: dust.x + Phaser.Math.Between(-38, 38), y: 485 + Phaser.Math.Between(-18, 26), scale: 2.2, alpha: 0, duration: 520 + index * 28, onComplete: () => dust.destroy() });
      }
      return;
    }

    if (reward.type === 'equipment') {
      const color = getRarity(reward.item.rarity).color;
      const beam = this.add.rectangle(x, 485, 42, 220, color, 0.28).setOrigin(0.5, 1).setDepth(62);
      const crest = this.add.text(x, 493, reward.item.slot === 'weapon' ? '⚔' : '♛', { fontSize: '34px', color: '#fff4bd', stroke: '#54210d', strokeThickness: 6 }).setOrigin(0.5).setDepth(68).setScale(0.2);
      this.tweens.add({ targets: beam, scaleX: 2.2, alpha: 0, duration: 950, ease: 'Cubic.easeOut', onComplete: () => beam.destroy() });
      this.tweens.add({ targets: crest, scale: 1.2, angle: 360, duration: 620, ease: 'Back.easeOut', yoyo: true, hold: 180, onComplete: () => crest.destroy() });
      this.cameras.main.flash(220, (color >> 16) & 255, (color >> 8) & 255, color & 255, false);
      return;
    }

    const effect = reward.type === 'gold'
      ? { color: 0xffd75f, symbol: 'G', count: 16 }
      : reward.type === 'potion'
        ? { color: 0x62e698, symbol: '✚', count: 12 }
        : reward.type === 'scroll'
          ? { color: 0xc47cff, symbol: '◇', count: 14 }
          : { color: 0x9a7654, symbol: '◆', count: 10 };
    const ring = this.add.circle(x, 522, 18, effect.color, 0.1).setStrokeStyle(5, effect.color, 0.82).setDepth(66);
    this.tweens.add({ targets: ring, scale: 3.5, alpha: 0, duration: 720, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let index = 0; index < effect.count; index += 1) {
      const angle = (Math.PI * 2 * index) / effect.count;
      const symbol = this.add.text(x, 522, effect.symbol, { fontFamily: 'Georgia, serif', fontSize: `${9 + index % 3 * 3}px`, fontStyle: 'bold', color: Phaser.Display.Color.IntegerToColor(effect.color).rgba }).setOrigin(0.5).setDepth(67);
      this.tweens.add({ targets: symbol, x: x + Math.cos(angle) * (44 + index % 3 * 9), y: 522 + Math.sin(angle) * (42 + index % 4 * 7), angle: reward.type === 'scroll' ? 240 : 0, alpha: 0, duration: 580 + index * 24, onComplete: () => symbol.destroy() });
    }
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
