import { calculateSaju, type SajuResult } from "ssaju";

export type { SajuResult } from "ssaju";
export * from "./relations.ts";
export * from "./tenGods.ts";
export * from "./compatibility.ts";

export type ComputeSajuInput = {
  birthDate: string;
  birthTime: string | null;
  calendarType: "solar" | "lunar" | "lunar_leap";
  gender: "male" | "female";
};

type FiveElements = Record<"목" | "화" | "토" | "금" | "수", number>;

type TenGodsRow = { stem: string; branch: string };

type TenGods = {
  year: TenGodsRow;
  month: TenGodsRow;
  day: TenGodsRow;
  hour: TenGodsRow;
};

type SipsinCounts = Record<string, number>;

type SajuRelationsJson = {
  stemRelations: Array<{
    type: string;
    pillars: [string, string];
    desc: string;
    stems: [string, string];
  }>;
  branchRelations: {
    지장간: Record<string, string>;
    방합: Record<string, string>;
    삼합: Record<string, string>;
    반합: Record<string, string>;
    육합: Record<string, string>;
    충: Record<string, string>;
    형: Record<string, string>;
    파: Record<string, string>;
    해: Record<string, string>;
    원진: Record<string, string>;
    귀문: Record<string, string>;
  };
};

export type SajuChartFields = {
  yearStem: string;
  yearBranch: string;
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem: string | null;
  hourBranch: string | null;
  dayMaster: string;
  fiveElements: FiveElements;
  tenGods: TenGods;
  sipsinCounts: SipsinCounts;
  relations: SajuRelationsJson;
  rawChart: Record<string, unknown>;
  compactReading: string;
};

const ZERO_FIVE: FiveElements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

function splitGanzhi(ganzhi: string): { stem: string; branch: string } {
  const chars = Array.from(ganzhi);
  return {
    stem: chars[0] ?? "",
    branch: chars[1] ?? "",
  };
}

function normalizeFiveElements(input: Record<string, number>): FiveElements {
  const out: FiveElements = { ...ZERO_FIVE };
  for (const k of Object.keys(input) as (keyof FiveElements)[]) {
    if (k in out) {
      out[k] = input[k] ?? 0;
    }
  }
  return out;
}

function countSipsin(tenGods: SajuResult["tenGods"]): SipsinCounts {
  const counts: SipsinCounts = {};
  const slots = [tenGods.year, tenGods.month, tenGods.day, tenGods.hour];
  for (const slot of slots) {
    for (const v of [slot.stem, slot.branch]) {
      if (!v) continue;
      counts[v] = (counts[v] ?? 0) + 1;
    }
  }
  return counts;
}

function flattenBranchRelations(
  branchRelations: SajuResult["branchRelations"],
): SajuRelationsJson["branchRelations"] {
  const flatten = (
    rec: Partial<Record<string, string>> | undefined,
  ): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!rec) return out;
    for (const [k, v] of Object.entries(rec)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  };
  return {
    지장간: flatten(branchRelations.지장간),
    방합: flatten(branchRelations.방합),
    삼합: flatten(branchRelations.삼합),
    반합: flatten(branchRelations.반합),
    육합: flatten(branchRelations.육합),
    충: flatten(branchRelations.충),
    형: flatten(branchRelations.형),
    파: flatten(branchRelations.파),
    해: flatten(branchRelations.해),
    원진: flatten(branchRelations.원진),
    귀문: flatten(branchRelations.귀문),
  };
}

export function computeSajuChart(input: ComputeSajuInput): SajuChartFields {
  const [yearStr = "", monthStr = "", dayStr = ""] = input.birthDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  let hour = 12;
  let minute = 0;
  if (input.birthTime) {
    const [hh = "12", mm = "0"] = input.birthTime.split(":");
    hour = Number(hh);
    minute = Number(mm);
  }

  const result = calculateSaju({
    year,
    month,
    day,
    hour,
    minute,
    gender: input.gender === "male" ? "남" : "여",
    calendar: input.calendarType === "solar" ? "solar" : "lunar",
    leap: input.calendarType === "lunar_leap",
    timezone: "Asia/Seoul",
  });

  const yp = splitGanzhi(result.pillars.year);
  const mp = splitGanzhi(result.pillars.month);
  const dp = splitGanzhi(result.pillars.day);
  const hp = result.pillars.hour ? splitGanzhi(result.pillars.hour) : null;

  return {
    yearStem: yp.stem,
    yearBranch: yp.branch,
    monthStem: mp.stem,
    monthBranch: mp.branch,
    dayStem: dp.stem,
    dayBranch: dp.branch,
    hourStem: hp?.stem ?? null,
    hourBranch: hp?.branch ?? null,
    dayMaster: result.dayStem,
    fiveElements: normalizeFiveElements(result.fiveElements),
    tenGods: result.tenGods,
    sipsinCounts: countSipsin(result.tenGods),
    relations: {
      stemRelations: result.stemRelations.map((r) => ({
        type: r.type,
        pillars: r.pillars,
        desc: r.desc,
        stems: r.stems,
      })),
      branchRelations: flattenBranchRelations(result.branchRelations),
    },
    rawChart: result as unknown as Record<string, unknown>,
    compactReading: result.toCompact(),
  };
}

export type ComputeTodayGanzhiInput = ComputeSajuInput & { forDate: string };

export function computeTodayGanzhi(input: ComputeTodayGanzhiInput): string | null {
  const [yStr = "", mStr = "", dStr = ""] = input.birthDate.split("-");
  const [hh = "12", mm = "0"] = (input.birthTime ?? "12:00").split(":");
  const now = new Date(`${input.forDate}T12:00:00+09:00`);
  if (Number.isNaN(now.getTime())) return null;

  const result = calculateSaju({
    year: Number(yStr),
    month: Number(mStr),
    day: Number(dStr),
    hour: Number(hh),
    minute: Number(mm),
    gender: input.gender === "male" ? "남" : "여",
    calendar: input.calendarType === "solar" ? "solar" : "lunar",
    leap: input.calendarType === "lunar_leap",
    timezone: "Asia/Seoul",
    now,
  });

  return result.reference?.codes?.today ?? null;
}
