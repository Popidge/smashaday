import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// devLog: gated development-only logger
function devLog(...args: unknown[]) {
  try {
    // Use CONVEX_ENV=development to enable verbose logs
    // At runtime in Convex this will usually be undefined in production, so logs are quiet.
    if (process.env.CONVEX_ENV === "development") {
      console.log(...args);
    }
  } catch {
    // swallow any logging errors to avoid breaking runtime
  }
}

// Helper function to fetch most recent challenges
async function fetchMostRecentChallenges(ctx: any, limit: number) {
  return await ctx.db
    .query("daily_challenges")
    .withIndex("by_date", (q: any) => q)
    .order("desc")
    .take(limit);
}

 // Helper function to build avoid sets
async function buildAvoidSets(ctx: any, recentChallenges: any[], c: number) {
  const wordsToAvoid = new Set<string>();
  const categoriesToAvoid = new Set<string>();

  // Collect all smash IDs from recent days
  const allSmashIds: Id<"smashes">[] = [];
  for (const challenge of recentChallenges) {
    allSmashIds.push(...challenge.dailySmashes);
  }

  // Fetch all smashes in parallel
  const recentSmashes = await Promise.all(allSmashIds.map(id => ctx.db.get(id)));

  // Build a map for O(1) lookup by _id to avoid O(n^2) .find(...) calls
  const recentSmashMap = new Map<string, any>();
  for (const s of recentSmashes) {
    if (s && s._id) recentSmashMap.set(s._id, s);
  }

  // Build sets from fetched smashes using the map
  for (let i = 0; i < recentChallenges.length; i++) {
    const challenge = recentChallenges[i];
    for (const smashId of challenge.dailySmashes) {
      const smash = recentSmashMap.get(smashId);
      if (smash) {
        wordsToAvoid.add(smash.word1);
        wordsToAvoid.add(smash.word2);
        if (i < c) {
          categoriesToAvoid.add(smash.category1);
          categoriesToAvoid.add(smash.category2);
        }
      }
    }
  }

  return { wordsToAvoid, categoriesToAvoid };
}

