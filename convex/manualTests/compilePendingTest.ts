import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Manual test mutation for the smash compiler fix.
 * Constructs a pending smash with null/empty clue fields, simulates cached word data with clues,
 * calls smashCompilerPage with status="compiled" to trigger the update branch,
 * logs the resulting pending row / smash row, and cleans up test rows.
 */
export const testCompilePendingClues = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting manual test for compile pending clues fix...");

    // Step 1: Ensure test words exist in wordsDb with enriched clues
    const timestamp = Date.now();
    const testWord1 = `testword1_${timestamp}`;
    const testWord2 = `testword2_${timestamp}`;

    // Check if words exist, if not insert them
    const word1Doc = await ctx.runQuery(internal.smashDbOps.getWordByWord, { word: testWord1 });
    if (!word1Doc) {
      await ctx.db.insert("wordsDb", {
        word: testWord1,
        category: "test",
        clue: "Enriched clue for testword1",
        clueStatus: "enriched",
      });
      console.log(`Inserted test word: ${testWord1}`);
    } else {
      console.log(`Test word already exists: ${testWord1}`);
    }

    const word2Doc = await ctx.runQuery(internal.smashDbOps.getWordByWord, { word: testWord2 });
    if (!word2Doc) {
      await ctx.db.insert("wordsDb", {
        word: testWord2,
        category: "test",
        clue: "Fallback clue for testword2", // Different clue to test update
        clueStatus: "fallback", // Not enriched to trigger clue update branch
      });
      console.log(`Inserted test word: ${testWord2}`);
    } else {
      console.log(`Test word already exists: ${testWord2}`);
    }

    // Step 2: Insert a pending smash with undefined clues and status "compiled"
    const pendingId = await ctx.db.insert("pendingSmashes", {
      word1: testWord1,
      category1: "test",
      word2: testWord2,
      category2: "test",
      smash: `${testWord1}${testWord2}`,
      clue1: undefined, // Start with undefined clues
      clue2: undefined,
      status: "compiled",
    });
    console.log(`Inserted test pending smash with ID: ${pendingId}`);

    // Step 3: Call smashCompilerPage with status="compiled" to trigger the update branch
    const result = await ctx.runMutation(internal.smashCompiler.smashCompilerPage, {
      status: "compiled",
      cursor: null,
      limit: 10, // Small limit for test
    });
    console.log("Compiler result:", result);

    // Step 4: Verify the pending smash was updated with clues
    const updatedPending = await ctx.db.get(pendingId);
    console.log("Updated pending smash:", updatedPending);

    if (updatedPending?.clue1 === "Enriched clue for testword1" && updatedPending?.clue2 === "Fallback clue for testword2") {
      console.log("✅ Test PASSED: Pending smash clues were correctly updated.");
    } else {
      console.log("❌ Test FAILED: Pending smash clues were not updated as expected.");
      console.log(`Expected clue1: "Enriched clue for testword1", got: "${updatedPending?.clue1}"`);
      console.log(`Expected clue2: "Fallback clue for testword2", got: "${updatedPending?.clue2}"`);
    }

    // Step 5: Clean up test data
    await ctx.db.delete(pendingId);
    console.log(`Cleaned up test pending smash: ${pendingId}`);

    // Optionally clean up test words if they were inserted by this test
    if (!word1Doc) {
      const word1ToDelete = await ctx.db
        .query("wordsDb")
        .withIndex("by_word", (q) => q.eq("word", testWord1))
        .unique();
      if (word1ToDelete) {
        await ctx.db.delete(word1ToDelete._id);
        console.log(`Cleaned up test word: ${testWord1}`);
      }
    }
    if (!word2Doc) {
      const word2ToDelete = await ctx.db
        .query("wordsDb")
        .withIndex("by_word", (q) => q.eq("word", testWord2))
        .unique();
      if (word2ToDelete) {
        await ctx.db.delete(word2ToDelete._id);
        console.log(`Cleaned up test word: ${testWord2}`);
      }
    }

    console.log("Manual test completed.");
    return null;
  },
});