const assert = require('assert');
const {
  isValid,
  solvePuzzle,
  hasValidGivens,
  isSolvableLayout,
  countSolutions,
  createBacktrackingTrace,
  createMrvTrace,
  createConstraintPropagationTrace,
  generateTestPuzzle,
  PLAYBACK_SPEEDS,
  sudokuGame,
} = require('../game.js');

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

// layout validation tests
const conflictedCompleteBoard = [
  [1,1,3,4,5,6,7,8,9],
  [4,5,6,7,8,9,1,2,3],
  [7,8,9,1,2,3,4,5,6],
  [2,3,4,5,6,7,8,9,1],
  [5,6,7,8,9,1,2,3,4],
  [8,9,1,2,3,4,5,6,7],
  [3,4,5,6,7,8,9,1,2],
  [6,7,8,9,1,2,3,4,5],
  [9,1,2,3,4,5,6,7,8]
];
assert.strictEqual(hasValidGivens(conflictedCompleteBoard), false, 'duplicate givens are invalid');
assert.strictEqual(isSolvableLayout(conflictedCompleteBoard), false, 'conflicted complete board is not solvable');
assert.strictEqual(solvePuzzle(conflictedCompleteBoard.map(row => [...row])), false, 'solver rejects conflicted complete boards');
assert.deepStrictEqual(
  createBacktrackingTrace(conflictedCompleteBoard),
  { solved: false, steps: [], solvedBoard: null },
  'trace rejects conflicted layouts before playback'
);
assert.strictEqual(isSolvableLayout(unsolved), true, 'known puzzle is solvable');

// countSolutions tests
const uniqueBoard = unsolved.map(r => [...r]);
assert.strictEqual(countSolutions(uniqueBoard, 2), 1, 'known puzzle has exactly 1 solution');

const emptyTest = emptyBoard.map(r => [...r]);
assert.strictEqual(countSolutions(emptyTest, 2), 2, 'empty board has more than 1 solution (capped at 2)');

console.log('All solver tests passed.');

// backtracking trace tests
const tracePuzzle = [
  [1,2,3,4,5,6,7,8,0],
  [4,5,6,7,8,9,1,2,3],
  [7,8,9,1,2,3,4,5,6],
  [2,3,4,5,6,7,8,9,1],
  [5,6,7,8,9,1,2,3,4],
  [8,9,1,2,3,4,5,6,7],
  [3,4,5,6,7,8,9,1,2],
  [6,7,8,9,1,2,3,4,5],
  [9,1,2,3,4,5,6,7,8]
];
const traceResult = createBacktrackingTrace(tracePuzzle);
assert.strictEqual(traceResult.solved, true, 'trace puzzle is solved');
assert.deepStrictEqual(traceResult.solvedBoard[0], [1,2,3,4,5,6,7,8,9], 'trace solved board fills missing value');
assert.deepStrictEqual(
  traceResult.steps.map(({ type, row, col, value }) => ({ type, row, col, value })),
  [{ type: 'place', row: 0, col: 8, value: 9 }],
  'trace records the generated placement'
);
assert.strictEqual(tracePuzzle[0][8], 0, 'trace does not mutate the input board');

const backtrackResult = createBacktrackingTrace(unsolved);
assert.strictEqual(backtrackResult.solved, true, 'trace still solves after a dead-end candidate');
assert.ok(backtrackResult.steps.some(step => step.type === 'backtrack'), 'trace records backtracking removals');
assert.deepStrictEqual(backtrackResult.solvedBoard[0], [5,3,4,6,7,8,9,1,2], 'trace recovers final solution after backtracking');

console.log('All backtracking trace tests passed.');

// MRV trace tests
function countCandidates(b, row, col) {
  let n = 0;
  for (let v = 1; v <= 9; v++) if (isValid(b, row, col, v)) n++;
  return n;
}

// rejects conflicted layouts before playback, same contract as backtracking
assert.deepStrictEqual(
  createMrvTrace(conflictedCompleteBoard),
  { solved: false, steps: [], solvedBoard: null },
  'MRV trace rejects conflicted layouts before playback'
);

// solves the single-empty-cell puzzle and records that forced placement
const mrvTraceResult = createMrvTrace(tracePuzzle);
assert.strictEqual(mrvTraceResult.solved, true, 'MRV trace puzzle is solved');
assert.deepStrictEqual(mrvTraceResult.solvedBoard[0], [1,2,3,4,5,6,7,8,9], 'MRV trace solved board fills missing value');
assert.deepStrictEqual(
  mrvTraceResult.steps.map(({ type, row, col, value }) => ({ type, row, col, value })),
  [{ type: 'place', row: 0, col: 8, value: 9 }],
  'MRV trace records the single forced placement'
);
assert.strictEqual(tracePuzzle[0][8], 0, 'MRV trace does not mutate the input board');

