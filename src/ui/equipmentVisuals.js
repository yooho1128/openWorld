import { ensureRpgCharacter, equippedItems } from '../state/rpgCharacter.js';
import { getRarity } from '../data/equipment.js';

export function createEquippedHero(scene, character, x, y, scale = 1) {
  ensureRpgCharacter(character);
  const container = scene.add.container(x, y).setScale(scale);
  const aura = scene.add.graphics();
  const ascension = scene.add.container(0, 0);
  const base = scene.add.sprite(0, 0, 'player');
  const gear = scene.add.graphics();
  const equipment = character.equipment;
  const strongest = equippedItems(character).sort((a, b) => {
    const aScore = getRarity(a.rarity).order * 100 + (a.enhancement ?? 0);
    const bScore = getRarity(b.rarity).order * 100 + (b.enhancement ?? 0);
    return bScore - aScore;
  })[0];
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
  container.add([aura, cape, ascension, base, gear]);
  return container;
}
