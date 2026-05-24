# Sudoku Interactive Game — Design Spec

**Date:** 2026-05-23
**Status:** Approved
**Deployment target:** Netlify (static site)

---

## Overview

Transform the existing Python backtracking solver (`sudoku_solver.py`) into a fully playable browser-based Sudoku game. The solver logic is ported 1:1 to JavaScript. No backend, no build step — static files deployed to Netlify. Ships as a Progressive Web App (PWA) so players can install it on mobile from the browser and play offline.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Styling | Tailwind CSS via CDN | Consistent design system, built-in dark mode variants, no build step |
| Reactivity | Alpine.js via CDN | Reactive state without a framework or npm; two CDN script tags in `index.html` |
| Game logic | Vanilla JS (`game.js`) | No DOM access, no Alpine dependency — pure functions only |
| Deploy | Netlify static | Drag-and-drop or GitHub auto-deploy |
| PWA | manifest.json + service worker | Installable on iOS/Android, offline play |

---

## File Structure

```
sudoku_solver_v2/
├── index.html          ← markup, Alpine root, CDN imports, PWA meta tags
├── style.css           ← only custom CSS Tailwind cannot express (3×3 grid box borders)
├── game.js             ← solver, generator, uniqueness check — pure functions, no DOM
├── manifest.json       ← PWA manifest (name, icons, theme colour, display: standalone)
├── sw.js               ← service worker — caches all static assets for offline play
├── icons/
│   ├── icon-192.png    ← PWA icon (192×192)
│   └── icon-512.png    ← PWA icon (512×512)
├── implementation-notes.md
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-23-sudoku-game-design.md  ← this file
```

---

## Game State

All reactive state is declared in `sudokuGame()` and bound to `<body x-data="sudokuGame()">`:

```js
{
  board: [],        // 9×9 array — current cell values (0 = empty)
  solution: [],     // 9×9 array — complete solution (for mistake detection)
  locked: [],       // 9×9 booleans — true = pre-filled clue cell (not editable)
  selected: null,   // { row, col } | null — currently focused cell
  history: [],      // [{ row, col, prev }] — undo stack, ordered oldest→newest
  errors: 0,        // running mistake count
  maxErrors: 3,     // game over threshold
  timer: 0,         // seconds elapsed (integer, counts up)
  paused: false,    // timer paused state
  difficulty: 'medium', // 'easy' | 'medium' | 'hard' | 'expert'
  darkMode: false,  // persisted in localStorage under key 'sudoku-dark'
  status: 'playing', // 'playing' | 'won' | 'gameover'
  bestTimes: {      // persisted in localStorage under key 'sudoku-best'
    easy: null,     // seconds (integer) | null = never completed
    medium: null,
    hard: null,
    expert: null
  }
}
```

---

## Game Logic (`game.js`)

Five pure functions, no side effects, no DOM access:

### `generateSolution() → number[][]`
Produces a complete, valid 9×9 board using backtracking with shuffled candidate lists (1–9 in random order per cell). Returns a 2D array.

### `shuffleBoard(solution) → number[][]`
Randomises the solution while preserving validity by:
- Shuffling rows within each band (rows 0–2, 3–5, 6–8)
- Shuffling columns within each stack (cols 0–2, 3–5, 6–8)
- Randomly transposing the whole board

Ensures every generated puzzle looks distinct. (Name clarification: "shuffle" not "symmetry" — this randomises layout, it does not impose rotational/reflective symmetry on the puzzle.)

### `removeClues(solution, difficulty) → { board, locked }`
Removes cells from the solution according to difficulty targets. After each removal, calls `countSolutions(board, 2)` — if the count exceeds 1, the cell is restored and a different cell is tried. Returns `board` (with 0s for empty cells) and `locked` (booleans marking original clues).

**Difficulty targets:**

| Level | Empty cells |
|---|---|
| Easy | 36 |
| Medium | 46 |
| Hard | 52 |
| Expert | 57 |

### `solvePuzzle(board) → boolean`
Backtracking solver ported from the existing Python implementation. Mutates `board` in place, returns `true` if solved. Used internally by `countSolutions`.

**Note:** The original Python code used `x` for rows and `y` for columns (inverted from convention). This is corrected in the JS port — `row` and `col` are used throughout with their standard meanings.

### `countSolutions(board, limit = 2) → number`
Counts solutions up to `limit`, returning early when the limit is reached. Used only during puzzle generation to guarantee uniqueness. Passing `limit = 2` means: if we find more than 1 solution, stop — the puzzle is invalid.

---

## UI Layout — Grid + Sidebar

Desktop-first layout. On narrow screens (< 640px), sidebar collapses below the grid.