// solves the classic hard puzzle to the known unique solution
const mrvHard = createMrvTrace(unsolved);
assert.strictEqual(mrvHard.solved, true, 'MRV solves the classic puzzle');
assert.deepStrictEqual(mrvHard.solvedBoard[0], [5,3,4,6,7,8,9,1,2], 'MRV recovers the unique solution');
assert.strictEqual(unsolved[0][2], 0, 'MRV does not mutate the input board on a hard puzzle');

// the distinguishing property: MRV's first placement targets a most-constrained cell
const firstPlace = mrvHard.steps.find(step => step.type === 'place');
assert.ok(firstPlace, 'MRV produces at least one placement');
const firstPlaceCandidates = countCandidates(unsolved, firstPlace.row, firstPlace.col);
let minCandidates = 10;
for (let r = 0; r < 9; r++) {
  for (let c = 0; c < 9; c++) {
    if (unsolved[r][c] === 0) minCandidates = Math.min(minCandidates, countCandidates(unsolved, r, c));
  }
}
assert.strictEqual(
  firstPlaceCandidates,
  minCandidates,
  'MRV first placement targets a cell with the fewest candidates'
);

console.log('All MRV trace tests passed.');

// constraint propagation trace tests
function decodeSnapshotToBoard(snapshot) {
  return snapshot.map(row => row.map(cell => (cell.length === 1 ? cell[0] : 0)));
}

// rejects conflicted layouts before playback, same contract as the others
assert.deepStrictEqual(
  createConstraintPropagationTrace(conflictedCompleteBoard),
  { solved: false, steps: [], solvedBoard: null },
  'CP trace rejects conflicted layouts before playback'
);

// single forced cell: solved, no guessing, records a propagate placing 9 at (0,8)
const cpForced = createConstraintPropagationTrace(tracePuzzle);
const tracePuzzleRef = tracePuzzle.map(r => [...r]);
solvePuzzle(tracePuzzleRef);
assert.strictEqual(cpForced.solved, true, 'CP solves the single-empty-cell puzzle');
assert.deepStrictEqual(cpForced.solvedBoard, tracePuzzleRef, 'CP solved board matches reference solver');
assert.ok(
  cpForced.steps.some(s => s.type === 'propagate' && s.row === 0 && s.col === 8 && s.value === 9),
  'CP records a propagate step assigning 9 at row 0, col 8'
);
assert.ok(!cpForced.steps.some(s => s.type === 'guess'), 'CP solves the forced puzzle with zero guesses');
assert.strictEqual(tracePuzzle[0][8], 0, 'CP does not mutate the input board');

// propagate steps carry an eliminated[] array and a 9x9 snapshot of candidate digits
const aPropagate = cpForced.steps.find(s => s.type === 'propagate');
assert.ok(Array.isArray(aPropagate.eliminated), 'propagate step has an eliminated array');
assert.strictEqual(aPropagate.snapshot.length, 9, 'snapshot has 9 rows');
assert.strictEqual(aPropagate.snapshot[0].length, 9, 'snapshot has 9 columns');
assert.ok(Array.isArray(aPropagate.snapshot[0][0]), 'snapshot cell is an array of candidate digits');

// final snapshot is fully solved and equals solvedBoard
const cpLast = cpForced.steps[cpForced.steps.length - 1];
assert.deepStrictEqual(
  decodeSnapshotToBoard(cpLast.snapshot),
  cpForced.solvedBoard,
  'final step snapshot equals the solved board'
);

// classic puzzle: solves to the same unique solution as the reference solver
const cpHard = createConstraintPropagationTrace(unsolved);
const unsolvedRef = unsolved.map(r => [...r]);
solvePuzzle(unsolvedRef);
assert.strictEqual(cpHard.solved, true, 'CP solves the classic puzzle');
assert.deepStrictEqual(cpHard.solvedBoard, unsolvedRef, 'CP matches the reference unique solution');
assert.strictEqual(unsolved[0][2], 0, 'CP does not mutate the input board on a hard puzzle');

