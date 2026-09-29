import { DATA } from '../data/01_trench_crusade_game_data';
import { unitForbiddenByVariant, getActiveVariant, variantUnitOverride, getUnit, modelCost } from './cost_calculation';

/* ======================================================================
   LIMIT VALIDATION
   ====================================================================== */

export function parseLimit(limitStr) {
  if (!limitStr) return null;
  if (/^\d+$/.test(limitStr)) return { min: parseInt(limitStr), max: parseInt(limitStr) };
  const m = limitStr.match(/^(\d+)-(\d+)$/);
  if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) };
  return null;
}

export function unitCountInWarband(wb, unitId) {
  return wb.models.filter(m => m.unitId === unitId).length;
}

// Canon (Warbands 1.0.2): cada Mercenario indica qué facciones pueden contratarlo.
export function mercNotHireable(wb, unit) {
  return !!(unit && Array.isArray(unit.hiredBy) && !unit.hiredBy.includes(wb.factionId));
}

// Canon (Starting a Warband): máximo 6 modelos ELITE en la banda.
export function eliteCapReached(wb, unit) {
  return !!unit && unit.tier === 'elite' &&
         countEliteInWarband(wb) >= 6;
}

// Units limited by how many of another unit the warband has
// (e.g. one Takwin Homunculus per Jabirean Alchemist).
export function perUnitLimitReached(wb, unit) {
  if (!unit || !unit.limitPerUnit) return false;
  return unitCountInWarband(wb, unit.id) >= unitCountInWarband(wb, unit.limitPerUnit);
}

export function perUnitLimitText(wb, unit) {
  const other = getUnit(wb.factionId, unit.limitPerUnit);
  return '1 por ' + (other ? other.name : unit.limitPerUnit) +
    ' (' + unitCountInWarband(wb, unit.id) + '/' + unitCountInWarband(wb, unit.limitPerUnit) + ')';
}

export function canAddUnit(wb, unit) {
  // Check variant prohibition first (so we can show why)
  if (unitForbiddenByVariant(wb, unit.id)) return false;
  // Variant-only units (Dervishes, Master Assassin...) need their variant
  if (unit.variantOnly && unit.variantOnly !== (wb && wb.variantId)) return false;
  {
    const v = getActiveVariant(wb);
    // Shared cap for several units (Red Brigade, Displeasure of the Church)
    for (const g of ((v && v.unitGroupMax) || [])) {
      if (g.unitIds.includes(unit.id) &&
          (wb.models || []).filter(m => g.unitIds.includes(m.unitId)).length >= g.max) return false;
    }
  }
  // No more of this unit than other models (Red Brigade Trench Dogs)
  if (unit.maxVsOtherModels) {
    const mine = (wb.models || []).filter(m => m.unitId === unit.id).length;
    if (mine + 1 > (wb.models || []).length - mine) return false;
  }
  // Units that need the rest of the warband to be worth X 👑 (Great Maw: 1,000)
  if (unit.requiresWarbandValue) {
    const value = (wb.models || []).filter(m => m.unitId !== unit.id)
      .reduce((t, m) => t + modelCost(m, wb.factionId, wb).ducados, 0);
    if (value < unit.requiresWarbandValue) return false;
  }
  {
    const v = getActiveVariant(wb);
    // Enemies of All (Trench Ghosts): no Mercenaries
    if (v && v.noMercenaries && (DATA.mercenaries || []).some(m => m.id === unit.id)) return false;
    // One unit instead of another (Barbed Wire Banshee instead of a Chorister)
    for (const grp of ((v && v.exclusiveUnitGroups) || [])) {
      if (grp.includes(unit.id) &&
          (wb.models || []).some(m => m.unitId !== unit.id && grp.includes(m.unitId))) return false;
    }
  }
  if (mercNotHireable(wb, unit)) return false;
  if (eliteCapReached(wb, unit)) return false;
  if (perUnitLimitReached(wb, unit)) return false;
  // Use the variant-overridden limit if defined (e.g. Anchorite Shrine 0-2 in St. Methodius)
  const override = variantUnitOverride(wb, unit.id);
  const limStr = (override && override.limit) || unit.limit;
  const lim = parseLimit(limStr);
  if (!lim) return true;
  return unitCountInWarband(wb, unit.id) < lim.max;
}

/* Fase 10 PIVOT v2 — wrapper informativo. Bandas Companion permiten
 * añadir/duplicar siempre (TC es la verdad oficial; Forge no policía).
 * Bandas locales (sin companionSource) mantienen bloqueo estricto.
 * Returns { canAdd:boolean, warning?:string }.
 */
export function canAddUnitWithWarning(wb, unit) {
  if (!wb || !unit) return { canAdd: false };
  const forbiddenBy = unitForbiddenByVariant(wb, unit.id);
  const override = variantUnitOverride(wb, unit.id);
  const limStr = (override && override.limit) || unit.limit;
  const lim = parseLimit(limStr);
  const count = unitCountInWarband(wb, unit.id);
  const exceedsLimit = lim && count >= lim.max;
  const notHireable = mercNotHireable(wb, unit);
  const eliteFull = eliteCapReached(wb, unit);

  // Banda Companion → permitir todo, solo advertir.
  if (wb.companionSource) {
    if (notHireable) {
      return { canAdd: true,
        warning: (unit.name || unit.id) + ' no puede contratarse en esta facción. Trench Companion lo gestiona — Forge solo informa.' };
    }
    if (eliteFull) {
      return { canAdd: true,
        warning: 'La banda ya tiene 6 ELITE (máximo canon). Trench Companion lo gestiona — Forge solo informa.' };
    }
    if (forbiddenBy) {
      return { canAdd: true,
        warning: 'La variante ' + forbiddenBy + ' no permite ' + (unit.name || unit.id) +
                 '. Trench Companion lo gestiona — Forge solo informa.' };
    }
    if (exceedsLimit) {
      return { canAdd: true,
        warning: 'Límite ' + limStr + ' alcanzado para ' + (unit.name || unit.id) +
                 '. Trench Companion lo gestiona — Forge solo informa.' };
    }
    return { canAdd: true };
  }

  // Banda local → bloqueo estricto (modo offline / Nueva Manual).
  if (forbiddenBy) return { canAdd: false,
    warning: 'La variante ' + forbiddenBy + ' no permite ' + (unit.name || unit.id) + '.' };
  if (notHireable) return { canAdd: false,
    warning: (unit.name || unit.id) + ' no puede contratarse en esta facción.' };
  if (eliteFull) return { canAdd: false,
    warning: 'Máximo 6 modelos ELITE en la banda.' };
  if (perUnitLimitReached(wb, unit)) {
    const other = getUnit(wb.factionId, unit.limitPerUnit);
    return { canAdd: false,
      warning: 'Solo 1 ' + (unit.name || unit.id) + ' por ' + (other ? other.name : unit.limitPerUnit) + '.' };
  }
  if (exceedsLimit) return { canAdd: false,
    warning: 'Límite alcanzado (' + count + '/' + lim.max + ').' };
  return { canAdd: true };
}


export function countEliteInWarband(wb) {
  return wb.models.filter(m => m.isElite).length;
}
