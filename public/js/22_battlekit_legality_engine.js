// @ts-nocheck
import { DATA } from '../data/01_trench_crusade_game_data';

/* ======================================================================
   BATTLEKIT LEGALITY ENGINE
   Determines which armoury items a model can legally equip.
   ====================================================================== */

// Map of restriction-string unit names → unit IDs. The PDF uses many
// natural-language variants ("Mech. Heavy Inf.", "Sappers", etc.); this
// table normalises them to our internal IDs.
const RESTRICTION_UNIT_MAP = {
  'Mech. Heavy Inf.':            'mech-heavy-inf',
  'Mechanized Heavy Infantry':   'mech-heavy-inf',
  'Combat Medic':                'combat-medic',
  'Lieutenant':                  'lieutenant',
  'Trench Clerics':              'trench-cleric',
  'Holy Warrior':                'holy-warrior-abys',
  'Holy warrior':                'holy-warrior-abys',
  'Trench Cleric':               'trench-cleric',
  'Combat Engineer':             'combat-engineers',
  'Sappers':                     'sappers',
  'Sultanate Sappers':           'sappers',
  'Silahdar':                    'silahdar-iw',
  'Brazen Bull or stationary':   'brazen-bull',
  'Master Assassin':             'master-assassin-fid',
  'Sultanate Assassins':         'sult-assassin',
  'Sultanate Assassin':          'sult-assassin',
  'Brazen Bull':                 'brazen-bull',
  'Janissaries':                 'janissaries',
  'Anointed':                    'anointed',
  'Death Commando':              'death-commando',
  'Hell Knights':                'hell-knights',
  'Amalgam':                     'amalgam',
  'Jabirean Alchemist':          'jabirean',
  'Matagot Hag':                 'matagot-hag-gh',
  'Heretic Troopers':            'heretic-troopers',
  'Heretic Priest':              'heretic-priest',
  'Legionnaires':                'heretic-troopers',
  'Heralds':                     'heralds',
  'Anchorite Shrine':            'anchorite-shrine',
  // Pit Locusts and Yoke Fiends are Court-only
  'Pit Locusts':                 'pit-locusts',
  'Yoke Fiend':                  'yoke-fiends',
  'Yoke Fiends':                 'yoke-fiends',
  // Wretched exists in both HL and CO — handled at runtime; we map to a sentinel
  // that is then expanded to all matching wretched IDs of the active faction.
  'Wretched':                    '__wretched__',
};

function parseRestriction(str) {
  const out = {
    tags: new Set(),     // 'Bayonet Lug' | 'Shield Combo' | 'Consumable' | 'Unique' | 'Headgear'
    eliteOnly: false,
    allowedUnitIds: null, // null = no restriction; otherwise array of unit IDs that can take it
    requiresEquipped: null, // e.g. 'Machine Armour'
    limit: null,         // total in warband
    perModel: null,      // max per model (rare)
  };
  if (!str) return out;

  const parts = str.split('·').map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    const limPerModel = p.match(/^Limit:\s*(\d+)\s*\(\s*(\d+)\s*per\s*model\s*\)/i);
    if (limPerModel) {
      out.limit = parseInt(limPerModel[1], 10);
      out.perModel = parseInt(limPerModel[2], 10);
      continue;
    }
    const limMatch = p.match(/^Limit:\s*(\d+)/i);
    if (limMatch) {
      out.limit = parseInt(limMatch[1], 10);
      continue;
    }
    if (/^Bayonet Lug$/i.test(p))   { out.tags.add('Bayonet Lug'); continue; }
    if (/^Shield Combo$/i.test(p))  { out.tags.add('Shield Combo'); continue; }
    if (/^Consumable$/i.test(p))    { out.tags.add('Consumable'); continue; }
    if (/^Unique$/i.test(p))        { out.tags.add('Unique'); continue; }
    if (/^Headgear$/i.test(p))      { out.tags.add('Headgear'); continue; }

    // Special: "Machine Armour only" = item-prerequisite (not unit-only)
    // Must be checked BEFORE the generic "X only" handler.
    if (/^Machine Armour only$/i.test(p)) {
      out.requiresEquipped = 'machine-armour-na';
      continue;
    }

    // "X only" — could be ELITE only, "Combat Medic only", "ELITE & Janissaries only", etc.
    const onlyMatch = p.match(/^(.+?)\s+only$/i);
    if (onlyMatch) {
      const subject = onlyMatch[1].trim();
      // Split on "&" for OR-conditions: "ELITE & Janissaries"
      const orParts = subject.split('&').map(x => x.trim());
      const allowedIds = [];
      let acceptsElite = false;
      for (const op of orParts) {
        if (/^ELITE$/i.test(op)) {
          acceptsElite = true;
        } else {
          // Try to map to a unit ID
          const cleaned = op.replace(/^Mech\.\s*Heavy\s*Inf\.?$/i, 'Mech. Heavy Inf.');
          const id = RESTRICTION_UNIT_MAP[cleaned] || RESTRICTION_UNIT_MAP[op];
          if (id) allowedIds.push(id);
        }
      }
      if (acceptsElite) out.eliteOnly = true;
      if (allowedIds.length) out.allowedUnitIds = (out.allowedUnitIds || []).concat(allowedIds);
      continue;
    }
  }
  return out;
}

