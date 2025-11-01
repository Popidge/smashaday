# Backend review — annotated implementation plan and tests

This document translates the code review findings into a prioritized set of implementation tasks, design notes, and test cases.

Scope

- Focus: Convex server-side code in repo (smash generation, smashes compiler, clue generation).
- Files of primary interest: [`convex/smashGen.ts:1`](convex/smashGen.ts:1), [`convex/smashCompiler.ts:1`](convex/smashCompiler.ts:1), [`convex/smashDbOps.ts:1`](convex/smashDbOps.ts:1), [`convex/clueGen.ts:1`](convex/clueGen.ts:1).

Goals

- Fix correctness bugs (self-comparison, metrics).
- Replace inefficient/unsafe query patterns (avoid .filter, use indexes).
- Improve performance of generation algorithm to avoid unnecessary O(n^2) checks where possible.
- Centralize 3rd-party API usage behind adapters for testability.
- Add unit and integration tests (vitest + convex-test) as outlined in [`todos/convex_reorganisation.md:78`](todos/convex_reorganisation.md:78).

Priority roadmap (short)

1. Fix critical correctness bugs in [`convex/smashCompiler.ts:1`](convex/smashCompiler.ts:1) (self-comparison) and in metrics returned from [`convex/smashGen.ts:29`](convex/smashGen.ts:29).
2. Replace `.filter` usage in [`convex/smashDbOps.ts:231`](convex/smashDbOps.ts:231) with index-backed lookup and add a normalized `pairKey` index.
3. Centralize AI clients into [`convex/shared/aiClient.ts:1`](convex/shared/aiClient.ts:1) and add mocks in [`convex/test-utils/mockAiClient.ts:1`](convex/test-utils/mockAiClient.ts:1).
4. Add unit tests for the overlap/merge logic and parsing LLM outputs.
5. Add convex-test integration tests for generate → pendingSmashes and compiler → smashes flows.

Detailed implementation plan (by topic)

A) Correctness fixes (High)

- Issue 1: self-comparison bug in [`convex/smashCompiler.ts:151`](convex/smashCompiler.ts:151).
  - Problem: code compares `word1Data.clue !== word1Data.clue` which is always false.
  - Fix:
    1. Read the current pendingSmash row's clue fields (if stored) before patching:
       - Use the pending row variable available in loop (e.g. `pending`) to inspect `pending.clue1`/`pending.clue2` if those fields exist, otherwise fetch the pending row with full fields using [`convex/smashDbOps.ts:183`](convex/smashDbOps.ts:183) `getPendingSmashesAll`.
    2. Compare `if (pending.clue1 !== word1Data.clue) patch.clue1 = word1Data.clue;`
    3. Remove redundant self-comparison lines.
  - Tests:
    - Unit test that constructs a pending smash with null/empty clue fields, simulate cached word data with clues and expect the patch to include changed clues.
    - Run integration test via convex-test that runs compiler on a small DB fixture and verifies updated rows.

- Issue 2: inaccurate skip metric in [`convex/smashGen.ts:144`](convex/smashGen.ts:144).
  - Problem: `totalSkipped` returns `existingPairs.size` (total DB pairs) instead of number of pairs skipped during this run.
  - Fix:
    1. Return richer metrics from `generateSmashes`: { totalGenerated, sameCategorySkipped, existingPairSkipped, noOverlapFound, totalPairsChecked }.
    2. Compute totalSkipped as `existingPairSkipped`.
  - Tests:
    - Unit test that runs generate logic on deterministic input and asserts returned counts match expected values.

B) Query patterns & indexing (High)

- Problem: `.filter` usage in [`convex/smashDbOps.ts:231`](convex/smashDbOps.ts:231) leads to table scans and poor scalability.
- Plan:
  1. Add a derived field `pairKey` to `smashes` and `pendingSmashes` schema (normalized, sorted lowercased pair): e.g. `pairKey: "batman|manchester"`.
     - Update [`convex/schema.ts:5`](convex/schema.ts:5) to add `pairKey: v.string()` for `smashes` and [`convex/schema.ts:50`](convex/schema.ts:50) for `pendingSmashes`.
  2. Create index `.index("by_pairKey", ["pairKey"])`.
  3. When inserting into `pendingSmashes` (see [`convex/smashDbOps.ts:76`](convex/smashDbOps.ts:76)) compute and store pairKey.
  4. Replace the `.filter` lookup in `getSmashByWordPair` with a `withIndex("by_pairKey", ...)` lookup.