export const generateDailyChallenge = internalMutation({
  args: {
    w: v.optional(v.number()),
    c: v.optional(v.number()),
  },
  returns: v.union(v.id("daily_challenges"), v.null()),
  handler: async (ctx, args) => {
    const w = args.w ?? 4;
    const c = args.c ?? 2;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Stage 0: Check if challenge already exists for today
    const existingChallenge = await ctx.db
      .query("daily_challenges")
      .withIndex("by_date", (q) => q.eq("date", today))
      .unique();

    if (existingChallenge) {
      return null; // Already exists, don't generate new one
    }

    // Stage 1: Collect previous w daily challenges, build sets of wordsToAvoid (last w days) and categoriesToAvoid (last c days)
    const mostRecentW = await fetchMostRecentChallenges(ctx, w);
 
    const { wordsToAvoid, categoriesToAvoid } = await buildAvoidSets(ctx, mostRecentW, c);

    // Debug logs: these arrays can be large; consider making conditional on a verbosity flag in production
    devLog(`wordsToAvoid (${wordsToAvoid.size}):`, Array.from(wordsToAvoid));
    devLog(`categoriesToAvoid (${categoriesToAvoid.size}):`, Array.from(categoriesToAvoid));

    // Stage 2: Indexed lookups, collect all smashes once, filter in typescript (happy path)
    // Build list of smashes docs to filter out: const filterDocs =
    const filterDocs = new Set<Id<"smashes">>();

    // For word in wordsToAvoid
    const w1Smashes = new Set<Id<"smashes">>();
    const w2Smashes = new Set<Id<"smashes">>();
    for (const word of wordsToAvoid) {
      const w1Results = await ctx.db.query("smashes").withIndex("by_word1", (q) => q.eq("word1", word)).collect();
      for (const smash of w1Results) {
        w1Smashes.add(smash._id);
      }
      const w2Results = await ctx.db.query("smashes").withIndex("by_word2", (q) => q.eq("word2", word)).collect();
      for (const smash of w2Results) {
        w2Smashes.add(smash._id);
      }
    }

    // For category in categoriesToAvoid
    const c1Smashes = new Set<Id<"smashes">>();
    const c2Smashes = new Set<Id<"smashes">>();
    for (const category of categoriesToAvoid) {
      const c1Results = await ctx.db.query("smashes").withIndex("by_category1", (q) => q.eq("category1", category)).collect();
      for (const smash of c1Results) {
        c1Smashes.add(smash._id);
      }
      const c2Results = await ctx.db.query("smashes").withIndex("by_category2", (q) => q.eq("category2", category)).collect();
      for (const smash of c2Results) {
        c2Smashes.add(smash._id);
      }
    }

    // Dedupe filterDocs
    for (const id of w1Smashes) filterDocs.add(id);
    for (const id of w2Smashes) filterDocs.add(id);
    for (const id of c1Smashes) filterDocs.add(id);
    for (const id of c2Smashes) filterDocs.add(id);

    // Collect all docs in smashes to allSmashes
    const allSmashesRaw = await ctx.db.query("smashes").collect();
    const allSmashes = allSmashesRaw.filter(s => s !== null);
    if (allSmashes.length < 10) {
      throw new Error(`Not enough smashes in database. Found ${allSmashes.length}, need at least 10.`);
    }
    devLog(`Total smashes in database: ${allSmashes.length}`); // Debug log

    // Filter allSmashes in typescript to remove filterDocs and leave filteredSmashes
    const filteredSmashes = allSmashes.filter(smash => !filterDocs.has(smash._id));

    devLog(`Filtered smashes after full constraints: ${filteredSmashes.length}`); // Debug log

    // Use the full filtered pool for deduping selection rather than pre-slicing to 10.
    // Previously we limited to 10 here, which meant intra-day dedupe often rejected many
    // because the small sample already had category/word collisions.  We now keep the
    // entire filtered pool and greedily pick up to 10 unique items from it.
    const workingArray: Id<"smashes">[] = filteredSmashes.map(s => s._id);
    if (workingArray.length >= 10) {
      devLog(`Working pool after stage 2: ${workingArray.length} candidates (using full pool for dedupe)`); // Debug log
    } else {
      // If filteredSmashes < 10, we'll enter Stage 3 to relax constraints
      devLog(`Working array after stage 2: ${workingArray.length}`); // Debug log
    }


    // Stage 3: backfill with gradually relaxed filter constraints
    if (workingArray.length < 10) {
      // discount category 2 filters - filter filterDocs to remove c2Smashes, to give filterDocsC2
      const filterDocsC2 = new Set(filterDocs);
      for (const id of c2Smashes) filterDocsC2.delete(id);

      // filter allSmashes to remove filterDocsC2 and working array to give filteredSmashesC2
      const filteredSmashesC2 = allSmashes.filter(smash => !filterDocsC2.has(smash._id) && !workingArray.includes(smash._id));

      if (filteredSmashesC2.length > (10 - workingArray.length)) {
        // take all, break
        const shuffled = [...filteredSmashesC2].sort(() => Math.random() - 0.5);
        workingArray.push(...shuffled.slice(0, 10 - workingArray.length).map(s => s._id));
      } else {
        // repeat discounting category1 filters, then word2 filters, then word1 filters
        const filterDocsC1 = new Set(filterDocsC2);
        for (const id of c1Smashes) filterDocsC1.delete(id);
        const filteredSmashesC1 = allSmashes.filter(smash => !filterDocsC1.has(smash._id) && !workingArray.includes(smash._id));

        if (filteredSmashesC1.length > (10 - workingArray.length)) {
          const shuffled = [...filteredSmashesC1].sort(() => Math.random() - 0.5);
          workingArray.push(...shuffled.slice(0, 10 - workingArray.length).map(s => s._id));
        } else {
          const filterDocsW2 = new Set(filterDocsC1);
          for (const id of w2Smashes) filterDocsW2.delete(id);
          const filteredSmashesW2 = allSmashes.filter(smash => !filterDocsW2.has(smash._id) && !workingArray.includes(smash._id));

          if (filteredSmashesW2.length > (10 - workingArray.length)) {
            const shuffled = [...filteredSmashesW2].sort(() => Math.random() - 0.5);
            workingArray.push(...shuffled.slice(0, 10 - workingArray.length).map(s => s._id));
          } else {
            const filterDocsW1 = new Set(filterDocsW2);
            for (const id of w1Smashes) filterDocsW1.delete(id);
            const filteredSmashesW1 = allSmashes.filter(smash => !filterDocsW1.has(smash._id) && !workingArray.includes(smash._id));

            if (filteredSmashesW1.length > (10 - workingArray.length)) {
              const shuffled = [...filteredSmashesW1].sort(() => Math.random() - 0.5);
              workingArray.push(...shuffled.slice(0, 10 - workingArray.length).map(s => s._id));
            } else {
              // defensive fallback (should never be triggered) - gracefully handle/log if we get through whole algo and still <10 smashes
              console.error(`Unable to find 10 smashes even after relaxing all constraints. Found ${workingArray.length + filteredSmashesW1.length} total.`);
              if (workingArray.length + filteredSmashesW1.length >= 10) {
                const shuffled = [...filteredSmashesW1].sort(() => Math.random() - 0.5);
                workingArray.push(...shuffled.slice(0, 10 - workingArray.length).map(s => s._id));
              } else {
                throw new Error(`Could not generate 10 unique smashes. Only found ${workingArray.length + filteredSmashesW1.length}`);
              }
            }
          }
        }
      }
    }

    // Now apply intra-day deduping to the working array
    const dailySmashes: Id<"smashes">[] = [];
    const challengeUsedWords = new Set<string>();
    const challengeUsedCategories = new Set<string>();

    // Build smashById for lookup
    const smashById = new Map(allSmashes.map(s => [s._id, s]));

    // Debug: sample filteredSmashes and workingArray to diagnose deduping issues
    try {
      devLog("DEBUG: sample filteredSmashes (first 10):", filteredSmashes.slice(0, 10).map(s => ({
        _id: s._id,
        word1: s.word1,
        word2: s.word2,
        category1: s.category1,
        category2: s.category2,
      })));
    } catch (e) {
      devLog("DEBUG: failed to log filteredSmashes sample", e);
    }
    devLog("DEBUG: workingArray length", workingArray.length, "sample ids", workingArray.slice(0, 10));
    devLog("DEBUG: smashById size", smashById.size);

    // Shuffle working array for randomness
    const shuffledWorking = [...workingArray].sort(() => Math.random() - 0.5);

    // Counters for diagnostics
    let skipMissing = 0;
    let skipWordDup = 0;
    let skipCategoryDup = 0;
    let accepted = 0;

    for (const smashId of shuffledWorking) {
      const smash = smashById.get(smashId);
      if (!smash) {
        skipMissing++;
        devLog("DEBUG SKIP: missing smash in smashById", smashId);
        continue;
      }

      // Check intra-day word deduping (highest priority)
      if (challengeUsedWords.has(smash.word1) || challengeUsedWords.has(smash.word2)) {
        skipWordDup++;
        devLog("DEBUG SKIP word-dup:", smash._id, { word1: smash.word1, word2: smash.word2, usedWords: Array.from(challengeUsedWords).slice(0,10) });
        continue;
      }
      // Check intra-day category deduping
      if (challengeUsedCategories.has(smash.category1) || challengeUsedCategories.has(smash.category2)) {
        skipCategoryDup++;
        devLog("DEBUG SKIP category-dup:", smash._id, { category1: smash.category1, category2: smash.category2, usedCategories: Array.from(challengeUsedCategories).slice(0,10) });
        continue;
      }

      // All checks passed, add to daily challenge
      dailySmashes.push(smash._id);
      accepted++;
      challengeUsedWords.add(smash.word1);
      challengeUsedWords.add(smash.word2);
      challengeUsedCategories.add(smash.category1);
      challengeUsedCategories.add(smash.category2);

      devLog("DEBUG ACCEPT:", smash._id, { word1: smash.word1, word2: smash.word2, category1: smash.category1, category2: smash.category2, totalSelected: dailySmashes.length });

      if (dailySmashes.length >= 10) break;
    }

    devLog("DEBUG DEDUPE STATS:", { accepted, skipMissing, skipWordDup, skipCategoryDup, workingPool: workingArray.length });

    if (dailySmashes.length < 10) {
      throw new Error(`Could not generate 10 unique smashes after deduping. Only found ${dailySmashes.length}`);
    }

    devLog(`Final daily challenge: ${dailySmashes.length} smashes selected`); // Debug log


    // Step 5: Write to db
    const challengeId = await ctx.db.insert("daily_challenges", {
      date: today,
      dailySmashes,
    });

    return challengeId;
  },
});

export const regenerateDailyChallenge = internalMutation({
  args: {
    w: v.optional(v.number()),
    c: v.optional(v.number()),
  },
  returns: v.union(v.id("daily_challenges"), v.null()),
  handler: async (ctx, args): Promise<Id<"daily_challenges"> | null> => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if challenge exists for today and delete it
    const existingChallenge = await ctx.db
      .query("daily_challenges")
      .withIndex("by_date", (q) => q.eq("date", today))
      .unique();

    if (existingChallenge) {
      await ctx.db.delete(existingChallenge._id);
    }

    // Now generate a new one
    const newId: Id<"daily_challenges"> | null = await ctx.runMutation(internal.daily_challenge.generateDailyChallenge, args);
    return newId;
  },
});