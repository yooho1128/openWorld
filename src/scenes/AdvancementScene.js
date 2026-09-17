import Phaser from 'phaser';
import { ADVANCEMENT_STAGES, getClass } from '../data/rpg.js';
import { availableAdvancements, chooseAdvancement, ensureRpgCharacter, nextAdvancementStage, saveCharacter } from '../state/rpgCharacter.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class AdvancementScene extends Phaser.Scene {
  constructor() { super('Advancement'); }
  create() {
    this.character = this.registry.get('character');
    if (!this.character) return this.scene.start('Login');
    ensureRpgCharacter(this.character);
    const stage = nextAdvancementStage(this.character);
    if (!stage) return this.scene.start('Town');
    const stageInfo = ADVANCEMENT_STAGES[stage - 1];
    addFantasyBackdrop(this, { dark: true });
    const base = getClass(this.character.classId);
    addSceneTitle(this, stageInfo.label, `${base.name}의 ${stageInfo.level}레벨 서약을 선택하세요`);
    const options = availableAdvancements(this.character);
    this.errorText = this.add.text(240, 130, '', { fontSize: '12px', fontStyle: 'bold', color: '#ff8a7a', align: 'center', wordWrap: { width: 400 } }).setOrigin(0.5);
    if (!options.length) {
      this.errorText.setText('선택 가능한 전직이 없습니다. 길드장에게 문의하세요.\n(전직 기록에 문제가 있을 수 있습니다)');
    }
    options.forEach((job, index) => {
      const y = 250 + index * 260;
      const bg = this.add.rectangle(240, y, 414, 218, 0x241b16, 0.96).setStrokeStyle(3, job.color, 0.95).setInteractive({ useHandCursor: true });
      this.add.circle(240, y - 65, 36, job.color, 0.75);
      this.add.text(240, y - 65, '✦', { fontSize: '28px', color: '#fff0bd' }).setOrigin(0.5);
      this.add.text(240, y - 15, job.name, { fontSize: '22px', fontStyle: 'bold', color: '#ffe4a5' }).setOrigin(0.5);
      this.add.text(240, y + 25, job.skills.map((skill) => `${skill.name} · 위력 ${skill.power} · MP ${skill.cost}`).join('\n'), { fontSize: '12px', color: '#cdbf9e', align: 'center', lineSpacing: 8 }).setOrigin(0.5);
      this.add.text(240, y + 78, '선택하여 전직', { fontSize: '12px', fontStyle: 'bold', color: '#9fc9a7' }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        if (!chooseAdvancement(this.character, job.id)) {
          this.errorText.setText('전직에 실패했습니다. 다시 시도해주세요.');
          return;
        }
        saveCharacter(this);
        if (nextAdvancementStage(this.character)) this.scene.restart();
        else this.scene.start('Town');
      });
    });
  }
}
