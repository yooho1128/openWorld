const KIND_STYLES = {
  forest: { icon: '♣', skyTop: 0x18392f, skyBottom: 0x66815a, ground: 0x294934, groundLight: 0x52734a, panel: 0x1d3429, weather: 'leaves' },
  frozen: { icon: '❄', skyTop: 0x263e63, skyBottom: 0x9bc8d8, ground: 0x476d82, groundLight: 0xa8dce7, panel: 0x213544, weather: 'snow' },
  blood: { icon: '⚔', skyTop: 0x421923, skyBottom: 0x9a3942, ground: 0x45232a, groundLight: 0x7f3439, panel: 0x351c22, weather: 'embers' },
  swamp: { icon: '≋', skyTop: 0x25362b, skyBottom: 0x718052, ground: 0x34452e, groundLight: 0x6d7942, panel: 0x293428, weather: 'spores' },
  volcanic: { icon: '▲', skyTop: 0x381719, skyBottom: 0xb94b28, ground: 0x34201d, groundLight: 0x713324, panel: 0x351e1b, weather: 'ash' },
  abyss: { icon: '∅', skyTop: 0x111323, skyBottom: 0x3d315e, ground: 0x201d31, groundLight: 0x4c3b69, panel: 0x211d31, weather: 'void' },
  desert: { icon: '☀', skyTop: 0x71452c, skyBottom: 0xd5a151, ground: 0x8d6134, groundLight: 0xd0a353, panel: 0x3d2d20, weather: 'sand' },
  storm: { icon: 'ϟ', skyTop: 0x172238, skyBottom: 0x566c91, ground: 0x2c3a50, groundLight: 0x60718b, panel: 0x202b3d, weather: 'storm' },
  undead: { icon: '†', skyTop: 0x20292b, skyBottom: 0x66706b, ground: 0x303b37, groundLight: 0x667268, panel: 0x252d2b, weather: 'mist' },
  crystal: { icon: '◆', skyTop: 0x252348, skyBottom: 0x716cc2, ground: 0x343356, groundLight: 0x817bc6, panel: 0x292743, weather: 'sparkles' },
  demonic: { icon: 'Ψ', skyTop: 0x260f1b, skyBottom: 0x6d213d, ground: 0x321525, groundLight: 0x702541, panel: 0x321522, weather: 'embers' },
  celestial: { icon: '✦', skyTop: 0x28334f, skyBottom: 0xb9a75e, ground: 0x555240, groundLight: 0xb7a86b, panel: 0x373526, weather: 'stars' },
};

