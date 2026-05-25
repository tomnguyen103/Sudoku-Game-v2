# Constraint Propagation Algorithm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Constraint Propagation (Norvig's AC-3 propagation + DFS search) as the third selectable solving algorithm, with pencil-mark rendering of candidate sets.

**Architecture:** A new `createConstraintPropagationTrace(board)` in `src/solver.js` returns the same `{ solved, steps, solvedBoard }` contract as the existing two builders. Its steps use new types (`propagate`, `guess`, `contradiction`), and each step carries a `snapshot` — a 9×9 array where every cell is an array of remaining candidate digits. The visualizer renders the current step's snapshot as pencil marks; the backtracking/MRV paths are untouched.

**Tech Stack:** Vanilla JS modules (CommonJS-wrapped for Node tests), Alpine.js reactive state, Tailwind utility classes + `style.css`, Node `assert` test scripts, Playwright smoke test.

**Reference spec:** `docs/superpowers/specs/2026-05-25-constraint-propagation-algorithm.md`

---

## File Structure

- `src/solver.js` — add `createConstraintPropagationTrace`, export it. (MODIFY)
- `src/visualizer.js` — register the builder, add snapshot/candidate state, new counters, render helpers, status/label methods, branch `_applyNextStep`. (MODIFY)
- `index.html` — add `<option>`, pencil-mark cell template, highlight classes, stat-tile `x-text` bindings, bump `?v=` query strings. (MODIFY)
- `style.css` — `.cell-candidates` / `.cell-candidate` styles + mobile sizing. (MODIFY)
- `tests/game.test.js` — solver + visualizer unit tests. (MODIFY)
- `tests/smoke.test.js` — add a Constraint Propagation browser flow. (MODIFY)
- `tests/project.test.js` — guardrail that README documents the new algorithm. (MODIFY)
- `sw.js` — bump cache to `sudoku-v24`. (MODIFY)
- `implementation-notes.md`, `CLAUDE.md`, `README.md` — docs. (MODIFY)

**Step contract (used across tasks):**
```js
{ type: 'propagate',     row, col, value, eliminated: [ {row, col, value}, ... ], snapshot }
{ type: 'guess',         row, col, value, snapshot }
{ type: 'contradiction', row, col, value, snapshot }
```
`snapshot` is `number[9][9]`; `snapshot[r][c]` is a sorted array of remaining candidate digits (length 1 ⇒ that cell is solved to that digit).

---

## Task 1: Constraint Propagation solver

**Files:**
- Modify: `src/solver.js` (add function before the final `return {...}` block at lines ~213-221; add to the returned object)
- Test: `tests/game.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/game.test.js` (after the MRV trace tests block that ends near line 157, before the `// visualizer test puzzle tests` section). Add `createConstraintPropagationTrace` to the destructured `require` at the top of the file (line 2-13):

```js
// add to the top require destructure:
//   createConstraintPropagationTrace,
```

Then the tests:

```js
// constraint propagation trace tests
function decodeSnapshotToBoard(snapshot) {
  return snapshot.map(row => row.map(cell => (cell.length === 1 ? cell[0] : 0)));
}

// rejects conflicted layouts before playback, same contract as the others
assert.deepStrictEqual(
  createConstraintPropagationTrace(conflictedCompleteBoard),
  { solved: false, steps: [], solvedBoard: null },
  'CP trace rejects conflicted layouts before playback'
);

// single forced cell: solved, no guessing, records a propagate placing 9 at (0,8)
const cpForced = createConstraintPropagationTrace(tracePuzzle);
const tracePuzzleRef = tracePuzzle.map(r => [...r]);
solvePuzzle(tracePuzzleRef);
assert.strictEqual(cpForced.solved, true, 'CP solves the single-empty-cell puzzle');
assert.deepStrictEqual(cpForced.solvedBoard, tracePuzzleRef, 'CP solved board matches reference solver');
assert.ok(
  cpForced.steps.some(s => s.type === 'propagate' && s.row === 0 && s.col === 8 && s.value === 9),
  'CP records a propagate step assigning 9 at row 0, col 8'
);
assert.ok(!cpForced.steps.some(s => s.type === 'guess'), 'CP solves the forced puzzle with zero guesses');
assert.strictEqual(tracePuzzle[0][8], 0, 'CP does not mutate the input board');

// propagate steps carry an eliminated[] array and a 9x9 snapshot of candidate digits
const aPropagate = cpForced.steps.find(s => s.type === 'propagate');
assert.ok(Array.isArray(aPropagate.eliminated), 'propagate step has an eliminated array');
assert.strictEqual(aPropagate.snapshot.length, 9, 'snapshot has 9 rows');
assert.strictEqual(aPropagate.snapshot[0].length, 9, 'snapshot has 9 columns');
assert.ok(Array.isArray(aPropagate.snapshot[0][0]), 'snapshot cell is an array of candidate digits');

// final snapshot is fully solved and equals solvedBoard
const cpLast = cpForced.steps[cpForced.steps.length - 1];
assert.deepStrictEqual(
  decodeSnapshotToBoard(cpLast.snapshot),
  cpForced.solvedBoard,
  'final step snapshot equals the solved board'
);

// classic puzzle: solves to the same unique solution as the reference solver
const cpHard = createConstraintPropagationTrace(unsolved);
const unsolvedRef = unsolved.map(r => [...r]);
solvePuzzle(unsolvedRef);
assert.strictEqual(cpHard.solved, true, 'CP solves the classic puzzle');
assert.deepStrictEqual(cpHard.solvedBoard, unsolvedRef, 'CP matches the reference unique solution');
assert.strictEqual(unsolved[0][2], 0, 'CP does not mutate the input board on a hard puzzle');

// a puzzle that requires search engages guessing and hits dead-end branches
const aiEscargot = [
  [1,0,0,0,0,7,0,9,0],
  [0,3,0,0,2,0,0,0,8],
  [0,0,9,6,0,0,5,0,0],
  [0,0,5,3,0,0,9,0,0],
  [0,1,0,0,8,0,0,0,2],
  [6,0,0,0,0,4,0,0,0],
  [3,0,0,0,0,0,0,1,0],
  [0,4,0,0,0,0,0,0,7],
  [0,0,7,0,0,0,3,0,0],
];
const cpSearch = createConstraintPropagationTrace(aiEscargot);
const aiRef = aiEscargot.map(r => [...r]);
solvePuzzle(aiRef);
assert.strictEqual(cpSearch.solved, true, 'CP solves a search-heavy puzzle');
assert.deepStrictEqual(cpSearch.solvedBoard, aiRef, 'CP matches the reference solution on a search-heavy puzzle');
assert.ok(cpSearch.steps.some(s => s.type === 'guess'), 'CP records guess steps when propagation stalls');
assert.ok(cpSearch.steps.some(s => s.type === 'contradiction'), 'CP records contradiction steps on dead-end branches');

console.log('All constraint propagation trace tests passed.');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:logic`
Expected: FAIL — `TypeError: createConstraintPropagationTrace is not a function` (it is `undefined` in the destructure).

- [ ] **Step 3: Implement the solver**

In `src/solver.js`, add this function immediately after `createMrvTrace` (after line 181, before `countSolutions`):

