# SmashADay

A daily word puzzle game where players combine two words into a single creative "smash" using two clues. A new challenge appears each day.

Quick links

- Code: [`package.json`](package.json:1)
- Schema: [`convex/schema.ts`](convex/schema.ts:1)
- App entry: [`src/App.tsx`](src/App.tsx:1)
- Header component: [`src/components/Header.tsx`](src/components/Header.tsx:1)

Contents

- About
- Requirements
- Install & run
- Archive feature
- Scripts
- Project layout
- How it works
- Database schema
- Development & tooling
- Contributing
- License

About

SmashADay challenges players to identify a portmanteau ("smash") made from two source words or phrases using two clues.

Example:

"Driving Home For Christmas" (Chris Rea) + "React (the web framework)" → Chris Rea + ct = "Chris React"

Requirements

- Node.js v18+
- npm or pnpm
- A Convex account to run the backend locally (optional: run `convex dev`)

Install & run (local)

1. Clone the repo:

```bash
git clone <repository-url>
cd smashaday
```

2. Install dependencies:

```bash
npm install
```

3. Create a local env file for frontend keys:

Create `.env.local` and add:

```
VITE_CLERK_PUBLISHABLE_KEY=<your-publishable-key>
```

4. Convex / Clerk integration:

- In the Convex dashboard, set `CLERK_JWT_ISSUER_DOMAIN` to your Clerk issuer URL.

Start dev

```bash
npm run dev
```

The `dev` script runs Vite and `convex dev` in parallel. Vite typically opens at http://localhost:5173.

Archive feature

The app now includes an Archive page where signed-in users can browse past daily challenges and play them in-place.

- Route: `#/archive` (client-side hash route) — added in [`src/App.tsx`](src/App.tsx:1)
- Frontend: [`src/components/Archive.tsx`](src/components/Archive.tsx:1) — list view with pagination and responsive grid, opens archived challenge in-place using the Game component.
- Game changes: [`src/components/Game.tsx`](src/components/Game.tsx:1) now accepts archive props to load a specific daily challenge by its canonical date (YYYY-MM-DD).
- Header link: archive is accessible via the main header [`src/components/Header.tsx`](src/components/Header.tsx:1).

Usage (as a user)

1. Visit the Archive at `#/archive`.
2. If you are not signed in, you'll be prompted to Sign In or Sign Up. Archive browsing and play require authentication.
3. Once signed in, the Archive shows up to 10 items per page with Next / Previous controls. Click an item to open it in the Game view and play the archived challenge.
4. If you have a previously saved score for that challenge it will display as "Your score: N". If you complete the run and you had no prior score, your score will be saved via the existing mutation.

Notes for maintainers

- Dates in the database are canonical ISO strings in YYYY-MM-DD (see [`convex/schema.ts`](convex/schema.ts:1) — `daily_challenges.date`).
- UI displays dates in British format (DD/MM/YYYY) using `toLocaleDateString('en-GB')` in [`src/components/Archive.tsx`](src/components/Archive.tsx:1) and the app homepage.
- Scores are saved with the existing mutation: [`convex/saveDailyScores.ts`](convex/saveDailyScores.ts:1).

Backend APIs

- `getDailyChallenges` — added to [`convex/queries.ts`](convex/queries.ts:1). It returns a paginated list of past challenges ordered newest-first. Response shape:
  ```ts
  { challenges: Array<{ id: string, date: string, challengeId?: string, title?: string }>, nextCursor?: string }
  ```
  Pagination uses Convex's cursor pagination; pass `limit` (max 10) and optional `cursor`.

- `getUserScores` — added to [`convex/users.ts`](convex/users.ts:1). Given a Clerk user id it returns:
  ```ts
  { challengeScores: Record<string, number> }
  ```

Frontend notes (developer)

- The Archive list uses `getDailyChallenges` (limit=10) and manages a cursor stack to implement Previous / Next navigation. See [`src/components/Archive.tsx`](src/components/Archive.tsx:1).
- When opening an archived challenge the Archive passes the canonical date string (YYYY-MM-DD) into the Game component via props (archive=true, archiveChallengeId=<YYYY-MM-DD>).
- The Game component then queries [`convex/queries.getDailyChallengeByDate`](convex/queries.ts:1) to load the `daily_challenges` document for that date and renders the same gameplay UI as the live daily challenge.
- Hook stability: Convex hooks are always called with either real arguments or `"skip"` to keep hook ordering stable.

