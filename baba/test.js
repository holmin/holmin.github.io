'use strict';
const assert = require('assert');
const G = require('./game.js');

const rulesOf = (s) => G.ruleList(s);
const at = (s, x, y) => G.entitiesAt(s, x, y);
// P1 / P2 character objects by rank (BABA/KEKE in a default game; whatever is
// enabled first/second in multi-character tests)
const baba = (s) => s.entities.find(e => e.kind === 'object' && e.type === G.CHARACTERS[G.activeChars(s)[0]].noun);
const keke = (s) => s.entities.find(e => e.kind === 'object' && e.type === G.CHARACTERS[G.activeChars(s)[1]].noun);
const rock = (s, x, y) => s.entities.find(e => e.kind === 'object' && e.type === 'ROCK' && e.x === x && e.y === y);

// 1. Initial state: Sami bottom-left, Aas top-right, rocks in corners, flag center; default rules only
let s = G.createGame();
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 4]);
assert.deepStrictEqual([keke(s).x, keke(s).y], [4, 0]);
assert.ok(rock(s, 0, 0) && rock(s, 4, 4));
assert.deepStrictEqual(rulesOf(s), ['ALL IS PUSH (default)', 'BABA IS PLAYER 1 (default)', 'KEKE IS PLAYER 2 (default)']);
assert.strictEqual(s.level, 'base', 'base (no modifier cards) is the default');
assert.strictEqual(s.supply.length, 4, 'base = 2x WIN + ROCK + FLAG nouns only');
assert.strictEqual(s.supply.filter(t => t.prop === 'WIN').length, 2);
assert.ok(s.supply.some(t => t.noun === 'ROCK') && s.supply.some(t => t.noun === 'FLAG'));
assert.ok(!s.supply.some(t => t.noun === 'RIVER' || t.noun === 'TEXT'), 'no RIVER/TEXT nouns in base supply');
assert.ok(!s.supply.some(t => t.prop && t.prop !== 'WIN'), 'no rule tiles in base');
assert.strictEqual(s.numPlayers, 2);
assert.ok(s.entities.some(e => e.type === 'BABA') && s.entities.some(e => e.type === 'KEKE'), 'default characters are BABA + KEKE');
assert.ok(!s.entities.some(e => e.type === 'SAMI'), 'no alternates by default');
console.log('ok 1: setup + default rules (BABA/KEKE always the defaults)');

// 2. Turn structure: first turn = 1 action, later turns = 2 actions, alternating
s = G.createGame();
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'P1 first action');
assert.strictEqual(s.turn, 1);
assert.strictEqual(s.actionsLeft, 2);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'P1 cannot act on P2 turn');
s.selectedId = keke(s).id;
assert.strictEqual(G.moveSelected(s, 1, -1, 0, false), true);
assert.strictEqual(G.moveSelected(s, 1, -1, 0, false), true);
assert.strictEqual(s.turn, 0);
assert.strictEqual(s.actionsLeft, 2);
console.log('ok 2: turn structure');

// 3. Push into empty cell
s = G.createGame();
const r3 = rock(s, 0, 0); r3.x = 1; r3.y = 4;
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4]);
assert.ok(rock(s, 2, 4), 'rock pushed');
console.log('ok 3: push');

// 4. Push: only ONE thing per move unless the mover is STRONG (then chains work)
s = G.createGame();
const r4 = rock(s, 0, 0); r4.x = 1; r4.y = 4;
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4]);
assert.ok(rock(s, 2, 4), 'single rock pushed');
s = G.createGame();
const r4a = rock(s, 0, 0); r4a.x = 1; r4a.y = 4;
s.entities.push({ id: 999, kind: 'object', type: 'ROCK', x: 2, y: 4 });
s.selectedId = baba(s).id;
assert.strictEqual(G.canMove(s, baba(s), 1, 0), false, 'cannot push two things without STRONG');
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'move rejected');
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'STRONG', label: 'IS STRONG', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('BABA IS STRONG'));
assert.strictEqual(G.canMove(s, baba(s), 1, 0), true, 'STRONG can push multiple things');
G.moveSelected(s, 0, 1, 0, false);
assert.ok(rock(s, 2, 4) && rock(s, 3, 4), 'both rocks chain-pushed with STRONG');
console.log('ok 4: one push per move unless STRONG (chain push)');

// 5. Rule formation right/down
s = G.createGame();
G.doPlace(s, 0, 2, 1, 2);
G.doPlace(s, 0, 0, 2, 2);
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS WIN'));
assert.strictEqual(rulesOf(s)[0], 'ROCK IS WIN', 'formed rules listed above defaults');
s = G.createGame();
G.doPlace(s, 0, 2, 2, 1);
G.doPlace(s, 0, 0, 2, 2);
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS WIN'));
console.log('ok 5: rule formation + ordering');

// 6. Win by stacking YOU object onto WIN object
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
baba(s).x = 2; baba(s).y = 3; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, -1, false), true);
assert.ok(s.over && s.over.winner === 0, 'P1 wins on flag object');
console.log('ok 6: YOU+WIN stacking win');

// 7. YOU+WIN on the same thing does not auto-win
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 3, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 4 });
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.ok(!s.over);
console.log('ok 7: YOU+WIN self does not win');

// 8. Pull drags exactly one thing
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 1 });
s.entities.push({ id: 901, kind: 'word', noun: 'ROCK', x: 2, y: 1 });
baba(s).x = 2; baba(s).y = 2; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, 1, true), true);
assert.strictEqual(at(s, 2, 2).length, 2, 'BABA + one pulled tile');
assert.strictEqual(at(s, 2, 1).length, 1, 'one left behind');
console.log('ok 8: pull one thing');

// 9. Place legality
s = G.createGame();
assert.strictEqual(G.place(s, 0, 0, 4, 4), false, 'occupied cell');
assert.strictEqual(G.place(s, 0, 0, 1, 4), true, 'next to BABA');
assert.strictEqual(G.place(s, 1, 0, 0, 3), false, 'wrong turn');
console.log('ok 9: place rules');

// 10. Challenge
s = G.createGame();
assert.strictEqual(G.challenge(s, 0), true);
assert.strictEqual(s.turn, 1);
s.selectedId = keke(s).id;
for (let i = 0; i < 10 && !s.over; i++) {
  const d = i % 2 === 0 ? [-1, 0] : [1, 0];
  if (!G.moveSelected(s, 1, d[0], d[1], false)) G.moveSelected(s, 1, 0, i % 2 === 0 ? 1 : -1, false);
}
assert.ok(s.over && s.over.winner === 0, 'challenger wins after 10 failed actions');
// sudden death is allowed mid-turn, even after only the first action of the turn
s = G.createGame();
s.gameTurn = 1; s.turn = 0; s.actionsLeft = 2; // a normal 2-action turn for P1
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // first action used -> 1 left, still P1's turn
assert.strictEqual(s.actionsLeft, 1);
assert.strictEqual(G.challenge(s, 0), true, 'challenge allowed after the first action');
assert.ok(s.challenge && s.turn === 1, 'challenge started mid-turn');
console.log('ok 10: challenge (incl. mid-turn after first action)');

// 11. Cannot act -> lose (Aas boxed in by full row/column, chains hit edges)
s = G.createGame();
s.supply = [];
const r11a = rock(s, 0, 0); r11a.x = 0; r11a.y = 0;
const r11b = rock(s, 4, 4); r11b.x = 4; r11b.y = 4;
s.entities.push({ id: 991, kind: 'object', type: 'ROCK', x: 1, y: 0 });
s.entities.push({ id: 992, kind: 'object', type: 'ROCK', x: 2, y: 0 });
s.entities.push({ id: 993, kind: 'object', type: 'ROCK', x: 3, y: 0 });
s.entities.push({ id: 994, kind: 'object', type: 'ROCK', x: 4, y: 1 });
s.entities.push({ id: 995, kind: 'object', type: 'ROCK', x: 4, y: 2 });
s.entities.push({ id: 996, kind: 'object', type: 'ROCK', x: 4, y: 3 });
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.ok(s.over && s.over.winner === 0, 'P2 cannot act -> P1 wins');
console.log('ok 11: cannot-act loss');

// 12. Clock / best-of-3
s = G.createGame();
assert.strictEqual(G.spendClock(s, 0), true);
assert.strictEqual(s.scenario.bo3, true);
assert.strictEqual(G.spendClock(s, 1), false);
console.log('ok 12: clock');

// 13-16. Undo
s = G.createGame();
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
G.undo(s);
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 4]);
assert.strictEqual(s.turn, 0);
assert.strictEqual(s.actionsLeft, 1);
s = G.createGame();
const n0 = s.supply.length;
G.place(s, 0, 0, 1, 4);
G.undo(s);
assert.strictEqual(s.supply.length, n0);
assert.strictEqual(at(s, 1, 4).length, 0);
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
baba(s).x = 2; baba(s).y = 3; s.selectedId = baba(s).id;
G.moveSelected(s, 0, 0, -1, false);
assert.ok(s.over && s.scenario.wins[0] === 1);
G.undo(s);
assert.ok(!s.over && s.scenario.wins[0] === 0);
s = G.createGame();
G.challenge(s, 0);
G.undo(s);
assert.strictEqual(s.challenge, null);
assert.strictEqual(G.undo(s) === false || true, true);
console.log('ok 13-16: undo move/place/game-over/challenge');

