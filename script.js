// ===== CONSTANTS =====
const MAX_POINTS = 1000;

// ===== DIFFICULTY CONFIG =====
const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Fácil',
    totalQuestions: 10,
    timePerQuestion: 20 // seconds
  },
  medium: {
    name: 'Médio',
    totalQuestions: 20,
    timePerQuestion: 40 // seconds
  },
  hard: {
    name: 'Difícil',
    totalQuestions: 30,
    timePerQuestion: 70 // seconds (1 min 10s)
  }
};

// ===== BRAILLE MAPPINGS =====
// Braille Unicode: U+2800 + bit pattern
// Standard Braille numbering (dots 1-6)
const BRAILLE_NUMBERS = {
  '1': '⠼⠁',
  '2': '⠼⠃',
  '3': '⠼⠉',
  '4': '⠼⠙',
  '5': '⠼⠑',
  '6': '⠼⠋',
  '7': '⠼⠛',
  '8': '⠼⠓',
  '9': '⠼⠊',
  '0': '⠼⠚'
};

const BRAILLE_OPERATORS = {
  '+': '⠖',
  '−': '⠤',
  '×': '⠦'
};

// ===== DOM ELEMENTS =====
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');

const bestScoreStart = document.getElementById('best-score-start');
const questionCounter = document.getElementById('question-counter');
const streakDisplay = document.getElementById('streak-display');
const scoreValue = document.getElementById('score-value');
const timerBar = document.getElementById('timer-bar');
const questionDisplay = document.getElementById('question-display');
const feedbackEl = document.getElementById('feedback');
const answerBtns = document.querySelectorAll('.answer-btn');

const finalScore = document.getElementById('final-score');
const finalCorrect = document.getElementById('final-correct');
const finalStreak = document.getElementById('final-streak');
const newRecordBadge = document.getElementById('new-record-badge');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnStart = document.getElementById('btn-start');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');

const brailleModal = document.getElementById('braille-modal');
const btnBrailleTable = document.getElementById('btn-braille-table');
const btnCloseModal = document.getElementById('btn-close-modal');
const brailleNumbersGrid = document.getElementById('braille-numbers');
const brailleOperatorsGrid = document.getElementById('braille-operators');

// ===== GAME STATE =====
let currentQuestion = 0;
let score = 0;
let correctCount = 0;
let streak = 0;
let maxStreak = 0;
let bestScore = 0;
let timerInterval = null;
let timeRemaining = 0;
let isAnswering = false;
let currentAnswer = null;
let currentSymbols = [];
let selectedDifficulty = 'easy';
let totalQuestions = DIFFICULTY_CONFIG.easy.totalQuestions;
let timePerQuestion = DIFFICULTY_CONFIG.easy.timePerQuestion;

// ===== INITIALIZATION =====
function init() {
  // Load best score from localStorage
  bestScore = parseInt(localStorage.getItem('brailleBestScore')) || 0;
  bestScoreStart.textContent = bestScore;

  // Build Braille table
  buildBrailleTable();

  // Event listeners
  btnStart.addEventListener('click', startGame);
  btnPlayAgain.addEventListener('click', startGame);
  btnBrailleTable.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);

  // Difficulty buttons
  difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => selectDifficulty(btn));
  });

  // Close modal when clicking outside
  brailleModal.addEventListener('click', (e) => {
    if (e.target === brailleModal) closeModal();
  });

  // Answer buttons
  answerBtns.forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn));
  });

  // Keyboard support (1-4 keys)
  document.addEventListener('keydown', (e) => {
    if (!gameScreen.classList.contains('active')) return;
    if (isAnswering) return;
    const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3 };
    if (keyMap[e.key] !== undefined) {
      answerBtns[keyMap[e.key]].click();
    }
  });
}

// ===== DIFFICULTY SELECTION =====
function selectDifficulty(btn) {
  // Remove selected from all
  difficultyBtns.forEach(b => b.classList.remove('selected'));

  // Add selected to clicked
  btn.classList.add('selected');

  // Update game state
  selectedDifficulty = btn.dataset.difficulty;
  totalQuestions = DIFFICULTY_CONFIG[selectedDifficulty].totalQuestions;
  timePerQuestion = DIFFICULTY_CONFIG[selectedDifficulty].timePerQuestion;
}

