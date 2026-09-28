/* ======================================================================
   APPLICATION STATE
   ====================================================================== */

const STATE = {
  currentWarband: null,    // active warband
  selectedFactionId: null, // for catalogue display
  selectedModelUid: null,  // selected unit in roster
  savedWarbands: [],       // index of saved warbands
  // Campaign mode
  mode: 'banda',                       // 'banda' | 'campana'
  currentCampaign: null,               // active campaign object
  selectedCampaignWarbandId: null,     // currently inspected warband within campaign
  selectedBattleId: null,              // currently inspected battle entry
  // UI state for detail panel
  progressionExpanded: false,
};

const STORAGE_KEY = 'warband-forge-v1';
const STORAGE_INDEX = 'warband-forge-index';

function uid() {
  return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function newWarband(factionId='new-antioch') {
  const f = DATA.factions[factionId];
  return {
    id: 'wb_' + Date.now().toString(36),
    name: '',
    factionId,
    variantId: null,
    budgetTotal: f.budget,
    startingGlory: 0,    // initial Glory points (☼) — typically 0 at warband creation
    models: [],
    glory: 0,            // legacy field (kept for compatibility)
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Reserved for campaign module
    campaign: null,
    // Phase 2 (free progression): a warband can play battles outside any
    // campaign. These battles ('partidas libres') live here, separate from
    // any campaign's `battles` array. The unit of progression is the
    // warband, not the campaign — campaigns are filtered views over the
    // warband's history.
    freeBattles: [],
    // Set of "table:roll" or "table:roll#forkIdx" keys that this warband
    // has discovered through Exploration steps. Persisted at warband
    // level (not per-campaign) so a discovery in one campaign or in a
    // free battle prevents re-discovery elsewhere — narratively coherent
    // and simpler than tracking per-context.
    discoveredLocations: [],
    // Optional: an array of campaign IDs this warband is currently
    // active in. Most bands will have at most one, but the design allows
    // many. Initialised empty; set by the campaign-creation flow.
    campaignIds: [],
    // Fase 6.1 — Shopping list. Per-warband purchase queue prioritised
    // by the player. Each entry: { modelUid, kitId, priority, addedAt }.
    // The Quartermaster step (Fase 6.3) reads this to surface "buy
    // now if you can afford it" affordances; the model detail view
    // (Fase 6.2) lets the player add items from outside the QM context.
    shoppingList: [],
    // Fase 5.6 — Arsenal. Shared equipment pool at warband level
    // (canon distinguishes it from per-model battlekit). Each entry:
    // { name, currency, cost, addedAt, source }. Sources are tags
    // for traceability ('exploration', 'manual', etc.) — they don't
    // gate any logic but help the player remember provenance.
    arsenal: [],
    // Fase 5.7 — Temporary bonuses. Per-warband list of effects that
    // apply for a limited number of battles. Each entry has at least
    // { kind, scope, sourceBattleId, addedAt } plus kind-specific
    // payload (e.g. morale-bonus carries dice:N). scope='next-game'
    // entries decay at the start of the NEXT save.
    tempBonuses: [],
    // BACKLOG P1/3 — Strongbox for the free-battle context. Campaign
    // bands read balance from campaign.finances (already wired); free
    // bands had no central pool, so the QM "Lista" tab couldn't spend
    // outside a campaign. addFreeBattle increments this on every save.
    strongbox: { ducados: 0, glory: 0 },
    // Patron de la banda (canon p.86-93). Determina qué Skill puede
    // elegir un modelo cuando una Advancement Roll cae en "Patron Skill".
    // Se elige al jugar la primera Advancement Patron (o manualmente).
    // null hasta que se asigne. Ver PATRON_CATALOG.
    patronId: null,
    // Fase 11 PIVOT v2 — Sandbox de loadouts experimentales.
    // Cada variante = un conjunto de overrides sobre la banda canon.
    // Schema: { id, name, createdAt, description?, overrides: [...] }
    // Override types: 'replace-equipment', 'add-equipment', 'remove-equipment',
    //                  'add-model', 'remove-model'
    experimentalVariants: [],
  };
}


