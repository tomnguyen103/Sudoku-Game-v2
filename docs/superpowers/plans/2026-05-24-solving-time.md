# Solving Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an active solve-time metric to the status widget that accumulates elapsed milliseconds only while the solver is running (pauses excluded).

**Architecture:** Two new state fields (`_runStartTime`, `_elapsedMs`) on the Alpine object track timing segments. Lifecycle hooks in `runSolver`, `pauseSolver`, `finishNow`, `_applyNextStep`, `resetPuzzle`, and `newPuzzle` flush or reset those fields. `elapsedText()` formats the total for display. A new full-width `stat-time` tile in the status widget shows the value.

**Tech Stack:** Vanilla JS (Alpine.js reactive state), plain Node.js assert tests, Tailwind CSS utility classes + custom CSS in `style.css`.

---

### Task 1: TDD — `elapsedText()` method

**Files:**
- Modify: `tests/game.test.js`
- Modify: `src/visualizer.js`

- [ ] **Step 1: Write three failing tests at the bottom of `tests/game.test.js`**

Add this block after the last `console.log` line in `tests/game.test.js`:

```js
// solving time — elapsedText()
const etGame = sudokuGame();
assert.strictEqual(etGame.elapsedText(), '0.00s', 'elapsedText: initial value is 0.00s');

etGame._elapsedMs = 3470;
assert.strictEqual(etGame.elapsedText(), '3.47s', 'elapsedText: reflects accumulated _elapsedMs');

etGame._elapsedMs = 1000;
const origNow0 = Date.now;
Date.now = () => 5000;
etGame._runStartTime = 4000; // 1000ms live segment
assert.strictEqual(etGame.elapsedText(), '2.00s', 'elapsedText: includes live _runStartTime segment');
Date.now = origNow0;
etGame._runStartTime = null;
etGame._elapsedMs = 0;

console.log('All solving-time elapsedText tests passed.');
```

- [ ] **Step 2: Run tests — confirm they fail**

```
node tests/game.test.js
```

Expected: `TypeError: etGame.elapsedText is not a function`

- [ ] **Step 3: Add `_runStartTime`, `_elapsedMs`, and `elapsedText()` to `src/visualizer.js`**

In the `sudokuGame()` return object, add `_runStartTime` and `_elapsedMs` alongside the existing state fields (after `backtrackedCount`):

```js
      placedCount: 0,
      backtrackedCount: 0,
      _runStartTime: null,
      _elapsedMs: 0,
      selectedAlgorithm: 'backtracking',
```

After `algorithmBadgeLabel()`, add `elapsedText()`:

```js
      elapsedText() {
        const total = this._elapsedMs + (this._runStartTime ? Date.now() - this._runStartTime : 0);
        return (total / 1000).toFixed(2) + 's';
      },
```

- [ ] **Step 4: Run tests — confirm they pass**

```
node tests/game.test.js
```

Expected: all groups log pass, including `All solving-time elapsedText tests passed.`

- [ ] **Step 5: Commit**

```
git add src/visualizer.js tests/game.test.js
git commit -m "feat: add elapsedText() with _runStartTime/_elapsedMs state"
```

---

### Task 2: TDD — Lifecycle hooks

**Files:**
- Modify: `tests/game.test.js`
- Modify: `src/visualizer.js`

- [ ] **Step 1: Write five failing lifecycle tests in `tests/game.test.js`**

Add this block after the `elapsedText` test block (after its `console.log`):