const REGION_DETAILS = {
  '속삭이는 숲': { kind: 'forest', landmark: 'whisperTrees', icon: '☘' },
  '서리왕의 설원': { kind: 'frozen', landmark: 'iceCitadel', icon: '❄' },
  '피의 협곡': { kind: 'blood', landmark: 'bloodCliffs', icon: '⚔' },
  '독안개 늪지': { kind: 'swamp', landmark: 'poisonPools', icon: '☣' },
  '용암 심장부': { kind: 'volcanic', landmark: 'lavaCore', icon: '◉' },
  '끝없는 심연': { kind: 'abyss', landmark: 'abyssRift', icon: '∅' },
  '태양이 잠든 사막': { kind: 'desert', landmark: 'buriedTemple', icon: '☀' },
  '뇌명의 고원': { kind: 'storm', landmark: 'thunderPlateau', icon: 'ϟ' },
  '망자의 공동묘지': { kind: 'undead', landmark: 'graveyard', icon: '†' },
  '수정 미궁': { kind: 'crystal', landmark: 'crystalMaze', icon: '◈' },
  '마계 균열': { kind: 'demonic', landmark: 'demonRift', icon: 'Ψ' },
  '별빛 성역': { kind: 'celestial', landmark: 'starSanctuary', icon: '✦' },
  '세계수의 뿌리': { kind: 'forest', landmark: 'worldRoots', icon: '♣', skyTop: 0x102e25 },
  '영겁빙하': { kind: 'frozen', landmark: 'eternalGlacier', icon: '▲', skyTop: 0x172c50 },
  '붉은 왕의 전장': { kind: 'blood', landmark: 'warBanners', icon: '⚑' },
  '멸망의 독해': { kind: 'swamp', landmark: 'poisonSea', icon: '≋', skyTop: 0x1d2a22 },
  '태초 화산': { kind: 'volcanic', landmark: 'primalVolcano', icon: '▲', skyTop: 0x210d10 },
  '폭풍신의 계단': { kind: 'storm', landmark: 'stormStairs', icon: 'ϟ', skyTop: 0x0f1930 },
  '공허의 회랑': { kind: 'abyss', landmark: 'voidHall', icon: '◫', skyTop: 0x090b19 },
  '영혼왕의 묘역': { kind: 'undead', landmark: 'soulMausoleum', icon: '♛', skyTop: 0x151c20 },
  '천공 수정궁': { kind: 'crystal', landmark: 'crystalPalace', icon: '◈', skyTop: 0x171c40 },
  '일곱 지옥문': { kind: 'demonic', landmark: 'sevenGates', icon: 'Ⅶ', skyTop: 0x190811 },
  '신들의 폐허': { kind: 'celestial', landmark: 'godRuins', icon: '♜', skyTop: 0x20283d },
  '시간의 모래바다': { kind: 'desert', landmark: 'hourglassTitan', icon: '⧖', skyTop: 0x503024 },
  '절대영도의 왕좌': { kind: 'frozen', landmark: 'iceThrone', icon: '♛', skyTop: 0x0d1d3a },
  '종말의 붉은 달': { kind: 'blood', landmark: 'redMoon', icon: '●', skyTop: 0x17070c },
  '세계의 끝': { kind: 'abyss', landmark: 'worldEnd', icon: '∅', skyTop: 0x05050c },
};

export function getRegionVisual(region) {
  const detail = REGION_DETAILS[region.name] ?? { kind: region.biome, landmark: 'generic' };
  const base = KIND_STYLES[detail.kind] ?? KIND_STYLES.forest;
  return { ...base, ...detail, accent: region.color };
}

function drawLandscape(g, visual) {
  const { kind, ground, groundLight, accent } = visual;
  g.fillStyle(ground, 0.98).fillEllipse(240, 370, 620, 250);
  g.fillStyle(groundLight, 0.74).fillEllipse(240, 342, 520, 160);
  g.lineStyle(2, accent, 0.32).strokeEllipse(240, 340, 430, 125);
  g.lineStyle(1, 0xffedb0, 0.12).strokeEllipse(240, 350, 470, 146);
  if (kind === 'desert') {
    g.fillStyle(groundLight, 0.8).fillEllipse(110, 300, 310, 125).fillEllipse(385, 325, 360, 145);
  } else if (kind === 'frozen') {
    for (let i = 0; i < 8; i += 1) g.fillStyle(i % 2 ? 0xb9e3ec : 0x6ba4c1, 0.75).fillTriangle(i * 70 - 30, 330, i * 70 + 15, 170 + (i % 3) * 35, i * 70 + 60, 330);
  } else if (kind === 'forest') {
    for (let i = 0; i < 9; i += 1) g.fillStyle(i % 2 ? 0x193929 : 0x2d5738, 0.95).fillTriangle(i * 58 - 30, 315, i * 58, 135 + (i % 3) * 25, i * 58 + 32, 315);
  } else if (kind === 'volcanic' || kind === 'blood' || kind === 'demonic') {
    for (let i = 0; i < 7; i += 1) g.fillStyle(i % 2 ? 0x27151a : 0x4a2020, 0.92).fillTriangle(i * 82 - 45, 320, i * 82 + 10, 145 + (i % 3) * 30, i * 82 + 65, 320);
  } else if (kind === 'crystal') {
    for (let i = 0; i < 9; i += 1) g.fillStyle(i % 2 ? 0x6be0df : 0xa87bf0, 0.55).fillTriangle(i * 58 - 10, 330, i * 58 + 12, 170 + (i % 3) * 34, i * 58 + 34, 330);
  } else {
    for (let i = 0; i < 7; i += 1) g.fillStyle(ground, 0.88).fillTriangle(i * 86 - 50, 325, i * 86 + 10, 175 + (i % 2) * 45, i * 86 + 74, 325);
  }
}

