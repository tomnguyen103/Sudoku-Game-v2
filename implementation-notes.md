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

---

## Control Panel Redesign

### 2026-05-24 — Algorithm selector panel and stat counters

**Context:** User wanted a "professor layout" — clean, extensible sidebar that can accommodate a second algorithm later. Also wanted to replace the opaque Step counter with something more user-readable.

**Decision — Algorithm dropdown:** Replaced the single Run button with a `<select>` dropdown (`x-model="selectedAlgorithm"`) wrapped in a visually distinct `algo-ring` panel (violet border + glow). Currently one option (`backtracking`). Adding a second algorithm only requires a new `<option>` tag and a branch in the run logic. Speed controls moved inside the algorithm panel (below Run) so they read as one cohesive group.

**Decision — Placed / Backtracks counters:** Replaced `Step: X / Y` with two colored stat boxes — blue for Placed, red for Backtracks. `placedCount` increments on every `place` step, `backtrackedCount` on every `backtrack` step. User found the step counter confusing because it mixes both directions into one number with no visual distinction.

**Decision — Status badge:** Status panel header shows a small algorithm badge chip on the right side (`algorithmBadgeLabel()` method). Updates reactively when the dropdown changes. Chosen over embedding the name in the panel label (Option B) because it keeps "Status" as a stable label while still attributing the numbers to the selected algorithm.

**Tradeoff — Grid cell colors left unchanged:** User explicitly asked not to color-code placed/backtracked cells in the grid. Only the sidebar stat boxes use blue/red tint. The grid coloring (amber for current, red-tinted for backtracking) stays as-is.

**Decision — `newTest` renamed to `newPuzzle`:** More natural language. Updated everywhere: JS method, HTML button, smoke test selectors.

### 2026-05-24 — Git branch cleanup and deploy fix

**Issue:** Development happened on `main`. The `finishing-a-development-branch` skill incorrectly identified `master` as the base branch (IDE reported it as "Main branch"). I created and pushed a new `master` branch to GitHub, which Netlify ignored (it watches `main`).

**Fix:** Fast-forwarded `main` to include all commits, pushed to `origin/main`, then deleted both local and remote `master`. Netlify deploy triggered correctly after that.

**Decision — favicon.svg was never committed:** The file existed locally (untracked) but was never added to git, so Netlify never had it. Added it in a separate commit. Going forward, new assets must be committed before pushing.

### 2026-05-24 — Service worker auto-reload

**Issue:** After a Netlify deploy, users had to hard-refresh to see updates. The SW used `skipWaiting()` + `clients.claim()` correctly, but `clients.claim()` only makes the new SW *control* the tab — it doesn't reload the page to pick up new HTML/CSS/JS.

**Fix:** Added `navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload())` in `index.html`. When `skipWaiting()` causes the new SW to take over, `controllerchange` fires and the page reloads automatically. No user action needed on future deploys.

**Tradeoff:** The page reloads once per SW update. This is acceptable because SW updates only happen when `sw.js` content changes (i.e. on each deploy). Users mid-session will lose their current run state, but that's preferable to silently serving stale assets.

### 2026-05-24 — Solving time stat tile and UI polish

**Decision - Elapsed time tracking:** Added `_runStartTime` and `_elapsedMs` to the visualizer state. `_runStartTime` is set when `runSolver()` starts and cleared on reset/new puzzle. `_elapsedMs` tracks elapsed milliseconds and pauses when the solver is paused (frozen at the pause time, resumes from that point when `runSolver()` is called again).

**Decision - Display helper:** Added `elapsedText()` method that formats elapsed milliseconds as `"X.XXs"` (e.g., `"1.23s"`). Returns `"0.00s"` when no solver run is active. Readable and consistent with the rest of the UI.

**Decision - Stat tile styling:** Added `.stat-time` CSS class with amber background (`#fef3c7` light, `#3b2500` dark) and amber text colors to distinguish the timing stat from the blue (Placed) and red (Backtracks) tiles. Matches the existing `.stat-place` and `.stat-back` structure.

**UI placement:** Inserted the `⏱ Solving Time` stat tile between the 2-column grid (Placed + Backtracks) and the status text paragraph in the status widget section. Tile shows full width with `mt-2` spacing.

**Cache update:** Bumped service worker cache from `sudoku-v16` to `sudoku-v17`. Updated all 6 query strings in `index.html` from `?v=20260524-ctrlpanel` to `?v=20260524-solvetime` (tailwindcss.js, alpine.min.js, style.css, solver.js, generator.js, visualizer.js).

### 2026-05-24 — Finish Now solving-time semantics

