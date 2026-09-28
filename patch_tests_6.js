const fs = require('fs');
const path = require('path');
const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const p = path.join(testsDir, file);
  let c = fs.readFileSync(p, 'utf8');
  
  if (c.includes('app.css') && !c.includes('JS_DIR_ALL')) {
    // Inject JS loading right after CSS injection
    c = c.replace(/html \+= '\\n<style>\\n' \+ cssContent \+ '\\n<\/style>\\n';/,
`$&
  const JS_DIR_ALL = path.resolve(__dirname, '..', 'js');
  const jsContentAll = fs.readdirSync(JS_DIR_ALL).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(JS_DIR_ALL, x), 'utf8')).join('\\n');
  html += '\\n<script>\\n' + jsContentAll + '\\n</script>\\n';`);
  }
  
  fs.writeFileSync(p, c, 'utf8');
}
