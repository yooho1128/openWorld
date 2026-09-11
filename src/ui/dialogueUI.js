const box = () => document.getElementById('dialogue-box');
const nameEl = () => document.getElementById('dialogue-name');
const logEl = () => document.getElementById('dialogue-log');
const inputEl = () => document.getElementById('dialogue-input');

export function initDialogueUI({ onSend, onClose }) {
  // Listen on document (not the <input>) so Enter/Escape still work even if
  // the input temporarily lost focus (e.g. while disabled during a fetch).
  document.addEventListener('keydown', (event) => {
    if (!isDialogueOpen()) return;
    if (event.key === 'Enter') {
      const text = inputEl().value.trim();
      if (text) {
        inputEl().value = '';
        onSend?.(text);
      }
    } else if (event.key === 'Escape') {
      onClose?.();
    }
  });
}

export function openDialogue(npcName) {
  box().classList.remove('hidden');
  nameEl().textContent = npcName;
  logEl().innerHTML = '';
  inputEl().value = '';
  inputEl().disabled = false;
  inputEl().focus();
}

export function closeDialogue() {
  box().classList.add('hidden');
  inputEl().blur();
}

export function isDialogueOpen() {
  return !box().classList.contains('hidden');
}

export function appendMessage(sender, text) {
  const el = document.createElement('div');
  el.className = `dialogue-msg ${sender}`;
  el.textContent = sender === 'player' ? `나: ${text}` : text;
  logEl().appendChild(el);
  logEl().scrollTop = logEl().scrollHeight;
}

export function setLoading(isLoading) {
  inputEl().disabled = isLoading;
  inputEl().placeholder = isLoading ? '...' : '말하기 (Enter 전송 / Esc 닫기)';
  if (!isLoading) inputEl().focus();
}
