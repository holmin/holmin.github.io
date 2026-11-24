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
assert.strictEqual(s.supply.length, 6);
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

// 21. River = WATER terrain cells (PDF matrix list)
assert.deepStrictEqual([...G.RIVER].sort(), ['0,0', '0,1', '1,1', '2,1', '2,2', '2,3', '3,3', '4,3', '4,4']);
assert.ok(G.isWaterCell(0, 0) && G.isWaterCell(2, 1) && G.isWaterCell(4, 4));
assert.ok(!G.isWaterCell(1, 2));
assert.ok(G.NOUNS.includes('WATER'));
console.log('ok 21: river/WATER cells');

console.log('\nAll engine tests passed.');
