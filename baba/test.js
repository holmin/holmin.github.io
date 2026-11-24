'use strict';
const assert = require('assert');
const G = require('./game.js');

const rulesOf = (s) => [...G.parseRules(s).rules].sort();
const EXPECTED_INITIAL = [
  'BABA IS YOU', 'FLAG IS WIN', 'KEKE IS YOU', 'ROCK IS PUSH',
  'ROCK IS STOP', 'WALL IS STOP', 'WATER IS SINK',
];
const char = (s, pi) => s.entities.find(e => e.id === s.players[pi].char);
const wordAt = (s, x, y) => s.entities.find(e => e.alive && e.kind === 'word' && e.x === x && e.y === y);

// 1. Initial board parses to exactly the 7 intended rules, no accidental ones
let s = G.createGame();
assert.deepStrictEqual(rulesOf(s), EXPECTED_INITIAL, 'initial rules');
console.log('ok 1: initial rules =', rulesOf(s).join(' | '));

// 2. BABA cannot move up (word chain jams against the wall), but can move right
s = G.createGame();
assert.strictEqual(G.tryMovePlayer(s, 0, 0, -1), false, 'up blocked by word chain + wall');
assert.strictEqual(G.tryMovePlayer(s, 0, 1, 0), true, 'right allowed');
assert.strictEqual(char(s, 0).x, 4);
console.log('ok 2: movement + wall/word-chain blocking');

// 3. Pushing a chain of spare words shifts them all one cell
s = G.createGame();
char(s, 0).x = 5; char(s, 0).y = 6;
assert.strictEqual(G.tryMovePlayer(s, 0, 1, 0), true);
assert.strictEqual(char(s, 0).x, 6);
assert.strictEqual(wordAt(s, 7, 6).type, 'YOU', 'first word pushed');
assert.strictEqual(wordAt(s, 12, 6).type, 'IS', 'last word pushed');
assert.strictEqual(rulesOf(s).length, 7, 'no new rules from spare chain');
console.log('ok 3: word push chain');

// 4. Walking onto the FLAG (IS WIN) wins for player 1
s = G.createGame();
char(s, 0).x = 8; char(s, 0).y = 3;
assert.strictEqual(G.tryMovePlayer(s, 0, 0, -1), true);
G.resolve(s);
assert.ok(s.over && s.over.winner === 0, 'P1 wins on flag');
console.log('ok 4: WIN on touch ->', s.over.reason);

// 5. Walking into SINK water destroys BABA -> player 2 wins
s = G.createGame();
char(s, 0).x = 7; char(s, 0).y = 7;
assert.strictEqual(G.tryMovePlayer(s, 0, 0, 1), true);
G.resolve(s);
assert.ok(s.over && s.over.winner === 1, 'P2 wins when BABA sinks');
console.log('ok 5: SINK ->', s.over.reason);

// 6. Rewriting "BABA IS YOU" to "BABA IS DEFEAT" freezes BABA; touching it kills it
s = G.createGame();
wordAt(s, 4, 1).type = 'DEFEAT';
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('BABA IS DEFEAT'));
assert.ok(!rulesOf(s).includes('BABA IS YOU'));
assert.strictEqual(G.tryMovePlayer(s, 0, 1, 0), false, 'no YOU -> frozen');
char(s, 1).x = 4; char(s, 1).y = 5;
assert.strictEqual(G.tryMovePlayer(s, 1, -1, 0), true, 'KEKE steps onto BABA');
G.resolve(s);
assert.ok(s.over && s.over.winner === 1, 'DEFEAT touch kills BABA');
console.log('ok 6: DEFEAT + YOU removal ->', s.over.reason);

// 7. "KEKE IS WIN" lets BABA win by touching KEKE
s = G.createGame();
wordAt(s, 14, 2).type = 'WIN'; // FLAG IS WIN stays; build KEKE IS WIN vertically instead
wordAt(s, 12, 2).type = 'KEKE'; // now KEKE IS WIN horizontally at y=2
G.ensureParsed(s);
assert.ok(rulesOf(s).includes('KEKE IS WIN'));
char(s, 0).x = 12; char(s, 0).y = 6;
char(s, 1).x = 12; char(s, 1).y = 5;
assert.strictEqual(G.tryMovePlayer(s, 0, 0, -1), true, 'BABA steps onto KEKE');
G.resolve(s);
assert.ok(s.over && s.over.winner === 0, 'BABA wins by touching WIN KEKE');
console.log('ok 7: opponent-as-WIN ->', s.over.reason);

// 8. Vertical rule parsing works
s = G.createGame();
const w1 = wordAt(s, 5, 7), w2 = wordAt(s, 6, 7), w3 = wordAt(s, 11, 6);
w1.type = 'FLAG'; w1.x = 15; w1.y = 5;
w2.type = 'IS';   w2.x = 15; w2.y = 6;
w3.type = 'DEFEAT'; w3.x = 15; w3.y = 7;
assert.ok(rulesOf(s).includes('FLAG IS DEFEAT'), 'vertical rule parsed');
console.log('ok 8: vertical rules');

// 9. "BABA IS STOP" freezes BABA too (self-STOP)
s = G.createGame();
wordAt(s, 4, 1).type = 'STOP';
G.ensureParsed(s);
assert.strictEqual(G.tryMovePlayer(s, 0, 1, 0), false, 'STOP self -> frozen');
console.log('ok 9: self STOP freezes');

// 10. Game over blocks further moves; rock is pushable+stop
s = G.createGame();
char(s, 0).x = 8; char(s, 0).y = 3;
G.tryMovePlayer(s, 0, 0, -1); G.resolve(s);
assert.ok(s.over);
assert.strictEqual(G.tryMovePlayer(s, 1, 1, 0), false, 'no moves after game over');
s = G.createGame();
char(s, 0).x = 8; char(s, 0).y = 6; // below ROCK at (8,5)
assert.strictEqual(G.tryMovePlayer(s, 0, 0, -1), true, 'rock pushed up');
assert.strictEqual(s.entities.find(e => e.kind === 'object' && e.type === 'ROCK' && e.x === 8 && e.y === 4) !== undefined, true, 'rock moved to (8,4)');
console.log('ok 10: game-over lock + rock push');

console.log('\nAll engine tests passed.');
