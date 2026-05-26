(function attachSolver(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuSolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSolverModule() {
  const ALL_CANDIDATES = 0b111111111;
  const BIT = d => 1 << (d - 1);
  const ROW = i => Math.floor(i / 9);
  const COL = i => i % 9;
  const BOX = i => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const at = i => ({ row: ROW(i), col: COL(i) });
  const popcount = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  const lowestDigit = m => { for (let d = 1; d <= 9; d++) if (m & BIT(d)) return d; return 0; };
  const digitsOf = m => { const out = []; for (let d = 1; d <= 9; d++) if (m & BIT(d)) out.push(d); return out; };

  const UNIT_GROUPS = [];
  const UNIT_META = [];
  for (let r = 0; r < 9; r++) {
    UNIT_GROUPS.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
    UNIT_META.push({ type: 'row', index: r });
  }
  for (let c = 0; c < 9; c++) {
    UNIT_GROUPS.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
    UNIT_META.push({ type: 'column', index: c });
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const unit = [];
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) unit.push((br * 3 + dr) * 9 + bc * 3 + dc);
      UNIT_GROUPS.push(unit);
      UNIT_META.push({ type: 'box', index: br * 3 + bc });
    }
  }

  const CELL_UNITS = Array.from({ length: 81 }, (_, i) => {
    const r = ROW(i), c = COL(i), b = BOX(i);
    return [UNIT_GROUPS[r], UNIT_GROUPS[9 + c], UNIT_GROUPS[18 + b]];
  });
  const CELL_PEERS = Array.from({ length: 81 }, (_, i) => {
    const peers = new Set();
    CELL_UNITS[i].forEach(unit => unit.forEach(j => { if (j !== i) peers.add(j); }));
    return [...peers];
  });

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

    const steps = [];
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
        // Locks the cell to value; any other candidates it held are dropped silently
        // (not recorded in eliminated[]) since a wave records only peer eliminations.
        cands[cell] = BIT(value);

        const eliminated = [];
        let dead = false;

        for (const peer of CELL_PEERS[cell]) {
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
            for (const unit of CELL_UNITS[peer]) {
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

    const cands = new Array(81).fill(ALL_CANDIDATES);
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

  function createHumanLogicTrace(board) {
    return createHumanLogicTraceWithStrategies(board, { v2: false });
  }

  function createHumanLogicV2Trace(board) {
    return createHumanLogicTraceWithStrategies(board, { v2: true });
  }

  function createHumanLogicTraceWithStrategies(board, options) {
    if (!hasValidGivens(board)) {
      return { solved: false, steps: [], solvedBoard: null };
    }

    const keyOf = m => digitsOf(m).join('');

    const cands = new Array(81).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const value = board[r][c];
        if (value) {
          cands[r * 9 + c] = BIT(value);
        } else {
          let mask = 0;
          for (let d = 1; d <= 9; d++) if (isValid(board, r, c, d)) mask |= BIT(d);
          if (mask === 0) return { solved: false, steps: [], solvedBoard: null };
          cands[r * 9 + c] = mask;
        }
      }
    }

    const steps = [];
    const toSnapshot = () =>
      Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => digitsOf(cands[r * 9 + c])));
    const solvedCells = cands.map((_, i) => board[ROW(i)][COL(i)] !== 0);

    function removeFromPeers(cell, value) {
      const eliminated = [];
      for (const peer of CELL_PEERS[cell]) {
        if (popcount(cands[peer]) > 1 && (cands[peer] & BIT(value))) {
          cands[peer] &= ~BIT(value);
          eliminated.push({ ...at(peer), value });
        }
      }
      return eliminated;
    }

    function place(cell, value, strategy, reason) {
      cands[cell] = BIT(value);
      solvedCells[cell] = true;
      const eliminated = removeFromPeers(cell, value);
      steps.push({ type: 'human-place', strategy, reason, ...at(cell), value, eliminated, snapshot: toSnapshot() });
      return true;
    }

    function applyNakedSingle() {
      for (let i = 0; i < 81; i++) {
        if (!solvedCells[i] && popcount(cands[i]) === 1) {
          return place(i, lowestDigit(cands[i]), 'Naked Single', 'This cell has only one candidate.');
        }
      }
      return false;
    }

    function applyHiddenSingle() {
      for (let unitIndex = 0; unitIndex < UNIT_GROUPS.length; unitIndex++) {
        const unit = UNIT_GROUPS[unitIndex];
        for (let d = 1; d <= 9; d++) {
          const places = unit.filter(i => cands[i] & BIT(d));
          if (places.length === 1 && !solvedCells[places[0]] && popcount(cands[places[0]]) > 1) {
            const meta = UNIT_META[unitIndex];
            return place(places[0], d, 'Hidden Single', `This digit has only one possible cell in this ${meta.type}.`);
          }
        }
      }
      return false;
    }

    function applyHiddenPair() {
      for (let unitIndex = 0; unitIndex < UNIT_GROUPS.length; unitIndex++) {
        const unit = UNIT_GROUPS[unitIndex];
        const positions = new Map();
        for (let d = 1; d <= 9; d++) {
          const places = unit.filter(i => (cands[i] & BIT(d)) && popcount(cands[i]) > 1);
          if (places.length === 2) {
            const key = places.join(',');
            if (!positions.has(key)) positions.set(key, []);
            positions.get(key).push(d);
          }
        }
        for (const [key, digits] of positions) {
          if (digits.length < 2) continue;
          const cells = key.split(',').map(Number);
          const pairDigits = digits.slice(0, 2);
          const pairMask = pairDigits.reduce((mask, d) => mask | BIT(d), 0);
          const eliminated = [];
          for (const cell of cells) {
            for (const value of digitsOf(cands[cell] & ~pairMask)) {
              cands[cell] &= ~BIT(value);
              eliminated.push({ ...at(cell), value });
            }
          }
          if (eliminated.length) {
            const meta = UNIT_META[unitIndex];
            steps.push({
              type: 'human-eliminate',
              strategy: 'Hidden Pair',
              value: pairDigits,
              unit: meta,
              reason: `${pairDigits.join(' and ')} can only appear in the same two cells in this ${meta.type}.`,
              cells: cells.map(at),
              eliminated,
              snapshot: toSnapshot(),
            });
            return true;
          }
        }
      }
      return false;
    }

    function applyPointingPairTriple() {
      for (let box = 0; box < 9; box++) {
        const unit = UNIT_GROUPS[18 + box];
        for (let value = 1; value <= 9; value++) {
          const places = unit.filter(i => (cands[i] & BIT(value)) && popcount(cands[i]) > 1);
          if (places.length < 2) continue;

          const sameRow = places.every(i => ROW(i) === ROW(places[0]));
          const sameCol = places.every(i => COL(i) === COL(places[0]));
          if (!sameRow && !sameCol) continue;

          const line = sameRow ? { type: 'row', index: ROW(places[0]) } : { type: 'column', index: COL(places[0]) };
          const lineCells = sameRow ? UNIT_GROUPS[line.index] : UNIT_GROUPS[9 + line.index];
          const eliminated = [];
          for (const cell of lineCells) {
            if (BOX(cell) === box || popcount(cands[cell]) <= 1 || !(cands[cell] & BIT(value))) continue;
            cands[cell] &= ~BIT(value);
            eliminated.push({ ...at(cell), value });
          }
          if (eliminated.length) {
            steps.push({
              type: 'human-eliminate',
              strategy: 'Pointing Pair/Triple',
              value,
              unit: { type: 'box', index: box },
              line,
              reason: `All ${value} candidates in this box are locked into one ${line.type}.`,
              cells: places.map(at),
              eliminated,
              snapshot: toSnapshot(),
            });
            return true;
          }
        }
      }
      return false;
    }

    function applyBoxLineReduction() {
      for (let unitIndex = 0; unitIndex < 18; unitIndex++) {
        const unit = UNIT_GROUPS[unitIndex];
        const line = unitIndex < 9 ? { type: 'row', index: unitIndex } : { type: 'column', index: unitIndex - 9 };
        for (let value = 1; value <= 9; value++) {
          const places = unit.filter(i => (cands[i] & BIT(value)) && popcount(cands[i]) > 1);
          if (places.length < 2) continue;
          const box = BOX(places[0]);
          if (!places.every(i => BOX(i) === box)) continue;

          const boxCells = UNIT_GROUPS[18 + box];
          const eliminated = [];
          for (const cell of boxCells) {
            const inLine = line.type === 'row' ? ROW(cell) === line.index : COL(cell) === line.index;
            if (inLine || popcount(cands[cell]) <= 1 || !(cands[cell] & BIT(value))) continue;
            cands[cell] &= ~BIT(value);
            eliminated.push({ ...at(cell), value });
          }
          if (eliminated.length) {
            steps.push({
              type: 'human-eliminate',
              strategy: 'Box-Line Reduction',
              value,
              unit: { type: 'box', index: box },
              line,
              reason: `All ${value} candidates in this ${line.type} are inside one box.`,
              cells: places.map(at),
              eliminated,
              snapshot: toSnapshot(),
            });
            return true;
          }
        }
      }
      return false;
    }

    function applyNakedPair() {
      for (const unit of UNIT_GROUPS) {
        const pairs = new Map();
        for (const i of unit) {
          if (popcount(cands[i]) === 2) {
            const key = keyOf(cands[i]);
            if (!pairs.has(key)) pairs.set(key, []);
            pairs.get(key).push(i);
          }
        }
        for (const [key, cells] of pairs) {
          if (cells.length !== 2) continue;
          const mask = cands[cells[0]];
          const eliminated = [];
          for (const i of unit) {
            if (cells.includes(i) || popcount(cands[i]) <= 1) continue;
            for (const value of digitsOf(mask)) {
              if (cands[i] & BIT(value)) {
                cands[i] &= ~BIT(value);
                eliminated.push({ ...at(i), value });
              }
            }
          }
          if (eliminated.length) {
            steps.push({
              type: 'human-eliminate',
              strategy: 'Naked Pair',
              reason: `The pair {${key.split('').join(', ')}} is locked into two cells in this unit.`,
              cells: cells.map(at),
              eliminated,
              snapshot: toSnapshot(),
            });
            return true;
          }
        }
      }
      return false;
    }

    let progress = true;
    while (progress) {
      progress = applyNakedSingle() ||
        applyHiddenSingle() ||
        applyNakedPair() ||
        (options.v2 && (applyHiddenPair() || applyPointingPairTriple() || applyBoxLineReduction()));
      if (cands.some(mask => mask === 0)) return { solved: false, steps, solvedBoard: null };
    }

    const solved = cands.every(mask => popcount(mask) === 1);
    const solvedBoard = solved
      ? Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => lowestDigit(cands[r * 9 + c])))
      : null;
    return { solved, steps, solvedBoard };
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
    createHumanLogicTrace,
    createHumanLogicV2Trace,
    countSolutions,
  };
});
