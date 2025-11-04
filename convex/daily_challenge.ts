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

    // Helper function to select unique smashes from a pool, respecting intra-day deduping
    function selectUniqueSmashes(
      smashIds: Id<"smashes">[],
      smashById: Map<Id<"smashes">, any>,
      usedWords: Set<string>,
      usedCategories: Set<string>,
      maxToSelect: number
    ): Id<"smashes">[] {
      const selected: Id<"smashes">[] = [];
      const shuffled = [...smashIds].sort(() => Math.random() - 0.5);

      for (const id of shuffled) {
        const smash = smashById.get(id);
        if (!smash) continue;

        // Check intra-day word deduping (highest priority)
        if (usedWords.has(smash.word1) || usedWords.has(smash.word2)) continue;

        // Check intra-day category deduping
        if (usedCategories.has(smash.category1) || usedCategories.has(smash.category2)) continue;

        // All checks passed, add to selection
        selected.push(id);
        usedWords.add(smash.word1);
        usedWords.add(smash.word2);
        usedCategories.add(smash.category1);
        usedCategories.add(smash.category2);

        if (selected.length >= maxToSelect) break;
      }

      return selected;
    }

    // Build smashById for lookup
    const smashById = new Map(allSmashes.map(s => [s._id, s]));

    // Initialize sets for intra-day deduping
    const challengeUsedWords = new Set<string>();
    const challengeUsedCategories = new Set<string>();
    const dailySmashes: Id<"smashes">[] = [];

    devLog(`Filtered smashes after full constraints: ${filteredSmashes.length}`); // Debug log

    // Stage 2: Select from fully constrained pool first
    const initialPool = filteredSmashes.map(s => s._id);
    const initialSelected = selectUniqueSmashes(initialPool, smashById, challengeUsedWords, challengeUsedCategories, 10);
    dailySmashes.push(...initialSelected);

    devLog(`Selected ${initialSelected.length} from initial pool. Total selected: ${dailySmashes.length}`);

    // Stage 3: If needed, relax constraints iteratively and select more
    if (dailySmashes.length < 10) {
      // Relax category2 filters
      const filterDocsC2 = new Set(filterDocs);
      for (const id of c2Smashes) {
        if (!c1Smashes.has(id) && !w1Smashes.has(id) && !w2Smashes.has(id)) {
          filterDocsC2.delete(id);
        }
      }
      const availableC2 = allSmashes.filter(smash => !filterDocsC2.has(smash._id) && !dailySmashes.includes(smash._id));
      const selectedC2 = selectUniqueSmashes(availableC2.map(s => s._id), smashById, challengeUsedWords, challengeUsedCategories, 10 - dailySmashes.length);
      dailySmashes.push(...selectedC2);
      devLog(`Selected ${selectedC2.length} after relaxing C2. Total selected: ${dailySmashes.length}`);

      if (dailySmashes.length < 10) {
        // Relax category1 filters
        const filterDocsC1 = new Set(filterDocsC2);
        for (const id of c1Smashes) {
          if (!w1Smashes.has(id) && !w2Smashes.has(id)) {
            filterDocsC1.delete(id);
          }
        }
        const availableC1 = allSmashes.filter(smash => !filterDocsC1.has(smash._id) && !dailySmashes.includes(smash._id));
        const selectedC1 = selectUniqueSmashes(availableC1.map(s => s._id), smashById, challengeUsedWords, challengeUsedCategories, 10 - dailySmashes.length);
        dailySmashes.push(...selectedC1);
        devLog(`Selected ${selectedC1.length} after relaxing C1. Total selected: ${dailySmashes.length}`);

        if (dailySmashes.length < 10) {
          // Relax word2 filters
          const filterDocsW2 = new Set(filterDocsC1);
          for (const id of w2Smashes) {
            if (!w1Smashes.has(id)) {
              filterDocsW2.delete(id);
            }
          }
          const availableW2 = allSmashes.filter(smash => !filterDocsW2.has(smash._id) && !dailySmashes.includes(smash._id));
          const selectedW2 = selectUniqueSmashes(availableW2.map(s => s._id), smashById, challengeUsedWords, challengeUsedCategories, 10 - dailySmashes.length);
          dailySmashes.push(...selectedW2);
          devLog(`Selected ${selectedW2.length} after relaxing W2. Total selected: ${dailySmashes.length}`);

          if (dailySmashes.length < 10) {
            // Relax word1 filters
            const filterDocsW1 = new Set(filterDocsW2);
            for (const id of w1Smashes) filterDocsW1.delete(id);
            const availableW1 = allSmashes.filter(smash => !filterDocsW1.has(smash._id) && !dailySmashes.includes(smash._id));
            const selectedW1 = selectUniqueSmashes(availableW1.map(s => s._id), smashById, challengeUsedWords, challengeUsedCategories, 10 - dailySmashes.length);
            dailySmashes.push(...selectedW1);
            devLog(`Selected ${selectedW1.length} after relaxing W1. Total selected: ${dailySmashes.length}`);

            if (dailySmashes.length < 10) {
              // Defensive fallback
              console.error(`Unable to find 10 smashes even after relaxing all constraints. Found ${dailySmashes.length} selected.`);
              throw new Error(`Could not generate 10 unique smashes. Only found ${dailySmashes.length}`);
            }
          }
        }
      }
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