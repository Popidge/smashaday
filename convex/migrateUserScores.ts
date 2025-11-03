import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const insertUserScore = internalMutation({
  args: {
    userId: v.id("users"),
    challengeId: v.id("daily_challenges"),
    score: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("user_scores", args);
  },
});

export const checkUserScoreExists = internalMutation({
  args: {
    userId: v.id("users"),
    challengeId: v.id("daily_challenges"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_scores")
      .withIndex("by_user_challenge", (q) =>
        q.eq("userId", args.userId).eq("challengeId", args.challengeId)
      )
      .unique();
    return existing !== null;
  },
});

export const migrateUserScores = action({
  args: {},
  returns: v.object({
    migrated: v.number(),
    skipped: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Get all users
    const users = await ctx.runQuery(api.queries.getAllUsers, {});

    for (const user of users) {
      try {
        // Iterate over the challengeScores record
        for (const [challengeId, score] of Object.entries(user.challengeScores || {})) {
          // Check if already exists in user_scores
          const exists = await ctx.runMutation(internal.migrateUserScores.checkUserScoreExists, {
            userId: user._id,
            challengeId: challengeId as any,
          });

          if (exists) {
            skipped++;
            continue;
          }

          // Insert new row
          await ctx.runMutation(internal.migrateUserScores.insertUserScore, {
            userId: user._id,
            challengeId: challengeId as any,
            score,
          });

          migrated++;
        }
      } catch (error) {
        console.error(`Error migrating user ${user._id}:`, error);
        errors++;
      }
    }

    return { migrated, skipped, errors };
  },
});

export const cleanupChallengeScores = action({
  args: {},
  returns: v.object({
    cleaned: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    let cleaned = 0;
    let errors = 0;

    // Get all users
    const users = await ctx.runQuery(api.queries.getAllUsers, {});

    for (const user of users) {
      try {
        if (user.challengeScores && Object.keys(user.challengeScores).length > 0) {
          // Clear the challengeScores field
          await ctx.runMutation(internal.migrateUserScores.clearUserChallengeScores, {
            userId: user._id,
          });
          cleaned++;
        }
      } catch (error) {
        console.error(`Error cleaning user ${user._id}:`, error);
        errors++;
      }
    }

    return { cleaned, errors };
  },
});

export const clearUserChallengeScores = internalMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { challengeScores: undefined });
  },
});