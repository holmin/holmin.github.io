'use strict';

const W = 5, H = 5, CELL = 64;
const NOUNS = ['SAMI', 'ERIK', 'GABA', 'EBBA', 'ZABA', 'ROCK', 'FLAG', 'WATER'];
const EMOJI = { SAMI: '🐻‍❄️', ERIK: '🦙', GABA: '🐴', EBBA: '🦦', ZABA: '🐸', ROCK: '🪨', FLAG: '🚩', WATER: '🌊' };
const CHARACTERS = [
  { noun: 'SAMI', name: 'Sami', emoji: '🐻‍❄️', color: '#ff6b9d' },
  { noun: 'ERIK', name: 'Erik', emoji: '🦙', color: '#4dabf7' },
  { noun: 'GABA', name: 'Gaba', emoji: '🐴', color: '#b388ff' },
  { noun: 'EBBA', name: 'Ebba', emoji: '🦦', color: '#ffd166' },
  { noun: 'ZABA', name: 'Zaba', emoji: '🐸', color: '#7bed9f' },
];
const DEFAULT_ENABLED = [true, true, false, false, false];
const PLAYER_NOUNS = CHARACTERS.map(c => c.noun);
const PLAYER_NAMES = CHARACTERS.map(c => c.name);
const PLAYER_EMOJI = CHARACTERS.map(c => c.emoji);
const PLAYER_COLORS = CHARACTERS.map(c => c.color);
// River terrain of the WORLD 1: THE PLAINS board. Matrix notation (row,col), 1-indexed:
// (1,1),(2,1),(2,2),(2,3),(3,3),(4,3),(4,4),(4,5),(5,5)  ->  stored 0-indexed as (x=col-1, y=row-1).
// River cells identify as WATER (noun 'WATER'); future rules (MELT, SINK, ...) apply to them.
const RIVER = new Set(['0,0', '0,1', '1,1', '2,1', '2,2', '2,3', '3,3', '4,3', '4,4']);
const HOME_CORNERS = [[0, H - 1], [W - 1, 0], [0, 0], [W - 1, H - 1], [2, 0]]; // home spots for the 5 characters
function isWaterCell(x, y) { return RIVER.has(x + ',' + y); }
function activeChars(S) {
  const out = [];
  for (let i = 0; i < CHARACTERS.length; i++) if (S.enabled[i]) out.push(i);
  return out;
}
function charAtRank(S, rank) { return CHARACTERS[activeChars(S)[rank]]; }
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

let nextId = 1;
const obj = (type, x, y) => ({ id: nextId++, kind: 'object', type, x, y });
const nounTile = (noun, x, y) => ({ id: nextId++, kind: 'word', noun, x, y });
const propTile = (prop, owner, x, y) => ({ id: nextId++, kind: 'word', prop, label: 'IS ' + prop, owner, x, y });

function firstFreeCell(entities, nearX, nearY) {
  const free = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!entities.some(e => e.x === x && e.y === y)) free.push([x, y, Math.abs(x - nearX) + Math.abs(y - nearY)]);
  }
  free.sort((a, b) => a[2] - b[2]);
  return [free[0][0], free[0][1]];
}

function createGame(enabled, scenario) {
  enabled = (enabled && enabled.length === CHARACTERS.length) ? enabled.slice() : DEFAULT_ENABLED.slice();
  const numPlayers = enabled.filter(Boolean).length;
  nextId = 1;
  scenario = scenario || {
    score: [0, 0], wins: [0, 0], bo3: false, clocks: [true, true],
    worldPoints: [0, 0], scenariosPlayed: 0,
  };
  scenario.numPlayers = numPlayers;
  for (const key of ['score', 'wins', 'worldPoints', 'clocks']) {
    while (scenario[key].length < numPlayers) scenario[key].push(key === 'clocks' ? true : 0);
    scenario[key].length = numPlayers;
  }
  const entities = [
    obj('ROCK', 0, 0), obj('ROCK', W - 1, H - 1),
    obj('FLAG', 2, 2),
  ];
  // each enabled character spawns as close as possible to its home corner (corner if free, else nearest free cell)
  for (const ci of activeChars({ enabled })) {
    const [cx, cy] = HOME_CORNERS[ci];
    const [fx, fy] = firstFreeCell(entities, cx, cy);
    entities.push(obj(CHARACTERS[ci].noun, fx, fy));
  }
  const supply = [
    { prop: 'WIN' }, { prop: 'WIN' },
    { noun: 'ROCK' }, { noun: 'FLAG' },
    { noun: 'ROCK' }, { noun: 'FLAG' },
    { prop: 'FAST' }, { prop: 'CURIOUS' },
  ];
  const S = {
    entities, supply, numPlayers, enabled,
    turn: 0, gameTurn: 0, actionsLeft: 1,
    challenge: null, over: null, scenarioOver: false,
    scenario,
    selectedId: null, placeIdx: null,
    log: [], rules: [], _prevRules: [], history: [],
  };
  ensureParsed(S);
  S._prevRules = ruleList(S);
  return S;
}

