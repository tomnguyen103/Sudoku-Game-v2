# Human Logic Solver v3 — X-Wing and Swordfish

**Date:** 2026-05-26
**Goal:** Add a fifth human-logic algorithm entry that visualizes X-wing and Swordfish, two "fish" elimination techniques. Primary motivation is visual impact: the amber cross-shaped highlight and column-stripe pattern give a distinct, geometric wow factor that existing algorithms don't produce.

---

## Overview

Human Logic Solver v3 extends v2 by adding two fish elimination techniques: X-wing (2×2 grid lock) and Swordfish (3×3 grid lock). Both techniques eliminate candidates without placing digits — they prove that a digit is locked to a set of rows/columns, so it can be removed from all other cells in those columns/rows.

The solver runs the full v2 technique stack first (naked single → hidden single → naked pair → hidden pair → pointing pair/triple → box-line reduction), then falls through to X-wing, then Swordfish. If none of the above find a deduction, the solver emits `stuck` and stops.

---

## Algorithm Logic

### X-Wing (row direction)

For each digit `d` (1–9), for each pair of rows `(r1, r2)`:
1. Find `cols1` = columns where `d` is a candidate in row `r1`
2. Find `cols2` = columns where `d` is a candidate in row `r2`
3. If `|cols1| == 2` and `cols1 == cols2`:
   - **Base set:** `(r1,c1)`, `(r1,c2)`, `(r2,c1)`, `(r2,c2)`
   - **Eliminations:** all other cells in `c1` and `c2` that still have `d` as a candidate
   - Emit a step and restart the technique loop

Also run the column direction (swap rows ↔ columns).

### Swordfish (row direction)

For each digit `d` (1–9), for each triple of rows `(r1, r2, r3)`:
1. Find candidate columns for `d` in each row: `cols1`, `cols2`, `cols3`
2. If each set has 2 or 3 members, and `cols1 ∪ cols2 ∪ cols3` has exactly 3 columns:
   - **Base set:** all cells in the 3 rows at those 3 column positions (where `d` is a candidate)
   - **Eliminations:** all other cells in those 3 columns that still have `d` as a candidate
   - Emit a step and restart the technique loop

Also run the column direction.

### Stopping condition

If a complete pass through all techniques (v2 + X-wing + Swordfish) finds no new deductions, emit a terminal `stuck` step.

---

## Step Vocabulary

Both techniques emit `human-eliminate` steps (the same type used by v2 eliminations) with an extended `strategy` field:

```js
{
  type: 'human-eliminate',
  strategy: 'x-wing',      // or 'swordfish'
  digit: 5,
  baseSet: [               // corner/vertex cells that define the pattern
    [r1, c1], [r1, c2],
    [r2, c1], [r2, c2]
  ],
  coverLines: {            // which lines are "covered" (for stripe rendering)
    axis: 'col',           // 'col' (row-direction fish) or 'row' (col-direction fish)
    indices: [c1, c2]      // column (or row) indices
  },
  eliminations: [          // cells losing the candidate
    [r3, c1], [r4, c2], ...
  ],
  snapshot: { ... }        // full 9×9 candidate snapshot (same as v2)
}
```

`human-place` steps from the underlying v2 techniques use the existing v2 vocabulary unchanged.

---

## Visual Highlights

### Base cells (corner/vertex cells)
- **CSS class:** `.fish-base`
- **Style:** amber/gold border (`border-amber-500`) + amber background tint (`bg-amber-50` / `dark:bg-amber-950`)
- These are the cells that define the X-wing or Swordfish pattern

### Cover line stripe
- **CSS class:** `.fish-cover` applied to entire columns (or rows) in `coverLines.indices`
- **Style:** very subtle amber column stripe (`bg-amber-50/40` / `dark:bg-amber-950/40`) behind non-base cells in the covered lines
- Purpose: makes the geometric "these columns are locked" constraint visually readable

### Eliminated cells
- Existing red flash for removed candidates — same render path as v2 `human-eliminate` steps

### Strategy label
- The step notification chip displays `X-Wing on 5` or `Swordfish on 5` (strategy + digit)
- Uses the same chip pattern as v2's `Naked Pair`, `Pointing Pair`, etc.

---

## Stat Tiles

Same labels as v2 (no change needed):
- **Primary:** Placed (digits placed)
- **Secondary:** Eliminated (candidates removed)

---

## Files Changed

| File | Change |
|---|---|
| `src/solver.js` | Add `buildHumanV3Trace()`. Add `findXWing(candidates)` and `findSwordfish(candidates)` helpers. Call v2 technique helpers first, then fall through to fish helpers. |
| `src/visualizer.js` | Register `'Human Logic Solver v3'` in `TRACE_BUILDERS`. Extend `cellHighlight()` and the render path to handle `x-wing` / `swordfish` strategy: apply `.fish-base` to `baseSet` cells, apply `.fish-cover` to `coverLines` cells, show strategy chip label. |
| `index.html` | Add `<option value="Human Logic Solver v3">Human Logic Solver v3</option>` to the algorithm `<select>`. Bump `?v=` query strings for changed assets. |
| `style.css` | Add `.fish-base` and `.fish-cover` CSS rules (amber color tokens, dark-mode variants). |
| `sw.js` | Bump `CACHE` version string (e.g. `sudoku-vN` → `sudoku-vN+1`). |
| `tests/game.test.js` | Unit tests: craft a minimal board where X-wing is the only valid next deduction; assert step has `strategy: 'x-wing'`, correct `baseSet`, correct `eliminations`. Same pattern for Swordfish. |

---

## Tests

**Unit (game.test.js):**
- Craft a 9×9 board where digit `d` appears in exactly 2 positions in each of 2 rows, aligned to the same 2 columns, and nowhere else in those columns — assert X-wing step emitted with correct fields.
- Craft a 9×9 board where digit `d` is confined to 3 columns across 3 rows — assert Swordfish step emitted with correct fields.
- Craft a board where v2 techniques make progress before fish — assert v2 steps appear first.

**Browser smoke (smoke.test.js):**
- Select `Human Logic Solver v3`, click `Run Algorithm`, assert animation runs and does not crash. Existing smoke test patterns cover this with minimal additions.

---

## Out of Scope

- Y-Wing / XY-Wing (different chain-style technique, future addition)
- Jellyfish (4-row/4-column generalization of Swordfish, very rare, future addition)
- Coloring / chains (future addition)
- Any changes to v1 or v2 algorithm behavior
