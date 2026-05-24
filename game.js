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

if (typeof module !== 'undefined') module.exports = { isValid, solvePuzzle, countSolutions, generateSolution, shuffleBoard, removeClues };
