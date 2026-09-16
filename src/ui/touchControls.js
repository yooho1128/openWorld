// A simple on-screen d-pad + interact button so the game is playable with
// touch alone (no physical keyboard). Fixed to the camera in the bottom
// corners; the returned `state` is meant to be OR'd together with keyboard
// input each frame, same shape as Phaser's cursor keys.
export function createTouchControls(scene) {
  const state = { up: false, down: false, left: false, right: false, interactJustPressed: false };

  const makeButton = (x, y, label, onDown, onUp) => {
    const circle = scene.add.circle(x, y, 30, 0x24190f, 0.82).setScrollFactor(0).setDepth(1000);
    circle.setStrokeStyle(3, 0xc89d52, 0.92);
    scene.add.circle(x, y, 24, 0x6e4a2d, 0.28).setScrollFactor(0).setDepth(1001);
    scene.add.text(x, y, label, {
      fontFamily: 'Georgia, serif', fontSize: label === 'E' ? '16px' : '18px', fontStyle: 'bold', color: '#ffe8ad',
      stroke: '#2a160d', strokeThickness: 2,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);
    circle.setInteractive({ useHandCursor: true });
    // Visible press feedback — without it a touch press feels unresponsive,
    // since there's no native :active state on a canvas-drawn button.
    circle.on('pointerdown', () => {
      circle.setFillStyle(0xc89d52, 0.8);
      circle.setScale(0.94);
      onDown();
    });
    const release = () => {
      circle.setFillStyle(0x24190f, 0.82);
      circle.setScale(1);
      onUp();
    };
    circle.on('pointerup', release);
    circle.on('pointerout', release);
    return circle;
  };

  const padX = 64;
  const padY = 690;
  const gap = 54;

  makeButton(padX, padY - gap, '▲', () => { state.up = true; }, () => { state.up = false; });
  makeButton(padX, padY + gap, '▼', () => { state.down = true; }, () => { state.down = false; });
  makeButton(padX - gap, padY, '◀', () => { state.left = true; }, () => { state.left = false; });
  makeButton(padX + gap, padY, '▶', () => { state.right = true; }, () => { state.right = false; });

  makeButton(416, 690, '행동', () => { state.interactJustPressed = true; }, () => {});

  return {
    state,
    consumeInteract() {
      const pressed = state.interactJustPressed;
      state.interactJustPressed = false;
      return pressed;
    },
  };
}
