# Design — Constraint Propagation (Norvig's AC-3 + search) as third selectable algorithm

**Date:** 2026-05-25
**Status:** Approved, ready for implementation plan

## Goal

Add Constraint Propagation as the third selectable solving algorithm in the Sudoku visualizer, after Backtracking DFS and Backtracking + MRV. Its educational payoff is visually distinct from the first two: instead of filling one cell at a time, it shows every empty cell holding a set of candidate digits (pencil marks) that shrink as constraints propagate, often solving easy/medium puzzles with zero guessing.

## Why this algorithm

The first two algorithms share the same visual motion (place a number, maybe undo it) — a viewer who has seen both has seen the trick. Constraint propagation looks fundamentally different: candidate sets shrinking, cascading ripples when one assignment forces eliminations across 20 peers, and frequent zero-guess solves. This is the "whoa" payoff that justifies the extra render work.

It is the algorithm Peter Norvig described in "Solving Every Sudoku Puzzle": two propagation rules (naked single, hidden single) applied to fixpoint, with depth-first search as a fallback when propagation stalls.

## Scope and constraints

- Keep the existing Backtracking DFS and MRV paths **untouched**.
- Reuse the existing "build full trace up front, then replay with setInterval" model.
- Same trace contract as the other two builders: `{ solved, steps, solvedBoard }`, reject invalid givens, never mutate the input board.
- This is the first algorithm that needs a genuinely new render path (pencil marks) and new step types. That is accepted as the cost of the visual payoff.

## 1. Solver: `createConstraintPropagationTrace(board)`

New function in `src/solver.js`, exported alongside `createBacktrackingTrace` and `createMrvTrace`.

**Contract:** identical to the others.
- Reject invalid givens via `hasValidGivens` → return `{ solved: false, steps: [], solvedBoard: null }`.
- Never mutate the input board (operate on copies).
- Return `{ solved, steps, solvedBoard }`.

**Internal model:** an array of 81 candidate sets, one per cell, each represented as a 9-bit integer (bitmask, bit `d-1` set means digit `d` is still possible). Bitmasks keep per-step snapshots compact.

**Core operations (port of Norvig):**
- `eliminate(cands, cell, d)` — remove digit `d` from a cell's candidate set.
  - If `d` was already absent, no-op.
  - If the cell's set becomes empty → **contradiction**, return false.
  - If the cell drops to a single value → naked single: enqueue it as a forced assignment.
  - For each unit (row, column, box) the cell belongs to: if `d` now has only one possible cell in that unit → hidden single: enqueue that cell as a forced assignment for `d`.
- `assign(cands, cell, d)` — eliminate every digit except `d` from the cell (drives the eliminations above).

**Wave-based trace (chosen granularity):** forced assignments are processed through a FIFO queue rather than pure recursion, so each dequeued assignment plus the peer eliminations it directly triggers becomes **one `propagate` step**. Cascading singles land as subsequent steps (the next waves). When the queue drains and the board is solved, the trace is complete.

Initialization: start every cell at all nine candidates, then enqueue each given clue as a forced assignment so propagation ripples from the givens.

**Search fallback (required for hard puzzles):** if the queue drains but unsolved cells remain, propagation has stalled. Pick the unsolved cell with the fewest candidates (MRV / fail-first). For each candidate value:
1. Emit a `guess` step.
2. Copy the candidate grid, `assign` the guessed value, run propagation.
3. If a contradiction occurs, emit a `contradiction` step (the grid restores to the pre-guess snapshot) and try the next candidate.
4. Otherwise recurse into the deeper search.

**Step shapes:**
```js
{ type: 'propagate',     row, col, value, eliminated: [ {row, col, value}, ... ], snapshot }
{ type: 'guess',         row, col, value, snapshot }
{ type: 'contradiction', row, col, snapshot }   // branch abandoned, grid restored
```
`snapshot` is the full 81-cell candidate state (bitmasks) **after** the step is applied. The visualizer renders whatever the current step's snapshot holds — no candidate logic lives in the UI. `eliminated` lists the peers that actually lost the assigned digit in this wave (drives elimination count and flash highlights).

`solvedBoard` is the 9×9 grid derived from the final snapshot (every cell a single candidate) when solved, else `null`.

## 2. Render: pencil marks

