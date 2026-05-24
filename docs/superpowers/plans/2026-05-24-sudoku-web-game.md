# Sudoku Web Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable browser-based Sudoku game — auto-generated puzzles, 4 difficulty levels, mistake highlighting, undo, timer, dark mode, personal best, and PWA install support — deployed as a static site on Netlify.

**Architecture:** Pure-logic functions in `game.js` (no DOM, no framework dependency) are wired to Alpine.js reactive state in `index.html`. Tailwind CSS (CDN) handles all styling; `style.css` covers only the 3×3 grid box borders that Tailwind cannot express. A `manifest.json` and `sw.js` make the site installable and offline-capable.

**Tech Stack:** Tailwind CSS CDN, Alpine.js v3 CDN, Vanilla JS (ES2020), Node.js (for tests only — no npm required)

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Markup, Alpine root (`x-data`), CDN imports, PWA meta tags |
| `style.css` | Grid box border lines only (Tailwind handles everything else) |
| `game.js` | Pure functions: `isValid`, `solvePuzzle`, `countSolutions`, `generateSolution`, `shuffleBoard`, `removeClues`, `sudokuGame()` Alpine state object |
| `manifest.json` | PWA metadata: name, icons, theme colour, `display: standalone` |
| `sw.js` | Service worker: cache-first strategy, pre-caches all static assets |
| `icons/icon-192.png` | PWA icon 192×192 |
| `icons/icon-512.png` | PWA icon 512×512 |
| `generate_icons.py` | Generates PNG icons using Python stdlib only (no pip) |
| `tests/game.test.js` | Node.js tests for all pure functions in `game.js` |

---

## Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `game.js`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sudoku</title>
  <script>tailwind.config = { darkMode: 'class' }</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <link rel="stylesheet" href="style.css">
  <script src="game.js"></script>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
  <p class="text-center text-2xl font-bold mt-10 dark:text-white">Sudoku scaffold — loading OK</p>
</body>
</html>
```

- [ ] **Step 2: Create `style.css` (empty for now)**

```css
/* Grid box borders — added in Task 5 */
```

- [ ] **Step 3: Create `game.js` (empty for now)**

```js
// Pure game logic — no DOM, no Alpine dependency
```

- [ ] **Step 4: Open `index.html` in browser and verify it loads**

Open the file directly (`file://` URL). Expected: white page with "Sudoku scaffold — loading OK". No console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css game.js
git commit -m "feat: project scaffold — Tailwind + Alpine CDN loading"
```

---

## Task 2: Game Logic — Solver

**Files:**
- Modify: `game.js`
- Create: `tests/game.test.js`

- [ ] **Step 1: Write failing tests for `isValid` and `solvePuzzle`**

Create `tests/game.test.js`:

```js
const assert = require('assert');
const { isValid, solvePuzzle, countSolutions } = require('../game.js');

// isValid tests
const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(0));

assert.strictEqual(isValid(emptyBoard, 0, 0, 5), true, 'valid on empty board');

const rowBoard = emptyBoard.map(r => [...r]);
rowBoard[0][3] = 5;
assert.strictEqual(isValid(rowBoard, 0, 0, 5), false, 'invalid: 5 already in row');

const colBoard = emptyBoard.map(r => [...r]);
colBoard[3][0] = 5;
assert.strictEqual(isValid(colBoard, 0, 0, 5), false, 'invalid: 5 already in col');

const boxBoard = emptyBoard.map(r => [...r]);
boxBoard[1][1] = 5;
assert.strictEqual(isValid(boxBoard, 0, 0, 5), false, 'invalid: 5 already in 3x3 box');

// solvePuzzle tests
const unsolved = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9]
];
const board = unsolved.map(r => [...r]);
const solved = solvePuzzle(board);
assert.strictEqual(solved, true, 'solvePuzzle returns true');
assert.strictEqual(board[0][2], 4, 'correct value at [0][2]');
assert.strictEqual(board[1][1], 7, 'correct value at [1][1]');

// countSolutions tests
const uniqueBoard = unsolved.map(r => [...r]);
assert.strictEqual(countSolutions(uniqueBoard, 2), 1, 'known puzzle has exactly 1 solution');

const emptyTest = emptyBoard.map(r => [...r]);
assert.strictEqual(countSolutions(emptyTest, 2), 2, 'empty board has more than 1 solution (capped at 2)');

