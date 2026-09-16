// Phaser has no native form widgets, so text inputs/selects/chat panels are
// plain DOM elements layered over the canvas inside the #overlay div
// (see index.html for its positioning/styling). Scenes build an HTML string,
// open it, wire up listeners by id, and close it when done.
export function openPanel(html) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
  return overlay;
}

export function closePanel() {
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'none';
  overlay.innerHTML = '';
}

export function qs(id) {
  return document.getElementById(id);
}
