(function attachGenerator(root, factory) {
  const solver = typeof require === 'function' ? require('./solver.js') : root.SudokuSolver;
  const api = factory(solver);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SudokuGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGeneratorModule(solver) {
  const { isValid, countSolutions, isSolvableLayout } = solver;

  const DIFFICULTY_TARGETS = { easy: 36, medium: 46, hard: 52 };
  const SAME_LAYOUT_ATTEMPTS = 8;
  const FULL_LAYOUT_ATTEMPTS = 20;

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

      const row = Math.floor(pos / 9);
      const col = pos % 9;
      const candidates = _shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

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
    let b = solution.map(row => [...row]);

    for (let band = 0; band < 3; band++) {
      const base = band * 3;
      const order = _shuffle([0, 1, 2]);
      const orig = [b[base], b[base + 1], b[base + 2]];
      order.forEach((from, to) => {
        b[base + to] = [...orig[from]];
      });
    }

    const tmp = b.map(row => [...row]);
    for (let stack = 0; stack < 3; stack++) {
      const base = stack * 3;
      const order = _shuffle([0, 1, 2]);
      for (let r = 0; r < 9; r++) {
        order.forEach((from, to) => {
          b[r][base + to] = tmp[r][base + from];
        });
      }
    }

    if (Math.random() < 0.5) {
      b = b.map((row, r) => row.map((_, c) => b[c][r]));
    }

    return b;
  }

  function removeClues(solution, difficulty) {
    const target = DIFFICULTY_TARGETS[difficulty];
    const board = solution.map(row => [...row]);
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

  function generateTestPuzzle(difficulty) {
    for (let layoutAttempt = 0; layoutAttempt < FULL_LAYOUT_ATTEMPTS; layoutAttempt++) {
      const solution = shuffleBoard(generateSolution());

      for (let numberAttempt = 0; numberAttempt < SAME_LAYOUT_ATTEMPTS; numberAttempt++) {
        const puzzle = removeClues(solution, difficulty);
        if (isSolvableLayout(puzzle.board) && countSolutions(puzzle.board, 2) === 1) {
          return puzzle;
        }
      }
    }

    throw new Error(`Could not generate a solvable ${difficulty} puzzle.`);
  }

  return {
    DIFFICULTY_TARGETS,
    generateSolution,
    shuffleBoard,
    removeClues,
    generateTestPuzzle,
  };
});
