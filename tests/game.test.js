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

const { generateSolution, shuffleBoard, removeClues } = require('../game.js');

// generateSolution
const sol = generateSolution();
assert.strictEqual(sol.length, 9, 'solution has 9 rows');
assert.strictEqual(sol[0].length, 9, 'each row has 9 cols');
// verify every row/col contains 1-9
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