// What armoury category does an item belong to?
function getArmouryCategory(factionId, itemId) {
  const f = DATA.factions[factionId];
  if (!f) return null;
  for (const [cat, list] of Object.entries(f.armoury)) {
    if (list.find(x => x.id === itemId)) return cat;
  }
  // Items bought from another armoury (Weapon Collections): ids are unique
  // per faction, so the first match elsewhere is the right one.
  for (const [fid, ff] of Object.entries(DATA.factions)) {
    if (fid === factionId || !ff.armoury) continue;
    for (const [cat, list] of Object.entries(ff.armoury)) {
      if (list.find(x => x.id === itemId)) return cat;
    }
  }
  return null;
}

// How many times is this item used across the entire warband?
function countItemUsageInWarband(wb, itemId) {
  let n = 0;
  for (const m of wb.models) {
    n += (m.battlekit || []).filter(k => k === itemId).length;
  }
  return n;
}

// Does this model already have an item in this armoury category?
function modelHasCategoryItem(wb, model, category, excludeItemId=null) {
  for (const kid of (model.battlekit || [])) {
    if (kid === excludeItemId) continue;
    if (getArmouryCategory(wb.factionId, kid) === category) return true;
  }
  return false;
}

// Does this model already have a Headgear item?
function modelHasHeadgear(wb, model, excludeItemId=null) {
  for (const kid of (model.battlekit || [])) {
    if (kid === excludeItemId) continue;
    const it = findBattlekitItem(wb.factionId, kid, wb);
    if (it && parseRestriction(it.restriction).tags.has('Headgear')) return true;
  }
  return false;
}

// Does this model have any equipped weapon with the "Bayonet Lug" tag?
function modelHasBayonetLug(wb, model) {
  for (const kid of (model.battlekit || [])) {
    const it = findBattlekitItem(wb.factionId, kid, wb);
    if (it && parseRestriction(it.restriction).tags.has('Bayonet Lug')) return true;
  }
  return false;
}

// Does this model effectively have a given item — either explicitly in their
// battlekit, or implicitly via a unit special rule (e.g. MHI carries armour
// integrated in their cost, so they "have" Reinforced or Machine Armour
// without it appearing in battlekit).
function modelEffectivelyHas(wb, model, itemId) {
  if ((model.battlekit || []).includes(itemId)) return true;
  const unit = getUnit(wb.factionId, model.unitId);
  if (!unit) return false;
  // MHI: armour is integrated in the unit cost; which armour depends on costVariant.
  if (unit.id === 'mech-heavy-inf') {
    const variant = model.costVariant || 'base';
    if (variant === 'alt'  && itemId === 'machine-armour-na')   return true;
    if (variant === 'base' && itemId === 'reinforced-armour-na') return true;
  }
  // Combat Engineers: built-in Engineer Body Armour
  if (unit.id === 'combat-engineers' && itemId === 'engineer-armour-na') return true;
  return false;
}

// Compute current battlekit spend on a model in a given currency
function modelBattlekitSpend(wb, model, currency='👑') {
  let total = 0;
  for (const kid of (model.battlekit || [])) {
    const it = findBattlekitItem(wb.factionId, kid, wb);
    if (it && it.currency === currency) total += it.cost;
  }
  return total;
}

/**
 * Returns true if the item carries the given weapon keyword
 * (e.g. 'HEAVY', 'HELD', 'FIRE'). Case-sensitive against the canonical keyword
 * names we store in `weaponKeywords` arrays.
 */
function itemHasWeaponKeyword(item, keyword) {
  if (!item || !item.weaponKeywords) return false;
  return item.weaponKeywords.includes(keyword);
}

/**
 * Returns true if the model already has at least one item equipped with the
 * given weapon keyword (excludes the optional `excludeId` so you can ask
 * "does it have any HEAVY *other than* this one I might be deselecting").
 */
function modelHasWeaponKeyword(wb, model, keyword, excludeId=null) {
  for (const kid of (model.battlekit || [])) {
    if (excludeId && kid === excludeId) continue;
    const it = findBattlekitItem(wb.factionId, kid, wb);
    if (itemHasWeaponKeyword(it, keyword)) return true;
  }
  return false;
}

/**
 * Returns true if the item is a "Bayonet" piece (a melee weapon whose name
 * starts with "Bayonet"). Bayonets need a ranged weapon with the Bayonet Lug
 * stipulation already equipped.
 */
function itemIsBayonet(item) {
  return !!item && (/^bayonet$/i.test(item.name) || !!item.needsBayonetLug);
}

/**
 * How many copies of `itemId` does THIS model already have? Used for the
 * "Limit: N (X per model)" check.
 */
function countItemUsageOnModel(model, itemId) {
  return (model.battlekit || []).filter(kid => kid === itemId).length;
}

/**
 * Counts melee weapons on a model, distinguishing 1H vs 2H so the STRONG rule
 * (which lets a 2H melee count as 1H) can be applied correctly.
 * Returns { count1H, count2H, total } excluding `excludeId` if provided.
 */
function countModelMeleeWeapons(wb, model, excludeId=null) {
  let count1H = 0, count2H = 0;
  for (const kid of (model.battlekit || [])) {
    if (excludeId && kid === excludeId) continue;
    const it = findBattlekitItem(wb.factionId, kid, wb);
    if (!it) continue;
    const cat = getArmouryCategory(wb.factionId, kid);
    if (cat !== 'melee') continue;
    if (it.type === '1-Handed') count1H++;
    else if (it.type === '2-Handed') count2H++;
  }
  return { count1H, count2H, total: count1H + count2H };
}

