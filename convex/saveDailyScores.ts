import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// All dates in this file use UTC YYYY-MM-DD format

function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export const saveDailyScores = mutation({
  args: {
    externalId: v.string(),
    challengeId: v.id("daily_challenges"),
    score: v.number(),
  },
  returns: v.object({
    status: v.union(v.literal("saved"), v.literal("already_saved"), v.literal("error")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      // Look up user by externalId
      const user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
        .unique();

      if (!user) {
        return {
          status: "error" as const,
          message: "User not found",
        };
      }

      // Check if score for this challenge already exists using the by_user_challenge index
      const existing = await ctx.db
        .query("user_scores")
        .withIndex("by_user_challenge", (q) =>
          q.eq("userId", user._id).eq("challengeId", args.challengeId)
        )
        .first();

      if (existing) {
        return {
          status: "already_saved" as const,
          message: "Score already saved for this challenge",
        };
      }

      // Fetch challenge to determine if it's current daily
      const challenge = await ctx.db.get(args.challengeId);
      if (!challenge) {
        return {
          status: "error" as const,
          message: "Challenge not found",
        };
      }

      const today = getTodayUTC();
      const isCurrentDaily = challenge.date === today;
      const playedAt = Date.now();

      // Insert new score into user_scores
      await ctx.db.insert("user_scores", {
        userId: user._id,
        challengeId: args.challengeId,
        score: args.score,
        isCurrentDaily,
        playedAt,
      });

      // Update streak if this is a current daily challenge
      if (isCurrentDaily) {
        await ctx.runMutation(internal.streaks.updateUserStreak, {
          externalId: args.externalId,
          challengeId: args.challengeId,
        });

        // Fetch updated streak data to get currentStreak
        const streakData = await ctx.db
          .query("streaks")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .unique();

        const currentStreak = streakData?.currentStreak || 0;

        // Update leaderboards
        await ctx.runMutation(internal.leaderboards.updateLeaderboards, {
          userId: user._id,
          score: args.score,
          playedAt,
          currentStreak,
          name: user.name,
        });
      }

      return {
        status: "saved" as const,
        message: "Score saved successfully",
      };
    } catch (error) {
      console.error("Error saving daily score:", error);
      return {
        status: "error" as const,
        message: "Failed to save score",
      };
    }
  },
});