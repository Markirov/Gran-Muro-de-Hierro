// @ts-nocheck

/**
 * Normaliza y formatea la cadena de alcance de un arma (evita dobles comillas 24"").
 */
function formatRange(rawRange) {
  if (!rawRange || rawRange === '-') return '-';
  const clean = rawRange.trim();
  if (/^melee$/i.test(clean)) return 'Melee';
  if (clean.includes('/')) {
    // ej. '12"/Melee'
    return clean;
  }
  // Limpiar cualquier comilla previa y añadir exactamente una si termina en número
  const numOnly = clean.replace(/"+$/, '');
  return `${numOnly}"`;
}

/**
 * Extrae la clasificación de manos y tipo del arma.
 */
function getWeaponHand(w, hasStrong = false) {
  const typeStr = (w.type || '').toLowerCase();
  const kws = w.weaponKeywords || [];
  const isPistol = typeStr.includes('pistol') || kws.includes('PISTOL');
  const isGrenade = typeStr.includes('grenade') || kws.includes('GRENADE');
  const is2H = typeStr.includes('2-handed');
  const isMelee = (w.range || '').toLowerCase().includes('melee') || typeStr.includes('melee');
  const isCumbersome = kws.includes('CUMBERSOME');
  
  const effective1HWithStrong = hasStrong && is2H && isMelee && !isCumbersome;

  let label = '1H';
  if (isPistol) label = 'Pistol';
  else if (isGrenade) label = 'Granada';
  else if (is2H) label = effective1HWithStrong ? '1H (STRONG)' : '2H';
  else if (typeStr.includes('1-handed')) label = '1H';
  else if (w.type) label = w.type;

  return {
    label,
    is2H,
    isPistol,
    isGrenade,
    effective1HWithStrong
  };
}

/**
 * Separa modificadores numéricos de combate de las keywords narrativas/tácticas.
 */
function extractWeaponCombatModifiers(w) {
  const kws = w.weaponKeywords || [];
  const attackModifiers = [];
  const injuryModifiers = [];
  const tacticalKeywords = [];

  for (const kw of kws) {
    if (/^[+-]\d+\s+INJURY\s+(DICE|MODIFIER)$/i.test(kw)) {
      injuryModifiers.push(kw.toUpperCase());
    } else if (/^[+-]\d+\s+DICE$/i.test(kw)) {
      attackModifiers.push(kw.toUpperCase());
    } else {
      tacticalKeywords.push(kw);
    }
  }

  return {
    attackModifiers,
    injuryModifiers,
    tacticalKeywords
  };
}

/**
 * Detecta si la miniatura porta munición especial en su equipo o battlekit.
 */
function getModelSpecialAmmunition(model, wb) {
  if (!model || !wb) return [];
  const list = [];

  const checkItem = (item) => {
    if (!item) return;
    const kws = item.weaponKeywords || [];
    for (const kw of kws) {
      const match = kw.match(/^AMMUNITION\s*\(([^)]+)\)$/i);
      if (match) {
        list.push({
          id: item.id,
          name: item.name,
          effectKeyword: match[1].trim().toUpperCase(),
          summary: `Otorga la keyword ${match[1].trim().toUpperCase()} a los disparos del modelo (y pistolas en CaC).`
        });
        return;
      }
    }
    // Detección por nombre si no tiene keyword formalizada
    const nameLow = (item.name || '').toLowerCase();
    if (nameLow.includes('armour-piercing bullets') || nameLow.includes('corrosive ammo')) {
      list.push({
        id: item.id,
        name: item.name,
        effectKeyword: 'ARMOUR-PIERCING',
        summary: 'Ignora o reduce modificadores de armadura en disparos.'
      });
    } else if (nameLow.includes('dum-dum')) {
      list.push({
        id: item.id,
        name: item.name,
        effectKeyword: 'CRITICAL',
        summary: 'Impactos críticos con disparos.'
      });
    } else if (nameLow.includes('incendiary')) {
      list.push({
        id: item.id,
        name: item.name,
        effectKeyword: 'FIRE',
        summary: 'Los disparos prenden fuego al objetivo (FIRE).'
      });
    } else if (nameLow.includes('alchemical ammo')) {
      list.push({
        id: item.id,
        name: item.name,
        effectKeyword: '+1 DICE',
        summary: '+1 DICE a las tiradas de ataque a distancia.'
      });
    }
  };

  (model.battlekit || []).forEach((id) => {
    let it = null;
    try {
      const { findBattlekitItem } = require('./cost_calculation');
      it = findBattlekitItem(wb.factionId, id, wb);
    } catch (_) {
      it = { id, name: id };
    }
    checkItem(it);
  });

  return list;
}

