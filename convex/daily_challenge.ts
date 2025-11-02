import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

export const generateDailyChallenge = internalMutation({
  args: {},
  returns: v.union(v.id("daily_challenges"), v.null()),
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Step 0: Check if challenge already exists for today
    const existingChallenge = await ctx.db
      .query("daily_challenges")
      .withIndex("by_date", (q) => q.eq("date", today))
      .unique();

    if (existingChallenge) {
      return null; // Already exists, don't generate new one
    }

    // Step 1: Look up the last 4 days' daily challenges to build wordsToAvoid and categoriesToAvoid
    const recentChallenges = await ctx.db
      .query("daily_challenges")
      .order("desc")
      .take(4);

    const wordsToAvoid = new Set<string>();
    const categoriesToAvoid = new Set<string>();
    // Collect all smash IDs to parallelize DB gets
    const allSmashIds: Id<"smashes">[] = [];
    for (const challenge of recentChallenges) {
      allSmashIds.push(...challenge.dailySmashes);
    }
    const recentSmashes = await Promise.all(allSmashIds.map(id => ctx.db.get(id)));
    // Build sets from fetched smashes
    for (let i = 0; i < recentChallenges.length; i++) {
      const challenge = recentChallenges[i];
      for (const smashId of challenge.dailySmashes) {
        const smash = recentSmashes.find(s => s?._id === smashId);
        if (smash) {
          wordsToAvoid.add(smash.word1);
          wordsToAvoid.add(smash.word2);
          if (i < 2) {
            categoriesToAvoid.add(smash.category1);
            categoriesToAvoid.add(smash.category2);
          }
        }
      }
    }

    // Debug logs: these arrays can be large; consider making conditional on a verbosity flag in production
    console.log(`wordsToAvoid (${wordsToAvoid.size}):`, Array.from(wordsToAvoid));
    console.log(`categoriesToAvoid (${categoriesToAvoid.size}):`, Array.from(categoriesToAvoid));

    // Step 2: Build candidate pool using index lookups to avoid full-table scans
    // Optimistically pick smashes that avoid wordsToAvoid and categoriesToAvoid
    const candidateSmashes = new Set<Id<"smashes">>();

    // Get all smashes that don't contain any word in wordsToAvoid
    const word1Queries = Array.from(wordsToAvoid).map(word =>
      ctx.db.query("smashes").withIndex("by_word1", (q) => q.eq("word1", word)).collect()
    );
    const word2Queries = Array.from(wordsToAvoid).map(word =>
      ctx.db.query("smashes").withIndex("by_word2", (q) => q.eq("word2", word)).collect()
    );

    const word1Results = await Promise.all(word1Queries);
    const word2Results = await Promise.all(word2Queries);

    const excludedByWords = new Set<Id<"smashes">>();
    for (const results of [...word1Results, ...word2Results]) {
      for (const smash of results) {
        excludedByWords.add(smash._id);
      }
    }

    // Get all smashes that don't contain any category in categoriesToAvoid
    const category1Queries = Array.from(categoriesToAvoid).map(category =>
      ctx.db.query("smashes").withIndex("by_category1", (q) => q.eq("category1", category)).collect()
    );
    const category2Queries = Array.from(categoriesToAvoid).map(category =>
      ctx.db.query("smashes").withIndex("by_category2", (q) => q.eq("category2", category)).collect()
    );

    const category1Results = await Promise.all(category1Queries);
    const category2Results = await Promise.all(category2Queries);

    const excludedByCategories = new Set<Id<"smashes">>();
    for (const results of [...category1Results, ...category2Results]) {
      for (const smash of results) {
        excludedByCategories.add(smash._id);
      }
    }

    // Candidates are smashes not excluded by words or categories
    const allSmashesRaw = await ctx.db.query("smashes").collect();
    const allSmashes = allSmashesRaw.filter(s => s !== null);
    if (allSmashes.length < 10) {
      throw new Error(`Not enough smashes in database. Found ${allSmashes.length}, need at least 10.`);
    }
    console.log(`Total smashes in database: ${allSmashes.length}`); // Debug log

    // Build map for efficient id→smash lookup
    const smashById = new Map(allSmashes.map(s => [s._id, s]));

    for (const smash of allSmashes) {
      if (!excludedByWords.has(smash._id) && !excludedByCategories.has(smash._id)) {
        candidateSmashes.add(smash._id);
      }
    }

    console.log(`Initial candidates: ${candidateSmashes.size}`); // Debug log

    if (candidateSmashes.size < 10) {
      console.log("Applying fallback 1: relaxing categoriesToAvoid"); // Debug log
      // Fallback 1: Relax categoriesToAvoid (allow reusing categories from past 2 days)
      candidateSmashes.clear();
      for (const smash of allSmashes) {
        if (!excludedByWords.has(smash._id)) {
          candidateSmashes.add(smash._id);
        }
      }
      console.log(`After fallback 1: ${candidateSmashes.size} candidates`); // Debug log
    }

    if (candidateSmashes.size < 10) {
      console.log("Applying fallback 2: relaxing wordsToAvoid"); // Debug log
      // Fallback 2: Relax wordsToAvoid (allow reusing words from past 4 days) but still avoid categoriesToAvoid
      candidateSmashes.clear();
      for (const smash of allSmashes) {
        if (!excludedByCategories.has(smash._id)) {
          candidateSmashes.add(smash._id);
        }
      }
      console.log(`After fallback 2: ${candidateSmashes.size} candidates`); // Debug log
    }

    if (candidateSmashes.size < 10) {
      console.log("Applying final fallback: relaxing both constraints"); // Debug log
      // Final fallback: all smashes (relax both)
      candidateSmashes.clear();
      for (const smash of allSmashes) {
        candidateSmashes.add(smash._id);
      }
      console.log(`After final fallback: ${candidateSmashes.size} candidates`); // Debug log
    }

    if (candidateSmashes.size === 0) {
      throw new Error("No available smashes to generate daily challenge");
    }

    // Step 3: Select 10 smashes with strict priority order
    const dailySmashes: Id<"smashes">[] = [];
    const challengeUsedWords = new Set<string>();
    const challengeUsedCategories = new Set<string>();

    // Convert candidate set to array for deterministic ordering
    const candidateArray = Array.from(candidateSmashes).map(id => smashById.get(id)!).filter(Boolean);

    // Sort candidates deterministically (by _id for stability)
    candidateArray.sort((a, b) => a._id.localeCompare(b._id));

    let skippedByWords = 0;
    let skippedByCategories = 0;
    let skippedByWordsAvoid = 0;
    let skippedByCategoriesAvoid = 0;

    for (const candidate of candidateArray) {
      // Check intra-day word deduping (highest priority)
      if (challengeUsedWords.has(candidate.word1) || challengeUsedWords.has(candidate.word2)) {
        skippedByWords++;
        continue;
      }
      // Check intra-day category deduping
      if (challengeUsedCategories.has(candidate.category1) || challengeUsedCategories.has(candidate.category2)) {
        skippedByCategories++;
        continue;
      }
      // Check wordsToAvoid
      if (wordsToAvoid.has(candidate.word1) || wordsToAvoid.has(candidate.word2)) {
        skippedByWordsAvoid++;
        continue;
      }
      // Check categoriesToAvoid
      if (categoriesToAvoid.has(candidate.category1) || categoriesToAvoid.has(candidate.category2)) {
        skippedByCategoriesAvoid++;
        continue;
      }

      // All checks passed, add to daily challenge
      dailySmashes.push(candidate._id);
      challengeUsedWords.add(candidate.word1);
      challengeUsedWords.add(candidate.word2);
      challengeUsedCategories.add(candidate.category1);
      challengeUsedCategories.add(candidate.category2);

      if (dailySmashes.length >= 10) break;
    }

    console.log(`Selection stats: selected ${dailySmashes.length}, skipped by words: ${skippedByWords}, categories: ${skippedByCategories}, wordsAvoid: ${skippedByWordsAvoid}, categoriesAvoid: ${skippedByCategoriesAvoid}`); // Debug log

    // Granular fallback relaxation: progressively reduce constraints
    const currentCategoriesToAvoid = new Set(categoriesToAvoid);
    let currentWordsToAvoid = new Set(wordsToAvoid);

    // Fallback 1: If 2 days' categories are too restrictive, remove oldest 10 categories (from day-2)
    if (dailySmashes.length < 10) {
      console.log(`Need ${10 - dailySmashes.length} more smashes, relaxing categoriesToAvoid by removing oldest 10`); // Debug log
      // Get categories from day-2 (index 1 in recentChallenges)
      const day2Categories = new Set<string>();
      if (recentChallenges.length > 1) {
        const day2Challenge = recentChallenges[1];
        const day2Smashes = await Promise.all(day2Challenge.dailySmashes.map(id => ctx.db.get(id)));
        for (const smash of day2Smashes) {
          if (smash) {
            day2Categories.add(smash.category1);
            day2Categories.add(smash.category2);
          }
        }
      }
      // Remove oldest 10 categories from currentCategoriesToAvoid
      const categoriesToRemove = Array.from(day2Categories).slice(0, 10);
      for (const cat of categoriesToRemove) {
        currentCategoriesToAvoid.delete(cat);
      }
      console.log(`Removed categories:`, categoriesToRemove); // Debug log: array can be large

      // Rebuild candidate pool with relaxed categories
      const relaxedCandidates = new Set<Id<"smashes">>();
      const relaxedExcludedByCategories = new Set<Id<"smashes">>();

      // Re-query exclusions with relaxed categories
      const relaxedCategory1Queries = Array.from(currentCategoriesToAvoid).map(category =>
        ctx.db.query("smashes").withIndex("by_category1", (q) => q.eq("category1", category)).collect()
      );
      const relaxedCategory2Queries = Array.from(currentCategoriesToAvoid).map(category =>
        ctx.db.query("smashes").withIndex("by_category2", (q) => q.eq("category2", category)).collect()
      );

      const relaxedCategory1Results = await Promise.all(relaxedCategory1Queries);
      const relaxedCategory2Results = await Promise.all(relaxedCategory2Queries);

      for (const results of [...relaxedCategory1Results, ...relaxedCategory2Results]) {
        for (const smash of results) {
          relaxedExcludedByCategories.add(smash._id);
        }
      }

      for (const smash of allSmashes) {
        if (!excludedByWords.has(smash._id) && !relaxedExcludedByCategories.has(smash._id)) {
          relaxedCandidates.add(smash._id);
        }
      }

      // Re-select with relaxed constraints
      const relaxedCandidateArray = Array.from(relaxedCandidates).map(id => smashById.get(id)!).filter(Boolean).sort((a, b) => a._id.localeCompare(b._id));

      let addedInRelaxation = 0;
      const repeatedCategories = new Set<string>();
      for (const candidate of relaxedCandidateArray) {
        if (dailySmashes.length >= 10) break;
        // Check intra-day word deduping (highest priority)
        if (challengeUsedWords.has(candidate.word1) || challengeUsedWords.has(candidate.word2)) {
          continue;
        }
        // Check intra-day category deduping
        if (challengeUsedCategories.has(candidate.category1) || challengeUsedCategories.has(candidate.category2)) {
          continue;
        }
        // Check wordsToAvoid
        if (currentWordsToAvoid.has(candidate.word1) || currentWordsToAvoid.has(candidate.word2)) {
          continue;
        }
        // Check currentCategoriesToAvoid (relaxed)
        if (currentCategoriesToAvoid.has(candidate.category1) || currentCategoriesToAvoid.has(candidate.category2)) {
          continue;
        }

        if (categoriesToAvoid.has(candidate.category1)) repeatedCategories.add(candidate.category1);
        if (categoriesToAvoid.has(candidate.category2)) repeatedCategories.add(candidate.category2);
        dailySmashes.push(candidate._id);
        challengeUsedWords.add(candidate.word1);
        challengeUsedWords.add(candidate.word2);
        challengeUsedCategories.add(candidate.category1);
        challengeUsedCategories.add(candidate.category2);
        addedInRelaxation++;
      }
      console.log(`Added ${addedInRelaxation} smashes after category relaxation, repeated categories:`, Array.from(repeatedCategories)); // Debug log: array can be large
    }

    // Fallback 2: If still insufficient, progressively relax wordsToAvoid: 4 days -> 3 days -> 2 days -> 1 day
    const wordRelaxationLevels = [4, 3, 2, 1];
    for (const days of wordRelaxationLevels) {
      if (dailySmashes.length >= 10) break;

      console.log(`Still need ${10 - dailySmashes.length} more smashes, relaxing wordsToAvoid to last ${days} days`); // Debug log
      currentWordsToAvoid = new Set<string>();
      const wordRelaxSmashIds: Id<"smashes">[] = [];
      for (let i = 0; i < Math.min(days, recentChallenges.length); i++) {
        const challenge = recentChallenges[i];
        wordRelaxSmashIds.push(...challenge.dailySmashes);
      }
      const wordRelaxSmashes = await Promise.all(wordRelaxSmashIds.map(id => ctx.db.get(id)));
      for (const smash of wordRelaxSmashes) {
        if (smash) {
          currentWordsToAvoid.add(smash.word1);
          currentWordsToAvoid.add(smash.word2);
        }
      }

      // Rebuild candidate pool with current constraints
      const wordRelaxedCandidates = new Set<Id<"smashes">>();
      const wordRelaxedExcludedByWords = new Set<Id<"smashes">>();
      const wordRelaxedExcludedByCategories = new Set<Id<"smashes">>();

      // Re-query exclusions with current words
      const wordRelaxedWord1Queries = Array.from(currentWordsToAvoid).map(word =>
        ctx.db.query("smashes").withIndex("by_word1", (q) => q.eq("word1", word)).collect()
      );
      const wordRelaxedWord2Queries = Array.from(currentWordsToAvoid).map(word =>
        ctx.db.query("smashes").withIndex("by_word2", (q) => q.eq("word2", word)).collect()
      );

      const wordRelaxedWord1Results = await Promise.all(wordRelaxedWord1Queries);
      const wordRelaxedWord2Results = await Promise.all(wordRelaxedWord2Queries);

      for (const results of [...wordRelaxedWord1Results, ...wordRelaxedWord2Results]) {
        for (const smash of results) {
          wordRelaxedExcludedByWords.add(smash._id);
        }
      }

      // Re-query exclusions with current categories
      const wordRelaxedCategory1Queries = Array.from(currentCategoriesToAvoid).map(category =>
        ctx.db.query("smashes").withIndex("by_category1", (q) => q.eq("category1", category)).collect()
      );
      const wordRelaxedCategory2Queries = Array.from(currentCategoriesToAvoid).map(category =>
        ctx.db.query("smashes").withIndex("by_category2", (q) => q.eq("category2", category)).collect()
      );

      const wordRelaxedCategory1Results = await Promise.all(wordRelaxedCategory1Queries);
      const wordRelaxedCategory2Results = await Promise.all(wordRelaxedCategory2Queries);

      for (const results of [...wordRelaxedCategory1Results, ...wordRelaxedCategory2Results]) {
        for (const smash of results) {
          wordRelaxedExcludedByCategories.add(smash._id);
        }
      }

      for (const smash of allSmashes) {
        if (!wordRelaxedExcludedByWords.has(smash._id) && !wordRelaxedExcludedByCategories.has(smash._id)) {
          wordRelaxedCandidates.add(smash._id);
        }
      }

      // Re-select with current constraints
      const wordRelaxedCandidateArray = Array.from(wordRelaxedCandidates).map(id => smashById.get(id)!).filter(Boolean).sort((a, b) => a._id.localeCompare(b._id));

      let addedInWordRelaxation = 0;
      const repeatedWords = new Set<string>();
      for (const candidate of wordRelaxedCandidateArray) {
        if (dailySmashes.length >= 10) break;
        // Check intra-day word deduping (highest priority)
        if (challengeUsedWords.has(candidate.word1) || challengeUsedWords.has(candidate.word2)) {
          continue;
        }
        // Check intra-day category deduping
        if (challengeUsedCategories.has(candidate.category1) || challengeUsedCategories.has(candidate.category2)) {
          continue;
        }
        // Check currentWordsToAvoid (relaxed)
        if (currentWordsToAvoid.has(candidate.word1) || currentWordsToAvoid.has(candidate.word2)) {
          continue;
        }
        // Check currentCategoriesToAvoid
        if (currentCategoriesToAvoid.has(candidate.category1) || currentCategoriesToAvoid.has(candidate.category2)) {
          continue;
        }

        if (wordsToAvoid.has(candidate.word1)) repeatedWords.add(candidate.word1);
        if (wordsToAvoid.has(candidate.word2)) repeatedWords.add(candidate.word2);
        dailySmashes.push(candidate._id);
        challengeUsedWords.add(candidate.word1);
        challengeUsedWords.add(candidate.word2);
        challengeUsedCategories.add(candidate.category1);
        challengeUsedCategories.add(candidate.category2);
        addedInWordRelaxation++;
      }
      console.log(`Added ${addedInWordRelaxation} smashes after relaxing words to ${days} days, repeated words:`, Array.from(repeatedWords)); // Debug log: array can be large
    }

    if (dailySmashes.length < 10) {
      throw new Error(`Could not generate 10 unique smashes. Only found ${dailySmashes.length}`);
    }

    console.log(`Final daily challenge: ${dailySmashes.length} smashes selected`); // Debug log

    // Step 5: Write to db
    const challengeId = await ctx.db.insert("daily_challenges", {
      date: today,
      dailySmashes,
    });

    return challengeId;
  },
});

export const regenerateDailyChallenge = internalMutation({
  args: {},
  returns: v.union(v.id("daily_challenges"), v.null()),
  handler: async (ctx): Promise<Id<"daily_challenges"> | null> => {
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
    const newId: Id<"daily_challenges"> | null = await ctx.runMutation(internal.daily_challenge.generateDailyChallenge, {});
    return newId;
  },
});