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
  // Rasgos defensivos y de armaduras
  if (kw === 'NEGATE FIRE') {
    return 'Inmune a los efectos del fuego y a la keyword FIRE (no sufre Blood Markers por llamas).';
  }
  if (kw === 'NEGATE GAS') {
    return 'Inmune a los efectos del Gas y las armas con la keyword GAS.';
  }
  if (kw === 'NEGATE SHRAPNEL') {
    return 'Ignora el modificador de herida letal de armas y ataques con metralla (SHRAPNEL).';
  }
  if (kw === 'NEGATE FEAR') {
    return 'Inmune al terror provocado por miniaturas y armas con FEAR.';
  }
  if (kw === 'IMPERVIOUS') {
    return 'Inmune a efectos tóxicos, infecciosos, ponzoñas y corrupción sobrenatural.';
  }
  if (kw === 'BULKY') {
    return 'Requiere peana mín. 40mm (o 50mm). El bonificador de Carga es D3" en vez de D6", y no puede portar Escudo de Trinchera.';
  }
  if (kw === 'STANDFAST') {
    return 'Un resultado de "Down" en la tabla de Injury cuenta como "Minor Hit" (permanece en pie).';
  }
  if (kw === 'COVER') {
    return 'Otorga beneficio de Cobertura (+1 DICE a la supervivencia frente a ataques frontales a distancia).';
  }
  if (kw === 'FLAME REPELLENT') {
    return '-1 INJURY DICE a las tiradas de herida de ataques con FIRE contra el portador, incluso si el arma tiene IGNORE ARMOUR.';
  }
  return null;
}

/**
 * Extrae modificadores de herida y rasgos defensivos de una armadura, escudo o pieza de equipo.
 */
function extractArmourDefenses(item) {
  if (!item) {
    return {
      injuryModifier: null,
      modifierNumber: 0,
      isShield: false,
      defensiveTraits: [],
      rules: []
    };
  }

  const kws = item.weaponKeywords || [];
  const rulesList = [];
  let modifierNumber = 0;
  let injuryModifier = null;
  const defensiveTraits = [];

  const nameUpper = (item.name || '').toUpperCase();
  const isShield = (item.type || '').toLowerCase().includes('shield') || 
                   (item.category || '').toLowerCase().includes('shield') ||
                   nameUpper.includes('SHIELD') || 
                   nameUpper.includes('KALKAN');

  for (const kw of kws) {
    const match = String(kw).match(/-(\d+)\s+INJURY\s+MODIFIER/i);
    if (match) {
      modifierNumber += parseInt(match[1], 10);
      injuryModifier = `-${match[1]}`;
    } else if (/^(NEGATE\s+(?:FIRE|GAS|SHRAPNEL|FEAR)|IMPERVIOUS|COVER|STANDFAST|BULKY)$/i.test(kw.trim())) {
      defensiveTraits.push(kw.trim().toUpperCase());
    } else {
      rulesList.push(kw);
    }
  }

  // Deducciones por nombre o reglas conocidas
  if (nameUpper.includes('MACHINE ARMOUR') || nameUpper.includes('TANK PALANQUIN')) {
    if (!defensiveTraits.includes('BULKY')) defensiveTraits.push('BULKY');
  }
  if (nameUpper.includes('TANK PALANQUIN')) {
    if (!defensiveTraits.includes('STANDFAST')) defensiveTraits.push('STANDFAST');
  }
  if (nameUpper.includes('HEAVY BALLISTIC SHIELD') || nameUpper.includes('KALKAN')) {
    if (!defensiveTraits.includes('COVER')) defensiveTraits.push('COVER');
  }
  if (nameUpper.includes('FIRE SHIELD')) {
    if (!defensiveTraits.includes('NEGATE FIRE')) defensiveTraits.push('NEGATE FIRE');
    if (!defensiveTraits.includes('FLAME REPELLENT')) defensiveTraits.push('FLAME REPELLENT');
  }
  if (nameUpper.includes('ALCHEMIST ARMOUR')) {
    if (!defensiveTraits.includes('NEGATE FIRE')) defensiveTraits.push('NEGATE FIRE');
    if (!defensiveTraits.includes('NEGATE GAS')) defensiveTraits.push('NEGATE GAS');
  }
  if (nameUpper.includes('TARNISHED ARMOUR')) {
    if (!defensiveTraits.includes('NEGATE GAS')) defensiveTraits.push('NEGATE GAS');
  }
  if (nameUpper.includes('ENGINEER BODY ARMOUR')) {
    if (!defensiveTraits.includes('NEGATE SHRAPNEL')) defensiveTraits.push('NEGATE SHRAPNEL');
  }
  if (nameUpper.includes('INFERNAL IRON ARMOUR') || nameUpper.includes('HOLY ICON')) {
    if (!defensiveTraits.includes('IMPERVIOUS')) defensiveTraits.push('IMPERVIOUS');
  }

  return {
    injuryModifier,
    modifierNumber,
    isShield,
    defensiveTraits: Array.from(new Set(defensiveTraits)),
    rules: rulesList
  };
}

