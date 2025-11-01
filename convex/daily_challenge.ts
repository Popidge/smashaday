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

    // Step 1: Look up the last 5 days' daily challenges to see which smashes and words have been used recently
    const recentChallenges = await ctx.db
      .query("daily_challenges")
      .order("desc")
      .take(5);

    const usedSmashIds = new Set<string>();
    const usedWords = new Set<string>();
    for (const challenge of recentChallenges) {
      for (const smashId of challenge.dailySmashes) {
        usedSmashIds.add(smashId);
        const smash = await ctx.db.get(smashId);
        if (smash) {
          usedWords.add(smash.word1);
          usedWords.add(smash.word2);
        }
      }
    }

    // Step 2: Determine available smashes based on word usage
    const allSmashes = await ctx.db.query("smashes").collect();
    if (allSmashes.length < 10) {
      throw new Error(`Not enough smashes in database. Found ${allSmashes.length}, need at least 10.`);
    }

    // Strict filter: no words from last 5 days
    let availableSmashes = allSmashes.filter(smash => !usedWords.has(smash.word1) && !usedWords.has(smash.word2));

    if (availableSmashes.length < 10) {
      // Relaxed filter: at most one word from last 5 days
      availableSmashes = allSmashes.filter(smash => {
        const shared = (usedWords.has(smash.word1) ? 1 : 0) + (usedWords.has(smash.word2) ? 1 : 0);
        return shared <= 1;
      });
    }

    if (availableSmashes.length < 10) {
      // Fallback: exclude only recent smash IDs
      availableSmashes = allSmashes.filter(smash => !usedSmashIds.has(smash._id));
    }

    if (availableSmashes.length === 0) {
      throw new Error("No available smashes to generate daily challenge");
    }

    const dailySmashes: Id<"smashes">[] = [];
    const challengeUsedWords = new Set<string>();

    // Pick first smash
    const firstSmash = availableSmashes[0];
    dailySmashes.push(firstSmash._id);
    challengeUsedWords.add(firstSmash.word1);
    challengeUsedWords.add(firstSmash.word2);

    // Step 3: Loop for the next 9 smashes
    let index = 1; // Start from the next smash
    while (dailySmashes.length < 10 && index < availableSmashes.length) {
      const candidate = availableSmashes[index];
      if (!challengeUsedWords.has(candidate.word1) && !challengeUsedWords.has(candidate.word2)) {
        dailySmashes.push(candidate._id);
        challengeUsedWords.add(candidate.word1);
        challengeUsedWords.add(candidate.word2);
      }
      index++;
    }

    // Step 4: If we have less than 10, relax constraints to smashes that only share 1 word
    if (dailySmashes.length < 10) {
      index = 0; // Reset to beginning of available smashes
      while (dailySmashes.length < 10 && index < availableSmashes.length) {
        const candidate = availableSmashes[index];
        if (!dailySmashes.includes(candidate._id)) { // Not already picked
          const sharedWords = (challengeUsedWords.has(candidate.word1) ? 1 : 0) + (challengeUsedWords.has(candidate.word2) ? 1 : 0);
          if (sharedWords <= 1) {
            dailySmashes.push(candidate._id);
            challengeUsedWords.add(candidate.word1);
            challengeUsedWords.add(candidate.word2);
          }
        }
        index++;
      }
    }

    if (dailySmashes.length < 10) {
      throw new Error(`Could not generate 10 unique smashes. Only found ${dailySmashes.length}`);
    }

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
    return await ctx.runMutation(internal.daily_challenge.generateDailyChallenge, {});
  },
});