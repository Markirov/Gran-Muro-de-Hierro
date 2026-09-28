/* ======================================================================
   FASE 3 — LIVE FREE BATTLE: state + factory

   The wizard collects scenario/opponent/dice and produces a
   LIVE_FREE_BATTLE object held only in memory (refresh = lost).
   This matches the Battle Tracker's current trade-off: the live
   context is ephemeral, the persisted summary lands on the warband
   only when the player closes out the post-battle wizard (Fase 4).
   ====================================================================== */

var LIVE_FREE_BATTLE = null;
function setLiveFreeBattle(lfb) { LIVE_FREE_BATTLE = lfb; }
function getLiveFreeBattle() { return LIVE_FREE_BATTLE; }
function clearLiveFreeBattle() { LIVE_FREE_BATTLE = null; }

function startLiveFreeBattle(wb, opts) {
  opts = opts || {};
  const scenarioId = opts.scenarioId;
  if (!scenarioId || !SCENARIOS_CATALOG[scenarioId]) {
    throw new Error('startLiveFreeBattle: invalid scenarioId: ' + scenarioId);
  }
  // Dice clamped to canon range. Sub-1 and >10 are user-input edge cases
  // — the slider enforces it in UI, but the factory is also called from
  // tests and from code paths we don't fully control.
  let dice = (typeof opts.dicePicked === 'number' && !isNaN(opts.dicePicked))
    ? Math.floor(opts.dicePicked)
    : 3;
  if (dice < 1) dice = 1;
  if (dice > 10) dice = 10;

  const ts = new Date().toISOString();
  const opponent = (opts.opponent != null ? String(opts.opponent) : '').trim();
  let name = (opts.name != null ? String(opts.name) : '').trim();
  if (!name) {
    const d = new Date(ts);
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    name = 'Libre · ' + d.getDate() + ' ' + months[d.getMonth()] + (opponent ? ' · vs ' + opponent : '');
  }

  return {
    id: 'fb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    warbandId: (wb && wb.id) ? wb.id : null,
    name,
    opponent,
    scenarioId,
    dicePicked: dice,
    startedAt: ts,
    status: 'in-progress',
  };
}


