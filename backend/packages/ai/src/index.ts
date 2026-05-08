import Anthropic from "@anthropic-ai/sdk";
import { env } from "@saju/shared/env";

const MODEL = "claude-sonnet-4-5";

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (!cached) {
    cached = new Anthropic({
      baseURL: env.AI_PROXY_BASE_URL,
      apiKey: env.AI_PROXY_API_KEY || "dummy-key-via-proxy",
    });
  }
  return cached;
}

export type ReadingSections = {
  overview: string;
  career: string;
  love: string;
  health: string;
  wealth: string;
  caution: string;
};

export type GenerateReadingResult = {
  sections: ReadingSections;
  rawResponse: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

const READING_PROMPT = `당신은 한국 전통 사주명리에 정통한 친절한 풀이 전문가입니다.
아래는 사용자의 사주 원국과 십성/관계 등을 LLM-friendly compact 포맷으로 압축한 데이터입니다.
이 정보를 바탕으로 다음 6개 섹션의 풀이를 작성하세요.

각 섹션은 한국어 평어체로 2~3문장. 너무 단정짓지 말고 경향성으로 표현. 운명론 강조 금지.

반드시 아래 JSON 형식만 출력하세요. 마크다운 백틱이나 설명 없이 JSON 한 객체만:
{
  "overview": "...",
  "career": "...",
  "love": "...",
  "health": "...",
  "wealth": "...",
  "caution": "..."
}

[사주 데이터]
`;

function stripJsonFence(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseSections(raw: string): ReadingSections {
  const cleaned = stripJsonFence(raw);
  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM output is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const keys: (keyof ReadingSections)[] = [
    "overview",
    "career",
    "love",
    "health",
    "wealth",
    "caution",
  ];
  const out = {} as ReadingSections;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v !== "string") {
      throw new Error(`LLM output missing string field: ${k}`);
    }
    out[k] = v;
  }
  return out;
}

export async function generateProfileReading(
  compactSaju: string,
): Promise<GenerateReadingResult> {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `${READING_PROMPT}${compactSaju}`,
      },
    ],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("LLM returned no text block");
  }
  const raw = block.text;
  const sections = parseSections(raw);

  return {
    sections,
    rawResponse: raw,
    model: message.model,
    promptTokens: message.usage?.input_tokens ?? null,
    completionTokens: message.usage?.output_tokens ?? null,
  };
}
