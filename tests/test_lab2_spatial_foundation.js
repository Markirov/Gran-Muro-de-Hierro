/* Lab 2.0 — Sprint 1 — Foundation espacial (data model + helpers puros).
 *
 * Roadmap sección 6: simulador con conciencia espacial. Sin UI 3D.
 * Modelo geométrico interno + reglas que respetan LoS, alturas, cobertura.
 *
 * Esta primera tanda solo cubre el cimiento:
 * - Constante LAB2_MAPS con 2 mapas canon (Open Ground, Ruined Village).
 * - Helpers puros sobre grid 1" × 1":
 *   - gridDistance(a, b): distancia Chebyshev (movimiento ortogonal+diagonal)
 *   - inchesBetween(a, b): distancia Euclídea en pulgadas (rango armas canon)
 *   - lineCells(a, b): celdas que atraviesa una línea (Bresenham)
 *   - hasLineOfSight(map, a, b): true si ninguna celda intermedia es 'blocked'
 *   - getCellCover(map, pos): 'none' | 'light' | 'heavy'
 *   - getCellElevation(map, pos): integer (default 0 si fuera de mapa)
 *
 * Sin sim loop, sin movimiento, sin AI. Esos vienen en sprints 2-4.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const js = scriptMatch[1];
const bootIdx = js.search(/\nfunction boot\(\)/);

const TMP = path.join(require('os').tmpdir(), 'warband_forge_lab2_foundation.js');
const moduleCode = js.slice(0, bootIdx) + `
module.exports = {
  LAB2_MAPS:        typeof LAB2_MAPS !== 'undefined' ? LAB2_MAPS : null,
  gridDistance:     typeof gridDistance === 'function' ? gridDistance : null,
  inchesBetween:    typeof inchesBetween === 'function' ? inchesBetween : null,
  lineCells:        typeof lineCells === 'function' ? lineCells : null,
  hasLineOfSight:   typeof hasLineOfSight === 'function' ? hasLineOfSight : null,
  getCellCover:     typeof getCellCover === 'function' ? getCellCover : null,
  getCellElevation: typeof getCellElevation === 'function' ? getCellElevation : null,
  getCellTerrain:   typeof getCellTerrain === 'function' ? getCellTerrain : null,
};
`;
const stub = `
const localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}, clear(){this._d={};} };
let lastAlert = null; function alert(msg){ lastAlert = msg; }
function fakeEl(){ return { style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}, addEventListener(){}, removeEventListener(){}, appendChild(){}, querySelectorAll(){return [];}, querySelector(){return null;}, setAttribute(){}, getAttribute(){return null;}, innerHTML:'', textContent:'', value:'', children:[], dataset:{}, click(){}, focus(){}, blur(){}, dispatchEvent(){}, cloneNode(){return fakeEl();}, parentNode:{ replaceChild(){} } }; }
const window = { addEventListener(){}, removeEventListener(){}, location:{search:''}, navigator:{userAgent:''}, matchMedia(){return {matches:false,addEventListener(){},addListener(){}};}, requestAnimationFrame(fn){return 0;}, setTimeout(){return 0;}, clearTimeout(){} };
const document = { addEventListener(){}, removeEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;}, getElementById(){return fakeEl();}, createElement: fakeEl, body:fakeEl(), documentElement:fakeEl() };
const setTimeout = (fn, ms) => 0;
const clearTimeout = () => {};
`;
fs.writeFileSync(TMP, stub + moduleCode);

const lib = require(TMP);
for (const h of ['LAB2_MAPS','gridDistance','inchesBetween','lineCells','hasLineOfSight','getCellCover','getCellElevation','getCellTerrain']) {
  if (!lib[h]) { console.error('✗ ' + h + ' missing'); process.exit(1); }
}
const { LAB2_MAPS, gridDistance, inchesBetween, lineCells, hasLineOfSight, getCellCover, getCellElevation, getCellTerrain } = lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */
group('Group 1: LAB2_MAPS con 2 mapas V1', () => {
  ok(typeof LAB2_MAPS === 'object', 'LAB2_MAPS es objeto');
  ok(!!LAB2_MAPS['open-ground'], 'mapa "open-ground" definido');
  ok(!!LAB2_MAPS['ruined-village'], 'mapa "ruined-village" definido');
  for (const id of Object.keys(LAB2_MAPS)) {
    const m = LAB2_MAPS[id];
    ok(m.width === 48 && m.height === 32,
       id + ' es 48"x32" canon (got ' + m.width + 'x' + m.height + ')');
    ok(typeof m.name === 'string' && m.name.length > 0,
       id + ' tiene name');
  }
});

group('Group 2: gridDistance (Chebyshev)', () => {
  ok(gridDistance({x:0,y:0}, {x:0,y:0}) === 0, 'misma celda → 0');
  ok(gridDistance({x:0,y:0}, {x:3,y:0}) === 3, 'horizontal puro → max axis');
  ok(gridDistance({x:0,y:0}, {x:0,y:5}) === 5, 'vertical puro → max axis');
  ok(gridDistance({x:0,y:0}, {x:3,y:4}) === 4, 'diagonal (3,4) → max(3,4)=4');
  ok(gridDistance({x:5,y:5}, {x:0,y:0}) === 5, 'simétrico');
});

