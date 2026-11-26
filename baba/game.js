'use strict';

const W = 5, H = 5, CELL = 64;
const NOUNS = ['BABA', 'KEKE', 'SAMI', 'AAS', 'GABA', 'EBBA', 'ZABA', 'MINNE', 'ROCK', 'FLAG', 'RIVER', 'TEXT', 'SQUARE'];
const EMOJI = { BABA: '🐑', KEKE: '🦔', SAMI: '🐻‍❄️', AAS: '🦙', GABA: '🐴', EBBA: '🦦', ZABA: '🐸', MINNE: '🐼', ROCK: '🪨', FLAG: '🚩', RIVER: '🌊', TEXT: '🔤' };
// BABA (polar bear) and KEKE (hedgehog) are the only characters by default —
// no character select unless the "alternate characters (dev)" checkbox is on.
const CHARACTERS = [
  { noun: 'BABA', name: 'Baba', emoji: '🐑', color: '#ff6b9d' },
  { noun: 'KEKE', name: 'Keke', emoji: '🦔', color: '#4dabf7' },
  { noun: 'SAMI', name: 'Sami', emoji: '🐻‍❄️', color: '#ff6b9d' },
  { noun: 'AAS', name: 'Aas', emoji: '🦙', color: '#4dabf7' },
  { noun: 'GABA', name: 'Gaba', emoji: '🐴', color: '#b388ff' },
  { noun: 'EBBA', name: 'Ebba', emoji: '🦦', color: '#ffd166' },
  { noun: 'ZABA', name: 'Zaba', emoji: '🐸', color: '#7bed9f' },
  { noun: 'MINNE', name: 'Minne', emoji: '🐼', color: '#b2bec3' },
];
const DEFAULT_ENABLED = [true, true, false, false, false, false, false, false];
// with "alternate characters (dev)": BABA/KEKE are replaced by SAMI/AAS as the
// defaults, and every character can be toggled/replaced in the select
const ALT_DEFAULT_ENABLED = [false, false, true, true, false, false, false, false];
// Emoji graphics (Noto Color Emoji 128px PNGs, Apache-2.0 — see README) shipped
// locally in img/, so the board does not depend on the device having an emoji font.
const SPRITE_IMG = {
  BABA: 'img/baba.png', KEKE: 'img/keke.png',
  SAMI: 'img/sami.png', AAS: 'img/aas.png', GABA: 'img/gaba.png', EBBA: 'img/ebba.png',
  ZABA: 'img/zaba.png', MINNE: 'img/minne.png', ROCK: 'img/rock.png', FLAG: 'img/flag.png',
  RIVER: 'img/river.png', TEXT: 'img/text.png',
};

const PLAYER_NOUNS = CHARACTERS.map(c => c.noun);
const PLAYER_NAMES = CHARACTERS.map(c => c.name);
const PLAYER_EMOJI = CHARACTERS.map(c => c.emoji);
const PLAYER_COLORS = CHARACTERS.map(c => c.color);
// River terrain of the WORLD 1: THE PLAINS board. Matrix notation (row,col), 1-indexed:
// (1,1),(2,1),(2,2),(2,3),(3,3),(4,3),(4,4),(4,5),(5,5)  ->  stored 0-indexed as (x=col-1, y=row-1).
// The river is called RIVER (noun 'RIVER'); it is terrain, not a tile — future rules will interact with it.
const RIVER = new Set(['0,0', '0,1', '1,1', '2,1', '2,2', '2,3', '3,3', '4,3', '4,4']);
// Home spots BY PLAYER RANK: PLAYER 1 lower-left, PLAYER 2 upper-right (opposite
// diagonals), then the other corners, then edge midpoints.
const HOME_CORNERS = [[0, H - 1], [W - 1, 0], [0, 0], [W - 1, H - 1], [2, 0], [2, H - 1], [0, 2], [W - 1, 2]];
function isRiverCell(x, y) { return RIVER.has(x + ',' + y); }
function riverAt(S, x, y) { return (S.river || RIVER).has(x + ',' + y); }

// Levels (PDF: each level brings in only TWO rule/property tiles on top of the
// base tiles — flag/rock/win + RIVER/TEXT nouns). The developer option at the
// BOTTOM of the dropdown has all of them and is preselected for now.
const ALL_PROPS = ['CURIOUS', 'FAST', 'STOP', 'SINK', 'MELT', 'HOT', 'OPEN', 'SHUT', 'DEFEAT', 'WRAP', 'THIRSTY', 'STRONG', 'SCARED', 'SHEEP'];
// Level cards ("modifiers") in the order they appear in the campaign video
// (world 1, then world 2). A card is named after its permanent rule when it
// has one (e.g. RIVER IS HOT instead of HOT/MELT). `fixed` rules are printed
// as permanent purple tiles in the board corners (see syncFixedTiles).
const MODIFIERS = [
  { id: 'more-rock-flag', name: 'MORE ROCK MORE FLAG', tiles: [{ noun: 'ROCK' }, { noun: 'FLAG' }] },
  { id: 'fast', name: 'FAST', tiles: [{ prop: 'FAST' }] },
  { id: 'hot-melt', name: 'RIVER IS HOT', tiles: [{ prop: 'HOT' }, { prop: 'MELT' }], fixed: [['RIVER', 'HOT']] },
  { id: 'curious', name: 'FLAG IS CURIOUS', tiles: [{ prop: 'CURIOUS' }], fixed: [['FLAG', 'CURIOUS']] },
  { id: 'square', name: 'SQUARE', tiles: [{ noun: 'SQUARE' }] },
  { id: 'win-harder', name: 'WIN HARDER', tiles: [{ prop: 'WIN' }, { prop: 'WIN' }] },
  { id: 'thirsty', name: 'ROCK IS THIRSTY', tiles: [{ prop: 'THIRSTY' }], fixed: [['ROCK', 'THIRSTY']] },
  { id: 'strong', name: 'STRONG', tiles: [{ prop: 'STRONG' }] },
  { id: 'scared', name: 'ROCK IS SCARED', tiles: [{ prop: 'SCARED' }], fixed: [['ROCK', 'SCARED']] },
  { id: 'sheep', name: 'ROCK IS SHEEP', tiles: [{ prop: 'SHEEP' }, { prop: 'SHEEP' }], fixed: [['ROCK', 'SHEEP']] },
];
// levelId: 'base' (no cards), 'm:<id1>,<id2>' (one or two different cards),
// 'd...' = developer (all tiles, infinite) — combinable: 'dm:<id1>,<id2>'
function parseLevel(levelId) {
  let rest = levelId || 'base';
  let dev = false;
  if (rest[0] === 'd') { dev = true; rest = rest.slice(1); }
  let mods = [];
  if (rest.slice(0, 2) === 'm:') mods = rest.slice(2).split(',').filter(Boolean);
  return { dev, mods };
}
const BASE_TILES = [{ prop: 'WIN' }, { prop: 'WIN' }, { noun: 'ROCK' }, { noun: 'FLAG' }];
// tray order: IS WIN first, then nouns (NOUNS order), then all properties (ALL_PROPS order)
function sortSupply(supply) {
  return supply.slice().sort((a, b) => {
    const grp = (t) => (t.prop ? (t.prop === 'WIN' ? 0 : 2) : 1);
    const ga = grp(a), gb = grp(b);
    if (ga !== gb) return ga - gb;
    if (a.prop && b.prop) return (a.prop === 'WIN' ? -1 : ALL_PROPS.indexOf(a.prop)) - (b.prop === 'WIN' ? -1 : ALL_PROPS.indexOf(b.prop));
    if (a.noun && b.noun) return NOUNS.indexOf(a.noun) - NOUNS.indexOf(b.noun);
    return 0;
  });
}
function supplyFor(levelId) {
  const { dev, mods } = parseLevel(levelId);
  if (dev) {
    // developer: ONE of each tile (placing does not consume, see doPlace)
    return sortSupply([{ prop: 'WIN' }, { noun: 'ROCK' }, { noun: 'FLAG' }, { noun: 'RIVER' }, { noun: 'TEXT' }, { noun: 'SQUARE' }]
      .concat(ALL_PROPS.map(p => ({ prop: p }))));
  }
  const out = BASE_TILES.slice();
  for (const id of mods) {
    const m = MODIFIERS.find(mm => mm.id === id);
    if (m) for (const t of m.tiles) out.push({ prop: t.prop, noun: t.noun });
  }
  return sortSupply(out);
}
function activeChars(S) {
  const out = [];
  for (let i = 0; i < CHARACTERS.length; i++) if (S.enabled[i]) out.push(i);
  return out;
}
function charAtRank(S, rank) { return CHARACTERS[activeChars(S)[rank]]; }
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

