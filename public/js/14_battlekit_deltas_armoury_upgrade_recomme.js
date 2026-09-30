// @ts-nocheck -- puente legacy: consume globals del simulador clásico.

/* ======================================================================
   BATTLEKIT DELTAS — armoury upgrade recommender
   Heuristic-based (deterministic, no simulation needed).
   For each model: score current loadout, then score each compatible
   armoury option, return top picks ranked by efficiency (Δscore / cost).
   ====================================================================== */

/**
 * Heuristic score for a weapon based on its keywords + range + type.
 *
 * The scoring is calibrated to roughly track how much expected damage
 * the weapon contributes per activation against a 'mid' target (no armour,
 * not a horde, not heavy). Context flags (vsHorde, vsHeavy, vsElite) shift
 * the score:
 *   - BLAST/SHRAPNEL → bonus vs horde
 *   - IGNORE ARMOUR / IGNORE COVER → bonus vs heavy
 *   - CRITICAL / +1 INJURY DICE → bonus vs elite
 *
 * @param weapon - { type, range, weaponKeywords: string[] }
 * @param ctx - { vsHorde?, vsHeavy?, vsElite?, isMelee? } optional bonuses
 * @returns score number
 */
function scoreWeaponPotential(weapon, ctx) {
  if (!weapon) return 0;
  ctx = ctx || {};
  const kws = (weapon.weaponKeywords || []).map(k =>
    typeof k === 'string' ? k.toUpperCase() : (k.name || '').toUpperCase()
  );
  const isMelee = /melee/i.test(weapon.range || '') || ctx.isMelee;
  const isRanged = !isMelee;

  // Range value (parse like "24\"" → 24, "Melee" → 4)
  let rangeVal = 4;  // melee default
  const rmatch = String(weapon.range || '').match(/(\d+)/);
  if (rmatch) rangeVal = parseInt(rmatch[1], 10);

  // Base: range + 5 (so a melee weapon starts at 9, a 24" rifle at 29)
  let score = rangeVal + 5;

  // 2-handed gets a small bonus (assumes higher base damage)
  if (/2-handed/i.test(weapon.type || '')) score += 3;

  // ── Damage modifiers ────────────────────────────────────────────────
  if (kws.includes('+1 DICE')) score += 8;
  if (kws.includes('+2 DICE')) score += 16;
  if (kws.includes('+1 INJURY DICE')) score += 7;
  if (kws.includes('+1 INJURY MODIFIER')) score += 5;
  if (kws.includes('CRITICAL')) score += 6;
  if (kws.includes('AUTOMATIC 2')) score += 8;
  if (kws.includes('AUTOMATIC 3')) score += 14;

  // ── Penalties ───────────────────────────────────────────────────────
  if (kws.includes('-1 INJURY DICE')) score -= 4;
  if (kws.includes('RELOAD')) score -= 3;
  if (kws.includes('RISKY')) score -= 2;
  if (kws.includes('CUMBERSOME')) score -= 2;
  if (kws.includes('HEAVY')) score -= 2;  // can't dash + shoot

  // ── Context bonuses ─────────────────────────────────────────────────
  if (ctx.vsHorde) {
    if (kws.includes('BLAST 3"') || kws.some(k => k.startsWith('BLAST'))) score += 12;
    if (kws.includes('SHRAPNEL')) score += 6;
    if (kws.includes('AUTOMATIC 2')) score += 4;
    if (kws.includes('AUTOMATIC 3')) score += 8;
    if (kws.includes('FLAMETHROWER')) score += 8;
  }
  if (ctx.vsHeavy) {
    if (kws.includes('IGNORE ARMOUR')) score += 14;
    if (kws.includes('+1 INJURY DICE')) score += 4;
    if (kws.includes('+1 INJURY MODIFIER')) score += 3;
    if (kws.includes('IGNORE COVER')) score += 4;
  }
  if (ctx.vsElite) {
    if (kws.includes('CRITICAL')) score += 6;
    if (kws.includes('+1 INJURY DICE')) score += 5;
    if (kws.includes('+1 DICE')) score += 4;
  }

  return Math.max(0, score);
}

/**
 * Compute the score of a model's current weapon loadout (best ranged + best
 * melee), considering all 4 enemy archetypes (mid, horde, heavy, elite).
 *
 * Reads the model's companionEquipment (Companion JSON shape) and resolves
 * each entry against the faction's armoury catalog to get keywords + range.
 *
 * Returns { rangedScore, meleeScore, contextScores: {mid, horde, heavy, elite} }.
 */
function _scoreCurrentLoadout(model, wb) {
  // Build a lookup of armoury items by name (lowercased) for resolution
  const armouryByName = {};
  if (typeof DATA !== 'undefined' && wb && DATA.factions[wb.factionId]) {
    const fac = DATA.factions[wb.factionId];
    const all = [
      ...(fac.armoury?.ranged || []),
      ...(fac.armoury?.melee  || []),
    ];
    for (const a of all) {
      armouryByName[a.name.toLowerCase()] = a;
    }
  }
  // Companion uses some name variations — normalize for matching
  const normalize = (n) => String(n || '').toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/^great\s+/, 'great');
  // Try matching with several variations
  const findArmouryItem = (companionName) => {
    const n = normalize(companionName);
    if (armouryByName[n]) return armouryByName[n];
    // Try without the "/X" suffix (e.g. "Greatsword / Greataxe" → "Great Sword/Axe")
    for (const [key, item] of Object.entries(armouryByName)) {
      const ki = normalize(key);
      // Look for shared head word match
      const aHead = ki.split('/')[0].trim();
      const bHead = n.split('/')[0].trim();
      if (aHead && (aHead === bHead || aHead.includes(bHead) || bHead.includes(aHead))) {
        return item;
      }
    }
    return null;
  };

  const rangedWeapons = [];
  const meleeWeapons  = [];
  const eqList = model.companionEquipment || model.equipment || [];
  for (const e of eqList) {
    // Determine if ranged or melee
    const t = (e.type || '').toLowerCase();
    const isRanged = /ranged/.test(t) || e.isRanged === true;
    const isMelee  = /melee/.test(t)  || e.isRanged === false;
    if (!isRanged && !isMelee) continue;  // skip armour, shields, etc.
    // Resolve to armoury data
    const found = findArmouryItem(e.name);
    const w = found
      ? {
          type: found.type || (isMelee ? 'Melee' : '2-Handed'),
          range: found.range || (isMelee ? 'Melee' : '24"'),
          weaponKeywords: found.weaponKeywords || [],
        }
      : {
          // Fallback: assume baseline weapon stats
          type: isMelee ? 'Melee' : '2-Handed',
          range: isMelee ? 'Melee' : '24"',
          weaponKeywords: [],
        };
    if (isRanged) rangedWeapons.push(w);
    else          meleeWeapons.push(w);
  }

  const bestIn = (weapons, ctx) => {
    if (!weapons.length) return 0;
    return Math.max(...weapons.map(w => scoreWeaponPotential(w, ctx)));
  };
  return {
    rangedScore: bestIn(rangedWeapons, {}),
    meleeScore:  bestIn(meleeWeapons,  { isMelee: true }),
    contextScores: {
      mid:   bestIn(rangedWeapons, {})                + bestIn(meleeWeapons, { isMelee: true }),
      horde: bestIn(rangedWeapons, { vsHorde: true }) + bestIn(meleeWeapons, { isMelee: true, vsHorde: true }),
      heavy: bestIn(rangedWeapons, { vsHeavy: true }) + bestIn(meleeWeapons, { isMelee: true, vsHeavy: true }),
      elite: bestIn(rangedWeapons, { vsElite: true }) + bestIn(meleeWeapons, { isMelee: true, vsElite: true }),
    },
    // Also expose what we found, for debugging / display
    _rangedNames: rangedWeapons.map(w => w.weaponKeywords.join('+') || '(?)'),
    _meleeNames:  meleeWeapons.map(w => w.weaponKeywords.join('+') || '(?)'),
  };
}

/**
 * Convert an armoury entry to a weapon-shape for scoring.
 */
function _armouryItemToWeapon(item) {
  return {
    type: item.type || '2-Handed',
    range: item.range || 'Melee',
    weaponKeywords: item.weaponKeywords || [],
  };
}

/**
 * For one model: compute the upgrade delta for each candidate armoury item.
 * "Candidates" = items in the faction's ranged/melee armoury that look
 * compatible based on the model's current loadout (we don't enforce strict
 * legality here — the user sees recommendations, the Companion will reject
 * illegal combos at import).
 *
 * Returns { candidates: [{armouryItem, scoreDelta, cost, efficiency, ctxBest}] }
 * sorted by efficiency desc.
 */
function computeBattlekitDelta(model, wb) {
  if (!model || !wb || typeof DATA === 'undefined') {
    return { candidates: [] };
  }
  const faction = DATA.factions[wb.factionId];
  if (!faction || !faction.armoury) return { candidates: [] };

  const current = _scoreCurrentLoadout(model, wb);
  const candidates = [];
  // Combined ranged + melee armoury
  const armouryAll = [
    ...(faction.armoury.ranged || []),
    ...(faction.armoury.melee  || []),
  ];

  // Collect IDs the model already has so we don't recommend duplicates
  const ownedIds = new Set(
    [
      ...((model.equipment || []).map(e => e.id)),
      ...((model.companionEquipment || []).map(e => e.id)),
    ]
  );
  // Also collect names to dedupe by name (companion uses different IDs)
  const ownedNames = new Set(
    [
      ...((model.equipment || []).map(e => (e.name || '').toLowerCase())),
      ...((model.companionEquipment || []).map(e => (e.name || '').toLowerCase())),
    ]
  );

  for (const item of armouryAll) {
    if (ownedIds.has(item.id)) continue;
    if (ownedNames.has((item.name || '').toLowerCase())) continue;
    if (!item.cost) continue;  // skip items with no cost

    // Score the item across all 4 contexts; take the best context for delta
    const w = _armouryItemToWeapon(item);
    const isMelee = /melee/i.test(item.range || '');
    const itemCtxScores = {
      mid:   scoreWeaponPotential(w, { isMelee }),
      horde: scoreWeaponPotential(w, { isMelee, vsHorde: true }),
      heavy: scoreWeaponPotential(w, { isMelee, vsHeavy: true }),
      elite: scoreWeaponPotential(w, { isMelee, vsElite: true }),
    };

    // Delta = how much the upgrade IMPROVES on the current best in each ctx.
    // For ranged item, compare with current best ranged; for melee, with melee.
    const compareSlot = isMelee ? 'meleeScore' : 'rangedScore';
    const currentSlotScore = current[compareSlot];
    // The upgrade only helps if its score > current
    const ctxDeltas = {
      mid:   Math.max(0, itemCtxScores.mid   - currentSlotScore),
      horde: Math.max(0, itemCtxScores.horde - currentSlotScore),
      heavy: Math.max(0, itemCtxScores.heavy - currentSlotScore),
      elite: Math.max(0, itemCtxScores.elite - currentSlotScore),
    };
    const scoreDelta = Math.max(...Object.values(ctxDeltas));
    if (scoreDelta <= 0) continue;  // not an upgrade

    // Find which context gives the best delta (so we can report "best vs heavy")
    let ctxBest = 'mid';
    let ctxBestVal = ctxDeltas.mid;
    for (const [k, v] of Object.entries(ctxDeltas)) {
      if (v > ctxBestVal) { ctxBest = k; ctxBestVal = v; }
    }

    candidates.push({
      armouryItem: item,
      scoreDelta,
      cost: item.cost,
      efficiency: scoreDelta / item.cost,
      ctxBest,
      ctxDeltas,
      slot: isMelee ? 'melee' : 'ranged',
    });
  }
  candidates.sort((a, b) => b.efficiency - a.efficiency);
  return { candidates };
}

/**
 * Top-level recommender for a warband: returns top 3 picks per model,
 * with cost, efficiency, and best-context tag.
 *
 * Returns { byModel: [{modelName, modelUid, topPicks: [...], totalCandidates}] }
 */
function recommendBattlekit(wb) {
  if (!wb || !wb.models) return { byModel: [] };
  const byModel = [];
  for (const m of wb.models) {
    const delta = computeBattlekitDelta(m, wb);
    byModel.push({
      modelName: m.name,
      modelUid: m.uid,
      unitId: m.unitId,
      topPicks: delta.candidates.slice(0, 3),
      totalCandidates: delta.candidates.length,
    });
  }
  return { byModel };
}

/**
 * Returns the deploy limits for a scenario+role combination.
 * Most scenarios deploy ALL models (returns max=Infinity).
 * Some have specific caps:
 *   - mines / resupply / dont-breathe: defender=6, attacker=6+D3 (modeled
 *     as 9 — average of 6+D3=6+(1+2+3)/3=8 rounded up to upper bound for
 *     planning; user can adjust)
 *   - relic-hunt (III): max 6 each (40mm bases count as 2)
 *   - from-below (VIII): half the models, round up
 *
 * Returns { max, min, hasReinforcements, role }
 */
function getScenarioDeployLimit(scenarioId, role) {
  const scn = SCENARIOS_CATALOG[scenarioId];
  if (!scn) return { max: Infinity, min: 0, hasReinforcements: false };

  // Specific limits encoded in catalog
  if (scn.deployLimit) {
    const dl = scn.deployLimit;
    if (typeof dl === 'object' && !Array.isArray(dl)) {
      const r = role || 'normal';
      let max = (typeof dl[r] === 'number') ? dl[r]
              : (typeof dl.max === 'number') ? dl.max
              : Infinity;
      // Special: 'half-up' (From Below) → half models, round up — must be
      // resolved by caller passing totalModels via opts. If not provided,
      // we return null max as a sentinel — recommendDeploymentForScenario
      // handles this case downstream.
      if (dl[r] === 'half-up' || dl.normal === 'half-up') {
        return {
          max: 'half-up',
          min: 1,
          hasReinforcements: !!dl.hasReinforcements,
          bigBaseDoubleCost: !!dl.bigBaseDoubleCost,
          role: r,
        };
      }
      return {
        max,
        min: 1,
        hasReinforcements: !!dl.hasReinforcements,
        bigBaseDoubleCost: !!dl.bigBaseDoubleCost,
        role: r,
      };
    }
    if (typeof dl === 'number') {
      return { max: dl, min: 1, hasReinforcements: false, role: role || 'normal' };
    }
  }

  // Default: deploy all models
  return { max: Infinity, min: 0, hasReinforcements: false, role: role || 'normal' };
}

/**
 * Recommends which models to deploy when the warband exceeds the
 * scenario's deploy limit. Returns { exceeds, deploy, bench, reasoning }.
 *
 * deploy: array of models to bring (length ≤ limit.max), each with .reason
 * bench: array of models to leave behind (or available as reinforcements)
 *
 * Selection strategy depends on scenario archetype (canonical scoring):
 *   - hold-ground / capture-hold: prioritize LEADER, ELITE high-impact,
 *     mobility, support
 *   - hunt-heroes: prioritize ranged + ELITE killers (snipers)
 *   - assault-defense (defender): prioritize tanks, set-mine, ranged
 *   - assault-defense (attacker): prioritize chargers, mobility, AoE
 *   - great-war: prioritize raw kills/cost (efficient damage dealers)
 */
