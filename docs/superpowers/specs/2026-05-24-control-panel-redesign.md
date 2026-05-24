# Control Panel Redesign — Spec

**Date:** 2026-05-24
**Status:** Approved

---

## Overview

Redesign the sidebar control panel to:
1. Organise controls into clearly labelled sections ("professor layout")
2. Make the algorithm selector the visual focal point — extensible for a second algorithm later
3. Replace the opaque Step counter with user-friendly Placed / Backtracks counts
4. Rename "New Test" to "New Puzzle"

The Sudoku grid itself is **unchanged**.

---

## Layout Structure

The sidebar (`aside`) is a vertical stack of panels. On mobile it stays below the grid; on large screens it sits to the right.

```
┌─────────────────────┐
│  Difficulty         │  Easy / Medium / Hard pills
├─────────────────────┤
│  ⬡ Algorithm        │  ← violet ring panel
│  [ Backtracking ▼ ] │  ← large dropdown (focal point)
│  ▶ Run Algorithm    │
│  Speed  1x 2x 5x 10x│
│  ─────────────────  │
│  ⏸ Pause  ⚡ Finish │
│  ↺ Reset  ⊞ New Puzzle│
├─────────────────────┤
│  Status   ⬡ Backtrack│  ← badge on the right
│  [Placed] [Backtracks]│  ← blue / red colored boxes
│       ● Ready        │
└─────────────────────┘
```

---

## Sections

### Difficulty
Unchanged. Three pill buttons: Easy / Medium / Hard.

### Algorithm Panel (violet ring)
The most visually prominent section. Uses a violet-glow border to draw focus.

**Algorithm dropdown** (large):
- Background: `#2d1a5e`, border: `2px solid #7c3aed`, box-shadow glow
- Font: `0.9rem`, `font-weight: 800`
- Currently one option: `⬡ Backtracking DFS`
- When a second algorithm is added, it appears here as a second `<option>`
- The ring accent color changes per algorithm (violet = Backtracking, green = MRV)

**Run Algorithm button** — full width, blue (`bg-blue-600`)

**Speed row** — directly below Run, inside the algorithm panel
- Label: small violet uppercase "SPEED"
- Four pill buttons: `1x` `2x` `5x` `10x`
- Active pill matches algorithm accent color

**Divider** — thin separator line

**Pause / Finish Now** — two-column grid
- Pause: ghost button
- Finish Now: green (`bg-emerald-600`)

**Reset / New Puzzle** — two-column grid
- Reset: ghost button
- New Puzzle: dark button (replaces "New Test")

### Status Panel
Linked to the selected algorithm — updates when the dropdown changes.

**Header row:**
- Left: `STATUS` label (small uppercase)
- Right: algorithm badge chip (e.g. `⬡ Backtracking` in violet, `◈ MRV` in green)

**Two colored stat boxes:**
- **Placed** — blue tint (`bg: #1e3a5f`, label: `#60a5fa`, value: `#93c5fd`)
  - Counts every `place` step in the trace
- **Backtracks** — red tint (`bg: #3b1a1a`, label: `#f87171`, value: `#fca5a5`)
  - Counts every `backtrack` step in the trace
- Both reset to 0 when Reset or New Puzzle is clicked

**State chip** — centered below boxes
- Text: `Ready` / `Running` / `Paused` / `Solved`

---

## Data / State Changes

| Current state property | Change |
|---|---|
| `stepIndex` | Keep internally for playback position |
| `steps.length` | Keep internally |
| `placedCount` | **New** — incremented on each `place` step |
| `backtrackedCount` | **New** — incremented on each `backtrack` step |
| `selectedAlgorithm` | **New** — `'backtracking'` default, used by dropdown and status badge |

Both counters reset in `resetPuzzle()` and `newPuzzle()`.

---

## Removed

- The old `Step: X / Y` stat box is removed from the UI (the internal `stepIndex` counter stays for playback logic)
- The standalone `Speed` section panel is removed (Speed moves inside the Algorithm panel)
- The `New Test` button label → `New Puzzle`

---

## Algorithm Accent Colors

| Algorithm | Ring border | Badge | Run button | Active speed pill |
|---|---|---|---|---|
| Backtracking DFS | `#7c3aed` (violet) | violet | `bg-blue-600` | `bg-blue-600` |
| MRV Backtracking *(future)* | `#34d399` (green) | green | `bg-emerald-600` | `bg-emerald-600` |

---

## Files Affected

| File | Change |
|---|---|
| `index.html` | Restructure `<aside>` — new panel order, algorithm dropdown, status badge |
| `src/visualizer.js` | Add `placedCount`, `backtrackedCount`, `selectedAlgorithm` state; increment counters during trace playback; reset on `resetPuzzle` / `newPuzzle` |
| `style.css` | Add `.algo-ring`, `.stat-place`, `.stat-back`, `.algo-badge` styles |
| `tests/smoke.test.js` | Update selectors for renamed button (`New Puzzle`) and new status panel |

---

## Out of Scope

- Implementing MRV Backtracking algorithm (separate future spec)
- Any changes to the Sudoku grid, cell colours, or solver logic
