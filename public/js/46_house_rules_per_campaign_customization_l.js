/* ======================================================================
   HOUSE RULES — Per-campaign customization layer (Phase C)
   ----------------------------------------------------------------------
   The canonical Trauma D66 table lives in CAMPAIGN_TABLES.traumaTable
   and is read-only. This layer lets each campaign carry per-roll
   overrides (e.g. "in our group, roll 11 isn't Death — instead pay 50👑
   and trade for Severe Nerve Damage"). Overrides are stored on the
   campaign object so they travel with the campaign across saves and
   between campaigns.

   Override entry shape (same as canon, plus optional metadata):
     { name, kind, detail, mechanicalEffect? }
   The roll key is the same as the canon table: numeric 11..66 OR the
   special string '41-63' for the Full Recovery band.

   getEffectiveTrauma(roll, campaign) — primary API used by the trauma
   roller and post-battle wizard. Returns the override if present, with
   an `isCustom: true` flag and a `canonOriginal` reference for the UI;
   otherwise returns the canon entry as-is.

   Backward compat: campaigns saved before Phase C lack `houseRules`.
   All functions handle that gracefully (auto-init on write, fall through
   to canon on read).
   ====================================================================== */

/**
 * Ensures a campaign has the houseRules slot initialized.
 * Mutates the campaign in place. Safe to call repeatedly.
 */
function _ensureHouseRules(campaign) {
  if (!campaign) return null;
  if (!campaign.houseRules) {
    campaign.houseRules = { traumaOverrides: {} };
  } else if (!campaign.houseRules.traumaOverrides) {
    campaign.houseRules.traumaOverrides = {};
  }
  return campaign.houseRules;
}

/**
 * Returns the effective trauma entry for a given D66 roll, applying any
 * campaign-scoped override. If `campaign` is null/undefined or has no
 * matching override, falls back to the canonical entry.
 *
 * Returns null if the roll is invalid (no canon entry and no override).
 *
 * @param {number|string} roll  11..66 or '41-63'
 * @param {Object|null} campaign  campaign object, or null for canon-only
 * @returns {Object|null}  trauma entry (with isCustom=true if override)
 */
function getEffectiveTrauma(roll, campaign) {
  const canon = traumaRollLookup(roll);
  if (!campaign || !campaign.houseRules || !campaign.houseRules.traumaOverrides) {
    return canon;
  }
  const overrides = campaign.houseRules.traumaOverrides;

  // Try direct key match first (works for both numeric rolls and the
  // '41-63' band string, since traumaOverrides is keyed by both).
  let override = overrides[roll];

  // For numeric rolls in the 41-63 range without a direct override,
  // also check the band override.
  if (!override) {
    const n = typeof roll === 'number' ? roll : parseInt(roll, 10);
    if (!isNaN(n) && n >= 41 && n <= 63 && overrides['41-63']) {
      override = overrides['41-63'];
    }
  }

  if (!override) return canon;

  // Compose the effective entry: override fields, plus metadata for UI.
  return Object.assign({}, override, {
    roll: canon ? canon.roll : roll,
    isCustom: true,
    canonOriginal: canon || null,
  });
}

/**
 * Sets or replaces a trauma override on the campaign.
 * Auto-initializes campaign.houseRules if missing. Mutates in place.
 *
 * @param {Object} campaign
 * @param {number|string} roll  11..66 or '41-63'
 * @param {Object} override  { name, kind, detail, mechanicalEffect? }
 */
function setTraumaOverride(campaign, roll, override) {
  if (!campaign) return;
  const hr = _ensureHouseRules(campaign);
  if (!override || typeof override !== 'object') return;
  hr.traumaOverrides[roll] = {
    name: override.name || '',
    kind: override.kind || 'scar',
    detail: override.detail || '',
    mechanicalEffect: override.mechanicalEffect,
  };
  campaign.updatedAt = new Date().toISOString();
}

/**
 * Removes a trauma override, restoring canon for that roll. No-op if the
 * roll has no override.
 */