console.log('All solver tests passed.');
```

- [ ] **Step 2: Run tests — expect failure (functions not defined)**

```bash
node tests/game.test.js
```

Expected output: `Error: Cannot find module '../game.js'` or `TypeError: isValid is not a function`

- [ ] **Step 3: Implement `isValid`, `solvePuzzle`, `countSolutions` in `game.js`**

```js
function isValid(board, row, col, num) {
  for (let c = 0; c < 9; c++) if (board[row][c] === num) return false;
  for (let r = 0; r < 9; r++) if (board[r][col] === num) return false;
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r][c] === num) return false;
  return true;
}

function solvePuzzle(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solvePuzzle(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(board, limit = 2) {
  let count = 0;
  function solve(b) {
    if (count >= limit) return;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (b[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(b, row, col, num)) {
              b[row][col] = num;
              solve(b);
              b[row][col] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solve(board.map(r => [...r]));
  return count;
}

if (typeof module !== 'undefined') module.exports = { isValid, solvePuzzle, countSolutions };
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node tests/game.test.js
```

Expected: `All solver tests passed.`

- [ ] **Step 5: Commit**

```bash
git add game.js tests/game.test.js
git commit -m "feat: solver — isValid, solvePuzzle, countSolutions with tests"
```

---

## Task 3: Game Logic — Generator

**Files:**
- Modify: `game.js`
- Modify: `tests/game.test.js`

- [ ] **Step 1: Add generator tests to `tests/game.test.js`**

Append to the end of the file (before the final `console.log`):

```js
const { generateSolution, shuffleBoard, removeClues } = require('../game.js');

// generateSolution
const sol = generateSolution();
assert.strictEqual(sol.length, 9, 'solution has 9 rows');
assert.strictEqual(sol[0].length, 9, 'each row has 9 cols');
// verify every row/col/box contains 1-9
for (let i = 0; i < 9; i++) {
  const row = new Set(sol[i]);
  assert.strictEqual(row.size, 9, `row ${i} has 9 unique values`);
  const col = new Set(sol.map(r => r[i]));
  assert.strictEqual(col.size, 9, `col ${i} has 9 unique values`);
}

// shuffleBoard produces a valid board
const shuffled = shuffleBoard(sol);
for (let i = 0; i < 9; i++) {
  const row = new Set(shuffled[i]);
  assert.strictEqual(row.size, 9, `shuffled row ${i} has 9 unique values`);
}

// removeClues returns correct structure and unique solution
const { board: puzzle, locked } = removeClues(shuffled, 'easy');
const emptyCells = puzzle.flat().filter(v => v === 0).length;
assert.ok(emptyCells >= 30 && emptyCells <= 40, `easy has ~36 empty cells, got ${emptyCells}`);
assert.strictEqual(countSolutions(puzzle.map(r => [...r]), 2), 1, 'generated puzzle has unique solution');

console.log('All generator tests passed.');
```

- [ ] **Step 2: Run — expect failure (functions not defined)**

```bash
node tests/game.test.js
```

Expected: `TypeError: generateSolution is not a function`

- [ ] **Step 3: Implement `generateSolution`, `shuffleBoard`, `removeClues` in `game.js`**

Add before the `if (typeof module !== 'undefined')` line:

```js
function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSolution() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  function fill(pos) {
    if (pos === 81) return true;
    const row = Math.floor(pos / 9), col = pos % 9;
    const candidates = _shuffle([1,2,3,4,5,6,7,8,9]);
    for (const num of candidates) {
      if (isValid(board, row, col, num)) {
        board[row][col] = num;
        if (fill(pos + 1)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }
  fill(0);
  return board;
}

function shuffleBoard(solution) {
  let b = solution.map(r => [...r]);
  // shuffle rows within each band
  for (let band = 0; band < 3; band++) {
    const base = band * 3;
    const order = _shuffle([0, 1, 2]);
    const orig = [b[base], b[base+1], b[base+2]];
    order.forEach((from, to) => { b[base + to] = [...orig[from]]; });
  }
  // shuffle cols within each stack
  const tmp = b.map(r => [...r]);
  for (let stack = 0; stack < 3; stack++) {
    const base = stack * 3;
    const order = _shuffle([0, 1, 2]);
    for (let r = 0; r < 9; r++) {
      order.forEach((from, to) => { b[r][base + to] = tmp[r][base + from]; });
    }
  }
  // random transpose
  if (Math.random() < 0.5) {
    b = b.map((row, r) => row.map((_, c) => b[c][r]));
  }
  return b;
}

const DIFFICULTY_TARGETS = { easy: 36, medium: 46, hard: 52, expert: 57 };

function removeClues(solution, difficulty) {
  const target = DIFFICULTY_TARGETS[difficulty];
  const board = solution.map(r => [...r]);
  const locked = Array.from({ length: 9 }, () => Array(9).fill(true));
  const cells = _shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );
  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= target) break;
    const backup = board[r][c];
    board[r][c] = 0;
    if (countSolutions(board, 2) === 1) {
      locked[r][c] = false;
      removed++;
    } else {
      board[r][c] = backup;
    }
  }
  return { board, locked };
}
```

Update the exports line:

```js
if (typeof module !== 'undefined') module.exports = { isValid, solvePuzzle, countSolutions, generateSolution, shuffleBoard, removeClues };
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node tests/game.test.js
```

Expected:
```
All solver tests passed.
All generator tests passed.
```

Note: `removeClues` runs the solver repeatedly — this test takes 5–15 seconds on first run. That is normal.

- [ ] **Step 5: Commit**

```bash
git add game.js tests/game.test.js
git commit -m "feat: generator — generateSolution, shuffleBoard, removeClues with tests"
```

---

## Task 4: Alpine State Object

**Files:**
- Modify: `game.js`

- [ ] **Step 1: Add `sudokuGame()` to `game.js`**

Append to `game.js` (after `removeClues`, before the `module.exports` line):

```js
function sudokuGame() {
  return {
    board: [],
    solution: [],
    locked: [],
    selected: null,
    history: [],
    errors: 0,
    maxErrors: 3,
    timer: 0,
    paused: false,
    difficulty: 'medium',
    darkMode: false,
    status: 'playing',
    bestTimes: { easy: null, medium: null, hard: null, expert: null },
    _interval: null,

    init() {
      this.darkMode = localStorage.getItem('sudoku-dark') === 'true';
      document.documentElement.classList.toggle('dark', this.darkMode);
      const saved = localStorage.getItem('sudoku-best');
      if (saved) this.bestTimes = JSON.parse(saved);
      this.newGame();
    },

    newGame() {
      clearInterval(this._interval);
      const sol = generateSolution();
      const shuffled = shuffleBoard(sol);
      const { board, locked } = removeClues(shuffled, this.difficulty);
      this.solution = shuffled;
      this.board = board;
      this.locked = locked;
      this.selected = null;
      this.history = [];
      this.errors = 0;
      this.timer = 0;
      this.paused = false;
      this.status = 'playing';
      this._interval = setInterval(() => {
        if (this.status === 'playing' && !this.paused) this.timer++;
      }, 1000);
    },

    setDifficulty(d) {
      this.difficulty = d;
      this.newGame();
    },

    selectCell(row, col) {
      if (this.status !== 'playing') return;
      if (this.locked[row][col]) { this.selected = { row, col }; return; }
      this.selected = { row, col };
    },

    enterNumber(num) {
      if (!this.selected || this.status !== 'playing') return;
      const { row, col } = this.selected;
      if (this.locked[row][col]) return;
      const prev = this.board[row][col];
      if (prev === num) return;
      const newRow = [...this.board[row]];
      newRow[col] = num;
      this.board = this.board.map((r, i) => i === row ? newRow : r);
      this.history.push({ row, col, prev });
      if (num !== 0 && num !== this.solution[row][col]) {
        this.errors++;
        if (this.errors >= this.maxErrors) {
          this.status = 'gameover';
          clearInterval(this._interval);
          this.board = this.solution.map(r => [...r]);
        }
      } else if (num !== 0) {
        this._checkWin();
      }
    },

    erase() { this.enterNumber(0); },

    undo() {
      if (!this.history.length || this.status !== 'playing') return;
      const { row, col, prev } = this.history.pop();
      const newRow = [...this.board[row]];
      newRow[col] = prev;
      this.board = this.board.map((r, i) => i === row ? newRow : r);
    },

    togglePause() {
      if (this.status !== 'playing') return;
      this.paused = !this.paused;
    },

    toggleDark() {
      this.darkMode = !this.darkMode;
      document.documentElement.classList.toggle('dark', this.darkMode);
      localStorage.setItem('sudoku-dark', String(this.darkMode));
    },

    formatTime(s) {
      return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    },

    bestTime() {
      const t = this.bestTimes[this.difficulty];
      return t !== null ? this.formatTime(t) : null;
    },

    handleKey(e) {
      if (this.status !== 'playing') return;
      if (!this.selected && !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
      const row = this.selected?.row ?? 0;
      const col = this.selected?.col ?? 0;
      if (e.key === 'ArrowUp')    { e.preventDefault(); this.selected = { row: Math.max(0, row - 1), col }; }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); this.selected = { row: Math.min(8, row + 1), col }; }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); this.selected = { row, col: Math.max(0, col - 1) }; }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.selected = { row, col: Math.min(8, col + 1) }; }
      else if (e.key >= '1' && e.key <= '9') this.enterNumber(parseInt(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') this.erase();
      else if ((e.key === 'z' || e.key === 'Z') && e.ctrlKey) { e.preventDefault(); this.undo(); }
      else if (e.key === 'Escape') this.selected = null;
    },

    isRelated(r, c) {
      if (!this.selected) return false;
      const { row, col } = this.selected;
      return r === row || c === col ||
        (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3));
    },

    isSameNumber(r, c) {
      if (!this.selected) return false;
      const selVal = this.board[this.selected.row]?.[this.selected.col];
      return selVal && selVal !== 0 && this.board[r][c] === selVal;
    },

    isWrong(r, c) {
      const v = this.board[r][c];
      return v !== 0 && !this.locked[r][c] && v !== this.solution[r][c];
    },

    _checkWin() {
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (this.board[r][c] !== this.solution[r][c]) return;
      this.status = 'won';
      clearInterval(this._interval);
      if (this.bestTimes[this.difficulty] === null || this.timer < this.bestTimes[this.difficulty]) {
        this.bestTimes[this.difficulty] = this.timer;
        localStorage.setItem('sudoku-best', JSON.stringify(this.bestTimes));
      }
    },
  };
}
```

- [ ] **Step 2: Wire Alpine in `index.html` — verify init runs**

Replace the `<body>` tag in `index.html`:

```html
<body
  class="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200"
  x-data="sudokuGame()"
  x-init="init()"
  @keydown.window="handleKey($event)"
>
  <p class="text-center mt-10 dark:text-white" x-text="`Status: ${status} | Difficulty: ${difficulty} | Timer: ${formatTime(timer)}`"></p>
</body>
```

- [ ] **Step 3: Open `index.html` in browser, open DevTools console**

Expected: text shows `Status: playing | Difficulty: medium | Timer: 00:00`. Timer increments every second. No console errors.

Note: puzzle generation takes 1–3 seconds on first load — this is normal. It will be optimised in a later iteration if needed.

- [ ] **Step 4: Commit**

```bash
git add game.js index.html
git commit -m "feat: Alpine state object — newGame, enterNumber, undo, timer, dark mode"
```

---

## Task 5: Grid Rendering + Cell Visual States

**Files:**
- Modify: `index.html`
- Modify: `style.css`

- [ ] **Step 1: Add grid CSS to `style.css`**

```css
.sudoku-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  border: 2px solid #374151;
  border-radius: 6px;
  overflow: hidden;
}