/**
 * Counts ranged weapons on a model.
 * Includes Anchorite Ranged Weapons in the count.
 */
function countModelRangedWeapons(wb, model, excludeId=null) {
  let count1H = 0, count2H = 0;
  for (const kid of (model.battlekit || [])) {
    if (excludeId && kid === excludeId) continue;
    const it = findBattlekitItem(wb.factionId, kid, wb);
    if (!it) continue;
    const cat = getArmouryCategory(wb.factionId, kid);
    if (cat !== 'ranged' && cat !== 'anchoriteRanged') continue;
    if (it.type === '1-Handed') count1H++;
    else if (it.type === '2-Handed') count2H++;
  }
  return { count1H, count2H, total: count1H + count2H };
}

/**
 * Returns the effective weapon limits for a unit based on:
 *   - Unit override via battlekitAccess.weaponLimits
 *   - STRONG keyword (allows 1×2H + 1×1H melee combo)
 *   - Shield equipped: max 1×1H melee + 1×1H ranged
 *   - Default: hasta 2×1H del mismo tipo (o 1×2H del mismo tipo)
 *
 * Output shape:
 *   { meleeMax, rangedMax, totalMax, strongBonus, hasShield }
 *   - meleeMax: max number of 1H melee weapons (a single 2H is also allowed
 *     as an alternative — see checkWeaponSlots for the canonical "1×2H OR
 *     N×1H" rule).
 *   - rangedMax: same for ranged
 *   - totalMax: optional cap on the sum (e.g. Amalgam = 6)
 *   - strongBonus: STRONG keyword. With a single 2H melee, it counts as 1H
 *     (allowing 1×2H + 1×1H melee combo).
 *   - hasShield: derived from current battlekit; reduces limits per canon.
 */
/** Battlekit access as the active variant sees it (Dirge: the Bereaved can take Ranged Weapons). */
function unitBattlekitAccess(wb, unit) {
  const ov = wb && unit ? variantUnitOverride(wb, unit.id) : null;
  return (ov && ov.battlekitAccess) || (unit && unit.battlekitAccess) || {};
}

function getWeaponLimits(model, unit, wb) {
  // Unit-specific override always wins
  const access = (unit && unit.battlekitAccess) || {};
  if (access.weaponLimits) {
    return Object.assign({ meleeMax:2, rangedMax:2, totalMax:null, strongBonus:false, hasShield:false },
                         access.weaponLimits);
  }
  const kws = unit ? effectiveKeywords(model, unit, wb) : [];
  const isStrong = kws.includes('STRONG');

  // Upgrade-granted limits (Takwin Homunculus Additional Arm)
  const upLim = unit ? activeUpgrades(model, unit, wb).find(u => u.weaponLimits) : null;
  if (upLim) {
    const L = upLim.weaponLimits;
    const shielded = wb && (model.battlekit || []).some(kid =>
      getArmouryCategory(wb.factionId, kid) === 'shields');
    return {
      meleeMax: shielded && L.shieldMeleeMax ? L.shieldMeleeMax : L.meleeMax,
      rangedMax: L.rangedMax, totalMax: null, strongBonus: false,
      hasShield: !!shielded, twoHandedSlots: L.twoHandedSlots || null,
      shieldMeleeMax: L.shieldMeleeMax || null, noShieldCombo: !!L.noShieldCombo,
    };
  }

  // Canon (Warbands of Trench Crusade): a model carrying a Shield can only
  // have 1×1H melee + 1×1H ranged. 2H weapons are forbidden (unless Shield
  // Combo on both, which is checked separately as a hard restriction).
  const hasShield = wb && (model.battlekit || []).some(kid =>
    getArmouryCategory(wb.factionId, kid) === 'shields');

  if (hasShield) {
    return {
      meleeMax: 1,
      rangedMax: 1,
      totalMax: null,
      // STRONG doesn't change the shield-imposed limit (a hand is busy)
      strongBonus: false,
      hasShield: true,
    };
  }

  return {
    meleeMax: 2,
    rangedMax: 2,
    totalMax: null,
    strongBonus: isStrong,
    hasShield: false,
  };
}

/**
 * Check a proposed weapon configuration against canonical battlekit rules:
 *
 *   "One 2-Handed Weapon OR up to {max} 1-Handed Weapons" (per type)
 *
 * STRONG (Effect, melee only): "can equip and use one 2-Handed Melee Weapon
 * as if it were a 1-Handed Melee Weapon". With a single 2H melee, it counts
 * as 1H so the model can pair it with another 1H melee.
 *
 * @param {number} count1H       Proposed 1H weapon count
 * @param {number} count2H       Proposed 2H weapon count
 * @param {number} max           Max 1H weapons allowed (also caps the
 *                               STRONG-counted total)
 * @param {boolean} strongBonus  Whether STRONG keyword applies (melee only)
 * @returns {{ allowed: boolean, reason?: string }}
 */
