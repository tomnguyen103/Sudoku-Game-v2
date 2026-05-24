# Sudoku Game — Project Guide

## What this project is

A browser-based interactive Sudoku game deployed as a static site on Netlify. Converted from a Python backtracking solver into a playable game with puzzle generation, difficulty levels, mistake highlighting, undo, and a dark mode toggle.

## Tech stack

- **Tailwind CSS** (CDN, no build step) — styling and dark mode
- **Alpine.js** (CDN) — reactive game state, no DOM manipulation in logic
- **Vanilla JS** (`game.js`) — pure game logic: solver, generator, uniqueness check

No npm, no build step. Three files: `index.html`, `style.css`, `game.js`.

## File structure

```
index.html      ← markup + Alpine x-data root + CDN script tags + PWA meta tags
style.css       ← only custom CSS Tailwind can't handle (3×3 grid box borders)
game.js         ← pure functions: generateSolution, shuffleBoard, removeClues,
                   solvePuzzle, countSolutions — no DOM, no Alpine dependency
manifest.json   ← PWA manifest (name, icons, theme colour, standalone display)
sw.js           ← service worker — cache-first strategy for offline play
icons/          ← PWA icons: icon-192.png, icon-512.png
```

## Key design decisions

- **Alpine state shape** lives in `sudokuGame()` in `game.js` — see spec for full shape
- **Mistake rule:** wrong entries persist red until erased; errors do not decrement on undo
- **Uniqueness guarantee:** every generated puzzle is verified to have exactly one solution via `countSolutions(board, 2)` during generation
- **Difficulty = empty cells:** Easy 36 / Medium 46 / Hard 52 / Expert 57
- **Dark mode** toggled via `dark` class on `<html>` + Tailwind `darkMode: 'class'` config, persisted in `localStorage`
- **Personal best** stored in `localStorage` key `'sudoku-best'` as `{ easy, medium, hard, expert }` (seconds or `null`); updated on win if new time beats stored best
- **PWA** — `manifest.json` + `sw.js` (cache-first, pre-caches all static assets); HTTPS required — Netlify provides this automatically
- **Coordinate convention:** `row` (0–8 top→bottom) and `col` (0–8 left→right) throughout — the original Python code had this inverted (x=row, y=col) and it is fixed in the JS port

## Deployment

Connect GitHub repo to Netlify. No build command, no publish directory. Netlify serves `index.html` from root.

Add to `.gitignore`:
```
.superpowers/
```

## Spec

Full design spec: [`docs/superpowers/specs/2026-05-23-sudoku-game-design.md`](docs/superpowers/specs/2026-05-23-sudoku-game-design.md)

Implementation notes (decisions made during development): [`implementation-notes.md`](implementation-notes.md)

## Out of scope (v1)

Hints, pencil/note mode, score tracking, leaderboard, mobile app.
