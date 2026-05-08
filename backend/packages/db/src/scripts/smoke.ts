import { eq } from "drizzle-orm";
import { createDb } from "../client.ts";
import { sajuInputs, userProfiles, users } from "../schema/users.ts";

const db = createDb();

const [created] = await db
  .insert(users)
  .values({
    provider: "google",
    providerId: "smoke-test-1",
    name: "smoke",
    email: "smoke@example.com",
  })
  .onConflictDoUpdate({
    target: [users.provider, users.providerId],
    set: { name: "smoke" },
  })
  .returning();

if (!created) throw new Error("user upsert failed");
console.log("user upsert ok:", created.id, created.name);

await db
  .insert(sajuInputs)
  .values({
    userId: created.id,
    birthDate: "1990-05-15",
    birthTime: "14:30",
    calendarType: "solar",
    gender: "male",
  })
  .onConflictDoNothing();
console.log("saju_inputs upsert ok");

await db
  .insert(userProfiles)
  .values({
    userId: created.id,
    nickname: `smoke-${Date.now()}`,
    interestedGender: "female",
    ageRangeMin: 20,
    ageRangeMax: 40,
  })
  .onConflictDoNothing();
console.log("user_profiles upsert ok");

const found = await db.query.users.findFirst({
  where: eq(users.id, created.id),
});
console.log("read back ok:", found?.email);

await db.delete(users).where(eq(users.id, created.id));
console.log("cleanup ok");

process.exit(0);