function newScenario(prev, enabled) {
  enabled = (enabled && enabled.length === CHARACTERS.length) ? enabled : (prev && prev.enabled ? prev.enabled.slice() : DEFAULT_ENABLED.slice());
  const numPlayers = enabled.filter(Boolean).length;
  const sc = {
    score: new Array(numPlayers).fill(0),
    wins: new Array(numPlayers).fill(0),
    bo3: false,
    clocks: new Array(numPlayers).fill(true),
    worldPoints: new Array(numPlayers).fill(0),
    scenariosPlayed: prev ? prev.scenariosPlayed : 0,
    numPlayers,
  };
  if (prev) prev.worldPoints.forEach((v, i) => { if (i < numPlayers) sc.worldPoints[i] = v; });
  sc.enabled = enabled.slice();
  return createGame(enabled, sc);
}

// Toggle a character on/off in the LIVE game (undoable). Active players are
// always P1, P2, ... in written order, so toggling can re-rank everyone.
// Enabling spawns the figure as close as possible to its home corner;
// disabling removes the figure and that character's placed property tiles.
function setEnabled(S, ci, on) {
  if (on === S.enabled[ci]) return false;
  pushHistory(S, snapshot(S));
  const oldActive = activeChars(S);
  S.enabled[ci] = on;
  const newActive = activeChars(S);
  const c = CHARACTERS[ci];
  if (on) {
    const [cx, cy] = HOME_CORNERS[ci];
    const [fx, fy] = firstFreeCell(S.entities, cx, cy);
    S.entities.push(obj(c.noun, fx, fy));
    log(S, `${c.emoji} ${c.name} (P${newActive.indexOf(ci) + 1}) drops in at ${fx},${fy}`);
  } else {
    S.entities = S.entities.filter((e) => {
      if (e.kind === 'object' && e.type === c.noun) return false;
      if (e.kind === 'word' && e.owner !== undefined && e.owner !== null && oldActive[e.owner] === ci) return false;
      return true;
    });
    if (S.challenge && oldActive[S.challenge.challenger] === ci) S.challenge = null;
    if (S.turn >= newActive.length) S.turn = 0;
    log(S, `${c.emoji} ${c.name} drops out`);
  }
  // remap placed-tile owners from old ranks to new ranks
  const remap = oldActive.map((oc) => newActive.indexOf(oc));
  for (const e of S.entities) if (e.kind === 'word' && e.owner !== undefined && e.owner !== null) e.owner = remap[e.owner];
  S.numPlayers = newActive.length;
  S.scenario.numPlayers = newActive.length;
  for (const key of ['score', 'wins', 'worldPoints', 'clocks']) {
    const a = S.scenario[key];
    while (a.length < newActive.length) a.push(key === 'clocks' ? true : 0);
    a.length = newActive.length;
  }
  if (S.selectedId) {
    const sel = S.entities.find(e => e.id === S.selectedId);
    if (!sel || !yourThings(S, S.turn).includes(sel)) S.selectedId = null;
  }
  ensureParsed(S);
  return true;
}

