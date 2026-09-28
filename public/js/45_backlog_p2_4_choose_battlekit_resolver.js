/* ======================================================================
   BACKLOG P2/4 — choose-battlekit resolver.

   Canon options like Heavy Weapons Cache → Surplus carry:
     effect: { kind:'choose-battlekit', filter:{ keyword:'HEAVY' } }
   The player picks one battlekit from the warband's faction armoury
   filtered by the keyword; it lands in wb.arsenal at save time.

   getFactionArmouryByKeyword(factionId, keyword): pure. Scans every
   category in DATA.factions[fid].armoury and returns items whose
   weaponKeywords include the keyword (case-sensitive match — canon
   uses uppercase like 'HEAVY', 'FIRE').

   resolveChooseBattlekit(disc, kitData): mutator. Stores kitData
   verbatim in disc.chosenOption.resolvedKit. applyWizardOutcomesToWarband
   reads resolvedKit and pushes it to the Arsenal with source tag
   'exploration-choose'.
   ====================================================================== */

function getFactionArmouryByKeyword(factionId, keyword) {
  if (!factionId || !keyword) return [];
  const f = DATA.factions && DATA.factions[factionId];
  if (!f || !f.armoury || typeof f.armoury !== 'object') return [];
  const out = [];
  for (const category of Object.keys(f.armoury)) {
    const list = f.armoury[category];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !Array.isArray(item.weaponKeywords)) continue;
      if (item.weaponKeywords.includes(keyword)) {
        out.push(Object.assign({ _category: category }, item));
      }
    }
  }
  return out;
}

function resolveChooseBattlekit(disc, kitData) {
  if (!disc || !disc.chosenOption || !disc.chosenOption.effect) return;
  if (disc.chosenOption.effect.kind !== 'choose-battlekit') return;
  if (!kitData) return;
  disc.chosenOption.resolvedKit = {
    id: kitData.id,
    name: kitData.name,
    cost: typeof kitData.cost === 'number' ? kitData.cost : 0,
    currency: kitData.currency || '👑',
  };
}

function resolveGrantXpToEliteTargets(disc, modelUids) {
  if (!disc || !disc.chosenOption || !disc.chosenOption.effect) return;
  if (disc.chosenOption.effect.kind !== 'grant-xp-to-elites') return;
  const maxModels = disc.chosenOption.effect.maxModels || 1;
  const list = Array.isArray(modelUids) ? modelUids.slice(0, maxModels) : [];
  disc.chosenOption.resolvedTargets = list;
}

function extractExplorationEffectSummary(disc) {
  if (!disc || !disc.chosenOption || !disc.chosenOption.effect) {
    return { ducatsBonus: 0, pending: null };
  }
  const e = disc.chosenOption.effect;
  if (e.kind === 'add-ducats') {
    return { ducatsBonus: typeof e.amount === 'number' ? e.amount : 0, pending: null };
  }
  // Any other recognized canon kind is stored verbatim for later
  // resolution. We shallow-clone to avoid the historial getting tied
  // to the live table reference.
  return { ducatsBonus: 0, pending: Object.assign({}, e) };
}

function sumExplorationDucatsBonus(w) {
  if (!w || !w.battle || !Array.isArray(w.battle.discoveries)) return 0;
  let total = 0;
  for (const d of w.battle.discoveries) {
    total += extractExplorationEffectSummary(d).ducatsBonus;
  }
  return total;
}

function pickExplorationOption(disc, optionId) {
  if (!disc || !disc.result || !disc.result.entry) return;
  const options = disc.result.entry.options;
  if (!Array.isArray(options)) return;
  const opt = options.find(o => o && o.id === optionId);
  if (!opt) return;
  disc.chosenOptionId = opt.id;
  // Snapshot so the discovery record stays self-contained even if the
  // canon table is mutated/migrated later. Cheap shallow clone.
  disc.chosenOption = Object.assign({}, opt);
  if (opt.effect) disc.chosenOption.effect = Object.assign({}, opt.effect);
  if (opt.restriction) disc.chosenOption.restriction = Object.assign({}, opt.restriction);
}

