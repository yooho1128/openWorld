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

const INTERACT_DISTANCE = 50;

// Home is the one location you actually walk around in instead of just
// chatting through a modal: there's a bed, a table, a sink, your parents,
// and a door back out to town. Skip the sink before leaving and you get
// scolded on the way out.
export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    this.character = this.registry.get('character');
    this.location = getLocation('home');
    if (!this.character || !this.location) {
      this.scene.start('Town');
      return;
    }

    this.handwashed = false;
    this.chatLog = [];

    this.add.tileSprite(0, 0, 480, 800, 'floor').setOrigin(0, 0);

    this.objects = [
      { id: 'bed', name: '침대', x: 90, y: 230, tint: 0xdd6688, texture: 'prop' },
      { id: 'table', name: '식탁', x: 240, y: 230, tint: 0x9a6a3d, texture: 'prop' },
      { id: 'sink', name: '세면대', x: 390, y: 230, tint: 0x66aadd, texture: 'prop' },
      { id: 'parent', name: this.location.npcName, x: 240, y: 460, tint: 0xffd27a, texture: 'player' },
      { id: 'door', name: '문 (나가기)', x: 240, y: 760, tint: 0x66dd66, texture: 'prop' },
    ];

    for (const obj of this.objects) {
      this.add.sprite(obj.x, obj.y, obj.texture).setTint(obj.tint);
      this.add.text(obj.x, obj.y + 30, obj.name, { fontSize: '11px', color: '#ffffff' }).setOrigin(0.5);
    }

    this.playerSprite = this.add.sprite(240, 700, 'player');
    this.playerPos = { x: 240, y: 700 };

    this.promptText = this.add.text(240, 670, '', {
      fontSize: '13px',
      color: '#ffffaa',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setVisible(false);

    this.hud = this.add.text(8, 4, '', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    });
    this.refreshHud();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D,E,SPACE');
  }

  refreshHud() {
    const status = this.handwashed ? '🧼 손을 씻었다' : '🧼 손을 아직 안 씻었다';
    this.hud.setText(`${this.character.name}의 집\n${status}`);
  }

  update(_, delta) {
    const speed = 150 * (delta / 1000);
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= speed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += speed;

    this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x + dx, 16, 464);
    this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y + dy, 110, 780);
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);

    const near = this.objects.find(
      (o) => Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, o.x, o.y) < INTERACT_DISTANCE
    );

    if (near) {
      this.promptText.setPosition(this.playerPos.x, this.playerPos.y - 30);
      this.promptText.setText(`[E] ${near.name}`);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }

    const interactPressed = Phaser.Input.Keyboard.JustDown(this.wasd.E) || Phaser.Input.Keyboard.JustDown(this.wasd.SPACE);
    if (near && interactPressed) {
      this.interact(near);
    }
  }

  interact(obj) {
    if (obj.id === 'sink') return this.useSink();
    if (obj.id === 'parent') return this.openChat();
    if (obj.id === 'door') return this.leave();
    this.toast(`${obj.name}...`);
  }

  useSink() {
    if (this.handwashed) {
      this.toast('이미 손을 씻었다.');
      return;
    }
    this.handwashed = true;
    applyStatDeltas(this.character, { happiness: 2 });
    this.refreshHud();
    this.toast('손을 깨끗이 씻었다! 상쾌하다.');
  }

  toast(message) {
    const text = this.add.text(240, 100, message, {
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5);
    this.time.delayedCall(1600, () => text.destroy());
  }

  openChat() {
    this.renderChatPanel();
  }

  renderChatPanel() {
    const chatHtml = this.chatLog
      .map((line) => `<div class="chat-line${line.me ? ' me' : ''}">${line.text}</div>`)
      .join('');

    openPanel(`
      <div class="panel">
        <h2>${this.location.npcName}</h2>
        <div class="chat-log" id="chat-log">${chatHtml}</div>
        <label for="chat-input">말 걸기</label>
        <input id="chat-input" type="text" maxlength="80" placeholder="하고 싶은 말을 입력..." />
        <button id="chat-send" class="secondary">대화하기</button>
        <button id="chat-close">닫기</button>
      </div>
    `);

    qs('chat-send').addEventListener('click', () => this.handleChat());
    qs('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleChat();
    });
    qs('chat-close').addEventListener('click', () => closePanel());
  }

  characterSummary() {
    const c = this.character;
    const job = getJobInfo(c);
    return `이름 ${c.name}, ${c.age}세, 직업 ${job?.label ?? '학생'}, 행복 ${c.stats.happiness}`;
  }

  async handleChat() {
    const input = qs('chat-input');
    const message = input.value.trim();
    if (!message) return;
    this.chatLog.push({ me: true, text: message });
    input.value = '';
    this.renderChatPanel();

    try {
      const res = await fetch('/api/npc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: this.location.npcName,
          npcPersona: this.location.npcPersona,
          locationName: '집',
          characterSummary: this.characterSummary(),
          playerMessage: message,
        }),
      });
      const json = await res.json();
      this.chatLog.push({ me: false, text: json.reply ?? '...' });
    } catch {
      this.chatLog.push({ me: false, text: '(응답이 없다...)' });
    }
    this.renderChatPanel();
  }

  leave() {
    const visit = visitLocation(this.character, this.location);
    if (!visit.ok) {
      this.scene.start('Town');
      return;
    }
    advanceAge(this.character);

    this.scoldMessage = null;
    if (!this.handwashed) {
      applyStatDeltas(this.character, { happiness: -5 });
      this.character.history.push(`${this.character.age}세 - 손을 안 씻고 나가다가 엄마한테 혼났다.`);
      this.scoldMessage = '엄마: "손도 안 씻고 그냥 가니?!"';
    }

    const outcome = rollLifeOutcome({
      age: this.character.age,
      stats: this.character.stats,
      job: getJobInfo(this.character),
      location: this.location,
    });

    if (outcome?.type === 'death') {
      applyDeath(this.character, outcome.cause);
      this.persist();
      this.scene.start('Ending');
      return;
    }

    this.injuryMessage = null;
    if (outcome?.type === 'injury') {
      applyInjury(this.character, outcome.cause);
      this.injuryMessage = `${outcome.cause.label}을(를) 당했다...`;
    }

    this.eventScenario = Math.random() < 0.4 ? Phaser.Utils.Array.GetRandom(this.location.events) : null;
    this.persist();
    this.renderLeaveSummary();
  }

  renderLeaveSummary() {
    const scoldHtml = this.scoldMessage ? `<p class="error">${this.scoldMessage}</p>` : '';
    const injuryHtml = this.injuryMessage ? `<p class="error">⚠ ${this.injuryMessage}</p>` : '';

    const eventHtml = this.eventScenario
      ? `
        <p><strong>${this.eventScenario}</strong></p>
        <textarea id="event-response" maxlength="200" placeholder="어떻게 대응할지 적어보세요"></textarea>
        <button id="event-submit">대응하기</button>
      `
      : `<button id="home-leave-confirm">마을로 나가기</button>`;

    openPanel(`
      <div class="panel">
        ${scoldHtml}
        ${injuryHtml}
        ${eventHtml}
      </div>
    `);

    if (this.eventScenario) {
      qs('event-submit').addEventListener('click', () => this.handleEventSubmit());
    } else {
      qs('home-leave-confirm').addEventListener('click', () => {
        closePanel();
        this.scene.start('Town');
      });
    }
  }

  async handleEventSubmit() {
    const response = qs('event-response').value.trim();
    if (!response) return;

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
    } catch {
      // Grading unavailable — the event still happened, just ungraded.
    }
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