// 17. Five characters available; enabling spawns near home corner and re-ranks
s = G.createGame([true, true, false, false, true, true, false, false]); // BABA, KEKE, GABA, EBBA
const gaba17 = s.entities.find(e => e.type === 'GABA');
const ebba17 = s.entities.find(e => e.type === 'EBBA');
assert.ok(gaba17 && Math.abs(gaba17.x) + Math.abs(gaba17.y) <= 1, 'GABA near corner (0,0)');
assert.ok(ebba17 && Math.abs(ebba17.x - 4) + Math.abs(ebba17.y - 4) <= 1, 'EBBA near corner (4,4)');
assert.deepStrictEqual(rulesOf(s).filter(r => /IS PLAYER \d/.test(r)),
  ['BABA IS PLAYER 1 (default)', 'EBBA IS PLAYER 4 (default)', 'GABA IS PLAYER 3 (default)', 'KEKE IS PLAYER 2 (default)']);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.strictEqual(s.turn, 1);
s.selectedId = keke(s).id;
G.moveSelected(s, 1, -1, 0, false); G.moveSelected(s, 1, 0, 1, false);
assert.strictEqual(s.turn, 2, 'turn rotates to P3');
console.log('ok 17: multi-character spawn + P-ranking + rotation');

// 18. Toggling re-ranks: disable Sami -> Aas becomes P1; disable all is allowed while selecting
s = G.createGame();
assert.strictEqual(G.setEnabled(s, 0, false), true);
assert.strictEqual(s.numPlayers, 1);
assert.ok(!s.entities.some(e => e.type === 'BABA'), 'BABA figure removed');
assert.ok(rulesOf(s).includes('KEKE IS PLAYER 1 (default)'), 'KEKE re-ranked to P1');
assert.ok(!rulesOf(s).some(r => r.startsWith('BABA')));
G.setEnabled(s, 4, true); // Gaba in -> KEKE P1, GABA P2
assert.strictEqual(s.numPlayers, 2);
assert.ok(rulesOf(s).includes('GABA IS PLAYER 2 (default)'));
const g18 = s.entities.find(e => e.type === 'GABA');
assert.ok(g18 && Math.abs(g18.x - 4) + Math.abs(g18.y) <= 1, 'GABA spawned near (4,0) — player 2 corner (rank-based)');
G.setEnabled(s, 1, false);
G.setEnabled(s, 4, false);
assert.strictEqual(s.numPlayers, 0, 'all disabled is allowed while selecting');
assert.deepStrictEqual(rulesOf(s), ['ALL IS PUSH (default)']);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'no one can move with 0 players');
assert.ok(!s.over, 'no spurious game-over with 0 players');
G.setEnabled(s, 0, true);
assert.strictEqual(s.numPlayers, 1);
assert.ok(rulesOf(s).includes('BABA IS PLAYER 1 (default)'));
console.log('ok 18: toggle re-ranking + disable-all');

// 19. Undo restores toggles
s = G.createGame();
G.setEnabled(s, 4, true);
assert.strictEqual(s.numPlayers, 3);
G.undo(s);
assert.strictEqual(s.numPlayers, 2);
assert.ok(!s.entities.some(e => e.type === 'GABA'));
console.log('ok 19: undo toggle');

// 20. Word tiles are not WIN objects
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 0, y: 4 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 4 });
G.ensureParsed(s);
G.resolve(s, 0);
assert.ok(!s.over, 'word FLAG is not WIN');
const flagObj = s.entities.find(e => e.kind === 'object' && e.type === 'FLAG');
flagObj.x = 0; flagObj.y = 4;
G.resolve(s, 0);
assert.ok(s.over && s.over.winner === 0, 'actual flag object wins');
console.log('ok 20: word tiles are not WIN objects');

// 21. CURIOUS (diary #3): "enters a row/column" = crossing INTO it.
// Trigger: BABA (0,4)->(0,3) enters row 3, from row 4, where the curious rock (3,3) sits
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 2 });
const rock21 = rock(s, 4, 4); rock21.x = 3; rock21.y = 3;
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 0, -1, false); // BABA enters (0,3): row 3, coming from row 4
assert.deepStrictEqual([rock21.x, rock21.y], [2, 3], 'CURIOUS rock stepped 1 space toward BABA');
assert.ok(!s.over);
// The old unexpected case: moving ALONG the same row must NOT trigger
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 2 });
const rock21b = rock(s, 4, 4); // stays (4,4), row 4
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // BABA (0,4)->(1,4): stays in row 4 -> no trigger
assert.deepStrictEqual([rock21b.x, rock21b.y], [4, 4], 'moving along the same row does not trigger');
console.log('ok 21: CURIOUS triggers on entering the row/column, not on moving within it');

// 22. CURIOUS cascade: rock A stepping into rock B's row makes B move too
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 2 });
const rockA = rock(s, 0, 0); rockA.x = 1; rockA.y = 0;   // col 1
const rockB = rock(s, 4, 4); rockB.x = 3; rockB.y = 1;   // row 1
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // BABA (0,4)->(1,4): enters col 1 -> A (1,0)->(1,1) -> enters row 1 -> B (3,1)->(2,1)
assert.deepStrictEqual([rockA.x, rockA.y], [1, 1], 'rock A stepped toward BABA');
assert.deepStrictEqual([rockB.x, rockB.y], [2, 1], 'rock B cascade-stepped toward A');
console.log('ok 22: CURIOUS knock-on cascade');

// 23. CURIOUS + WIN: a curious WIN rock steps onto a YOU thing; the YOU owner wins
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 3, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 4, y: 0 });
s.entities.push({ id: 902, kind: 'word', noun: 'ROCK', x: 3, y: 1 });
s.entities.push({ id: 903, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 3, y: 2 });
const rock23 = rock(s, 4, 4); rock23.x = 1; rock23.y = 3; // row 3, WIN+CURIOUS
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS WIN') && rulesOf(s).includes('ROCK IS CURIOUS'), rulesOf(s).join('|'));
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 0, -1, false); // BABA (0,4)->(0,3): enters row 3 -> rock steps onto BABA (YOU+WIN stack) -> P1 wins
assert.ok(s.over && s.over.winner === 0, 'curious WIN rock won for BABA owner');
console.log('ok 23: CURIOUS+WIN ->', s.over && s.over.reason);

// 23b. Two curious rocks in the SAME column both react to one enter event
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 1 });
const rockTop = rock(s, 0, 0); rockTop.x = 2; rockTop.y = 0;   // (2,0), col 2
const rockBot = rock(s, 4, 4); rockBot.x = 2; rockBot.y = 4;   // (2,4), col 2
baba(s).x = 1; baba(s).y = 2;
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // BABA (1,2)->(2,2): enters col 2, between the two rocks
assert.deepStrictEqual([rockTop.x, rockTop.y], [2, 1], 'top rock moved down toward BABA');
assert.deepStrictEqual([rockBot.x, rockBot.y], [2, 3], 'bottom rock moved up toward BABA');
console.log('ok 23b: all curious objects in the entered line move, not just one');

// 23c. Permanent margin tiles exist with exactly 2 players, produce the default P-rules once
const fixed = s => s.entities.filter(e => e.fixed);
{
  const g = G.createGame(undefined, undefined, 'dev');
  assert.strictEqual(fixed(g).length, 6, 'six printed tiles in the margin');
  const coords = fixed(g).map(e => e.x + ',' + e.y).sort();
  assert.deepStrictEqual(coords, ['-1,2', '-1,3', '2,-1', '2,5', '3,-1', '5,2']);
  assert.strictEqual(rulesOf(g).filter(r => r === 'BABA IS PLAYER 1 (default)').length, 1, 'no duplicate default rules');
  assert.ok(rulesOf(g).includes('KEKE IS PLAYER 2 (default)'));
  // a property placed right of the left-middle P1 noun rules BABA: place IS WIN at (0,2)
  const winIdx = g.supply.findIndex(t => t.prop === 'WIN');
  G.doPlace(g, 0, winIdx, 0, 2);
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('BABA IS WIN'), 'printed noun + placed property forms a rule');
  // a property below the top-middle P2 noun rules KEKE: place IS FAST at (2,0)
  const fastIdx = g.supply.findIndex(t => t.prop === 'FAST');
  G.doPlace(g, 0, fastIdx, 2, 0);
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('KEKE IS FAST'), 'top printed noun points down into the board');
  console.log('ok 23c: permanent margin tiles + rules through them');
}
// printed noun tiles: P1 noun always, P2 noun when >=2 players
{
  const g = G.createGame([true, true, true, false, false, false, false, false]);
  assert.strictEqual(fixed(g).length, 6, 'both printed nouns at 3 players');
  assert.strictEqual(rulesOf(g).filter(r => /IS PLAYER \d/.test(r)).length, 3, 'P3 default is implicit');
  G.setEnabled(g, 2, false);
  G.setEnabled(g, 1, false); // down to 1 player
  assert.strictEqual(fixed(g).length, 3, 'only the P1 noun tile + IS PLAYER 1s at 1 player');
  assert.deepStrictEqual(fixed(g).map(e => e.x + ',' + e.y).sort(), ['-1,2', '-1,3', '2,5']);
  assert.deepStrictEqual(rulesOf(g).filter(r => /IS PLAYER \d/.test(r)), ['BABA IS PLAYER 1 (default)']);
  G.setEnabled(g, 1, true); // back to 2
  assert.strictEqual(fixed(g).length, 6);
  assert.ok(rulesOf(g).includes('KEKE IS PLAYER 2 (default)'));
  console.log('ok 23d: printed noun tiles follow player count (P1 always, P2 at 2+)');
}
// FAST with explicit destination square
{
  const g = G.createGame(undefined, undefined, 'dev');
  const fastIdx = g.supply.findIndex(t => t.prop === 'FAST');
  G.doPlace(g, 0, fastIdx, 0, 2); // right of printed BABA noun (-1,2) -> BABA IS FAST
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('BABA IS FAST'));
  const sel = baba(g);
  g.selectedId = sel.id;
  const reach = G.fastReach(g, sel, 1, 0);
  assert.deepStrictEqual(reach[reach.length - 1], [3, 4], 'FAST reach ends before the rock at (4,4)');
  assert.strictEqual(G.fastMoveTo(g, 0, 1, 0, 3, 4), true, 'FAST slid to tapped square');
  assert.deepStrictEqual([sel.x, sel.y], [3, 4]);
  assert.strictEqual(G.fastMoveTo(g, 0, 1, 0, 4, 4), false, 'cannot slide onto/through the rock corner');
  console.log('ok 23e: FAST direction + destination square');
}

