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

### 2026-05-25 - Second selectable algorithm: Backtracking + MRV

**Context:** The app previously visualized a single fixed algorithm (naive backtracking). Research compared seven Sudoku-solving algorithms (added as an "Algorithm Comparison" table in `README.md`). Backtracking + MRV (minimum remaining values) was chosen as the first additional selectable algorithm because it reuses the existing `place`/`backtrack` trace vocabulary (no new render logic), is a small dependency-free change, and produces a visibly smarter, more educational trace on hard puzzles.

**Decision - Solver:** Added `createMrvTrace(board)` to `src/solver.js` alongside `createBacktrackingTrace`. Same output contract (`{ solved, steps, solvedBoard }`), same step events, and the same invalid-givens rejection. The only difference is cell selection: instead of the first empty cell in reading order, it picks the empty cell with the fewest legal candidates (fail-first), returning early when a 0-candidate cell is found.

**Decision - Visualizer:** `src/visualizer.js` now selects the trace builder by `selectedAlgorithm` via a `TRACE_BUILDERS` map and a `_buildTrace()` helper used by both `runSolver()` and `finishNow()` (previously hardcoded to `createBacktrackingTrace`). Added a `setAlgorithm(algorithm)` method that updates the selection and calls `resetPuzzle()` so the existing trace (which belongs to the previous algorithm) is cleared and the next run rebuilds with the new algorithm. Status/badge/subtitle labels are now algorithm-aware via `ALGORITHM_LABELS`.

**Decision - UI:** `index.html` adds a `<option value="mrv">` to the existing algorithm `<select>` and an `@change="setAlgorithm($event.target.value)"` handler. The select is already disabled during running/loading; switching while paused/ready/solved resets the trace.

**Tradeoff:** MRV recomputes candidate counts every step, so each step does more work, but it produces far fewer steps on medium/hard puzzles — a net win and a more interesting animation. Trace length differs from naive backtracking, which slightly changes step counts and the projected `Finish Now` time, but the timing logic is unchanged (it scales by `steps.length`).

