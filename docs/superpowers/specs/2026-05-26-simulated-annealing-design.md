# Simulated Annealing Algorithm — Design Spec

**Date:** 2026-05-26
**Status:** Approved

---

## Overview

Add Simulated Annealing (SA) as the seventh selectable algorithm in the Sudoku Solver Visualizer. SA is a stochastic optimization algorithm that fills the entire board from frame one and iteratively swaps cell values within boxes to drive the conflict count toward zero. It is the first algorithm in this project that starts with a fully filled board rather than building the solution incrementally — making it visually distinct from all existing modes.

---

## Approach

All implementation goes into the existing files following established patterns:

- `createSimulatedAnnealingTrace()` added to `src/solver.js`
- Registration, stat tile labels, state fields, and step handlers added to `src/visualizer.js`
- One new `<option>` in `index.html`
- Cache version bump in `sw.js` and `index.html`
- New test cases in `tests/game.test.js` and one count update in `tests/project.test.js`

No new files. No new module boundaries.

---

## Trace Builder — `createSimulatedAnnealingTrace(board)`

### Phase 0 — Box-complete fill

For each of the 9 boxes, collect which digits 1–9 are absent from the given clues in that box. Fill the empty cells in that box with those missing digits in random order. After this phase every box contains all nine digits exactly once, so box conflicts are zero. Only row and column conflicts remain.

### Phase 1 — Cooling loop

```
T       = 2.0       (initial temperature)
T_min   = 0.005     (frozen threshold)
α       = 0.99995   (geometric cooling rate per iteration)
maxIter = 500_000   (hard iteration cap per attempt)
```

Each iteration:
1. Pick a random box (0–8).
2. Pick two distinct non-clue cells inside it.
3. Swap their values.
4. Compute `ΔE = newConflicts − oldConflicts`.
5. Accept if `ΔE < 0` OR `Math.random() < Math.exp(-ΔE / T)`.
6. If accepted: update board, emit `sa-swap` step.
7. If rejected: undo swap (no step emitted).
8. `T *= α`.
9. If `T < T_min` and `conflictCount > 0`: trigger restart.

### Restarts

When the temperature floor is reached with unsolved conflicts, re-run Phase 0 with a new random fill, reset `T = 2.0`, and continue. Up to 5 restart attempts before giving up and returning `solved: false`. Each restart emits one `sa-restart` step.

### Conflict counting

Only row and column conflicts are counted (box conflicts are always zero by construction). A conflict is any duplicate digit within a row or column. Computed by scanning all 9 rows and 9 columns — O(n) per check.

### Step shapes

```js
// Emitted once per attempt after the initial random fill
{
  type: 'sa-fill',
  attempt: Number,      // 1-based restart count
  board: Number[][],    // 9x9 snapshot — all 81 cells filled
  conflicts: Number     // initial row+col conflict count
}

// Emitted on every accepted swap
{
  type: 'sa-swap',
  row1: Number, col1: Number,   // first swapped cell
  row2: Number, col2: Number,   // second swapped cell
  val1: Number,                 // value now at (row1, col1)
  val2: Number,                 // value now at (row2, col2)
  conflicts: Number,            // conflict count after swap
  temperature: Number,          // current T (rounded to 4 dp)
  board: Number[][]             // 9x9 board snapshot
}

// Emitted when cooling reaches T_min with conflicts > 0
{
  type: 'sa-restart',
  attempt: Number,    // new attempt number (2-based onward)
  board: Number[][],  // 9x9 snapshot after fresh fill
  conflicts: Number   // conflict count after fresh fill
}
```

### Return contract

Same as all other trace builders:
```js
{ solved: Boolean, steps: Array, solvedBoard: Number[][] | null }
```

---

## Visualizer Changes — `src/visualizer.js`

### Registration

```js
// TRACE_BUILDERS
sa: createSimulatedAnnealingTrace

// ALGORITHM_LABELS
sa: 'Simulated Annealing'
```

### New state fields

```js
swapCount: 0,       // increments on every sa-swap step
conflictCount: 0,   // mirrors step.conflicts; counts down toward 0
saAttempt: 0,       // current attempt number (1 on first fill)
```

These are zeroed in `resetPuzzle()` and `newPuzzle()`.

### Stat tile labels and values

| Method | SA value |
|--------|----------|
| `statLabelPrimary()` | `'✦ Swaps'` |
| `statLabelSecondary()` | `'↯ Conflicts'` |
| `statValuePrimary()` | `this.swapCount` |
| `statValueSecondary()` | `this.conflictCount` |