function checkWeaponSlots(count1H, count2H, max, strongBonus, twoHandedSlots) {
  // Rule: at most one 2H weapon of the same type, ever
  if (count2H > 1) {
    return { allowed: false, reason: 'Solo 1 arma a 2 manos del mismo tipo' };
  }
  if (count2H === 1) {
    if (twoHandedSlots) {
      // Extra arms: the 2H takes twoHandedSlots hands out of max
      if ((twoHandedSlots + count1H) > max) {
        return { allowed: false, reason: 'Máx ' + max + ' manos: el arma 2H ocupa ' + twoHandedSlots };
      }
    } else if (strongBonus) {
      // STRONG: the 2H counts as 1H. The 2H takes 1 slot + count1H slots.
      if ((1 + count1H) > max) {
        return { allowed: false,
          reason: `Máx ${max} armas con STRONG (2H cuenta como 1H)` };
      }
    } else {
      // Canon: 2H is exclusive — no other weapons of the same type allowed
      if (count1H > 0) {
        return { allowed: false,
          reason: '2H no se combina con otra arma del mismo tipo (canon)' };
      }
    }
    return { allowed: true };
  }
  // count2H === 0: just count 1H against max
  if (count1H > max) {
    return { allowed: false,
      reason: `Máx ${max} arma${max === 1 ? '' : 's'} a 1 mano del mismo tipo` };
  }
  return { allowed: true };
}

/**
 * Classify whether a battlekit item is legal to equip on this model.
 * Returns one of:
 *   { state: 'available' }                        — can be equipped
 *   { state: 'equipped' }                         — already equipped
 *   { state: 'disabled', reason: '…' }            — temporarily blocked
 *   { state: 'hidden',   reason: '…' }            — categorically impossible
 */