// ===== BRAILLE TABLE =====
function buildBrailleTable() {
  // Numbers
  brailleNumbersGrid.innerHTML = '';
  for (let i = 1; i <= 9; i++) {
    const item = document.createElement('div');
    item.className = 'braille-item';
    item.id = `braille-num-${i}`;
    item.innerHTML = `<span class="braille-symbol">${BRAILLE_NUMBERS[i]}</span><span class="braille-value">${i}</span>`;
    brailleNumbersGrid.appendChild(item);
  }
  // Zero
  const zeroItem = document.createElement('div');
  zeroItem.className = 'braille-item';
  zeroItem.id = 'braille-num-0';
  zeroItem.innerHTML = `<span class="braille-symbol">${BRAILLE_NUMBERS['0']}</span><span class="braille-value">0</span>`;
  brailleNumbersGrid.appendChild(zeroItem);

  // Operators
  brailleOperatorsGrid.innerHTML = '';
  for (const [op, braille] of Object.entries(BRAILLE_OPERATORS)) {
    const item = document.createElement('div');
    item.className = 'braille-item';
    item.id = `braille-op-${op === '−' ? 'minus' : op === '×' ? 'times' : 'plus'}`;
    item.innerHTML = `<span class="braille-symbol">${braille}</span><span class="braille-value">${op}</span>`;
    brailleOperatorsGrid.appendChild(item);
  }
}

function highlightBrailleSymbols(symbols) {
  // Clear all highlights
  document.querySelectorAll('.braille-item.highlighted').forEach(el => {
    el.classList.remove('highlighted');
  });

  // Highlight current symbols
  symbols.forEach(sym => {
    let el = null;
    if (BRAILLE_NUMBERS[sym] !== undefined) {
      el = document.getElementById(`braille-num-${sym}`);
    } else if (sym === '+') {
      el = document.getElementById('braille-op-plus');
    } else if (sym === '−') {
      el = document.getElementById('braille-op-minus');
    } else if (sym === '×') {
      el = document.getElementById('braille-op-times');
    }
    if (el) el.classList.add('highlighted');
  });
}

// ===== QUESTION GENERATION =====
function generateQuestion() {
  const operations = ['+', '−', '×'];
  const op = operations[Math.floor(Math.random() * operations.length)];

  let a, b, answer;

  if (op === '×') {
    // Multiplication: factors 1-5
    a = Math.floor(Math.random() * 5) + 1;
    b = Math.floor(Math.random() * 5) + 1;
    answer = a * b;
  } else {
    // Addition/Subtraction: numbers 1-9
    a = Math.floor(Math.random() * 9) + 1;
    b = Math.floor(Math.random() * 9) + 1;
    if (op === '−') {
      // Ensure non-negative result
      if (a < b) [a, b] = [b, a];
      answer = a - b;
    } else {
      answer = a + b;
    }
  }

  // Generate 4 options (1 correct, 3 wrong)
  const options = new Set([answer]);
  while (options.size < 4) {
    let wrong;
    if (op === '×') {
      wrong = Math.floor(Math.random() * 25) + 1;
    } else if (op === '+') {
      wrong = Math.floor(Math.random() * 18) + 1;
    } else {
      wrong = Math.floor(Math.random() * 9) + 1;
    }
    if (wrong !== answer) options.add(wrong);
  }

  // Shuffle options
  const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

  return {
    a,
    b,
    op,
    answer,
    options: shuffledOptions
  };
}

function displayQuestion(question) {
  // Build Braille display
  const brailleA = BRAILLE_NUMBERS[question.a.toString()];
  const brailleB = BRAILLE_NUMBERS[question.b.toString()];
  const brailleOp = BRAILLE_OPERATORS[question.op];

  questionDisplay.innerHTML = `
    <span class="braille-char">${brailleA}</span>
    <span class="braille-op">${brailleOp}</span>
    <span class="braille-char">${brailleB}</span>
  `;

  // Set answer buttons
  answerBtns.forEach((btn, i) => {
    btn.textContent = question.options[i];
    btn.dataset.value = question.options[i];
    btn.classList.remove('correct', 'wrong');
    btn.disabled = false;
  });

  // Highlight symbols in the table
  currentSymbols = [question.a.toString(), question.b.toString(), question.op];
  highlightBrailleSymbols(currentSymbols);
}

