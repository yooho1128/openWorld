// A simple on-screen d-pad + interact button so the game is playable with
// touch alone (no physical keyboard). Fixed to the camera in the bottom
// corners; the returned `state` is meant to be OR'd together with keyboard
// input each frame, same shape as Phaser's cursor keys.
export function createTouchControls(scene) {
  const state = { up: false, down: false, left: false, right: false, interactJustPressed: false };

  const makeButton = (x, y, label, onDown, onUp) => {
    const circle = scene.add.circle(x, y, 32, 0x000000, 0.4).setScrollFactor(0).setDepth(1000);
    circle.setStrokeStyle(2, 0xffffff, 0.7);
    scene.add.text(x, y, label, { fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);
    circle.setInteractive({ useHandCursor: true });
    // Visible press feedback — without it a touch press feels unresponsive,
    // since there's no native :active state on a canvas-drawn button.
    circle.on('pointerdown', () => {
      circle.setFillStyle(0xffffff, 0.35);
      onDown();
    });
    const release = () => {
      circle.setFillStyle(0x000000, 0.4);
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

  makeButton(416, 690, 'E', () => { state.interactJustPressed = true; }, () => {});

  return {
    state,
    consumeInteract() {
      const pressed = state.interactJustPressed;
      state.interactJustPressed = false;
      return pressed;
    },
  };
}
