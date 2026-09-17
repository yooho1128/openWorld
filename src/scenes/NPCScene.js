import Phaser from 'phaser';
import { getNpc } from '../data/rpg.js';
import { adjustAffinity, combatStats, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const FALLBACKS = [
  { text: '요즘 이 근처 몬스터에 대해 물어본다.', effect: 1 },
  { text: '상대가 하는 일에 관심을 보인다.', effect: 2 },
  { text: '별일 없다는 듯 짧게 인사한다.', effect: 0 },
  { text: '보상부터 달라며 퉁명스럽게 말한다.', effect: -2 },
];

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
    this.reply = `${this.character.name}, 무슨 일로 찾아왔지?`;
    this.choices = FALLBACKS;
    this.loading = false;
    this.render();
    this.requestDialogue(null);
  }

  render() {
    const affinity = this.character.affinity[this.npcId] ?? 0;
    const history = this.character.dialogueHistory[this.npcId] ?? [];
    const buttons = this.choices.map((choice, index) => `<button id="npc-choice-${index}" class="dialogue-choice" ${this.loading ? 'disabled' : ''}>${index + 1}. ${choice.text}</button>`).join('');
    openPanel(`
      <div class="panel dialogue-panel">
        <h2>${this.npc.name}</h2>
        <div class="relationship ${affinity >= 0 ? 'friendly' : 'hostile'}">우호도 ${affinity >= 0 ? '+' : ''}${affinity}</div>
        <div class="npc-reply">“${this.reply}”</div>
        ${this.loading ? '<p class="thinking">대답을 생각하는 중...</p>' : `<p class="choice-label">어떻게 대답할까?</p>${buttons}`}
        ${this.npcId === 'merchant' ? '<button id="npc-trade" class="secondary">거래하기</button>' : ''}
        ${this.npcId === 'innkeeper' ? '<button id="npc-rest" class="secondary">휴식하기 · 60G</button>' : ''}
        <button id="npc-back" class="secondary">대화 마치기</button>
        <small class="conversation-count">기억된 대화 ${history.length}개</small>
      </div>
    `);
    this.choices.forEach((choice, index) => qs(`npc-choice-${index}`)?.addEventListener('click', () => this.selectChoice(choice)));
    qs('npc-trade')?.addEventListener('click', () => { closePanel(); this.scene.start('Inventory'); });
    qs('npc-rest')?.addEventListener('click', () => this.rest());
    qs('npc-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  async requestDialogue(selectedChoice, selectedEffect = 0) {
    this.loading = true;
    this.render();
    const history = this.character.dialogueHistory[this.npcId] ?? [];
    try {
      const response = await fetch('/api/npc-dialogue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npc: this.npc,
          player: { name: this.character.name, classId: this.character.classId, level: this.character.level, victories: this.character.victories },
          affinity: this.character.affinity[this.npcId] ?? 0,
          history: history.slice(-6), selectedChoice,
        }),
      });
      if (!response.ok) throw new Error('dialogue unavailable');
      const data = await response.json();
      this.reply = data.reply || this.reply;
      this.choices = Array.isArray(data.choices) && data.choices.length >= 3 ? data.choices.slice(0, 4) : FALLBACKS;
    } catch {
      if (selectedChoice) this.reply = selectedEffect > 0 ? '흠, 제법 마음에 드는 대답이군.' : selectedEffect < 0 ? '그런 태도라면 나도 좋게 대할 수 없지.' : '그렇군. 다른 이야기도 해보게.';
      this.choices = FALLBACKS;
    }
    this.loading = false;
    this.render();
  }

  selectChoice(choice) {
    const effect = Math.max(-3, Math.min(3, Number(choice.effect) || 0));
    adjustAffinity(this.character, this.npcId, effect);
    const history = this.character.dialogueHistory[this.npcId] ?? [];
    history.push({ player: choice.text, npc: this.reply, effect });
    this.character.dialogueHistory[this.npcId] = history.slice(-12);
    saveCharacter(this);
    this.requestDialogue(choice.text, effect);
  }

  rest() {
    if (this.character.gold < 60) { this.reply = '숙박비가 부족한 것 같은데?'; return this.render(); }
    this.character.gold -= 60;
    const stats = combatStats(this.character);
    this.character.hp = stats.maxHp;
    this.character.mp = stats.maxMp;
    adjustAffinity(this.character, 'innkeeper', 1);
    saveCharacter(this);
    this.reply = '푹 쉬었지? 몸도 마음도 말끔해 보이네!';
    this.render();
  }
}
