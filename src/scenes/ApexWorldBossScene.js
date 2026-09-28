import Phaser from 'phaser';
import { apexWorldBossWeapon, equipmentDisplayName, getRarity } from '../data/equipment.js';
import { getPotion } from '../data/potions.js';
import { addLoot, addXp, combatPower, grantCompanionXp, saveCharacter } from '../state/rpgCharacter.js';
import { addFantasyBackdrop } from '../ui/fantasyTheme.js';
import { WorldBossScene } from './WorldBossScene.js';

export const APEX_RECOMMENDED_POWER = 75000;

const NOCTIS = {
  id: 'apex-world-boss-noctis',
  name: '운명을 베는 월식의 집행자 · 녹티스',
  rank: 'MYTHIC',
  biome: 'abyss',
  trait: '운명 절단',
};

const ECLIPSE_CLUES = {
  left: {
    sigil: '그믐의 잔광',
    clue: '낫의 그림자가 오른쪽을 삼킨다. 빛이 마지막으로 남은 그믐의 잔광을 따라라.',
  },
  center: {
    sigil: '멈춘 초침',
    clue: '검은 시계의 두 바늘이 좌우로 갈라진다. 시간이 멈춘 중심으로 파고들어라.',
  },
  right: {
    sigil: '초승의 칼끝',
    clue: '낫의 그림자가 왼쪽을 삼킨다. 새로 돋는 초승의 칼끝을 따라라.',
  },
};

function createNoctis(scene) {
  const boss = scene.add.container(342, 220).setDepth(8);
  const eclipse = scene.add.graphics();
  eclipse.fillStyle(0x05040a, 0.96).fillCircle(0, -17, 91);
  eclipse.lineStyle(9, 0xd7b8ff, 0.72).strokeCircle(0, -17, 96);
  eclipse.lineStyle(3, 0xff4f79, 0.62).strokeCircle(0, -17, 112);

  const cloak = scene.add.graphics();
  cloak.fillStyle(0x171020, 1).fillTriangle(-46, -24, -82, 98, 0, 72).fillTriangle(46, -24, 82, 98, 0, 72);
  cloak.fillStyle(0x4c1748, 0.82).fillTriangle(-35, -12, -56, 78, 0, 55).fillTriangle(35, -12, 56, 78, 0, 55);
  cloak.lineStyle(3, 0xb56cc8, 0.75).lineBetween(-46, -24, -82, 98).lineBetween(46, -24, 82, 98);

  const body = scene.add.graphics();
  body.fillStyle(0x2a1834, 1).fillRoundedRect(-29, -52, 58, 113, 20);
  body.fillStyle(0xd9c6ee, 1).fillCircle(0, -69, 25);
  body.fillStyle(0x130d1a, 1).fillTriangle(-25, -73, 0, -106, 25, -73);
  body.fillStyle(0xff426c, 1).fillCircle(-8, -70, 3).fillCircle(8, -70, 3);
  body.lineStyle(4, 0xe4c878, 0.8).strokeRoundedRect(-29, -52, 58, 113, 20);

  const scythe = scene.add.graphics();
  scythe.lineStyle(8, 0xb8a8ce, 1).lineBetween(38, -70, 87, 91);
  scythe.lineStyle(4, 0xf5dc83, 0.9).lineBetween(38, -70, 87, 91);
  scythe.fillStyle(0xdccaff, 1).fillTriangle(31, -82, 112, -74, 52, -48);
  scythe.fillStyle(0xff5078, 0.72).fillTriangle(48, -75, 105, -72, 58, -58);

  const core = scene.add.text(0, 3, 'Ⅻ', { fontFamily: 'Georgia, serif', fontSize: '19px', fontStyle: 'bold', color: '#fff0ad', stroke: '#6a174a', strokeThickness: 4 }).setOrigin(0.5);
  boss.add([eclipse, cloak, body, scythe, core]);
  scene.tweens.add({ targets: boss, y: 210, duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: eclipse, angle: 360, duration: 7200, repeat: -1 });
  scene.tweens.add({ targets: scythe, angle: 7, duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: core, scale: 1.35, alpha: 0.5, duration: 520, yoyo: true, repeat: -1 });
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    const numeral = scene.add.text(Math.cos(angle) * 108, -17 + Math.sin(angle) * 86, String(index + 1), {
      fontFamily: 'Georgia, serif', fontSize: '9px', color: index % 3 ? '#d9c5ff' : '#ff829e',
    }).setOrigin(0.5);
    boss.add(numeral);
    scene.tweens.add({ targets: numeral, alpha: 0.25, scale: 1.5, duration: 520 + index * 55, yoyo: true, repeat: -1 });
  }
  return boss;
}

