import Phaser from 'phaser';
import { ADVANCEMENTS, getClass } from '../data/rpg.js';
import { chooseAdvancement, saveCharacter } from '../state/rpgCharacter.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class AdvancementScene extends Phaser.Scene {
  constructor() { super('Advancement'); }
  create() {
    this.character = this.registry.get('character');
    if (!this.character || this.character.level < 10) return this.scene.start('Town');
    addFantasyBackdrop(this, { dark: true });
    const base = getClass(this.character.classId);
    addSceneTitle(this, '두 번째 서약', `${base.name}의 새로운 운명을 선택하세요`);
    (ADVANCEMENTS[this.character.classId] ?? []).forEach((job, index) => {
      const y = 250 + index * 260;
      const bg = this.add.rectangle(240, y, 414, 218, 0x241b16, 0.96).setStrokeStyle(3, job.color, 0.95).setInteractive({ useHandCursor: true });
      this.add.circle(240, y - 65, 36, job.color, 0.75);
      this.add.text(240, y - 65, '✦', { fontSize: '28px', color: '#fff0bd' }).setOrigin(0.5);
      this.add.text(240, y - 15, job.name, { fontSize: '22px', fontStyle: 'bold', color: '#ffe4a5' }).setOrigin(0.5);
      this.add.text(240, y + 25, job.skills.map((skill) => `${skill.name} · 위력 ${skill.power} · MP ${skill.cost}`).join('\n'), { fontSize: '12px', color: '#cdbf9e', align: 'center', lineSpacing: 8 }).setOrigin(0.5);
      this.add.text(240, y + 78, '선택하여 전직', { fontSize: '12px', fontStyle: 'bold', color: '#9fc9a7' }).setOrigin(0.5);
      bg.on('pointerdown', () => { chooseAdvancement(this.character, job.id); saveCharacter(this); this.scene.start('Town'); });
    });
  }
}
