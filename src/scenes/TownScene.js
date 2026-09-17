import Phaser from 'phaser';
import { getClass, getCompanion, xpForLevel } from '../data/rpg.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';
import { combatStats, ensureRpgCharacter } from '../state/rpgCharacter.js';
import { createEquippedHero } from '../ui/equipmentVisuals.js';
import { claimableCount } from '../state/quests.js';

const HUBS = [
  { label: '사냥 게시판', sub: '지역을 골라 출정', scene: 'Hunt', icon: '⚔', color: 0x9f4738 },
  { label: '의뢰소', sub: '일일 의뢰 · 업적', scene: 'Quest', icon: '⚑', color: 0x5e7a3f, badge: 'quest' },
  { label: '우편함', sub: '받은 편지 수령', scene: 'Mailbox', icon: '✉', color: 0x3f6a7a, badge: 'mail' },
  { label: '황금 뿔피리', sub: '동료 모집 · 파티', scene: 'Tavern', icon: '♞', color: 0x9b6b3f },
  { label: '상인 리아', sub: '대화 · 거래', scene: 'NPC', data: { npcId: 'merchant' }, icon: '◆', color: 0xb28a43 },
  { label: '길드장 브란', sub: '의뢰 · 대화', scene: 'NPC', data: { npcId: 'guildmaster' }, icon: '♜', color: 0x795042 },
  { label: '달빛 여관', sub: '회복 · 대화', scene: 'NPC', data: { npcId: 'innkeeper' }, icon: '☾', color: 0x55795e },
  { label: '상태 · 장비', sub: '스탯과 장비 착용', scene: 'Status', icon: '▣', color: 0x4d7086 },
  { label: '대장간', sub: '장비 강화 +20', scene: 'Blacksmith', icon: '⚒', color: 0x75584c },
  { label: '명예의 전당', sub: '레벨 · 승리 랭킹', scene: 'Ranking', icon: '♛', color: 0x8a6a2a },
];

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character?.classId) return this.scene.start('Login');
    if (this.character.level >= 10 && !this.character.advancementId) return this.scene.start('Advancement');
    addFantasyBackdrop(this);
    addSceneTitle(this, '에버글렌 모험가 길드', '사냥을 준비하고 왕국의 인연을 쌓으세요');
    this.renderHeroCard();
    HUBS.forEach((hub, index) => this.addHub(hub, index));
    const settings = this.add.rectangle(425, 105, 82, 30, 0x33261e, 0.95).setStrokeStyle(1, 0xc79a4b).setInteractive({ useHandCursor: true });
    this.add.text(425, 105, '⚙ 설정', { fontSize: '11px', color: '#ffe5a5' }).setOrigin(0.5);
    settings.on('pointerdown', () => this.scene.start('Settings'));
  }

  renderHeroCard() {
    const c = this.character;
    const job = getClass(c.classId);
    const stats = combatStats(c);
    const companion = getCompanion(c.activeCompanionId);
    const panel = this.add.graphics();
    panel.fillStyle(0x17130f, 0.9).fillRoundedRect(24, 130, 432, 112, 10);
    panel.lineStyle(2, job.color, 0.8).strokeRoundedRect(24, 130, 432, 112, 10);
    createEquippedHero(this, c, 74, 184, 1.35);
    this.add.text(116, 145, `${c.name}  Lv.${c.level}  ${job.name}`, { fontSize: '15px', fontStyle: 'bold', color: '#ffe6a7' });
    this.add.text(116, 174, `HP ${c.hp}/${stats.maxHp}   MP ${c.mp}/${stats.maxMp}   골드 ${c.gold.toLocaleString()}`, { fontSize: '11px', color: '#d9c9a6' });
    this.add.text(116, 198, `공격 ${stats.attack} · 방어 ${stats.defense} · 민첩 ${stats.agility}   경험치 ${c.xp}/${xpForLevel(c.level)}`, { fontSize: '9px', color: '#9fc7a4' });
    this.add.text(116, 219, companion ? `동료: ${companion.name} · ${companion.className}` : '동료: 아직 없음 — 여관에서 모집 가능', { fontSize: '10px', color: companion ? '#b8b0e5' : '#a99d89' });
  }

  addHub(hub, index) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 128 + col * 224;
    const y = 305 + row * 100;
    const bg = this.add.rectangle(x, y, 204, 92, 0x241b16, 0.94).setStrokeStyle(2, hub.color, 0.9).setInteractive({ useHandCursor: true });
    this.add.circle(x - 69, y, 25, hub.color, 0.72);
    this.add.text(x - 69, y, hub.icon, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#fff0c0' }).setOrigin(0.5);
    this.add.text(x - 31, y - 20, hub.label, { fontSize: '14px', fontStyle: 'bold', color: '#f5dfac' });
    this.add.text(x - 31, y + 8, hub.sub, { fontSize: '10px', color: '#b8aa8d' });
    if (hub.badge) {
      const count = hub.badge === 'quest' ? claimableCount(this.character) : hub.badge === 'mail' ? this.character.mailbox.length : 0;
      if (count > 0) {
        this.add.circle(x + 90, y - 34, 12, 0xb43b35, 0.95).setStrokeStyle(1, 0xffe6a1);
        this.add.text(x + 90, y - 34, String(count), { fontSize: '11px', fontStyle: 'bold', color: '#fff0c0' }).setOrigin(0.5);
      }
    }
    bg.on('pointerdown', () => this.scene.start(hub.scene, hub.data));
    bg.on('pointerover', () => bg.setFillStyle(0x463429));
    bg.on('pointerout', () => bg.setFillStyle(0x241b16));
  }
}