/**
 * Evalúa las restricciones y efectos de la regla BULKY para una miniatura.
 */
function getBulkyInfo(model, unit, wb, armourItem) {
  const isAlba = wb?.variantId === 'alba';
  const hasMachineArmour = (model?.battlekit || []).includes('machine-armour-na') ||
    (model?.unitId === 'mech-heavy-inf' && model?.costVariant === 'alt') ||
    (armourItem && (armourItem.id === 'machine-armour-na' || (armourItem.name || '').toLowerCase().includes('machine armour')));

  const hasTankPalanquin = (model?.battlekit || []).includes('tank-palanquin') ||
    (armourItem && (armourItem.id === 'tank-palanquin' || (armourItem.name || '').toLowerCase().includes('tank palanquin')));

  const unitHasBulky = (unit?.keywords || []).includes('BULKY');

  if (hasMachineArmour && isAlba) {
    return {
      isBulky: true,
      baseSize: '40mm+',
      chargeBonus: 'D6"',
      isCeltic: true,
      note: 'Celtic Machine Armour: Carga D6" (no D3") y sin penalización de movimiento por Down.'
    };
  }

  if (hasTankPalanquin) {
    return {
      isBulky: true,
      baseSize: '50mm',
      chargeBonus: 'D3"',
      isCeltic: false,
      note: 'Bulky: Peana mín. 50mm, Carga D3" en vez de D6", no puede llevar escudo. Standfast: Down cuenta como Minor Hit.'
    };
  }

  if (hasMachineArmour) {
    return {
      isBulky: true,
      baseSize: '40mm+',
      chargeBonus: 'D3"',
      isCeltic: false,
      note: 'Bulky: Peana mín. 40mm, Carga D3" en vez de D6". No puede equipar Escudo de Trinchera.'
    };
  }

  if (unitHasBulky) {
    return {
      isBulky: true,
      baseSize: '40mm+',
      chargeBonus: 'D3"',
      isCeltic: false,
      note: 'Bulky: Peana mín. 40mm, Carga D3" en vez de D6".'
    };
  }

  return {
    isBulky: false,
    baseSize: '25mm/32mm',
    chargeBonus: 'D6"',
    isCeltic: false,
    note: ''
  };
}

/**
 * Desglose detallado de la armadura total de una miniatura (innata, corporal y escudo).
 */