function removeTraumaOverride(campaign, roll) {
  if (!campaign || !campaign.houseRules || !campaign.houseRules.traumaOverrides) return;
  if (campaign.houseRules.traumaOverrides[roll] !== undefined) {
    delete campaign.houseRules.traumaOverrides[roll];
    campaign.updatedAt = new Date().toISOString();
  }
}

/**
 * Returns the campaign's trauma overrides as a sorted array. Numeric rolls
 * sort ascending; the '41-63' band sorts at its natural position (between
 * roll 36 and roll 64). Empty array if no overrides or campaign is old-format.
 */
function listTraumaOverrides(campaign) {
  if (!campaign || !campaign.houseRules || !campaign.houseRules.traumaOverrides) {
    return [];
  }
  const entries = Object.entries(campaign.houseRules.traumaOverrides)
    .map(([roll, override]) => {
      // Coerce numeric-looking string keys back to numbers for sorting
      const numericRoll = /^\d+$/.test(roll) ? parseInt(roll, 10) : roll;
      return Object.assign({}, override, { roll: numericRoll });
    });
  entries.sort((a, b) => {
    // Position '41-63' band at the start of its numerical range (41)
    const av = typeof a.roll === 'string' ? 41 : a.roll;
    const bv = typeof b.roll === 'string' ? 41 : b.roll;
    return av - bv;
  });
  return entries;
}

/**
 * Returns the Threshold and Field Strength for a given game number (1..12).
 * Past game 12 we cap at the game-12 values (canonical behaviour: campaign ends).
 */
function warbandThresholdForGame(gameNumber) {
  if (!gameNumber || gameNumber < 1) gameNumber = 1;
  if (gameNumber > 12) gameNumber = 12;
  return CAMPAIGN_TABLES.warbandThresholdByGame[gameNumber - 1];
}

/**
 * Returns the Promotion Pool dice count for the upcoming Promotion Step.
 * Canon: 1D6 base + 1D6 per Glorious Deed performed in the game.
 * Show Off (Wildcard 8): +1 D6 per model in the warband with the skill.
 */
function promotionPoolSize(gloriousDeedsPerformed, wb) {
  const r = CAMPAIGN_TABLES.promotionRules;
  const showOff = wb ? showOffPoolBonus(wb) : 0;
  return r.baseDice + r.diePerGloriousDeed * (gloriousDeedsPerformed || 0) + showOff;
}

/**
 * Counts ELITE models currently in the warband. ELITE is determined by
 * either the unit having tier='elite' (innate) or by the model carrying
 * a `promotedToElite` flag in its baseProgression (a Troop that was promoted).
 */
function countEliteInWarband(wb) {
  if (!wb || !wb.models) return 0;
  let n = 0;
  for (const m of wb.models) {
    if (isModelElite(m, wb)) n++;
  }
  return n;
}

/** True if the model is ELITE either innately or via promotion. */
function isModelElite(model, wb) {
  const u = getUnit(wb.factionId, model.unitId);
  if (!u) return false;
  if (u.tier === 'elite') return true;
  return !!(model.baseProgression && model.baseProgression.promotedToElite);
}

/**
 * Returns the list of Troop models in the warband that are eligible
 * for promotion this campaign step:
 *   - Currently a Troop (tier='troops')
 *   - Not already promoted via promotedToElite
 *   - The unit is not in the cannotBePromoted list for the faction
 *   - Status not 'dead' or 'captured'
 */
function eligibleForPromotion(wb) {
  if (!wb || !wb.models) return [];
  const out = [];
  for (const m of wb.models) {
    const u = getUnit(wb.factionId, m.unitId);
    if (!u || u.tier !== 'troops') continue;
    if (m.baseProgression && m.baseProgression.promotedToElite) continue;
    if (!canBePromoted(wb.factionId, m.unitId)) continue;
    const status = m.baseProgression?.status;
    if (status === 'dead' || status === 'captured') continue;
    out.push(m);
  }
  return out;
}