.sudoku-cell {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(12px, 2vw, 20px);
  font-weight: 600;
  border: 1px solid #d1d5db;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.1s;
}

/* thick right border after cols 3 and 6 */
.sudoku-cell:nth-child(9n+3),
.sudoku-cell:nth-child(9n+6) {
  border-right: 2px solid #374151;
}

/* thick bottom border after rows 3 and 6 */
.sudoku-cell:nth-child(n+19):nth-child(-n+27),
.sudoku-cell:nth-child(n+46):nth-child(-n+54) {
  border-bottom: 2px solid #374151;
}

/* dark mode borders */
.dark .sudoku-grid {
  border-color: #64748b;
}
.dark .sudoku-cell {
  border-color: #334155;
}
.dark .sudoku-cell:nth-child(9n+3),
.dark .sudoku-cell:nth-child(9n+6) {
  border-right-color: #64748b;
}
.dark .sudoku-cell:nth-child(n+19):nth-child(-n+27),
.dark .sudoku-cell:nth-child(n+46):nth-child(-n+54) {
  border-bottom-color: #64748b;
}
```

- [ ] **Step 2: Replace `<body>` content in `index.html` with grid markup**

```html
<body
  class="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200 p-4"
  x-data="sudokuGame()"
  x-init="init()"
  @keydown.window="handleKey($event)"
