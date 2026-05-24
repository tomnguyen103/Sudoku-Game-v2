# Sudoku Solver Visualizer - Project Guide

## What This Project Is

A browser-based Sudoku backtracking visualizer deployed as a static site on Netlify. It evolved from a Python backtracking solver into an educational web app that generates solvable Sudoku layouts and animates the algorithm's placement and backtracking steps.

## Tech Stack

- **Local Tailwind browser runtime** (`vendor/tailwindcss.js`) - styling and dark mode without a build step
- **Local Alpine.js** (`vendor/alpine.min.js`) - reactive visualizer state
- **Vanilla JS modules** (`src/`) - solver, generator, and visualizer state
- **Node tests** - logic/setup tests with built-in `assert`
- **Playwright smoke test** - browser workflow verification

The app has no bundler and no build output directory. `package.json` exists for repeatable local checks.

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

## Key Design Decisions

- **App mode:** pure solver visualizer. Manual entry, mistakes, undo, erase, timer, score, and game-over/win overlays are intentionally removed.
- **Current layout:** Easy, Medium, and Hard generate a test puzzle via `generateTestPuzzle(difficulty)`. The current layout stays fixed until the user changes difficulty or clicks `New Test`.
- **Visualizer start:** the generated layout is shown in `ready` state. The algorithm does not animate until the user clicks `Run Backtracking Algorithm`.
- **Finish Now:** immediately solves the current layout, fills the board, advances the step count to the end of the computed trace, and marks the state `solved`.
- **Solvability preflight:** generated layouts are validated with `isSolvableLayout(board)` and uniqueness is checked with `countSolutions(board, 2)`.
- **Difficulty = empty cells:** Easy 36 / Medium 46 / Hard 52.
- **Dark mode:** toggled via `dark` class on `<html>` and persisted in `localStorage`.
- **PWA:** `manifest.json` + `sw.js` pre-cache static assets. Bump the service-worker cache name when runtime assets change.
- **Coordinate convention:** `row` is 0-8 top to bottom; `col` is 0-8 left to right.

## Development Workflow

Run all local checks:

```bash
npm test
npm run test:smoke
```

Before deployment, follow [`docs/release-checklist.md`](docs/release-checklist.md).

## Deployment

Connect GitHub repo to Netlify. No build command and no publish directory are required. Netlify serves `index.html` from the repository root.

## Documentation

Implementation notes: [`implementation-notes.md`](implementation-notes.md)

Original design spec: [`docs/superpowers/specs/2026-05-23-sudoku-game-design.md`](docs/superpowers/specs/2026-05-23-sudoku-game-design.md)

## Out Of Scope

Manual Sudoku play, hints, pencil/note mode, score tracking, leaderboard, and mobile-native app packaging.
