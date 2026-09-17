import { ensureRpgCharacter, equippedItems } from '../state/rpgCharacter.js';
import { getRarity } from '../data/equipment.js';

export function createEquippedHero(scene, character, x, y, scale = 1) {
  ensureRpgCharacter(character);
  const container = scene.add.container(x, y).setScale(scale);
  const aura = scene.add.graphics();
  const base = scene.add.sprite(0, 0, 'player');
  const gear = scene.add.graphics();
  const equipment = character.equipment;
  const strongest = equippedItems(character).sort((a, b) => getRarity(b.rarity).order - getRarity(a.rarity).order)[0];
  if (strongest && getRarity(strongest.rarity).order >= 2) {
    const color = getRarity(strongest.rarity).color;
    aura.fillStyle(color, 0.15).fillCircle(0, 0, 30 + (strongest.enhancement ?? 0) * 0.6);
    aura.lineStyle(2, color, 0.5).strokeCircle(0, 0, 25 + (strongest.enhancement ?? 0) * 0.5);
    scene.tweens.add({ targets: aura, alpha: 0.35, duration: 800, yoyo: true, repeat: -1 });
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
    gear.lineStyle(4, weaponColor, 1).lineBetween(15, 10, 25, -21);
    gear.lineStyle(2, 0xf7e7ba, 1).lineBetween(13, -8, 24, -4);
  }
  if (equipment.necklace) gear.fillStyle(getRarity(equipment.necklace.rarity).color, 1).fillCircle(0, 2, 3);
  equipment.rings.filter(Boolean).forEach((item, index) => gear.lineStyle(2, getRarity(item.rarity).color, 1).strokeCircle(index ? 18 : -18, 11, 3));
  equipment.earrings.filter(Boolean).forEach((item, index) => gear.fillStyle(getRarity(item.rarity).color, 1).fillCircle(index ? 10 : -10, -9, 2));
  container.add([aura, base, gear]);
  return container;
}