function classifyBattlekitItem(item, model, unit, wb) {
  item = variantArmouryItem(wb, item);
  if (item.forbidden) {
    return { state: 'hidden', reason: 'Prohibido por la variante' };
  }
  const r = parseRestriction(item.restriction);
  const category = getArmouryCategory(wb.factionId, item.id);
  const access = unitBattlekitAccess(wb, unit);

  // Variant-only armoury (e.g. Iron Wall special items): hidden unless the
  // warband runs that variant. findBattlekitItem still resolves them so
  // already-equipped items survive a variant switch in the data layer.
  if (item.variantOnly && item.variantOnly !== (wb.variantId || null)) {
    return { state: 'hidden', reason: 'Solo variante específica' };
  }

  const ownedCount = countItemUsageOnModel(model, item.id);
  // If item allows only 1 per model (default) and is already equipped → "equipped"
  if (ownedCount > 0 && r.perModel === null) {
    return { state: 'equipped' };
  }
  // If item explicitly allows multiple per model AND we've reached perModel limit
  if (r.perModel !== null && ownedCount >= r.perModel) {
    return { state: 'disabled', reason: `Máx ${r.perModel} por modelo` };
  }

  // ---- HIDDEN: categorical mismatches ----

  // Unit cannot have any battlekit at all
  if (access.forbidden) {
    return { state: 'hidden', reason: 'Sin acceso a Battlekit' };
  }

  // Battlekit only through upgrades (Takwin Homunculus: Human Hands, Seal of Solomon)
  if (access.battlekitViaUpgrades) {
    const ups = activeUpgrades(model, unit, wb);
    const open = ups.some(u => (u.unlocksCategories || []).includes(category) ||
                               (u.unlocksItemIds || []).includes(item.id));
    const shieldOk = category !== 'shields' ||
      ups.some(u => (u.unlocksItemIds || []).includes(item.id));
    if (!open || !shieldOk) {
      return { state: 'hidden', reason: 'Requiere una Alchemical Formula' };
    }
  }

  // Only some categories (Scripture Guardian: Melee Weapons of the warband's armoury)
  if (access.onlyCategories && !access.onlyCategories.includes(category)) {
    return { state: 'hidden', reason: 'Categoría no permitida para esta unidad' };
  }

  // Forbidden categories (e.g. MHI/Combat Engineers cannot take from Armour table)
  if (access.forbidCategories && access.forbidCategories.includes(category) && !item.bypassUnitCategoryLimits) {
    return { state: 'hidden', reason: 'Categoría no permitida para esta unidad' };
  }

  // Active upgrades may forbid categories (e.g. Wrath of God forbids ranged + armour)
  // or specific items by name (e.g. Medicine: no Medi-kit)
  for (const up of activeUpgrades(model, unit, wb)) {
    if (up.forbidsCategories && up.forbidsCategories.includes(category)) {
      return { state: 'hidden', reason: `Bloqueado por mejora: ${up.name}` };
    }
    if (up.forbidsItemNames && up.forbidsItemNames.includes(item.name)) {
      return { state: 'hidden', reason: `Bloqueado por mejora: ${up.name}` };
    }
  }

  // Items that need an upgrade on the model (Abyssinia: Shotel, Anfarro need Chewa)
  if (item.requiresUpgrade && !(model.upgrades || []).includes(item.requiresUpgrade)) {
    return { state: 'hidden', reason: 'Requiere ' + item.requiresUpgrade };
  }

  // Item overrides that exclude units (Éire: MHI cannot have a Great Sword/Axe)
  if (item.excludeUnitIds && item.excludeUnitIds.includes(unit.id)) {
    return { state: 'hidden', reason: 'No para esta unidad (variante)' };
  }

  // HEAVY weapons/grenades only for some units (Éire Light Infantry)
  {
    const hv = getActiveVariant(wb);
    if (hv && hv.heavyOnlyUnitIds && !hv.heavyOnlyUnitIds.includes(unit.id) &&
        ['ranged', 'melee', 'grenades'].includes(category) &&
        itemHasWeaponKeyword(item, 'HEAVY')) {
      const ex = hv.heavyExceptions || {};
      const allowed = (item.id in ex) && (ex[item.id] === null || ex[item.id].includes(unit.id));
      if (!allowed) return { state: 'hidden', reason: 'HEAVY: solo ' + hv.heavyOnlyUnitIds.map(id => (getUnit(wb.factionId, id) || { name: id }).name).join(', ') };
    }
  }

  // Items some keywords cannot use (e.g. Elixir of Al-Khidr: no ARTIFICIAL)
  if (item.notForKeywords) {
    const kws = effectiveKeywords(model, unit, wb);
    const bad = item.notForKeywords.find(k => kws.includes(k));
    if (bad) return { state: 'hidden', reason: `No para modelos ${bad}` };
  }

  // Whitelist by category (e.g. Stigmatic Nuns: only certain ranged + grenades)
  if (access.whitelistByCategory && access.whitelistByCategory[category]) {
    if (!access.whitelistByCategory[category].includes(item.id)) {
      return { state: 'hidden', reason: 'No permitido para esta unidad' };
    }
  }

  // Amalgam: only 1-Handed weapons (no Shield Combo, no other categories)
  if (access.allowOnly1HWeapons) {
    if (category !== 'ranged' && category !== 'melee') {
      return { state: 'hidden', reason: 'Solo armas 1H' };
    }
    if (r.tags.has('Shield Combo')) {
      return { state: 'hidden', reason: 'Sin Shield Combo' };
    }
  }

  // Tier / unit gating from item restriction string ("ELITE only", "Combat Medic only", etc.)
  if (r.eliteOnly || r.allowedUnitIds) {
    // Promoted Troops count as ELITE for armoury access (canon page 104:
    // "they are considered to be an Elite model from then on")
    const promoted = !!(model.baseProgression && model.baseProgression.promotedToElite);
    const matchesTier = r.eliteOnly && (unit.tier === 'elite' || promoted);
    // Expand __wretched__ sentinel to whichever wretched ID exists in current faction
    let allowed = r.allowedUnitIds;
    if (allowed && allowed.includes('__wretched__')) {
      const wId = wb.factionId === 'court-serpent' ? 'wretched-co'
                : wb.factionId === 'heretic-legions' ? 'wretched-hl'
                : null;
      allowed = allowed.filter(x => x !== '__wretched__');
      if (wId) allowed = allowed.concat(wId);
    }
    // Units that use another unit's Warband Entry (Master Assassin, Dervishes)
    let matchesUnit = allowed && (allowed.includes(unit.id) ||
      (unit.usesEntryOf && allowed.includes(unit.usesEntryOf)));
    // Upgrades that let a model take another unit's items (Gargantuan Size:
    // one weapon that only a Brazen Bull can usually take)
    if (!matchesTier && !matchesUnit && allowed) {
      const actsAs = activeUpgrades(model, unit, wb).find(u =>
        (u.actsAsUnitIds || []).some(id => allowed.includes(id)));
      if (actsAs) {
        const borrowed = (model.battlekit || []).filter(kid => {
          if (kid === item.id) return false;
          const eit = findBattlekitItem(wb.factionId, kid, wb);
          const er = eit ? parseRestriction(eit.restriction) : null;
          return er && er.allowedUnitIds && !er.eliteOnly &&
                 !er.allowedUnitIds.includes(unit.id) &&
                 er.allowedUnitIds.some(id => actsAs.actsAsUnitIds.includes(id));
        }).length;
        if (borrowed >= (actsAs.actsAsMaxItems || Infinity)) {
          return { state: 'disabled', reason: actsAs.name + ': máximo ' + actsAs.actsAsMaxItems };
        }
        matchesUnit = true;
      }
    }
    if (!matchesTier && !matchesUnit) {
      const reason = r.eliteOnly && r.allowedUnitIds
        ? 'ELITE u otra unidad específica'
        : (r.eliteOnly ? 'Sólo ELITE' : 'Sólo unidades específicas');
      return { state: 'hidden', reason };
    }
  }

  // ---- DISABLED: contextual restrictions ----

  // Items that must be the model's only Battlekit (Sarcophagus Mine) and items
  // that rule out a category (Tank Palanquin: no Shield)
  {
    const others = (model.battlekit || []).filter(k => k !== item.id)
      .map(k => findBattlekitItem(wb.factionId, k, wb)).filter(Boolean);
    const sole = others.find(o => o.soleBattlekit);
    if (sole) return { state: 'disabled', reason: sole.name + ': no puede llevar otro Battlekit' };
    if (item.soleBattlekit && others.length) {
      return { state: 'disabled', reason: item.name + ': no puede llevar otro Battlekit' };
    }
    const blocker = others.find(o => (o.forbidsCategories || []).includes(category));
    if (blocker) return { state: 'disabled', reason: 'Incompatible con ' + blocker.name };
    const clash = (item.forbidsCategories || []).length &&
      others.find(o => item.forbidsCategories.includes(getArmouryCategory(wb.factionId, o.id)));
    if (clash) return { state: 'disabled', reason: 'Incompatible con ' + clash.name };
  }

  // Warband cap on HEAVY Ranged Weapons (Abyssinia: 3, Satchel Charges excluded)
  {
    const hv = getActiveVariant(wb);
    if (hv && hv.heavyRangedMax && (category === 'ranged' || category === 'anchoriteRanged') &&
        itemHasWeaponKeyword(item, 'HEAVY')) {
      let used = 0;
      for (const m of wb.models) for (const kid of (m.battlekit || [])) {
        const c = getArmouryCategory(wb.factionId, kid);
        const it = findBattlekitItem(wb.factionId, kid, wb);
        if ((c === 'ranged' || c === 'anchoriteRanged') && it && itemHasWeaponKeyword(it, 'HEAVY')) used++;
      }
      if (used >= hv.heavyRangedMax) {
        return { state: 'disabled', reason: 'Máx. ' + hv.heavyRangedMax + ' armas a distancia HEAVY en la banda (' + used + ')' };
      }
    }
  }

  // Weapon Collections: max N pieces from each foreign armoury, whole warband
  if (item._foreignFaction) {
    const fa = ((getActiveVariant(wb) || {}).foreignArmoury || [])
      .find(x => x.factionId === item._foreignFaction);
    if (fa && fa.max) {
      let used = 0;
      for (const m of wb.models) {
        for (const kid of (m.battlekit || [])) {
          const it = findBattlekitItem(wb.factionId, kid, wb);
          if (it && it._foreignFaction === fa.factionId) used++;
        }
      }
      if (used >= fa.max) {
        const fname = (DATA.factions[fa.factionId] || {}).name || fa.factionId;
        return { state: 'disabled', reason: (fa.label || 'Otra armería') + ': ya tienes ' + used + '/' + fa.max + ' de ' + fname };
      }
    }
  }

  // Per-warband limit reached
  if (r.limit !== null) {
    const used = countItemUsageInWarband(wb, item.id);
    if (used >= r.limit) {
      return { state: 'disabled', reason: `Límite de banda: ${used}/${r.limit}` };
    }
  }

  // One armour per model
  if (category === 'armour' && modelHasCategoryItem(wb, model, 'armour')) {
    return { state: 'disabled', reason: 'Ya lleva armadura' };
  }

  // One shield per model (canon: "One Shield")
  if (category === 'shields' && modelHasCategoryItem(wb, model, 'shields')) {
    return { state: 'disabled', reason: 'Ya lleva escudo (canon: 1 escudo)' };
  }

  // One type of grenade per model (canon: "One type of Grenade")
  // Different items in the 'grenades' category represent different grenade
  // types (Frag, Incendiary, Gas, etc.). A model may only carry one type.
  if (category === 'grenades' && modelHasCategoryItem(wb, model, 'grenades')) {
    return { state: 'disabled', reason: 'Solo 1 tipo de granada por modelo (canon)' };
  }

  // One headgear per model
  if (r.tags.has('Headgear') && modelHasHeadgear(wb, model)) {
    return { state: 'disabled', reason: 'Ya lleva pieza de cabeza' };
  }

  // Heavy Ballistic Shield needs Machine Armour equipped
  if (r.requiresEquipped) {
    if (!modelEffectivelyHas(wb, model, r.requiresEquipped)) {
      // Transitively check: is the prereq even legal for this unit?
      const prereqItem = findBattlekitItem(wb.factionId, r.requiresEquipped, wb);
      if (prereqItem) {
        const prereqR = parseRestriction(prereqItem.restriction);
        if (prereqR.eliteOnly || prereqR.allowedUnitIds) {
          const tierOk = prereqR.eliteOnly && unit.tier === 'elite';
          const unitOk = prereqR.allowedUnitIds && prereqR.allowedUnitIds.includes(unit.id);
          if (!tierOk && !unitOk) {
            return { state: 'hidden', reason: 'Prerequisito imposible' };
          }
        }
      }
      // For MHI specifically, the prereq depends on costVariant
      if (unit.id === 'mech-heavy-inf' && r.requiresEquipped === 'machine-armour-na') {
        return { state: 'disabled', reason: 'Requiere variante Machine Armour (95👑)' };
      }
      return { state: 'disabled', reason: 'Requiere Machine Armour equipada' };
    }
  }

  // Cost cap (Wretched: 10 👑 in their faction's armoury)
  if (access.costCap && item.currency === access.costCap.currency) {
    const current = modelBattlekitSpend(wb, model, access.costCap.currency);
    if (current + item.cost > access.costCap.max) {
      return { state: 'disabled', reason: `Cap: ${current}/${access.costCap.max} ${access.costCap.currency}` };
    }
  }

  // ---- HEAVY: max 1 piece of Battlekit with HEAVY per model ----
  // Canon: "HEAVY (Effect): A model cannot be equipped with more than one piece
  //         of Battlekit with this Keyword..."
  // EXCEPCIÓN: "NEGATE [KEYWORD] (Effect): A model with the NEGATE Keyword is
  //         not affected by the specified Keyword's Effect."
  // STRONG (Effect): "A model with this Keyword has the NEGATE HEAVY Keyword."
  // → Modelos con STRONG (o NEGATE HEAVY explícito) ignoran el límite de 1.
  if (itemHasWeaponKeyword(item, 'HEAVY')) {
    if (modelHasWeaponKeyword(wb, model, 'HEAVY') &&
        !modelNegatesKeyword(model, unit, 'HEAVY', wb)) {
      return { state: 'disabled', reason: 'Ya lleva un arma HEAVY (máx. 1)' };
    }
  }

  // ---- HELD (canon): "a model that has this Keyword can only be equipped
  // with or use either a 1-Handed Weapon or a Shield". Sin armas 2H, sin
  // arma + escudo (aunque tenga Shield Combo) y como mucho UNA arma 1H.
  // Las granadas no cuentan.
  // ----
  const modelHasHeld = modelHasWeaponKeyword(wb, model, 'HELD');
  const itemHasHeld = itemHasWeaponKeyword(item, 'HELD');
  if (modelHasHeld || itemHasHeld) {
    const weaponsNow = countModelMeleeWeapons(wb, model).total +
                       countModelRangedWeapons(wb, model).total;
    // If we're trying to add a HELD item, ensure no 2H weapons present
    if (itemHasHeld) {
      for (const kid of (model.battlekit || [])) {
        const eit = findBattlekitItem(wb.factionId, kid, wb);
        if (!eit) continue;
        if (eit.type === '2-Handed') {
          return { state: 'disabled', reason: 'No compatible con armas 2H equipadas (HELD)' };
        }
      }
      if (weaponsNow > 1) {
        return { state: 'disabled', reason: 'HELD: solo un arma 1H o un Escudo (quita armas primero)' };
      }
      const hasShieldNow = (model.battlekit || []).some(kid =>
        getArmouryCategory(wb.factionId, kid) === 'shields');
      if (hasShieldNow && weaponsNow > 0) {
        return { state: 'disabled', reason: 'HELD: no puede llevar arma y escudo' };
      }
    }
    // HELD ya equipado: solo cabe una arma
    if (modelHasHeld && weaponsNow >= 1 &&
        (category === 'melee' || category === 'ranged' || category === 'anchoriteRanged')) {
      return { state: 'disabled', reason: 'HELD: solo un arma 1H o un Escudo' };
    }
    // If model has HELD already, any 2H is forbidden
    if (modelHasHeld && item.type === '2-Handed') {
      return { state: 'disabled', reason: 'HELD: solo armas 1H o un Escudo' };
    }
    // HELD: cannot have weapon AND shield
    if (modelHasHeld && category === 'shields') {
      // Already carries a 1H weapon? Block shield
      const hasOneH = (model.battlekit || []).some(kid => {
        const eit = findBattlekitItem(wb.factionId, kid, wb);
        return eit && eit.type === '1-Handed' &&
               (getArmouryCategory(wb.factionId, kid) === 'ranged' ||
                getArmouryCategory(wb.factionId, kid) === 'melee');
      });
      if (hasOneH) {
        return { state: 'disabled', reason: 'HELD: no puede llevar arma y escudo' };
      }
    }
    if (modelHasHeld && (category === 'ranged' || category === 'melee') && item.type === '1-Handed') {
      // Block 1H weapon if already carrying a shield
      const hasShield = (model.battlekit || []).some(kid =>
        getArmouryCategory(wb.factionId, kid) === 'shields');
      if (hasShield) {
        return { state: 'disabled', reason: 'HELD: no puede llevar arma y escudo' };
      }
    }
  }

  // ---- Shield + 2-Handed: only if BOTH have Shield Combo ----
  // If adding a shield: existing 2-Handed weapons must all have Shield Combo,
  // and the shield itself must have Shield Combo.
  const upWeaponLimits = (activeUpgrades(model, unit, wb).find(u => u.weaponLimits) || {}).weaponLimits || null;
  if (category === 'shields') {
    const shieldHasCombo = r.tags.has('Shield Combo') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);
    const isStrong = (unit ? effectiveKeywords(model, unit, wb) : []).includes('STRONG');
    for (const kid of (model.battlekit || [])) {
      const eit = findBattlekitItem(wb.factionId, kid, wb);
      if (!eit || eit.type !== '2-Handed') continue;
      const er = parseRestriction(eit.restriction);
      if (!shieldHasCombo || !er.tags.has('Shield Combo')) {
        return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos' };
      }
    }
    // Canon: with a shield, a model can carry max 1×1H melee + 1×1H ranged.
    // If adding a shield while the model already has 2 weapons of either
    // type, block — the user must drop a weapon first.
    const melee = countModelMeleeWeapons(wb, model);
    const ranged = countModelRangedWeapons(wb, model);
    const shieldMelee = upWeaponLimits ? upWeaponLimits.shieldMeleeMax : 1;
    const shieldRanged = upWeaponLimits ? upWeaponLimits.rangedMax : 1;
    if (melee.count1H > shieldMelee) {
      return { state: 'disabled',
        reason: 'Con escudo: máx ' + shieldMelee + ' arma(s) 1H melee (quita una primero)' };
    }
    if (ranged.count1H > shieldRanged) {
      return { state: 'disabled',
        reason: 'Con escudo: máx 1 arma 1H ranged (canon — quita una primero)' };
    }
  }
  // If adding a 2-Handed weapon: existing shield must allow combo and
  // the new weapon must have Shield Combo.
  if (item.type === '2-Handed') {
    const has2hCombo = r.tags.has('Shield Combo') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);
    const isStrong = (unit ? effectiveKeywords(model, unit, wb) : []).includes('STRONG');
    const isStrongOverride = isStrong && category === 'melee' && !itemHasWeaponKeyword(item, 'CUMBERSOME');
    for (const kid of (model.battlekit || [])) {
      const eit = findBattlekitItem(wb.factionId, kid, wb);
      if (!eit) continue;
      if (getArmouryCategory(wb.factionId, kid) === 'shields') {
        const er = parseRestriction(eit.restriction);
        if (!has2hCombo || !er.tags.has('Shield Combo')) {
          return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos' };
        }
      }
    }
  }

  // ---- Bayonet: requires a ranged weapon with Bayonet Lug equipped ----
  if (itemIsBayonet(item) && !modelHasBayonetLug(wb, model)) {
    return { state: 'disabled', reason: 'Requiere arma a distancia con Bayonet Lug' };
  }

  // ---- Implicit weapon limit (canon: 1×2H OR up to 2×1H of same type) ----
  // Default: hasta 2×1H melee + 2×1H ranged, o 1×2H del mismo tipo.
  // Con escudo: max 1×1H melee + 1×1H ranged (sin 2H, salvo Shield Combo).
  // STRONG (melee only): permite 1×2H melee + 1×1H melee.
  // Excepciones por unidad declaradas en battlekitAccess.weaponLimits.
  // anchoriteRanged is treated as ranged for the limit.
  const isRangedLike = (category === 'ranged' || category === 'anchoriteRanged');
  if (category === 'melee' || isRangedLike) {
    const limits = getWeaponLimits(model, unit, wb);
    const melee = countModelMeleeWeapons(wb, model);
    const ranged = countModelRangedWeapons(wb, model);
    const totalNow = melee.total + ranged.total;

    if (category === 'melee') {
      const newCount1H = melee.count1H + (item.type === '1-Handed' ? 1 : 0);
      const newCount2H = melee.count2H + (item.type === '2-Handed' ? 1 : 0);
      // CUMBERSOME (canon): "require two hands to use, even if the model has
      // the STRONG Keyword" → STRONG no convierte ese 2H en 1H.
      const cumbersome2H = (item.type === '2-Handed' && itemHasWeaponKeyword(item, 'CUMBERSOME')) ||
        (model.battlekit || []).some(kid => {
          const eit = findBattlekitItem(wb.factionId, kid, wb);
          return eit && eit.type === '2-Handed' &&
                 getArmouryCategory(wb.factionId, kid) === 'melee' &&
                 itemHasWeaponKeyword(eit, 'CUMBERSOME');
        });
      const check = checkWeaponSlots(newCount1H, newCount2H,
                                     limits.meleeMax, limits.strongBonus && !cumbersome2H,
                                     limits.twoHandedSlots);
      if (!check.allowed) {
        return { state: 'disabled', reason: check.reason };
      }
    }

    if (isRangedLike) {
      const newCount1H = ranged.count1H + (item.type === '1-Handed' ? 1 : 0);
      const newCount2H = ranged.count2H + (item.type === '2-Handed' ? 1 : 0);
      // STRONG only applies to melee — ranged uses strict canon
      const check = checkWeaponSlots(newCount1H, newCount2H,
                                     limits.rangedMax, false, limits.twoHandedSlots);
      if (!check.allowed) {
        return { state: 'disabled', reason: check.reason };
      }
    }

    // Total cap (Amalgam: 6 weapons, melee+ranged)
    if (limits.totalMax !== null && (totalNow + 1) > limits.totalMax) {
      return { state: 'disabled', reason: `Máx ${limits.totalMax} armas totales` };
    }
  }

  // ---- Anchorite Battlekit: max N pieces (default 2) ----
  if (category === 'anchoriteBattlekit') {
    const max = (access && access.anchoriteBattlekitMax) || 2;
    let current = 0;
    for (const kid of (model.battlekit || [])) {
      if (kid === item.id) continue;
      if (getArmouryCategory(wb.factionId, kid) === 'anchoriteBattlekit') current++;
    }
    if (current >= max) {
      return { state: 'disabled', reason: `Máx ${max} piezas de Anchorite Battlekit` };
    }
  }

  // ---- Brazen Bull: only HEAVY weapons ----
  if (access.weaponsMustHaveKeyword) {
    const required = access.weaponsMustHaveKeyword;
    if ((category === 'ranged' || category === 'melee') &&
        !itemHasWeaponKeyword(item, required)) {
      return { state: 'hidden', reason: `Solo armas con ${required}` };
    }
  }

  return { state: 'available' };
}

// Loadout summary for the detail panel
function modelLoadoutSummary(wb, model, unit) {
  const summary = {
    battlekitCost: 0,
    battlekitGlory: 0,
    counts: { ranged: 0, melee: 0, grenades: 0, shields: 0, armour: 0, equipment: 0 },
    hasHeadgear: false,
  };
  for (const kid of (model.battlekit || [])) {
    const it = findBattlekitItem(wb.factionId, kid, wb);
    if (!it) continue;
    if (it.currency === '👑') summary.battlekitCost += it.cost;
    else summary.battlekitGlory += it.cost;
    const cat = getArmouryCategory(wb.factionId, kid);
    if (cat && summary.counts[cat] !== undefined) summary.counts[cat]++;
    if (parseRestriction(it.restriction).tags.has('Headgear')) summary.hasHeadgear = true;
  }
  return summary;
}


