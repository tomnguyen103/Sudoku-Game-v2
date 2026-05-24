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
style.css               <- Sudoku grid borders and fixed board sizing
src/solver.js           <- validation, solvePuzzle, countSolutions, createBacktrackingTrace
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
- **Current layout:** Easy / Medium / Hard load a generated test puzzle via `generateTestPuzzle(difficulty)`. The current layout stays fixed until difficulty changes or the user clicks `New Test`.
- **Visualizer start:** layout generation happens before display, but the algorithm does not animate until `Run Backtracking Algorithm`.
- **Finish Now:** solves the current layout immediately, fills all cells, advances the step count to the end of the computed trace, and marks the state as `solved`.
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

Original design spec: [`docs/superpowers/specs/2026-05-23-sudoku-game-design.md`](docs/superpowers/specs/2026-05-23-sudoku-game-design.md)
