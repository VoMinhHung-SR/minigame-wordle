const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

let answers = [];
let allowed = new Set();
let answer = '';
let currentRow = 0;
let currentCol = 0;
let gameOver = false;
let tiles = [];
let keyMap = {};
let stats = { played: 0, wins: 0, streak: 0, totalTries: 0 };

async function loadWords() {
  const [answersRes, allowedRes] = await Promise.all([
    fetch('answers.json'),
    fetch('allowed.json')
  ]);
  if (!answersRes.ok) throw new Error('Failed to load answers.json');
  if (!allowedRes.ok) throw new Error('Failed to load allowed.json');
  answers = await answersRes.json();
  allowed = new Set(await allowedRes.json());
}

function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  tiles = [];
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = 'row-' + r;
    const rowTiles = [];
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.id = `t${r}${c}`;
      row.appendChild(tile);
      rowTiles.push(tile);
    }
    board.appendChild(row);
    tiles.push(rowTiles);
  }
}

function buildKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = '';
  keyMap = {};
  KEYBOARD_ROWS.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    row.forEach((k) => {
      const btn = document.createElement('button');
      btn.className = 'key' + (k.length > 1 ? ' wide' : '');
      btn.textContent = k;
      btn.dataset.key = k;
      btn.addEventListener('click', () => handleKey(k));
      rowEl.appendChild(btn);
      if (k.length === 1) keyMap[k] = btn;
    });
    kb.appendChild(rowEl);
  });
}

function setMessage(msg, isError) {
  const el = document.getElementById('message');
  el.textContent = msg;
  el.style.color = isError ? '#e24b4a' : 'var(--color-text-primary)';
}

function handleKey(key) {
  if (gameOver) return;
  if (key === '⌫' || key === 'BACKSPACE') {
    if (currentCol > 0) {
      currentCol--;
      tiles[currentRow][currentCol].textContent = '';
      tiles[currentRow][currentCol].classList.remove('filled');
    }
    return;
  }
  if (key === 'ENTER') {
    submitGuess();
    return;
  }
  if (/^[A-Z]$/.test(key) && currentCol < 5) {
    tiles[currentRow][currentCol].textContent = key;
    tiles[currentRow][currentCol].classList.add('filled');
    animateTile(tiles[currentRow][currentCol], 'pop');
    currentCol++;
  }
}

function animateTile(tile, cls) {
  tile.classList.remove(cls);
  void tile.offsetWidth;
  tile.classList.add(cls);
  tile.addEventListener('animationend', () => tile.classList.remove(cls), { once: true });
}

function submitGuess() {
  if (currentCol < 5) {
    shakeRow(currentRow);
    setMessage('Not enough letters', true);
    return;
  }
  const guess = tiles[currentRow].map((t) => t.textContent).join('');
  if (!allowed.has(guess)) {
    shakeRow(currentRow);
    setMessage('Not in word list', true);
    return;
  }
  setMessage('');
  const result = evaluateGuess(guess, answer);
  revealRow(currentRow, result, guess, () => {
    updateKeyboard(guess, result);
    if (result.every((r) => r === 'correct')) {
      gameOver = true;
      const tries = currentRow + 1;
      stats.played++;
      stats.wins++;
      stats.streak++;
      stats.totalTries += tries;
      updateStats();
      setTimeout(() => {
        bounceRow(currentRow);
        setMessage(['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'][currentRow]);
        document.getElementById('new-game-btn').style.display = 'block';
      }, 400);
      return;
    }
    currentRow++;
    currentCol = 0;
    if (currentRow === 6) {
      gameOver = true;
      stats.played++;
      stats.streak = 0;
      updateStats();
      setTimeout(() => {
        setMessage(`Answer: ${answer}`, false);
        document.getElementById('new-game-btn').style.display = 'block';
      }, 400);
    }
  });
}

function evaluateGuess(guess, target) {
  const result = Array(5).fill('absent');
  const ansArr = target.split('');
  const used = Array(5).fill(false);
  for (let i = 0; i < 5; i++) {
    if (guess[i] === ansArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === ansArr[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

function revealRow(rowIdx, result, guess, cb) {
  const row = tiles[rowIdx];
  let done = 0;
  row.forEach((tile, i) => {
    setTimeout(() => {
      tile.style.transition = 'background 0s, border-color 0s';
      setTimeout(() => {
        tile.dataset.state = result[i];
        tile.classList.add('flip');
        tile.addEventListener(
          'animationend',
          () => {
            tile.classList.remove('flip');
            done++;
            if (done === 5) cb();
          },
          { once: true }
        );
      }, 250);
    }, i * 300);
  });
}

function shakeRow(rowIdx) {
  tiles[rowIdx].forEach((tile) => animateTile(tile, 'shake'));
}

function bounceRow(rowIdx) {
  tiles[rowIdx].forEach((tile, i) => {
    setTimeout(() => {
      tile.style.animation = 'bounce 0.5s ease';
      tile.addEventListener('animationend', () => (tile.style.animation = ''), { once: true });
    }, i * 80);
  });
}

function updateKeyboard(guess, result) {
  const priority = { correct: 3, present: 2, absent: 1 };
  guess.split('').forEach((letter, i) => {
    const btn = keyMap[letter];
    if (!btn) return;
    const cur = btn.dataset.state;
    if (!cur || priority[result[i]] > (priority[cur] || 0)) btn.dataset.state = result[i];
  });
}

function updateStats() {
  document.getElementById('stat-played').textContent = stats.played;
  document.getElementById('stat-win').textContent = stats.wins;
  document.getElementById('stat-streak').textContent = stats.streak;
  const avg = stats.wins ? (stats.totalTries / stats.wins).toFixed(1) : '–';
  document.getElementById('stat-avg').textContent = avg;
}

function startGame() {
  answer = answers[Math.floor(Math.random() * answers.length)];
  currentRow = 0;
  currentCol = 0;
  gameOver = false;
  buildBoard();
  buildKeyboard();
  setMessage('');
  document.getElementById('new-game-btn').style.display = 'none';
}

function bindEvents() {
  document.getElementById('new-game-btn').addEventListener('click', startGame);
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toUpperCase();
    if (k === 'ENTER' || k === 'BACKSPACE' || /^[A-Z]$/.test(k)) {
      e.preventDefault();
      handleKey(k);
    }
  });
}

async function init() {
  try {
    await loadWords();
    bindEvents();
    startGame();
  } catch (err) {
    console.error(err);
    setMessage('Could not load word list', true);
  }
}

init();
