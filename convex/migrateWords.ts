import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration script to move words and categories from existing "smashes" table
 * to the wordsDb and categories tables. This extracts all unique words and
 * their categories from the smashes table and populates the proper tables.
 */
export const migrateWordsFromSmashes = internalMutation({
  args: {},
  returns: v.object({
    categoriesCreated: v.number(),
    wordsInserted: v.number(),
  }),
  handler: async (ctx) => {
    console.log("Starting migration from smashes table...");

    // Get all smashes to extract words and categories
    const smashes = await ctx.db.query("smashes").collect();
    console.log(`Found ${smashes.length} smashes to process`);

    // Collect unique categories and words
    const categoriesSet = new Set<string>();
    const wordsMap = new Map<string, { category: string; clue: string }>();

    for (const smash of smashes) {
      // Add categories
      categoriesSet.add(smash.category1);
      categoriesSet.add(smash.category2);

      // Add words with their categories and clues
      if (!wordsMap.has(smash.word1)) {
        wordsMap.set(smash.word1, {
          category: smash.category1,
          clue: smash.clue1,
        });
      }
      if (!wordsMap.has(smash.word2)) {
        wordsMap.set(smash.word2, {
          category: smash.category2,
          clue: smash.clue2,
        });
      }
    }

    console.log(`Found ${categoriesSet.size} unique categories and ${wordsMap.size} unique words`);

    // Create categories
    let categoriesCreated = 0;
    for (const category of categoriesSet) {
      // Check if category already exists
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_category", (q) => q.eq("category", category))
        .unique();

      if (!existing) {
        await ctx.db.insert("categories", {
          category,
          words: 0, // Will be updated when words are inserted
        });
        categoriesCreated++;
      }
    }
    console.log(`Created ${categoriesCreated} new categories`);

    // Insert words
    let wordsInserted = 0;
    for (const [word, data] of wordsMap) {
      // Check if word already exists
      const existing = await ctx.db
        .query("wordsDb")
        .withIndex("by_word", (q) => q.eq("word", word))
        .unique();

      if (!existing) {
        await ctx.db.insert("wordsDb", {
          word,
          category: data.category,
          clue: data.clue,
          clueStatus: "enriched", // Since we have clues from smashes
        });
        wordsInserted++;
      }
    }
    console.log(`Inserted ${wordsInserted} new words`);

    // Update category word counts
    for (const category of categoriesSet) {
      const wordCount = await ctx.db
        .query("wordsDb")
        .withIndex("by_category_clueStatus", (q) => q.eq("category", category))
        .collect()
        .then((docs) => docs.length);

      await ctx.db
        .query("categories")
        .withIndex("by_category", (q) => q.eq("category", category))
        .unique()
        .then((catDoc) => {
          if (catDoc) {
            return ctx.db.patch(catDoc._id, { words: wordCount });
          }
        });
    }

    console.log("Migration completed successfully");
    return {
      categoriesCreated,
      wordsInserted,
    };
  },
});