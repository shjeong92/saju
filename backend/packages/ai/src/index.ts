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

export type CompatibilitySummary = {
  overall: string;
  strengths: string[];
  cautions: string[];
  firstDateIdeas: string[];
  conversationStarters: string[];
};

export type GenerateCompatibilityResult = {
  summary: CompatibilitySummary;
  rawResponse: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

const COMPATIBILITY_PROMPT = `당신은 한국 전통 사주명리에 정통한 친절한 궁합 풀이 전문가입니다.
아래는 두 사람(A, B)의 사주 압축 데이터와 매칭 점수 산출 결과입니다.
이 정보를 바탕으로 두 사람의 궁합을 따뜻하고 균형 있게 풀어주세요.

규칙:
- 한국어 평어체. 운명론·확정 표현 금지, 경향성으로 표현.
- strengths/cautions/firstDateIdeas/conversationStarters는 각 3~5개의 짧은 문장 배열.
- overall은 3~4문장 정도의 종합 한 단락.

반드시 아래 JSON 형식만 출력하세요. 마크다운 백틱이나 설명 없이 JSON 한 객체만:
{
  "overall": "...",
  "strengths": ["..."],
  "cautions": ["..."],
  "firstDateIdeas": ["..."],
  "conversationStarters": ["..."]
}

[데이터]
`;

function parseCompatibility(raw: string): CompatibilitySummary {
  const cleaned = stripJsonFence(raw);
  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM compatibility output is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.overall !== "string") {
    throw new Error("missing string field: overall");
  }
  const arrayKeys = [
    "strengths",
    "cautions",
    "firstDateIdeas",
    "conversationStarters",
  ] as const;
  const result: CompatibilitySummary = {
    overall: obj.overall,
    strengths: [],
    cautions: [],
    firstDateIdeas: [],
    conversationStarters: [],
  };
  for (const k of arrayKeys) {
    const v = obj[k];
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
      throw new Error(`field ${k} must be string[]`);
    }
    result[k] = v;
  }
  return result;
}

export async function generateCompatibility(
  compactA: string,
  compactB: string,
  scoreBreakdown: {
    total: number;
    ilganHap: number;
    fiveElementBalance: number;
    tenGodSynergy: number;
    branchRelation: number;
    notes?: string[];
  },
): Promise<GenerateCompatibilityResult> {
  const client = getClient();
  const data = `[A의 사주]
${compactA}

[B의 사주]
${compactB}

[매칭 점수 ${scoreBreakdown.total}/100]
- 일간합: ${scoreBreakdown.ilganHap}
- 오행균형: ${scoreBreakdown.fiveElementBalance}
- 십신시너지: ${scoreBreakdown.tenGodSynergy}
- 지지관계: ${scoreBreakdown.branchRelation}
- 노트: ${(scoreBreakdown.notes ?? []).join(", ")}
`;
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: "user", content: `${COMPATIBILITY_PROMPT}${data}` }],
  });
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("LLM returned no text block");
  }
  const raw = block.text;
  return {
    summary: parseCompatibility(raw),
    rawResponse: raw,
    model: message.model,
    promptTokens: message.usage?.input_tokens ?? null,
    completionTokens: message.usage?.output_tokens ?? null,
  };
}

export type DailyFortuneScore = "great" | "good" | "normal" | "caution" | "bad";

export type DailyFortuneSections = {
  summary: string;
  love: string;
  work: string;
  health: string;
  luckyColor: string;
  luckyNumber: string;
};

export type GenerateDailyFortuneResult = {
  score: DailyFortuneScore;
  sections: DailyFortuneSections;
  rawResponse: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
};

const DAILY_FORTUNE_PROMPT = `당신은 한국 전통 사주명리에 정통한 친절한 일일 운세 풀이 전문가입니다.
아래는 사용자의 사주 압축 데이터와 오늘 날짜의 일진(日辰)입니다.
이 정보를 바탕으로 오늘 하루의 운세를 따뜻하게 풀어주세요.

규칙:
- 한국어 평어체. 운명론·단정 표현 금지, 가벼운 권유 톤.
- summary/love/work/health는 각 1~2문장.
- score는 다음 5단계 중 하나의 영문 키: "great" | "good" | "normal" | "caution" | "bad"
- luckyColor는 한국어 색상 단어 1개 (예: "파란색"), luckyNumber는 1~9 사이 숫자 문자열.

반드시 아래 JSON 형식만 출력하세요:
{
  "score": "good",
  "summary": "...",
  "love": "...",
  "work": "...",
  "health": "...",
  "luckyColor": "...",
  "luckyNumber": "..."
}

[데이터]
`;

const VALID_SCORES: ReadonlySet<DailyFortuneScore> = new Set([
  "great",
  "good",
  "normal",
  "caution",
  "bad",
]);

function parseDailyFortune(raw: string): {
  score: DailyFortuneScore;
  sections: DailyFortuneSections;
} {
  const cleaned = stripJsonFence(raw);
  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM daily-fortune output is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const score = obj.score;
  if (typeof score !== "string" || !VALID_SCORES.has(score as DailyFortuneScore)) {
    throw new Error(`invalid score field: ${String(score)}`);
  }
  const stringKeys: (keyof DailyFortuneSections)[] = [
    "summary",
    "love",
    "work",
    "health",
    "luckyColor",
    "luckyNumber",
  ];
  const sections = {} as DailyFortuneSections;
  for (const k of stringKeys) {
    const v = obj[k];
    if (typeof v !== "string") {
      throw new Error(`field ${k} must be string`);
    }
    sections[k] = v;
  }
  return { score: score as DailyFortuneScore, sections };
}

export async function generateDailyFortune(
  compactSaju: string,
  forDate: string,
  todayGanzhi: string | null,
): Promise<GenerateDailyFortuneResult> {
  const client = getClient();
  const data = `[사주]
${compactSaju}

[오늘 날짜] ${forDate}
[오늘 일진] ${todayGanzhi ?? "(미상)"}
`;
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: `${DAILY_FORTUNE_PROMPT}${data}` }],
  });
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("LLM returned no text block");
  }
  const raw = block.text;
  const { score, sections } = parseDailyFortune(raw);
  return {
    score,
    sections,
    rawResponse: raw,
    model: message.model,
    promptTokens: message.usage?.input_tokens ?? null,
    completionTokens: message.usage?.output_tokens ?? null,
  };
}