let nextId = 1;
// UI hook for THIRSTY ties (set once by the UI; null in tests -> first option)
let UI_THIRSTY_CHOOSER = null;
function setThirstyChooser(fn) { UI_THIRSTY_CHOOSER = fn; }
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

function createGame(enabled, scenario, levelId) {
  levelId = levelId || 'base';
  enabled = (enabled && enabled.length === CHARACTERS.length) ? enabled.slice() : DEFAULT_ENABLED.slice();
  const numPlayers = enabled.filter(Boolean).length;
  nextId = 1;
  scenario = scenario || {
    score: [0, 0], wins: [0, 0], bo3: false, clocks: [true, true], firstPlayer: 0,
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
  // spawn corners follow SELECTION order: first selected -> lower-left (0,4),
  // second selected -> upper-right (4,0) (opposite diagonals), then the other
  // corners/edge midpoints — corner if free, else nearest free cell
  const order = activeChars({ enabled });
  order.forEach((ci, i) => {
    const [cx, cy] = HOME_CORNERS[i];
    const [fx, fy] = firstFreeCell(entities, cx, cy);
    entities.push(obj(CHARACTERS[ci].noun, fx, fy));
  });
  const supply = supplyFor(levelId);
  const pl = parseLevel(levelId);
  const S = {
    entities, supply, numPlayers, enabled, level: levelId, mods: pl.mods, dev: pl.dev, spawnOrder: order.slice(),
    turn: ((scenario && scenario.firstPlayer) || 0) % numPlayers, gameTurn: 0, actionsLeft: 1, // rotate starter across games
    challenge: null, over: null, scenarioOver: false,
    scenario,
    selectedId: null, placeIdx: null,
    log: [], rules: [], _prevRules: [], history: [],
    river: new Set(RIVER),
    _loopSteps: 0, _thirstyPending: [], _thirstyChooser: UI_THIRSTY_CHOOSER,
  };
  S.mods = pl.mods; S.dev = pl.dev;
  syncFixedTiles(S);
  ensureParsed(S);
  S._prevRules = ruleList(S);
  return S;
}

// Permanent printed tiles in the margin around the board. The P1 noun tile
// (left-middle, over IS P1) and the bottom IS P1 exist whenever at least one
// character is active; the P2 noun tile (top-middle, next to IS P2) and the
// right IS P2 exist when at least two are active. They cannot be moved or
// otherwise interacted with, but tiles on the board can point at them (and the
// printed nouns can point into the board) to form rules.
// Coordinates are board coords extended by one margin cell (-1 and 5).
function syncFixedTiles(S) {
  S.entities = S.entities.filter(e => !e.fixed);
  const a = activeChars(S);
  if (a.length >= 1) {
    const n0 = CHARACTERS[a[0]].noun;
    S.entities.push(
      { id: nextId++, kind: 'word', noun: n0, fixed: true, x: -1, y: 2 },
      { id: nextId++, kind: 'word', prop: 'YOU', owner: 0, label: 'IS PLAYER 1', fixed: true, x: -1, y: 3 },
      { id: nextId++, kind: 'word', prop: 'YOU', owner: 0, label: 'IS PLAYER 1', fixed: true, x: 2, y: 5 },
    );
  }
  if (a.length >= 2) {
    const n1 = CHARACTERS[a[1]].noun;
    S.entities.push(
      { id: nextId++, kind: 'word', noun: n1, fixed: true, x: 2, y: -1 },
      { id: nextId++, kind: 'word', prop: 'YOU', owner: 1, label: 'IS PLAYER 2', fixed: true, x: 3, y: -1 },
      { id: nextId++, kind: 'word', prop: 'YOU', owner: 1, label: 'IS PLAYER 2', fixed: true, x: 5, y: 2 },
    );
  }
  // Permanent level-card rules, printed as purple tiles: first rule in the
  // top-left corner, second in the lower-left corner (noun + property tile).
  const fixedRules = [];
  for (const id of (S.mods || [])) {
    const m = MODIFIERS.find(mm => mm.id === id);
    if (m && m.fixed) for (const fr of m.fixed) fixedRules.push(fr);
  }
  const corners = [[-1, -1], [-1, 5]];
  fixedRules.slice(0, 2).forEach(([noun, prop], i) => {
    const [cx, cy] = corners[i];
    S.entities.push(
      { id: nextId++, kind: 'word', noun, fixed: true, perm: true, x: cx, y: cy },
      { id: nextId++, kind: 'word', prop, owner: null, label: 'IS ' + prop, fixed: true, perm: true, x: cx + 1, y: cy },
    );
  });
  ensureParsed(S);
}

function newScenario(prev, enabled, levelId) {
  enabled = (enabled && enabled.length === CHARACTERS.length) ? enabled : (prev && prev.enabled ? prev.enabled.slice() : DEFAULT_ENABLED.slice());
  const numPlayers = enabled.filter(Boolean).length;
  const sc = {
    score: new Array(numPlayers).fill(0),
    wins: new Array(numPlayers).fill(0),
    bo3: false,
    clocks: new Array(numPlayers).fill(true),
    worldPoints: new Array(numPlayers).fill(0),
    scenariosPlayed: prev ? prev.scenariosPlayed : 0,
    firstPlayer: prev ? (prev.firstPlayer || 0) : 0,
    numPlayers,
  };
  if (prev) prev.worldPoints.forEach((v, i) => { if (i < numPlayers) sc.worldPoints[i] = v; });
  sc.enabled = enabled.slice();
  return createGame(enabled, sc, levelId);
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
  S.spawnOrder = (S.spawnOrder || []).filter(x => x !== ci);
  if (on) {
    const rank = newActive.indexOf(ci);
    S.spawnOrder.push(ci); // corner follows selection order, not written index order
    const [cx, cy] = HOME_CORNERS[S.spawnOrder.indexOf(ci)];
    const [fx, fy] = firstFreeCell(S.entities, cx, cy);
    S.entities.push(obj(c.noun, fx, fy));
    log(S, `${c.emoji} ${c.name} (PLAYER ${rank + 1}) drops in at ${fx},${fy}`);
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
  syncFixedTiles(S);
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
  const propAt = new Map();
  const nounTiles = [];
  for (const e of S.entities) {
    if (e.kind !== 'word') continue;
    if (e.prop) propAt.set(e.x + ',' + e.y, e);
    else if (e.noun) nounTiles.push(e);
  }
  for (const n of nounTiles) {
    const r = propAt.get((n.x + 1) + ',' + n.y);
    if (r) rules.push({ noun: n.noun, prop: r.prop, owner: r.owner, permanent: !!r.fixed, _tile: r.id });
    const d = propAt.get(n.x + ',' + (n.y + 1));
    if (d) rules.push({ noun: n.noun, prop: d.prop, owner: d.owner, permanent: !!d.fixed, _tile: d.id });
  }
  // printed margin tiles cover PLAYER 1 (always) and PLAYER 2 (2+ players); PLAYER 3+ are implicit
  activeChars(S).forEach((ci, rank) => {
    if (rank >= 2) rules.push({ noun: CHARACTERS[ci].noun, prop: 'YOU', owner: rank, permanent: true });
  });
  return rules;
}

function ensureParsed(S) {
  const rules = parseRules(S);
  S.rules = rules;
  const propMap = {}, youOwners = {};
  for (const r of rules) {
    (propMap[r.noun] = propMap[r.noun] || {})[r.prop] = true;
    // a noun can be YOU for SEVERAL players at once (e.g. ROCK IS PLAYER 1 + ROCK IS PLAYER 2)
    if (r.prop === 'YOU') {
      if (!youOwners[r.noun]) youOwners[r.noun] = [];
      if (!youOwners[r.noun].includes(r.owner)) youOwners[r.noun].push(r.owner);
    }
  }
  S._propMap = propMap;
  S._youOwners = youOwners;
}

function ruleList(S) {
  const fmt = (r) => {
    const prop = r.prop === 'YOU' && r.owner !== null && r.owner !== undefined ? 'PLAYER ' + (r.owner + 1) : r.prop;
    return r.noun + ' IS ' + prop + (r.permanent ? ' (default)' : '');
  };
  // formed (non-default) rules first, default rules below
  return S.rules.filter(r => !r.permanent).map(fmt).sort()
    .concat(S.rules.filter(r => r.permanent).map(fmt).sort());
}

// Word tiles are TEXT: they carry whatever `TEXT IS ...` rules say (so
// `TEXT IS PLAYER n` makes them that player's YOU things, movable), but they
// are never the object they name — you win by touching the actual FLAG object,
// not the word "FLAG" (unless TEXT IS WIN). The permanent printed tiles in the
// margin are exempt: TEXT rules never apply to them.
const typeOf = (e) => (e.kind === 'object' ? e.type : (e.fixed ? null : 'TEXT'));
// A word tile is TEXT (all word tiles) and, if it is the property tile of a
// currently formed rule, also SQUARE (unlike TEXT, SQUARE is dynamic — it
// changes as rules form and break).
function typesOf(S, e) {
  if (e.kind === 'object') return [e.type];
  if (e.fixed) return [];
  const t = ['TEXT'];
  if (e.prop && S.rules.some(r => !r.permanent && r._tile === e.id)) t.push('SQUARE');
  return t;
}
function propsOf(S, e) { const out = {}; for (const t of typesOf(S, e)) Object.assign(out, S._propMap[t] || {}); return out; }
function isYou(S, e) { return !!propsOf(S, e).YOU; }
function isWin(S, e) { return !!propsOf(S, e).WIN; }
function youOwners(S, e) {
  const out = [];
  for (const t of typesOf(S, e)) for (const o of (S._youOwners[t] || [])) if (!out.includes(o)) out.push(o);
  return out;
}
function youOwner(S, e) { return youOwners(S, e)[0]; }
function isYouBy(S, e, p) { return !!propsOf(S, e).YOU && youOwners(S, e).includes(p); }
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
    river: Array.from(S.river || RIVER), level: S.level, spawnOrder: S.spawnOrder, mods: S.mods, dev: S.dev,
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
  if (Array.isArray(S.river)) S.river = new Set(S.river);
  ensureParsed(S);
  log(S, '↩ undone');
  return true;
}

function end(S, winner, reason) {
  S.over = { winner, reason };
  S.scenario.firstPlayer = (S.scenario.firstPlayer || 0) + 1; // rotate the starting player for the next game
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
  log(S, winner === null ? '🤝 ' + reason : `${wch.emoji} ${wch.name} (PLAYER ${winner + 1}) ${reason}`);
}

// Videogame destruction rules, applied after every action (and after CURIOUS
// cascades): SINK objects are destroyed when they share a cell with anything;
// MELT objects are destroyed when they touch a HOT object (an object that is
// both HOT and MELT melts itself); DEFEAT objects destroy YOU objects that
// share their cell. RIVER is a noun: river cells count as RIVER, so
// RIVER IS WIN / RIVER IS DEFEAT / RIVER IS SINK affect the terrain itself.
// Infinite-loop ruling (FAQ): if resolving one action runs 100 steps, the
// player who last took an action loses.
function bumpLoop(S, actor) {
  if (S.over) return true;
  S._loopSteps = (S._loopSteps || 0) + 1;
  if (S._loopSteps >= 100) {
    const a = (actor === undefined || actor === null) ? S.turn : actor;
    end(S, S.numPlayers === 2 ? 1 - a : null, 'infinite loop (100 steps) — the last action loses');
    return true;
  }
  return false;
}

function resolveDestructive(S, actor) {
  for (;;) {
    if (bumpLoop(S, actor)) return;
    ensureParsed(S);
    const riverP = S._propMap['RIVER'] || {};
    const dead = new Set();
    const riverDead = [];
    for (const e of S.entities) {
      if (e.kind !== 'object') continue;
      const p = propsOf(S, e);
      const cell = entitiesAt(S, e.x, e.y);
      if (p.SINK && cell.length > 1) dead.add(e.id);
      // MELT is destroyed by HOT — including RIVER IS HOT: a MELT thing standing on the river
      if (p.MELT && (p.HOT || (riverP.HOT && riverAt(S, e.x, e.y)) || cell.some(o => o !== e && propsOf(S, o).HOT))) dead.add(e.id);
      if (isYou(S, e) && cell.some(o => o !== e && propsOf(S, o).DEFEAT)) dead.add(e.id);
      if (isYou(S, e) && riverP.DEFEAT && riverAt(S, e.x, e.y)) dead.add(e.id);
    }
    if (riverP.SINK) {
      for (const k of S.river || []) {
        const [x, y] = k.split(',').map(Number);
        if (entitiesAt(S, x, y).length > 0) riverDead.push(k);
      }
    }
    if (!dead.size && !riverDead.length) return;
    const removed = S.entities.filter(e => dead.has(e.id));
    S.entities = S.entities.filter(e => !dead.has(e.id));
    recycleTiles(S, removed);
    if (S.river) for (const k of riverDead) S.river.delete(k);
  }
}

function resolve(S, actor) {
  ensureParsed(S);
  const rl = ruleList(S);
  for (const r of rl) if (!S._prevRules.includes(r)) log(S, '➕ ' + r);
  for (const r of S._prevRules) if (!rl.includes(r)) log(S, '➖ ' + r);
  S._prevRules = rl;

  resolveDestructive(S, actor);
  ensureParsed(S);

  const riverP = S._propMap['RIVER'] || {};
  const winners = new Set();
  for (const e of S.entities) {
    if (!isYou(S, e)) continue;
    let won = !!(riverP.WIN && riverAt(S, e.x, e.y));
    for (const o of entitiesAt(S, e.x, e.y)) {
      if (o !== e && isWin(S, o)) won = true;
    }
    if (won) for (const ow of youOwners(S, e)) winners.add(ow);
  }
  if (winners.size === 2) end(S, actor, 'both YOU on WIN — last action wins');
  else if (winners.size === 1) end(S, [...winners][0], 'YOU shared a space with WIN');

  // a PLAYER whose YOU things were all destroyed loses (videogame DEFEAT/SINK)
  if (!S.over && S.numPlayers >= 1) {
    const alive = [];
    for (let r = 0; r < S.numPlayers; r++) if (yourThings(S, r).length) alive.push(r);
    if (alive.length === 0) {
      if (S.numPlayers === 1) {
        const ch = charAtRank(S, 0);
        end(S, null, `${ch.name} lost — no YOU things left`); // a lone player who is destroyed LOSES, not wins
      } else end(S, actor, 'all YOU things destroyed — last action wins');
    }
    else if (alive.length < S.numPlayers && S.numPlayers === 2) {
      const loser = 1 - alive[0];
      end(S, alive[0], `${charAtRank(S, loser).emoji} ${charAtRank(S, loser).name} has no YOU things left`);
    }
  }
}

function stackable(S, m, o) {
  return (isYou(S, m) && isWin(S, o)) || (isWin(S, m) && isYou(S, o));
}

// OPEN opens SHUT (videogame-faithful): a SHUT thing is "open" while an OPEN
// thing shares its cell.
function openedInCell(S, o) {
  return entitiesAt(S, o.x, o.y).some(x => x !== o && propsOf(S, x).OPEN);
}
function shutBlocked(S, o, entrant) {
  return propsOf(S, o).SHUT && !openedInCell(S, o) && !propsOf(S, entrant).OPEN;
}
// Things with these properties are NOT pushed (despite ALL IS PUSH) — you enter
// their cell and stack instead, which is what makes SINK / DEFEAT / MELT able
// to trigger at all. OPEN things are enterable too (videogame doors).
function enterableProp(p) { return !!(p.OPEN || p.SINK || p.DEFEAT || p.MELT); }

// Chain push: everything in the path is pushed (ALL IS PUSH); the move only
// fails if the chain runs into the edge of the board or a STOP / shut thing.
// A YOU mover may still stack onto a WIN thing instead of pushing it.
// Videogame properties: STOP = immovable wall; OPEN/SINK/DEFEAT/MELT = enterable,
// not pushed (OPEN also opens SHUT things it touches); WEAK = destroyed when
// pushed (collected in `dead`, the chain passes through its cell).
function wrapCoord(v, lim) { return (v % lim + lim) % lim; }
function gather(S, m, e, dx, dy, list, dead) {
  let tx = e.x + dx, ty = e.y + dy;
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) {
    // WRAP: off the grid -> wrap to the other side (the printed margin tiles
    // outside the grid never block this); otherwise the edge blocks the move,
    // unless the mover is STRONG: a pushed thing at the border is shoved off
    // the board and destroyed
    if (propsOf(S, e).WRAP) { tx = wrapCoord(tx, W); ty = wrapCoord(ty, H); }
    else if (e !== m && propsOf(S, m).STRONG) { dead.add(e); return true; }
    else return false;
  }
  const ents = entitiesAt(S, tx, ty).filter(o => o !== e && !o.fixed && !list.includes(o) && !dead.has(o)); // printed margin tiles never interact
  const strong = !!propsOf(S, m).STRONG; // STRONG pushes even STOP / shut things
  for (const o of ents) {
    const p = propsOf(S, o);
    if (p.STOP && !strong) return false;
    if (p.SHUT && !openedInCell(S, o)) {
      if (propsOf(S, e).OPEN && !strong) continue; // an OPEN entrant stacks onto the shut thing, opening it
      if (!strong) return false;
    }
    if (stackable(S, m, o)) continue;
    if (enterableProp(p)) continue; // enterable things are entered, not pushed
    if (p.WEAK) {
      if (!gather(S, m, o, dx, dy, list, dead)) return false;
      dead.add(o);
      continue;
    }
    if (!gather(S, m, o, dx, dy, list, dead)) return false;
  }
  for (const o of ents) {
    const p = propsOf(S, o);
    if (dead.has(o) || stackable(S, m, o) || enterableProp(p) || p.WEAK) continue;
    if (p.SHUT && !openedInCell(S, o) && (propsOf(S, e).OPEN || !strong)) continue; // shut things are only pushed by STRONG (or stacked on by OPEN)
    list.push(o);
  }
  return true;
}

