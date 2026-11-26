# BABA VS KEKE

A digital implementation of the **Baba vs. Keke** board-game rules
(2 players, 5×5 board, word-tile rules). Pure HTML/JS, no dependencies.

## Play

Live at https://holmin.github.io/baba/ — or open `index.html` locally.

## Rules implemented

- **Setup:** 5×5 board with the World 1 "The Plains" river drawn on it — matrix
  notation (row,col) cells (1,1),(2,1),(2,2),(2,3),(3,3),(4,3),(4,4),(4,5),(5,5).
  The river is terrain called **RIVER** (not a tile, not WATER) — future rules
  will interact with it. Rocks in two corners, flag in the center. Spawning follows
  SELECTION order (not the written order): the first character selected spawns in
  the lower-left corner (0,4), the second in the
  upper-right corner (4,0) — opposite diagonals; extra players near the other
  corners (0,0) and (4,4), then edge midpoints (2,0), (2,4) — as close as
  possible (corner if free, else nearest free cell). Default rules
  (shown as `(default)`, listed below any formed rules): `ALL IS PUSH`, plus one
  `IS PLAYER n` per active character — permanent.
- **Characters:** Sami 🐻‍❄️ and Aas 🦙 are on by default; Gaba 🐴, Ebba 🦦,
  Zaba 🐸 and Minne 🐼 can be toggled on/off (1–6 players; disabling all is allowed while
  selecting). Active players are always **PLAYER 1, PLAYER 2, … in the order listed**, so
  toggling re-ranks them (e.g. disable Sami and Aas becomes PLAYER 1). Toggling works
  mid-game (undoable with Z): enabling spawns the figure as close as possible
  to its rank's corner (corner if free, else closest free cell); disabling removes
  the figure and that character's placed property tiles.
- **Printed tiles (any PLAYER count):** permanent, unmovable tiles in the
  margin around the board — left-middle [PLAYER-1-noun] over [IS PLAYER 1] and
  bottom-middle [IS PLAYER 1] whenever at least 1 character is active, plus
  top-middle [PLAYER-2-noun][IS PLAYER 2] and right-middle [IS PLAYER 2] whenever 2+
  characters are active. They can't be interacted with otherwise, but board tiles
  pointing at them (or the printed nouns pointing into the board) form rules
  — e.g. place `IS FAST` right of the left-middle PLAYER-1 noun for `SAMI IS FAST`.
  The printed tiles have no dashed border.
- **Levels:** per the rulebook each level brings in only **two rule tiles** on
  top of the base tiles. Base supply: **2× `IS WIN`, 1× `ROCK` noun, 1× `FLAG` noun**
  (no RIVER/TEXT nouns in the base). Next to the BABA VS KEKE title are **two modifier dropdowns**
  — pick **none, one, or two different level cards** (called *modifiers*). The cards,
  in campaign order: MORE ROCK MORE FLAG (+1 ROCK noun, +1 FLAG noun), FAST,
  **RIVER IS HOT** (HOT + MELT tiles, permanent rule printed top-left),
  **FLAG IS CURIOUS** (CURIOUS tile, permanent rule), SQUARE (SQUARE noun),
  WIN HARDER (+2 WIN), **ROCK IS THIRSTY**, STRONG, **ROCK IS SCARED**, **ROCK IS SHEEP**.
  A card's permanent rule is printed as **purple tiles in the board corners** —
  first card's rule top-left, second card's rule lower-left. The **all rules (dev)**
  checkbox gives one of every tile with an **infinite supply** (placing does not
  consume a tile, destroyed tiles are not returned — so only one `IS WIN` is needed).
  In normal games placing consumes the tile, and **destroyed tiles return to the
  supply** (they can be placed again). Changing modifiers starts a new game.
- **Turns:** players alternate; the very first turn of a game has **1 action**,
  every later turn **2 actions**. An action is a MOVE or a PLACE.
