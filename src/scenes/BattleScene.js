import Phaser from 'phaser';
import { MONSTERS } from '../data/monsters.js';
import { REGIONS, getClass, getCompanion, getAdvancement } from '../data/rpg.js';
import { equipmentForMonster, equipmentDisplayName, getRarity } from '../data/equipment.js';
import { addLoot, addXp, combatStats, ensureRpgCharacter, equippedItems, saveCharacter } from '../state/rpgCharacter.js';
import { createEquippedHero } from '../ui/equipmentVisuals.js';
import { addFantasyBackdrop } from '../ui/fantasyTheme.js';

const RANK_POWER = { F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 8 };

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  init(data) {
    this.regionId = data?.regionId ?? 'forest';
    this.monsterId = data?.monsterId;
    this.eventType = data?.eventType ?? 'normal';
    this.reinforcementId = data?.reinforcementId ?? null;
  }

  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    this.monsterData = MONSTERS.find((monster) => monster.id === this.monsterId) ?? MONSTERS[0];
    this.region = REGIONS.find((region) => region.id === this.regionId) ?? REGIONS[0];
    this.job = getClass(this.character.classId);
    this.advancement = getAdvancement(this.character.advancementId);
    this.playerStats = combatStats(this.character);
    this.companion = getCompanion(this.character.activeCompanionId);
    const power = RANK_POWER[this.monsterData.rank] ?? 1;
    const regionIndex = REGIONS.findIndex((region) => region.id === this.region.id);
    const regionMaxLevel = Math.min(999, (REGIONS[regionIndex + 1]?.minLevel ?? 1000) - 1);
    const enemyLevel = Phaser.Math.Clamp(this.character.level + Phaser.Math.Between(-1, 1), this.region.minLevel, regionMaxLevel);
    this.enemy = {
      level: enemyLevel,
      maxHp: Math.round(35 + enemyLevel * 13 + power * 25 + this.region.danger * 8),
      attack: Math.round(6 + enemyLevel * 2.3 + power * 3),
      defense: Math.round(3 + enemyLevel * 1.3 + power),
    };
    this.isBoss = this.eventType === 'boss';
    if (this.isBoss) {
      this.enemy.maxHp = Math.round(this.enemy.maxHp * 2.8);
      this.enemy.attack = Math.round(this.enemy.attack * 1.42);
      this.enemy.defense = Math.round(this.enemy.defense * 1.35);
    }
    this.enemy.hp = this.enemy.maxHp;
    this.guard = false;
    this.busy = false;
    this.turn = 1;
    this.actionHistory = [];
    addFantasyBackdrop(this, { dark: true });
    this.add.rectangle(240, 315, 480, 360, this.region.color, 0.16);
    this.add.text(240, 35, `${this.region.name} · 전투`, { fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '21px', fontStyle: 'bold', color: '#f4dc9c' }).setOrigin(0.5);
    this.enemySprite = this.add.sprite(342, 225, this.monsterData.texture).setScale(this.isBoss ? 2.85 : 2.35);
    if (this.isBoss) this.enemySprite.setTint(0xffd36a);
    createEquippedHero(this, this.character, 115, 425, 2.1);
    if (this.companion) {
      this.add.circle(205, 438, 27, this.companion.color, 0.85);
      this.add.text(205, 438, this.companion.name[0], { fontSize: '19px', fontStyle: 'bold', color: '#fff0c4' }).setOrigin(0.5);
    }
    this.statusGraphics = this.add.graphics();
    this.playerText = this.add.text(24, 485, '', { fontSize: '11px', color: '#e9dcb9' });
    this.enemyText = this.add.text(456, 104, '', { fontSize: '11px', color: '#e9dcb9', align: 'right' }).setOrigin(1, 0);
    this.intentText = this.add.text(342, 158, '', { fontSize: '10px', fontStyle: 'bold', color: '#ffd480', backgroundColor: '#17100dcc', padding: { x: 7, y: 4 } }).setOrigin(0.5).setDepth(12);
    const openingMessage = this.isBoss ? `경고! 우두머리 ${this.monsterData.name}(이)가 나타났다!` : this.eventType === 'reinforcement' ? `${this.monsterData.name} 뒤에서 또 다른 기척이 느껴진다...` : this.eventType === 'reinforcement-second' ? `난입한 ${this.monsterData.name}(이)가 길을 막았다!` : `야생의 ${this.monsterData.name}(이)가 나타났다!`;
    this.logText = this.add.text(240, 555, openingMessage, {
      fontSize: '12px', color: '#ffe5a5', align: 'center', wordWrap: { width: 430 }, lineSpacing: 4,
    }).setOrigin(0.5);
    this.commandLayer = this.add.container();
    const baseSkill = { name: this.job.skill, power: this.job.skillPower, cost: 12, heal: this.job.heal, effect: this.character.classId };
    const commands = [
      ['공격', () => this.playerAction('attack'), 0x8d4436],
      [`${baseSkill.name} · ${baseSkill.cost}MP`, () => this.playerAction('skill', baseSkill), this.job.color],
      ...(this.advancement?.skills ?? []).map((skill) => [`${skill.name} · ${skill.cost}MP`, () => this.playerAction('skill', skill), this.advancement.color]),
      ['방어', () => this.playerAction('guard'), 0x4f667e],
      [`회복 물약 (${this.character.potions})`, () => this.playerAction('potion'), 0x4f825b],
      [`탈주 · ${this.escapeChance()}%`, () => this.playerAction('escape'), 0x6c6255],
    ];
    const rows = Math.ceil(commands.length / 2);
    const startY = rows >= 4 ? 596 : 620;
    const spacing = rows >= 4 ? 48 : rows === 3 ? 56 : 66;
    const height = rows >= 4 ? 38 : rows === 3 ? 43 : 52;
    commands.forEach(([label, action, color], index) => {
      const command = this.addCommand(index % 2 ? 355 : 125, startY + Math.floor(index / 2) * spacing, label, action, color, height);
      if (label.startsWith('탈주')) this.escapeCommandText = command.text;
    });
    this.selectEnemyIntent();
    this.refreshStatus();
  }

  addCommand(x, y, label, action, color, height = 52) {
    const bg = this.add.rectangle(x, y, 210, height, color, 0.94).setStrokeStyle(2, 0xd9b66a).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontSize: label.length > 15 ? '11px' : '13px', fontStyle: 'bold', color: '#fff0bf' }).setOrigin(0.5);
    bg.on('pointerdown', action);
    this.commandLayer.add([bg, text]);
    return { bg, text };
  }

  refreshStatus() {
    const c = this.character;
    this.statusGraphics.clear();
    this.drawBar(24, 513, 200, 13, c.hp / this.playerStats.maxHp, 0x55b56d);
    this.drawBar(24, 532, 200, 8, c.mp / this.playerStats.maxMp, 0x638ed4);
    this.drawBar(256, 129, 200, 13, this.enemy.hp / this.enemy.maxHp, 0xcf5548);
    this.playerText.setText(`${c.name} Lv.${c.level}  HP ${Math.max(0, c.hp)}/${this.playerStats.maxHp}  MP ${c.mp}/${this.playerStats.maxMp}\n공격 ${this.playerStats.attack} · 방어 ${this.playerStats.defense}`);
    this.enemyText.setText(`${this.isBoss ? '★ 우두머리 ' : ''}${this.monsterData.name}  ${this.monsterData.rank}급 Lv.${this.enemy.level}\nHP ${Math.max(0, this.enemy.hp)}/${this.enemy.maxHp}`);
  }

  drawBar(x, y, width, height, ratio, color) {
    this.statusGraphics.fillStyle(0x160f0d, 0.9).fillRoundedRect(x, y, width, height, 4);
    this.statusGraphics.fillStyle(color, 1).fillRoundedRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), height - 4, 3);
  }

  async playerAction(type, skill = null) {
    if (this.busy) return;
    if (type === 'skill' && this.character.mp < skill.cost) { this.logText.setText('마력이 부족하다!'); return; }
    if (type === 'potion' && this.character.potions <= 0) { this.logText.setText('회복 물약이 없다!'); return; }
    this.busy = true;
    this.guard = type === 'guard';
    this.actionHistory.push(type);
    this.actionHistory = this.actionHistory.slice(-8);
    let message = '';
    if (type === 'attack') {
      const critical = Math.random() < (this.character.classId === 'rogue' ? 0.25 : 0.1);
      const damage = this.mitigateEnemyDamage(this.damage(this.playerStats.attack * (critical ? 1.7 : 1), this.enemy.defense));
      this.enemy.hp -= damage;
      message = `${critical ? '치명타! ' : ''}${this.character.name}의 공격! ${damage} 피해.`;
    } else if (type === 'skill') {
      this.character.mp -= skill.cost;
      const damage = this.mitigateEnemyDamage(this.damage(this.playerStats.attack * skill.power, this.enemy.defense * 0.7));
      this.enemy.hp -= damage;
      message = `${skill.name}! ${damage} 피해.`;
      if (skill.heal) {
        const healing = Math.round(skill.heal + this.playerStats.maxHp * 0.12);
        this.character.hp = Math.min(this.playerStats.maxHp, this.character.hp + healing);
        message += ` HP ${healing} 회복.`;
      }
      this.logText.setText(message);
      this.refreshStatus();
      await this.playSkillEffect(skill.effect, this.advancement?.color ?? this.job.color);
    } else if (type === 'guard') {
      message = `${this.character.name}(은)는 방어 태세를 취했다.`;
    } else if (type === 'potion') {
      this.character.potions -= 1;
      const healed = Math.min(55, this.playerStats.maxHp - this.character.hp);
      this.character.hp += healed;
      message = `회복 물약으로 HP를 ${healed} 회복했다.`;
    } else {
      const chance = this.escapeChance();
      if (Math.random() * 100 < chance) {
        this.logText.setText(`민첩 ${this.playerStats.agility}! 탈주 확률 ${chance}%를 뚫고 전장을 벗어났다.`);
        saveCharacter(this);
        await this.pause(450);
        this.finish('탈주 성공!\n보상은 없지만 장비와 목숨을 지켰다.', 0x5f7964);
        return;
      }
      message = `탈주 실패! (${chance}%) 몬스터가 퇴로를 막았다.`;
    }
    this.logText.setText(message);
    this.refreshStatus();
    await this.pause(450);
    if (this.enemy.hp <= 0) return this.victory();
    await this.checkBossPhase();
    if (this.companion && type !== 'escape') {
      if (this.companion.heal && this.character.hp < this.playerStats.maxHp * 0.45) {
        this.character.hp = Math.min(this.playerStats.maxHp, this.character.hp + this.companion.heal);
        this.logText.setText(`${this.companion.name}의 ${this.companion.ability}! HP ${this.companion.heal} 회복.`);
      } else {
        const damage = this.mitigateEnemyDamage(this.damage(this.companion.attack + this.companion.level, this.enemy.defense));
        this.enemy.hp -= damage;
        this.logText.setText(`${this.companion.name}의 ${this.companion.ability}! ${damage} 피해.`);
      }
      this.refreshStatus();
      await this.pause(400);
      if (this.enemy.hp <= 0) return this.victory();
    }
    const ended = await this.enemyTurn();
    if (ended) return;
    if (this.character.hp <= 0) return this.defeat();
    this.turn += 1;
    this.selectEnemyIntent();
    this.busy = false;
  }

  mitigateEnemyDamage(damage) {
    return this.enemyIntent?.type === 'guard' ? Math.max(1, Math.round(damage * 0.42)) : damage;
  }

  selectEnemyIntent() {
    const intelligence = Math.min(0.88, 0.08 + this.enemy.level / 1250 + (this.isBoss ? 0.1 : 0));
    const analyzed = this.actionHistory.length >= 2 && Math.random() < intelligence;
    if (this.isBoss && this.turn % 3 === 0) this.enemyIntent = { type: 'catastrophe', label: '대재앙 준비', detail: '강력한 공격! 방어 권장' };
    else if (analyzed) {
      const counts = this.actionHistory.reduce((result, action) => ({ ...result, [action]: (result[action] ?? 0) + 1 }), {});
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (dominant === 'attack' || dominant === 'skill') this.enemyIntent = { type: 'guard', label: 'AI 분석 · 공격 대응', detail: `분석률 ${Math.round(intelligence * 100)}% · 피해 58% 감소` };
      else if (dominant === 'guard' || dominant === 'potion') this.enemyIntent = { type: 'pierce', label: 'AI 분석 · 방어 관통', detail: `분석률 ${Math.round(intelligence * 100)}% · 방어 효과 약화` };
      else if (dominant === 'escape') this.enemyIntent = { type: 'pursuit', label: 'AI 분석 · 퇴로 봉쇄', detail: `분석률 ${Math.round(intelligence * 100)}% · 탈주 확률 감소` };
      else this.enemyIntent = { type: 'heavy', label: 'AI 분석 · 강공', detail: `분석률 ${Math.round(intelligence * 100)}%` };
    }
    else {
      const roll = Math.random();
      if (!this.isBoss && this.enemy.hp < this.enemy.maxHp * 0.32 && roll < 0.1) this.enemyIntent = { type: 'flee', label: '도주 준비', detail: '이번 턴에 달아날 수 있음' };
      else if (roll < 0.22) this.enemyIntent = { type: 'guard', label: '철벽 방어', detail: '받는 피해 58% 감소' };
      else if (roll < 0.42) this.enemyIntent = { type: 'heavy', label: '강공 예고', detail: '피해 165% · 방어 권장' };
      else if (roll < 0.56) this.enemyIntent = { type: 'drain', label: '흡혈 준비', detail: '준 피해 일부 회복' };
      else if (roll < 0.7) this.enemyIntent = { type: 'frenzy', label: '광폭 돌진', detail: '피해 125%' };
      else this.enemyIntent = { type: 'attack', label: '일반 공격', detail: this.monsterData.trait };
    }
    this.intentText?.setText(`${this.enemyIntent.label}\n${this.enemyIntent.detail}`);
    this.escapeCommandText?.setText(`탈주 · ${this.escapeChance()}%`);
  }

  async enemyTurn() {
    const intent = this.enemyIntent;
    if (intent.type === 'guard') {
      this.logText.setText(`${this.monsterData.name}(은)는 공격 대신 몸을 단단히 지켰다.`);
      await this.pause(520);
      return false;
    }
    if (intent.type === 'flee' && Math.random() < 0.68) {
      this.enemySprite.setFlipX(true);
      this.tweens.add({ targets: this.enemySprite, x: 540, alpha: 0, duration: 480 });
      await this.pause(520);
      this.finish(`${this.monsterData.name}(이)가 전리품을 남기지 않고 도망쳤다!`, 0x75624a);
      return true;
    }
    const multipliers = { attack: 1, flee: 0.85, heavy: 1.65, drain: 0.9, frenzy: 1.25, catastrophe: 2.1, pierce: 1.2, pursuit: 1.1 };
    const defense = intent.type === 'pierce' ? this.playerStats.defense * 0.25 : this.playerStats.defense;
    const raw = this.damage(this.enemy.attack * (multipliers[intent.type] ?? 1), defense);
    const guardMultiplier = this.guard ? (intent.type === 'pierce' ? 0.78 : 0.4) : 1;
    const incoming = Math.ceil(raw * guardMultiplier);
    this.character.hp -= incoming;
    let message = `${this.monsterData.name}의 ${intent.label}! ${incoming} 피해.`;
    if (intent.type === 'drain') {
      const healed = Math.min(Math.round(incoming * 0.5), this.enemy.maxHp - this.enemy.hp);
      this.enemy.hp += healed;
      message += ` HP ${healed} 흡수.`;
    }
    this.logText.setText(message);
    this.cameras.main.shake(intent.type === 'catastrophe' ? 360 : 140, intent.type === 'catastrophe' ? 0.018 : 0.006);
    this.refreshStatus();
    await this.pause(560);
    return false;
  }

  escapeChance() {
    const power = RANK_POWER[this.monsterData?.rank] ?? 1;
    const enemyAgility = 8 + (this.enemy?.level ?? 1) * 0.22 + power * 3;
    const pursuitPenalty = this.enemyIntent?.type === 'pursuit' ? 35 : 0;
    const bossPenalty = this.isBoss ? 18 : 0;
    return Phaser.Math.Clamp(Math.round(45 + (this.playerStats.agility - enemyAgility) * 0.35 - pursuitPenalty - bossPenalty), 5, 92);
  }

  async checkBossPhase() {
    if (!this.isBoss || this.bossPhaseTwo || this.enemy.hp > this.enemy.maxHp * 0.5) return;
    this.bossPhaseTwo = true;
    this.enemy.attack = Math.round(this.enemy.attack * 1.22);
    this.enemy.defense = Math.round(this.enemy.defense * 1.12);
    this.logText.setText(`우두머리가 포효하며 2단계로 돌입했다! 공격과 방어가 상승한다.`);
    this.cameras.main.flash(180, 180, 32, 32, false);
    this.cameras.main.shake(380, 0.016);
    await this.pause(620);
  }

  damage(attack, defense) { return Math.max(1, Math.round(attack - defense * 0.45 + Phaser.Math.Between(-2, 3))); }
  pause(ms) { return new Promise((resolve) => this.time.delayedCall(ms, resolve)); }

  async playSkillEffect(effect, color) {
    const palette = { frost: 0x8fe6ff, freeze: 0x63bfe8, meteor: 0xff6338, holy: 0xffe894, shadow: 0x7256a8, poison: 0x78bb4d, rage: 0xe84a45, sanctuary: 0xfff1a5, stars: 0xd7c1ff, time: 0x7dd7cf };
    const tint = palette[effect] ?? color ?? 0xe7ba64;
    const animations = {
      warrior: () => this.swordEffect(tint), mage: () => this.magicEffect(tint), ranger: () => this.arrowEffect(tint),
      cleric: () => this.holyLightEffect(tint), rogue: () => this.shadowSlashEffect(tint),
    };
    const isAdvanced = !Object.hasOwn(animations, effect);
    if (isAdvanced) this.advancedSkillEffect(effect, tint);
    else animations[effect]?.();
    const intensity = Phaser.Math.Clamp(1 + Math.floor(this.character.level / 200), 1, 6);
    this.time.delayedCall(280, () => this.impactBurst(tint, 8 + intensity * 3));
    this.enemySprite.setTint(tint);
    this.time.delayedCall(isAdvanced ? 650 : 430, () => this.enemySprite?.clearTint());
    await this.pause(isAdvanced ? 760 : 520);
  }

  advancedSkillEffect(effect, tint) {
    const levelFlair = Phaser.Math.Clamp(1 + Math.floor(this.character.level / 200), 1, 6);
    const fade = (target, options = {}) => this.tweens.add({ targets: target, alpha: 0, duration: options.duration ?? 560, delay: options.delay ?? 0, scale: options.scale ?? 1.7, angle: options.angle ?? 0, onComplete: () => target.destroy() });
    if (effect === 'rage') {
      for (let index = 0; index < 4 + levelFlair; index += 1) {
        const slash = this.add.rectangle(342 + Phaser.Math.Between(-65, 65), 225, 7, 150, index % 2 ? 0xffd0b0 : tint, 0.95).setAngle(-65 + index * 27).setDepth(32);
        fade(slash, { duration: 360, delay: index * 35, scale: 0.25 });
      }
      const aura = this.add.circle(115, 420, 34, tint, 0.3).setStrokeStyle(6, 0xff715f).setDepth(25); fade(aura, { scale: 2.8 });
      this.cameras.main.shake(350, 0.013);
    } else if (effect === 'quake') {
      for (let index = 0; index < 4; index += 1) {
        const wave = this.add.ellipse(342, 270, 35, 12, tint, 0.18).setStrokeStyle(4, tint).setDepth(28);
        fade(wave, { duration: 500, delay: index * 90, scale: 4 + index });
      }
      for (let index = 0; index < 5 + levelFlair; index += 1) {
        const rock = this.add.rectangle(292 + index * 18, 280, 10, Phaser.Math.Between(22, 55), 0xc68145, 0.9).setAngle(Phaser.Math.Between(-25, 25)).setDepth(30);
        this.tweens.add({ targets: rock, y: 215 - Phaser.Math.Between(0, 55), alpha: 0, duration: 520, onComplete: () => rock.destroy() });
      }
      this.cameras.main.shake(520, 0.018);
    } else if (effect === 'shield' || effect === 'barrier') {
      const shield = this.add.circle(115, 410, effect === 'barrier' ? 54 : 38, tint, 0.2).setStrokeStyle(effect === 'barrier' ? 8 : 5, 0xd9edff).setDepth(31);
      const crest = this.add.text(115, 410, effect === 'barrier' ? '♜' : '◆', { fontSize: effect === 'barrier' ? '42px' : '29px', color: '#e9f5ff' }).setOrigin(0.5).setDepth(32);
      fade(shield, { duration: 680, scale: effect === 'barrier' ? 1.8 : 1.35 }); fade(crest, { duration: 640, scale: 1.5 });
      if (effect === 'shield') this.time.delayedCall(190, () => this.swordEffect(tint));
    } else if (effect === 'meteor') {
      const meteor = this.add.circle(410, 25, 25 + levelFlair * 2, 0xfff0a0, 1).setStrokeStyle(12, tint, 0.85).setDepth(34);
      const tail = this.add.triangle(420, 8, -36, -75, 20, 25, 55, 35, tint, 0.65).setDepth(33);
      this.tweens.add({ targets: [meteor, tail], x: '-=68', y: '+=200', duration: 500, ease: 'Cubic.easeIn', alpha: 0.2, onComplete: () => { meteor.destroy(); tail.destroy(); this.cameras.main.shake(450, 0.025); } });
    } else if (effect === 'arcane') {
      for (let index = 0; index < 8 + levelFlair; index += 1) {
        const angle = (Math.PI * 2 * index) / (8 + levelFlair);
        const orb = this.add.circle(342 + Math.cos(angle) * 78, 225 + Math.sin(angle) * 78, 7, index % 2 ? tint : 0x76e7ff, 0.9).setDepth(32);
        this.tweens.add({ targets: orb, x: 342, y: 225, angle: 360, duration: 480 + index * 20, ease: 'Cubic.easeIn', onComplete: () => orb.destroy() });
      }
    } else if (effect === 'frost' || effect === 'freeze') {
      const count = effect === 'freeze' ? 9 : 6 + levelFlair;
      for (let index = 0; index < count; index += 1) {
        const ice = this.add.triangle(285 + index * (115 / count), 285, 0, 55, 10, 0, 20, 55, index % 2 ? 0xe8fbff : tint, 0.88).setDepth(32);
        this.tweens.add({ targets: ice, y: effect === 'freeze' ? 190 : 215, scaleY: 1.4, alpha: 0, duration: 560, delay: index * 30, onComplete: () => ice.destroy() });
      }
      this.cameras.main.flash(140, 130, 220, 255, false);
    } else if (effect === 'snipe') {
      const reticle = this.add.circle(342, 225, 52, 0x000000, 0).setStrokeStyle(3, tint).setDepth(35);
      const beam = this.add.rectangle(228, 315, 300, 5 + levelFlair, 0xf3ffcb, 1).setAngle(-38).setDepth(34);
      fade(reticle, { duration: 620, scale: 0.15 }); fade(beam, { duration: 430, scale: 0.3 });
      this.cameras.main.shake(180, 0.016);
    } else if (effect === 'arrows') {
      for (let index = 0; index < 10 + levelFlair * 2; index += 1) {
        const arrow = this.add.rectangle(270 + Phaser.Math.Between(0, 145), 55 - Phaser.Math.Between(0, 110), 4, 62, tint, 1).setAngle(18).setDepth(33);
        this.tweens.add({ targets: arrow, y: 275 + Phaser.Math.Between(-25, 25), x: '-=55', alpha: 0, duration: 420, delay: index * 24, onComplete: () => arrow.destroy() });
      }
    } else if (effect === 'beast') {
      const roar = this.add.circle(115, 410, 30, tint, 0.15).setStrokeStyle(7, tint).setDepth(29); fade(roar, { duration: 650, scale: 5 });
      for (let index = 0; index < 3 + levelFlair; index += 1) {
        const claw = this.add.rectangle(325 + index * 12, 225, 5, 125, 0xffe0a1, 0.9).setAngle(-30).setDepth(34); fade(claw, { duration: 360, delay: index * 45, scale: 0.2 });
      }
    } else if (effect === 'eagle') {
      const wing = this.add.triangle(90, 330, 0, 45, 85, 0, 55, 62, tint, 0.9).setDepth(34);
      const wing2 = this.add.triangle(130, 330, 85, 45, 0, 0, 30, 62, 0xffe8ad, 0.75).setDepth(34);
      this.tweens.add({ targets: [wing, wing2], x: '+=230', y: '-=115', scale: 0.35, alpha: 0, duration: 520, ease: 'Quad.easeIn', onComplete: () => { wing.destroy(); wing2.destroy(); } });
    } else if (effect === 'holy' || effect === 'sanctuary') {
      const targets = effect === 'holy' ? [305, 342, 379] : [85, 115, 145];
      targets.forEach((x, index) => {
        const beam = this.add.rectangle(x, 55, effect === 'holy' ? 16 : 10, effect === 'holy' ? 300 : 390, index === 1 ? 0xffffff : tint, 0.65).setOrigin(0.5, 0).setDepth(30);
        fade(beam, { duration: 620, delay: index * 70, scale: 1.5 });
      });
      const halo = this.add.ellipse(effect === 'holy' ? 342 : 115, effect === 'holy' ? 265 : 435, effect === 'holy' ? 140 : 180, 38, tint, 0.25).setStrokeStyle(5, 0xfff8d0).setDepth(31); fade(halo, { scale: 1.9 });
      this.cameras.main.flash(160, 255, 244, 176, false);
    } else if (effect === 'stars') {
      for (let index = 0; index < 9 + levelFlair; index += 1) {
        const star = this.add.text(275 + Phaser.Math.Between(0, 135), 30 + Phaser.Math.Between(-60, 70), '✦', { fontSize: `${14 + Phaser.Math.Between(0, 18)}px`, color: index % 2 ? '#fff2a8' : '#d6c4ff' }).setDepth(34);
        this.tweens.add({ targets: star, y: 230 + Phaser.Math.Between(-25, 25), angle: 180, scale: 0.2, alpha: 0, duration: 470, delay: index * 35, onComplete: () => star.destroy() });
      }
    } else if (effect === 'time') {
      [75, 55, 35].forEach((radius, index) => {
        const ring = this.add.circle(342, 225, radius, 0x000000, 0).setStrokeStyle(3, index % 2 ? 0xffffff : tint).setDepth(33);
        fade(ring, { duration: 680, delay: index * 80, scale: 0.25, angle: -360 });
      });
      const hand = this.add.rectangle(342, 198, 4, 58, 0xffffff, 0.9).setOrigin(0.5, 1).setDepth(34); fade(hand, { duration: 680, scale: 1, angle: -720 });
    } else if (effect === 'shadow') {
      for (let index = 0; index < 8 + levelFlair; index += 1) {
        const slash = this.add.rectangle(342 + Phaser.Math.Between(-70, 70), 225 + Phaser.Math.Between(-55, 55), 5, 135, index % 2 ? 0x171020 : tint, 0.95).setAngle(Phaser.Math.Between(-80, 80)).setDepth(35);
        fade(slash, { duration: 300, delay: index * 28, scale: 0.15 });
      }
      this.cameras.main.shake(330, 0.014);
    } else if (effect === 'poison') {
      for (let index = 0; index < 12 + levelFlair; index += 1) {
        const cloud = this.add.circle(305 + Phaser.Math.Between(0, 75), 260 + Phaser.Math.Between(-35, 35), Phaser.Math.Between(9, 22), index % 2 ? tint : 0x394b2b, 0.48).setDepth(32);
        this.tweens.add({ targets: cloud, y: '-=85', x: `+=${Phaser.Math.Between(-30, 30)}`, scale: 1.8, alpha: 0, duration: 650, delay: index * 25, onComplete: () => cloud.destroy() });
      }
    } else if (effect === 'illusion') {
      [0x7d68c9, 0x45c8c0, 0xe06b9f, 0xffd070].forEach((shade, index) => {
        const image = this.add.rectangle(292 + index * 34, 225, 6, 150, shade, 0.8).setAngle(-55 + index * 35).setDepth(34);
        fade(image, { duration: 460, delay: index * 65, scale: 0.25 });
      });
    } else if (effect === 'fortune') {
      for (let index = 0; index < 8 + levelFlair; index += 1) {
        const card = this.add.rectangle(115, 410, 20, 29, index % 2 ? 0xffd45f : tint, 0.95).setStrokeStyle(2, 0xffffff).setDepth(34);
        const angle = (Math.PI * 2 * index) / (8 + levelFlair);
        this.tweens.add({ targets: card, x: 342 + Math.cos(angle) * 45, y: 225 + Math.sin(angle) * 45, angle: 540, scale: 0.35, alpha: 0, duration: 580, delay: index * 28, onComplete: () => card.destroy() });
      }
    }
  }

  swordEffect(tint) {
    [-1, 1].forEach((direction, index) => {
      const slash = this.add.rectangle(342 - direction * 55, 225 - 55, 9, 145, index ? 0xfff1c4 : tint, 0.95).setAngle(direction * 48).setDepth(30);
      this.tweens.add({ targets: slash, x: 342 + direction * 48, y: 225 + 38, scaleY: 0.25, alpha: 0, duration: 360, delay: index * 90, onComplete: () => slash.destroy() });
    });
    this.cameras.main.shake(180, 0.008);
  }

  magicEffect(tint) {
    const core = this.add.circle(135, 398, 13, 0xffffff, 1).setStrokeStyle(7, tint, 0.85).setDepth(30);
    const trail = Array.from({ length: 6 }, (_, index) => this.add.circle(130 - index * 10, 402 + index * 3, 9 - index, tint, 0.5).setDepth(29));
    this.tweens.add({ targets: [core, ...trail], x: '+=207', y: '-=177', duration: 410, ease: 'Cubic.easeIn', onComplete: () => { core.destroy(); trail.forEach((part) => part.destroy()); } });
  }

  arrowEffect(tint) {
    for (let index = 0; index < 5; index += 1) {
      const arrow = this.add.rectangle(140 - index * 13, 405 + index * 7, 52, 3, tint, 1).setAngle(-40).setDepth(30);
      this.tweens.add({ targets: arrow, x: 342, y: 210 + index * 9, duration: 300 + index * 45, ease: 'Quad.easeIn', alpha: 0, onComplete: () => arrow.destroy() });
    }
  }

  holyLightEffect(tint) {
    const beam = this.add.rectangle(342, 82, 80, 330, tint, 0.16).setOrigin(0.5, 0).setDepth(24);
    const core = this.add.rectangle(342, 70, 20, 350, 0xfff8cf, 0.75).setOrigin(0.5, 0).setDepth(25);
    const halo = this.add.ellipse(115, 405, 92, 26, tint, 0.72).setStrokeStyle(3, 0xfff9d8).setDepth(26);
    for (let index = 0; index < 8; index += 1) {
      const mote = this.add.circle(90 + Phaser.Math.Between(0, 50), 450, 3, 0xfff6b5, 0.9).setDepth(27);
      this.tweens.add({ targets: mote, y: 350 - Phaser.Math.Between(0, 55), alpha: 0, duration: 420 + index * 25, onComplete: () => mote.destroy() });
    }
    this.tweens.add({ targets: [beam, core, halo], alpha: 0, scaleX: 1.7, duration: 480, onComplete: () => { beam.destroy(); core.destroy(); halo.destroy(); } });
    this.cameras.main.flash(130, 255, 244, 174, false);
  }

  shadowSlashEffect(tint) {
    for (let index = 0; index < 6; index += 1) {
      const slash = this.add.rectangle(342 + Phaser.Math.Between(-50, 50), 225 + Phaser.Math.Between(-45, 45), 5, 100, index % 2 ? tint : 0xd7ccff, 0.95).setAngle(Phaser.Math.Between(-70, 70)).setDepth(30);
      this.tweens.add({ targets: slash, scaleY: 0.1, alpha: 0, duration: 250, delay: index * 45, onComplete: () => slash.destroy() });
    }
  }

  impactBurst(tint, count = 8) {
    for (let index = 0; index < count; index += 1) {
      const orb = this.add.circle(342 + Phaser.Math.Between(-35, 35), 225 + Phaser.Math.Between(-35, 35), Phaser.Math.Between(4, 9), tint, 0.8).setDepth(31);
      this.tweens.add({ targets: orb, scale: 2, alpha: 0, duration: 320, onComplete: () => orb.destroy() });
    }
  }

  victory() {
    this.busy = true;
    const power = RANK_POWER[this.monsterData.rank] ?? 1;
    const rewardMultiplier = this.isBoss ? 3 : 1;
    const xp = Math.round((25 + power * 15 + this.enemy.level * 12) * rewardMultiplier);
    const gold = Math.round((30 + power * 22 + this.enemy.level * 1.8 + Phaser.Math.Between(0, 25)) * rewardMultiplier);
    const loot = { id: `loot-${this.monsterData.id}`, name: `${this.monsterData.name} 전리품`, value: 18 + power * 17, quantity: 1, rarity: this.monsterData.rank };
    const equipment = equipmentForMonster(this.monsterData, this.character.classId, this.enemy.level)
      ?? (this.isBoss ? equipmentForMonster(this.monsterData, this.character.classId, this.enemy.level) : null);
    this.character.gold += gold;
    this.character.victories += 1;
    this.character.hunted[this.monsterData.id] = (this.character.hunted[this.monsterData.id] ?? 0) + 1;
    addLoot(this.character, loot);
    if (equipment) addLoot(this.character, equipment);
    const levels = addXp(this.character, xp);
    saveCharacter(this);
    if (this.eventType === 'reinforcement' && this.reinforcementId) {
      this.busy = true;
      this.commandLayer.destroy(true);
      this.logText.setText(`첫 몬스터를 쓰러뜨렸다!\n하지만 뒤에서 새로운 몬스터가 난입한다!`);
      this.cameras.main.shake(420, 0.014);
      this.time.delayedCall(1050, () => this.scene.start('Battle', { regionId: this.regionId, monsterId: this.reinforcementId, eventType: 'reinforcement-second' }));
      return;
    }
    const gearLine = equipment ? `\n${getRarity(equipment.rarity).name} 장비 획득!\n${equipmentDisplayName(equipment)}` : '';
    this.finish(`승리!\n${xp} XP · ${gold} 골드\n${loot.name} 획득${gearLine}${levels.length ? `\n레벨 ${levels.at(-1)} 달성!` : ''}`, equipment ? getRarity(equipment.rarity).color : 0x4f8557);
  }

  defeat() {
    this.character.defeats += 1;
    const lostGold = Math.floor(this.character.gold * 0.5);
    this.character.gold -= lostGold;
    const damagedItems = equippedItems(this.character);
    damagedItems.forEach((item) => { item.durability = Math.max(0, (item.durability ?? 100) - 35); });
    this.playerStats = combatStats(this.character);
    this.character.hp = Math.ceil(this.playerStats.maxHp * 0.4);
    this.character.mp = Math.ceil(this.playerStats.maxMp * 0.4);
    saveCharacter(this);
    this.finish(`패배...\n골드 ${lostGold.toLocaleString()}G(50%) 손실\n착용 장비 ${damagedItems.length}개의 내구도가 35씩 감소했다.`, 0x823e3e);
  }

  finish(message, color) {
    this.commandLayer.destroy(true);
    this.add.rectangle(240, 665, 440, 164, 0x17120f, 0.96).setStrokeStyle(2, color);
    this.add.text(240, 620, message, { fontSize: '14px', color: '#ffe8b0', align: 'center', lineSpacing: 6 }).setOrigin(0.5);
    const back = this.add.rectangle(240, 719, 210, 46, color, 0.95).setStrokeStyle(2, 0xd7b268).setInteractive({ useHandCursor: true });
    this.add.text(240, 719, '길드로 귀환', { fontSize: '14px', fontStyle: 'bold', color: '#fff1bd' }).setOrigin(0.5);
    back.on('pointerdown', () => this.scene.start('Town'));
  }
}
