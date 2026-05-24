# Sudoku Solver Visualizer

A browser-based Sudoku backtracking visualizer. It generates a solvable Easy, Medium, or Hard layout, waits for the user to start, then animates the solver placing values and backtracking through the puzzle.

## Play It

Open `index.html` through a local static server or deploy the repository root to Netlify.

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/index.html`.

## Features

- Generated Sudoku test layouts for Easy, Medium, and Hard
- Solvability preflight before a layout is shown
- Unique-solution generation with `countSolutions(board, 2)`
- Animated backtracking trace with place and backtrack highlights
- `Pause`, `Reset`, `New Test`, and `Finish Now` controls
- Discrete playback speeds: `1x`, `2x`, `5x`, and `10x`
- Dark mode persisted in `localStorage`
- PWA manifest and cache-first service worker for offline repeat visits

## Stack

| Layer | Choice |
|---|---|
| Styling | Local vendored Tailwind browser runtime + custom CSS |
| Reactivity | Local vendored Alpine.js |
| Logic | Vanilla JS modules in `src/` |
| Tests | Node `assert` tests + Playwright smoke test |
| Deploy | Netlify static site |
| PWA | `manifest.json` + `sw.js` cache-first service worker |

## File Structure

```text
index.html              - markup, Alpine root, PWA meta tags
style.css               - Sudoku grid borders and fixed board sizing
src/solver.js           - board validation, solver, solution count, trace generation
src/generator.js        - solution generation, board shuffling, clue removal
src/visualizer.js       - Alpine state factory and playback controls
game.js                 - CommonJS compatibility export for tests
vendor/                 - local Tailwind and Alpine runtime scripts
manifest.json           - PWA manifest
sw.js                   - service worker asset cache
tests/game.test.js      - solver, generator, and visualizer state tests
tests/project.test.js   - project setup and documentation guardrails
tests/smoke.test.js     - browser workflow smoke test
docs/release-checklist.md - release checklist
```

## Test

```bash
npm test
npm run test:smoke
```

## Deploy

Connect the GitHub repo to Netlify. No build output directory is needed; Netlify serves `index.html` from the repository root.

Before deploying, follow [docs/release-checklist.md](docs/release-checklist.md).

## Notes

Development decisions are captured in [implementation-notes.md](implementation-notes.md).