function canMove(S, m, dx, dy) {
  if (dx === 0 && dy === 0) return false;
  const list = [], dead = new Set();
  if (!gather(S, m, m, dx, dy, list, dead)) return false;
  // only ONE thing may be pushed per move, unless the mover is STRONG
  if (list.length + dead.size > 1 && !propsOf(S, m).STRONG) return false;
  return true;
}

function doMove(S, m, dx, dy, pull) {
  if (m.fixed) return false; // printed permanent tiles never move
  const list = [];
  const dead = new Set();
  if (!gather(S, m, m, dx, dy, list, dead)) return false;
  if (list.length + dead.size > 1 && !propsOf(S, m).STRONG) return false;
  const ox = m.x, oy = m.y;
  // apply WRAP when a moved thing leaves the grid
  const stepX = (e, v) => (v < 0 || v >= W) && propsOf(S, e).WRAP ? wrapCoord(v, W) : v;
  const stepY = (e, v) => (v < 0 || v >= H) && propsOf(S, e).WRAP ? wrapCoord(v, H) : v;
  const ev = [];
  if (S._entered) {
    ev.push({ id: m.id, fx: ox, fy: oy, tx: stepX(m, ox + dx), ty: stepY(m, oy + dy) });
    for (const o of list) ev.push({ id: o.id, fx: o.x, fy: o.y, tx: stepX(o, o.x + dx), ty: stepY(o, o.y + dy) });
  }
  for (const o of list) { o.x = stepX(o, o.x + dx); o.y = stepY(o, o.y + dy); }
  m.x = stepX(m, m.x + dx); m.y = stepY(m, m.y + dy);
  let pulled = null;
  if (pull) {
    // the "behind" cell can be a margin cell at the board edge — the permanent
    // printed tiles there only exist to form rules and are never pulled
    const behind = entitiesAt(S, ox - dx, oy - dy).filter(e => !e.fixed);
    if (behind.length > 0) {
      const p = behind[0]; // pull only one thing
      const pp = propsOf(S, p);
      const strong = !!propsOf(S, m).STRONG; // STRONG can pull things that normally can't be pulled (STOP/SHUT/SCARED)
      if (pp.WEAK) dead.add(p); // WEAK breaks when pulled
      else if ((!pp.STOP || strong) && (!pp.SCARED || strong) && (!(pp.SHUT && !openedInCell(S, p)) || strong)) {
        if (S._entered) ev.push({ id: p.id, fx: p.x, fy: p.y, tx: ox, ty: oy });
        p.x = ox; p.y = oy;
        pulled = p;
      }
    }
  }
  if (dead.size) {
    const removed = S.entities.filter(e => dead.has(e));
    S.entities = S.entities.filter(e => !dead.has(e));
    recycleTiles(S, removed);
  }
  // SHEEP: when a SHEEP thing moves, every other SHEEP thing moves the same
  // amount in the same direction, if its destination cell is free (no pushing)
  if (S._entered) {
    const movedIds = new Set([m.id, ...list.map(o => o.id)]);
    if (pulled) movedIds.add(pulled.id);
    const movers = [[m, dx, dy]].concat(list.map(o => [o, dx, dy]));
    if (pulled) movers.push([pulled, dx, dy]); // a pulled thing also moves in the mover's direction (into the vacated cell)
    for (const [e, edx, edy] of movers) {
      if (!S.entities.includes(e) || !propsOf(S, e).SHEEP) continue;
      for (const o of S.entities.slice()) {
        if (o === e || movedIds.has(o.id) || !propsOf(S, o).SHEEP) continue;
        let tx = o.x + edx, ty = o.y + edy;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) {
          if (!propsOf(S, o).WRAP) continue;
          tx = wrapCoord(tx, W); ty = wrapCoord(ty, H);
        }
        if (entitiesAt(S, tx, ty).some(x => x !== o)) continue; // occupied -> not possible
        ev.push({ id: o.id, fx: o.x, fy: o.y, tx, ty });
        o.x = tx; o.y = ty;
        movedIds.add(o.id);
      }
    }
  }
  if (S._entered) S._entered.push(...ev); // enter-events (for CURIOUS/SCARED): from -> to
  return true;
}

