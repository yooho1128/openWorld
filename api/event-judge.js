import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const STAT_KEYS = ['stamina', 'intelligence', 'language', 'charm', 'happiness', 'health', 'money'];

const SYSTEM = `당신은 인생 시뮬레이션 게임의 이벤트 심판입니다.
주어진 상황(scenario)과 플레이어의 대응(response)을 보고 아래 스탯 중 관련 있는 것만 골라 -10에서 +10 사이의 정수로 변화시키세요: stamina, intelligence, language, charm, happiness, health, money.
현명하고 성숙한 대응이면 관련 스탯을 올리고, 무모하거나 부적절한 대응이면 내리세요.
반드시 아래 JSON 형식으로만 답하세요. 다른 텍스트나 코드블록 없이 순수 JSON만 출력하세요:
{"deltas": {"stat이름": 정수, ...}, "feedback": "한 문장짜리 짧은 피드백"}`;

function clampText(value, max) {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

function parseJudgment(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { deltas: {}, feedback: text.slice(0, 200) };
  try {
    const parsed = JSON.parse(match[0]);
    const deltas = {};
    for (const key of STAT_KEYS) {
      if (parsed.deltas && key in parsed.deltas) {
        deltas[key] = clampInt(parsed.deltas[key], -10, 10);
      }
    }
    return { deltas, feedback: clampText(parsed.feedback, 200) || '...' };
  } catch {
    return { deltas: {}, feedback: text.slice(0, 200) };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scenario, characterSummary, response } = req.body ?? {};
  const safeScenario = clampText(scenario, 400);
  const safeResponse = clampText(response, 500);
  if (!safeScenario || !safeResponse) {
    return res.status(400).json({ error: 'scenario and response are required' });
  }
  const safeSummary = clampText(characterSummary, 300);

  const userContent = `상황: ${safeScenario}\n플레이어 정보: ${safeSummary || '정보 없음'}\n플레이어의 대응: ${safeResponse}`;

  try {
    const apiResponse = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = apiResponse.content.find((block) => block.type === 'text');
    const judgment = parseJudgment(textBlock?.text ?? '{}');
    res.json(judgment);
  } catch (err) {
    console.error('Event judge error:', err);
    res.status(502).json({ error: 'Failed to reach Claude API' });
  }
}
