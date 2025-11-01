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

/**
 * Migration script to convert all word fields in wordsDb to lowercase.
 * This fixes smashgen issues caused by mixed case strategy.
 */
export const convertWordsToLowercase = internalMutation({
  args: {},
  returns: v.object({
    wordsProcessed: v.number(),
    wordsUpdated: v.number(),
  }),
  handler: async (ctx) => {
    console.log("Starting word case conversion to lowercase...");

    // Get all words from wordsDb
    const allWords = await ctx.db.query("wordsDb").collect();
    console.log(`Found ${allWords.length} total words in wordsDb`);

    let wordsUpdated = 0;

    // Process each word
    for (const wordRecord of allWords) {
      const lowercaseWord = wordRecord.word.toLowerCase();

      if (wordRecord.word !== lowercaseWord) {
        // Update the word to lowercase
        await ctx.db.patch(wordRecord._id, { word: lowercaseWord });
        wordsUpdated++;
        console.log(`Converted "${wordRecord.word}" to "${lowercaseWord}"`);
      }
    }

    console.log(`Word case conversion completed: processed ${allWords.length} words, updated ${wordsUpdated} words`);
    return {
      wordsProcessed: allWords.length,
      wordsUpdated,
    };
  },
});

/**
 * Migration script to remove duplicate words from wordsDb table.
 * Keeps only one instance of each word (the first one by _creationTime).
 * Different categories are allowed - only exact word duplicates are removed.
 */
export const removeDuplicateWords = internalMutation({
  args: {},
  returns: v.object({
    duplicatesFound: v.number(),
    wordsRemoved: v.number(),
  }),
  handler: async (ctx) => {
    console.log("Starting duplicate word removal...");

    // Get all words from wordsDb
    const allWords = await ctx.db.query("wordsDb").collect();
    console.log(`Found ${allWords.length} total words in wordsDb`);

    // Group by word to find duplicates
    const wordGroups = new Map<string, typeof allWords>();

    for (const word of allWords) {
      if (!wordGroups.has(word.word)) {
        wordGroups.set(word.word, []);
      }
      wordGroups.get(word.word)!.push(word);
    }

    let duplicatesFound = 0;
    let wordsRemoved = 0;

    // Process each group that has duplicates
    for (const [word, instances] of wordGroups) {
      if (instances.length > 1) {
        duplicatesFound++;
        console.log(`Found ${instances.length} duplicates for word: "${word}"`);

        // Sort by _creationTime (oldest first) and keep the first one
        instances.sort((a, b) => a._creationTime - b._creationTime);

        // Remove all but the first instance
        for (let i = 1; i < instances.length; i++) {
          await ctx.db.delete(instances[i]._id);
          wordsRemoved++;
          console.log(`Removed duplicate: "${word}" (ID: ${instances[i]._id})`);
        }

        console.log(`Kept first instance: "${word}" (ID: ${instances[0]._id}, category: ${instances[0].category})`);
      }
    }

    console.log(`Duplicate removal completed: found ${duplicatesFound} duplicate groups, removed ${wordsRemoved} words`);
    return {
      duplicatesFound,
      wordsRemoved,
    };
  },
});