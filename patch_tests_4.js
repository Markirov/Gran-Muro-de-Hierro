const fs = require('fs');
const path = require('path');
const testsDir = path.join(__dirname, 'tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const p = path.join(testsDir, file);
  let c = fs.readFileSync(p, 'utf8');
  
  // Replace .test(html) and html.includes with testing the script content too
  if (c.includes('const js = ') || c.includes('const combinedJs = ')) {
    c = c.replace(/\.test\(html\)/g, ".test(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : '')))");
    c = c.replace(/html\.includes\(/g, "(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))).includes(");
    c = c.replace(/html\.indexOf\(/g, "(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))).indexOf(");
    c = c.replace(/html\.match\(/g, "(html + (typeof combinedJs !== 'undefined' ? combinedJs : (typeof js !== 'undefined' ? js : ''))).match(");
  }
  
  fs.writeFileSync(p, c, 'utf8');
}
