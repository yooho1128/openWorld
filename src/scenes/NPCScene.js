import Phaser from 'phaser';
import { getNpc } from '../data/rpg.js';
import { adjustAffinity, combatStats, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

// 대화 대신, 각 NPC와 실제로 관련된 활동을 할 때마다 우호도가 조금씩 쌓인다
// (상인: 상점 이용, 길드장: 의뢰 완료, 대장장이: 강화/수리, 여관: 휴식).
const NPC_ACTIONS = {
  merchant: { hint: '상점에서 거래할수록 우호도가 쌓입니다.', buttonLabel: '상점으로 이동', targetScene: 'Inventory' },
  guildmaster: { hint: '의뢰를 완료할수록 우호도가 쌓입니다.', buttonLabel: '의뢰소로 이동', targetScene: 'Quest' },
  blacksmith: { hint: '강화나 수리를 맡길수록 우호도가 쌓입니다.', buttonLabel: '대장간으로 이동', targetScene: 'Blacksmith' },
  innkeeper: { hint: '휴식할 때마다 우호도가 조금씩 오릅니다.', buttonLabel: '휴식하기 · 60G', action: 'rest' },
};

export class NPCScene extends Phaser.Scene {
  constructor() { super('NPC'); }
  init(data) { this.npcId = data?.npcId ?? 'guildmaster'; }

  create() {
    this.character = this.registry.get('character');
    this.npc = getNpc(this.npcId);
    if (!this.character || !this.npc) return this.scene.start('Town');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, this.npc.name, this.npc.role);
    this.add.circle(240, 250, 74, this.npc.color, 0.75).setStrokeStyle(4, 0xd7b66c);
    this.add.text(240, 250, this.npc.name[0], { fontSize: '58px', fontStyle: 'bold', color: '#fff0c1' }).setOrigin(0.5);
    this.render();
  }

  render(message = '') {
    const affinity = this.character.affinity[this.npcId] ?? 0;
    const config = NPC_ACTIONS[this.npcId];
    openPanel(`
      <div class="panel dialogue-panel">
        <h2>${this.npc.name}</h2>
        <div class="relationship ${affinity >= 0 ? 'friendly' : 'hostile'}">우호도 ${affinity >= 0 ? '+' : ''}${affinity}</div>
        <p class="npc-reply">${this.npc.persona}</p>
        ${config ? `<p class="choice-label">${config.hint}</p>` : ''}
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        ${config ? `<button id="npc-action">${config.buttonLabel}</button>` : ''}
        <button id="npc-back" class="secondary">돌아가기</button>
      </div>
    `);
    qs('npc-action')?.addEventListener('click', () => this.runAction(config));
    qs('npc-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  runAction(config) {
    if (config.action === 'rest') return this.rest();
    saveCharacter(this);
    closePanel();
    this.scene.start(config.targetScene);
  }

  rest() {
    if (this.character.gold < 60) return this.render('숙박비가 부족한 것 같은데?');
    this.character.gold -= 60;
    const stats = combatStats(this.character);
    this.character.hp = stats.maxHp;
    this.character.mp = stats.maxMp;
    adjustAffinity(this.character, 'innkeeper', 1);
    saveCharacter(this);
    this.render('푹 쉬었지? 몸도 마음도 말끔해 보이네!');
  }
}