function recommendDeploymentForScenario(wb, scenarioId, role) {
  const scn = SCENARIOS_CATALOG[scenarioId];
  if (!wb || !wb.models || !scn) return { exceeds: false, deploy: [], bench: [], scenario: scn };
  const limit = getScenarioDeployLimit(scenarioId, role);
  const totalModels = wb.models.length;

  // Resolve 'half-up' (From Below): half rounded up
  let resolvedMax = limit.max;
  if (resolvedMax === 'half-up') {
    resolvedMax = Math.ceil(totalModels / 2);
    limit.max = resolvedMax;  // mutate so caller sees the resolved value
  }

  // No limit OR fits → deploy everyone
  if (resolvedMax === Infinity || totalModels <= resolvedMax) {
    return {
      exceeds: false,
      deploy: wb.models.map(m => ({ ...m, reason: 'Sin límite — toda la banda despliega.' })),
      bench: [],
      limit,
      scenario: scn,
      role: limit.role,
    };
  }

  // Need to pick top N. Score each model based on archetype + role.
  const archetype = scn.archetype || 'hold-ground';

  // Build a battle-band view to extract abilities
  let battleBand = null;
  try { battleBand = buildBattleBandFromWarband(wb); }
  catch (e) {}

  function scoreModel(model, idx) {
    const kw = (model.companionKeywords || []).map(k => (k.name || k || '').toUpperCase());
    const isLeader = kw.includes('LEADER');
    const isElite = kw.includes('ELITE');
    const isTough = kw.includes('TOUGH');
    const hasFlying = kw.includes('FLYING');
    const hasInfiltrator = kw.includes('INFILTRATOR');
    const hasFear = kw.includes('FEAR');
    const cost = model.companionCost || 0;
    const bm = battleBand && battleBand[idx];
    const meleeDice = bm ? (bm.meleeDice || 0) : 0;
    const rangedDice = bm ? (bm.rangedDice || 0) : 0;
    // Detect weapon kit profile
    const weapons = (model.equipment || []).filter(e => e.isRanged !== undefined);
    const hasIgnoreArmour = weapons.some(w =>
      (w.keywords || []).some(k => /ignore.armour|armour.piercing/i.test(k))
    );
    const hasBlast = weapons.some(w =>
      (w.keywords || []).some(k => /blast/i.test(k))
    );
    const hasCritical = weapons.some(w =>
      (w.keywords || []).some(k => /critical/i.test(k))
    );
    const hasHeavyMelee = weapons.some(w =>
      !w.isRanged && (w.keywords || []).some(k => /heavy/i.test(k))
    );
    const hasSetMine = bm && bm.setMine;
    const hasGodIsWithUs = bm && bm.godIsWithUs;
    const hasShockCharge = bm && bm.shockCharge;
    const hasHYF = bm && bm.holdYourFire;
    const hasAim = bm && bm.aim;

    // Base score: LEADER and ELITE are baseline mandatory
    let score = 0;
    let reasons = [];
    if (isLeader) {
      score += 100;
      reasons.push('LEADER (Morale Checks +1 DICE)');
    }
    if (isElite) {
      score += 30;
      reasons.push('ELITE (puede ganar XP)');
    }
    if (isTough) {
      score += 15;
    }

    // Always count combat dice contribution as a baseline (regardless of
    // archetype) so non-Elite Troops still rank above Yeomen with no kit.
    // The archetype-specific bonuses below shape final priorities.
    score += meleeDice * 5;
    score += rangedDice * 5;

    // Archetype-specific scoring
    if (archetype === 'hold-ground') {
      // Premia survivability + shooters
      score += rangedDice * 20;
      score += isTough ? 25 : 0;
      if (hasHYF) { score += 25; reasons.push('HYF para neutralizar threats'); }
      if (hasGodIsWithUs) { score += 20; reasons.push('aura support'); }
      if (rangedDice >= 1) reasons.push('rifle para defender objectives');
    } else if (archetype === 'capture-hold' || archetype === 'high-ground') {
      // Premia mobility + Diving Charge
      if (hasFlying) { score += 60; reasons.push('FLYING (Diving Charge VPs)'); }
      if (hasInfiltrator) { score += 40; reasons.push('INFILTRATOR (alcanza objectives lejanos)'); }
      score += meleeDice * 15;
      if (hasShockCharge) { score += 20; reasons.push('Shock Charge para reach'); }
    } else if (archetype === 'hunt-heroes') {
      // Premia anti-elite + snipers
      if (hasCritical && rangedDice >= 1) { score += 50; reasons.push('CRITICAL ranged (anti-ELITE)'); }
      if (hasIgnoreArmour) { score += 35; reasons.push('IGNORE ARMOUR'); }
      if (hasAim) { score += 20; reasons.push('Aim ACTION'); }
      score += rangedDice * 15;
      if (isElite && meleeDice >= 2) {
        score += 25;
        reasons.push('Elite melee killer');
      }
    } else if (archetype === 'assault-defense') {
      const isDefender = (role === 'defender');
      if (isDefender) {
        // Defender: tanks, mines, ranged
        if (hasSetMine) { score += 100; reasons.push('Set Mine (esencial defender)'); }
        if (isTough) { score += 30; reasons.push('TOUGH (resiste asalto)'); }
        score += rangedDice * 20;
        if (hasHYF) { score += 25; reasons.push('HYF marca attacker top'); }
      } else {
        // Attacker: chargers, mobility, AoE
        if (hasFlying) { score += 50; reasons.push('FLYING (atraviesa defensas)'); }
        if (hasShockCharge) { score += 30; reasons.push('Shock Charge'); }
        if (hasBlast) { score += 30; reasons.push('BLAST (clusters defensores)'); }
        if (hasIgnoreArmour) { score += 25; reasons.push('IGNORE ARMOUR'); }
        score += meleeDice * 15;
      }
    } else if (archetype === 'great-war') {
      // Premia DPS puro
      score += meleeDice * 12;
      score += rangedDice * 12;
      if (hasIgnoreArmour) { score += 35; reasons.push('IGNORE ARMOUR (mata cualquier cosa)'); }
      if (hasCritical) { score += 25; reasons.push('CRITICAL'); }
      if (hasBlast) { score += 25; reasons.push('BLAST'); }
      // En Great War cada modelo del rival OoA = VPs ≈ cost/10
      // Cost-efficient damage = win
      const efficiency = cost > 0 ? (meleeDice + rangedDice) * 10 / cost : 0;
      score += efficiency * 5;
    }

    // Penalize fearful units in roles where charges are key
    if (hasFear && (archetype === 'capture-hold' || archetype === 'high-ground') && !isLeader) {
      score -= 5;
    }

    // Fallback reason if none added
    if (reasons.length === 0) {
      if (rangedDice >= 1) reasons.push('contribución a fuego ranged');
      else if (meleeDice >= 1) reasons.push('contribución a mêlée');
      else reasons.push('llena hueco de Field Strength');
    }

    return { model, score, reasons, idx };
  }

  // Score and sort
  const scored = wb.models.map((m, idx) => scoreModel(m, idx));
  scored.sort((a, b) => b.score - a.score);

  const deploy = scored.slice(0, resolvedMax).map(s => ({
    ...s.model,
    reason: s.reasons.slice(0, 2).join(' · '),
    score: s.score,
  }));
  const bench = scored.slice(resolvedMax).map(s => ({
    ...s.model,
    reason: s.reasons.slice(0, 1).join(' · ') || 'menor prioridad para este scenario',
    score: s.score,
  }));

  return {
    exceeds: true,
    deploy, bench,
    limit,
    scenario: scn,
    role: limit.role,
  };
}

function computeCoverageMatrix(wb) {
  const empty = { score: 0, count: 0, label: 'low' };
  const result = {
    antiArmour:  { ...empty },
    antiHorde:   { ...empty },
    antiElite:   { ...empty },
    antiFear:    { ...empty },
    resilience:  { ...empty },
    mobility:    { ...empty },
  };
  if (!wb || !Array.isArray(wb.models)) return result;

  let battleBand;
  try { battleBand = buildBattleBandFromWarband(wb); }
  catch (e) { return result; }

  return _computeCoverageFromBattleBand(battleBand);
}

/**
 * Core coverage computation from a battleBand (already-built model
 * objects with .weapons, .keywords, etc.). Used by computeCoverageMatrix
 * (via warband) and computeFactionBenchmarks_lab (via ENEMY_FACTORIES).
 */
function _computeCoverageFromBattleBand(battleBand) {
  const empty = { score: 0, count: 0, label: 'low' };
  const result = {
    antiArmour:  { ...empty },
    antiHorde:   { ...empty },
    antiElite:   { ...empty },
    antiFear:    { ...empty },
    resilience:  { ...empty },
    mobility:    { ...empty },
  };
  if (!Array.isArray(battleBand) || battleBand.length === 0) return result;

  const allWeapons = battleBand.flatMap(m => m.weapons || []);
  const countWpnKw = (kw) => allWeapons.filter(w => w.keywords && w.keywords.has(kw)).length;
  const hasModelKw = (kw) => battleBand.filter(m => m.keywords && m.keywords.has(kw)).length;

  // ── antiArmour ────────────────────────────────────────────────────
  // Each IGNORE ARMOUR / ARMOUR-PIERCING weapon counts. Anti-Tank Hammer
  // and similar with -2 INJURY MODIFIER bypass also count.
  {
    const cnt = countWpnKw('IGNORE ARMOUR') + countWpnKw('ARMOUR-PIERCING');
    // Saturation at 4+ weapons
    result.antiArmour.count = cnt;
    result.antiArmour.score = Math.min(100, Math.round((cnt / 4) * 100));
  }

  // ── antiHorde ─────────────────────────────────────────────────────
  // BLAST + AUTOMATIC + FLAMETHROWER. Saturation at 4+.
  {
    const cnt = countWpnKw('BLAST') + countWpnKw('BLAST 2"') + countWpnKw('BLAST 3"') +
                countWpnKw('AUTOMATIC 2') + countWpnKw('AUTOMATIC 3') +
                countWpnKw('FLAMETHROWER');
    result.antiHorde.count = cnt;
    result.antiHorde.score = Math.min(100, Math.round((cnt / 4) * 100));
  }

  // ── antiElite ─────────────────────────────────────────────────────
  // CRITICAL, DEADLY, IGNORE ARMOUR all help. Saturation at 5+.
  {
    const cnt = countWpnKw('CRITICAL') + countWpnKw('DEADLY') +
                countWpnKw('IGNORE ARMOUR');
    result.antiElite.count = cnt;
    result.antiElite.score = Math.min(100, Math.round((cnt / 5) * 100));
  }

  // ── antiFear ──────────────────────────────────────────────────────
  // NEGATE FEAR keyword on models, plus Cleric aura (Onward).
  {
    const negFear = hasModelKw('NEGATE FEAR');
    const hasOnwardCleric = battleBand.some(m => m.onwardChristianSoldiers);
    // If any Onward-aura Cleric, all NEW ANTIOCH allies effectively have NEGATE FEAR
    const naAllies = hasOnwardCleric
      ? battleBand.filter(m => m.keywords && m.keywords.has('NEW ANTIOCH')).length
      : 0;
    const effectiveCovered = Math.max(negFear, naAllies);
    result.antiFear.count = effectiveCovered;
    // Score: % of band covered, with bonus if Cleric aura active
    const pctCovered = (effectiveCovered / Math.max(1, battleBand.length)) * 100;
    result.antiFear.score = Math.min(100, Math.round(pctCovered));
  }

  // ── resilience ────────────────────────────────────────────────────
  // Field Strength: number of models. Bonus per TOUGH and per armour >=2.
  // Saturation at 12+ models with average armour 1+ and 2+ TOUGH models.
  {
    const nModels = battleBand.length;
    const tough = battleBand.filter(m => m.tough || (m.keywords && m.keywords.has('TOUGH'))).length;
    const heavyArmour = battleBand.filter(m => (m.armour || 0) >= 2).length;
    const avgArmour = nModels ? battleBand.reduce((s, m) => s + (m.armour || 0), 0) / nModels : 0;
    // Composite: 60% field strength, 25% armour, 15% TOUGH presence
    const fsScore = Math.min(60, (nModels / 12) * 60);
    const armourScore = Math.min(25, (avgArmour / 2) * 25);
    const toughScore = Math.min(15, (tough / 2) * 15);
    result.resilience.count = nModels;
    result.resilience.score = Math.round(fsScore + armourScore + toughScore);
  }

  // ── mobility ──────────────────────────────────────────────────────
  // FLYING (top tier), INFILTRATOR (advanced deploy), IGNORE DEFENDED OBSTACLE
  // (charge through trenches), FAST. Saturation at ~5 mobility "tools".
  {
    const flying = hasModelKw('FLYING');
    const infiltrator = hasModelKw('INFILTRATOR');
    const ignoreDef = hasModelKw('IGNORE DEFENDED OBSTACLE');
    const fast = hasModelKw('FAST');
    // FLYING is worth 2x; INFILTRATOR worth 1.5x
    const score = (flying * 2) + (infiltrator * 1.5) + ignoreDef + fast;
    result.mobility.count = flying + infiltrator + ignoreDef + fast;
    result.mobility.score = Math.min(100, Math.round((score / 6) * 100));
  }

  // Apply labels
  for (const dim of ['antiArmour','antiHorde','antiElite','antiFear','resilience','mobility']) {
    const s = result[dim].score;
    result[dim].label = s < 30 ? 'low' : s < 70 ? 'medium' : 'high';
  }

  return result;
}

/**
 * Computes coverage matrix for each canonical enemy faction. Alias of
 * computeFactionBenchmarks_lab — both return the same shape. New code
 * prefers this name for clarity ("averages" of canon faction profiles).
 *
 * Memoized via the underlying function. Cache scoped to page lifetime.
 *
 * Returns map { factionId: coverageMatrix }.
 */
function computeFactionAverages_lab(opts) {
  return computeFactionBenchmarks_lab();
}

/**
 * Computes the coverage matrix for each canonical enemy faction. Used as
 * benchmark for cross-faction comparison. Cached after first call.
 *
 * The base values come from running computeCoverageMatrix on each
 * ENEMY_FACTORIES band (700 ducat balanced sample). However, those
 * synthetic bands underrepresent some dimensions because enemy weapons
 * don't carry full keyword detail. We layer canon-aware overrides on top
 * to reflect what each faction CAN typically achieve at 700 ducats with
 * standard armoury access (Frag Grenades, Cleric NEGATE FEAR, etc.).
 *
 * Returns { [factionId]: { antiArmour, antiHorde, antiElite, antiFear,
 * resilience, mobility } } where each dimension has {score, count, label}.
 */
let _factionBenchmarksCache = null;