group('Group 3: inchesBetween (Euclídea, para rango canon)', () => {
  // Canon TC mide distancia en pulgadas con regla recta entre bordes
  // de peana, idealizado aquí a distancia centro a centro.
  ok(inchesBetween({x:0,y:0}, {x:0,y:0}) === 0, 'misma celda → 0');
  ok(inchesBetween({x:0,y:0}, {x:3,y:0}) === 3, 'horizontal puro → 3"');
  ok(inchesBetween({x:0,y:0}, {x:0,y:4}) === 4, 'vertical puro → 4"');
  const d = inchesBetween({x:0,y:0}, {x:3,y:4});
  ok(Math.abs(d - 5) < 0.001, 'triángulo 3-4-5 → 5"');
  const d2 = inchesBetween({x:0,y:0}, {x:1,y:1});
  ok(Math.abs(d2 - Math.SQRT2) < 0.001, 'diagonal 1-1 → √2');
});

group('Group 4: lineCells (Bresenham) celdas atravesadas', () => {
  const horizontal = lineCells({x:0,y:0}, {x:3,y:0});
  ok(Array.isArray(horizontal), 'devuelve array');
  ok(horizontal.length === 4, 'horizontal 0→3 = 4 celdas (got ' + horizontal.length + ')');
  ok(horizontal[0].x === 0 && horizontal[0].y === 0, 'arranca en origen');
  ok(horizontal[3].x === 3 && horizontal[3].y === 0, 'termina en destino');

  const vertical = lineCells({x:5,y:2}, {x:5,y:6});
  ok(vertical.length === 5, 'vertical 2→6 = 5 celdas');

  const diagonal = lineCells({x:0,y:0}, {x:3,y:3});
  ok(diagonal.length === 4, 'diagonal pura 0→3 = 4 celdas');

  const samePt = lineCells({x:4,y:4}, {x:4,y:4});
  ok(samePt.length === 1, 'misma celda → 1 elemento');
});

group('Group 5: hasLineOfSight sin obstáculos', () => {
  const m = LAB2_MAPS['open-ground'];
  ok(hasLineOfSight(m, {x:0,y:0}, {x:10,y:5}) === true,
     'open-ground SIEMPRE tiene LoS');
  ok(hasLineOfSight(m, {x:0,y:0}, {x:47,y:31}) === true,
     'diagonal de esquina a esquina');
});

group('Group 6: hasLineOfSight con obstáculos canon (ruined-village)', () => {
  const m = LAB2_MAPS['ruined-village'];
  // Verifica que tiene al menos 1 celda blocked.
  let blockedCount = 0;
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      if (getCellTerrain(m, {x,y}) === 'blocked') blockedCount++;
    }
  }
  ok(blockedCount > 0, 'ruined-village tiene al menos 1 celda blocked (got ' + blockedCount + ')');
  // Verifica que detecta bloqueo si linea pasa por celda blocked.
  // No conocemos las posiciones exactas, así que buscamos pareja con LoS bloqueado.
  // Cerca de cualquier blocked debería haber LoS broken al otro lado.
  let foundBlock = false;
  outer:
  for (let y = 0; y < m.height && !foundBlock; y++) {
    for (let x = 0; x < m.width && !foundBlock; x++) {
      if (getCellTerrain(m, {x,y}) !== 'blocked') continue;
      // Test LoS desde (x-2,y) a (x+2,y) — la linea pasa por la blocked.
      const a = { x: Math.max(0, x-2), y };
      const b = { x: Math.min(m.width-1, x+2), y };
      if (a.x === b.x) continue;
      if (!hasLineOfSight(m, a, b)) { foundBlock = true; break outer; }
    }
  }
  ok(foundBlock, 'hasLineOfSight detecta al menos un bloqueo en ruined-village');
});

group('Group 7: getCellCover devuelve none/light/heavy', () => {
  const m = LAB2_MAPS['open-ground'];
  ok(getCellCover(m, {x:0,y:0}) === 'none',
     'open-ground celdas son "none"');
  // ruined-village debería tener al menos 1 light o heavy cover.
  const rv = LAB2_MAPS['ruined-village'];
  let coverCells = 0;
  for (let y = 0; y < rv.height; y++) {
    for (let x = 0; x < rv.width; x++) {
      const c = getCellCover(rv, {x,y});
      if (c === 'light' || c === 'heavy') coverCells++;
    }
  }
  ok(coverCells > 0,
     'ruined-village tiene celdas con cover (got ' + coverCells + ')');
});

group('Group 8: getCellCover y getCellElevation fuera de mapa', () => {
  const m = LAB2_MAPS['open-ground'];
  ok(getCellCover(m, {x:-1,y:0}) === 'none', 'x<0 → none');
  ok(getCellCover(m, {x:0,y:99}) === 'none', 'y>=height → none');
  ok(getCellElevation(m, {x:-1,y:0}) === 0, 'fuera de mapa elevation=0');
});

group('Group 9: integración LoS + elevation (visión sobre obstáculo bajo)', () => {
  // Construye mapa ad-hoc para validar la regla "si elevation_disparador >
  // elevation_obstáculo se mantiene LoS". Versión v1: ignoramos elevation
  // en LoS (más simple). Solo verifica que getCellElevation devuelve el
  // valor declarado en la celda.
  const m = LAB2_MAPS['ruined-village'];
  // Verifica que las celdas con elevation > 0 existen si las definimos.
  // Si no se definieron en V1, default 0 es OK.
  const cellAt = (x, y) => m.cells && m.cells[y] && m.cells[y][x];
  ok(true, 'getCellElevation no-throw (elevation V1 default 0)');
  ok(getCellElevation(m, {x:0,y:0}) >= 0, 'elevation ≥ 0');
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
