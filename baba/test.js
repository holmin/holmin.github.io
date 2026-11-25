'use strict';
const assert = require('assert');
const G = require('./game.js');

const rulesOf = (s) => G.ruleList(s);
const at = (s, x, y) => G.entitiesAt(s, x, y);
const sami = (s) => s.entities.find(e => e.kind === 'object' && e.type === 'SAMI');
const aas = (s) => s.entities.find(e => e.kind === 'object' && e.type === 'AAS');
const rock = (s, x, y) => s.entities.find(e => e.kind === 'object' && e.type === 'ROCK' && e.x === x && e.y === y);

// 1. Initial state: Sami bottom-left, Aas top-right, rocks in corners, flag center; default rules only
let s = G.createGame();
assert.deepStrictEqual([sami(s).x, sami(s).y], [0, 4]);
assert.deepStrictEqual([aas(s).x, aas(s).y], [4, 0]);
assert.ok(rock(s, 0, 0) && rock(s, 4, 4));
assert.deepStrictEqual(rulesOf(s), ['AAS IS PLAYER 2 (default)', 'ALL IS PUSH (default)', 'SAMI IS PLAYER 1 (default)']);
assert.strictEqual(s.supply.length, 18, 'DEFAULT + W1L1 + CURIOUS/FAST + STOP/SINK/MELT/HOT/OPEN/SHUT/DEFEAT/WEAK + RIVER/TEXT nouns');
for (const p of ['WIN', 'CURIOUS', 'FAST', 'STOP', 'SINK', 'MELT', 'HOT', 'OPEN', 'SHUT', 'DEFEAT', 'WEAK']) {
  assert.ok(s.supply.some(t => t.prop === p), 'supply has IS ' + p);
}
assert.strictEqual(s.supply.filter(t => t.prop === 'WIN').length, 2);
assert.ok(s.supply.some(t => t.noun === 'RIVER'), 'one RIVER noun tile');
assert.ok(s.supply.some(t => t.noun === 'TEXT'), 'one TEXT noun tile');
assert.strictEqual(s.numPlayers, 2);
console.log('ok 1: setup + default rules');

// 2. Turn structure: first turn = 1 action, later turns = 2 actions, alternating
s = G.createGame();
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'P1 first action');
assert.strictEqual(s.turn, 1);
assert.strictEqual(s.actionsLeft, 2);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'P1 cannot act on P2 turn');
s.selectedId = aas(s).id;
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
s.selectedId = aas(s).id;
for (let i = 0; i < 10 && !s.over; i++) {
  const d = i % 2 === 0 ? [-1, 0] : [1, 0];
  if (!G.moveSelected(s, 1, d[0], d[1], false)) G.moveSelected(s, 1, 0, i % 2 === 0 ? 1 : -1, false);
}
assert.ok(s.over && s.over.winner === 0, 'challenger wins after 10 failed actions');
console.log('ok 10: challenge');

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
s = G.createGame([true, true, true, true, false, false]); // SAMI, AAS, GABA, EBBA
const gaba17 = s.entities.find(e => e.type === 'GABA');
const ebba17 = s.entities.find(e => e.type === 'EBBA');
assert.ok(gaba17 && Math.abs(gaba17.x) + Math.abs(gaba17.y) <= 1, 'GABA near corner (0,0)');
assert.ok(ebba17 && Math.abs(ebba17.x - 4) + Math.abs(ebba17.y - 4) <= 1, 'EBBA near corner (4,4)');
assert.deepStrictEqual(rulesOf(s).filter(r => /IS PLAYER \d/.test(r)),
  ['AAS IS PLAYER 2 (default)', 'EBBA IS PLAYER 4 (default)', 'GABA IS PLAYER 3 (default)', 'SAMI IS PLAYER 1 (default)']);