>
  <!-- Header -->
  <header class="flex items-center justify-between max-w-3xl mx-auto mb-6">
    <h1 class="text-2xl font-black tracking-widest text-slate-800 dark:text-slate-100">SUDOKU</h1>
    <button
      @click="toggleDark()"
      class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
      :title="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <span x-show="!darkMode">☀️</span>
      <span x-show="darkMode">🌙</span>
    </button>
  </header>

  <!-- Main layout: grid + sidebar -->
  <main class="flex flex-col sm:flex-row gap-6 max-w-3xl mx-auto">

    <!-- Sudoku Grid -->
    <div class="sudoku-grid flex-1 max-w-md mx-auto sm:mx-0">
      <template x-for="(row, r) in board" :key="r">
        <template x-for="(val, c) in row" :key="c">
          <div
            class="sudoku-cell"
            :class="{
              'bg-white dark:bg-slate-800': !isWrong(r, c) && !(selected?.row === r && selected?.col === c) && !isSameNumber(r, c) && !isRelated(r, c),
              'bg-blue-100 dark:bg-blue-950': isRelated(r, c) && !(selected?.row === r && selected?.col === c),
              'bg-blue-200 dark:bg-blue-900': isSameNumber(r, c) && !(selected?.row === r && selected?.col === c),
              'bg-blue-400 dark:bg-blue-700': selected?.row === r && selected?.col === c,
              'bg-red-100 dark:bg-red-950': isWrong(r, c),
              'text-slate-800 dark:text-slate-100': locked[r] && locked[r][c],
              'text-blue-600 dark:text-blue-400': !locked[r]?.[c] && !isWrong(r, c) && val !== 0,
              'text-red-500 dark:text-red-400': isWrong(r, c),
            }"
            @click="selectCell(r, c)"
            x-text="val || ''"
          ></div>
        </template>
      </template>
    </div>

    <!-- Sidebar placeholder -->
    <div class="w-full sm:w-44 dark:text-white text-sm">Sidebar coming in Task 6</div>

  </main>