function explorationKeyFor(discoveryRecord) {
  if (!discoveryRecord || !discoveryRecord.result) return null;
  const r = discoveryRecord.result;
  if (r.kind === 'pillaged') return null;
  const tableName = (discoveryRecord.tableName) || 'common';
  const total = discoveryRecord.rollTotal;
  if (r.kind === 'fork' && r.entry && typeof r.entry.forkIndex === 'number') {
    return tableName + ':' + total + '#' + r.entry.forkIndex;
  }
  return tableName + ':' + total;
}

function applyWizardOutcomesToWarband(wb, w, fb) {
  if (!wb || !Array.isArray(wb.models)) return wb;
  if (!w || !w.battle || !Array.isArray(w.battle.participants) || !w.battle.participants.length) return wb;
  const part = w.battle.participants[0];

  // Ensure baseProgression exists on touched models, then apply XP gain.
  if (fb && fb.xpAwarded) {
    for (const uid of Object.keys(fb.xpAwarded)) {
      const m = wb.models.find(x => x.uid === uid);
      if (!m) continue;
      if (!m.baseProgression) m.baseProgression = { xp: 0, advancements: [], scars: [] };
      if (typeof m.baseProgression.xp !== 'number') m.baseProgression.xp = 0;
      m.baseProgression.xp += fb.xpAwarded[uid];
    }
  }

  // Append advancements and scars per model outcome.
  for (const out of (part.modelOutcomes || [])) {
    const m = wb.models.find(x => x.uid === out.modelUid);
    if (!m) continue;
    if (!m.baseProgression) m.baseProgression = { xp: 0, advancements: [], scars: [] };

    if (Array.isArray(out.advancementsChosen)) {
      if (!Array.isArray(m.baseProgression.advancements)) m.baseProgression.advancements = [];
      for (const adv of out.advancementsChosen) {
        if (adv) m.baseProgression.advancements.push(adv);
      }
    }

    if (out.injury) {
      if (!Array.isArray(m.baseProgression.scars)) m.baseProgression.scars = [];
      m.baseProgression.scars.push(out.injury);
      // Head Wound: per canon, model can no longer gain XP.
      if (out.injury.id === 'head-wound') {
        m.baseProgression.cannotGainXp = true;
      }
    }
  }

  // Merge new discoveredLocations key, if any.
  if (!Array.isArray(wb.discoveredLocations)) wb.discoveredLocations = [];
  if (fb && Array.isArray(fb.discoveries)) {
    for (const d of fb.discoveries) {
      if (d.key && !wb.discoveredLocations.includes(d.key)) {
        wb.discoveredLocations.push(d.key);
      }
    }
  }

  // Fase 5.5 — apply grant-xp-to-elites pending effects with resolved targets.
  if (fb && Array.isArray(fb.discoveries)) {
    for (const d of fb.discoveries) {
      const pe = d.pendingEffect;
      const targets = d.chosenOption && Array.isArray(d.chosenOption.resolvedTargets)
                        ? d.chosenOption.resolvedTargets : null;
      if (!pe || pe.kind !== 'grant-xp-to-elites' || !targets || !targets.length) continue;
      const xpGrant = typeof pe.xp === 'number' ? pe.xp : 0;
      if (xpGrant <= 0) continue;
      for (const uid of targets) {
        const m = wb.models.find(x => x.uid === uid);
        if (!m) continue;
        if (!m.baseProgression) m.baseProgression = { xp: 0, advancements: [], scars: [] };
        if (typeof m.baseProgression.xp !== 'number') m.baseProgression.xp = 0;
        m.baseProgression.xp += xpGrant;
      }
    }
  }

  // Fase 5.6 — apply add-named-battlekit pending effects to the Arsenal.
  if (fb && Array.isArray(fb.discoveries)) {
    for (const d of fb.discoveries) {
      const pe = d.pendingEffect;
      if (!pe || pe.kind !== 'add-named-battlekit') continue;
      addToArsenal(wb, {
        name: pe.name,
        currency: pe.currency,
        cost: pe.cost,
        source: 'exploration',
      });
    }
  }

  // BACKLOG P2/4 — apply choose-battlekit pending with resolvedKit.
  if (fb && Array.isArray(fb.discoveries)) {
    for (const d of fb.discoveries) {
      const pe = d.pendingEffect;
      const kit = d.chosenOption && d.chosenOption.resolvedKit;
      if (!pe || pe.kind !== 'choose-battlekit' || !kit) continue;
      addToArsenal(wb, {
        name: kit.name,
        currency: kit.currency,
        cost: kit.cost,
        source: 'exploration-choose',
      });
    }
  }

  // Fase 5.7 — temporary bonuses. First decay any next-game bonuses
  // accumulated before this battle (they applied to THIS one), then
  // push new ones from pending morale-bonus effects (they apply NEXT).
  if (!Array.isArray(wb.tempBonuses)) wb.tempBonuses = [];
  wb.tempBonuses = wb.tempBonuses.filter(b => !(b && b.scope === 'next-game'));
  if (fb && Array.isArray(fb.discoveries)) {
    for (const d of fb.discoveries) {
      const pe = d.pendingEffect;
      if (!pe || pe.kind !== 'morale-bonus') continue;
      wb.tempBonuses.push({
        kind: 'morale-bonus',
        dice: typeof pe.dice === 'number' ? pe.dice : 1,
        scope: pe.scope || 'next-game',
        sourceBattleId: (w.battle && w.battle.id) || null,
        addedAt: new Date().toISOString(),
      });
    }
  }

  return wb;
}

