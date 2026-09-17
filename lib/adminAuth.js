import crypto from 'node:crypto';

// Server-only: which nicknames are master/admin accounts and which class
// each one boots into. Never expose this map (or the nickname list) to the
// client bundle - src/ only learns a nickname is a master account, and its
// class, via the /api/admin-login response after the password check passes.
const MASTER_ACCOUNTS = {
  '마스터_전사': 'warrior',
  '마스터_마법사': 'mage',
  '마스터_궁수': 'ranger',
  '마스터_성직자': 'cleric',
  '마스터_도적': 'rogue',
};

export const MASTER_NICKNAMES = Object.keys(MASTER_ACCOUNTS);

const COOKIE_NAME = 'everglen_admin';
const SESSION_SECONDS = 60 * 60 * 12;

export function isMasterNickname(nickname) {
  return Object.hasOwn(MASTER_ACCOUNTS, nickname);
}

export function masterClassId(nickname) {
  return MASTER_ACCOUNTS[nickname] ?? null;
}

function secret() {
  return process.env.ADMIN_PASSWORD || '';
}

function signature(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function adminPasswordConfigured() {
  return Boolean(secret());
}

export function verifyAdminPassword(password) {
  return adminPasswordConfigured() && safeEqual(String(password ?? ''), secret());
}

export function createAdminCookie(nickname) {
  const payload = Buffer.from(JSON.stringify({ nickname, exp: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url');
  const token = `${payload}.${signature(payload)}`;
  const secure = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function hasValidAdminSession(req, nickname) {
  if (!adminPasswordConfigured() || !isMasterNickname(nickname)) return false;
  const cookies = String(req.headers.cookie ?? '').split(';').map((entry) => entry.trim());
  const raw = cookies.find((entry) => entry.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!raw) return false;
  const [payload, providedSignature] = raw.split('.');
  if (!payload || !providedSignature || !safeEqual(providedSignature, signature(payload))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.nickname === nickname && Number(session.exp) > Date.now();
  } catch {
    return false;
  }
}