- **MOVE:** move one of your YOU things one space orthogonally. `ALL IS PUSH` —
  but only **one thing** can be pushed per move, unless the mover is **STRONG**
  (then the whole chain is pushed). A STRONG push against the board edge shoves
  the thing **off the board (destroyed)**, unless it is WRAP (then it wraps).
  Without STRONG the edge stops the push and the whole move fails. Hold
  **Shift** (or the PULL toggle) while moving to also **PULL** — exactly one
  thing from the cell you left is dragged into the vacated cell (STOP/SHUT/SCARED
  things cannot be pulled — unless the puller is **STRONG**). A YOU thing may
  enter the cell of a WIN thing (and vice versa) — they stack.
- **PLACE:** place a level tile from the supply into an empty cell orthogonally
  adjacent to one of your YOU things (click tile or keys 1–9, 0, q–p, then click a
  green cell).
- **Rules:** a noun tile forms a rule with a property tile directly to its
  right or below it (its arrows). A noun can point at two properties; a
  property can have two nouns pointing at it. Placed `IS YOU` tiles belong to
  the PLAYER who placed them.
- **CURIOUS** (board-game keyword, design diary #3): when **anything enters** a
  CURIOUS thing's row or column — i.e. arrives in a cell of that line from outside
  it — it moves **1 space toward it**. Moving along the same row/column does not
  trigger it; every CURIOUS thing in the entered line reacts. **Placing a tile
  does NOT count as entering** (official FAQ): a freshly placed rule triggers
  only from the next action on. Effects cascade (a push can make a rock move,
  which makes another curious thing move, …); if resolving one action runs
  **100 steps** (infinite loop), the **player who last took an action loses**.
  One `IS CURIOUS` tile exists and is in the supply.
- **THIRSTY**: at the **end of the turn**, a THIRSTY thing that is not on the
  river moves in **one straight direction** to the **nearest river cell** in that
  direction, pushing its way there if legal. If several directions are equally
  close, the player whose turn ended chooses the destination (tap a highlighted
  water cell).
- **STRONG**: can push **several things at once** (chain push), can push things
  that cannot normally be pushed (**STOP / shut** things), and can **pull**
  things that cannot be pulled (STOP/SHUT/SCARED). A thing pushed against the
  board edge is **pushed off — destroyed** (unless it is WRAP, which wraps).
- **SCARED**: when something **enters an edge-adjacent space** (moving, being
  pushed, **or being placed** there; not diagonal), it **flees as far as possible
  in the opposite direction**. If it would have to flee in multiple directions at
  once, it is **paralyzed** and does not move. SCARED things **cannot be pulled**
  (unless the puller is STRONG).
- **SHEEP**: when a SHEEP thing **moves**, every other SHEEP thing moves the
  **same amount in the same direction**, if its destination cell is free.
- **WRAP**: when pushed or moved outside the grid, a WRAP thing wraps to the
  opposite side — unless that side is blocked. Pushing/walking toward one of the
  permanent printed tiles in the margin also wraps (they never block it).
- **FAST** (board-game keyword, diary #3): on its MOVE, a FAST thing slides **as
  many spaces as you like in a single direction** (until blocked). Because the
  printed PLAYER-1/PLAYER-2 noun tiles exist, `IS FAST` placed next to one does
  something now — the `IS FAST` tile is in the supply. Controls: press a
  direction, then tap a highlighted square as the destination (swiping is ignored
  for FAST to stay unambiguous); otherwise swiping moves one space.
- **Videogame properties** (one tile each in the supply, videogame-faithful):
  - `STOP` — cannot be entered, pushed or pulled (a YOU thing that is STOP can
    still move itself voluntarily).
  - `SHUT` — like STOP, but an `OPEN` thing sharing its cell opens it (then it
    can be pushed); `OPEN` things can be entered/stacked and are not pushed.
  - `SINK`, `DEFEAT`, `MELT` imply **not-push**: such a thing is never pushed
    (despite `ALL IS PUSH`) — you enter its cell and stack, which is what makes
    them trigger. `SINK` — destroyed when it shares a cell with anything else.
  - `HOT` + `MELT` — MELT things sharing a cell with a HOT thing are destroyed;
    a thing that is both HOT and MELT melts itself.
  - `DEFEAT` — destroys YOU things sharing its cell; a PLAYER left with no YOU
    things loses.
  - `RIVER` is a noun: the river terrain cells count as RIVER, so e.g.
    `RIVER IS WIN` makes standing on the river win, `RIVER IS DEFEAT` drowns a
    YOU thing on the river, `RIVER IS SINK` sinks river cells that have an
    object on them.
  - `TEXT` is a noun for the word tiles themselves: they carry whatever
    `TEXT IS …` rules say. `TEXT IS PLAYER n` makes all word tiles that
    player's YOU things — you can select and move them like figures (and any
    other TEXT rule, e.g. `TEXT IS WIN`, applies to the words too). TEXT rules never
    apply to the permanent printed tiles in the margin.
    Word tiles are still never the object they name: `FLAG IS WIN` does not
    make the word "FLAG" a WIN object.
  - `SQUARE` is a noun for the **property tiles that are currently part of a
    formed rule** (unlike TEXT, which covers ALL word tiles — SQUARE is dynamic:
    it changes as rules form and break). `SQUARE IS PLAYER n` lets that player
    move those property tiles (e.g. push `IS WIN` out of `ROCK IS WIN` to repeal
    the rule — once out, the tile is no longer SQUARE). `SQUARE IS WIN` makes
    active property tiles win objects.
- **Choosing which YOU moves:** when several things are YOU, you must pick one
  (tap it or Tab) before moving; only one YOU thing sharing a space with a WIN
  object is needed to win.
- **Win:** when an object that is YOU shares a space with a different object
  that is WIN, the YOU object's controller wins. Word tiles never carry
  properties — touching the word "FLAG" does not win; you must touch the actual
  flag object (videogame-faithful). If both players' YOU things share with WIN
  simultaneously, the PLAYER who last acted wins. Being both YOU and WIN does
  not auto-win.
- **Sudden death (C):** if you think the game is unwinnable, skip your turn to
  challenge — your opponent then gets 10 actions to win; if they fail, you win.
- **Game end:** a YOU+WIN share, a resolved challenge, or a PLAYER who cannot
  take their actions (the other PLAYER wins).
- **Scoring:** winner of a game gets a game point; first to the target
  (1, or 2 if a clock token was spent for best-of-3) takes the **scenario
  point**. Most scenario points after 5 scenarios takes the **world point**.

House rule not enforced digitally: the board must look different at the end of
your turn than at its start (no no-op / exact-reverse turns).

The margin ring around the 5×5 board (where the permanent printed tiles sit)
has no background color and no gridlines — only the 5×5 grid itself is drawn.

Digital extra: **undo** (U / ↩ button) reverts the last action — move, place,
challenge, clock spend — including the game/scenario result if the undone action
ended the game. History is capped at 500 actions per game.

## Controls

Works with touch or mouse/keyboard; the board scales to the screen width.

- Move: tap/click a green dashed-outline cell to walk there (the highlight never
  changes the cell background, so the river stays visible), or swipe the board,
  on-screen D-pad, arrow keys, WASD; PULL toggle button or Shift = also pull.
  All walkable tiles of all your things are highlighted at once; tap a tile only one
  thing can reach and it moves there directly (no choosing needed) — if several could
  reach it, tap the thing (or Tab) first. A cell containing your own thing always
  selects it, never walks onto it
- Place: tap a rule tile (or keys 1–9, 0, q–p), then tap a highlighted cell; Esc cancels
- C = challenge · R = new game · **Z = undo last action** (the spend-clock button is removed from the UI; the engine still supports it)
- 👥 buttons toggle characters on/off in the current game (1–6 players) — undoable with Z.
  PLAYER names show with their sprite in the buttons, rules list and log (not on the board/tiles);
  formed (non-default) rules are bold and listed above the defaults

## Files

- `index.html` — page, styling, sidebar
- `game.js` — engine (pure logic, loadable in Node) + DOM UI
- `img/` — emoji graphics for all characters/objects (Noto Color Emoji 128px PNGs,
  © Google LLC, Apache License 2.0; shipped locally so no emoji font is needed on
  the device)
- `test.js` — engine tests: `node test.js`