// a puzzle that requires search engages guessing and hits dead-end branches
const aiEscargot = [
  [1,0,0,0,0,7,0,9,0],
  [0,3,0,0,2,0,0,0,8],
  [0,0,9,6,0,0,5,0,0],
  [0,0,5,3,0,0,9,0,0],
  [0,1,0,0,8,0,0,0,2],
  [6,0,0,0,0,4,0,0,0],
  [3,0,0,0,0,0,0,1,0],
  [0,4,0,0,0,0,0,0,7],
  [0,0,7,0,0,0,3,0,0],
];
const cpSearch = createConstraintPropagationTrace(aiEscargot);
const aiRef = aiEscargot.map(r => [...r]);
solvePuzzle(aiRef);
assert.strictEqual(cpSearch.solved, true, 'CP solves a search-heavy puzzle');
assert.deepStrictEqual(cpSearch.solvedBoard, aiRef, 'CP matches the reference solution on a search-heavy puzzle');
assert.ok(cpSearch.steps.some(s => s.type === 'guess'), 'CP records guess steps when propagation stalls');
assert.ok(cpSearch.steps.some(s => s.type === 'contradiction'), 'CP records contradiction steps on dead-end branches');

console.log('All constraint propagation trace tests passed.');

// visualizer test puzzle tests
const expectedEmptyRanges = {
  easy: [30, 40],
  medium: [40, 50],
  hard: [46, 56],
};

for (const difficulty of ['easy', 'medium', 'hard']) {
  const { board: testBoard, locked: testLocked } = generateTestPuzzle(difficulty);
  assert.strictEqual(testBoard.length, 9, `${difficulty} test has 9 rows`);
  assert.strictEqual(testBoard[0].length, 9, `${difficulty} test has 9 columns`);
  assert.strictEqual(testLocked.length, 9, `${difficulty} locked map has 9 rows`);
  const emptyCells = testBoard.flat().filter(value => value === 0).length;
  assert.ok(
    emptyCells >= expectedEmptyRanges[difficulty][0] && emptyCells <= expectedEmptyRanges[difficulty][1],
    `${difficulty} has expected empty-cell range, got ${emptyCells}`
  );
  assert.strictEqual(countSolutions(testBoard, 2), 1, `${difficulty} test has a unique solution`);
  assert.strictEqual(isSolvableLayout(testBoard), true, `${difficulty} test passes the preflight solver check`);
}

assert.deepStrictEqual(
  Object.keys(PLAYBACK_SPEEDS),
  ['1x', '2x', '5x', '10x'],
  'visualizer exposes fixed speed multipliers'
);
assert.ok(PLAYBACK_SPEEDS['1x'] > PLAYBACK_SPEEDS['2x'], '2x is faster than 1x');
assert.ok(PLAYBACK_SPEEDS['2x'] > PLAYBACK_SPEEDS['5x'], '5x is faster than 2x');
assert.ok(PLAYBACK_SPEEDS['5x'] > PLAYBACK_SPEEDS['10x'], '10x is faster than 5x');

console.log('All visualizer test puzzle tests passed.');

// visualizer finish-now state tests
const finishGame = sudokuGame();
finishGame.initialBoard = unsolved.map(row => [...row]);
finishGame.board = unsolved.map(row => [...row]);
finishGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
finishGame.status = 'running';
finishGame.steps = [{ type: 'place', row: 0, col: 2, value: 4 }];
finishGame.stepIndex = 1;
finishGame._interval = setInterval(() => {}, 1000);
finishGame.finishNow();
assert.strictEqual(finishGame.status, 'solved', 'finishNow marks the visualizer solved');
assert.strictEqual(finishGame._interval, null, 'finishNow stops playback');
assert.deepStrictEqual(finishGame.board[0], [5,3,4,6,7,8,9,1,2], 'finishNow fills the solved board');
assert.deepStrictEqual(finishGame.solvedBoard[0], [5,3,4,6,7,8,9,1,2], 'finishNow stores the solved board');
assert.strictEqual(finishGame.stepIndex, finishGame.steps.length, 'finishNow advances to the end of the trace');

console.log('All visualizer finish-now tests passed.');

// visualizer algorithm-selection tests
const stepShape = step => ({ type: step.type, row: step.row, col: step.col, value: step.value });

const mrvRunGame = sudokuGame();
mrvRunGame.initialBoard = unsolved.map(row => [...row]);
mrvRunGame.board = unsolved.map(row => [...row]);
mrvRunGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
mrvRunGame.selectedAlgorithm = 'mrv';
mrvRunGame.runSolver();
clearInterval(mrvRunGame._interval);
assert.deepStrictEqual(
  mrvRunGame.steps.map(stepShape),
  createMrvTrace(unsolved).steps.map(stepShape),
  'runSolver builds the MRV trace when MRV is selected'
);

