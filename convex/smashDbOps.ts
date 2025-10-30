import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all words from wordsDB, sorted by _creationTime descending (newest first).
 * Return fields: word, category, _creationTime
 */
export const getAllWords = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      word: v.string(),
      category: v.string(),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const words = await ctx.db
      .query("wordsDb")
      .order("desc")
      .collect();
    return words.map((w) => ({
      word: w.word,
      category: w.category,
      _creationTime: w._creationTime,
    }));
  },
});

/**
 * Returns set of all existing smash pairs from smashes and pendingSmashes tables.
 * Format as Set<"word1|word2"> for O(1) lookup (order-agnostic: "batman|manchester" === "manchester|batman")
 */
export const getExistingSmashPairs = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const pairs = new Set<string>();

    // Add pairs from smashes table
    const smashes = await ctx.db.query("smashes").collect();
    for (const smash of smashes) {
      const pair = [smash.word1, smash.word2].sort().join("|");
      pairs.add(pair);
    }

    // Add pairs from pendingSmashes table (all statuses)
    const pendingSmashes = await ctx.db.query("pendingSmashes").collect();
    for (const pendingSmash of pendingSmashes) {
      const pair = [pendingSmash.word1, pendingSmash.word2].sort().join("|");
      pairs.add(pair);
    }

    return Array.from(pairs);
  },
});

/**
 * Takes array of smash objects {word1, category1, word2, category2, smash},
 * writes all to pendingSmashes table with status="pending"
 */
export const writePendingSmashes = internalMutation({
  args: {
    smashes: v.array(
      v.object({
        word1: v.string(),
        category1: v.string(),
        word2: v.string(),
        category2: v.string(),
        smash: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const smash of args.smashes) {
      await ctx.db.insert("pendingSmashes", {
        ...smash,
        status: "pending",
      });
    }
    return null;
  },
});