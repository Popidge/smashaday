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

      // Check if score for this challenge already exists
      if (user.challengeScores[args.challengeId] !== undefined) {
        return {
          status: "already_saved" as const,
          message: "Score already saved for this challenge",
        };
      }

      // Add new score to the record
      const updatedScores = { ...user.challengeScores, [args.challengeId]: args.score };

      // Update the user
      await ctx.db.patch(user._id, { challengeScores: updatedScores });

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