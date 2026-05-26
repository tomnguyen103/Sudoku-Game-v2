(function attachVisualizer(root, factory) {
  const solver = typeof require === 'function' ? require('./solver.js') : root.SudokuSolver;
  const generator = typeof require === 'function' ? require('./generator.js') : root.SudokuGenerator;
  const api = factory(solver, generator);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PLAYBACK_SPEEDS = api.PLAYBACK_SPEEDS;
  root.sudokuGame = api.sudokuGame;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createVisualizerModule(solver, generator) {
  const { createBacktrackingTrace, createMrvTrace, createConstraintPropagationTrace, createHumanLogicTrace, createHumanLogicV2Trace } = solver;
  const { generateTestPuzzle } = generator;

  const TRACE_BUILDERS = {
    backtracking: createBacktrackingTrace,
    mrv: createMrvTrace,
    constraint: createConstraintPropagationTrace,
    human: createHumanLogicTrace,
    'human-v2': createHumanLogicV2Trace,
  };

  const ALGORITHM_LABELS = {
    backtracking: 'Backtracking DFS',
    mrv: 'Backtracking + MRV',
    constraint: 'Constraint Propagation',
    human: 'Human Logic Solver',
    'human-v2': 'Human Logic Solver v2',
  };

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
      eliminationCount: 0,
      guessCount: 0,
      currentSnapshot: null,
      traceSolved: false,
      _runStartTime: null,
      _elapsedMs: 0,
      _computeDurationMs: 0,
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
            this.eliminationCount = 0;
            this.guessCount = 0;
            this.currentSnapshot = null;
            this.traceSolved = false;
            this._runStartTime = null;
            this._elapsedMs = 0;
            this._computeDurationMs = 0;
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

      setAlgorithm(algorithm) {
        if (!TRACE_BUILDERS[algorithm]) return;
        this.selectedAlgorithm = algorithm;
        // The existing trace belongs to the previous algorithm; clear it so the
        // next run rebuilds with the newly selected algorithm. Keep the puzzle.
        this.resetPuzzle();
      },

      runSolver() {
        if (this.status === 'running') return;

        if (!this.steps.length || this.status === 'ready' || this.status === 'solved') {
          this._elapsedMs = 0;
          this._runStartTime = Date.now();
          const { trace, durationMs } = this._measureTrace(this.initialBoard);
          this.steps = trace.steps;
          this.solvedBoard = trace.solvedBoard;
          this.board = this.initialBoard.map(row => [...row]);
          this.stepIndex = 0;
          this.currentStep = null;
          this.placedCount = 0;
          this.backtrackedCount = 0;
          this.eliminationCount = 0;
          this.guessCount = 0;
          this.currentSnapshot = null;
          this.traceSolved = trace.solved;
          this._computeDurationMs = durationMs;
        } else {
          this._runStartTime = Date.now();
        }

        if (!this.steps.length) {
          this._stopTimer();
          this.status = this.traceSolved ? 'solved' : 'stuck';
          return;
        }

        this.status = 'running';
        this._interval = setInterval(() => this._applyNextStep(), this.playbackDelay());
      },

      pauseSolver() {
        if (this.status !== 'running') return;
        this._stopPlayback();
        this._stopTimer();
        this.status = 'paused';
      },

      finishNow() {
        if (this.status === 'solved') return;

        const completedStepCount = this.stepIndex;
        this._stopPlayback();
        const { trace, durationMs } = this._measureTrace(this.initialBoard);
        this.steps = trace.steps;
        this.solvedBoard = trace.solvedBoard;
        this.traceSolved = trace.solved;
        this._computeDurationMs = durationMs;

        // Accumulate counts for all remaining steps in the trace
        for (let i = this.stepIndex; i < this.steps.length; i++) {
          const step = this.steps[i];
          if (step.type === 'place') {
            this.placedCount++;
          } else if (step.type === 'backtrack') {
            this.backtrackedCount++;
          } else if (step.type === 'propagate') {
            this.eliminationCount += step.eliminated.length;
          } else if (step.type === 'guess') {
            this.guessCount++;
          } else if (step.type === 'human-place') {
            this.placedCount++;
            this.eliminationCount += step.eliminated.length;
          } else if (step.type === 'human-eliminate') {
            this.eliminationCount += step.eliminated.length;
          }
        }

        if (trace.solved && trace.solvedBoard) {
          const remainingStepCount = Math.max(trace.steps.length - Math.min(completedStepCount, trace.steps.length), 0);
          this._stopTimer();
          this._elapsedMs += remainingStepCount * this.playbackDelay();
          this.board = trace.solvedBoard.map(row => [...row]);
          this.currentSnapshot = null;
          this.stepIndex = trace.steps.length;
          this.currentStep = null;
          this.status = 'solved';
          this.finishFlash = true;
          setTimeout(() => { this.finishFlash = false; }, 600);
        } else {
          this._stopTimer();
          this.stepIndex = trace.steps.length;
          this.currentStep = trace.steps[trace.steps.length - 1] || null;
          this.currentSnapshot = this.currentStep?.snapshot || null;
          this.status = 'stuck';
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
        this.eliminationCount = 0;
        this.guessCount = 0;
        this.currentSnapshot = null;
        this.traceSolved = false;
        this._runStartTime = null;
        this._elapsedMs = 0;
        this._computeDurationMs = 0;
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
          this._flushTimer();
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
            candidates: this.cellCandidates(r, c),
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
        if (this.status === 'running' && this.currentStep?.type === 'propagate') {
          return `Propagating from row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'guess') {
          return `Guessing ${this.currentStep.value} at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'contradiction') {
          return `Contradiction at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}, backtracking.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'human-place') {
          return `${this.currentStep.strategy}: placing ${this.currentStep.value} at row ${this.currentStep.row + 1}, column ${this.currentStep.col + 1}.`;
        }
        if (this.status === 'running' && this.currentStep?.type === 'human-eliminate') {
          return `${this.currentStep.strategy}: removing ${this.currentStep.eliminated.length} candidates.`;
        }
        if (this.status === 'paused') return 'Solver paused.';
        if (this.status === 'stuck') return `${ALGORITHM_LABELS[this.selectedAlgorithm] || 'The solver'} is stuck and needs more strategies.`;
        if (this.status === 'solved') return `Solved by ${ALGORITHM_LABELS[this.selectedAlgorithm] || 'the solver'}.`;
        return 'Preparing solver.';
      },

      algorithmBadgeLabel() {
        const badges = {
          backtracking: '⬡ Backtracking',
          mrv: '⬡ Backtracking + MRV',
          constraint: '⬡ Constraint Propagation',
          human: '⬡ Human Logic',
          'human-v2': '⬡ Human Logic v2',
        };
        return badges[this.selectedAlgorithm] || this.selectedAlgorithm;
      },

      elapsedText() {
        const total = this._elapsedMs + (this._runStartTime ? Date.now() - this._runStartTime : 0);
        return (total / 1000).toFixed(2) + 's';
      },

      computeText() {
        return (this._computeDurationMs / 1000).toFixed(3) + 's';
      },

      subtitleText() {
        const labels = {
          backtracking: 'Backtracking DFS Visualizer',
          mrv: 'Backtracking + MRV Visualizer',
          constraint: 'Constraint Propagation Visualizer',
          human: 'Human Logic Visualizer',
          'human-v2': 'Human Logic v2 Visualizer',
        };
        return labels[this.selectedAlgorithm] || 'Algorithm Visualizer';
      },

      isCurrentCell(row, col) {
        return this.currentStep?.row === row && this.currentStep?.col === col;
      },

      isBacktracked(row, col) {
        return this.isCurrentCell(row, col) && this.currentStep?.type === 'backtrack';
      },

      cellCandidates(row, col) {
        if (!this.currentSnapshot) return null;
        const cell = this.currentSnapshot[row]?.[col];
        if (!cell || cell.length <= 1) return null;
        return cell;
      },

      isPlacingCell(row, col) {
        return this.isCurrentCell(row, col) && (this.currentStep?.type === 'place' || this.currentStep?.type === 'propagate' || this.currentStep?.type === 'human-place');
      },

      isGuessCell(row, col) {
        return this.isCurrentCell(row, col) && this.currentStep?.type === 'guess';
      },

      isContradictionCell(row, col) {
        return this.isCurrentCell(row, col) && this.currentStep?.type === 'contradiction';
      },

      statLabelPrimary() {
        if (this.selectedAlgorithm === 'constraint') return '✦ Eliminations';
        if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2') return '✦ Deductions';
        return '✦ Placed';
      },

      statLabelSecondary() {
        if (this.selectedAlgorithm === 'constraint') return '↯ Guesses';
        if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2') return '↯ Eliminations';
        return '↩ Backtracks';
      },

      statValuePrimary() {
        if (this.selectedAlgorithm === 'constraint') return this.eliminationCount;
        if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2') return this.placedCount;
        return this.placedCount;
      },

      statValueSecondary() {
        if (this.selectedAlgorithm === 'constraint') return this.guessCount;
        if (this.selectedAlgorithm === 'human' || this.selectedAlgorithm === 'human-v2') return this.eliminationCount;
        return this.backtrackedCount;
      },

      cellKind(row, col) {
        if (this.locked[row]?.[col]) return 'given';
        if (this.board[row]?.[col]) return 'generated';
        return 'empty';
      },

      _applyNextStep() {
        if (this.stepIndex >= this.steps.length) {
          this._completeSolve();
          return;
        }

        const step = this.steps[this.stepIndex];
        if (step.type === 'place' || step.type === 'backtrack') {
          if (step.type === 'place') this.placedCount++;
          else this.backtrackedCount++;
          const nextRow = [...this.board[step.row]];
          nextRow[step.col] = step.type === 'place' ? step.value : 0;
          this.board = this.board.map((row, index) => index === step.row ? nextRow : row);
        } else {
          if (step.type === 'propagate') this.eliminationCount += step.eliminated.length;
          else if (step.type === 'guess') this.guessCount++;
          else if (step.type === 'human-place') {
            this.placedCount++;
            this.eliminationCount += step.eliminated.length;
          } else if (step.type === 'human-eliminate') {
            this.eliminationCount += step.eliminated.length;
          }
          this.currentSnapshot = step.snapshot;
          this.board = step.snapshot.map(row => row.map(cell => cell.length === 1 ? cell[0] : 0));
        }

        this.currentStep = step;
        this.stepIndex++;
        if (this.stepIndex >= this.steps.length) {
          this._completeSolve();
        } else {
          this._flushTimer();
        }
      },

      _buildTrace(board) {
        const build = TRACE_BUILDERS[this.selectedAlgorithm] || createBacktrackingTrace;
        return build(board);
      },

      _measureTrace(board) {
        const now = typeof performance !== 'undefined' && performance.now
          ? () => performance.now()
          : () => Date.now();
        const started = now();
        const trace = this._buildTrace(board);
        return { trace, durationMs: Math.max(now() - started, 0) };
      },

      _stopPlayback() {
        clearInterval(this._interval);
        this._interval = null;
      },

      _flushTimer(now = Date.now()) {
        if (this._runStartTime === null) return;
        this._elapsedMs += now - this._runStartTime;
        this._runStartTime = now;
      },

      _stopTimer(now = Date.now()) {
        if (this._runStartTime === null) return;
        this._elapsedMs += now - this._runStartTime;
        this._runStartTime = null;
      },

      _completeSolve() {
        this._stopPlayback();
        this._stopTimer();
        if (this.solvedBoard) this.board = this.solvedBoard.map(row => [...row]);
        this.currentSnapshot = null;
        this.status = this.solvedBoard ? 'solved' : 'stuck';
      },
    };
  }

  return {
    PLAYBACK_SPEEDS,
    sudokuGame,
  };
});
