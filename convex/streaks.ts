import {
  query,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the streak data for a user.
 */
export const getUserStreakData = query({
  args: {
    externalId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("streaks"),
      _creationTime: v.number(),
      userId: v.id("users"),
      currentStreak: v.number(),
      bestStreak: v.number(),
      lastPlayedDate: v.string(),
      lastUpdated: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Look up user by externalId
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!user) {
      return null;
    }

    return await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

/**
 * Update the user's streak after completing a daily challenge.
 */
export const updateUserStreak = internalMutation({
  args: {
    externalId: v.string(),
    challengeId: v.id("daily_challenges"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Look up user by externalId
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!user) {
      return null;
    }

    // Fetch all current daily scores for the user, ordered by playedAt desc
    const scores = await ctx.db
      .query("user_scores")
      .withIndex("by_user_current", (q) =>
        q.eq("userId", user._id).eq("isCurrentDaily", true)
      )
      .order("desc")
      .collect();

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Calculate consecutive streak
    let currentStreak = 0;
    const playedDates = new Set<string>();

    // Collect unique played dates from scores
    for (const score of scores) {
      if (score.playedAt) {
        const playedDate = new Date(score.playedAt).toISOString().split('T')[0];
        playedDates.add(playedDate);
      }
    }

    // Walk backwards from today to count consecutive days
    const checkDate = new Date(today);
    while (playedDates.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // If today wasn't played, streak is 0
    if (!playedDates.has(today)) {
      currentStreak = 0;
    }

    // Get existing streak data
    const existingStreak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const bestStreak = Math.max(currentStreak, existingStreak?.bestStreak || 0);

    // Upsert streak data
    if (existingStreak) {
      await ctx.db.replace(existingStreak._id, {
        userId: user._id,
        currentStreak,
        bestStreak,
        lastPlayedDate: today,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("streaks", {
        userId: user._id,
        currentStreak,
        bestStreak,
        lastPlayedDate: today,
        lastUpdated: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Get streak stats including percentile ranking.
 */
export const getStreakStats = query({
  args: {
    externalId: v.string(),
  },
  returns: v.object({
    currentStreak: v.number(),
    bestStreak: v.number(),
    percentile: v.number(),
  }),
  handler: async (ctx, args) => {
    // Look up user by externalId
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!user) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        percentile: 0,
      };
    }

    const streakData = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!streakData) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        percentile: 0,
      };
    }

    // Count users with better streaks
    const betterStreaks = await ctx.db
      .query("streaks")
      .withIndex("by_current_streak", (q) => q.gt("currentStreak", streakData.currentStreak))
      .collect();

    // Get total user count (approximate)
    const totalUsers = await ctx.db.query("streaks").collect();

    const percentile = totalUsers.length > 0
      ? ((totalUsers.length - betterStreaks.length) / totalUsers.length) * 100
      : 0;

    return {
      currentStreak: streakData.currentStreak,
      bestStreak: streakData.bestStreak,
      percentile: Math.round(percentile),
    };
  },
});