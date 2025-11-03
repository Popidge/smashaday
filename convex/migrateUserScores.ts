import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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

export const checkUserScoreExists = internalQuery({
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
      .first();
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
          const exists = await ctx.runQuery(internal.migrateUserScores.checkUserScoreExists, {
            userId: user._id,
            challengeId: challengeId as Id<"daily_challenges">,
          });

          if (exists) {
            skipped++;
            continue;
          }

          // Insert new row
          await ctx.runMutation(internal.migrateUserScores.insertUserScore, {
            userId: user._id,
            challengeId: challengeId as Id<"daily_challenges">,
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

export const deduplicateUserScores = action({
  args: {},
  returns: v.object({
    duplicatesRemoved: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    let duplicatesRemoved = 0;
    let errors = 0;

    // Get all user_scores grouped by userId and challengeId
    const allScores = await ctx.runQuery(internal.migrateUserScores.getAllUserScores, {});

    // Group by userId + challengeId
    const grouped = new Map<string, any[]>();
    for (const score of allScores) {
      const key = `${score.userId}-${score.challengeId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(score);
    }

    // For each group with duplicates, keep the first one and delete the rest
    for (const [, scores] of grouped) {
      if (scores.length > 1) {
        // Sort by creation time, keep the earliest
        scores.sort((a, b) => a._creationTime - b._creationTime);
        const toDelete = scores.slice(1); // All except the first

        for (const duplicate of toDelete) {
          try {
            await ctx.runMutation(internal.migrateUserScores.deleteUserScore, {
              scoreId: duplicate._id,
            });
            duplicatesRemoved++;
          } catch (error) {
            console.error(`Error deleting duplicate score ${duplicate._id}:`, error);
            errors++;
          }
        }
      }
    }

    return { duplicatesRemoved, errors };
  },
});

export const getAllUserScores = internalQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("user_scores"),
    _creationTime: v.number(),
    userId: v.id("users"),
    challengeId: v.id("daily_challenges"),
    score: v.number(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("user_scores").collect();
  },
});

export const deleteUserScore = internalMutation({
  args: {
    scoreId: v.id("user_scores"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.scoreId);
  },
});