/**
 * Counts total Glorious Deeds in the warband. Optionally restricted to a
 * specific game number (useful for the Promotion Pool, which uses deeds
 * from the most recent game).
 *
 * @param {Object} wb
 * @param {number} [gameFilter] If set, only counts deeds with this `game` value.
 *                              If omitted, counts ALL deeds (across all games).
 * @returns {number} Total deed count.
 */
/**
 * Counts total Glorious Deeds in the warband. Optionally restricted to a
 * specific game number.
 *
 * Counts deeds from TWO sources:
 *   1. Manual entries in `model.baseProgression.gloriousDeeds[]` (added
 *      via the progression editor or imported from external data).
 *   2. The `feats` counter recorded per model per battle in the wizard
 *      (campaign argument required to read these). Each `feats` count
 *      represents N Glorious Deeds performed in that battle's game.
 *
 * Both sources contribute to the final tally so the Promotion Pool size
 * reflects all the deeds — whether the user logged them via the wizard or
 * the manual editor.
 *
 * @param {Object} wb        Warband object.
 * @param {number} [gameFilter] If set, only counts deeds with this game value.
 * @param {Object} [campaign]   If provided, also counts wizard-recorded feats
 *                              from the campaign's battles.
 * @returns {number} Total deed count.
 */
function countGloriousDeeds(wb, gameFilter, campaign) {
  if (!wb || !wb.models) return 0;
  let n = 0;
  // Source 1: manual entries in baseProgression.gloriousDeeds
  for (const m of wb.models) {
    const deeds = m.baseProgression?.gloriousDeeds || [];
    for (const d of deeds) {
      if (gameFilter !== undefined) {
        if (d.game === gameFilter) n++;
      } else {
        n++;
      }
    }
  }
  // Source 2: wizard-recorded feats in campaign battles (per model)
  // We need the warband's id to filter for this band's participation.
  if (campaign && campaign.battles && wb.id) {
    // We sort battles by date so when filtering by a specific game, the
    // mapping from "Nth battle" to "game N" is consistent. The wizard
    // doesn't tag battles with a game number directly; we infer the game
    // by counting battle position when needed.
    const battles = (campaign.battles || []).slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    for (let i = 0; i < battles.length; i++) {
      const battle = battles[i];
      // The `gameNumber` field on the battle object is set when the wizard
      // records it; if missing (legacy data), default to the battle's
      // ordinal position (1-indexed).
      const battleGame = battle.gameNumber || (i + 1);
      if (gameFilter !== undefined && battleGame !== gameFilter) continue;
      const part = (battle.participants || []).find(p => p.warbandId === wb.id);
      if (!part) continue;
      for (const out of (part.modelOutcomes || [])) {
        n += (out.feats || 0);
      }
    }
  }
  return n;
}

/**
 * Groups Quartermaster transactions by game number for reporting.
 * Returns an array of { gameNumber, transactions, totals } where totals
 * has the breakdown of ducados/glory in vs out for that game. Transactions
 * with no `gameNumber` field are bucketed under `gameNumber = null`
 * (legacy or pre-campaign-game data).
 *
 * Pure: works on the transactions array directly, no app state needed.
 */
