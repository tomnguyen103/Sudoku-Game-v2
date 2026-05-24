# Implementation Notes — Sudoku Interactive Game

Running log of decisions, tradeoffs, and changes made during design and implementation that aren't captured in the spec.

---

## Brainstorming Phase

### 2026-05-23 — Session start

**Context:** Original codebase is a single-file Python backtracking solver (`sudoku_solver.py`) with no UI. Uses `numpy` only for matrix printing. The goal is to transform this into an interactive playable Sudoku game.

**Note:** The original `possible_position(x, y, n)` function has a subtle coordinate confusion — it uses `x` for rows and `y` for columns, which is the reverse of conventional (x=col, y=row) notation. This will need to be clarified or renamed during implementation to avoid bugs in the game logic.

---

**Decision — Platform:** Pure HTML/CSS/JS static site for Netlify deployment. No Python backend. Existing solver logic ported to JavaScript (1:1 algorithm port, ~50 lines). No framework — vanilla JS only to avoid build-step complexity.

**Decision — Puzzle generation:** Auto-generate puzzles (not a fixed puzzle bank). Backtracking solver generates a complete board, then removes cells according to difficulty target. Difficulty defined by number of empty cells:
- Easy: ~36 empty cells
- Medium: ~46 empty cells
- Hard: ~52 empty cells
- Expert: ~56+ empty cells

**Note:** The guarantee that a generated puzzle has a *unique* solution requires running the solver on the partial board and checking exactly one solution exists. This adds generation time but is important for fairness — will implement a uniqueness check.

---

**Decision — Layout:** Grid + Sidebar. Large board left, controls/info panel right. Desktop-first but will need a responsive breakpoint for mobile (sidebar collapses below the grid on narrow screens).

**Decision — Theme:** Clean Light (white/light-grey, blue accents) as default. User-togglable dark mode (deep navy, blue accents). Toggle state persisted in `localStorage` so it survives page refresh.

**Decision — Features in scope:** Mistake highlighting (red cell on wrong entry), Undo, Timer (counts up). No hints in v1.

**Decision — Completion/game-over states:** Not yet decided — need to define what happens at 3 errors (game over screen?) and on puzzle completion (success screen?). Flagged for design review.

---

**Decision — Tech Stack:** Tailwind CSS (CDN) + Alpine.js (CDN) + vanilla JS for game logic. No build step. Two CDN script tags in index.html. Deploys to Netlify as a static folder.

**Why Alpine over plain JS:** Game has enough reactive state (selected cell, board values, timer, errors, dark mode, history) that manual DOM manipulation would get messy. Alpine keeps state declarative without requiring a build step or npm.

**Why Tailwind CDN over built Tailwind:** No build step = simpler Netlify setup. CDN bundle is ~350kb (acceptable for a game). If performance becomes a concern, can add a Tailwind build step later.

---

*More notes will be added as design decisions are made.*
