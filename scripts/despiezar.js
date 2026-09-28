const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appHtmlPath = path.join(root, 'app.html');
let html = fs.readFileSync(appHtmlPath, 'utf8');

// Ensure directories exist
const cssDir = path.join(root, 'css');
const jsDir = path.join(root, 'js');
if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir);
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir);

// 1. Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  fs.writeFileSync(path.join(cssDir, 'app.css'), styleMatch[1].trim(), 'utf8');
  html = html.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="css/app.css">');
}

// 2. Extract JS
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const jsContent = scriptMatch[1];
  
  // We'll split the JS by the major header comments.
  // The header looks like: /* ======================================================================
  // We'll use a regex that matches this line, captures the title on the next line, and splits.
  const chunks = jsContent.split(/\/\* ======================================================================\r?\n\s*(.*?)\r?\n/g);
  
  // chunks[0] is everything before the first matched header.
  // chunks[1] is the title of the first block, chunks[2] is its content, etc.
  
  const jsFiles = [];
  
  // If there's content before the first header, save it as 00_init.js
  if (chunks[0].trim()) {
    const filename = '00_init.js';
    fs.writeFileSync(path.join(jsDir, filename), chunks[0].trim() + '\n', 'utf8');
    jsFiles.push(filename);
  }
  
  for (let i = 1; i < chunks.length; i += 2) {
    let title = chunks[i].trim();
    // Sanitize title for filename
    let safeTitle = title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
    // Remove trailing/leading underscores
    safeTitle = safeTitle.replace(/^_|_$/g, '');
    
    // Shorten if too long, or fallback
    if (safeTitle.length > 40) safeTitle = safeTitle.substring(0, 40);
    if (!safeTitle) safeTitle = 'chunk';
    
    // Add padded prefix
    const prefix = String((i + 1) / 2).padStart(2, '0');
    const filename = `${prefix}_${safeTitle}.js`;
    
    // The chunk content includes the rest of the header block, which we should restore.
    // Actually, `split` removed the separator and the title. We can put them back to keep comments readable.
    const headerStr = `/* ======================================================================\n   ${title}\n`;
    
    fs.writeFileSync(path.join(jsDir, filename), headerStr + chunks[i+1] + '\n', 'utf8');
    jsFiles.push(filename);
  }
  
  // Replace the original script tag with multiple script tags
  const scriptTags = jsFiles.map(f => `<script src="js/${f}"></script>`).join('\n  ');
  html = html.replace(/<script>[\s\S]*?<\/script>/, scriptTags);
}

fs.writeFileSync(appHtmlPath, html, 'utf8');
console.log('Split complete. Check css/ and js/ directories.');
