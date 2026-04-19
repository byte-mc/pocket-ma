import { getContext } from './model';

const SYSTEM_PROMPT = `You are an offline medical triage assistant.
Ask at most 2 short follow-up questions to gather information, then give a triage assessment.
If the situation is clearly an emergency, assess immediately.

When giving the triage assessment, use exactly this format:
TRIAGE
Severity: [Low / Medium / High / Emergency]
Likely cause: <one line>
Immediate action:
  1. <step>
  2. <step>
Seek help if: <condition>

Keep gathering responses to 1 sentence. Always respond in the same language the user used.`;

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

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history,
    { role: 'user' as const, content: userContent },
  ];

  console.log('[ASSISTANT] Request messages:');
  messages.forEach((m, i) => {
    console.log(`  [${i}] ${m.role}:`, JSON.stringify(m.content).slice(0, 200));
  });

  const result = await ctx.completion({
    messages: messages as any,
    n_predict: 600,
    temperature: 0.1,
    stop: ['\n\n\n', '<end_of_turn>'],
  } as any);

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

  console.log('[ASSISTANT] Cleaned text:', text);
  const isTriage = text.startsWith('TRIAGE');
  return { phase: isTriage ? 'triage' : 'gathering', message: text };
}
