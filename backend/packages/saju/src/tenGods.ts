/**
 * 십신(十神) 매핑.
 * 일간(나) 기준으로 다른 천간이 어떤 관계 역할을 갖는지 결정한다.
 * 매칭에서는 A의 일간 입장에서 B의 일간이 어떤 십신인지(또 그 반대)가 핵심.
 */

import type { HeavenlyStem } from "./relations.ts";

/** 천간 → (오행, 음양). 음양: + 양, - 음. */
const STEM_META: Record<HeavenlyStem, { element: Element; yang: boolean }> = {
  甲: { element: "목", yang: true },
  乙: { element: "목", yang: false },
  丙: { element: "화", yang: true },
  丁: { element: "화", yang: false },
  戊: { element: "토", yang: true },
  己: { element: "토", yang: false },
  庚: { element: "금", yang: true },
  辛: { element: "금", yang: false },
  壬: { element: "수", yang: true },
  癸: { element: "수", yang: false },
};

export type Element = "목" | "화" | "토" | "금" | "수";

/** 오행 상생: 木→火→土→金→水→木. */
const GENERATES: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

/** 오행 상극: 木→土→水→火→金→木. */
const OVERCOMES: Record<Element, Element> = {
  목: "토",
  토: "수",
  수: "화",
  화: "금",
  금: "목",
};

export type TenGod =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인";

/**
 * 일간(self) 입장에서 상대 천간(other)이 어떤 십신인지 반환.
 *  - 같은 오행: 음양 같으면 비견, 다르면 겁재
 *  - self가 생하는 오행: 음양 같으면 식신, 다르면 상관
 *  - self가 극하는 오행: 음양 같으면 편재, 다르면 정재
 *  - self를 극하는 오행: 음양 같으면 편관, 다르면 정관
 *  - self를 생하는 오행: 음양 같으면 편인, 다르면 정인
 */
export function tenGodOf(self: HeavenlyStem, other: HeavenlyStem): TenGod {
  const s = STEM_META[self];
  const o = STEM_META[other];
  const sameYang = s.yang === o.yang;

  if (s.element === o.element) return sameYang ? "비견" : "겁재";
  if (GENERATES[s.element] === o.element) return sameYang ? "식신" : "상관";
  if (OVERCOMES[s.element] === o.element) return sameYang ? "편재" : "정재";
  if (OVERCOMES[o.element] === s.element) return sameYang ? "편관" : "정관";
  if (GENERATES[o.element] === s.element) return sameYang ? "편인" : "정인";
  throw new Error(`tenGodOf: unreachable ${self} vs ${other}`);
}

/**
 * 십신 시너지 점수 (-1 ~ +1).
 * 매칭에서 A의 일간 입장 + B의 일간 입장 양방향을 평균낸다.
 *
 * 가중치 근거 (명리학 부부/연애 궁합 통설):
 *  - 정재·정관: 정통 배우자 십신, 가장 안정적인 결합 신호
 *  - 편재·편관: 강한 끌림이지만 변동성도 큼
 *  - 정인·식신: 정서적 안정·돌봄
 *  - 편인·상관: 자극적·도전적, 중간값
 *  - 비견·겁재: 친구·동료 성향, 연애로는 평이
 */
const TEN_GOD_SCORE: Record<TenGod, number> = {
  정재: 0.9,
  정관: 0.9,
  편재: 0.6,
  편관: 0.6,
  정인: 0.7,
  식신: 0.7,
  편인: 0.3,
  상관: 0.3,
  비견: 0.0,
  겁재: -0.1,
};

export function tenGodScore(g: TenGod): number {
  return TEN_GOD_SCORE[g];
}

/**
 * 양방향 십신 점수: A→B, B→A 평균.
 * (자기 입장에서 보는 상대의 역할이 한쪽만 좋으면 균형이 안 맞으므로 평균)
 */
export function bidirectionalTenGodScore(
  selfA: HeavenlyStem,
  selfB: HeavenlyStem,
): { aToB: TenGod; bToA: TenGod; score: number } {
  const aToB = tenGodOf(selfA, selfB);
  const bToA = tenGodOf(selfB, selfA);
  const score = (tenGodScore(aToB) + tenGodScore(bToA)) / 2;
  return { aToB, bToA, score };
}
