const panel = () => document.getElementById('elevator-panel');
const currentEl = () => document.getElementById('elevator-current');
const listEl = () => document.getElementById('elevator-floor-list');

let onSelectHandler = null;
let onCloseHandler = null;

function floorLabel(index) {
  return index > 0 ? `${index}F` : `B${Math.abs(index)}`;
}

export function initElevatorUI(floorIndexes, { onSelect, onClose }) {
  onSelectHandler = onSelect;
  onCloseHandler = onClose;

  const list = listEl();
  list.innerHTML = '';
  for (const index of floorIndexes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `elevator-btn ${index < 0 ? 'basement' : 'office'}`;
    btn.dataset.floor = String(index);
    btn.textContent = floorLabel(index);
    btn.addEventListener('click', () => onSelectHandler?.(index));
    list.appendChild(btn);
  }

  document.addEventListener('keydown', (event) => {
    if (!isElevatorOpen()) return;
    if (event.key === 'Escape') onCloseHandler?.();
  });
}

export function openElevatorPanel(currentFloorIndex) {
  panel().classList.remove('hidden');
  currentEl().textContent = floorLabel(currentFloorIndex);
  for (const btn of listEl().querySelectorAll('.elevator-btn')) {
    btn.classList.toggle('current', Number(btn.dataset.floor) === currentFloorIndex);
  }
}

export function closeElevatorPanel() {
  panel().classList.add('hidden');
}

export function isElevatorOpen() {
  return !panel().classList.contains('hidden');
}
