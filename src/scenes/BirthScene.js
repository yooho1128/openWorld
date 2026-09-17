import Phaser from 'phaser';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { getWealthTier } from '../data/wealth.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

// A short click-through intro shown once, right after character creation:
// parents head to the hospital, the birth happens, and the home the family
// can afford (driven by the wealth tier rolled at creation) is revealed
// before the character ever sets foot in TownScene.
export class BirthScene extends Phaser.Scene {
  constructor() {
    super('Birth');
  }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) {
      this.scene.start('Login');
      return;
    }

    addFantasyBackdrop(this);
    addSceneTitle(this, '운명의 첫 장');
    const tier = getWealthTier(this.character.wealthTier);

    this.steps = [
      {
        emoji: '🏥',
        text: '엄마가 진통을 느끼기 시작했다. 아빠와 함께 서둘러 병원으로 향했다.',
      },
      {
        emoji: '👶',
        text: `몇 시간 뒤... "응애!" ${this.character.name}(이)가 세상에 태어났다.`,
      },
      {
        emoji: '🏠',
        text: `${this.character.name}(이)의 가족은 ${tier.label} 가정으로, 앞으로 ${tier.housing}에서 살아가게 된다.`,
      },
    ];
    this.stepIndex = 0;
    this.render();
  }

  render() {
    const step = this.steps[this.stepIndex];
    const isLast = this.stepIndex === this.steps.length - 1;

    openPanel(`
      <div class="panel" style="text-align:center;">
        <div style="font-size:48px;">${step.emoji}</div>
        <p>${step.text}</p>
        <button id="birth-next">${isLast ? '집으로' : '다음'}</button>
      </div>
    `);

    qs('birth-next').addEventListener('click', () => {
      if (isLast) {
        closePanel();
        this.scene.start('Town');
      } else {
        this.stepIndex += 1;
        this.render();
      }
    });
  }
}