// Canon-aware floor for each dimension per faction. Calibrated from the
// faction armoury tables and typical 700 ducat lists (e.g., NA usually
// fields a Cleric for NEGATE FEAR aura, so antiFear floor=40). Synthetic
// benchmarks below this floor are raised to it.
const _FACTION_CANON_FLOOR = {
  newAntioch: {
    antiArmour: 30,   // Anti-Tank Hammer / Frag Grenades widely accessible
    antiHorde:  35,   // Frag Grenades in armoury
    antiElite:  60,   // Lt + Sniper Priest combo standard
    antiFear:   40,   // Trench Cleric (NEGATE FEAR aura) standard pick
    resilience: 50,   // MHI + Reinforced Armour
    mobility:   25,   // Highland regional rule (IGNORE DEFENDED OBSTACLE)
  },
  trenchPilgrims: {
    antiArmour: 25,   // Trench Sledgehammer access
    antiHorde:  30,   // Frag Grenades
    antiElite:  50,   // Castigator + Sniper Priest
    antiFear:   55,   // War Prophet + Stigmatic Nun support
    resilience: 60,   // REGENERATE + Memento Mori + Anointed
    mobility:   20,   // Mostly infantry, no FLYING/INFILTRATOR baseline
  },
  ironSultanate: {
    antiArmour: 40,   // Mubarizun + Sapper Demolition
    antiHorde:  35,   // Sultanate Grand Cannon access
    antiElite:  50,   // Mubarizun anti-TOUGH bonus
    antiFear:   50,   // Yüzbaşı NEGATE FEAR + Janissary
    resilience: 55,   // STRONG + Reinforced Armour
    mobility:   30,   // Lions of Jabir + Assassin INFILTRATOR
  },
  hereticLegions: {
    antiArmour: 60,   // War Wolf + Brazen Bull (IGNORE ARMOUR + FLAMETHROWER)
    antiHorde:  45,   // Brazen Bull FLAMETHROWER + Frag Grenades
    antiElite:  70,   // Death Commando + Heretic Priest + War Wolf
    antiFear:   25,   // Some negate but mostly FEAR-emitting
    resilience: 55,   // Anointed Heavy Infantry + Wretched econ
    mobility:   40,   // War Wolf + Hounds equivalent
  },
  blackGrail: {
    antiArmour: 45,   // Lord of Tumours Crushing Blows + Viscera Cannon
    antiHorde:  40,   // Plague Knight Putrid Shotgun BLAST
    antiElite:  45,   // Lord of Tumours TOUGH duelist
    antiFear:   15,   // Mostly FEAR-emitting (low antiFear inversely useful)
    resilience: 65,   // TOUGH dominant + plague mechanics
    mobility:   45,   // Hounds + Heralds FLYING access
  },
  courtSerpent: {
    antiArmour: 40,   // Burning Inferno + Beelzebub's Axe
    antiHorde:  50,   // Yoke Fiends CLEAVE 2 + Goetic spells
    antiElite:  60,   // Praetor TOUGH apex + Sorcerer
    antiFear:   30,   // Mostly cause FEAR themselves
    resilience: 55,   // Praetor + Wretched Law of Hell
    mobility:   75,   // Praetor/Sorcerer FLYING + universal
  },
};

function computeFactionBenchmarks_lab() {
  if (_factionBenchmarksCache) return _factionBenchmarksCache;
  if (typeof ENEMY_FACTORIES !== 'object') return {};
  const out = {};
  for (const [factionId, factory] of Object.entries(ENEMY_FACTORIES)) {
    try {
      const battleBand = factory();
      const synthetic = _computeCoverageFromBattleBand(battleBand);
      // Layer canon floor on top (max of synthetic and floor)
      const floor = _FACTION_CANON_FLOOR[factionId];
      if (floor) {
        for (const dim of ['antiArmour','antiHorde','antiElite','antiFear','resilience','mobility']) {
          const synScore = (synthetic[dim] && typeof synthetic[dim].score === 'number')
            ? synthetic[dim].score : 0;
          const finalScore = Math.max(synScore, floor[dim] || 0);
          // Recompute label from final score
          const label = finalScore >= 50 ? 'high' : finalScore >= 25 ? 'mid' : 'low';
          synthetic[dim] = { ...synthetic[dim], score: finalScore, label };
        }
      }
      out[factionId] = synthetic;
    } catch (e) {
      console.warn('benchmark failed for', factionId, e);
    }
  }
  _factionBenchmarksCache = out;
  return out;
}

/**
 * Compares user warband coverage against canonical faction benchmarks.
 * Returns dimension-by-dimension ranking + insights.
 *
 * For each dimension, the user is ranked among 7 entries (themselves +
 * 6 factions). Rank 1 = best, rank 7 = worst.
 *
 * Returns:
 *   {
 *     dimensions: [{
 *       dimension: 'antiArmour',
 *       userScore: 25,
 *       factionScores: { 'newAntioch': 60, 'trenchPilgrims': 30, ... },
 *       rank: 5,        // user position (1=best, 7=worst)
 *       outOf: 7,
 *       median: 45,     // median score across factions+user
 *     }, ...],
 *     insights: [{ text, severity }, ...]
 *   }
 */
function compareCoverageVsFactions_lab(userCov, benchmarks) {
  if (!userCov || !benchmarks) {
    return { dimensions: [], insights: [] };
  }
  const dimNames = ['antiArmour','antiHorde','antiElite','antiFear','resilience','mobility'];
  const factionLabels = {
    newAntioch:        'New Antioch',
    trenchPilgrims:    'Trench Pilgrims',
    ironSultanate:     'Iron Sultanate',
    hereticLegions:    'Heretic Legions',
    blackGrail:        'Black Grail',
    courtSerpent:      'Court of the Serpent',
  };
  const dimLabels = {
    antiArmour: 'Anti-Armour',
    antiHorde:  'Anti-Horda',
    antiElite:  'Anti-Élite',
    antiFear:   'Anti-Fear',
    resilience: 'Resiliencia',
    mobility:   'Movilidad',
  };

  const dimensions = dimNames.map(dim => {
    const userScore = (userCov[dim] && typeof userCov[dim].score === 'number')
      ? userCov[dim].score : 0;
    const factionScores = {};
    const allScores = [userScore];
    for (const [fid, fcov] of Object.entries(benchmarks)) {
      const sc = (fcov[dim] && typeof fcov[dim].score === 'number') ? fcov[dim].score : 0;
      factionScores[fid] = sc;
      allScores.push(sc);
    }
    // Rank user (descending — rank 1 = best)
    const sorted = [...allScores].sort((a, b) => b - a);
    const rank = sorted.indexOf(userScore) + 1;
    // Median
    const sortedAsc = [...allScores].sort((a, b) => a - b);
    const mid = Math.floor(sortedAsc.length / 2);
    const median = sortedAsc.length % 2 === 0
      ? (sortedAsc[mid - 1] + sortedAsc[mid]) / 2
      : sortedAsc[mid];
    return {
      dimension: dim,
      label: dimLabels[dim] || dim,
      userScore,
      factionScores,
      rank,
      outOf: allScores.length,
      median,
    };
  });

  // Build insights from extreme rankings
  const insights = [];
  // Strengths: rank ≤ 2
  const strengths = dimensions.filter(d => d.rank <= 2 && d.userScore >= 40);
  if (strengths.length) {
    const top = strengths[0];
    const factionsBeaten = Object.entries(top.factionScores)
      .filter(([_, sc]) => sc < top.userScore)
      .map(([fid, _]) => factionLabels[fid] || fid);
    insights.push({
      severity: 'good',
      text: `<strong>${top.label} es tu fortaleza cross-faction</strong>: rank ${top.rank}/${top.outOf} (score ${top.userScore}/100). Superas a ${factionsBeaten.length} de 6 facciones canónicas. Construye tu plan en torno a esta dimensión.`,
    });
  }
  // Critical weaknesses: rank ≥ 6 AND userScore < median - 15
  const weaknesses = dimensions.filter(d =>
    d.rank >= 6 && d.userScore < d.median - 15
  );
  if (weaknesses.length) {
    const worst = weaknesses[0];
    const bestFaction = Object.entries(worst.factionScores)
      .reduce((best, [fid, sc]) => sc > best.score ? { fid, score: sc } : best, { fid: null, score: -1 });
    const fLabel = bestFaction.fid ? (factionLabels[bestFaction.fid] || bestFaction.fid) : '—';
    insights.push({
      severity: 'crit',
      text: `<strong>${worst.label} es tu debilidad crítica cross-faction</strong>: rank ${worst.rank}/${worst.outOf} (score ${worst.userScore}/100, mediana ${worst.median.toFixed(0)}). ${fLabel} alcanza ${bestFaction.score}/100 en esta dimensión — vs ellos sufrirás. Revisa las sugerencias de upgrade.`,
    });
  }
  // Below median in 3+ dimensions: structural concern
  const belowMedian = dimensions.filter(d => d.userScore < d.median).length;
  if (belowMedian >= 4) {
    insights.push({
      severity: 'warn',
      text: `<strong>Composición por debajo de la mediana cross-faction</strong> en ${belowMedian}/6 dimensiones. Tu banda es generalista y no destaca en ningún eje. Considera especializarte: identifica 1-2 dimensiones clave para tu archetype favorito y refuerza esas.`,
    });
  }
  // Above median in 5+ dimensions: well-rounded
  const aboveMedian = dimensions.filter(d => d.userScore > d.median).length;
  if (aboveMedian >= 5) {
    insights.push({
      severity: 'good',
      text: `<strong>Composición sólida cross-faction</strong>: por encima de la mediana en ${aboveMedian}/6 dimensiones. Tu banda es versátil y puede adaptarse a cualquier scenario sin huecos críticos.`,
    });
  }

  return { dimensions, insights };
}

/**
 * Renders an SVG radar chart visualizing the user's coverage scores
 * overlaid on all canonical faction benchmarks. Returns an SVG string
 * suitable for inserting into innerHTML.
 *
 * Layout: 6 axes radiating from center (one per dimension), each
 * normalized to 0-100 → 0-radius. Grid is 4 concentric polygon rings
 * at 25/50/75/100. Each faction polygon is semi-transparent with its
 * own color. The user's polygon is rendered last (top-most) with a
 * thick gold stroke and 30% gold fill.
 *
 * @param {Object} comparison - output of compareCoverageVsFactions_lab
 *   { dimensions: [{ key, label, userScore, factionScores, ... }], insights }
 * @param {string} userLabel - display name for the user's band
 * @returns {string} SVG markup
 */
