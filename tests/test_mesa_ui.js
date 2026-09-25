/* Modo mesa — interfaz (overlay móvil, una ficha por miniatura).
 * PLAN: tracking/plans/PLAN_2026-09-25_modo-mesa.md (secciones 1 y 3).
 * jsdom con el script previo a boot() evaluado (los handlers top-level
 * quedan cableados) y Bandas/Caza2.json como banda activa.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const bootIdx = js.search(/\nfunction boot\(\)/);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
const w = dom.window;
const doc = w.document;
let confirmAnswer = true, confirms = 0, alerts = [];
w.alert = (m) => { alerts.push(m); };
w.confirm = () => { confirms++; return confirmAnswer; };
w.HTMLElement.prototype.scrollIntoView = function () {};
w.eval(js.slice(0, bootIdx) + '\n;window.__lib = { STATE, importCompanionWarband, loadTableSession,' +
  ' openTableMode: typeof openTableMode === "function" ? openTableMode : null,' +
  ' closeTableMode: typeof closeTableMode === "function" ? closeTableMode : null };');
const L = w.__lib;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
const $ = (sel, root) => (root || doc).querySelector(sel);
const $$ = (sel, root) => Array.from((root || doc).querySelectorAll(sel));
const click = (el) => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

console.log('\nGroup 1: botón y overlay presentes');
const btn = doc.getElementById('btn-table-mode');
ok(!!btn, '#btn-table-mode existe');
ok(btn && /Modo mesa/.test(btn.textContent), 'texto "Modo mesa"');
ok(btn && btn.getAttribute('data-action-priority') === 'primary', 'visible en móvil (priority primary)');
ok(!!doc.getElementById('table-mode'), 'overlay #table-mode existe');
ok(typeof L.openTableMode === 'function' && typeof L.closeTableMode === 'function', 'openTableMode / closeTableMode');

console.log('\nGroup 2: sin banda → aviso');
L.STATE.currentWarband = null;
click(btn);
ok(alerts.some(a => /no tiene modelos/.test(a)), 'alert "La banda no tiene modelos."');
ok(!doc.getElementById('table-mode').classList.contains('show'), 'overlay no se abre');

const wb = L.importCompanionWarband(JSON.parse(fs.readFileSync(path.join(ROOT, 'Bandas', 'Caza2.json'), 'utf8')));
L.STATE.currentWarband = wb;
w.localStorage.clear();

console.log('\nGroup 3: abrir pinta una ficha por modelo');
click(btn);
const ov = doc.getElementById('table-mode');
ok(ov.classList.contains('show'), 'overlay visible');
const cards = $$('.tm-card', ov);
ok(cards.length === wb.models.length, `${wb.models.length} fichas (got ${cards.length})`);
ok(cards.every((c, i) => c.dataset.uid === wb.models[i].uid), 'fichas en orden de banda con data-uid');
ok($$('.tm-stat', cards[0]).length === 4, '4 stats en la ficha');
ok(/MOV/.test(cards[0].textContent) && /ARM/.test(cards[0].textContent), 'etiquetas MOV … ARM');
ok($$('.tm-dot', ov).length === wb.models.length, 'un punto por ficha');
ok(/Turno 1/.test($('.tm-turn', ov).textContent), 'cabecera "Turno 1"');
ok(/0\/9 activadas/.test($('.tm-count', ov).textContent), 'contador "0/9 activadas"');
ok($$('.tm-effect', cards[0]).length >= 6, 'chips de efectos (≥6)');
// Consulta completa visible (petición Marcos: cuanta más información, mejor).
ok(!$('details.tm-ref', cards[0]), 'consulta ya no va plegada');
ok(!!$('.tm-ref-weapons', cards[0]) && !!$('.tm-ref-equipment', cards[0]) && !!$('.tm-ref-abilities', cards[0]),
   'bloques Armas, Equipo y Habilidades');
const eqText = $('.tm-ref-equipment', cards[0]).textContent;
ok(['Trench Shield', 'Medi-Kit', 'Alchemist Armour', 'Anqa Guard'].every(n => eqText.includes(n)), 'equipo del Silahdar listado');
ok(/Shield Combo/.test(eqText) && /NEGATE FIRE/.test(eqText), 'habilidades concedidas bajo su pieza');
ok(/SHRAPNEL/.test($('.tm-ref-weapons', cards[0]).textContent) &&
   $$('.tm-ref-weapons .tm-rule-desc', cards[0]).some(e => e.textContent.trim().length > 10), 'keywords de arma con explicación');
const abText = $('.tm-ref-abilities', cards[0]).textContent;
ok(/ELITE/.test(abText) && !/Shield Combo/.test(abText), 'habilidades propias sin repetir las del equipo');
ok(doc.body.classList.contains('table-mode-open'), 'body bloquea scroll');

console.log('\nGroup 4: activar');
const uid0 = wb.models[0].uid;
click($('.tm-activate', cards[0]));
let c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
ok($('.tm-activate', c0).getAttribute('aria-pressed') === 'true', 'botón Activado encendido');
ok(/1\/9 activadas/.test($('.tm-count', ov).textContent), 'contador 1/9');
ok(L.loadTableSession(wb).models[uid0].activated === true, 'guardado en localStorage');
ok($$('.tm-dot', ov)[0].classList.contains('activated'), 'punto marcado como activado');

console.log('\nGroup 5: sangre, efectos, usos');
// Cada toque re-renderiza la ficha: hay que volver a buscarla.
click($('.tm-blood-plus', c0));
c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
click($('.tm-blood-plus', c0));
c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
ok($('.tm-blood-val', c0).textContent.trim() === '2', 'blood 2');
click($('.tm-blood-minus', c0));
c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
ok($('.tm-blood-val', c0).textContent.trim() === '1', 'blood 1');
click($('.tm-effect[data-effect="BLES"]', c0));
c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
ok($('.tm-effect[data-effect="BLES"]', c0).getAttribute('aria-pressed') === 'true', 'efecto BLES encendido');
ok(L.loadTableSession(wb).models[uid0].effects.includes('BLES'), 'efecto guardado');
const withSpent = $$('.tm-card', ov).find(c => $('.tm-spent', c));
if (withSpent) {
  const ab = $('.tm-spent', withSpent).dataset.ability;
  click($('.tm-spent', withSpent));
  const cs = $(`.tm-card[data-uid="${withSpent.dataset.uid}"]`, ov);
  ok($(`.tm-spent[data-ability="${ab}"]`, cs).getAttribute('aria-pressed') === 'true', 'uso marcado como gastado');
} else {
  ok($$('.tm-card', ov).every(c => !$('.tm-spent', c)), 'Caza2 sin habilidades de un uso: sin chips de uso');
}

console.log('\nGroup 6: estado de combate');
click($('.tm-status [data-status="down"]', c0));
c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
ok(c0.classList.contains('tm-down'), 'Down → clase tm-down');
click($('.tm-status [data-status="out"]', c0));
c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
ok(c0.classList.contains('tm-out'), 'Fuera → clase tm-out');
ok($('.tm-activate', c0).disabled && $('.tm-blood-plus', c0).disabled && $$('.tm-effect', c0).every(b => b.disabled),
   'Fuera deshabilita activación, sangre y efectos');
ok($$('.tm-status [data-status]', c0).every(b => !b.disabled), 'el selector de estado sigue activo');
ok(/0\/8 activadas/.test($('.tm-count', ov).textContent), 'contador excluye Fuera (0/8)');
ok($$('.tm-dot', ov)[0].classList.contains('out'), 'punto atenuado');
click($('.tm-status [data-status="up"]', c0));
c0 = $(`.tm-card[data-uid="${uid0}"]`, ov);
ok(!c0.classList.contains('tm-out') && !$('.tm-activate', c0).disabled, 'volver a En pie reactiva');

console.log('\nGroup 7: pasar turno');
const uid1 = wb.models[1].uid;
click($('.tm-activate', $(`.tm-card[data-uid="${uid1}"]`, ov)));
confirmAnswer = false; confirms = 0;
click(doc.getElementById('tm-next-turn'));
ok(confirms === 1 && /Turno 1/.test($('.tm-turn', ov).textContent), 'confirm cancelado → sigue en turno 1');
confirmAnswer = true;
click(doc.getElementById('tm-next-turn'));
ok(/Turno 2/.test($('.tm-turn', ov).textContent), 'confirm aceptado → Turno 2');
ok($$('.tm-activate', ov).every(b => b.getAttribute('aria-pressed') === 'false'), 'todas desactivadas');
ok($('.tm-blood-val', $(`.tm-card[data-uid="${uid0}"]`, ov)).textContent.trim() === '1', 'sangre intacta');

console.log('\nGroup 8: cerrar y reabrir conserva el estado');
click(doc.getElementById('tm-close'));
ok(!ov.classList.contains('show') && !doc.body.classList.contains('table-mode-open'), 'cerrado');
click(btn);
ok(/Turno 2/.test($('.tm-turn', ov).textContent), 'reabre en Turno 2');
ok($('.tm-effect[data-effect="BLES"]', $(`.tm-card[data-uid="${uid0}"]`, ov)).getAttribute('aria-pressed') === 'true',
   'efecto BLES conservado');

console.log('\nGroup 9: nueva partida');
click(doc.getElementById('tm-reset'));
ok(/Turno 1/.test($('.tm-turn', ov).textContent), 'Turno 1');
ok($('.tm-blood-val', $(`.tm-card[data-uid="${uid0}"]`, ov)).textContent.trim() === '0', 'sangre a 0');
ok(!wb.tableSession && !JSON.stringify(wb).includes('wf-mesa'), 'la banda no guarda nada del modo mesa');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
