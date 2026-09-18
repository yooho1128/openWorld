// Phaser has no native form widgets, so text inputs/selects/chat panels are
// plain DOM elements layered over the canvas inside the #overlay div
// (see index.html for its positioning/styling). Scenes build an HTML string,
// open it, wire up listeners by id, and close it when done.
let unlockPanelTimer = null;

export function openPanel(html) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
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
