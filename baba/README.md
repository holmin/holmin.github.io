# BABA VS KEKE

A digital implementation of the **Baba vs. Keke** board-game rules
(2 players, 5×5 board, word-tile rules). Pure HTML/JS, no dependencies.

## Play

Live at https://holmin.github.io/baba/ — or open `index.html` locally.

## Rules implemented

- **Setup:** 5×5 board. Baba bottom-left, Keke top-right, rocks in the other
  two corners, flag in the center. Printed rules: `BABA IS YOU` (P1),
  `KEKE IS YOU` (P2) — permanent.
- **Scenario:** DEFAULT + WORLD 1: LEVEL 1 ("More Rock, More Flag") — the
  level-tile supply is 2× `IS WIN`, 2× `ROCK`, 2× `FLAG`.
- **Turns:** players alternate; the very first turn of a game has **1 action**,
  every later turn **2 actions**. An action is a MOVE or a PLACE.
- **MOVE:** move one of your YOU things one space orthogonally. Everything is
  always PUSH; a pushed thing needs an empty cell behind it (no chain pushing,
  no pushing off the board — the whole move fails otherwise). Hold **Shift**
  while moving to also **PULL** the contents of the cell you left. A YOU thing
  may enter the cell of a WIN thing (and vice versa) — they stack.
- **PLACE:** place a level tile from the supply into an empty cell orthogonally
  adjacent to one of your YOU things (click tile or keys 1–6, then click a
  green cell).
- **Rules:** a noun tile forms a rule with a property tile directly to its
  right or below it (its arrows). A noun can point at two properties; a
  property can have two nouns pointing at it. Placed `IS YOU` tiles belong to
  the player who placed them.
- **Win:** when a thing that is YOU shares a space with a different thing that
  is WIN, the YOU thing's controller wins. If both players' YOU things share
  with WIN simultaneously, the player who last acted wins. Being both YOU and
  WIN does not auto-win.
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

- Move: on-screen D-pad, arrow keys, or WASD; PULL toggle button or Shift = also pull;
  Tab or tap a thing to select which of your YOU things moves
- Place: tap a supply tile (or keys 1–6), then tap a highlighted cell; Esc cancels
- C = challenge · R = new game · N = new scenario · **U = undo last action**

## Files

- `index.html` — page, styling, sidebar
- `game.js` — engine (pure logic, loadable in Node) + DOM UI
- `test.js` — engine tests: `node test.js`
