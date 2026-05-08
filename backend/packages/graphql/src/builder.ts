import SchemaBuilder from "@pothos/core";
import DataloaderPlugin from "@pothos/plugin-dataloader";
import DrizzlePlugin from "@pothos/plugin-drizzle";
import ErrorsPlugin from "@pothos/plugin-errors";
import RelayPlugin from "@pothos/plugin-relay";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import type { Db } from "@saju/db";
import { relations as drizzleRelations } from "@saju/db/schema";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { GraphQLContext } from "./context.ts";

export type AuthScopes = {
  authenticated: boolean;
};

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  AuthScopes: AuthScopes;
  DrizzleRelations: typeof drizzleRelations;
  DefaultFieldNullability: false;
  DefaultInputFieldRequiredness: true;
  Scalars: {
    DateTime: { Input: Date; Output: Date };
    Date: { Input: string; Output: string };
    ID: { Input: string; Output: string };
  };
}>({
  plugins: [
    ScopeAuthPlugin,
    ErrorsPlugin,
    RelayPlugin,
    DataloaderPlugin,
    DrizzlePlugin,
  ],
  defaultFieldNullability: false,
  defaultInputFieldRequiredness: true,
  scopeAuth: {
    authScopes: (context) => ({
      authenticated: context.userId !== null,
    }),
  },
  errors: {
    defaultTypes: [],
  },
  relay: {},
  drizzle: {
    client: (ctx: GraphQLContext): Db => ctx.db,
    getTableConfig,
    relations: drizzleRelations,
  },
});