function renderCoverageRadarSVG(comparison, userLabel) {
  if (!comparison || !Array.isArray(comparison.dimensions) || comparison.dimensions.length === 0) {
    return '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"></svg>';
  }
  const dims = comparison.dimensions;
  const N = dims.length;
  // SVG geometry: 540x520 viewport. Center (270,260). Radius 155.
  // 100px+ padding on sides for labels (especially 'Resiliencia' which
  // is a long word landing on the left axis).
  const W = 540;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const radius = 155;
  // Pre-compute axis angles. -π/2 puts first axis at top (12 o'clock).
  // Going clockwise.
  const angleFor = (i) => -Math.PI / 2 + (2 * Math.PI * i) / N;
  // Map score (0-100) on axis i → (x, y) point
  const pointAt = (i, score) => {
    const r = (Math.max(0, Math.min(100, score)) / 100) * radius;
    const a = angleFor(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  // Faction palette — colorblind-friendly enough, distinguishable on dark bg
  const factionColors = {
    newAntioch:     '#e8c547',  // gold
    trenchPilgrims: '#b0c987',  // sage
    ironSultanate:  '#d4915e',  // copper
    hereticLegions: '#c84545',  // crimson
    blackGrail:     '#7a5c8e',  // plum
    courtSerpent:   '#5a9bb0',  // steel blue
  };
  const factionLabels = {
    newAntioch:     'New Antioch',
    trenchPilgrims: 'Trench Pilgrims',
    ironSultanate:  'Iron Sultanate',
    hereticLegions: 'Heretic Legions',
    blackGrail:     'Black Grail',
    courtSerpent:   'Court of Serpent',
  };
  const factionOrder = ['newAntioch','trenchPilgrims','ironSultanate','hereticLegions','blackGrail','courtSerpent'];

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto;display:block;margin:0 auto;font-family:var(--font-mono,monospace);">`;

  // ─── Grid rings (4 concentric polygons at 25, 50, 75, 100) ────────────
  for (const level of [25, 50, 75, 100]) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const [px, py] = pointAt(i, level);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    const opacity = level === 100 ? 0.5 : 0.18;
    svg += `<polygon points="${pts.join(' ')}" fill="none" stroke="#7f6b43" stroke-width="${level === 100 ? 1.2 : 0.6}" stroke-opacity="${opacity}" />`;
  }
  // Tick labels at slight angle off-axis so they don't collide with the
  // top axis label (Anti-Armour). Render between axis 0 and axis 1.
  const tickAngle = -Math.PI / 2 + (Math.PI / N);  // halfway between axis 0 and 1
  for (const level of [25, 50, 75, 100]) {
    const r = (level / 100) * radius;
    const tx = cx + r * Math.cos(tickAngle);
    const ty = cy + r * Math.sin(tickAngle);
    svg += `<text x="${(tx + 4).toFixed(1)}" y="${(ty + 3).toFixed(1)}" font-size="9" fill="#7f6b43" opacity="0.55">${level}</text>`;
  }

  // ─── Axis lines from center ───────────────────────────────────────────
  for (let i = 0; i < N; i++) {
    const [ex, ey] = pointAt(i, 100);
    svg += `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#7f6b43" stroke-width="0.5" stroke-opacity="0.3" />`;
  }

  // ─── Faction polygons (semi-transparent, drawn underneath user) ──────
  for (const fid of factionOrder) {
    const color = factionColors[fid] || '#888';
    const pts = [];
    let hasData = false;
    for (let i = 0; i < N; i++) {
      const score = (dims[i].factionScores && typeof dims[i].factionScores[fid] === 'number')
        ? dims[i].factionScores[fid] : 0;
      if (score > 0) hasData = true;
      const [px, py] = pointAt(i, score);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    if (!hasData) continue;
    svg += `<polygon points="${pts.join(' ')}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1.2" stroke-opacity="0.55" />`;
  }

  // ─── User polygon (drawn last, on top, highly visible) ───────────────
  const userPts = [];
  for (let i = 0; i < N; i++) {
    const [px, py] = pointAt(i, dims[i].userScore || 0);
    userPts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  // Background "halo" stroke for contrast, then main gold stroke
  svg += `<polygon points="${userPts.join(' ')}" fill="#d4a017" fill-opacity="0.28" stroke="#1a0f08" stroke-width="5" stroke-linejoin="round" />`;
  svg += `<polygon points="${userPts.join(' ')}" fill="none" stroke="#d4a017" stroke-width="2.5" stroke-linejoin="round" />`;

  // Vertex dots on user polygon
  for (let i = 0; i < N; i++) {
    const [px, py] = pointAt(i, dims[i].userScore || 0);
    svg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="#d4a017" stroke="#1a0f08" stroke-width="1" />`;
  }

  // ─── Axis labels (dimension names + user score per axis) ─────────────
  for (let i = 0; i < N; i++) {
    const a = angleFor(i);
    const labelR = radius + 22;
    const lx = cx + labelR * Math.cos(a);
    const ly = cy + labelR * Math.sin(a);
    // Anchor based on position
    let anchor = 'middle';
    if (Math.cos(a) > 0.3) anchor = 'start';
    else if (Math.cos(a) < -0.3) anchor = 'end';
    // Vertical alignment via dy
    let dy = 4;
    if (Math.sin(a) < -0.5) dy = -2;       // top
    else if (Math.sin(a) > 0.5) dy = 12;   // bottom
    const label = dims[i].label || dims[i].key;
    const userScore = dims[i].userScore || 0;
    // Score color matches rank: top-2 green, bottom red, mid amber
    const rank = dims[i].rank || 99;
    const outOf = dims[i].outOf || 7;
    const scoreColor = rank <= 2 ? '#7fb069'
      : rank >= outOf ? '#c92424'
      : '#d4a017';
    svg += `<text x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}" font-size="11" font-weight="600" fill="#e8d9b8" text-anchor="${anchor}">${label}</text>`;
    // Score below the label, with rank on the same line but in dimmed style.
    // Use shifted x for the rank tspan so it doesn't overflow on left-anchored
    // labels. Approach: render score (anchor stays), then rank as a separate
    // text element on a third line.
    const scoreDy = dy + 13;
    svg += `<text x="${lx.toFixed(1)}" y="${(ly + scoreDy).toFixed(1)}" font-size="10" font-weight="700" fill="${scoreColor}" text-anchor="${anchor}">${userScore}</text>`;
    const rankDy = scoreDy + 11;
    svg += `<text x="${lx.toFixed(1)}" y="${(ly + rankDy).toFixed(1)}" font-size="8" fill="#7f6b43" text-anchor="${anchor}">${rank}/${outOf}</text>`;
  }

  svg += '</svg>';
  return svg;
}

/**
 * Generates an array of tactical insights based on a warband composition
 * and its simulated matchup results. Each insight is { text, severity }.
 * Severity levels:
 *   - 'crit': major weakness or composition red flag
 *   - 'warn': non-trivial improvement opportunity
 *   - 'info': observation / contextual reminder
 *   - 'good': strength worth highlighting
 *
 * Heuristics check:
 *   - Líder en peligro (LEADER outRate >= 0.65)
 *   - Cobertura ofensiva por keyword (anti-armour, anti-horde, anti-elite, anti-fear)
 *   - Tamaño de banda (Field Strength)
 *   - MVP / weakest model
 *   - Best/worst matchup
 *   - Reminder sobre abilities poseídas (HYF, Aim, Cleric, etc.)
 */
function generateTacticalAnalysis(wb, matchupResults) {
  const insights = [];
  if (!wb || !Array.isArray(wb.models)) return insights;

  const models = wb.models;
  const nModels = models.length;

  // Inventory of weapons across all models
  const weaponNames = [];
  const weaponKws = new Set();
  for (const m of models) {
    for (const eq of (m.companionEquipment || [])) {
      if (eq.type === 'ranged weapon' || eq.type === 'melee weapon' || eq.type === 'grenade') {
        weaponNames.push(eq.name);
      }
    }
    for (const kw of (m.companionKeywords || [])) {
      const name = (kw.name || '').toUpperCase();
      if (name) weaponKws.add(name);
    }
  }
  // Build battle band to inspect normalized weapon keywords
  let battleBand;
  try { battleBand = buildBattleBandFromWarband(wb); }
  catch (e) { battleBand = []; }
  const allWpns = battleBand.flatMap(m => m.weapons || []);

  // Counters
  const countKw = (kw) => allWpns.filter(w => w.keywords && w.keywords.has(kw)).length;
  const nIgnoreArmour = countKw('IGNORE ARMOUR') + countKw('ARMOUR-PIERCING');
  const nBlast        = countKw('BLAST') + countKw('BLAST 2"') + countKw('BLAST 3"');
  const nFlamethrower = countKw('FLAMETHROWER');
  const nAutomatic    = countKw('AUTOMATIC 2') + countKw('AUTOMATIC 3');
  const nCritical     = countKw('CRITICAL');
  const nDeadly       = countKw('DEADLY');
  const nAntiHorde    = nBlast + nFlamethrower + nAutomatic;
  const nAntiElite    = nCritical + nDeadly + nIgnoreArmour;

  // Anti-fear coverage: any model with NEGATE FEAR or any Cleric with Onward
  const hasNegateFear = battleBand.some(m =>
    (m.keywords && m.keywords.has('NEGATE FEAR')) ||
    m.onwardChristianSoldiers
  );
  const hasCleric = battleBand.some(m => m.godIsWithUs || m.onwardChristianSoldiers);

  // ── Líder en peligro ────────────────────────────────────────────────
  // For each matchup, check if there's a LEADER model with very high outRate
  if (matchupResults && matchupResults.length) {
    let leaderOutRates = [];
    for (const r of matchupResults) {
      if (!r.perModelA) continue;
      // The leader is at index 0 (Companion convention) or has LEADER kw in battleBand
      const leaderIdx = battleBand.findIndex(m =>
        m.keywords && m.keywords.has('LEADER')
      );
      if (leaderIdx >= 0 && r.perModelA[leaderIdx]) {
        leaderOutRates.push({ enemy: r.enemyLabel, rate: r.perModelA[leaderIdx].outRate, name: r.perModelA[leaderIdx].name });
      }
    }
    if (leaderOutRates.length) {
      const avgLeaderOut = leaderOutRates.reduce((s, x) => s + x.rate, 0) / leaderOutRates.length;
      const worstLeader = leaderOutRates.reduce((a, b) => a.rate > b.rate ? a : b);
      if (avgLeaderOut >= 0.65) {
        insights.push({
          severity: 'crit',
          text: `Tu líder (${worstLeader.name}) cae en ${(avgLeaderOut * 100).toFixed(0)}% de las partidas en promedio. Es target prioritario del rival. Considera Counter-Charge upgrade, Reinforced/Machine Armour, o un Combat Medic / Cleric cerca para revivirlo.`,
        });
      } else if (avgLeaderOut >= 0.45) {
        insights.push({
          severity: 'warn',
          text: `Tu líder (${worstLeader.name}) cae en ${(avgLeaderOut * 100).toFixed(0)}% en promedio. Vulnerabilidad moderada. Mantenlo arropado por Yeomen y considera blindarlo más.`,
        });
      }
    }
  }

  // ── Anti-armour gap ─────────────────────────────────────────────────
  if (nIgnoreArmour < 2) {
    insights.push({
      severity: nIgnoreArmour === 0 ? 'crit' : 'warn',
      text: `Cobertura anti-armour: ${nIgnoreArmour} arma${nIgnoreArmour === 1 ? '' : 's'} con IGNORE ARMOUR/ARMOUR-PIERCING. Vs facciones con armadura pesada (NA Mechanized, Iron Sultanate Mubarizun, Heretic Brazen Bull, Black Grail Lord of Tumours) tu daño se diluye contra su -2/-3 INJURY MODIFIER. Considera Heavy Flamethrower, Granadas Incendiarias, o Anti-Tank Hammers.`,
    });
  } else if (nIgnoreArmour >= 4) {
    insights.push({
      severity: 'good',
      text: `Excelente cobertura anti-armour (${nIgnoreArmour} armas). Tienes herramientas para perforar a los TANKs enemigos.`,
    });
  }

  // ── Anti-horde gap ──────────────────────────────────────────────────
  if (nAntiHorde < 2) {
    insights.push({
      severity: nAntiHorde === 0 ? 'crit' : 'warn',
      text: `Cobertura anti-horda: ${nAntiHorde} arma${nAntiHorde === 1 ? '' : 's'} con BLAST/AUTOMATIC/FLAMETHROWER. Vs hordas (Heretic Troopers, Trench Pilgrims, Court Yoke Fiends) tu volumen de fuego es insuficiente. Considera Frag Grenades en los Yeomen (10 👑 cada una), un Grenade Launcher, o un Heavy Flamethrower.`,
    });
  } else if (nAntiHorde >= 4) {
    insights.push({
      severity: 'good',
      text: `Buena cobertura anti-horda (${nAntiHorde} armas BLAST/AUTOMATIC/FLAMETHROWER). Tu fuego de área puede romper formaciones enemigas.`,
    });
  }

  // ── Anti-elite gap ──────────────────────────────────────────────────
  if (nAntiElite < 2) {
    insights.push({
      severity: 'warn',
      text: `Cobertura anti-élite: ${nAntiElite} herramienta${nAntiElite === 1 ? '' : 's'} con CRITICAL/DEADLY/IGNORE ARMOUR. Vs ELITES con TOUGH (Lord of Tumours, Hell Knight, Praetor Voloth) cuesta mucho lograr OoA en una activación. Considera un Sniper Priest (CRITICAL en Sniper Rifle) o un weapon CRITICAL adicional.`,
    });
  }

  // ── Anti-fear coverage ──────────────────────────────────────────────
  if (!hasNegateFear) {
    insights.push({
      severity: 'warn',
      text: `Sin cobertura NEGATE FEAR. Vs facciones con FEAR (Heretics War Wolf y Chorister, Black Grail Lord of Tumours, Court Praetor) tus charges fallan ~30% por Risky Roll. Un Trench Cleric (60 👑) cubre con su aura Onward Christian Soldiers!, o el upgrade Berserker (Éire Rangers) da NEGATE FEAR individual.`,
    });
  } else if (hasCleric) {
    insights.push({
      severity: 'good',
      text: `Trench Cleric en banda. Su aura Onward Christian Soldiers! da NEGATE FEAR a tus aliados NA, y God is With Us! genera BLESSING MARKERS para re-rolls de tus aliados. Mantenlo vivo y posicionado.`,
    });
  }

  // ── Field Strength / tamaño de banda ────────────────────────────────
  if (nModels < 8) {
    insights.push({
      severity: 'warn',
      text: `Banda compacta (${nModels} modelos). Field Strength bajo: cada baja cuenta mucho y entrarás en Morale Checks tempranos. Considera añadir 1-2 Yeomen para volumen.`,
    });
  } else if (nModels >= 14) {
    insights.push({
      severity: 'info',
      text: `Banda numerosa (${nModels} modelos). Buen Field Strength, pero atención al control de Activations: rivales con menos modelos pueden tener mejores élites por activación.`,
    });
  }

  // ── MVP / weakest model from breakdown ──────────────────────────────
  if (matchupResults && matchupResults.length && matchupResults[0].perModelA &&
      matchupResults[0].perModelA.length > 0) {
    // Aggregate kills across matchups
    const aggKills = matchupResults[0].perModelA.map((m, i) => ({
      name: m.name,
      kills: 0, outRate: 0,
    }));
    for (const r of matchupResults) {
      if (!r.perModelA) continue;
      for (let i = 0; i < r.perModelA.length && i < aggKills.length; i++) {
        aggKills[i].kills += r.perModelA[i].avgKills;
        aggKills[i].outRate += r.perModelA[i].outRate;
      }
    }
    aggKills.forEach(a => {
      a.kills /= matchupResults.length;
      a.outRate /= matchupResults.length;
    });
    const mvp = aggKills.reduce((a, b) => a.kills > b.kills ? a : b);
    const worst = aggKills
      .filter(a => a.kills < 0.15 && a.outRate >= 0.4)
      .sort((a, b) => b.outRate - a.outRate)[0];
    if (mvp && mvp.kills > 0.5) {
      insights.push({
        severity: 'good',
        text: `MVP: ${mvp.name} con ${mvp.kills.toFixed(2)} kills/batalla en promedio. Esa es tu unidad de impacto — protégela y posiciónala para máximo daño.`,
      });
    }
    if (worst) {
      insights.push({
        severity: 'warn',
        text: `Bajo rendimiento: ${worst.name} cae en ${(worst.outRate * 100).toFixed(0)}% de partidas con ${worst.kills.toFixed(2)} kills. Está pagando puntos sin devolverlos. Considera reasignar su Battlekit a otro modelo o sacrificarlo en favor de un perfil más útil.`,
      });
    }
  }

  // ── Best / worst matchup ────────────────────────────────────────────
  if (matchupResults && matchupResults.length >= 2) {
    const sorted = [...matchupResults].sort((a, b) => b.winRateA - a.winRateA);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    if (best.winRateA - worst.winRateA >= 0.20) {
      insights.push({
        severity: 'info',
        text: `Mejor matchup: vs ${best.enemyLabel} (${(best.winRateA * 100).toFixed(0)}%). Peor: vs ${worst.enemyLabel} (${(worst.winRateA * 100).toFixed(0)}%). La diferencia indica que tu banda está optimizada contra perfiles concretos. Ten un plan B para los matchups peores (objetivos secundarios, retirada controlada).`,
      });
    }
  }

  // ── Recordatorios sobre abilities poseídas ──────────────────────────
  const hasHYF = battleBand.some(m => m.holdYourFire);
  const hasAim = battleBand.some(m => m.aim);
  const hasShockCharge = battleBand.some(m => m.shockCharge);
  const hasCounterCharge = battleBand.some(m => m.counterCharge);
  const hasSetMine = battleBand.some(m => m.setMine);
  const hasIgnoreDefendedObstacle = battleBand.some(m =>
    m.keywords && m.keywords.has('IGNORE DEFENDED OBSTACLE')
  );

  if (hasHYF) {
    insights.push({
      severity: 'info',
      text: `Aprovecha Hold Your Fire! del Lieutenant en T1-T2 para neutralizar al modelo más amenazante del rival (Lord of Tumours, Praetor, Mubarizun). Cada activación bloqueada vale más que un disparo del Lt.`,
    });
  }
  if (hasAim) {
    insights.push({
      severity: 'info',
      text: `Sniper Priest puede usar Aim ACTION antes de disparar (Risky+2 → +2 DICE). Compensa el RISKY de su Sniper Rifle. En T1 a 48", el Aim casi te garantiza el primer crítico.`,
    });
  }
  if (hasShockCharge) {
    insights.push({
      severity: 'info',
      text: `Shock Charge del Shocktrooper: D6 extra al Charge Bonus. Posiciónalo en flanco para que su distancia de carga T1 alcance al modelo más blando del rival.`,
    });
  }
  if (hasCounterCharge) {
    insights.push({
      severity: 'info',
      text: `Counter-Charge en banda: aguanta posiciones y deja que el rival se acerque. Tu primera ACTION será un Charge contra él, ganando +1 DICE en mêlée el resto de la activación.`,
    });
  }
  if (hasSetMine) {
    insights.push({
      severity: 'info',
      text: `Combat Engineer / Sapper en banda: usa Set Mine ACTION en T1 sobre tu zona defensiva. Las minas (~80% éxito al colocar, ~25% trigger en charges enemigas, SHRAPNEL injury) son especialmente efectivas vs facciones agresivas (Pilgrims, Heretics, Court). Combina con Fortify para fijar al engineer en cobertura.`,
    });
  }
  if (hasIgnoreDefendedObstacle) {
    insights.push({
      severity: 'good',
      text: `Tus charges ignoran Defended Obstacle (regla regional de Alba/Highland). En terreno urbano el rival pierde su cobertura defensiva contra tus cargas — empuja agresivo en tablero denso.`,
    });
  }

  // ── Per-model performance analysis ───────────────────────────────────
  // Aggregate per-model stats across all matchups to identify MVPs and
  // underperformers. For analyze mode (vs multiple enemies), this reveals
  // which units are doing the heavy lifting and which are coasting.
  if (Array.isArray(matchupResults) && matchupResults.length > 0) {
    // Aggregate avg per model across matchups (each matchup has perModelA)
    const modelAggregates = {};
    for (const r of matchupResults) {
      if (!Array.isArray(r.perModelA)) continue;
      for (const m of r.perModelA) {
        if (!modelAggregates[m.name]) {
          modelAggregates[m.name] = {
            name: m.name,
            cost: m.cost || 0,
            kills: 0, dmgDealt: 0, dmgReceived: 0, outRate: 0,
            count: 0,
            keywords: m.keywords || [],
          };
        }
        modelAggregates[m.name].kills += (m.avgKills || 0);
        modelAggregates[m.name].dmgDealt += (m.avgDmgDealt || 0);
        modelAggregates[m.name].dmgReceived += (m.avgDmgReceived || 0);
        modelAggregates[m.name].outRate += (m.outRate || 0);
        modelAggregates[m.name].count += 1;
      }
    }
    // Compute averages and metrics
    const modelStats = Object.values(modelAggregates).map(a => {
      const n = Math.max(1, a.count);
      const avgKills = a.kills / n;
      const avgDmgDealt = a.dmgDealt / n;
      const outRate = a.outRate / n;
      // Performance per ducat: kills × 100 / cost (saturates at high cost)
      const efficiency = a.cost > 0 ? (avgKills * 100 / a.cost) : avgKills;
      return {
        name: a.name, cost: a.cost,
        avgKills, avgDmgDealt, outRate, efficiency,
        keywords: a.keywords,
      };
    });

    // MVP: highest kills × efficiency (must contribute > 0.3 kills)
    const mvpCandidates = modelStats.filter(m => m.avgKills > 0.3);
    if (mvpCandidates.length) {
      const mvp = mvpCandidates.reduce((best, m) =>
        (m.avgKills > best.avgKills) ? m : best, mvpCandidates[0]);
      const survivability = mvp.outRate < 0.4 ? 'sobrevive bien' : mvp.outRate < 0.7 ? 'caída moderada' : 'cae frecuentemente';
      insights.push({
        severity: 'good',
        text: `<strong>MVP: ${mvp.name}</strong> (${mvp.cost} 👑) — ${mvp.avgKills.toFixed(2)} kills/batalla promedio, ${survivability} (${(mvp.outRate * 100).toFixed(0)}% caída). Es tu mejor inversión: protégelo, ponlo en posiciones que aprovechen su perfil, y úsalo para finalizar engagements.`,
      });
    }

    // Underperformer: kills muy bajos relativos al coste, no es Cleric/support
    const underperformers = modelStats.filter(m => {
      // Skip support units (Cleric, Lt sin matar) que justifican su coste por aura
      const isSupport = m.keywords && (
        m.keywords.includes('NEGATE FEAR') &&
        m.avgDmgDealt < 1
      );
      if (isSupport) return false;
      // Underperformer: cost >= 50 ducats and kills < 0.15 and damage dealt < 1.5
      return m.cost >= 50 && m.avgKills < 0.15 && m.avgDmgDealt < 1.5;
    });
    if (underperformers.length) {
      const worst = underperformers.reduce((w, m) =>
        ((m.avgDmgDealt + m.avgKills * 5) < (w.avgDmgDealt + w.avgKills * 5)) ? m : w, underperformers[0]);
      insights.push({
        severity: 'warn',
        text: `<strong>${worst.name}</strong> (${worst.cost} 👑) está rindiendo bajo: ${worst.avgKills.toFixed(2)} kills + ${worst.avgDmgDealt.toFixed(1)} dmg/batalla. Considera reposicionarlo (¿está fuera de range?), cambiar su weapon, o sustituirlo por un modelo más eficiente.`,
      });
    }

    // Leader at risk: any LEADER with outRate >= 0.55
    const leaderAtRisk = modelStats.find(m =>
      m.keywords && m.keywords.includes('LEADER') && m.outRate >= 0.55
    );
    if (leaderAtRisk) {
      insights.push({
        severity: 'crit',
        text: `<strong>Líder en peligro</strong>: ${leaderAtRisk.name} cae en ${(leaderAtRisk.outRate * 100).toFixed(0)}% de las batallas. Si pierdes al LEADER las Morale Checks de tu banda pierden +1 DICE y la banda colapsa antes. Equipa Reinforced/Machine Armour, mantenlo en cobertura, evita exponerlo a los threats principales identificados arriba.`,
      });
    }

    // ── Single Point of Failure ─────────────────────────────────────
    // Cuando un único modelo concentra ≥40% de los kills totales de la
    // banda, esa banda es frágil: si ese modelo cae temprano o falla,
    // el resto no compensa. Solo se considera si los kills totales son
    // significativos (≥1.5) para evitar falsos positivos en bandas con
    // muy pocos kills generales.
    const totalBandKills = modelStats.reduce((s, m) => s + m.avgKills, 0);
    if (totalBandKills >= 1.5) {
      const topKiller = modelStats.reduce((b, m) =>
        m.avgKills > b.avgKills ? m : b, modelStats[0]);
      const sharePct = topKiller.avgKills / totalBandKills;
      if (sharePct >= 0.40 && topKiller.avgKills >= 0.6) {
        const sharePctStr = (sharePct * 100).toFixed(0);
        insights.push({
          severity: 'warn',
          text: `<strong>Dependes mucho de ${topKiller.name}</strong> (single point of failure): aglutina <strong>${sharePctStr}%</strong> de los kills de la banda (${topKiller.avgKills.toFixed(2)} de ${totalBandKills.toFixed(2)}). Si cae temprano, el resto no compensa. Protégelo con cobertura, ponlo a actuar tarde en cada turno, o invierte en un segundo carry para repartir presión.`,
        });
      }
    }

    // ── Glass Cannon ─────────────────────────────────────────────────
    // Modelo de alto daño que también cae mucho. Si su outRate es alto
    // (≥60%) pero su kill rate es alto (≥0.7), está dando damage pero
    // pagando con su vida. Riesgo: en campaña gana XP pero acumula scars.
    const glassCannons = modelStats.filter(m =>
      m.avgKills >= 0.7 && m.outRate >= 0.60 && m.cost >= 60
    );
    if (glassCannons.length) {
      const gc = glassCannons.reduce((b, m) => m.avgKills > b.avgKills ? m : b, glassCannons[0]);
      insights.push({
        severity: 'info',
        text: `<strong>${gc.name} es un glass cannon</strong>: hace mucho daño (${gc.avgKills.toFixed(2)} kills) pero cae en ${(gc.outRate * 100).toFixed(0)}% de las batallas. Está pagando vida por daño. En campaña: gana XP rápido pero acumula Battle Scars. Considera Reinforced Armour (-1 INJURY MOD) o keep distancia con HYF si tiene ranged.`,
      });
    }

    // ── Cost outliers ──────────────────────────────────────────────────
    // Identifica el modelo más caro que rinde por debajo del promedio.
    // No se redunda con Underperformer (umbral más estricto): aquí
    // detectamos waste por sobrecoste relativo, no rendimiento absoluto.
    const totalDamageOutput = modelStats.reduce((s, m) => s + m.avgDmgDealt + m.avgKills * 5, 0);
    const avgImpactPerCost = modelStats
      .filter(m => m.cost >= 30)
      .reduce((s, m) => s + (m.avgDmgDealt + m.avgKills * 5) / m.cost, 0) /
      Math.max(1, modelStats.filter(m => m.cost >= 30).length);
    // Find the most expensive model whose impact/cost is < 50% of band avg
    if (modelStats.length >= 4 && avgImpactPerCost > 0) {
      const expensiveLowImpact = modelStats
        .filter(m => m.cost >= 70)
        .filter(m => {
          const impact = m.avgDmgDealt + m.avgKills * 5;
          const ipc = impact / m.cost;
          // Skip support units (LEADER without much DPS is normal)
          const isSupport = m.keywords && m.keywords.includes('LEADER');
          if (isSupport && m.avgKills < 0.15) return false;
          return ipc < avgImpactPerCost * 0.5;
        });
      if (expensiveLowImpact.length) {
        const wasted = expensiveLowImpact.reduce((w, m) => m.cost > w.cost ? m : w, expensiveLowImpact[0]);
        insights.push({
          severity: 'warn',
          text: `<strong>Desbalance de coste</strong>: ${wasted.name} (${wasted.cost} 👑) genera la mitad o menos de impacto/ducado que el promedio de tu banda. Estás pagando una prima sin recibir el daño correspondiente. Revisa su Battlekit o sustitúyelo por 2 Troops.`,
        });
      }
    }

    // ── Ranged/Melee balance ───────────────────────────────────────────
    // Banda demasiado sesgada hacia un solo eje de combate es vulnerable
    // a counter-strategies: solo-ranged sufre vs charges + cover; solo-
    // melee sufre vs HEAVY + Snipers + cobertura.
    const rangedHeavy = battleBand.filter(m =>
      m.weapons && m.weapons.some(w => w.isRanged) &&
      (m.rangedDice || 0) > (m.meleeDice || 0)
    ).length;
    const meleeHeavy = battleBand.filter(m =>
      m.weapons && m.weapons.some(w => !w.isRanged) &&
      (m.meleeDice || 0) > (m.rangedDice || 0)
    ).length;
    const totalCombat = battleBand.length;
    if (totalCombat >= 5) {
      const rangedShare = rangedHeavy / totalCombat;
      const meleeShare = meleeHeavy / totalCombat;
      if (rangedShare >= 0.85) {
        insights.push({
          severity: 'warn',
          text: `<strong>Banda excesivamente ranged</strong>: ${rangedHeavy}/${totalCombat} modelos rinden mejor a distancia. Si el rival cierra distancia (Court Yoke Fiends, Heretic War Wolf, Pilgrim hordes) tu banda colapsa en mêlée. Considera 1-2 modelos con perfil melee fuerte (Shocktrooper, Castigator, MHI con CRITICAL) para defensa de líneas.`,
        });
      } else if (meleeShare >= 0.80 && rangedHeavy <= 1) {
        insights.push({
          severity: 'warn',
          text: `<strong>Banda excesivamente melee</strong>: ${meleeHeavy}/${totalCombat} modelos rinden mejor en mêlée. Vs facciones con HEAVY ranged + cobertura (NA Yeomen + MHI, Iron Sultanate Janissary) sufrirás antes de llegar al engagement. Considera 1-2 modelos con ranged decente (Sniper Priest, weapons IGNORE COVER).`,
        });
      }
    }

    // ── Matchup volatility ─────────────────────────────────────────────
    // Cuando la stdev de casualties es alta relativa al average, el
    // matchup es muy variable: a veces ganas claramente, a veces te
    // aplastan. Útil para decidir si jugarlo o evitarlo.
    // Coeficiente de variación: stdev/mean. Threshold ≥0.55 = inconsistente.
    // Solo se considera con ≥250 batallas (necesario para stdev fiable).
    const volatileMatchups = matchupResults.filter(r => {
      if (!r || typeof r.stdevCasualtiesA !== 'number') return false;
      if ((r.nBattles || 0) < 250) return false;  // need enough samples
      const meanA = r.avgCasualtiesA || 0;
      if (meanA < 1.0) return false;  // tiny means → unreliable CV
      const cv = r.stdevCasualtiesA / meanA;
      return cv >= 0.55;
    });
    if (volatileMatchups.length) {
      // Sort by volatility (highest CV first)
      volatileMatchups.sort((a, b) => {
        const cvA = a.stdevCasualtiesA / a.avgCasualtiesA;
        const cvB = b.stdevCasualtiesA / b.avgCasualtiesA;
        return cvB - cvA;
      });
      const top = volatileMatchups[0];
      const cv = top.stdevCasualtiesA / top.avgCasualtiesA;
      const wrPct = (top.winRateA * 100).toFixed(0);
      insights.push({
        severity: 'info',
        text: `<strong>Matchup volátil</strong>: vs ${top.enemyLabel} tu casualties oscilan ${top.avgCasualtiesA.toFixed(1)} ±${top.stdevCasualtiesA.toFixed(1)} (CV ${(cv * 100).toFixed(0)}%). Win rate ${wrPct}% promedio pero el resultado depende mucho del setup inicial — ten Plan A y Plan B antes del despliegue, no improvises.`,
      });
    }
  }

  return insights;
}

/**
 * Per-matchup enemy threat analysis. For each matchup result, identifies
 * the enemy MVP (highest avgKills * factor + avgDmgDealt) and produces
 * a specific countermeasure insight based on its weapon keywords.
 *
 * Threat score = avgKills × 3 + avgDmgDealt × 0.5. Models below threshold
 * (avgKills < 0.3) are skipped — not real threats.
 *
 * Generates ONE insight per matchup that has a meaningful threat. The
 * insight names the enemy model, quantifies the threat, and recommends a
 * concrete countermeasure based on weapon keywords (CRITICAL, IGNORE
 * ARMOUR, BLAST, AUTOMATIC, FLAMETHROWER, HEAVY, FEAR).
 *
 * Returns array of { text, severity, matchupId, threatModel }.
 */
function analyzeEnemyThreats_lab(matchupResults) {
  if (!Array.isArray(matchupResults) || matchupResults.length === 0) return [];
  const insights = [];

  for (const result of matchupResults) {
    if (!result || !Array.isArray(result.perModelB) || result.perModelB.length === 0) continue;

    // Threat score = killing power weighted heavily, damage dealt secondary.
    // Skip models that are not real threats (avgKills < 0.25). Threshold
    // is calibrated empirically — at 500 batallas vs Alba, Castigators
    // average 0.30 kills, Plague Knights 0.31, Yoke Fiends 0.48, and
    // standout MVPs like War Wolf 2.0+.
    const threats = result.perModelB
      .filter(m => (m.avgKills || 0) >= 0.25)
      .map(m => ({
        ...m,
        _score: (m.avgKills || 0) * 3 + (m.avgDmgDealt || 0) * 0.5,
      }))
      .sort((a, b) => b._score - a._score);

    if (threats.length === 0) continue;
    const top = threats[0];

    // If multiple threats are within 70% of the top's score, mention the
    // group threat (e.g. "los Pilgrim acumulan kills colectivamente").
    const topScore = top._score;
    const groupThreats = threats.filter(t => t._score >= topScore * 0.70);
    const isGroupThreat = groupThreats.length >= 3 &&
                          groupThreats.every(t => t.name === top.name);

    // Aggregate weapon keywords across all top weapons
    const keywordSet = new Set();
    for (const w of (top.weapons || [])) {
      for (const k of (w.keywords || [])) keywordSet.add(k);
    }
    const modelKws = new Set(top.keywords || []);

    // Build countermeasure suggestions based on keyword profile
    const countermeasures = [];

    if (keywordSet.has('IGNORE ARMOUR')) {
      countermeasures.push(
        `su weapon ignora armour — el blindaje no protege; mantén distancia, usa cobertura, o focusealo con HYF/Aim`
      );
    } else if (keywordSet.has('CRITICAL')) {
      countermeasures.push(
        `su weapon tiene CRITICAL (riesgo de doblar daño) — modelos sin armour son objetivos blandos; equipa Reinforced Armour a tus elites o evita exponerlos`
      );
    }

    if (keywordSet.has('BLAST') || keywordSet.has('BLAST 2"') || keywordSet.has('BLAST 3"')) {
      countermeasures.push(
        `su weapon tiene BLAST — separa modelos al menos 2" entre sí, evita cluster en cobertura compartida`
      );
    }
    if (keywordSet.has('AUTOMATIC 2') || keywordSet.has('AUTOMATIC 3') || keywordSet.has('AUTOMATIC')) {
      countermeasures.push(
        `tiene AUTOMATIC (múltiples ataques por activación) — elimínalo en T1-T2 con ranged focused o rompe LoS`
      );
    }
    if (keywordSet.has('FLAMETHROWER')) {
      countermeasures.push(
        `tiene FLAMETHROWER — ignora cover y golpea en cono; obliga al enemigo a moverse antes de disparar (HEAVY = no puede shoot+move)`
      );
    }
    if (keywordSet.has('HEAVY')) {
      countermeasures.push(
        `weapon HEAVY (no puede shoot+mover) — hostiga su posición para forzarle a reposicionarse (1 turno sin disparar)`
      );
    }
    if (modelKws.has('FEAR')) {
      countermeasures.push(
        `tiene FEAR — equipa NEGATE FEAR (Cleric de NA, helmet specific) o evita charges directas con tus modelos sin la keyword`
      );
    }
    if (modelKws.has('FLYING')) {
      countermeasures.push(
        `tiene FLYING — ignora terreno y carga directa; las minas pierden efectividad (50%); priorízalo con ranged o cobertura elevada`
      );
    }
    if (modelKws.has('TOUGH')) {
      countermeasures.push(
        `es TOUGH (primer OoA → Down) — necesitas exposición sostenida; concentra fuego en T2-T3, no esperes one-shot`
      );
    }
    if (modelKws.has('REGENERATE')) {
      countermeasures.push(
        `REGENERATE — quita BLOOD MARKERS al activarse; aumenta presión continua para que no pueda regenerarse`
      );
    }

    // Default if no specific keyword matches: positional advice based on
    // raw stats. The threat doesn't have flashy keywords but just raw
    // damage output — focus, isolate, or out-trade.
    if (countermeasures.length === 0) {
      countermeasures.push(
        `acumula daño con stats raw (sin keywords decisivas) — focusealo con tu mejor concentración de fuego o aíslalo del resto de su banda para evitar engagements masivos`
      );
    }

    // Severity: based on threat impact + matchup severity
    const matchupBad = (result.winRateA || 0) < 0.15;
    const severity = matchupBad ? 'crit' :
                     top.avgKills >= 1.0 ? 'crit' :
                     top.avgKills >= 0.6 ? 'warn' : 'info';

    // For matchups < 15% win rate: prepend "matchup desfavorable" framing
    const matchupPrefix = matchupBad
      ? `<em style="color:var(--parchment-dim);">Matchup desfavorable (${(result.winRateA*100).toFixed(0)}% win): prioriza objetivos secundarios sobre kills.</em><br>`
      : '';

    // Build text
    const killsStr = (top.avgKills || 0).toFixed(2);
    const surviveStr = (top.avgTurnsSurvived || 0).toFixed(1);
    const weaponNames = (top.weapons || []).slice(0, 2).map(w => w.name).filter(Boolean).join(' + ');
    const weaponDesc = weaponNames ? ` con <strong>${weaponNames}</strong>` : '';
    const cmText = countermeasures[0];  // primary countermeasure
    const extras = countermeasures.slice(1, 3).join('. ');

    let text;
    if (isGroupThreat) {
      // Multiple identical threats — frame as collective
      const totalKills = groupThreats.reduce((s, t) => s + (t.avgKills || 0), 0);
      text = matchupPrefix +
             `<strong>Vs ${result.enemyLabel}</strong>: ${groupThreats.length}× <strong>${top.name}</strong>${weaponDesc} ` +
             `acumulan ${totalKills.toFixed(2)} kills/batalla colectivamente (${killsStr} cada uno). ${cmText}.`;
    } else {
      text = matchupPrefix +
             `<strong>Vs ${result.enemyLabel}</strong>: el principal threat es ` +
             `<strong>${top.name}</strong>${weaponDesc} (${killsStr} kills/batalla, ` +
             `sobrevive ${surviveStr} rondas en promedio). ${cmText}.`;
    }
    if (extras) text += ' ' + extras + '.';

    insights.push({
      text,
      severity,
      matchupId: result.enemyId,
      threatModel: top.name,
    });
  }

  return insights;
}

/**
 * Detects synergy/conflict between pairs of friendly models based on
 * pairwise co-survival data from runBattleSeries_lab.
 *
 * Method: for each pair (i, j), compute observed P(both survive) vs
 * expected P(i survive) × P(j survive). The lift = observed / expected.
 *   - lift ≥ 1.10 → synergy (they survive together more often than chance)
 *   - lift ≤ 0.85 → conflict (independence broken downward — possibly one
 *     model gets focused when the other is alive)
 *
 * Aggregate across multiple matchups by combining counts before computing
 * lift (so scenarios where models co-die more average naturally).
 *
 * Returns array of insights { text, severity, modelA, modelB, lift }.
 * Sorted by absolute lift impact descending.
 */
function detectModelSynergies_lab(matchupResults) {
  if (!Array.isArray(matchupResults) || matchupResults.length === 0) return [];
  // Aggregate co-survival across matchups
  const sample = matchupResults.find(r => Array.isArray(r.pairwiseSurvival) && Array.isArray(r.perModelA));
  if (!sample) return [];
  const N = sample.perModelA.length;
  if (N < 2) return [];
  const totalCoSurv = Array.from({ length: N }, () => new Array(N).fill(0));
  const totalSurv = new Array(N).fill(0);
  let totalBattles = 0;
  for (const r of matchupResults) {
    if (!Array.isArray(r.pairwiseSurvival) || !Array.isArray(r.perModelA)) continue;
    if (r.perModelA.length !== N) continue;
    const nB = r.nBattles || 100;
    totalBattles += nB;
    for (let i = 0; i < N; i++) {
      // Per-model survival count = nBattles - outs
      // perModelA[i].outRate × nBattles = outs; surv = (1-outRate)×nBattles
      const survCount = (1 - (r.perModelA[i].outRate || 0)) * nB;
      totalSurv[i] += survCount;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        totalCoSurv[i][j] += (r.pairwiseSurvival[i] || [])[j] || 0;
      }
    }
  }
  if (totalBattles === 0) return [];

  // Compute lift for each pair (i < j to avoid duplicates)
  const pairs = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const pi = totalSurv[i] / totalBattles;
      const pj = totalSurv[j] / totalBattles;
      const expected = pi * pj;
      const observed = totalCoSurv[i][j] / totalBattles;
      // Skip if either model essentially never participates
      if (pi < 0.05 || pj < 0.05 || expected < 0.02) continue;
      const lift = expected > 0 ? observed / expected : 1;
      pairs.push({
        i, j,
        nameI: sample.perModelA[i].name,
        nameJ: sample.perModelA[j].name,
        observed, expected, lift,
        pi, pj,
      });
    }
  }

  // Filter: only meaningful deltas (lift far from 1.0)
  const synergies = pairs.filter(p => p.lift >= 1.10 || p.lift <= 0.85);
  synergies.sort((a, b) => Math.abs(b.lift - 1) - Math.abs(a.lift - 1));

  // Return top 2-3 insights with text
  const insights = [];
  for (const p of synergies.slice(0, 3)) {
    if (p.lift >= 1.10) {
      // Synergy: positive correlation in survival
      const lvl = p.lift >= 1.25 ? 'fuerte' : 'moderada';
      insights.push({
        text: `<strong>${p.nameI} + ${p.nameJ}</strong>: sinergia <strong>${lvl}</strong> de supervivencia (lift ${p.lift.toFixed(2)}× sobre el esperado por independencia). Cuando ambos sobreviven el rendimiento de la banda mejora — protégelos como dúo: aplica HYF/Aim al threat que más amenaza al par, no exponerlos por separado.`,
        severity: p.lift >= 1.25 ? 'good' : 'info',
        modelA: p.nameI, modelB: p.nameJ, lift: p.lift,
      });
    } else {
      // Conflict: negative correlation
      insights.push({
        text: `<strong>${p.nameI} ↮ ${p.nameJ}</strong>: caen juntos más de lo esperado (lift ${p.lift.toFixed(2)}× sobre independencia). Probablemente el rival concentra fuego en su sector. Despliégalos en flancos opuestos para diluir presión, o sustituye uno por un modelo más resiliente.`,
        severity: 'warn',
        modelA: p.nameI, modelB: p.nameJ, lift: p.lift,
      });
    }
  }
  return insights;
}

