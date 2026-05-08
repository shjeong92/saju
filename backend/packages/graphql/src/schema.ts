import { builder } from "./builder.ts";

builder.queryType({
  fields: (t) => ({
    ping: t.string({
      resolve: () => "pong",
    }),
  }),
});

export const schema = builder.toSchema();