function parseRules(S) {
  const rules = [{ noun: 'ALL', prop: 'PUSH', owner: null, permanent: true }];
  activeChars(S).forEach((ci, rank) => rules.push({ noun: CHARACTERS[ci].noun, prop: 'YOU', owner: rank, permanent: true }));
  const propAt = new Map();
  const nounTiles = [];
  for (const e of S.entities) {
    if (e.kind !== 'word') continue;
    if (e.prop) propAt.set(e.x + ',' + e.y, e);
    else if (e.noun) nounTiles.push(e);
  }
  for (const n of nounTiles) {
    const r = propAt.get((n.x + 1) + ',' + n.y);
    if (r) rules.push({ noun: n.noun, prop: r.prop, owner: r.owner });
    const d = propAt.get(n.x + ',' + (n.y + 1));
    if (d) rules.push({ noun: n.noun, prop: d.prop, owner: d.owner });
  }
  return rules;
}

function ensureParsed(S) {
  const rules = parseRules(S);
  S.rules = rules;
  const propMap = {}, youOwner = {};
  for (const r of rules) {
    (propMap[r.noun] = propMap[r.noun] || {})[r.prop] = true;
    if (r.prop === 'YOU' && youOwner[r.noun] === undefined) youOwner[r.noun] = r.owner;
  }
  S._propMap = propMap;
  S._youOwner = youOwner;
}

function ruleList(S) {
  const fmt = (r) => {
    const prop = r.prop === 'YOU' && r.owner !== null && r.owner !== undefined ? 'P' + (r.owner + 1) : r.prop;
    return r.noun + ' IS ' + prop + (r.permanent ? ' (default)' : '');
  };
  // formed (non-default) rules first, default rules below
  return S.rules.filter(r => !r.permanent).map(fmt).sort()
    .concat(S.rules.filter(r => r.permanent).map(fmt).sort());
}

const typeOf = (e) => (e.kind === 'object' ? e.type : e.noun);
// Word tiles are just rule text: they never carry properties themselves
// (videogame-faithful: you win by touching the actual FLAG object, not the word "FLAG").
function propsOf(S, e) { if (e.kind === 'word') return {}; return S._propMap[e.type] || {}; }
function isYou(S, e) { return !!propsOf(S, e).YOU; }
function isWin(S, e) { return !!propsOf(S, e).WIN; }
function youOwner(S, e) { return S._youOwner[typeOf(e)]; }
function entitiesAt(S, x, y) { return S.entities.filter(e => e.x === x && e.y === y); }

function log(S, msg) {
  S.log.unshift(msg);
  if (S.log.length > 8) S.log.pop();
}

function snapshot(S) {
  return JSON.stringify({
    entities: S.entities, supply: S.supply, turn: S.turn, gameTurn: S.gameTurn,
    actionsLeft: S.actionsLeft, challenge: S.challenge, over: S.over,
    scenarioOver: S.scenarioOver, scenario: S.scenario, numPlayers: S.numPlayers, enabled: S.enabled,
    selectedId: S.selectedId, placeIdx: S.placeIdx, _prevRules: S._prevRules,
  });
}

function pushHistory(S, before) {
  S.history.unshift(before);
  if (S.history.length > 500) S.history.pop();
}

function undo(S) {
  if (!S.history || S.history.length === 0) return false;
  const snap = JSON.parse(S.history.shift());
  Object.assign(S, snap);
  ensureParsed(S);
  log(S, '↩ undone');
  return true;
}

function end(S, winner, reason) {
  S.over = { winner, reason };
  if (winner !== null) {
    const sc = S.scenario;
    sc.wins[winner]++;
    const target = sc.bo3 ? 2 : 1;
    if (sc.wins[winner] >= target) {
      sc.score[winner]++;
      sc.scenariosPlayed++;
      S.scenarioOver = true;
      if (sc.scenariosPlayed % 5 === 0) {
        if (sc.score[0] > sc.score[1]) sc.worldPoints[0]++;
        else if (sc.score[1] > sc.score[0]) sc.worldPoints[1]++;
      }
    }
  }
  const wch = winner === null ? null : charAtRank(S, winner);
  log(S, winner === null ? '🤝 ' + reason : `${wch.emoji} ${wch.name} (P${winner + 1}) ${reason}`);
}