**Verification:** TDD throughout. Added MRV solver tests (forced-placement trace, hard-puzzle unique solution, no input mutation, invalid-givens rejection, and a "first placement targets a minimum-candidate cell" property test) and visualizer tests (runSolver builds the selected algorithm's trace; `setAlgorithm` clears the trace and returns to ready). `npm test` and `npm run test:smoke` pass.

**Cache update:** Bumped service worker cache from `sudoku-v22` to `sudoku-v23`. Updated all 6 runtime query strings in `index.html` from `?v=20260525-mobilewidth` to `?v=20260525-mrv`.

**Docs follow-up:** Reworked the README "Solver Model" section into a "Solving Algorithms" section with a short learning paragraph for each implemented algorithm (Backtracking DFS and Backtracking + MRV), so a reader can understand how each search behaves. Updated the Algorithm Comparison intro (now states #1 and #2 are implemented) and reframed the former "Recommended next addition" block into "Why these two are implemented," with DLX/SAT listed as future candidates. README/AGENTS/CLAUDE are documentation-only and not in the `sw.js` asset list, so no further cache bump was required.

---

### 2026-05-25 - Third selectable algorithm: Constraint Propagation

**Context:** Added Norvig-style constraint propagation (AC-3 + DFS search) as the third selectable algorithm. Chosen because it is visually distinct from the two backtracking variants — it shows candidate sets (pencil marks) shrinking and rippling rather than single cells filling.

**Decision - Solver:** `createConstraintPropagationTrace(board)` in `src/solver.js`. Same `{ solved, steps, solvedBoard }` contract and invalid-givens rejection as the other builders. Candidate state is held as per-cell 9-bit masks internally. Propagation applies naked singles and hidden singles via a FIFO queue (one dequeued assignment + its peer eliminations = one wave). When propagation stalls, a fail-first DFS picks the fewest-candidate cell and guesses, copying the candidate grid per branch.

**Decision - New step types:** `propagate` (an assignment + the peer eliminations it triggered), `guess` (a search hypothesis), and `contradiction` (a failed branch, grid restored). Every step carries `snapshot`, a 9x9 array where each cell is an array of remaining candidate digits (length 1 = solved). The visualizer renders snapshots directly; no candidate logic lives in the UI.

**Decision - Wave granularity:** one propagation wave per step (assignment + its direct eliminations), so the ripple reads clearly while keeping step counts in the hundreds rather than thousands.

**Decision - Pencil-mark render:** empty cells render a fixed 3x3 mini-grid of remaining candidates (digit n always in slot n), so digits do not reflow as the set shrinks. Solved/given cells render the single big number as before. Guess cells flash violet; contradiction cells flash red.

**Decision - Algorithm-aware stats:** the two stat tiles relabel by algorithm. Backtracking/MRV keep Placed + Backtracks; Constraint Propagation shows Eliminations + Guesses. Solving Time is unchanged. Labels/values are driven by `statLabelPrimary/Secondary` and `statValuePrimary/Secondary`.

**Tradeoff:** this is the first algorithm needing a new render path and new step vocabulary. Snapshots are stored per step (digit arrays), which costs memory on search-heavy puzzles, but trace generation happens up front and replays deterministically, consistent with the existing model.

**Testing:** TDD throughout. Solver tests cover the contract, a forced single-cell solve with zero guesses, snapshot/solvedBoard consistency, the classic puzzle cross-checked against `solvePuzzle`, and a search-heavy puzzle (AI Escargot) that engages guesses and contradictions. Visualizer tests cover trace selection, snapshot/board/elimination updates, `cellCandidates`, algorithm-aware stat labels, and reset clearing. The smoke test selects the algorithm, asserts pencil marks render, and finishes to a solved board.

**Cache update:** Bumped service worker cache from `sudoku-v23` to `sudoku-v24` and updated the six `?v=` query strings in `index.html` from `?v=20260525-mrv` to `?v=20260525-cp`.

### 2026-05-25 - Fourth selectable algorithm: Human Logic Solver

**Context:** Added a tutor-style human logic algorithm after reviewing the researched algorithm list. DLX and SAT remain faster in practice, but their internal steps are opaque on a Sudoku board. Human logic is more valuable for this visualizer because each move can be labeled and explained.

**Decision - Solver:** Added `createHumanLogicTrace(board)` in `src/solver.js`. It shares the same `{ solved, steps, solvedBoard }` contract and invalid-givens rejection as the other algorithms. Candidate state uses per-cell bit masks internally and each emitted step includes a 9x9 candidate snapshot for the UI.

**Decision - Strategy set:** The first version implements naked singles, hidden singles, and naked pairs. It stops when these named strategies can no longer make progress. This is intentional: the mode demonstrates explainable human deductions rather than guaranteeing completion through guessing.

**Decision - New step types:** `human-place` records a named placement plus peer eliminations. `human-eliminate` records candidate removals from a named pattern such as Naked Pair. Both step types include `strategy`, `reason`, `eliminated`, and `snapshot`.

**Decision - Visualizer:** Added `Human Logic Solver` to the algorithm dropdown and trace builder map. The existing candidate-pencil render path is reused. Status text now shows the active strategy name, and the stat tiles show Deductions + Eliminations for human logic.

**Testing:** Added solver tests for invalid boards, naked-single placement, no input mutation, and naked-pair eliminations. Added visualizer tests for human trace selection and human-specific stat labels. Browser smoke now selects Human Logic, waits for a named deduction, verifies pencil marks render, and pauses without console errors.

**Cache update:** Bumped service worker cache from `sudoku-v24` to `sudoku-v25` and updated the six `?v=` query strings in `index.html` from `?v=20260525-cp` to `?v=20260525-human`.

### 2026-05-25 - Human Logic Solver v2

**Context:** Added a second human-logic option without replacing the original. The original `Human Logic Solver` remains the simpler teaching mode; `Human Logic Solver v2` extends it with intermediate strategies.

**Decision - Solver:** Added `createHumanLogicV2Trace(board)` as a superset of `createHumanLogicTrace(board)`. Both use the same internal candidate-mask machinery and the same `human-place` / `human-eliminate` step vocabulary. V2 enables additional strategy passes after naked singles, hidden singles, and naked pairs.

**Decision - New strategies:** V2 adds hidden pairs, pointing pairs/triples, and box-line reduction. Each emitted elimination step includes structured context (`unit`, `line`, `value`, `cells`, `eliminated`, `reason`, and `snapshot`) so future UI highlighting can show the source unit and affected row/column/box.

**Decision - UI:** Added `Human Logic Solver v2` as a separate dropdown option (`human-v2`). The original `human` option is unchanged. V2 uses the same candidate pencil-mark renderer, status text, and Deductions / Eliminations stat labels as the original human mode.

**Testing:** Added focused trace tests for hidden pair, pointing pair/triple, and box-line reduction using fixed boards that exercise each strategy. Added visualizer selection coverage and updated the browser smoke test to select and run the v2 dropdown option.

**Cache update:** Bumped service worker cache from `sudoku-v25` to `sudoku-v26` and updated the six `?v=` query strings in `index.html` from `?v=20260525-human` to `?v=20260525-humanv2`.

### 2026-05-25 - Documentation workflow rule

**Context:** Before pushing the Human Logic changes, the project guide and implementation log were reviewed for stale guidance.

**Decision - Implementation log discipline:** `CLAUDE.md` now explicitly requires updating `implementation-notes.md` while implementing anything, rather than treating it as a final cleanup step. This keeps the running decision log useful for future sessions.

**Decision - Pre-push doc review:** `CLAUDE.md` now explicitly requires re-checking both `CLAUDE.md` and `implementation-notes.md` before every GitHub push request and updating them first when implementation, workflow, file structure, cache/deploy behavior, or key decisions changed.

**Tradeoff:** This adds a small amount of process before each push, but it prevents the project guide and running notes from drifting behind the code.

### 2026-05-25 - Playback time label clarification

**Issue observed:** Comparing Human Logic Solver and Human Logic Solver v2 from the UI made v1 look faster on some hard puzzles. Investigation showed the displayed time was selected-speed animation playback duration, not raw solver compute time. V2 can emit more explainable elimination steps, so the replay can take longer even when v2 is logically stronger or solves at least as much of the board.

**Verification:** A 200-puzzle hard-level sample showed v2 had slightly more average trace steps and playback duration (`47.915` vs `47.32` steps at 2x), while raw JavaScript trace generation stayed sub-millisecond on average for both modes. A prior 2,000-puzzle same-board comparison found no cases where v2 ended with fewer solved cells than v1.

**Decision - UI wording:** Renamed the stat tile from `Solving Time` to `Playback Time` so users do not mistake selected-speed animation duration for algorithm compute performance.

**Decision - Docs:** Updated `CLAUDE.md` and `README.md` to describe the time stat as playback time. `Finish Now` still projects the remaining selected-speed trace duration; only the wording changed.

### 2026-05-25 - Solving time uses actual compute time

**Issue observed:** Renaming the stat to `Playback Time` was accurate for the old implementation but did not satisfy the product goal. Viewers need the time stat to compare how long each algorithm actually takes to solve or trace the same Sudoku layout.

**Decision - Measurement:** Replaced the playback timer with `_solveDurationMs`, measured around `_buildTrace()` via `performance.now()` with a `Date.now()` fallback. `elapsedText()` now displays this measured trace-generation time to three decimals.

**Decision - UI wording:** Restored the stat label to `Solving Time`, now with corrected semantics. Playback speed still affects animation pacing only; it no longer changes the displayed algorithm time.

**Decision - Finish Now:** `finishNow()` now recomputes the selected algorithm trace and records the measured solve duration. It no longer adds projected remaining playback duration.

**Testing:** Updated unit tests to assert that `runSolver()` and `finishNow()` record measured solve duration, reset/new puzzle clear it, and final animation steps do not mutate it. Updated the browser smoke test to verify the visible label is `Solving Time`.

### 2026-05-25 - Separate Solving Time and Compute Time

**Issue observed:** A single time stat could not satisfy both viewer expectations. Users need `Solving Time` to behave like the current visual run timer (pause/resume and `Finish Now` projection), but also need a truthful raw algorithm timing for comparing DFS, MRV, Constraint Propagation, and Human Logic.

**Decision - Two clocks:** Added a second status-card time stat, `Compute Time`. `Solving Time` again tracks selected-speed visual run duration through `_elapsedMs` and `_runStartTime`. `Compute Time` tracks `_computeDurationMs`, measured around `_buildTrace()` via `_measureTrace()`.

**Decision - Pause behavior:** `Pause` stops playback and flushes the current live visual run segment into `_elapsedMs`. `Compute Time` does not change while paused.

**Decision - Finish Now behavior:** `Finish Now` keeps the previous visual semantics: it stops playback, adds the remaining trace length multiplied by the current playback delay to `Solving Time`, advances to the end, and marks the run solved or stuck. It also recomputes the trace and records the current algorithm's measured `Compute Time`.

**Testing:** Updated visualizer lifecycle tests for both clocks and updated the browser smoke test to assert `Solving Time` freezes on pause, `Compute Time` stays stable while paused, and both labels appear in the status card.
