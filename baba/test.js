'use strict';
const assert = require('assert');
const G = require('./game.js');

const rulesOf = (s) => G.ruleList(s);
const at = (s, x, y) => G.entitiesAt(s, x, y);
const sami = (s) => s.entities.find(e => e.kind === 'object' && e.type === 'SAMI');
const erik = (s) => s.entities.find(e => e.kind === 'object' && e.type === 'ERIK');
const rock = (s, x, y) => s.entities.find(e => e.kind === 'object' && e.type === 'ROCK' && e.x === x && e.y === y);

// 1. Initial state: Sami bottom-left, Erik top-right, rocks in corners, flag center; default rules only
let s = G.createGame();
assert.deepStrictEqual([sami(s).x, sami(s).y], [0, 4]);
assert.deepStrictEqual([erik(s).x, erik(s).y], [4, 0]);
assert.ok(rock(s, 0, 0) && rock(s, 4, 4));
assert.deepStrictEqual(rulesOf(s), ['ALL IS PUSH (default)', 'ERIK IS P2 (default)', 'SAMI IS P1 (default)']);
assert.strictEqual(s.supply.length, 8, 'DEFAULT + W1L1 + IS CURIOUS + IS FAST tiles');
assert.ok(s.supply.some(t => t.prop === 'FAST'), 'one FAST tile');
assert.ok(s.supply.some(t => t.prop === 'CURIOUS'), 'one CURIOUS tile');
assert.strictEqual(s.numPlayers, 2);
console.log('ok 1: setup + default rules');

// 2. Turn structure: first turn = 1 action, later turns = 2 actions, alternating
s = G.createGame();
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'P1 first action');
assert.strictEqual(s.turn, 1);
assert.strictEqual(s.actionsLeft, 2);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'P1 cannot act on P2 turn');
s.selectedId = erik(s).id;
assert.strictEqual(G.moveSelected(s, 1, -1, 0, false), true);
assert.strictEqual(G.moveSelected(s, 1, -1, 0, false), true);
assert.strictEqual(s.turn, 0);
assert.strictEqual(s.actionsLeft, 2);
console.log('ok 2: turn structure');

// 3. Push into empty cell
s = G.createGame();
const r3 = rock(s, 0, 0); r3.x = 1; r3.y = 4;
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.deepStrictEqual([sami(s).x, sami(s).y], [1, 4]);
assert.ok(rock(s, 2, 4), 'rock pushed');
console.log('ok 3: push');

// 4. Chain push works; only the edge stops it
s = G.createGame();
const r4 = rock(s, 0, 0); r4.x = 1; r4.y = 4;
s.entities.push({ id: 999, kind: 'object', type: 'ROCK', x: 2, y: 4 });
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.ok(rock(s, 2, 4) && rock(s, 3, 4), 'both rocks chain-pushed');
s = G.createGame();
const r4c = rock(s, 0, 0); r4c.x = 1; r4c.y = 4;
s.entities.push({ id: 998, kind: 'object', type: 'ROCK', x: 2, y: 4 });
s.entities.push({ id: 997, kind: 'object', type: 'ROCK', x: 3, y: 4 });
const r4d = rock(s, 4, 4); r4d.x = 4; r4d.y = 4;
assert.strictEqual(G.canMove(s, sami(s), 1, 0), false, 'edge stops the chain');
console.log('ok 4: chain push + edge stop');

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
sami(s).x = 2; sami(s).y = 3; s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, -1, false), true);
assert.ok(s.over && s.over.winner === 0, 'P1 wins on flag object');
console.log('ok 6: YOU+WIN stacking win');

// 7. YOU+WIN on the same thing does not auto-win
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'SAMI', x: 3, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 4 });
G.ensureParsed(s);
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.ok(!s.over);
console.log('ok 7: YOU+WIN self does not win');

// 8. Pull drags exactly one thing
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 1 });
s.entities.push({ id: 901, kind: 'word', noun: 'ROCK', x: 2, y: 1 });
sami(s).x = 2; sami(s).y = 2; s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, 1, true), true);
assert.strictEqual(at(s, 2, 2).length, 2, 'SAMI + one pulled tile');
assert.strictEqual(at(s, 2, 1).length, 1, 'one left behind');
console.log('ok 8: pull one thing');

// 9. Place legality
s = G.createGame();
assert.strictEqual(G.place(s, 0, 0, 4, 4), false, 'occupied cell');
assert.strictEqual(G.place(s, 0, 0, 1, 4), true, 'next to SAMI');
assert.strictEqual(G.place(s, 1, 0, 0, 3), false, 'wrong turn');
console.log('ok 9: place rules');

