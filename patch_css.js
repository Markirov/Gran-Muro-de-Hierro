const fs = require('fs');
const path = require('path');
const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const p = path.join(testsDir, file);
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('const html = ') && !c.includes('app.css')) {
    // we want to inject CSS after html is defined.
    // If html is declared as const, we can't do html +=
    // So we'll replace `const html = ` with `let html = `
    c = c.replace(/const html = fs\.readFileSync/g, 'let html = fs.readFileSync');
    
    // Then we append CSS to `html` right after its initialization.
    // But since JS was also appended to HTML in my previous hacks, let's just do:
    c = c.replace(/(let html = fs\.readFileSync[^;\n]+;(\s*const JS_DIR[^;\n]+;\s*const jsFiles[^;\n]+;\s*const js = [^;\n]+;\s*html \+= js;)?)/g, 
      "$1\n  const cssContent = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'app.css'), 'utf8');\n  html += '\\n<style>\\n' + cssContent + '\\n</style>\\n';");
  }
  fs.writeFileSync(p, c);
}