Accessibility & UX

- Archive list items are keyboard-focusable and respond to Enter/Space to open.
- Loading and error states are shown while fetching; auth prompts are clearly presented for unauthenticated users.

Important scripts

See [`package.json`](package.json:1) for the definitive list. Most-used commands:

- `npm run dev` — frontend + backend in parallel
- `npm run dev:frontend` — Vite only
- `npm run dev:backend` — Convex dev only
- `npm run build` — TypeScript build + Vite build
- `npm run lint` — Type-check + ESLint

Project layout (short)

- `convex/` — Convex schema, queries, mutations, crons (see [`convex/schema.ts`](convex/schema.ts:1))
- `src/` — React app source (`src/App.tsx`, `src/components/`)
- `src/components/Archive.tsx` — archive page (new)
- `public/` — static assets

How it works (high level)

1. A daily challenge document is created in `daily_challenges` with a date and `dailySmashes` IDs.
2. Clients query the day's smashes and render the two words with two clues.
3. Players submit answers; acceptance uses fuzzy matching (Levenshtein distance) to allow reasonable variants.
4. Scores and progress are stored in Convex tables keyed to users and challenges.

Database schema (summary)

See [`convex/schema.ts`](convex/schema.ts:1) for the full schema. Primary tables:

- `smashes` — word1, word2, category1, category2, smash, clue1, clue2. Indexed by `smash` and `category1`.
- `daily_challenges` — `date` (YYYY-MM-DD) and `dailySmashes` (array of smash ids).
- `users` — user metadata, `externalId` stores Clerk id, `challengeScores` record.
- `wordsDb` / `categories` — word pools used to generate smashes; clues and status stored on `wordsDb`.

Development & tooling

- TypeScript-first project. Run `npm run lint` to type-check and lint.
- ESLint + Prettier configure formatting and lint rules.
- Convex dev: run `convex dev` to run backend functions locally. Scheduled jobs live in [`convex/crons.ts`](convex/crons.ts:1).

Word generation (AI)

The repo contains Convex actions that generate words for categories using an LLM (see [`convex/generateWords.ts`](convex/generateWords.ts:1)).

To run word generation:

- Add `OPENROUTER_API_KEY` (or your LLM API key) to the Convex environment if required.
- Run:

```bash
npx convex run generateWords:generateWords
```

The action will:

- Find categories that need words
- Request batches of words/phrases from the configured LLM
- Store results to `wordsDb` with retry/fallback logic

Notes & gotchas

- Authentication depends on Clerk. Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set locally and Convex has the `CLERK_JWT_ISSUER_DOMAIN`.
- Fuzzy matching uses `fastest-levenshtein` (see [`package.json`](package.json:1)).
- Admin view is available via a hash route `#admin` in [`src/App.tsx`](src/App.tsx:1).

Changelog - Archive feature

- Added backend queries: [`convex/queries.ts`](convex/queries.ts:1) -> `getDailyChallenges`; [`convex/users.ts`](convex/users.ts:1) -> `getUserScores`.
- Frontend: new archive page [`src/components/Archive.tsx`](src/components/Archive.tsx:1); Game updated [`src/components/Game.tsx`](src/components/Game.tsx:1); Header link [`src/components/Header.tsx`](src/components/Header.tsx:1); route wired in [`src/App.tsx`](src/App.tsx:1).
- Pagination: cursor-based (Convex `paginate()`).
- Dates: canonical storage YYYY-MM-DD; UI displays DD/MM/YYYY.
- Score saving: uses existing mutation [`convex/saveDailyScores.ts`](convex/saveDailyScores.ts:1); frontend avoids duplicate saves when possible.
- "Today's" challenge is hidden by default in archive as it's accessible from the front page.

Testing notes:

- To test archive locally: run `npm run dev`, visit `http://localhost:5173/#/archive`, sign in with Clerk, navigate pages, open a challenge, complete run and verify score saved.

Developer notes:

- If you intend to add deep-links per challenge later, route convention could be `#/archive/YYYY-MM-DD`.

Contributing

- Open issues or PRs for bugs, docs, or features.
- Ensure `npm run lint` passes and types compile.
- Keep UI accessible and responsive; styling uses Tailwind + daisyUI.

License

MIT — fan-created puzzle inspired by Answer Smash (Richard Osman's House of Games).

TODO

- migration - all words in wordsDb to lowercase