function drawLandmark(g, visual) {
  const dark = 0x15151b;
  const pale = 0xd9e7d4;
  const a = visual.accent;
  switch (visual.landmark) {
    case 'whisperTrees':
      [62, 410].forEach((x) => { g.fillStyle(0x3a2d20, 1).fillRect(x - 8, 170, 16, 150); g.fillStyle(0x35613c, 0.95).fillCircle(x, 150, 55).fillCircle(x + 22, 184, 42); }); break;
    case 'iceCitadel':
      g.fillStyle(0xc7edf2, 0.75).fillRect(185, 165, 110, 145).fillTriangle(175, 165, 210, 95, 235, 165).fillTriangle(245, 165, 275, 78, 305, 165); break;
    case 'bloodCliffs':
      g.fillStyle(0x32191f, 1).fillTriangle(0, 330, 110, 105, 205, 330).fillTriangle(285, 330, 420, 85, 500, 330); g.lineStyle(5, a, 0.65).lineBetween(110, 105, 145, 315).lineBetween(420, 85, 380, 315); break;
    case 'poisonPools':
      g.fillStyle(0x8ea64b, 0.5).fillEllipse(120, 330, 170, 38).fillEllipse(385, 315, 145, 32); for (let i = 0; i < 6; i += 1) g.fillStyle(0x9fbd62, 0.55).fillCircle(65 + i * 72, 260 - (i % 2) * 24, 8 + i % 3); break;
    case 'lavaCore':
      g.fillStyle(0x251318, 1).fillTriangle(120, 320, 240, 70, 370, 320); g.fillStyle(0xff6c2e, 0.8).fillTriangle(218, 290, 241, 115, 266, 290).fillCircle(241, 118, 22); break;
    case 'abyssRift':
      g.fillStyle(0x03040a, 0.95).fillEllipse(240, 210, 115, 245); g.lineStyle(7, a, 0.75).strokeEllipse(240, 210, 125, 255); break;
    case 'buriedTemple':
      g.fillStyle(0x745137, 0.9).fillRect(175, 185, 130, 120).fillTriangle(155, 185, 240, 105, 325, 185); g.fillStyle(0x2d211b, 0.8).fillRect(222, 230, 36, 75); break;
    case 'thunderPlateau':
      g.fillStyle(0x20283a, 1).fillRect(75, 255, 330, 60); g.lineStyle(6, 0xb9e6ff, 0.85).lineBetween(350, 55, 305, 135).lineBetween(305, 135, 345, 150).lineBetween(345, 150, 280, 245); break;
    case 'graveyard':
      for (let i = 0; i < 8; i += 1) { const x = 35 + i * 59; g.fillStyle(0x788078, 0.72).fillRect(x, 245 - (i % 2) * 20, 25, 67).fillCircle(x + 12, 245 - (i % 2) * 20, 13); g.fillStyle(dark, 0.75).fillRect(x + 10, 250 - (i % 2) * 20, 4, 25).fillRect(x + 3, 258 - (i % 2) * 20, 18, 4); } break;
    case 'crystalMaze':
      for (let i = 0; i < 7; i += 1) g.lineStyle(10, i % 2 ? 0x71d8ed : a, 0.75).lineBetween(55 + i * 62, 315, 95 + i * 48, 120 + (i % 3) * 45); break;
    case 'demonRift':
      g.fillStyle(0x09030a, 0.95).fillEllipse(240, 210, 90, 230); g.lineStyle(8, 0xd63d71, 0.8).lineBetween(210, 80, 260, 175).lineBetween(260, 175, 220, 315); break;
    case 'starSanctuary':
      g.fillStyle(0xd2c681, 0.7).fillRect(140, 245, 200, 62); for (let i = 0; i < 5; i += 1) g.fillStyle(0xf4e7a7, 0.7).fillRect(155 + i * 42, 155, 16, 95); g.fillStyle(0x35415d, 0.95).fillTriangle(120, 155, 240, 80, 360, 155); break;
    case 'worldRoots':
      g.lineStyle(24, 0x3f2d20, 1).lineBetween(240, 65, 240, 255); for (let i = 0; i < 6; i += 1) g.lineStyle(12, 0x59402a, 0.95).lineBetween(240, 235, 35 + i * 82, 330); g.fillStyle(0x2d6b3b, 0.95).fillCircle(240, 80, 110); break;
    case 'eternalGlacier':
      g.fillStyle(0xcaf4f5, 0.8).fillTriangle(35, 320, 175, 55, 290, 320).fillTriangle(180, 320, 350, 80, 475, 320); g.lineStyle(4, 0xffffff, 0.5).lineBetween(175, 55, 210, 300); break;
    case 'warBanners':
      for (let i = 0; i < 5; i += 1) { const x = 65 + i * 90; g.fillStyle(0x2a1a18, 1).fillRect(x, 115 + (i % 2) * 25, 5, 205); g.fillStyle(i % 2 ? 0x8f2432 : 0x5f1823, 0.95).fillTriangle(x + 5, 125, x + 65, 150, x + 5, 190); } break;
    case 'poisonSea':
      g.fillStyle(0x758d3b, 0.62).fillRect(0, 260, 480, 95); for (let i = 0; i < 6; i += 1) g.fillStyle(0x9eb859, 0.45).fillEllipse(i * 95, 275 + (i % 2) * 40, 130, 28); g.fillStyle(0x263020, 1).fillCircle(240, 205, 55); break;
    case 'primalVolcano':
      g.fillStyle(0x1c1011, 1).fillTriangle(20, 330, 235, 30, 470, 330); g.fillStyle(0xff8a30, 0.9).fillTriangle(205, 300, 235, 75, 270, 300); g.fillStyle(0xffd05a, 0.65).fillEllipse(235, 62, 110, 32); break;
    case 'stormStairs':
      for (let i = 0; i < 8; i += 1) g.fillStyle(0x52617b, 0.85).fillRect(70 + i * 35, 300 - i * 28, 190, 22); g.lineStyle(5, 0xd6f1ff, 0.9).lineBetween(390, 35, 350, 120).lineBetween(350, 120, 385, 135).lineBetween(385, 135, 335, 220); break;
    case 'voidHall':
      for (let i = 0; i < 7; i += 1) { const x = 45 + i * 65; g.fillStyle(0x19172b, 0.95).fillRect(x, 115, 20, 210); g.fillStyle(a, 0.35).fillEllipse(x + 10, 120, 46, 18); } g.fillStyle(0x030308, 0.9).fillRect(0, 285, 480, 42); break;
    case 'soulMausoleum':
      g.fillStyle(0x30383a, 1).fillRect(125, 185, 230, 135).fillTriangle(100, 185, 240, 85, 380, 185); g.fillStyle(0x0b1012, 1).fillRect(215, 235, 50, 85); g.fillStyle(0x9fd4c1, 0.35).fillCircle(240, 235, 65); break;
    case 'crystalPalace':
      g.fillStyle(0x8fdff0, 0.52).fillRect(135, 180, 210, 140); for (let i = 0; i < 5; i += 1) g.fillStyle(i % 2 ? 0xc2a4ff : 0x7ce6ef, 0.75).fillTriangle(130 + i * 55, 185, 155 + i * 48, 55 + (i % 2) * 45, 185 + i * 43, 185); break;
    case 'sevenGates':
      for (let i = 0; i < 7; i += 1) { const x = 28 + i * 67; g.lineStyle(8, i % 2 ? 0xb52d55 : 0x5e1b35, 0.8).strokeRoundedRect(x, 145 + (i % 2) * 28, 48, 165, 18); } break;
    case 'godRuins':
      for (let i = 0; i < 6; i += 1) { const x = 35 + i * 82; g.fillStyle(0xb8ae7e, 0.55).fillRect(x, 150 + (i % 3) * 28, 24, 170 - (i % 3) * 28); g.fillStyle(pale, 0.35).fillRect(x - 7, 145 + (i % 3) * 28, 38, 12); } break;
    case 'hourglassTitan':
      g.lineStyle(12, 0x493421, 0.9).lineBetween(205, 80, 275, 300).lineBetween(275, 80, 205, 300).lineBetween(185, 75, 295, 75).lineBetween(185, 305, 295, 305); g.fillStyle(0xf3c96d, 0.75).fillTriangle(205, 95, 275, 95, 240, 185).fillTriangle(240, 195, 205, 285, 275, 285); break;
    case 'iceThrone':
      g.fillStyle(0xc8f2fa, 0.75).fillTriangle(145, 315, 180, 70, 215, 315).fillTriangle(265, 315, 305, 55, 345, 315).fillRect(185, 205, 110, 105); g.fillStyle(0x5e9fbe, 0.75).fillRect(215, 240, 50, 70); break;
    case 'redMoon':
      g.fillStyle(0xff3545, 0.72).fillCircle(350, 100, 78); g.fillStyle(0x451520, 0.8).fillCircle(350, 100, 55); for (let i = 0; i < 6; i += 1) g.fillStyle(0x171014, 1).fillRect(45 + i * 78, 205 - (i % 2) * 35, 8, 115 + (i % 2) * 35); break;
    case 'worldEnd':
      g.fillStyle(0x010105, 1).fillRect(0, 240, 480, 105); g.lineStyle(6, 0x7651a1, 0.75).lineBetween(240, 35, 215, 145).lineBetween(215, 145, 255, 180).lineBetween(255, 180, 225, 330); for (let i = 0; i < 7; i += 1) g.fillStyle(0x211a35, 0.9).fillTriangle(i * 82 - 20, 330, i * 82 + 18, 160 + (i % 3) * 42, i * 82 + 58, 330); break;
    default:
      g.fillStyle(dark, 0.55).fillCircle(240, 205, 72); break;
  }
}

