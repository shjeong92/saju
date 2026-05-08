/**
 * 천간/지지 관계 룩업 테이블.
 * ssaju는 단일 사주 안의 관계만 계산하므로, 두 사람 사이 비교용 테이블이 별도로 필요.
 */

export const HEAVENLY_STEMS = [
  "甲",
  "乙",
  "丙",
  "丁",
  "戊",
  "己",
  "庚",
  "辛",
  "壬",
  "癸",
] as const;

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];

/** 천간 합화 오행: 甲己=토, 乙庚=금, 丙辛=수, 丁壬=목, 戊癸=화. */
export const STEM_HAP: Record<string, { partner: HeavenlyStem; element: string }> = {
  甲: { partner: "己", element: "토" },
  己: { partner: "甲", element: "토" },
  乙: { partner: "庚", element: "금" },
  庚: { partner: "乙", element: "금" },
  丙: { partner: "辛", element: "수" },
  辛: { partner: "丙", element: "수" },
  丁: { partner: "壬", element: "목" },
  壬: { partner: "丁", element: "목" },
  戊: { partner: "癸", element: "화" },
  癸: { partner: "戊", element: "화" },
};

/** 천간 충 (7번째 페어, 戊己 토충은 약해 제외). */
export const STEM_CHUNG: Record<string, HeavenlyStem> = {
  甲: "庚",
  庚: "甲",
  乙: "辛",
  辛: "乙",
  丙: "壬",
  壬: "丙",
  丁: "癸",
  癸: "丁",
};

export const EARTHLY_BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];

/** 지지 육합: 子丑·寅亥·卯戌·辰酉·巳申·午未. */
export const BRANCH_YUKHAP: Record<string, EarthlyBranch> = {
  子: "丑",
  丑: "子",
  寅: "亥",
  亥: "寅",
  卯: "戌",
  戌: "卯",
  辰: "酉",
  酉: "辰",
  巳: "申",
  申: "巳",
  午: "未",
  未: "午",
};

/** 지지 삼합: 申子辰=수, 亥卯未=목, 寅午戌=화, 巳酉丑=금. */
export const BRANCH_SAMHAP_GROUPS: ReadonlyArray<{
  members: ReadonlyArray<EarthlyBranch>;
  element: string;
}> = [
  { members: ["申", "子", "辰"], element: "수" },
  { members: ["亥", "卯", "未"], element: "목" },
  { members: ["寅", "午", "戌"], element: "화" },
  { members: ["巳", "酉", "丑"], element: "금" },
];

/** 지지 방합 (계절): 寅卯辰=동방목, 巳午未=남방화, 申酉戌=서방금, 亥子丑=북방수. */
export const BRANCH_BANGHAP_GROUPS: ReadonlyArray<{
  members: ReadonlyArray<EarthlyBranch>;
  element: string;
}> = [
  { members: ["寅", "卯", "辰"], element: "목" },
  { members: ["巳", "午", "未"], element: "화" },
  { members: ["申", "酉", "戌"], element: "금" },
  { members: ["亥", "子", "丑"], element: "수" },
];

/** 지지 충 (6번째 떨어진 페어). */
export const BRANCH_CHUNG: Record<string, EarthlyBranch> = {
  子: "午",
  午: "子",
  丑: "未",
  未: "丑",
  寅: "申",
  申: "寅",
  卯: "酉",
  酉: "卯",
  辰: "戌",
  戌: "辰",
  巳: "亥",
  亥: "巳",
};

/** 지지 형 페어 (寅巳申·丑戌未 삼형 분해 + 子卯 상형 + 자형). */
export const BRANCH_HYUNG: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ["寅", "巳"],
  ["巳", "申"],
  ["寅", "申"],
  ["丑", "戌"],
  ["戌", "未"],
  ["丑", "未"],
  ["子", "卯"],
  ["辰", "辰"],
  ["午", "午"],
  ["酉", "酉"],
  ["亥", "亥"],
];

/** 지지 파. */
export const BRANCH_PA: Record<string, EarthlyBranch> = {
  子: "酉",
  酉: "子",
  丑: "辰",
  辰: "丑",
  寅: "亥",
  亥: "寅",
  卯: "午",
  午: "卯",
  巳: "申",
  申: "巳",
  戌: "未",
  未: "戌",
};

/** 지지 해 (원진 계열). */
export const BRANCH_HAE: Record<string, EarthlyBranch> = {
  子: "未",
  未: "子",
  丑: "午",
  午: "丑",
  寅: "巳",
  巳: "寅",
  卯: "辰",
  辰: "卯",
  申: "亥",
  亥: "申",
  酉: "戌",
  戌: "酉",
};

export type StemRelationKind = "hap" | "chung" | null;
export type BranchRelationKind =
  | "yukhap"
  | "samhap"
  | "banhap"
  | "banghap"
  | "chung"
  | "hyung"
  | "pa"
  | "hae"
  | null;

export function getStemRelation(a: string, b: string): StemRelationKind {
  if (STEM_HAP[a]?.partner === b) return "hap";
  if (STEM_CHUNG[a] === b) return "chung";
  return null;
}

export function getBranchRelation(a: string, b: string): BranchRelationKind {
  if (a === b) {
    if (a === "辰" || a === "午" || a === "酉" || a === "亥") return "hyung";
    return null;
  }
  if (BRANCH_YUKHAP[a] === b) return "yukhap";

  for (const group of BRANCH_SAMHAP_GROUPS) {
    const ai = group.members.indexOf(a as EarthlyBranch);
    const bi = group.members.indexOf(b as EarthlyBranch);
    if (ai >= 0 && bi >= 0) return "banhap";
  }

  for (const group of BRANCH_BANGHAP_GROUPS) {
    if (
      group.members.includes(a as EarthlyBranch) &&
      group.members.includes(b as EarthlyBranch)
    ) {
      return "banghap";
    }
  }

  if (BRANCH_CHUNG[a] === b) return "chung";

  for (const [x, y] of BRANCH_HYUNG) {
    if ((x === a && y === b) || (x === b && y === a)) return "hyung";
  }

  if (BRANCH_PA[a] === b) return "pa";
  if (BRANCH_HAE[a] === b) return "hae";

  return null;
}

/** 천간 관계 점수 (-1 ~ +1). 일간 비교에 사용. */
export function stemRelationScore(kind: StemRelationKind): number {
  switch (kind) {
    case "hap":
      return 1.0;
    case "chung":
      return -0.7;
    default:
      return 0;
  }
}

/**
 * 지지 관계 점수 (-1 ~ +1).
 * 협력: yukhap > samhap > banhap > banghap. 충돌: chung > hyung > pa > hae.
 */
export function branchRelationScore(kind: BranchRelationKind): number {
  switch (kind) {
    case "yukhap":
      return 1.0;
    case "samhap":
      return 0.9;
    case "banhap":
      return 0.7;
    case "banghap":
      return 0.5;
    case "chung":
      return -0.9;
    case "hyung":
      return -0.7;
    case "pa":
      return -0.5;
    case "hae":
      return -0.4;
    default:
      return 0;
  }
}
