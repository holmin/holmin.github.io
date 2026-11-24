'use strict';

const W = 5, H = 5, CELL = 64;
const NOUNS = ['BABA', 'KEKE', 'ROCK', 'FLAG', 'ME', 'FOFO'];
const EMOJI = { BABA: '🐰', KEKE: '🐶', ROCK: '🪨', FLAG: '🚩', ME: '🐱', FOFO: '🐑' };
const PLAYER_NOUNS = ['BABA', 'KEKE', 'ME', 'FOFO'];
const PLAYER_NAMES = PLAYER_NOUNS;
const PLAYER_EMOJI = ['🐰', '🐶', '🐱', '🐑'];
const PLAYER_COLORS = ['#ff6b9d', '#4dabf7', '#b388ff', '#ffd166'];
// River terrain of the WORLD 1: THE PLAINS board (matrix notation (row,col), 1-indexed:
// (1,1),(2,1),(2,2),(2,3),(3,3),(4,3),(4,4),(4,5),(5,5)). Terrain only for now —
// future rules (e.g. MELT) will interact with it.
const RIVER = new Set(['0,0', '0,1', '1,1', '1,2', '2,2', '2,3', '3,3', '4,3', '4,4']);
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

function createGame(numPlayers, scenario) {
  numPlayers = Math.min(4, Math.max(2, numPlayers || 2));
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
    obj('BABA', 0, H - 1), obj('KEKE', W - 1, 0),
    obj('ROCK', 0, 0), obj('ROCK', W - 1, H - 1),
    obj('FLAG', 2, 2),
  ];
  // extra players spawn in the remaining corners; occupants there move to the nearest free cell
  const corners = [[0, 0], [W - 1, H - 1]];
  for (let p = 2; p < numPlayers; p++) {
    const [cx, cy] = corners[p - 2];
    const occ = entities.find(e => e.x === cx && e.y === cy);
    if (occ) { const [fx, fy] = firstFreeCell(entities, cx, cy); occ.x = fx; occ.y = fy; }
    entities.push(obj(PLAYER_NOUNS[p], cx, cy));
  }
  const supply = [
    { prop: 'WIN' }, { prop: 'WIN' },
    { noun: 'ROCK' }, { noun: 'FLAG' },
    { noun: 'ROCK' }, { noun: 'FLAG' },
  ];
  const S = {
    entities, supply, numPlayers,
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

function newScenario(prev, numPlayers) {
  numPlayers = numPlayers || (prev && prev.numPlayers) || 2;
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
  return createGame(numPlayers, sc);
}

function parseRules(S) {
  const n = S.numPlayers || 2;
  const rules = [{ noun: 'ALL', prop: 'PUSH', owner: null, permanent: true }];
  for (let i = 0; i < n; i++) rules.push({ noun: PLAYER_NOUNS[i], prop: 'YOU', owner: i, permanent: true });
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
  return S.rules.map((r) => {
    const prop = r.prop === 'YOU' && r.owner !== null && r.owner !== undefined ? 'P' + (r.owner + 1) : r.prop;
    return r.noun + ' IS ' + prop + (r.permanent ? ' (default)' : '');
  }).sort();
}

const typeOf = (e) => (e.kind === 'object' ? e.type : e.noun);
function propsOf(S, e) { return S._propMap[typeOf(e)] || {}; }
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
    scenarioOver: S.scenarioOver, scenario: S.scenario, numPlayers: S.numPlayers,
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
  log(S, winner === null ? '🤝 ' + reason : `${PLAYER_EMOJI[winner]} P${winner + 1} ${reason}`);
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
  if (pull) {
    const behind = entitiesAt(S, ox - dx, oy - dy);
    if (behind.length > 0) { behind[0].x = ox; behind[0].y = oy; } // pull only one thing
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
  if (!fn()) return false;
  pushHistory(S, before);
  S.actionsLeft--;
  resolve(S, p);
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
  if (!S.over && !hasLegalAction(S, S.turn)) {
    end(S, (S.turn + 1) % S.numPlayers, `${PLAYER_EMOJI[S.turn]} ${PLAYER_NAMES[S.turn]} cannot take an action`);
  }
  return true;
}

function moveSelected(S, p, dx, dy, pull) {
  const yours = yourThings(S, p);
  let sel = S.entities.find(e => e.id === S.selectedId);
  if (!sel || !yours.includes(sel)) sel = yours[0];
  if (!sel) return false;
  return act(S, p, () => {
    if (!canMove(S, sel, dx, dy)) return false;
    doMove(S, sel, dx, dy, pull);
    return true;
  });
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
  if (S.over || S.challenge) return false;
  if (S.turn !== p) return false;
  const full = S.gameTurn === 0 ? 1 : 2;
  if (S.actionsLeft !== full) return false;
  pushHistory(S, snapshot(S));
  S.challenge = { challenger: p, left: 10 };
  S.turn = (p + 1) % S.numPlayers;
  S.actionsLeft = 2;
  S.placeIdx = null;
  const opp = S.turn;
  log(S, `⚔ ${PLAYER_NAMES[p]} challenges — ${PLAYER_NAMES[opp]} gets 10 actions to win`);
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
    spendClock, resolve, undo, snapshot, RIVER, PLAYER_NOUNS, PLAYER_EMOJI, PLAYER_COLORS, PLAYER_NAMES,
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
    if (S.over) {
      const w = S.over.winner;
      turnEl.innerHTML = w === null
        ? `🤝 DRAW — ${S.over.reason}`
        : `<span style="color:${PLAYER_COLORS[w]}">${PLAYER_EMOJI[w]} ${PLAYER_NAMES[w]} (P${w + 1}) WINS</span> — ${S.over.reason}`;
    } else if (S.challenge) {
      const opp = (S.challenge.challenger + 1) % S.numPlayers;
      turnEl.innerHTML = `⚔ Challenge: <span style="color:${PLAYER_COLORS[opp]}">${PLAYER_EMOJI[opp]} ${PLAYER_NAMES[opp]} (P${opp + 1})</span> must win in <b>${S.challenge.left}</b> actions`;
    } else {
      turnEl.innerHTML = `<span style="color:${PLAYER_COLORS[S.turn]}">${PLAYER_EMOJI[S.turn]} ${PLAYER_NAMES[S.turn]} (P${S.turn + 1})</span> — actions: ${'●'.repeat(S.actionsLeft)}${'○'.repeat(Math.max(0, (S.gameTurn === 0 ? 1 : 2) - S.actionsLeft))}`;
    }

    const sc = S.scenario;
    document.getElementById('score').textContent =
      `Scenario ${sc.score.join('–')} ${sc.bo3 ? '(best of 3)' : ''} · games ${sc.wins.join('–')} · world pts ${sc.worldPoints.join('–')}`;

    const ul = document.getElementById('rules');
    ul.innerHTML = '';
    for (const r of ruleList(S)) {
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
    document.querySelectorAll('#players button').forEach((b) => {
      b.classList.toggle('on', Number(b.dataset.n) === S.numPlayers);
    });

    const ov = document.getElementById('overlay');
    if (S.over || S.scenarioOver) {
      ov.classList.remove('hidden');
      let html = '';
      if (S.over) {
        const w = S.over.winner;
        html += w === null
          ? `<div class="big">🤝 DRAW</div><div class="sub">${S.over.reason}</div>`
          : `<div class="big" style="color:${PLAYER_COLORS[w]}">${PLAYER_EMOJI[w]} ${PLAYER_NAMES[w]} wins the game!</div><div class="sub">${S.over.reason}</div>`;
        html += `<div class="sub">R = next game${S.scenarioOver ? '' : ' · N = new scenario'}</div>`;
      }
      if (S.scenarioOver) {
        const w = sc.score[0] === sc.score[1] ? null : (sc.score[0] > sc.score[1] ? 0 : 1);
        html += `<div class="big" style="color:${w === null ? '#fff' : PLAYER_COLORS[w]}">🏆 Scenario to ${w === null ? 'tie' : PLAYER_NAMES[w] + ' (P' + (w + 1) + ')'}</div>`;
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
      S = S.scenarioOver ? newScenario(S.scenario, S.numPlayers) : createGame(S.numPlayers, S.scenario);
      render();
      return;
    }
    if (e.code === 'KeyN') {
      S = newScenario(S.scenario, S.numPlayers);
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
    S = S.scenarioOver ? newScenario(S.scenario, S.numPlayers) : createGame(S.numPlayers, S.scenario);
    render();
  });
  document.getElementById('btn-newscenario').addEventListener('click', () => { S = newScenario(S.scenario, S.numPlayers); render(); });
  document.querySelectorAll('#players button').forEach((b) => {
    b.addEventListener('click', () => { S = createGame(Number(b.dataset.n), S.scenario); render(); });
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