</body>
```

- [ ] **Step 3: Open in browser — verify grid renders**

Expected: 9×9 grid with thick borders every 3 cells. Clicking a cell highlights it blue. Cells in the same row/col/box get a light blue tint. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: grid rendering with cell visual states and box borders"
```

---

## Task 6: Sidebar

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the sidebar placeholder in `index.html`**

Replace `<div class="w-full sm:w-44 dark:text-white text-sm">Sidebar coming in Task 6</div>` with:

```html
<!-- Sidebar -->
<aside class="w-full sm:w-44 flex flex-col gap-4">

  <!-- Timer + Best -->
  <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-center">
    <div class="text-xs text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1">Timer</div>
    <div class="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100" x-text="formatTime(timer)"></div>
    <button
      @click="togglePause()"
      class="mt-1 text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
      x-text="paused ? '▶ Resume' : '⏸ Pause'"
    ></button>
    <div
      x-show="bestTime() !== null"
      class="mt-2 text-xs text-gray-400 dark:text-slate-400"
    >
      Best: <span class="font-semibold text-blue-600 dark:text-blue-400" x-text="bestTime()"></span>
    </div>
  </div>

  <!-- Difficulty pills -->
  <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
    <div class="text-xs text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Difficulty</div>
    <div class="grid grid-cols-2 gap-1">
      <template x-for="d in ['easy','medium','hard','expert']" :key="d">
        <button
          @click="setDifficulty(d)"
          :class="difficulty === d
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'"
          class="capitalize text-xs font-semibold py-1.5 rounded-lg transition-colors"
          x-text="d"
        ></button>
      </template>
    </div>
  </div>

  <!-- Error counter -->
  <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-center">
    <div class="text-xs text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1">Mistakes</div>
    <div
      class="text-xl font-bold"
      :class="errors > 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'"
      x-text="`${errors} / ${maxErrors}`"
    ></div>
  </div>

  <!-- Number pad -->
  <div class="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
    <div class="grid grid-cols-3 gap-1.5">
      <template x-for="n in [1,2,3,4,5,6,7,8,9]" :key="n">
        <button
          @click="enterNumber(n)"
          class="aspect-square flex items-center justify-center text-base font-bold rounded-lg bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-600 border border-blue-200 dark:border-slate-600 transition-colors"
          x-text="n"
        ></button>
      </template>
      <button
        @click="erase()"
        class="col-span-3 py-1.5 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
      >⌫ Erase</button>
    </div>
  </div>

  <!-- Actions -->
  <div class="flex flex-col gap-2">
    <button
      @click="undo()"
      class="w-full py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 transition-colors"
    >↩ Undo</button>
    <button
      @click="newGame()"
      class="w-full py-2 text-sm font-semibold rounded-xl bg-slate-800 dark:bg-blue-600 text-white hover:bg-slate-700 dark:hover:bg-blue-500 transition-colors shadow-sm"
    >＋ New Game</button>
  </div>

</aside>
```