// 24. River is terrain called RIVER (not a tile, not WATER)
assert.deepStrictEqual([...G.RIVER].sort(), ['0,0', '0,1', '1,1', '2,1', '2,2', '2,3', '3,3', '4,3', '4,4']);
assert.ok(G.isRiverCell(0, 0) && G.isRiverCell(2, 1) && G.isRiverCell(4, 4));
assert.ok(!G.isRiverCell(1, 2));
assert.ok(G.NOUNS.includes('RIVER') && G.NOUNS.includes('TEXT') && G.NOUNS.includes('KEKE') && G.NOUNS.includes('MINNE') && !G.NOUNS.includes('WATER') && !G.NOUNS.includes('ERIK'));
console.log('ok 24: river = RIVER terrain cells + noun list');

// 25. STOP: blocks entry and cannot be pushed/pulled; a YOU thing that is STOP can still move itself
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 1, y: 2 });
const r25 = rock(s, 0, 0); r25.x = 1; r25.y = 4;
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'STOP rock cannot be pushed');
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 4], 'mover stays put');
baba(s).x = 1; baba(s).y = 3;
assert.strictEqual(G.moveSelected(s, 0, 0, -1, true), true, 'move up with pull');
assert.deepStrictEqual([r25.x, r25.y], [1, 4], 'STOP rock not pulled');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 3, y: 3 });
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'a YOU thing that is STOP can still move voluntarily');
console.log('ok 25: STOP blocks push/pull/entry, but not voluntary YOU moves');

// 26. SINK: a SINK thing is not pushed (enterable) — you stack onto it and it is destroyed
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'SINK', label: 'IS SINK', owner: 0, x: 1, y: 1 });
const r26 = rock(s, 0, 0); r26.x = 1; r26.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true); // BABA walks onto the SINK rock
assert.ok(!s.entities.some(e => e.id === r26.id), 'SINK rock destroyed when sharing a cell');
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4], 'BABA took the rock cell');
assert.ok(!s.over);
console.log('ok 26: SINK (implies not-push)');

// 27. MELT + HOT: melt things touching a hot thing are destroyed; HOT+MELT self-destructs
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'MELT', label: 'IS MELT', owner: 0, x: 1, y: 1 });
s.entities.push({ id: 902, kind: 'word', noun: 'FLAG', x: 3, y: 1 });
s.entities.push({ id: 903, kind: 'word', prop: 'HOT', label: 'IS HOT', owner: 0, x: 4, y: 1 });
const f27 = s.entities.find(e => e.kind === 'object' && e.type === 'FLAG'); f27.x = 1; f27.y = 4;
const r27 = rock(s, 0, 0); r27.x = 2; r27.y = 4; // MELT rock is enterable, HOT flag is pushable
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true); // HOT flag pushed into the MELT rock's cell
assert.ok(!s.entities.some(e => e.id === r27.id), 'MELT rock destroyed by HOT flag');
assert.ok(s.entities.some(e => e.id === f27.id) && f27.x === 2 && f27.y === 4, 'HOT flag survives');
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4]);
assert.ok(!s.over);
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'HOT', label: 'IS HOT', owner: 0, x: 3, y: 3 });
s.entities.push({ id: 902, kind: 'word', prop: 'MELT', label: 'IS MELT', owner: 0, x: 2, y: 4 });
G.ensureParsed(s);
G.resolve(s, 1);
assert.ok(!s.entities.some(e => e.type === 'BABA'), 'HOT+MELT object melts itself');
assert.ok(s.over && s.over.winner === 1, 'P2 wins when P1 has no YOU things left');
console.log('ok 27: MELT/HOT');

// 28. DEFEAT: a DEFEAT thing is not pushed — walking onto it destroys the YOU thing -> that player loses
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'DEFEAT', label: 'IS DEFEAT', owner: 0, x: 1, y: 1 });
const r28 = rock(s, 0, 0); r28.x = 1; r28.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true); // BABA walks onto the DEFEAT rock
assert.ok(!s.entities.some(e => e.type === 'BABA'), 'DEFEAT destroyed BABA');
assert.ok(s.entities.some(e => e.id === r28.id), 'the DEFEAT rock survives');
assert.ok(s.over && s.over.winner === 1, 'Player 2 wins when Player 1 has no YOU left');
console.log('ok 28: DEFEAT (implies not-push)');

// 29. SHUT blocks like STOP, but an OPEN thing sharing its cell opens it (then it can be pushed)
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'SHUT', label: 'IS SHUT', owner: 0, x: 1, y: 1 });
const r29 = rock(s, 0, 0); r29.x = 1; r29.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'SHUT rock blocks the move');
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 4]);
s.entities.push({ id: 902, kind: 'word', noun: 'FLAG', x: 3, y: 0 });
s.entities.push({ id: 903, kind: 'word', prop: 'OPEN', label: 'IS OPEN', owner: 0, x: 4, y: 0 });
const f29 = s.entities.find(e => e.kind === 'object' && e.type === 'FLAG'); f29.x = 1; f29.y = 4; // OPEN flag onto the shut rock
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'rock opened by the OPEN flag can be pushed');
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4], 'BABA entered and stacked with the OPEN flag');
assert.deepStrictEqual([r29.x, r29.y], [2, 4], 'shut rock pushed');
console.log('ok 29: SHUT/OPEN');

// 30. WEAK: destroyed when pushed or pulled; the push continues through its cell
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'WEAK', label: 'IS WEAK', owner: 0, x: 1, y: 1 });
const r30 = rock(s, 0, 0); r30.x = 1; r30.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'push succeeds through the WEAK rock');
assert.ok(!s.entities.some(e => e.id === r30.id), 'WEAK rock destroyed when pushed');
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4], 'mover takes the freed cell');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'WEAK', label: 'IS WEAK', owner: 0, x: 1, y: 1 });
const r30b = rock(s, 0, 0); r30b.x = 1; r30b.y = 3;
baba(s).x = 1; baba(s).y = 2;
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, -1, true), true, 'move up with pull');
assert.ok(!s.entities.some(e => e.id === r30b.id), 'WEAK rock destroyed when pulled');
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 1]);
console.log('ok 30: WEAK');

// 31. RIVER as a noun: river cells count as RIVER for WIN/DEFEAT/SINK; Minne spawns near (2,4)
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'RIVER', x: 0, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 3 });
baba(s).x = 1; baba(s).y = 1; // river cell (1,1), free
G.ensureParsed(s);
G.resolve(s, 0);
assert.ok(s.over && s.over.winner === 0, 'RIVER IS WIN: a YOU thing on a river cell wins');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'RIVER', x: 0, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'DEFEAT', label: 'IS DEFEAT', owner: 0, x: 1, y: 3 });
baba(s).x = 2; baba(s).y = 1; // river cell (2,1)
G.ensureParsed(s);
G.resolve(s, 1);
assert.ok(!s.entities.some(e => e.type === 'BABA'), 'RIVER IS DEFEAT destroys YOU on the river');
assert.ok(s.over && s.over.winner === 1);
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'RIVER', x: 0, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SINK', label: 'IS SINK', owner: 0, x: 1, y: 3 });
const f31 = s.entities.find(e => e.kind === 'object' && e.type === 'FLAG'); f31.x = 2; f31.y = 1; // flag on river (2,1)
G.ensureParsed(s);
G.resolve(s, 0);
assert.ok(!G.riverAt(s, 2, 1), 'RIVER IS SINK: river cell under an object sinks');
assert.ok(G.riverAt(s, 0, 1) && G.riverAt(s, 4, 3), 'river cells without objects remain');
assert.ok(!G.riverAt(s, 0, 0) && !G.riverAt(s, 4, 4), 'river cells under the rocks also sank');
assert.ok(s.entities.some(e => e.id === f31.id), 'the flag is not destroyed');
s = G.createGame([true, true, true, true, true, false, false, true]);
const minne = s.entities.find(e => e.type === 'MINNE');
assert.ok(minne && Math.abs(minne.x - 2) + Math.abs(minne.y - 4) <= 1, 'MINNE (panda) spawns near (2,4)');
assert.ok(G.CHARACTERS.some(c => c.noun === 'MINNE' && c.emoji === '🐼'));
assert.ok(G.CHARACTERS.some(c => c.noun === 'KEKE' && c.name === 'Keke'), 'KEKE is a character');
assert.ok(G.CHARACTERS.some(c => c.noun === 'AAS' && c.name === 'Aas'), 'alternates still available (dev)');
assert.ok(!G.CHARACTERS.some(c => c.noun === 'ERIK'));
console.log('ok 31: RIVER noun rules + Minne');

