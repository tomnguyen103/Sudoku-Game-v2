(function attachVisualizer(root, factory) {
  const solver = typeof require === 'function' ? require('./solver.js') : root.SudokuSolver;
  const generator = typeof require === 'function' ? require('./generator.js') : root.SudokuGenerator;
  const api = factory(solver, generator);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PLAYBACK_SPEEDS = api.PLAYBACK_SPEEDS;
  root.sudokuGame = api.sudokuGame;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVisualizerModule(solver, generator) {
  const { createBacktrackingTrace } = solver;
  const { generateTestPuzzle } = generator;

  // Base step delay: smooth animation at 1x, scales by integer factors
  const BASE_DELAY_MS = 260;
  const PLAYBACK_SPEEDS = {
    '1x': BASE_DELAY_MS,
    '2x': BASE_DELAY_MS / 2,
    '5x': BASE_DELAY_MS / 5,
    '10x': BASE_DELAY_MS / 10,
  };

  function sudokuGame() {
    return {
      board: [],
      initialBoard: [],
      locked: [],
      difficulty: 'medium',
      darkMode: false,
      status: 'ready',
      errorMessage: '',
      steps: [],
      stepIndex: 0,
      speed: '2x',
      currentStep: null,
      solvedBoard: null,
      finishFlash: false,
      _interval: null,
      placedCount: 0,
      backtrackedCount: 0,
      selectedAlgorithm: 'backtracking',

      init() {
        this.darkMode = localStorage.getItem('sudoku-dark') === 'true';
        document.documentElement.classList.toggle('dark', this.darkMode);
        this.newPuzzle();
      },

      newPuzzle() {
        this._stopPlayback();
        this.status = 'loading';
        this.errorMessage = '';

        const run = () => {
          if (this.status !== 'loading') return;
          try {
            const { board, locked } = generateTestPuzzle(this.difficulty);
            this.board = board;
            this.initialBoard = board.map(row => [...row]);
            this.locked = locked;
            this.steps = [];
            this.stepIndex = 0;
            this.currentStep = null;
            this.solvedBoard = null;
            this.placedCount = 0;
            this.backtrackedCount = 0;
            this.status = 'ready';
          } catch (_) {
            this.status = 'error';
            this.errorMessage = 'Puzzle generation failed. Please try again.';
          }
        };

        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => setTimeout(run, 0));
        } else {
          run();
        }
      },

      setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.newPuzzle();
      },

      runSolver() {
        if (this.status === 'running') return;

        if (!this.steps.length || this.status === 'ready' || this.status === 'solved') {
          const trace = createBacktrackingTrace(this.initialBoard);
          this.steps = trace.steps;
          this.solvedBoard = trace.solvedBoard;
          this.board = this.initialBoard.map(row => [...row]);
          this.stepIndex = 0;
          this.currentStep = null;
        }

        if (!this.steps.length) {
          this.status = 'solved';
          return;
        }

        this.status = 'running';
        this._interval = setInterval(() => this._applyNextStep(), this.playbackDelay());
      },

      pauseSolver() {
        if (this.status !== 'running') return;
        this._stopPlayback();
        this.status = 'paused';
      },

      finishNow() {
        if (this.status === 'solved') return;

        this._stopPlayback();
        const trace = createBacktrackingTrace(this.initialBoard);
        this.steps = trace.steps;
        this.solvedBoard = trace.solvedBoard;

        if (trace.solved && trace.solvedBoard) {
          this.board = trace.solvedBoard.map(row => [...row]);
          this.stepIndex = trace.steps.length;
          this.currentStep = null;
          this.status = 'solved';
          this.finishFlash = true;
          setTimeout(() => { this.finishFlash = false; }, 600);
        }
      },

      resetPuzzle() {
        this._stopPlayback();
        this.board = this.initialBoard.map(row => [...row]);
        this.steps = [];
        this.stepIndex = 0;
        this.currentStep = null;
        this.solvedBoard = null;
        this.placedCount = 0;
        this.backtrackedCount = 0;
        this.status = 'ready';
      },

      toggleDark() {
        this.darkMode = !this.darkMode;
        document.documentElement.classList.toggle('dark', this.darkMode);
        localStorage.setItem('sudoku-dark', String(this.darkMode));
      },

      playbackDelay() {
        return PLAYBACK_SPEEDS[this.speed] || PLAYBACK_SPEEDS['2x'];
      },

      setSpeed(speed) {
        this.speed = speed;
        if (this.status === 'running') {
          this._stopPlayback();
          this._interval = setInterval(() => this._applyNextStep(), this.playbackDelay());
        }
      },

      cells() {
        return this.board.flatMap((row, r) =>
          row.map((value, c) => ({
            key: `${r}-${c}`,
            row: r,
            col: c,
            value,
          }))
        );
      },

      statusText() {
        if (this.status === 'loading') return 'Generating puzzle…';
        if (this.status === 'error') return this.errorMessage;
        if (this.status === 'ready') return 'Select an algorithm and run the solver.';
        if (this.status === 'running' && this.currentStep?.type === 'place') {
          return `Trying ${this.currentStep.value} at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'backtrack') {
          return `Backtracking from row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'paused') return 'Solver paused.';
        if (this.status === 'solved') return 'Solved by Backtracking DFS.';
        return 'Preparing solver.';
      },

      algorithmBadgeLabel() {
        return this.selectedAlgorithm === 'backtracking' ? '⬡ Backtracking' : this.selectedAlgorithm;
      },

      isCurrentCell(row, col) {
        return this.currentStep?.row === row && this.currentStep?.col === col;
      },

      isBacktracked(row, col) {
        return this.isCurrentCell(row, col) && this.currentStep?.type === 'backtrack';
      },

      cellKind(row, col) {
        if (this.locked[row]?.[col]) return 'given';
        if (this.board[row]?.[col]) return 'generated';
        return 'empty';
      },

      _applyNextStep() {
        if (this.stepIndex >= this.steps.length) {
          this._stopPlayback();
          if (this.solvedBoard) this.board = this.solvedBoard.map(row => [...row]);
          this.status = 'solved';
          return;
        }

        const step = this.steps[this.stepIndex];
        if (step.type === 'place') this.placedCount++;
        else this.backtrackedCount++;
        const nextRow = [...this.board[step.row]];
        nextRow[step.col] = step.type === 'place' ? step.value : 0;
        this.board = this.board.map((row, index) => index === step.row ? nextRow : row);
        this.currentStep = step;
        this.stepIndex++;
      },

      _stopPlayback() {
        clearInterval(this._interval);
        this._interval = null;
      },
    };
  }

  return {
    PLAYBACK_SPEEDS,
    sudokuGame,
  };
});
