import { neon } from '@neondatabase/serverless';
import { adminPasswordConfigured, verifyAdminPassword } from '../lib/adminAuth.js';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;
const SPECIAL_TITLE = { id: 'lucky-lottery', name: '그 운이면 로또를 사라', category: '특별', bossChanceBonus: 0.02 };
const MAIL_ID = 'mail-special-title-lucky-lottery-v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!sql) return res.status(503).json({ ok: false, error: 'database_not_configured' });
  if (!adminPasswordConfigured() || !verifyAdminPassword(req.body?.password)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const target = typeof req.body?.target === 'string' ? req.body.target.trim().slice(0, 20) : '';
  if (!target) return res.status(400).json({ ok: false, error: 'target_required' });

  try {
    const matches = await sql`
      SELECT nickname, data
      FROM characters
      WHERE nickname = ${target} OR data->>'name' = ${target}
      ORDER BY nickname
      LIMIT 3
    `;
    if (!matches.length) return res.status(404).json({ ok: false, error: 'character_not_found' });
    if (matches.length > 1) return res.status(409).json({ ok: false, error: 'ambiguous_target', matches: matches.map((row) => row.nickname) });

    const row = matches[0];
    const unlocked = Array.isArray(row.data?.unlockedTitles) ? row.data.unlockedTitles : [];
    const mailbox = Array.isArray(row.data?.mailbox) ? row.data.mailbox : [];
    const alreadyGranted = unlocked.includes(SPECIAL_TITLE.id) || mailbox.some((mail) => mail?.id === MAIL_ID || mail?.titleReward?.id === SPECIAL_TITLE.id);
    if (alreadyGranted) return res.json({ ok: true, alreadyGranted: true, nickname: row.nickname });

    const mail = {
      id: MAIL_ID,
      title: '기적적인 행운의 증명',
      body: '보스 장비에서 같은 부위를 다섯 번 연속으로 뽑아낸 기적적인 운을 기념합니다.',
      titleReward: SPECIAL_TITLE,
      createdAt: Date.now(),
    };
    await sql`
      UPDATE characters
      SET data = jsonb_set(data, '{mailbox}', COALESCE(data->'mailbox', '[]'::jsonb) || ${JSON.stringify([mail])}::jsonb, true),
          updated_at = now()
      WHERE nickname = ${row.nickname}
    `;
    return res.json({ ok: true, alreadyGranted: false, nickname: row.nickname });
  } catch (error) {
    console.error('Special title mail failed:', error);
    return res.status(502).json({ ok: false, error: 'mail_delivery_failed' });
  }
}