function resolve(S, actor) {
  ensureParsed(S);
  const rl = ruleList(S);
  for (const r of rl) if (!S._prevRules.includes(r)) log(S, '➕ ' + r);
  for (const r of S._prevRules) if (!rl.includes(r)) log(S, '➖ ' + r);
  S._prevRules = rl;

  const winners = new Set();
  for (const e of S.entities) {
    if (!isYou(S, e)) continue;
    for (const o of entitiesAt(S, e.x, e.y)) {
      if (o !== e && isWin(S, o)) winners.add(youOwner(S, e));
    }
  }
  if (winners.size === 2) end(S, actor, 'both YOU on WIN — last action wins');
  else if (winners.size === 1) end(S, [...winners][0], 'YOU shared a space with WIN');
}

function stackable(S, m, o) {
  return (isYou(S, m) && isWin(S, o)) || (isWin(S, m) && isYou(S, o));
}

// Chain push: everything in the path is pushed (ALL IS PUSH); the move only
// fails if the chain runs into the edge of the board. A YOU mover may still
// stack onto a WIN thing instead of pushing it.
function gather(S, m, e, dx, dy, list) {
  const tx = e.x + dx, ty = e.y + dy;
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
  const ents = entitiesAt(S, tx, ty).filter(o => o !== e && !list.includes(o));
  for (const o of ents) {
    if (stackable(S, m, o)) continue;
    if (!gather(S, m, o, dx, dy, list)) return false;
  }
  for (const o of ents) if (!stackable(S, m, o)) list.push(o);
  return true;
}

function canMove(S, m, dx, dy) {
  if (dx === 0 && dy === 0) return false;
  return gather(S, m, m, dx, dy, []);
}

function doMove(S, m, dx, dy, pull) {
  const list = [];
  if (!gather(S, m, m, dx, dy, list)) return false;
  const ox = m.x, oy = m.y;
  for (const o of list) { o.x += dx; o.y += dy; }
  m.x += dx; m.y += dy;
  let pulled = null;
  if (pull) {
    const behind = entitiesAt(S, ox - dx, oy - dy);
    if (behind.length > 0) { pulled = behind[0]; pulled.x = ox; pulled.y = oy; } // pull only one thing
  }
  if (S._entered) { // everything that entered a space this action (for CURIOUS)
    S._entered.push(m.id);
    for (const o of list) S._entered.push(o.id);
    if (pulled) S._entered.push(pulled.id);
  }
  return true;
}

function placeTargets(S, p) {
  const targets = new Set();
  for (const e of S.entities) {
    if (!(isYou(S, e) && youOwner(S, e) === p)) continue;
    for (const [dx, dy] of DIRS) {
      const x = e.x + dx, y = e.y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (entitiesAt(S, x, y).length === 0) targets.add(x + ',' + y);
    }
  }
  return targets;
}

function canPlace(S, p) {
  return S.supply.length > 0 && placeTargets(S, p).size > 0;
}

function doPlace(S, p, idx, x, y) {
  const t = S.supply[idx];
  const e = t.prop ? propTile(t.prop, p, x, y) : nounTile(t.noun, x, y);
  S.entities.push(e);
  S.supply.splice(idx, 1);
  if (S._entered) S._entered.push(e.id); // a placed thing enters its space
  return e;
}

function legalMoves(S, p) {
  const res = [];
  for (const e of S.entities) {
    if (!(isYou(S, e) && youOwner(S, e) === p)) continue;
    for (const [dx, dy] of DIRS) if (canMove(S, e, dx, dy)) res.push([e, dx, dy]);
  }
  return res;
}

function hasLegalAction(S, p) {
  return legalMoves(S, p).length > 0 || canPlace(S, p);
}

function yourThings(S, p) {
  return S.entities.filter(e => isYou(S, e) && youOwner(S, e) === p);
}