export class ApexWorldBossScene extends WorldBossScene {
  constructor() { super('ApexWorldBoss'); }

  create() {
    super.create();
    // 긴 보스 상태와 다음 공격 예고가 겹치지 않도록 예고판을 빈 좌상단으로 옮긴다.
    this.intentText?.setPosition(142, 157).setFontSize('10px');
  }

  getWorldBoss() { return NOCTIS; }

  getCombatTuning() {
    return {
      damageScale: 0.62,
      heartDamageRatio: 0.03,
      turnLimit: 45,
      initialLog: `검은 달이 떠올랐다. 전투력 ${APEX_RECOMMENDED_POWER.toLocaleString()} 이상의 운명만이 버틸 수 있다.`,
      arrivalLabel: '월식의 집행자 강림',
      phaseLabels: ['PHASE I · 운명의 심판', 'PHASE II · 시간이 없는 밤', 'PHASE III · 완전 월식'],
      phaseBanners: ['PHASE I', 'PHASE II\n시간 장례식', 'FINAL PHASE\n완전 월식 · 운명 절단'],
      phaseLogs: ['', '녹티스가 시곗바늘을 꺾었다. 연속되는 사형 선고를 피해라!', '완전 월식이 시작된다. 세 번의 운명을 기억하지 못하면 소멸한다!'],
      memorySuccess: '세 개의 사형 선고를 역전했다! 녹티스의 운명핵',
      memoryPatternLabel: '완전 월식 · 운명 절단',
      memoryRecall: '검은 시계의 바늘은 이미 사라졌다.',
      chainPatternLabel: '연쇄 사형 선고',
      singlePatternLabel: '월식의 단두대',
      defeatMessage: '녹티스의 낫이 모험가의 남은 시간을 베어냈다...',
      dodgeClues: ECLIPSE_CLUES,
    };
  }

  createBossStats() {
    return { level: 999, maxHp: 2350000, attack: 7800, defense: 4500 };
  }

  createBossVisual() { return createNoctis(this); }

  buildArena() {
    addFantasyBackdrop(this, { dark: true, accent: 0xff426c });
    const sky = this.add.graphics().setDepth(1);
    sky.fillGradientStyle(0x020207, 0x100719, 0x2d0825, 0x080611, 0.92).fillRect(0, 0, 480, 470);
    sky.fillStyle(0xf2d7ff, 0.22).fillCircle(382, 91, 79);
    sky.fillStyle(0x050309, 1).fillCircle(397, 77, 70);
    sky.lineStyle(5, 0xff4b78, 0.45).strokeCircle(382, 91, 84);
    sky.fillStyle(0x080710, 0.96);
    for (let index = 0; index < 8; index += 1) sky.fillTriangle(index * 70 - 30, 414, index * 70 + 15, 245 - (index % 2) * 34, index * 70 + 61, 414);
    for (let index = 0; index < 22; index += 1) {
      const ash = this.add.rectangle((index * 79 + 11) % 480, 75 + (index * 43) % 340, 2 + index % 3, 7 + index % 5, index % 2 ? 0xff557d : 0xc7a9ee, 0.4).setDepth(4).setAngle(35);
      this.tweens.add({ targets: ash, y: ash.y - 95, x: ash.x + 22, alpha: 0.03, duration: 1300 + index * 70, yoyo: true, repeat: -1 });
    }
    this.add.text(240, 26, 'MYTHIC WORLD BOSS', { fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'bold', color: '#ff668a', letterSpacing: 5 }).setOrigin(0.5).setDepth(20);
    this.titleText = this.add.text(240, 51, NOCTIS.name, { fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '18px', fontStyle: 'bold', color: '#fff0c6', stroke: '#3b092e', strokeThickness: 5 }).setOrigin(0.5).setDepth(20);
    this.phaseText = this.add.text(240, 76, this.combatTuning.phaseLabels[0], { fontSize: '10px', fontStyle: 'bold', color: '#f0b8ff' }).setOrigin(0.5).setDepth(20);
    this.apexInfoText = this.add.text(18, 92, '', { fontSize: '9px', fontStyle: 'bold', color: '#ff9bb0', lineSpacing: 2 }).setDepth(20);
  }

