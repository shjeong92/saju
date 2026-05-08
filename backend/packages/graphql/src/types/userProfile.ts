import { builder } from "../builder.ts";
import { GenderEnum } from "../enums.ts";

export const UserProfileType = builder.drizzleObject("userProfiles", {
  name: "UserProfile",
  fields: (t) => ({
    nickname: t.exposeString("nickname"),
    bio: t.exposeString("bio", { nullable: true }),
    interestedGender: t.expose("interestedGender", { type: GenderEnum }),
    ageRangeMin: t.exposeInt("ageRangeMin"),
    ageRangeMax: t.exposeInt("ageRangeMax"),
    isProfileComplete: t.exposeBoolean("isProfileComplete"),
  }),
});
