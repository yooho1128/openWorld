import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM = `당신은 만년 과장 "김 팀장"입니다. 부하 직원의 오늘자 "출근런" 기록(이동 거리, 목표 거리, 모은 커피 개수, 부딪힌 장애물 횟수, 스테이지 클리어 여부)을 보고 짧은 인사고과 코멘트를 씁니다.

말투: 피곤하지만 유머러스한 존댓말/반말 섞음, 직장인 특유의 자조 섞인 농담.
규칙:
- 항상 한국어로 1~3문장, 과장되지 않게 짧고 재치있게.
- 주어진 수치(거리/커피/장애물 횟수/클리어 여부)에 근거해서 코멘트하고, 없는 사실을 지어내지 마세요.
- 클리어했으면 칭찬 반 놀림 반, 실패했으면 위로 반 잔소리 반으로.
- 절대 이모지를 남발하지 말고 최대 1개까지만 쓰세요.`;

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { stageName, distance, goalDistance, coffee, hits, cleared } = req.body ?? {};
  if (typeof stageName !== 'string' || !stageName.trim()) {
    return res.status(400).json({ error: 'stageName is required' });
  }

  const safeStageName = stageName.slice(0, 40);
  const safeDistance = clampInt(distance, 0, 999999);
  const safeGoal = clampInt(goalDistance, 1, 999999);
  const safeCoffee = clampInt(coffee, 0, 999999);
  const safeHits = clampInt(hits, 0, 999999);
  const safeCleared = Boolean(cleared);

  const prompt = `스테이지: ${safeStageName}
이동 거리: ${safeDistance}m (목표 ${safeGoal}m)
모은 커피: ${safeCoffee}개
부딪힌 장애물: ${safeHits}번
결과: ${safeCleared ? '스테이지 클리어' : '중도 낙오'}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const review = textBlock?.text ?? '...';
    res.json({ review });
  } catch (err) {
    console.error('Review generation error:', err);
    res.status(502).json({ error: 'Failed to reach Claude API' });
  }
}
