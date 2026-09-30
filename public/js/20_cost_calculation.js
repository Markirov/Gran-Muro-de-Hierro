// @ts-nocheck -- puente legacy: mantiene compatibilidad con datos sin tipar.

/* ======================================================================
   COST CALCULATION
   ====================================================================== */

function getUnit(factionId, unitId) {
  const f = DATA.factions[factionId];
  if (!f) return null;
  return f.units.find(u => u.id === unitId)
    || DATA.mercenaries.find(m => m.id === unitId);
}

/**
 * Returns the active variant object for a warband, or null if none/no match.
 * Variants are defined per-faction with id, name, summary, specialRule, and
 * optionally forbiddenUnitIds, mandatoryUnits, additionalUpgrades, etc.
 */
function getActiveVariant(wb) {
  if (!wb || !wb.variantId) return null;
  const f = DATA.factions[wb.factionId];
  if (!f || !f.variants) return null;
  return f.variants.find(v => v.id === wb.variantId) || null;
}

/**
 * Returns the faction units that should appear in the recruit catalogue for
 * this warband, applying the `variantOnly` gate: a unit tagged
 * `variantOnly:'<variantId>'` is shown only when that variant is active.
 * Base units (no variantOnly tag) always appear. Forbidden units are NOT
 * filtered here — the catalogue still renders them disabled with a reason.
 *
 * Pure: returns a filtered slice of f.units, never mutates the catalogue.
 */
function unitsAvailableForWarband(wb) {
  const f = wb && DATA.factions[wb.factionId];
  if (!f || !Array.isArray(f.units)) return [];
  const activeVariantId = wb.variantId || null;
  return f.units.filter(u => {
    if (u.variantOnly && u.variantOnly !== activeVariantId) return false;
    return true;
  });
}

/**
 * Checks if a given unit is forbidden by the warband's active variant.
 * Returns the variant name if forbidden, else null.
 */
function unitForbiddenByVariant(wb, unitId) {
  const v = getActiveVariant(wb);
  if (!v || !v.forbiddenUnitIds) return null;
  return v.forbiddenUnitIds.includes(unitId) ? v.name : null;
}

/**
 * Returns the list of additional upgrades that apply to a given unit due to
 * the active variant. Returns [] if no variant or no upgrades for this unit.
 */
function variantUpgradesForUnit(wb, unitId) {
  const v = getActiveVariant(wb);
  if (!v || !v.additionalUpgrades) return [];
  return v.additionalUpgrades
    .filter(u => u.unitId === unitId)
    .map(u => u.upgrade);
}

/**
 * Returns the override object that the active variant applies to this unit,
 * or null if none. The override can include:
 *   - limit: new limit string (e.g. "0-2" instead of "0-1")
 *   - stats: { movement, ranged, melee, armour, base } — partial, deep-merged
 *   - cost: new cost
 *   - keywords: replacement keyword list
 *
 * Used to compute a "unit view" for display, classification and PDF.
 */
function variantUnitOverride(wb, unitId) {
  const v = getActiveVariant(wb);
  if (!v || !v.unitOverrides) return null;
  const entry = v.unitOverrides.find(o => o.unitId === unitId);
  return entry ? entry.overrides : null;
}

/**
 * Returns the unit, with overrides applied by the active variant.
 * Always returns a NEW object — never mutates the catalogue.
 */
function getUnitWithVariant(wb, unitId) {
  const base = getUnit(wb && wb.factionId, unitId);
  if (!base) return null;
  const ov = wb ? variantUnitOverride(wb, unitId) : null;
  if (!ov) return base;
  // Shallow copy + deep-merge stats
  const merged = Object.assign({}, base, ov);
  if (ov.stats) {
    merged.stats = Object.assign({}, base.stats || {}, ov.stats);
  }
  return merged;
}

// Pass `wb` to get the item as the warband's active variant sees it
// (variant.armouryOverrides: cost, restriction, forbidden…).
function findBattlekitItem(factionId, kitId, wb) {
  const f = DATA.factions[factionId];
  if (!f) return null;
  for (const cat of Object.values(f.armoury)) {
    const found = cat.find(x => x.id === kitId);
    if (found) return wb ? variantArmouryItem(wb, found) : found;
  }
  // Items the variant lets the warband buy from other armouries
  const v = wb ? getActiveVariant(wb) : null;
  for (const fa of ((v && v.foreignArmoury) || [])) {
    const ff = DATA.factions[fa.factionId];
    if (!ff) continue;
    for (const cat of Object.values(ff.armoury)) {
      const found = cat.find(x => x.id === kitId);
      if (found) return Object.assign({}, found, { _foreignFaction: fa.factionId },
        itemHasForbiddenKeyword(v, found) ? { forbidden: true } : {});
    }
  }
  return null;
}

/**
 * Other factions' armouries the active variant opens (House of Wisdom
 * Weapon Collections). Returns [{ factionId, name, max, label, items }].
 */
