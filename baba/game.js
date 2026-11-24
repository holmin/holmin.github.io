'use strict';

const W = 17, H = 11, CELL = 46;
const NOUNS = ['BABA', 'KEKE', 'WALL', 'ROCK', 'FLAG', 'WATER'];
const PROPS = ['YOU', 'WIN', 'STOP', 'PUSH', 'SINK', 'DEFEAT'];
const EMOJI = { BABA: '🐰', KEKE: '🐶', WALL: '🧱', ROCK: '🪨', FLAG: '🚩', WATER: '🌊' };
const PROP_CLASS = { YOU: 'you', WIN: 'win', STOP: 'stop', PUSH: 'push', SINK: 'sink', DEFEAT: 'defeat' };
const MOVE_LIMIT = 400;

let nextId = 1;
function word(t, x, y) { return { id: nextId++, kind: 'word', type: t, x, y, alive: true }; }
function obj(t, x, y) { return { id: nextId++, kind: 'object', type: t, x, y, alive: true }; }

function createGame() {
  nextId = 1;
  const entities = [];
  for (let x = 0; x < W; x++) { entities.push(obj('WALL', x, 0), obj('WALL', x, H - 1)); }
  for (let y = 1; y < H - 1; y++) { entities.push(obj('WALL', 0, y), obj('WALL', W - 1, y)); }

  entities.push(obj('BABA', 3, 5), obj('KEKE', 13, 5));
  entities.push(obj('FLAG', 8, 2));
  entities.push(obj('WATER', 7, 8), obj('WATER', 8, 8), obj('WATER', 9, 8));
  entities.push(obj('ROCK', 5, 3), obj('ROCK', 11, 7), obj('ROCK', 8, 5), obj('ROCK', 3, 7), obj('ROCK', 13, 3));

  const words = [
    ['BABA', 2, 1], ['IS', 3, 1], ['YOU', 4, 1],
    ['KEKE', 12, 1], ['IS', 13, 1], ['YOU', 14, 1],
    ['WALL', 2, 2], ['IS', 3, 2], ['STOP', 4, 2],
    ['FLAG', 12, 2], ['IS', 13, 2], ['WIN', 14, 2],
    ['ROCK', 2, 3], ['IS', 3, 3], ['STOP', 4, 3],
    ['WATER', 12, 3], ['IS', 13, 3], ['SINK', 14, 3],
    ['ROCK', 2, 4], ['IS', 3, 4], ['PUSH', 4, 4],
    ['DEFEAT', 12, 4], ['IS', 13, 4], ['STOP', 14, 4],
    ['YOU', 6, 6], ['IS', 7, 6], ['WIN', 8, 6], ['DEFEAT', 9, 6], ['SINK', 10, 6],
    ['PUSH', 5, 7], ['STOP', 6, 7], ['IS', 11, 6], ['BABA', 11, 7],
    ['ROCK', 5, 8], ['FLAG', 11, 8], ['WATER', 8, 7], ['IS', 9, 7], ['KEKE', 7, 4],
  ];
  for (const [t, x, y] of words) entities.push(word(t, x, y));

  const S = {
    entities,
    players: [
      { name: 'BABA', emoji: EMOJI.BABA, color: '#ff6b9d', char: entities.find(e => e.kind === 'object' && e.type === 'BABA').id },
      { name: 'KEKE', emoji: EMOJI.KEKE, color: '#4dabf7', char: entities.find(e => e.kind === 'object' && e.type === 'KEKE').id },
    ],
    rules: new Set(), _propMap: {}, _prevRules: null,
    log: [], moves: 0, over: null,
  };
  ensureParsed(S);
  S._prevRules = new Set(S.rules);
  return S;
}