```js
// solving time — lifecycle hooks
// pauseSolver flushes elapsed time
const pauseTimeGame = sudokuGame();
pauseTimeGame.status = 'running';
const origNow1 = Date.now;
Date.now = () => 2500;
pauseTimeGame._runStartTime = 1000;
pauseTimeGame._elapsedMs = 0;
pauseTimeGame.pauseSolver();
Date.now = origNow1;
assert.strictEqual(pauseTimeGame._elapsedMs, 1500, 'pauseSolver: flushes ms into _elapsedMs');
assert.strictEqual(pauseTimeGame._runStartTime, null, 'pauseSolver: clears _runStartTime');

// resetPuzzle clears timing
const resetTimeGame = sudokuGame();
resetTimeGame._elapsedMs = 9999;
resetTimeGame._runStartTime = 12345;
resetTimeGame.resetPuzzle();
assert.strictEqual(resetTimeGame._elapsedMs, 0, 'resetPuzzle: clears _elapsedMs');
assert.strictEqual(resetTimeGame._runStartTime, null, 'resetPuzzle: clears _runStartTime');

// newPuzzle clears timing
const newTimeGame = sudokuGame();
newTimeGame._elapsedMs = 4200;
newTimeGame._runStartTime = 777;
newTimeGame.newPuzzle();
assert.strictEqual(newTimeGame._elapsedMs, 0, 'newPuzzle: clears _elapsedMs');
assert.strictEqual(newTimeGame._runStartTime, null, 'newPuzzle: clears _runStartTime');

// finishNow flushes active segment
const finishTimeGame = sudokuGame();
finishTimeGame.initialBoard = unsolved.map(row => [...row]);
finishTimeGame.board = unsolved.map(row => [...row]);
finishTimeGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
finishTimeGame._runStartTime = 3000;
finishTimeGame._elapsedMs = 1000;
const origNow2 = Date.now;
Date.now = () => 4000;
finishTimeGame.finishNow();
Date.now = origNow2;
assert.strictEqual(finishTimeGame._elapsedMs, 2000, 'finishNow: flushes active segment into _elapsedMs');
assert.strictEqual(finishTimeGame._runStartTime, null, 'finishNow: clears _runStartTime');

// runSolver sets _runStartTime
const runTimeGame = sudokuGame();
runTimeGame.initialBoard = unsolved.map(row => [...row]);
runTimeGame.board = unsolved.map(row => [...row]);
runTimeGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
const origNow3 = Date.now;
Date.now = () => 8000;
runTimeGame.runSolver();
clearInterval(runTimeGame._interval);
Date.now = origNow3;
assert.strictEqual(runTimeGame._runStartTime, 8000, 'runSolver: sets _runStartTime to Date.now()');

console.log('All solving-time lifecycle tests passed.');
```

- [ ] **Step 2: Run tests — confirm they fail**

```
node tests/game.test.js
```

Expected: `AssertionError [ERR_ASSERTION]: pauseSolver: flushes ms into _elapsedMs`

- [ ] **Step 3: Wire lifecycle hooks in `src/visualizer.js`**

**`runSolver()`** — set `_runStartTime` just before the interval starts (replace the last two lines of the method):

```js
        this.status = 'running';
        this._runStartTime = Date.now();
        this._interval = setInterval(() => this._applyNextStep(), this.playbackDelay());
```

**`pauseSolver()`** — flush before setting `'paused'`:

```js
      pauseSolver() {
        if (this.status !== 'running') return;
        this._stopPlayback();
        if (this._runStartTime !== null) {
          this._elapsedMs += Date.now() - this._runStartTime;
          this._runStartTime = null;
        }
        this.status = 'paused';
      },
```

**`finishNow()`** — flush before freezing (add two lines after `this._stopPlayback()`):

```js
      finishNow() {
        if (this.status === 'solved') return;
        this._stopPlayback();
        if (this._runStartTime !== null) {
          this._elapsedMs += Date.now() - this._runStartTime;
          this._runStartTime = null;
        }
        const trace = createBacktrackingTrace(this.initialBoard);
        // ... rest unchanged
```

**`resetPuzzle()`** — add two resets after `this.backtrackedCount = 0`:

```js
        this.placedCount = 0;
        this.backtrackedCount = 0;
        this._runStartTime = null;
        this._elapsedMs = 0;
        this.status = 'ready';
```

