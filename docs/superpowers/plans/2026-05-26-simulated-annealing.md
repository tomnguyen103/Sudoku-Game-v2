# Simulated Annealing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Simulated Annealing as the seventh selectable algorithm in the Sudoku Solver Visualizer.

**Architecture:** `createSimulatedAnnealingTrace()` is added to `src/solver.js` following the same UMD module pattern as the six existing trace builders. `src/visualizer.js` registers it in `TRACE_BUILDERS`, adds three new state fields (`swapCount`, `conflictCount`, `saAttempt`), and handles three new step types (`sa-fill`, `sa-swap`, `sa-restart`). `index.html` adds one dropdown option and one cell-highlight binding; the SW cache is bumped from v34 to v35.

**Tech Stack:** Vanilla JS (ES5-compatible UMD modules), Alpine.js reactive state, Node `assert` tests, Playwright smoke test.

---

## File Map

| File | Change |
|------|--------|
| `src/solver.js` | Add `createSimulatedAnnealingTrace` + export it |
| `src/visualizer.js` | Register SA, add state fields, handle new step types |
| `index.html` | Add `<option>`, cell highlight binding, bump `?v=` strings |
| `sw.js` | Bump `CACHE` from `sudoku-v34` to `sudoku-v35` |
| `tests/game.test.js` | Add SA trace + visualizer state tests |
| `implementation-notes.md` | Log decisions and tradeoffs |

---

## Task 1: SA trace builder in `src/solver.js`

**Files:**
- Modify: `src/solver.js` (add function before the `return {` block near line 833)
- Test: `tests/game.test.js`

- [ ] **Step 1: Write the failing tests**

Update the destructure at the top of `tests/game.test.js` to include `createSimulatedAnnealingTrace`:

```js
const {
  isValid,
  solvePuzzle,
  hasValidGivens,
  isSolvableLayout,
  countSolutions,
  createBacktrackingTrace,
  createMrvTrace,
  createConstraintPropagationTrace,
  createHumanLogicTrace,
  createHumanLogicV2Trace,
  createHumanLogicV3Trace,
  createSimulatedAnnealingTrace,
  generateTestPuzzle,
  PLAYBACK_SPEEDS,
  sudokuGame,
} = require('../game.js');
```

Then append these tests at the bottom of `tests/game.test.js`:

