// @ts-nocheck
import { findBattlekitItem, findArmouryItemByName } from './cost_calculation';

/**
 * Normaliza y formatea la cadena de alcance de un arma (evita dobles comillas 24"").
 */
export function formatRange(rawRange: string | undefined): string {
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
export function getWeaponHand(w: any, hasStrong: boolean = false): {
  label: string;
  is2H: boolean;
  isPistol: boolean;
  isGrenade: boolean;
  effective1HWithStrong: boolean;
} {
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
export function extractWeaponCombatModifiers(w: any): {
  attackModifiers: string[];
  injuryModifiers: string[];
  tacticalKeywords: string[];
} {
  const kws: string[] = w.weaponKeywords || [];
  const attackModifiers: string[] = [];
  const injuryModifiers: string[] = [];
  const tacticalKeywords: string[] = [];

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

export interface SpecialAmmoInfo {
  id: string;
  name: string;
  effectKeyword: string;
  summary: string;
}

/**
 * Detecta si la miniatura porta munición especial en su equipo o battlekit.
 */
export function getModelSpecialAmmunition(model: any, wb: any): SpecialAmmoInfo[] {
  if (!model || !wb) return [];
  const list: SpecialAmmoInfo[] = [];

  const checkItem = (item: any) => {
    if (!item) return;
    const kws: string[] = item.weaponKeywords || [];
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

  (model.battlekit || []).forEach((id: string) => {
    const it = findBattlekitItem(wb.factionId, id, wb);
    checkItem(it);
  });

  return list;
}

/**
 * Comprueba si la munición especial aplica a un arma concreta (disparo o pistola).
 */
export function isAmmunitionApplicableToWeapon(weapon: any): boolean {
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
export function getTacticalRuleNote(keyword: string): string | null {
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
export function extractArmourDefenses(item: any): {
  injuryModifier: string | null;
  modifierNumber: number;
  isShield: boolean;
  defensiveTraits: string[];
  rules: string[];
} {
  if (!item) {
    return {
      injuryModifier: null,
      modifierNumber: 0,
      isShield: false,
      defensiveTraits: [],
      rules: []
    };
  }

  const kws: string[] = item.weaponKeywords || [];
  const rulesList: string[] = [];
  let modifierNumber = 0;
  let injuryModifier: string | null = null;
  const defensiveTraits: string[] = [];

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
export function getBulkyInfo(model: any, unit: any, wb: any, armourItem?: any): {
  isBulky: boolean;
  baseSize: string;
  chargeBonus: string;
  isCeltic: boolean;
  note: string;
} {
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
export function getModelArmourBreakdown(model: any, unit: any, wb: any): {
  totalArmour: string;
  totalNumber: number;
  parts: Array<{ label: string; value: number; name: string }>;
  summary: string;
} {
  const parts: Array<{ label: string; value: number; name: string }> = [];

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
  const bkEquip = (model?.battlekit || []).map((id: string) => findBattlekitItem(wb?.factionId, id, wb)).filter(Boolean);
  const permEquip = (unit?.permanentEquipment || []).map((p: string) => {
    const cleanName = p.split(' (')[0];
    return findArmouryItemByName(cleanName, wb) || findArmouryItemByName(p, wb) || { name: p };
  });

  const allItems = [...bkEquip];
  if (parts.length === 0) {
    allItems.push(...permEquip);
  }

  const seen = new Set<string>();
  allItems.forEach((it: any) => {
    if (!it?.name || seen.has(it.name)) return;
    seen.add(it.name);

    if (it.weaponKeywords) {
      it.weaponKeywords.forEach((kw: string) => {
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
export function getModelDefensiveImmunities(model: any, unit: any, wb: any, extraEquip?: any[]): string[] {
  const immunities = new Set<string>();
  
  // Unit keywords
  const uKws = (unit?.keywords || []);
  uKws.forEach((k: string) => {
    if (/^(NEGATE\s+(?:FIRE|GAS|SHRAPNEL|FEAR)|IMPERVIOUS|STANDFAST|TOUGH)$/i.test(k.trim())) {
      immunities.add(k.trim().toUpperCase());
    }
  });

  // Battlekit & equipment
  const items = [
    ...((model?.battlekit || []).map((id: string) => findBattlekitItem(wb?.factionId, id, wb)).filter(Boolean)),
    ...(extraEquip || [])
  ];

  items.forEach((it: any) => {
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

export interface EquipmentDetails {
  actionGranted: string | null;
  actionDescription: string | null;
  categoryTag: string;
  traits: string[];
  summary: string;
}

/**
 * Extrae acciones concedidas, efectos pasivos y categoría táctica de un objeto de equipo.
 */
export function extractEquipmentDetails(item: any): EquipmentDetails {
  if (!item) {
    return {
      actionGranted: null,
      actionDescription: null,
      categoryTag: 'Equipo',
      traits: [],
      summary: ''
    };
  }

  const nameUpper = (item.name || '').toUpperCase();
  const kws: string[] = item.weaponKeywords || [];
  const traits: string[] = [];
  let actionGranted: string | null = null;
  let actionDescription: string | null = null;
  let categoryTag = 'Equipo';
  let summary = '';

  for (const kw of kws) {
    if (/CONSUMABLE/i.test(kw)) traits.push('CONSUMABLE');
    if (/DEPLOYABLE/i.test(kw)) traits.push('DEPLOYABLE');
    if (/HELD/i.test(kw)) traits.push('HELD');
    if (/LEADER/i.test(kw)) traits.push('LEADER');
    if (/HEADGEAR/i.test(kw)) traits.push('HEADGEAR');
    if (/BLESSED/i.test(kw)) traits.push(kw.toUpperCase());
    if (/FEAR/i.test(kw)) traits.push('FEAR');
    if (/SKIRMISHER/i.test(kw)) traits.push('SKIRMISHER');
  }

  // Detección por tipo de objeto
  if (nameUpper.includes('MEDI-KIT') || nameUpper.includes('MEDIKIT')) {
    categoryTag = 'Médico';
    actionGranted = 'Treat ACTION';
    actionDescription = 'Risky Success Roll a 1". Con éxito, retira 1 Blood Marker de sí mismo o un aliado a 1", o levanta a un aliado Down a 1".';
    summary = 'Permite realizar Treat ACTION para retirar marcadores de sangre o levantar aliados Down.';
  } else if (nameUpper.includes('BINOCULARS') || nameUpper.includes('PRISMÁTICOS')) {
    categoryTag = 'Óptica';
    actionGranted = 'Spotter ACTION';
    actionDescription = 'Elige un enemigo visible en Line of Sight. Los ataques a distancia aliados contra ese objetivo ignoran Cover hasta el final de la ronda.';
    summary = 'Concede Spotter ACTION para anular cobertura enemiga a los disparos aliados.';
  } else if (nameUpper.includes('SHOVEL') || nameUpper.includes('PALA')) {
    categoryTag = 'Trinchera';
    actionGranted = 'Entrench ACTION';
    actionDescription = 'Coloca un marcador de Trinchera en contacto con la peana (da Cover). Con la keyword STRONG puede usarse además como arma cuerpo a cuerpo de 1 mano.';
    summary = 'Concede Entrench ACTION para cavar trincheras y dar cobertura. Utilizable en CaC con STRONG.';
  } else if (nameUpper.includes('MUSICAL INSTRUMENT') || nameUpper.includes('INSTRUMENTO') || nameUpper.includes('BAGPIPES') || nameUpper.includes('CARNYX')) {
    categoryTag = 'Moral';
    actionGranted = 'Rallying Horn ACTION';
    actionDescription = '+1 DICE a los Morale Checks de los aliados a 8". En Alba puede ser Bagpipes gratis (concede NEGATE FEAR a 8"). En Heretic Legions puede ser Carnyx (concede FEAR gratis).';
    summary = 'Concede Rallying Horn ACTION (+1 DICE a chequeos de moral aliados a 8").';
  } else if (nameUpper.includes('MOUNTAINEER KIT')) {
    categoryTag = 'Movilidad';
    summary = 'El portador ignora las penalizaciones de movimiento por escalar (Climb) y cruzar terreno vertical difícil.';
  } else if (nameUpper.includes('GAS MASK') || nameUpper.includes('GAS FILTER')) {
    categoryTag = 'Protección';
    traits.push('NEGATE GAS');
    summary = 'Inmune a los efectos del Gas y las armas con keyword GAS.';
  } else if (nameUpper.includes('COMBAT HELMET') || nameUpper.includes('COMPOUND EYES')) {
    categoryTag = 'Protección';
    traits.push('NEGATE SHRAPNEL');
    traits.push('HEADGEAR');
    summary = 'Casco de combate: otorga NEGATE SHRAPNEL frente a impactos o armas con metralla.';
  } else if (nameUpper.includes('IRON CAPIROTE')) {
    categoryTag = 'Protección';
    traits.push('NEGATE FEAR');
    traits.push('NEGATE SHRAPNEL');
    traits.push('HEADGEAR');
    summary = 'Otorga NEGATE FEAR y NEGATE SHRAPNEL.';
  } else if (nameUpper.includes('ANFARRO')) {
    categoryTag = 'Reliquia';
    traits.push('HEADGEAR');
    summary = 'Token of Honour: +1 DICE a la característica Melee del portador.';
  } else if (nameUpper.includes('SUPREME PONTIFF') || nameUpper.includes('CRUCIFIX')) {
    categoryTag = 'Reliquia';
    summary = 'Inspiring Relic: el portador no termina su activación tras fallar una Risky Success Roll.';
  } else if (nameUpper.includes('BLOOD CLOAK')) {
    categoryTag = 'Táctico';
    traits.push('SKIRMISHER');
    summary = 'El portador gana la keyword SKIRMISHER.';
  } else if (nameUpper.includes('RED BANNER') || nameUpper.includes('TROOP FLAG') || nameUpper.includes('REGIMENTAL KAŞIK')) {
    categoryTag = 'Estandarte';
    traits.push('LEADER');
    if (nameUpper.includes('RED BANNER')) {
      summary = 'Mientras su portador esté vivo, la banda nunca huye (Shaken en vez de retirada).';
    } else {
      summary = 'Estandarte reglamentario de la banda.';
    }
  } else if (nameUpper.includes('STANDARD OF MAMMON')) {
    categoryTag = 'Estandarte';
    summary = 'Kneel Before Me: un enemigo Down a 1" no puede levantarse. Enemigos que terminen una carga a 1" hacen Success Roll o quedan Down.';
  } else if (nameUpper.includes('BANNER OF DESERT WIND')) {
    categoryTag = 'Estandarte';
    summary = 'Sandstorm: enemigos que empiezan su activación a 24" o menos restan 1 a su Movement.';
  } else if (nameUpper.includes('GOLDEN CALF ALTAR')) {
    categoryTag = 'Desplegable';
    actionGranted = 'Place Altar ACTION';
    actionDescription = 'Despliega el altar a 1"; terreno a 3" del portador o del altar cuenta como difícil incluso para FLYING.';
    summary = 'Altar impasable que distorsiona el terreno circundante.';
  } else if (nameUpper.includes('ANQ GUARD')) {
    categoryTag = 'Desplegable';
    actionGranted = 'Combat Deployment ACTION';
    actionDescription = 'Risky Success Roll con +2 DICE: si tiene éxito despliega una barricada de cobertura impasable a 1".';
    summary = 'Pieza de cobertura impasable desplegable en combate.';
  } else if (nameUpper.includes('EXPLOSIVE CHARGES')) {
    categoryTag = 'Explosivo';
    traits.push('CONSUMABLE');
    summary = 'Hidden Explosives: detona un terreno seleccionado causando ataque con SHRAPNEL.';
  } else if (nameUpper.includes('SACRIFICIAL LAMB')) {
    categoryTag = 'Consumible';
    traits.push('CONSUMABLE');
    summary = 'Warded by Blood: al desplegar al portador, se ignora el primer Blood Marker recibido.';
  } else if (nameUpper.includes('HASHASHIN LEAF')) {
    categoryTag = 'Consumible';
    traits.push('CONSUMABLE');
    traits.push('STRONG');
    summary = 'Enhanced Strength: al desplegar, el portador gana STRONG durante toda la partida.';
  } else if (nameUpper.includes('ELIXIR OF AL-KHIDR')) {
    categoryTag = 'Consumible';
    traits.push('CONSUMABLE');
    traits.push('TOUGH');
    summary = 'Fountain of Life: al desplegar, el portador gana TOUGH durante toda la partida.';
  } else if (nameUpper.includes('HOLY SMOKE')) {
    categoryTag = 'Consumible';
    traits.push('CONSUMABLE');
    summary = 'Chemical Incense: al desplegar, concede NEGATE FEAR y -1 INJURY DICE a los ataques recibidos.';
  } else if (nameUpper.includes('HOLY WATER OF LALIBELA')) {
    categoryTag = 'Consumible';
    traits.push('CONSUMABLE');
    summary = 'Healing Waters: +1 DICE a la Success Roll de una ACTION para retirar Blood o Infection Markers.';
  } else if (nameUpper.includes('TABOT')) {
    categoryTag = 'Reliquia';
    summary = 'Virtuous Rewards: gana 1 Blessing Marker al retirar Blood o Infection Markers de aliados.';
  } else if (nameUpper.includes('URN OF THE BITTER ASHES')) {
    categoryTag = 'Reliquia';
    summary = 'Sinister Whispers: -1 DICE a los ataques a distancia contra el portador o aliados a 3" o menos.';
  } else if (nameUpper.includes('BROKEN CROWN')) {
    categoryTag = 'Reliquia';
    summary = 'Locus of Despair: al activarse, pone 1 Infection Marker a cada enemigo a 1" o menos.';
  } else if (nameUpper.includes('CUP OF FILTH')) {
    categoryTag = 'Reliquia';
    summary = 'Drink from the Cup: otorga +1 DICE a la Risky Success Roll de Dash al modelo o hasta 4 Ravenous.';
  } else if (nameUpper.includes('HELLBOUND SOUL CONTRACT')) {
    categoryTag = 'Pacto';
    summary = 'Contrato infernal con los poderes del Abismo.';
  } else if (nameUpper.includes('FIELD SHRINE')) {
    categoryTag = 'Desplegable';
    traits.push('DEPLOYABLE');
    summary = 'Santuario de campaña desplegable.';
  }

  // Deducciones generales si no hubo match específico
  if (!summary && item.description) {
    summary = item.description;
  }
  if (!summary && item.rules && Array.isArray(item.rules)) {
    summary = item.rules.map((r: any) => `${r.name}: ${r.desc}`).join(' · ');
  }

  return {
    actionGranted,
    actionDescription,
    categoryTag,
    traits: Array.from(new Set(traits)),
    summary
  };
}
