import Phaser from 'phaser';
import { getLocation } from '../data/locations.js';
import {
  visitLocation,
  advanceAge,
  applyDeath,
  applyInjury,
  applyStatDeltas,
  getJobInfo,
} from '../state/character.js';
import { rollLifeOutcome } from '../data/mortality.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle, fantasyName } from '../ui/fantasyTheme.js';
import { monstersForLocation } from '../data/monsters.js';

export class LocationScene extends Phaser.Scene {
  constructor() {
    super('Location');
  }

  init(data) {
    this.locationId = data?.locationId;
  }

  create() {
    this.character = this.registry.get('character');
    this.location = getLocation(this.locationId);
    if (!this.character || !this.location) {
      this.scene.start('Town');
      return;
    }

    addFantasyBackdrop(this, { dark: (this.location.dangerLevel ?? 0) >= 2 });
    addSceneTitle(this, fantasyName(this.location), this.location.npcName);
    this.add.circle(240, 310, 122, this.location.color, 0.13);
    this.add.sprite(240, 292, 'building').setScale(1.9);
    const localMonsters = monstersForLocation(this.location.id, 3);
    localMonsters.forEach((monster, index) => {
      const x = 112 + index * 128;
      const sprite = this.add.sprite(x, 383, monster.texture).setScale(index === 2 ? 1.08 : 0.92);
      this.tweens.add({ targets: sprite, y: sprite.y - 6, duration: 800 + index * 180, yoyo: true, repeat: -1 });
      this.add.text(x, 426, monster.name, {
        fontSize: '10px', color: '#f6e7bc', backgroundColor: '#1b130dcc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
    });
    this.add.text(240, 425, `✦ ${fantasyName(this.location)} ✦`, {
      fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '20px', fontStyle: 'bold',
      color: '#f4dc9c', stroke: '#25150d', strokeThickness: 4,
    }).setOrigin(0.5).setY(470);

    const visit = visitLocation(this.character, this.location);
    if (!visit.ok) {
      openPanel(`
        <div class="panel">
          <h2>${fantasyName(this.location)}</h2>
          <p>돈이 부족해서 들어갈 수 없다. (필요 금액: ${this.location.cost.toLocaleString()}원)</p>
          <button id="loc-back">돌아가기</button>
        </div>
      `);
      qs('loc-back').addEventListener('click', () => {
        closePanel();
        this.scene.start('Town');
      });
      return;
    }

    advanceAge(this.character);
    this.persist();

    const outcome = rollLifeOutcome({
      age: this.character.age,
      stats: this.character.stats,
      job: getJobInfo(this.character),
      location: this.location,
    });

    if (outcome?.type === 'death') {
      applyDeath(this.character, outcome.cause);
      this.persist();
      closePanel();
      this.scene.start('Ending');
      return;
    }

    this.injuryMessage = null;
    if (outcome?.type === 'injury') {
      applyInjury(this.character, outcome.cause);
      this.injuryMessage = `${outcome.cause.label}을(를) 당했다...`;
    }

    this.eventScenario = Math.random() < 0.4 ? Phaser.Utils.Array.GetRandom(this.location.events) : null;
    this.chatLog = [];
    this.eventResolved = !this.eventScenario;
    this.renderPanel();
  }

  characterSummary() {
    const c = this.character;
    const job = getJobInfo(c);
    return `이름 ${c.name}, ${c.age}세, 직업 ${job?.label ?? '학생'}, 체력 ${c.stats.stamina} 지능 ${c.stats.intelligence} 매력 ${c.stats.charm} 행복 ${c.stats.happiness}`;
  }

  renderPanel() {
    const chatHtml = this.chatLog
      .map((line) => `<div class="chat-line${line.me ? ' me' : ''}">${line.text}</div>`)
      .join('');

    const injuryHtml = this.injuryMessage ? `<p class="error">⚠ ${this.injuryMessage}</p>` : '';

    const eventHtml = this.eventScenario && !this.eventResolved
      ? `
        <p><strong>${this.eventScenario}</strong></p>
        <textarea id="event-response" maxlength="200" placeholder="어떻게 대응할지 적어보세요"></textarea>
        <button id="event-submit">대응하기</button>
        <div id="event-feedback"></div>
      `
      : '';

    openPanel(`
      <div class="panel">
        <h2>${this.location.npcName}</h2>
        ${injuryHtml}
        <div class="chat-log" id="chat-log">${chatHtml}</div>
        ${eventHtml}
        <label for="chat-input">말 걸기</label>
        <input id="chat-input" type="text" maxlength="80" placeholder="하고 싶은 말을 입력..." />
        <button id="chat-send" class="secondary">대화하기</button>
        <button id="loc-leave" ${this.eventResolved ? '' : 'disabled'}>떠나기</button>
      </div>
    `);

    qs('chat-send').addEventListener('click', () => this.handleChat());
    qs('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleChat();
    });
    if (this.eventScenario && !this.eventResolved) {
      qs('event-submit').addEventListener('click', () => this.handleEventSubmit());
    }
    qs('loc-leave').addEventListener('click', () => this.handleLeave());
  }

  async handleChat() {
    const input = qs('chat-input');
    const message = input.value.trim();
    if (!message) return;
    this.chatLog.push({ me: true, text: message });
    input.value = '';
    this.renderPanel();

    try {
      const res = await fetch('/api/npc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: this.location.npcName,
          npcPersona: this.location.npcPersona,
          locationName: this.location.name,
          characterSummary: this.characterSummary(),
          playerMessage: message,
        }),
      });
      const json = await res.json();
      this.chatLog.push({ me: false, text: json.reply ?? '...' });
    } catch {
      this.chatLog.push({ me: false, text: '(응답이 없다...)' });
    }
    this.renderPanel();
  }

  async handleEventSubmit() {
    const response = qs('event-response').value.trim();
    if (!response) return;
    const feedbackEl = qs('event-feedback');
    feedbackEl.textContent = '판단 중...';

    try {
      const res = await fetch('/api/event-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: this.eventScenario,
          characterSummary: this.characterSummary(),
          response,
        }),
      });
      const judgment = await res.json();
      applyStatDeltas(this.character, judgment.deltas ?? {});
      this.character.history.push(`${this.character.age}세 - ${this.eventScenario}`);
      this.chatLog.push({ me: false, text: judgment.feedback ?? '...' });
      this.eventResolved = true;
      this.persist();
      this.renderPanel();
    } catch {
      this.chatLog.push({ me: false, text: '(판단할 수 없었다...)' });
      this.eventResolved = true;
      this.renderPanel();
    }
  }

  handleLeave() {
    this.persist();
    closePanel();
    this.scene.start('Town');
  }

  persist() {
    const nickname = this.registry.get('nickname');
    if (!nickname) return;
    fetch('/api/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, character: this.character }),
    }).catch(() => {});
  }
}
