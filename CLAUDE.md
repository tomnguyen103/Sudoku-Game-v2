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
src/solver.js           <- validation, solvePuzzle, countSolutions, createBacktrackingTrace, createMrvTrace
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
- **Selectable algorithm:** the Algorithm `<select>` chooses which solving algorithm the visualizer animates. Two exist today: `Backtracking DFS` (`createBacktrackingTrace`) and `Backtracking + MRV` (`createMrvTrace`, picks the empty cell with the fewest legal candidates each step). The visualizer maps `selectedAlgorithm` to a trace builder via `TRACE_BUILDERS` / `_buildTrace()`, used by both `runSolver` and `finishNow`. Both builders share the same `{ solved, steps, solvedBoard }` contract and `place`/`backtrack` step events, so no render changes are needed per algorithm. Changing the algorithm calls `setAlgorithm()`, which resets the current trace (it belongs to the previous algorithm) and returns to `ready`. A README "Algorithm Comparison" table documents other candidate algorithms for future additions.
- **Current layout:** Easy / Medium / Hard load a generated test puzzle via `generateTestPuzzle(difficulty)`. The current layout stays fixed until difficulty changes or the user clicks `New Puzzle`.
- **Responsive layout:** The desktop board grows to match the control/status column height. In stacked tablet/browser widths, the board and controls left-align with the title. On mobile (`max-width: 639px`), the board fills the full content width via `--sudoku-board-size: calc(100vw - 1rem)` (symmetric 8px gutters); controls compact below it. The board is intentionally width-driven, not height-driven — an earlier `svh`-based clamp shrank the board well below the screen width because real iOS Safari reduces `svh` with its chrome. Consequence: the controls may sit below the fold and require a short vertical scroll on phones (full-width board is prioritized over single-screen fit).
- **Visualizer start:** layout generation happens before display, but the algorithm does not animate until `Run Algorithm`.
- **Solving Time:** counts only algorithm playback time. It starts when `Run Algorithm` is clicked, pauses when `Pause` is clicked, resumes on continue, and stops once the puzzle is solved.
- **Finish Now:** skips the remaining user wait time while preserving selected-speed algorithm time. It solves the current layout, adds the remaining trace duration using the selected playback speed, fills all cells, advances the step count to the end of the computed trace, and marks the state as `solved`.
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

## Pre-Push Checklist (required before every `git push`)

1. **Update `implementation-notes.md`** — Log any decision, tradeoff, workaround, or change that wasn't in the original spec. Include: what changed, why, and what the tradeoff was. Use the existing section structure (date heading + bullet decisions).

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
