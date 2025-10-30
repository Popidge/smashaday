"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { tavily } from "@tavily/core";
import { internal } from "./_generated/api";

/**
 * Simple semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }
}

/**
 * Fetch web context using Tavily API
 */
async function fetchContext(word: string, category: string, dryRun: boolean = false): Promise<string | null> {
  const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  const query = `trivia facts and summary for ${word} (${category})`;
  const backoffs = [500, 1500, 3000];

  if (dryRun) {
    console.log(`[DRY RUN] Tavily Query: "${query}"`);
  }

  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    try {
      const response = await tavilyClient.search(query, {
        // @ts-ignore - "advanced" is valid but types are incorrect in SDK - open PR
        includeAnswer: "advanced",
        maxResults: 3,
      });

      if (dryRun) {
        console.log(`[DRY RUN] Tavily Response (attempt ${attempt + 1}):`, JSON.stringify(response, null, 2));
      }

      return response.answer || null;
    } catch (error) {
      if (dryRun) {
        console.log(`[DRY RUN] Tavily Error (attempt ${attempt + 1}):`, error);
      } else {
        console.error(`Tavily attempt ${attempt + 1} failed for "${word}":`, error);
      }
      if (attempt < backoffs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffs[attempt]));
      }
    }
  }
  if (dryRun) {
    console.log(`[DRY RUN] Tavily failed after all retries for "${word}"`);
  } else {
    console.error(`Tavily failed after all retries for "${word}"`);
  }
  return null;
}

/**
 * Generate clue using OpenRouter API
 */
async function generateClueForWord(
  word: string,
  category: string,
  context: string | null,
  dryRun: boolean = false
): Promise<[string, boolean]> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
    defaultHeaders: {
      "HTTP-Referer": "https://smashaday.app",
      "X-Title": "SmashADay",
    },
  });

  const enriched = context !== null;
  const contextStr = context || "";
  const backoffs = [500, 1500, 3000];

  const prompt = {
    system: "You are a clue-writing assistant for a trivia game.\nWrite ONE clue for the given word.\nRules:\n   − Indirect reference only\n    − Aim for 5-15 words, MUST be ≤25\n    - Stand-alone sentence\nReturn ONLY JSON object: {\"clue\":\"...\"}\nNo other text.",
    user: `Word: ${word}\nCategory: ${category}\nContext: ${contextStr}`,
  };

  if (dryRun) {
    console.log(`[DRY RUN] OpenRouter Prompt:`, JSON.stringify(prompt, null, 2));
  }

  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: prompt.system,
          },
          {
            role: "user",
            content: prompt.user,
          },
        ],
      });

      const response = completion.choices[0]?.message?.content?.trim();
      if (!response) {
        throw new Error("Empty response from OpenRouter");
      }

      if (dryRun) {
        console.log(`[DRY RUN] OpenRouter Raw Response (attempt ${attempt + 1}): "${response}"`);
      }

      let jsonStr = response;
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(jsonStr);
      if (!parsed.clue || typeof parsed.clue !== "string") {
        throw new Error("Invalid response format");
      }

      const clue = parsed.clue.trim();

      if (dryRun) {
        console.log(`[DRY RUN] Parsed Clue: "${clue}"`);
      }

      // Sense-check: ≤30 words, does not include target word
      const wordCount = clue.split(/\s+/).length;
      if (wordCount > 30) {
        throw new Error(`Clue too long: ${wordCount} words`);
      }
      const lowerClue = clue.toLowerCase();
      const lowerWord = word.toLowerCase();
      if (lowerClue.includes(lowerWord)) {
        throw new Error(`Clue contains target word: "${word}"`);
      }

      return [clue, enriched];
    } catch (error) {
      if (dryRun) {
        console.log(`[DRY RUN] OpenRouter Error (attempt ${attempt + 1}):`, error);
      } else {
        console.error(`OpenRouter attempt ${attempt + 1} failed for "${word}":`, error);
      }
      if (attempt < backoffs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffs[attempt]));
      }
    }
  }
  throw new Error(`OpenRouter failed after all retries for "${word}"`);
}

