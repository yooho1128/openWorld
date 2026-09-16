// A simple on-screen d-pad + interact button so the game is playable with
// touch alone (no physical keyboard). Fixed to the camera in the bottom
// corners; the returned `state` is meant to be OR'd together with keyboard
// input each frame, same shape as Phaser's cursor keys.
export function createTouchControls(scene) {
  const state = { up: false, down: false, left: false, right: false, interactJustPressed: false };

  const makeButton = (x, y, label, onDown, onUp) => {
    const circle = scene.add.circle(x, y, 26, 0x000000, 0.35).setScrollFactor(0).setDepth(1000);
    circle.setStrokeStyle(2, 0xffffff, 0.6);
    scene.add.text(x, y, label, { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);
    circle.setInteractive({ useHandCursor: true });
    circle.on('pointerdown', onDown);
    circle.on('pointerup', onUp);
    circle.on('pointerout', onUp);
    return circle;
  };

  const padX = 60;
  const padY = 700;
  const gap = 44;

  makeButton(padX, padY - gap, '▲', () => { state.up = true; }, () => { state.up = false; });
  makeButton(padX, padY + gap, '▼', () => { state.down = true; }, () => { state.down = false; });
  makeButton(padX - gap, padY, '◀', () => { state.left = true; }, () => { state.left = false; });
  makeButton(padX + gap, padY, '▶', () => { state.right = true; }, () => { state.right = false; });

  makeButton(420, 700, 'E', () => { state.interactJustPressed = true; }, () => {});

  return {
    state,
    consumeInteract() {
      const pressed = state.interactJustPressed;
      state.interactJustPressed = false;
      return pressed;
    },
  };
}