```js
  function createConstraintPropagationTrace(board) {
    if (!hasValidGivens(board)) {
      return { solved: false, steps: [], solvedBoard: null };
    }

    const ALL = 0b111111111;
    const BIT = d => 1 << (d - 1);
    const popcount = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
    const lowestDigit = m => { for (let d = 1; d <= 9; d++) if (m & BIT(d)) return d; return 0; };
    const digitsOf = m => { const out = []; for (let d = 1; d <= 9; d++) if (m & BIT(d)) out.push(d); return out; };

    const ROW = i => Math.floor(i / 9);
    const COL = i => i % 9;
    const UNITS = [];
    const PEERS = [];
    for (let i = 0; i < 81; i++) {
      const r = ROW(i), c = COL(i);
      const rowUnit = [], colUnit = [], boxUnit = [];
      for (let k = 0; k < 9; k++) {
        rowUnit.push(r * 9 + k);
        colUnit.push(k * 9 + c);
      }
      const boxStart = Math.floor(r / 3) * 27 + Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) boxUnit.push(boxStart + dr * 9 + dc);
      UNITS[i] = [rowUnit, colUnit, boxUnit];
      const peerSet = new Set();
      [...rowUnit, ...colUnit, ...boxUnit].forEach(j => { if (j !== i) peerSet.add(j); });
      PEERS[i] = [...peerSet];
    }

    const steps = [];
    const at = i => ({ row: ROW(i), col: COL(i) });
    const toSnapshot = cands =>
      Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => digitsOf(cands[r * 9 + c])));

    // Process a queue of forced assignments. Each dequeued assignment plus the
    // peer eliminations it triggers becomes one 'propagate' step (one wave).
    // Returns false on contradiction.
    function propagate(cands, queue) {
      const queued = new Set(queue.map(q => q.cell));
      while (queue.length) {
        const { cell, value } = queue.shift();
        queued.delete(cell);
        if (!(cands[cell] & BIT(value))) return false; // value no longer possible here
        cands[cell] = BIT(value);

        const eliminated = [];
        let dead = false;

        for (const peer of PEERS[cell]) {
          if (cands[peer] & BIT(value)) {
            cands[peer] &= ~BIT(value);
            eliminated.push({ ...at(peer), value });
            if (cands[peer] === 0) dead = true;
            else if (popcount(cands[peer]) === 1 && !queued.has(peer)) {
              queue.push({ cell: peer, value: lowestDigit(cands[peer]) });
              queued.add(peer);
            }
          }
        }

        // Hidden singles: in each unit touched by an elimination, if 'value' now
        // has exactly one possible cell, force it there; zero places is a dead end.
        if (!dead) {
          for (const e of eliminated) {
            const peer = e.row * 9 + e.col;
            for (const unit of UNITS[peer]) {
              let places = 0, placed = false, only = -1;
              for (const u of unit) {
                if (cands[u] === BIT(value)) { placed = true; break; }
                if (cands[u] & BIT(value)) { places++; only = u; }
              }
              if (placed) continue;
              if (places === 0) { dead = true; break; }
              if (places === 1 && popcount(cands[only]) > 1 && !queued.has(only)) {
                queue.push({ cell: only, value });
                queued.add(only);
              }
            }
            if (dead) break;
          }
        }

        steps.push({ type: 'propagate', ...at(cell), value, eliminated, snapshot: toSnapshot(cands) });
        if (dead) return false;
      }
      return true;
    }

    // Fewest-candidates unsolved cell. Returns -1 if solved, -2 on contradiction.
    function pickCell(cands) {
      let target = -1, best = 10;
      for (let i = 0; i < 81; i++) {
        const n = popcount(cands[i]);
        if (n === 0) return -2;
        if (n > 1 && n < best) { best = n; target = i; }
      }
      return target;
    }

    function search(cands) {
      const target = pickCell(cands);
      if (target === -2) return null;
      if (target === -1) return cands;

      for (const d of digitsOf(cands[target])) {
        steps.push({ type: 'guess', ...at(target), value: d, snapshot: toSnapshot(cands) });
        const trial = cands.slice();
        if (propagate(trial, [{ cell: target, value: d }])) {
          const res = search(trial);
          if (res) return res;
        }
        steps.push({ type: 'contradiction', ...at(target), value: d, snapshot: toSnapshot(cands) });
      }
      return null;
    }

    const cands = new Array(81).fill(ALL);
    const initQueue = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) initQueue.push({ cell: r * 9 + c, value: board[r][c] });
    }

    if (!propagate(cands, initQueue)) return { solved: false, steps, solvedBoard: null };

    const result = search(cands);
    if (!result) return { solved: false, steps, solvedBoard: null };

    const solvedBoard = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => lowestDigit(result[r * 9 + c]))
    );
    return { solved: true, steps, solvedBoard };
  }
```

Add it to the module's returned object (the `return { ... }` near the old line 213):

```js
  return {
    isValid,
    solvePuzzle,
    hasValidGivens,
    isSolvableLayout,
    createBacktrackingTrace,
    createMrvTrace,
    createConstraintPropagationTrace,
    countSolutions,
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:logic`
Expected: PASS — including the line `All constraint propagation trace tests passed.`

- [ ] **Step 5: Commit**

```bash
git add src/solver.js tests/game.test.js
git commit -m "$(cat <<'EOF'
feat: add constraint propagation solver trace

Norvig-style AC-3 propagation (naked + hidden singles) with a
fail-first DFS fallback. Emits propagate/guess/contradiction steps,
each carrying a 9x9 candidate-digit snapshot.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Visualizer integration

**Files:**
- Modify: `src/visualizer.js`
- Test: `tests/game.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/game.test.js` after the existing `// visualizer algorithm-selection tests` block (after line ~252, before the generator tests `require` on line 254):

