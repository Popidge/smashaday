# Convex reorganisation plan & test strategy

This document defines the concrete steps to reorganise the Convex functions into per-entity folders, centralise shared helpers, and introduce a testing strategy using Convex's test harness (vitest + convex-test). Follow the "Order of work" section for the recommended incremental migration approach.

Status: Draft — follow the step-by-step plan below when implementing.

## Goals
- Group functions by entity/table into per-entity folders for discoverability and ownership.
- Split by type: `queries`, `mutations`, `internalQueries`, `internalMutations`, `actions`, `utils`.
- Centralise shared helpers (LLM client, sanitizers).
- Add deterministic tests: unit tests for pure logic; integration tests with `convex-test` for DB semantics.
- Migrate incrementally with thin re-export wrappers to avoid breaking imports.

## Top-level rules
- Keep singletons at the Convex root: [`convex/schema.ts`](convex/schema.ts:1), [`convex/auth.config.ts`](convex/auth.config.ts:1), [`convex/http.ts`](convex/http.ts:1), [`convex/crons.ts`](convex/crons.ts:1).
- File names inside each entity folder should be: `queries.ts`, `mutations.ts`, `internalQueries.ts`, `internalMutations.ts`, `actions.ts`, `utils.ts`.
- Node-only LLM code must live in files containing `"use node";` and should be placed into `actions.ts` (or `ai.ts` helpers under the entity).

## Proposed directory layout (top-level)
- `convex/`
  - `_generated/`
  - `schema.ts`
  - `auth.config.ts`
  - `http.ts`
  - `crons.ts`
  - `categories/`
    - `queries.ts`
    - `mutations.ts` (contains [`convex/addCategories.ts`](convex/addCategories.ts:1))
    - `utils.ts`
  - `words/`
    - `queries.ts`
    - `mutations.ts`
    - `internalQueries.ts`
    - `internalMutations.ts`
    - `actions.ts` (contains [`convex/generateWords.ts`](convex/generateWords.ts:1))
    - `ai.ts` / `ai_utils.ts` (contains [`convex/clueGen.ts`](convex/clueGen.ts:1))
    - `utils.ts` (sanitize helpers)
  - `smashes/`
    - `queries.ts`
    - `internalQueries.ts`
    - `internalMutations.ts` (from [`convex/smashDbOps.ts`](convex/smashDbOps.ts:1))
    - `generate.ts` (contains [`convex/smashGen.ts`](convex/smashGen.ts:1))
    - `compiler.ts` (contains [`convex/smashCompiler.ts`](convex/smashCompiler.ts:1))
    - `utils.ts`
  - `daily_challenges/`
    - `queries.ts`
    - `internalMutations.ts` (contains [`convex/daily_challenge.ts`](convex/daily_challenge.ts:1))
  - `users/`
    - `queries.ts`
    - `mutations.ts` (contains [`convex/saveDailyScores.ts`](convex/saveDailyScores.ts:1))
    - `internalMutations.ts` (contains internals from [`convex/users.ts`](convex/users.ts:1))
    - `utils.ts`
  - `migrations/` (migrateWords, migrateUserScores)
  - `dev/` (seed scripts)
  - `shared/` (ai client wrapper, cross-cutting helpers)
  - `test-utils/` (convex-test harness, mocks)

## Concrete moves (current → target)
- [`convex/addCategories.ts`](convex/addCategories.ts:1) → `convex/categories/mutations.ts`
- [`convex/insertWords.ts`](convex/insertWords.ts:1) → split into:
  - `convex/words/utils.ts` (sanitize)
  - `convex/words/internalQueries.ts` (listCategoriesNeedingWords, listAllWordsDb)
  - `convex/words/mutations.ts` (insertSingleWord)
  - `convex/words/internalMutations.ts` (insertWords)