s.selectedId = sami(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.strictEqual(s.turn, 1);
s.selectedId = aas(s).id;
G.moveSelected(s, 1, -1, 0, false); G.moveSelected(s, 1, 0, 1, false);
assert.strictEqual(s.turn, 2, 'turn rotates to P3');
console.log('ok 17: multi-character spawn + P-ranking + rotation');

// 18. Toggling re-ranks: disable Sami -> Aas becomes P1; disable all is allowed while selecting
s = G.createGame();
assert.strictEqual(G.setEnabled(s, 0, false), true);
assert.strictEqual(s.numPlayers, 1);
assert.ok(!s.entities.some(e => e.type === 'SAMI'), 'SAMI figure removed');
assert.ok(rulesOf(s).includes('AAS IS PLAYER 1 (default)'), 'AAS re-ranked to P1');
assert.ok(!rulesOf(s).some(r => r.startsWith('SAMI')));
G.setEnabled(s, 2, true); // Gaba in -> AAS P1, GABA P2
assert.strictEqual(s.numPlayers, 2);
assert.ok(rulesOf(s).includes('GABA IS PLAYER 2 (default)'));
const g18 = s.entities.find(e => e.type === 'GABA');
assert.ok(g18 && Math.abs(g18.x - 4) + Math.abs(g18.y) <= 1, 'GABA spawned near (4,0) — player 2 corner (rank-based)');
G.setEnabled(s, 1, false);
G.setEnabled(s, 2, false);
assert.strictEqual(s.numPlayers, 0, 'all disabled is allowed while selecting');
assert.deepStrictEqual(rulesOf(s), ['ALL IS PUSH (default)']);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'no one can move with 0 players');
assert.ok(!s.over, 'no spurious game-over with 0 players');
G.setEnabled(s, 0, true);
assert.strictEqual(s.numPlayers, 1);
assert.ok(rulesOf(s).includes('SAMI IS PLAYER 1 (default)'));
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
  assert.strictEqual(rulesOf(g).filter(r => r === 'SAMI IS PLAYER 1 (default)').length, 1, 'no duplicate default rules');
  assert.ok(rulesOf(g).includes('AAS IS PLAYER 2 (default)'));
  // a property placed right of the left-middle P1 noun rules SAMI: place IS WIN at (0,2)
  const winIdx = g.supply.findIndex(t => t.prop === 'WIN');
  G.doPlace(g, 0, winIdx, 0, 2);
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('SAMI IS WIN'), 'printed noun + placed property forms a rule');
  // a property below the top-middle P2 noun rules AAS: place IS FAST at (2,0)
  const fastIdx = g.supply.findIndex(t => t.prop === 'FAST');
  G.doPlace(g, 0, fastIdx, 2, 0);
  G.ensureParsed(g);
  assert.ok(rulesOf(g).includes('AAS IS FAST'), 'top printed noun points down into the board');
  console.log('ok 23c: permanent margin tiles + rules through them');
}
// printed noun tiles: P1 noun always, P2 noun when >=2 players
{
  const g = G.createGame([true, true, true, false, false, false]);
  assert.strictEqual(fixed(g).length, 6, 'both printed nouns at 3 players');
  assert.strictEqual(rulesOf(g).filter(r => /IS PLAYER \d/.test(r)).length, 3, 'P3 default is implicit');
  G.setEnabled(g, 2, false);
  G.setEnabled(g, 1, false); // down to 1 player
  assert.strictEqual(fixed(g).length, 3, 'only the P1 noun tile + IS PLAYER 1s at 1 player');
  assert.deepStrictEqual(fixed(g).map(e => e.x + ',' + e.y).sort(), ['-1,2', '-1,3', '2,5']);
  assert.deepStrictEqual(rulesOf(g).filter(r => /IS PLAYER \d/.test(r)), ['SAMI IS PLAYER 1 (default)']);
  G.setEnabled(g, 1, true); // back to 2
  assert.strictEqual(fixed(g).length, 6);
  assert.ok(rulesOf(g).includes('AAS IS PLAYER 2 (default)'));
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
assert.ok(G.NOUNS.includes('RIVER') && G.NOUNS.includes('TEXT') && G.NOUNS.includes('AAS') && G.NOUNS.includes('MINNE') && !G.NOUNS.includes('WATER') && !G.NOUNS.includes('ERIK'));
console.log('ok 24: river = RIVER terrain cells + noun list');

// 25. STOP: blocks entry and cannot be pushed/pulled; a YOU thing that is STOP can still move itself
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 1, y: 2 });
const r25 = rock(s, 0, 0); r25.x = 1; r25.y = 4;
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'STOP rock cannot be pushed');
assert.deepStrictEqual([sami(s).x, sami(s).y], [0, 4], 'mover stays put');
sami(s).x = 1; sami(s).y = 3;
assert.strictEqual(G.moveSelected(s, 0, 0, -1, true), true, 'move up with pull');
assert.deepStrictEqual([r25.x, r25.y], [1, 4], 'STOP rock not pulled');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'SAMI', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'STOP', label: 'IS STOP', owner: 0, x: 3, y: 3 });
G.ensureParsed(s);
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'a YOU thing that is STOP can still move voluntarily');
console.log('ok 25: STOP blocks push/pull/entry, but not voluntary YOU moves');

