import { describe, expect, test } from "bun:test";
import { type CompatibilityInput, computeCompatibility } from "./compatibility.ts";

const A: CompatibilityInput = {
  dayStem: "辛",
  dayBranch: "亥",
  monthBranch: "巳",
  fiveElements: { 목: 2, 화: 1, 토: 1, 금: 2, 수: 2 },
};

const B: CompatibilityInput = {
  dayStem: "甲",
  dayBranch: "申",
  monthBranch: "申",
  fiveElements: { 목: 1, 화: 3, 토: 1, 금: 2, 수: 1 },
};

describe("computeCompatibility — 실제 ssaju 결과 기반", () => {
  test("辛-甲 페어: 십신은 정재+정관(부부궁합), 일지 해, 월지 육합", () => {
    const result = computeCompatibility(A, B);

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);

    expect(result.breakdown.tenGodSynergy).toBeGreaterThan(20);
    expect(result.breakdown.notes).toContain("A→B:정재 / B→A:정관");

    expect(result.breakdown.notes.some((n) => n.includes("월지yukhap"))).toBe(true);
    expect(result.breakdown.notes.some((n) => n.includes("일지hae"))).toBe(true);
  });

  test("점수는 4요소 합과 일치 (반올림 오차 ±1점)", () => {
    const r = computeCompatibility(A, B);
    const sum =
      r.breakdown.ilganHap +
      r.breakdown.fiveElementBalance +
      r.breakdown.tenGodSynergy +
      r.breakdown.branchRelation;
    expect(Math.abs(r.total - sum)).toBeLessThanOrEqual(1);
  });
});

describe("computeCompatibility — 합성 케이스로 단조성 검증", () => {
  test("이상적 궁합: 일간합 + 일지육합 + 월지삼합 + 오행균형", () => {
    const ideal = computeCompatibility(
      {
        dayStem: "甲",
        dayBranch: "子",
        monthBranch: "申",
        fiveElements: { 목: 2, 화: 0, 토: 1, 금: 2, 수: 1 },
      },
      {
        dayStem: "己",
        dayBranch: "丑",
        monthBranch: "辰",
        fiveElements: { 목: 0, 화: 2, 토: 2, 금: 0, 수: 1 },
      },
    );
    expect(ideal.total).toBeGreaterThan(70);
    expect(ideal.breakdown.notes).toContain("일간합(甲己)");
  });

  test("최악 궁합: 일간충 + 일지충 + 월지충 + 오행 편중", () => {
    const worst = computeCompatibility(
      {
        dayStem: "甲",
        dayBranch: "子",
        monthBranch: "卯",
        fiveElements: { 목: 6, 화: 0, 토: 0, 금: 0, 수: 2 },
      },
      {
        dayStem: "庚",
        dayBranch: "午",
        monthBranch: "酉",
        fiveElements: { 목: 0, 화: 0, 토: 0, 금: 6, 수: 0 },
      },
    );
    expect(worst.total).toBeLessThan(40);
    expect(worst.breakdown.notes).toContain("일간충(甲庚)");
    expect(worst.breakdown.notes.some((n) => n.includes("일지chung"))).toBe(true);
  });

  test("좋은 궁합 > 평이한 궁합 > 나쁜 궁합 (단조성)", () => {
    const good = computeCompatibility(
      {
        dayStem: "甲",
        dayBranch: "子",
        monthBranch: "申",
        fiveElements: { 목: 2, 화: 1, 토: 1, 금: 2, 수: 2 },
      },
      {
        dayStem: "己",
        dayBranch: "丑",
        monthBranch: "辰",
        fiveElements: { 목: 1, 화: 2, 토: 2, 금: 1, 수: 2 },
      },
    );

    const neutral = computeCompatibility(A, B);

    const bad = computeCompatibility(
      {
        dayStem: "甲",
        dayBranch: "子",
        monthBranch: "卯",
        fiveElements: { 목: 6, 화: 0, 토: 0, 금: 0, 수: 2 },
      },
      {
        dayStem: "庚",
        dayBranch: "午",
        monthBranch: "酉",
        fiveElements: { 목: 0, 화: 0, 토: 0, 금: 6, 수: 0 },
      },
    );

    expect(good.total).toBeGreaterThan(neutral.total);
    expect(neutral.total).toBeGreaterThan(bad.total);
  });
});