function parseRules(S) {
  const at = new Map();
  for (const e of S.entities) if (e.alive && e.kind === 'word') at.set(e.x + ',' + e.y, e.type);
  const rules = new Set();
  const propMap = {};
  const add = (n, p) => {
    rules.add(n + ' IS ' + p);
    (propMap[n] = propMap[n] || {})[p] = true;
  };
  for (const [k, t] of at) {
    if (!NOUNS.includes(t)) continue;
    const [x, y] = k.split(',').map(Number);
    const r1 = at.get((x + 1) + ',' + y), r2 = at.get((x + 2) + ',' + y);
    if (r1 === 'IS' && PROPS.includes(r2)) add(t, r2);
    const d1 = at.get(x + ',' + (y + 1)), d2 = at.get(x + ',' + (y + 2));
    if (d1 === 'IS' && PROPS.includes(d2)) add(t, d2);
  }
  return { rules, propMap };
}

function ensureParsed(S) {
  const p = parseRules(S);
  S.rules = p.rules;
  S._propMap = p.propMap;
}

function propsOf(S, e) {
  if (e.kind === 'word') return { PUSH: true };
  return S._propMap[e.type] || {};
}

function entitiesAt(S, x, y) {
  return S.entities.filter(e => e.alive && e.x === x && e.y === y);
}

function log(S, msg) {
  S.log.unshift(msg);
  if (S.log.length > 6) S.log.pop();
}

function gather(S, e, dx, dy, list) {
  const tx = e.x + dx, ty = e.y + dy;
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
  const ents = entitiesAt(S, tx, ty).filter(o => o !== e && !list.includes(o));
  for (const o of ents) {
    const pr = propsOf(S, o);
    if (pr.PUSH) { if (!gather(S, o, dx, dy, list)) return false; }
    else if (pr.STOP) return false;
  }
  for (const o of ents) if (propsOf(S, o).PUSH) list.push(o);
  return true;
}

function tryMovePlayer(S, pi, dx, dy) {
  if (S.over) return false;
  const p = S.players[pi];
  const c = S.entities.find(e => e.id === p.char);
  if (!c || !c.alive) return false;
  ensureParsed(S);
  const pr = propsOf(S, c);
  if (!pr.YOU) { log(S, `${p.emoji} ${p.name} is not YOU — frozen!`); return false; }
  if (pr.STOP) { log(S, `${p.emoji} ${p.name} is STOP — frozen!`); return false; }
  const list = [];
  if (!gather(S, c, dx, dy, list)) return false;
  for (const e of list) { e.x += dx; e.y += dy; }
  c.x += dx; c.y += dy;
  S.moves++;
  return true;
}

function end(S, w, reason) {
  S.over = { winner: w, reason };
  if (w === null) log(S, '🤝 ' + reason);
  else log(S, `${S.players[w].emoji} ${S.players[w].name} WINS — ${reason}`);
}

function resolve(S) {
  ensureParsed(S);
  for (const r of S.rules) if (!S._prevRules.has(r)) log(S, '➕ ' + r);
  for (const r of S._prevRules) if (!S.rules.has(r)) log(S, '➖ ' + r);
  S._prevRules = new Set(S.rules);

  const has = (e, pr) => !!propsOf(S, e)[pr];
  const dead = new Set();

  for (const w of S.entities) {
    if (!w.alive || w.kind !== 'object' || w.type !== 'WATER' || !has(w, 'SINK')) continue;
    for (const o of entitiesAt(S, w.x, w.y)) {
      if (o !== w && o.alive && !(o.kind === 'object' && o.type === 'WATER')) dead.add(o);
    }
  }
  for (const e of S.entities) {
    if (!e.alive || e.kind !== 'object' || !has(e, 'DEFEAT')) continue;
    if (entitiesAt(S, e.x, e.y).some(o => o !== e && o.alive)) dead.add(e);
  }
  for (const d of dead) {
    if (!d.alive) continue;
    d.alive = false;
    if (d.kind === 'word') log(S, `word "${d.type}" is gone`);
    else log(S, `${EMOJI[d.type] || ''} ${d.type} is gone`);
  }

  const winners = [];
  for (const p of S.players) {
    const c = S.entities.find(e => e.id === p.char);
    if (!c || !c.alive || !has(c, 'YOU')) continue;
    for (const o of entitiesAt(S, c.x, c.y)) {
      if (o !== c && o.alive && has(o, 'WIN')) winners.push(p);
    }
  }
  const alive = [0, 1].filter(i => {
    const c = S.entities.find(e => e.id === S.players[i].char);
    return c && c.alive;
  });

  if (winners.length === 2) end(S, null, 'mutual WIN — draw!');
  else if (winners.length === 1) end(S, S.players.indexOf(winners[0]), `${winners[0].emoji} touched something that IS WIN!`);
  else if (alive.length === 0) end(S, null, 'both destroyed — draw!');
  else if (alive.length === 1) end(S, alive[0], `${S.players[1 - alive[0]].emoji} ${S.players[1 - alive[0]].name} was destroyed!`);
  else if (S.moves >= MOVE_LIMIT) end(S, null, 'move limit reached — draw!');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { W, H, NOUNS, PROPS, EMOJI, createGame, parseRules, ensureParsed, propsOf, entitiesAt, tryMovePlayer, resolve, log };
}

