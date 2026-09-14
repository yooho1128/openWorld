const screen = () => document.getElementById('result-screen');
const titleEl = () => document.getElementById('result-title');
const scoreEl = () => document.getElementById('result-score');
const comboEl = () => document.getElementById('result-combo');
const highScoreEl = () => document.getElementById('result-highscore');
const restartBtn = () => document.getElementById('result-restart');

export function initResultUI({ onRestart }) {
  restartBtn().addEventListener('click', () => onRestart?.());
  document.addEventListener('keydown', (event) => {
    if (!isResultOpen()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRestart?.();
    }
  });
}

export function showResult({ title, score, bestCombo, highScore, isNewHighScore }) {
  titleEl().textContent = title;
  scoreEl().textContent = `점수: ${score}`;
  comboEl().textContent = `최고 콤보: x${bestCombo}`;
  highScoreEl().textContent = isNewHighScore ? `🏆 신기록! ${highScore}` : `최고 기록: ${highScore}`;
  screen().classList.remove('hidden');
}

export function hideResult() {
  screen().classList.add('hidden');
}

export function isResultOpen() {
  return !screen().classList.contains('hidden');
}
