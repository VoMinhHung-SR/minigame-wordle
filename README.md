# minigame-wordle

A lightweight, browser-based Wordle-style word game. Guess the hidden five-letter word in six tries, with tile colors showing how close each guess is.

## Features

- Classic 6×5 grid and on-screen QWERTY keyboard
- **How to Play** guide (lightbulb icon)
- **Statistics** — played games, win %, streak, average tries
- **Settings**
  - Save stats to `localStorage` (off by default)
  - Hard mode — revealed hints must be reused in later guesses
  - Dark / light theme
  - Onscreen keyboard only (optional; on by default)
- Responsive layout for desktop and mobile

## Quick start

No build step required. Serve the project root over HTTP (JSON word lists must be fetched; opening `index.html` as `file://` may fail).

```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080) (or the port your server uses).

## How to play

1. Type letters with the keyboard or on-screen keys.
2. Press **Enter** to submit a five-letter word.
3. Tiles turn **green** (correct spot), **yellow** (in word, wrong spot), or **gray** (not in word).
4. You have **six** guesses. Start a **New game** anytime after a round ends.

## Project structure

| Path | Description |
|------|-------------|
| `index.html` | Page markup, modals (How to Play, Statistics, Settings) |
| `src/index.js` | Game logic, guesses, stats, settings persistence |
| `src/ui.js` | Toolbar modals and overlay handling |
| `src/style.css` | Layout, themes, keyboard, modals |
| `answers.json` | ~2.3k solution words ([original Wordle list](https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b)) |
| `allowed.json` | ~14k words accepted as valid guesses |

## Settings & local storage

| Setting | Storage key | Default |
|---------|-------------|---------|
| Save stats | `wordle-save-stats` | `false` |
| Stats data | `wordle-stats` | — (only when save is on) |
| Hard mode | `wordle-hard-mode` | `false` |
| Dark theme | `wordle-dark-theme` | system preference on first visit |
| Onscreen keyboard only | `wordle-onscreen-keyboard-only` | `false` |

## License

This repository is provided for learning and personal use. Word lists and game concept credit the original Wordle / New York Times; this clone does not claim ownership of the Wordle brand or puzzle format.