function foreignArmouryItems(wb) {
  const v = wb ? getActiveVariant(wb) : null;
  return ((v && v.foreignArmoury) || []).map(fa => {
    const ff = DATA.factions[fa.factionId];
    const items = [];
    for (const [cat, list] of Object.entries((ff && ff.armoury) || {})) {
      if (/^anchorite/.test(cat)) continue;
      for (const it of list) {
        if (it.variantOnly || itemHasForbiddenKeyword(v, it)) continue;
        items.push(Object.assign({}, it, { _foreignFaction: fa.factionId }));
      }
    }
    return { factionId: fa.factionId, name: ff ? ff.name : fa.factionId,
             max: fa.max, label: fa.label || 'Otra armería', items };
  });
}

/**
 * Item with the active variant's armouryOverrides applied. Always a copy
 * when overridden; the catalogue is never mutated. Override fields:
 *   cost, currency, restriction  — replace the base value
 *   forbidden: true              — the variant cannot take it
 *   note                         — replaces the rules note
 */
/** Item has (or gives, e.g. AMMUNITION (FIRE)) one of the variant's banned keywords. */
function itemHasForbiddenKeyword(v, item) {
  const banned = (v && v.forbiddenItemKeywords) || [];
  if (!banned.length) return false;
  return (item.weaponKeywords || []).some(k => {
    const m = String(k).match(/^AMMUNITION \((.+)\)$/i);
    return banned.includes(m ? m[1] : k);
  });
}

function variantArmouryItem(wb, item) {
  const v = wb ? getActiveVariant(wb) : null;
  const ov = v && v.armouryOverrides && v.armouryOverrides[item.id];
  let out = ov ? Object.assign({}, item, ov, { _variantOverride: true }) : item;
  // Preserve the Loot (Knights of Avarice): no FIRE / SHRAPNEL Battlekit
  if (itemHasForbiddenKeyword(v, out)) out = Object.assign({}, out, { forbidden: true });
  // Masters of the Grenade (Prussia): +X" to every Grenade's range
  if (v && v.grenadeRangeBonus && /^\d+"$/.test(out.range || '') &&
      getArmouryCategory(wb.factionId, item.id) === 'grenades') {
    out = Object.assign({}, out, { range: (parseInt(out.range, 10) + v.grenadeRangeBonus) + '"', _variantOverride: true });
  }
  return out;
}

/** Armoury category list as the warband sees it (overrides applied, forbidden removed). */
function armouryItemsForWarband(wb, catKey) {
  const f = DATA.factions[wb.factionId];
  if (!f || !f.armoury) return [];
  return (f.armoury[catKey] || [])
    .map(it => variantArmouryItem(wb, it))
    .filter(it => !it.forbidden);
}

/**
 * Returns all upgrades available to a model: those defined on the unit plus
 * any added by the active variant. Variant upgrades are tagged with
 * `_fromVariant: true` for the UI to highlight them.
 */
function allAvailableUpgrades(unit, wb) {
  let base = (unit && unit.upgrades) ? unit.upgrades.slice() : [];
  if (!wb || !unit) return base;
  const av = getActiveVariant(wb);
  if (av && av.forbiddenUpgradeIds) {
    base = base.filter(u => !av.forbiddenUpgradeIds.includes(u.id));
  }
  if (av && av.upgradeOverrides) {
    base = base.map(u => av.upgradeOverrides[u.id] ? Object.assign({}, u, av.upgradeOverrides[u.id]) : u);
  }
  const variantUps = variantUpgradesForUnit(wb, unit.id);
  for (const up of variantUps) {
    // Avoid duplicates by id
    if (base.some(b => b.id === up.id)) continue;
    base.push(Object.assign({ _fromVariant: true }, up));
  }
  return base;
}

/**
 * Returns the upgrade objects that are active on this model.
 * Each unit can declare an `upgrades` array; the model stores `model.upgrades`
 * as a list of activated upgrade ids. Variants can also add upgrades.
 */
function activeUpgrades(model, unit, wb) {
  const all = allAvailableUpgrades(unit, wb || (typeof STATE !== 'undefined' ? STATE.currentWarband : null));
  if (!all.length) return [];
  const active = model.upgrades || [];
  return all.filter(u => active.includes(u.id));
}

/**
 * Returns the effective keyword set for a model: base keywords + keywords
 * added by each active upgrade + skill advancements. Used for display, legality and PDF.
 */