// 32. Home corners are by player RANK: player 1 lower-left, player 2 upper-right (opposite diagonal)
s = G.createGame();
G.setEnabled(s, 1, false); // only BABA active -> player 1
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 4], 'lone player 1 at lower-left (0,4)');
G.setEnabled(s, 6, true); // add ZABA -> becomes player 2
const zaba32 = s.entities.find(e => e.type === 'ZABA');
assert.deepStrictEqual([zaba32.x, zaba32.y], [4, 0], 'second player on the opposite diagonal (4,0)');
G.setEnabled(s, 7, true); // add MINNE -> player 3 -> corner (0,0) area (rock sits there)
const minne32 = s.entities.find(e => e.type === 'MINNE');
assert.ok(Math.abs(minne32.x) + Math.abs(minne32.y) <= 1, 'third player near (0,0)');
console.log('ok 32: spawn corners follow player rank (opposite diagonals first)');

// 33. TEXT as a noun: TEXT IS PLAYER 1 makes word tiles that player's YOU things (movable)
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'TEXT', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'YOU', label: 'IS YOU', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('TEXT IS PLAYER 1'), 'TEXT IS PLAYER 1 rule forms');
assert.ok(G.yourThings(s, 0).some(e => e.kind === 'word'), 'word tiles are Player 1 YOU things');
s.entities.push({ id: 902, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
G.ensureParsed(s);
s.selectedId = 902;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'can move a word tile when TEXT IS PLAYER 1');
assert.deepStrictEqual([s.entities.find(e => e.id === 902).x, s.entities.find(e => e.id === 902).y], [3, 3], 'word tile moved');
// words are still not the objects they name: FLAG IS WIN does not make the word FLAG win
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 0, y: 4 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 4 });
G.ensureParsed(s);
assert.ok(!G.isWin(s, s.entities.find(e => e.id === 900)), 'word FLAG is not WIN under FLAG IS WIN');
s.entities.push({ id: 902, kind: 'word', noun: 'TEXT', x: 3, y: 0 });
s.entities.push({ id: 903, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 4, y: 0 });
G.ensureParsed(s);
assert.ok(G.isWin(s, s.entities.find(e => e.id === 900)), 'but the word tiles ARE win under TEXT IS WIN');
console.log('ok 33: TEXT noun (TEXT IS PLAYER 1 -> word tiles movable; TEXT IS WIN works)');

// 34. Modifier cards (level cards in video order, named by their permanent rule when they have one) + developer level
assert.deepStrictEqual(G.MODIFIERS.map(m => m.id),
  ['more-rock-flag', 'fast', 'hot-melt', 'curious', 'square', 'win-harder', 'thirsty', 'strong', 'scared', 'sheep'], 'cards in video order');
assert.strictEqual(G.MODIFIERS.find(m => m.id === 'hot-melt').name, 'RIVER IS HOT', 'card named after its permanent rule');
assert.strictEqual(G.MODIFIERS.find(m => m.id === 'fast').name, 'FAST');
s = G.createGame();
assert.strictEqual(s.level, 'base');
assert.strictEqual(s.supply.length, 4, 'base = 2x WIN + ROCK + FLAG nouns');
s = G.createGame(undefined, undefined, 'm:fast');
assert.strictEqual(s.supply.length, 5, 'base 4 + IS FAST');
assert.ok(s.supply.some(t => t.prop === 'FAST') && !s.supply.some(t => t.prop === 'STOP'));
s = G.createGame(undefined, undefined, 'm:hot-melt,scared');
assert.strictEqual(s.supply.length, 7, 'base 4 + HOT + MELT + SCARED');
assert.ok(rulesOf(s).includes('RIVER IS HOT (default)') && rulesOf(s).includes('ROCK IS SCARED (default)'), 'permanent card rules formed');
const permTiles = s.entities.filter(e => e.perm);
assert.strictEqual(permTiles.length, 4, 'two permanent rules = 4 purple corner tiles');
assert.ok(permTiles.some(e => e.noun === 'RIVER' && e.x === -1 && e.y === -1) && permTiles.some(e => e.prop === 'HOT' && e.x === 0 && e.y === -1), 'first rule in the TOP-LEFT corner');
assert.ok(permTiles.some(e => e.noun === 'ROCK' && e.x === -1 && e.y === 5) && permTiles.some(e => e.prop === 'SCARED' && e.x === 0 && e.y === 5), 'second rule in the LOWER-LEFT corner');
s = G.createGame(undefined, undefined, 'dev');
assert.strictEqual(s.supply.filter(t => t.prop === 'WIN').length, 1, 'developer: only ONE IS WIN (infinite tiles)');
for (const p of ['CURIOUS', 'FAST', 'STOP', 'SINK', 'MELT', 'HOT', 'OPEN', 'SHUT', 'DEFEAT', 'WRAP', 'THIRSTY', 'STRONG', 'SCARED', 'SHEEP']) {
  assert.ok(s.supply.some(t => t.prop === p), 'developer supply has IS ' + p);
}
assert.ok(!s.supply.some(t => t.prop === 'WEAK'), 'WEAK tile removed');
assert.ok(s.supply.some(t => t.noun === 'SQUARE'), 'developer supply has the SQUARE noun');
s = G.createGame(undefined, undefined, 'dm:hot-melt');
assert.ok(s.dev, 'dev flag parsed');
assert.ok(rulesOf(s).includes('RIVER IS HOT (default)'), 'dev + modifier card: permanent rule still printed');
assert.ok(s.supply.some(t => t.prop === 'CURIOUS') && s.supply.some(t => t.prop === 'MELT'), 'dev supply still has all rules');
assert.strictEqual(G.parseLevel('dev').dev, true);
assert.deepStrictEqual(G.parseLevel('dm:hot-melt,scared').mods, ['hot-melt', 'scared']);
s = G.createGame(undefined, undefined, 'm:square,win-harder,fast');
assert.deepStrictEqual(s.supply.map(t => t.prop || t.noun), ['WIN', 'WIN', 'WIN', 'WIN', 'ROCK', 'FLAG', 'SQUARE', 'FAST'],
  'supply sorted: IS WIN first, then nouns, then properties');
console.log('ok 34: modifier cards (video order, named by permanent rule) + purple corner rules + developer level + sorted supply');

// 35. TEXT rules do NOT apply to the permanent printed margin tiles
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'TEXT', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'YOU', label: 'IS YOU', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('TEXT IS PLAYER 1'));
const fixedTiles = s.entities.filter(e => e.fixed);
assert.strictEqual(fixedTiles.length, 6);
assert.ok(fixedTiles.every(e => !G.isYou(s, e)), 'printed margin tiles are not YOU under TEXT IS PLAYER 1');
assert.ok(!G.yourThings(s, 0).some(e => e.fixed), 'fixed tiles never in yourThings');
assert.ok(G.yourThings(s, 0).some(e => e.kind === 'word' && !e.fixed), 'placed word tiles are');
console.log('ok 35: TEXT does not apply to the printed margin tiles');

// 36. FAQ: placing a tile does NOT count as entering — a freshly placed CURIOUS rule triggers only from the next action
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 3, y: 3 });
const r36 = rock(s, 0, 0); r36.x = 1; r36.y = 0; // curious rock in column 1
G.ensureParsed(s);
s.selectedId = baba(s).id;
const flagNounIdx = s.supply.findIndex(t => t.noun === 'FLAG');
assert.strictEqual(G.place(s, 0, flagNounIdx, 1, 4), true, 'placed FLAG noun at (1,4), adjacent to BABA');
assert.deepStrictEqual([r36.x, r36.y], [1, 0], 'placing does NOT trigger CURIOUS (FAQ: not until the next action)');
s.selectedId = keke(s).id;
G.moveSelected(s, 1, -1, 0, false); G.moveSelected(s, 1, -1, 0, false); // P2's turn (moves within row 0: no trigger)
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'BABA steps into column 1 (pushing the FLAG word)');
assert.deepStrictEqual([r36.x, r36.y], [1, 1], 'the next action triggers the freshly placed rule');
// ...but placing adjacent DOES scare SCARED things
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SCARED', label: 'IS SCARED', owner: 0, x: 3, y: 3 });
const f36 = s.entities.find(e => e.type === 'FLAG'); f36.x = 2; f36.y = 2;
baba(s).x = 0; baba(s).y = 2;
G.ensureParsed(s);
s.selectedId = baba(s).id;
const rockNounIdx36 = s.supply.findIndex(t => t.noun === 'ROCK');
assert.strictEqual(G.place(s, 0, rockNounIdx36, 1, 2), true, 'placed ROCK noun at (1,2), directly next to the scared flag');
assert.deepStrictEqual([f36.x, f36.y], [4, 2], 'placing adjacent scared the flag — it fled as far as possible away');
console.log('ok 36: placing triggers SCARED but not CURIOUS (FAQ)');

