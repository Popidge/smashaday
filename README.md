# SmashADay

SmashADay is a daily word puzzle that challenges players to identify a portmanteau ("smash") formed from two source words or phrases using two clues. Each day provides a new 10-question challenge. Players can play the live daily challenge or, when signed in, browse and replay archived challenges.

Quick links
- Manifest: [`package.json`](package.json:1)
- Convex schema: [`convex/schema.ts`](convex/schema.ts:1)
- App entry: [`src/App.tsx`](src/App.tsx:1)
- Main game UI: [`src/components/Game.tsx`](src/components/Game.tsx:1)
- Archive UI: [`src/components/Archive.tsx`](src/components/Archive.tsx:1)

Table of contents
- What this project does
- Features
- Requirements
- Local quickstart
- Environment variables
- Useful scripts
- Architecture & important files
- Archive behavior (brief)
- Backend: word generation & Convex notes
- Testing & debugging
- Contributing
- License

What this project does
- Shows one 10-question daily challenge built from entries in the Convex database.
- Accepts answers with fuzzy matching (Levenshtein) so minor spelling variants are allowed.
- Saves per-user scores (requires Clerk authentication).
- Provides an Archive page to browse and play past challenges (signed-in users only).
- Uses Convex functions and scheduled jobs to manage daily challenges and LLM-assisted word generation.

Features
- Responsive React frontend (Vite + Tailwind + daisyUI).
- Convex backend: typed schema, queries, mutations, crons.
- Clerk for authentication (optional for local dev but required to save scores / use archive).
- LLM-based word/clue generation (configurable via Convex environment).
- Admin and archive routes (client-side hash routing).

Requirements
- Node.js v18+
- npm or pnpm
- Convex CLI for local backend (https://convex.dev/docs)
- Optional: Clerk account + publishable key (for sign-in) and an LLM API key for word generation

Local quickstart
1. Clone and install
   git clone <repository-url>
   cd smashaday
   npm install

2. Add a minimal frontend env:
   Create `.env.local` with:
   VITE_CLERK_PUBLISHABLE_KEY=<your-publishable-key>

3. Configure Convex (dashboard)
   - Set `CLERK_JWT_ISSUER_DOMAIN` to your Clerk issuer domain if you use Clerk locally.
   - Add any LLM API key environment variables needed by Convex actions (e.g. `OPENROUTER_API_KEY`).

4. Run dev environment
   npm run dev
   - This runs Vite and `convex dev` in parallel. Frontend usually opens at http://localhost:5173.

Environment variables (important)
- VITE_CLERK_PUBLISHABLE_KEY — Clerk publishable key for frontend sign-in
- CLERK_JWT_ISSUER_DOMAIN — Clerk issuer (Convex environment, for token verification)
- OPENROUTER_API_KEY (or equivalent) — LLM API key in Convex environment for word generation

Useful scripts
- npm run dev — frontend + backend locally
- npm run dev:frontend — Vite only
- npm run dev:backend — Convex dev only
- npm run build — TypeScript build + Vite build
- npm run lint — Type-check + ESLint

Architecture & important files
- Frontend
  - Entry: [`src/App.tsx`](src/App.tsx:1)
  - Game UI: [`src/components/Game.tsx`](src/components/Game.tsx:1)
  - Archive UI: [`src/components/Archive.tsx`](src/components/Archive.tsx:1)
  - Header / Footer / Admin components: `src/components/`

- Backend (Convex)
  - Schema: [`convex/schema.ts`](convex/schema.ts:1)
  - Queries & helper functions: [`convex/queries.ts`](convex/queries.ts:1)
  - User helpers: [`convex/users.ts`](convex/users.ts:1)
  - Score save mutation: [`convex/saveDailyScores.ts`](convex/saveDailyScores.ts:1)
  - Word generation (LLM): [`convex/generateWords.ts`](convex/generateWords.ts:1)
  - Scheduled jobs: [`convex/crons.ts`](convex/crons.ts:1)

Database overview
See [`convex/schema.ts`](convex/schema.ts:1) for full definitions. Key tables:
- `smashes` — word1, word2, category1, category2, smash, clue1, clue2 (+ indexes)
- `daily_challenges` — `date` (YYYY-MM-DD) and `dailySmashes` (array of smash ids)
- `users` — name and `externalId` (Clerk ID)
- `wordsDb` — candidate words/phrases, clue text and enrichment status
- `user_scores` — per-user per-challenge scores (indexed by user & challenge)

Archive behavior (summary)
- Route: `#/archive` (client-side hash routing configured in [`src/App.tsx`](src/App.tsx:1)).
- Archive lists past daily challenges with cursor-based pagination (Convex `.paginate()`).
- Clicking an item opens the Game UI and loads the challenge by its canonical date (YYYY-MM-DD).
- Playing/saving archived challenge scores requires signin; the frontend avoids duplicate saves if a score already exists.

Backend: word generation & Convex notes
- Word/clue generation is handled by Convex actions that call an LLM and write results to `wordsDb` and related tables.
- Manual run:
  npx convex run generateWords:generateWords
- Convex functions follow typed validators; check [`convex/schema.ts`](convex/schema.ts:1) for types and indexes.

Testing & debugging
- Run the full stack: npm run dev
- Archive flows require Clerk sign-in (configure `VITE_CLERK_PUBLISHABLE_KEY`).
- Fuzzy matching uses `fastest-levenshtein` (see [`package.json`](package.json:1)).
- Admin/debug routes: `#admin` (client hash route), and Convex manual tests live in `convex/manualTests/`.

Contributing
- Open issues or PRs for bugs, docs, or features.
- Ensure `npm run lint` passes and TypeScript compiles cleanly.
- Follow the project's accessibility and UI patterns (Tailwind + daisyUI).

License
MIT — fan-created puzzle inspired by Answer Smash.

References (quick)
- [`package.json`](package.json:1)
- [`convex/schema.ts`](convex/schema.ts:1)
- [`src/App.tsx`](src/App.tsx:1)
- [`src/components/Game.tsx`](src/components/Game.tsx:1)
- [`src/components/Archive.tsx`](src/components/Archive.tsx:1)
- [`convex/generateWords.ts`](convex/generateWords.ts:1)
- [`convex/queries.ts`](convex/queries.ts:1)
- [`convex/saveDailyScores.ts`](convex/saveDailyScores.ts:1)
- [`convex/users.ts`](convex/users.ts:1)