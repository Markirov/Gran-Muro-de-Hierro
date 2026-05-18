/* Bug Silahdar — Auditoría completa de call sites que leían unit.abilities
 * o effectiveAbilities sin chequear companion data.
 *
 * Tras el fix inicial (rosterCard + generateWarbandPDF) quedaban 3 sitios
 * más donde el mismo bug podía aparecer:
 *
 * 1. renderDetail (panel Detalle de la UI) — pintaba unitAbilities sin
 *    chequear companion. Silahdar en panel Detalle mostraba Mubarizun.
 * 2. renderAbilitiesList — construía baseAbilities desde unit.abilities,
 *    añadía notas de usuario contra esa lista.
 * 3. Elite abilities glossary (buildPrintableData / build-glossary):
 *    iteraba elite units, agrupaba por unit.id, mostraba abilities. Bajo
 *    alias 'yuzbasi' para Silahdar, mostraba "Yüzbaşí: Mubarizun".
 *
 * Verifica via análisis estático:
 * - renderAbilitiesList usa displayAbilitiesForCard (o equivalente).
 * - renderDetail llama a displayAbilitiesForCard.
 * - Glossary sección eliteAbilities respeta companion data.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

/* ------------------------------------------------------------------ */

// Cuenta cuántas veces aparece effectiveAbilities(model, unit) en el HTML
// fuera del propio cuerpo de displayAbilitiesForCard. Si > 0, hay paths
// que todavía no respetan companion data.
group('Group 1: solo 1 effectiveAbilities sin guarda companion permitido', () => {
  // El único call site permitido es dentro de displayAbilitiesForCard
  // (fallback nativo) y dentro de generateWarbandPDF (ya con guarda
  // pdfHasCompanion).
  const re = /effectiveAbilities\(model,\s*unit\)/g;
  const matches = html.match(re) || [];
  // Esperamos exactamente 3: definición + 2 call sites con guarda
  // (displayAbilitiesForCard fallback, generateWarbandPDF ternario).
  ok(matches.length <= 3,
     'effectiveAbilities(model,unit) ≤ 3 ocurrencias (got ' + matches.length + ')');
});

group('Group 2: renderAbilitiesList respeta companion data', () => {
  const idx = html.indexOf('function renderAbilitiesList(container, model, unit, wb)');
  ok(idx >= 0, 'función renderAbilitiesList localizada');
  if (idx >= 0) {
    // Tomamos los siguientes 3000 chars que cubren cómodamente el cuerpo
    // de la función (sin depender de match preciso del cierre).
    const snippet = html.slice(idx, idx + 3000);
    ok(/companionAbilities|displayAbilitiesForCard|hasCompanion/.test(snippet),
       'cuerpo de renderAbilitiesList usa companionAbilities / displayAbilitiesForCard / hasCompanion');
  }
});

group('Group 3: elite glossary chequea companion', () => {
  // La sección "Elite unit abilities" del glossary debe usar
  // displayAbilitiesForCard o branch por companion.
  const idx = html.indexOf('Elite unit abilities');
  ok(idx >= 0, 'sección Elite unit abilities presente');
  if (idx >= 0) {
    const slice = html.slice(idx, idx + 1500);
    ok(/displayAbilitiesForCard|companionStats|hasCompanion|companionAbilities/.test(slice),
       'sección glossary referencia mecanismo companion-aware');
  }
});

group('Group 4: panel Detalle (renderDetail) usa lista companion-aware', () => {
  // El bloque del panel Detalle pinta 'Habilidades' usando una lista que
  // viene de displayAbilitiesForCard o que chequea companion.
  // Buscamos el patrón "Habilidades</div>" precedido por un cálculo de
  // unitAbilities en las últimas ~500 líneas.
  const idx = html.indexOf('<div class="detail-label">Habilidades</div>');
  ok(idx >= 0, 'sección Habilidades del panel Detalle presente');
  if (idx >= 0) {
    const before = html.slice(Math.max(0, idx - 1500), idx);
    ok(/displayAbilitiesForCard|hasCompanion|companionAbilities/.test(before),
       'cálculo de abilities cerca del panel Detalle usa mecanismo companion-aware');
  }
});

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