function placeTargets(S, p) {
  const targets = new Set();
  for (const e of S.entities) {
    if (!isYouBy(S, e, p)) continue;
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

// Destroyed word tiles go back to the supply (they can be placed again later);
// in the developer level nothing is ever consumed or returned.
function recycleTiles(S, removed) {
  if (S.dev) return;
  for (const e of removed) {
    if (e.kind === 'word' && !e.fixed && e.prop) S.supply.push({ prop: e.prop });
    else if (e.kind === 'word' && !e.fixed && e.noun) S.supply.push({ noun: e.noun });
  }
  S.supply = sortSupply(S.supply);
}

function doPlace(S, p, idx, x, y) {
  const t = S.supply[idx];
  const e = t.prop ? propTile(t.prop, p, x, y) : nounTile(t.noun, x, y);
  S.entities.push(e);
  if (!S.dev) S.supply.splice(idx, 1); // developer level: infinite tiles
  // Placing DOES scare adjacent SCARED things, but does NOT trigger CURIOUS
  // (FAQ: a freshly placed rule only triggers from the next action on)
  if (S._entered) S._entered.push({ id: e.id, fx: null, fy: null, tx: x, ty: y, placed: true });
  return e;
}

function legalMoves(S, p) {
  const res = [];
  for (const e of S.entities) {
    if (!isYouBy(S, e, p)) continue;
    for (const [dx, dy] of DIRS) if (canMove(S, e, dx, dy)) res.push([e, dx, dy]);
  }
  return res;
}

function hasLegalAction(S, p) {
  return legalMoves(S, p).length > 0 || canPlace(S, p);
}

function yourThings(S, p) {
  return S.entities.filter(e => isYouBy(S, e, p));
}

function act(S, p, fn) {
  if (S.over || S.scenarioOver) return false;
  if (S.turn !== p || S.actionsLeft <= 0) return false;
  const before = snapshot(S);
  S._entered = [];
  S._loopSteps = 0;
  S._thirstyPending = [];
  if (!fn()) { S._entered = []; return false; }
  pushHistory(S, before);
  S.actionsLeft--;
  resolve(S, p);
  if (!S.over) {
    resolveCascade(S, p); // CURIOUS/SCARED react to everything that entered this action
    resolve(S, p);        // their movement may have changed rules / created a WIN
  }
  S._entered = [];
  if (S.challenge) {
    if (!S.over) {
      S.challenge.left--;
      if (S.challenge.left <= 0) end(S, S.challenge.challenger, 'opponent failed to win within 10 actions');
      else S.actionsLeft = 1;
    }
  } else if (!S.over && S.actionsLeft <= 0) {
    // THIRSTY triggers at the end of the turn
    resolveThirsty(S, p);
    if (!S.over) { resolveCascade(S, p); resolve(S, p); }
    S._entered = [];
    S.turn = (S.turn + 1) % S.numPlayers;
    S.gameTurn++;
    S.actionsLeft = S.gameTurn === 0 ? 1 : 2;
    S.selectedId = null;
    S.placeIdx = null;
  }
  if (!S.over && !(S._thirstyPending && S._thirstyPending.length) && S.numPlayers > 0 && !hasLegalAction(S, S.turn)) {
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
    // FAST (diary #3): move as many spaces as you like in a single direction
    if (propsOf(S, sel).FAST) {
      let g = 0;
      while (g++ < 25 && canMove(S, sel, dx, dy)) doMove(S, sel, dx, dy, false); // cap: WRAP could loop forever
    }
    return true;
  });
}

// FAST with an explicit destination square: slide toward (tx,ty), stop early if blocked
function fastMoveTo(S, p, dx, dy, tx, ty) {
  ensureParsed(S);
  const yours = yourThings(S, p);
  let sel = S.entities.find(e => e.id === S.selectedId);
  if (!sel || !yours.includes(sel)) sel = yours[0];
  if (!sel || !propsOf(S, sel).FAST) return false;
  return act(S, p, () => {
    let g = 0;
    while ((sel.x !== tx || sel.y !== ty) && g++ < 20 && canMove(S, sel, dx, dy)) doMove(S, sel, dx, dy, false);
    return sel.x === tx && sel.y === ty;
  });
}

// where a thing ends up when stepping (dx,dy) — off-grid wraps if it is WRAP
function walkTarget(S, th, dx, dy) {
  let tx = th.x + dx, ty = th.y + dy;
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) {
    if (!propsOf(S, th).WRAP) return null;
    tx = wrapCoord(tx, W); ty = wrapCoord(ty, H);
  }
  return [tx, ty];
}
// Which of player p's YOU things can walk to cell (x,y) — returns [[thing, dx, dy], ...].
// Axis-aligned only; FAST things count if the cell is on their slide ray.
function moversTo(S, p, x, y) {
  const out = [];
  for (const th of yourThings(S, p)) {
    for (const [dx, dy] of DIRS) {
      let hit;
      if (propsOf(S, th).FAST) {
        // FAST: any cell on the slide ray (even several steps away / wrapped)
        hit = fastReach(S, th, dx, dy).some(([cx, cy]) => cx === x && cy === y);
      } else {
        const t = walkTarget(S, th, dx, dy);
        hit = !!(t && t[0] === x && t[1] === y && canMove(S, th, dx, dy));
      }
      if (hit) out.push([th, dx, dy]);
    }
  }
  return out;
}

