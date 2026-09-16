import Phaser from 'phaser';
import { getLocation } from '../data/locations.js';
import { getInterior, activeTasks, rollRandomFlavor } from '../data/interiors.js';
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

// Generic walkable interior for any location listed in src/data/interiors.js
// (home, school, company, ...): a floor, a handful of props tied to
// age-gated chores, an NPC to chat with, and a door back to town. Which
// chores are required (skip it, get scolded) vs. optional (do it anyway,
// get praised) and which random flavor moments can fire is entirely driven
// by that location's interior config — this scene has no location-specific
// logic of its own.
export class IndoorScene extends Phaser.Scene {
  constructor() {
    super('Indoor');
  }

  init(data) {
    this.locationId = data?.locationId;
  }

  create() {
    this.character = this.registry.get('character');
    this.location = getLocation(this.locationId);
    this.interior = getInterior(this.locationId);
    if (!this.character || !this.location || !this.interior) {
      this.scene.start('Town');
      return;
    }

    this.tasks = activeTasks(this.interior.tasks, this.character.age);
    this.taskByObject = new Map(this.tasks.map((t) => [t.object, t]));
    this.taskDone = {};
    this.chatLog = [];

    this.add.tileSprite(0, 0, 480, 800, 'floor').setOrigin(0, 0).setTint(this.interior.floorTint ?? 0xffffff);

    this.objects = this.interior.objects.map((o) => ({
      ...o,
      name: o.isNpc ? this.location.npcName : o.name,
    }));
    this.objects.push({ id: 'door', name: '문 (나가기)', x: 240, y: 760, tint: 0x66dd66 });

    for (const obj of this.objects) {
      this.add.sprite(obj.x, obj.y, obj.texture ?? 'prop').setTint(obj.tint);
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
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    });
    this.refreshHud();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D,E,SPACE');
  }

  refreshHud() {
    // Plain bracket markers instead of emoji glyphs: Phaser draws HUD text on
    // a canvas, and headless/some browsers lack a color-emoji font, which
    // makes emoji glyphs render as invisible/tofu there.
    const todo = this.tasks
      .map((t) => `[${this.taskDone[t.id] ? '완료' : t.required ? '필수' : '선택'}] ${t.label}`)
      .join('  ');
    this.hud.setText(`${this.location.name}\n${todo}`);
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
    if (obj.id === 'door') return this.leave();

    const task = this.taskByObject.get(obj.id);
    if (task && !this.taskDone[task.id]) {
      this.taskDone[task.id] = true;
      applyStatDeltas(this.character, task.doneDelta ?? {});
      this.refreshHud();
      this.toast(task.doneMessage);
    } else if (task) {
      this.toast('이미 했다.');
    } else {
      this.toast(`${obj.name}...`);
    }

    if (obj.isNpc) this.openChat();
  }

  toast(message) {
    const text = this.add.text(240, 100, message, {
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 5 },
      wordWrap: { width: 420 },
      align: 'center',
    }).setOrigin(0.5);
    this.time.delayedCall(1800, () => text.destroy());
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
    this.renderChatPanel();
  }

  leave() {
    const visit = visitLocation(this.character, this.location);
    if (!visit.ok) {
      this.scene.start('Town');
      return;
    }
    advanceAge(this.character);

    this.visitLog = [];
    for (const task of this.tasks) {
      if (task.required && !this.taskDone[task.id]) {
        applyStatDeltas(this.character, task.missDelta ?? {});
        this.character.history.push(`${this.character.age}세 - ${task.missMessage}`);
        this.visitLog.push({ type: 'scold', text: task.missMessage });
      }
    }

    const flavor = rollRandomFlavor(this.interior.flavor, this.character.age);
    if (flavor) {
      applyStatDeltas(this.character, flavor.delta);
      this.character.history.push(`${this.character.age}세 - ${flavor.text}`);
      this.visitLog.push({ type: flavor.type, text: flavor.text });
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
    const logHtml = this.visitLog
      .map((entry) => `<p class="${entry.type === 'scold' ? 'error' : ''}">${entry.type === 'praise' ? '😊' : '😠'} ${entry.text}</p>`)
      .join('');
    const injuryHtml = this.injuryMessage ? `<p class="error">⚠ ${this.injuryMessage}</p>` : '';

    const eventHtml = this.eventScenario
      ? `
        <p><strong>${this.eventScenario}</strong></p>
        <textarea id="event-response" maxlength="200" placeholder="어떻게 대응할지 적어보세요"></textarea>
        <button id="event-submit">대응하기</button>
      `
      : `<button id="indoor-leave-confirm">마을로 나가기</button>`;

    openPanel(`
      <div class="panel">
        <h2>오늘 하루</h2>
        ${logHtml || '<p>조용한 하루였다.</p>'}
        ${injuryHtml}
        ${eventHtml}
      </div>
    `);

    if (this.eventScenario) {
      qs('event-submit').addEventListener('click', () => this.handleEventSubmit());
    } else {
      qs('indoor-leave-confirm').addEventListener('click', () => {
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