### `_applyNextStep()` — new branches

```js
if (step.type === 'sa-fill') {
  this.conflictCount = step.conflicts;
  this.saAttempt = step.attempt;
  this.board = step.board.map(r => [...r]);
}
if (step.type === 'sa-swap') {
  this.swapCount++;
  this.conflictCount = step.conflicts;
  this.board = step.board.map(r => [...r]);
}
if (step.type === 'sa-restart') {
  this.saAttempt = step.attempt;
  this.conflictCount = step.conflicts;
  this.board = step.board.map(r => [...r]);
}
```

Note: SA steps carry a full `board` snapshot rather than a `snapshot` (candidate pencil-mark array). `currentSnapshot` is not set for SA steps — no pencil marks are shown.

### `finishNow()` — new step type accounting

```js
} else if (step.type === 'sa-swap') {
  this.swapCount++;
  this.conflictCount = step.conflicts;
} else if (step.type === 'sa-fill' || step.type === 'sa-restart') {
  this.conflictCount = step.conflicts;
  this.saAttempt = step.attempt;
}
```

### `statusText()` — new cases

```
sa-fill:    "Simulated Annealing: board filled (attempt N) — C conflicts."
sa-swap:    "Accepted swap — C conflicts remaining."
sa-restart: "Restarting… attempt N."
solved:     uses existing branch "Solved by Simulated Annealing."
stuck:      uses existing branch "Simulated Annealing could not converge."
```

### Cell highlighting — two new helper methods

```js
isSaSwapCell(row, col) {
  if (!this.currentStep) return false;
  const s = this.currentStep;
  if (s.type !== 'sa-swap') return false;
  return (s.row1 === row && s.col1 === col) ||
         (s.row2 === row && s.col2 === col);
}

isSaRestartFlash() {
  return this.currentStep?.type === 'sa-restart';
}
```

`isSaSwapCell` adds an amber highlight to the two swapped cells via the existing cell `:class` binding.

### Other label maps

```js
algorithmBadgeLabel(): sa -> '⬡ Simulated Annealing'
subtitleText():         sa -> 'Simulated Annealing Visualizer'
```

---

## `index.html` Changes

### Algorithm dropdown

Add after the `human-v3` option:
```html
<option value="sa">⬡ Simulated Annealing</option>
```

### Cell class binding

Add `isSaSwapCell(r, c)` to the existing cell `:class` binding using amber colour consistent with the design system (e.g. `bg-amber-200 dark:bg-amber-700`).

### Cache version bump

`solver.js` and `visualizer.js` both change. Bump the service worker cache:
- `sw.js`: increment `CACHE` version string
- `index.html`: update `?v=` query strings on `solver.js` and `visualizer.js` script tags

---

## Tests

### `tests/game.test.js` — new SA test cases

```
SA trace contract:
  - returns { solved, steps, solvedBoard }
  - steps is a non-empty array
  - first step is always sa-fill
  - all step types are in ['sa-fill', 'sa-swap', 'sa-restart']
  - sa-fill board has all 81 cells filled (no zeros)
  - if solved: solvedBoard passes hasValidGivens
  - clue cells are never swapped (no sa-swap touches a locked cell)
  - sa-swap conflicts is non-negative integer
  - sa-swap board snapshot is a valid 9x9 grid

Visualizer state:
  - swapCount increments correctly per sa-swap step
  - conflictCount matches step.conflicts after each apply
  - saAttempt increments on sa-restart step
  - resetPuzzle() zeroes swapCount, conflictCount, saAttempt
```

### `tests/project.test.js`

Update the algorithm count assertion from 6 to 7 to cover the new `sa` entry.

---

## Cooling Schedule Rationale

| Parameter | Value | Reason |
|-----------|-------|--------|
| `T_initial` | 2.0 | High enough to accept most bad moves early |
| `T_min` | 0.005 | Near-frozen; essentially greedy at this point |
| `alpha` | 0.99995 | ~138K iterations per run; balances speed and quality |
| `maxIter` | 500_000 | Hard cap prevents infinite loops on degenerate puzzles |
| `maxRestarts` | 5 | Typical solve needs 1–3; 5 is a safe ceiling |

Typical accepted swap counts: ~2K–6K for Easy/Medium, ~4K–12K for Hard.
These produce comfortable animation lengths at all four playback speeds.

---

## Out of Scope

- Displaying temperature as a live stat tile (requires a fourth stat card layout change)
- Showing rejected swaps (would require step thinning logic; adds complexity for marginal visual benefit)
- Logarithmic cooling schedule (more theoretically correct but much slower in practice)