// cells a FAST thing could slide to in direction (dx,dy) — computed on a clone
function fastReach(S, sel, dx, dy) {
  const S2 = { ...S, entities: S.entities.map(e => ({ ...e })), _entered: null };
  const m = S2.entities.find(e => e.id === sel.id);
  const cells = [];
  let g = 0;
  while (g++ < 20 && canMove(S2, m, dx, dy)) {
    doMove(S2, m, dx, dy, false);
    cells.push([m.x, m.y]);
  }
  return cells;
}

// CURIOUS (board game, per design diary #3): when anything ENTERS a CURIOUS
// object's row or column — i.e. arrives in a cell of that row/column from
// outside it (placing does NOT count as entering, per the FAQ) — the CURIOUS
// thing moves 1 space towards it. Merely moving along the same row/column
// does NOT trigger it. SCARED: when something moves directly next to a SCARED
// thing (edge-adjacent, not diagonal, and not merely moving within adjacency),
// it flees as far as possible in the opposite direction. Effects cascade
// (a push can make a rock move, which makes another curious thing move, ...);
// each enter-event triggers each reactive thing at most once; 100 resolution
// steps in one action = the last actor loses (see bumpLoop).
function resolveCascade(S, actor) {
  const reactedC = new Set(), reactedS = new Set(); // enter-events already consumed
  for (;;) {
    if (bumpLoop(S, actor)) return;
    ensureParsed(S);
    const evs = S._entered || [];
    let moved = false;
    const curious = S.entities.filter(e => !e.fixed && propsOf(S, e).CURIOUS);
    for (const c of curious) {
      // an enter-event triggers EACH curious object in that row/column once —
      // consumed per (curious object, event) pair, not per event globally
      let bestI = -1, bd = Infinity;
      evs.forEach((ev, i) => {
        if (ev.placed) return; // FAQ: placing does NOT trigger CURIOUS
        if (reactedC.has(c.id + ':' + i)) return;
        const e = S.entities.find(x => x.id === ev.id);
        if (!e || e === c) return;
        const inLineNew = ev.tx === c.x || ev.ty === c.y;          // target cell is in c's row/col
        const wasInLine = ev.fx !== null && (ev.fx === c.x || ev.fy === c.y); // came from outside that line
        if (!(inLineNew && !wasInLine)) return;
        const d = Math.abs(ev.tx - c.x) + Math.abs(ev.ty - c.y);
        if (d < bd) { bd = d; bestI = i; }
      });
      if (bestI < 0) continue;
      const ev = evs[bestI];
      reactedC.add(c.id + ':' + bestI);
      const t = S.entities.find(x => x.id === ev.id);
      const dx = Math.sign(t.x - c.x), dy = Math.sign(t.y - c.y);
      const dirs = Math.abs(t.x - c.x) >= Math.abs(t.y - c.y)
        ? [[dx, 0], [0, dy]]
        : [[0, dy], [dx, 0]];
      for (const [mx, my] of dirs) {
        if (mx === 0 && my === 0) continue;
        if (canMove(S, c, mx, my)) { doMove(S, c, mx, my, false); moved = true; break; }
      }
    }
    const scared = S.entities.filter(e => !e.fixed && propsOf(S, e).SCARED);
    for (const c of scared) {
      // SCARED reacts when anything ENTERS an edge-adjacent space — including
      // being placed or pushed there (placed events have fx=null -> wasAdj=false)
      const trig = [];
      evs.forEach((ev, i) => {
        if (reactedS.has(c.id + ':' + i)) return;
        const e = S.entities.find(x => x.id === ev.id);
        if (!e || e === c) return;
        const newAdj = Math.abs(ev.tx - c.x) + Math.abs(ev.ty - c.y) === 1;   // ended up directly next to it
        const wasAdj = ev.fx !== null && Math.abs(ev.fx - c.x) + Math.abs(ev.fy - c.y) === 1;
        if (newAdj && !wasAdj) trig.push([i, Math.sign(c.x - ev.tx), Math.sign(c.y - ev.ty)]);
      });
      if (!trig.length) continue;
      for (const [i] of trig) reactedS.add(c.id + ':' + i);
      const dirs = new Set(trig.map(([, fx, fy]) => fx + ',' + fy));
      if (dirs.size > 1) continue; // would have to flee in multiple directions -> paralyzed, doesn't move
      const [, fdx, fdy] = trig[0]; // flee in the opposite direction, as far as possible
      if (fdx === 0 && fdy === 0) continue;
      while (!bumpLoop(S, actor) && canMove(S, c, fdx, fdy)) { doMove(S, c, fdx, fdy, false); moved = true; }
    }
    if (!moved) return;
  }
}
function resolveCurious(S, actor) { resolveCascade(S, actor); }

