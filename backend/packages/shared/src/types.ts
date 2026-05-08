declare const brand: unique symbol;

export type Brand<T, K extends string> = T & { readonly [brand]: K };

export type UserId = Brand<string, "UserId">;
export type MatchId = Brand<string, "MatchId">;
export type ChatRoomId = Brand<string, "ChatRoomId">;
export type MessageId = Brand<string, "MessageId">;
export type PersonalReadingId = Brand<string, "PersonalReadingId">;
export type CompatibilityReportId = Brand<string, "CompatibilityReportId">;
export type DailyFortuneId = Brand<string, "DailyFortuneId">;

export const userId = (v: string): UserId => v as UserId;
export const matchId = (v: string): MatchId => v as MatchId;
export const chatRoomId = (v: string): ChatRoomId => v as ChatRoomId;
export const messageId = (v: string): MessageId => v as MessageId;
export const personalReadingId = (v: string): PersonalReadingId =>
  v as PersonalReadingId;
export const compatibilityReportId = (v: string): CompatibilityReportId =>
  v as CompatibilityReportId;
export const dailyFortuneId = (v: string): DailyFortuneId =>
  v as DailyFortuneId;

export type SajuChartJson = {
  fiveElements: Record<string, number>;
  tenGods: {
    year: { stem: string; branch: string };
    month: { stem: string; branch: string };
    day: { stem: string; branch: string };
    hour: { stem: string; branch: string };
  };
  sipsinCounts: Record<string, number>;
  relations: {
    stemRelations: Array<{
      type: string;
      pillars: [string, string];
      desc: string;
      stems: [string, string];
    }>;
    branchRelations: Record<string, Record<string, string>>;
  };
};