function groupTransactionsByGame(transactions) {
  if (!transactions || !transactions.length) return [];
  const buckets = new Map();
  for (const tx of transactions) {
    const gn = tx.gameNumber == null ? null : tx.gameNumber;
    if (!buckets.has(gn)) {
      buckets.set(gn, {
        gameNumber: gn,
        transactions: [],
        totals: {
          spentDucados: 0,
          spentGlory: 0,
          refundedDucados: 0,
          refundedGlory: 0,
        },
      });
    }
    const bucket = buckets.get(gn);
    bucket.transactions.push(tx);
    // Update running totals based on tx type
    const isSpend = tx.type === 'recruit' || tx.type === 'buy-equipment';
    const isRefund = tx.type === 'sale-model' || tx.type === 'sale-equipment';
    if (isSpend) {
      const c = tx.cost || 0;
      if (tx.currency === '👑') bucket.totals.spentDucados += c;
      else if (tx.currency === '☼') bucket.totals.spentGlory += c;
    } else if (isRefund) {
      const r = tx.refund || 0;
      if (tx.currency === '👑') bucket.totals.refundedDucados += r;
      else if (tx.currency === '☼') bucket.totals.refundedGlory += r;
    }
  }
  // Sort by game number ascending; null bucket goes last
  return Array.from(buckets.values()).sort((a, b) => {
    if (a.gameNumber == null) return 1;
    if (b.gameNumber == null) return -1;
    return a.gameNumber - b.gameNumber;
  });
}

/**
 * Calculates the Reinforcements budget for a warband going into the next
 * game (canon page 112).
 *
 * Steps (after confirming Reinforcements):
 *   1. Arsenal Battlekit is discarded.
 *   2. Strongbox 👑 → 0.
 *   3. Total Cost = sum of all model costs (with battlekit + upgrades in 👑).
 *   4. Available 👑 = Threshold(nextGame) - Total Cost.
 *   5. Any 👑 not spent is lost.
 *   6. Exploration & Quartermaster steps are skipped.
 *
 * This helper is PURE: it doesn't mutate the warband. It just returns the
 * numbers the caller (modal) needs to display and validate.
 *
 * @param {Object} wb        The warband.
 * @param {number} nextGame  The game number you're about to play.
 *                           (1..12; values outside that range are clamped.)
 * @returns {{
 *   nextGame:          number,
 *   threshold:         number,   // 👑 cap for the next game
 *   fieldStrength:     number,   // model count cap
 *   currentTotalCost:  number,   // current band's total cost in 👑
 *   currentModelCount: number,   // current band's model count
 *   availableBudget:   number,   // 👑 available for new recruits (>= 0)
 *   modelSlotsLeft:    number,   // model slots free (>= 0)
 *   underThreshold:    boolean,  // true if below threshold (i.e. eligible)
 * }}
 */
function calculateReinforcementsBudget(wb, nextGame) {
  const row = warbandThresholdForGame(nextGame);
  const threshold = row.threshold;
  const fieldStrength = row.fieldStrength;
  const totals = warbandTotals(wb);
  const currentTotalCost = totals.ducados;
  const currentModelCount = (wb.models || []).length;
  const availableBudget = Math.max(0, threshold - currentTotalCost);
  const modelSlotsLeft = Math.max(0, fieldStrength - currentModelCount);
  const underThreshold = currentTotalCost < threshold;
  return {
    nextGame: row.game,
    threshold,
    fieldStrength,
    currentTotalCost,
    currentModelCount,
    availableBudget,
    modelSlotsLeft,
    underThreshold,
  };
}

/**
 * Applies the Reinforcements step state-changes to a warband (canon page 112):
 *   - Arsenal cleared
 *   - Strongbox 👑 → 0
 *   - budgetTotal updated to next game's threshold (so the catalogue shows
 *     the right cap when adding new models)
 *   - gameNumber bumped to nextGame
 *   - reinforcementsCalled flag set on the warband (informational; the
 *     campaign step won't allow Exploration / Quartermaster after this until
 *     the next campaign cycle starts)
 *
 * Note: the user adds the new models afterwards, using the normal catalogue.
 * This function only does the bookkeeping changes that always happen.
 */
function applyReinforcementsStep(wb, nextGame) {
  const row = warbandThresholdForGame(nextGame);
  // Clear Arsenal (canon: any battlekit in your Arsenal is discarded)
  if (Array.isArray(wb.arsenal)) wb.arsenal = [];
  // Strongbox 👑 → 0 (canon: spent on favors)
  wb.strongbox = 0;
  // Mark the band as advancing to the next game
  wb.gameNumber = row.game;
  wb.budgetTotal = row.threshold;
  // Flag the step so future UI can warn that Exploration/Quartermaster are
  // unavailable for this campaign cycle
  wb.reinforcementsCalled = true;
  return wb;
}

