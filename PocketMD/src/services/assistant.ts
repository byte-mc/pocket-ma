import { getContext } from './model';

const SYSTEM_PROMPT = `You are an offline medical triage assistant.
Always ask 1-2 follow-up questions before triaging (in 1 or 2 turns). Only skip questions for clear life-threatening emergencies.

After gathering, give the triage assessment in EXACTLY this format — nothing before or after it:
TRIAGE
Severity: [Low / Medium / High / Emergency]
Likely cause: <one line>
Immediate action:
  1. <step>
  2. <step>
Seek help if: <condition>

Keep questions brief. Always respond in the same language the user used.`;

export type AssistantResponse = {
  phase: 'gathering' | 'triage';
  message: string;
};

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string | object[];
};

export async function sendMessage(
  history: ConversationMessage[],
  userText: string,
  imagePath?: string,
): Promise<AssistantResponse> {
  const ctx = getContext();

  const userContent: string | object[] = imagePath
    ? [
        { type: 'image_url', image_url: { url: `file://${imagePath}` } },
        { type: 'text', text: userText || 'What do you see?' },
      ]
    : userText;

  // Count assistant turns in history to enforce the 2-question cap
  const gatheringTurns = history.filter(m => m.role === 'assistant').length;
  const forceTriage = gatheringTurns >= 2;

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history,
    { role: 'user' as const, content: userContent },
    ...(forceTriage ? [{ role: 'system' as const, content: 'You have asked enough questions. Provide the triage assessment now.' }] : []),
  ];

  console.log('[ASSISTANT] Request messages:');
  messages.forEach((m, i) => {
    console.log(`  [${i}] ${m.role}:`, JSON.stringify(m.content).slice(0, 200));
  });

  // Gathering turns need ~35 tokens; triage format peaks at ~100. Use 150 as a
  // single safe cap — tight enough to skip wasted decode, loose enough for triage.
  const n_predict = 150;

  const wallStart = Date.now();

  const result = await ctx.completion({
    messages: messages as any,
    n_predict,
    temperature: 0.1,
    enable_thinking: false,
    stop: ['\n\n\n', '<end_of_turn>'],
  } as any);

  const wallMs = Date.now() - wallStart;
  const t = result.timings;
  console.log(
    `[PERF] wall=${wallMs}ms` +
    ` | prefill: ${t.prompt_n} tok @ ${t.prompt_per_second.toFixed(1)} t/s (${t.prompt_ms.toFixed(0)}ms)` +
    ` | decode: ${t.predicted_n} tok @ ${t.predicted_per_second.toFixed(1)} t/s (${t.predicted_ms.toFixed(0)}ms)`
  );

  const raw = result.text.trim();
  console.log('[ASSISTANT] Raw response:', raw);

  // Gemma 4 wraps thinking in <|channel>thought\n...<channel|>actual response
  const thinkEnd = raw.lastIndexOf('<channel|>');
  if (thinkEnd === -1 && raw.includes('<|channel>thought')) {
    // Model hit token limit mid-thinking — response is truncated, discard it
    console.warn('[ASSISTANT] Truncated thinking block, discarding');
    return { phase: 'gathering', message: '(Sorry, response was cut off — please try again.)' };
  }

  const text = thinkEnd !== -1
    ? raw.slice(thinkEnd + '<channel|>'.length).trim()
    : raw.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim() || raw;

  // If triage block appears mid-response (model mixed Q + triage), extract just the triage
  const triageIdx = text.indexOf('\nTRIAGE');
  const normalized = triageIdx !== -1 ? text.slice(triageIdx + 1).trim() : text;

  // Strip anything the model appended after the triage block (e.g. follow-up questions)
  const isTriage = normalized.startsWith('TRIAGE');
  const final = isTriage
    ? normalized.replace(/(\nSeek help if:[^\n]*)[\s\S]*$/, '$1').trim()
    : normalized;

  console.log('[ASSISTANT] Cleaned text:', final);
  return { phase: isTriage ? 'triage' : 'gathering', message: final };
}
