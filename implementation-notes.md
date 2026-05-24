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

**Decision — PWA:** Progressive Web App via `manifest.json` + `sw.js`. Chosen over true native (React Native/Flutter) to stay within the static Netlify deploy model. Adds two files + an icons folder. Service worker uses cache-first strategy — pre-caches all static assets on first install. HTTPS is required for service workers; Netlify provides this on all deployments automatically.

**Decision — Score tracking:** Personal best (localStorage) for web v1. Global leaderboard added via FastAPI + Supabase backend in a later phase.

**Decision — Auth:** Clerk (not Supabase Auth, not custom JWT). Works across all three sub-projects: Clerk JS SDK (web), @clerk/clerk-expo (native), JWT validation middleware (FastAPI). Config keys to be provided by user — treat as placeholder until supplied. Do not hardcode or guess Clerk publishable/secret keys.

**Decision — Project sequencing:** Three separate sub-projects, each with its own spec → plan → build cycle:
1. **Web** (current) — Tailwind + Alpine.js static site, Netlify. Spec complete, ready to build.
2. **Backend** — FastAPI + Supabase + Clerk JWT validation. Spec session later.
3. **Native** — React Native + Expo + @clerk/clerk-expo. Spec session after backend.

**Note — PWA icons:** The spec calls for `icons/icon-192.png` and `icons/icon-512.png`. These need to be created (simple Sudoku grid logo or text-based icon). No design tool specified — a programmatically generated SVG converted to PNG is the simplest approach.

---

*More notes will be added as design decisions are made.*

---

## Solver Visualizer Pivot

### 2026-05-24 - Pure backtracking visualizer implementation

**Context:** The app direction changed from a manual playable Sudoku game to an educational visualizer for the original `sudoku_solver.py` backtracking algorithm. The goal is now to show an initial puzzle with pre-filled values, then animate generated solver values into the grid.

**Decision - App mode:** Replaced manual play with a pure solver visualizer. Removed the gameplay concepts from the UI: timer, mistakes, undo, erase, number pad, win overlay, and game-over overlay. These were useful for the playable game but distracting for an algorithm demonstration.

**Decision - Difficulty levels:** Kept Easy, Medium, and Hard only. Expert was removed because the visualizer can produce very long traces on harder boards, and the user specifically asked for Easy, Medium, or Hard.

**Decision - Trace API:** Added `createBacktrackingTrace(board)` in `game.js`. It adapts the existing recursive solver but records each generated move as a step:
- `place`: the solver writes a candidate number into an empty cell.
- `backtrack`: the solver removes a candidate after reaching a dead end.

The trace function copies the input board before solving so it does not mutate the initial puzzle. Tests now verify this.

**Tradeoff - Generate trace before playback:** The visualizer generates the full backtracking trace when `Run Backtracking` starts, then replays it with `setInterval`. This makes pause/reset/simple speed control easier and keeps the UI logic deterministic. The tradeoff is that the browser does a short burst of work up front before animation starts. For Easy/Medium/Hard puzzles this is acceptable.

**Decision - Highlight rules:** Original givens stay dark. Solver-generated values are blue. The current placement is highlighted amber. A backtracked removal is highlighted red briefly as the step is applied. This keeps the algorithm state visible without adding a separate log panel for every step.

**Decision - Reset behavior:** Reset restores the original pre-filled puzzle and clears the trace (`0 / 0`) rather than leaving the old trace count visible. This was adjusted after browser verification showed the board reset correctly but the previous trace length remained in the UI.

**Decision - Speed control:** Speed is a slider from 10 to 100. Changing speed while the solver is running restarts the playback interval with the new delay, rather than requiring pause/resume.

**Decision - Cache busting:** Updated the `index.html` stylesheet/script query strings and bumped the service worker cache to `sudoku-v4`. This is necessary because the service worker uses a cache-first strategy and otherwise local browsers may keep serving stale `index.html`, `style.css`, or `game.js`.

**Testing added:** `tests/game.test.js` now covers `createBacktrackingTrace(board)`, including:
- solving a one-empty-cell puzzle
- recording placement steps
- recording at least one backtrack on a known puzzle
- not mutating the input board

**Browser verification:** Verified in the in-app browser that:
- the new visualizer UI loads
- Easy/Medium/Hard buttons are present
- old manual-game UI text is gone
- `Run Backtracking` advances the trace and fills cells
- `Pause` stops playback
- `Reset` restores the initial puzzle and clears highlighting/trace count
- no new console errors appeared during the visualizer flow

### 2026-05-24 - Current layout reset and speed multipliers

**Issue observed:** The initial puzzle layout should not be tied to a `Reload Preset` concept. The desired behavior is: run the solver on the current layout, pause it, reset solver-added numbers while keeping the current layout, and only generate a fresh layout when the user clicks `New Test`.

**Decision - Generated current layout:** Replaced fixed presets with `generateTestPuzzle(difficulty)`. Easy, Medium, and Hard generate a unique-solution puzzle using the existing generator and removal rules. The generated board becomes `initialBoard` and remains the current layout until the user changes difficulty or clicks `New Test`.

**UI wording change:** Replaced `Reload Preset` with `New Test`. `Reset` now clearly means "remove solver-added numbers and return to the current generated layout."

**Decision - Speed controls:** Replaced the numeric slider with discrete speed buttons: `1x`, `2x`, `5x`, and `10x`. Internally these map to fixed playback delays in `PLAYBACK_SPEEDS`.

