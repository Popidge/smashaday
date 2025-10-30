import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const addCategories = mutation({
  args: {
    categoriesString: v.string(),
  },
  returns: v.object({
    insertedCount: v.number(),
    skippedCount: v.number(),
    insertedCategories: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Check if user is admin
    const adminCheck = await ctx.runQuery(api.users.isAdmin, {});
    if (!adminCheck.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Parse and normalize categories
    const categories = args.categoriesString
      .split(",")
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0)
      .map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()); // Title case

    // Dedupe
    const uniqueCategories = [...new Set(categories)];

    let insertedCount = 0;
    let skippedCount = 0;
    const insertedCategories: string[] = [];

    for (const category of uniqueCategories) {
      // Check if category already exists
      const existing = await ctx.db
        .query("wordsDb")
        .withIndex("by_category", (q) => q.eq("category", category))
        .unique();

      if (existing) {
        skippedCount++;
      } else {
        await ctx.db.insert("wordsDb", {
          category,
          words: {},
        });
        insertedCount++;
        insertedCategories.push(category);
      }
    }

    return {
      insertedCount,
      skippedCount,
      insertedCategories,
    };
  },
});