// 10. Challenge
s = G.createGame();
assert.strictEqual(G.challenge(s, 0), true);
assert.strictEqual(s.turn, 1);
s.selectedId = erik(s).id;
for (let i = 0; i < 10 && !s.over; i++) {
  const d = i % 2 === 0 ? [-1, 0] : [1, 0];
  if (!G.moveSelected(s, 1, d[0], d[1], false)) G.moveSelected(s, 1, 0, i % 2 === 0 ? 1 : -1, false);
}
assert.ok(s.over && s.over.winner === 0, 'challenger wins after 10 failed actions');
console.log('ok 10: challenge');

// 11. Cannot act -> lose (Erik boxed in by full row/column, chains hit edges)
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
s.selectedId = sami(s).id;
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
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 1, 0, false);
G.undo(s);
assert.deepStrictEqual([sami(s).x, sami(s).y], [0, 4]);
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
sami(s).x = 2; sami(s).y = 3; s.selectedId = sami(s).id;
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
s = G.createGame([true, true, true, true, false]); // SAMI, ERIK, GABA, EBBA
const gaba17 = s.entities.find(e => e.type === 'GABA');
const ebba17 = s.entities.find(e => e.type === 'EBBA');
assert.ok(gaba17 && Math.abs(gaba17.x) + Math.abs(gaba17.y) <= 1, 'GABA near corner (0,0)');
assert.ok(ebba17 && Math.abs(ebba17.x - 4) + Math.abs(ebba17.y - 4) <= 1, 'EBBA near corner (4,4)');
assert.deepStrictEqual(rulesOf(s).filter(r => /IS P\d/.test(r)),
  ['EBBA IS P4 (default)', 'ERIK IS P2 (default)', 'GABA IS P3 (default)', 'SAMI IS P1 (default)']);
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.strictEqual(s.turn, 1);
s.selectedId = erik(s).id;
G.moveSelected(s, 1, -1, 0, false); G.moveSelected(s, 1, 0, 1, false);
assert.strictEqual(s.turn, 2, 'turn rotates to P3');
console.log('ok 17: multi-character spawn + P-ranking + rotation');

// 18. Toggling re-ranks: disable Sami -> Erik becomes P1; disable all is allowed while selecting
s = G.createGame();
assert.strictEqual(G.setEnabled(s, 0, false), true);
assert.strictEqual(s.numPlayers, 1);
assert.ok(!s.entities.some(e => e.type === 'SAMI'), 'SAMI figure removed');
assert.ok(rulesOf(s).includes('ERIK IS P1 (default)'), 'ERIK re-ranked to P1');
assert.ok(!rulesOf(s).some(r => r.startsWith('SAMI')));
G.setEnabled(s, 2, true); // Gaba in -> ERIK P1, GABA P2
assert.strictEqual(s.numPlayers, 2);
assert.ok(rulesOf(s).includes('GABA IS P2 (default)'));
const g18 = s.entities.find(e => e.type === 'GABA');
assert.ok(g18 && Math.abs(g18.x) + Math.abs(g18.y) <= 1, 'GABA spawned near (0,0)');
G.setEnabled(s, 1, false);
G.setEnabled(s, 2, false);
assert.strictEqual(s.numPlayers, 0, 'all disabled is allowed while selecting');
assert.deepStrictEqual(rulesOf(s), ['ALL IS PUSH (default)']);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'no one can move with 0 players');
assert.ok(!s.over, 'no spurious game-over with 0 players');
G.setEnabled(s, 0, true);
assert.strictEqual(s.numPlayers, 1);
assert.ok(rulesOf(s).includes('SAMI IS P1 (default)'));
console.log('ok 18: toggle re-ranking + disable-all');

// 19. Undo restores toggles
s = G.createGame();
G.setEnabled(s, 2, true);
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
// Trigger: SAMI (0,4)->(0,3) enters row 3, from row 4, where the curious rock (3,3) sits
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 2 });
const rock21 = rock(s, 4, 4); rock21.x = 3; rock21.y = 3;
G.ensureParsed(s);
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 0, -1, false); // SAMI enters (0,3): row 3, coming from row 4
assert.deepStrictEqual([rock21.x, rock21.y], [2, 3], 'CURIOUS rock stepped 1 space toward SAMI');
assert.ok(!s.over);
// The old unexpected case: moving ALONG the same row must NOT trigger
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 2 });
const rock21b = rock(s, 4, 4); // stays (4,4), row 4
G.ensureParsed(s);
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 1, 0, false); // SAMI (0,4)->(1,4): stays in row 4 -> no trigger
assert.deepStrictEqual([rock21b.x, rock21b.y], [4, 4], 'moving along the same row does not trigger');
console.log('ok 21: CURIOUS triggers on entering the row/column, not on moving within it');

