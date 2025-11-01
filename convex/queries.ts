import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getDailyChallengeByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("daily_challenges")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
  },
});

export const getSmashById = query({
  args: { id: v.id("smashes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getChallengeNumber = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const challenges = await ctx.db
      .query("daily_challenges")
      .order("asc")
      .collect();
    const index = challenges.findIndex(c => c.date === args.date);
    return index + 1; // 1-based numbering
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getUniqueCategories = internalQuery({
  args: {},
  returns: v.object({
    category1: v.array(v.string()),
    category2: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const smashes = await ctx.db.query("smashes").collect();
    const category1Set = new Set<string>();
    const category2Set = new Set<string>();
    for (const smash of smashes) {
      category1Set.add(smash.category1);
      category2Set.add(smash.category2);
    }
    return {
      category1: Array.from(category1Set).sort(),
      category2: Array.from(category2Set).sort(),
    };
  },
});

export const getAllCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    return categories.map(cat => cat.category).sort();
  },
});

export const getDailyChallenges = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    challenges: v.array(v.object({
      id: v.id("daily_challenges"),
      date: v.string(),
      challengeId: v.id("daily_challenges"),
    })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 10, 10);
    const result = await ctx.db
      .query("daily_challenges")
      .withIndex("by_date")
      .order("desc")
      .paginate({ numItems: limit, cursor: args.cursor || null });
    return {
      challenges: result.page.map(c => ({
        id: c._id,
        date: c.date,
        challengeId: c._id,
      })),
      nextCursor: result.isDone ? undefined : result.continueCursor,
    };
  },
});