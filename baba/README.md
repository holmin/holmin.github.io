# BABA IS 1V1

A 1v1 twist on Baba Is You. Two characters share one grid and both can push the
word tiles — every rule change applies to **both** players. First to trigger a
win condition takes the round.

## Run

Open `index.html` in a browser. No build, no server, no dependencies.

## Controls

- 🐰 **BABA** (player 1): `W` `A` `S` `D`
- 🐶 **KEKE** (player 2): arrow keys
- `R`: restart

Both players move at the same time, one grid step per keypress. Rules are
re-parsed and win/lose conditions resolved after every step.

## Rules of the engine

Word tiles form rules in rows (left→right) or columns (top→bottom):
`NOUN IS PROPERTY`, with nouns `BABA KEKE WALL ROCK FLAG WATER` and properties
`YOU WIN STOP PUSH SINK DEFEAT`. Word tiles are always `PUSH`.

- `X IS YOU` — only `YOU` characters can move and win. Remove the opponent's
  `IS YOU` to freeze them. `X IS STOP` also freezes a character.
- `X IS WIN` — a `YOU` character touching an `X` wins (so `KEKE IS WIN` means
  BABA wins by touching KEKE).
- `X IS DEFEAT` — `X` is destroyed when it overlaps anything; if `X` is a
  character, that player loses.
- `WATER IS SINK` — anything entering the water is destroyed.
- `STOP` blocks movement (unless the object is also `PUSH`, e.g. rocks);
  objects without `STOP` can be walked through/overlapped.

## Files

- `index.html` — page, styling, sidebar
- `game.js` — engine (pure logic, also loadable in Node) + DOM UI
- `test.js` — engine tests: `node test.js`
