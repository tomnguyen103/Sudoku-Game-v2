# Release Checklist

Use this before deploying the Sudoku Solver Visualizer.

1. Run the full test suite:

   ```bash
   npm test
   ```

2. Run the browser smoke test:

   ```bash
   npm run test:smoke
   ```

3. When changing runtime assets, bump all cache/version markers together:
   - `sw.js` cache name
   - query strings in `index.html`
   - any new runtime files in the `ASSETS` list

4. Review the app locally:

   ```bash
   python -m http.server 4173 --bind 127.0.0.1
   ```

   Open `http://127.0.0.1:4173/index.html`.

5. Verify the core visualizer flow:
   - new generated layout appears
   - `Run Backtracking Algorithm` starts animation
   - `Pause` stops animation
   - `Finish Now` fills all cells and marks the layout solved
   - `Reset` restores the current unsolved layout
   - `New Test` generates a fresh layout

6. Confirm docs match the current app mode before publishing.
