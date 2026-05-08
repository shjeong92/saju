import { describe, expect, test } from "bun:test";
import { bidirectionalTenGodScore, tenGodOf } from "./tenGods.ts";

describe("tenGodOf", () => {
  test("같은 천간 → 비견 (오행·음양 모두 같음)", () => {
    expect(tenGodOf("甲", "甲")).toBe("비견");
    expect(tenGodOf("辛", "辛")).toBe("비견");
  });

  test("같은 오행 다른 음양 → 겁재", () => {
    expect(tenGodOf("甲", "乙")).toBe("겁재");
    expect(tenGodOf("庚", "辛")).toBe("겁재");
  });

  test("내가 생하는 오행 → 식신/상관", () => {
    expect(tenGodOf("甲", "丙")).toBe("식신");
    expect(tenGodOf("甲", "丁")).toBe("상관");
  });

  test("내가 극하는 오행 → 편재/정재", () => {
    expect(tenGodOf("甲", "戊")).toBe("편재");
    expect(tenGodOf("甲", "己")).toBe("정재");
  });

  test("나를 극하는 오행 → 편관/정관", () => {
    expect(tenGodOf("甲", "庚")).toBe("편관");
    expect(tenGodOf("甲", "辛")).toBe("정관");
  });

  test("나를 생하는 오행 → 편인/정인", () => {
    expect(tenGodOf("甲", "壬")).toBe("편인");
    expect(tenGodOf("甲", "癸")).toBe("정인");
  });
});

describe("bidirectionalTenGodScore", () => {
  test("辛(금-) ↔ 甲(목+) = 정재 + 정관 (정통 부부 궁합)", () => {
    const r = bidirectionalTenGodScore("辛", "甲");
    expect(r.aToB).toBe("정재");
    expect(r.bToA).toBe("정관");
    expect(r.score).toBeCloseTo(0.9, 5);
  });

  test("甲↔甲 (같은 천간) = 비견+비견, 점수 0", () => {
    const r = bidirectionalTenGodScore("甲", "甲");
    expect(r.score).toBe(0);
  });

  test("甲↔庚 (충 페어): 편관 + 편재 비대칭 끌림 구조", () => {
    const r = bidirectionalTenGodScore("甲", "庚");
    expect(r.aToB).toBe("편관");
    expect(r.bToA).toBe("편재");
    expect(r.score).toBeCloseTo(0.6, 5);
  });
});