function act(S, p, fn) {
  if (S.over || S.scenarioOver) return false;
  if (S.turn !== p || S.actionsLeft <= 0) return false;
  const before = snapshot(S);
  S._entered = [];
  if (!fn()) { S._entered = []; return false; }
  pushHistory(S, before);
  S.actionsLeft--;
  resolve(S, p);
  if (!S.over) {
    resolveCurious(S); // CURIOUS reacts to everything that entered this action
    resolve(S, p);     // curious movement may have changed rules / created a WIN
  }
  S._entered = [];
  if (S.challenge) {
    if (!S.over) {
      S.challenge.left--;
      if (S.challenge.left <= 0) end(S, S.challenge.challenger, 'opponent failed to win within 10 actions');
      else S.actionsLeft = 1;
    }
  } else if (!S.over && S.actionsLeft <= 0) {
    S.turn = (S.turn + 1) % S.numPlayers;
    S.gameTurn++;
    S.actionsLeft = S.gameTurn === 0 ? 1 : 2;
    S.selectedId = null;
    S.placeIdx = null;
  }
  if (!S.over && S.numPlayers > 0 && !hasLegalAction(S, S.turn)) {
    const ch = charAtRank(S, S.turn);
    end(S, (S.turn + 1) % S.numPlayers, `${ch.emoji} ${ch.name} cannot take an action`);
  }
  return true;
}

function moveSelected(S, p, dx, dy, pull) {
  ensureParsed(S);
  const yours = yourThings(S, p);
  let sel = S.entities.find(e => e.id === S.selectedId);
  if (!sel || !yours.includes(sel)) sel = yours[0];
  if (!sel) return false;
  return act(S, p, () => {
    if (!canMove(S, sel, dx, dy)) return false;
    doMove(S, sel, dx, dy, pull);
    // FAST (board game, per design diary #3): move as many spaces as you like
    // in a single direction — slide until blocked
    if (propsOf(S, sel).FAST) {
      while (canMove(S, sel, dx, dy)) doMove(S, sel, dx, dy, false);
    }
    return true;
  });
}

// CURIOUS (board game, per design diary #3): when anything ENTERS a CURIOUS
// object's row or column, the CURIOUS thing moves 1 space towards it.
// Entering = moving into or being placed into a space (pushed things count too),
// so effects cascade: a push can make a rock move, which makes Keke move, ...
function resolveCurious(S) {
  const reacted = new Set(); // each (curious, entering) pair triggers at most one 1-space move
  for (let iter = 0; iter < 50; iter++) {
    ensureParsed(S);
    const curious = S.entities.filter(e => e.kind === 'object' && propsOf(S, e).CURIOUS);
    if (!curious.length) return;
    const entered = (S._entered || [])
      .map(id => S.entities.find(e => e.id === id))
      .filter(Boolean);
    let moved = false;
    for (const c of curious) {
      const cands = entered.filter(e => e !== c && (e.x === c.x || e.y === c.y) && !reacted.has(c.id + ':' + e.id));
      if (!cands.length) continue;
      let t = cands[0], bd = Infinity;
      for (const e of cands) {
        const d = Math.abs(e.x - c.x) + Math.abs(e.y - c.y);
        if (d < bd) { bd = d; t = e; }
      }
      reacted.add(c.id + ':' + t.id);
      const dx = Math.sign(t.x - c.x), dy = Math.sign(t.y - c.y);
      const dirs = Math.abs(t.x - c.x) >= Math.abs(t.y - c.y)
        ? [[dx, 0], [0, dy]]
        : [[0, dy], [dx, 0]];
      for (const [mx, my] of dirs) {
        if (mx === 0 && my === 0) continue;
        if (canMove(S, c, mx, my)) { doMove(S, c, mx, my, false); moved = true; break; }
      }
    }
    if (!moved) return;
  }
}

function place(S, p, idx, x, y) {
  return act(S, p, () => {
    if (idx >= S.supply.length) return false;
    if (!placeTargets(S, p).has(x + ',' + y)) return false;
    doPlace(S, p, idx, x, y);
    return true;
  });
}

