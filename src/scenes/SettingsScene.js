import Phaser from 'phaser';
import { classCouponWeapon, equipmentDisplayName } from '../data/equipment.js';
import { ADVANCEMENTS } from '../data/rpg.js';
import { addLoot, ensureRpgCharacter, saveCharacter } from '../state/rpgCharacter.js';
import { openPanel, closePanel, qs } from '../ui/domForms.js';
import { addFantasyBackdrop, addSceneTitle } from '../ui/fantasyTheme.js';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }
  create() {
    this.character = ensureRpgCharacter(this.registry.get('character'));
    if (!this.character) return this.scene.start('Login');
    addFantasyBackdrop(this, { dark: true });
    addSceneTitle(this, '설정과 쿠폰', '쿠폰은 캐릭터마다 한 번만 사용할 수 있습니다');
    this.render();
  }

  render(message = '') {
    const adminJobs = this.character.isAdmin ? (ADVANCEMENTS[this.character.classId] ?? []).map((job, index) => `<button id="admin-job-${index}" class="secondary">전직 테스트: ${job.name}</button>`).join('') : '';
    openPanel(`
      <div class="panel"><h2>게임 설정</h2>
        <label for="coupon-code">쿠폰 코드</label><input id="coupon-code" maxlength="40" placeholder="쿠폰 코드를 입력하세요" autocomplete="off" />
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <button id="coupon-submit">쿠폰 사용</button>
        ${this.character.isAdmin ? `<h3>운영자 전용</h3><p class="gold-line">전직을 바꾸면 해당 전직 스킬을 즉시 테스트할 수 있습니다.</p>${adminJobs}` : ''}
        <button id="settings-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    qs('coupon-submit').addEventListener('click', () => this.redeem());
    if (this.character.isAdmin) (ADVANCEMENTS[this.character.classId] ?? []).forEach((job, index) => qs(`admin-job-${index}`)?.addEventListener('click', () => {
      this.character.advancementId = job.id;
      saveCharacter(this);
      this.render(`${job.name}(으)로 전직 테스트 상태를 변경했습니다.`);
    }));
    qs('settings-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  redeem() {
    const code = qs('coupon-code').value.trim();
    const VALID_CODES = ['최유호는 너무 멋져', '최유호는 아쿠마다', '황금폭풍'];
    if (!VALID_CODES.includes(code)) return this.render('존재하지 않는 쿠폰입니다.');
    if (this.character.redeemedCoupons.includes(code)) return this.render('이미 사용한 쿠폰입니다.');
    this.character.redeemedCoupons.push(code);
    if (code === '최유호는 너무 멋져') {
      const weapon = classCouponWeapon(this.character.classId);
      addLoot(this.character, weapon);
      saveCharacter(this);
      return this.render(`유니크 직업 무기 「${equipmentDisplayName(weapon)}」을 획득했습니다!`);
    }
    if (code === '황금폭풍') {
      const amount = 30000;
      this.character.gold += amount;
      this.character.goldEarnedTotal = (this.character.goldEarnedTotal ?? 0) + amount;
      saveCharacter(this);
      return this.render(`쿠폰의 힘으로 골드 ${amount.toLocaleString()}이 쏟아졌습니다!`);
    }
    this.character.gold = 0;
    saveCharacter(this);
    this.render('쿠폰의 악마 같은 힘으로 보유 골드가 모두 사라졌습니다.');
  }
}
