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
assert.deepStrictEqual(rulesOf(s), ['ALL IS PUSH (default)', 'BABA IS P1 (default)', 'KEKE IS P2 (default)']);
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

// 4. Chain pushing works (ALL IS PUSH pushes whole rows); only the edge stops it
s = G.createGame();
const r4 = rock(s, 0, 0); r4.x = 1; r4.y = 4;
s.entities.push({ id: 999, kind: 'object', type: 'ROCK', x: 2, y: 4 });
assert.strictEqual(G.canMove(s, baba(s), 1, 0), true, 'chain push allowed');
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4]);
assert.ok(rock(s, 2, 4) && rock(s, 3, 4), 'both rocks pushed in a row');
s = G.createGame();
// fill row 4 completely: BABA + 4 rocks -> chain hits the edge -> move fails
const r4c = rock(s, 0, 0); r4c.x = 1; r4c.y = 4;
s.entities.push({ id: 998, kind: 'object', type: 'ROCK', x: 2, y: 4 });
s.entities.push({ id: 997, kind: 'object', type: 'ROCK', x: 3, y: 4 });
const r4d = rock(s, 4, 4); r4d.x = 4; r4d.y = 4;
assert.strictEqual(G.canMove(s, baba(s), 1, 0), false, 'edge stops the chain');
console.log('ok 4: chain push + edge stop');

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

// 8. Pull: moving away drags exactly ONE thing from the cell you left into the vacated cell
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 2, y: 1 });
s.entities.push({ id: 901, kind: 'word', noun: 'ROCK', x: 2, y: 1 });
baba(s).x = 2; baba(s).y = 2; s.selectedId = baba(s).id;
assert.strictEqual(G.moveSelected(s, 0, 0, 1, true), true, 'move down with pull');
assert.strictEqual(at(s, 2, 2).length, 2, 'BABA + exactly one pulled tile');
assert.strictEqual(at(s, 2, 1).length, 1, 'one tile left behind');
console.log('ok 8: pull one thing');

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

// 11. Cannot act -> lose: KEKE boxed in by full rows/columns (chains hit edges), empty supply
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

// 13. Undo restores position, turn, actions and supply after a move
s = G.createGame();
s.selectedId = baba(s).id;
G.moveSelected(s, 0, 1, 0, false);
assert.deepStrictEqual([baba(s).x, baba(s).y], [1, 4]);
assert.strictEqual(s.turn, 1);
assert.strictEqual(G.undo(s), true);
assert.deepStrictEqual([baba(s).x, baba(s).y], [0, 4], 'position restored');
assert.strictEqual(s.turn, 0, 'turn restored');
assert.strictEqual(s.actionsLeft, 1, 'actions restored');
console.log('ok 13: undo move');

// 14. Undo restores supply after a place
s = G.createGame();
const n0 = s.supply.length;
G.place(s, 0, 0, 1, 4);
assert.strictEqual(s.supply.length, n0 - 1);
G.undo(s);
assert.strictEqual(s.supply.length, n0, 'supply restored');
assert.strictEqual(at(s, 1, 4).length, 0, 'placed tile removed');
console.log('ok 14: undo place');

// 15. Undo after game over clears the result and reverts the scenario score
s = G.createGame();
s.entities.push({ id: 900, kind: 'word', noun: 'FLAG', x: 0, y: 2 });
s.entities.push({ id: 901, kind: 'word', prop: 'WIN', label: 'IS WIN', owner: 0, x: 1, y: 2 });
G.ensureParsed(s);
baba(s).x = 2; baba(s).y = 3; s.selectedId = baba(s).id;
G.moveSelected(s, 0, 0, -1, false);
assert.ok(s.over && s.over.winner === 0);
assert.strictEqual(s.scenario.wins[0], 1, 'win counted');
G.undo(s);
assert.ok(!s.over, 'game over cleared');
assert.strictEqual(s.scenario.wins[0], 0, 'score reverted');
assert.deepStrictEqual([baba(s).x, baba(s).y], [2, 3], 'winning move reverted');
console.log('ok 15: undo after game over');

// 16. Undo after a challenge restores the pre-challenge turn
s = G.createGame();
G.challenge(s, 0);
assert.ok(s.challenge);
G.undo(s);
assert.strictEqual(s.challenge, null);
assert.strictEqual(s.turn, 0);
assert.strictEqual(G.undo(s), false, 'nothing left to undo');
console.log('ok 16: undo challenge');

// 17. 4-player game: extra players spawn in the free corners, displacing rocks; rules + turn rotation
s = G.createGame(4);
const types = s.entities.filter(e => e.kind === 'object').map(e => e.type + '@' + e.x + ',' + e.y).sort();
console.log('  4p objects:', types.join(' '));
assert.ok(types.includes('ME@0,0'), 'P3 spawns top-left corner');
assert.ok(types.includes('FOFO@4,4'), 'P4 spawns bottom-right corner');
assert.ok(!types.includes('ROCK@0,0') && !types.includes('ROCK@4,4'), 'rocks displaced from corners');
assert.strictEqual(s.entities.filter(e => e.kind === 'object' && e.type === 'ROCK').length, 2, 'rocks still on board');
assert.strictEqual(rulesOf(s).filter(r => /IS P\d/.test(r)).length, 4, 'four default P-rules');
assert.ok(rulesOf(s).includes('ALL IS PUSH (default)'));
assert.ok(rulesOf(s).includes('ME IS P3 (default)') && rulesOf(s).includes('FOFO IS P4 (default)'));
s.selectedId = s.entities.find(e => e.type === 'BABA').id;
G.moveSelected(s, 0, 1, 0, false);
assert.strictEqual(s.turn, 1);
s.selectedId = s.entities.find(e => e.type === 'KEKE').id;
G.moveSelected(s, 1, -1, 0, false); G.moveSelected(s, 1, 0, 1, false);
assert.strictEqual(s.turn, 2, 'turn rotates to P3');
console.log('ok 17: 4-player spawn + rotation');

// 18. 3-player: ME in top-left corner, one rock displaced, KEKE corner intact
s = G.createGame(3);
assert.ok(s.entities.some(e => e.type === 'ME' && e.x === 0 && e.y === 0));
assert.ok(s.entities.some(e => e.type === 'KEKE' && e.x === 4 && e.y === 0));
assert.strictEqual(rulesOf(s).filter(r => /IS P\d/.test(r)).length, 3);
console.log('ok 18: 3-player setup');

// 19. undo key is UI-level; engine undo still works with 4 players
s = G.createGame(4);
s.selectedId = s.entities.find(e => e.type === 'ME').id;
const me = s.entities.find(e => e.type === 'ME');
G.moveSelected(s, 0, 0, 0, false); // not P0's turn -> false
G.moveSelected(s, 2, 0, 1, false); // not P2's turn yet -> false
assert.strictEqual(G.moveSelected(s, 0, 1, 0, false), true);
assert.strictEqual(s.turn, 1);
G.undo(s);
assert.strictEqual(s.turn, 0);
assert.deepStrictEqual([me.x, me.y], [0, 0]);
console.log('ok 19: undo in 4p game');

console.log('\nAll engine tests passed.');
