import { getContext } from './model';

const SYSTEM_PROMPT = `You are an offline medical triage assistant.
The user will describe a symptom. Respond ONLY in this exact format:

Severity: [Low / Medium / High / Emergency]
Likely cause: <one line>
Immediate action:
  1. <step>
  2. <step>
  3. <step>
Evacuate if: <condition>

Respond in the same language the user wrote in. Be concise. Do not add extra explanation.`;

export async function triage(
  symptom: string,
  onToken?: (token: string) => void,
): Promise<string> {
  const ctx = getContext();
  const result = await ctx.completion(
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: symptom },
      ],
      n_predict: 512,
      temperature: 0.1,
      stop: ['\n\n\n', '<end_of_turn>'],
    },
    onToken ? data => onToken(data.token) : undefined,
  );
  return result.text.trim();
}