function summarizeWizardLoot(w) {
  if (!w || !w.battle || !Array.isArray(w.battle.participants)) return [];
  const discoveries = Array.isArray(w.battle.discoveries) ? w.battle.discoveries : [];
  return w.battle.participants.map(p => {
    const disc = discoveries.find(d => d && d.warbandId === p.warbandId);
    const lootDucats = (disc && disc.result && typeof disc.result.lootDucats === 'number')
      ? disc.result.lootDucats : 0;
    const ducatsEarned = typeof p.ducatsEarned === 'number' ? p.ducatsEarned : 0;
    const baseGlory    = typeof p.gloryEarned  === 'number' ? p.gloryEarned  : 0;
    // Canon p.97 — each Glorious Deed adds +1 ☼ on top of the base reward.
    const deedGlory    = participantDeedCount(p);
    const gloryEarned  = baseGlory + deedGlory;
    return {
      warbandId: p.warbandId,
      ducatsEarned,
      baseGlory,
      deedGlory,
      gloryEarned,
      lootDucats,
      totalDucats: ducatsEarned + lootDucats,
    };
  });
}

/**
 * Returns true if a unit can be Promoted to ELITE in this faction (canon page 106).
 * Mercenaries (factionId='mercenaries' or unit found via mercenaries lookup)
 * follow the same rules as members of the faction they're attached to.
 */
function canBePromoted(factionId, unitId) {
  if (!factionId) return true;
  const pu = getUnit(factionId, unitId);
  if (pu && pu.cannotPromote) return false;
  const list = CAMPAIGN_TABLES.cannotBePromoted[factionId];
  if (!list) return true;
  return !list.includes(unitId);
}

/**
 * Returns the XP cap for a model (canon page 111: Limited Potential = max 7 XP).
 * Returns Infinity if the model has no cap.
 */
function xpCapFor(factionId, unitId) {
  if (!factionId) return Infinity;
  const list = CAMPAIGN_TABLES.limitedPotential[factionId];
  if (list && list.includes(unitId)) {
    return CAMPAIGN_TABLES.limitedPotentialMaxXP;
  }
  return Infinity;
}

/**
 * Looks up a Trauma Table entry by D66 roll. Roll 41-63 is treated as the
 * "Full Recovery" band entry. Pass either a specific number (11..66) or
 * the band string '41-63'.
 */
function traumaRollLookup(roll) {
  // Direct match first
  let entry = CAMPAIGN_TABLES.traumaTable.find(e => e.roll === roll);
  if (entry) return entry;
  // Band 41-63 covers any number in that range
  const n = typeof roll === 'number' ? roll : parseInt(roll, 10);
  if (!isNaN(n) && n >= 41 && n <= 63) {
    return CAMPAIGN_TABLES.traumaTable.find(e => e.roll === '41-63');
  }
  return null;
}


