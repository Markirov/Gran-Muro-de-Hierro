const fs=require('fs'); 
['test_arsenal_qm_tab.js', 'test_campaign_reporter_banner.js', 'test_campaigns_tab_nav.js'].forEach(f => {
  const p = 'tests/'+f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/const HTML_PATH = [^\n]*\\nconst jsContent = [^\n]*\\nconst html = [^\n]*;/,
`const HTML_PATH = path.resolve(__dirname, '..', 'app.html');
const jsContent = fs.readdirSync(path.resolve(__dirname, '..', 'js')).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(__dirname, '..', 'js', x), 'utf8')).join('\\n');
const html = fs.readFileSync(HTML_PATH, 'utf8') + jsContent;`);
  fs.writeFileSync(p, c);
});