/**
 * Comprueba si la munición especial aplica a un arma concreta (disparo o pistola).
 */
function isAmmunitionApplicableToWeapon(weapon) {
  if (!weapon) return false;
  const kws = weapon.weaponKeywords || [];
  const isPistol = (weapon.type || '').toLowerCase().includes('pistol') || kws.includes('PISTOL');
  if (isPistol) return true; // Aplica tanto a 12" como en Melee (Errata Q4)

  const range = weapon.range || '';
  if (!range || range === '-' || range.toLowerCase() === 'melee') return false;
  return true;
}

/**
 * Provee notas tácticas y recordatorios canónicos de combate para una keyword dada.
 */
function getTacticalRuleNote(keyword) {
  const kw = (keyword || '').toUpperCase();
  if (kw === 'RELOAD') {
    return 'Al atacar con este arma, la activación de la miniatura concluye inmediatamente tras resolverse la acción.';
  }
  if (kw.startsWith('AUTOMATIC')) {
    const num = kw.replace(/[^0-9]/g, '') || '2';
    return `Puede disparar hasta ${num} tiros en la misma acción. Cada tiro tras el primero sufre -1 DICE acumulativo (-1 al 2.º, -2 al 3.º...).`;
  }
  if (kw === 'ASSAULT') {
    return 'Permite disparar tras realizar una Dash ACTION o tras Cargar.';
  }
  if (kw === 'PISTOL') {
    return 'Alcance 12" y utilizable en combate cuerpo a cuerpo (Melee). Se beneficia de munición especial en ambos modos.';
  }
  if (kw === 'CRITICAL') {
    return 'Tiradas de ataque de 11 o 12 provocan heridas críticas devastadoras.';
  }
  if (kw === 'FIRE') {
    return 'El objetivo queda en llamas (+1 Blood Marker o chequeo de fuego al activarse).';
  }
  if (kw.startsWith('BLAST')) {
    return 'Afecta en área a todas las miniaturas bajo la plantilla circular desde el punto de impacto.';
  }
  if (kw === 'HEAVY') {
    return 'Requiere 1 acción adicional para mover y disparar, salvo si el portador tiene la keyword STRONG.';
  }
  if (kw === 'CUMBERSOME') {
    return 'Requiere dos manos obligatorias incluso si el modelo tiene STRONG (solo combinable con escudo con Shield Combo).';
  }
  if (kw === 'IGNORE COVER') {
    return 'El objetivo no obtiene beneficios de tirada por estar en Cobertura.';
  }
  if (kw === 'IGNORE ARMOUR') {
    return 'La armadura del objetivo no reduce la tirada de herida contra este ataque.';
  }
  if (kw === 'SHRED') {
    return 'Obliga al objetivo a repetir tiradas de armadura exitosas.';
  }
  if (kw === 'SHRAPNEL') {
    return 'Metralla letal contra objetivos sin casco o armadura reforzada.';
  }
  if (kw === 'FUMBLE') {
    return 'Tirada natural de 2 causa fallo crítico o malfunción (revisión abril 2026).';
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatRange,
    getWeaponHand,
    extractWeaponCombatModifiers,
    getModelSpecialAmmunition,
    isAmmunitionApplicableToWeapon,
    getTacticalRuleNote
  };
}
