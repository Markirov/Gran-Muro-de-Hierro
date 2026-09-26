#!/usr/bin/env node
/* Genera los PDF del glosario de keywords a partir de KEYWORD_GLOSSARY
 * (index.html): versión vigente (Rulebook 1.0.2 + Rules Commentaries 1.0.2)
 * y versión anterior (Rulebook 1.0.1).
 *
 * Uso: node scripts/build-keyword-glossary.js [carpeta-salida]
 * Salida por defecto: herramientas/glosario/ (gitignored).
 * Requiere Microsoft Edge o Chrome para imprimir el HTML a PDF.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'herramientas', 'glosario'));

function loadGlossary() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const js = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
  const bootIdx = js.search(/\nfunction boot\(\)/);
  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { runScripts: 'outside-only', url: 'http://localhost/' });
  dom.window.alert = () => {};
  dom.window.eval(js.slice(0, bootIdx) + '\n;window.__g = KEYWORD_GLOSSARY.map(e => ({ key: e.key, type: e.type, src: e.src, text: e.text, prev: e.prev, note: e.note || "" }));');
  return dom.window.__g;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function pageHtml({ title, subtitle, sources, entries, legend }) {
  const items = entries.map(e => `
    <article class="kw">
      <h2>${esc(e.key)} <span class="type">${esc(e.type)}</span>${e.badge ? ` <span class="badge ${e.badgeClass}">${esc(e.badge)}</span>` : ''}</h2>
      <p>${esc(e.text)}</p>
      ${e.was ? `<p class="was"><b>Antes (1.0.1):</b> ${esc(e.was)}</p>` : ''}
      ${e.note ? `<p class="note"><b>Aclaración (Rules Commentaries 1.0.2):</b> ${esc(e.note)}</p>` : ''}
      <p class="src">${esc(e.src)}</p>
    </article>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 14mm 13mm 14mm 13mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1a17; font-size: 9.6pt; line-height: 1.38; }
  header { border-bottom: 2px solid #6b1d1d; margin-bottom: 8px; padding-bottom: 6px; }
  h1 { font-size: 19pt; margin: 0; letter-spacing: 0.02em; }
  .sub { font-size: 10.5pt; color: #6b1d1d; margin: 2px 0 4px; font-weight: bold; }
  .meta { font-size: 8pt; color: #555; margin: 0; }
  .legend { font-size: 8pt; margin: 6px 0 0; }
  main { column-count: 2; column-gap: 7mm; }
  .kw { break-inside: avoid; margin: 0 0 6px; padding: 0 0 5px; border-bottom: 1px solid #ddd3c4; }
  .kw h2 { font-family: 'Courier New', monospace; font-size: 10.2pt; margin: 0 0 2px; }
  .kw p { margin: 0 0 2px; }
  .type { font-family: Georgia, serif; font-size: 7.2pt; font-weight: normal; color: #6d6353; text-transform: uppercase; letter-spacing: 0.06em; }
  .badge { font-family: Georgia, serif; font-size: 7pt; padding: 0 4px; border-radius: 3px; color: #fff; vertical-align: 1px; }
  .badge.new { background: #2f6b2f; } .badge.changed { background: #9a6a12; }
  .was { font-size: 8.4pt; color: #5b5144; }
  .note { font-size: 8.4pt; color: #243f6b; }
  .src { font-size: 7.2pt; color: #8a7f6e; }
  footer { margin-top: 8px; font-size: 7.5pt; color: #666; border-top: 1px solid #ccc; padding-top: 4px; }
</style></head><body>
<header>
  <h1>${esc(title)}</h1>
  <p class="sub">${esc(subtitle)}</p>
  <p class="meta">${esc(sources)}</p>
  ${legend ? `<p class="legend">${legend}</p>` : ''}
</header>
<main>${items}</main>
<footer>Resumen en español no oficial generado por Warband Forge a partir de los PDF de Factory Fortress. Ante cualquier duda manda el texto del reglamento.</footer>
</body></html>`;
}

function findBrowser() {
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

function printPdf(browser, htmlFile, pdfFile) {
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${pdfFile}`, 'file:///' + htmlFile.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 120000 });
}

function main() {
  const G = loadGlossary().slice().sort((a, b) => a.key.replace(/^[+/-]+\s*/, '').localeCompare(b.key.replace(/^[+/-]+\s*/, '')));
  fs.mkdirSync(OUT, { recursive: true });

  const current = G.map(e => ({
    key: e.key, type: e.type, src: e.src, text: e.text, note: e.note,
    badge: e.prev === null ? 'NUEVA 1.0.2' : (typeof e.prev === 'string' ? 'CAMBIA 1.0.2' : ''),
    badgeClass: e.prev === null ? 'new' : 'changed',
    was: typeof e.prev === 'string' ? e.prev : '',
  }));
  const previous = G.filter(e => e.prev !== null).map(e => ({
    key: e.key, type: e.type, src: 'Rulebook 1.0.1',
    text: typeof e.prev === 'string' ? e.prev : e.text,
  }));

  const docs = [
    { file: 'Glosario-keywords-1.0.2', entries: current,
      title: 'Glosario de keywords — Trench Crusade',
      subtitle: `Versión vigente 1.0.2 · ${current.length} keywords`,
      sources: 'Fuentes: Digital Rulebook 1.0.2 (Keyword Glossary, pp.52-57; trenchcrusade.com, 09-sep-2026) + Rules Commentaries 1.0.2.',
      legend: '<span class="badge new">NUEVA 1.0.2</span> no existía en 1.0.1 · <span class="badge changed">CAMBIA 1.0.2</span> texto modificado (se muestra el anterior debajo).' },
    { file: 'Glosario-keywords-1.0.1', entries: previous,
      title: 'Glosario de keywords — Trench Crusade',
      subtitle: `Versión anterior 1.0.1 · ${previous.length} keywords`,
      sources: 'Fuente: Digital Rulebook 1.0.1 (Keyword Glossary, pp.52-57; 20-nov-2025).' },
  ];

  const browser = findBrowser();
  for (const d of docs) {
    const htmlFile = path.join(OUT, d.file + '.html');
    fs.writeFileSync(htmlFile, pageHtml(d));
    if (browser) {
      printPdf(browser, htmlFile, path.join(OUT, d.file + '.pdf'));
      console.log('PDF  ' + path.join(OUT, d.file + '.pdf') + ` (${d.entries.length} keywords)`);
    } else {
      console.log('HTML ' + htmlFile + ' (sin Edge/Chrome: ábrelo e imprime a PDF)');
    }
  }
}

if (require.main === module) main();
module.exports = { pageHtml };
