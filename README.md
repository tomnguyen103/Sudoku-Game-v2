# Sudoku Solver Visualizer

A browser-based visualizer for Sudoku solving algorithms. The app generates a valid Easy, Medium, or Hard Sudoku puzzle, shows the unsolved layout, and then animates how different solvers search, propagate constraints, or apply human-readable deductions.

This project is a static web app deployed from the repository root. It has no backend, no bundler, and no build output directory.

## Live Project

[Open the live Sudoku Solver Visualizer](https://sudoku.tomnguyen.me/)

To keep this GitHub README open, use `Ctrl`+click on Windows/Linux, `Cmd`+click on macOS, or right-click the link and choose `Open link in new tab`.

## Project Image

![Sudoku Solver Visualizer interface](sudoku-display.png)

## What It Does

- Generates fresh Sudoku layouts for Easy, Medium, and Hard.
- Verifies generated layouts are valid, solvable, and unique before display.
- Keeps the current puzzle fixed until the user changes difficulty or clicks `New Puzzle`.
- Animates a backtracking trace with placement and backtracking highlights.
- Tracks placed values, backtracks, and selected-speed solving time.
- Supports pause, resume, reset, immediate completion, speed selection, and dark mode.
- Works as a static Netlify site and includes PWA metadata plus a cache-first service worker.

## Try It Locally

Install dependencies once:

```bash
npm install
```

Start any static file server from the repository root:

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

The app can also be opened from an existing local static server. Avoid opening `index.html` directly from the filesystem when checking PWA/service-worker behavior.

## User Flow

1. Choose `Easy`, `Medium`, or `Hard`.
2. Review the generated starting layout.
3. Choose the algorithm: `Backtracking DFS`, `Backtracking + MRV`, `Constraint Propagation`, `Human Logic Solver`, or `Human Logic Solver v2`.
4. Choose playback speed: `1x`, `2x`, `5x`, or `10x`.
5. Click `Run Algorithm` to animate the trace.
6. Use `Pause`, `Finish Now`, `Reset`, or `New Puzzle` as needed.

`Reset` restores the same generated puzzle to its original unsolved layout. `New Puzzle` generates a fresh layout for the selected difficulty.

## Controls

| Control | Behavior |
|---|---|
| Difficulty | Generates a new puzzle when changed. |
| Algorithm | Selects the visualized solving algorithm. Switching resets the current trace. |
| Run Algorithm | Builds and replays the backtracking trace for the current puzzle. |
| Speed | Changes playback delay for the visualizer. |
| Pause | Freezes animation and solving time. |
| Finish Now | Skips the remaining wait while adding the projected selected-speed trace duration, fills the solved board, and marks the puzzle solved. |
| Reset | Clears solver-added values and returns to the current generated layout. |
| New Puzzle | Generates a fresh puzzle at the current difficulty. |
| Theme toggle | Toggles dark mode and persists the preference in `localStorage`. |

## Visual Design

The page is a solver visualizer, not a manual Sudoku game. There is no number pad, hint system, mistake counter, score, leaderboard, or game-over flow.

The desktop layout places the board next to a control/status column. The board grows at the large-screen breakpoint so its square height lines up with the full control column. In stacked browser widths, the puzzle and controls left-align with the title. On mobile, the board uses height-aware sizing and the controls compress so the full puzzle, controls, and status notification fit in one viewport on common phone sizes.

Dark mode is implemented by toggling the `dark` class on `<html>`.

## Difficulty Model

Difficulty is defined by the number of empty cells:

| Difficulty | Empty cells |
|---|---:|
| Easy | 36 |
| Medium | 46 |
| Hard | 52 |

Generation starts from a complete solved board, shuffles it, removes clues, and accepts only layouts with exactly one solution.

## Solving Algorithms

The app ships with five selectable algorithms. The backtracking variants share the same validity rules and `place` / `backtrack` step vocabulary. Constraint Propagation and the Human Logic modes use candidate snapshots so the visualizer can show pencil marks shrinking as deductions happen.

The UI does not mutate the DOM live, one step at a time. Each algorithm first produces a complete, deterministic trace of placements and backtracks, and the visualizer replays that trace at the selected speed. This keeps pause, reset, finish-now, and testing behavior predictable.

### Backtracking DFS

Backtracking DFS (depth-first search) is the classic brute-force method. It scans the grid in reading order and, at the first empty cell, tries the digits 1 to 9. It places a digit only if that digit is currently valid, then recurses to the next empty cell. When a cell has no legal digit, the solver clears it and returns to the previous cell to try that cell's next candidate — this reversal is the *backtrack*. Because the cell order is fixed and unrelated to how constrained each cell is, the search can sink deep into doomed branches before recovering. That is why hard puzzles produce thousands of placements and backtracks before the solution appears.

### Backtracking + MRV

Backtracking + MRV adds the **Minimum Remaining Values** heuristic to the same depth-first search. Instead of always taking the first empty cell, it inspects every empty cell, counts how many digits are still legal there, and fills the *most constrained* cell — the one with the fewest candidates — first. This "fail-first" ordering surfaces dead ends immediately and resolves forced cells (those with a single candidate) without any guessing. The final solution is identical to plain backtracking, but the path to it is far shorter: on a typical hard puzzle, MRV finishes in tens of steps with zero backtracks where naive search needs thousands. In the visualizer the highlight visibly jumps to whatever cell is currently most constrained instead of marching left to right, which makes the heuristic easy to see in action.

### Constraint Propagation

Constraint propagation treats every empty cell as a set of candidate digits and repeatedly applies two rules to fixpoint: a *naked single* (a cell with one remaining candidate is solved, and that digit is struck from its 20 peers) and a *hidden single* (if a digit has only one possible cell left in a row, column, or box, it must go there). Each assignment cascades — one placement can ripple eliminations across the board, and easy puzzles often solve with no guessing at all. When propagation stalls on harder puzzles, the solver falls back to a fail-first depth-first search: it guesses the most constrained cell, propagates, and backtracks on contradiction. This is the approach Peter Norvig describes in "Solving Every Sudoku Puzzle." In the visualizer, each empty cell shows its remaining candidates as pencil marks that shrink as constraints propagate.

### Human Logic Solver

The Human Logic Solver applies named Sudoku techniques instead of guessing. It starts from candidate pencil marks and repeatedly looks for explainable deductions: naked singles, hidden singles, and naked pairs. Each step records the strategy name, affected cells, eliminated candidates, and a candidate snapshot. Unlike Constraint Propagation, this mode intentionally stops when its current human techniques cannot make more progress; it is a tutor-style solver, not a guaranteed fastest solver.

### Human Logic Solver v2

Human Logic Solver v2 keeps the original human mode intact and adds intermediate techniques: hidden pairs, pointing pairs/triples, and box-line reduction. These strategies still avoid guessing, but they can remove candidates by reasoning about how rows, columns, and boxes constrain each other. The mode remains explainable and can still stop when it needs techniques beyond the current set.

## Algorithm Comparison

The app currently implements algorithms #1, #2, #3, and two versions of #6 below. The table compares them with other algorithms that can solve a 9x9 Sudoku, as a reference for possible future additions. Because this app is a *visualizer*, an algorithm's value here depends not only on speed but on whether its steps produce a watchable cell-by-cell trace.

| # | Name | Description | Method | Time complexity | Solving time (typical 9x9) | Difficulty rank (easy to hard) |
|---|------|-------------|--------|-----------------|----------------------------|---------------------------------|
| 1 | **Naive backtracking** *(current)* | First empty cell, try 1-9, recurse, undo on failure | Brute-force depth-first search | O(9^m), m = empty cells | ms to seconds; spikes on hard | Easy: fast - Medium: ok - Hard: many backtracks, can stall |
| 2 | **Backtracking + MRV heuristic** | Always fill the empty cell with the *fewest* legal candidates next | DFS + minimum-remaining-values ordering | O(9^m) worst case, hugely reduced in practice | ms across all difficulties | Easy: instant - Medium: instant - Hard: still fast, few backtracks |
| 3 | **Constraint propagation + search** (Norvig) *(current)* | Eliminate candidates (naked/hidden singles) until stuck, then MRV search | AC-3-style propagation + DFS | Near-linear on easy, low-poly on hard | sub-ms to low ms | Easy: solved by propagation alone - Hard: fast |
| 4 | **Dancing Links / DLX** (Algorithm X) | Model as exact-cover matrix; cover/uncover columns via linked lists | Knuth's Algorithm X | Exponential worst case, extremely fast in practice | microseconds to ms | Uniformly very fast at all difficulties |
| 5 | **SAT solver** | Encode rules as boolean CNF, hand to a SAT engine | Reduction + DPLL/CDCL | NP-complete; solver-dependent | ms (incl. encoding overhead) | Uniformly fast; overkill for 9x9 |
| 6 | **Human logic strategies** *(current)* | Apply named techniques: singles, pairs, pointing, and box-line rules | Rule-based deduction | Polynomial per pass | ms, but cannot finish puzzles needing guessing | Easy: often solves or progresses - Hard: can stall without fallback |
| 7 | **Simulated annealing / genetic** | Random fill, swap cells to minimize conflicts | Stochastic optimization | No guarantee; probabilistic | seconds; may not converge | Inconsistent; worse on hard, can fail |

### Why these three are implemented

Backtracking DFS (#1) is the project's original baseline. Backtracking + MRV (#2) was added next because it offers the best learning value for the least risk:

- It reuses the existing `place`/`backtrack` step vocabulary, so no new render logic is needed.
- It is a small, dependency-free change with no build step.
- The contrast with naive backtracking is dramatic and educational on Hard puzzles.

Constraint Propagation (#3) was added because it is visually distinct from the two backtracking variants: instead of filling one cell at a time, it shows each empty cell's candidate set (pencil marks) shrinking and rippling as naked and hidden singles propagate, then falls back to a fail-first search only when propagation stalls. This required a new render path and new step vocabulary (`propagate`, `guess`, `contradiction`), but it makes the deduction process — not just the search — watchable.

Human Logic (#6) was added next because it turns candidate changes into named, teachable deductions. The original mode stays intentionally small: naked singles, hidden singles, and naked pairs. Human Logic v2 adds hidden pairs, pointing pairs/triples, and box-line reduction while still avoiding guessing. X-wing remains a good future advanced strategy.

The faster algorithms (DLX, SAT) remain future candidates rather than current features because their internal steps — column covering, clause propagation — do not map cleanly onto a 9x9 grid animation, so they would be opaque to watch.

## Tech Stack

| Layer | Choice |
|---|---|
| Markup | `index.html` |
| Styling | Local Tailwind browser runtime plus custom `style.css` |
| Reactivity | Local Alpine.js |
| Solver/generator logic | Vanilla JavaScript modules in `src/` |
| Tests | Node `assert` tests and Playwright browser smoke test |
| Deployment | Netlify static site |
| PWA | `manifest.json`, icons, and `sw.js` |

All runtime libraries are vendored in `vendor/` so the app does not depend on CDN availability.

## Project Structure

```text
index.html                 - page markup, Alpine root, script/style loading, PWA tags
style.css                  - board grid, visual states, responsive layout, mobile controls
src/solver.js              - validation, solvePuzzle, countSolutions, trace creation
src/generator.js           - solution generation, board shuffling, clue removal
src/visualizer.js          - Alpine state, playback controls, timers, UI helpers
game.js                    - CommonJS compatibility export for Node tests
vendor/                    - local Tailwind and Alpine runtime files
manifest.json              - PWA manifest
sw.js                      - cache-first service worker asset list
icons/                     - PWA icons
tests/game.test.js         - solver, generator, and visualizer behavior tests
tests/project.test.js      - setup, docs, and asset guardrail tests
tests/smoke.test.js        - Playwright browser workflow smoke test
docs/release-checklist.md  - deployment checklist
implementation-notes.md    - running log of decisions and tradeoffs
```

## Development

Run the logic and setup tests:

```bash
npm test
```

Run the browser smoke test:

```bash
npm run test:smoke
```

Run everything before pushing or deploying:

```bash
npm test && npm run test:smoke
```

## PWA Cache Notes

The service worker uses a cache-first strategy for static runtime assets. When changing files listed in `sw.js`, update both:

- the `CACHE` version in `sw.js`
- the matching `?v=` query strings in `index.html`

The page listens for `controllerchange` and reloads automatically when a new service worker takes over, so deployed updates do not require users to hard-refresh.

## Deployment

Connect the GitHub repository to Netlify.

- Build command: none
- Publish directory: repository root
- Entry point: `index.html`

Before deployment, follow [docs/release-checklist.md](docs/release-checklist.md).

## Documentation

- Project guide: [CLAUDE.md](CLAUDE.md)
- Implementation notes: [implementation-notes.md](implementation-notes.md)
- Original design spec: [docs/superpowers/specs/2026-05-23-sudoku-game-design.md](docs/superpowers/specs/2026-05-23-sudoku-game-design.md)

## Out Of Scope

Manual Sudoku play, hints, pencil notes, score tracking, leaderboards, user accounts, native mobile packaging, and backend persistence are intentionally outside the current project scope.
