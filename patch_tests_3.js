const fs = require('fs');
const path = require('path');
const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const p = path.join(testsDir, file);
  let c = fs.readFileSync(p, 'utf8');
  
  // If JS_DIR is declared twice
  if (c.split('const JS_DIR').length > 2) {
    // We remove the second one (which usually is followed by combinedJs)
    c = c.replace(/const JS_DIR = [^\n]*\nconst jsFiles = [^\n]*\nconst combinedJs = [^\n]*\n/, '');
    // And if `combinedJs` is missing, we use `js` in JSDOM
    c = c.replace(/<script>' \+ combinedJs \+ '<\/script>/g, "<script>' + js + '</script>");
  }
  
  fs.writeFileSync(p, c, 'utf8');
}