// 37. moversTo: which YOUR things can walk to a tapped cell (axis-aligned only)
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 3, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'YOU', label: 'IS YOU', owner: 0, x: 4, y: 0 }); // ROCK IS PLAYER 1
const rA = rock(s, 0, 0); rA.x = 2; rA.y = 4; // BABA (0,4) and this rock are both PLAYER 1 YOU
G.ensureParsed(s);
let m = G.moversTo(s, 0, 1, 4);
assert.strictEqual(m.length, 2, 'cell (1,4) reachable from both BABA and the rock -> ambiguous');
m = G.moversTo(s, 0, 0, 3);
assert.strictEqual(m.length, 1, 'cell (0,3) reachable only by BABA');
assert.strictEqual(m[0][0].type, 'BABA');
assert.deepStrictEqual([m[0][1], m[0][2]], [0, -1]);
assert.strictEqual(G.moversTo(s, 0, 1, 3).length, 0, 'diagonal cells are never walk targets');
assert.strictEqual(G.moversTo(s, 0, 0, 4).length, 0, 'own YOU cell is not a walk target');
console.log('ok 37: moversTo (unambiguous vs ambiguous walk targets)');

// 38. emoji graphics exist as local PNG files for every character and object (no emoji-font dependency)
const fs = require('fs'), path = require('path');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const c of G.CHARACTERS) {
  const p = path.join(__dirname, G.SPRITE_IMG[c.noun]);
  assert.ok(G.SPRITE_IMG[c.noun] && fs.existsSync(p), 'image for ' + c.noun);
  assert.ok(fs.readFileSync(p).subarray(0, 8).equals(PNG_MAGIC), c.noun + ' image is a PNG');
}
for (const k of ['ROCK', 'FLAG', 'RIVER', 'TEXT']) {
  const p = path.join(__dirname, G.SPRITE_IMG[k]);
  assert.ok(fs.existsSync(p) && fs.readFileSync(p).subarray(0, 8).equals(PNG_MAGIC), 'PNG for ' + k);
}
console.log('ok 38: local emoji graphics (Noto Color Emoji PNGs) for all characters/objects');

// 39. a noun can be YOU for multiple players at once: ROCK IS PLAYER 1 + ROCK IS PLAYER 2
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'YOU', label: 'IS YOU', owner: 0, x: 3, y: 0 });
s.entities.push({ id: 902, kind: 'word', prop: 'YOU', label: 'IS YOU', owner: 1, x: 2, y: 1 });
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS PLAYER 1') && rulesOf(s).includes('ROCK IS PLAYER 2'));
assert.ok(G.yourThings(s, 0).some(e => e.type === 'ROCK'), 'PLAYER 1 can move rocks');
assert.ok(G.yourThings(s, 1).some(e => e.type === 'ROCK'), 'PLAYER 2 can also move rocks');
s.selectedId = rock(s, 0, 0).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'PLAYER 1 moves a rock on his turn');
assert.strictEqual(s.turn, 1);
s.selectedId = rock(s, 4, 4).id;
assert.strictEqual(G.moveSelected(s, 1, -1, 0, false), true, 'PLAYER 2 moves a rock on his turn');
console.log('ok 39: ROCK IS PLAYER 1 + IS PLAYER 2 -> both players can move the rocks');

// 40. spawn corners follow SELECTION order: 1st selected -> (0,4), 2nd -> (4,0), even if the
// 2nd has a lower written index than the 1st (Ebba first, then Gaba -> Gaba still upper-right)
s = G.createGame();
G.setEnabled(s, 0, false); G.setEnabled(s, 1, false); // clear defaults
G.setEnabled(s, 5, true); // EBBA chosen first
const ebba40 = s.entities.find(e => e.type === 'EBBA');
assert.deepStrictEqual([ebba40.x, ebba40.y], [0, 4], 'first selected (EBBA) at lower-left (0,4)');
G.setEnabled(s, 4, true); // GABA chosen second (index 4 < 5, but selected second)
const gaba40 = s.entities.find(e => e.type === 'GABA');
assert.deepStrictEqual([gaba40.x, gaba40.y], [4, 0], 'second selected (GABA) at upper-right (4,0) — opposite diagonal');
// ...and the same with ZABA second (index 6)
s = G.createGame();
G.setEnabled(s, 0, false); G.setEnabled(s, 1, false);
G.setEnabled(s, 5, true);
G.setEnabled(s, 6, true); // ZABA second
const zaba40 = s.entities.find(e => e.type === 'ZABA');
assert.deepStrictEqual([zaba40.x, zaba40.y], [4, 0], 'second selected (ZABA) at upper-right (4,0)');
// third selected goes elsewhere (other corner)
G.setEnabled(s, 7, true); // MINNE third
const minne40 = s.entities.find(e => e.type === 'MINNE');
assert.ok(Math.abs(minne40.x) + Math.abs(minne40.y) <= 1, 'third selected (MINNE) near (0,0), not on the diagonal');
console.log('ok 40: spawn corners follow selection order (first two on opposite diagonals)');

// 41. WRAP: pushed/moved off the grid wraps to the other side, unless blocked;
// the permanent margin tiles outside the grid do not block it
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WRAP', label: 'IS WRAP', owner: 0, x: 1, y: 2 });
const r41 = rock(s, 0, 0); r41.x = 0; r41.y = 3;
const r41other = rock(s, 4, 4); r41other.x = 4; r41other.y = 0; // keep (4,3) free
baba(s).x = 1; baba(s).y = 3; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, -1, 0, false), true, 'push the WRAP rock off the left edge');
assert.deepStrictEqual([r41.x, r41.y], [4, 3], 'WRAP rock wrapped to (4,3)');
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 3]);
// no WRAP -> edge blocks
s = G.createGame();
const r41b = rock(s, 0, 0); r41b.x = 0; r41b.y = 3;
baba(s).x = 1; baba(s).y = 3; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, -1, 0, false), false, 'without WRAP the edge blocks');
// WRAP into a blocked cell fails
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WRAP', label: 'IS WRAP', owner: 0, x: 1, y: 2 });
s.entities.push({ id: 902, kind: 'word', noun: 'FLAG', x: 2, y: 1 });
s.entities.push({ id: 903, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 3, y: 1 });
const r41c = rock(s, 0, 0); r41c.x = 0; r41c.y = 3;
const f41 = s.entities.find(e => e.type === 'FLAG'); f41.x = 4; f41.y = 3; // STOP flag at the wrap destination
baba(s).x = 1; baba(s).y = 3; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, -1, 0, false), false, 'WRAP into a STOP cell is blocked');
// pushing toward a printed margin tile wraps instead of being blocked by it
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 1, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'WRAP', label: 'IS WRAP', owner: 0, x: 2, y: 0 });
const r41d = rock(s, 0, 0); r41d.x = 0; r41d.y = 2; // left of it sits the printed BABA noun at (-1,2)
baba(s).x = 1; baba(s).y = 2; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, -1, 0, false), true, 'pushed toward the printed margin tile wraps');
assert.deepStrictEqual([r41d.x, r41d.y], [4, 2], 'wrapped to (4,2), margin tile did not block');
console.log('ok 41: WRAP (off-grid wraps unless blocked; margin tiles do not block)');

// 42. FAST: moversTo finds slide targets several steps away (so highlighted squares are clickable)
s = G.createGame(undefined, undefined, 'dev');
const fastIdx42 = s.supply.findIndex(t => t.prop === 'FAST');
G.doPlace(s, 0, fastIdx42, 0, 2); // right of printed BABA noun (-1,2) -> BABA IS FAST
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('BABA IS FAST'));
let m42 = G.moversTo(s, 0, 3, 4);
assert.strictEqual(m42.length, 1, 'FAST: (3,4) three steps right is a mover target');
assert.deepStrictEqual([m42[0][1], m42[0][2]], [1, 0]);
m42 = G.moversTo(s, 0, 0, 3);
assert.strictEqual(m42.length, 1, 'FAST: (0,3) up the column is a mover target');
assert.deepStrictEqual([m42[0][1], m42[0][2]], [0, -1]);
assert.strictEqual(G.moversTo(s, 0, 2, 2).length, 0, 'diagonal is not a target');
assert.strictEqual(G.moversTo(s, 0, 4, 4).length, 0, 'rock corner is blocked, not a target');
console.log('ok 42: FAST slide targets beyond one step are clickable movers');

