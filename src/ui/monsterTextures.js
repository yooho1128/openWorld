import { MONSTERS } from '../data/monsters.js';

function eyes(g, color = 0xffe768, y = 23, spread = 7) {
  g.fillStyle(color).fillCircle(32 - spread, y, 2).fillCircle(32 + spread, y, 2);
}

function drawMonster(g, monster) {
  const p = monster.primary;
  const s = monster.secondary;
  const a = monster.accent;
  g.fillStyle(a, 0.08).fillCircle(32, 31, 29);
  g.lineStyle(2, a, 0.24).strokeCircle(32, 31, 27 + monster.variant);
  g.fillStyle(0x130f0d, 0.38).fillEllipse(32, 58, 50, 10);

  if (monster.body === 'ooze') {
    g.fillStyle(p).fillRoundedRect(9, 28, 46, 27, 14).fillTriangle(13, 35, 31, 8, 52, 35);
    g.fillStyle(s, 0.55).fillCircle(23, 31, 8);
    eyes(g, a, 39, 8);
  } else if (monster.body === 'goblin') {
    g.fillStyle(p).fillCircle(32, 25, 17).fillTriangle(17, 23, 2, 15, 18, 34).fillTriangle(47, 23, 62, 15, 46, 34);
    g.fillStyle(s).fillRoundedRect(19, 38, 26, 18, 6);
    eyes(g, a, 24, 7);
    g.lineStyle(3, a).lineBetween(48, 39, 59, 54);
  } else if (monster.body === 'orc') {
    g.fillStyle(p).fillCircle(32, 24, 19).fillTriangle(16, 21, 4, 12, 17, 32).fillTriangle(48, 21, 60, 12, 47, 32);
    g.fillStyle(s).fillRoundedRect(13, 37, 38, 20, 7);
    eyes(g, a, 22, 8);
    g.fillStyle(0xf0dfbd).fillTriangle(20, 37, 25, 29, 27, 39).fillTriangle(37, 39, 39, 29, 44, 37);
  } else if (monster.body === 'ogre') {
    g.fillStyle(s).fillRoundedRect(8, 27, 48, 30, 13);
    g.fillStyle(p).fillCircle(32, 22, 21).fillCircle(15, 42, 10).fillCircle(49, 42, 10);
    eyes(g, a, 21, 9);
    g.fillStyle(0xe8d1a3).fillTriangle(19, 38, 24, 29, 27, 40).fillTriangle(37, 40, 40, 29, 45, 38);
    g.fillStyle(0x594025).fillRect(10, 47, 44, 6);
  } else if (monster.body === 'beast') {
    g.fillStyle(p).fillEllipse(35, 39, 45, 25).fillCircle(17, 28, 13);
    g.fillTriangle(8, 21, 9, 5, 20, 19).fillTriangle(20, 18, 27, 7, 28, 25).fillTriangle(51, 39, 63, 25, 56, 48);
    eyes(g, a, 28, 5);
    g.fillStyle(s).fillTriangle(7, 42, 14, 29, 22, 43);
  } else if (monster.body === 'golem') {
    g.fillStyle(p).fillRect(17, 16, 30, 25).fillRect(13, 40, 38, 17);
    g.fillStyle(s).fillRect(4, 29, 14, 22).fillRect(46, 29, 14, 22);
    g.lineStyle(3, a).lineBetween(32, 18, 27, 34).lineBetween(27, 34, 37, 43).lineBetween(37, 43, 31, 56);
    eyes(g, a, 27, 7);
  } else if (monster.body === 'wyvern') {
    g.fillStyle(p).fillEllipse(33, 34, 29, 36).fillCircle(35, 17, 11);
    g.fillTriangle(23, 30, 1, 12, 9, 43).fillTriangle(43, 30, 63, 11, 56, 44);
    g.fillTriangle(42, 45, 61, 58, 45, 54).fillTriangle(30, 9, 34, 0, 38, 10);
    eyes(g, a, 17, 5);
  } else if (monster.body === 'dragon') {
    g.fillStyle(p).fillEllipse(32, 37, 43, 32).fillCircle(36, 17, 15);
    g.fillStyle(s).fillTriangle(19, 36, 0, 8, 7, 45).fillTriangle(47, 36, 64, 7, 58, 47);
    g.fillStyle(p).fillTriangle(45, 44, 63, 57, 44, 54);
    g.fillStyle(a).fillTriangle(26, 10, 30, 0, 34, 11).fillTriangle(38, 9, 46, 1, 45, 14);
    eyes(g, a, 17, 6);
    g.fillStyle(0xf2e4bd).fillTriangle(47, 23, 55, 26, 47, 28);
  } else if (monster.body === 'demon') {
    g.fillStyle(p).fillTriangle(14, 57, 32, 21, 52, 57).fillCircle(32, 22, 16);
    g.fillStyle(s).fillTriangle(21, 14, 13, 0, 29, 12).fillTriangle(43, 14, 51, 0, 35, 12);
    g.fillTriangle(18, 34, 2, 21, 11, 48).fillTriangle(46, 34, 62, 21, 53, 48);
    eyes(g, a, 22, 7);
    g.fillStyle(a, 0.8).fillCircle(32, 41, 5);
  } else {
    g.fillStyle(p).fillTriangle(13, 57, 23, 25, 32, 15).fillTriangle(51, 57, 41, 25, 32, 15);
    g.fillStyle(s).fillCircle(32, 19, 14).fillRoundedRect(20, 30, 24, 25, 7);
    g.fillStyle(a).fillTriangle(20, 13, 13, 2, 27, 10).fillTriangle(44, 13, 51, 2, 37, 10);
    eyes(g, 0xffdf73, 20, 7);
    g.lineStyle(2, a).strokeCircle(32, 38, 7);
  }

  // Inked storybook edge, pearly highlights, and rank ornaments make the
  // tiny procedural sprites read as illustrated creatures instead of icons.
  g.lineStyle(1.5, 0x1a1213, 0.72).strokeCircle(32, 30, 26);
  g.fillStyle(0xffffff, 0.2).fillEllipse(24, 17, 12, 5);
  if (['B', 'A', 'S'].includes(monster.rank)) {
    g.lineStyle(2, a, 0.8).strokeEllipse(32, 58, 48, 9);
    g.fillStyle(a, 0.72).fillTriangle(6, 50, 12, 40, 16, 53).fillTriangle(58, 50, 52, 40, 48, 53);
  }
  if (monster.rank === 'S') {
    g.fillStyle(0xffefae, 0.92).fillTriangle(22, 8, 27, 0, 32, 8).fillTriangle(32, 8, 37, 0, 42, 8);
    g.lineStyle(1, a, 0.75).lineBetween(20, 10, 44, 10);
  }

  // Regional crest makes every palette family readable even at small size.
  g.fillStyle(a, 0.96).fillCircle(52, 9, 5);
  g.fillStyle(0xffffff, 0.62).fillCircle(50.5, 7.5, 1.3);
  g.lineStyle(1, 0xffffff, 0.72).strokeCircle(52, 9, 6 + monster.variant);
  g.lineStyle(1, a, 0.45).strokeCircle(52, 9, 8 + monster.variant);
}

export function generateMonsterTextures(scene) {
  MONSTERS.forEach((monster) => {
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    drawMonster(gfx, monster);
    gfx.generateTexture(monster.texture, 64, 64);
    gfx.destroy();
  });
}
