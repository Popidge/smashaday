import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sanitizes a word/phrase to be a valid Convex record key.
 * - Transliterate accents to ASCII (crème brûlée → creme brulee)
 * - Strip non-ASCII/control characters
 * - Collapse multiple whitespace to single space
 * - Trim whitespace
 * - Prefix with "word " if starts with $ or _
 * - Dedupe collisions by keeping first occurrence
 */
function sanitizeWordKey(word: string): string {
  // Basic transliteration for common accents
  let sanitized = word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/ß/g, 'ss')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');

  // Strip non-ASCII characters (keep only printable ASCII)
  sanitized = sanitized.replace(/[^\x20-\x7E]/g, '');

  // Collapse multiple whitespace to single space
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Prefix if starts with $ or _
  if (sanitized.startsWith('$') || sanitized.startsWith('_')) {
    sanitized = 'word ' + sanitized;
  }

  return sanitized;
}

export const listCategoriesNeedingWords = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("categories"),
      category: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const allRows = await ctx.db.query("categories").collect();
    return allRows
      .filter((row) => row.words < 15)
      .map((row) => ({ id: row._id, category: row.category }));
  },
});

export const listAllWordsDb = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("wordsDb"),
      word: v.string(),
      category: v.string(),
      clue: v.string(),
      clueStatus: v.union(
        v.literal("pending"),
        v.literal("enriched"),
        v.literal("fallback"),
        v.literal("failed")
      ),
    }),
  ),
  handler: async (ctx) => {
    const allRows = await ctx.db.query("wordsDb").collect();
    return allRows.map((row) => ({
      id: row._id,
      word: row.word,
      category: row.category,
      clue: row.clue,
      clueStatus: row.clueStatus,
    }));
  },
});

export const insertWords = internalMutation({
  args: {
    category: v.string(),
    words: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const categoryRow = await ctx.db
      .query("categories")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .unique();

    if (!categoryRow) {
      throw new Error(`Category "${args.category}" not found in categories`);
    }

    const seenKeys = new Set<string>();

    for (const word of args.words) {
      const sanitizedKey = sanitizeWordKey(String(word));
      if (sanitizedKey && !seenKeys.has(sanitizedKey)) {
        await ctx.db.insert("wordsDb", {
          word: sanitizedKey,
          category: args.category,
          clue: "",
          clueStatus: "pending",
        });
        seenKeys.add(sanitizedKey);
      }
    }

    // Count the total words for this category
    const wordCount = await ctx.db
      .query("wordsDb")
      .withIndex("by_category_clueStatus", (q) => q.eq("category", args.category))
      .collect()
      .then((docs) => docs.length);

    // Update the categories table with the new word count
    await ctx.db.patch(categoryRow._id, { words: wordCount });

    return null;
  },
});