/* ======================================================================
   Skill lookup helpers — used by the Wildcard Skill integrations
   (War Stories, Show Off, Glory Hound, War-Luck, 'Tis But a Scratch).

   Skills are stored as `advancements` entries on the model with the
   canonical name from CAMPAIGN_TABLES.skillTables. The Trauma table's
   'Hardened' positive entry also lands in advancements; the helper
   matches by name so it doesn't matter which path added the skill.
   ====================================================================== */

function modelHasSkill(model, skillName) {
  if (!model || !model.baseProgression || !skillName) return false;
  const advs = model.baseProgression.advancements || [];
  for (const a of advs) {
    if (a && a.name === skillName) return true;
  }
  return false;
}

function countWarbandSkill(wb, skillName) {
  if (!wb || !Array.isArray(wb.models)) return 0;
  let n = 0;
  for (const m of wb.models) if (modelHasSkill(m, skillName)) n++;
  return n;
}

/* War Stories (Wildcard 11): +1 XP to each ELITE in the warband that does
 * NOT have War Stories itself, provided at least one model in the band
 * has the skill. Returns the bonus amount for this specific model. */
function warStoriesBonusFor(model, wb) {
  if (!model || !wb) return 0;
  if (modelHasSkill(model, 'War Stories')) return 0;
  for (const m of wb.models || []) {
    if (m !== model && modelHasSkill(m, 'War Stories')) return 1;
  }
  return 0;
}

/* Show Off (Wildcard 8): +1 D6 to the Promotion Pool per model with the
 * skill. Pure count. */
function showOffPoolBonus(wb) {
  return countWarbandSkill(wb, 'Show Off');
}

/* Glory Hound (Wildcard 10): +1 ☼ per model with the skill that was on
 * the battlefield. Counts modelOutcomes with participated=true whose
 * model has Glory Hound. */
function gloryHoundBonus(wb, modelOutcomes) {
  if (!wb || !Array.isArray(wb.models) || !Array.isArray(modelOutcomes)) return 0;
  let n = 0;
  for (const out of modelOutcomes) {
    if (!out || out.participated === false) continue;
    const m = wb.models.find(x => x.uid === out.modelUid);
    if (m && modelHasSkill(m, 'Glory Hound')) n++;
  }
  return n;
}

/* Glorious Deeds count for a participant. Each model outcome's `feats`
 * field records the Glorious Deeds that model performed in the game.
 * Canon p.97: each Glorious Deed grants +1 ☼ to the warband (separate
 * from the win/draw/loss reward). This helper totals them so the glory
 * application paths can add the deed glory on top of the base reward.
 */
function participantDeedCount(part) {
  if (!part || !Array.isArray(part.modelOutcomes)) return 0;
  let n = 0;
  for (const out of part.modelOutcomes) {
    if (!out || out.participated === false) continue;
    n += (out.feats || 0);
  }
  return n;
}

/* Exploration Looting credited by a battle to a given warband: the
 * discovery's lootDucats (rollTotal × 10, canon p.113). Used by both the
 * free path (fb.loot) and campaignBalance so removing the non-canon
 * win/draw/loss reward doesn't leave campaign bands without income. */
function battleExplorationLoot(battle, wid) {
  if (!battle || !Array.isArray(battle.discoveries)) return 0;
  const disc = battle.discoveries.find(d => d && d.warbandId === wid);
  if (disc && disc.result && typeof disc.result.lootDucats === 'number') {
    return disc.result.lootDucats;
  }
  return 0;
}

/* Recompute each model's `feats` from the scenario deed assignments
 * stored in part.deeds ({ deedName: modelUid }). One Glorious Deed per
 * model = +1 feat. This is only invoked when the scenario deed UI is
 * active, so non-scenario battles keep their manually-entered feats.
 */
function recomputeFeatsFromDeeds(part) {
  if (!part || !Array.isArray(part.modelOutcomes)) return;
  const counts = {};
  const deeds = part.deeds || {};
  for (const uid of Object.values(deeds)) {
    if (!uid) continue;
    counts[uid] = (counts[uid] || 0) + 1;
  }
  for (const out of part.modelOutcomes) {
    out.feats = counts[out.modelUid] || 0;
  }
}

/* War-Luck (Wildcard 3): +1 extra Battle Scar before Unfit for Duty.
 * Canon Unfit threshold = 3 scars. War-Luck pushes it to 4. */