/**
 * Suggests concrete canon upgrades to fill coverage gaps. Each LOW
 * dimension produces ONE actionable insight tailored to the warband's
 * faction. Generic fallback for unknown factions.
 *
 * Each suggestion names: model/weapon, ducat cost, keyword effect, and
 * the dimension it raises. Insights have severity 'warn' for low
 * coverage, 'info' for medium gaps that could still benefit.
 *
 * Returns array of { text, severity, dimension, suggestion }.
 */
function suggestFactionUpgrades_lab(wb, coverage) {
  if (!wb || !coverage) return [];

  // Canon upgrade catalog by faction. Each entry maps a coverage dimension
  // to a list of suggestions: { name, cost, kw, role }.
  // Note: factionId is normalized to kebab-case (Companion format).
  const FACTION_UPGRADES = {
    'new-antioch': {
      antiArmour: [
        { name: 'Anti-Tank Hammer', cost: '+25 👑', kw: 'IGNORE ARMOUR + CRITICAL melee', role: 'Shocktrooper' },
        { name: 'Frag Grenades', cost: '+10 👑', kw: 'BLAST + SHRAPNEL', role: 'Lieutenant o Yeoman' },
      ],
      antiHorde: [
        { name: 'Heavy Flamethrower', cost: '+50 👑', kw: 'FLAMETHROWER + IGNORE ARMOUR + HEAVY', role: 'Shocktrooper o MHI' },
        { name: 'Frag Grenades', cost: '+10 👑', kw: 'BLAST', role: 'cualquier infantería' },
      ],
      antiElite: [
        { name: 'Sniper Rifle', cost: '+40 👑', kw: 'CRITICAL + RISKY (Aim ACTION compensa)', role: 'Sniper Priest' },
        { name: 'Anti-Tank Hammer', cost: '+25 👑', kw: 'IGNORE ARMOUR melee', role: 'Shocktrooper' },
      ],
      antiFear: [
        { name: 'Trench Cleric', cost: '60 👑', kw: 'NEGATE FEAR aura (Onward Christian Soldiers!) + Laying on of Hands', role: 'mandatorio en Papal States variant' },
        { name: 'NEGATE FEAR helmet', cost: 'algunos modelos', kw: 'NEGATE FEAR individual', role: 'individual' },
      ],
      resilience: [
        { name: 'Mechanized Heavy Infantry (MHI)', cost: '85-95 👑', kw: 'TOUGH + Reinforced/Machine Armour (-2/-3 INJURY MOD)', role: 'tank' },
        { name: 'Reinforced Armour', cost: '+15 👑', kw: '-1 INJURY MODIFIER', role: 'cualquier infantería' },
      ],
      mobility: [
        { name: 'Trench Mole', cost: '+20 👑', kw: 'INFILTRATOR (deploy a 8" del rival)', role: 'cualquier infantería' },
      ],
    },
    'trench-pilgrims': {
      antiArmour: [
        { name: 'Trench Sledgehammer', cost: '~+30 👑', kw: 'CRITICAL + +1 INJURY DICE (sin IGNORE ARMOUR pero brutal)', role: 'Castigator o Pilgrim' },
        { name: 'Anointed Heavy Infantry', cost: '90+ 👑', kw: 'CRITICAL + heavy melee', role: 'elite tank' },
      ],
      antiHorde: [
        { name: 'Frag Grenades', cost: '+10 👑', kw: 'BLAST + SHRAPNEL', role: 'cualquier Pilgrim' },
      ],
      antiElite: [
        { name: 'Castigator', cost: '50 👑', kw: 'CRITICAL melee + ELITE', role: 'finisher melee' },
        { name: 'Sniper Priest', cost: '50 👑', kw: 'CRITICAL ranged + Aim', role: 'sniper' },
      ],
      antiFear: [
        { name: 'War Prophet', cost: '80 👑', kw: 'Memento Mori (primera OoA ignorada) + Laying on of Hands', role: 'líder espiritual' },
      ],
      resilience: [
        { name: 'Stigmatic Nun', cost: '50 👑', kw: 'REGENERATE 1 (quita 1 BLOOD MARKER al activarse)', role: 'recuperador' },
        { name: 'War Prophet (Memento Mori)', cost: '80 👑', kw: 'sobrevive primer OoA', role: 'tank suave' },
      ],
      mobility: [
        { name: 'Diving Charge upgrade', cost: 'variable', kw: 'movement bonus en charge', role: 'sprint elite' },
      ],
    },
    'iron-sultanate': {
      antiArmour: [
        { name: 'Mubarizun', cost: '45 👑', kw: 'CRITICAL melee +1 INJURY DICE vs TOUGH targets (+ Mubarizun Greatsword IGNORE ARMOUR si Janissary Greatsword se equipa)', role: 'duelista anti-elite' },
        { name: 'Sultanate Sapper Satchel Charge', cost: 'variable', kw: 'IGNORE ARMOUR + BLAST', role: 'demolición' },
      ],
      antiHorde: [
        { name: 'Sultanate Grand Cannon', cost: '60 👑', kw: 'BLAST + HEAVY ranged', role: 'gun battery (variants)' },
        { name: 'Frag Grenades', cost: '+10 👑', kw: 'BLAST', role: 'cualquier modelo' },
      ],
      antiElite: [
        { name: 'Mubarizun', cost: '45 👑', kw: '+1 INJURY DICE vs TOUGH (anti-elite especialista)', role: 'anti-tank' },
        { name: 'Sultanate Assassin', cost: '~60 👑', kw: 'INFILTRATOR + Temporal Assassin (split charge)', role: 'eliminator' },
      ],
      antiFear: [
        { name: 'Yüzbaşı', cost: '70 👑', kw: 'NEGATE FEAR (Iron Sultanate trait)', role: 'líder' },
      ],
      resilience: [
        { name: 'Reinforced Armour', cost: '+15 👑', kw: '-1 INJURY MODIFIER', role: 'cualquier modelo' },
        { name: 'Janissary', cost: '55 👑', kw: 'STRONG + NEGATE HEAVY', role: 'tank ranged' },
      ],
      mobility: [
        { name: 'Lions of Jabir', cost: '60 👑', kw: 'Lion Agile (+1 DICE Risky al saltar/escalar) + base agile', role: 'flanker' },
      ],
    },
    'heretic-legions': {
      antiArmour: [
        { name: 'Brazen Bull (Flamethrower)', cost: '~80 👑', kw: 'FLAMETHROWER + IGNORE ARMOUR + HEAVY', role: 'shock cannon' },
        { name: 'Anti-Tank Hammer', cost: '+25 👑', kw: 'IGNORE ARMOUR melee', role: 'Anointed Heavy Infantry' },
      ],
      antiHorde: [
        { name: 'Brazen Bull', cost: '~80 👑', kw: 'FLAMETHROWER (cono ignora cover)', role: 'AoE' },
        { name: 'Frag Grenades', cost: '+10 👑', kw: 'BLAST', role: 'Heretic Trooper' },
      ],
      antiElite: [
        { name: 'Death Commando', cost: '90 👑', kw: 'Tartarus Claws (CLEAVE 2 + CRITICAL + CUMBERSOME) + Stealth Generator', role: 'eliminator' },
        { name: 'War Wolf', cost: '~110 👑', kw: 'IGNORE ARMOUR + RISKY + CUMBERSOME (devastador)', role: 'apex melee' },
      ],
      antiFear: [
        { name: 'Heretic Priest', cost: '80 👑', kw: 'LEADER + TOUGH (no NEGATE FEAR pero líder espiritual)', role: 'comandante' },
      ],
      resilience: [
        { name: 'Anointed Heavy Infantry', cost: '~85 👑', kw: 'TOUGH + heavy armour', role: 'tank' },
        { name: 'Wretched Dark Blessing', cost: '25 👑', kw: 'al morir → +1 BLESSING al ELITE+HERETIC más cercano', role: 'tank económico' },
      ],
      mobility: [
        { name: 'War Wolf (Mauling Charge)', cost: '~110 👑', kw: 'fast charge + heavy hit', role: 'sprint' },
      ],
    },
    'black-grail': {
      antiArmour: [
        { name: 'Lord of Tumours (Crushing Blows)', cost: '~120 👑', kw: 'IGNORE ARMOUR + CRITICAL', role: 'apex tank' },
        { name: 'Viscera Cannon', cost: 'variable', kw: 'BLAST + IGNORE ARMOUR', role: 'artillery' },
      ],
      antiHorde: [
        { name: 'Plague Knight (Putrid Shotgun)', cost: '~80 👑', kw: 'BLAST + INFECTION MARKERS', role: 'midrange AoE' },
      ],
      antiElite: [
        { name: 'Lord of Tumours', cost: '~120 👑', kw: 'TOUGH + IGNORE ARMOUR Crushing Blows', role: 'duelista' },
      ],
      antiFear: [
        { name: 'Plague Knight', cost: '~80 👑', kw: 'inherente, los Black Grail tend to cause FEAR', role: 'defensa anti-fear más limitada' },
      ],
      resilience: [
        { name: 'Lord of Tumours', cost: '~120 👑', kw: 'TOUGH + heavy armour', role: 'apex tank' },
        { name: 'Plague Knight', cost: '~80 👑', kw: 'TOUGH', role: 'tank' },
      ],
      mobility: [
        { name: 'Hounds of the Black Grail', cost: '~50 👑', kw: 'Frightening Speed (+1 DICE Risky en Dash + no halve mov al levantarse)', role: 'fast melee' },
        { name: 'Heralds of Beelzebub', cost: '~70 👑', kw: 'FLYING', role: 'aerial' },
      ],
    },
    'court-of-the-seven-headed-serpent': {
      antiArmour: [
        { name: 'Burning Inferno spell (Sorcerer)', cost: 'Goetic Power', kw: 'BLAST + IGNORE ARMOUR ranged', role: 'mago' },
        { name: 'Beelzebub\'s Axe', cost: 'Glory Item', kw: 'CRITICAL + IGNORE ARMOUR melee', role: 'apex weapon' },
      ],
      antiHorde: [
        { name: 'Yoke Fiends', cost: '~30 👑', kw: 'CLEAVE 2 + Hateful (auto-charge cualquier no-DEMONIC)', role: 'AoE melee' },
      ],
      antiElite: [
        { name: 'Praetor of the Court', cost: '~110 👑', kw: 'TOUGH + FLYING + heavy melee', role: 'apex' },
      ],
      antiFear: [
        { name: 'Most Court models cause FEAR', cost: 'inherente', kw: 'tu lado emite FEAR; antiFear propio menos crítico', role: 'inversión menor' },
      ],
      resilience: [
        { name: 'Praetor', cost: '~110 👑', kw: 'TOUGH + armour + FLYING', role: 'apex' },
        { name: 'Wretched (Law of Hell)', cost: '~25 👑', kw: '+1 Charge Bonus permanente al matar (escala con kills)', role: 'tank económico' },
      ],
      mobility: [
        { name: 'Praetor / Sorcerer', cost: 'varios', kw: 'FLYING (ignora terreno + minas con 50% reducción)', role: 'apex móvil' },
      ],
    },
  };

  // Coverage dimension labels (Spanish)
  const dimLabels = {
    antiArmour: 'Anti-Armour',
    antiHorde:  'Anti-Horda',
    antiElite:  'Anti-Élite',
    antiFear:   'Anti-Fear',
    resilience: 'Resiliencia',
    mobility:   'Movilidad',
  };

  const factionUpgrades = FACTION_UPGRADES[wb.factionId] || null;
  const insights = [];

  // Generate suggestions for low-coverage dimensions
  for (const dim of ['antiArmour','antiHorde','antiElite','antiFear','resilience','mobility']) {
    if (!coverage[dim]) continue;
    const c = coverage[dim];
    if (c.label !== 'low') continue;  // only low triggers suggestions

    let text;
    let suggestion = null;

    if (factionUpgrades && factionUpgrades[dim] && factionUpgrades[dim].length > 0) {
      // Build a multi-suggestion text from canon options
      const opts = factionUpgrades[dim].slice(0, 2);
      const optsTxt = opts.map(o =>
        `<strong>${o.name}</strong> (${o.cost}, ${o.kw}; ${o.role})`
      ).join(' o ');
      text = `<strong>${dimLabels[dim]} BAJA</strong> (score ${c.score}/100). Considera: ${optsTxt}.`;
      suggestion = opts[0];
    } else {
      // Generic fallback when faction is unknown
      text = `<strong>${dimLabels[dim]} BAJA</strong> (score ${c.score}/100). Tu facción debería tener weapons/modelos que cubran esta dimensión — revisa el armoury table de tu facción.`;
    }

    insights.push({
      text,
      severity: 'warn',
      dimension: dim,
      suggestion,
    });
  }

  return insights;
}

