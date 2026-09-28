const fs = require('fs');
const path = require('path');
const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const p = path.join(testsDir, file);
  let c = fs.readFileSync(p, 'utf8');
  
  if (c.split('const JS_DIR').length > 2) {
    c = c.replace(/const JS_DIR = [^\n]*\r?\nconst jsFiles = [^\n]*\r?\nconst combinedJs = [^\n]*\r?\n/, '');
    c = c.replace(/<script>' \+ combinedJs \+ '<\/script>/g, "<script>' + js + '</script>");
  }
  
  fs.writeFileSync(p, c, 'utf8');
}
