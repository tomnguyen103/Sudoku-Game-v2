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
- Tracks placed values, backtracks, visual solving time, and algorithm compute time.
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
3. Choose the algorithm: `Backtracking DFS`, `Backtracking + MRV`, `Constraint Propagation`, `Human Logic Solver`, `Human Logic Solver v2`, `Human Logic Solver v3`, `Simulated Annealing`, or `Knuth's Algorithm X (DLX)`.
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
| Pause | Freezes animation playback and visual solving time. |
| Finish Now | Skips the remaining animation while projecting visual solving time to selected-speed completion, fills the solved board when available, and keeps the measured compute time. |
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

The app ships with eight selectable algorithms. The backtracking variants and Algorithm X share grid-focused placement/backtrack vocabularies. Constraint Propagation, Algorithm X (DLX), and the Human Logic modes use candidate snapshots so the visualizer can show pencil marks shrinking as constraints collapse.

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

### Human Logic Solver v3

Human Logic Solver v3 extends v2 with fish elimination techniques: **X-Wing** and **Swordfish**. X-Wing applies when a candidate digit appears in exactly two cells in each of two rows, and those two cells share the same two columns — the digit can be eliminated from every other cell in those columns. Swordfish generalises the pattern to three rows and three columns. These eliminations are invisible to the single-row or single-box rules of earlier modes but follow strict logical necessity, never guessing. Like all human-logic modes, v3 stops rather than guesses when its technique set is exhausted.

### Simulated Annealing

Simulated Annealing is a stochastic local search meta-heuristic. Unlike depth-first search, the board starts fully filled using a box-complete heuristic that guarantees zero box conflicts from the start. The solver then randomly swaps non-clue digits inside boxes to minimize row and column conflicts. Moves that reduce conflicts are always accepted; moves that increase conflicts are accepted with a probability that scales with a decreasing temperature parameter ($e^{-\Delta E / T}$). This allows the solver to escape local minima. In the visualizer, every cell is filled from the first frame, and you can see digits swapping and conflicts decreasing live.

### Knuth's Algorithm X (DLX)

Knuth's Algorithm X solved via Dancing Links (DLX) is the ultimate exact cover formulation of Sudoku. It translates the 9x9 board into a 729-row by 324-column binary matrix where columns represent cell, row, column, and box constraints. It uses a sparse matrix represented by a toroidal quad-linked list. The search selects columns with the minimum active rows (Knuth's S-heuristic) and recursively covers satisfied constraints. In the visualizer, active cell candidates are extracted in $O(1)$ from the column lists, showing pencil marks dynamically shrinking and expanding as constraints collapse.

## Algorithm Comparison

The app currently implements Backtracking DFS, Backtracking + MRV, Constraint Propagation, Human Logic v1/v2/v3, Simulated Annealing, and Knuth's Algorithm X (DLX). The table below covers all implemented algorithms plus one non-viable option kept for reference. Because this app is a *visualizer*, an algorithm's value depends not only on speed but on whether its steps produce a watchable cell-by-cell trace.

Variables used: **m** = empty cells (36 Easy / 46 Medium / 52 Hard), **n** = 81 total cells, **d** = 9 digits, **b** = effective branching factor, **P** = number of technique passes, **r** = 9 rows/cols, **R** = expected restarts, **N** = cooling iterations.

### Implemented algorithms

| Algorithm | Worst-case complexity | How the cost is derived | Typical steps Easy / Hard | Guarantees solution? | Visualization quality |
|---|---|---|---|---|---|
| **Backtracking DFS** | O(9^m) | 9 digit choices per empty cell; tree depth = m; validity check = O(1) per node | ~200 / ~5,000–50,000 | Yes | Medium — linear left-to-right march, dramatic step count on Hard |
| **Backtracking + MRV** | O(b^m × m) | Same DFS tree but effective b ≈ 1.2–2 because forced cells (b=1) are resolved first; O(m) scan per step to find MRV cell | ~20 / ~50–200 | Yes | Good — visible jump to most-constrained cell; stark contrast with DFS on Hard |
| **Constraint Propagation** | O(n·d³ + b^r·r) | AC-3 propagation: O(edges·d²) = O(n×d³) ≈ 59K ops; search fallback only on remaining r hard cells | ~81 propagation-only / ~200–500 | Yes | Excellent — pencil marks shrink and ripple; deduction process is watchable |
| **Human Logic v1** | O(P·n·d) | P passes × 81 cells × 9 digits; naked/hidden single scan = O(n·d) per pass | Solves most / often stalls | No — stops when stuck | Excellent — named strategy per step; tutor-style |
| **Human Logic v2** | O(P·n·d²) | Adds pair detection O(n²) per unit; box-line reduction O(n·d) | Solves most / sometimes stalls | No | Excellent |
| **Human Logic v3** | O(P·(n·d + d·r³)) | Adds X-Wing O(d·r²) = 324 checks/pass; Swordfish O(d·r³) = 756 checks/pass | Solves / stalls on hardest | No | Excellent |
| **Simulated Annealing** | O(R × N) | Each iteration O(1): pick box, swap 2 non-clue cells. N = log(T_min/T_initial)/log(α). R restarts. | ~50K–100K / ~100K–500K | Probabilistic (random restarts) | Excellent — board fully filled, swaps digits and counts conflicts live |
| **Knuth's Algorithm X (DLX)** | O(9^m) | 4 constraint columns per choice row; S-heuristic minimizes branching factor | ~20 / ~50–1,000 | Yes | Excellent — toroidal matrix reduction maps directly to shrinking pencil marks |

### Non-viable options (reference only)

| Algorithm | Reason not implemented |
|---|---|
| **SAT solver** | Encodes 729 boolean variables; clause propagation steps have no grid-cell interpretation; solver is a black box from the visualizer's perspective |

### Why each algorithm was added

**Backtracking DFS** is the project baseline — the simplest correct solver, and the most dramatic failure case on Hard puzzles.

**Backtracking + MRV** reuses the same `place`/`backtrack` vocabulary with no new render path. The contrast with DFS on Hard is immediately visible and educational: the MRV highlight jumps to the most-constrained cell instead of marching left to right.

**Constraint Propagation** introduced a second render path (`propagate`, `guess`, `contradiction`) and candidate snapshots so pencil marks appear in every empty cell. Easy puzzles often solve by propagation alone — no guessing at all — which is a qualitatively different visual from backtracking.

**Human Logic v1/v2/v3** reuse the candidate snapshot infrastructure and add named strategy labels per step, turning elimination events into teachable moments. Each version adds a harder class of technique while still refusing to guess.

**Simulated Annealing** represents a stochastic, local search optimization paradigm where the board is fully filled from the first frame and values are swapped to resolve conflicts. Temporary steps are accepted stochastically based on decreasing temperature.

**Knuth's Algorithm X (DLX)** showcases matrix-level constraint reduction on doubly-linked toroidal grids, mapping exact cover transitions onto active candidate sets.

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