function addWeather(scene, visual) {
  const colors = {
    snow: [0xffffff, 0xbde9f2], ash: [0x4c3a36, 0xd36a3d], embers: [0xff8a3d, 0xd43845], spores: [0xb1c85f, 0x738d43],
    void: [0x9b77d1, 0x3f315e], sand: [0xe4b968, 0xb98245], storm: [0xc5e6ff, 0x6e8fc1], mist: [0xc5d3ce, 0x71817b],
    sparkles: [0x8ff5ee, 0xd7b4ff], stars: [0xffed9f, 0xbddcff], leaves: [0x80b866, 0xd7b264],
  };
  const palette = colors[visual.weather] ?? colors.stars;
  for (let i = 0; i < 14; i += 1) {
    const startX = (i * 79 + 23) % 480;
    const startY = 45 + ((i * 53) % 300);
    const particle = scene.add.circle(startX, startY, 1.5 + (i % 3), palette[i % 2], 0.25 + (i % 4) * 0.12).setDepth(1);
    const isRising = ['embers', 'spores', 'void', 'stars'].includes(visual.weather);
    scene.tweens.add({ targets: particle, x: startX + (i % 2 ? 28 : -24), y: startY + (isRising ? -90 : 105), alpha: 0.05, duration: 1700 + i * 95, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

function addBossThreatBackground(scene, visual) {
  const threat = scene.add.graphics();
  threat.fillStyle(0x190008, 0.32).fillRect(0, 0, 480, 430);
  threat.fillStyle(0xe12635, 0.16).fillCircle(390, 88, 74);
  threat.fillStyle(0x12060a, 0.92).fillCircle(390, 88, 49);
  threat.lineStyle(5, 0xe13f48, 0.48).strokeCircle(390, 88, 60);
  threat.lineStyle(3, 0xff6450, 0.42);
  for (let index = 0; index < 7; index += 1) {
    const x = 28 + index * 72;
    threat.lineBetween(x, 345, x + (index % 2 ? 34 : -22), 302 - (index % 3) * 22);
    threat.lineBetween(x + (index % 2 ? 34 : -22), 302 - (index % 3) * 22, x + 17, 266 - (index % 2) * 24);
  }
  threat.fillStyle(0x090008, 0.34).fillEllipse(90, 285, 270, 100).fillEllipse(405, 275, 300, 112);

  const runes = ['◇', '✦', 'Ψ', '◈', '†'];
  runes.forEach((rune, index) => {
    const mark = scene.add.text(42 + index * 99, 126 + (index % 2) * 34, rune, {
      fontFamily: 'Georgia, serif', fontSize: `${20 + (index % 3) * 5}px`, color: index % 2 ? '#ff4d58' : '#ffb069',
      stroke: '#260008', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.18);
    scene.tweens.add({ targets: mark, alpha: 0.62, scale: 1.18, angle: index % 2 ? 18 : -18, duration: 720 + index * 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });

  for (let index = 0; index < 8; index += 1) {
    const flare = scene.add.circle(20 + index * 67, 360 - (index % 3) * 35, 3 + (index % 2) * 2, index % 2 ? 0xffd05b : 0xff3b35, 0.58);
    scene.tweens.add({ targets: flare, y: flare.y - 120, x: flare.x + (index % 2 ? 26 : -20), alpha: 0, scale: 2.2, duration: 920 + index * 95, yoyo: true, repeat: -1 });
  }

  const omen = scene.add.ellipse(240, 326, 430, 72, visual.accent, 0.08).setStrokeStyle(3, 0xff3c48, 0.3);
  scene.tweens.add({ targets: omen, alpha: 0.34, scaleX: 1.08, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.cameras.main.flash(220, 90, 0, 8, false);
}

function addFairyTaleDepth(scene, visual) {
  const silhouette = scene.add.graphics();
  silhouette.fillStyle(0x090d12, 0.3);
  for (let index = 0; index < 6; index += 1) {
    const x = 18 + index * 91;
    silhouette.fillTriangle(x - 34, 386, x, 280 - (index % 3) * 20, x + 38, 386);
    silhouette.fillTriangle(x - 27, 350, x, 246 - (index % 2) * 24, x + 29, 350);
  }
  const arch = scene.add.graphics().setDepth(2);
  arch.lineStyle(3, visual.accent, 0.24).strokeRoundedRect(15, 14, 450, 398, 24);
  arch.lineStyle(1, 0xffe7a0, 0.16).strokeRoundedRect(22, 21, 436, 384, 20);
  arch.fillStyle(visual.accent, 0.34);
  arch.fillCircle(30, 30, 4).fillCircle(450, 30, 4).fillCircle(30, 395, 4).fillCircle(450, 395, 4);
}

export function addRegionBattlefield(scene, region, { isBoss = false } = {}) {
  const visual = getRegionVisual(region);
  const sky = scene.add.graphics();
  sky.fillGradientStyle(visual.skyTop, visual.skyTop, visual.skyBottom, visual.skyBottom, 1).fillRect(0, 0, 480, 430);
  if (visual.landmark !== 'redMoon') {
    sky.fillStyle(visual.kind === 'desert' ? 0xffdc83 : 0xffefbd, visual.kind === 'abyss' ? 0.12 : 0.45).fillCircle(390, 86, visual.kind === 'desert' ? 42 : 29);
  }
  drawLandscape(sky, visual);
  drawLandmark(sky, visual);
  addFairyTaleDepth(scene, visual);
  addWeather(scene, visual);
  if (isBoss) addBossThreatBackground(scene, visual);
  return visual;
}

export function addRegionCardEmblem(scene, x, y, region, locked = false) {
  const visual = getRegionVisual(region);
  const color = locked ? 0x4a4a4a : visual.accent;
  const g = scene.add.graphics();
  g.fillStyle(color, 0.78).fillCircle(x, y, 24);
  g.lineStyle(2, locked ? 0x666666 : 0xffe4a1, 0.58).strokeCircle(x, y, 24);
  g.fillStyle(locked ? 0x333333 : visual.groundLight, 0.5).fillTriangle(x - 22, y + 13, x, y - 10, x + 22, y + 13);
  const text = scene.add.text(x, y - 1, locked ? '🔒' : visual.icon, { fontFamily: 'Georgia, serif', fontSize: locked ? '16px' : '19px', fontStyle: 'bold', color: '#fff1c4' }).setOrigin(0.5);
  return { graphics: g, text, visual };
}