**Issue observed:** `Finish Now` originally stopped playback and displayed the elapsed time at the user's click moment. That did not match the intended behavior: the button should skip user waiting while preserving the algorithm's selected-speed solve duration.

**Decision - Projected completion time:** `finishNow()` now records the active elapsed segment, computes the remaining trace length from the current `stepIndex`, multiplies it by the current `playbackDelay()`, and adds that projected duration before marking the puzzle solved. This means the displayed Solving Time represents when the selected-speed visualizer would have finished if it had continued running normally.

**Decision - Final-step completion:** `_applyNextStep()` now completes the solve immediately when it applies the last trace step. Previously the board could be fully solved while the timer continued until the next interval tick.

**Testing added:** `tests/game.test.js` now verifies that `Finish Now` adds remaining selected-speed trace time and that the final trace step stops the timer immediately. `tests/smoke.test.js` verifies the visible Solving Time advances while running, freezes while paused, and jumps forward when `Finish Now` projects to completion.

**Cache update:** Bumped service worker cache from `sudoku-v17` to `sudoku-v18`. Updated all 6 runtime query strings in `index.html` from `?v=20260524-solvetime` to `?v=20260524-finishtime`.

### 2026-05-24 - Responsive board and mobile fit

**Issue observed:** The board was visually centered in stacked browser widths while the title started at the page margin, so the puzzle did not vertically align with the title. On mobile, the board plus difficulty, algorithm, and status panels required scrolling.

**Decision - Desktop board sizing:** `style.css` now drives board width through `--sudoku-board-size`. The default remains `31rem`, while the desktop breakpoint grows to `40.375rem` so the square board visually matches the full control/status column height.

**Decision - Stacked alignment:** Changed the main layout from centered content to left-aligned content (`items-start justify-start`). This makes the puzzle, controls, and title share the same left edge in the in-app browser's stacked width.

**Decision - Compact mobile controls:** Added mobile-only styles for `.difficulty-panel`, `.algo-ring`, and `.status-panel`. Difficulty becomes a compact label-plus-buttons row, the algorithm controls use reduced padding/heights, and the status stats compress into a three-column row. The mobile board uses `clamp(12rem, calc(100svh - 29.25rem), calc(100vw - 1rem))` so short phone viewports shrink the board enough to keep the full layout visible.

**Tradeoff:** On shorter phones the puzzle can become much smaller than the available width. This favors the user's requirement that the entire layout be visible on one page over maximizing board size.

**Verification:** Checked responsive dimensions at 390x844, 390x667, and 360x740. Each fit within one viewport with no horizontal overflow. Also checked the in-app browser width, where the title and board both start at the same x-coordinate.

**Cache update:** Bumped service worker cache from `sudoku-v18` to `sudoku-v21`. Updated all 6 runtime query strings in `index.html` from `?v=20260524-finishtime` to `?v=20260524-responsive2`.

### 2026-05-25 - Full-width mobile board (reverses one-viewport fit)

**Issue observed:** On large phones (reported on iPhone 17 Pro Max), the puzzle grid did not extend to the left/right edges — it sat narrow with large side gaps while the control panels below it spanned full width.

**Root cause:** The mobile board size was `clamp(12rem, calc(100svh - 29.25rem), calc(100vw - 1rem))`. The middle height-based term won the clamp on tall phones. Crucially, real iOS Safari reduces `svh` by its address bar + toolbar (a ~440x956 device exposes only ~766px of `svh`), so `100svh - 29.25rem` resolved to ~298px while the available width was ~424px. Headless/desktop browsers report the full height as `svh`, so this only reproduced on a real device or when the preview height was set to the post-chrome usable height (~766px).

**Decision - Width-driven board:** Mobile board size is now `--sudoku-board-size: calc(100vw - 1rem)`, so the board always fills the content width (symmetric 8px gutters from the 0.5rem body padding) regardless of `svh`.

**Tradeoff (reverses the 2026-05-24 decision):** This abandons the earlier "entire layout visible on one page" goal on phones. With the larger board, the controls now sit below the fold and require a short vertical scroll (page ~881px tall at a 766px usable viewport). The user explicitly prioritized a full-width board over the one-screen fit. No horizontal overflow at any phone width.

**Verification:** Measured computed grid width via the browser preview at the post-chrome usable viewport. 440px wide: board 298px → 424px after fix (right gap 134px → 8px). 375px wide (iPhone SE): board 359px, symmetric 8px gutters, no horizontal overflow. `npm test` and `npm run test:smoke` pass.

**Cache update:** Bumped service worker cache from `sudoku-v21` to `sudoku-v22`. Updated all 6 runtime query strings in `index.html` from `?v=20260524-responsive2` to `?v=20260525-mobilewidth`.
