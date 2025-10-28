import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const generateDailyChallenge = internalMutation({
  args: {},
  returns: v.id("daily_challenges"),
  handler: async (ctx) => {
    // Step 1: Look up the last 5 days' daily challenges to see which smashes have been used recently
    const recentChallenges = await ctx.db
      .query("daily_challenges")
      .order("desc")
      .take(5);

    const usedSmashIds = new Set<string>();
    for (const challenge of recentChallenges) {
      for (const smashId of challenge.dailySmashes) {
        usedSmashIds.add(smashId);
      }
    }

    // Step 2: From the remaining smashes, pick the first available one in the table to be the first entry
    const allSmashes = await ctx.db.query("smashes").collect();
    if (allSmashes.length < 10) {
      throw new Error(`Not enough smashes in database. Found ${allSmashes.length}, need at least 10.`);
    }
    const availableSmashes = allSmashes.filter(smash => !usedSmashIds.has(smash._id));

    if (availableSmashes.length === 0) {
      throw new Error("No available smashes to generate daily challenge");
    }

    const dailySmashes: Id<"smashes">[] = [];
    const usedWords = new Set<string>();

    // Pick first smash
    const firstSmash = availableSmashes[0];
    dailySmashes.push(firstSmash._id);
    usedWords.add(firstSmash.word1);
    usedWords.add(firstSmash.word2);

    // Step 3: Loop for the next 9 smashes
    let index = 1; // Start from the next smash
    while (dailySmashes.length < 10 && index < availableSmashes.length) {
      const candidate = availableSmashes[index];
      if (!usedWords.has(candidate.word1) && !usedWords.has(candidate.word2)) {
        dailySmashes.push(candidate._id);
        usedWords.add(candidate.word1);
        usedWords.add(candidate.word2);
      }
      index++;
    }

    // Step 4: If we have less than 10, relax constraints to smashes that only share 1 word
    if (dailySmashes.length < 10) {
      index = 0; // Reset to beginning of available smashes
      while (dailySmashes.length < 10 && index < availableSmashes.length) {
        const candidate = availableSmashes[index];
        if (!dailySmashes.includes(candidate._id)) { // Not already picked
          const sharedWords = (usedWords.has(candidate.word1) ? 1 : 0) + (usedWords.has(candidate.word2) ? 1 : 0);
          if (sharedWords <= 1) {
            dailySmashes.push(candidate._id);
            usedWords.add(candidate.word1);
            usedWords.add(candidate.word2);
          }
        }
        index++;
      }
    }

    if (dailySmashes.length < 10) {
      throw new Error(`Could not generate 10 unique smashes. Only found ${dailySmashes.length}`);
    }

    // Step 5: Write to db
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const challengeId = await ctx.db.insert("daily_challenges", {
      date: today,
      dailySmashes,
    });

    return challengeId;
  },
});