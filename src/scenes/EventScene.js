import Phaser from 'phaser';
import { ensureRpgCharacter, saveCharacter, waitForPendingSaves } from '../state/rpgCharacter.js';
import { equipmentDisplayName } from '../data/equipment.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

const WEAPON_NAMES = {
  warrior: '창세의 대검', mage: '성좌의 마도 지팡이', ranger: '천공의 장궁',
  cleric: '새벽의 성전 철퇴', rogue: '영원의 쌍단검',
};

export class EventScene extends Phaser.Scene {
  constructor() { super('Event'); }

  create() {
    this.character = this.registry.get('character');
    if (!this.character) return this.scene.start('Login');
    ensureRpgCharacter(this.character);
    this.nickname = this.registry.get('nickname');
    addFantasyBackdrop(this, { dark: true, accent: 0xd35b68 });
    addSceneTitle(this, '왕국 출석 축제', '하루 한 번 서약을 남기고 7일 신화 무기를 받으세요');
    this.renderLoading();
    this.loadStatus();
  }

  renderLoading() {
    openPanel(`<div class="panel event-panel"><h2>7일 출석체크</h2><p class="thinking">왕국 출석부를 확인하는 중...</p><button id="event-back" class="secondary">길드로 돌아가기</button></div>`);
    qs('event-back').addEventListener('click', () => { closePanel(); this.scene.start('Town'); });
  }

  async loadStatus(message = '') {
    try {
      const response = await fetch(`/api/attendance?nickname=${encodeURIComponent(this.nickname)}`);
      if (!response.ok) throw new Error('unavailable');
      const status = await response.json();
      if (status.character) {
        this.character = ensureRpgCharacter(status.character);
        this.registry.set('character', this.character);
      }
      this.syncAttendanceDays(status.days);
      this.render(status, message);
    } catch {
      this.renderError('출석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  render(status, message = '') {
    const days = Math.max(0, Math.min(7, Number(status.days) || 0));
    const dayCards = Array.from({ length: 7 }, (_, index) => {
      const day = index + 1;
      const done = day <= days;
      const reward = day === 7;
      return `<div class="attendance-day ${done ? 'done' : ''} ${reward ? 'reward' : ''}"><span>${day}일</span><strong>${done ? '✓' : reward ? '+11' : '·'}</strong><small>${reward ? '신화 무기' : done ? '출석 완료' : '미출석'}</small></div>`;
    }).join('');
    const complete = status.rewardClaimed;
    const buttonLabel = complete ? '7일 보상 수령 완료' : status.todayClaimed ? '오늘 출석 완료' : '오늘 출석체크';
    const weaponName = WEAPON_NAMES[this.character.classId] ?? '직업 전용 무기';
    openPanel(`
      <div class="panel event-panel">
        <h2>7일 출석체크</h2>
        <div class="event-banner"><span>EVENT</span><strong>칠일의 맹세</strong><small>한국 시간 기준 · 누적 출석</small></div>
        <div class="attendance-grid">${dayCards}</div>
        <div class="event-reward rarity-mythic"><strong>+11 ${weaponName}</strong><small>신화 등급 · 수령 시점 레벨 · 현재 직업 전용</small></div>
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <p class="event-date">서버 날짜 ${status.serverDate} · ${days}/7일</p>
        <button id="attendance-claim" ${status.todayClaimed || complete ? 'disabled' : ''}>${buttonLabel}</button>
        <button id="event-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    qs('attendance-claim')?.addEventListener('click', () => this.claim());
    qs('event-back').addEventListener('click', () => { closePanel(); this.scene.start('Town'); });
  }

  renderError(message) {
    openPanel(`<div class="panel event-panel"><h2>7일 출석체크</h2><p class="error">${message}</p><button id="event-retry">다시 시도</button><button id="event-back" class="secondary">길드로 돌아가기</button></div>`);
    qs('event-retry').addEventListener('click', () => { this.renderLoading(); this.loadStatus(); });
    qs('event-back').addEventListener('click', () => { closePanel(); this.scene.start('Town'); });
  }

  async claim() {
    const button = qs('attendance-claim');
    if (button) { button.disabled = true; button.textContent = '출석부에 기록하는 중...'; }
    try {
      await waitForPendingSaves();
      const response = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: this.nickname }),
      });
      if (!response.ok) throw new Error('claim_failed');
      const result = await response.json();
      if (result.character) {
        this.character = ensureRpgCharacter(result.character);
        this.registry.set('character', this.character);
      }
      this.syncAttendanceDays(result.days);
      const message = result.rewardGranted && result.reward
        ? `★ 7일 출석 완료! 「${equipmentDisplayName(result.reward)}」을(를) 획득했습니다!`
        : result.claimed ? `${result.days}일차 출석이 기록됐습니다.` : '오늘 출석은 이미 완료했습니다.';
      this.render({ ...result, todayClaimed: true }, message);
    } catch {
      await this.loadStatus('출석 기록에 실패했습니다. 다시 시도해주세요.');
    }
  }

  syncAttendanceDays(days) {
    const value = Math.max(0, Math.min(7, Number(days) || 0));
    if (value <= (this.character.attendanceDays ?? 0)) return;
    this.character.attendanceDays = value;
    saveCharacter(this);
  }
}
