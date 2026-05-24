# Control Panel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the sidebar control panel with a prominent algorithm dropdown, Speed moved inside the algorithm section, and a status panel showing Placed/Backtracks counts linked to the selected algorithm.

**Architecture:** Changes are isolated to three files: `src/visualizer.js` (state + methods), `style.css` (new CSS classes), and `index.html` (`<aside>` restructure). The smoke test selectors update to match the new button/text labels. No solver logic changes.

**Tech Stack:** Alpine.js reactive state, Tailwind CDN utility classes, custom CSS classes for colored elements, Playwright smoke test.

---

## File Map

| File | What changes |
|---|---|
| `src/visualizer.js` | Add `placedCount`, `backtrackedCount`, `selectedAlgorithm`; rename `newTest`→`newPuzzle`; add `algorithmBadgeLabel()`; update `statusText()`; increment counters in `_applyNextStep`; reset in `resetPuzzle`/`newPuzzle` |
| `style.css` | Add `.algo-ring`, `.algo-select`, `.status-header`, `.algo-badge`, `.stat-place`, `.stat-back`, `.stat-label`, `.stat-value` with light + dark variants |
| `index.html` | Replace entire `<aside>` block; bump version query strings |
| `tests/smoke.test.js` | Update 4 text/button selectors |
| `sw.js` | Bump cache name `sudoku-v12` → `sudoku-v13` |

---

### Task 1: Update state and methods in visualizer.js

**Files:**
- Modify: `src/visualizer.js`

- [ ] **Step 1: Add three new state properties**

In `src/visualizer.js`, inside the object returned by `sudokuGame()`, add after `_interval: null,`:

```js
placedCount: 0,
backtrackedCount: 0,
selectedAlgorithm: 'backtracking',
```

- [ ] **Step 2: Rename `newTest` → `newPuzzle`, reset counters inside it**

Replace the entire `newTest()` method with:

```js
newPuzzle() {
  this._stopPlayback();
  this.status = 'loading';
  this.errorMessage = '';

  const run = () => {
    if (this.status !== 'loading') return;
    try {
      const { board, locked } = generateTestPuzzle(this.difficulty);
      this.board = board;
      this.initialBoard = board.map(row => [...row]);
      this.locked = locked;
      this.steps = [];
      this.stepIndex = 0;
      this.currentStep = null;
      this.solvedBoard = null;
      this.placedCount = 0;
      this.backtrackedCount = 0;
      this.status = 'ready';
    } catch (_) {
      this.status = 'error';
      this.errorMessage = 'Puzzle generation failed. Please try again.';
    }
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => setTimeout(run, 0));
  } else {
    run();
  }
},
```

- [ ] **Step 3: Update `init()` and `setDifficulty()` to call `newPuzzle()`**

In `init()`, change `this.newTest()` → `this.newPuzzle()`.

In `setDifficulty(difficulty)`, change `this.newTest()` → `this.newPuzzle()`.

- [ ] **Step 4: Reset counters in `resetPuzzle()`**

Replace the entire `resetPuzzle()` method with:

```js
resetPuzzle() {
  this._stopPlayback();
  this.board = this.initialBoard.map(row => [...row]);
  this.steps = [];
  this.stepIndex = 0;
  this.currentStep = null;
  this.solvedBoard = null;
  this.placedCount = 0;
  this.backtrackedCount = 0;
  this.status = 'ready';
},
```

- [ ] **Step 5: Increment counters in `_applyNextStep()`**

In `_applyNextStep()`, add two lines immediately after `const step = this.steps[this.stepIndex];`:

```js
const step = this.steps[this.stepIndex];
if (step.type === 'place') this.placedCount++;
else this.backtrackedCount++;
```

- [ ] **Step 6: Add `algorithmBadgeLabel()` method**

Add this method after `statusText()`:

```js
algorithmBadgeLabel() {
  return this.selectedAlgorithm === 'backtracking' ? '⬡ Backtracking' : this.selectedAlgorithm;
},
```

- [ ] **Step 7: Update `statusText()` for renamed method and algorithm-aware solved message**

Replace the entire `statusText()` method with:

