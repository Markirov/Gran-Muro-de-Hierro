const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.resolve(__dirname, '..', 'public', 'js');
const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));
for (const file of files) {
  const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
  try {
    new vm.Script(code);
  } catch (e) {
    console.error(`Syntax error in ${file}:`, e);
    process.exit(1);
  }
}
console.log(`Syntax OK (${files.length} files)`);