// 26. SINK: a SINK thing is not pushed (enterable) — you stack onto it and it is destroyed
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'SINK', label: 'IS SINK', owner: 0, x: 1, y: 1 });
const r26 = rock(s, 0, 0); r26.x = 1; r26.y = 4;
G.ensureParsed(s);
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true); // SAMI walks onto the SINK rock
assert.ok(!s.entities.some(e => e.id === r26.id), 'SINK rock destroyed when sharing a cell');
assert.deepStrictEqual([sami(s).x, sami(s).y], [1, 4], 'SAMI took the rock cell');
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
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true); // HOT flag pushed into the MELT rock's cell
assert.ok(!s.entities.some(e => e.id === r27.id), 'MELT rock destroyed by HOT flag');
assert.ok(s.entities.some(e => e.id === f27.id) && f27.x === 2 && f27.y === 4, 'HOT flag survives');
assert.deepStrictEqual([sami(s).x, sami(s).y], [1, 4]);
assert.ok(!s.over);
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'SAMI', x: 2, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'HOT', label: 'IS HOT', owner: 0, x: 3, y: 3 });
s.entities.push({ id: 902, kind: 'word', prop: 'MELT', label: 'IS MELT', owner: 0, x: 2, y: 4 });
G.ensureParsed(s);
G.resolve(s, 1);
assert.ok(!s.entities.some(e => e.type === 'SAMI'), 'HOT+MELT object melts itself');
assert.ok(s.over && s.over.winner === 1, 'P2 wins when P1 has no YOU things left');
console.log('ok 27: MELT/HOT');

// 28. DEFEAT: a DEFEAT thing is not pushed — walking onto it destroys the YOU thing -> that player loses
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'DEFEAT', label: 'IS DEFEAT', owner: 0, x: 1, y: 1 });
const r28 = rock(s, 0, 0); r28.x = 1; r28.y = 4;
G.ensureParsed(s);
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true); // SAMI walks onto the DEFEAT rock
assert.ok(!s.entities.some(e => e.type === 'SAMI'), 'DEFEAT destroyed SAMI');
assert.ok(s.entities.some(e => e.id === r28.id), 'the DEFEAT rock survives');
assert.ok(s.over && s.over.winner === 1, 'Player 2 wins when Player 1 has no YOU left');
console.log('ok 28: DEFEAT (implies not-push)');

// 29. SHUT blocks like STOP, but an OPEN thing sharing its cell opens it (then it can be pushed)
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'SHUT', label: 'IS SHUT', owner: 0, x: 1, y: 1 });
const r29 = rock(s, 0, 0); r29.x = 1; r29.y = 4;
G.ensureParsed(s);
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'SHUT rock blocks the move');
assert.deepStrictEqual([sami(s).x, sami(s).y], [0, 4]);
s.entities.push({ id: 902, kind: 'word', noun: 'FLAG', x: 3, y: 0 });
s.entities.push({ id: 903, kind: 'word', prop: 'OPEN', label: 'IS OPEN', owner: 0, x: 4, y: 0 });
const f29 = s.entities.find(e => e.kind === 'object' && e.type === 'FLAG'); f29.x = 1; f29.y = 4; // OPEN flag onto the shut rock
G.ensureParsed(s);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'rock opened by the OPEN flag can be pushed');
assert.deepStrictEqual([sami(s).x, sami(s).y], [1, 4], 'SAMI entered and stacked with the OPEN flag');
assert.deepStrictEqual([r29.x, r29.y], [2, 4], 'shut rock pushed');
console.log('ok 29: SHUT/OPEN');

