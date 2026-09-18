// Phaser has no native form widgets, so text inputs/selects/chat panels are
// plain DOM elements layered over the canvas inside the #overlay div
// (see index.html for its positioning/styling). Scenes build an HTML string,
// open it, wire up listeners by id, and close it when done.
let unlockPanelTimer = null;
const PRESERVED_SCROLL_SELECTORS = ['.panel', '.chat-log', '.rank-list', '.mail-list'];

function panelIdentity(panel) {
  if (!panel) return '';
  return [...panel.classList].filter((name) => name !== 'panel').sort().join(' ');
}

function captureScrollPositions(overlay) {
  const panel = overlay.querySelector('.panel');
  if (!panel) return null;
  const positions = {};
  PRESERVED_SCROLL_SELECTORS.forEach((selector) => {
    overlay.querySelectorAll(selector).forEach((element, index) => {
      positions[`${selector}:${index}`] = element.scrollTop;
    });
  });
  return { panel: panelIdentity(panel), positions };
}

function restoreScrollPositions(overlay, saved) {
  const panel = overlay.querySelector('.panel');
  if (!saved || panelIdentity(panel) !== saved.panel) return;
  PRESERVED_SCROLL_SELECTORS.forEach((selector) => {
    overlay.querySelectorAll(selector).forEach((element, index) => {
      const position = saved.positions[`${selector}:${index}`];
      if (Number.isFinite(position)) element.scrollTop = position;
    });
  });
}

export function openPanel(html) {
  const overlay = document.getElementById('overlay');
  const savedScroll = captureScrollPositions(overlay);
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
  restoreScrollPositions(overlay, savedScroll);
  // A tap that opens a panel fires its Phaser 'pointerdown' on touchstart,
  // but the browser still owes that same finger a trailing 'click' once it
  // lifts. If a brand-new DOM button ends up rendered at that same spot
  // (very common right after a scene/panel switch), that trailing click
  // lands on it and looks like a selection nobody made. Briefly ignoring
  // clicks right after a panel opens swallows that leftover click without
  // making the panel feel unresponsive to an actual next tap.
  overlay.style.pointerEvents = 'none';
  if (unlockPanelTimer) clearTimeout(unlockPanelTimer);
  unlockPanelTimer = window.setTimeout(() => { overlay.style.pointerEvents = ''; unlockPanelTimer = null; }, 350);
  return overlay;
}

export function closePanel() {
  if (unlockPanelTimer) { clearTimeout(unlockPanelTimer); unlockPanelTimer = null; }
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'none';
  overlay.style.pointerEvents = '';
  overlay.innerHTML = '';
}

export function qs(id) {
  return document.getElementById(id);
}