```js
// constraint propagation visualizer integration
const cpRunGame = sudokuGame();
cpRunGame.initialBoard = unsolved.map(row => [...row]);
cpRunGame.board = unsolved.map(row => [...row]);
cpRunGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
cpRunGame.selectedAlgorithm = 'constraint';
cpRunGame.runSolver();
clearInterval(cpRunGame._interval);
assert.deepStrictEqual(
  cpRunGame.steps.map(s => s.type),
  createConstraintPropagationTrace(unsolved).steps.map(s => s.type),
  'runSolver builds the constraint propagation trace when CP is selected'
);

// applying a propagate step updates the snapshot, board, and elimination count
const cpApplyGame = sudokuGame();
cpApplyGame.initialBoard = unsolved.map(row => [...row]);
cpApplyGame.board = unsolved.map(row => [...row]);
cpApplyGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
cpApplyGame.selectedAlgorithm = 'constraint';
cpApplyGame.steps = createConstraintPropagationTrace(unsolved).steps;
cpApplyGame.stepIndex = 0;
cpApplyGame.status = 'running';
const firstPropagate = cpApplyGame.steps.findIndex(s => s.type === 'propagate');
for (let i = 0; i <= firstPropagate; i++) cpApplyGame._applyNextStep();
assert.ok(cpApplyGame.currentSnapshot, 'applying a CP step sets currentSnapshot');
assert.ok(cpApplyGame.eliminationCount > 0, 'propagate steps increment the elimination count');

// cellCandidates returns multi-candidate digit arrays and null for solved cells
const snap = createConstraintPropagationTrace(unsolved).steps[0].snapshot;
const cpCandGame = sudokuGame();
cpCandGame.currentSnapshot = snap;
let foundMulti = false, foundSingle = false;
for (let r = 0; r < 9 && !(foundMulti && foundSingle); r++) {
  for (let c = 0; c < 9; c++) {
    if (snap[r][c].length > 1) { assert.deepStrictEqual(cpCandGame.cellCandidates(r, c), snap[r][c], 'cellCandidates returns the candidate digits'); foundMulti = true; }
    else if (snap[r][c].length === 1) { assert.strictEqual(cpCandGame.cellCandidates(r, c), null, 'cellCandidates returns null for solved cells'); foundSingle = true; }
  }
}
assert.ok(foundMulti, 'snapshot has at least one multi-candidate cell to verify');

// stat labels and values are algorithm-aware
const cpLabelGame = sudokuGame();
cpLabelGame.selectedAlgorithm = 'backtracking';
assert.strictEqual(cpLabelGame.statLabelPrimary().includes('Placed'), true, 'backtracking primary label is Placed');
assert.strictEqual(cpLabelGame.statLabelSecondary().includes('Backtracks'), true, 'backtracking secondary label is Backtracks');
cpLabelGame.selectedAlgorithm = 'constraint';
cpLabelGame.eliminationCount = 12;
cpLabelGame.guessCount = 3;
assert.strictEqual(cpLabelGame.statLabelPrimary().includes('Eliminations'), true, 'CP primary label is Eliminations');
assert.strictEqual(cpLabelGame.statLabelSecondary().includes('Guesses'), true, 'CP secondary label is Guesses');
assert.strictEqual(cpLabelGame.statValuePrimary(), 12, 'CP primary value is the elimination count');
assert.strictEqual(cpLabelGame.statValueSecondary(), 3, 'CP secondary value is the guess count');

// resetPuzzle clears CP-specific state
const cpResetGame = sudokuGame();
cpResetGame.initialBoard = unsolved.map(row => [...row]);
cpResetGame.currentSnapshot = snap;
cpResetGame.eliminationCount = 9;
cpResetGame.guessCount = 2;
cpResetGame.resetPuzzle();
assert.strictEqual(cpResetGame.currentSnapshot, null, 'resetPuzzle clears currentSnapshot');
assert.strictEqual(cpResetGame.eliminationCount, 0, 'resetPuzzle clears eliminationCount');
assert.strictEqual(cpResetGame.guessCount, 0, 'resetPuzzle clears guessCount');

console.log('All constraint propagation visualizer tests passed.');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:logic`
Expected: FAIL — `cpRunGame.steps` will not match (CP not registered), and `statLabelPrimary`/`cellCandidates` are not functions.

