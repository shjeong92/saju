import { builder } from "./builder.ts";

import "./scalars.ts";
import "./enums.ts";
import "./types/user.ts";
import "./types/userProfile.ts";
import "./types/sajuChart.ts";
import "./types/personalReading.ts";
import "./types/dailyFortune.ts";
import "./types/loadableUser.ts";
import "./resolvers/query.ts";
import "./resolvers/mutation.ts";

export const schema = builder.toSchema();