// THIRSTY: at the end of a turn, a THIRSTY thing that is not on the river moves
// to the closest river cell (orthogonal steps). If several river cells are
// equally close, the player chooses the target — the UI defers via
// S._thirstyPending + pickThirsty (S._thirstyChooser returns null); the engine
// default is the first option.
// THIRSTY destinations: the nearest river cell in each of the 4 straight
// directions, keeping only the closest ones (entries [x, y, dx, dy])
function thirstyOptions(S, e) {
  const river = S.river || RIVER;
  if (!river || !river.size) return [];
  let best = Infinity;
  const opts = [];
  for (const [dx, dy] of DIRS) {
    for (let d = 1; d <= Math.max(W, H); d++) {
      const x = e.x + dx * d, y = e.y + dy * d;
      if (x < 0 || y < 0 || x >= W || y >= H) break;
      if (river.has(x + ',' + y)) {
        if (d < best) { best = d; opts.length = 0; opts.push([x, y, dx, dy]); }
        else if (d === best) opts.push([x, y, dx, dy]);
        break; // nearest river cell in this direction
      }
    }
  }
  opts.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return opts;
}
// THIRSTY moves in ONE straight direction only, pushing its way if legal
function moveToward(S, e, tx, ty, actor) {
  const dx = Math.sign(tx - e.x), dy = Math.sign(ty - e.y);
  if ((dx !== 0) === (dy !== 0)) return; // diagonal target: not a straight line, stay
  let g = 0;
  while ((e.x !== tx || e.y !== ty) && g++ < 10) {
    if (bumpLoop(S, actor)) return;
    if (!canMove(S, e, dx, dy)) return; // blocked -> stays
    doMove(S, e, dx, dy, false);
  }
}
function resolveThirsty(S, actor) {
  ensureParsed(S);
  for (const e of S.entities.slice()) {
    if (S.over) return;
    if (e.fixed || !propsOf(S, e).THIRSTY) continue;
    if (riverAt(S, e.x, e.y)) continue;
    const opts = thirstyOptions(S, e);
    if (!opts.length) continue;
    const dests = opts.map(o => [o[0], o[1]]);
    let target = dests[0];
    if (dests.length > 1 && typeof S._thirstyChooser === 'function') {
      const c = S._thirstyChooser(dests.map(d => d.slice()), e);
      if (c == null) {
        S._thirstyPending = S._thirstyPending || [];
        if (!S._thirstyPending.some(q => q.eid === e.id)) S._thirstyPending.push({ eid: e.id, options: dests, actor });
        continue;
      }
      target = c;
    }
    moveToward(S, e, target[0], target[1], actor);
  }
}
// UI hook: the player picked one of the tied closest river cells for a THIRSTY thing
function pickThirsty(S, eid, tx, ty) {
  const pend = S._thirstyPending || [];
  const i = pend.findIndex(q => q.eid === eid);
  if (i < 0) return false;
  const q = pend.splice(i, 1)[0];
  const e = S.entities.find(x => x.id === eid);
  if (!e) return false;
  S._loopSteps = 0;
  if (!S._entered) S._entered = [];
  moveToward(S, e, tx, ty, q.actor);
  if (!S.over) { resolveCascade(S, q.actor); resolve(S, q.actor); resolveThirsty(S, q.actor); }
  if (!S.over) { resolveCascade(S, q.actor); resolve(S, q.actor); }
  S._entered = [];
  if (!S.over && !(S._thirstyPending && S._thirstyPending.length) && S.numPlayers > 0 && !hasLegalAction(S, S.turn)) {
    const ch = charAtRank(S, S.turn);
    end(S, (S.turn + 1) % S.numPlayers, `${ch.emoji} ${ch.name} cannot take an action`);
  }
  return true;
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
  log(S, `⚔ ${charAtRank(S, p).emoji} ${charAtRank(S, p).name} starts sudden death — ${charAtRank(S, opp).emoji} ${charAtRank(S, opp).name} gets 10 actions to win`);
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
  log(S, `🕐 PLAYER ${p + 1} spends their clock — this scenario is best 2 of 3`);
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    W, H, NOUNS, EMOJI, createGame, newScenario, parseRules, ensureParsed, ruleList,
    propsOf, isYou, isWin, youOwner, youOwners, isYouBy, entitiesAt, canMove, doMove, placeTargets, canPlace,
    doPlace, legalMoves, hasLegalAction, yourThings, act, moveSelected, place, challenge,
    spendClock, resolve, undo, snapshot, setEnabled, activeChars, charAtRank, isRiverCell,
    resolveCurious, resolveCascade, resolveThirsty, pickThirsty, thirstyOptions, setThirstyChooser, bumpLoop,
    fastMoveTo, fastReach, moversTo, walkTarget, wrapCoord, syncFixedTiles, resolveDestructive,
    riverAt, openedInCell,
    RIVER, HOME_CORNERS, CHARACTERS, DEFAULT_ENABLED, ALT_DEFAULT_ENABLED, MODIFIERS, parseLevel, supplyFor, ALL_PROPS, SPRITE_IMG, typesOf,
    NOUNS, PLAYER_NOUNS, PLAYER_EMOJI, PLAYER_COLORS, PLAYER_NAMES,
  };
}

if (typeof document !== 'undefined') initUI();

