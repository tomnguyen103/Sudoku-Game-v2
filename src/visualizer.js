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

  const PLAYBACK_SPEEDS = {
    '1x': 260,
    '2x': 130,
    '5x': 52,
    '10x': 26,
  };

  function sudokuGame() {
    return {
      board: [],
      initialBoard: [],
      locked: [],
      difficulty: 'medium',
      darkMode: false,
      status: 'ready',
      steps: [],
      stepIndex: 0,
      speed: '2x',
      currentStep: null,
      solvedBoard: null,
      _interval: null,

      init() {
        this.darkMode = localStorage.getItem('sudoku-dark') === 'true';
        document.documentElement.classList.toggle('dark', this.darkMode);
        this.newTest();
      },

      newTest() {
        this._stopPlayback();
        const { board, locked } = generateTestPuzzle(this.difficulty);

        this.board = board;
        this.initialBoard = board.map(row => [...row]);
        this.locked = locked;
        this.steps = [];
        this.stepIndex = 0;
        this.currentStep = null;
        this.solvedBoard = null;
        this.status = 'ready';
      },

      setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.newTest();
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
        }
      },

      resetPuzzle() {
        this._stopPlayback();
        this.board = this.initialBoard.map(row => [...row]);
        this.steps = [];
        this.stepIndex = 0;
        this.currentStep = null;
        this.solvedBoard = null;
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
        if (this.status === 'ready') return 'Choose a level, then run the backtracking solver.';
        if (this.status === 'running' && this.currentStep?.type === 'place') {
          return `Trying ${this.currentStep.value} at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'backtrack') {
          return `Backtracking from row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'paused') return 'Solver paused.';
        if (this.status === 'solved') return 'Solved by backtracking.';
        return 'Preparing solver.';
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