The cell render (currently a single `x-text="cell.value || ''"` at `index.html`) becomes conditional:
- **Solved or given cell** (single candidate) → big number, existing styling and color rules.
- **Unsolved cell with candidate data** → a 3×3 mini-grid of remaining candidate digits. Each digit sits in its natural fixed position (1 top-left, 2 top-center, … 9 bottom-right), so digits do not reflow as the set shrinks — eliminated digits simply leave an empty slot.
- **No candidate data** (Backtracking/MRV selected, or Constraint Propagation idle before Run) → blank, exactly as today.

New CSS:
- `.cell-candidates` — the 3×3 mini-grid container inside a cell.
- `.cell-candidate` — a single tiny candidate digit; muted color, reduced further on the mobile breakpoint (`max-width: 639px`).

Highlight colors:
- Just-assigned cell (`propagate`) flashes amber, reusing the existing current-cell highlight.
- `guess` cell gets a distinct violet tint (matches the algorithm panel's violet accent).
- `contradiction` cell flashes red.

Visualizer exposes `cellCandidates(row, col)` returning a digit array (or `null` when there is no candidate data for the current step). `cells()` gains a `candidates` field so the template can render pencil marks per cell.

## 3. Visualizer integration & stats

In `src/visualizer.js`:
- Register the builder: `TRACE_BUILDERS.constraint = createConstraintPropagationTrace`.
- Add `ALGORITHM_LABELS`, `algorithmBadgeLabel`, and `subtitleText` entries for `constraint`.
- `setAlgorithm` already resets the trace generically — no change needed.
- `_applyNextStep` branches on step type:
  - `propagate` → update solved cells and the rendered snapshot; increment the elimination counter by `eliminated.length`.
  - `guess` → set highlight + snapshot; increment the guess counter.
  - `contradiction` → set highlight + restore snapshot.
  - Solved cell values derive from the current snapshot.
- `finishNow` and the solving-time projection are unchanged — they already scale by `steps.length` and jump to `solvedBoard`.

In `index.html`:
- Add `<option value="constraint">⬡ Constraint Propagation</option>` to the algorithm `<select>`.

**Algorithm-aware stat tiles (chosen):** the two tile labels and values become reactive methods rather than static text.
- Backtracking DFS & MRV → `Placed` (blue, `placedCount`) + `Backtracks` (red, `backtrackedCount`) — unchanged behavior.
- Constraint Propagation → `Eliminations` (blue, running count of digits removed) + `Guesses` (red, count of `guess` steps).
- `Solving Time` tile is unchanged.
- Tile colors stay blue/red; only labels and which counters feed them change. HTML tile labels switch from static text to `x-text` bindings (e.g. `statLabelPrimary()` / `statLabelSecondary()` and matching value getters).

## 4. Testing (TDD)

**Solver tests (`tests/game.test.js`):**
- Solves a known easy puzzle with **zero `guess` steps** (pure propagation path).
- Solves a hard puzzle to its unique solution; the final snapshot's singles equal `solvedBoard`.
- A puzzle requiring search produces at least one `guess` step and at least one `contradiction` step.
- Does not mutate the input board.
- Rejects invalid givens → `{ solved: false, steps: [], solvedBoard: null }`.

**Visualizer tests:**
- `runSolver` builds the Constraint Propagation trace when `selectedAlgorithm === 'constraint'`.
- `setAlgorithm('constraint')` clears the previous trace and returns to `ready`.
- Stat labels switch to `Eliminations` / `Guesses` when Constraint Propagation is selected.
- `cellCandidates(row, col)` returns the expected digit array for a known snapshot.

**Smoke test (`tests/smoke.test.js`):** select Constraint Propagation, click Run, assert pencil-mark digits appear and a chosen cell's candidate count decreases over steps, Finish Now solves the board, Reset restores the layout.

## 5. Pre-push chores (per CLAUDE.md checklist)

- Bump service-worker cache `sudoku-v23` → `sudoku-v24` in `sw.js`; update all six `?v=` query strings in `index.html`.
- Add an `implementation-notes.md` entry (date heading + decisions/tradeoffs).
- Update `CLAUDE.md` (third algorithm in the selectable-algorithm section; new step types; pencil-mark render note) and the README "Solving Algorithms" / "Algorithm Comparison" sections (mark Constraint Propagation implemented, add a learning paragraph).
- `npm test && npm run test:smoke` must pass before pushing.

## Out of scope

- Dancing Links (DLX), SAT, simulated annealing, genetic — deferred candidates listed in the README comparison table.
- No changes to puzzle generation, difficulty levels, dark mode, or PWA behavior beyond the cache bump.