```js
// ── Simulated Annealing trace builder ────────────────────────────────────

const saBoard = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9],
];

const saTrace = createSimulatedAnnealingTrace(saBoard);

assert.ok(typeof saTrace.solved === 'boolean', 'SA: solved is boolean');
assert.ok(Array.isArray(saTrace.steps), 'SA: steps is array');
assert.ok(saTrace.steps.length > 0, 'SA: steps is non-empty');
assert.strictEqual(saTrace.steps[0].type, 'sa-fill', 'SA: first step is sa-fill');

const SA_VALID_TYPES = new Set(['sa-fill', 'sa-swap', 'sa-restart']);
for (const step of saTrace.steps) {
  assert.ok(SA_VALID_TYPES.has(step.type), `SA: unknown step type "${step.type}"`);
}

const fillStep = saTrace.steps[0];
assert.strictEqual(fillStep.board.flat().filter(v => v === 0).length, 0, 'SA: sa-fill has no empty cells');
assert.ok(typeof fillStep.conflicts === 'number' && fillStep.conflicts >= 0, 'SA: sa-fill has numeric conflicts');
assert.strictEqual(fillStep.attempt, 1, 'SA: first sa-fill has attempt=1');

const swapSteps = saTrace.steps.filter(s => s.type === 'sa-swap');
assert.ok(swapSteps.length > 0, 'SA: at least one sa-swap step');
for (const s of swapSteps) {
  assert.ok(s.row1 >= 0 && s.row1 <= 8, 'SA: sa-swap row1 in range');
  assert.ok(s.col1 >= 0 && s.col1 <= 8, 'SA: sa-swap col1 in range');
  assert.ok(s.row2 >= 0 && s.row2 <= 8, 'SA: sa-swap row2 in range');
  assert.ok(s.col2 >= 0 && s.col2 <= 8, 'SA: sa-swap col2 in range');
  assert.ok(s.val1 >= 1 && s.val1 <= 9, 'SA: sa-swap val1 in digit range');
  assert.ok(s.val2 >= 1 && s.val2 <= 9, 'SA: sa-swap val2 in digit range');
  assert.ok(typeof s.conflicts === 'number' && s.conflicts >= 0, 'SA: sa-swap conflicts non-negative');
  assert.ok(typeof s.temperature === 'number' && s.temperature > 0, 'SA: sa-swap temperature positive');
  assert.strictEqual(s.board.length, 9, 'SA: sa-swap board has 9 rows');
  assert.strictEqual(s.board.flat().filter(v => v === 0).length, 0, 'SA: sa-swap board fully filled');
}

if (saTrace.solved) {
  assert.ok(saTrace.solvedBoard !== null, 'SA: solved trace has solvedBoard');
  assert.ok(hasValidGivens(saTrace.solvedBoard), 'SA: solvedBoard passes hasValidGivens');
}

const clueSet = new Set();
for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
  if (saBoard[r][c] !== 0) clueSet.add(`${r},${c}`);
}
for (const s of swapSteps) {
  assert.ok(!clueSet.has(`${s.row1},${s.col1}`), `SA: clue cell (${s.row1},${s.col1}) was swapped`);
  assert.ok(!clueSet.has(`${s.row2},${s.col2}`), `SA: clue cell (${s.row2},${s.col2}) was swapped`);
}

const badSaTrace = createSimulatedAnnealingTrace([[0,0,0,0,0,0,0,0,0]]);
assert.strictEqual(badSaTrace.solved, false, 'SA: invalid board returns solved=false');
assert.deepStrictEqual(badSaTrace.steps, [], 'SA: invalid board returns empty steps');

console.log('SA trace builder tests passed.');
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `createSimulatedAnnealingTrace is not a function`.

- [ ] **Step 3: Implement `createSimulatedAnnealingTrace` in `src/solver.js`**

Insert the entire function just before the `return {` block at the bottom of `solver.js`:

```js
function createSimulatedAnnealingTrace(board) {
  if (!hasValidGivens(board)) {
    return { solved: false, steps: [], solvedBoard: null };
  }

  const steps = [];

  function countConflicts(b) {
    let conflicts = 0;
    for (let i = 0; i < 9; i++) {
      const rowSeen = new Set();
      const colSeen = new Set();
      for (let j = 0; j < 9; j++) {
        const rv = b[i][j];
        if (rv) { if (rowSeen.has(rv)) conflicts++; else rowSeen.add(rv); }
        const cv = b[j][i];
        if (cv) { if (colSeen.has(cv)) conflicts++; else colSeen.add(cv); }
      }
    }
    return conflicts;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  function boxCompleteFill(clues) {
    const b = clues.map(r => [...r]);
    for (let box = 0; box < 9; box++) {
      const br = Math.floor(box / 3) * 3;
      const bc = (box % 3) * 3;
      const present = new Set();
      const emptyCells = [];
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const r = br + dr, c = bc + dc;
          if (clues[r][c] !== 0) present.add(clues[r][c]);
          else emptyCells.push([r, c]);
        }
      }
      const missing = [1,2,3,4,5,6,7,8,9].filter(d => !present.has(d));
      shuffle(missing);
      emptyCells.forEach(([r, c], idx) => { b[r][c] = missing[idx]; });
    }
    return b;
  }

  function buildNonClueCellsByBox(clues) {
    const byBox = Array.from({ length: 9 }, () => []);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (clues[r][c] === 0) {
          const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
          byBox[box].push([r, c]);
        }
      }
    }
    return byBox;
  }

  const T_INITIAL   = 2.0;
  const T_MIN       = 0.005;
  const ALPHA       = 0.99995;
  const MAX_ITER    = 500000;
  const MAX_RESTART = 5;

  const nonClueByBox = buildNonClueCellsByBox(board);
  const swappableBoxes = nonClueByBox
    .map((cells, i) => ({ i, cells }))
    .filter(({ cells }) => cells.length >= 2);

  if (swappableBoxes.length === 0) {
    const solved = countConflicts(board) === 0;
    return { solved, steps: [], solvedBoard: solved ? board.map(r => [...r]) : null };
  }

  let working = boxCompleteFill(board);
  let conflicts = countConflicts(working);

  steps.push({
    type: 'sa-fill',
    attempt: 1,
    board: working.map(r => [...r]),
    conflicts,
  });

  let T = T_INITIAL;
  let attempt = 1;

  for (let iter = 0; iter < MAX_ITER && conflicts > 0; iter++) {
    T *= ALPHA;

    if (T < T_MIN) {
      if (attempt >= MAX_RESTART) break;
      attempt++;
      working = boxCompleteFill(board);
      conflicts = countConflicts(working);
      T = T_INITIAL;
      steps.push({
        type: 'sa-restart',
        attempt,
        board: working.map(r => [...r]),
        conflicts,
      });
      continue;
    }

    const { cells } = swappableBoxes[Math.floor(Math.random() * swappableBoxes.length)];
    const i1 = Math.floor(Math.random() * cells.length);
    let i2 = Math.floor(Math.random() * (cells.length - 1));
    if (i2 >= i1) i2++;
    const [r1, c1] = cells[i1];
    const [r2, c2] = cells[i2];

    const v1 = working[r1][c1];
    const v2 = working[r2][c2];
    working[r1][c1] = v2;
    working[r2][c2] = v1;

    const newConflicts = countConflicts(working);
    const dE = newConflicts - conflicts;

    if (dE < 0 || Math.random() < Math.exp(-dE / T)) {
      conflicts = newConflicts;
      steps.push({
        type: 'sa-swap',
        row1: r1, col1: c1,
        row2: r2, col2: c2,
        val1: v2,
        val2: v1,
        conflicts,
        temperature: Math.round(T * 10000) / 10000,
        board: working.map(r => [...r]),
      });
    } else {
      working[r1][c1] = v1;
      working[r2][c2] = v2;
    }
  }

  const solved = conflicts === 0;
  return {
    solved,
    steps,
    solvedBoard: solved ? working.map(r => [...r]) : null,
  };
}
```

Then add `createSimulatedAnnealingTrace` to the `return` block at the bottom of `solver.js`:

```js
return {
  isValid,
  solvePuzzle,
  hasValidGivens,
  isSolvableLayout,
  createBacktrackingTrace,
  createMrvTrace,
  createConstraintPropagationTrace,
  createHumanLogicTrace,
  createHumanLogicV2Trace,
  createHumanLogicV3Trace,
  createSimulatedAnnealingTrace,
  countSolutions,
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: all tests pass including `SA trace builder tests passed.`

- [ ] **Step 5: Commit**

```bash
git add src/solver.js tests/game.test.js
git commit -m "feat: add createSimulatedAnnealingTrace to solver"
```

---

## Task 2: Register SA in `src/visualizer.js`

**Files:**
- Modify: `src/visualizer.js`
- Test: `tests/game.test.js` (add visualizer state tests)

- [ ] **Step 1: Write failing visualizer state tests**

Append at the bottom of `tests/game.test.js`:

```js
// ── SA visualizer state ──────────────────────────────────────────────────

const saGame = sudokuGame();
saGame.board = saBoard.map(r => [...r]);
saGame.initialBoard = saBoard.map(r => [...r]);
saGame.locked = saBoard.map(r => r.map(v => v !== 0));
saGame.selectedAlgorithm = 'sa';

assert.strictEqual(saGame.statLabelPrimary(), '✦ Swaps', 'SA: primary stat label');
assert.strictEqual(saGame.statLabelSecondary(), '↯ Conflicts', 'SA: secondary stat label');
assert.strictEqual(saGame.statValuePrimary(), 0, 'SA: primary stat value starts at 0');
assert.strictEqual(saGame.statValueSecondary(), 0, 'SA: secondary stat value starts at 0');

// sa-fill step
const fakeFill = { type: 'sa-fill', attempt: 1, board: saBoard.map(r => [...r]), conflicts: 12 };
saGame.steps = [fakeFill];
saGame.stepIndex = 0;
saGame._applyNextStep();
assert.strictEqual(saGame.conflictCount, 12, 'SA: conflictCount set by sa-fill');
assert.strictEqual(saGame.saAttempt, 1, 'SA: saAttempt set by sa-fill');

// sa-swap step
const swapBoard = saBoard.map(r => [...r]);
for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (swapBoard[r][c] === 0) swapBoard[r][c] = 1;
const fakeSwap = {
  type: 'sa-swap',
  row1: 0, col1: 2, row2: 0, col2: 3,
  val1: 2, val2: 4,
  conflicts: 10,
  temperature: 1.9,
  board: swapBoard,
};
saGame.steps = [fakeSwap];
saGame.stepIndex = 0;
saGame._applyNextStep();
assert.strictEqual(saGame.swapCount, 1, 'SA: swapCount incremented by sa-swap');
assert.strictEqual(saGame.conflictCount, 10, 'SA: conflictCount updated by sa-swap');

// sa-restart step
const fakeRestart = { type: 'sa-restart', attempt: 2, board: saBoard.map(r => [...r]), conflicts: 14 };
saGame.steps = [fakeRestart];
saGame.stepIndex = 0;
saGame._applyNextStep();
assert.strictEqual(saGame.saAttempt, 2, 'SA: saAttempt updated by sa-restart');
assert.strictEqual(saGame.conflictCount, 14, 'SA: conflictCount updated by sa-restart');

// resetPuzzle zeroes SA fields
saGame.resetPuzzle();
assert.strictEqual(saGame.swapCount, 0, 'SA: swapCount zeroed on reset');
assert.strictEqual(saGame.conflictCount, 0, 'SA: conflictCount zeroed on reset');
assert.strictEqual(saGame.saAttempt, 0, 'SA: saAttempt zeroed on reset');

// _buildTrace must not throw and must return steps
saGame.selectedAlgorithm = 'sa';
const builtTrace = saGame._buildTrace(saBoard);
assert.ok(Array.isArray(builtTrace.steps), 'SA: _buildTrace returns steps array');

console.log('SA visualizer state tests passed.');
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `statLabelPrimary` returns wrong value; `swapCount` / `conflictCount` / `saAttempt` undefined.

- [ ] **Step 3: Apply all visualizer changes to `src/visualizer.js`**

**Line 9 — add to destructure:**
```js
const { createBacktrackingTrace, createMrvTrace, createConstraintPropagationTrace, createHumanLogicTrace, createHumanLogicV2Trace, createHumanLogicV3Trace, createSimulatedAnnealingTrace } = solver;
```

**TRACE_BUILDERS — add `sa` entry:**
```js
const TRACE_BUILDERS = {
  backtracking: createBacktrackingTrace,
  mrv: createMrvTrace,
  constraint: createConstraintPropagationTrace,
  human: createHumanLogicTrace,
  'human-v2': createHumanLogicV2Trace,
  'human-v3': createHumanLogicV3Trace,
  sa: createSimulatedAnnealingTrace,
};
```

**ALGORITHM_LABELS — add `sa` entry:**
```js
const ALGORITHM_LABELS = {
  backtracking: 'Backtracking DFS',
  mrv: 'Backtracking + MRV',
  constraint: 'Constraint Propagation',
  human: 'Human Logic Solver',
  'human-v2': 'Human Logic Solver v2',
  'human-v3': 'Human Logic Solver v3',
  sa: 'Simulated Annealing',
};
```

**`sudokuGame()` — add three state fields after `selectedAlgorithm: 'backtracking'`:**
```js
selectedAlgorithm: 'backtracking',
swapCount: 0,
conflictCount: 0,
saAttempt: 0,
```

**`newPuzzle()` inside `run()` — add after `this._computeDurationMs = 0`:**
```js
this.swapCount = 0;
this.conflictCount = 0;
this.saAttempt = 0;
```

**`resetPuzzle()` — add after `this._computeDurationMs = 0`:**
```js
this.swapCount = 0;
this.conflictCount = 0;
this.saAttempt = 0;
```

**`_applyNextStep()` — add SA branches in the `else` block after the `human-eliminate` branch:**
```js
} else if (step.type === 'sa-fill') {
  this.conflictCount = step.conflicts;
  this.saAttempt = step.attempt;
  this.board = step.board.map(r => [...r]);
} else if (step.type === 'sa-swap') {
  this.swapCount++;
  this.conflictCount = step.conflicts;
  this.board = step.board.map(r => [...r]);
} else if (step.type === 'sa-restart') {
  this.saAttempt = step.attempt;
  this.conflictCount = step.conflicts;
  this.board = step.board.map(r => [...r]);
}
```

Note: do NOT set `this.currentSnapshot` for SA steps — pencil marks must not appear.

**`finishNow()` — add SA branches in the remaining-steps `for` loop after the `human-eliminate` branch:**
```js
} else if (step.type === 'sa-swap') {
  this.swapCount++;
  this.conflictCount = step.conflicts;
} else if (step.type === 'sa-fill' || step.type === 'sa-restart') {
  this.conflictCount = step.conflicts;
  this.saAttempt = step.attempt;
}
```

**`statLabelPrimary()` — add SA branch before the default return:**
```js
statLabelPrimary() {
  if (this.selectedAlgorithm === 'constraint') return '✦ Eliminations';
  if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2' || this.selectedAlgorithm === 'human-v3') return '✦ Deductions';
  if (this.selectedAlgorithm === 'sa') return '✦ Swaps';
  return '✦ Placed';
},
```

**`statLabelSecondary()` — add SA branch before the default return:**
```js
statLabelSecondary() {
  if (this.selectedAlgorithm === 'constraint') return '↯ Guesses';
  if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2' || this.selectedAlgorithm === 'human-v3') return '↯ Eliminations';
  if (this.selectedAlgorithm === 'sa') return '↯ Conflicts';
  return '↩ Backtracks';
},
```

**`statValuePrimary()` — add SA branch before the default return:**
```js
statValuePrimary() {
  if (this.selectedAlgorithm === 'constraint') return this.eliminationCount;
  if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2' || this.selectedAlgorithm === 'human-v3') return this.placedCount;
  if (this.selectedAlgorithm === 'sa') return this.swapCount;
  return this.placedCount;
},
```

**`statValueSecondary()` — add SA branch before the default return:**
```js
statValueSecondary() {
  if (this.selectedAlgorithm === 'constraint') return this.guessCount;
  if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2' || this.selectedAlgorithm === 'human-v3') return this.eliminationCount;
  if (this.selectedAlgorithm === 'sa') return this.conflictCount;
  return this.backtrackedCount;
},
```

**`algorithmBadgeLabel()` — add `sa` entry:**
```js
algorithmBadgeLabel() {
  const badges = {
    backtracking: '⬡ Backtracking',
    mrv: '⬡ Backtracking + MRV',
    constraint: '⬡ Constraint Propagation',
    human: '⬡ Human Logic',
    'human-v2': '⬡ Human Logic v2',
    'human-v3': '⬡ Human Logic v3',
    sa: '⬡ Simulated Annealing',
  };
  return badges[this.selectedAlgorithm] || this.selectedAlgorithm;
},
```

**`subtitleText()` — add `sa` entry:**
```js
subtitleText() {
  const labels = {
    backtracking: 'Backtracking DFS Visualizer',
    mrv: 'Backtracking + MRV Visualizer',
    constraint: 'Constraint Propagation Visualizer',
    human: 'Human Logic Visualizer',
    'human-v2': 'Human Logic v2 Visualizer',
    'human-v3': 'Human Logic v3 Visualizer',
    sa: 'Simulated Annealing Visualizer',
  };
  return labels[this.selectedAlgorithm] || 'Algorithm Visualizer';
},
```

**`statusText()` — add SA cases before the final `return 'Preparing solver.'`:**
```js
if (this.status === 'running' && this.currentStep?.type === 'sa-fill') {
  return `Simulated Annealing: board filled (attempt ${this.currentStep.attempt}) — ${this.currentStep.conflicts} conflicts.`;
}
if (this.status === 'running' && this.currentStep?.type === 'sa-swap') {
  return `Accepted swap — ${this.currentStep.conflicts} conflicts remaining.`;
}
if (this.status === 'running' && this.currentStep?.type === 'sa-restart') {
  return `Restarting… attempt ${this.currentStep.attempt}.`;
}
```

**Add two new helpers after `isFishCoverLine`, before `statLabelPrimary`:**
```js
isSaSwapCell(row, col) {
  if (!this.currentStep) return false;
  const s = this.currentStep;
  if (s.type !== 'sa-swap') return false;
  return (s.row1 === row && s.col1 === col) || (s.row2 === row && s.col2 === col);
},

