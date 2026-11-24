'use strict';
const assert = require('assert');
const G = require('./game.js');

const rulesOf = (s) => G.ruleList(s);
const at = (s, x, y) => G.entitiesAt(s, x, y);
const baba = (s) => s.entities.find(e => e.kind === 'object' && e.type === 'BABA');
const keke = (s) => s.entities.find(e => e.kind === 'object' && e.type === 'KEKE');
const rock = (s, x, y) => s.entities.find(e => e.kind === 'object' && e.type === 'ROCK' && e.x === x && e.y === y);

// 1. Initial state: 5x5, correct setup, only the two printed YOU rules
let s = G.createGame();
assert.strictEqual(s.entities.filter(e => e.kind === 'object').length, 5);
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 4]);
assert.deepStrictEqual([keke(s).x, keke(s).y], [4, 0]);
assert.deepStrictEqual([rock(s, 0, 0) !== undefined, rock(s, 4, 4) !== undefined], [true, true]);
assert.deepStrictEqual(rulesOf(s), ['BABA IS YOU (printed)', 'KEKE IS YOU (printed)']);
assert.strictEqual(s.supply.length, 6, 'DEFAULT (2 IS WIN + ROCK + FLAG) + W1L1 (ROCK + FLAG)');
console.log('ok 1: setup + printed rules');

// 2. Turn structure: first turn = 1 action, later turns = 2 actions, alternating
s = G.createGame();
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true, 'P1 first action');
assert.strictEqual(s.turn, 1, 'turn passes to P2');
assert.strictEqual(s.actionsLeft, 2, 'second turn has 2 actions');
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), false, 'P1 cannot act on P2 turn');
s.selectedId = keke(s).id;
assert.strictEqual(G.moveSelected(s, 1, -1, 0, false), true);
assert.strictEqual(G.moveSelected(s, 1, -1, 0, false), true);
assert.strictEqual(s.turn, 0, 'back to P1 after 2 actions');
assert.strictEqual(s.actionsLeft, 2);
console.log('ok 2: turn structure 1 then 2 actions');

// 3. Push: moving into a rock pushes it one cell if the next cell is empty
s = G.createGame();
const r3 = rock(s, 0, 0); r3.x = 1; r3.y = 4; // rock at (1,4), right of BABA (0,4)
s.selectedId = baba(s).id;
assert.strictEqual(G.canMove(s, baba(s), 1, 0), true);
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4]);
assert.deepStrictEqual([rock(s, 2, 4) !== undefined], [true], 'rock pushed to (2,4)');
console.log('ok 3: push into empty cell');

// 4. No chain pushing and no pushing off the edge
s = G.createGame();
const r4 = rock(s, 0, 0); r4.x = 1; r4.y = 4;
s.entities.push({ id: 999, kind: 'object', type: 'ROCK', x: 2, y: 4 });
assert.strictEqual(G.canMove(s, baba(s), 1, 0), false, 'cannot chain-push');
s = G.createGame();
const r4b = rock(s, 4, 4); r4b.x = 4; r4b.y = 1; // rock at (4,1)
s.entities.push({ id: 998, kind: 'object', type: 'ROCK', x: 4, y: 2 }); // blocks the push
keke(s).x = 4; keke(s).y = 0; s.selectedId = keke(s).id;
assert.strictEqual(G.canMove(s, keke(s), 0, 1), false, 'cannot push into occupied cell');
console.log('ok 4: no chain push / blocked push');

// 5. Rule formation: noun tile pointing right/down into property tile
s = G.createGame();
G.doPlace(s, 0, 2, 1, 2); // ROCK noun tile at (1,2)
G.doPlace(s, 0, 0, 2, 2); // IS WIN at (2,2) — right of ROCK noun
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS WIN'), 'ROCK IS WIN formed (noun -> right)');
console.log('ok 5: rule formation right');
s = G.createGame();
G.doPlace(s, 0, 2, 2, 1); // ROCK noun at (2,1)
G.doPlace(s, 0, 0, 2, 2); // IS WIN at (2,2) — below noun
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('ROCK IS WIN'), 'ROCK IS WIN formed (noun -> down)');
console.log('ok 5b: rule formation down');

