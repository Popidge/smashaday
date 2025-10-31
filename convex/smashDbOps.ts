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

/**
 * Returns all rows from pendingSmashes with status="pending".
 * Return fields: word1, word2
 */
export const getPendingSmashes = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      word1: v.string(),
      word2: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const pendingSmashes = await ctx.db
      .query("pendingSmashes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return pendingSmashes.map((smash) => ({
      word1: smash.word1,
      word2: smash.word2,
    }));
  },
});

/**
 * Takes word string, queries wordsDB using by_word index.
 * Returns: word, category, clue, clueStatus. Return null if not found.
 */
export const getWordByWord = internalQuery({
  args: {
    word: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      word: v.string(),
      category: v.string(),
      clue: v.string(),
      clueStatus: v.union(
        v.literal("pending"),
        v.literal("enriched"),
        v.literal("fallback"),
        v.literal("failed"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const wordDoc = await ctx.db
      .query("wordsDb")
      .withIndex("by_word", (q) => q.eq("word", args.word))
      .unique();
    if (!wordDoc) {
      return null;
    }
    return {
      word: wordDoc.word,
      category: wordDoc.category,
      clue: wordDoc.clue,
      clueStatus: wordDoc.clueStatus,
    };
  },
});

/**
 * Takes word string, clue string, clueStatus enum ("enriched" | "fallback" | "failed").
 * Updates corresponding row in wordsDB.
 */
export const updateWordClue = internalMutation({
  args: {
    word: v.string(),
    clue: v.string(),
    clueStatus: v.union(
      v.literal("enriched"),
      v.literal("fallback"),
      v.literal("failed"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wordDoc = await ctx.db
      .query("wordsDb")
      .withIndex("by_word", (q) => q.eq("word", args.word))
      .unique();
    if (!wordDoc) {
      throw new Error(`Word "${args.word}" not found in wordsDB`);
    }
    await ctx.db.patch(wordDoc._id, {
      clue: args.clue,
      clueStatus: args.clueStatus,
    });
    return null;
  },
});

/**
 * Returns all rows from pendingSmashes table with full fields.
 */
export const getPendingSmashesAll = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("pendingSmashes"),
      _creationTime: v.number(),
      word1: v.string(),
      category1: v.string(),
      word2: v.string(),
      category2: v.string(),
      smash: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("compiled"),
        v.literal("failed")
      ),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("pendingSmashes").collect();
  },
});

/**
 * Queries smashes table for existing pair (order-agnostic).
 * Returns the smash document if found, null otherwise.
 */
export const getSmashByWordPair = internalQuery({
  args: {
    word1: v.string(),
    word2: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("smashes"),
      _creationTime: v.number(),
      word1: v.string(),
      word2: v.string(),
      category1: v.string(),
      category2: v.string(),
      smash: v.string(),
      clue1: v.string(),
      clue2: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    // Check both orders since pairs are order-agnostic
    const smash1 = await ctx.db
      .query("smashes")
      .filter((q) => q.eq(q.field("word1"), args.word1) && q.eq(q.field("word2"), args.word2))
      .unique();
    if (smash1) return smash1;

    const smash2 = await ctx.db
      .query("smashes")
      .filter((q) => q.eq(q.field("word1"), args.word2) && q.eq(q.field("word2"), args.word1))
      .unique();
    return smash2 || null;
  },
});

/**
 * Inserts a new smash document into the smashes table.
 */
export const insertSmash = internalMutation({
  args: {
    word1: v.string(),
    category1: v.string(),
    word2: v.string(),
    category2: v.string(),
    smash: v.string(),
    clue1: v.string(),
    clue2: v.string(),
  },
  returns: v.id("smashes"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("smashes", args);
  },
});

/**
 * Updates an existing smash document in the smashes table.
 */
export const updateSmash = internalMutation({
  args: {
    id: v.id("smashes"),
    word1: v.optional(v.string()),
    category1: v.optional(v.string()),
    word2: v.optional(v.string()),
    category2: v.optional(v.string()),
    smash: v.optional(v.string()),
    clue1: v.optional(v.string()),
    clue2: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return null;
  },
});

/**
 * Deletes a pending smash document from the pendingSmashes table.
 */
export const deletePendingSmash = internalMutation({
  args: {
    id: v.id("pendingSmashes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

/**
 * Queries smashes table for existing smash by smash string using by_smash index.
 * Returns the smash document if found, null otherwise.
 */
export const getSmashBySmash = internalQuery({
  args: {
    smash: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("smashes"),
      _creationTime: v.number(),
      word1: v.string(),
      word2: v.string(),
      category1: v.string(),
      category2: v.string(),
      smash: v.string(),
      clue1: v.string(),
      clue2: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smashes")
      .withIndex("by_smash", (q) => q.eq("smash", args.smash))
      .unique();
  },
});