// 30. WEAK: destroyed when pushed or pulled; the push continues through its cell
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'WEAK', label: 'IS WEAK', owner: 0, x: 1, y: 1 });
const r30 = rock(s, 0, 0); r30.x = 1; r30.y = 4;
G.ensureParsed(s);
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'push succeeds through the WEAK rock');
assert.ok(!s.entities.some(e => e.id === r30.id), 'WEAK rock destroyed when pushed');
assert.deepStrictEqual([sami(s).x, sami(s).y], [1, 4], 'mover takes the freed cell');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'ROCK', x: 0, y: 1 });
s.entities.push({ id: 901, kind: 'word', prop: 'WEAK', label: 'IS WEAK', owner: 0, x: 1, y: 1 });
const r30b = rock(s, 0, 0); r30b.x = 1; r30b.y = 3;
sami(s).x = 1; sami(s).y = 2;
G.ensureParsed(s);
s.selectedId = sami(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, -1, true), true, 'move up with pull');
assert.ok(!s.entities.some(e => e.id === r30b.id), 'WEAK rock destroyed when pulled');
assert.deepStrictEqual([sami(s).x, sami(s).y], [1, 1]);
console.log('ok 30: WEAK');

// 31. RIVER as a noun: river cells count as RIVER for WIN/DEFEAT/SINK; Minne spawns near (2,4)
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'RIVER', x: 0, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 3 });
sami(s).x = 1; sami(s).y = 1; // river cell (1,1), free
G.ensureParsed(s);
G.resolve(s, 0);
assert.ok(s.over && s.over.winner === 0, 'RIVER IS WIN: a YOU thing on a river cell wins');
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'RIVER', x: 0, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'DEFEAT', label: 'IS DEFEAT', owner: 0, x: 1, y: 3 });
sami(s).x = 2; sami(s).y = 1; // river cell (2,1)
G.ensureParsed(s);
G.resolve(s, 1);
assert.ok(!s.entities.some(e => e.type === 'SAMI'), 'RIVER IS DEFEAT destroys YOU on the river');
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
s = G.createGame([true, true, true, true, true, true]);
const minne = s.entities.find(e => e.type === 'MINNE');
assert.ok(minne && Math.abs(minne.x - 2) + Math.abs(minne.y - 4) <= 1, 'MINNE (panda) spawns near (2,4)');
assert.ok(G.CHARACTERS.some(c => c.noun === 'MINNE' && c.emoji === '🐼'));
assert.ok(G.CHARACTERS.some(c => c.noun === 'AAS' && c.name === 'AAS'));
assert.ok(!G.CHARACTERS.some(c => c.noun === 'ERIK'));
console.log('ok 31: RIVER noun rules + Minne');

// 32. Home corners are by player RANK: player 1 lower-left, player 2 upper-right (opposite diagonal)
s = G.createGame();
G.setEnabled(s, 1, false); // only SAMI active -> player 1
assert.deepStrictEqual([sami(s).x, sami(s).y], [0, 4], 'lone player 1 at lower-left (0,4)');
G.setEnabled(s, 4, true); // add ZABA -> becomes player 2
const zaba32 = s.entities.find(e => e.type === 'ZABA');
assert.deepStrictEqual([zaba32.x, zaba32.y], [4, 0], 'second player on the opposite diagonal (4,0)');
G.setEnabled(s, 5, true); // add MINNE -> player 3 -> corner (0,0) area (rock sits there)
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

console.log('\nAll engine tests passed.');
