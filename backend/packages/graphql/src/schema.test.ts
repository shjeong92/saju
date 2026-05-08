import { describe, expect, test } from "bun:test";
import { execute, parse } from "graphql";
import { schema } from "./schema.ts";

describe("GraphQL schema", () => {
  test("introspection: 신규 매칭 타입들이 모두 등록됨", () => {
    const typeMap = schema.getTypeMap();
    for (const name of [
      "Match",
      "ScoreBreakdown",
      "CompatibilityReport",
      "CompatibilitySummary",
      "ChatRoom",
    ]) {
      expect(typeMap[name]).toBeDefined();
    }
  });

  test("Match 타입의 partner/iLiked/theyLiked 필드 존재", () => {
    const matchType = schema.getType("Match") as { getFields: () => Record<string, unknown> };
    const fields = matchType.getFields();
    for (const f of ["id", "score", "breakdown", "status", "partner", "iLiked", "theyLiked"]) {
      expect(fields[f]).toBeDefined();
    }
  });

  test("Query.matches/match, Mutation.likeMatch/dismissMatch 리졸버 등록", () => {
    const query = schema.getQueryType();
    const mutation = schema.getMutationType();
    expect(query?.getFields().matches).toBeDefined();
    expect(query?.getFields().match).toBeDefined();
    expect(mutation?.getFields().likeMatch).toBeDefined();
    expect(mutation?.getFields().dismissMatch).toBeDefined();
  });

  test("execute: ping 쿼리 정상 동작 (가장 단순한 e2e)", async () => {
    const result = await execute({
      schema,
      document: parse(`{ ping }`),
      contextValue: {
        db: {} as unknown,
        userId: null,
        loaders: {} as unknown,
        enqueueProfileReading: async () => {},
        enqueueMatchCurate: async () => {},
        enqueueDailyFortune: async () => {},
      },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ ping: "pong" });
  });

  test("execute: 미인증 me 쿼리는 scope-auth가 차단", async () => {
    const result = await execute({
      schema,
      document: parse(`{ me { id } }`),
      contextValue: {
        db: {} as unknown,
        userId: null,
        loaders: {} as unknown,
        enqueueProfileReading: async () => {},
        enqueueMatchCurate: async () => {},
        enqueueDailyFortune: async () => {},
      },
    });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toMatch(/Not authorized|denied|authent/i);
  });
});