function challenge(S, p) {
  if (S.over || S.challenge || S.numPlayers < 2) return false;
  if (S.turn !== p) return false;
  const full = S.gameTurn === 0 ? 1 : 2;
  if (S.actionsLeft !== full) return false;
  pushHistory(S, snapshot(S));
  S.challenge = { challenger: p, left: 10 };
  S.turn = (p + 1) % S.numPlayers;
  S.actionsLeft = 2;
  S.placeIdx = null;
  const opp = S.turn;
  log(S, `⚔ ${charAtRank(S, p).emoji} ${charAtRank(S, p).name} challenges — ${charAtRank(S, opp).emoji} ${charAtRank(S, opp).name} gets 10 actions to win`);
  if (!S.over && !hasLegalAction(S, S.turn)) end(S, p, 'opponent cannot act');
  return true;
}

function spendClock(S, p) {
  const sc = S.scenario;
  if (sc.bo3 || !sc.clocks[p]) return false;
  if (sc.score[0] !== 0 || sc.score[1] !== 0) return false;
  if (S.over) return false;
  pushHistory(S, snapshot(S));
  sc.bo3 = true;
  sc.clocks[p] = false;
  log(S, `🕐 P${p + 1} spends their clock — this scenario is best 2 of 3`);
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    W, H, NOUNS, EMOJI, createGame, newScenario, parseRules, ensureParsed, ruleList,
    propsOf, isYou, isWin, youOwner, entitiesAt, canMove, doMove, placeTargets, canPlace,
    doPlace, legalMoves, hasLegalAction, yourThings, act, moveSelected, place, challenge,
    spendClock, resolve, undo, snapshot, setEnabled, activeChars, charAtRank, isWaterCell,
    resolveCurious,
    RIVER, HOME_CORNERS, CHARACTERS, DEFAULT_ENABLED,
    NOUNS, PLAYER_NOUNS, PLAYER_EMOJI, PLAYER_COLORS, PLAYER_NAMES,
  };
}

if (typeof document !== 'undefined') initUI();

