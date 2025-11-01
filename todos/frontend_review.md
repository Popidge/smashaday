# Frontend Review — Annotated Implementation Plan

Overview
- Purpose: Turn the findings from the frontend code review into a prioritized, actionable plan with concrete implementation steps, file references and estimated effort.
- Scope: Only frontend in `src/` and related client entry points. No backend edits.
- Output: This document lists high/medium/low priority tasks, implementation notes, and testing/rollout guidance.

High-priority fixes (blockers)
1) Remove / mitigate XSS via dangerouslySetInnerHTML
   - Problem: `dangerouslySetInnerHTML` used to render highlighted portmanteau in the game UI: [`src/components/Game.tsx`](src/components/Game.tsx:329).
   - Why urgent: Any DB/or server-supplied string rendered as HTML is a potential XSS vector.
   - Implementation options:
     a) Prefer returning React nodes (JSX) from the util rather than HTML strings:
        - Change `highlightPortmanteau(...)` to return JSX fragments (e.g., <span>...<em>...</em>...), and update usage accordingly.
        - Files: [`src/lib/utils.ts`](src/lib/utils.ts:1) (where helpers live) and [`src/components/Game.tsx`](src/components/Game.tsx:329).
     b) If HTML is required, sanitize the output server-side or client-side using a vetted sanitizer (DOMPurify) before passing to dangerouslySetInnerHTML.
        - Add a small wrapper sanitizeHtml(html) used when rendering.
   - Concrete steps:
     1. Inspect `highlightPortmanteau` implementation in [`src/lib/utils.ts`](src/lib/utils.ts:1).
     2. Refactor it to return JSX nodes. Update its export signature and callers (Game).
     3. Remove dangerouslySetInnerHTML usage at [`src/components/Game.tsx`](src/components/Game.tsx:329) and render returned JSX.
   - Estimated effort: 2–3 dev hours (small refactor + unit tests).
   - Tests: Unit tests for `highlightPortmanteau` verifying special characters are escaped and rendered as nodes.

2) External link hardening (target="_blank" safety)
   - Problem: ErrorBoundary contains a link opened with `target="_blank"` without `rel` attributes at [`src/ErrorBoundary.tsx`](src/ErrorBoundary.tsx:40).
   - Risk: window.opener attacks and leaking of referrer.
   - Implementation:
     - Add `rel="noopener noreferrer"` to any anchor that uses `target="_blank"`.
     - Search for any other uses of `target="_blank"` across src/ and public/ and fix.
   - Concrete steps:
     1. Edit [`src/ErrorBoundary.tsx`](src/ErrorBoundary.tsx:40) to add rel attribute.
     2. Run a repo-wide grep for `target="_blank"` and patch occurrences.
   - Estimated effort: 15–30 minutes.
   - Tests: Visual smoke test, linter check (if rule enforced).

3) ErrorBoundary logging & recovery UX
   - Problem: `componentDidCatch()` is empty at [`src/ErrorBoundary.tsx:55`]. Current fallback shows raw error text.
   - Implementation:
     - Implement `componentDidCatch(error, info)` to:
       - Send sanitized error + stack to a logging endpoint (Sentry, console in dev).
       - Add a "Reload" or "Retry" button to the fallback UI to aid recovery.
     - Ensure sensitive data is not leaked in production — show minimal UI to users in prod.
   - Files: [`src/ErrorBoundary.tsx`](src/ErrorBoundary.tsx:1).
   - Estimated effort: 1–2 hours.
   - Tests: Simulate an error and confirm logging triggers and fallback UI shows.

Medium-priority fixes (stability & maintainability)
4) Compose Convex queries for the Game load path
   - Problem: Multiple related Convex queries are fired separately in `Game`:
     - `getDailyChallengeByDate` at [`src/components/Game.tsx:26`],
     - `getChallengeNumber` at [`src/components/Game.tsx:27`],
     - `getSmashById` at [`src/components/Game.tsx:46`].
   - Benefit: One server-side composed query reduces latency, simplifies loading logic and reduces inconsistent partial loads.
   - Implementation:
     - Create a single Convex query (server-side) that returns: challenge, challengeNumber, and an array or mapping of smashes for the first N indexes.
     - Replace client queries with a single `useQuery` call.
   - Files:
     - Server: `convex/queries.ts` (or similar) — create `getFullDailyChallenge`.
     - Client: Modify [`src/components/Game.tsx`](src/components/Game.tsx:26) to call the new composed query.
   - Estimated effort: 3–6 hours (server change + client update + testing).
   - Tests: Integration test for load path and e2e timing check.

5) Tighten TypeScript types in Archive/Admin
   - Problem: `any` used for challenge objects in Archive (`visibleChallenges.map((challenge: any) => ...)` at [`src/components/Archive.tsx:105`]) and other places.
   - Implementation:
     - Define client-side types aligned with Convex's generated dataModel (`convex/_generated/dataModel.d.ts`) and annotate query returns.
     - Replace `any` with proper types, add a few helper type-guards if necessary.
   - Files: [`src/components/Archive.tsx`](src/components/Archive.tsx:12), [`src/components/Admin.tsx`](src/components/Admin.tsx:7), and `src/lib/types.ts` (optional).
   - Estimated effort: 2–4 hours.

6) Improve clipboard UX and feature detection
   - Problem: `copyShareSummary` uses `navigator.clipboard.writeText` and then `alert()` at [`src/components/Game.tsx:93`].
   - Implementation:
     - Wrap clipboard calls in try/catch and check `navigator.clipboard` availability.
     - Replace `alert` with non-blocking toast/snackbar or inline status text.
   - Files: [`src/components/Game.tsx`](src/components/Game.tsx:93).
   - Estimated effort: 1–2 hours.

