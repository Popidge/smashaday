import { internalMutation, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttrs = {
      name: `${data.first_name} ${data.last_name}`,
      externalId: data.id,
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      // New user
      await ctx.db.insert("users", userAttrs);
    } else {
      // Existing user: only patch non-score fields
      await ctx.db.patch(user._id, userAttrs);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { isAdmin: false };
    //using a custom claim in Clerk JWT:
    const publicMetadata = identity.public_metadata as any;
    if (!publicMetadata?.isAdmin) return { isAdmin: false };
    return { isAdmin: true };
  },
});

export const getUserScores = query({
  args: { clerkId: v.string() },
  returns: v.object({
    challengeScores: v.record(v.id("daily_challenges"), v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await userByExternalId(ctx, args.clerkId);
    if (!user) {
      return { challengeScores: {} };
    }

    const scores = await ctx.db
      .query("user_scores")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const challengeScores: Record<string, number> = {};
    for (const score of scores) {
      challengeScores[score.challengeId] = score.score;
    }

    return { challengeScores };
  },
});