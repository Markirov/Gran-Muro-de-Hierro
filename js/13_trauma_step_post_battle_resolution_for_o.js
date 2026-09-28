/* ======================================================================
   TRAUMA STEP — post-battle resolution for OoA models
   Canon (Digital Rulebook pages 101-103):
   - Troops OoA roll 1D6: 1-2 = killed, 3+ = survives (no other effect)
   - ELITEs OoA roll D66 on Trauma Table: outcome can be Death, Capture,
     Battle Scar, Full Recovery, or a positive effect
   - Each ELITE OoA gets 1 Battle Scar by default (unless table says
     otherwise — Recovery and positive results don't add scars)
   - 3 Battle Scars = "Unfit for Duty", model removed from Roster
   ====================================================================== */

/**
 * Roll 1D6 for a Troop. Returns { value, survived }.
 * Per canon: 1-2 = killed, 3+ = survives.
 */
function rollTroopBloodbath() {
  const value = 1 + Math.floor(Math.random() * 6);
  return { value, survived: value >= 3 };
}

/**
 * Returns the OoA models from a session, separated by Troop vs ELITE.
 * Used to render the Trauma Step section after battle.
 *
 * Returns { troops: [{uid, modelState}, ...], elites: [{uid, modelState}, ...] }
 */
function getOoaModelsByType(session) {
  const out = { troops: [], elites: [] };
  if (!session || !session.modelStates) return out;
  for (const [uid, ms] of Object.entries(session.modelStates)) {
    if (ms.status !== 'out') continue;  // Only OoA — not down, not alive
    const entry = { uid, modelState: ms };
    if (ms.isElite) out.elites.push(entry);
    else out.troops.push(entry);
  }
  return out;
}

/**
 * Look up a D66 trauma roll value in CAMPAIGN_TABLES.traumaTable.
 * Handles the 41-63 "Full Recovery" range. Falls back to a built-in
 * canonical mapping if CAMPAIGN_TABLES is not yet defined (e.g. when
 * the trauma functions are imported as a module before the global
 * catalog has loaded).
 */
const _CANON_TRAUMA_FALLBACK = {
  11: { kind: 'death',          name: 'Dead' },
  12: { kind: 'capture',        name: 'Captured' },
  13: { kind: 'scar',           name: 'Severe Nerve Damage' },
  14: { kind: 'scar',           name: 'Hand Wound' },
  15: { kind: 'scar',           name: 'Lost an Eye',          mechanicalEffect: 'ranged-1' },
  16: { kind: 'scar',           name: 'Chest Wound' },
  21: { kind: 'scar',           name: 'Insomniac' },
  22: { kind: 'scar',           name: 'Head Wound' },
  23: { kind: 'scar',           name: 'Shell-shocked' },
  24: { kind: 'scar',           name: 'Dark Memory' },
  25: { kind: 'scar',           name: 'Paranoid' },
  26: { kind: 'scar',           name: 'Lost Arm' },
  31: { kind: 'scar',           name: 'Leg Wound',            mechanicalEffect: 'move-2' },
  32: { kind: 'scar',           name: 'Expensive Treatment' },
  33: { kind: 'scar',           name: 'Possessed' },
  34: { kind: 'scar',           name: 'Muscle Damage' },
  35: { kind: 'lost-game',      name: 'Minor Wound' },
  36: { kind: 'lost-equipment', name: 'Robbed' },
  64: { kind: 'positive',       name: 'Hardened',             mechanicalEffect: 'gain-keyword:NEGATE FEAR' },
  65: { kind: 'positive',       name: 'Bitter Lessons' },
  66: { kind: 'positive',       name: 'Prominent Scar' },
};

function lookupTraumaEntry(value) {
  // Prefer CAMPAIGN_TABLES if loaded (richer detail in Spanish for UI)
  if (typeof CAMPAIGN_TABLES !== 'undefined' && CAMPAIGN_TABLES.traumaTable) {
    for (const e of CAMPAIGN_TABLES.traumaTable) {
      if (typeof e.roll === 'number' && e.roll === value) return e;
    }
    if (value >= 41 && value <= 63) {
      return CAMPAIGN_TABLES.traumaTable.find(e => e.roll === '41-63') || null;
    }
  }
  // Fallback to built-in canonical map (for module loading + tests)
  if (value >= 41 && value <= 63) {
    return { kind: 'recovery', name: 'Full Recovery' };
  }
  return _CANON_TRAUMA_FALLBACK[value] || null;
}