Low-priority / polish
7) Replace href="#" with explicit routing handlers
   - Concern: `href="#"` links in header (e.g. [`src/components/Header.tsx:125`](src/components/Header.tsx:125)) cause top-of-page jumps and are brittle.
   - Implementation:
     - Prevent default on these anchors and either:
       - Use hash navigation consistently (href="#home") and handle it, or
       - Convert to a small client-side route state (`setCurrentPage`) used in `App`.
     - Files: [`src/components/Header.tsx`](src/components/Header.tsx:125), [`src/App.tsx`](src/App.tsx:12).
   - Estimated effort: 1–2 hours.

8) Fonts and critical CSS loading
   - Problem: Fonts loaded via `@import` in CSS: [`src/index.css:1`](src/index.css:1). This can block rendering.
   - Implementation:
     - Move Google Fonts link into `index.html` with `<link rel="preconnect">` and `rel="stylesheet">`, adding `display=swap` for improved UX.
     - Alternatively, use `font-display: swap` in a local @font-face if self-hosting.
   - Estimated effort: 30–60 minutes.

9) Accessibility pass
   - Items:
     - Ensure color contrast for themes (check oklch tokens in [`src/index.css`](src/index.css:165+)).
     - Add skip-to-content link in header.
     - Add aria-live regions for pagination changes in Archive.
   - Estimated effort: 2–4 hours.

Developer experience & tests
10) Unit tests for utils
    - Add tests for `validateAnswer`, `titleCase`, `highlightPortmanteau`, `cn` in `src/lib/utils.ts`.
    - Use Vitest or Jest depending on project setup.
    - Estimated effort: 2–4 hours.

11) Integration / e2e tests for Game flow
    - Add an integration test that mocks Convex responses and validates the full 10-question flow, saving score, and share copy functionality.
    - Consider Playwright for a simple e2e test that asserts keyboard navigation works.
    - Estimated effort: 6–10 hours for initial tests.

Implementation checklist (ordered)
- [X] High: Replace dangerouslySetInnerHTML usage by refactoring `highlightPortmanteau` to return JSX nodes (or sanitize). - DONE, PR #5
  - Files: [`src/lib/utils.ts`](src/lib/utils.ts:1), [`src/components/Game.tsx`](src/components/Game.tsx:329).
- [x] High: Add `rel="noopener noreferrer"` to external links with `target="_blank"`.
  - Files: [`src/ErrorBoundary.tsx`](src/ErrorBoundary.tsx:40).
- [ ] High: Implement `componentDidCatch` logging + UI recovery in ErrorBoundary.
  - Files: [`src/ErrorBoundary.tsx`](src/ErrorBoundary.tsx:55).
- [ ] Medium: Compose Convex queries for Game load path server-side. Update client to single query.
  - Files: `convex/queries.ts`, [`src/components/Game.tsx`](src/components/Game.tsx:26).
- [ ] Medium: Replace `any` with accurate types in Archive/Admin.
  - Files: [`src/components/Archive.tsx`](src/components/Archive.tsx:12), [`src/components/Admin.tsx`](src/components/Admin.tsx:7).
- [ ] Medium: Improve clipboard UX and detection in Game.
  - Files: [`src/components/Game.tsx`](src/components/Game.tsx:93).
- [ ] Low: Replace `href="#"` usage, add better SPA routing semantics or preventDefault.
  - Files: [`src/components/Header.tsx`](src/components/Header.tsx:125), [`src/App.tsx`](src/App.tsx:12).
- [ ] Low: Move font loading strategy to index.html or enable font-display.
  - Files: [`src/index.css`](src/index.css:1), `index.html`.
- [ ] Low: Accessibility pass (contrast, skip link, aria-live).
  - Files: [`src/index.css`](src/index.css:165), [`src/components/Archive.tsx`](src/components/Archive.tsx:101).
- [ ] Dev: Add unit and e2e tests.
  - Files: `tests/` (new), `vitest.config.ts` (if needed).

Estimates & rough timeline (single developer)
- Immediate safety fixes (XSS + rel + ErrorBoundary logging): 1–2 days.
- Compose queries + types: 1–2 days.
- Tests + accessibility pass: 1–2 days.
- Total (end-to-end): ~4–6 days to deliver with adequate tests and review.

Rollout and verification
- Create a feature branch for each high-level task (e.g., `fix/xss-highlight`, `perf/compose-game-query`).
- Add unit tests first for utils before refactor to make behavior explicit.
- Run manual QA on:
  - Game: full flow on desktop + mobile.
  - Archive: pagination and keyboard accessibility.
  - Admin: category / word insertion flows and error handling.
- After changes, measure initial load: ensure no regression in perceived load-time when font loading or query composition changes occur.

Notes and references
- XSS: Replace usage at [`src/components/Game.tsx:329`](src/components/Game.tsx:329) — highest priority.
- External links: patch [`src/ErrorBoundary.tsx:40`](src/ErrorBoundary.tsx:40).
- Compose queries: target client load calls beginning at [`src/components/Game.tsx:26`](src/components/Game.tsx:26).
- Type tightening: replace `any` at [`src/components/Archive.tsx:105`](src/components/Archive.tsx:105).

If you want I can:
- generate the exact code diffs for the HIGH priority items,
- or create test scaffolding and example unit tests for `highlightPortmanteau` and `validateAnswer`.