function effectiveKeywords(model, unit, wb) {
  if (!unit) return [];
  const base = [...(unit.keywords || [])];
  // Keywords the active variant grants (Alba: Highland Strength, Rampant Charge)
  const w = wb || (typeof STATE !== 'undefined' ? STATE.currentWarband : null);
  const v = w ? getActiveVariant(w) : null;
  if (v) {
    const ov = variantUnitOverride(w, unit.id);
    const extra = ((ov && ov.addKeywords) || []).concat(v.allModelsKeywords || []);
    for (const k of extra) if (!base.includes(k)) base.push(k);
  }
  for (const up of activeUpgrades(model, unit, w)) {
    for (const k of (up.addsKeywords || [])) {
      if (!base.includes(k)) base.push(k);
    }
  }
  // Add keywords granted by skill advancements (TOUGH, NEGATE FEAR, etc.)
  for (const k of advancementKeywords(model)) {
    if (!base.includes(k)) base.push(k);
  }
  // Promoted Troops gain the ELITE keyword (canon page 104)
  if (model.baseProgression && model.baseProgression.promotedToElite && !base.includes('ELITE')) {
    base.push('ELITE');
  }
  // Upgrades that take a keyword away for good (Body of Gold: no TOUGH)
  const lost = activeUpgrades(model, unit, w).flatMap(u => u.removesKeywords || []);
  if (lost.length) return base.filter(k => !lost.includes(k));
  return base;
}

/**
 * Checks whether a model negates the effect of the specified keyword.
 *
 * Canon: "NEGATE [KEYWORD] (Effect): A model with the NEGATE Keyword is not
 *  affected by the specified Keyword's Effect."
 *
 * Direct sources of NEGATE:
 *   - Explicit NEGATE [KEYWORD] in the unit's effective keywords
 *     (e.g. NEGATE FEAR, NEGATE GAS, NEGATE SHRAPNEL)
 *   - STRONG (Effect): "A model with this Keyword has the NEGATE HEAVY
 *     Keyword. In addition, it can equip and use one 2-Handed Melee Weapon
 *     as if it were a 1-Handed Melee Weapon." → STRONG → NEGATE HEAVY.
 *
 * @param {Object} model
 * @param {Object} unit
 * @param {string} keyword  the keyword to check NEGATE for (e.g. 'HEAVY')
 * @returns {boolean}
 */
function modelNegatesKeyword(model, unit, keyword, wb) {
  if (!unit) return false;
  const kws = effectiveKeywords(model, unit, wb);
  if (kws.includes(`NEGATE ${keyword}`)) return true;
  // STRONG implicitly grants NEGATE HEAVY (canon)
  if (keyword === 'HEAVY' && kws.includes('STRONG')) return true;
  return false;
}

/**
 * Returns the effective abilities list for a model: base unit abilities +
 * abilities added by each active upgrade.
 */
function effectiveAbilities(model, unit, wb) {
  if (!unit) return [];
  let base = [...(unit.abilities || [])];
  // Abilities the active variant removes (Prussia Light Melee: no Assault Drill)
  const w = wb || (typeof STATE !== 'undefined' ? STATE.currentWarband : null);
  const ov = w ? variantUnitOverride(w, unit.id) : null;
  if (ov && ov.removeAbilities) base = base.filter(a => !ov.removeAbilities.includes(a));
  if (ov && ov.addAbilities) for (const a of ov.addAbilities) if (!base.includes(a)) base.push(a);
  const ups = activeUpgrades(model, unit, w);
  for (const up of ups) {
    for (const a of (up.addsAbilities || [])) {
      if (!base.includes(a)) base.push(a);
    }
  }
  // Upgrades that take an ability away (Hellfly Host: no Undead Fortitude)
  for (const up of ups) {
    if (up.removesAbilities) base = base.filter(a => !up.removesAbilities.includes(a));
  }
  return base;
}

/**
 * Lista de abilities a mostrar en UI roster + PDF para un modelo. Resuelve
 * el bug Cazadores del Muro donde Silahdar (alias COMPANION_ID_ALIASES
 * 'md_yuzbasicaptain_mv_silahdar' → 'yuzbasi') heredaba 'Mubarizun' de la
 * unit base, aunque canonicamente el Silahdar tiene otras reglas (Siege
 * Jezzail Teams + Marksmanship of the Iron Wall).
 *
 * Filosofía PIVOT v2: Trench Companion es la verdad oficial. Cuando un
 * modelo viene de Companion (companionStats / companionAbilities), sus
 * abilities son las del JSON. La unit de Forge es fallback nativo SOLO
 * cuando el modelo NO trae companion data.
 *
 * Retorna array de objetos `{ name: string }`. Normaliza:
 *  - String → {name}
 *  - {name} → tal cual
 *  - {'ability-name': X} (shape exportado por Companion JSON) → {name: X}
 *
 * Native path: unit.abilities (strings) + upgrade.addsAbilities activos.
 * Aplana a `{name}` para coherencia con el path Companion.
 */
