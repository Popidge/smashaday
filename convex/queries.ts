import { query } from "./_generated/server";
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