function initUI() {
  let S = createGame();
  let pullOn = false;
  const board = document.getElementById('board');
  board.style.gridTemplateColumns = `repeat(${W}, var(--cell))`;
  const cells = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = document.createElement('div');
      d.className = 'cell';
      d.dataset.x = x; d.dataset.y = y;
      d.addEventListener('click', () => onCellClick(x, y));
      board.appendChild(d);
      cells.push(d);
    }
  }

  function activeSelectable() {
    return yourThings(S, S.turn);
  }

  function selected() {
    let sel = S.entities.find(e => e.id === S.selectedId);
    if (!sel || !activeSelectable().includes(sel)) sel = activeSelectable()[0];
    if (sel) S.selectedId = sel.id;
    return sel;
  }

  function onCellClick(x, y) {
    if (S.over || S.scenarioOver) return;
    if (S.placeIdx !== null) {
      if (place(S, S.turn, S.placeIdx, x, y)) S.placeIdx = null;
      render();
      return;
    }
    const here = entitiesAt(S, x, y);
    const mine = here.find(e => activeSelectable().includes(e));
    if (mine) { S.selectedId = mine.id; render(); }
  }

  function render() {
    for (const c of cells) { c.innerHTML = ''; c.className = 'cell'; }
    const sel = selected();
    const targets = S.placeIdx !== null ? placeTargets(S, S.turn) : new Set();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cell = cells[y * W + x];
        if (RIVER.has(x + ',' + y)) cell.classList.add('water');
        if (targets.has(x + ',' + y)) cell.classList.add('target');
        const ents = entitiesAt(S, x, y);
        if (ents.some(e => sel && e.id === sel.id)) cell.classList.add('sel');
        if (ents.length > 1) cell.classList.add('stack');
        for (const e of ents) {
          const sp = document.createElement('span');
          if (e.kind === 'object') {
            sp.className = 'ent obj obj-' + e.type;
            sp.textContent = EMOJI[e.type];
          } else if (e.prop) {
            sp.className = 'ent word prop-' + e.prop.toLowerCase() + (e.owner !== undefined ? ' own' + e.owner : '');
            sp.textContent = e.label;
          } else {
            sp.className = 'ent word noun';
            sp.textContent = e.noun;
          }
          cell.appendChild(sp);
        }
      }
    }

    const turnEl = document.getElementById('turn');
    const cur = S.numPlayers > 0 ? charAtRank(S, S.turn) : null;
    if (S.over) {
      const w = S.over.winner;
      const wch = w === null ? null : charAtRank(S, w);
      turnEl.innerHTML = w === null
        ? `🤝 DRAW — ${S.over.reason}`
        : `<span style="color:${wch.color}">${wch.emoji} ${wch.name} (P${w + 1}) WINS</span> — ${S.over.reason}`;
    } else if (S.challenge) {
      const opp = (S.challenge.challenger + 1) % S.numPlayers;
      const och = charAtRank(S, opp);
      turnEl.innerHTML = `⚔ Challenge: <span style="color:${och.color}">${och.emoji} ${och.name} (P${opp + 1})</span> must win in <b>${S.challenge.left}</b> actions`;
    } else if (!cur) {
      turnEl.textContent = 'no players enabled — toggle someone on above';
    } else {
      turnEl.innerHTML = `<span style="color:${cur.color}">${cur.emoji} ${cur.name} (P${S.turn + 1})</span> — actions: ${'●'.repeat(S.actionsLeft)}${'○'.repeat(Math.max(0, (S.gameTurn === 0 ? 1 : 2) - S.actionsLeft))}`;
    }

    const sc = S.scenario;
    document.getElementById('score').textContent =
      `Scenario ${sc.score.join('–')} ${sc.bo3 ? '(best of 3)' : ''} · games ${sc.wins.join('–')} · world pts ${sc.worldPoints.join('–')}`;

    const ul = document.getElementById('rules');
    ul.innerHTML = '';
    for (const r of ruleList(S)) {
      const li = document.createElement('li');
      // sprites next to player names in the rules list (not on board/tiles)
      const txt = r.replace(/^([A-Z]+)/, (m) => {
        const c = CHARACTERS.find(c => c.noun === m);
        return c ? c.emoji + ' ' + m : m;
      });
      if (r.endsWith(' (default)')) li.textContent = txt;
      else { const b = document.createElement('b'); b.textContent = txt; li.appendChild(b); } // formed rules bold, above defaults
      ul.appendChild(li);
    }
    const lg = document.getElementById('log');
    lg.innerHTML = '';
    for (const m of S.log) {
      const li = document.createElement('li');
      li.textContent = m;
      lg.appendChild(li);
    }

    const tray = document.getElementById('supply');
    tray.innerHTML = '';
    S.supply.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'tile' + (t.prop ? ' prop-' + t.prop.toLowerCase() : ' noun') + (S.placeIdx === i ? ' picked' : '');
      b.textContent = t.prop ? 'IS ' + t.prop : t.noun;
      b.title = 'Click, then click a highlighted cell to place';
      b.addEventListener('click', () => {
        if (S.over || S.scenarioOver) return;
        S.placeIdx = S.placeIdx === i ? null : i;
        render();
      });
      tray.appendChild(b);
    });
    document.getElementById('supply-empty').style.display = S.supply.length ? 'none' : 'block';

    document.getElementById('btn-challenge').disabled = S.over || S.scenarioOver || S.challenge !== null || S.actionsLeft !== (S.gameTurn === 0 ? 1 : 2);
    document.getElementById('btn-clock').disabled = S.over || S.scenarioOver || sc.bo3 || sc.clocks.every(c => !c) || sc.score.reduce((a, b) => a + b, 0) > 0;
    document.getElementById('btn-clock').textContent = sc.bo3 ? '🕐 best of 3 active' : '🕐 spend clock (best of 3)';
    document.querySelectorAll('#players button').forEach((b, i) => {
      b.classList.toggle('on', !!S.enabled[i]);
    });

    const ov = document.getElementById('overlay');
    if (S.over || S.scenarioOver) {
      ov.classList.remove('hidden');
      let html = '';
      if (S.over) {
        const w = S.over.winner;
        const wch = w === null ? null : charAtRank(S, w);
        html += w === null
          ? `<div class="big">🤝 DRAW</div><div class="sub">${S.over.reason}</div>`
          : `<div class="big" style="color:${wch.color}">${wch.emoji} ${wch.name} (P${w + 1}) wins the game!</div><div class="sub">${S.over.reason}</div>`;
        html += `<div class="sub">R = next game${S.scenarioOver ? '' : ' · N = new scenario'}</div>`;
      }
      if (S.scenarioOver) {
        let w = null;
        for (let i = 1; i < sc.score.length; i++) if (sc.score[i] > sc.score[w === null ? 0 : w]) w = i;
        if (w !== null && sc.score.filter(v => v === sc.score[w]).length > 1) w = null;
        const wch = w === null ? null : charAtRank(S, w);
        html += `<div class="big" style="color:${wch ? wch.color : '#fff'}">🏆 Scenario to ${wch ? wch.emoji + ' ' + wch.name + ' (P' + (w + 1) + ')' : 'tie'}</div>`;
        html += `<div class="sub">N = new scenario · R = replay</div>`;
      }
      ov.innerHTML = html;
    } else {
      ov.classList.add('hidden');
    }
  }

  const KEYMAP = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0],
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyR') {
      S = S.scenarioOver ? newScenario(S.scenario, S.enabled) : createGame(S.enabled, S.scenario);
      render();
      return;
    }
    if (e.code === 'KeyN') {
      S = newScenario(S.scenario, S.enabled);
      render();
      return;
    }
    if (e.code === 'KeyZ') {
      undo(S);
      render();
      return;
    }
    if (S.over || S.scenarioOver) return;
    if (e.code === 'Tab') {
      const list = activeSelectable();
      if (list.length) {
        const i = list.findIndex(x => x.id === S.selectedId);
        S.selectedId = list[(i + 1) % list.length].id;
        render();
      }
      return;
    }
    if (e.code === 'Escape') { S.placeIdx = null; render(); return; }
    if (e.code === 'KeyC') { challenge(S, S.turn); render(); return; }
    if (/^Digit[1-9]$/.test(e.code)) {
      const i = Number(e.code.slice(5)) - 1;
      if (i < S.supply.length) { S.placeIdx = S.placeIdx === i ? null : i; render(); }
      return;
    }
    const m = KEYMAP[e.code];
    if (!m) return;
    moveSelected(S, S.turn, m[0], m[1], e.shiftKey || pullOn);
    render();
  });

  document.querySelectorAll('#dpad button').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (S.over || S.scenarioOver) return;
      moveSelected(S, S.turn, Number(b.dataset.dx), Number(b.dataset.dy), pullOn);
      render();
    });
  });
  document.getElementById('btn-pull').addEventListener('click', () => {
    pullOn = !pullOn;
    document.getElementById('btn-pull').textContent = 'PULL: ' + (pullOn ? 'ON' : 'off');
    document.getElementById('btn-pull').classList.toggle('on', pullOn);
  });
  document.getElementById('btn-undo').addEventListener('click', () => { undo(S); render(); });

  document.getElementById('btn-challenge').addEventListener('click', () => { challenge(S, S.turn); render(); });
  document.getElementById('btn-clock').addEventListener('click', () => { spendClock(S, S.turn); render(); });
  document.getElementById('btn-newgame').addEventListener('click', () => {
    S = S.scenarioOver ? newScenario(S.scenario, S.enabled) : createGame(S.enabled, S.scenario);
    render();
  });
  document.getElementById('btn-newscenario').addEventListener('click', () => { S = newScenario(S.scenario, S.enabled); render(); });
  const pwrap = document.getElementById('players');
  CHARACTERS.forEach((c, i) => {
    const b = document.createElement('button');
    b.textContent = `${c.emoji} ${c.name}`;
    b.title = 'toggle player (active players become P1, P2, … in this order)';
    b.addEventListener('click', () => { setEnabled(S, i, !S.enabled[i]); render(); });
    pwrap.appendChild(b);
  });

  let touchStart = null;
  board.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStart = [t.clientX, t.clientY];
  }, { passive: true });
  board.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart[0], dy = t.clientY - touchStart[1];
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // tap, not swipe — let click handle it
    e.preventDefault();
    if (S.over || S.scenarioOver) return;
    if (Math.abs(dx) > Math.abs(dy)) moveSelected(S, S.turn, Math.sign(dx), 0, pullOn);
    else moveSelected(S, S.turn, 0, Math.sign(dy), pullOn);
    render();
  }, { passive: false });

  render();
}
