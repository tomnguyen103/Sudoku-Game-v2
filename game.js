// Pure game logic — no DOM, no Alpine dependency

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

if (typeof module !== 'undefined') module.exports = { isValid, solvePuzzle, countSolutions, generateSolution, shuffleBoard, removeClues };