**`newPuzzle()` `run()` closure** — add two resets after `this.backtrackedCount = 0` inside the `run()` inner function:

```js
            this.placedCount = 0;
            this.backtrackedCount = 0;
            this._runStartTime = null;
            this._elapsedMs = 0;
            this.status = 'ready';
```

**`_applyNextStep()`** — flush when the solver completes (replace the early-return block at the top of `_applyNextStep`):

```js
        if (this.stepIndex >= this.steps.length) {
          this._stopPlayback();
          if (this._runStartTime !== null) {
            this._elapsedMs += Date.now() - this._runStartTime;
            this._runStartTime = null;
          }
          if (this.solvedBoard) this.board = this.solvedBoard.map(row => [...row]);
          this.status = 'solved';
          return;
        }
```

- [ ] **Step 4: Run tests — confirm they pass**

```
node tests/game.test.js
```

Expected: all groups pass, including `All solving-time lifecycle tests passed.`

- [ ] **Step 5: Commit**

```
git add src/visualizer.js tests/game.test.js
git commit -m "feat: wire solving-time lifecycle hooks in visualizer"
```

---

### Task 3: HTML tile, CSS, and SW cache bump

**Files:**
- Modify: `style.css`
- Modify: `index.html`
- Modify: `sw.js`

- [ ] **Step 1: Add `.stat-time` CSS to `style.css`**

Append after the `.dark .stat-back` block (after line 194):

```css
.stat-time {
  background: #fef3c7;
  border: 1px solid rgba(217, 119, 6, 0.27);
  border-radius: 7px;
  padding: 0.5rem;
  text-align: center;
}
.stat-time .stat-label { color: #d97706; }
.stat-time .stat-value { color: #92400e; }
.dark .stat-time { background: #3b2500; }
.dark .stat-time .stat-label { color: #fbbf24; }
.dark .stat-time .stat-value { color: #fde68a; }
```

- [ ] **Step 2: Add the stat tile to `index.html`**

In `index.html`, locate the status widget section. The existing 2-column grid ends with:

```html
        </div>
        <p class="text-xs text-center text-slate-500 dark:text-slate-400" x-text="statusText()"></p>
```

Insert the new tile between them:

```html
        </div>
        <div class="stat-time mt-2">
          <div class="stat-label">⏱ Solving Time</div>
          <div class="stat-value" x-text="elapsedText()"></div>
        </div>
        <p class="text-xs text-center text-slate-500 dark:text-slate-400" x-text="statusText()"></p>
```

- [ ] **Step 3: Bump the SW cache in `sw.js`**

Change line 3:

```js
const CACHE = 'sudoku-v17';
```

- [ ] **Step 4: Update the query strings in `index.html`**

Replace all five occurrences of `?v=20260524-ctrlpanel` with `?v=20260524-solvetime`:

```
vendor/tailwindcss.js?v=20260524-solvetime
vendor/alpine.min.js?v=20260524-solvetime
style.css?v=20260524-solvetime
src/solver.js?v=20260524-solvetime
src/generator.js?v=20260524-solvetime
src/visualizer.js?v=20260524-solvetime
```

- [ ] **Step 5: Run full test suite**

```
npm test
```

Expected: all test groups pass with exit code 0.

- [ ] **Step 6: Update `implementation-notes.md`**

Add an entry under today's date (2026-05-24) noting:
- Added `_runStartTime`/`_elapsedMs` timing state to `sudokuGame()`; pauses freeze the counter
- Added `elapsedText()` display helper; renders as `"X.XXs"`
- Added `⏱ Solving Time` stat tile in the status widget with amber styling
- SW cache bumped from `sudoku-v16` to `sudoku-v17`

- [ ] **Step 7: Commit**

```
git add src/visualizer.js index.html style.css sw.js implementation-notes.md tests/game.test.js
git commit -m "feat: add solving time stat to status widget"
```