- [ ] **Step 3: Implement the visualizer changes**

In `src/visualizer.js`:

(a) Destructure the new builder (line 9):
```js
  const { createBacktrackingTrace, createMrvTrace, createConstraintPropagationTrace } = solver;
```

(b) Register builder + label (lines 12-20):
```js
  const TRACE_BUILDERS = {
    backtracking: createBacktrackingTrace,
    mrv: createMrvTrace,
    constraint: createConstraintPropagationTrace,
  };

  const ALGORITHM_LABELS = {
    backtracking: 'Backtracking DFS',
    mrv: 'Backtracking + MRV',
    constraint: 'Constraint Propagation',
  };
```

(c) Add state fields in the object returned by `sudokuGame()` (after `backtrackedCount: 0,` near line 48):
```js
      placedCount: 0,
      backtrackedCount: 0,
      eliminationCount: 0,
      guessCount: 0,
      currentSnapshot: null,
```

(d) In `newPuzzle`'s `run` reset block (after `this.backtrackedCount = 0;` near line 76) add:
```js
            this.eliminationCount = 0;
            this.guessCount = 0;
            this.currentSnapshot = null;
```

(e) In `runSolver`, inside the rebuild branch (after `this.currentStep = null;` near line 117) add:
```js
          this.placedCount = 0;
          this.backtrackedCount = 0;
          this.eliminationCount = 0;
          this.guessCount = 0;
          this.currentSnapshot = null;
```

(f) In `resetPuzzle` (after `this.backtrackedCount = 0;` near line 169) add:
```js
        this.eliminationCount = 0;
        this.guessCount = 0;
        this.currentSnapshot = null;
```

(g) In `finishNow`, after `this.board = trace.solvedBoard.map(row => [...row]);` (near line 152) add:
```js
          this.currentSnapshot = null;
```

(h) Replace the body of `_applyNextStep` (lines 255-274) with type-branching:
```js
      _applyNextStep() {
        if (this.stepIndex >= this.steps.length) {
          this._completeSolve();
          return;
        }

        const step = this.steps[this.stepIndex];
        if (step.type === 'place' || step.type === 'backtrack') {
          if (step.type === 'place') this.placedCount++;
          else this.backtrackedCount++;
          const nextRow = [...this.board[step.row]];
          nextRow[step.col] = step.type === 'place' ? step.value : 0;
          this.board = this.board.map((row, index) => index === step.row ? nextRow : row);
        } else {
          if (step.type === 'propagate') this.eliminationCount += step.eliminated.length;
          else if (step.type === 'guess') this.guessCount++;
          this.currentSnapshot = step.snapshot;
          this.board = step.snapshot.map(row => row.map(cell => cell.length === 1 ? cell[0] : 0));
        }

        this.currentStep = step;
        this.stepIndex++;
        if (this.stepIndex >= this.steps.length) {
          this._completeSolve();
        } else {
          this._flushTimer();
        }
      },
```

(i) In `_completeSolve` (near line 298) clear the snapshot so the solved board shows numbers, not pencil marks:
```js
      _completeSolve() {
        this._stopPlayback();
        this._stopTimer();
        if (this.solvedBoard) this.board = this.solvedBoard.map(row => [...row]);
        this.currentSnapshot = null;
        this.status = 'solved';
      },
```

(j) Add `candidates` to `cells()` (lines 194-203):
```js
      cells() {
        return this.board.flatMap((row, r) =>
          row.map((value, c) => ({
            key: `${r}-${c}`,
            row: r,
            col: c,
            value,
            candidates: this.cellCandidates(r, c),
          }))
        );
      },
```

(k) Add render + highlight helpers (place after `isBacktracked`, near line 247):
```js
      cellCandidates(row, col) {
        if (!this.currentSnapshot) return null;
        const cell = this.currentSnapshot[row]?.[col];
        if (!cell || cell.length <= 1) return null;
        return cell;
      },

      isPlacingCell(row, col) {
        return this.isCurrentCell(row, col) && (this.currentStep?.type === 'place' || this.currentStep?.type === 'propagate');
      },

      isGuessCell(row, col) {
        return this.isCurrentCell(row, col) && this.currentStep?.type === 'guess';
      },

      isContradictionCell(row, col) {
        return this.isCurrentCell(row, col) && this.currentStep?.type === 'contradiction';
      },

      statLabelPrimary() {
        return this.selectedAlgorithm === 'constraint' ? '✦ Eliminations' : '✦ Placed';
      },

      statLabelSecondary() {
        return this.selectedAlgorithm === 'constraint' ? '↯ Guesses' : '↩ Backtracks';
      },

      statValuePrimary() {
        return this.selectedAlgorithm === 'constraint' ? this.eliminationCount : this.placedCount;
      },

      statValueSecondary() {
        return this.selectedAlgorithm === 'constraint' ? this.guessCount : this.backtrackedCount;
      },
```

