import { ensureRpgCharacter, equippedItems, strongestEquippedItem } from '../state/rpgCharacter.js';
import { equipmentSetBonus, getRarity } from '../data/equipment.js';

export const FULL_SET_VISUALS = {
  forest: { name: '숲의 완전 공명', color: 0x75c85c, secondary: 0xd6ef83, symbol: '☘', particle: 'leaf' },
  frozen: { name: '설원의 완전 공명', color: 0x8ee8ff, secondary: 0xf1fdff, symbol: '❄', particle: 'crystal' },
  blood: { name: '피빛 완전 공명', color: 0xe43f50, secondary: 0xffb07e, symbol: '✥', particle: 'blade' },
  swamp: { name: '늪지의 완전 공명', color: 0xa7c957, secondary: 0x72559a, symbol: '☣', particle: 'spore' },
  desert: { name: '사막의 완전 공명', color: 0xe9b95f, secondary: 0xffe3a1, symbol: '☀', particle: 'sand' },
  volcanic: { name: '화염의 완전 공명', color: 0xff6038, secondary: 0xffd05a, symbol: '▲', particle: 'flame' },
  storm: { name: '폭풍의 완전 공명', color: 0x75baff, secondary: 0xf5ef8b, symbol: 'ϟ', particle: 'bolt' },
  abyss: { name: '심연의 완전 공명', color: 0x8c65d8, secondary: 0x54e1cf, symbol: '∅', particle: 'void' },
  undead: { name: '망령의 완전 공명', color: 0x92e6ba, secondary: 0xd9fff0, symbol: '†', particle: 'soul' },
  demonic: { name: '마계의 완전 공명', color: 0xd83f68, secondary: 0xff9a49, symbol: 'Ψ', particle: 'rune' },
  celestial: { name: '성광의 완전 공명', color: 0xffdf72, secondary: 0xd3eeff, symbol: '✦', particle: 'star' },
  crystal: { name: '수정의 완전 공명', color: 0xa98cff, secondary: 0x79f1ef, symbol: '◈', particle: 'shard' },
};

export function fullSetVisualProfile(character) {
  const setBonus = equipmentSetBonus(equippedItems(character));
  return setBonus.count >= 10 ? { ...FULL_SET_VISUALS[setBonus.biome], biome: setBonus.biome } : null;
}

