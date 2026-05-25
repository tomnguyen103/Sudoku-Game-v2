---
name: documentation-update-across-multiple-docs
description: Workflow command scaffold for documentation-update-across-multiple-docs in Sudoku-Game-v2.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /documentation-update-across-multiple-docs

Use this workflow when working on **documentation-update-across-multiple-docs** in `Sudoku-Game-v2`.

## Goal

Updates documentation and related meta files to reflect new features, algorithms, or implementation details.

## Common Files

- `docs/superpowers/specs/*.md`
- `README.md`
- `CLAUDE.md`
- `implementation-notes.md`
- `sw.js`
- `index.html`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Add or update design specs or algorithm explanations in docs/ or markdown files.
- Update README.md and other meta files (e.g., CLAUDE.md, implementation-notes.md) to reflect the changes.
- Optionally, update service worker or cache versioning if relevant.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.