function displayAbilitiesForCard(model, unit) {
  if (!model || typeof model !== 'object') return [];
  const hasCompanion = !!(model.companionStats || (Array.isArray(model.companionAbilities) && model.companionAbilities.length > 0));
  if (hasCompanion) {
    const arr = model.companionAbilities || [];
    return arr.map(a => {
      if (typeof a === 'string') return { name: a };
      if (a && typeof a === 'object') {
        const name = a.name || a['ability-name'] || '';
        const desc = a.desc || a.description || a['ability-description'] || '';
        return desc ? { name, desc } : { name };
      }
      return { name: String(a) };
    }).filter(o => o.name);
  }
  // Native fallback: unit.abilities + activeUpgrades.addsAbilities.
  const eff = effectiveAbilities(model, unit);
  return eff.map(n => ({ name: n }));
}

/**
 * Parse a stat value of the form "+N DICE", "-N DICE", "+0 DICE", "-".
 * Returns { sign, value, suffix } or null if it's a special value like '-'.
 */
function parseDiceStat(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/^([+-]?)(\d+)\s+(DICE|INJURY DICE|INJURY MODIFIER)$/);
  if (!m) return null;
  return { sign: m[1] || '+', value: parseInt(m[2], 10), suffix: m[3] };
}

/**
 * Apply a numeric delta to a "+N DICE" / "-N DICE" stat string.
 * If the original is '-', it stays '-' (some stats can't be modified).
 * Examples:
 *   addToDiceStat('+0 DICE', 1)  → '+1 DICE'
 *   addToDiceStat('+1 DICE', -1) → '+0 DICE'
 *   addToDiceStat('-1 DICE', -1) → '-2 DICE'
 *   addToDiceStat('-', 1)        → '-' (untouched)
 */
