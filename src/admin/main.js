import { BOSS_GUARANTEED_RATES, ENHANCEMENT_BLESSINGS, ENHANCEMENT_DESTROY_RATES, ENHANCEMENT_SUCCESS_RATES, GACHA_RARITY_TABLE, HUNT_DROP_RATES, getRarity, isSafeEnhancement } from '../data/equipment.js';

const STORAGE_KEY = 'everglen-admin-password';
const $ = (id) => document.getElementById(id);

function getPassword() {
  try { return sessionStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; }
}
function setPassword(value) {
  try { sessionStorage.setItem(STORAGE_KEY, value); } catch { /* private mode, etc. - just skip persisting */ }
}

async function callAdminApi(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: getPassword(), ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.ok !== false, status: response.status, data };
}

function showMsg(el, text, kind) {
  el.innerHTML = text ? `<div class="msg ${kind}">${text}</div>` : '';
}

function percent(value) {
  return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`;
}

// equipmentForMonster()의 if/else if 사슬을 그대로 반영한 값이라, 몬스터 등급
// 구간(F~C / B / A~S)마다 실제로 걸리는 확률이 다르다 - HUNT_DROP_RATES의 값은
// 누적 임계값이므로 구간별로 빼서 보여준다(등급을 바꾸면 이 표도 같이 바뀐다).
function tierRows(bands) {
  let prevThreshold = 0;
  const rows = bands.map(([label, threshold]) => {
    const row = `<tr><td>${label}</td><td>${percent(threshold - prevThreshold)}</td></tr>`;
    prevThreshold = threshold;
    return row;
  });
  rows.push(`<tr><td>무드랍</td><td>${percent(1 - prevThreshold)}</td></tr>`);
  return rows.join('');
}

function renderDropTable() {
  const hunt = HUNT_DROP_RATES;
  $('drop-table').innerHTML = `
    <p style="font-size:11px;color:#a99b7d;">F~C급 몬스터 (일반)</p>
    <table><tr><th>등급</th><th>확률</th></tr>${tierRows([['레어', hunt.rare], ['노멀', hunt.normal]])}</table>
    <p style="font-size:11px;color:#a99b7d;margin-top:14px;">B급 몬스터</p>
    <table><tr><th>등급</th><th>확률</th></tr>${tierRows([['유니크', hunt.specialUnique], ['레어', hunt.rare], ['노멀', hunt.normal]])}</table>
    <p style="font-size:11px;color:#a99b7d;margin-top:14px;">A/S급 몬스터</p>
    <table><tr><th>등급</th><th>확률</th></tr>${tierRows([['신화', hunt.bossMythic], ['전설', hunt.bossLegendary], ['유니크', hunt.specialUnique], ['레어', hunt.rare], ['노멀', hunt.normal]])}</table>
    <p style="font-size:11px;color:#a99b7d;margin-top:14px;">우두머리(보스) 처치 확정 지급 (등급과 무관하게 유니크 이상 확정, 무드랍 없음)</p>
    <table><tr><th>등급</th><th>확률</th></tr>
      <tr><td>신화</td><td>${percent(BOSS_GUARANTEED_RATES.mythic)}</td></tr>
      <tr><td>전설</td><td>${percent(BOSS_GUARANTEED_RATES.legendary - BOSS_GUARANTEED_RATES.mythic)}</td></tr>
      <tr><td>유니크</td><td>${percent(1 - BOSS_GUARANTEED_RATES.legendary)}</td></tr>
    </table>
    <p style="font-size:11px;color:#a99b7d;margin-top:14px;">장비 뽑기권(가챠)</p>
    <table><tr><th>등급</th><th>확률</th></tr>${GACHA_RARITY_TABLE.map(([rarity, weight]) => `<tr><td>${getRarity(rarity).name}</td><td>${percent(weight)}</td></tr>`).join('')}</table>
  `;
}

function renderForgeTable() {
  const rows = ENHANCEMENT_SUCCESS_RATES.map((rate, level) => {
    const destroy = ENHANCEMENT_DESTROY_RATES[level];
    const failNote = isSafeEnhancement(level) ? '실패해도 유지' : destroy ? `파괴 ${destroy}%` : '실패 시 -1';
    return `<tr><td>+${level} → +${level + 1}</td><td>${rate}%</td><td>${failNote}</td></tr>`;
  }).join('');
  const blessingRows = Object.entries(ENHANCEMENT_BLESSINGS).map(([key, b]) => `<tr><td>${b.symbol} ${b.name}</td><td>${key}</td><td>성공률 +${b.bonus}%</td></tr>`).join('');
  $('forge-table').innerHTML = `
    <table>
      <tr><th>강화 단계</th><th>성공률</th><th>실패 시</th></tr>
      ${rows}
    </table>
    <p style="font-size:11px;color:#a99b7d;margin:12px 0 4px;">+10 미만은 실패해도 수치가 유지되는 안전 구간. +10부터 파괴 위험이 있고, 파괴되지 않는 실패는 수치가 1 하락. 최대 +20.</p>
    <table>
      <tr><th>축복</th><th>키</th><th>효과</th></tr>
      ${blessingRows}
    </table>
    <p style="font-size:11px;color:#a99b7d;margin-top:8px;">축복은 강화 1회에 사용하면 성공률에 그대로 더해집니다(최대 +30%p).</p>
  `;
}

function couponRowHtml(coupon) {
  const parts = [coupon.effect];
  if (coupon.amount) parts.push(`${Number(coupon.amount).toLocaleString()}G`);
  if (coupon.reusable) parts.push('재사용');
  if (!coupon.enabled) parts.push('비활성');
  return `<tr>
    <td>${coupon.code}</td>
    <td>${parts.join(' · ')}</td>
    <td>${coupon.enabled ? `<button class="small danger" data-disable-code="${coupon.code}">비활성화</button>` : ''}</td>
  </tr>`;
}

async function loadCoupons() {
  const { ok, data } = await callAdminApi('/api/admin-coupon', { action: 'list' });
  if (!ok) { $('coupon-table').innerHTML = '<p class="empty">쿠폰 목록을 불러오지 못했습니다.</p>'; return; }
  const coupons = data.coupons ?? [];
  $('coupon-table').innerHTML = coupons.length
    ? `<table><tr><th>코드</th><th>내용</th><th></th></tr>${coupons.map(couponRowHtml).join('')}</table>`
    : '<p class="empty">등록된 쿠폰이 없습니다.</p>';
  $('coupon-table').querySelectorAll('[data-disable-code]').forEach((btn) => {
    btn.addEventListener('click', () => disableCoupon(btn.getAttribute('data-disable-code')));
  });
}

async function disableCoupon(code) {
  const { ok } = await callAdminApi('/api/admin-coupon', { action: 'disable', code });
  showMsg($('coupon-msg'), ok ? `「${code}」 비활성화했습니다.` : '비활성화에 실패했습니다.', ok ? 'ok' : 'error');
  loadCoupons();
}

async function submitCoupon() {
  const code = $('coupon-code').value.trim();
  if (!code) return showMsg($('coupon-msg'), '쿠폰 코드를 입력하세요.', 'error');
  const effect = $('coupon-effect').value;
  const amountRaw = $('coupon-amount').value.trim();
  const amount = amountRaw ? Number(amountRaw) : null;
  const reusable = $('coupon-reusable').checked;
  const { ok, data } = await callAdminApi('/api/admin-coupon', { action: 'create', code, effect, amount, reusable });
  showMsg($('coupon-msg'), ok ? `「${code}」 등록/수정 완료.` : `등록 실패: ${data.error ?? '알 수 없는 오류'}`, ok ? 'ok' : 'error');
  if (ok) { $('coupon-code').value = ''; $('coupon-amount').value = ''; $('coupon-reusable').checked = false; loadCoupons(); }
}

async function sendMail() {
  const nickname = $('mail-nickname').value.trim();
  if (!nickname) return showMsg($('mail-msg'), '받는 사람 닉네임을 입력하세요.', 'error');
  const payload = {
    nickname,
    title: $('mail-title').value.trim(),
    body: $('mail-body').value.trim(),
    gold: $('mail-gold').value.trim() || undefined,
    itemPreset: $('mail-item').value,
  };
  const { ok, data } = await callAdminApi('/api/admin-mail', payload);
  const errorLabels = { not_found: '해당 닉네임의 캐릭터를 찾을 수 없습니다.', no_class: '이 캐릭터는 아직 직업을 선택하지 않아 직업 전용 무기를 보낼 수 없습니다.' };
  showMsg($('mail-msg'), ok ? `「${nickname}」에게 우편을 보냈습니다.` : (errorLabels[data.error] ?? `전송 실패: ${data.error ?? '알 수 없는 오류'}`), ok ? 'ok' : 'error');
  if (ok) { $('mail-nickname').value = ''; $('mail-title').value = ''; $('mail-body').value = ''; $('mail-gold').value = ''; $('mail-item').value = 'none'; }
}

async function tryEnter() {
  const password = $('gate-password').value;
  setPassword(password);
  const { ok, status } = await callAdminApi('/api/admin-coupon', { action: 'list' });
  if (!ok) {
    setPassword('');
    $('gate-msg').innerHTML = `<div class="msg error">${status === 503 ? '서버에 운영자 비밀번호가 설정되지 않았습니다.' : '비밀번호가 올바르지 않습니다.'}</div>`;
    return;
  }
  $('gate').style.display = 'none';
  $('dashboard').style.display = 'block';
  renderDropTable();
  renderForgeTable();
  loadCoupons();
}

$('gate-submit').addEventListener('click', tryEnter);
$('gate-password').addEventListener('keydown', (event) => { if (event.key === 'Enter') tryEnter(); });
$('coupon-submit').addEventListener('click', submitCoupon);
$('mail-send').addEventListener('click', sendMail);

if (getPassword()) tryEnter();
