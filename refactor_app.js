const fs = require('fs');
const path = require('path');
const appFile = path.join(__dirname, 'app.html');
let html = fs.readFileSync(appFile, 'utf8');

// 1. Remove home Panel HTML
html = html.replace(/<section class="panel" id="panel-home"[\s\S]*?<\/section>\s*/m, '');

// 2. Change title link to go back to index.html
const titleRegex = /<div class="brand">\s*<h1>WARBAND FORGE<\/h1>/;
html = html.replace(titleRegex, `<a href="index.html" class="brand" style="text-decoration:none;">
    <h1>WARBAND FORGE</h1>`);
html = html.replace(/<span class="quote">«Durante ocho siglos la Iglesia ha librado su cruzada\. Los ejércitos están en tablas\.»<\/span>\s*<\/div>/, `<span class="quote">«Durante ocho siglos la Iglesia ha librado su cruzada. Los ejércitos están en tablas.»</span>
  </a>`);

// 3. Patch boot() to respect URL search params
const bootRegex = /let savedMode = 'banda';\s*try \{ savedMode = localStorage\.getItem\(STATE_KEY \+ '_mode'\) \|\| 'banda'; \} catch\(e\)\{\}/;
const bootPatch = `let savedMode = 'banda';
  try { savedMode = localStorage.getItem(STATE_KEY + '_mode') || 'banda'; } catch(e){}
  const urlParams = new URLSearchParams(window.location.search);
  const urlMode = urlParams.get('mode');
  if (urlMode && ['banda','campana','lab','battle'].includes(urlMode)) {
    savedMode = urlMode;
  }`;
if (html.match(bootRegex)) {
  html = html.replace(bootRegex, bootPatch);
}

// 4. Update the settings click from index.html -> app.html
// Actually, `app.html?mode=banda&settings=1` can be caught in boot()
const settingsPatch = `if (urlParams.get('settings') === '1') {
    setTimeout(() => {
      const btn = document.getElementById('btn-config-menu');
      if (btn) btn.click();
    }, 500);
  }`;
if (!html.includes('urlParams.get(\'settings\')')) {
  // inject after syncPanelsToViewport()
  html = html.replace('syncPanelsToViewport();', 'syncPanelsToViewport();\n  ' + settingsPatch);
}

// 5. Update fix_css.js and fix_panels_2.js logic to remove 'home' logic since it's no longer needed in app.html
html = html.replace(/body\.mode-home[\s\S]*?\/\* ALL OTHER MODES: hide home \*\//, '');
html = html.replace(/body:not\(\.mode-home\) #panel-home \{ display: none !important; \}/, '');
html = html.replace(/if \(mode === 'home'\) \{[\s\S]*?\} else if \(mode === 'banda'\)/, "if (mode === 'banda')");

// 6. Clean up JS home handlers
html = html.replace(/const brandHeader = document\.querySelector\('\.brand'\);[\s\S]*?\}\);/m, '');

fs.writeFileSync(appFile, html, 'utf8');
console.log('app.html refactored');
