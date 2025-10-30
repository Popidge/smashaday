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
      id: v.id("wordsDb"),
      category: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const allRows = await ctx.db.query("wordsDb").collect();
    return allRows
      .filter((row) => Object.keys(row.words).length === 0)
      .map((row) => ({ id: row._id, category: row.category }));
  },
});

export const listAllWordsDb = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("wordsDb"),
      category: v.string(),
      words: v.record(v.string(), v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    const allRows = await ctx.db.query("wordsDb").collect();
    return allRows.map((row) => ({
      id: row._id,
      category: row.category,
      words: row.words,
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
    const row = await ctx.db
      .query("wordsDb")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .unique();

    if (!row) {
      throw new Error(`Category "${args.category}" not found in wordsDb`);
    }

    const wordsRecord: Record<string, boolean> = {};
    const seenKeys = new Set<string>();

    for (const word of args.words) {
      const sanitizedKey = sanitizeWordKey(String(word));
      if (sanitizedKey && !seenKeys.has(sanitizedKey)) {
        wordsRecord[String(sanitizedKey)] = Boolean(false);
        seenKeys.add(sanitizedKey);
      }
    }

    await ctx.db.patch(row._id, { words: wordsRecord });
    return null;
  },
});