// 6. Win: YOU thing enters WIN thing's cell (stacking), owner of YOU thing wins
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
baba(s).x = 2; baba(s).y = 3; s.selectedId = baba(s).id;
assert.strictEqual(G.canMove(s, baba(s), 0, -1), true, 'YOU may enter WIN cell');
assert.strictEqual(G.moveSelected(s, 0, 0, -1, false), true);
assert.ok(s.over && s.over.winner === 0, 'P1 wins by stacking onto WIN flag');
console.log('ok 6: YOU+WIN stacking win ->', s.over.reason);

// 7. YOU and WIN on the same thing does not auto-win
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'BABA', x: 3, y: 3 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 3, y: 4 });
G.ensureParsed(s);
s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.ok(!s.over, 'BABA IS YOU + BABA IS WIN does not auto-win');
console.log('ok 7: YOU+WIN self does not win');

// 8. Pull: moving away drags the adjacent cell contents into the vacated cell
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 1 });
baba(s).x = 2; baba(s).y = 2; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, 1, true), true, 'move down with pull');
const pulled = s.entities.find(e => e.id === 900);
assert.deepStrictEqual([pulled.x, pulled.y], [2, 2], 'pulled tile into vacated cell');
console.log('ok 8: pull');

// 9. Place: only into empty cell adjacent to your YOU things
s = G.createGame();
assert.strictEqual(G.place(s, 0, 0, 4, 4), false, 'cannot place on occupied cell');
assert.strictEqual(G.place(s, 0, 0, 1, 4), true, 'place next to BABA');
assert.strictEqual(s.supply.length, 5);
assert.strictEqual(G.place(s, 1, 0, 0, 3), false, 'P2 turn — cannot act for P1');
console.log('ok 9: place rules');

// 10. Challenge: challenger skips turn, opponent gets 10 actions, else challenger wins
s = G.createGame();
assert.strictEqual(G.challenge(s, 0), true);
assert.strictEqual(s.turn, 1);
assert.strictEqual(s.challenge.left, 10);
s.selectedId = keke(s).id;
for (let i = 0; i < 10 && !s.over; i++) {
  const d = i % 2 === 0 ? [-1, 0] : [1, 0];
  if (!G.moveSelected(s, 1, d[0], d[1], false)) G.moveSelected(s, 1, 0, i % 2 === 0 ? 1 : -1, false);
}
assert.ok(s.over && s.over.winner === 0, 'challenger wins if opponent fails 10 actions');
console.log('ok 10: challenge ->', s.over.reason);

// 11. Cannot act -> lose: wall in KEKE with rocks, empty supply
s = G.createGame();
s.supply = [];
const r11 = rock(s, 0, 0); r11.x = 3; r11.y = 0;
s.entities.push({ id: 991, kind: 'object', type: 'ROCK', x: 4, y: 1 });
s.entities.push({ id: 992, kind: 'object', type: 'ROCK', x: 2, y: 0 });
s.entities.push({ id: 993, kind: 'object', type: 'ROCK', x: 4, y: 2 });
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false); // P1 uses their single first-turn action -> turn passes to P2
assert.ok(s.over && s.over.winner === 0, 'P2 cannot move -> P1 wins');
console.log('ok 11: cannot-act loss ->', s.over.reason);

// 12. Clock token: best-of-3 scenario
s = G.createGame();
assert.strictEqual(G.spendClock(s, 0), true);
assert.strictEqual(s.scenario.bo3, true);
assert.strictEqual(G.spendClock(s, 1), false, 'only one Bo3 per scenario');
s = G.createGame();
assert.strictEqual(G.spendClock(s, 0), true);
s.over = null;
G.resolve(s, 0); // no win, just checking no crash
// simulate two game wins for P1
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
baba(s).x = 2; baba(s).y = 3; s.selectedId = baba(s).id;
G.moveSelected(s, 0, 0, -1, false);
assert.ok(s.over && s.over.winner === 0 && !s.scenarioOver, 'first Bo3 game won, scenario not over');
assert.strictEqual(s.scenario.wins[0], 1);
console.log('ok 12: clock / best-of-3');

console.log('\nAll engine tests passed.');