if (typeof document !== 'undefined') initUI();

function initUI() {
  let S = createGame();
  const board = document.getElementById('board');
  board.style.gridTemplateColumns = `repeat(${W}, ${CELL}px)`;
  const cells = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = document.createElement('div');
      d.className = 'cell';
      board.appendChild(d);
      cells.push(d);
    }
  }

  function render() {
    for (const c of cells) { c.innerHTML = ''; c.classList.remove('water', 'stack'); }
    const byCell = new Map();
    for (const e of S.entities) {
      if (!e.alive) continue;
      const k = e.x + ',' + e.y;
      if (!byCell.has(k)) byCell.set(k, []);
      byCell.get(k).push(e);
    }
    for (const [k, list] of byCell) {
      const [x, y] = k.split(',').map(Number);
      const cell = cells[y * W + x];
      if (list.length > 1) cell.classList.add('stack');
      if (list.some(e => e.kind === 'object' && e.type === 'WATER')) cell.classList.add('water');
      for (const e of list) {
        const sp = document.createElement('span');
        if (e.kind === 'word') {
          const cls = e.type === 'IS' ? 'is' : NOUNS.includes(e.type) ? 'noun' : 'prop-' + PROP_CLASS[e.type];
          sp.className = 'ent word ' + cls;
          sp.textContent = e.type;
        } else {
          sp.className = 'ent obj obj-' + e.type;
          sp.textContent = EMOJI[e.type] || e.type;
        }
        cell.appendChild(sp);
      }
    }
    const ul = document.getElementById('rules');
    ul.innerHTML = '';
    for (const r of [...S.rules].sort()) {
      const li = document.createElement('li');
      li.textContent = r;
      ul.appendChild(li);
    }
    const lg = document.getElementById('log');
    lg.innerHTML = '';
    for (const m of S.log) {
      const li = document.createElement('li');
      li.textContent = m;
      lg.appendChild(li);
    }
    document.getElementById('moves').textContent = S.moves;
    const ov = document.getElementById('overlay');
    if (S.over) {
      ov.classList.remove('hidden');
      const p = S.over.winner === null ? null : S.players[S.over.winner];
      ov.innerHTML = p
        ? `<div class="big" style="color:${p.color}">${p.emoji} ${p.name} WINS!</div><div class="sub">${S.over.reason}</div><div class="sub">Press R to restart</div>`
        : `<div class="big">🤝 DRAW</div><div class="sub">${S.over.reason}</div><div class="sub">Press R to restart</div>`;
    } else {
      ov.classList.add('hidden');
    }
  }

  const KEYMAP = {
    KeyW: [0, 0, -1], KeyS: [0, 0, 1], KeyA: [0, -1, 0], KeyD: [0, 1, 0],
    ArrowUp: [1, 0, -1], ArrowDown: [1, 0, 1], ArrowLeft: [1, -1, 0], ArrowRight: [1, 1, 0],
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyR') {
      S = createGame();
      render();
      return;
    }
    const m = KEYMAP[e.code];
    if (!m) return;
    const [pi, dx, dy] = m;
    if (tryMovePlayer(S, pi, dx, dy)) {
      resolve(S);
      render();
    }
  });

  render();
}
