import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Main internal mutation function: generateSmashes()
 * - calls getAllWords query, store as array sorted newest-to-oldest ✓
 * - calls getExistingSmashPairs query, store as Set for O(1) dedup check
 * - build prefix map (build_overlap_index):
 *   - for every word, generate all prefixes of length 3–7
 *   - store: prefix → Set of words that START with that prefix
 *   - Map<string, Set<string>> for O(1) lookups
 * - iterate through words array (i = 0 to length-1):
 *   - for each word[i] (w1):
 *     - look backward through remaining words (j = i+1 to length-1):
 *       - for each word[j] (w2):
 *         - skip if same category (enforce cross-category smashes)
 *         - try to generate smash via prefix map (same algorithm as Python smasher):
 *           - try overlap lengths 7 down to 3
 *           - extract suffix of w1 at that length: w1.slice(-n)
 *           - query prefix map: words starting with this suffix
 *           - if w2 is in that set:
 *             - merge: w1 + w2.slice(n) = smash result
 *             - check if pair (w1, w2) already in existingSmashPairs Set (order-agnostic)
 *             - if not in Set, add to candidates array: {word1: w1, category1: cat1, word2: w2, category2: cat2, smash: merged_result}
 * - call writePendingSmashes mutation with all candidates
 * - return: total generated, total skipped (already existed)
 */
export const generateSmashes = internalMutation({
  args: {},
  returns: v.object({
    totalGenerated: v.number(),
    totalSkipped: v.number(),
  }),
  handler: async (ctx): Promise<{ totalGenerated: number; totalSkipped: number }> => {
    console.log("Starting generateSmashes...");

    // Get all words sorted newest-to-oldest
    const words: Array<{ word: string; category: string; _creationTime: number }> = await ctx.runQuery(internal.smashDbOps.getAllWords, {});
    console.log(`Fetched ${words.length} words from wordsDb`);

    // Get existing smash pairs as Set for O(1) lookup
    const existingPairsArray: string[] = await ctx.runQuery(internal.smashDbOps.getExistingSmashPairs, {});
    const existingPairs: Set<string> = new Set(existingPairsArray);
    console.log(`Found ${existingPairs.size} existing smash pairs`);

    // Build prefix map: prefix -> Set of words starting with that prefix
    const prefixMap = new Map<string, Set<string>>();
    for (const wordObj of words) {
      const word = wordObj.word;
      for (let len = 3; len <= 7; len++) {
        if (word.length >= len) {
          const prefix = word.slice(0, len);
          if (!prefixMap.has(prefix)) {
            prefixMap.set(prefix, new Set());
          }
          prefixMap.get(prefix)!.add(word);
        }
      }
    }
    console.log(`Built prefix map with ${prefixMap.size} unique prefixes`);

    const candidates: Array<{
      word1: string;
      category1: string;
      word2: string;
      category2: string;
      smash: string;
    }> = [];

    let totalPairsChecked = 0;
    let sameCategorySkipped = 0;
    let existingPairSkipped = 0;
    let noOverlapFound = 0;

    // Iterate through words (i from 0 to length-1)
    for (let i = 0; i < words.length; i++) {
      const w1 = words[i].word;
      const cat1 = words[i].category;

      // Look backward through remaining words (j = i+1 to length-1)
      for (let j = i + 1; j < words.length; j++) {
        const w2 = words[j].word;
        const cat2 = words[j].category;
        totalPairsChecked++;

        // Skip if same category (enforce cross-category smashes)
        if (cat1 === cat2) {
          sameCategorySkipped++;
          continue;
        }

        // Try overlap lengths 7 down to 3
        let foundSmash = false;
        for (let n = 7; n >= 3; n--) {
          if (w1.length < n) continue;

          const suffix = w1.slice(-n);
          const matchingWords = prefixMap.get(suffix);
          if (matchingWords && matchingWords.has(w2)) {
            // Merge: w1 + w2.slice(n)
            const smash = w1 + w2.slice(n);

            // Check if pair already exists (order-agnostic)
            const pairKey = [w1, w2].sort().join("|");
            if (!existingPairs.has(pairKey)) {
              candidates.push({
                word1: w1,
                category1: cat1,
                word2: w2,
                category2: cat2,
                smash,
              });
              foundSmash = true;
              break; // Stop at first valid overlap
            } else {
              existingPairSkipped++;
              foundSmash = true;
              break; // Still break to avoid checking smaller overlaps
            }
          }
        }
        if (!foundSmash) {
          noOverlapFound++;
        }
      }
    }

    console.log(`Pair analysis complete:`);
    console.log(`- Total pairs checked: ${totalPairsChecked}`);
    console.log(`- Same category skipped: ${sameCategorySkipped}`);
    console.log(`- Existing pair skipped: ${existingPairSkipped}`);
    console.log(`- No overlap found: ${noOverlapFound}`);
    console.log(`- Candidates generated: ${candidates.length}`);

    // Write all candidates to pendingSmashes
    if (candidates.length > 0) {
      await ctx.runMutation(internal.smashDbOps.writePendingSmashes, {
        smashes: candidates,
      });
      console.log(`Wrote ${candidates.length} candidates to pendingSmashes`);
    }

    // Return counts
    const totalGenerated: number = candidates.length;
    const totalSkipped: number = existingPairs.size; // Approximate, since we don't count individual skips

    console.log(`Returning: generated=${totalGenerated}, skipped=${totalSkipped}`);
    return {
      totalGenerated,
      totalSkipped,
    };
  },
});