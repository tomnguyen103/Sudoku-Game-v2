---
name: feature-implementation-with-tests
description: Workflow command scaffold for feature-implementation-with-tests in Sudoku-Game-v2.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-implementation-with-tests

Use this workflow when working on **feature-implementation-with-tests** in `Sudoku-Game-v2`.

## Goal

Implements a new solver or feature and adds corresponding tests to ensure correctness.

## Common Files

- `src/solver.js`
- `src/visualizer.js`
- `tests/game.test.js`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Implement the feature or algorithm in a source file (e.g., src/solver.js, src/visualizer.js).
- Add or update tests in the corresponding test file (e.g., tests/game.test.js).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.