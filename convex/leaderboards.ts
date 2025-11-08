import {
  query,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

/**
 * Update leaderboards after a score is saved.
 * Upserts entries in dailyChallengeLeaderboard and currentStreakLeaderboard.
 */
export const updateLeaderboards = internalMutation({
  args: {
    userId: v.id("users"),
    score: v.number(),
    playedAt: v.number(),
    currentStreak: v.number(),
    name: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update dailyChallengeLeaderboard
    const existingDaily = await ctx.db
      .query("dailyChallengeLeaderboard")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const shouldUpdateDaily = !existingDaily ||
      args.score > existingDaily.score ||
      (args.score === existingDaily.score && args.playedAt < existingDaily.playedAt);

    if (shouldUpdateDaily) {
      if (existingDaily) {
        await ctx.db.replace(existingDaily._id, {
          userId: args.userId,
          score: args.score,
          playedAt: args.playedAt,
          name: args.name,
        });
      } else {
        await ctx.db.insert("dailyChallengeLeaderboard", {
          userId: args.userId,
          score: args.score,
          playedAt: args.playedAt,
          name: args.name,
        });
      }
    }

    // Update currentStreakLeaderboard
    const existingStreak = await ctx.db
      .query("currentStreakLeaderboard")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existingStreak) {
      await ctx.db.replace(existingStreak._id, {
        userId: args.userId,
        currentStreak: args.currentStreak,
        name: args.name,
      });
    } else {
      await ctx.db.insert("currentStreakLeaderboard", {
        userId: args.userId,
        currentStreak: args.currentStreak,
        name: args.name,
      });
    }

    return null;
  },
});

/**
 * Get paginated daily challenge leaderboard.
 *
 * We sanitize the raw paginated result returned by Convex to strip
 * system fields (like _creationTime) and pagination internals so the
 * client receives a clean typed page.
 */
export const getDailyLeaderboard = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("dailyChallengeLeaderboard"),
        userId: v.id("users"),
        score: v.number(),
        playedAt: v.number(),
        name: v.optional(v.string()),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const raw = await ctx.db
      .query("dailyChallengeLeaderboard")
      .withIndex("by_score_playedAt")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = raw.page.map((r: any) => ({
      _id: r._id,
      userId: r.userId,
      score: r.score,
      playedAt: r.playedAt,
      name: r.name,
    }));

    return {
      page,
      isDone: raw.isDone,
      continueCursor: raw.continueCursor ?? null,
    };
  },
});

/**
 * Get paginated current streak leaderboard.
 *
 * Sanitize the paginated result to expose only the fields the client expects.
 */
export const getCurrentStreakBoard = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("currentStreakLeaderboard"),
        userId: v.id("users"),
        currentStreak: v.number(),
        name: v.optional(v.string()),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const raw = await ctx.db
      .query("currentStreakLeaderboard")
      .withIndex("by_currentStreak")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = raw.page.map((r: any) => ({
      _id: r._id,
      userId: r.userId,
      currentStreak: r.currentStreak,
      name: r.name,
    }));

    return {
      page,
      isDone: raw.isDone,
      continueCursor: raw.continueCursor ?? null,
    };
  },
});

/**
 * Get the user's leaderboard entry for a specific board.
 *
 * Return a sanitized object (strip system fields) so it matches the
 * client's expected validator precisely.
 */
export const getUserLeaderboard = query({
  args: {
    externalId: v.string(),
    board: v.union(v.literal("streak"), v.literal("daily")),
  },
  returns: v.union(
    v.object({
      _id: v.id("dailyChallengeLeaderboard"),
      userId: v.id("users"),
      score: v.number(),
      playedAt: v.number(),
      name: v.optional(v.string()),
    }),
    v.object({
      _id: v.id("currentStreakLeaderboard"),
      userId: v.id("users"),
      currentStreak: v.number(),
      name: v.optional(v.string()),
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

    if (args.board === "daily") {
      const doc = await ctx.db
        .query("dailyChallengeLeaderboard")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (!doc) return null;
      return {
        _id: doc._id,
        userId: doc.userId,
        score: doc.score,
        playedAt: doc.playedAt,
        name: doc.name,
      };
    } else {
      const doc = await ctx.db
        .query("currentStreakLeaderboard")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (!doc) return null;
      return {
        _id: doc._id,
        userId: doc.userId,
        currentStreak: doc.currentStreak,
        name: doc.name,
      };
    }
  },
});