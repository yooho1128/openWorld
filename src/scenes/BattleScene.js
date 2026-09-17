import Phaser from 'phaser';
import { MONSTERS } from '../data/monsters.js';
import { REGIONS, getClass, getCompanion } from '../data/rpg.js';
import { addLoot, addXp, saveCharacter } from '../state/rpgCharacter.js';
import { addFantasyBackdrop } from '../ui/fantasyTheme.js';

const RANK_POWER = { F: 1, E: 2, D: 3, C: 4, B: 5, A: 6, S: 8 };

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  init(data) { this.regionId = data?.regionId ?? 'forest'; this.monsterId = data?.monsterId; }

  create() {
    this.character = this.registry.get('character');
    this.monsterData = MONSTERS.find((monster) => monster.id === this.monsterId) ?? MONSTERS[0];
    this.region = REGIONS.find((region) => region.id === this.regionId) ?? REGIONS[0];
    this.job = getClass(this.character.classId);
    this.companion = getCompanion(this.character.activeCompanionId);
    const power = RANK_POWER[this.monsterData.rank] ?? 1;
    this.enemy = {
      level: Math.max(this.region.minLevel, this.character.level + Phaser.Math.Between(-1, 1)),
      maxHp: 50 + power * 28 + this.region.danger * 12,
      attack: 7 + power * 3 + this.region.danger * 2,
      defense: 2 + power + this.region.danger,
    };
    this.enemy.hp = this.enemy.maxHp;
    this.guard = false;
    this.busy = false;
    this.turn = 1;
    addFantasyBackdrop(this, { dark: true });
    this.add.rectangle(240, 315, 480, 360, this.region.color, 0.16);
    this.add.text(240, 35, `${this.region.name} · 전투`, { fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '21px', fontStyle: 'bold', color: '#f4dc9c' }).setOrigin(0.5);
    this.enemySprite = this.add.sprite(342, 225, this.monsterData.texture).setScale(2.35);
    this.add.sprite(115, 425, 'player').setScale(2.1);
    if (this.companion) {
      this.add.circle(205, 438, 27, this.companion.color, 0.85);
      this.add.text(205, 438, this.companion.name[0], { fontSize: '19px', fontStyle: 'bold', color: '#fff0c4' }).setOrigin(0.5);
    }
    this.statusGraphics = this.add.graphics();
    this.playerText = this.add.text(24, 485, '', { fontSize: '11px', color: '#e9dcb9' });
    this.enemyText = this.add.text(456, 104, '', { fontSize: '11px', color: '#e9dcb9', align: 'right' }).setOrigin(1, 0);
    this.logText = this.add.text(240, 555, `야생의 ${this.monsterData.name}(이)가 나타났다!`, {
      fontSize: '12px', color: '#ffe5a5', align: 'center', wordWrap: { width: 430 }, lineSpacing: 4,
    }).setOrigin(0.5);
    this.commandLayer = this.add.container();
    this.addCommand(125, 638, '공격', () => this.playerAction('attack'), 0x8d4436);
    this.addCommand(355, 638, this.job.skill, () => this.playerAction('skill'), this.job.color);
    this.addCommand(125, 704, '방어', () => this.playerAction('guard'), 0x4f667e);
    this.addCommand(355, 704, `회복 물약 (${this.character.potions})`, () => this.playerAction('potion'), 0x4f825b);
    this.refreshStatus();
  }

  addCommand(x, y, label, action, color) {
    const bg = this.add.rectangle(x, y, 210, 52, color, 0.94).setStrokeStyle(2, 0xd9b66a).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontSize: '14px', fontStyle: 'bold', color: '#fff0bf' }).setOrigin(0.5);
    bg.on('pointerdown', action);
    this.commandLayer.add([bg, text]);
  }

  refreshStatus() {
    const c = this.character;
    this.statusGraphics.clear();
    this.drawBar(24, 513, 200, 13, c.hp / c.maxHp, 0x55b56d);
    this.drawBar(24, 532, 200, 8, c.mp / c.maxMp, 0x638ed4);
    this.drawBar(256, 129, 200, 13, this.enemy.hp / this.enemy.maxHp, 0xcf5548);
    this.playerText.setText(`${c.name} Lv.${c.level}  HP ${Math.max(0, c.hp)}/${c.maxHp}  MP ${c.mp}/${c.maxMp}`);
    this.enemyText.setText(`${this.monsterData.name}  ${this.monsterData.rank}급 Lv.${this.enemy.level}\nHP ${Math.max(0, this.enemy.hp)}/${this.enemy.maxHp}`);
  }

  drawBar(x, y, width, height, ratio, color) {
    this.statusGraphics.fillStyle(0x160f0d, 0.9).fillRoundedRect(x, y, width, height, 4);
    this.statusGraphics.fillStyle(color, 1).fillRoundedRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), height - 4, 3);
  }

  async playerAction(type) {
    if (this.busy) return;
    if (type === 'skill' && this.character.mp < 12) { this.logText.setText('마력이 부족하다!'); return; }
    if (type === 'potion' && this.character.potions <= 0) { this.logText.setText('회복 물약이 없다!'); return; }
    this.busy = true;
    this.guard = type === 'guard';
    let message = '';
    if (type === 'attack') {
      const critical = Math.random() < (this.character.classId === 'rogue' ? 0.25 : 0.1);
      const damage = this.damage(this.character.attack * (critical ? 1.7 : 1), this.enemy.defense);
      this.enemy.hp -= damage;
      message = `${critical ? '치명타! ' : ''}${this.character.name}의 공격! ${damage} 피해.`;
    } else if (type === 'skill') {
      this.character.mp -= 12;
      const damage = this.damage(this.character.attack * this.job.skillPower, this.enemy.defense * 0.7);
      this.enemy.hp -= damage;
      message = `${this.job.skill}! ${damage} 피해.`;
      if (this.job.heal) this.character.hp = Math.min(this.character.maxHp, this.character.hp + this.job.heal);
    } else if (type === 'guard') {
      message = `${this.character.name}(은)는 방어 태세를 취했다.`;
    } else {
      this.character.potions -= 1;
      const healed = Math.min(55, this.character.maxHp - this.character.hp);
      this.character.hp += healed;
      message = `회복 물약으로 HP를 ${healed} 회복했다.`;
    }
    this.logText.setText(message);
    this.refreshStatus();
    await this.pause(450);
    if (this.enemy.hp <= 0) return this.victory();
    if (this.companion) {
      if (this.companion.heal && this.character.hp < this.character.maxHp * 0.45) {
        this.character.hp = Math.min(this.character.maxHp, this.character.hp + this.companion.heal);
        this.logText.setText(`${this.companion.name}의 ${this.companion.ability}! HP ${this.companion.heal} 회복.`);
      } else {
        const damage = this.damage(this.companion.attack + this.companion.level, this.enemy.defense);
        this.enemy.hp -= damage;
        this.logText.setText(`${this.companion.name}의 ${this.companion.ability}! ${damage} 피해.`);
      }
      this.refreshStatus();
      await this.pause(400);
      if (this.enemy.hp <= 0) return this.victory();
    }
    const incoming = this.damage(this.enemy.attack, this.character.defense) * (this.guard ? 0.4 : 1);
    this.character.hp -= Math.ceil(incoming);
    this.logText.setText(`${this.monsterData.name}의 ${this.monsterData.trait}! ${Math.ceil(incoming)} 피해.`);
    this.cameras.main.shake(120, 0.006);
    this.refreshStatus();
    await this.pause(500);
    if (this.character.hp <= 0) return this.defeat();
    this.turn += 1;
    this.busy = false;
  }

  damage(attack, defense) { return Math.max(1, Math.round(attack - defense * 0.45 + Phaser.Math.Between(-2, 3))); }
  pause(ms) { return new Promise((resolve) => this.time.delayedCall(ms, resolve)); }

  victory() {
    this.busy = true;
    const power = RANK_POWER[this.monsterData.rank] ?? 1;
    const xp = 25 + power * 15 + this.region.danger * 8;
    const gold = 30 + power * 22 + Phaser.Math.Between(0, 25);
    const loot = { id: `loot-${this.monsterData.id}`, name: `${this.monsterData.name} 전리품`, value: 18 + power * 17, quantity: 1, rarity: this.monsterData.rank };
    this.character.gold += gold;
    this.character.victories += 1;
    this.character.hunted[this.monsterData.id] = (this.character.hunted[this.monsterData.id] ?? 0) + 1;
    addLoot(this.character, loot);
    const levels = addXp(this.character, xp);
    saveCharacter(this);
    this.finish(`승리!\n${xp} XP · ${gold} 골드\n${loot.name} 획득${levels.length ? `\n레벨 ${levels.at(-1)} 달성!` : ''}`, 0x4f8557);
  }

  defeat() {
    this.character.defeats += 1;
    this.character.gold = Math.max(0, this.character.gold - Math.floor(this.character.gold * 0.08));
    this.character.hp = Math.ceil(this.character.maxHp * 0.4);
    this.character.mp = Math.ceil(this.character.maxMp * 0.4);
    saveCharacter(this);
    this.finish('패배...\n일부 골드를 잃고 길드로 구조되었다.', 0x823e3e);
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
