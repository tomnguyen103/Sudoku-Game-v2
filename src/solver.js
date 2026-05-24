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
    countSolutions,
  };
});