- Backwards compatibility:
  - During migration, keep a thin wrapper `convex/smashDbOps.ts` that supports both old and new fields. See pattern in [`todos/convex_reorganisation.md:106`](todos/convex_reorganisation.md:106).
- Tests:
  - Unit test for `pairKey` normalization function (cover case sensitivity, unicode, whitespace).
  - Integration test that confirms `getSmashByWordPair` finds inserted smash via `pairKey` index.

C) Performance: reduce effective O(n^2) behavior (Medium)

- Current behavior: nested loops check all j > i pairs, doing prefixMap lookup per pair. This is O(n^2) worst-case.
- Optimized approach:
  1. For each word w1:
     - For overlap length n = 7..3:
        - Suffix = last n chars of w1.
        - Look up `matchingWords = prefixMap.get(suffix)` — this is a small set.
        - For each candidate w2 in `matchingWords`:
           - If w2 occurs later in the `words` array (preserve ordering) and category differs, check existence and add candidate.
  2. To ensure ordering (only consider j > i), maintain a set or map of word -> index from the original words array for O(1) index lookups.
- Benefits: if prefixMap entries are small (as expected), the inner loop becomes tiny and far fewer pair checks occur.
- Implementation notes:
  - Extract this algorithm into a pure helper function to make it unit-testable. Place in [`convex/smashGen.ts:47`](convex/smashGen.ts:47) or into `convex/smashes/utils.ts` as part of reorg.
  - Add constants for MIN_OVERLAP and MAX_OVERLAP.
- Tests:
  - Unit tests for the overlap builder and generator helper using small sample datasets.

D) Centralize AI / external APIs (Medium)

- Motivation: Improve testability and avoid network calls in CI.
- Plan:
  1. Create adapter interface `AiClient` with methods:
     - `searchContext(word, category): Promise<string | null>` (Tavily)
     - `generateClue({ word, category, context }): Promise<string>` (OpenRouter/OpenAI)
  2. Implement concrete adapter using the existing APIs in [`convex/clueGen.ts:43`](convex/clueGen.ts:43) for production under `convex/shared/aiClient.ts:1`.
  3. Implement a mock adapter in `convex/test-utils/mockAiClient.ts:1` that returns deterministic values and supports failure injection.
  4. Inject adapter into the action via a small factory or context—e.g., read from `globalThis.__aiClient` in tests or `createAiClient()` in production. Alternatively, export `makeAiClient` and pass as an optional param to `generateClues` during tests.
- Tests:
  - Unit tests for parsing/prompt handling using the mock adapter.
  - Action tests that run `generateClues` with `mockAiClient` and assert DB updates in convex-test.

E) Robust parsing & sanitization (Medium)

- LLM outputs are noisy. Consolidate parsing logic into a helper:
  - `parseJsonLikeResponse(raw: string): any` that strips fences, attempts JSON.parse, and falls back to line-based extraction where reasonable.
- Add sanitizers:
  - `sanitizeClue(clue: string): string` — trim, collapse whitespace, remove control chars, enforce length/word-count limits, remove target substring if present, optionally replace problematic unicode.
- Tests:
  - Unit tests that exercise edge-case outputs, e.g., code fences, trailing commentary, escaped JSON, non-JSON outputs.

F) Observability & metrics (Low → Medium)

- Expand return payloads to include comprehensive counters from `generateSmashes` and `smashCompiler`.
- Consider adding structured logs: create `lib/logger.ts` wrapper that can be toggled between debug/info levels and formats logs as JSON for easier ingestion.
- Tests:
  - None directly required; ensure returned counts are correct via integration tests.

Testing plan (vitest + convex-test)

Test layout and frameworks:

- Use Vitest for pure unit tests and `convex-test` for integration tests (run in Node).
- Place tests adjacent to code per reorg: `convex/smashes/__tests__/` and `convex/words/__tests__/`.

Unit tests (examples)