/**
 * Process a single word for clue generation
 */
async function processWordForClue(
  ctx: any,
  word: string,
  dryRun: boolean
): Promise<{ status: "succeeded" | "failed" | "skipped"; reason?: string; attempts?: number }> {
  try {
    const wordData = await ctx.runQuery(internal.smashDbOps.getWordByWord, { word });
    if (!wordData) {
      return { status: "failed", reason: "Word not found in wordsDB", attempts: 0 };
    }

    if (wordData.clueStatus !== "pending") {
      return { status: "skipped", reason: `Already has clueStatus: ${wordData.clueStatus}` };
    }

    const { category } = wordData;

    // Fetch context
    console.log(`Fetching context for "${word}" (${category})`);
    const context = await fetchContext(word, category, dryRun);
    if (context === null) {
      console.log(`Fallback to LLM-only for "${word}"`);
    }

    // Generate clue
    console.log(`Generating clue for "${word}"`);
    const [clue, enriched] = await generateClueForWord(word, category, context, dryRun);

    const clueStatus = enriched ? "enriched" : "fallback";

    if (dryRun) {
      console.log(`DRY RUN: Would update "${word}" with clue: "${clue}", status: ${clueStatus}`);
      return { status: "succeeded", attempts: 1 };
    }

    await ctx.runMutation(internal.smashDbOps.updateWordClue, {
      word,
      clue,
      clueStatus,
    });

    console.log(`Successfully updated "${word}" with clueStatus: ${clueStatus}`);
    return { status: "succeeded", attempts: 1 };
  } catch (error) {
    console.error(`Failed to process "${word}":`, error);
    const attempts = 3; // Max attempts across both APIs

    if (!dryRun) {
      try {
        await ctx.runMutation(internal.smashDbOps.updateWordClue, {
          word,
          clue: "",
          clueStatus: "failed",
        });
        console.log(`Marked "${word}" as failed`);
      } catch (updateError) {
        console.error(`Failed to mark "${word}" as failed:`, updateError);
      }
    } else {
      console.log(`DRY RUN: Would mark "${word}" as failed`);
    }

    return { status: "failed", reason: (error as Error).message, attempts };
  }
}

/**
 * Main action to generate clues for words in pending smashes
 */
export const generateClues = action({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    succeeded: v.number(),
    failed: v.number(),
    skipped: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun || false;
    console.log(`Starting clue generation${dryRun ? " (DRY RUN)" : ""}`);

    // Get pending smashes
    const pendingSmashes = await ctx.runQuery(internal.smashDbOps.getPendingSmashes, {});

    // Extract unique words
    const wordSet = new Set<string>();
    for (const smash of pendingSmashes) {
      wordSet.add(smash.word1);
      wordSet.add(smash.word2);
    }
    const words = Array.from(wordSet);
    console.log(`Found ${words.length} unique words to process`);

    if (dryRun && words.length > 0) {
      // For dry run, only process the first word
      words.splice(1);
      console.log("DRY RUN: Processing only first word");
    }

    // Semaphore for concurrency control
    const semaphore = new Semaphore(5);
    const promises: Promise<{ status: "succeeded" | "failed" | "skipped"; reason?: string; attempts?: number }>[] = [];

    for (const word of words) {
      promises.push(
        (async () => {
          await semaphore.acquire();
          try {
            return await processWordForClue(ctx, word, dryRun);
          } finally {
            semaphore.release();
          }
        })()
      );
    }

    // Wait for all to complete
    const results = await Promise.all(promises);

    // Aggregate stats
    const stats = {
      succeeded: 0,
      failed: 0,
      skipped: 0,
      total: results.length,
    };

    for (const result of results) {
      stats[result.status]++;
      if (result.status === "failed" && result.reason) {
        console.log(`Word failed: ${result.reason} (attempts: ${result.attempts})`);
      }
    }

    console.log(`Clue generation complete: ${stats.succeeded} succeeded, ${stats.failed} failed, ${stats.skipped} skipped`);
    return stats;
  },
});