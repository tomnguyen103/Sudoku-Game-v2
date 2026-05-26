# Sudoku Solver Visualizer - Project Guide

## What This Project Is

A browser-based Sudoku backtracking visualizer deployed as a static site on Netlify. It generates solvable Sudoku layouts for Easy, Medium, and Hard, then lets the user animate or immediately finish the backtracking solve.

## Tech Stack

- **Local Tailwind browser runtime** (`vendor/tailwindcss.js`) - styling and dark mode without a build step
- **Local Alpine.js** (`vendor/alpine.min.js`) - reactive visualizer state
- **Vanilla JS modules** (`src/`) - solver, generator, and visualizer state
- **Node assert tests** - logic and project setup checks
- **Playwright smoke test** - browser workflow coverage

No bundler is required. `package.json` exists for repeatable local checks.

## File Structure

```text
index.html              <- markup + Alpine x-data root + local scripts + PWA meta tags
style.css               <- Sudoku grid borders, responsive board sizing, and compact mobile controls
src/solver.js           <- validation, solvePuzzle, countSolutions, and trace builders
src/generator.js        <- generateSolution, shuffleBoard, removeClues, generateTestPuzzle
src/visualizer.js       <- sudokuGame() Alpine state and playback controls
game.js                 <- CommonJS compatibility export for tests
vendor/                 <- local Tailwind and Alpine runtime scripts
manifest.json           <- PWA manifest
sw.js                   <- service worker cache-first asset list
icons/                  <- PWA icons
tests/                  <- logic, setup, and browser smoke tests
docs/release-checklist.md <- release checklist
```

## Key Decisions

- **App mode:** pure solver visualizer. Manual Sudoku play, mistakes, undo, erase, timer, personal bests, and win/game-over overlays are intentionally removed.
- **Selectable algorithm:** the Algorithm `<select>` chooses which solving algorithm the visualizer animates: `Backtracking DFS`, `Backtracking + MRV`, `Constraint Propagation`, `Human Logic Solver`, or `Human Logic Solver v2`. The visualizer maps `selectedAlgorithm` to a trace builder via `TRACE_BUILDERS` / `_buildTrace()`, used by both `runSolver` and `finishNow`. All builders share the same `{ solved, steps, solvedBoard }` contract. Backtracking/MRV emit `place`/`backtrack`; Constraint Propagation emits `propagate`, `guess`, `contradiction`; Human Logic emits `human-place` and `human-eliminate` with named strategies. V1 includes Naked Single, Hidden Single, and Naked Pair. V2 adds Hidden Pair, Pointing Pair/Triple, and Box-Line Reduction. Snapshot-based algorithms carry a `snapshot` (9x9 arrays of remaining candidate digits), rendered as pencil marks via `cellCandidates()`. The stat tiles relabel per algorithm via `statLabelPrimary/Secondary` and `statValuePrimary/Secondary`.
- **Current layout:** Easy / Medium / Hard load a generated test puzzle via `generateTestPuzzle(difficulty)`. The current layout stays fixed until difficulty changes or the user clicks `New Puzzle`.
- **Responsive layout:** The desktop sidebar width is set to `lg:w-[21.5rem]` (344px) so that the 4 status cards (Primary Stat, Secondary Stat, Solving Time, and Compute Time) align beautifully in a single, highly legible horizontal row. The sidebar height matches the board height (`lg:h-[40.375rem]`), and the status panel stretches (`lg:flex-1 lg:flex lg:flex-col lg:justify-between`) to space out elements and frame the board perfectly. To align all descriptions and numbers, `.stat-label` has a fixed height (`1.75rem` on desktop, `1.5rem` on mobile) and is flex-centered. In stacked tablet/browser widths, the board and controls left-align with the title. On mobile (`max-width: 639px`), the board fills the full content width via `--sudoku-board-size: calc(100vw - 1rem)` (symmetric 8px gutters); the 3-column mobile grid override is removed so all 4 cards naturally occupy a single row of 4 columns, with compact card paddings (`0.3rem 0.25rem`) and text sizes (`0.5rem` label / `0.8125rem` value) for a clean, non-wrapping mobile display.
- **Visualizer start:** layout generation happens before display, but the algorithm does not animate until `Run Algorithm`.
- **Solving Time:** counts the visualized run time. It starts when `Run Algorithm` is clicked, pauses when `Pause` is clicked, resumes on continue, and `Finish Now` projects it to selected-speed completion. This is the viewer-facing animation/run duration.
- **Compute Time:** measures actual trace-generation compute time around `_buildTrace()` using `performance.now()` (or `Date.now()` fallback). It is independent of animation speed and should be used for raw algorithm comparison.
- **Finish Now:** skips the remaining animation wait. It recomputes the current algorithm trace, records measured compute duration, adds the remaining selected-speed trace duration to Solving Time, fills all cells when solved, advances the step count to the end of the computed trace, and marks the state as `solved` or `stuck`.
- **Solvability preflight:** generated layouts are validated with `isSolvableLayout(board)` and uniqueness is checked with `countSolutions(board, 2)`.
- **Difficulty = empty cells:** Easy 36 / Medium 46 / Hard 52.
- **Dark mode:** toggled with the `dark` class on `<html>`, persisted in `localStorage`.
- **PWA:** `manifest.json` + `sw.js` pre-cache static assets. Bump the service-worker cache name and query strings when runtime assets change.
- **Coordinate convention:** `row` is 0-8 top to bottom; `col` is 0-8 left to right.

## Workflow

Run all checks:

```bash
npm test
npm run test:smoke
```

Before deploying, follow [`docs/release-checklist.md`](docs/release-checklist.md).

## Documentation Rules

- **Update `implementation-notes.md` while implementing anything.** Any feature, fix, workflow change, or notable tradeoff should be logged as part of the implementation work, not postponed until after the code is done.
- **Before every GitHub push request, re-check `CLAUDE.md` and `implementation-notes.md`.** Update them first if the implementation, workflow, file structure, cache/deploy process, or key decisions changed.

## Pre-Push Checklist (required before every `git push`)

1. **Update `implementation-notes.md`** — Log any decision, tradeoff, workaround, or change that wasn't in the original spec. Include: what changed, why, and what the tradeoff was. Use the existing section structure (date heading + bullet decisions). This should already be maintained during implementation; still re-check it before pushing.

2. **Update `CLAUDE.md`** — If anything in this file is now stale or missing (new files added, key decisions changed, workflow steps added), update it before pushing. This file is the source of truth for future sessions.

3. **Bump SW cache** — If any file listed in `sw.js` ASSETS was modified, increment the `CACHE` version string (e.g. `sudoku-v14` → `sudoku-v15`) and update the matching `?v=` query strings in `index.html`.

4. **Run tests** — `npm test && npm run test:smoke` must pass before pushing.

These steps must happen in this order: update docs → bump cache if needed → run tests → push.

## Deployment

Connect the GitHub repo to Netlify. No build output directory is needed; Netlify serves `index.html` from the repository root.

## Documentation

Implementation notes: [`implementation-notes.md`](implementation-notes.md)

Algorithm explanations and comparison: the README "Solving Algorithms" and "Algorithm Comparison" sections ([`README.md`](README.md)) document each implemented algorithm and candidate future algorithms.

Original design spec: [`docs/superpowers/specs/2026-05-23-sudoku-game-design.md`](docs/superpowers/specs/2026-05-23-sudoku-game-design.md)
