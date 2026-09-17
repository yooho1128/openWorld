export const FANTASY_LABELS = {
  home: '달빛 여관', school: '왕립 마법학당', gym: '전사의 훈련장',
  languageAcademy: '룬 문자 연구소', restaurant: '황금 멧돼지 식당',
  company: '왕국 모험가 길드', factory: '드워프 대장간',
  hackerDen: '어둠의 연금술 공방', spyField: '그림자 첩보단',
  gangHideout: '붉은 송곳니 소굴', convenienceStore: '밤부엉이 잡화점',
  parentCafe: '요정의 찻집', lottery: '운명의 수정구',
};

export const THEME = {
  ink: 0x18241f,
  panel: 0x24372f,
  panelDeep: 0x17251f,
  parchment: 0xf2dfb1,
  gold: 0xe8c878,
  cream: 0xfff3cf,
  mint: 0x87b996,
};

export function fantasyName(location) { return FANTASY_LABELS[location.id] ?? location.name; }

function addFireflies(scene, dark) {
  for (let i = 0; i < 22; i += 1) {
    const x = (i * 97 + 31) % 480;
    const y = 66 + ((i * 71) % 610);
    const mote = scene.add.circle(x, y, i % 5 === 0 ? 2.2 : 1.2, i % 3 ? 0xf6dc91 : 0xb8e4bd, dark ? 0.35 : 0.28);
    scene.tweens.add({ targets: mote, alpha: dark ? 0.08 : 0.04, x: x + ((i % 3) - 1) * 12, y: y - 8 - (i % 4) * 3,
      duration: 1500 + i * 73, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
  }
}

// Storybook depth made entirely with Phaser primitives, so every existing scene
// gains a richer background without loading external art assets.
export function addFantasyBackdrop(scene, { dark = false, accent = 0x72956f } = {}) {
  scene.add.tileSprite(0, 0, 480, 800, 'ground').setOrigin(0).setTint(dark ? 0x5d6970 : 0xb6c99b);
  const sky = scene.add.graphics();
  const top = dark ? 0x172535 : 0x6f9b91;
  const middle = dark ? 0x243a40 : 0xa2bea1;
  const bottom = dark ? 0x13251f : 0x405f48;
  sky.fillGradientStyle(top, top, middle, middle, 0.98).fillRect(0, 0, 480, 470);
  sky.fillGradientStyle(middle, middle, bottom, bottom, 0.96).fillRect(0, 450, 480, 350);
  const moonColor = dark ? 0xffe6b0 : 0xffefc2;
  sky.fillStyle(moonColor, dark ? 0.13 : 0.18).fillCircle(390, 105, 76);
  sky.fillStyle(moonColor, dark ? 0.17 : 0.24).fillCircle(390, 105, 50);
  sky.fillStyle(moonColor, dark ? 0.68 : 0.48).fillCircle(390, 105, 29);
  sky.fillStyle(dark ? 0x293e43 : 0x6f9274, 0.95);
  sky.fillTriangle(-60, 390, 95, 185, 245, 390).fillTriangle(100, 390, 280, 235, 510, 390);
  sky.fillStyle(dark ? 0x1e3534 : 0x4d7458, 0.98);
  sky.fillTriangle(-80, 490, 92, 275, 280, 490).fillTriangle(120, 490, 355, 255, 570, 490);
  const foliage = scene.add.graphics();
  const leaf = dark ? 0x142a24 : 0x294f37;
  const leafLight = dark ? 0x29473b : 0x4d7850;
  foliage.fillStyle(leaf, 0.96);
  for (let i = 0; i < 9; i += 1) {
    const x = i < 5 ? -10 + i * 18 : 418 + (i - 5) * 20;
    const y = 310 + ((i * 83) % 360);
    foliage.fillEllipse(x, y, 72, 116);
  }
  foliage.fillStyle(leafLight, 0.45);
  for (let i = 0; i < 7; i += 1) foliage.fillCircle((i * 113 + 17) % 480, 510 + ((i * 61) % 230), 28 + (i % 3) * 7);
  const haze = scene.add.graphics();
  haze.fillStyle(accent, dark ? 0.08 : 0.1).fillEllipse(240, 470, 520, 190);
  haze.fillStyle(0xe9efd3, dark ? 0.025 : 0.06).fillEllipse(240, 620, 590, 155);
  addFireflies(scene, dark);
}

export function addOrnatePanel(scene, x, y, width, height, { color = THEME.panel, border = THEME.gold, alpha = 0.94 } = {}) {
  const shadow = scene.add.rectangle(x + 3, y + 7, width, height, 0x09100d, 0.32).setOrigin(0.5);
  const panel = scene.add.graphics();
  panel.fillStyle(color, alpha).fillRoundedRect(x - width / 2, y - height / 2, width, height, 15);
  panel.lineStyle(2, border, 0.78).strokeRoundedRect(x - width / 2, y - height / 2, width, height, 15);
  panel.lineStyle(1, 0xfff0bd, 0.16).strokeRoundedRect(x - width / 2 + 6, y - height / 2 + 6, width - 12, height - 12, 11);
  panel.fillStyle(border, 0.85);
  panel.fillCircle(x - width / 2 + 11, y, 2.5).fillCircle(x + width / 2 - 11, y, 2.5);
  return { shadow, panel };
}

export function addSceneTitle(scene, title, subtitle = '') {
  const height = subtitle ? 86 : 62;
  addOrnatePanel(scene, 240, 88, 400, height, { color: 0x18251f, border: THEME.gold, alpha: 0.94 });
  const crest = scene.add.circle(240, 48, 16, THEME.gold, 0.94).setStrokeStyle(2, 0xffefbd, 0.7);
  scene.add.text(240, 48, '✦', { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#344536' }).setOrigin(0.5);
  scene.add.text(240, subtitle ? 78 : 86, title, {
    fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '24px', fontStyle: 'bold', color: '#fff0c2',
    stroke: '#172019', strokeThickness: 4,
  }).setOrigin(0.5);
  if (subtitle) scene.add.text(240, 108, subtitle, { fontSize: '11px', color: '#c9d8bf' }).setOrigin(0.5);
  scene.tweens.add({ targets: crest, scale: 1.08, duration: 1350, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
}

export const HUD_STYLE = {
  fontFamily: '"Malgun Gothic", sans-serif', fontSize: '11px', color: '#fff1c9',
  backgroundColor: '#17251fee', padding: { x: 10, y: 8 }, lineSpacing: 3,
};

export const PROMPT_STYLE = {
  fontFamily: '"Malgun Gothic", sans-serif', fontSize: '13px', fontStyle: 'bold',
  color: '#fff0b4', backgroundColor: '#1a2a23ee', padding: { x: 10, y: 6 },
  stroke: '#493b25', strokeThickness: 1,
};