function addToDiceStat(str, delta) {
  if (str === '-') return '-';
  const parsed = parseDiceStat(str);
  if (!parsed) return str;
  let n = parseInt(parsed.sign + parsed.value, 10);
  n += delta;
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n} ${parsed.suffix}`;
}

/**
 * Apply a numeric delta to a movement string like '6"/Infantry'.
 * Returns the new string, e.g. addToMovement('6"/Infantry', 1) → '7"/Infantry'.
 */
function addToMovement(str, delta) {
  if (typeof str !== 'string') return str;
  const m = str.match(/^(\d+)("\/.*)$/);
  if (!m) return str;
  const n = parseInt(m[1], 10) + delta;
  return `${n}${m[2]}`;
}

/**
 * Apply a stat delta described by an advancement/scar id.
 * Returns the new stats object.
 */
function applyStatModifier(stats, modId) {
  const out = { ...stats };
  switch (modId) {
    case 'ranged+1': out.ranged = addToDiceStat(out.ranged, 1);  break;
    case 'ranged-1': out.ranged = addToDiceStat(out.ranged, -1); break;
    case 'melee+1':  out.melee  = addToDiceStat(out.melee,  1);  break;
    case 'melee-1':  out.melee  = addToDiceStat(out.melee, -1);  break;
    case 'move+1':   out.movement = addToMovement(out.movement,  1); break;
    case 'move-1':   out.movement = addToMovement(out.movement, -1); break;
    case 'move-2':   out.movement = addToMovement(out.movement, -2); break;
    // Skill advancements don't affect stats — they go into keywords.
  }
  return out;
}

/**
 * Returns the effective stats for a model: base unit stats with any
 * statOverride from active upgrades, active variant, advancements and scars
 * applied on top.
 * Used for display in detail, roster, PDF.
 */
function effectiveStats(model, unit, wb) {
  if (!unit) return {};
  let base = { ...(unit.stats || {}) };
  // Apply variant unit override stats (e.g. Anchorite Shrine in St. Methodius
  // gets Ranged +0 DICE)
  const w = wb || (typeof STATE !== 'undefined' ? STATE.currentWarband : null);
  const ov = w ? variantUnitOverride(w, unit.id) : null;
  if (ov && ov.stats) {
    base = Object.assign(base, ov.stats);
  }
  for (const up of activeUpgrades(model, unit, w)) {
    if (up.statOverride) {
      Object.assign(base, up.statOverride);
    }
  }
  // Apply campaign progression (advancements + scars)
  const bp = model.baseProgression;
  if (bp) {
    for (const adv of (bp.advancements || [])) {
      if (adv.id) base = applyStatModifier(base, adv.id);
    }
    for (const scar of (bp.scars || [])) {
      if (scar.id) base = applyStatModifier(base, scar.id);
    }
  }
  return base;
}

/**
 * Returns the effective keyword set including those granted by skill advancements.
 * (Used by callers that already do effectiveKeywords; we extend it below.)
 */
function advancementKeywords(model) {
  const bp = model && model.baseProgression;
  if (!bp || !bp.advancements) return [];
  const out = [];
  for (const adv of bp.advancements) {
    // Direct grantsKeyword (e.g. from Skill Tables roller: STRONG, NEGATE FEAR)
    if (adv.grantsKeyword && !out.includes(adv.grantsKeyword)) {
      out.push(adv.grantsKeyword);
    }
    // Legacy id mapping
    switch (adv.id) {
      case 'tough':    if (!out.includes('TOUGH'))         out.push('TOUGH'); break;
      case 'fearless': if (!out.includes('NEGATE FEAR'))   out.push('NEGATE FEAR'); break;
      case 'leader':   if (!out.includes('LEADER'))        out.push('LEADER'); break;
      case 'regen1':   if (!out.includes('REGENERATE 1')) out.push('REGENERATE 1'); break;
    }
  }
  return out;
}

/**
 * Returns the effective unit name for a model: if any active upgrade has
 * `renamesTo`, use the last one. Otherwise unit.name.
 * Useful for things like Heretic Trooper → Heretic Legionnaire when upgraded.
 */
function effectiveUnitName(model, unit) {
  if (!unit) return '';
  let name = unit.name;
  for (const up of activeUpgrades(model, unit)) {
    if (up.renamesTo) name = up.renamesTo;
  }
  return name;
}

/**
 * Returns warband-level legality warnings related to upgrades.
 * Currently checks the rule "Heretic Legionnaires can never outnumber
 * Heretic Troopers" (warns if violated).
 * Returns an array of human-readable Spanish messages.
 */
/**
 * Can this upgrade be activated on this model? Honours:
 *   maxPerWarband      — models in the warband with it active
 *   incompatibleWith   — upgrade ids that cannot coexist (both directions)
 *   requiresUpgrades   — upgrade ids that must already be active
 * mutuallyExclusiveGroup is not a block: activating swaps within the group.
 * Returns { state: 'active' | 'available' | 'disabled', reason? }.
 */
function classifyUpgrade(up, model, unit, wb) {
  const active = model.upgrades || [];
  if (active.includes(up.id)) return { state: 'active' };
  if (up.maxPerWarband) {
    // maxGroup: upgrades with different ids that share one cap (Zealot Strength
    // of Trench Pilgrims and Martyr Penitents)
    const groupIds = up.maxGroup
      ? ((wb && wb.models) || []).reduce((acc, m) => {
          const mu = getUnit(wb.factionId, m.unitId);
          for (const u of allAvailableUpgrades(mu, wb)) if (u.maxGroup === up.maxGroup) acc.add(u.id);
          return acc;
        }, new Set([up.id]))
      : new Set([up.id]);
    const used = ((wb && wb.models) || []).filter(m =>
      m !== model && m.uid !== model.uid && (m.upgrades || []).some(id => groupIds.has(id))).length;
    if (used >= up.maxPerWarband) {
      return { state: 'disabled', reason: `Máximo ${up.maxPerWarband} en la banda` };
    }
  }
  const all = allAvailableUpgrades(unit, wb);
  const activeDefs = all.filter(u => active.includes(u.id));
  // Per-model cap shared by a group (Great Hunger Strains: 1, or 3 for Ravenous)
  if (up.perModelGroup) {
    const n = activeDefs.filter(u => u.perModelGroup === up.perModelGroup).length;
    let max = up.perModelMax || 1;
    // Grail Strains: 2 si el resto de la banda vale 1000 👑 o más
    if (up.perModelMaxAtValue && wb) {
      const rest = (wb.models || []).filter(m => m !== model && m.uid !== model.uid)
        .reduce((t, m) => t + modelCost(m, wb.factionId, wb).ducados, 0);
      if (rest >= up.perModelMaxAtValue.value) max = up.perModelMaxAtValue.max;
    }
    if (n >= max) {
      return { state: 'disabled', reason: 'Máx. ' + max + ' por modelo' };
    }
  }
  const clash = activeDefs.find(u => {
    const hit = (up.incompatibleWith || []).includes(u.id) ||
                (u.incompatibleWith || []).includes(up.id);
    if (!hit) return false;
    // e.g. Hawk Eyes + Hypnotic Eyes are fine with Two Heads
    const unless = up.incompatibleUnless || u.incompatibleUnless;
    return !(unless && active.includes(unless));
  });
  if (clash) return { state: 'disabled', reason: `Incompatible con ${clash.name}` };
  const missing = (up.requiresUpgrades || []).filter(id => !active.includes(id));
  if (missing.length) {
    const names = missing.map(id => (all.find(u => u.id === id) || { name: id }).name);
    return { state: 'disabled', reason: 'Requiere ' + names.join(', ') };
  }
  return { state: 'available' };
}

function checkUpgradeLegality(wb) {
  if (!wb || !wb.models) return [];
  const warnings = [];

  // Rule: Heretic Legionnaires <= Heretic Troopers
  if (wb.factionId === 'heretic-legions') {
    let troopers = 0, legionnaires = 0;
    for (const m of wb.models) {
      if (m.unitId !== 'heretic-troopers') continue;
      const isLegionnaire = (m.upgrades || []).some(id =>
        id === 'legionnaire-ranged' || id === 'legionnaire-melee');
      if (isLegionnaire) legionnaires++;
      else troopers++;
    }
    if (legionnaires > troopers) {
      warnings.push(
        `Hay ${legionnaires} Heretic Legionnaires pero solo ${troopers} Heretic Troopers normales. ` +
        `La banda no puede tener más Legionnaires que Troopers: desactiva ${legionnaires - troopers} mejora(s) o añade más Troopers normales.`
      );
    }
  }

  // The Court: the warband must be dedicated to one of the Seven Deadly Sins
  if (wb.factionId === 'court-serpent' && !getActiveVariant(wb)) {
    warnings.push('Seven Deadly Sins: antes de reclutar, la banda debe elegir el pecado al que se dedica (variante Sin: …).');
  }

  // Variant: forbidden units already in the band
  const variant = getActiveVariant(wb);
  if (variant) {
    if (variant.forbiddenUnitIds) {
      for (const banned of variant.forbiddenUnitIds) {
        const count = unitCountInWarband(wb, banned);
        if (count > 0) {
          const u = getUnit(wb.factionId, banned);
          warnings.push(
            `La variante ${variant.name} no permite ${u ? u.name : banned}. ` +
            `Tienes ${count} en la banda — bórralos.`
          );
        }
      }
    }
    // Variant: items some units must carry (Saint Methodius: Nuns with Standard Armour)
    for (const req of (variant.mandatoryUnitItems || [])) {
      const it = findBattlekitItem(wb.factionId, req.itemId);
      const u = getUnit(wb.factionId, req.unitId);
      const missing = wb.models.filter(m => m.unitId === req.unitId && !(m.battlekit || []).includes(req.itemId)).length;
      if (missing) {
        warnings.push(missing + ' ' + (u ? u.name : req.unitId) + ' sin ' + (it ? it.name : req.itemId) +
          ' (' + variant.name + ': no pueden jugar sin ella).');
      }
    }
    // Variant: minimum model cost (Knights of Avarice, Mammon's Chosen)
    if (variant.minModelCost) {
      const mc = variant.minModelCost;
      for (const m of wb.models) {
        if ((mc.exceptUnitIds || []).includes(m.unitId)) continue;
        const u = getUnitWithVariant(wb, m.unitId);
        if (!u || u.currency !== '👑') continue;
        const c = modelCost(m, wb.factionId, wb);
        if (c.ducados < mc.cost) {
          warnings.push(u.name + ' cuesta ' + c.ducados + ' 👑 con su Battlekit: ' + variant.name +
            ' no admite modelos por debajo de ' + mc.cost + ' 👑.');
        }
      }
    }
    // Variant: mandatory items missing (Papal States Crucifix)
    for (const iid of (variant.mandatoryItems || [])) {
      const has = wb.models.some(m => (m.battlekit || []).includes(iid));
      if (!has && wb.models.length > 0) {
        const it = findBattlekitItem(wb.factionId, iid);
        warnings.push('La variante ' + variant.name + ' requiere que un modelo lleve ' + (it ? it.name : iid) + '.');
      }
    }
    // Variant: mandatory units missing
    if (variant.mandatoryUnits) {
      for (const req of variant.mandatoryUnits) {
        const count = unitCountInWarband(wb, req.unitId);
        const u = getUnit(wb.factionId, req.unitId);
        const name = u ? u.name : req.unitId;
        const min = req.count || 1;
        if (count < min) {
          warnings.push(
            `La variante ${variant.name} requiere al menos ${min} ${name} (tienes ${count}).`
          );
        }
        if (req.max && count > req.max) {
          warnings.push(
            `La variante ${variant.name} permite máximo ${req.max} ${name} (tienes ${count}).`
          );
        }
      }
    }
  }

  // Standard mandatory units (e.g. Lieutenant in NA) — but if the variant
  // declares it relaxed, skip it.
  const f = DATA.factions[wb.factionId];
  if (f) {
    for (const u of f.units) {
      if (!u.mandatory) continue;
      // Skip if this variant relaxes the requirement
      if (variant && variant.relaxedMandatoryIds && variant.relaxedMandatoryIds.includes(u.id)) {
        continue;
      }
      // A unit the variant forbids cannot be mandatory (e.g. no Yüzbaşı in
      // House of Wisdom, Iron Wall or Fida'i).
      if (variant && variant.forbiddenUnitIds && variant.forbiddenUnitIds.includes(u.id)) {
        continue;
      }
      const count = unitCountInWarband(wb, u.id);
      if (count < 1 && wb.models.length > 0) {
        warnings.push(`Falta ${u.name} (obligatorio para esta facción).`);
      }
    }
  }

  return warnings;
}

/**
 * Returns battlekit-level legality warnings for the entire warband.
 * Detects models whose current battlekit violates the canonical battlekit
 * limits — typically saved warbands from before the canon fix, or after
 * keyword-changing upgrades were applied.
 *
 * Checks per model:
 *   - 1×2H + any 1H of same type (without STRONG) — canon: exclusive
 *   - More than meleeMax 1H melee weapons
 *   - More than rangedMax 1H ranged weapons
 *   - 2× 2H weapons of same type
 *   - With shield: more than 1×1H melee or 1×1H ranged
 *   - Multiple armours, shields, or grenade types
 *
 * Returns an array of human-readable Spanish messages.
 */
function checkBattlekitLegality(wb) {
  if (!wb || !wb.models) return [];
  const warnings = [];

  for (const m of wb.models) {
    const u = getUnit(wb.factionId, m.unitId);
    if (!u) continue;
    const limits = getWeaponLimits(m, u, wb);
    const melee = countModelMeleeWeapons(wb, m);
    const ranged = countModelRangedWeapons(wb, m);
    const modelLabel = m.customName || u.name;

    // Verify melee composition
    const meleeCheck = checkWeaponSlots(melee.count1H, melee.count2H,
                                        limits.meleeMax, limits.strongBonus);
    if (!meleeCheck.allowed) {
      warnings.push(`${modelLabel}: ${meleeCheck.reason} (melee).`);
    }

    // Verify ranged composition (STRONG doesn't apply)
    const rangedCheck = checkWeaponSlots(ranged.count1H, ranged.count2H,
                                         limits.rangedMax, false);
    if (!rangedCheck.allowed) {
      warnings.push(`${modelLabel}: ${rangedCheck.reason} (a distancia).`);
    }

    // Total cap
    if (limits.totalMax !== null && (melee.total + ranged.total) > limits.totalMax) {
      warnings.push(
        `${modelLabel}: ${melee.total + ranged.total} armas equipadas, máx ${limits.totalMax}.`);
    }

    // Single armour
    let armourCount = 0, shieldCount = 0;
    const grenadeIds = new Set();
    for (const kid of (m.battlekit || [])) {
      const cat = getArmouryCategory(wb.factionId, kid);
      if (cat === 'armour') armourCount++;
      else if (cat === 'shields') shieldCount++;
      else if (cat === 'grenades') grenadeIds.add(kid);
    }
    if (armourCount > 1) {
      warnings.push(`${modelLabel}: ${armourCount} armaduras (canon: 1).`);
    }
    if (shieldCount > 1) {
      warnings.push(`${modelLabel}: ${shieldCount} escudos (canon: 1).`);
    }
    if (grenadeIds.size > 1) {
      warnings.push(`${modelLabel}: ${grenadeIds.size} tipos de granada (canon: 1 tipo).`);
    }
  }

  return warnings;
}

/**
 * Cold Steel (Kingdom of Alba): the first Melee Weapon of each kind bought
 * for the warband costs half (fractions round up, Rulebook "Fractions").
 * "First" = first occurrence in roster order.
 */
function isFirstMeleePurchase(wb, model, kitId, idx) {
  for (const m of wb.models) {
    const bk = m.battlekit || [];
    for (let i = 0; i < bk.length; i++) {
      if (bk[i] !== kitId) continue;
      return (m === model || m.uid === model.uid) && i === idx;
    }
  }
  return true;
}
function coldSteelApplies(wb, factionId, kitId) {
  const v = wb ? getActiveVariant(wb) : null;
  return !!(v && v.halfPriceFirstMelee && getArmouryCategory(factionId, kitId) === 'melee');
}

/** Price shown for `item` in the picker: what this model paid if it already
 *  carries it, otherwise the price of buying it now (Cold Steel halves the first one). */
function battlekitPurchaseCost(wb, item, model) {
  const idx = model ? (model.battlekit || []).indexOf(item.id) : -1;
  const fv = getActiveVariant(wb);
  if (fv && (fv.freeFirstItems || []).includes(item.id)) {
    const free = idx >= 0 ? isFirstMeleePurchase(wb, model, item.id, idx)
                          : !wb.models.some(m => (m.battlekit || []).includes(item.id));
    if (free) return 0;
  }
  if (idx >= 0) {
    return coldSteelApplies(wb, wb.factionId, item.id) && isFirstMeleePurchase(wb, model, item.id, idx)
      ? Math.ceil(item.cost / 2) : item.cost;
  }
  if (coldSteelApplies(wb, wb.factionId, item.id) &&
      !wb.models.some(m => (m.battlekit || []).includes(item.id))) {
    return Math.ceil(item.cost / 2);
  }
  return item.cost;
}

/** Variant can drop a unit's alternative cost (Abyssinia: MHI without Machine Armour). */
function unitCostAltAllowed(wb, unit) {
  const ov = wb ? variantUnitOverride(wb, unit.id) : null;
  return !(ov && 'costAlt' in ov && ov.costAlt == null);
}

function modelCost(model, factionId, wb) {
  // Fase 10 PIVOT v2 — si el modelo viene de Trench Companion, TC es la
  // verdad oficial: confiar en companionCost/companionGlory. Evita
  // discrepancias por contenido regional/custom no presente en DATA.
  if (model && (typeof model.companionCost === 'number' ||
                typeof model.companionGlory === 'number')) {
    return {
      ducados: model.companionCost || 0,
      glory:   model.companionGlory || 0,
    };
  }
  // Variant cost overrides (Tenth Plague: Communicants for 3 ☼)
  const u = wb ? getUnitWithVariant(wb, model.unitId) : getUnit(factionId, model.unitId);
  if (!u) return { ducados: 0, glory: 0 };
  const altOk = unitCostAltAllowed(wb, u);
  let ducados = u.currency === '👑' ? (model.costVariant === 'alt' && altOk ? (u.costAlt||u.cost) : u.cost) : 0;
  let glory   = u.currency === '☼' ? u.cost : 0;
  // First model of this unit at another price (Knights of Avarice: first Goetic Warlock 110 👑)
  if (u.firstCost && wb && (wb.models || []).find(m => m.unitId === model.unitId) === model) {
    ducados = u.firstCost.currency === '👑' ? u.firstCost.cost : 0;
    glory   = u.firstCost.currency === '☼' ? u.firstCost.cost : 0;
  }
  // Add cost of active upgrades
  for (const up of activeUpgrades(model, u, wb)) {
    if (up.currency === '👑') ducados += up.cost || 0;
    else if (up.currency === '☼') glory += up.cost || 0;
  }
  (model.battlekit || []).forEach((kitId, idx) => {
    const item = findBattlekitItem(factionId, kitId, wb);
    if (item) {
      const half = item.currency === '👑' && coldSteelApplies(wb, factionId, kitId) &&
                   isFirstMeleePurchase(wb, model, kitId, idx);
      // Supreme Blessing: the warband's first Crucifix is free
      const fv = wb ? getActiveVariant(wb) : null;
      if (fv && (fv.freeFirstItems || []).includes(kitId) && isFirstMeleePurchase(wb, model, kitId, idx)) return;
      if (item.currency === '👑') ducados += half ? Math.ceil(item.cost / 2) : item.cost;
      else glory += item.cost;
    }
  });
  return { ducados, glory };
}

function warbandTotals(wb) {
  let ducados = 0, glory = 0;
  for (const m of wb.models) {
    const c = modelCost(m, wb.factionId, wb);
    ducados += c.ducados;
    glory += c.glory;
  }
  return { ducados, glory };
}



function findArmouryItemByName(name, wb) {
  if (!name || !wb || !wb.factionId) return null;
  const f = DATA.factions[wb.factionId];
  if (!f || !f.armoury) return null;
  
  // Search standard armoury
  for (const cat of Object.values(f.armoury)) {
    if (!Array.isArray(cat)) continue;
    const found = cat.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (found) return variantArmouryItem(wb, found);
  }
  
  // Search variant overrides directly
  const v = getActiveVariant(wb);
  if (v && v.armouryOverrides) {
    for (const cat of Object.values(v.armouryOverrides)) {
      if (!Array.isArray(cat)) continue;
      const found = cat.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
  }
  
  // Search foreign armouries
  for (const fa of ((v && v.foreignArmoury) || [])) {
    const ff = DATA.factions[fa.factionId];
    if (!ff) continue;
    for (const cat of Object.values(ff.armoury)) {
      if (!Array.isArray(cat)) continue;
      const found = cat.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (found) return Object.assign({}, found, { _foreignFaction: fa.factionId },
        itemHasForbiddenKeyword(v, found) ? { forbidden: true } : {});
    }
  }
  
  return null;
}

function calculateTotalArmour(model, unit, wb) {
  const stats = effectiveStats(model, unit, wb);
  let totalArmour = parseInt(stats.armour) || 0;
  
  const bkEquip = (model.battlekit || []).map(id => findBattlekitItem(wb.factionId, id, wb)).filter(Boolean);
  const permEquip = (unit?.permanentEquipment || []).map(p => {
    const cleanName = p.split(' (')[0];
    const it = findArmouryItemByName(cleanName, wb) || findArmouryItemByName(p, wb);
    return it || { name: p };
  });
  
  const allEquip = [...permEquip, ...bkEquip];
  const uniqueMap = new Map();
  allEquip.forEach(eq => {
    if (eq.name && !uniqueMap.has(eq.name)) {
      uniqueMap.set(eq.name, eq);
    }
  });
  
  Array.from(uniqueMap.values()).forEach(eq => {
    if (eq.weaponKeywords) {
      eq.weaponKeywords.forEach(kw => {
        const match = String(kw).match(/-(\d+)\s+INJURY MODIFIER/i);
        if (match) {
          totalArmour += parseInt(match[1], 10);
        }
      });
    }
  });
  
  return totalArmour > 0 ? `-${totalArmour}` : '0';
}
