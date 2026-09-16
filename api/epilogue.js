import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM = `당신은 죽은 사람의 생애를 심판하는 저승의 심판관입니다.
주어진 삶의 요약, 발자취, 최종 스탯, 사망 원인을 보고:
1. 그 사람의 인생을 한 편의 짧은 에필로그(3~5문장)로 정리하세요. 담담하고 문학적인 톤으로, 있었던 사실에 근거해서 쓰세요.
2. 그 삶을 근거로 "천국", "지옥", "연옥" 중 하나로 심판하고, 그렇게 판단한 이유를 1~2문장으로 설명하세요.
반드시 아래 JSON 형식으로만 답하세요. 다른 텍스트나 코드블록 없이 순수 JSON만 출력하세요:
{"epilogue": "...", "verdict": "천국|지옥|연옥", "reason": "..."}`;

function clampText(value, max) {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

function parseVerdict(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { epilogue: text.slice(0, 400), verdict: '연옥', reason: '' };
  try {
    const parsed = JSON.parse(match[0]);
    const verdict = ['천국', '지옥', '연옥'].includes(parsed.verdict) ? parsed.verdict : '연옥';
    return {
      epilogue: clampText(parsed.epilogue, 400) || '...',
      verdict,
      reason: clampText(parsed.reason, 200),
    };
  } catch {
    return { epilogue: text.slice(0, 400), verdict: '연옥', reason: '' };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { characterSummary, history, deathCause, dreamJob, dreamAchieved } = req.body ?? {};
  const safeSummary = clampText(characterSummary, 300);
  const safeHistory = Array.isArray(history) ? history.slice(-30).map((h) => clampText(h, 120)).join('\n') : '';
  const safeCause = clampText(deathCause, 60) || '알 수 없음';
  const safeDream = clampText(dreamJob, 30);

  const userContent = `삶의 요약: ${safeSummary || '정보 없음'}
장래희망: ${safeDream || '없음'} (${dreamAchieved ? '이루어짐' : '이루지 못함'})
사망 원인: ${safeCause}
발자취:
${safeHistory || '(기록 없음)'}`;

  try {
    const apiResponse = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = apiResponse.content.find((block) => block.type === 'text');
    res.json(parseVerdict(textBlock?.text ?? '{}'));
  } catch (err) {
    console.error('Epilogue error:', err);
    res.status(502).json({ error: 'Failed to reach Claude API' });
  }
}