function unfitScarThreshold(model) {
  const base = 3;
  if (!model) return base;
  return modelHasSkill(model, 'War-Luck') ? base + 1 : base;
}

function isModelUnfitForDuty(model) {
  if (!model || !model.baseProgression) return false;
  const scars = (model.baseProgression.scars || []).filter(s => s && s.source === 'trauma');
  return scars.length >= unfitScarThreshold(model);
}

/* 'Tis But a Scratch (Wildcard 4): re-roll the D66 Trauma roll once.
 * Tracked on the outcome via out.scratchRerollUsed. */
function canUseScratchReroll(model, out) {
  if (!model || !out) return false;
  if (!modelHasSkill(model, "'Tis But a Scratch")) return false;
  return out.scratchRerollUsed !== true;
}

function computeModelXPGain(out, model, wb) {
  if (!out || out.participated === false) return 0;
  // Canon p.117 — Head Wound prevents further XP.
  if (model && model.baseProgression && model.baseProgression.cannotGainXp === true) {
    return 0;
  }
  // Canon p.103 — only ELITE models gain XP through this mechanism.
  // Skip the gate when no model is provided (legacy archival callers).
  if (model && !_outcomeModelIsElite(model, wb)) return 0;
  // Step C — gate XP after Trauma. Dead/captured don't gain XP.
  if (out.injury) {
    const iid = out.injury.id;
    if (iid === 'dead' || iid === 'captured') return 0;
  }
  if (model && model.baseProgression) {
    const st = model.baseProgression.status;
    if (st === 'dead' || st === 'captured') return 0;
  }
  let xp = 1;                            // survival bonus (canon: even if OoA)
  if ((out.feats || 0) >= 1) xp += 1;    // ≥1 Glorious Deed → +1 cap
  // Pre-D66 'bitter-exp' fallback — modern D66 65 'bitter-lessons'
  // grants D3 XP at trauma roll time (BACKLOG: surface D3 in wizard).
  if (out.injury && out.injury.id === 'bitter-exp') xp += 1;
  // War Stories (Wildcard 11): +1 XP to each ELITE that doesn't carry
  // the skill, provided the warband has a War Stories bearer.
  if (model && wb) xp += warStoriesBonusFor(model, wb);
  return xp;
}

function getCurrentModelXP(wb, modelUid, ctx) {
  if (!wb || !modelUid) return 0;
  ctx = ctx || {};
  if (ctx.context === 'campaign') {
    const ws = ctx.warbandStates && ctx.warbandStates[wb.id];
    if (!ws || !ws.modelStates) return 0;
    const ms = ws.modelStates[modelUid];
    return (ms && typeof ms.xp === 'number') ? ms.xp : 0;
  }
  // 'free' (and default): read from the warband itself.
  const m = wb.models && wb.models.find(x => x.uid === modelUid);
  if (!m || !m.baseProgression) return 0;
  return typeof m.baseProgression.xp === 'number' ? m.baseProgression.xp : 0;
}

function wizardHasAdvancements(w, opts) {
  if (!w || !w.battle || !Array.isArray(w.battle.participants)) return false;
  opts = opts || {};
  const ctx = { context: w.context || 'campaign' };
  // Campaign context needs warbandStates; the caller (the live wizard)
  // pulls them from STATE.currentCampaign. Tests pass them through opts.
  if (ctx.context === 'campaign') {
    const c = opts.campaign || (typeof STATE !== 'undefined' ? STATE.currentCampaign : null);
    ctx.warbandStates = c ? (c.warbandStates || {}) : {};
  }
  const getWb = opts.getWarband || ((id) => (typeof loadWarband === 'function' ? loadWarband(id) : null));
  for (const part of w.battle.participants) {
    if (!part || !Array.isArray(part.modelOutcomes)) continue;
    const wb = getWb(part.warbandId);
    if (!wb) continue;
    for (const out of part.modelOutcomes) {
      if (!out || out.participated === false) continue;
      const before = getCurrentModelXP(wb, out.modelUid, ctx);
      const model = (Array.isArray(wb.models) ? wb.models.find(m => m.uid === out.modelUid) : null);
      const gain = computeModelXPGain(out, model, wb);
      if (gain <= 0) continue;
      if (advancementsEarned(before + gain) > advancementsEarned(before)) return true;
    }
  }
  return false;
}


