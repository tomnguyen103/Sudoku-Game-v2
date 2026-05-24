# Sudoku Game

A fully playable browser-based Sudoku game — no build step, no dependencies, deploys as a static site on Netlify.

## Play it

Open `index.html` directly in a browser, or deploy to Netlify (drag-and-drop or GitHub auto-deploy).

## Features

- **Auto-generated puzzles** — every game is unique, guaranteed single solution
- **4 difficulty levels** — Easy / Medium / Hard / Expert (36–57 empty cells)
- **Mistake highlighting** — wrong entries turn red instantly; 3 mistakes ends the game
- **Undo** — step back through moves; mistakes are permanent
- **Timer** — count-up timer with pause; personal best per difficulty saved locally
- **Dark mode** — toggle with ☀️/🌙, persisted across sessions
- **Keyboard support** — arrows, 1–9, Backspace, Ctrl+Z, Escape
- **PWA** — installable on iOS and Android, works offline

## Stack

| Layer | Choice |
|---|---|
| Styling | Tailwind CSS (CDN) |
| Reactivity | Alpine.js v3 (CDN) |
| Game logic | Vanilla JS (`game.js`) — pure functions, no DOM |
| Deploy | Netlify static |
| PWA | `manifest.json` + `sw.js` cache-first service worker |

## File structure

```
index.html          — markup, Alpine root, CDN imports, PWA meta tags
style.css           — grid box borders (Tailwind handles everything else)
game.js             — solver, generator, uniqueness check, Alpine state factory
manifest.json       — PWA manifest
sw.js               — service worker (offline play)
icons/              — icon-192.png, icon-512.png
generate_icons.py   — generates PNG icons using Python stdlib only
tests/game.test.js  — Node.js tests for all pure functions
```

## Run tests

No npm required — uses Node.js built-in `assert`:

```bash
node tests/game.test.js
```

## Deploy to Netlify

1. Connect this repo to Netlify (GitHub auto-deploy or drag-and-drop)
2. No build command, no publish directory — Netlify serves `index.html` from root
3. HTTPS is provided automatically (required for service workers)

## Development notes

See [`implementation-notes.md`](implementation-notes.md) for decisions made during design and implementation.

Full design spec: [`docs/superpowers/specs/2026-05-23-sudoku-game-design.md`](docs/superpowers/specs/2026-05-23-sudoku-game-design.md)