function createFullSetEffect(scene, character) {
  const profile = fullSetVisualProfile(character);
  const back = scene.add.container(0, 0);
  const front = scene.add.container(0, 0);
  if (!profile) return { back, front };

  const halo = scene.add.graphics();
  halo.fillStyle(profile.color, 0.11).fillCircle(0, 0, 43);
  halo.lineStyle(2.5, profile.color, 0.72).strokeCircle(0, 0, 39);
  halo.lineStyle(1.5, profile.secondary, 0.58).strokeEllipse(0, 12, 92, 28);
  halo.lineStyle(1, profile.color, 0.45).strokeEllipse(0, 12, 64, 72);
  back.add(halo);
  scene.tweens.add({ targets: halo, angle: 360, duration: 7200, repeat: -1, ease: 'Linear' });

  const sigil = scene.add.text(0, -42, profile.symbol, {
    fontFamily: 'Georgia, serif', fontSize: '19px', fontStyle: 'bold', color: `#${profile.secondary.toString(16).padStart(6, '0')}`,
    stroke: '#1a1020', strokeThickness: 3,
  }).setOrigin(0.5);
  front.add(sigil);
  scene.tweens.add({ targets: sigil, y: -47, scale: 1.18, alpha: 0.58, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  if (['crystal', 'shard'].includes(profile.particle)) {
    const crown = scene.add.graphics();
    crown.fillStyle(profile.color, 0.34)
      .fillTriangle(-48, 10, -34, -24, -24, 14)
      .fillTriangle(48, 10, 34, -24, 24, 14)
      .fillTriangle(-30, -18, -16, -43, -9, -9)
      .fillTriangle(30, -18, 16, -43, 9, -9);
    crown.lineStyle(1.5, profile.secondary, 0.7).lineBetween(-48, 10, -34, -24).lineBetween(48, 10, 34, -24);
    back.add(crown);
    scene.tweens.add({ targets: crown, alpha: 0.48, scaleY: 1.12, duration: 900, yoyo: true, repeat: -1 });
  } else if (profile.particle === 'void') {
    const rift = scene.add.graphics();
    rift.fillStyle(0x090412, 0.48).fillEllipse(0, 4, 56, 78);
    rift.lineStyle(3, profile.secondary, 0.58).strokeEllipse(0, 4, 58, 82);
    back.add(rift);
    scene.tweens.add({ targets: rift, scaleX: 0.82, alpha: 0.52, duration: 760, yoyo: true, repeat: -1 });
  } else if (['flame', 'demonic'].includes(profile.particle)) {
    const wings = scene.add.graphics();
    wings.fillStyle(profile.color, 0.28).fillTriangle(-8, 7, -55, -18, -35, 30).fillTriangle(8, 7, 55, -18, 35, 30);
    wings.lineStyle(2, profile.secondary, 0.55).lineBetween(-8, 7, -53, -17).lineBetween(8, 7, 53, -17);
    back.add(wings);
    scene.tweens.add({ targets: wings, scaleY: 1.16, alpha: 0.55, duration: 620, yoyo: true, repeat: -1 });
  }

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    const startX = Math.cos(angle) * (32 + (index % 2) * 8);
    const startY = Math.sin(angle) * 29 + 2;
    let mote;
    if (['bolt', 'rune', 'star', 'soul'].includes(profile.particle)) {
      const marks = { bolt: 'ϟ', rune: index % 2 ? 'Ψ' : '◇', star: index % 2 ? '✦' : '·', soul: index % 2 ? '◌' : '†' };
      mote = scene.add.text(startX, startY, marks[profile.particle], {
        fontFamily: 'Georgia, serif', fontSize: `${6 + (index % 3) * 2}px`, color: `#${(index % 2 ? profile.color : profile.secondary).toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
    } else if (['blade', 'leaf', 'shard', 'crystal', 'flame'].includes(profile.particle)) {
      mote = scene.add.triangle(startX, startY, 0, 8, 3 + (index % 2) * 2, 0, 7, 8, index % 2 ? profile.color : profile.secondary, 0.86);
      mote.setAngle(index * 45);
    } else {
      mote = scene.add.circle(startX, startY, 2 + (index % 3), index % 2 ? profile.color : profile.secondary, 0.82);
    }
    front.add(mote);
    const rise = ['flame', 'spore', 'soul', 'void'].includes(profile.particle);
    scene.tweens.add({
      targets: mote,
      x: Math.cos(angle + 0.7) * (43 + (index % 2) * 7),
      y: rise ? startY - 28 : Math.sin(angle + 0.7) * 34,
      angle: mote.angle + (index % 2 ? 180 : -180),
      alpha: 0.18,
      scale: 1.35,
      duration: 900 + index * 95,
      delay: index * 70,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  return { back, front };
}

export function createEquippedHero(scene, character, x, y, scale = 1) {
  ensureRpgCharacter(character);
  const container = scene.add.container(x, y).setScale(scale);
  const fullSetEffect = createFullSetEffect(scene, character);
  const aura = scene.add.graphics();
  const ascension = scene.add.container(0, 0);
  const base = scene.add.sprite(0, 0, 'player');
  const gear = scene.add.graphics();
  const equipment = character.equipment;
  const strongest = strongestEquippedItem(character);
  const classMarks = { warrior: '⚔', mage: '✦', ranger: '➶', cleric: '✚', rogue: '◆' };
  const classColors = { warrior: 0xd87055, mage: 0x8f7fe3, ranger: 0x72a95a, cleric: 0xf0cf75, rogue: 0x73629b };
  const classColor = classColors[character.classId] ?? 0x8fb493;
  aura.fillStyle(classColor, 0.09).fillCircle(0, 0, 29);
  aura.lineStyle(1.5, classColor, 0.42).strokeEllipse(0, 20, 55, 14);
  const cape = scene.add.graphics();
  cape.fillStyle(classColor, 0.76).fillTriangle(-10, -8, -20, 20, 0, 14).fillTriangle(10, -8, 20, 20, 0, 14);
  cape.lineStyle(1.5, 0xffe9ad, 0.45).lineBetween(-10, -7, -19, 19).lineBetween(10, -7, 19, 19);
  const classCrest = scene.add.text(0, 29, classMarks[character.classId] ?? '✦', {
    fontFamily: 'Georgia, serif', fontSize: '8px', color: '#fff1b6', stroke: '#2a1b18', strokeThickness: 2,
  }).setOrigin(0.5);
  ascension.add(classCrest);
  scene.tweens.add({ targets: classCrest, alpha: 0.48, duration: 950, yoyo: true, repeat: -1 });
  if (strongest && getRarity(strongest.rarity).order >= 2) {
    const color = getRarity(strongest.rarity).color;
    const enhancement = strongest.enhancement ?? 0;
    aura.fillStyle(color, 0.15).fillCircle(0, 0, 30 + enhancement * 0.6);
    aura.lineStyle(2, color, 0.5).strokeCircle(0, 0, 25 + enhancement * 0.5);
    scene.tweens.add({ targets: aura, alpha: 0.35, duration: 800, yoyo: true, repeat: -1 });

    if (enhancement >= 5) {
      const rings = scene.add.graphics();
      rings.lineStyle(1.5, enhancement >= 10 ? 0xffd56a : color, 0.72).strokeCircle(0, 0, 34 + enhancement * 0.45);
      rings.lineStyle(1, color, 0.48).strokeEllipse(0, 0, 72 + enhancement, 24 + enhancement * 0.5);
      rings.fillStyle(0xfff1a8, 0.82);
      for (let index = 0; index < 4; index += 1) rings.fillCircle(index % 2 ? 32 : -32, index < 2 ? -5 : 6, 1.5);
      ascension.add(rings);
      scene.tweens.add({ targets: rings, angle: 360, duration: Math.max(1900, 4300 - enhancement * 95), repeat: -1 });
    }
    if (enhancement >= 10) {
      const mythic = strongest.rarity === 'mythic';
      const runeColor = mythic ? '#ffd36d' : '#d9f4ff';
      ['✦', '◇', '✦', '◈'].forEach((symbol, index) => {
        const angle = (Math.PI * 2 * index) / 4;
        const rune = scene.add.text(Math.cos(angle) * 39, Math.sin(angle) * 33, symbol, { fontFamily: 'Georgia, serif', fontSize: '8px', color: runeColor }).setOrigin(0.5);
        ascension.add(rune);
        scene.tweens.add({ targets: rune, alpha: 0.25, scale: 1.45, duration: 520 + index * 110, yoyo: true, repeat: -1 });
      });
      for (let index = 0; index < 6; index += 1) {
        const spark = scene.add.circle(-26 + index * 11, 19 - (index % 3) * 16, 1.2, index % 2 ? 0xffd45f : color, 0.85);
        ascension.add(spark);
        scene.tweens.add({ targets: spark, y: spark.y - 25, x: spark.x + (index % 2 ? 7 : -5), alpha: 0, duration: 620 + index * 75, yoyo: true, repeat: -1 });
      }
    }
    if (enhancement >= 15) {
      const wings = scene.add.graphics();
      wings.fillStyle(color, 0.28).fillTriangle(-8, -2, -52, -31, -35, 17).fillTriangle(8, -2, 52, -31, 35, 17);
      wings.lineStyle(2, 0xffe9a2, 0.52).lineBetween(-9, 0, -51, -30).lineBetween(9, 0, 51, -30);
      ascension.add(wings);
      scene.tweens.add({ targets: wings, scaleY: 1.12, alpha: 0.48, duration: 650, yoyo: true, repeat: -1 });
    }
    if (enhancement >= 20) {
      const crown = scene.add.text(0, -39, '♛', { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#fff0a5', stroke: '#d33b4d', strokeThickness: 2 }).setOrigin(0.5);
      ascension.add(crown);
      scene.tweens.add({ targets: crown, y: -43, alpha: 0.55, duration: 720, yoyo: true, repeat: -1 });
    }
  }
  if (equipment.armor) {
    const color = equipment.armor.color ?? getRarity(equipment.armor.rarity).color;
    gear.fillStyle(color, 0.9).fillRoundedRect(-12, -2, 24, 22, 5);
    gear.lineStyle(2, getRarity(equipment.armor.rarity).color, 1).strokeRoundedRect(-12, -2, 24, 22, 5);
  }
  if (equipment.helmet) {
    const color = equipment.helmet.color ?? getRarity(equipment.helmet.rarity).color;
    gear.fillStyle(color, 0.95).fillRoundedRect(-12, -19, 24, 10, 4).fillTriangle(-11, -14, 0, -27, 11, -14);
  }
  if (equipment.gloves) {
    gear.fillStyle(equipment.gloves.color, 1).fillCircle(-15, 5, 4).fillCircle(15, 5, 4);
  }
  if (equipment.boots) {
    gear.fillStyle(equipment.boots.color, 1).fillRoundedRect(-12, 18, 9, 7, 2).fillRoundedRect(3, 18, 9, 7, 2);
  }
  if (equipment.weapon) {
    const weaponColor = getRarity(equipment.weapon.rarity).color;
    const weaponEnhancement = equipment.weapon.enhancement ?? 0;
    if (weaponEnhancement >= 10) gear.lineStyle(10, weaponColor, 0.2).lineBetween(15, 10, 27, -25);
    gear.lineStyle(4 + Math.min(3, Math.floor(weaponEnhancement / 5)), weaponColor, 1).lineBetween(15, 10, 25, -21);
    if (weaponEnhancement >= 10) {
      gear.lineStyle(2, 0xfff3a8, 0.95).lineBetween(18, 5, 27, -23);
      gear.fillStyle(0xffd45f, 0.9).fillCircle(27, -24, 2.5 + Math.min(2, weaponEnhancement / 10));
    }
    gear.lineStyle(2, 0xf7e7ba, 1).lineBetween(13, -8, 24, -4);
  }
  if (equipment.necklace) gear.fillStyle(getRarity(equipment.necklace.rarity).color, 1).fillCircle(0, 2, 3);
  equipment.rings.filter(Boolean).forEach((item, index) => gear.lineStyle(2, getRarity(item.rarity).color, 1).strokeCircle(index ? 18 : -18, 11, 3));
  equipment.earrings.filter(Boolean).forEach((item, index) => gear.fillStyle(getRarity(item.rarity).color, 1).fillCircle(index ? 10 : -10, -9, 2));
  container.add([fullSetEffect.back, aura, cape, ascension, base, gear, fullSetEffect.front]);
  return container;
}