/**
 * Promote a Troop model to ELITE. Sets a flag in baseProgression.
 * The model keeps its unit type, but `isModelElite` returns true now,
 * `effectiveKeywords` adds ELITE, and the PDF / catalogue show ELITE
 * tier. Per canon (page 104), the model starts at 0 XP after promotion
 * (already gains +1 XP at the end of the same Experience Step for surviving).
 */
function promoteModel(model) {
  if (!model.baseProgression) {
    model.baseProgression = { xp: 0, kills: 0, advancements: [], scars: [], status: 'alive' };
  }
  model.baseProgression.promotedToElite = true;
  model.baseProgression.xp = 0;
  return model;
}

/**
 * Validates whether a die can be added to a particular model in the Promotion
 * Pool assignment, given the current assignments map. Canon rule (page 104):
 *   "you cannot assign a third dice to the same model until all of your Troop
 *   models have at least 2 dice each. Same for the fourth dice and so on"
 * This is equivalent to: a model's count cannot exceed the global minimum + 1.
 *
 * Pure function, no DOM or state. Returns true/false.
 */
function canIncrementPromotionDice(uid, assignments, eligibleUids, poolSize) {
  if (poolSize <= 0) return false;
  const totalAssigned = Object.values(assignments).reduce((a, b) => a + (b || 0), 0);
  if (totalAssigned >= poolSize) return false;
  const cur = assignments[uid] || 0;
  const min = eligibleUids.reduce((m, u) => Math.min(m, assignments[u] || 0), Infinity);
  return cur <= min;
}

/**
 * Pure function that rolls assigned promotion dice and returns the outcome.
 * Honours canon rules:
 *   - For each model, dice are rolled one by one. First 6 promotes, remaining
 *     dice for that model are not rolled.
 *   - After `autoSuccessAfter` consecutive non-6 rolls across the WHOLE pool,
 *     the next roll is automatically 6.
 *   - Stop rolling more models once `maxPromotable` promotions have occurred.
 *
 * `eligible` is an array of { uid, ...other } in the assignment order.
 * `assignments` is a map uid → numDice.
 * `random()` is an injectable RNG returning a value in [0, 1) — defaults to Math.random.
 *
 * Returns:
 *   {
 *     rollsByUid: { uid → [ {value, auto}, ... ] },
 *     promotedUids: Set,
 *     rolledOrder: [uid, ...],   // models that had dice rolled, in order
 *     consecutiveFails: number,  // residual at end (for diagnostics)
 *   }
 */
function rollPromotionDice(eligible, assignments, maxPromotable, autoSuccessAfter, random) {
  const rng = random || Math.random;
  const rollsByUid = {};
  const rolledOrder = [];
  const promotedUids = new Set();
  let promotedSoFar = 0;
  let consecutiveFails = 0;

  for (const m of eligible) {
    const dice = assignments[m.uid] || 0;
    if (dice <= 0) continue;
    if (promotedSoFar >= maxPromotable) break;
    const results = [];
    let promotedHere = false;
    for (let i = 0; i < dice; i++) {
      let result;
      let isAuto = false;
      if (consecutiveFails >= autoSuccessAfter) {
        result = 6;
        isAuto = true;
      } else {
        result = 1 + Math.floor(rng() * 6);
      }
      results.push({ value: result, auto: isAuto });
      if (result === 6) {
        promotedHere = true;
        promotedUids.add(m.uid);
        consecutiveFails = 0;
        break;
      } else {
        consecutiveFails++;
      }
    }
    rollsByUid[m.uid] = results;
    rolledOrder.push(m.uid);
    if (promotedHere) {
      promotedSoFar++;
      if (promotedSoFar >= maxPromotable) break;
    }
  }
  return { rollsByUid, rolledOrder, promotedUids, consecutiveFails };
}


