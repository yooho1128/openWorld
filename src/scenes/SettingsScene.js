import Phaser from 'phaser';
import { classCouponWeapon, equipmentDisplayName, mythicAccessoryCoupon, mythicWeaponCoupon } from '../data/equipment.js';
import { ADVANCEMENTS } from '../data/rpg.js';
import { addLoot, ensureRpgCharacter, grantLevels, saveCharacter, strongestEquippedItem } from '../state/rpgCharacter.js';
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
    const couponAdminHtml = this.character.isAdmin ? `
        <h3>쿠폰 관리</h3>
        <label for="admin-coupon-code">쿠폰 코드</label><input id="admin-coupon-code" maxlength="60" placeholder="새 쿠폰 코드" autocomplete="off" />
        <label for="admin-coupon-effect">효과</label>
        <select id="admin-coupon-effect">
          <option value="gold">골드 지급</option>
          <option value="weapon">직업 유니크 무기 지급</option>
          <option value="mythic-weapon">신화급 무기 지급</option>
          <option value="mythic-accessory">신화급 악세서리 지급</option>
          <option value="enhance">강화 주문서 (현재 강화 수치에서 +N, 최대 +20)</option>
          <option value="levelup">레벨업 주문서 (현재 레벨에서 +N)</option>
          <option value="drain">골드 전부 삭제(장난용)</option>
        </select>
        <label for="admin-coupon-amount">수량 (골드/강화/레벨 지급일 때 필수)</label><input id="admin-coupon-amount" type="number" min="0" placeholder="예: 골드=200000, 강화=3, 레벨=10" />
        <label style="display:flex;align-items:center;gap:6px;"><input id="admin-coupon-reusable" type="checkbox" style="width:auto;" />여러 번 사용 가능(재사용)</label>
        <button id="admin-coupon-submit" class="secondary">쿠폰 등록/수정</button>
        <button id="admin-coupon-list" class="secondary">등록된 쿠폰 목록 보기</button>
    ` : '';
    openPanel(`
      <div class="panel"><h2>게임 설정</h2>
        <label for="coupon-code">쿠폰 코드</label><input id="coupon-code" maxlength="40" placeholder="쿠폰 코드를 입력하세요" autocomplete="off" />
        ${message ? `<p class="trade-message">${message}</p>` : ''}
        <button id="coupon-submit">쿠폰 사용</button>
        ${this.character.isAdmin ? `<h3>운영자 전용</h3><p class="gold-line">전직을 바꾸면 해당 전직 스킬을 즉시 테스트할 수 있습니다.</p>${adminJobs}` : ''}
        ${couponAdminHtml}
        <button id="settings-back" class="secondary">길드로 돌아가기</button>
      </div>
    `);
    qs('coupon-submit').addEventListener('click', () => this.redeem());
    if (this.character.isAdmin) (ADVANCEMENTS[this.character.classId] ?? []).forEach((job, index) => qs(`admin-job-${index}`)?.addEventListener('click', () => {
      this.character.advancementId = job.id;
      saveCharacter(this);
      this.render(`${job.name}(으)로 전직 테스트 상태를 변경했습니다.`);
    }));
    qs('admin-coupon-submit')?.addEventListener('click', () => this.createCoupon());
    qs('admin-coupon-list')?.addEventListener('click', () => this.listCoupons());
    qs('settings-back').addEventListener('click', () => { saveCharacter(this); closePanel(); this.scene.start('Town'); });
  }

  // Coupon codes and what they grant are only known to the server - this
  // just sends the typed code and applies whatever effect it's told the
  // code unlocked, so the valid codes never ship in the client bundle.
  async redeem() {
    if (this.redeeming) return;
    const code = qs('coupon-code').value.trim();
    if (!code) return this.render('쿠폰 코드를 입력하세요.');
    this.redeeming = true;
    let result;
    try {
      const response = await fetch('/api/redeem-coupon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: this.registry.get('nickname'), code }),
      });
      result = await response.json();
    } catch {
      this.redeeming = false;
      return this.render('쿠폰 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.');
    }
    this.redeeming = false;
    if (!result.ok) {
      return this.render(result.reason === 'used' ? '이미 사용한 쿠폰입니다.' : '존재하지 않는 쿠폰입니다.');
    }
    this.character.redeemedCoupons.push(code);
    if (result.effect === 'weapon') {
      const weapon = classCouponWeapon(this.character.classId, this.character.level);
      if (!weapon) return this.render('직업 전용 무기를 지급할 수 없습니다.');
      addLoot(this.character, weapon);
      saveCharacter(this);
      return this.render(`유니크 직업 무기 「${equipmentDisplayName(weapon)}」을 획득했습니다!`);
    }
    if (result.effect === 'mythic-weapon') {
      const weapon = mythicWeaponCoupon(this.character.classId, this.character.level);
      if (!weapon) return this.render('신화급 무기를 지급할 수 없습니다.');
      addLoot(this.character, weapon);
      saveCharacter(this);
      return this.render(`신화급 무기 「${equipmentDisplayName(weapon)}」을 획득했습니다!`);
    }
    if (result.effect === 'mythic-accessory') {
      const accessory = mythicAccessoryCoupon(this.character.level);
      if (!accessory) return this.render('신화급 악세서리를 지급할 수 없습니다.');
      addLoot(this.character, accessory);
      saveCharacter(this);
      return this.render(`신화급 악세서리 「${equipmentDisplayName(accessory)}」을 획득했습니다!`);
    }
    if (result.effect === 'gold') {
      const amount = result.amount ?? 0;
      this.character.gold += amount;
      this.character.goldEarnedTotal = (this.character.goldEarnedTotal ?? 0) + amount;
      saveCharacter(this);
      return this.render(`쿠폰의 힘으로 골드 ${amount.toLocaleString()}이 쏟아졌습니다!`);
    }
    if (result.effect === 'enhance') {
      const amount = Math.max(1, Math.floor(Number(result.amount) || 1));
      const target = strongestEquippedItem(this.character);
      if (!target) return this.render('강화할 장비가 없습니다. 먼저 장비를 착용해주세요.');
      const before = target.enhancement ?? 0;
      // 대장간과 동일하게 +20이 상한이다.
      target.enhancement = Math.min(20, before + amount);
      this.character.highestEnhancement = Math.max(this.character.highestEnhancement ?? 0, target.enhancement);
      saveCharacter(this);
      return this.render(`주문서의 힘으로 「${target.name}」이(가) +${before} → +${target.enhancement}(으)로 강화되었습니다!`);
    }
    if (result.effect === 'levelup') {
      const amount = Math.max(1, Math.floor(Number(result.amount) || 1));
      const before = this.character.level;
      const gained = grantLevels(this.character, amount);
      saveCharacter(this);
      return this.render(gained.length ? `주문서의 힘으로 Lv.${before} → Lv.${this.character.level}(으)로 레벨업했습니다!` : '이미 최대 레벨(999)입니다.');
    }
    this.character.gold = 0;
    saveCharacter(this);
    this.render('쿠폰의 악마 같은 힘으로 보유 골드가 모두 사라졌습니다.');
  }

  // Admin-only: create or update a coupon directly in the coupons table, no
  // code deploy needed. Auth rides the same admin-login session cookie used
  // to reach this screen in the first place.
  async createCoupon() {
    const code = qs('admin-coupon-code').value.trim();
    if (!code) return this.render('쿠폰 코드를 입력하세요.');
    const effect = qs('admin-coupon-effect').value;
    const amountRaw = qs('admin-coupon-amount').value.trim();
    const amount = amountRaw ? Number(amountRaw) : null;
    const reusable = qs('admin-coupon-reusable').checked;
    let result;
    try {
      const response = await fetch('/api/admin-coupon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: this.registry.get('nickname'), action: 'create', code, effect, amount, reusable }),
      });
      result = await response.json();
    } catch {
      return this.render('쿠폰 관리 서버에 연결할 수 없습니다.');
    }
    if (!result.ok) return this.render(`쿠폰 등록 실패: ${result.error ?? '알 수 없는 오류'}`);
    this.render(`쿠폰 「${code}」 등록 완료! (${effect}${amount ? ` · ${amount.toLocaleString()}G` : ''}${reusable ? ' · 재사용가능' : ''})`);
  }

  async listCoupons() {
    let result;
    try {
      const response = await fetch('/api/admin-coupon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: this.registry.get('nickname'), action: 'list' }),
      });
      result = await response.json();
    } catch {
      return this.render('쿠폰 관리 서버에 연결할 수 없습니다.');
    }
    if (!result.ok) return this.render(`쿠폰 목록 조회 실패: ${result.error ?? '알 수 없는 오류'}`);
    if (!result.coupons.length) return this.render('등록된 쿠폰이 없습니다.');
    const lines = result.coupons.map((c) => `${c.code} · ${c.effect}${c.amount ? ` ${Number(c.amount).toLocaleString()}G` : ''}${c.reusable ? ' · 재사용' : ''}${c.enabled ? '' : ' · 비활성'}`);
    this.render(lines.join('<br>'));
  }
}