const btRunGame = sudokuGame();
btRunGame.initialBoard = unsolved.map(row => [...row]);
btRunGame.board = unsolved.map(row => [...row]);
btRunGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
btRunGame.selectedAlgorithm = 'backtracking';
btRunGame.runSolver();
clearInterval(btRunGame._interval);
assert.deepStrictEqual(
  btRunGame.steps.map(stepShape),
  createBacktrackingTrace(unsolved).steps.map(stepShape),
  'runSolver builds the backtracking trace when backtracking is selected'
);

// changing the algorithm clears any existing trace and returns to ready
const switchGame = sudokuGame();
switchGame.initialBoard = unsolved.map(row => [...row]);
switchGame.board = unsolved.map(row => [...row]);
switchGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
switchGame.runSolver();
clearInterval(switchGame._interval);
switchGame.pauseSolver();
switchGame.setAlgorithm('mrv');
assert.strictEqual(switchGame.selectedAlgorithm, 'mrv', 'setAlgorithm updates the selected algorithm');
assert.strictEqual(switchGame.steps.length, 0, 'setAlgorithm clears the existing trace');
assert.strictEqual(switchGame.stepIndex, 0, 'setAlgorithm resets the step index');
assert.strictEqual(switchGame.status, 'ready', 'setAlgorithm returns the visualizer to ready');

console.log('All visualizer algorithm-selection tests passed.');

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

// finishNow skips waiting but records selected-speed completion time
const finishTimeGame = sudokuGame();
finishTimeGame.initialBoard = unsolved.map(row => [...row]);
finishTimeGame.board = unsolved.map(row => [...row]);
finishTimeGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
finishTimeGame.status = 'running';
finishTimeGame.speed = '10x';
finishTimeGame.steps = createBacktrackingTrace(unsolved).steps;
finishTimeGame.stepIndex = 5;
finishTimeGame._runStartTime = 3000;
finishTimeGame._elapsedMs = 1000;
const origNow2 = Date.now;
Date.now = () => 4000;
finishTimeGame.finishNow();
Date.now = origNow2;
assert.strictEqual(
  finishTimeGame._elapsedMs,
  2000 + (finishTimeGame.steps.length - 5) * PLAYBACK_SPEEDS['10x'],
  'finishNow: adds remaining selected-speed trace time'
);
assert.strictEqual(finishTimeGame._runStartTime, null, 'finishNow: clears _runStartTime');

// final trace step completes solving time immediately
const finalStepTimeGame = sudokuGame();
finalStepTimeGame.board = tracePuzzle.map(row => [...row]);
finalStepTimeGame.solvedBoard = [
  [1,2,3,4,5,6,7,8,9],
  [4,5,6,7,8,9,1,2,3],
  [7,8,9,1,2,3,4,5,6],
  [2,3,4,5,6,7,8,9,1],
  [5,6,7,8,9,1,2,3,4],
  [8,9,1,2,3,4,5,6,7],
  [3,4,5,6,7,8,9,1,2],
  [6,7,8,9,1,2,3,4,5],
  [9,1,2,3,4,5,6,7,8],
];
finalStepTimeGame.steps = [{ type: 'place', row: 0, col: 8, value: 9 }];
finalStepTimeGame.status = 'running';
finalStepTimeGame._runStartTime = 1000;
finalStepTimeGame._interval = setInterval(() => {}, 1000);
const origNow4 = Date.now;
Date.now = () => 1250;
finalStepTimeGame._applyNextStep();
Date.now = origNow4;
assert.strictEqual(finalStepTimeGame.status, 'solved', '_applyNextStep: final step marks solved immediately');
assert.strictEqual(finalStepTimeGame._interval, null, '_applyNextStep: final step stops playback');
assert.strictEqual(finalStepTimeGame._elapsedMs, 250, '_applyNextStep: final step captures solve time');
assert.strictEqual(finalStepTimeGame._runStartTime, null, '_applyNextStep: final step clears _runStartTime');

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

// runSolver from solved state resets _elapsedMs
const replayGame = sudokuGame();
replayGame.initialBoard = unsolved.map(row => [...row]);
replayGame.board = unsolved.map(row => [...row]);
replayGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
replayGame.status = 'solved';
replayGame._elapsedMs = 3500;
replayGame.runSolver();
clearInterval(replayGame._interval);
assert.strictEqual(replayGame._elapsedMs, 0, 'runSolver from solved: resets _elapsedMs to 0');

console.log('All solving-time lifecycle tests passed.');