/**
 * Generates a turn-by-turn combat playbook tailored to the warband's
 * abilities and composition. Returns 3 entries: T1 (long phase setup),
 * T2-T3 (transition/positioning), T4-T5 (engagement/closure).
 *
 * Each entry is {turn, text}. The text is composed of context-aware
 * recommendations: which support ACTIONs to use, who to target,
 * positional priorities. If the band lacks key abilities, the playbook
 * uses generic advice for that turn.
 */
function generateCombatPlaybook(wb, matchupResults) {
  if (!wb) return [];

  let battleBand;
  try { battleBand = buildBattleBandFromWarband(wb); }
  catch (e) { return []; }
  if (!battleBand || !battleBand.length) return [];

  // Detect abilities & key models in the warband
  const hasHYF = battleBand.some(m => m.holdYourFire);
  const hasAim = battleBand.some(m => m.aim);
  const hasGodIsWithUs = battleBand.some(m => m.godIsWithUs);
  const hasShockCharge = battleBand.some(m => m.shockCharge);
  const hasCounterCharge = battleBand.some(m => m.counterCharge);
  const hasSetMine = battleBand.some(m => m.setMine);
  const hasLoudspeakers = battleBand.some(m => m.loudspeakers);
  const hasLayingHands = battleBand.some(m => m.layingOnOfHands);
  const hasIgnoreDefendedObstacle = battleBand.some(m =>
    m.keywords && m.keywords.has('IGNORE DEFENDED OBSTACLE')
  );

  // Best ranged + melee models (by stats)
  const rangedModels = battleBand.filter(m =>
    m.weapons && m.weapons.some(w => w.isRanged)
  );
  const meleeModels = battleBand.filter(m =>
    m.weapons && m.weapons.some(w => !w.isRanged) && (m.meleeDice || 0) >= 1
  );
  const topRanged = rangedModels.length
    ? rangedModels.reduce((b, m) => (m.rangedDice || 0) > (b.rangedDice || 0) ? m : b, rangedModels[0])
    : null;
  const topMelee = meleeModels.length
    ? meleeModels.reduce((b, m) => (m.meleeDice || 0) > (b.meleeDice || 0) ? m : b, meleeModels[0])
    : null;

  // Best matchup result (for late-turn confidence) — peor matchup
  // (for late-turn caution). Only used when matchupResults provided.
  let worstMatchup = null;
  if (Array.isArray(matchupResults) && matchupResults.length) {
    worstMatchup = matchupResults.reduce((w, r) =>
      (r.winRateA < (w?.winRateA ?? 1)) ? r : w, null);
  }

  const plays = [];

  // ── T1 — Long phase: setup ──────────────────────────────────────────
  {
    const actions = [];
    if (hasSetMine) actions.push(
      `<strong>Set Mine</strong> con tu Engineer (Success+2 DICE, ~80% éxito) sobre tu zona defensiva — bloquea el approach del rival`
    );
    if (hasAim && topRanged) actions.push(
      `<strong>Aim</strong> con ${topRanged.name} (Risky+2 DICE, ~85% éxito) antes de disparar — compensa RISKY del Sniper Rifle`
    );
    if (hasGodIsWithUs) actions.push(
      `<strong>God is With Us!</strong> con tu Cleric — ~50% Risky → +1 BLESSING al pool de banda (resto de aliados pueden gastar para re-roll)`
    );
    if (hasLoudspeakers) actions.push(
      `<strong>Loudspeakers</strong> con War Prophet (Risky+2, ~75% éxito) — boostea PILGRIM allies para cargar T1 si se acercan`
    );
    if (hasHYF) actions.push(
      `<strong>Hold Your Fire!</strong> con Lieutenant — neutraliza al threat principal del rival (Lord of Tumours, Praetor, Mubarizun, War Wolf)`
    );
    if (!actions.length) actions.push(
      `Mover infantería a posiciones de cobertura, usar terreno para LoS asimétrico, priorizar disparos a los modelos con BLOOD MARKERS si hay aliados ya en engagement`
    );
    plays.push({
      turn: 'T1 (long phase)',
      text: `<strong>Setup defensivo y posicionamiento.</strong> ${actions.join('. ')}.`,
    });
  }

  // ── T2-T3 — Mid phase: positioning + initial charges ──────────────
  {
    const actions = [];
    if (hasShockCharge) actions.push(
      `<strong>Shock Charge</strong> con tu Shocktrooper (D6 extra al Charge Bonus) — apunta al modelo más blando del rival, no al tank principal`
    );
    if (hasIgnoreDefendedObstacle) actions.push(
      `Aprovecha <strong>IGNORE DEFENDED OBSTACLE</strong> en charges — el rival pierde -1 DICE de cobertura defensiva, push agresivo en terreno mixto/urbano`
    );
    if (hasLayingHands) actions.push(
      `<strong>Laying on of Hands</strong> en aliado con BLOOD MARKERS ≥2 — cura 1 BLOOD (50%) o 3 (5% Critical), mantiene a tus elites en pie`
    );
    if (topMelee) actions.push(
      `Avanza <strong>${topMelee.name}</strong> hacia el enemigo más rentable: prioriza modelos con LEADER (-1 DICE Morale Checks rivales) o ELITE blando`
    );
    if (hasCounterCharge) actions.push(
      `Si te cargan: tu primera ACTION es Counter-Charge (+1 DICE en mêlée el resto del turn)`
    );
    if (!actions.length) actions.push(
      `Concentra fuego en un solo target a la vez (kills > BLOOD MARKERS dispersos). Mantén formación: si pierdes el LEADER, tus Morale Checks pierden +1 DICE`
    );
    plays.push({
      turn: 'T2-T3 (mid + transición)',
      text: `<strong>Posicionamiento y primeras cargas.</strong> ${actions.join('. ')}.`,
    });
  }

  // ── T4-T5 — Engagement / closure ──────────────────────────────────
  {
    const actions = [];
    actions.push(
      `Concentra ataques en modelos ya con BLOOD MARKERS — cada hit adicional aumenta probabilidad de OUT (+1 BLOOD = +1 INJURY DICE)`
    );
    actions.push(
      `Vigila tu <strong>Field Strength</strong> (modelos no-OoA): si caes a la mitad de la inicial, próxima Morale Check tiene -1 DICE base, considera retirada controlada`
    );
    if (worstMatchup && worstMatchup.winRateA < 0.25) {
      actions.push(
        `Si el matchup es desfavorable (vs ${worstMatchup.enemyLabel}, win ${(worstMatchup.winRateA*100).toFixed(0)}%), prioriza objetivos secundarios (Glorious Deeds, captures) sobre el body count`
      );
    }
    actions.push(
      `Si tu LEADER cae: cualquier modelo restante puede tomar tarea de "leader temporal", pero tus Morale Checks ya no tienen el +1 DICE`
    );
    plays.push({
      turn: 'T4-T5 (engagement)',
      text: `<strong>Cierre y damage maximization.</strong> ${actions.join('. ')}.`,
    });
  }

  return plays;
}

