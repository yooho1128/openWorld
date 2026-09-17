import Phaser from 'phaser';
import { getClass, getAdvancement } from '../data/rpg.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class RankingScene extends Phaser.Scene {
  constructor() { super('Ranking'); }

  create() {
    this.character = this.registry.get('character');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '명예의 전당', '레벨 · 승리 기준 상위 모험가 (마스터 계정 제외)');
    this.renderLoading();
    this.fetchRanking();
  }

  renderLoading() {
    openPanel(`
      <div class="panel ranking-panel">
        <h2>명예의 전당</h2>
        <p class="thinking">랭킹을 불러오는 중...</p>
        <button id="ranking-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    qs('ranking-back').addEventListener('click', () => { closePanel(); this.scene.start('Town'); });
  }

  async fetchRanking() {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) throw new Error('unavailable');
      const { ranking } = await response.json();
      this.render(Array.isArray(ranking) ? ranking : []);
    } catch {
      this.render(null);
    }
  }

  render(ranking) {
    const myNickname = this.registry.get('nickname');
    const rows = ranking?.length
      ? ranking.map((entry, index) => {
          const job = getClass(entry.classId);
          const advancement = getAdvancement(entry.advancementId);
          const rank = index + 1;
          const topClass = rank <= 3 ? `rank-top rank-${rank}` : '';
          const mine = entry.nickname === myNickname ? 'rank-mine' : '';
          return `<div class="rank-row ${topClass} ${mine}">
            <span class="rank-num">${rank}</span>
            <span class="rank-name"><strong>${entry.name}</strong><small>${advancement?.name ?? job?.name ?? '미정'} · Lv.${entry.level}</small></span>
            <span class="rank-value">${entry.victories.toLocaleString()}승</span>
          </div>`;
        }).join('')
      : '<p class="empty-state">랭킹 서버 준비 안됨 (또는 아직 등록된 모험가가 없습니다)</p>';
    openPanel(`
      <div class="panel ranking-panel">
        <h2>명예의 전당</h2>
        <p class="gold-line">레벨 · 승리 기준 상위 ${ranking?.length ?? 0}명 (마스터 계정 제외)</p>
        <div class="rank-list">${rows}</div>
        <button id="ranking-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    qs('ranking-back').addEventListener('click', () => { closePanel(); this.scene.start('Town'); });
  }
}