- [ ] **Step 2: Open in browser — verify sidebar**

Expected: sidebar shows timer (counting), difficulty pills (medium active), mistakes counter, 1–9 numpad, Erase, Undo, New Game buttons. Clicking a difficulty pill restarts the game. Clicking a number fills the selected cell.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: sidebar — timer, difficulty, errors, numpad, undo, new game"
```

---

## Task 7: Win / Game Over Overlays

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add overlays inside `<body>`, after `</main>`**

```html
<!-- Win overlay -->
<div
  x-show="status === 'won'"
  x-transition
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
>
  <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
    <div class="text-5xl mb-3">🎉</div>
    <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">Puzzle Solved!</h2>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-2">
      <span class="capitalize" x-text="difficulty"></span> completed in
      <span class="font-semibold text-blue-600 dark:text-blue-400" x-text="formatTime(timer)"></span>
    </p>
    <p
      x-show="bestTimes[difficulty] === timer"
      class="text-xs text-green-600 dark:text-green-400 font-semibold mb-4"
    >🏆 New personal best!</p>
    <button
      @click="newGame()"
      class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
    >Play Again</button>
  </div>
</div>

<!-- Game over overlay -->
<div
  x-show="status === 'gameover'"
  x-transition
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
>
  <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
    <div class="text-5xl mb-3">💀</div>
    <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">Game Over</h2>
    <p class="text-gray-500 dark:text-slate-400 text-sm mb-6">3 mistakes — the solution has been revealed.</p>
    <button
      @click="newGame()"
      class="w-full py-3 bg-slate-800 dark:bg-blue-600 hover:bg-slate-700 dark:hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
    >Try Again</button>
  </div>
</div>
```

- [ ] **Step 2: Test win overlay**

In browser DevTools console run:
```js
document.querySelector('[x-data]')._x_dataStack[0].status = 'won'
```

Expected: win overlay appears with fade-in. Clicking "Play Again" dismisses it and starts a new game.

- [ ] **Step 3: Test game over overlay**

```js
document.querySelector('[x-data]')._x_dataStack[0].status = 'gameover'
```

Expected: game over overlay appears. Board cells show the solution.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: win and game over overlays with transitions"
```

---

## Task 8: Keyboard Navigation

**Files:**
- Modify: `index.html` (already wired via `@keydown.window="handleKey($event)"` from Task 5)

- [ ] **Step 1: Verify keyboard works — open browser, click a cell, press keys**

Test checklist:
- [ ] Arrow keys move selection around the grid
- [ ] Pressing 1–9 fills selected cell
- [ ] Backspace/Delete erases selected cell
- [ ] Ctrl+Z undoes last move
- [ ] Escape deselects

If any of these fail, the `handleKey` function in `game.js` (Task 4) has a bug. Check console for errors.

- [ ] **Step 2: Ensure arrow keys don't scroll the page**

The `e.preventDefault()` calls in `handleKey` for arrow keys prevent page scrolling. Verify: holding an arrow key should move cell selection, not scroll the page.

- [ ] **Step 3: Commit**

```bash
git commit -m "test: verify keyboard navigation works end-to-end"
```

---

## Task 9: PWA — Manifest + Meta Tags

