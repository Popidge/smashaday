"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

/**
 * Sanitizes a word/phrase to be a valid Convex record key.
 * - Convert to lowercase
 * - Transliterate accents to ASCII (crème brûlée → creme brulee)
 * - Strip non-ASCII/control characters
 * - Collapse multiple whitespace to single space
 * - Trim whitespace
 * - Prefix with "word " if starts with $ or _
 * - Dedupe collisions by keeping first occurrence
 */
function sanitizeWordKey(word: string): string {
  // Convert to lowercase first
  let sanitized = word.toLowerCase();

  // Basic transliteration for common accents
  sanitized = sanitized
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

export const generateWords = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const categories = await ctx.runQuery(internal.insertWords.listCategoriesNeedingWords, {});

    for (const { category } of categories) {
      let words: string[] | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      const backoffs = [500, 1500, 3000];

      while (attempts < maxAttempts && !words) {
        try {
          const prompt = `You are a category generator for a word-mashup trivia game.

Given a category name, generate a list of 15-25 specific words, phrases, or subjects that belong to that category.

Rules:
- Return ONLY valid JSON array of strings, no other text
- Each entry should be 1-4 words (keep phrases concise)
- Entries must be specific nouns or proper nouns (not adjectives or verbs)
- No duplicates
- Avoid extremely obscure entries; aim for recognizable/well-known examples
- Use lowercase, except proper nouns (names, places, brands)
- Prefer ASCII characters only (no accents, special characters, or non-English letters)

Category: ${category}

Return ONLY this format:
["entry1", "entry2", "entry3", ...]`;

          const completion = await openai.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
          });

          const response = completion.choices[0]?.message?.content?.trim();
          if (!response) {
            throw new Error("Empty response from LLM");
          }

          // Strip potential markdown code fences
          let jsonStr = response;
          if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
          } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }

          const parsed = JSON.parse(jsonStr);
          if (!Array.isArray(parsed)) {
            throw new Error("Response is not an array");
          }

          // Validate array contents
          const validWords = parsed
            .filter((item) => typeof item === "string" && item.trim().length > 0)
            .map((item) => String(item).trim())
            .filter((item, index, arr) => arr.indexOf(item) === index) // dedupe
            .filter((item) => {
              const wordCount = item.split(/\s+/).length;
              return wordCount >= 1 && wordCount <= 4;
            })
            .map((item) => {
              // Apply sanitization to ensure ASCII-only keys
              const sanitized = sanitizeWordKey(item);
              return sanitized || item; // fallback to original if sanitization fails
            })
            .filter((item, index, arr) => arr.indexOf(item) === index); // dedupe after sanitization

          if (validWords.length < 15 || validWords.length > 25) {
            throw new Error(`Invalid word count: ${validWords.length}, expected 15-25`);
          }

          words = validWords;
        } catch (error) {
          attempts++;
          console.error(`Attempt ${attempts} failed for category "${category}":`, error);
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, backoffs[attempts - 1]));
          }
        }
      }

      if (!words) {
        console.error(`Failed to generate words for category "${category}" after ${maxAttempts} attempts`);
        continue;
      }

      try {
        await ctx.runMutation(internal.insertWords.insertWords, { category, words });
        console.log(`Successfully inserted ${words.length} words for category "${category}"`);
      } catch (error) {
        console.error(`Failed to insert words for category "${category}":`, error);
      }
    }

    return null;
  },
});