```js
statusText() {
  if (this.status === 'loading') return 'Generating puzzle…';
  if (this.status === 'error') return this.errorMessage;
  if (this.status === 'ready') return 'Select an algorithm and run the solver.';
  if (this.status === 'running' && this.currentStep?.type === 'place') {
    return `Trying ${this.currentStep.value} at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
  }
  if (this.status === 'running' && this.currentStep?.type === 'backtrack') {
    return `Backtracking from row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
  }
  if (this.status === 'paused') return 'Solver paused.';
  if (this.status === 'solved') return 'Solved by Backtracking DFS.';
  return 'Preparing solver.';
},
```

- [ ] **Step 8: Run Node tests**

```bash
npm test
```

Expected output ends with: `All visualizer finish-now tests passed.` and `All generator tests passed.` — no assertion errors.

- [ ] **Step 9: Commit**

```bash
git add src/visualizer.js
git commit -m "feat: add placedCount/backtrackedCount state, rename newTest to newPuzzle"
```

---

### Task 2: Add new CSS classes to style.css

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Append the following block to the end of `style.css`**

```css
/* === Control panel redesign === */

.algo-ring {
  border: 1.5px solid rgba(124, 58, 237, 0.4) !important;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08), inset 0 1px 0 rgba(167, 139, 250, 0.07);
}

.algo-select {
  display: block;
  width: 100%;
  background: #f5f3ff;
  color: #4c1d95;
  border: 2px solid #7c3aed;
  border-radius: 0.5rem;
  padding: 0.688rem 2.5rem 0.688rem 0.875rem;
  font-size: 0.9rem;
  font-weight: 800;
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.2);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237c3aed' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.875rem center;
}

.dark .algo-select {
  background-color: #2d1a5e;
  color: #e2e8f0;
  box-shadow: 0 0 14px rgba(124, 58, 237, 0.3);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a78bfa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
}

.algo-select option {
  background: #1e1b4b;
  color: #e2e8f0;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.algo-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: #ede9fe;
  color: #7c3aed;
  border: 1px solid rgba(124, 58, 237, 0.33);
}

.dark .algo-badge {
  background: #2d1a5e;
  color: #a78bfa;
}

.stat-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 1rem;
  font-weight: 800;
  font-family: monospace;
}

.stat-place {
  background: #dbeafe;
  border: 1px solid rgba(37, 99, 235, 0.27);
  border-radius: 7px;
  padding: 0.5rem;
  text-align: center;
}

.stat-place .stat-label { color: #2563eb; }
.stat-place .stat-value { color: #1d4ed8; }

.dark .stat-place { background: #1e3a5f; }
.dark .stat-place .stat-label { color: #60a5fa; }
.dark .stat-place .stat-value { color: #93c5fd; }

.stat-back {
  background: #fee2e2;
  border: 1px solid rgba(239, 68, 68, 0.27);
  border-radius: 7px;
  padding: 0.5rem;
  text-align: center;
}

.stat-back .stat-label { color: #dc2626; }
.stat-back .stat-value { color: #991b1b; }

.dark .stat-back { background: #3b1a1a; }
.dark .stat-back .stat-label { color: #f87171; }
.dark .stat-back .stat-value { color: #fca5a5; }
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: add algo-ring, algo-select, stat-place, stat-back CSS classes"
```

---

### Task 3: Restructure <aside> in index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the entire `<aside>` block**

In `index.html`, find the line:
```html
<aside class="w-full max-w-[31rem] lg:w-72 grid grid-cols-2 lg:flex lg:flex-col gap-3">
```
and replace everything from that opening tag through its closing `</aside>` with:

```html
<aside class="w-full max-w-[31rem] lg:w-72 flex flex-col gap-3">
  <section class="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70">
    <div class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Difficulty</div>
    <div class="grid grid-cols-3 gap-1.5">
      <template x-for="d in ['easy','medium','hard']" :key="d">
        <button
          @click="setDifficulty(d)"
          :disabled="status === 'running' || status === 'loading'"
          :class="difficulty === d
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'"
          class="capitalize text-sm font-semibold py-2 rounded-md transition-colors disabled:opacity-60"
          x-text="d"
        ></button>
      </template>
    </div>
  </section>

  <section class="algo-ring bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
    <div class="text-xs uppercase tracking-wider mb-2 font-bold text-violet-400 dark:text-violet-400">⬡ Algorithm</div>
    <select
      x-model="selectedAlgorithm"
      :disabled="status === 'running' || status === 'loading'"
      class="algo-select mb-3 disabled:opacity-60"
    >
      <option value="backtracking">⬡ Backtracking DFS</option>
    </select>
    <button
      @click="runSolver()"
      :disabled="status === 'running' || status === 'loading'"
      class="w-full py-3 text-sm font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-60 mb-2"
    >Run Algorithm</button>
    <div class="text-xs font-bold uppercase tracking-widest mb-1.5 text-violet-700 dark:text-violet-500">Speed</div>
    <div class="grid grid-cols-4 gap-1.5 mb-3">
      <template x-for="option in ['1x','2x','5x','10x']" :key="option">
        <button
          @click="setSpeed(option)"
          :class="speed === option
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'"
          class="text-sm font-bold py-2 rounded-md transition-colors"
          x-text="option"
        ></button>
      </template>
    </div>
    <hr class="border-slate-200 dark:border-slate-600 mb-3">
    <div class="grid grid-cols-2 gap-2 mb-2">
      <button
        @click="pauseSolver()"
        :disabled="status !== 'running'"
        class="py-3 text-sm font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-60"
      >Pause</button>
      <button
        @click="finishNow()"
        :disabled="status === 'solved' || status === 'loading'"
        class="py-3 text-sm font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-60"
      >Finish Now</button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button
        @click="resetPuzzle()"
        class="py-3 text-sm font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors"
      >Reset</button>
      <button
        @click="newPuzzle()"
        :disabled="status === 'running' || status === 'loading'"
        class="py-3 text-sm font-bold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-white transition-colors shadow-sm disabled:opacity-60"
      >New Puzzle</button>
    </div>
  </section>

  <section class="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70">
    <div class="status-header">
      <div class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</div>
      <span class="algo-badge" x-text="algorithmBadgeLabel()"></span>
    </div>
    <div class="grid grid-cols-2 gap-2 mb-2">
      <div class="stat-place">
        <div class="stat-label">✦ Placed</div>
        <div class="stat-value" x-text="placedCount"></div>
      </div>
      <div class="stat-back">
        <div class="stat-label">↩ Backtracks</div>
        <div class="stat-value" x-text="backtrackedCount"></div>
      </div>
    </div>
    <p class="text-xs text-center text-slate-500 dark:text-slate-400" x-text="statusText()"></p>
  </section>
</aside>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: restructure control panel — algorithm dropdown, placed/backtrack counters"
```

---

### Task 4: Update smoke test selectors

**Files:**
- Modify: `tests/smoke.test.js`

- [ ] **Step 1: Update ready-state text check (appears twice)**

Change both occurrences of:
```js
await page.getByText('Choose a level, then run the backtracking solver.').waitFor();
```
to:
```js
await page.getByText('Select an algorithm and run the solver.').waitFor();
```

- [ ] **Step 2: Update Run button selector**

Change:
```js
await page.getByRole('button', { name: 'Run Backtracking Algorithm' }).click();
```
to:
```js
await page.getByRole('button', { name: 'Run Algorithm' }).click();
```

- [ ] **Step 3: Update solved-state text check**

Change:
```js
await page.getByText('Solved by backtracking.').waitFor();
```
to:
```js
await page.getByText('Solved by Backtracking DFS.').waitFor();
```

- [ ] **Step 4: Run smoke test**

```bash
npm run test:smoke
```

Expected: `All browser smoke tests passed.`

- [ ] **Step 5: Commit**

```bash
git add tests/smoke.test.js
git commit -m "test: update smoke selectors for renamed buttons and new status text"
```

---

### Task 5: Bump service worker cache version

**Files:**
- Modify: `sw.js`
- Modify: `index.html`

- [ ] **Step 1: Bump cache name in `sw.js`**

Change line 3:
```js
const CACHE = 'sudoku-v12';
```
to:
```js
const CACHE = 'sudoku-v13';
```

- [ ] **Step 2: Bump version query strings in `index.html`**

Replace all six occurrences of `?v=20260524-favicon` with `?v=20260524-ctrlpanel`:

```html
<script src="vendor/tailwindcss.js?v=20260524-ctrlpanel"></script>
<script defer src="vendor/alpine.min.js?v=20260524-ctrlpanel"></script>
<link rel="stylesheet" href="style.css?v=20260524-ctrlpanel">
<script src="src/solver.js?v=20260524-ctrlpanel"></script>
<script src="src/generator.js?v=20260524-ctrlpanel"></script>
<script src="src/visualizer.js?v=20260524-ctrlpanel"></script>
```

- [ ] **Step 3: Run full test suite**

```bash
npm test && npm run test:smoke
```

Expected: all Node assertions pass and `All browser smoke tests passed.`

- [ ] **Step 4: Final commit**

```bash
git add sw.js index.html
git commit -m "chore: bump SW cache to sudoku-v13 for control panel redesign"
```
