import Phaser from 'phaser';
import { ensureRpgCharacter, saveCharacter } from '../state/rpgCharacter.js';
import { ensureQuestState, claimDailyQuest, milestoneStatus, claimMilestone } from '../state/quests.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

function progressBar(value, target) {
  const pct = Math.max(0, Math.min(100, Math.round((value / target) * 100)));
  return `<div class="quest-progress-track"><div class="quest-progress-fill" style="width:${pct}%"></div><div class="quest-progress-label">${Math.min(value, target).toLocaleString()} / ${target.toLocaleString()}</div></div>`;
}

function rewardLine(entry) {
  const parts = [];
  if (entry.rewardGold) parts.push(`골드 ${entry.rewardGold.toLocaleString()}`);
  if (entry.rewardXp) parts.push(`XP ${entry.rewardXp.toLocaleString()}`);
  if (entry.rewardPotions) parts.push(`물약 ${entry.rewardPotions}개`);
  if (entry.title) parts.push(`칭호 「${entry.title}」`);
  return `보상: ${parts.join(' · ') || '-'}`;
}

export class QuestScene extends Phaser.Scene {
  constructor() { super('Quest'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    ensureQuestState(this.character);
    saveCharacter(this);
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '모험가 의뢰소', '매일 자정 의뢰가 새로 갱신됩니다');
    this.tab = 'daily';
    this.render();
  }

  render(message = '') {
    const c = this.character;
    const daily = c.quests.daily.list;
    const milestones = milestoneStatus(c);
    const dailyHtml = daily.map((quest) => `
      <div class="quest-card ${quest.claimed ? 'done' : ''}">
        <strong>${quest.label}</strong>
        ${progressBar(quest.progress, quest.target)}
        <small>${rewardLine(quest)}</small>
        <button id="claim-daily-${quest.id}" ${quest.claimed || quest.progress < quest.target ? 'disabled' : ''}>
          ${quest.claimed ? '완료됨' : quest.progress >= quest.target ? '보상 받기' : '진행중'}
        </button>
      </div>`).join('');
    const milestoneHtml = milestones.map((entry) => `
      <div class="milestone-card ${entry.claimedAlready ? 'done' : entry.achieved ? '' : 'locked'}">
        <span class="achievement-category">${entry.category ?? '업적'}</span><strong>${entry.name}</strong>
        ${progressBar(entry.value, entry.target)}
        <small>${rewardLine(entry)}</small>
        <button id="claim-milestone-${entry.id}" ${entry.claimedAlready || !entry.achieved ? 'disabled' : ''}>
          ${entry.claimedAlready ? '수령완료' : entry.achieved ? '수령하기' : '미달성'}
        </button>
      </div>`).join('');
    openPanel(`
      <div class="panel quest-panel">
        <h2>모험가 의뢰소</h2>
        <p class="gold-line">보유 골드 <strong>${c.gold.toLocaleString()}G</strong></p>
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <div class="quest-tabs">
          <button id="tab-daily" class="${this.tab === 'daily' ? '' : 'inactive'}">오늘의 의뢰</button>
          <button id="tab-milestone" class="${this.tab === 'milestone' ? '' : 'inactive'}">업적 · 칭호</button>
        </div>
        <div class="quest-list milestone-list">${this.tab === 'daily' ? dailyHtml : milestoneHtml}</div>
        <button id="quest-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    qs('tab-daily').addEventListener('click', () => { this.tab = 'daily'; this.render(); });
    qs('tab-milestone').addEventListener('click', () => { this.tab = 'milestone'; this.render(); });
    daily.forEach((quest) => qs(`claim-daily-${quest.id}`)?.addEventListener('click', () => this.claimDaily(quest.id)));
    milestones.forEach((entry) => qs(`claim-milestone-${entry.id}`)?.addEventListener('click', () => this.claimMilestoneReward(entry.id)));
    qs('quest-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  claimDaily(questId) {
    const result = claimDailyQuest(this.character, questId);
    if (!result) return this.render('아직 조건을 달성하지 못했습니다.');
    saveCharacter(this);
    const levelLine = result.levels.length ? ` · 레벨 ${result.levels.at(-1)} 달성!` : '';
    this.render(`의뢰 완료! 골드 ${result.quest.rewardGold.toLocaleString()} · XP ${result.quest.rewardXp}${levelLine}`);
  }

  claimMilestoneReward(id) {
    const result = claimMilestone(this.character, id);
    if (!result) return this.render('아직 달성하지 못한 업적입니다.');
    saveCharacter(this);
    const levelLine = result.levels.length ? ` · 레벨 ${result.levels.at(-1)} 달성!` : '';
    const titleLine = result.titleUnlocked ? ` · 칭호 「${result.titleUnlocked}」 해금!` : '';
    this.render(`업적 「${result.entry.name}」 달성! 보상을 수령했습니다.${titleLine}${levelLine}`);
  }
}
