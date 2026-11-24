# BABA VS KEKE

A digital implementation of the **Baba vs. Keke** board-game rules
(2 players, 5×5 board, word-tile rules). Pure HTML/JS, no dependencies.

## Play

Live at https://holmin.github.io/baba/ — or open `index.html` locally.

## Rules implemented

- **Setup:** 5×5 board with the World 1 "The Plains" river drawn on it — matrix
  notation (row,col) cells (1,1),(2,1),(2,2),(2,3),(3,3),(4,3),(4,4),(4,5),(5,5).
  River cells identify as **WATER** (terrain for future rules such as MELT/SINK;
  not blocking now). Baba bottom-left, Keke top-right, rocks in the other two
  corners, flag in the center. Default rules (shown as `(default)`): `ALL IS PUSH`,
  `BABA IS P1`, `KEKE IS P2` — permanent. **2–4 players:** the 👥 buttons drop
  players in/out of the same live game; new players (ME 🐱 = P3, FOFO 🐑 = P4)
  spawn as close as possible to their home corner (the corner itself if free,
  else the closest free cell), each with a default `IS Pn`.
- **Scenario:** DEFAULT + WORLD 1: LEVEL 1 ("More Rock, More Flag") — the
  level-tile supply is 2× `IS WIN`, 2× `ROCK`, 2× `FLAG`.
- **Turns:** players alternate; the very first turn of a game has **1 action**,
  every later turn **2 actions**. An action is a MOVE or a PLACE.
- **MOVE:** move one of your YOU things one space orthogonally. `ALL IS PUSH` —
  pushing shoves the whole row/column of things along (chain push); only the
  board edge stops a push, and then the whole move fails. Hold **Shift** (or the
  PULL toggle) while moving to also **PULL** — exactly one thing from the cell
  you left is dragged into the vacated cell. A YOU thing may enter the cell of a
  WIN thing (and vice versa) — they stack.
- **PLACE:** place a level tile from the supply into an empty cell orthogonally
  adjacent to one of your YOU things (click tile or keys 1–6, then click a
  green cell).
- **Rules:** a noun tile forms a rule with a property tile directly to its
  right or below it (its arrows). A noun can point at two properties; a
  property can have two nouns pointing at it. Placed `IS YOU` tiles belong to
  the player who placed them.
- **Win:** when an object that is YOU shares a space with a different object
  that is WIN, the YOU object's controller wins. Word tiles never carry
  properties — touching the word "FLAG" does not win; you must touch the actual
  flag object (videogame-faithful). If both players' YOU things share with WIN
  simultaneously, the player who last acted wins. Being both YOU and WIN does
  not auto-win.
- **Challenge (C):** if you think the game is unwinnable, skip your turn to
  challenge — your opponent then gets 10 actions to win; if they fail, you win.
- **Game end:** a YOU+WIN share, a resolved challenge, or a player who cannot
  take their actions (the other player wins).
- **Scoring:** winner of a game gets a game point; first to the target
  (1, or 2 if a clock token was spent for best-of-3) takes the **scenario
  point**. Most scenario points after 5 scenarios takes the **world point**.

House rule not enforced digitally: the board must look different at the end of
your turn than at its start (no no-op / exact-reverse turns).

Digital extra: **undo** (U / ↩ button) reverts the last action — move, place,
challenge, clock spend — including the game/scenario result if the undone action
ended the game. History is capped at 500 actions per game.

## Controls

Works with touch or mouse/keyboard; the board scales to the screen width.

- Move: swipe the board, on-screen D-pad, arrow keys, or WASD; PULL toggle button or
  Shift = also pull; Tab or tap a thing to select which of your YOU things moves
- Place: tap a supply tile (or keys 1–6), then tap a highlighted cell; Esc cancels
- C = challenge · R = new game · N = new scenario · **Z = undo last action**
- 👥 buttons drop players in/out of the current game (2/3/4 players) — undoable with Z

## Files

- `index.html` — page, styling, sidebar
- `game.js` — engine (pure logic, loadable in Node) + DOM UI
- `test.js` — engine tests: `node test.js`
