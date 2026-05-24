# Solving Time Feature — Design Spec

**Date:** 2026-05-24  
**Status:** Approved

## Summary

Add an **active solve time** metric to the status widget that measures how long the backtracking algorithm has been actively running — pauses excluded.

## State

Two new fields on the `sudokuGame()` Alpine object in `src/visualizer.js`:

| Field | Type | Initial | Purpose |
|---|---|---|---|
| `_runStartTime` | `number \| null` | `null` | `Date.now()` when running last started or resumed |
| `_elapsedMs` | `number` | `0` | Accumulated active milliseconds across all run segments |

## Lifecycle

| Event | Action |
|---|---|
| `runSolver()` starts or resumes | `_runStartTime = Date.now()` |
| `pauseSolver()` | `_elapsedMs += Date.now() - _runStartTime; _runStartTime = null` |
| `_applyNextStep()` transitions to solved | flush: `_elapsedMs += Date.now() - _runStartTime; _runStartTime = null` |
| `finishNow()` | if `_runStartTime` set, flush before freezing |
| `resetPuzzle()` | `_runStartTime = null; _elapsedMs = 0` |
| `newPuzzle()` | `_runStartTime = null; _elapsedMs = 0` |

## Display Helper

New method `elapsedText()` on the Alpine object:

- Returns accumulated time as `"X.XXs"` (e.g. `"3.47s"`)
- Formula: `((this._elapsedMs + (this._runStartTime ? Date.now() - this._runStartTime : 0)) / 1000).toFixed(2) + 's'`
- While paused or solved, `_runStartTime` is `null` so only `_elapsedMs` contributes — the value is frozen
- Returns `"0.00s"` before the solver has run

## Status Widget (index.html)

Add a full-width third stat tile below the existing 2-column Placed / Backtracks grid:

```
[ ✦ Placed ]  [ ↩ Backtracks ]
[       ⏱ Solving Time        ]
```

Styled consistently with the existing `stat-place` / `stat-back` tiles. Label: `⏱ Solving Time`. Value bound to `elapsedText()`.

## Files Changed

- `src/visualizer.js` — add `_runStartTime`, `_elapsedMs`, `elapsedText()`, lifecycle hooks
- `index.html` — add third stat tile to status widget
