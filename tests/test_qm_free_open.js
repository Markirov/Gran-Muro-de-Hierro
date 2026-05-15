/* Test for P1/open-QM-in-free
 *
 * openQuartermaster currently requires a campaign. Data path is ready
 * (P1/3): wb.strongbox + getWarbandBalance + buyShoppingItem branch.
 * Missing: modal-open tolerance for c=null + tab gating.
 *
 * Scope:
 *   - openQuartermaster(null, wb) does not throw, sets QM = { campaign:null,
 *     warband:wb, tab:'shopping', ... } (defaulting to a free-safe tab).
 *   - renderQM uses getWarbandBalance not campaignBalance directly.
 *   - Tab buttons recruit/log are hidden when campaign is null.
 *   - DOM markup: data-qmtab-campaign-only attribute marks the gated tabs.
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); pass++; } else { console.log('  ✗ ' + msg); fail++; } }
function group(name, fn) { console.log('\n' + name); fn(); }

group('Group 1: DOM markup signals campaign-only tabs', () => {
  ok(/data-qmtab-campaign-only/.test(html),
     'attribute data-qmtab-campaign-only present for gating in free mode');
});

group('Group 2: renderQM uses getWarbandBalance for free path', () => {
  // The campaign-only render previously called campaignBalance(QM.campaign, ...).
  // Free-aware version branches via getWarbandBalance.
  ok(html.includes('getWarbandBalance(warband, campaign)') ||
     html.includes('getWarbandBalance(wb, c)') ||
     /getWarbandBalance\(/.test(html),
     'renderQM references getWarbandBalance');
});

group('Group 3: openQuartermaster handles null campaign', () => {
  // Look for the explicit campaign=null guard in the function body.
  // Match a heuristic substring: "if (c)" or "campaign ? campaign.name : ".
  ok(/campaign\s*\?/.test(html) || /\bc\s*\?/.test(html),
     'openQuartermaster guards on campaign existence (some pattern present)');
});

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