function initUI() {
  setThirstyChooser(() => null); // THIRSTY ties defer to a tap on a highlighted water cell
  let levelId = 'base'; // no level cards by default; 'dev' = developer (all tiles, infinite)
  let S = createGame(undefined, undefined, levelId);
  let pullOn = false;
  const board = document.getElementById('board');
  const EXT = 7; // 5x5 board + 1-cell margin ring with the permanent printed tiles
  board.style.gridTemplateColumns = `repeat(${EXT}, var(--cell))`;
  const cells = [];
  for (let ry = 0; ry < EXT; ry++) {
    for (let rx = 0; rx < EXT; rx++) {
      const d = document.createElement('div');
      d.className = 'cell' + (rx === 0 || ry === 0 || rx === EXT - 1 || ry === EXT - 1 ? ' margin' : '');
      d.dataset.rx = rx; d.dataset.ry = ry;
      d.addEventListener('click', () => onCellClick(rx, ry));
      board.appendChild(d);
      cells.push(d);
    }
  }

  function spriteImg(type) {
    return '<img class="spr" src="' + (SPRITE_IMG[type] || SPRITE_IMG.ROCK) + '" alt="' + type + '">';
  }

  function activeSelectable() {
    return yourThings(S, S.turn);
  }

  function selected() {
    const yours = activeSelectable();
    let sel = S.entities.find(e => e.id === S.selectedId);
    // with multiple YOUs there is no implicit choice — the PLAYER must tap one (or Tab)
    if (!sel || !yours.includes(sel)) sel = yours.length === 1 ? yours[0] : null;
    if (sel) S.selectedId = sel.id;
    return sel;
  }

  function onCellClick(rx, ry) {
    if (S.over || S.scenarioOver) return;
    const x = rx - 1, y = ry - 1;
    if (x < 0 || y < 0 || x >= W || y >= H) return; // margin ring is not clickable
    if (S._thirstyPending && S._thirstyPending.length) { // THIRSTY tie: tap one of the highlighted water cells
      const q = S._thirstyPending[0];
      if (q.options.some(([ox, oy]) => ox === x && oy === y)) pickThirsty(S, q.eid, x, y);
      render();
      return;
    }
    if (S.fastDir) { // FAST: a tapped square is the destination (armed dir, else the tapped dir)
      const sel = selected();
      if (sel) {
        const tdx = Math.sign(x - sel.x), tdy = Math.sign(y - sel.y);
        const ok = fastMoveTo(S, S.turn, S.fastDir.dx, S.fastDir.dy, x, y)
          || ((tdx !== 0) !== (tdy !== 0) && fastMoveTo(S, S.turn, tdx, tdy, x, y));
        if (ok) S.fastDir = null;
      }
      render();
      return;
    }
    if (S.placeIdx !== null) {
      if (place(S, S.turn, S.placeIdx, x, y)) S.placeIdx = null;
      render();
      return;
    }
    const yours = activeSelectable();
    const explicit = yours.find(e => e.id === S.selectedId);
    // a thing is already selected: tapping a cell it can walk to (even one holding
    // another of your YOUs — it gets pushed) walks there instead of selecting
    if (explicit) {
      const mv = moversTo(S, S.turn, x, y).find(([th]) => th === explicit);
      if (mv) {
        const [th, dx, dy] = mv;
        if (propsOf(S, th).FAST) fastMoveTo(S, S.turn, dx, dy, x, y);
        else moveSelected(S, S.turn, dx, dy, pullOn);
        render();
        return;
      }
    }
    // otherwise tapping one of your things selects it
    const mine = entitiesAt(S, x, y).find(e => yours.includes(e));
    if (mine) { S.selectedId = mine.id; render(); return; }
    // tap a highlighted cell to walk there; if several of your things could go
    // there, that is ambiguous -> choose the thing first
    const movers = moversTo(S, S.turn, x, y);
    if (movers.length === 1) {
      const [th, dx, dy] = movers[0];
      S.selectedId = th.id;
      if (propsOf(S, th).FAST) fastMoveTo(S, S.turn, dx, dy, x, y);
      else moveSelected(S, S.turn, dx, dy, pullOn);
      render();
      return;
    }
    if (movers.length > 1) {
      log(S, 'several of your things can walk there — tap the one to move first (or Tab)');
      render();
    }
  }

  // which YOUR thing moves in direction (dx,dy): the explicit selection if set,
  // else the unique thing that can move that way — no ambiguity, no choosing needed
  function pickMover(dx, dy) {
    const yours = activeSelectable();
    if (!yours.length) return null;
    const cur = S.entities.find(e => e.id === S.selectedId);
    if (cur && yours.includes(cur)) return cur;
    if (yours.length === 1) return yours[0];
    const movers = yours.filter(y => canMove(S, y, dx, dy));
    if (movers.length === 1) return movers[0];
    return movers.length === 0 ? null : 'ambiguous';
  }

  function tryMove(dx, dy) {
    if (S.over || S.scenarioOver) return;
    if (S._thirstyPending && S._thirstyPending.length) return; // THIRSTY choice first
    const sel = pickMover(dx, dy);
    if (sel === 'ambiguous') {
      log(S, 'multiple things are YOU — tap one of your highlighted things (or Tab) to choose which to move first');
      render();
      return;
    }
    if (!sel) return;
    S.selectedId = sel.id;
    if (propsOf(S, sel).FAST) { // FAST: ask for a direction, then a destination square
      S.fastDir = { dx, dy };
      log(S, `FAST: ${CHARACTERS.find(c => c.noun === sel.type).name} — now tap a highlighted square to slide there (Esc cancels)`);
      render();
      return;
    }
    moveSelected(S, S.turn, dx, dy, pullOn);
    render();
  }

  function render() {
    for (let i = 0; i < cells.length; i++) {
      cells[i].innerHTML = '';
      cells[i].className = 'cell' + (i % EXT === 0 || i / EXT < 1 || i % EXT === EXT - 1 || i / EXT >= EXT - 1 ? ' margin' : '');
    }
    const sel = selected();
    // border the current player's YOU things on the board (thicker on the selected
    // one) — also shows which things can be picked when there are multiple YOUs
    const turnYous = (!S.over && !S.scenarioOver && S.numPlayers > 0) ? yourThings(S, S.turn) : [];
    const turnChar = S.numPlayers > 0 ? charAtRank(S, S.turn) : null;
    let targets = new Set();  // walk targets (green outline)
    let ptargets = new Set(); // place targets (gold outline)
    // a cell containing one of your own YOU things is never a walk target —
    // tapping it selects that thing instead (unambiguous controls)
    const ownYouCell = (x, y) => entitiesAt(S, x, y).some(e => turnYous.includes(e));
    if (S.placeIdx !== null) ptargets = placeTargets(S, S.turn);
    else {
      const walkCells = (th) => {
        const cells = [];
        if (propsOf(S, th).FAST) {
          // FAST: every square it can slide to, in all 4 directions
          for (const [dx, dy] of DIRS) for (const [cx, cy] of fastReach(S, th, dx, dy)) cells.push([cx, cy]);
        } else {
          for (const [dx, dy] of DIRS) {
            const t = walkTarget(S, th, dx, dy);
            if (t && canMove(S, th, dx, dy)) cells.push(t);
          }
        }
        return cells;
      };
      const explicit = turnYous.find(e => e.id === S.selectedId);
      if (explicit) {
        // a thing is chosen: show all its walk tiles (no ambiguity anymore) —
        // including cells holding another of your YOUs it can walk onto (push)
        for (const [cx, cy] of walkCells(explicit)) targets.add(cx + ',' + cy);
      } else {
        // no thing chosen: if ANY square is reachable by 2+ of your things, show NO
        // walk tiles at all — choose the thing first; otherwise show all walkable ones
        let contested = false;
        const walkable = [];
        for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
          if (ownYouCell(cx, cy)) continue;
          const n = moversTo(S, S.turn, cx, cy).length;
          if (n > 1) contested = true;
          if (n >= 1) walkable.push(cx + ',' + cy);
        }
        if (!contested) for (const k of walkable) targets.add(k);
      }
    }
    if (S._thirstyPending && S._thirstyPending.length) for (const [ox, oy] of S._thirstyPending[0].options) targets.add(ox + ',' + oy);
    const byCell = new Map();
    for (const e of S.entities) {
      const k = (e.x + 1) + ',' + (e.y + 1);
      if (!byCell.has(k)) byCell.set(k, []);
      byCell.get(k).push(e);
    }
    for (let ry = 0; ry < EXT; ry++) {
      for (let rx = 0; rx < EXT; rx++) {
        const cell = cells[ry * EXT + rx];
        const x = rx - 1, y = ry - 1;
        if (x >= 0 && y >= 0 && x < W && y < H && riverAt(S, x, y)) cell.classList.add('water');
        if (x >= 0 && y >= 0 && x < W && y < H && ptargets.has(x + ',' + y)) cell.classList.add('ptarget');
        if (x >= 0 && y >= 0 && x < W && y < H && targets.has(x + ',' + y)) cell.classList.add('target');
        const ents = byCell.get(rx + ',' + ry) || [];
        if (ents.length > 1) cell.classList.add('stack');
        for (const e of ents) {
          const sp = document.createElement('span');
          if (e.kind === 'object') {
            sp.className = 'ent obj obj-' + e.type;
            const ch = CHARACTERS.find(c => c.noun === e.type);
            if (ch) { sp.style.background = ch.color + '44'; sp.style.borderRadius = '50%'; }
            sp.innerHTML = spriteImg(e.type);
          } else if (e.prop) {
            sp.className = 'ent word prop-' + e.prop.toLowerCase() + (e.fixed ? ' fixed' : '') + (e.perm ? ' perm' : '');
            sp.textContent = e.label;
          } else {
            sp.className = 'ent word noun' + (e.fixed ? ' fixed' : '') + (e.perm ? ' perm' : '');
            sp.textContent = e.noun;
          }
          if (turnYous.includes(e)) {
            sp.classList.add('sel');
            if (turnChar) sp.style.setProperty('--selc', turnChar.color);
            if (sel && e.id === sel.id) sp.classList.add('cur');
          }
          cell.appendChild(sp);
        }
      }
    }

    const turnEl = document.getElementById('turn');
    turnEl.style.background = S.challenge ? '#8b1e2d' : ''; // sudden death: status goes red
    turnEl.style.color = S.challenge ? '#fff' : '';
    const cur = S.numPlayers > 0 ? charAtRank(S, S.turn) : null;
    if (S.over) {
      const w = S.over.winner;
      const wch = w === null ? null : charAtRank(S, w);
      turnEl.innerHTML = w === null
        ? `🤝 DRAW — ${S.over.reason}`
        : `<span style="color:${wch.color}">${spriteImg(wch.noun)} ${wch.name} (PLAYER ${w + 1}) WINS</span> — ${S.over.reason}`;
    } else if (S.challenge) {
      const opp = (S.challenge.challenger + 1) % S.numPlayers;
      const och = charAtRank(S, opp);
      turnEl.innerHTML = `⚔ Sudden death: <span style="color:${och.color}">${spriteImg(och.noun)} ${och.name} (PLAYER ${opp + 1})</span> must win in <b>${S.challenge.left}</b> actions`;
    } else if (!cur) {
      turnEl.textContent = 'no players enabled — toggle someone on above';
    } else {
      turnEl.innerHTML = `<span style="color:${cur.color}">${spriteImg(cur.noun)} ${cur.name} (PLAYER ${S.turn + 1})</span> — actions: ${'●'.repeat(S.actionsLeft)}${'○'.repeat(Math.max(0, (S.gameTurn === 0 ? 1 : 2) - S.actionsLeft))}`;
      if (S._thirstyPending && S._thirstyPending.length) turnEl.innerHTML += ' — <b>THIRSTY</b>: tap a highlighted water cell';
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
    document.querySelectorAll('#players button').forEach((b, i) => {
      b.classList.toggle('on', !!S.enabled[i]);
    });
    // modifier dropdowns reflect the current game's levelId
    const pl = parseLevel(S.level || 'base');
    document.getElementById('devmode').checked = !!pl.dev;
    document.getElementById('mod1').value = pl.mods[0] || 'none';
    document.getElementById('mod2').value = pl.mods[1] || 'none';

    const ov = document.getElementById('overlay');
    if (S.over || S.scenarioOver) {
      ov.classList.remove('hidden');
      let html = '';
      if (S.over) {
        const w = S.over.winner;
        const wch = w === null ? null : charAtRank(S, w);
        html += w === null
          ? `<div class="big">🤝 DRAW</div><div class="sub">${S.over.reason}</div>`
          : `<div class="big" style="color:${wch.color}">${spriteImg(wch.noun)} ${wch.name} (PLAYER ${w + 1}) wins the game!</div><div class="sub">${S.over.reason}</div>`;
        html += `<div class="sub">(N) new game</div>`;
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
  // supply tile hotkeys: 1-9, 0, then q e t y u i o
  const TILEKEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0',
    'KeyQ', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyN') { // N = new game (rotates the starting player)
      S = S.scenarioOver ? newScenario(S.scenario, S.enabled, levelId) : createGame(S.enabled, S.scenario, levelId);
      render();
      return;
    }
    if (e.code === 'KeyR') {
      S = newScenario(S.scenario, S.enabled, levelId);
      render();
      return;
    }
    if (e.code === 'KeyZ') {
      undo(S);
      render();
      return;
    }
    if (S.over || S.scenarioOver) return;
    if (S._thirstyPending && S._thirstyPending.length) return; // THIRSTY choice first (tap a highlighted water cell)
    if (e.code === 'Tab') {
      const list = activeSelectable();
      if (list.length) {
        const i = list.findIndex(x => x.id === S.selectedId);
        S.selectedId = list[(i + 1) % list.length].id;
        render();
      }
      return;
    }
    if (e.code === 'Escape') { S.placeIdx = null; S.fastDir = null; render(); return; }
    const ti = TILEKEYS.indexOf(e.code);
    if (ti >= 0) {
      if (ti < S.supply.length) { S.placeIdx = S.placeIdx === ti ? null : ti; render(); }
      return;
    }
    const m = KEYMAP[e.code];
    if (!m) return;
    if (S.fastDir) { S.fastDir = { dx: m[0], dy: m[1] }; render(); return; } // re-aim the FAST ray
    tryMove(m[0], m[1]);
  });

  document.querySelectorAll('#dpad button').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (S.fastDir) { S.fastDir = { dx: Number(b.dataset.dx), dy: Number(b.dataset.dy) }; render(); return; }
      tryMove(Number(b.dataset.dx), Number(b.dataset.dy));
    });
  });
  document.getElementById('btn-pull').addEventListener('click', () => {
    pullOn = !pullOn;
    document.getElementById('btn-pull').textContent = 'PULL: ' + (pullOn ? 'ON' : 'off');
    document.getElementById('btn-pull').classList.toggle('on', pullOn);
  });
  document.getElementById('btn-undo').addEventListener('click', () => { undo(S); render(); });

  document.getElementById('btn-challenge').addEventListener('click', () => { challenge(S, S.turn); render(); });
  document.getElementById('btn-newgame').addEventListener('click', () => {
    S = S.scenarioOver ? newScenario(S.scenario, S.enabled, levelId) : createGame(S.enabled, S.scenario, levelId);
    render();
  });
  // two level-card ("modifier") dropdowns — pick none, one, or two DIFFERENT cards
  const mod1 = document.getElementById('mod1'), mod2 = document.getElementById('mod2'), devChk = document.getElementById('devmode');
  for (const sel of [mod1, mod2]) {
    const none = document.createElement('option');
    none.value = 'none'; none.textContent = '— none —';
    sel.appendChild(none);
    MODIFIERS.forEach(m => {
      const o = document.createElement('option');
      o.value = m.id; o.textContent = m.name;
      sel.appendChild(o);
    });
  }
  function currentLevelId() {
    const mods = [mod1.value, mod2.value].filter(v => v && v !== 'none');
    const s = (devChk.checked ? 'd' : '') + (mods.length ? 'm:' + mods.join(',') : '');
    return s || 'base';
  }
  function rebuild() {
    levelId = currentLevelId();
    S = createGame(S.enabled, S.scenario, levelId); // changing modifiers starts a new game with those cards
    render();
  }
  mod1.addEventListener('change', () => { if (mod1.value !== 'none' && mod2.value === mod1.value) mod2.value = 'none'; rebuild(); });
  mod2.addEventListener('change', () => { if (mod2.value !== 'none' && mod1.value === mod2.value) mod1.value = 'none'; rebuild(); });
  devChk.addEventListener('change', rebuild); // dev mode composes with up to two modifier cards (e.g. RIVER IS HOT)
  // character select is hidden unless "alternate characters (dev)" is checked.
  // Default: only BABA + KEKE. With the checkbox: SAMI + AAS are the defaults and
  // ALL characters have toggles, so any of them can be deselected/replaced.
  const pwrap = document.getElementById('players');
  const altChk = document.getElementById('altchars');
  CHARACTERS.forEach((c, i) => {
    const b = document.createElement('button');
    b.insertAdjacentHTML('afterbegin', spriteImg(c.noun));
    b.appendChild(document.createTextNode(' ' + c.name));
    b.title = 'toggle PLAYER (active players become PLAYER 1, PLAYER 2, … in this order)';
    b.addEventListener('click', () => { setEnabled(S, i, !S.enabled[i]); render(); });
    pwrap.appendChild(b);
  });
  altChk.addEventListener('change', () => {
    pwrap.hidden = !altChk.checked;
    S = createGame((altChk.checked ? ALT_DEFAULT_ENABLED : DEFAULT_ENABLED).slice(), S.scenario, levelId);
    render();
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
    if (S._thirstyPending && S._thirstyPending.length) return; // THIRSTY choice first
    const dirx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
    const diry = dirx === 0 ? Math.sign(dy) : 0;
    const sel = pickMover(dirx, diry);
    if (sel === 'ambiguous') {
      log(S, 'multiple things are YOU — tap one of your highlighted things (or Tab) to choose which to move first');
      render();
      return;
    }
    if (!sel) { render(); return; }
    S.selectedId = sel.id;
    if (propsOf(S, sel).FAST) return; // swiping is ignored for FAST — direction key + tap a square instead
    moveSelected(S, S.turn, dirx, diry, pullOn);
    render();
  }, { passive: false });

  render();
}
