/**
 * 사주 매칭 점수 산출 (100점 만점).
 *
 * 4요소 각 25점:
 *  1) ilganHap          — 두 일간의 천간 합/충
 *  2) fiveElementBalance — 두 사주의 오행 분포 보완성
 *  3) tenGodSynergy     — 일간 양방향 십신 (정관·정재 등)
 *  4) branchRelation    — 일지·월지 지지 관계 (일지 70%, 월지 30%)
 */

import { branchRelationScore, getBranchRelation, getStemRelation, stemRelationScore } from "./relations.ts";
import { type Element, bidirectionalTenGodScore } from "./tenGods.ts";
import type { HeavenlyStem } from "./relations.ts";

export type CompatibilityInput = {
  dayStem: HeavenlyStem;
  dayBranch: string;
  monthBranch: string;
  fiveElements: Record<Element, number>;
};

export type CompatibilityResult = {
  total: number;
  breakdown: {
    ilganHap: number;
    fiveElementBalance: number;
    tenGodSynergy: number;
    branchRelation: number;
    notes: string[];
  };
};

const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];

/** -1~+1 점수를 0~maxPoints로 선형 변환. */
function toPoints(rawScore: number, maxPoints: number): number {
  const clamped = Math.max(-1, Math.min(1, rawScore));
  return ((clamped + 1) / 2) * maxPoints;
}

/**
 * 오행 균형 점수.
 * 두 사람의 오행 합이 균등할수록 점수↑ (한쪽이 부족한 걸 상대가 채울수록 좋음).
 * 표준편차를 0(최적)~기준치(최악)로 보고 25점에서 차감.
 */
function fiveElementBalanceScore(
  a: Record<Element, number>,
  b: Record<Element, number>,
): { points: number; combined: Record<Element, number> } {
  const combined: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  let total = 0;
  for (const e of ELEMENTS) {
    combined[e] = (a[e] ?? 0) + (b[e] ?? 0);
    total += combined[e];
  }
  if (total === 0) return { points: 12.5, combined };

  const ratios = ELEMENTS.map((e) => combined[e] / total);
  const mean = 1 / 5;
  const variance = ratios.reduce((sum, r) => sum + (r - mean) ** 2, 0) / 5;
  const stddev = Math.sqrt(variance);

  const maxStddev = Math.sqrt(((1 - mean) ** 2 + 4 * mean ** 2) / 5);
  const balance = 1 - stddev / maxStddev;

  return { points: balance * 25, combined };
}

export function computeCompatibility(
  a: CompatibilityInput,
  b: CompatibilityInput,
): CompatibilityResult {
  const notes: string[] = [];

  const stemRel = getStemRelation(a.dayStem, b.dayStem);
  const ilganHap = toPoints(stemRelationScore(stemRel), 25);
  if (stemRel === "hap") notes.push(`일간합(${a.dayStem}${b.dayStem})`);
  else if (stemRel === "chung") notes.push(`일간충(${a.dayStem}${b.dayStem})`);

  const { points: fiveElementBalance } = fiveElementBalanceScore(
    a.fiveElements,
    b.fiveElements,
  );

  const synergy = bidirectionalTenGodScore(a.dayStem, b.dayStem);
  const tenGodSynergy = toPoints(synergy.score, 25);
  notes.push(`A→B:${synergy.aToB} / B→A:${synergy.bToA}`);

  const dayBranchRel = getBranchRelation(a.dayBranch, b.dayBranch);
  const monthBranchRel = getBranchRelation(a.monthBranch, b.monthBranch);
  const dayPart = branchRelationScore(dayBranchRel);
  const monthPart = branchRelationScore(monthBranchRel);
  const branchRelation = toPoints(dayPart * 0.7 + monthPart * 0.3, 25);
  if (dayBranchRel) notes.push(`일지${dayBranchRel}(${a.dayBranch}${b.dayBranch})`);
  if (monthBranchRel) notes.push(`월지${monthBranchRel}(${a.monthBranch}${b.monthBranch})`);

  const total = Math.round(ilganHap + fiveElementBalance + tenGodSynergy + branchRelation);

  return {
    total,
    breakdown: {
      ilganHap: Math.round(ilganHap * 10) / 10,
      fiveElementBalance: Math.round(fiveElementBalance * 10) / 10,
      tenGodSynergy: Math.round(tenGodSynergy * 10) / 10,
      branchRelation: Math.round(branchRelation * 10) / 10,
      notes,
    },
  };
}
