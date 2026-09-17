import Phaser from 'phaser';
import { CLASSES } from '../data/rpg.js';
import { chooseClass, saveCharacter } from '../state/rpgCharacter.js';
import { addFantasyBackdrop, addOrnatePanel, addSceneTitle } from '../ui/fantasyTheme.js';

export class ClassScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true, accent: 0x728c70 });
    addSceneTitle(this, '첫 번째 서약', '당신의 전투 직업을 선택하세요');
    CLASSES.forEach((job, index) => {
      const y = 180 + index * 112;
      const card = addOrnatePanel(this, 240, y, 420, 94, { color: 0x203129, border: job.color, alpha: 0.95 });
      const bg = this.add.rectangle(240, y, 420, 94, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      this.add.circle(77, y + 3, 34, 0x0c1511, 0.3);
      this.add.circle(77, y, 31, job.color, 0.82).setStrokeStyle(2, 0xffecc0, 0.42);
      this.add.circle(67, y - 10, 9, 0xffffff, 0.08);
      this.add.text(77, y, job.icon, { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#fff3cc' }).setOrigin(0.5);
      this.add.text(125, y - 24, job.name, { fontSize: '17px', fontStyle: 'bold', color: '#ffe8ad' });
      this.add.text(125, y + 1, job.description, { fontSize: '11px', color: '#cdbf9f' });
      this.add.text(125, y + 24, `HP ${job.hp}  MP ${job.mp}  공격 ${job.attack}  방어 ${job.defense}`, { fontSize: '10px', color: '#9fc6a4' });
      bg.on('pointerdown', () => { chooseClass(this.character, job.id); saveCharacter(this); this.scene.start('Town'); });
      bg.on('pointerover', () => { card.panel.setAlpha(0.82); bg.setScale(1.012); });
      bg.on('pointerout', () => { card.panel.setAlpha(1); bg.setScale(1); });
    });
  }
}
