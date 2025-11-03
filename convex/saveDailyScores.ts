import { mutation } from "./_generated/server";
import { v } from "convex/values";

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

      // Attempt to insert the score directly - the unique constraint will prevent duplicates
      try {
        await ctx.db.insert("user_scores", {
          userId: user._id,
          challengeId: args.challengeId,
          score: args.score,
        });

        return {
          status: "saved" as const,
          message: "Score saved successfully",
        };
      } catch (error: any) {
        // Check if this is a unique constraint violation
        if (error.message && error.message.includes("unique")) {
          return {
            status: "already_saved" as const,
            message: "Score already saved for this challenge",
          };
        }

        // Re-throw other unexpected errors
        throw error;
      }
    } catch (error) {
      console.error("Error saving daily score:", error);
      return {
        status: "error" as const,
        message: "Failed to save score",
      };
    }
  },
});