import Phaser from 'phaser';
import { CLASSES } from '../data/rpg.js';
import { chooseClass, saveCharacter } from '../state/rpgCharacter.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class ClassScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '첫 번째 서약', '당신의 전투 직업을 선택하세요');
    CLASSES.forEach((job, index) => {
      const y = 180 + index * 112;
      const bg = this.add.rectangle(240, y, 420, 94, 0x2b211a, 0.94).setStrokeStyle(2, job.color, 0.9).setInteractive({ useHandCursor: true });
      this.add.circle(77, y, 31, job.color, 0.75);
      this.add.text(77, y, job.icon, { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#fff3cc' }).setOrigin(0.5);
      this.add.text(125, y - 24, job.name, { fontSize: '17px', fontStyle: 'bold', color: '#ffe8ad' });
      this.add.text(125, y + 1, job.description, { fontSize: '11px', color: '#cdbf9f' });
      this.add.text(125, y + 24, `HP ${job.hp}  MP ${job.mp}  공격 ${job.attack}  방어 ${job.defense}`, { fontSize: '10px', color: '#9fc6a4' });
      bg.on('pointerdown', () => { chooseClass(this.character, job.id); saveCharacter(this); this.scene.start('Town'); });
      bg.on('pointerover', () => bg.setFillStyle(0x49372a));
      bg.on('pointerout', () => bg.setFillStyle(0x2b211a));
    });
  }
}
