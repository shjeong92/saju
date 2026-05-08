import { builder } from "./builder.ts";

export const GenderEnum = builder.enumType("Gender", {
  values: ["male", "female"] as const,
});

export const CalendarTypeEnum = builder.enumType("CalendarType", {
  values: ["solar", "lunar", "lunar_leap"] as const,
});

export const MatchStatusEnum = builder.enumType("MatchStatus", {
  values: ["suggested", "liked", "matched", "dismissed", "expired"] as const,
});

export const MessageTypeEnum = builder.enumType("MessageType", {
  values: ["user", "system"] as const,
});

export const GenerationStatusEnum = builder.enumType("GenerationStatus", {
  values: ["pending", "generating", "completed", "failed"] as const,
});

export const FortuneScoreEnum = builder.enumType("FortuneScore", {
  values: ["great", "good", "normal", "caution", "bad"] as const,
});

export const AuthProviderEnum = builder.enumType("AuthProvider", {
  values: ["google"] as const,
});
