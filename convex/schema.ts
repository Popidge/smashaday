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
  })
  .index("by_smash", ["smash"])
  .index("by_category1", ["category1"])
  .index("by_category2", ["category2"])
  .index("by_word1", ["word1"])
  .index("by_word2", ["word2"]),

  daily_challenges: defineTable({
    date: v.string(),
    dailySmashes: v.array(v.id("smashes")),
  }).index("by_date", ["date"]),

  users: defineTable({
    name: v.string(),
    // this the Clerk ID, stored in the subject JWT field
    externalId: v.string(),
    // TODO - Remove after PR #10 is merged and migrations run in prod
    challengeScores: v.optional(v.record(v.id("daily_challenges"), v.number())),
  }).index("byExternalId", ["externalId"]),

  categories: defineTable({
    category: v.string(),
    words: v.number()
  }).index("by_category", ["category"]),

  wordsDb: defineTable({
    word: v.string(),
    category: v.string(),
    clue: v.string(),
    clueStatus: v.union(
      v.literal("pending"),
      v.literal("enriched"),
      v.literal("fallback"),
      v.literal("failed")
    ),
  })
  .index("by_word", ["word"])
  .index("by_clueStatus", ["clueStatus"])
  .index("by_category_clueStatus", ["category", "clueStatus"])
  .index("by_category", ["category"]),

  pendingSmashes: defineTable({
    word1: v.string(),
    category1: v.string(),
    word2: v.string(),
    category2: v.string(),
    smash: v.string(),
    clue1: v.optional(v.string()),
    clue2: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("compiled"),
      v.literal("failed")
    )
  }).index("by_status", ["status"]),

  user_scores: defineTable({
  userId: v.id("users"),
  challengeId: v.id("daily_challenges"),
  score: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_challenge", ["challengeId"])
    //TODO - add { unique: true } to below index once migrations from PR #10 have been run
    .index("by_user_challenge", ["userId", "challengeId"])

})
