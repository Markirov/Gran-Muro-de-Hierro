const fs = require('fs');
const path = require('path');

const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const p = path.join(testsDir, file);
  let c = fs.readFileSync(p, 'utf8');
  
  if (c.includes('const js = scriptMatch[1];')) {
    c = c.replace(/const scriptMatch = html\.match\([\s\S]*?\);\r?\nconst js = scriptMatch\[1\];/, 
`const JS_DIR = path.resolve(__dirname, '..', 'js');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf8')).join('\\n');`);
  }
  
  fs.writeFileSync(p, c, 'utf8');
}