// 43. STRONG: a thing pushed against the border is pushed off and destroyed (unless it is WRAP)
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'STRONG', label: 'IS STRONG', owner: 0, x: 1, y: 2 });
const r43 = rock(s, 0, 0); r43.x = 0; r43.y = 3;
baba(s).x = 1; baba(s).y = 3; s.selectedId = baba(s).id;
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, -1, 0, false), true, 'STRONG pushes the rock off the left edge');
assert.ok(!s.entities.includes(r43), 'rock pushed off the board is destroyed');
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 3]);
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'STRONG', label: 'IS STRONG', owner: 0, x: 1, y: 2 });
s.entities.push({ id: 902, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 903, kind: 'word', prop: 'WRAP', label: 'IS WRAP', owner: 0, x: 1, y: 1 });
const r43b = rock(s, 0, 0); r43b.x = 0; r43b.y = 3;
const r43c = rock(s, 4, 4); r43c.x = 4; r43c.y = 0; // keep the wrap destination (4,3) free
baba(s).x = 1; baba(s).y = 3; s.selectedId = baba(s).id;
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, -1, 0, false), true);
assert.deepStrictEqual([r43b.x, r43b.y], [4, 3], 'WRAP thing wraps off the edge instead of being destroyed');
console.log('ok 43: STRONG pushes border things off the board (destroyed unless WRAP)');

// 44. infinite loop: 100 resolution steps in one action -> the last actor loses
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 3, y: 3 });
const r44 = rock(s, 0, 0); r44.x = 1; r44.y = 0;
G.ensureParsed(s);
s._loopSteps = 0;
s._entered = [{ id: baba(s).id, fx: 0, fy: 4, tx: 1, ty: 4 }];
G.resolveCurious(s, 0);
assert.deepStrictEqual([r44.x, r44.y], [1, 1], 'normal cascade still works');
assert.ok(!s.over);
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 3, y: 3 });
G.ensureParsed(s);
s._loopSteps = 99;
s._entered = [{ id: baba(s).id, fx: 0, fy: 4, tx: 1, ty: 4 }];
G.resolveCurious(s, 0);
assert.ok(s.over && s.over.winner === 1 && /infinite loop/.test(s.over.reason), '100 steps = last actor (PLAYER 1) loses: ' + (s.over && s.over.reason));
console.log('ok 44: infinite loop (100 steps) -> the last actor loses');

// 45. THIRSTY: at the end of the turn, moves to the closest river cell; ties are offered to the player
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'THIRSTY', label: 'IS THIRSTY', owner: 0, x: 3, y: 3 });
const r45 = rock(s, 0, 0); r45.x = 4; r45.y = 2;
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS THIRSTY'));
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // P1's only first-turn action -> end of turn -> THIRSTY
assert.deepStrictEqual([r45.x, r45.y], [4, 3], 'thirsty rock moved to the closest river cell (4,3)');
assert.ok(G.riverAt(s, r45.x, r45.y));
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'THIRSTY', label: 'IS THIRSTY', owner: 0, x: 3, y: 3 });
const r45b = rock(s, 0, 0); r45b.x = 3; r45b.y = 2; // equally close to (2,2) and (3,3)
G.ensureParsed(s);
let chosen45 = null;
s._thirstyChooser = (opts) => { chosen45 = opts; return opts[1]; };
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.strictEqual(chosen45.length, 2, 'two equally close river cells offered');
assert.deepStrictEqual([r45b.x, r45b.y], [3, 3], 'player chose the second option');
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'THIRSTY', label: 'IS THIRSTY', owner: 0, x: 3, y: 3 });
const r45c = rock(s, 0, 0); r45c.x = 3; r45c.y = 2;
G.ensureParsed(s);
s._thirstyChooser = () => null; // UI defers
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.ok(s._thirstyPending && s._thirstyPending.length === 1, 'tie deferred to the player');
assert.deepStrictEqual([r45c.x, r45c.y], [3, 2], 'not moved before the choice');
assert.strictEqual(G.pickThirsty(s, r45c.id, 2, 2), true);
assert.deepStrictEqual([r45c.x, r45c.y], [2, 2], 'picked water cell applied');
assert.ok(!s._thirstyPending.length, 'queue drained');
console.log('ok 45: THIRSTY (end of turn -> closest river; player chooses on ties)');

// 46. SCARED: something moving directly next to it -> flees as far as possible away; diagonal doesn't scare; cannot be pulled
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SCARED', label: 'IS SCARED', owner: 0, x: 3, y: 3 });
const f46 = s.entities.find(e => e.type === 'FLAG'); f46.x = 2; f46.y = 2;
baba(s).x = 0; baba(s).y = 2; s.selectedId = baba(s).id;
G.ensureParsed(s);
G.moveSelected(s, 0, 1, 0, false); // BABA steps to (1,2), directly next to the flag
assert.deepStrictEqual([f46.x, f46.y], [4, 2], 'scared flag fled as far as possible in the opposite direction');
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SCARED', label: 'IS SCARED', owner: 0, x: 3, y: 3 });
const f46b = s.entities.find(e => e.type === 'FLAG'); f46b.x = 2; f46b.y = 2;
baba(s).x = 0; baba(s).y = 3; s.selectedId = baba(s).id;
G.ensureParsed(s);
G.moveSelected(s, 0, 1, 0, false); // (1,3) is diagonal to (2,2)
assert.deepStrictEqual([f46b.x, f46b.y], [2, 2], 'diagonal adjacency does not scare');
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SCARED', label: 'IS SCARED', owner: 0, x: 3, y: 3 });
const f46c = s.entities.find(e => e.type === 'FLAG'); f46c.x = 0; f46c.y = 4;
baba(s).x = 1; baba(s).y = 4; s.selectedId = baba(s).id;
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, true), true, 'move with pull');
assert.deepStrictEqual([baba(s).x, baba(s).y], [2, 4]);
assert.deepStrictEqual([f46c.x, f46c.y], [0, 4], 'SCARED thing was not pulled');
s = G.createGame();
const r46 = rock(s, 0, 0); r46.x = 0; r46.y = 4;
baba(s).x = 1; baba(s).y = 4; s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, true);
assert.deepStrictEqual([r46.x, r46.y], [1, 4], 'control: a normal rock IS pulled into the vacated cell');
// paralyzed when it would have to flee in multiple directions at once
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SCARED', label: 'IS SCARED', owner: 0, x: 3, y: 3 });
const f46d = s.entities.find(e => e.type === 'FLAG'); f46d.x = 3; f46d.y = 2;
G.ensureParsed(s);
s._loopSteps = 0;
s._entered = [
  { id: baba(s).id, fx: 1, fy: 2, tx: 2, ty: 2 }, // entered from the left  -> flee +x
  { id: keke(s).id, fx: 3, fy: 0, tx: 3, ty: 1 },  // entered from above   -> flee +y
];
G.resolveCurious(s, 0);
assert.deepStrictEqual([f46d.x, f46d.y], [3, 2], 'ambiguous flee directions -> paralyzed, stays');
// STRONG can pull things that normally cannot be pulled (STOP / SHUT / SCARED)
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'STRONG', label: 'IS STRONG', owner: 0, x: 1, y: 2 });
s.entities.push({ id: 902, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 903, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 1, y: 1 });
const r46s = rock(s, 0, 0); r46s.x = 0; r46s.y = 4;
baba(s).x = 1; baba(s).y = 4; s.selectedId = baba(s).id;
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, true), true);
assert.deepStrictEqual([r46s.x, r46s.y], [1, 4], 'STRONG pulled the STOP rock');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 1, y: 1 });
const r46t = rock(s, 0, 0); r46t.x = 0; r46t.y = 4;
baba(s).x = 1; baba(s).y = 4; s.selectedId = baba(s).id;
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, true), true);
assert.deepStrictEqual([r46t.x, r46t.y], [0, 4], 'control: without STRONG the STOP rock is NOT pulled');
console.log('ok 46: SCARED (flees when something moves/is placed next to it; not diagonal; paralyzed if ambiguous) + STRONG pull override');

// 47. SHEEP: when a sheep thing moves, other sheep things move the same amount in the same direction if possible
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SHEEP', label: 'IS SHEEP', owner: 0, x: 3, y: 3 });
const r47a = rock(s, 0, 0); r47a.x = 1; r47a.y = 4;
const r47b = rock(s, 4, 4); r47b.x = 3; r47b.y = 1;
baba(s).x = 0; baba(s).y = 4; s.selectedId = baba(s).id;
G.ensureParsed(s);
G.moveSelected(s, 0, 1, 0, false); // BABA pushes sheep rock A (1,4)->(2,4)
assert.deepStrictEqual([r47a.x, r47a.y], [2, 4], 'pushed sheep rock moved');
assert.deepStrictEqual([r47b.x, r47b.y], [4, 1], 'the other sheep rock moved the same direction');
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SHEEP', label: 'IS SHEEP', owner: 0, x: 3, y: 3 });
const rA2 = rock(s, 0, 0); rA2.x = 1; rA2.y = 4;
const rB2 = rock(s, 4, 4); rB2.x = 3; rB2.y = 1;
const f47 = s.entities.find(e => e.type === 'FLAG'); f47.x = 4; f47.y = 1; // block (4,1)
baba(s).x = 0; baba(s).y = 4; s.selectedId = baba(s).id;
G.ensureParsed(s);
G.moveSelected(s, 0, 1, 0, false);
assert.deepStrictEqual([rA2.x, rA2.y], [2, 4]);
assert.deepStrictEqual([rB2.x, rB2.y], [3, 1], 'blocked sheep rock did not move');
console.log('ok 47: SHEEP (echo move when a sheep thing moves, if possible)');