function getModelArmourBreakdown(model, unit, wb) {
  let findBattlekitItemFn = null;
  let findArmouryItemByNameFn = null;
  try {
    const cc = require('./cost_calculation');
    findBattlekitItemFn = cc.findBattlekitItem;
    findArmouryItemByNameFn = cc.findArmouryItemByName;
  } catch (_) {}

  const parts = [];

  // MHI especial
  if (unit?.id === 'mech-heavy-inf') {
    const isAlt = model?.costVariant === 'alt';
    const baseArm = isAlt ? 3 : 2;
    parts.push({
      label: isAlt ? 'Machine Armour' : 'Reinforced Armour',
      value: baseArm,
      name: isAlt ? 'Machine Armour' : 'Reinforced Armour'
    });
  } else {
    // Innata
    const rawArmour = unit?.stats?.armour;
    const innateNum = Math.abs(parseInt(rawArmour) || 0);
    if (innateNum > 0) {
      parts.push({
        label: 'Innata',
        value: innateNum,
        name: 'Armadura Base'
      });
    }
  }

  // Items en battlekit y equipamiento
  const bkEquip = (model?.battlekit || []).map((id) => {
    return findBattlekitItemFn ? findBattlekitItemFn(wb?.factionId, id, wb) : { id, name: id };
  }).filter(Boolean);

  const permEquip = (unit?.permanentEquipment || []).map((p) => {
    const cleanName = p.split(' (')[0];
    if (findArmouryItemByNameFn) {
      return findArmouryItemByNameFn(cleanName, wb) || findArmouryItemByNameFn(p, wb) || { name: p };
    }
    return { name: p };
  });

  const allItems = [...bkEquip];
  if (parts.length === 0) {
    allItems.push(...permEquip);
  }

  const seen = new Set();
  allItems.forEach((it) => {
    if (!it?.name || seen.has(it.name)) return;
    seen.add(it.name);

    if (it.weaponKeywords) {
      it.weaponKeywords.forEach((kw) => {
        const match = String(kw).match(/-(\d+)\s+INJURY MODIFIER/i);
        if (match) {
          const val = parseInt(match[1], 10);
          const isShield = (it.type || '').toLowerCase().includes('shield') || 
                           (it.category || '').toLowerCase().includes('shield') || 
                           (it.name || '').toLowerCase().includes('shield') || 
                           (it.name || '').toLowerCase().includes('kalkan');
          parts.push({
            label: isShield ? 'Escudo' : 'Armadura',
            value: val,
            name: it.name
          });
        }
      });
    }
  });

  const totalNumber = parts.reduce((acc, p) => acc + p.value, 0);
  const totalArmour = totalNumber > 0 ? `-${totalNumber}` : '0';
  const summary = parts.length > 0 
    ? parts.map(p => `-${p.value} ${p.name}`).join(' + ')
    : 'Sin armadura';

  return {
    totalArmour,
    totalNumber,
    parts,
    summary
  };
}

/**
 * Extrae todas las inmunidades defensivas activas de una miniatura (a fuego, gas, metralla, miedo, impervious, etc.).
 */
function getModelDefensiveImmunities(model, unit, wb, extraEquip) {
  let findBattlekitItemFn = null;
  try {
    const cc = require('./cost_calculation');
    findBattlekitItemFn = cc.findBattlekitItem;
  } catch (_) {}

  const immunities = new Set();
  
  // Unit keywords
  const uKws = (unit?.keywords || []);
  uKws.forEach((k) => {
    if (/^(NEGATE\s+(?:FIRE|GAS|SHRAPNEL|FEAR)|IMPERVIOUS|STANDFAST|TOUGH)$/i.test(k.trim())) {
      immunities.add(k.trim().toUpperCase());
    }
  });

  // Battlekit & equipment
  const items = [
    ...((model?.battlekit || []).map((id) => findBattlekitItemFn ? findBattlekitItemFn(wb?.factionId, id, wb) : { id, name: id }).filter(Boolean)),
    ...(extraEquip || [])
  ];

  items.forEach((it) => {
    const d = extractArmourDefenses(it);
    d.defensiveTraits.forEach(t => immunities.add(t));
    if (it.name?.toLowerCase().includes('gas mask') || it.name?.toLowerCase().includes('gas filter')) {
      immunities.add('NEGATE GAS');
    }
    if (it.name?.toLowerCase().includes('combat helmet') || it.name?.toLowerCase().includes('iron capirote') || it.name?.toLowerCase().includes('compound eyes')) {
      immunities.add('NEGATE SHRAPNEL');
    }
    if (it.name?.toLowerCase().includes('iron capirote')) {
      immunities.add('NEGATE FEAR');
    }
    if (it.name?.toLowerCase().includes('infernal brand')) {
      immunities.add('NEGATE FIRE');
    }
  });

  return Array.from(immunities);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatRange,
    getWeaponHand,
    extractWeaponCombatModifiers,
    getModelSpecialAmmunition,
    isAmmunitionApplicableToWeapon,
    getTacticalRuleNote,
    extractArmourDefenses,
    getBulkyInfo,
    getModelArmourBreakdown,
    getModelDefensiveImmunities
  };
}
