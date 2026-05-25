(function attachSolver(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuSolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSolverModule() {
  function isValid(board, row, col, num) {
    for (let c = 0; c < 9; c++) if (board[row][c] === num) return false;
    for (let r = 0; r < 9; r++) if (board[r][col] === num) return false;

    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (board[r][c] === num) return false;
      }
    }

    return true;
  }

  function hasValidGivens(board) {
    if (!Array.isArray(board) || board.length !== 9) return false;

    const rows = Array.from({ length: 9 }, () => new Set());
    const cols = Array.from({ length: 9 }, () => new Set());
    const boxes = Array.from({ length: 9 }, () => new Set());

    for (let row = 0; row < 9; row++) {
      if (!Array.isArray(board[row]) || board[row].length !== 9) return false;

      for (let col = 0; col < 9; col++) {
        const value = board[row][col];
        if (value === 0) continue;
        if (!Number.isInteger(value) || value < 1 || value > 9) return false;

        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        if (rows[row].has(value) || cols[col].has(value) || boxes[box].has(value)) {
          return false;
        }

        rows[row].add(value);
        cols[col].add(value);
        boxes[box].add(value);
      }
    }

    return true;
  }

  function _solvePuzzleUnchecked(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (_solvePuzzleUnchecked(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function solvePuzzle(board) {
    if (!hasValidGivens(board)) return false;
    return _solvePuzzleUnchecked(board);
  }

  function isSolvableLayout(board) {
    if (!hasValidGivens(board)) return false;

    const working = board.map(row => [...row]);
    if (!solvePuzzle(working)) return false;

    return working.every(row => row.every(value => value !== 0)) && hasValidGivens(working);
  }

  function createBacktrackingTrace(board) {
    if (!hasValidGivens(board)) {
      return { solved: false, steps: [], solvedBoard: null };
    }

    const working = board.map(row => [...row]);
    const steps = [];

    function solve() {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (working[row][col] === 0) {
            for (let value = 1; value <= 9; value++) {
              if (isValid(working, row, col, value)) {
                working[row][col] = value;
                steps.push({ type: 'place', row, col, value });

                if (solve()) return true;

                working[row][col] = 0;
                steps.push({ type: 'backtrack', row, col, value: 0 });
              }
            }
            return false;
          }
        }
      }
      return true;
    }

    const solved = solve();
    return {
      solved,
      steps,
      solvedBoard: solved ? working.map(row => [...row]) : null,
    };
  }

  function createMrvTrace(board) {
    if (!hasValidGivens(board)) {
      return { solved: false, steps: [], solvedBoard: null };
    }

    const working = board.map(row => [...row]);
    const steps = [];

    function candidatesFor(row, col) {
      const list = [];
      for (let value = 1; value <= 9; value++) {
        if (isValid(working, row, col, value)) list.push(value);
      }
      return list;
    }

    // Minimum Remaining Values: choose the empty cell with the fewest legal
    // candidates. Returns null when the board is full (solved).
    function pickCell() {
      let best = null;
      let bestCount = 10;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (working[row][col] !== 0) continue;
          const count = candidatesFor(row, col).length;
          if (count < bestCount) {
            bestCount = count;
            best = { row, col };
            if (bestCount === 0) return best; // immediate dead end, stop early
          }
        }
      }
      return best;
    }

    function solve() {
      const cell = pickCell();
      if (!cell) return true; // no empty cells remain

      const { row, col } = cell;
      const candidates = candidatesFor(row, col);
      if (candidates.length === 0) return false; // fail-first dead end

      for (const value of candidates) {
        working[row][col] = value;
        steps.push({ type: 'place', row, col, value });

        if (solve()) return true;

        working[row][col] = 0;
        steps.push({ type: 'backtrack', row, col, value: 0 });
      }
      return false;
    }

    const solved = solve();
    return {
      solved,
      steps,
      solvedBoard: solved ? working.map(row => [...row]) : null,
    };
  }

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

  function countSolutions(board, limit = 2) {
    if (!hasValidGivens(board)) return 0;

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

    solve(board.map(row => [...row]));
    return count;
  }

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
});