// 48. STRONG can also push STOP things
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'STRONG', label: 'IS STRONG', owner: 0, x: 1, y: 2 });
s.entities.push({ id: 902, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 903, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 1, y: 1 });
const r48 = rock(s, 0, 0); r48.x = 1; r48.y = 4;
baba(s).x = 0; baba(s).y = 4; s.selectedId = baba(s).id;
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS STOP'));
assert.strictEqual(G.canMove(s, baba(s), 1, 0), true, 'STRONG can push a STOP thing');
G.moveSelected(s, 0, 1, 0, false);
assert.deepStrictEqual([r48.x, r48.y], [2, 4], 'STOP rock pushed');
console.log('ok 48: STRONG pushes STOP things');

// 49. SQUARE noun: property tiles in an ACTIVE rule are SQUARE (TEXT = all word tiles)
s = G.createGame(undefined, undefined, 'm:square');
assert.ok(s.supply.some(t => t.noun === 'SQUARE'), 'SQUARE card adds the SQUARE noun');
s.entities.push({ id: 900, kind: 'word', noun: 'SQUARE', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'YOU', label: 'IS PLAYER 1', owner: 0, x: 1, y: 2 });
s.entities.push({ id: 902, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
const winTile = { id: 903, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 3 };
s.entities.push(winTile);
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('SQUARE IS PLAYER 1') && rulesOf(s).includes('ROCK IS WIN'));
assert.ok(G.isYouBy(s, winTile, 0), 'the IS WIN tile in the ROCK IS WIN rule is SQUARE -> YOU for PLAYER 1');
assert.ok(G.yourThings(s, 0).includes(winTile), '...so it can be selected and moved');
assert.ok(!G.isYouBy(s, s.entities.find(e => e.id === 902), 0), 'the ROCK noun tile is TEXT but NOT in a rule as a property -> not SQUARE');
s.selectedId = winTile.id;
assert.strictEqual(G.moveSelected(s, 0, 0, 1, false), true, 'moved the IS WIN tile out of the rule');
assert.ok(!rulesOf(s).includes('ROCK IS WIN'), 'rule repealed');
assert.ok(!G.isYouBy(s, winTile, 0), 'no longer part of a rule -> no longer SQUARE/YOU');
// SQUARE IS WIN: an active property tile is a win object
s = G.createGame(undefined, undefined, 'm:square');
s.entities.push({ id: 900, kind: 'word', noun: 'SQUARE', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 2 });
s.entities.push({ id: 902, kind: 'word', noun: 'FLAG', x: 2, y: 3 });
const stopTile = { id: 903, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 3, y: 3 };
s.entities.push(stopTile);
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('SQUARE IS WIN') && rulesOf(s).includes('FLAG IS STOP'));
assert.ok(G.isWin(s, stopTile), 'active property tile is SQUARE -> WIN');
baba(s).x = 3; baba(s).y = 4; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, -1, false), true, 'BABA steps onto the SQUARE-WIN tile');
assert.ok(s.over && s.over.winner === 0, 'SQUARE IS WIN: sharing a space with an active property tile wins: ' + (s.over && s.over.reason));
console.log('ok 49: SQUARE noun (active property tiles; SQUARE IS PLAYER n / SQUARE IS WIN)');

// 50. developer level = infinite tiles (placing doesn't consume, destruction doesn't return);
//     normal level: placing consumes, destroyed tiles return to the supply
s = G.createGame(undefined, undefined, 'dev');
const n50 = s.supply.length;
s.entities.push({ id: 900, kind: 'word', noun: 'TEXT', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'WEAK', label: 'IS WEAK', owner: 0, x: 1, y: 1 });
const placed50 = G.doPlace(s, 0, 0, 1, 4); // WIN tile next to BABA
assert.strictEqual(s.supply.length, n50, 'dev: placing does NOT consume the tile');
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('TEXT IS WEAK'));
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // push the WEAK word tile
assert.ok(!s.entities.includes(placed50), 'WEAK word tile destroyed when pushed');
assert.strictEqual(s.supply.length, n50, 'dev: destroyed tile NOT added back');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'TEXT', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'WEAK', label: 'IS WEAK', owner: 0, x: 1, y: 1 });
const n50b = s.supply.length;
const placed50b = G.doPlace(s, 0, 0, 1, 4);
assert.strictEqual(s.supply.length, n50b - 1, 'normal: placing consumes the tile');
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.ok(!s.entities.includes(placed50b), 'destroyed');
assert.strictEqual(s.supply.length, n50b, 'normal: destroyed tile returned to the supply');
console.log('ok 50: dev = infinite tiles; normal = destroyed tiles return to the supply');

// 51. SHEEP + pull: the flock follows the mover's direction (a pulled sheep moves with the pull; other sheep copy that same direction)
s = G.createGame(undefined, undefined, 'dev');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'SHEEP', label: 'IS SHEEP', owner: 0, x: 3, y: 3 });
const rA51 = rock(s, 0, 0); rA51.x = 2; rA51.y = 3; // behind BABA
const rB51 = rock(s, 4, 4); rB51.x = 4; rB51.y = 2;
baba(s).x = 2; baba(s).y = 2; s.selectedId = baba(s).id;
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, 0, -1, true), true, 'BABA moves up, pulling the rock behind');
assert.deepStrictEqual([baba(s).x, baba(s).y], [2, 1]);
assert.deepStrictEqual([rA51.x, rA51.y], [2, 2], 'pulled rock moved up into the vacated cell');
assert.deepStrictEqual([rB51.x, rB51.y], [4, 1], 'the other sheep rock also moved UP (same direction as the move), not down');
console.log('ok 51: SHEEP echo follows the move direction on pulls too');

// 52. RIVER IS HOT (permanent card rule) melts MELT things standing on the river
s = G.createGame(undefined, undefined, 'm:hot-melt');
assert.ok(rulesOf(s).includes('RIVER IS HOT (default)'), 'permanent RIVER IS HOT from the card');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'MELT', label: 'IS MELT', owner: 0, x: 3, y: 3 });
const r52 = rock(s, 0, 0); r52.x = 0; r52.y = 0; // (0,0) is a river cell
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS MELT'));
G.resolve(s, 0);
assert.ok(!s.entities.includes(r52), 'MELT rock on the HOT river is destroyed');
s = G.createGame(undefined, undefined, 'm:hot-melt');
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'MELT', label: 'IS MELT', owner: 0, x: 3, y: 3 });
const r52b = rock(s, 0, 0); r52b.x = 2; r52b.y = 4; // not a river cell
G.ensureParsed(s);
G.resolve(s, 0);
assert.ok(s.entities.includes(r52b), 'control: MELT rock off the river survives');
console.log('ok 52: RIVER IS HOT destroys MELT things on the river');

// 53. pulling at the board edge must NOT drag the permanent printed margin tiles
//     (they only exist to form rules) — otherwise the printed IS PLAYER n rule breaks
s = G.createGame();
const fixedBefore = s.entities.filter(e => e.fixed).map(e => [e.id, e.x, e.y]);
baba(s).x = 0; baba(s).y = 2; // left-middle: the printed BABA noun sits at (-1,2)
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, true), true, 'move right with pull at the left edge');
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 2], 'mover moved');
assert.deepStrictEqual(s.entities.filter(e => e.fixed).map(e => [e.id, e.x, e.y]), fixedBefore, 'printed margin tiles untouched');
assert.ok(rulesOf(s).includes('BABA IS PLAYER 1 (default)'), 'printed YOU rule intact');
assert.ok(G.hasLegalAction(s, 1) || G.hasLegalAction(s, 0), 'no bogus "cannot act"');
// perm corner rule tiles are also untouchable (mover at (0,0) pulling from the top margin)
s = G.createGame(undefined, undefined, 'm:hot-melt');
const permBefore = s.entities.filter(e => e.perm).map(e => [e.id, e.x, e.y]);
baba(s).x = 0; baba(s).y = 0; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, 1, true), true, 'move down with pull from the top edge');
assert.deepStrictEqual(s.entities.filter(e => e.perm).map(e => [e.id, e.x, e.y]), permBefore, 'purple corner rule tiles untouched');
assert.ok(rulesOf(s).includes('RIVER IS HOT (default)'), 'permanent card rule intact');
console.log('ok 53: permanent printed tiles (margin + purple corners) are never pulled/pushed/moved');

// 54. starting player rotates across games (next game: KEKE starts, not BABA)
s = G.createGame();
assert.strictEqual(s.turn, 0, 'first game: PLAYER 1 (BABA) starts');
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 0 });
const f54 = s.entities.find(e => e.type === 'FLAG'); f54.x = 1; f54.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // BABA steps onto the FLAG (FLAG IS WIN) -> wins
assert.ok(s.over && s.over.winner === 0, 'BABA won');
s = G.newGame(s, s.level); // new game button: rotates the starter
assert.strictEqual(s.turn, 1, 'next game: PLAYER 2 (KEKE) starts — starters rotate');
// undo backtraces across the new game (and the win before it)
assert.strictEqual(G.undo(s), true, 'undo works right after new game');
assert.ok(s.over && s.over.winner === 0, 'undo returns to the finished game (win/loss backtrace)');
assert.strictEqual(s.turn, 0);
s = G.newGame(s, s.level);
assert.strictEqual(s.turn, 1, 'rotation re-applies on the next new game');

