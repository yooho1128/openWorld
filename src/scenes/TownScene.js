import Phaser from 'phaser';
import { getAdvancement, getClass, getCompanion, xpForLevel } from '../data/rpg.js';
import { addFantasyBackdrop, addOrnatePanel, addSceneTitle } from '../ui/fantasyTheme.js';
import { combatPower, combatStats, ensureRpgCharacter, nextAdvancementStage } from '../state/rpgCharacter.js';
import { createEquippedHero } from '../ui/equipmentVisuals.js';
import { claimableCount } from '../state/quests.js';
import { getTitle } from '../data/quests.js';

const HUBS = [
  { label: '사냥 게시판', sub: '지역을 골라 출정', scene: 'Hunt', icon: '⚔', color: 0x9f4738 },
  { label: '의뢰소', sub: '일일 의뢰 · 업적 · 칭호', scene: 'Quest', icon: '⚑', color: 0x5e7a3f, badge: 'quest' },
  { label: '우편함', sub: '받은 편지 수령', scene: 'Mailbox', icon: '✉', color: 0x3f6a7a, badge: 'mail' },
  { label: '황금 뿔피리', sub: '동료 모집 · 파티', scene: 'Tavern', icon: '♞', color: 0x9b6b3f },
  { label: '상인 리아', sub: '거래할수록 우호도 상승', scene: 'NPC', data: { npcId: 'merchant' }, icon: '◆', color: 0xb28a43 },
  { label: '길드장 브란', sub: '의뢰 완료할수록 우호도 상승', scene: 'NPC', data: { npcId: 'guildmaster' }, icon: '♜', color: 0x795042 },
  { label: '달빛 여관', sub: '휴식할수록 우호도 상승', scene: 'NPC', data: { npcId: 'innkeeper' }, icon: '☾', color: 0x55795e },
  { label: '상태 · 장비', sub: '스탯과 장비 착용', scene: 'Status', icon: '▣', color: 0x4d7086 },
  { label: '대장간', sub: '장비 강화 +20', scene: 'Blacksmith', icon: '⚒', color: 0x75584c },
  { label: '명예의 전당', sub: '레벨 · 승리 랭킹', scene: 'Ranking', icon: '♛', color: 0x8a6a2a },
];

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character?.classId) return this.scene.start('Login');
    if (nextAdvancementStage(this.character)) return this.scene.start('Advancement');
    addFantasyBackdrop(this, { accent: 0x85a873 });
    addSceneTitle(this, '에버글렌 모험가 길드', '사냥을 준비하고 왕국의 인연을 쌓으세요');
    this.renderHeroCard();
    HUBS.forEach((hub, index) => this.addHub(hub, index));
    const eventButton = this.add.rectangle(55, 105, 92, 30, 0x7e2938, 0.98).setStrokeStyle(1, 0xffc56b).setInteractive({ useHandCursor: true });
    const eventText = this.add.text(55, 105, '✦ 이벤트', { fontSize: '11px', fontStyle: 'bold', color: '#ffe9ae' }).setOrigin(0.5);
    this.tweens.add({ targets: [eventButton, eventText], alpha: 0.68, duration: 850, yoyo: true, repeat: -1 });
    eventButton.on('pointerdown', () => this.scene.start('Event'));
    const astrologer = this.add.rectangle(240, 105, 104, 30, 0x44316f, 0.98).setStrokeStyle(1, 0xdab8ff).setInteractive({ useHandCursor: true });
    const astrologerText = this.add.text(240, 105, '✧ 점성술사', { fontSize: '11px', fontStyle: 'bold', color: '#f1ddff' }).setOrigin(0.5);
    this.tweens.add({ targets: [astrologer, astrologerText], scaleX: 1.035, scaleY: 1.035, duration: 1200, yoyo: true, repeat: -1 });
    astrologer.on('pointerdown', () => this.scene.start('Astrologer'));
    const settings = this.add.rectangle(425, 105, 82, 30, 0x213229, 0.96).setStrokeStyle(1, 0xe0c274).setInteractive({ useHandCursor: true });
    this.add.text(425, 105, '⚙ 설정', { fontSize: '11px', color: '#ffe5a5' }).setOrigin(0.5);
    settings.on('pointerdown', () => this.scene.start('Settings'));
  }

  renderHeroCard() {
    const c = this.character;
    const job = getClass(c.classId);
    const advancement = getAdvancement(c.advancementId);
    const stats = combatStats(c);
    const companion = getCompanion(c.activeCompanionId);
    const title = getTitle(c.equippedTitle);
    addOrnatePanel(this, 240, 186, 432, 112, { color: 0x1b2d25, border: job.color, alpha: 0.96 });
    createEquippedHero(this, c, 74, 184, 1.35);
    const heroLine = `${title ? `[${title.name}] ` : ''}${c.name}  Lv.${c.level}  ${advancement?.name ?? job.name}  · 전투력 ${combatPower(c).toLocaleString()}`;
    this.add.text(116, 145, heroLine, { fontSize: heroLine.length > 34 ? '9px' : title ? '11px' : '13px', fontStyle: 'bold', color: '#ffe6a7', fixedWidth: 328 });
    this.add.text(116, 174, `HP ${c.hp}/${stats.maxHp}   MP ${c.mp}/${stats.maxMp}   골드 ${c.gold.toLocaleString()}`, { fontSize: '11px', color: '#d9c9a6' });
    const xpText = c.level >= 999 ? 'MAX' : `${c.xp}/${xpForLevel(c.level)}`;
    this.add.text(116, 198, `공격 ${stats.attack} · 방어 ${stats.defense} · 민첩 ${stats.agility}   경험치 ${xpText}`, { fontSize: '9px', color: '#9fc7a4', fixedWidth: 328 });
    this.add.text(116, 219, companion ? `동료: ${companion.name} · ${companion.className}` : '동료: 아직 없음 — 여관에서 모집 가능', { fontSize: '10px', color: companion ? '#b8b0e5' : '#a99d89', fixedWidth: 328 });
  }

  addHub(hub, index) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 128 + col * 224;
    const y = 305 + row * 100;
    const card = addOrnatePanel(this, x, y, 204, 92, { color: 0x1d2f27, border: hub.color, alpha: 0.95 });
    const bg = this.add.rectangle(x, y, 204, 92, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    this.add.circle(x - 69, y + 3, 28, 0x0b1511, 0.32);
    this.add.circle(x - 69, y, 25, hub.color, 0.82).setStrokeStyle(2, 0xffe7ad, 0.28);
    this.add.text(x - 69, y, hub.icon, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#fff0c0' }).setOrigin(0.5);
    this.add.text(x - 31, y - 20, hub.label, { fontSize: hub.label.length > 8 ? '12px' : '14px', fontStyle: 'bold', color: '#f5dfac', fixedWidth: 116 });
    this.add.text(x - 31, y + 8, hub.sub, { fontSize: hub.sub.length > 15 ? '9px' : '10px', color: '#b8aa8d', fixedWidth: 116, wordWrap: { width: 116 } });
    if (hub.badge) {
      const count = hub.badge === 'quest' ? claimableCount(this.character) : hub.badge === 'mail' ? this.character.mailbox.length : 0;
      if (count > 0) {
        this.add.circle(x + 90, y - 34, 12, 0xb43b35, 0.95).setStrokeStyle(1, 0xffe6a1);
        this.add.text(x + 90, y - 34, String(count), { fontSize: '11px', fontStyle: 'bold', color: '#fff0c0' }).setOrigin(0.5);
      }
    }
    bg.on('pointerdown', () => this.scene.start(hub.scene, hub.data));
    bg.on('pointerover', () => { card.panel.setAlpha(0.82); bg.setScale(1.018); });
    bg.on('pointerout', () => { card.panel.setAlpha(1); bg.setScale(1); });
  }
}