- overlap-utils.test.ts
  - Inputs: small word arrays; assert generated candidates and overlap lengths.
  - Target: tests for [`convex/smashGen.ts:47`](convex/smashGen.ts:47) helper.

- pairKey.test.ts
  - Test normalization for case, whitespace, unicode.
  - Target: `pairKey` function used before writing to [`convex/pendingSmashes`](convex/schema.ts:50).

- parse-and-sanitize.test.ts
  - Feed multiple LLM-like outputs to `parseJsonLikeResponse` and `sanitizeClue`.

Integration tests (convex-test)

- generate-to-pending.integration.test.ts
  - Setup: Insert sample `wordsDb` fixtures (3–10 words across categories).
  - Action: Call [`convex/smashGen.ts:29`](convex/smashGen.ts:29) (or exported wrapper).
  - Assert: Pending smashes written to `pendingSmashes` with expected `pairKey` and count.

- compiler.integration.test.ts
  - Setup: Create `pendingSmashes` entries (some with enriched clues, some pending).
  - Action: Call [`convex/smashCompiler.ts:185`](convex/smashCompiler.ts:185) (legacy wrapper) or `smashCompilerPage`.
  - Assert: `smashes` rows inserted/updated and `pendingSmashes` rows deleted or marked failed as appropriate.

- clues-action.integration.test.ts
  - Setup: Populate `wordsDb` with pending clues and have `pendingSmashes` referencing them.
  - Replace real AI adapter with `convex/test-utils/mockAiClient.ts:1`.
  - Action: Call [`convex/clueGen.ts:256`](convex/clueGen.ts:256) with `dryRun=false`.
  - Assert: `wordsDb` updated with clues and `clueStatus` set accordingly.

CI and developer ergonomics

- Add GitHub Actions CI job `.github/workflows/ci.yml` that:
  - Installs dependencies (`pnpm install`).
  - Runs unit tests (`pnpm test:unit`).
  - Runs convex-test integration tests (`pnpm test:integration`). Note: convex-test may require additional setup—configure as recommended by Convex docs.
- Add npm scripts in `package.json`:
  - "test:unit": "vitest"
  - "test:integration": "convex-test run" (or appropriate command)

Migration & backwards compatibility notes

- Rolling out `pairKey` and new indexes:
  1. Add `pairKey` and indexes to schema and update insertion code paths to write `pairKey` for new rows.
  2. Deploy wrapper that supports both old getSmashByWordPair (fallback to scan) and new index-backed lookup.
  3. Backfill `pairKey` for existing rows using a migration script `convex/migrations/backfillPairKey.ts` run once against the DB. See [`todos/convex_reorganisation.md:73`](todos/convex_reorganisation.md:73).

- Avoid large atomic migrations; run backfills using pagination to keep memory use low.

Example helper signatures (suggested)

- pairKey util
```ts
export function pairKey(a: string, b: string): string;
```

- overlap generator
```ts
export function findOverlaps(words: string[], minOverlap: number, maxOverlap: number): Candidate[];
```

- AI client interface
```ts
export type AiClient = {
  searchContext: (word: string, category: string) => Promise<string | null>;
  generateClue: (params: { word: string; category: string; context: string | null }) => Promise<string>;
};
```

Checklist (to use as a series of PRs)

- [ ] Fix self-comparison bug in [`convex/smashCompiler.ts:151`](convex/smashCompiler.ts:151) and add unit tests.
| - [ ] Add `pairKey` to schema and index it; update inserts to write `pairKey`.
| - [ ] Replace `.filter` lookups with index-backed queries in [`convex/smashDbOps.ts:231`](convex/smashDbOps.ts:231).
| - [ ] Refactor `generateSmashes` overlap algorithm into pure helper and add unit tests.
| - [ ] Centralize AI clients into `convex/shared/aiClient.ts:1` and add `convex/test-utils/mockAiClient.ts:1`.
| - [ ] Add unit tests for parsing/sanitization.
| - [ ] Add convex-test integration tests for generate/compile/AI flows.
| - [ ] Add CI workflow and npm test scripts.

Final notes

- The reorganisation plan in [`todos/convex_reorganisation.md:19`](todos/convex_reorganisation.md:19) aligns with the architecture changes recommended here; follow it to keep changes incremental and test-first.
---