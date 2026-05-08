import type { Db } from "@saju/db";

export type Loaders = Record<string, never>;

export function createLoaders(_db: Db): Loaders {
  return {};
}