- [`convex/generateWords.ts`](convex/generateWords.ts:1) → `convex/words/actions.ts` ("use node")
- [`convex/clueGen.ts`](convex/clueGen.ts:1) → `convex/words/ai.ts` + `convex/words/ai_utils.ts`
- [`convex/smashDbOps.ts`](convex/smashDbOps.ts:1) → `convex/smashes/internalQueries.ts` & `convex/smashes/internalMutations.ts`
- [`convex/smashGen.ts`](convex/smashGen.ts:1) → `convex/smashes/generate.ts`
- [`convex/smashCompiler.ts`](convex/smashCompiler.ts:1) → `convex/smashes/compiler.ts`
- [`convex/queries.ts`](convex/queries.ts:1) → split into entity queries (`smashes/queries.ts`, `daily_challenges/queries.ts`, `categories/queries.ts`, `users/queries.ts`)
- [`convex/daily_challenge.ts`](convex/daily_challenge.ts:1) → `convex/daily_challenges/internalMutations.ts`
- [`convex/saveDailyScores.ts`](convex/saveDailyScores.ts:1) → `convex/users/mutations.ts`
- [`convex/users.ts`](convex/users.ts:1) → split into `convex/users/queries.ts`, `convex/users/internalMutations.ts`, `convex/users/utils.ts`
- [`convex/migrateWords.ts`](convex/migrateWords.ts:1) → `convex/migrations/words.ts`
- [`convex/migrateUserScores.ts`](convex/migrateUserScores.ts:1) → `convex/migrations/users.ts`
- [`convex/seed.ts`](convex/seed.ts:907) → `convex/dev/seed.ts`

## Test strategy (vitest + convex-test)
- Test types:
  - Unit tests (Vitest) for pure helpers (sanitizer, prefix-map builder).
  - Integration tests (convex-test) using a mocked Convex runtime for queries/mutations/actions.
  - AI action tests with a mock AI client (no real network calls).
- Test layout:
  - Place tests adjacent to code: `convex/<entity>/__tests__/`.
  - Keep deterministic fixtures in `convex/test-utils/fixtures/`.
- Mocking external APIs:
  - Centralize AI client in [`convex/shared/aiClient.ts`](convex/shared/aiClient.ts:1).
  - Provide [`convex/test-utils/mockAiClient.ts`](convex/test-utils/mockAiClient.ts:1) for tests.
- Example tests:
  - `convex/words/__tests__/utils.test.ts` — sanitizer unit tests.
  - `convex/smashes/__tests__/generate.integration.test.ts` — verify `generateSmashes` writes to `pendingSmashes`.
  - `convex/smashes/__tests__/compiler.integration.test.ts` — verify compiler inserts `smashes` and deletes `pendingSmashes`.

## Migration strategy (order)
Recommended incremental, test-first-ish approach:
1. Setup test harness + CI skeleton (vitest + convex-test).
2. Centralize shared helpers (`convex/words/utils.ts`) and add unit tests.
3. Migrate `smashes` (DB primitives, generate, compiler) and add integration tests.
4. Migrate `words` (LLM actions), use mock AI, add tests.
5. Migrate `daily_challenges` and add tests.
6. Migrate `users` & `categories` and add tests.
7. Move `migrations` & `dev` scripts.
8. Remove wrappers and cleanup, run full test & smoke tests.

## Practical migration mechanics
- Use thin re-export wrappers at original paths during migration to avoid breaking imports. Example: keep [`convex/smashDbOps.ts`](convex/smashDbOps.ts:1) temporarily and have it export from new files:
```ts
export * from "./smashes/internalQueries";
export * from "./smashes/internalMutations";
```
- Update callers one entity at a time in small PRs.
- Run unit tests locally and integration tests per entity.

## CI & quality
- Add GitHub Actions workflow `.github/workflows/ci.yml` to run:
  - Install deps
  - Run `pnpm test` (vitest)
  - Optional: lint
- Require green tests on PRs before removing wrappers.

## Deliverables checklist
- [ ] Test harness + vitest + convex-test config
- [ ] `convex/shared/aiClient.ts` + `convex/test-utils/mockAiClient.ts`
- [ ] `convex/words/utils.ts` + unit tests
- [ ] `convex/smashes/*` moved + integration tests
- [ ] `convex/words/*` moved + action tests (mock AI)
- [ ] `convex/daily_challenges/*` moved + tests
- [ ] `convex/users/*`, `convex/categories/*` moved + tests
- [ ] `convex/migrations/*`, `convex/dev/*` moved + tests
- [ ] Remove wrappers & cleanup
- [ ] CI pipeline green

## Notes & tips
- Keep LLM/network calls behind adapters for testability and to avoid hitting real APIs in CI.
- Make small, focused PRs and use the re-export wrapper pattern to keep the codebase runnable during migration.
---