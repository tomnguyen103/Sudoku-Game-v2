# Sudoku Solver Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the app from manual Sudoku play into a pure backtracking solver visualizer.

**Architecture:** Keep `game.js` as the logic/state file. Add a pure trace generator that records backtracking placements and removals, then have Alpine replay those steps into the existing grid. Replace manual game controls with difficulty, New Puzzle, Run, Pause, Reset, and speed controls.

**Tech Stack:** Vanilla JavaScript, Alpine.js, Tailwind CDN, existing Node tests.

---

### Task 1: Backtracking Trace

**Files:**
- Modify: `tests/game.test.js`
- Modify: `game.js`

- [ ] Add tests for a pure `createBacktrackingTrace(board)` function that returns ordered placement/backtrack steps and a solved board.
- [ ] Run `npm test` and verify the new tests fail because the function is not exported.
- [ ] Implement `createBacktrackingTrace(board)` by adapting the existing recursive solver to push `{ type, row, col, value }` steps.
- [ ] Export the function for tests.
- [ ] Run `npm test` and verify all tests pass.

### Task 2: Alpine Visualizer State

**Files:**
- Modify: `game.js`

- [ ] Replace manual-play state with visualizer state: `board`, `initialBoard`, `locked`, `difficulty`, `status`, `steps`, `stepIndex`, `currentStep`, `speed`, `solvedBoard`.
- [ ] Make `newPuzzle()` generate a puzzle for Easy, Medium, or Hard and reset the trace state.
- [ ] Add `runSolver()`, `pauseSolver()`, `resetPuzzle()`, and `_applyNextStep()` methods.
- [ ] Keep dark mode support.

### Task 3: Visualizer UI

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `sw.js`

- [ ] Replace timer, mistakes, undo, erase, and number pad controls with visualizer controls.
- [ ] Show solver status, step count, and speed slider.
- [ ] Highlight givens, generated placements, current cell, and backtracked cells.
- [ ] Update the stylesheet query string and service worker cache version.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `npm test`.
- [ ] Open the app locally in the in-app browser.
- [ ] Verify Easy/Medium/Hard create pre-filled puzzles.
- [ ] Verify Run Backtracking fills numbers into the grid step-by-step.
- [ ] Verify Pause and Reset work.