/**
 * Runs battles across all 3 terrains (open/mixed/urban) and analyzes the
 * variance. Identifies whether the warband is "terrain-dependent" — i.e.,
 * its winRate changes drastically between terrains — and produces insights
 * accordingly.
 *
 * Returns: { results: { open, mixed, urban }, insights: [...] }
 *
 * results.<terrain> is an array of standard runBattleSeries results.
 *
 * Insights:
 *   - Per-band variance: avg winRate across enemies in each terrain
 *   - Per-matchup variance: matchups that flip from winning to losing
 *     between terrains
 *   - Optimal terrain identification: terrain where banda peaks
 */
function analyzeTerrainVariance_lab(wb, enemyIds, opts) {
  opts = opts || {};
  const nBattles = opts.nBattles || 100;
  const enemyCost = opts.enemyCost || 700;
  const insights = [];

  // Run all 3 terrains
  const results = { open: [], mixed: [], urban: [] };
  for (const terrain of ['open','mixed','urban']) {
    for (const enemyId of enemyIds) {
      const enemyBand = scaleEnemyBand(enemyId, enemyCost);
      const enemyFactory = makeBandFactory_lab(enemyBand);
      const stats = runBattleSeries_lab(
        () => buildBattleBandFromWarband(wb),
        enemyFactory, nBattles, { terrain }
      );
      const opt = (typeof LAB_ENEMY_OPTIONS !== 'undefined')
        ? LAB_ENEMY_OPTIONS.find(o => o.id === enemyId) : null;
      results[terrain].push({
        enemyId,
        enemyLabel: opt ? opt.label : enemyId,
        ...stats,
      });
    }
  }

  // Compute average winRate per terrain
  const avgWin = {};
  for (const terrain of ['open','mixed','urban']) {
    const sum = results[terrain].reduce((s, r) => s + (r.winRateA || 0), 0);
    avgWin[terrain] = results[terrain].length ? sum / results[terrain].length : 0;
  }

  // Identify best and worst terrain
  const terrainOrder = ['open','mixed','urban'];
  let bestTerrain = 'mixed';
  let worstTerrain = 'mixed';
  for (const t of terrainOrder) {
    if (avgWin[t] > avgWin[bestTerrain]) bestTerrain = t;
    if (avgWin[t] < avgWin[worstTerrain]) worstTerrain = t;
  }
  const variance = avgWin[bestTerrain] - avgWin[worstTerrain];

  const terrainLabels = { open: 'Campo abierto', mixed: 'Mixto', urban: 'Urbano denso' };

  // Insight 1: overall terrain dependency
  if (variance >= 0.20) {
    // Significant variance: warband is terrain-sensitive
    const sev = variance >= 0.35 ? 'crit' : 'warn';
    insights.push({
      severity: sev,
      text: `<strong>Tu banda es muy sensible al terreno</strong>: ${(avgWin.open * 100).toFixed(0)}% en open, ` +
            `${(avgWin.mixed * 100).toFixed(0)}% en mixto, ${(avgWin.urban * 100).toFixed(0)}% en urbano. ` +
            `Mejor terreno: <strong>${terrainLabels[bestTerrain]}</strong> (${(avgWin[bestTerrain] * 100).toFixed(0)}%). ` +
            `Si controlas la setup del scenario o puedes negociar terreno con el rival, busca activamente este perfil.`,
      type: 'overall',
    });
  } else if (variance < 0.10) {
    insights.push({
      severity: 'good',
      text: `<strong>Banda terreno-agnóstica</strong>: rinde de forma similar en open (${(avgWin.open * 100).toFixed(0)}%), ` +
            `mixto (${(avgWin.mixed * 100).toFixed(0)}%) y urbano (${(avgWin.urban * 100).toFixed(0)}%). ` +
            `Versátil — no necesitas planificar setup específico.`,
      type: 'overall',
    });
  }

  // Insight 2: per-matchup terrain flips
  // For each enemy, check if winRate flips from >50% to <30% across terrains
  for (let i = 0; i < enemyIds.length; i++) {
    const open = results.open[i];
    const mixed = results.mixed[i];
    const urban = results.urban[i];
    if (!open || !mixed || !urban) continue;
    const winO = open.winRateA;
    const winM = mixed.winRateA;
    const winU = urban.winRateA;
    const max = Math.max(winO, winM, winU);
    const min = Math.min(winO, winM, winU);

    // Flip: winning >50% in one terrain but losing <30% in another
    const flips = max >= 0.5 && min <= 0.3;
    if (flips) {
      // Find which terrain is best and worst
      const map = { open: winO, mixed: winM, urban: winU };
      let best = 'open', worst = 'open';
      for (const t of terrainOrder) {
        if (map[t] > map[best]) best = t;
        if (map[t] < map[worst]) worst = t;
      }
      insights.push({
        severity: 'warn',
        text: `<strong>Vs ${open.enemyLabel}</strong>: el matchup cambia de <strong style="color:#7fb069;">${(map[best] * 100).toFixed(0)}% ` +
              `en ${terrainLabels[best].toLowerCase()}</strong> a <strong style="color:#c92424;">${(map[worst] * 100).toFixed(0)}% en ${terrainLabels[worst].toLowerCase()}</strong>. ` +
              `Lucha por elegir el setup; si te toca ${terrainLabels[worst].toLowerCase()}, juega objetivos secundarios.`,
        type: 'matchup',
      });
    } else if (max - min >= 0.20) {
      // Significant but not a flip — informational
      const map = { open: winO, mixed: winM, urban: winU };
      const lines = terrainOrder.map(t => `${terrainLabels[t]}: ${(map[t] * 100).toFixed(0)}%`).join(' · ');
      insights.push({
        severity: 'info',
        text: `<strong>Vs ${open.enemyLabel}</strong>: ${lines}. ${(max - min) * 100 | 0}pp de diferencia entre terrenos.`,
        type: 'matchup',
      });
    }
  }

  return { results, insights, avgWin, bestTerrain, worstTerrain };
}