(l) Add CP status messages in `statusText()` (after the backtrack branch, near line 214, before the `paused` check):
```js
        if (this.status === 'running' && this.currentStep?.type === 'propagate') {
          return `Propagating from row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'guess') {
          return `Guessing ${this.currentStep.value} at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'contradiction') {
          return `Contradiction at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}, backtracking.`;
        }
```

(m) Add the badge + subtitle entries (`algorithmBadgeLabel` near line 221, `subtitleText` near line 234):
```js
      // in algorithmBadgeLabel's badges object, add:
          constraint: '⬡ Constraint Propagation',
      // in subtitleText's labels object, add:
          constraint: 'Constraint Propagation Visualizer',
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:logic`
Expected: PASS — including `All constraint propagation visualizer tests passed.`

- [ ] **Step 5: Commit**

```bash
git add src/visualizer.js tests/game.test.js
git commit -m "$(cat <<'EOF'
feat: wire constraint propagation into the visualizer

Register the trace builder, track candidate snapshots and
elimination/guess counts, branch step application by type, and add
algorithm-aware stat labels and status messages.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: UI — pencil marks, select option, stat bindings

**Files:**
- Modify: `index.html`, `style.css`

There is no unit test for markup; verification is the smoke test (Task 4) and a manual browser check. Make the edits, then confirm `npm run test:logic` still passes (it does not touch markup) before committing.

- [ ] **Step 1: Add the algorithm option**

In `index.html`, in the algorithm `<select>` (after line 97):
```html
          <option value="constraint">⬡ Constraint Propagation</option>
```

- [ ] **Step 2: Replace the cell render with value-or-pencil-marks**

In `index.html`, replace the cell `<div>` (lines 54-66) with:
```html
        <div
          class="sudoku-cell"
          :aria-label="cell.value ? `Row ${cell.row + 1}, column ${cell.col + 1}, ${cell.value}` : `Row ${cell.row + 1}, column ${cell.col + 1}, empty`"
          :class="{
            'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100': cellKind(cell.row, cell.col) === 'given',
            'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300': cellKind(cell.row, cell.col) === 'generated' && !isCurrentCell(cell.row, cell.col),
            'bg-white dark:bg-slate-900 text-transparent': cellKind(cell.row, cell.col) === 'empty' && !isCurrentCell(cell.row, cell.col),
            'bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100': isPlacingCell(cell.row, cell.col),
            'bg-violet-200 dark:bg-violet-900 text-violet-950 dark:text-violet-100': isGuessCell(cell.row, cell.col),
            'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300': isBacktracked(cell.row, cell.col) || isContradictionCell(cell.row, cell.col),
            'finish-flash': finishFlash && cellKind(cell.row, cell.col) !== 'given',
          }"
        >
          <template x-if="cell.value">
            <span x-text="cell.value"></span>
          </template>
          <template x-if="!cell.value && cell.candidates">
            <div class="cell-candidates">
              <template x-for="d in [1,2,3,4,5,6,7,8,9]" :key="d">
                <span class="cell-candidate" x-text="cell.candidates.includes(d) ? d : ''"></span>
              </template>
            </div>
          </template>
        </div>
```

- [ ] **Step 3: Bind the stat-tile labels and values**

In `index.html`, replace the two stat tiles' static label/value text (lines 149-156):
```html
          <div class="stat-place">
            <div class="stat-label" x-text="statLabelPrimary()"></div>
            <div class="stat-value" x-text="statValuePrimary()"></div>
          </div>
          <div class="stat-back">
            <div class="stat-label" x-text="statLabelSecondary()"></div>
            <div class="stat-value" x-text="statValueSecondary()"></div>
          </div>
```

- [ ] **Step 4: Add pencil-mark CSS**

In `style.css`, add after the `.sudoku-cell.finish-flash` rule (after line 92):
```css
.cell-candidates {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 100%;
  height: 100%;
}