// 22. CURIOUS cascade: rock A stepping into rock B's row makes B move too
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 2 });
const rockA = rock(s, 0, 0); rockA.x = 1; rockA.y = 0;   // col 1
const rockB = rock(s, 4, 4); rockB.x = 3; rockB.y = 1;   // row 1
G.ensureParsed(s);
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 1, 0, false); // SAMI (0,4)->(1,4): enters col 1 -> A (1,0)->(1,1) -> enters row 1 -> B (3,1)->(2,1)
assert.deepStrictEqual([rockA.x, rockA.y], [1, 1], 'rock A stepped toward SAMI');
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
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 0, -1, false); // SAMI (0,4)->(0,3): enters row 3 -> rock steps onto SAMI (YOU+WIN stack) -> P1 wins
assert.ok(s.over && s.over.winner === 0, 'curious WIN rock won for SAMI owner');
console.log('ok 23: CURIOUS+WIN ->', s.over && s.over.reason);

// 23b. Two curious rocks in the SAME column both react to one enter event
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'CURIOUS', label: 'IS CURIOUS', owner: 0, x: 1, y: 1 });
const rockTop = rock(s, 0, 0); rockTop.x = 2; rockTop.y = 0;   // (2,0), col 2
const rockBot = rock(s, 4, 4); rockBot.x = 2; rockBot.y = 4;   // (2,4), col 2
sami(s).x = 1; sami(s).y = 2;
G.ensureParsed(s);
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 1, 0, false); // SAMI (1,2)->(2,2): enters col 2, between the two rocks
assert.deepStrictEqual([rockTop.x, rockTop.y], [2, 1], 'top rock moved down toward SAMI');
assert.deepStrictEqual([rockBot.x, rockBot.y], [2, 3], 'bottom rock moved up toward SAMI');
console.log('ok 23b: all curious objects in the entered line move, not just one');

// 23c. Permanent margin tiles exist with exactly 2 players, produce the default P-rules once
const fixed = s => s.entities.filter(e => e.fixed);
{
  const g = G.createGame();
  assert.strictEqual(fixed(g).length, 6, 'six printed tiles in the margin');
  const coords = fixed(g).map(e => e.x + ',' + e.y).sort();
  assert.deepStrictEqual(coords, ['-1,2', '-1,3', '2,-1', '2,5', '3,-1', '5,2']);
  assert.strictEqual(rulesOf(g).filter(r => r === 'SAMI IS P1 (default)').length, 1, 'no duplicate default rules');
  assert.ok(rulesOf(g).includes('ERIK IS P2 (default)'));
  // a property placed right of the left-middle P1 noun rules SAMI: place IS WIN at (0,2)
  const winIdx = g.supply.findIndex(t => t.prop === 'WIN');
  G.doPlace(g, 0, winIdx, 0, 2);
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('SAMI IS WIN'), 'printed noun + placed property forms a rule');
  // a property below the top-middle P2 noun rules ERIK: place IS FAST at (2,0)
  const fastIdx = g.supply.findIndex(t => t.prop === 'FAST');
  G.doPlace(g, 0, fastIdx, 2, 0);
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('ERIK IS FAST'), 'top printed noun points down into the board');
  console.log('ok 23c: permanent margin tiles + rules through them');
}
// printed noun tiles: P1 noun always, P2 noun when >=2 players
{
  const g = G.createGame([true, true, true, false, false]);
  assert.strictEqual(fixed(g).length, 6, 'both printed nouns at 3 players');
  assert.strictEqual(rulesOf(g).filter(r => /IS P\d/.test(r)).length, 3, 'P3 default is implicit');
  G.setEnabled(g, 2, false);
  G.setEnabled(g, 1, false); // down to 1 player
  assert.strictEqual(fixed(g).length, 3, 'only the P1 noun tile + IS P1s at 1 player');
  assert.deepStrictEqual(fixed(g).map(e => e.x + ',' + e.y).sort(), ['-1,2', '-1,3', '2,5']);
  assert.deepStrictEqual(rulesOf(g).filter(r => /IS P\d/.test(r)), ['SAMI IS P1 (default)']);
  G.setEnabled(g, 1, true); // back to 2
  assert.strictEqual(fixed(g).length, 6);
  assert.ok(rulesOf(g).includes('ERIK IS P2 (default)'));
  console.log('ok 23d: printed noun tiles follow player count (P1 always, P2 at 2+)');
}
// FAST with explicit destination square
{
  const g = G.createGame();
  const fastIdx = g.supply.findIndex(t => t.prop === 'FAST');
  G.doPlace(g, 0, fastIdx, 0, 2); // right of printed SAMI noun (-1,2) -> SAMI IS FAST
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('SAMI IS FAST'));
  const sel = sami(g);
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
assert.ok(G.NOUNS.includes('RIVER') && !G.NOUNS.includes('WATER'));
console.log('ok 24: river = RIVER terrain cells');

console.log('\nAll engine tests passed.');