**Files:**
- Create: `manifest.json`
- Modify: `index.html`

- [ ] **Step 1: Create `manifest.json`**

```json
{
  "name": "Sudoku",
  "short_name": "Sudoku",
  "description": "Classic Sudoku puzzle game with 4 difficulty levels",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Add PWA meta tags to `<head>` in `index.html`**

Add after `<title>Sudoku</title>`:

```html
<!-- PWA -->
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#3b82f6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Sudoku">
<link rel="apple-touch-icon" href="icons/icon-192.png">
```

- [ ] **Step 3: Commit**

```bash
git add manifest.json index.html
git commit -m "feat: PWA manifest and meta tags"
```

---

## Task 10: PWA Icons

**Files:**
- Create: `generate_icons.py`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`

- [ ] **Step 1: Create `icons/` directory**

```bash
mkdir icons
```

- [ ] **Step 2: Create `generate_icons.py`**

```python
import os, struct, zlib

def write_png(path, size):
    """Write a minimal valid PNG: blue background with white 'S' letterform."""
    w = h = size
    scale = size // 192  # 1 for 192, ~2.67 for 512 — we'll use integer scale
    scale = max(1, size // 192)

    # Build pixel grid
    pixels = []
    for r in range(h):
        row = []
        for c in range(w):
            # Background: blue-600 (#2563eb)
            px = (37, 99, 235)

            # White rounded square inset
            margin = size // 8
            if margin <= r < h - margin and margin <= c < w - margin:
                px = (255, 255, 255)

            # Inner blue square (grid lines suggestion)
            inner = size // 4
            cell = (size - inner * 2) // 9
            if inner <= r < h - inner and inner <= c < w - inner:
                ir = r - inner
                ic = c - inner
                grid_w = size - inner * 2
                # draw grid lines every 'cell' pixels
                if ir % cell < max(1, size // 96) or ic % cell < max(1, size // 96):
                    px = (37, 99, 235)
                else:
                    px = (219, 234, 254)  # blue-100

            row.append(px)
        pixels.append(row)

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    raw = b''.join(
        b'\x00' + b''.join(struct.pack('BBB', *p) for p in row)
        for row in pixels
    )
    idat_data = zlib.compress(raw, 9)

    png = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr_data)
        + chunk(b'IDAT', idat_data)
        + chunk(b'IEND', b'')
    )
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)
    print(f'Written {path} ({len(png)} bytes)')

write_png('icons/icon-192.png', 192)
write_png('icons/icon-512.png', 512)
print('Icons generated.')
```

- [ ] **Step 3: Run the script**

```bash
python generate_icons.py
```

Expected:
```
Written icons/icon-192.png (...)
Written icons/icon-512.png (...)
Icons generated.
```

- [ ] **Step 4: Verify icons visually**

Open `icons/icon-192.png` in any image viewer. Expected: blue background with a white inset showing a small Sudoku-grid pattern.

- [ ] **Step 5: Commit**

```bash
git add generate_icons.py icons/icon-192.png icons/icon-512.png
git commit -m "feat: PWA icons — generated via Python stdlib"
```

---

## Task 11: Service Worker

**Files:**
- Create: `sw.js`
- Modify: `index.html`

- [ ] **Step 1: Create `sw.js`**

```js
const CACHE = 'sudoku-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/game.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

- [ ] **Step 2: Register service worker — add before `</body>` in `index.html`**

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
</script>
```

- [ ] **Step 3: Verify service worker registers — requires a server (not `file://`)**

Run a local server:
```bash
python -m http.server 8080
```

Open `http://localhost:8080`. Open DevTools → Application → Service Workers. Expected: `sw.js` shows as "Activated and running". Check Cache Storage → sudoku-v1 shows all listed assets.

- [ ] **Step 4: Commit**

```bash
git add sw.js index.html
git commit -m "feat: service worker — cache-first strategy for offline play"
```

---

## Task 12: Responsive Layout (Mobile)

**Files:**
- Modify: `style.css`
- Modify: `index.html`

- [ ] **Step 1: Verify existing responsive behaviour**

Resize browser to < 640px width (or use DevTools device emulation). Expected: sidebar stacks below the grid (Tailwind `flex-col sm:flex-row` from Task 5 handles this automatically). Number pad should be large enough to tap.

