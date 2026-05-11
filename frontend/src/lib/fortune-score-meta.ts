import type { FortuneScore } from "@/gql/graphql";

export type FortuneScoreMeta = {
  label: string;
  toneClass: string;
  ringClass: string;
};

export const FORTUNE_SCORE_META: Record<FortuneScore, FortuneScoreMeta> = {
  great: {
    label: "대길",
    toneClass: "text-jade-600",
    ringClass: "border-jade-600 bg-jade-50",
  },
  good: {
    label: "길",
    toneClass: "text-jade-600",
    ringClass: "border-jade-600/40 bg-jade-50/60",
  },
  normal: {
    label: "평",
    toneClass: "text-ink-700",
    ringClass: "border-ink-200 bg-hanji-50",
  },
  caution: {
    label: "주의",
    toneClass: "text-amber-600",
    ringClass: "border-amber-600/40 bg-amber-50",
  },
  bad: {
    label: "흉",
    toneClass: "text-crimson-600",
    ringClass: "border-crimson-600/40 bg-crimson-50",
  },
};