```
┌─────────────────────────────────────────────────┐
│  SUDOKU                              ☀ / 🌙     │  ← header
├──────────────────────────┬──────────────────────┤
│                          │  Timer   00:00  ⏸    │
│    9 × 9 Grid            │  Best    03:47        │  ← hidden if no best yet
│                          │  Difficulty pills     │
│  (large, takes ~65%      │  Errors  ✕ 0 / 3     │
│   of horizontal space)   │  ─────────────────   │
│                          │  1  2  3             │
│                          │  4  5  6   (numpad)  │
│                          │  7  8  9             │
│                          │        ⌫  Erase      │
│                          │  ─────────────────   │
│                          │  ↩ Undo              │
│                          │  ＋ New Game          │
└──────────────────────────┴──────────────────────┘
```

---

## Cell Visual States

| State | Light theme | Dark theme |
|---|---|---|
| Locked clue | Dark text, white background | Light text, dark-800 background |
| User-entered (valid) | Blue-600 text, white background | Blue-400 text, dark-800 background |
| Selected | Blue-200 background | Blue-900 background |
| Same row / col / box as selected | Blue-50 background tint | Dark-700 background |
| Same number as selected | Blue-100 background | Blue-950 background |
| Wrong entry | Red-100 background, red-600 text | Red-950 background, red-400 text |

Wrong entries persist visually until the player erases and re-enters a value.

---

## Features

### Mistake highlighting
When a player enters a number that contradicts the solution, the cell turns red immediately. The error counter increments. At 3 errors, `status` becomes `'gameover'` and the game-over overlay appears.

### Undo
Each valid move pushes `{ row, col, prev }` to `history`. Undo pops the last entry and restores `board[row][col] = prev`. Undo does not decrement the error counter — mistakes are permanent.

### Timer
A `setInterval` increments `timer` (seconds) every 1000ms when `status === 'playing'` and `paused === false`. Displays as `MM:SS`. Pause button toggles `paused`. Timer stops on win or game over.

### Difficulty selector
Four pills: Easy / Medium / Hard / Expert. Clicking any pill starts a new game at that difficulty immediately — no confirmation dialog, even if a game is in progress. The active pill is highlighted.

### Dark mode toggle
Sun/moon icon in the header. Clicking toggles `darkMode`, writes to `localStorage`, and flips the `dark` class on `<html>`. All colours respond via Tailwind `dark:` variants. Requires Tailwind CDN to be configured with `darkMode: 'class'` — done via the inline config script before the CDN import:
```html
<script>tailwind.config = { darkMode: 'class' }</script>
```

### Keyboard navigation
| Key | Action |
|---|---|
| Arrow keys | Move selected cell |
| 1–9 | Enter number in selected cell |
| Backspace / Delete | Erase selected cell |
| Ctrl+Z | Undo |
| Escape | Deselect cell |

### Number pad
Clicking a number button (1–9) fills the selected cell. Erase button clears it. Equivalent to keyboard input.

### Personal best score tracking
Best completion time per difficulty is stored in `localStorage` under key `'sudoku-best'` as `{ easy, medium, hard, expert }` (seconds or `null`). On win, if `timer < bestTimes[difficulty]` (or best is null), the value is updated. The sidebar shows "Best: MM:SS" below the timer — hidden entirely when no best exists for the current difficulty. Switching difficulty updates the displayed best immediately.

### Progressive Web App (PWA)
`manifest.json` declares the app name ("Sudoku"), theme colour, background colour, and `display: standalone` so it fills the screen without browser chrome when installed. `sw.js` uses a cache-first strategy — on first load it pre-caches `index.html`, `style.css`, `game.js`, and the two icons; subsequent loads are served from cache, enabling offline play. `index.html` registers the service worker and includes the required `<link rel="manifest">` and Apple-specific meta tags for iOS install support.

---

## Win / Game Over States

**Won (`status === 'won'`):** Triggered when all 81 cells match the solution. Overlay displays "Puzzle Solved! ✓", time taken, and a "Play Again" button that starts a new game at the same difficulty.

**Game Over (`status === 'gameover'`):** Triggered when `errors === maxErrors (3)`. Overlay displays "Game Over — 3 mistakes", reveals the full solution on the board, and shows a "Try Again" button.

---

## Deployment

1. Commit all files to Git: `index.html`, `style.css`, `game.js`, `manifest.json`, `sw.js`, `icons/`
2. Connect repo to Netlify (GitHub auto-deploy)
3. No build command, no publish directory configuration needed — Netlify serves `index.html` from root
4. HTTPS is required for service workers — Netlify provides this automatically on all deploys
5. Add `.superpowers/` to `.gitignore`

---

## Out of Scope (v1)

- Hint system (reveal one correct cell)
- Note/pencil mode (small candidate numbers per cell)
- Global leaderboard (would require a backend/database)
- True native app (React Native / Flutter — separate project)
- Python backend
