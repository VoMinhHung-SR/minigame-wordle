const STORAGE_KEYS = {
  saveStats: 'wordle-save-stats',
  stats: 'wordle-stats',
  darkTheme: 'wordle-dark-theme',
  hardMode: 'wordle-hard-mode',
  onscreenKeyboard: 'wordle-onscreen-keyboard-only'
};

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
let saveStatsEnabled = false;
let darkThemeEnabled = false;
let hardModeEnabled = false;
let onscreenKeyboardOnly = false;
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
      btn.className = 'key' + (k === 'ENTER' ? ' wide' : '');
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
  el.classList.toggle('error', !!isError);
}

function loadSettings() {
  saveStatsEnabled = localStorage.getItem(STORAGE_KEYS.saveStats) === 'true';
  hardModeEnabled = localStorage.getItem(STORAGE_KEYS.hardMode) === 'true';
  onscreenKeyboardOnly = localStorage.getItem(STORAGE_KEYS.onscreenKeyboard) !== 'false';

  const savedDark = localStorage.getItem(STORAGE_KEYS.darkTheme);
  if (savedDark === 'true' || savedDark === 'false') {
    darkThemeEnabled = savedDark === 'true';
  } else {
    const legacy = localStorage.getItem('wordle-theme');
    if (legacy === 'dark') darkThemeEnabled = true;
    else if (legacy === 'light') darkThemeEnabled = false;
    else darkThemeEnabled = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

function loadStatsFromStorage() {
  if (!saveStatsEnabled) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stats);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.played === 'number') stats.played = parsed.played;
    if (typeof parsed.wins === 'number') stats.wins = parsed.wins;
    if (typeof parsed.streak === 'number') stats.streak = parsed.streak;
    if (typeof parsed.totalTries === 'number') stats.totalTries = parsed.totalTries;
  } catch (_) {
    /* ignore corrupt data */
  }
}

function persistStats() {
  if (!saveStatsEnabled) return;
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

function setSaveStatsEnabled(enabled) {
  saveStatsEnabled = enabled;
  if (enabled) {
    localStorage.setItem(STORAGE_KEYS.saveStats, 'true');
    loadStatsFromStorage();
  } else {
    localStorage.removeItem(STORAGE_KEYS.saveStats);
  }
  syncSettingsToggles();
  updateStats();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', darkThemeEnabled ? 'dark' : 'light');
}

function setDarkTheme(enabled) {
  darkThemeEnabled = enabled;
  localStorage.setItem(STORAGE_KEYS.darkTheme, String(enabled));
  applyTheme();
  syncSettingsToggles();
}

function setHardMode(enabled) {
  hardModeEnabled = enabled;
  localStorage.setItem(STORAGE_KEYS.hardMode, String(enabled));
  syncSettingsToggles();
}

function setOnscreenKeyboardOnly(enabled) {
  onscreenKeyboardOnly = enabled;
  localStorage.setItem(STORAGE_KEYS.onscreenKeyboard, String(enabled));
  syncSettingsToggles();
}

function syncSettingsToggles() {
  const hard = document.getElementById('setting-hard-mode');
  const dark = document.getElementById('setting-dark-theme');
  const keyboard = document.getElementById('setting-onscreen-keyboard');
  const save = document.getElementById('setting-save-stats');
  if (hard) hard.checked = hardModeEnabled;
  if (dark) dark.checked = darkThemeEnabled;
  if (keyboard) keyboard.checked = onscreenKeyboardOnly;
  if (save) save.checked = saveStatsEnabled;
}

function initSettingsPanel() {
  syncSettingsToggles();
  document.getElementById('setting-hard-mode')?.addEventListener('change', (e) => {
    setHardMode(e.target.checked);
  });
  document.getElementById('setting-dark-theme')?.addEventListener('change', (e) => {
    setDarkTheme(e.target.checked);
  });
  document.getElementById('setting-onscreen-keyboard')?.addEventListener('change', (e) => {
    setOnscreenKeyboardOnly(e.target.checked);
  });
  document.getElementById('setting-save-stats')?.addEventListener('change', (e) => {
    setSaveStatsEnabled(e.target.checked);
  });
}

function getHardModeRules() {
  const locked = Array(5).fill(null);
  const mustInclude = new Set();
  for (let r = 0; r < currentRow; r++) {
    for (let c = 0; c < 5; c++) {
      const tile = tiles[r][c];
      const letter = tile.textContent;
      const state = tile.dataset.state;
      if (!letter || !state) continue;
      if (state === 'correct') locked[c] = letter;
      if (state === 'present') mustInclude.add(letter);
    }
  }
  return { locked, mustInclude: [...mustInclude] };
}

function validateHardMode(guess) {
  const { locked, mustInclude } = getHardModeRules();
  for (let c = 0; c < 5; c++) {
    if (locked[c] && guess[c] !== locked[c]) return false;
  }
  for (const letter of mustInclude) {
    if (!guess.includes(letter)) return false;
  }
  return true;
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
  if (hardModeEnabled && !validateHardMode(guess)) {
    shakeRow(currentRow);
    setMessage('Hard mode: use all revealed hints', true);
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
  const playedEl = document.getElementById('stat-played');
  const winEl = document.getElementById('stat-win');
  const streakEl = document.getElementById('stat-streak');
  const avgEl = document.getElementById('stat-avg');
  if (playedEl) playedEl.textContent = stats.played;
  if (winEl) winEl.textContent = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  if (streakEl) streakEl.textContent = stats.streak;
  if (avgEl) avgEl.textContent = stats.wins ? (stats.totalTries / stats.wins).toFixed(1) : '–';
  persistStats();
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
    if (isOverlayBlockingInput()) return;
    if (onscreenKeyboardOnly) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toUpperCase();
    if (k === 'ENTER' || k === 'BACKSPACE' || /^[A-Z]$/.test(k)) {
      e.preventDefault();
      handleKey(k);
    }
  });
}

async function init() {
  loadSettings();
  applyTheme();
  initSettingsPanel();
  initUI();
  loadStatsFromStorage();
  updateStats();
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
