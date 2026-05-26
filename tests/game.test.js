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
  createHumanLogicTrace,
  createHumanLogicV2Trace,
  createHumanLogicV3Trace,
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

// human logic trace tests
assert.deepStrictEqual(
  createHumanLogicTrace(conflictedCompleteBoard),
  { solved: false, steps: [], solvedBoard: null },
  'human logic trace rejects conflicted layouts before playback'
);

const humanForced = createHumanLogicTrace(tracePuzzle);
assert.strictEqual(humanForced.solved, true, 'human logic solves the single-empty-cell puzzle');
assert.deepStrictEqual(humanForced.solvedBoard, tracePuzzleRef, 'human logic solved board matches reference solver');
assert.ok(
  humanForced.steps.some(s => s.type === 'human-place' && s.strategy === 'Naked Single' && s.row === 0 && s.col === 8 && s.value === 9),
  'human logic records a named naked-single placement'
);
assert.strictEqual(tracePuzzle[0][8], 0, 'human logic does not mutate the input board');

const nakedPairPuzzle = [
  [0,0,0,4,5,6,7,8,9],
  [0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [0,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
];
const humanPair = createHumanLogicTrace(nakedPairPuzzle);
const pairStep = humanPair.steps.find(s => s.type === 'human-eliminate' && s.strategy === 'Naked Pair');
assert.ok(pairStep, 'human logic records a naked-pair elimination step');
assert.ok(
  pairStep.cells.some(cell => cell.row === 0 && cell.col === 0) &&
  pairStep.cells.some(cell => cell.row === 0 && cell.col === 1),
  'naked-pair step identifies the two pair cells'
);
assert.ok(
  pairStep.eliminated.some(e => e.value === 1 || e.value === 2),
  'naked-pair step removes pair candidates from other cells in the unit'
);
assert.strictEqual(humanPair.solvedBoard, null, 'human logic can stop when named strategies cannot finish the puzzle');

console.log('All human logic trace tests passed.');

// human logic v2 trace tests
assert.deepStrictEqual(
  createHumanLogicV2Trace(conflictedCompleteBoard),
  { solved: false, steps: [], solvedBoard: null },
  'human logic v2 trace rejects conflicted layouts before playback'
);

const hiddenPairPuzzle = [
  [0,0,0,4,5,6,7,8,9],
  [0,0,4,0,0,0,0,0,0],
  [0,0,5,0,0,0,0,0,0],
  [4,0,0,0,0,0,0,0,0],
  [5,0,0,0,0,0,0,0,0],
  [6,0,0,0,0,0,0,0,0],
  [7,0,0,0,0,0,0,0,0],
  [8,0,0,0,0,0,0,0,0],
  [9,0,0,0,0,0,0,0,0],
];
const hiddenPairTrace = createHumanLogicV2Trace(hiddenPairPuzzle);
const hiddenPairStep = hiddenPairTrace.steps.find(s => s.type === 'human-eliminate' && s.strategy === 'Hidden Pair');
assert.ok(hiddenPairStep, 'human logic v2 records a hidden-pair elimination step');
assert.strictEqual(hiddenPairStep.cells.length, 2, 'hidden-pair step identifies exactly two pair cells');
assert.ok(
  hiddenPairStep.eliminated.every(e =>
    hiddenPairStep.cells.some(cell => cell.row === e.row && cell.col === e.col)
  ),
  'hidden-pair step removes non-pair candidates from the pair cells'
);

const pointingPuzzle = [
  [0,0,0,7,9,0,1,0,2],
  [0,4,0,1,0,0,0,0,0],
  [9,0,0,2,8,0,0,4,0],
  [2,0,0,0,3,0,0,8,0],
  [3,6,0,0,0,0,7,0,0],
  [4,0,0,0,0,0,0,0,3],
  [0,2,0,8,0,9,3,0,5],
  [8,0,3,0,0,1,0,0,0],
  [0,9,0,0,5,0,0,0,8],
];
const pointingTrace = createHumanLogicV2Trace(pointingPuzzle);
const pointingStep = pointingTrace.steps.find(s => s.type === 'human-eliminate' && s.strategy === 'Pointing Pair/Triple');
assert.ok(pointingStep, 'human logic v2 records a pointing pair/triple elimination step');
assert.strictEqual(pointingStep.value, 5, 'pointing step records the locked digit');
assert.deepStrictEqual(pointingStep.unit, { type: 'box', index: 3 }, 'pointing step records the source box');
assert.deepStrictEqual(pointingStep.line, { type: 'column', index: 2 }, 'pointing step records the target column');
assert.ok(
  pointingStep.eliminated.some(e => e.col === 2 && e.value === 5),
  'pointing step removes the digit from the rest of the column outside the box'
);

const boxLinePuzzle = [
  [0,0,8,2,0,4,0,7,0],
  [0,0,0,0,5,6,2,0,0],
  [6,0,0,0,0,0,0,5,0],
  [0,0,0,0,4,0,8,0,0],
  [3,8,0,7,0,5,6,0,1],
  [0,0,0,0,0,8,5,0,0],
  [8,9,0,0,0,0,0,0,0],
  [7,0,1,3,0,0,0,0,0],
  [0,0,2,0,0,9,3,1,8],
];
const boxLineTrace = createHumanLogicV2Trace(boxLinePuzzle);
const boxLineStep = boxLineTrace.steps.find(s => s.type === 'human-eliminate' && s.strategy === 'Box-Line Reduction');
assert.ok(boxLineStep, 'human logic v2 records a box-line reduction elimination step');
assert.strictEqual(boxLineStep.value, 9, 'box-line step records the locked digit');
assert.deepStrictEqual(boxLineStep.line, { type: 'column', index: 7 }, 'box-line step records the source column');
assert.deepStrictEqual(boxLineStep.unit, { type: 'box', index: 5 }, 'box-line step records the target box');
assert.ok(
  boxLineStep.eliminated.some(e => e.row >= 3 && e.row <= 5 && e.col !== 7 && e.value === 9),
  'box-line step removes the digit from the rest of the box outside the column'
);

console.log('All human logic v2 trace tests passed.');

// human logic v3 trace tests

// 1. Rejects conflicted layouts
assert.deepStrictEqual(
  createHumanLogicV3Trace(conflictedCompleteBoard),
  { solved: false, steps: [], solvedBoard: null },
  'human logic v3 trace rejects conflicted layouts before playback'
);

// 2. v3 produces identical steps to v2 on a puzzle v2 can already solve
const v3boxLineTrace = createHumanLogicV3Trace(boxLinePuzzle);
const v2boxLineTrace = createHumanLogicV2Trace(boxLinePuzzle);
assert.deepStrictEqual(
  v3boxLineTrace.steps.map(s => s.type + ':' + (s.strategy || '')),
  v2boxLineTrace.steps.map(s => s.type + ':' + (s.strategy || '')),
  'v3 produces identical steps to v2 on a puzzle v2 can already solve'
);

// 3. Shape assertions on any x-wing steps found
const v3trace = createHumanLogicV3Trace(unsolved);
const xwingSteps = v3trace.steps.filter(s =>
  s.type === 'human-eliminate' && s.strategy === 'x-wing'
);
for (const xs of xwingSteps) {
  assert.ok(Array.isArray(xs.baseSet), 'x-wing step.baseSet is array');
  assert.strictEqual(xs.baseSet.length, 4, 'x-wing baseSet has exactly 4 cells');
  assert.ok(xs.coverLines && Array.isArray(xs.coverLines.indices), 'x-wing step.coverLines.indices is array');
  assert.strictEqual(xs.coverLines.indices.length, 2, 'x-wing coverLines has exactly 2 indices');
  assert.ok(['row','col'].includes(xs.coverLines.axis), 'x-wing coverLines.axis is row or col');
  assert.ok(Array.isArray(xs.eliminations) && xs.eliminations.length > 0, 'x-wing has eliminations');
  assert.strictEqual(xs.eliminated, xs.eliminations, 'x-wing eliminated is same reference as eliminations');
  assert.ok(typeof xs.digit === 'number', 'x-wing step has digit field');
  assert.ok(Array.isArray(xs.snapshot) && xs.snapshot.length === 9, 'x-wing step has 9-row snapshot');
}
console.log(`X-Wing shape assertions passed (${xwingSteps.length} x-wing steps found on unsolved board).`);

// Swordfish shape assertions
const sfSteps = v3trace.steps.filter(s =>
  s.type === 'human-eliminate' && s.strategy === 'swordfish'
);
for (const sf of sfSteps) {
  assert.ok(Array.isArray(sf.baseSet), 'swordfish step.baseSet is array');
  assert.ok(sf.baseSet.length >= 2 && sf.baseSet.length <= 9, 'swordfish baseSet is 2–9 cells');
  assert.ok(sf.coverLines && Array.isArray(sf.coverLines.indices), 'swordfish step.coverLines.indices is array');
  assert.strictEqual(sf.coverLines.indices.length, 3, 'swordfish coverLines has 3 indices');
  assert.ok(['row','col'].includes(sf.coverLines.axis), 'swordfish coverLines.axis is row or col');
  assert.ok(Array.isArray(sf.eliminations) && sf.eliminations.length > 0, 'swordfish has eliminations');
  assert.strictEqual(sf.eliminated, sf.eliminations, 'swordfish eliminated is same reference as eliminations');
  assert.ok(typeof sf.digit === 'number', 'swordfish step has digit field');
  assert.ok(Array.isArray(sf.snapshot) && sf.snapshot.length === 9, 'swordfish step has 9-row snapshot');
}
console.log(`Swordfish shape assertions passed (${sfSteps.length} swordfish steps found on unsolved board).`);

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
finishGame.placedCount = 1;
finishGame._interval = setInterval(() => {}, 1000);
finishGame.finishNow();
assert.strictEqual(finishGame.status, 'solved', 'finishNow marks the visualizer solved');
assert.strictEqual(finishGame._interval, null, 'finishNow stops playback');
assert.deepStrictEqual(finishGame.board[0], [5,3,4,6,7,8,9,1,2], 'finishNow fills the solved board');
assert.deepStrictEqual(finishGame.solvedBoard[0], [5,3,4,6,7,8,9,1,2], 'finishNow stores the solved board');
assert.strictEqual(finishGame.stepIndex, finishGame.steps.length, 'finishNow advances to the end of the trace');
const expectedTrace = createBacktrackingTrace(unsolved);
const expectedPlaces = expectedTrace.steps.filter(s => s.type === 'place').length;
const expectedBacktracks = expectedTrace.steps.filter(s => s.type === 'backtrack').length;
assert.strictEqual(finishGame.placedCount, expectedPlaces, 'finishNow sets correct final placedCount');
assert.strictEqual(finishGame.backtrackedCount, expectedBacktracks, 'finishNow sets correct final backtrackedCount');

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

// constraint propagation visualizer integration
const cpRunGame = sudokuGame();
cpRunGame.initialBoard = unsolved.map(row => [...row]);
cpRunGame.board = unsolved.map(row => [...row]);
cpRunGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
cpRunGame.selectedAlgorithm = 'constraint';
cpRunGame.runSolver();
clearInterval(cpRunGame._interval);
assert.deepStrictEqual(
  cpRunGame.steps.map(s => s.type),
  createConstraintPropagationTrace(unsolved).steps.map(s => s.type),
  'runSolver builds the constraint propagation trace when CP is selected'
);

// applying a propagate step updates the snapshot, board, and elimination count
const cpApplyGame = sudokuGame();
cpApplyGame.initialBoard = unsolved.map(row => [...row]);
cpApplyGame.board = unsolved.map(row => [...row]);
cpApplyGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
cpApplyGame.selectedAlgorithm = 'constraint';
cpApplyGame.steps = createConstraintPropagationTrace(unsolved).steps;
cpApplyGame.stepIndex = 0;
cpApplyGame.status = 'running';
const firstPropagate = cpApplyGame.steps.findIndex(s => s.type === 'propagate');
for (let i = 0; i <= firstPropagate; i++) cpApplyGame._applyNextStep();
assert.ok(cpApplyGame.currentSnapshot, 'applying a CP step sets currentSnapshot');
assert.ok(cpApplyGame.eliminationCount > 0, 'propagate steps increment the elimination count');

// cellCandidates returns multi-candidate digit arrays and null for solved cells
const snap = createConstraintPropagationTrace(unsolved).steps[0].snapshot;
const cpCandGame = sudokuGame();
cpCandGame.currentSnapshot = snap;
let foundMulti = false, foundSingle = false;
for (let r = 0; r < 9 && !(foundMulti && foundSingle); r++) {
  for (let c = 0; c < 9; c++) {
    if (snap[r][c].length > 1) { assert.deepStrictEqual(cpCandGame.cellCandidates(r, c), snap[r][c], 'cellCandidates returns the candidate digits'); foundMulti = true; }
    else if (snap[r][c].length === 1) { assert.strictEqual(cpCandGame.cellCandidates(r, c), null, 'cellCandidates returns null for solved cells'); foundSingle = true; }
  }
}
assert.ok(foundMulti, 'snapshot has at least one multi-candidate cell to verify');

// stat labels and values are algorithm-aware
const cpLabelGame = sudokuGame();
cpLabelGame.selectedAlgorithm = 'backtracking';
assert.strictEqual(cpLabelGame.statLabelPrimary().includes('Placed'), true, 'backtracking primary label is Placed');
assert.strictEqual(cpLabelGame.statLabelSecondary().includes('Backtracks'), true, 'backtracking secondary label is Backtracks');
cpLabelGame.selectedAlgorithm = 'constraint';
cpLabelGame.eliminationCount = 12;
cpLabelGame.guessCount = 3;
assert.strictEqual(cpLabelGame.statLabelPrimary().includes('Eliminations'), true, 'CP primary label is Eliminations');
assert.strictEqual(cpLabelGame.statLabelSecondary().includes('Guesses'), true, 'CP secondary label is Guesses');
assert.strictEqual(cpLabelGame.statValuePrimary(), 12, 'CP primary value is the elimination count');
assert.strictEqual(cpLabelGame.statValueSecondary(), 3, 'CP secondary value is the guess count');
cpLabelGame.selectedAlgorithm = 'human';
assert.strictEqual(cpLabelGame.statLabelPrimary().includes('Deductions'), true, 'human logic primary label is Deductions');
assert.strictEqual(cpLabelGame.statLabelSecondary().includes('Eliminations'), true, 'human logic secondary label is Eliminations');

const humanRunGame = sudokuGame();
humanRunGame.initialBoard = unsolved.map(row => [...row]);
humanRunGame.board = unsolved.map(row => [...row]);
humanRunGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
humanRunGame.selectedAlgorithm = 'human';
humanRunGame.runSolver();
clearInterval(humanRunGame._interval);
assert.deepStrictEqual(
  humanRunGame.steps.map(s => s.type),
  createHumanLogicTrace(unsolved).steps.map(s => s.type),
  'runSolver builds the human logic trace when human logic is selected'
);

const humanV2RunGame = sudokuGame();
humanV2RunGame.initialBoard = unsolved.map(row => [...row]);
humanV2RunGame.board = unsolved.map(row => [...row]);
humanV2RunGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
humanV2RunGame.selectedAlgorithm = 'human-v2';
humanV2RunGame.runSolver();
clearInterval(humanV2RunGame._interval);
assert.deepStrictEqual(
  humanV2RunGame.steps.map(s => s.type),
  createHumanLogicV2Trace(unsolved).steps.map(s => s.type),
  'runSolver builds the human logic v2 trace when human logic v2 is selected'
);

const humanStuckGame = sudokuGame();
humanStuckGame.initialBoard = nakedPairPuzzle.map(row => [...row]);
humanStuckGame.board = nakedPairPuzzle.map(row => [...row]);
humanStuckGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
humanStuckGame.selectedAlgorithm = 'human';
humanStuckGame.runSolver();
clearInterval(humanStuckGame._interval);
while (humanStuckGame.status === 'running') humanStuckGame._applyNextStep();
assert.strictEqual(humanStuckGame.status, 'stuck', 'human logic marks the visualizer stuck when strategies cannot finish');
assert.ok(humanStuckGame.statusText().includes('Human Logic Solver is stuck'), 'stuck status explains that human logic needs more strategies');

// resetPuzzle clears CP-specific state
const cpResetGame = sudokuGame();
cpResetGame.initialBoard = unsolved.map(row => [...row]);
cpResetGame.currentSnapshot = snap;
cpResetGame.eliminationCount = 9;
cpResetGame.guessCount = 2;
cpResetGame.resetPuzzle();
assert.strictEqual(cpResetGame.currentSnapshot, null, 'resetPuzzle clears currentSnapshot');
assert.strictEqual(cpResetGame.eliminationCount, 0, 'resetPuzzle clears eliminationCount');
assert.strictEqual(cpResetGame.guessCount, 0, 'resetPuzzle clears guessCount');

console.log('All constraint propagation visualizer tests passed.');

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
assert.strictEqual(etGame.elapsedText(), '3.47s', 'elapsedText: reflects accumulated visual solving time');

etGame._elapsedMs = 1000;
const origNow0 = Date.now;
Date.now = () => 5000;
etGame._runStartTime = 4000;
assert.strictEqual(etGame.elapsedText(), '2.00s', 'elapsedText: includes live _runStartTime segment');
Date.now = origNow0;
etGame._runStartTime = null;
etGame._elapsedMs = 0;

assert.strictEqual(etGame.computeText(), '0.000s', 'computeText: initial value is 0.000s');
etGame._computeDurationMs = 3.47;
assert.strictEqual(etGame.computeText(), '0.003s', 'computeText: reflects measured compute duration in seconds');
etGame._computeDurationMs = 3470;
assert.strictEqual(etGame.computeText(), '3.470s', 'computeText: formats larger compute duration');
etGame._computeDurationMs = 0;

console.log('All solving-time elapsedText tests passed.');

// solving time — lifecycle hooks
const pauseTimeGame = sudokuGame();
pauseTimeGame.status = 'running';
const origNow1 = Date.now;
Date.now = () => 2500;
pauseTimeGame._runStartTime = 1000;
pauseTimeGame._elapsedMs = 0;
pauseTimeGame.pauseSolver();
Date.now = origNow1;
assert.strictEqual(pauseTimeGame._elapsedMs, 1500, 'pauseSolver: flushes visual solving time into _elapsedMs');
assert.strictEqual(pauseTimeGame._runStartTime, null, 'pauseSolver: clears _runStartTime');

// resetPuzzle clears both time values
const resetTimeGame = sudokuGame();
resetTimeGame._elapsedMs = 9999;
resetTimeGame._runStartTime = 12345;
resetTimeGame._computeDurationMs = 9.99;
resetTimeGame.resetPuzzle();
assert.strictEqual(resetTimeGame._elapsedMs, 0, 'resetPuzzle: clears _elapsedMs');
assert.strictEqual(resetTimeGame._runStartTime, null, 'resetPuzzle: clears _runStartTime');
assert.strictEqual(resetTimeGame._computeDurationMs, 0, 'resetPuzzle: clears _computeDurationMs');

// newPuzzle clears both time values
const newTimeGame = sudokuGame();
newTimeGame._elapsedMs = 4200;
newTimeGame._runStartTime = 777;
newTimeGame._computeDurationMs = 4.2;
newTimeGame.newPuzzle();
assert.strictEqual(newTimeGame._elapsedMs, 0, 'newPuzzle: clears _elapsedMs');
assert.strictEqual(newTimeGame._runStartTime, null, 'newPuzzle: clears _runStartTime');
assert.strictEqual(newTimeGame._computeDurationMs, 0, 'newPuzzle: clears _computeDurationMs');

// finishNow skips waiting but records projected visual time and actual compute time
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
finishTimeGame._measureTrace = board => {
  const trace = createBacktrackingTrace(board);
  return { trace, durationMs: 12.345 };
};
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
assert.strictEqual(
  finishTimeGame._computeDurationMs,
  12.345,
  'finishNow: records measured trace-generation compute time'
);

// final trace step completes visual solving time but keeps compute time
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
finalStepTimeGame._computeDurationMs = 5.5;
finalStepTimeGame._runStartTime = 1000;
finalStepTimeGame._interval = setInterval(() => {}, 1000);
const origNow4 = Date.now;
Date.now = () => 1250;
finalStepTimeGame._applyNextStep();
Date.now = origNow4;
assert.strictEqual(finalStepTimeGame.status, 'solved', '_applyNextStep: final step marks solved immediately');
assert.strictEqual(finalStepTimeGame._interval, null, '_applyNextStep: final step stops playback');
assert.strictEqual(finalStepTimeGame._elapsedMs, 250, '_applyNextStep: final step captures visual solve time');
assert.strictEqual(finalStepTimeGame._runStartTime, null, '_applyNextStep: final step clears _runStartTime');
assert.strictEqual(finalStepTimeGame._computeDurationMs, 5.5, '_applyNextStep: final step keeps measured compute time');

// runSolver starts visual timer and measures trace-generation compute time
const runTimeGame = sudokuGame();
runTimeGame.initialBoard = unsolved.map(row => [...row]);
runTimeGame.board = unsolved.map(row => [...row]);
runTimeGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
runTimeGame._measureTrace = board => {
  const trace = createBacktrackingTrace(board);
  return { trace, durationMs: 8.75 };
};
const origNow3 = Date.now;
Date.now = () => 8000;
runTimeGame.runSolver();
clearInterval(runTimeGame._interval);
Date.now = origNow3;
assert.strictEqual(runTimeGame._runStartTime, 8000, 'runSolver: starts visual solving timer');
assert.strictEqual(runTimeGame._computeDurationMs, 8.75, 'runSolver: records measured compute duration');

// runSolver from solved state resets visual time and replaces compute time
const replayGame = sudokuGame();
replayGame.initialBoard = unsolved.map(row => [...row]);
replayGame.board = unsolved.map(row => [...row]);
replayGame.locked = Array.from({ length: 9 }, () => Array(9).fill(false));
replayGame.status = 'solved';
replayGame._elapsedMs = 3500;
replayGame._computeDurationMs = 3500;
replayGame._measureTrace = board => {
  const trace = createBacktrackingTrace(board);
  return { trace, durationMs: 2.25 };
};
replayGame.runSolver();
clearInterval(replayGame._interval);
assert.strictEqual(replayGame._elapsedMs, 0, 'runSolver from solved: resets visual time');
assert.strictEqual(replayGame._computeDurationMs, 2.25, 'runSolver from solved: replaces measured compute time');

console.log('All solving-time lifecycle tests passed.');

// human logic v3 — import guard
assert.strictEqual(typeof createHumanLogicV3Trace, 'function', 'createHumanLogicV3Trace is exported');
