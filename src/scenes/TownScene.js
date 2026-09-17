import Phaser from 'phaser';
import { getClass, getCompanion, xpForLevel } from '../data/rpg.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const HUBS = [
  { label: '사냥 게시판', sub: '지역을 골라 출정', scene: 'Hunt', icon: '⚔', color: 0x9f4738 },
  { label: '황금 뿔피리', sub: '동료 모집 · 파티', scene: 'Tavern', icon: '♞', color: 0x9b6b3f },
  { label: '상인 리아', sub: '대화 · 거래', scene: 'NPC', data: { npcId: 'merchant' }, icon: '◆', color: 0xb28a43 },
  { label: '길드장 브란', sub: '의뢰 · 대화', scene: 'NPC', data: { npcId: 'guildmaster' }, icon: '♜', color: 0x795042 },
  { label: '달빛 여관', sub: '회복 · 대화', scene: 'NPC', data: { npcId: 'innkeeper' }, icon: '☾', color: 0x55795e },
  { label: '인벤토리', sub: '전리품과 물약', scene: 'Inventory', icon: '▣', color: 0x4d7086 },
  { label: '몬스터 도감', sub: '발견 가능한 120종', scene: 'MonsterDex', icon: '✦', color: 0x66558d },
  { label: '대장간', sub: '장비 이야기', scene: 'NPC', data: { npcId: 'blacksmith' }, icon: '⚒', color: 0x75584c },
];

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }
  create() {
    this.character = this.registry.get('character');
    if (!this.character?.classId) return this.scene.start('Login');
    addFantasyBackdrop(this);
    addSceneTitle(this, '에버글렌 모험가 길드', '사냥을 준비하고 왕국의 인연을 쌓으세요');
    this.renderHeroCard();
    HUBS.forEach((hub, index) => this.addHub(hub, index));
  }

  renderHeroCard() {
    const c = this.character;
    const job = getClass(c.classId);
    const companion = getCompanion(c.activeCompanionId);
    const panel = this.add.graphics();
    panel.fillStyle(0x17130f, 0.9).fillRoundedRect(24, 130, 432, 112, 10);
    panel.lineStyle(2, job.color, 0.8).strokeRoundedRect(24, 130, 432, 112, 10);
    this.add.sprite(74, 184, 'player').setScale(1.35);
    this.add.text(116, 145, `${c.name}  Lv.${c.level}  ${job.name}`, { fontSize: '15px', fontStyle: 'bold', color: '#ffe6a7' });
    this.add.text(116, 174, `HP ${c.hp}/${c.maxHp}   MP ${c.mp}/${c.maxMp}   골드 ${c.gold.toLocaleString()}`, { fontSize: '11px', color: '#d9c9a6' });
    this.add.text(116, 198, `경험치 ${c.xp}/${xpForLevel(c.level)}   승리 ${c.victories}회`, { fontSize: '11px', color: '#9fc7a4' });
    this.add.text(116, 219, companion ? `동료: ${companion.name} · ${companion.className}` : '동료: 아직 없음 — 여관에서 모집 가능', { fontSize: '10px', color: companion ? '#b8b0e5' : '#a99d89' });
  }

  addHub(hub, index) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 128 + col * 224;
    const y = 305 + row * 112;
    const bg = this.add.rectangle(x, y, 204, 92, 0x241b16, 0.94).setStrokeStyle(2, hub.color, 0.9).setInteractive({ useHandCursor: true });
    this.add.circle(x - 69, y, 25, hub.color, 0.72);
    this.add.text(x - 69, y, hub.icon, { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#fff0c0' }).setOrigin(0.5);
    this.add.text(x - 31, y - 20, hub.label, { fontSize: '14px', fontStyle: 'bold', color: '#f5dfac' });
    this.add.text(x - 31, y + 8, hub.sub, { fontSize: '10px', color: '#b8aa8d' });
    bg.on('pointerdown', () => this.scene.start(hub.scene, hub.data));
    bg.on('pointerover', () => bg.setFillStyle(0x463429));
    bg.on('pointerout', () => bg.setFillStyle(0x241b16));
  }
}
