import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const migrateUserScores = action({
  args: {},
  returns: v.object({
    migrated: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx) => {
    let migrated = 0;
    let errors = 0;

    // Get all users using the query we just added
    const users = await ctx.runQuery(api.queries.getAllUsers, {});

    for (const user of users) {
      try {
        // Check if challengeScores is still an array (needs migration)
        if (Array.isArray(user.challengeScores)) {
          // Convert array to record
          const record: Record<string, number> = {};
          for (const entry of user.challengeScores) {
            record[entry.challengeId] = entry.score;
          }

          // Update the user
          await ctx.runMutation(internal.users.updateChallengeScores, {
            userId: user._id,
            challengeScores: record,
          });

          migrated++;
        }
      } catch (error) {
        console.error(`Error migrating user ${user._id}:`, error);
        errors++;
      }
    }

    return { migrated, errors };
  },
});