isSaRestartFlash() {
  return this.currentStep?.type === 'sa-restart';
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: all tests pass including `SA visualizer state tests passed.`

- [ ] **Step 5: Commit**

```bash
git add src/visualizer.js tests/game.test.js
git commit -m "feat: register Simulated Annealing in visualizer"
```

---

## Task 3: `index.html` dropdown, cell highlight, cache bump

**Files:**
- Modify: `index.html`
- Modify: `sw.js`

- [ ] **Step 1: Add the `<option>` after the `human-v3` entry**

Find this line in `index.html`:
```html
<option value="human-v3">⬡ Human Logic Solver v3</option>
```
Add immediately after it:
```html
<option value="sa">⬡ Simulated Annealing</option>
```

- [ ] **Step 2: Add `isSaSwapCell` to the cell `:class` binding**

Find the cell element with `:class` bindings (search for `isBacktracked`). Add this entry to the class object:
```html
'bg-amber-200 dark:bg-amber-700/60': isSaSwapCell(cell.row, cell.col),
```

- [ ] **Step 3: Bump cache in `sw.js`**

Change line 3:
```js
const CACHE = 'sudoku-v35';
```

- [ ] **Step 4: Bump `?v=` query strings in `index.html`**

Replace all six occurrences of `?v=20260526-humanv3` with `?v=20260526-sa`:
```html
<script src="vendor/tailwindcss.js?v=20260526-sa"></script>
<script defer src="vendor/alpine.min.js?v=20260526-sa"></script>
<link rel="stylesheet" href="style.css?v=20260526-sa">
<script src="src/solver.js?v=20260526-sa"></script>
<script src="src/generator.js?v=20260526-sa"></script>
<script src="src/visualizer.js?v=20260526-sa"></script>
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add index.html sw.js
git commit -m "feat: add Simulated Annealing to UI and bump SW cache to v35"
```

---

## Task 4: Update `implementation-notes.md`

**Files:**
- Modify: `implementation-notes.md`

- [ ] **Step 1: Append a new dated entry**

Add at the bottom of `implementation-notes.md`:

```markdown
### 2026-05-26 — Simulated Annealing algorithm

- **Decision — Approach:** `createSimulatedAnnealingTrace` added to `src/solver.js` following the existing UMD module pattern. No new files created.
- **Decision — Box-complete fill:** Empty cells in each box are filled with that box's missing digits in random shuffled order. This guarantees zero box conflicts from the start; only row and column conflicts remain. Reduces initial conflict count significantly.
- **Decision — Accepted swaps only:** Only accepted swaps emit `sa-swap` steps. Rejected swaps are not recorded. Keeps step counts in the 2K–12K range for comfortable animation at all speeds.
- **Decision — Cooling schedule:** T_initial=2.0, T_min=0.005, alpha=0.99995 (~138K iterations per run). Hard cap at 500K iterations and 5 restarts prevents infinite loops.
- **Decision — Three step types:** `sa-fill` (initial board after box-fill), `sa-swap` (accepted swap with board snapshot), `sa-restart` (fresh fill after T reaches T_min). Restarts are visible in status text.
- **Decision — Stat tiles:** Primary = Swaps (accepted swap count), Secondary = Conflicts (counts down toward 0). Conflicts as a live progress indicator is immediately readable.
- **Decision — No pencil marks:** SA steps carry a full `board` snapshot. `currentSnapshot` is never set for SA — the pencil-mark overlay does not appear.
- **Tradeoff — Probabilistic:** SA does not guarantee a solution. Up to 5 restarts attempted. `stuck` status used if all fail. In practice the classic easy test puzzle solves in 1–2 attempts.
- **SW cache:** bumped from `sudoku-v34` to `sudoku-v35`. Query strings updated to `?v=20260526-sa`.
```

- [ ] **Step 2: Commit**

```bash
git add implementation-notes.md
git commit -m "docs: log Simulated Annealing implementation decisions"
```

---

## Task 5: Full test suite and smoke test

- [ ] **Step 1: Run all logic tests**

```bash
npm test
```

Expected: zero failures. All console.log lines appear.

- [ ] **Step 2: Start local server and run smoke test**

In a separate terminal:
```bash
python -m http.server 4173 --bind 127.0.0.1
```

Then in the main terminal:
```bash
npm run test:smoke
```

Expected: Playwright smoke test passes.

- [ ] **Step 3: Manual browser check**

Open `http://127.0.0.1:4173/index.html` and verify:
- `⬡ Simulated Annealing` appears in the Algorithm dropdown
- Selecting it and clicking `Run Algorithm` fills all 81 cells immediately on the first frame
- Two cells flash amber on each step
- Stat tiles show `✦ Swaps` and `↯ Conflicts`; Conflicts counts down toward 0
- Status bar shows "Accepted swap — N conflicts remaining."
- `Finish Now` completes the solve and displays the solved board
- `Reset` zeroes Swaps and Conflicts to 0
- Dark mode highlights look correct (amber cells visible in dark theme)
