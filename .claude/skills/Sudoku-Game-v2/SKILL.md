```markdown
# Sudoku-Game-v2 Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the development patterns, coding conventions, and workflows used in the `Sudoku-Game-v2` JavaScript codebase. You'll learn how to implement new features with tests, update documentation, and follow the repository's established code style and commit practices.

## Coding Conventions

- **File Naming:**  
  Use camelCase for file names.  
  _Example:_  
  ```
  src/gameLogic.js
  src/solverEngine.js
  ```

- **Import Style:**  
  Use relative imports for modules.  
  _Example:_  
  ```js
  import { solveSudoku } from './solverEngine.js';
  ```

- **Export Style:**  
  Use named exports in modules.  
  _Example:_  
  ```js
  // src/solverEngine.js
  export function solveSudoku(board) { /* ... */ }
  export function isValidMove(board, row, col, num) { /* ... */ }
  ```

- **Commit Messages:**  
  Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes like `feat`, `docs`, `test`.  
  _Example:_  
  ```
  feat: add diagonal sudoku solver
  docs: update solver algorithm documentation
  test: add tests for new solver
  ```

## Workflows

### Feature Implementation with Tests
**Trigger:** When you want to add a new algorithm, solver, or major feature.  
**Command:** `/new-feature-with-tests`

1. Implement the new feature or algorithm in a source file (e.g., `src/solver.js`, `src/visualizer.js`).
2. Add or update tests in the corresponding test file (e.g., `tests/game.test.js`).
3. Commit your changes using a `feat:` or `test:` prefix.

_Example:_
```js
// src/solver.js
export function newSolver(board) {
  // implementation
}

// tests/game.test.js
import { newSolver } from '../src/solver.js';

test('newSolver solves easy puzzle', () => {
  // test code
});
```

### Documentation Update Across Multiple Docs
**Trigger:** When you want to document a new feature, algorithm, or implementation change.  
**Command:** `/update-docs`

1. Add or update design specs or algorithm explanations in `docs/` or markdown files.
2. Update `README.md` and other meta files (e.g., `CLAUDE.md`, `implementation-notes.md`) to reflect the changes.
3. Optionally, update `sw.js` or `index.html` if relevant (e.g., for cache versioning or new features).
4. Commit your changes using a `docs:` prefix.

_Example:_
```
docs/superpowers/specs/diagonal-solver.md
README.md
CLAUDE.md
implementation-notes.md
```

## Testing Patterns

- **Test Files:**  
  Test files are named with the `.test.js` suffix and typically reside in a `tests/` directory.
  _Example:_  
  ```
  tests/game.test.js
  ```

- **Framework:**  
  The specific testing framework is not detected, but tests are written in standard JavaScript.

- **Test Example:**
  ```js
  import { solveSudoku } from '../src/solver.js';

  test('solveSudoku solves a simple puzzle', () => {
    const puzzle = [/* ... */];
    const solution = solveSudoku(puzzle);
    expect(solution).toBeDefined();
    // additional assertions
  });
  ```

## Commands

| Command                   | Purpose                                                |
|---------------------------|--------------------------------------------------------|
| /new-feature-with-tests   | Start a new feature or algorithm with corresponding tests |
| /update-docs              | Update documentation and meta files for new features   |
```