// ===== TIMER =====
function startTimer() {
  timeRemaining = timePerQuestion;
  timerBar.style.width = '100%';
  timerBar.classList.remove('warning', 'danger');

  timerInterval = setInterval(() => {
    timeRemaining -= 0.1;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      clearInterval(timerInterval);
      handleTimeout();
      return;
    }

    const percentage = (timeRemaining / timePerQuestion) * 100;
    timerBar.style.width = `${percentage}%`;

    // Color changes
    if (percentage <= 30) {
      timerBar.classList.add('danger');
      timerBar.classList.remove('warning');
    } else if (percentage <= 60) {
      timerBar.classList.add('warning');
      timerBar.classList.remove('danger');
    } else {
      timerBar.classList.remove('warning', 'danger');
    }
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ===== GAME FLOW =====
function startGame() {
  // Reset state
  currentQuestion = 0;
  score = 0;
  correctCount = 0;
  streak = 0;
  maxStreak = 0;
  isAnswering = false;

  // Update UI
  scoreValue.textContent = '0';
  streakDisplay.textContent = '🔥 0';
  streakDisplay.classList.remove('burning');
  feedbackEl.textContent = '';
  feedbackEl.classList.remove('show', 'correct-feedback', 'wrong-feedback');

  // Switch screens
  startScreen.classList.remove('active');
  endScreen.classList.remove('active');
  gameScreen.classList.add('active');

  // Start first question
  nextQuestion();
}

function nextQuestion() {
  if (currentQuestion >= totalQuestions) {
    endGame();
    return;
  }

  currentQuestion++;
  isAnswering = false;
  questionCounter.textContent = `${currentQuestion}/${totalQuestions}`;

  // Generate and display question
  const question = generateQuestion();
  currentAnswer = question.answer;
  displayQuestion(question);

  // Clear feedback
  feedbackEl.textContent = '';
  feedbackEl.classList.remove('show', 'correct-feedback', 'wrong-feedback');

  // Start timer
  startTimer();
}

function handleAnswer(btn) {
  if (isAnswering) return;
  isAnswering = true;
  stopTimer();

  const selectedValue = parseInt(btn.dataset.value);
  const isCorrect = selectedValue === currentAnswer;

  // Disable all buttons
  answerBtns.forEach(b => b.disabled = true);

  // Calculate points based on remaining time
  const pointsEarned = Math.round(MAX_POINTS * (timeRemaining / timePerQuestion));

  if (isCorrect) {
    // Mark correct button
    btn.classList.add('correct');
    score += pointsEarned;
    correctCount++;
    streak++;
    maxStreak = Math.max(maxStreak, streak);

    // Update streak display
    streakDisplay.textContent = `🔥 ${streak}`;
    streakDisplay.classList.add('burning');

    // Feedback message
    feedbackEl.textContent = `✅ Correto! +${pointsEarned} pontos`;
    feedbackEl.classList.add('correct-feedback');
  } else {
    // Mark wrong button and show correct one
    btn.classList.add('wrong');
    answerBtns.forEach(b => {
      if (parseInt(b.dataset.value) === currentAnswer) {
        b.classList.add('correct');
      }
    });

    // Reset streak
    streak = 0;
    streakDisplay.textContent = '🔥 0';
    streakDisplay.classList.remove('burning');

    // Feedback message
    feedbackEl.textContent = `❌ Errado! A resposta era ${currentAnswer}`;
    feedbackEl.classList.add('wrong-feedback');
  }

  // Update score
  scoreValue.textContent = score;

  // Show feedback
  feedbackEl.classList.add('show');

  // Next question after delay
  setTimeout(() => {
    nextQuestion();
  }, 1500);
}

function handleTimeout() {
  if (isAnswering) return;
  isAnswering = true;

  // Disable all buttons
  answerBtns.forEach(b => b.disabled = true);

  // Show correct answer
  answerBtns.forEach(b => {
    if (parseInt(b.dataset.value) === currentAnswer) {
      b.classList.add('correct');
    }
  });

  // Reset streak
  streak = 0;
  streakDisplay.textContent = '🔥 0';
  streakDisplay.classList.remove('burning');

  // Feedback message
  feedbackEl.textContent = `⏰ Tempo esgotado! A resposta era ${currentAnswer}`;
  feedbackEl.classList.add('wrong-feedback', 'show');

  // Next question after delay
  setTimeout(() => {
    nextQuestion();
  }, 1500);
}

// ===== END GAME =====
function endGame() {
  stopTimer();

  // Update end screen
  finalScore.textContent = score;
  finalCorrect.textContent = `${correctCount}/${totalQuestions}`;
  finalStreak.textContent = maxStreak;

  // Check for new record
  const isNewRecord = score > bestScore;
  if (isNewRecord) {
    bestScore = score;
    localStorage.setItem('brailleBestScore', bestScore.toString());
    bestScoreStart.textContent = bestScore;
    newRecordBadge.classList.remove('hidden');
  } else {
    newRecordBadge.classList.add('hidden');
  }

  // Switch screens
  gameScreen.classList.remove('active');
  endScreen.classList.add('active');
}

// ===== MODAL =====
function openModal() {
  brailleModal.classList.add('active');
}

function closeModal() {
  brailleModal.classList.remove('active');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', init);