.cell-candidate {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  font-weight: 600;
  line-height: 1;
  color: #94a3b8;
}

.dark .cell-candidate {
  color: #64748b;
}
```

In the mobile media query (`@media (max-width: 639px)`), add inside it (after the `.sudoku-cell` font-size rule near line 242):
```css
  body .cell-candidate {
    font-size: clamp(0.4rem, 1.6vw, 0.55rem) !important;
  }
```

- [ ] **Step 5: Verify logic tests still pass and commit**

Run: `npm run test:logic`
Expected: PASS (markup changes do not affect Node tests).

```bash
git add index.html style.css
git commit -m "$(cat <<'EOF'
feat: render candidate pencil marks for constraint propagation

Add the Constraint Propagation option, render each empty cell's
remaining candidates as a fixed 3x3 mini-grid, add guess/contradiction
highlight colors, and make stat-tile labels algorithm-aware.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Smoke test — Constraint Propagation flow

**Files:**
- Modify: `tests/smoke.test.js`

- [ ] **Step 1: Add the CP flow to the smoke test**

In `tests/smoke.test.js`, insert this block after the Reset assertions (after line 128, immediately before `assert.deepStrictEqual(errors, [], ...)` on line 129):

```js
      // constraint propagation flow: pencil marks appear, then board solves
      await page.selectOption('select.algo-select', 'constraint');
      await page.getByText('Select an algorithm and run the solver.').waitFor();
      await page.getByRole('button', { name: 'Run Algorithm' }).click();
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.cell-candidate')].some(el => el.textContent.trim() !== '')
      );
      await page.getByRole('button', { name: 'Finish Now' }).click();
      await page.getByText('Solved by Constraint Propagation.').waitFor();
      const cpFilledCells = await page.locator('.sudoku-cell').evaluateAll(cells =>
        cells.filter(cell => cell.textContent.trim()).length
      );
      assert.strictEqual(cpFilledCells, 81, 'Constraint Propagation fills every cell after Finish Now');
```

- [ ] **Step 2: Run the smoke test to verify it passes**