- [ ] **Step 2: Increase numpad button size on mobile in `style.css`**

```css
@media (max-width: 639px) {
  .sudoku-cell {
    font-size: clamp(14px, 4vw, 22px);
  }
}
```

- [ ] **Step 3: Add `touch-action: manipulation` to prevent double-tap zoom on numpad**

Add to `style.css`:
```css
button {
  touch-action: manipulation;
}
```

- [ ] **Step 4: Test on mobile or DevTools device emulation**

Checklist:
- [ ] Grid fills the width on small screens
- [ ] Sidebar sits below the grid, full width
- [ ] Number pad buttons are easy to tap (min 44px touch target)
- [ ] No horizontal scroll

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "feat: responsive layout — mobile numpad and touch improvements"
```

---

## Task 13: Netlify Deployment

**Files:**
- Create: `.gitignore` (update)
- Create: `netlify.toml`

- [ ] **Step 1: Update `.gitignore`**

```bash
echo ".superpowers/" >> .gitignore
```

- [ ] **Step 2: Create `netlify.toml`**

```toml
[build]
  publish = "."

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-cache"
```

The `no-cache` headers for `sw.js` and `index.html` ensure Netlify always serves the freshest service worker and HTML — without this, a stale cached service worker can block updates.

- [ ] **Step 3: Push to GitHub and connect to Netlify**

```bash
git add .gitignore netlify.toml
git commit -m "feat: Netlify config — no-cache headers for SW and HTML"
git push origin master
```

Then: Netlify dashboard → "Add new site" → "Import an existing project" → select the repo → deploy. No build command needed.

- [ ] **Step 4: Verify deployed site**

Open the Netlify URL. Checklist:
- [ ] Game loads and generates a puzzle
- [ ] HTTPS served (green lock) — required for service worker
- [ ] DevTools → Application → Service Workers: `sw.js` "Activated and running"
- [ ] DevTools → Application → Manifest: no errors, icons load
- [ ] On Android Chrome: "Add to Home Screen" prompt appears or available via browser menu

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Covered in task |
|---|---|
| Tailwind CDN + Alpine.js + vanilla JS | Task 1 |
| `isValid`, `solvePuzzle`, `countSolutions` | Task 2 |
| `generateSolution`, `shuffleBoard`, `removeClues` | Task 3 |
| 4 difficulty levels with empty-cell targets | Task 3 |
| Uniqueness guarantee | Task 3 (`countSolutions` in `removeClues`) |
| Alpine game state shape | Task 4 |
| Grid + sidebar layout | Task 5 + 6 |
| Cell visual states (selected, related, same-number, wrong, locked) | Task 5 |
| 3×3 box CSS borders | Task 5 |
| Mistake highlighting (red cell, error counter) | Task 4 + 5 |
| Undo | Task 4 + 6 |
| Timer (count-up, pause) | Task 4 + 6 |
| Difficulty selector | Task 6 |
| Dark mode toggle + localStorage | Task 4 + 5 |
| Keyboard navigation | Task 4 + 8 |
| Number pad (click) | Task 6 |
| Win overlay | Task 7 |
| Game over overlay + reveal solution | Task 4 + 7 |
| Personal best (localStorage, sidebar display) | Task 4 + 6 |
| PWA manifest | Task 9 |
| PWA icons | Task 10 |
| Service worker (offline) | Task 11 |
| Responsive mobile layout | Task 12 |
| Netlify deployment | Task 13 |
| `tailwind.config = { darkMode: 'class' }` inline config | Task 1 |
| `no-cache` header for `sw.js` | Task 13 |

All spec requirements are covered.

### Type / name consistency

- `sudokuGame()` defined in Task 4, referenced in Task 5 `x-data="sudokuGame()"` — consistent
- `handleKey`, `toggleDark`, `selectCell`, `enterNumber`, `erase`, `undo`, `newGame`, `setDifficulty`, `togglePause`, `formatTime`, `bestTime`, `isRelated`, `isSameNumber`, `isWrong`, `_checkWin` — all defined in Task 4 and used in Tasks 5–8 — consistent
- `DIFFICULTY_TARGETS` object keys `'easy'|'medium'|'hard'|'expert'` match `difficulty` state values — consistent
- `countSolutions` called with `(board, 2)` in Task 3 `removeClues` and exported in Task 2 — consistent