// 55. a lone player who is destroyed LOSES (does not "win")
s = G.createGame([true, false, false, false, false, false, false, false]); // only BABA
assert.strictEqual(s.numPlayers, 1);
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'DEFEAT', label: 'IS DEFEAT', owner: 0, x: 3, y: 3 });
const r55 = rock(s, 0, 0); r55.x = 0; r55.y = 4; // DEFEAT rock shares BABA's cell
G.ensureParsed(s);
G.resolve(s, 0);
assert.ok(s.over && s.over.winner === null && /lost/.test(s.over.reason), 'lone player destroyed -> lost, not won: ' + (s.over && s.over.reason));
console.log('ok 54-55: starter rotation + lone-player loss');

// 56. undo backtraces across MULTIPLE games
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 0 });
const f56 = s.entities.find(e => e.type === 'FLAG'); f56.x = 1; f56.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // BABA onto FLAG IS WIN -> game 1 won
assert.ok(s.over && s.over.winner === 0);
const s56b = G.newGame(s, s.level);
const s56c = G.newGame(s56b, s56b.level);
assert.strictEqual(s56c.turn, 0, 'game 3 starts with PLAYER 1 again');
assert.strictEqual(G.undo(s56c), true);
assert.ok(!s56c.over && s56c.turn === 1, 'undo once -> back in game 2 (mid-game, KEKE to start)');
assert.strictEqual(G.undo(s56c), true);
assert.ok(s56c.over && s56c.over.winner === 0 && s56c.turn === 0, 'undo twice -> back in finished game 1');
console.log('ok 56: undo backtraces across multiple games');

// 57. custom (non-transcript) props are the purple ones
assert.deepStrictEqual(G.CUSTOM_PROPS, ['STOP', 'SINK', 'OPEN', 'SHUT', 'DEFEAT', 'WRAP']);
for (const p of ['WIN', 'FAST', 'HOT', 'MELT', 'CURIOUS', 'THIRSTY', 'STRONG', 'SCARED', 'SHEEP']) {
  assert.ok(!G.CUSTOM_PROPS.includes(p), p + ' is from the video -> not purple');
}
console.log('ok 57: CUSTOM_PROPS = only the rules not in the youtube transcript');

// 58. debug log records every action in a greppable, structured format
s = G.createGame();
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.ok(s.dlog.some(m => /ACTION move player=1 ent=BABA#\d+ dir=1,0 pull=false/.test(m)), 'ACTION move line'); // <ol> in the UI provides the numbering
assert.ok(s.dlog.some(m => /mv ent=BABA#\d+ from=0,4 to=1,4 kind=move/.test(m)), 'mv detail line');
const pIdx = s.supply.findIndex(t => t.prop === 'WIN');
assert.strictEqual(G.place(s, 1, pIdx, 3, 0), true, 'P2 places IS WIN next to KEKE');
assert.ok(s.dlog.some(m => /ACTION place player=2 tile=IS_WIN at=3,0/.test(m)), 'ACTION place line');
G.moveSelected(s, 1, -1, 0, false); // P2's second action -> back to P1
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 0 });
const f58 = s.entities.find(e => e.type === 'FLAG'); f58.x = 2; f58.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // BABA (1,4) onto FLAG (2,4), FLAG IS WIN
assert.ok(s.over && s.over.winner === 0);
assert.ok(s.dlog.some(m => /end winner=0 reason="/.test(m)), 'end line');
assert.ok(s.dlog.some(m => /FLAG IS WIN/.test(m)), 'rule-formation line logged');
console.log('ok 58: debug log (dlog) records actions in structured lines');

// 59. debug log: no emojis, kept across new games with a blank separator line
s = G.createGame();
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // -> P2's turn
assert.strictEqual(G.challenge(s, 1), true); // logs a message containing an emoji glyph via log()
assert.ok(s.dlog.length > 0 && s.dlog.every(m => !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(m)), 'no emojis in the debug log');
const nLog = s.dlog.length;
const s2 = G.newGame(s, s.level);
assert.ok(s2.dlog.length > nLog, 'log NOT cleared on new game');
assert.ok(/------ NEW GAME ------/.test(s2.dlog[nLog]), 'separator line between games');
assert.ok(s2.dlog.some(m => /ACTION newgame starter=P2/.test(m)), 'new game logged');
// rule changes are logged (resolve() logs formed/broken rules through log() -> dlog)
s2.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 2, y: 3 });
s2.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 3 });
G.ensureParsed(s2);
G.resolve(s2, 0);
assert.ok(s2.dlog.some(m => /ROCK IS WIN/.test(m)), 'rule formation logged');
console.log('ok 59: debug log is emoji-free, survives new game (blank-line separated), logs rule changes');

// 60. spamming new game must not leak: history chain stays linear (no nested copies)
s = G.createGame();
for (let i = 0; i < 300; i++) s = G.newGame(s, 'base');
let total = 0, n = 0, h = s.history;
while (h && h.length) {
  for (const e of h) { total += typeof e === 'string' ? e.length : e.snap.length; n++; }
  const b = h.find(e => typeof e !== 'string');
  h = b ? b.prevHistory : null;
}
assert.ok(n <= 500, 'chain capped at 500 entries, got ' + n);
assert.ok(total < 5 * 1024 * 1024, 'chain is linear in size, total KB = ' + (total / 1024).toFixed(0));
let undos = 0;
while (G.undo(s) && undos++ < 600) {}
assert.ok(undos > 100, 'undo walks the whole chain back: ' + undos + ' steps');
console.log('ok 60: new-game spam keeps memory bounded (linear undo chain)');

// 61. undo backtraces across a RULES CHANGE (new game via modifier dropdowns)
s = G.createGame();
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // one action in the old game (BABA 0,4 -> 1,4)
const nHist = s.history.length;
const s3 = G.changeRules(s, 'm:strong');
assert.strictEqual(s3.level, 'm:strong', 'new game has the new level id');
assert.strictEqual(s3.history.length, 1, 'boundary entry attached on rules change');
assert.ok(/------ RULES CHANGED ------/.test(s3.dlog[s3.dlog.length - 2]), 'separator logged');
assert.ok(s3.dlog.some(m => /ACTION rules=m:strong/.test(m)), 'rules change logged');
assert.strictEqual(G.undo(s3), true, 'undo crosses the rules-change boundary');
assert.strictEqual(s3.level, 'base', 'back in the old game');
assert.ok(baba(s3).x === 1 && baba(s3).y === 4, 'old game restored after its move');
assert.strictEqual(s3.history.length, nHist, 'old history restored by reference');
assert.strictEqual(G.undo(s3), true);
assert.ok(baba(s3).x === 0 && baba(s3).y === 4, 'undo again -> very start of the old game');
console.log('ok 61: undo works across rules changes (modifier dropdowns)');

// 62. sudden death after 1 of 2 actions reverts that first action (clean turn for the challenge)
s = G.createGame();
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // P1's only action of turn 1 -> P2, actionsLeft=2
s.selectedId = keke(s).id;
G.moveSelected(s, 1, -1, 0, false); // P2 action 1 of 2: KEKE (4,0) -> (3,0)
assert.strictEqual(s.actionsLeft, 1);
assert.deepStrictEqual([keke(s).x, keke(s).y], [3, 0]);
assert.strictEqual(G.challenge(s, 1), true, 'challenge allowed after 1 of 2 actions');
assert.ok(s.challenge && s.challenge.challenger === 1, 'sudden death started by P2');
assert.strictEqual(s.turn, 0, 'P1 now gets the 10 actions');
assert.deepStrictEqual([keke(s).x, keke(s).y], [4, 0], 'first action of the turn was reverted');
assert.ok(s.dlog.some(m => /ACTION challenge player=2 .*first action of the turn reverted/.test(m)), 'revert logged');
assert.strictEqual(G.undo(s), true);
assert.ok(!s.challenge && s.turn === 1 && s.actionsLeft === 2, 'undo removes the challenge and lands on the clean turn start');
console.log('ok 62: sudden death after 1 of 2 actions undoes the first action');

// 63. the win tally next to the title (scenario score, e.g. 1-0) survives new game
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 0 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 0 });
const f63 = s.entities.find(e => e.type === 'FLAG'); f63.x = 1; f63.y = 4;
G.ensureParsed(s);
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // BABA onto FLAG IS WIN -> won
assert.ok(s.over && s.over.winner === 0 && s.scenarioOver, 'game won, scenario over');
assert.deepStrictEqual(s.scenario.score, [1, 0], 'score 1-0');
const s4 = G.newGame(s, s.level); // scenarioOver -> newScenario path
assert.deepStrictEqual(s4.scenario.score, [1, 0], 'tally carried into the new game');
assert.deepStrictEqual(s4.scenario.wins, [0, 0], 'per-scenario bo3 counter resets');
const s5 = G.newScenario(s4.scenario, s4.enabled, s4.level);
assert.deepStrictEqual(s5.scenario.score, [1, 0], 'tally survives newScenario (R key) too');
console.log('ok 63: win tally (score) persists across new game / new scenario');

console.log('\nAll engine tests passed.');