/**
 * Evaluates how well a warband composition fits each canonical scenario
 * archetype. Returns insights with tier rating (S/A/B/C) and strategic
 * adjustments per scenario.
 *
 * Archetype → Trench Crusade scenarios mapping:
 *   - hold-ground (I): premia control de Objectives, supervivencia, resilience
 *   - capture-hold (X): 5 Objectives + Top Priority, Diving Charge VPs, mobility
 *   - high-ground (XI): Objectives elevados, Diving Charge, FLYING/jumpers
 *   - hunt-heroes (II): max ELITE models, kill LEADERS, antiElite + snipers
 *   - assault-defense (IV/VII): defender resilience + mines, attacker mobility + AoE
 *   - great-war (XII): kills puros (cost-based VPs), max damage output
 *
 * Tier scoring:
 *   S = composition is a perfect fit (≥80 score on key dimensions)
 *   A = strong fit with minor gaps
 *   B = workable but suboptimal
 *   C = composition struggles with this scenario
 */
function analyzeScenarioFit_lab(wb, coverage) {
  if (!wb || !coverage) return [];

  // Helper to compute battle band info
  let battleBand;
  try { battleBand = buildBattleBandFromWarband(wb); }
  catch (e) { return []; }
  if (!battleBand || !battleBand.length) return [];

  const nModels = battleBand.length;
  const hasFlying = battleBand.some(m => m.keywords && m.keywords.has('FLYING'));
  const hasInfiltrator = battleBand.some(m => m.keywords && m.keywords.has('INFILTRATOR'));
  const hasIgnoreDefendedObstacle = battleBand.some(m => m.keywords && m.keywords.has('IGNORE DEFENDED OBSTACLE'));
  const eliteCount = battleBand.filter(m => m.keywords && m.keywords.has('ELITE')).length;
  const toughCount = battleBand.filter(m => m.tough || (m.keywords && m.keywords.has('TOUGH'))).length;
  const hasSnipers = battleBand.some(m => m.aim || (m.weapons && m.weapons.some(w => w.keywords && w.keywords.has('CRITICAL') && w.isRanged)));
  const hasSetMine = battleBand.some(m => m.setMine);

  const c = (dim) => coverage[dim] ? coverage[dim].score : 0;

  // Compute per-scenario fit score (0-100), then map to tier
  const scenarios = [];

  // ── Hold Ground (I) ────────────────────────────────────────────────
  // Key: resilience (sobrevivir control rounds) + mobility moderada (mover
  // a objectives) + LEADER survivable (Morale Checks).
  {
    const score =
      c('resilience') * 0.50 +     // resiliencia es clave
      c('mobility') * 0.20 +       // mover a objectives
      c('antiElite') * 0.15 +      // matar threats sobre objective
      c('antiFear') * 0.15;        // FEAR cerca de objective es desastre
    scenarios.push({
      id: 'hold-ground',
      label: 'Hold the Line (I)',
      score,
      keyMetric: `resilience ${c('resilience')}/100`,
      strategy: nModels >= 9
        ? `Field Strength alta (${nModels} modelos): puedes cubrir 2 objectives a la vez. Despliega LEADER en cobertura, mueve para control mínimo posible.`
        : `Field Strength baja (${nModels} modelos): no puedes spread; concentra en 1 objective central, defiende con todo.`,
    });
  }

  // ── Capture & Hold (X) ─────────────────────────────────────────────
  // Key: mobility (5 objectives spread + Top Priority) + Diving Charge
  // (VPs), antiElite (kill defenders sobre objectives).
  {
    const mobilityWeight = c('mobility');
    const flyingBonus = hasFlying ? 15 : 0;
    const score = Math.min(100,
      mobilityWeight * 0.50 +
      c('antiElite') * 0.20 +
      c('resilience') * 0.20 +
      flyingBonus
    );
    let strategy;
    if (hasFlying) {
      strategy = `Tienes FLYING: pri orítario para Diving Charge VPs. Apunta a objectives elevados con modelos voladores; cada Diving Charge OoA = 1 VP extra.`;
    } else if (hasInfiltrator) {
      strategy = `INFILTRATOR en banda: deploy hasta 12" del rival, captura objectives lejanos en T1 antes que el rival reaccione.`;
    } else if (hasIgnoreDefendedObstacle) {
      strategy = `IGNORE DEFENDED OBSTACLE: tu charge ignora cobertura defensiva sobre objectives — push agresivo en T2-T3 a objectives ya defendidos.`;
    } else {
      strategy = `Sin movilidad apex, prioriza 2-3 objectives cercanos a tu deployment zone, no intentes el quinto remoto.`;
    }
    scenarios.push({
      id: 'capture-hold',
      label: 'Capture and Hold (X)',
      score,
      keyMetric: `mobility ${c('mobility')}/100${hasFlying ? ' + FLYING' : ''}`,
      strategy,
    });
  }

  // ── High Ground (XI) ───────────────────────────────────────────────
  // Key: vertical mobility (FLYING, climbers) + Diving Charge VPs.
  {
    const flyingBonus = hasFlying ? 30 : 0;
    const score = Math.min(100,
      c('mobility') * 0.40 +
      c('antiElite') * 0.20 +
      flyingBonus +
      (hasIgnoreDefendedObstacle ? 10 : 0)
    );
    let strategy;
    if (hasFlying) {
      strategy = `FLYING ignora terreno + ataca desde lo alto. Apunta el central (más alto = más VPs). Down with You y Death From Above son VPs gratuitos.`;
    } else {
      strategy = `Sin FLYING, climbeo manual: necesitas Risky Roll para subir. Concentra en 1-2 objectives accesibles, no intentes el central elevado.`;
    }
    scenarios.push({
      id: 'high-ground',
      label: 'The High Ground (XI)',
      score,
      keyMetric: hasFlying ? 'FLYING + mobility' : `mobility ${c('mobility')}/100`,
      strategy,
    });
  }

  // ── Hunt for Heroes (II) ───────────────────────────────────────────
  // Key: antiElite + antiArmour + snipers (HYF marks the priority threat).
  {
    const elitePresence = Math.min(30, eliteCount * 8);  // banda con ELITEs propios suma
    const score = Math.min(100,
      c('antiElite') * 0.35 +
      c('antiArmour') * 0.25 +
      (hasSnipers ? 15 : 0) +
      elitePresence
    );
    const strategy = hasSnipers
      ? `Tienes snipers: usa HYF/Aim en T1 sobre el LEADER enemigo. Sniper Rifle CRITICAL bypass armour potencial. Apunta SIEMPRE a sus ELITEs primero.`
      : `Sin snipers especializados, prioriza melee burst sobre los LEADERS rivales. Cuida los tuyos: 1 LEADER OoA = 1 VP enemigo.`;
    scenarios.push({
      id: 'hunt-heroes',
      label: 'Hunt for Heroes (II)',
      score,
      keyMetric: `antiElite ${c('antiElite')}/100, ${eliteCount} ELITEs propios`,
      strategy,
    });
  }

  // ── Assault / Defense (IV — Mines, VII — Resupply) ────────────────
  // Two roles: defender (resilience + mines) vs attacker (mobility + AoE).
  // We give the band the role that maximizes score.
  {
    const defenderScore =
      c('resilience') * 0.40 +
      (hasSetMine ? 25 : 0) +     // engineer es S-tier en defense
      c('antiHorde') * 0.20 +      // hordes vienen contra ti
      c('antiArmour') * 0.15;
    const attackerScore =
      c('mobility') * 0.40 +
      c('antiHorde') * 0.25 +      // need to clear defenders fast
      c('antiArmour') * 0.20 +
      (hasIgnoreDefendedObstacle ? 15 : 0);
    const isDefender = defenderScore >= attackerScore;
    const score = Math.max(defenderScore, attackerScore);
    let strategy;
    if (isDefender) {
      strategy = hasSetMine
        ? `Como defender, tu ENGINEER es S-tier: pon Set Mine cubriendo el approach del attacker en T1. Fortify ACTION añade COVER al engineer.`
        : `Como defender, anchor cobertura central; el attacker te llegará en T2-T3, no salgas a por él.`;
    } else {
      strategy = hasIgnoreDefendedObstacle
        ? `Como attacker, IGNORE DEFENDED OBSTACLE neutraliza la cobertura del defender; carga directo en T2.`
        : `Como attacker, presiona objectives múltiples: el defender no puede cubrir todo. AoE sobre clusters defensores.`;
    }
    scenarios.push({
      id: 'assault-defense',
      label: 'Assault/Defense (IV, VII)',
      score,
      keyMetric: isDefender
        ? `Defender (resilience ${c('resilience')}/100${hasSetMine ? ' + mines' : ''})`
        : `Attacker (mobility ${c('mobility')}/100)`,
      strategy,
    });
  }

  // ── Great War (XII) ────────────────────────────────────────────────
  // Kills puros (cost-based VPs). No morale checks. Premia damage output.
  {
    const score =
      c('antiArmour') * 0.30 +
      c('antiHorde') * 0.30 +
      c('antiElite') * 0.20 +
      c('resilience') * 0.20;
    const strategy = `Sin Morale Checks: no hay retirada. Maximiza damage output. Prioriza weapons con CRITICAL/IGNORE ARMOUR/BLAST. Cada modelo enemigo OoA = VPs ≈ coste/10.`;
    scenarios.push({
      id: 'great-war',
      label: 'Great War (XII)',
      score,
      keyMetric: `damage output (anti-* combined ${(c('antiArmour') + c('antiHorde') + c('antiElite')) / 3 | 0}/100)`,
      strategy,
    });
  }

  // Map score → tier
  const tierFor = (s) => s >= 80 ? 'S' : s >= 60 ? 'A' : s >= 40 ? 'B' : 'C';
  const tierColor = { S: '#7fb069', A: '#7fb069', B: '#d4a017', C: '#c92424' };
  const tierLabel = { S: 'Excelente', A: 'Bueno', B: 'Aceptable', C: 'Difícil' };

  return scenarios.map(s => {
    const tier = tierFor(s.score);
    const sev = tier === 'S' ? 'good' : tier === 'A' ? 'good' : tier === 'B' ? 'info' : 'warn';
    const text = `<strong>${s.label}</strong> · ` +
                 `<span style="color:${tierColor[tier]};font-weight:700;">Tier ${tier}</span> ` +
                 `(${tierLabel[tier]}, ${s.score | 0}/100, ${s.keyMetric}). ${s.strategy}`;
    return {
      scenarioId: s.id,
      fit: tier,
      severity: sev,
      score: s.score | 0,
      text,
    };
  });
}

/**
 * Builds a "factory" function that returns fresh copies of a battle band.
 * Used for the simulator (which mutates models in-place during battles).
 */
function makeBandFactory_lab(battleBand) {
  return () => battleBand.map(m => ({
    ...m,
    keywords: new Set(m.keywords),
    weapons: m.weapons.map(w => ({ ...w, keywords: new Set(w.keywords) })),
    bloodMarkers: 0,
    isDown: false,
    isOut: false,
  }));
}


