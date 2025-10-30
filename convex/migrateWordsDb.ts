import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const migrateWordsDb = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const allRows = await ctx.db.query("wordsDb").collect();

    for (const row of allRows) {
      const migratedWords: Record<string, boolean> = {};

      // Explicitly coerce every existing key/value and rebuild the record
      for (const [key, value] of Object.entries(row.words)) {
        const k = String(key);
        const vBool = Boolean(value);
        migratedWords[k] = vBool;
      }

      // Apply patch unconditionally per row (one-time normalization)
      await ctx.db.patch(row._id, { words: migratedWords });
      console.log(`Patched wordsDb row "${row.category}" (${row._id}) with ${Object.keys(migratedWords).length} keys`);
    }

    return null;
  },
});