Run: `npm run test:smoke`
Expected: PASS — `All browser smoke tests passed.`
(If Playwright's Chromium is not installed, run `npx playwright install chromium` first.)

- [ ] **Step 3: Commit**

```bash
git add tests/smoke.test.js
git commit -m "$(cat <<'EOF'
test: cover the constraint propagation browser flow

Select the algorithm, assert pencil marks render, then Finish Now
fills the board and reports the constraint propagation solver.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Docs, guardrail test, and cache bump

**Files:**
- Modify: `tests/project.test.js`, `README.md`, `implementation-notes.md`, `CLAUDE.md`, `sw.js`, `index.html`

- [ ] **Step 1: Add a README guardrail test (failing first)**

In `tests/project.test.js`, after the existing README assertions (after line 26) add:
```js
assert.ok(readme.includes('Constraint Propagation'), 'README documents the constraint propagation algorithm');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tests/project.test.js`
Expected: FAIL — README does not yet mention Constraint Propagation.

- [ ] **Step 3: Update README**

In `README.md`, in the "Solving Algorithms" section, add a paragraph after the Backtracking + MRV entry:
```markdown
### Constraint Propagation

Constraint propagation treats every empty cell as a set of candidate digits and repeatedly applies two rules to fixpoint: a *naked single* (a cell with one remaining candidate is solved, and that digit is struck from its 20 peers) and a *hidden single* (if a digit has only one possible cell left in a row, column, or box, it must go there). Each assignment cascades — one placement can ripple eliminations across the board, and easy puzzles often solve with no guessing at all. When propagation stalls on harder puzzles, the solver falls back to a fail-first depth-first search: it guesses the most constrained cell, propagates, and backtracks on contradiction. This is the approach Peter Norvig describes in "Solving Every Sudoku Puzzle." In the visualizer, each empty cell shows its remaining candidates as pencil marks that shrink as constraints propagate.
```

In the "Algorithm Comparison" section, update the intro line to state that algorithms #1, #2, and #3 are implemented, and ensure the Constraint Propagation row is present in the table (it already is, per the spec's research table — if the table marks it as a future candidate, change that note to "implemented").

- [ ] **Step 4: Update implementation-notes.md**

Append a new dated section at the end of `implementation-notes.md`:
```markdown
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
```

- [ ] **Step 5: Update CLAUDE.md**

In `CLAUDE.md`, in the "Selectable algorithm" bullet under Key Decisions, update it to describe **three** algorithms. Add a sentence:
```markdown
A third algorithm, `Constraint Propagation` (`createConstraintPropagationTrace`, Norvig-style naked/hidden-single propagation with a fail-first DFS fallback), emits new step types — `propagate`, `guess`, `contradiction` — each carrying a `snapshot` (9x9 arrays of remaining candidate digits). The visualizer renders snapshots as pencil marks via `cellCandidates()`, tracks `eliminationCount`/`guessCount`, and relabels the two stat tiles per algorithm via `statLabelPrimary/Secondary` and `statValuePrimary/Secondary`.
```

In the `src/solver.js` file-structure line, add `createConstraintPropagationTrace` to the list of exports.

- [ ] **Step 6: Bump the service worker cache and query strings**

In `sw.js`, line 3:
```js
const CACHE = 'sudoku-v24';
```

In `index.html`, change all six `?v=20260525-mrv` occurrences (lines 15, 19, 20, 21, 22, 23) to `?v=20260525-cp`.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS — `All project setup tests passed.` and all game test lines, including the new CP test lines.

- [ ] **Step 8: Commit**

```bash
git add tests/project.test.js README.md implementation-notes.md CLAUDE.md sw.js index.html
git commit -m "$(cat <<'EOF'
docs: document constraint propagation and bump SW cache

Add the README algorithm explanation + guardrail test, log the
implementation-notes entry, update CLAUDE.md, and bump the service
worker cache to sudoku-v24 with matching query strings.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm test && npm run test:smoke`
Expected: both PASS with no failing assertions.

- [ ] **Step 2: Manual browser check**

Serve the folder (e.g. `npx serve .` or any static server) and open `index.html`. Verify:
- The Algorithm dropdown lists Constraint Propagation.
- Selecting it and clicking Run shows pencil marks shrinking across cells.
- The stat tiles read "Eliminations" and "Guesses".
- Finish Now fills the board; status reads "Solved by Constraint Propagation."
- Reset restores the layout; switching back to Backtracking DFS restores "Placed"/"Backtracks" labels and single-number cells.

- [ ] **Step 3: Confirm clean git state**

Run: `git status`
Expected: working tree clean, all six commits present.

---

## Self-Review

**Spec coverage:**
- Solver `createConstraintPropagationTrace` with the `{solved,steps,solvedBoard}` contract, invalid-givens rejection, no mutation → Task 1.
- Bitmask model, naked + hidden singles, wave-based steps, fail-first search fallback → Task 1.
- Step shapes `propagate`/`guess`/`contradiction` with `snapshot` → Task 1 (note: snapshot is digit-array form, decided during planning for clean rendering; documented in the plan header and docs).
- Pencil-mark render (3×3 fixed slots), highlight colors → Task 3.
- `cellCandidates`, `cells()` candidates field → Task 2.
- Visualizer registration, `_applyNextStep` branching, snapshot/board derivation, `finishNow`/`_completeSolve` snapshot clearing → Task 2.
- Algorithm-aware stat tiles (Eliminations/Guesses) → Tasks 2 + 3.
- Select option, badge, subtitle, status messages → Tasks 2 + 3.
- Tests: solver (contract, zero-guess, hard cross-check, search-heavy guess+contradiction, snapshot consistency), visualizer, smoke → Tasks 1, 2, 4.
- Pre-push chores: SW cache bump + query strings, implementation-notes, CLAUDE.md, README + guardrail → Task 5.

**Placeholder scan:** No TODO/TBD; every code step has concrete code; the only descriptive step (README "Algorithm Comparison" table tweak) provides exact target text.

**Type consistency:** Step shape uses `row`/`col`/`value`/`eliminated`/`snapshot` consistently across solver, visualizer, and tests. Helper names (`cellCandidates`, `isPlacingCell`, `isGuessCell`, `isContradictionCell`, `statLabelPrimary/Secondary`, `statValuePrimary/Secondary`, `eliminationCount`, `guessCount`, `currentSnapshot`) match between Task 2 implementation, Task 2 tests, and Task 3 markup. Snapshot is digit-array form everywhere it is consumed.