/**
 * Apply a trauma resolution to a session+warband. Mutates:
 *   - session.modelStates[uid].traumaResolved = { kind, name, value, entryId }
 *   - For ELITEs: warband model.baseProgression.scars / .status as canon dictates
 *   - For Troops with kind=death: model marked dead in baseProgression
 *
 * Idempotent: re-applying returns { alreadyResolved: true } and no-op.
 *
 * @param session - battle session
 * @param uid - model uid to apply trauma to
 * @param type - 'troop' or 'elite'
 * @param roll - { value } for troops, { tens, units, value } for elites
 * @param warband - the warband to mutate (for ELITE scars/status)
 * @returns { success, alreadyResolved?, entry?, error? }
 */
function applyTraumaResolution(session, uid, type, roll, warband) {
  if (!session || !session.modelStates[uid]) {
    return { success: false, error: 'Invalid session/uid' };
  }
  const ms = session.modelStates[uid];
  if (ms.traumaResolved) {
    return { alreadyResolved: true, entry: ms.traumaResolved };
  }

  if (type === 'troop') {
    const survived = roll.survived !== undefined ? roll.survived : (roll.value >= 3);
    ms.traumaResolved = {
      kind: survived ? 'recovery' : 'death',
      name: survived ? 'Survived (1D6 ' + roll.value + ')' : 'Killed (1D6 ' + roll.value + ')',
      value: roll.value,
      type: 'troop',
    };
    if (!survived && warband) {
      // Mark Troop as dead — Battlekit lost per canon
      const m = warband.models.find(mm => mm.uid === uid);
      if (m) {
        if (!m.baseProgression) m.baseProgression = { xp: 0, advancements: [], scars: [] };
        m.baseProgression.status = 'dead';
        m.baseProgression.scars.push({
          name: `KIA (1D6 ${roll.value})`,
          source: 'trauma',
        });
      }
    }
    return { success: true, entry: ms.traumaResolved };
  }

  if (type === 'elite') {
    const canonEntry = lookupTraumaEntry(roll.value);
    if (!canonEntry) {
      return { success: false, error: 'Invalid D66 value: ' + roll.value };
    }
    ms.traumaResolved = {
      kind: canonEntry.kind,
      name: canonEntry.name,
      value: roll.value,
      detail: canonEntry.detail,
      type: 'elite',
      mechanicalEffect: canonEntry.mechanicalEffect,
    };
    if (warband) {
      const m = warband.models.find(mm => mm.uid === uid);
      if (m) {
        if (!m.baseProgression) m.baseProgression = { xp: 0, advancements: [], scars: [] };
        if (canonEntry.kind === 'death') {
          m.baseProgression.status = 'dead';
          m.baseProgression.scars.push({
            name: `${canonEntry.name} (D66 ${roll.value})`,
            source: 'trauma',
          });
        } else if (canonEntry.kind === 'capture') {
          m.baseProgression.status = 'captured';
          m.baseProgression.scars.push({
            name: `${canonEntry.name} (D66 ${roll.value})`,
            source: 'trauma',
          });
        } else if (canonEntry.kind === 'scar' || canonEntry.kind === 'lost-game' || canonEntry.kind === 'lost-equipment') {
          m.baseProgression.scars.push({
            name: `${canonEntry.name} (D66 ${roll.value})`,
            source: 'trauma',
          });
        } else if (canonEntry.kind === 'positive') {
          // 64 Hardened: NEGATE FEAR keyword. 65 Bitter Lessons: D3 XP. 66: Prominent Scar.
          // Add as advancement (positive — not a scar).
          if (!m.baseProgression.advancements) m.baseProgression.advancements = [];
          const adv = {
            name: canonEntry.name,
            source: 'trauma',
            traumaRoll: roll.value,
          };
          if (canonEntry.mechanicalEffect && canonEntry.mechanicalEffect.startsWith('gain-keyword:')) {
            adv.grantsKeyword = canonEntry.mechanicalEffect.split(':')[1];
          }
          if (canonEntry.name === 'Bitter Lessons') {
            // D3 XP — apply average (2) for now; user can adjust manually
            const d3 = 1 + Math.floor(Math.random() * 3);
            m.baseProgression.xp = (m.baseProgression.xp || 0) + d3;
            adv.bonusXP = d3;
          }
          m.baseProgression.advancements.push(adv);
        }
        // Recovery: nothing happens, no scar.
      }
    }
    return { success: true, entry: ms.traumaResolved };
  }

  return { success: false, error: 'Unknown type: ' + type };
}