**Tradeoff - Random tests over fixed presets:** The visualizer now creates a fresh generated test on demand. This makes each `New Test` useful for exploration, but means demos are no longer identical across sessions. Reset handles repeatability within the current test.

**Cache update:** Bumped service worker cache to `sudoku-v6` and updated the `index.html` query strings for `style.css` and `game.js` to avoid stale local assets.

**Testing added:** `tests/game.test.js` now verifies:
- each difficulty test puzzle has the expected board and locked-map shape
- each generated test puzzle has a unique solution
- each generated test puzzle has an empty-cell count in the expected difficulty range
- speed multipliers are exposed in the expected order and get faster from `1x` to `10x`

**Bug found during browser verification:** Reset initially did not return the DOM to the exact current layout even though the Alpine state reset correctly. Root cause: the grid used nested `x-for` templates with repeated inner keys, so Alpine could reuse cell DOM nodes incorrectly during board replacement. The render path now flattens the board through `cells()` and renders a single `x-for` keyed by `row-col`.

**Final action semantics:**
- `Run Backtracking Algorithm`: run the solver on the current layout.
- `Pause`: pause the current solver run.
- `Reset`: remove solver-added numbers and restore the current generated layout.
- `New Test`: generate a fresh layout for the selected difficulty.

### 2026-05-24 - Solvable layout preflight

**Issue observed:** Generated visualizer layouts should be proven solvable before the user starts playback. A conflicted filled board could previously be treated as solved because the backtracking solver only searched for empty cells.

**Decision - Preflight validation:** Added `hasValidGivens(board)` and `isSolvableLayout(board)`. New layouts now run through the solver before being exposed to the UI. Invalid rows, columns, boxes, values, and unsolvable layouts are rejected.

**Decision - Retry order:** `generateTestPuzzle(difficulty)` first retries clue removal against the same completed solution. If those attempts fail, it generates a new completed layout and tries again. The UI still waits in `ready` state until the user clicks `Run Backtracking Algorithm`.

**Cache update:** Bumped service worker cache to `sudoku-v8` and updated the `index.html` query strings for `style.css` and `game.js`.

### 2026-05-24 - Finish Now control

**Decision - Immediate completion:** Added a `Finish Now` control for the visualizer. It stops playback, solves the current generated layout from `initialBoard`, fills the grid with the solved board, advances the step counter to the end of the computed trace, and marks the state as `solved`.

**UI behavior:** The button is available while the puzzle is ready, running, or paused, and disables once the current layout is solved. `Reset` still restores the original unsolved layout for the same generated test.

**Cache update:** Bumped service worker cache to `sudoku-v9` and updated the `index.html` query strings for `style.css` and `game.js`.

### 2026-05-24 - Workflow and setup cleanup

**Issue observed:** The project had outgrown the original single-file playable-game setup. Some docs still described removed gameplay features, runtime dependencies were loaded from CDNs, and browser verification was manual.

**Decision - Focused modules:** Split runtime logic into `src/solver.js`, `src/generator.js`, and `src/visualizer.js`. `game.js` remains as a CommonJS compatibility export for Node tests.

**Decision - Local runtime assets:** Vendored the Tailwind browser runtime and Alpine into `vendor/` and switched `index.html` to load local scripts. The service worker now pre-caches the local vendor scripts and split app modules.

**Decision - Guardrail tests:** Added `tests/project.test.js` to catch stale docs, missing local assets, missing split modules, and service-worker asset-list drift.

**Decision - Browser smoke test:** Added `tests/smoke.test.js`, which starts a local static server with Node, opens Chromium with Playwright, and verifies the core flow: run, pause, finish now, and reset.

**Decision - Release checklist:** Added `docs/release-checklist.md` so cache bumps, tests, smoke checks, and local review are repeatable before deploy.

**Cache update:** Bumped service worker cache to `sudoku-v10` and updated runtime query strings in `index.html`.

---

## Algorithm Research — Multi-Algorithm Visualizer (planned)

### 2026-05-24 — Algorithm comparison for future expansion

**Context:** User wants to add a second algorithm to the visualizer. Research conducted to identify candidates.

**Algorithm comparison:**

| Algorithm | Time Complexity | Deterministic | Visual-friendly | Impl. difficulty |
|---|---|---|---|---|
| Backtracking DFS | O(9^m) | Yes | Excellent | Low |
| MRV Backtracking | O(9^m), far fewer steps in practice | Yes | Excellent | Low |
| Constraint Propagation (AC-3) | O(n²) per pass | Yes (partial) | Good | Medium |
| Norvig's CP + Search | Near-linear on easy puzzles | Yes | Good | Medium |
| Dancing Links (DLX) | Fastest in practice | Yes | Poor | High |
| Simulated Annealing / Genetic | O(iterations/gen) | No | Poor | High |

*m = number of empty cells (max 81)*

**Decision — Best candidate for next algorithm:** MRV Backtracking (Minimum Remaining Values). Same animation infrastructure as current backtracking, but always picks the cell with fewest legal candidates first. Produces dramatically fewer steps on the same puzzle, making the comparison immediately educational. No new trace format needed.

**Decision — Interesting third algorithm:** Constraint Propagation (AC-3 / Norvig's). Visually distinct — shows domain-shrinking rather than cell-filling. Solves easy/medium puzzles with zero guessing. Needs a fallback to search for hard puzzles.

**Deferred:** DLX, Simulated Annealing, Genetic — not suitable for step-by-step visualization.

**Layout decision:** Option B (dropdown selector) chosen for the algorithm control UI. Algorithm dropdown made visually prominent with a violet accent to draw user focus. "New Test" button renamed to "New Puzzle".
