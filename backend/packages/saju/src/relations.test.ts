import { describe, expect, test } from "bun:test";
import {
  branchRelationScore,
  getBranchRelation,
  getStemRelation,
  stemRelationScore,
} from "./relations.ts";

describe("getStemRelation", () => {
  test("천간 합 5쌍 모두 정상 룩업", () => {
    expect(getStemRelation("甲", "己")).toBe("hap");
    expect(getStemRelation("己", "甲")).toBe("hap");
    expect(getStemRelation("乙", "庚")).toBe("hap");
    expect(getStemRelation("丙", "辛")).toBe("hap");
    expect(getStemRelation("丁", "壬")).toBe("hap");
    expect(getStemRelation("戊", "癸")).toBe("hap");
  });

  test("천간 충 4쌍 모두 정상 룩업", () => {
    expect(getStemRelation("甲", "庚")).toBe("chung");
    expect(getStemRelation("庚", "甲")).toBe("chung");
    expect(getStemRelation("乙", "辛")).toBe("chung");
    expect(getStemRelation("丙", "壬")).toBe("chung");
    expect(getStemRelation("丁", "癸")).toBe("chung");
  });

  test("관계 없는 쌍은 null", () => {
    expect(getStemRelation("甲", "乙")).toBeNull();
    expect(getStemRelation("丙", "丁")).toBeNull();
    expect(getStemRelation("戊", "己")).toBeNull();
  });
});

describe("getBranchRelation", () => {
  test("육합 우선 룩업", () => {
    expect(getBranchRelation("子", "丑")).toBe("yukhap");
    expect(getBranchRelation("巳", "申")).toBe("yukhap");
    expect(getBranchRelation("午", "未")).toBe("yukhap");
  });

  test("삼합 멤버끼리는 banhap (페어 비교)", () => {
    expect(getBranchRelation("申", "辰")).toBe("banhap");
    expect(getBranchRelation("亥", "卯")).toBe("banhap");
    expect(getBranchRelation("寅", "午")).toBe("banhap");
  });

  test("방합", () => {
    expect(getBranchRelation("寅", "卯")).toBe("banghap");
    expect(getBranchRelation("申", "酉")).toBe("banghap");
  });

  test("충", () => {
    expect(getBranchRelation("子", "午")).toBe("chung");
    expect(getBranchRelation("卯", "酉")).toBe("chung");
  });

  test("형 (삼형 분해 + 자형)", () => {
    expect(getBranchRelation("寅", "巳")).toBe("hyung");
    expect(getBranchRelation("丑", "戌")).toBe("hyung");
    expect(getBranchRelation("辰", "辰")).toBe("hyung");
    expect(getBranchRelation("酉", "酉")).toBe("hyung");
  });

  test("파 / 해", () => {
    expect(getBranchRelation("子", "酉")).toBe("pa");
    expect(getBranchRelation("子", "未")).toBe("hae");
  });

  test("같은 지지(자형 외)는 null", () => {
    expect(getBranchRelation("子", "子")).toBeNull();
    expect(getBranchRelation("丑", "丑")).toBeNull();
  });
});

describe("관계 점수 단조성", () => {
  test("협력의 강도 순 yukhap > samhap > banhap > banghap", () => {
    expect(branchRelationScore("yukhap")).toBeGreaterThan(branchRelationScore("samhap"));
    expect(branchRelationScore("samhap")).toBeGreaterThan(branchRelationScore("banhap"));
    expect(branchRelationScore("banhap")).toBeGreaterThan(branchRelationScore("banghap"));
    expect(branchRelationScore("banghap")).toBeGreaterThan(0);
  });

  test("충돌의 강도 순 chung < hyung < pa < hae (음수, 절댓값 비교)", () => {
    expect(branchRelationScore("chung")).toBeLessThan(branchRelationScore("hyung"));
    expect(branchRelationScore("hyung")).toBeLessThan(branchRelationScore("pa"));
    expect(branchRelationScore("pa")).toBeLessThan(branchRelationScore("hae"));
    expect(branchRelationScore("hae")).toBeLessThan(0);
  });

  test("천간 합 = 양수, 충 = 음수, null = 0", () => {
    expect(stemRelationScore("hap")).toBeGreaterThan(0);
    expect(stemRelationScore("chung")).toBeLessThan(0);
    expect(stemRelationScore(null)).toBe(0);
  });
});
