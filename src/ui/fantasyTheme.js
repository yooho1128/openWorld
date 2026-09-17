export const FANTASY_LABELS = {
  home: '달빛 여관', school: '왕립 마법학당', gym: '전사의 훈련장',
  languageAcademy: '룬 문자 연구소', restaurant: '황금 멧돼지 식당',
  company: '왕국 모험가 길드', factory: '드워프 대장간',
  hackerDen: '어둠의 연금술 공방', spyField: '그림자 첩보단',
  gangHideout: '붉은 송곳니 소굴', convenienceStore: '밤부엉이 잡화점',
  parentCafe: '요정의 찻집', lottery: '운명의 수정구',
};

export function fantasyName(location) { return FANTASY_LABELS[location.id] ?? location.name; }

export function addFantasyBackdrop(scene, { dark = false } = {}) {
  scene.add.tileSprite(0, 0, 480, 800, 'ground').setOrigin(0);
  const veil = scene.add.graphics();
  const top = dark ? 0x171225 : 0x263f38;
  const bottom = dark ? 0x090812 : 0x12251f;
  veil.fillGradientStyle(top, top, bottom, bottom, 0.72).fillRect(0, 0, 480, 800);
  for (let i = 0; i < 18; i += 1) {
    const star = scene.add.circle((i * 83 + 29) % 480, 35 + ((i * 67) % 520), i % 3 === 0 ? 2 : 1, 0xffe6a1, 0.45);
    scene.tweens.add({ targets: star, alpha: 0.08, duration: 900 + i * 80, yoyo: true, repeat: -1 });
  }
  scene.add.circle(390, 92, 46, 0xffe4a3, 0.13);
  scene.add.circle(390, 92, 31, 0xffefbd, 0.12);
}

export function addSceneTitle(scene, title, subtitle = '') {
  const banner = scene.add.graphics();
  banner.fillStyle(0x17130f, 0.84).fillRoundedRect(44, 48, 392, subtitle ? 82 : 58, 10);
  banner.lineStyle(2, 0xc79a4b, 0.9).strokeRoundedRect(44, 48, 392, subtitle ? 82 : 58, 10);
  banner.lineStyle(1, 0xf3d58b, 0.35).strokeRoundedRect(50, 54, 380, subtitle ? 70 : 46, 7);
  scene.add.text(240, subtitle ? 75 : 77, title, {
    fontFamily: 'Georgia, "Malgun Gothic", serif', fontSize: '24px', fontStyle: 'bold', color: '#f4dc9c',
    stroke: '#2a170e', strokeThickness: 4,
  }).setOrigin(0.5);
  if (subtitle) scene.add.text(240, 105, subtitle, { fontSize: '12px', color: '#cfbea0' }).setOrigin(0.5);
}

export const HUD_STYLE = {
  fontFamily: '"Malgun Gothic", sans-serif', fontSize: '11px', color: '#f8ebc6',
  backgroundColor: '#17130fdd', padding: { x: 9, y: 7 }, lineSpacing: 3,
};

export const PROMPT_STYLE = {
  fontFamily: '"Malgun Gothic", sans-serif', fontSize: '13px', fontStyle: 'bold',
  color: '#ffe59a', backgroundColor: '#21170de8', padding: { x: 9, y: 5 },
  stroke: '#4c2f19', strokeThickness: 1,
};