  refreshStatus() {
    super.refreshStatus();
    if (!this.bossText) return;
    const power = combatPower(this.character);
    this.bossText.setText(`★ 신화 월드 보스 · Lv.999\nHP ${Math.max(0, this.boss.hp).toLocaleString()} / ${this.boss.maxHp.toLocaleString()}`);
    this.apexInfoText?.setText(`권장 전투력 ${APEX_RECOMMENDED_POWER.toLocaleString()}\n내 전투력 ${power.toLocaleString()}\n광폭화까지 ${Math.max(0, this.combatTuning.turnLimit - this.turn + 1)}턴`);
  }

  selectIntent() {
    this.clearPattern();
    const patternTurn = this.forcePhasePattern
      || (this.phase === 1 && this.turn % 3 === 0)
      || (this.phase === 2 && this.turn % 2 === 0)
      || (this.phase === 3 && this.turn % 2 === 1);
    if (patternTurn) {
      this.forcePhasePattern = false;
      const count = this.phase === 1 ? 1 : this.phase === 2 ? Phaser.Math.Between(2, 3) : 3;
      this.startLethalSequence(count, this.phase === 3);
      return;
    }
    const pool = this.phase === 1
      ? [{ type: 'claw', label: '초침 베기' }, { type: 'breath', label: '월광 처형' }, { type: 'wing', label: '망자의 행진' }]
      : [{ type: 'breath', label: '검은 달의 낙인' }, { type: 'wing', label: '시간 장례식' }, { type: 'claw', label: '운명 수확' }];
    this.intent = { ...Phaser.Utils.Array.GetRandom(pool), lethal: false };
    this.setCommandPage('main');
    this.intentText.setText(`${this.intent.label}\n${this.intent.type === 'breath' ? '치명적인 일격 · 방어 권장' : '신화급 공격 · 방어 가능'}`);
  }

  victory() {
    this.busy = true;
    this.clearPattern();
    const xp = 180000;
    const weapon = apexWorldBossWeapon(NOCTIS, this.character.classId, 999);
    if (weapon) addLoot(this.character, weapon);
    const chestRewards = Phaser.Utils.Array.Shuffle([
      { type: 'gold', amount: 350000 },
      this.rollWorldBossSpecialChest(),
      this.rollWorldBossSpecialChest(),
    ]);
    this.character.victories += 1;
    this.character.bossVictories = (this.character.bossVictories ?? 0) + 1;
    this.character.worldBossVictories = (this.character.worldBossVictories ?? 0) + 1;
    this.character.hunted[NOCTIS.id] = (this.character.hunted[NOCTIS.id] ?? 0) + 1;
    const levels = addXp(this.character, xp);
    const companionLevels = this.companion ? grantCompanionXp(this.character, this.companion.id, Math.round(xp * 0.18)) : [];
    saveCharacter(this);
    this.cameras.main.flash(800, 255, 205, 235, false);
    for (let index = 0; index < 34; index += 1) {
      const shard = this.add.text(Phaser.Math.Between(20, 460), Phaser.Math.Between(45, 430), index % 2 ? '☾' : '✦', { fontSize: `${11 + index % 5 * 3}px`, color: index % 3 ? '#e7c5ff' : '#ff7899' }).setDepth(50);
      this.tweens.add({ targets: shard, y: shard.y - 135, angle: 360, alpha: 0, duration: 900 + index * 28, onComplete: () => shard.destroy() });
    }
    const rarity = weapon ? getRarity(weapon.rarity).name : '보상';
    const weaponLine = weapon ? `${rarity} 확정 무기: ${equipmentDisplayName(weapon)}` : '무기 보상 지급';
    const extra = `${levels.length ? ` · Lv.${levels.at(-1)}` : ''}${companionLevels.length ? ` · ${this.companion.name} 유대 Lv.${companionLevels.at(-1)}` : ''}`;
    this.showVictoryChests(chestRewards, `${weaponLine}\n${xp.toLocaleString()} XP${extra}`);
  }

  rollWorldBossSpecialChest() {
    const roll = Math.random();
    if (roll < 0.4) return { type: 'gold', amount: 250000 };
    if (roll < 0.65) return { type: 'potion', potionId: 'potion-elixir', amount: 2 };
    if (roll < 0.9) return { type: 'scroll', amount: 2 };
    return {
      type: 'junk',
      item: {
        id: `junk-noctis-hourglass-${Date.now().toString(36)}`,
        name: '멈춰 버린 녹티스의 모래시계',
        type: 'junk',
        rarity: 'MYTHIC',
        quantity: 1,
        value: 120000,
      },
    };
  }

  worldBossRewardLabel(reward) {
    if (reward.type === 'potion') return `${getPotion(reward.potionId)?.name ?? '만능 영약'}\n${reward.amount}개`;
    return super.worldBossRewardLabel(reward);
  }
}
