import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  smashes: defineTable({
    word1: v.string(),
    word2: v.string(),
    category1: v.string(),
    category2: v.string(),
    smash: v.string(),
    clue1: v.string(),
    clue2: v.string(),
  }).index("by_smash", ["smash"]).index("by_category1", ["category1"]),

  daily_challenges: defineTable({
    date: v.string(),
    dailySmashes: v.array(v.id("smashes")),
  }).index("by_date", ["date"]),

  users: defineTable({
    name: v.string(),
    // this the Clerk ID, stored in the subject JWT field
    externalId: v.string(),
    challengeScores: v.record(v.id("daily_challenges"), v.number()),
}).index("byExternalId", ["externalId"]),
})
