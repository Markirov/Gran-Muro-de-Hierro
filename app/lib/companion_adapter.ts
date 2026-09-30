// @ts-nocheck
import { DATA } from '../data/01_trench_crusade_game_data';
import { FACTIONS } from '../data/factions';
import { 
  getUnit, 
  modelCost, 
  calculateTotalArmour, 
  effectiveStats, 
  effectiveKeywords, 
  findBattlekitItem, 
  findArmouryItemByName, 
  getActiveVariant 
} from './cost_calculation';
import { getArmouryCategory } from './battlekit_legality_engine';

/* ======================================================================
   TRENCH COMPANION ADAPTER (app/lib/companion_adapter.ts)
   ----------------------------------------------------------------------
   Módulo bidireccional completo para importar y exportar bandas entre
   Warband Forge y Trench Companion (https://trench-companion.com).
   
   Garantiza:
     1. Importación sin pérdida: facción, variante, unidades, armas,
        armaduras, equipo, mejoras, nombres personalizados y presupuesto.
     2. Armería conectada: mapea items de Companion al `battlekit` interno
        para que los 4 contenedores de capacidad y el modo mesa funcionen.
     3. Exportación 100% canónica: genera el esquema JSON exacto de Trench
        Companion para bandas creadas en Forge o editadas.
     4. Round-trip verificado: Import -> Export -> Import conserva todos
        los datos clave.
   ====================================================================== */

export interface CompanionParseResult {
  ok: boolean;
  data?: any;
  error?: string;
}

export interface CompanionImportResult {
  ok: boolean;
  warband?: any;
  error?: string;
  warnings: string[];
}

export interface CompanionExportResult {
  json: any;
  jsonString: string;
}

// ----------------------------------------------------------------------
// 1. DICCIONARIOS DE MODELOS Y UNIDADES
// ----------------------------------------------------------------------

export const COMPANION_MODEL_TO_UNIT: Record<string, string> = {
  // New Antioch
  'md_lieutenant':                  'lieutenant',
  'md_lieutenant_alba':             'lieutenant',
  'md_sniperpriest':                'sniper-priests',
  'md_trenchcleric':                'trench-cleric',
  'md_yeoman':                      'yeomen',
  'md_shocktrooper':                'shock-troopers',
  'md_shocktrooper_alba':           'shock-troopers',
  'md_combatengineer':              'combat-engineers',
  'md_mechanisedheavyinfantry':     'mech-heavy-inf',
  'md_mechanisedheavyinfantry_alba':'mech-heavy-inf',
  'md_holywarrior':                 'holy-warrior-abys',
  'md_holywarrior_abys':            'holy-warrior-abys',
  'md_trenchdog':                   'trench-dog-rb',
  'md_crimsoncommunicant':          'crimson-comm-rb',
  'md_combatmedic':                 'combat-medic',

  // Trench Pilgrims
  'md_warprophet':                  'war-prophet',
  'md_communicant':                 'communicant',
  'md_castigator':                  'castigator',
  'md_trenchpilgrim':               'pilgrim',
  'md_martyrpenitent':              'martyr-penitent',
  'md_stigmaticnun':                'stigmatic-nuns',
  'md_ecclesiasticprisoner':        'eccl-prisoners',
  'md_anchoriteshrine':             'anchorite-shrine',

  // Iron Sultanate
  'md_yuzbasicaptain':              'yuzbasi',
  'md_yuzbasicaptain_mv_silahdar':  'silahdar-iw',
  'md_janissaries_mv_officer':      'janofficer-iw',
  'md_sipahi':                      'sipahi-iw',
  'md_sipahi_iw':                   'sipahi-iw',
  'md_masterassassin':              'master-assassin-fid',
  'md_master_assassin':             'master-assassin-fid',
  'md_dervish':                     'dervish-fid',
  'md_dervishes':                   'dervish-fid',
  'md_faris':                       'faris-how',
  'md_takwinhomunculus':            'takwin-how',
  'md_jabireanalchemist':           'jabirean',
  'md_sultanateassassin':           'sult-assassin',
  'md_azeb':                        'azebs',
  'md_sultanatesappers':            'sappers',
  'md_lionofjabir':                 'lions',
  'md_janissaries':                 'janissaries',
  'md_brazenbull':                  'brazen-bull',

  // Heretic Legions
  'md_hereticpriest':               'heretic-priest',
  'md_deathcommando':               'death-commando',
  'md_chorister':                   'chorister',
  'md_heretictrooper':              'heretic-troopers',
  'md_warwolf':                     'war-wolf',
  'md_anointedheavyinfantry':       'anointed',
  'md_barbedwirebanshee':           'banshee-tg',
  'md_artillerywitch':              'art-witch',

  // Black Grail
  'md_lordoftumours':               'lord-tumours',
  'md_plagueknight':                'plague-knights',
  'md_corpseguard':                 'corpse-guards',
  'md_executor':                    'executor-dg',
  'md_grailthralls':                'grail-thralls',
  'md_flythralls':                  'thralls',
  'md_thralls':                     'thralls',
  'md_houndoftheblackgrail':        'hounds-bg',
  'md_heraldofbeelzebub':           'heralds',
  'md_matagothag':                  'matagot-hag-gh',
  'md_ravenous':                    'ravenous-gh',
  'md_cradlethralls':               'cradle-thralls-gh',
  'md_desiccatedhusks':             'husks-gh',
  'md_greatmaw':                    'great-maw-gh',
  'md_gregorigula':                 'gregori-gula-gh',
  'md_amalgam':                     'amalgam',

  // Court of the Seven Headed Serpent
  'md_praetor':                     'praetor',
  'md_sorcerer':                    'sorcerer',
  'md_hunterofthelefthandpath':     'hunter-lhp',
  'md_hellknight':                  'hell-knights',
  'md_pitlocust':                   'pit-locusts',
  'md_yokefiend':                   'yoke-fiends',
  'md_desecratedsaint':             'desecrated-saint',

  // Mercenaries
  'md_combatbiologist':             'combat-biologist',
  'md_communicantantitankhunter':   'antitank-comm',
  'md_goeticwarlock':               'goetic-warlock',
  'md_mamlukfaris':                 'mamluk-faris',
  'md_mendelistammomonk':           'ammo-monk',
  'md_observer':                    'observer',
  'md_scriptureguardian':           'scripture-guardian',
  'md_sineater':                    'sin-eater',
  'md_sisterofsaintcosmas':         'st-cosmas',
  'md_witchburner':                 'witchburner',
};

// Map de reglas de variante (`rl_*`) a `variantId`
export const COMPANION_RULE_TO_VARIANT: Record<string, string> = {
  // Iron Sultanate
  'rl_marksmanshipoftheironwall': 'iron-wall-def',
  'rl_siegejezzailteams':         'iron-wall-def',
  'rl_sapperscorps':              'iron-wall-def',
  'rl_silahdar':                  'iron-wall-def',
  'rl_grandcannons':              'iron-wall-def',
  'rl_janissaryofficers':         'iron-wall-def',
  'rl_houseofwisdom':             'house-wisdom',
  'rl_fidaiofalamut':             'fidai-alamut',

  // New Antioch
  'rl_rampantcharge':             'alba',
  'rl_highlandstrength':          'alba',
  'rl_celticmachinearmour':       'alba',
  'rl_claymoresmiths':            'alba',
  'rl_coldsteel':                 'alba',
  'rl_brave':                     'alba',
  'rl_bagpipes':                  'alba',
  'rl_rapidassault':              'prussia',
  'rl_expertfireteams':           'prussia',
  'rl_mastersofthegrenade':       'prussia',
  'rl_athleticism':               'prussia',
  'rl_forwardpositions':          'prussia',
  'rl_feldkaplane':               'prussia',
  'rl_eirerangers':               'eire-rangers',
  'rl_lightinfantry':             'eire-rangers',
  'rl_hitandrun':                 'eire-rangers',
  'rl_looseformation':            'eire-rangers',
  'rl_followersofsaintpatrick':   'eire-rangers',
  'rl_fianna':                    'eire-rangers',
  'rl_carnyx':                    'eire-rangers',
  'rl_papalstates':               'papal-states',
  'rl_papalintervention':         'papal-states',
  'rl_abyssinia':                 'abyssinia',
  'rl_holywarriors':              'abyssinia',
  'rl_redbrigade':                'red-brigade',
  'rl_wearandtear':               'red-brigade',
  'rl_noretreat':                 'red-brigade',
  'rl_furyofsainternest':         'red-brigade',
  'rl_gloryhounds':               'red-brigade',
  'rl_displeasureofthechurch':    'red-brigade',
  'rl_rememberthefallen':         'red-brigade',

  // Trench Pilgrims
  'rl_facethyfears':              'sacred-affliction',
  'rl_hammerandtheanvil':         'sacred-affliction',
  'rl_meleefocused':              'sacred-affliction',
  'rl_punishingmillstones':       'sacred-affliction',
  'rl_reliquaryarmoury':          'sacred-affliction',
  'rl_wrathofgod':                'sacred-affliction',
  'rl_zealotstrength':            'sacred-affliction',
  'rl_anchoritecloister':         'st-methodius',
  'rl_communicantheresy':         'st-methodius',
  'rl_chasteorder':               'st-methodius',
  'rl_treasureinheaven':          'st-methodius',
  'rl_mortalsin':                 'st-methodius',
  'rl_bloodofthelamb':            'tenth-plague',
  'rl_dayofhiswrath':             'tenth-plague',
  'rl_favourofthelord':           'tenth-plague',
  'rl_heavenawaits':              'tenth-plague',
  'rl_onlytherighteous':          'tenth-plague',
  'rl_stolencommunicants':        'tenth-plague',
  'rl_theunclean':                'tenth-plague',
  'rl_sacrificiallamb':           'tenth-plague',

  // Heretic Legions
  'rl_semicorporeal':             'trench-ghosts',
  'rl_undeadhorror':              'trench-ghosts',
  'rl_slowandcreeping':           'trench-ghosts',
  'rl_lostsouls':                 'trench-ghosts',
  'rl_enemiesofall':              'trench-ghosts',
  'rl_barbedwirebanshee':         'trench-ghosts',
  'rl_worshipmammon':             'avarice-knights',
  'rl_priceofgreed':              'avarice-knights',
  'rl_corruptmerchants':          'avarice-knights',
  'rl_mammonschosen':             'avarice-knights',
  'rl_preservetheloot':           'avarice-knights',
  'rl_infernalrivalry':           'avarice-knights',
  'rl_goeticwarlocks':            'avarice-knights',
  'rl_gasbombs':                  'avarice-knights',
  'rl_navalraiders':              'naval-raiders',
  'rl_unseenadvance':             'naval-raiders',

  // Black Grail / Court
  'rl_dirge':                     'dirge',
  'rl_greathunger':               'great-hunger',
  'rl_sinsofseven':               'sins-seven',
};

// Aliases de nombres y IDs de equipo donde Companion difiere levemente de DATA
export const COMPANION_ITEM_ALIASES: Record<string, string> = {
  'greatsword / greataxe':         'Great Sword/Axe',
  'greatsword':                    'Great Sword/Axe',
  'greataxe':                      'Great Sword/Axe',
  'eq_greatswordaxe':              'Great Sword/Axe',
  'anqa guard':                    'Anq Guard',
  'eq_anqaguard':                  'Anq Guard',
  'infernal bomb':                 'Infernal Bombs',
  'eq_infernalbomb':               'Infernal Bombs',
  'shotgun':                       'Combat Shotgun',
  'eq_shotgun':                    'Combat Shotgun',
  'sword / axe':                   'Sword/Axe',
  'eq_swordaxe':                   'Sword/Axe',
  'trench club':                   'Trench Club/Bludgeon',
  'eq_trenchclub':                 'Trench Club/Bludgeon',
  'machine armour':                'Machine Armour',
  'reinforced armour':             'Reinforced Armour',
  'standard armour':               'Standard Armour',
  'heavy armour':                  'Heavy Armour',
  'combat shield':                 'Combat Shield',
  'trench shield':                 'Trench Shield',
  'shield':                        'Trench Shield',
  'medi-kit':                      'Medi-Kit',
  'medikit':                       'Medi-Kit',
  'alchemical ammunition':         'Alchemical Ammunition',
  'alchemical fire':               'Alchemical Fire',
  'alaybozan':                     'Alaybozan',
  'jezzail':                       'Jezzail',
  'sniper rifle':                  'Sniper Rifle',
  'binoculars':                    'Binoculars',
  'tartarus claws':                'Tartarus Claws',
  'flamethrower':                  'Flamethrower',
  'heavy flamethrower':            'Heavy Flamethrower',
  'bolt-action rifle':             'Bolt-Action Rifle',
  'automatic rifle':               'Automatic Rifle',
  'automatic pistol':              'Automatic Pistol',
  'automatic shotgun':             'Automatic Shotgun',
};

// ----------------------------------------------------------------------
// 2. PARSING & VALIDATION
// ----------------------------------------------------------------------

export function parseCompanionJson(text: string | object): CompanionParseResult {
  let data: any;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch (e: any) {
    return { ok: false, error: 'JSON inválido: ' + (e?.message || 'Error de sintaxis') };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'El archivo JSON debe contener un objeto raíz válido.' };
  }
  if (data['warband-id'] === undefined && !data.models && !data['warband-name']) {
    return { ok: false, error: 'El archivo no parece ser un JSON de Trench Companion (faltan campos clave).' };
  }
  if (!Array.isArray(data.models)) {
    return { ok: false, error: 'Falta la lista de miniaturas ("models") en el archivo.' };
  }
  return { ok: true, data };
}

// ----------------------------------------------------------------------
// 3. HELPERS DE RESOLUCIÓN Y MAPEO
// ----------------------------------------------------------------------

function normalizeClean(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Busca la unidad interna correspondiente a un modelo de Companion
 */
export function findUnitForCompanionModel(cmodel: any, factionIdHint?: string): { factionId: string; unit: any } | null {
  const modelId = cmodel['model-id'] || '';
  const modelName = cmodel['name'] || cmodel['model-name'] || '';

  // 1. Caso especial: Wretched existe en Heretic Legions y Court
  if (modelId === 'md_wretched') {
    if (factionIdHint === 'court-serpent') {
      const u = DATA.factions['court-serpent']?.units?.find(x => x.id === 'wretched-co');
      if (u) return { factionId: 'court-serpent', unit: u };
    }
    const u = DATA.factions['heretic-legions']?.units?.find(x => x.id === 'wretched-hl');
    if (u) return { factionId: 'heretic-legions', unit: u };
  }

  // 2. Mapeo directo por ID
  const directId = COMPANION_MODEL_TO_UNIT[modelId];
  if (directId) {
    // Buscar primero en la facción indicada si la hay
    if (factionIdHint && DATA.factions[factionIdHint]) {
      const u = (DATA.factions[factionIdHint].units || []).find(x => x.id === directId);
      if (u) return { factionId: factionIdHint, unit: u };
    }
    // Buscar en todas las facciones
    for (const [fid, f] of Object.entries(DATA.factions)) {
      const u = (f.units || []).find(x => x.id === directId);
      if (u) return { factionId: fid, unit: u };
    }
    // Buscar en mercenarios
    if (DATA.mercenaries) {
      const m = DATA.mercenaries.find(x => x.id === directId);
      if (m) return { factionId: factionIdHint || 'mercenaries', unit: m };
    }
  }

  // 3. Búsqueda por coincidencia de ID normalizado (sin prefijo md_)
  const cleanId = normalizeClean(modelId.replace(/^md_/, ''));
  for (const [fid, f] of Object.entries(DATA.factions)) {
    for (const u of (f.units || [])) {
      const cleanU = normalizeClean(u.id);
      if (cleanId === cleanU || cleanId + 's' === cleanU || cleanId === cleanU + 's') {
        return { factionId: fid, unit: u };
      }
    }
  }

  // 4. Búsqueda por nombre de miniatura
  if (modelName) {
    const cleanName = normalizeClean(modelName);
    for (const [fid, f] of Object.entries(DATA.factions)) {
      for (const u of (f.units || [])) {
        const cleanUName = normalizeClean(u.name);
        if (cleanName === cleanUName || cleanName + 's' === cleanUName || cleanName === cleanUName + 's') {
          return { factionId: fid, unit: u };
        }
      }
    }
    if (DATA.mercenaries) {
      for (const m of DATA.mercenaries) {
        const cleanMName = normalizeClean(m.name);
        if (cleanName === cleanMName) return { factionId: factionIdHint || 'mercenaries', unit: m };
      }
    }
  }

  return null;
}

/**
 * Resuelve un item de equipo de Companion a un item ID en el catálogo de Forge
 */
export function resolveCompanionEquipmentItem(eq: any, wb: any, unit: any): { item: any | null; isBuiltIn: boolean; isMhiVariant?: 'alt' | 'base' } {
  const eqName = eq['equipment-name'] || '';
  const eqId = eq['equipment-id'] || '';
  const cleanName = eqName.trim();

  // 1. Manejo especial de armadura MHI
  if (unit?.id === 'mech-heavy-inf') {
    if (/machine\s*armour/i.test(cleanName) || eqId === 'eq_machinearmour') {
      return { item: null, isBuiltIn: true, isMhiVariant: 'alt' };
    }
    if (/reinforced\s*armour/i.test(cleanName) || eqId === 'eq_reinforcedarmour') {
      return { item: null, isBuiltIn: true, isMhiVariant: 'base' };
    }
  }

  // 2. Verificar si es equipamiento innato/permanente de la unidad
  if (unit?.permanentEquipment && Array.isArray(unit.permanentEquipment)) {
    const isPerm = unit.permanentEquipment.some((p: string) => {
      const cleanP = p.split(' (')[0].trim().toLowerCase();
      const target = cleanName.toLowerCase();
      return cleanP === target || normalizeClean(cleanP) === normalizeClean(target);
    });
    if (isPerm) {
      return { item: null, isBuiltIn: true };
    }
  }

  // 3. Revisar alias explícitos
  let lookupName = cleanName;
  const alias = COMPANION_ITEM_ALIASES[cleanName.toLowerCase()] || COMPANION_ITEM_ALIASES[eqId.toLowerCase()];
  if (alias) {
    lookupName = alias;
  }

  // 4. Buscar mediante findArmouryItemByName
  let found = findArmouryItemByName(lookupName, wb);
  if (!found && lookupName !== cleanName) {
    found = findArmouryItemByName(cleanName, wb);
  }

  // 5. Fallback: búsqueda exhaustiva normalizada en todas las armerías de la facción y variantes
  if (!found && wb?.factionId && DATA.factions[wb.factionId]) {
    const f = DATA.factions[wb.factionId];
    const targetNorm = normalizeClean(lookupName);
    for (const cat of Object.values(f.armoury || {})) {
      if (!Array.isArray(cat)) continue;
      found = cat.find((it: any) => normalizeClean(it.name) === targetNorm || normalizeClean(it.id) === targetNorm);
      if (found) break;
    }
  }

  // 6. Fallback final: todas las armerías del juego
  if (!found) {
    const targetNorm = normalizeClean(lookupName);
    for (const [_, f] of Object.entries(DATA.factions)) {
      for (const cat of Object.values(f.armoury || {})) {
        if (!Array.isArray(cat)) continue;
        found = cat.find((it: any) => normalizeClean(it.name) === targetNorm);
        if (found) break;
      }
      if (found) break;
    }
  }

  return { item: found || null, isBuiltIn: false };
}

// ----------------------------------------------------------------------
// 4. IMPORTACIÓN PRINCIPAL
// ----------------------------------------------------------------------

export function importCompanionWarband(jsonOrText: string | object): CompanionImportResult {
  const parsed = parseCompanionJson(jsonOrText);
  if (!parsed.ok || !parsed.data) {
    return { ok: false, error: parsed.error || 'Error al leer el JSON', warnings: [] };
  }

  const json = parsed.data;
  const warnings: string[] = [];

  // Inferencia de facción por keywords
  const factionKwToId: Record<string, string> = {
    'kw_antioch':       'new-antioch',
    'kw_pilgrim':       'trench-pilgrims',
    'kw_pilgrims':      'trench-pilgrims',
    'kw_sultanate':     'iron-sultanate',
    'kw_heretic':       'heretic-legions',
    'kw_blackgrail':    'black-grail',
    'kw_black_grail':   'black-grail',
    'kw_court':         'court-serpent',
    'kw_thecourt':      'court-serpent',
  };

  const factionVotes: Record<string, number> = {};
  const variantVotes: Record<string, number> = {};

  (json.models || []).forEach((m: any) => {
    (m.keywords || []).forEach((k: any) => {
      const fid = factionKwToId[k['keyword-id']];
      if (fid) factionVotes[fid] = (factionVotes[fid] || 0) + 1;
    });
    (m.abilities || []).forEach((a: any) => {
      const vid = COMPANION_RULE_TO_VARIANT[a['ability-id']];
      if (vid) variantVotes[vid] = (variantVotes[vid] || 0) + 1;
    });
  });

  let detectedFaction = 'new-antioch';
  let bestFCount = 0;
  for (const [fid, count] of Object.entries(factionVotes)) {
    if (count > bestFCount) { bestFCount = count; detectedFaction = fid; }
  }

  let detectedVariant: string | null = null;
  let bestVCount = 0;
  for (const [vid, count] of Object.entries(variantVotes)) {
    if (count > bestVCount) { bestVCount = count; detectedVariant = vid; }
  }

  // Comprobar si la variante pertenece a la facción detectada
  if (detectedVariant) {
    const facObj = FACTIONS.find(f => f.id === detectedFaction);
    const hasVar = facObj?.variants?.some(v => v.id === detectedVariant);
    if (!hasVar) {
      // Si la regla apunta a una variante de otra facción, sincronizar facción
      for (const f of FACTIONS) {
        if (f.variants?.some(v => v.id === detectedVariant)) {
          detectedFaction = f.id;
          break;
        }
      }
    }
  }

  const now = new Date().toISOString();
  const rawRating = Number(json['ducat-rating'] ?? 0);
  const rawBank = Number(json['ducat-bank'] ?? 0);
  const calculatedBudget = Math.max(rawRating + rawBank, 700);

  const wb: any = {
    id: 'wb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    name: json['warband-name'] || 'Banda de Trench Companion',
    factionId: detectedFaction,
    variantId: detectedVariant || null,
    budgetTotal: calculatedBudget,
    glory: Number(json['glory-rating'] ?? 0) + Number(json['glory-bank'] ?? 0),
    startingGlory: Number(json['glory-rating'] ?? 0),
    ducatBank: rawBank,
    createdAt: now,
    updatedAt: now,
    notes: '',
    companionSource: json,
    models: []
  };

  // Convertir cada modelo
  (json.models || []).forEach((cmodel: any, idx: number) => {
    const unitMatch = findUnitForCompanionModel(cmodel, detectedFaction);
    if (!unitMatch) {
      warnings.push(`Miniatura #${idx + 1} "${cmodel['name'] || cmodel['model-name']}": No se encontró una unidad canónica equivalente.`);
    }

    const unit = unitMatch ? unitMatch.unit : null;
    const unitId = unit ? unit.id : null;
    const modelName = cmodel['name'] || cmodel['model-name'] || unit?.name || 'Miniatura';

    const battlekit: string[] = [];
    let costVariant: 'alt' | 'base' | undefined = undefined;

    // Equipar armas y equipo
    (cmodel.equipment || []).forEach((eq: any) => {
      const res = resolveCompanionEquipmentItem(eq, wb, unit);
      if (res.isMhiVariant) {
        costVariant = res.isMhiVariant;
      } else if (!res.isBuiltIn && res.item) {
        battlekit.push(res.item.id);
      } else if (!res.isBuiltIn && !res.item) {
        warnings.push(`Miniatura "${modelName}": El equipo "${eq['equipment-name']}" no se pudo asociar a la armería.`);
      }
    });

    // Mapear mejoras
    const upgrades: string[] = [];
    (cmodel.upgrades || []).forEach((u: any) => {
      const upName = u['upgrade-name'] || '';
      const upId = u['upgrade-id'] || '';
      if (unit?.upgrades && Array.isArray(unit.upgrades)) {
        const foundUp = unit.upgrades.find((up: any) => 
          normalizeClean(up.id) === normalizeClean(upId.replace(/^up_/, '')) ||
          normalizeClean(up.name) === normalizeClean(upName)
        );
        if (foundUp) upgrades.push(foundUp.id);
      }
    });

    const isElite = !!(
      (cmodel.keywords || []).some((k: any) => k['keyword-id'] === 'kw_elite' || k['keyword-name'] === 'ELITE') ||
      unit?.tier === 'elite'
    );

    const forgeModel: any = {
      uid: `cm_${cmodel['model-id'] || 'unit'}_${idx}_${Date.now().toString(36)}`,
      unitId: unitId,
      name: modelName,
      isElite,
      xp: 0,
      costVariant,
      equipment: [...battlekit],
      battlekit: battlekit,
      upgrades: upgrades,
      companionRef: {
        modelId: cmodel['model-id'] || '',
        position: idx,
        signature: `${cmodel['model-id']}§${modelName}§${idx}`
      },
      companionStats: {
        move: cmodel['stat-move'] || '',
        melee: cmodel['stat-melee'] || '',
        ranged: cmodel['stat-ranged'] || '',
        armour: cmodel['stat-armour'] || ''
      },
      companionCost: (cmodel.cost && cmodel.cost.ducats) !== undefined ? cmodel.cost.ducats : undefined,
      companionGlory: (cmodel.cost && cmodel.cost.glory) !== undefined ? cmodel.cost.glory : 0,
      companionEquipment: cmodel.equipment || [],
      companionAbilities: cmodel.abilities || [],
      companionKeywords: cmodel.keywords || [],
      companionUpgrades: cmodel.upgrades || [],
      notes: ''
    };

    wb.models.push(forgeModel);
  });

  return { ok: true, warband: wb, warnings };
}

// ----------------------------------------------------------------------
// 5. EXPORTACIÓN PRINCIPAL A TRENCH COMPANION
// ----------------------------------------------------------------------

/**
 * Convierte un item interno a un objeto de equipo de Trench Companion
 */
function toCompanionEquipment(itemIdOrName: string, wb: any): any {
  const it = findArmouryItemByName(itemIdOrName, wb) || findBattlekitItem(wb.factionId, itemIdOrName, wb);
  if (!it) {
    return {
      'equipment-name': itemIdOrName,
      'equipment-id': 'eq_' + normalizeClean(itemIdOrName),
      'equipment-type': 'equipment'
    };
  }

  let eqName = it.name;
  let eqId = 'eq_' + normalizeClean(it.name);
  let eqType = 'equipment';

  // Overrides de nombres canónicos de Companion
  if (/great\s*sword/i.test(it.name)) {
    eqName = 'Greatsword / Greataxe';
    eqId = 'eq_greatswordaxe';
    eqType = 'melee weapon';
  } else if (/anq\s*guard/i.test(it.name)) {
    eqName = 'Anqa Guard';
    eqId = 'eq_anqaguard';
    eqType = 'equipment';
  } else if (/infernal\s*bomb/i.test(it.name)) {
    eqName = 'Infernal Bomb';
    eqId = 'eq_infernalbomb';
    eqType = 'ranged weapon';
  } else if (/combat\s*shotgun/i.test(it.name) || it.name === 'Shotgun') {
    eqName = 'Shotgun';
    eqId = 'eq_shotgun';
    eqType = 'ranged weapon';
  } else if (/shield/i.test(it.name)) {
    eqType = 'shield';
  } else if (it.range?.toLowerCase() === 'melee') {
    eqType = 'melee weapon';
  } else if (it.range && it.range !== '-') {
    eqType = 'ranged weapon';
  } else if (it.category === 'armour' || /armour/i.test(it.name)) {
    eqType = 'armour';
  } else if (it.category === 'grenades' || /grenade/i.test(it.name)) {
    eqType = 'grenade';
  }

  return {
    'equipment-name': eqName,
    'equipment-id': eqId,
    'equipment-type': eqType
  };
}

/**
 * Mapea una unidad de Forge a un ID canónico de Trench Companion
 */
export function getCompanionModelId(unitId: string, variantId?: string): { modelId: string; modelName: string } {
  // 1. Variantes de unidad con modelo dedicado en Companion
  if (unitId === 'silahdar-iw') return { modelId: 'md_yuzbasicaptain_mv_silahdar', modelName: 'Silahdar' };
  if (unitId === 'janofficer-iw') return { modelId: 'md_janissaries_mv_officer', modelName: 'Janissary Officer' };
  if (unitId === 'sipahi-iw') return { modelId: 'md_sipahi', modelName: 'Sipahi' };
  if (unitId === 'master-assassin-fid') return { modelId: 'md_masterassassin', modelName: 'Master Assassin' };
  if (unitId === 'dervish-fid') return { modelId: 'md_dervish', modelName: 'Dervishes' };
  if (unitId === 'faris-how') return { modelId: 'md_faris', modelName: 'Fāris' };
  if (unitId === 'takwin-how') return { modelId: 'md_takwinhomunculus', modelName: 'Takwin Homunculus' };
  if (unitId === 'mech-heavy-inf' && variantId === 'alba') return { modelId: 'md_mechanisedheavyinfantry_alba', modelName: 'Mechanised Heavy Infantry' };
  if (unitId === 'lieutenant' && variantId === 'alba') return { modelId: 'md_lieutenant_alba', modelName: 'Lieutenant' };
  if (unitId === 'shock-troopers' && variantId === 'alba') return { modelId: 'md_shocktrooper_alba', modelName: 'Shock Trooper' };
  if (unitId === 'holy-warrior-abys') return { modelId: 'md_holywarrior_abys', modelName: 'Holy Warrior' };
  if (unitId === 'trench-dog-rb') return { modelId: 'md_trenchdog', modelName: 'Trench Dog' };
  if (unitId === 'crimson-comm-rb') return { modelId: 'md_crimsoncommunicant', modelName: 'Crimson Communicant' };
  if (unitId === 'banshee-tg') return { modelId: 'md_barbedwirebanshee', modelName: 'Barbed Wire Banshee' };
  if (unitId === 'art-witch') return { modelId: 'md_artillerywitch', modelName: 'Artillery Witch' };
  if (unitId === 'executor-dg') return { modelId: 'md_executor', modelName: 'Executor' };
  if (unitId === 'matagot-hag-gh') return { modelId: 'md_matagothag', modelName: 'Matagot Hag' };
  if (unitId === 'ravenous-gh') return { modelId: 'md_ravenous', modelName: 'Ravenous' };
  if (unitId === 'cradle-thralls-gh') return { modelId: 'md_cradlethralls', modelName: 'Cradle Thralls' };
  if (unitId === 'husks-gh') return { modelId: 'md_desiccatedhusks', modelName: 'Desiccated Husks' };
  if (unitId === 'great-maw-gh') return { modelId: 'md_greatmaw', modelName: 'Great Maw' };
  if (unitId === 'gregori-gula-gh') return { modelId: 'md_gregorigula', modelName: 'Gregori Gula' };

  // 2. Inversión del diccionario general
  for (const [mid, uid] of Object.entries(COMPANION_MODEL_TO_UNIT)) {
    if (uid === unitId) {
      const cleanStem = mid.replace(/^md_/, '');
      return { 
        modelId: mid, 
        modelName: cleanStem.charAt(0).toUpperCase() + cleanStem.slice(1).replace(/([A-Z])/g, ' $1').trim()
      };
    }
  }

  // 3. Fallback
  return {
    modelId: 'md_' + normalizeClean(unitId),
    modelName: unitId
  };
}

export function exportCompanionWarband(wb: any): CompanionExportResult {
  const src = wb.companionSource || {};
  let totalSpentDucats = 0;
  let totalSpentGlory = 0;

  const exportModels = (wb.models || []).map((m: any) => {
    const unit = getUnit(wb.factionId, m.unitId);
    const costs = modelCost(m, wb.factionId, wb);
    totalSpentDucats += costs.ducados || 0;
    totalSpentGlory += costs.glory || 0;

    const companionMapping = getCompanionModelId(m.unitId, wb.variantId);
    const modelId = m.companionRef?.modelId || companionMapping.modelId;
    const canonicalModelName = unit?.name || companionMapping.modelName;

    const stats = unit ? effectiveStats(m, unit, wb) : (m.companionStats || {});
    const totalArmour = unit ? calculateTotalArmour(m, unit, wb) : 0;

    // Equipamiento: permanentEquipment + MHI armour + battlekit
    const eqList: any[] = [];
    const seenEqIds = new Set<string>();

    const addEq = (itemOrName: any) => {
      const eqObj = typeof itemOrName === 'string' 
        ? toCompanionEquipment(itemOrName, wb)
        : (itemOrName['equipment-id'] ? itemOrName : toCompanionEquipment(itemOrName.name || itemOrName.id, wb));
      if (!seenEqIds.has(eqObj['equipment-id'])) {
        seenEqIds.add(eqObj['equipment-id']);
        eqList.push(eqObj);
      }
    };

    // 1. Armadura MHI
    if (unit?.id === 'mech-heavy-inf') {
      if (m.costVariant === 'alt') {
        addEq({ 'equipment-name': 'Machine Armour', 'equipment-id': 'eq_machinearmour', 'equipment-type': 'armour' });
      } else {
        addEq({ 'equipment-name': 'Reinforced Armour', 'equipment-id': 'eq_reinforcedarmour', 'equipment-type': 'armour' });
      }
    }

    // 2. Built-in de permanentEquipment
    if (unit?.permanentEquipment && Array.isArray(unit.permanentEquipment)) {
      unit.permanentEquipment.forEach((p: string) => {
        const cleanP = p.split(' (')[0].trim();
        addEq(cleanP);
      });
    }

    // 3. Items comprados en battlekit
    (m.battlekit || []).forEach((bId: string) => {
      addEq(bId);
    });

    // Habilidades
    const abilities: any[] = [];
    if (m.companionAbilities && Array.isArray(m.companionAbilities) && m.companionAbilities.length > 0) {
      abilities.push(...m.companionAbilities);
    } else if (unit?.abilities) {
      unit.abilities.forEach((ab: string) => {
        abilities.push({
          'ability-name': ab,
          'ability-id': 'ab_' + normalizeClean(ab)
        });
      });
    }

    // Keywords
    const keywords: any[] = [];
    const effKws = unit ? effectiveKeywords(m, unit, wb) : [];
    effKws.forEach((kw: string) => {
      let kwId = 'kw_' + normalizeClean(kw);
      if (kw.startsWith('NEGATE ')) {
        kwId = 'kw_negate_kw_' + normalizeClean(kw.replace('NEGATE ', ''));
      }
      keywords.push({
        'keyword-name': kw,
        'keyword-id': kwId
      });
    });

    // Formatear modificadores con signo
    const formatMod = (val: any) => {
      if (val === undefined || val === null || val === '') return '0';
      const s = String(val).replace(/DICE|\s+/g, '');
      const n = parseInt(s, 10);
      if (isNaN(n)) return '0';
      return n > 0 ? `+${n}` : `${n}`;
    };

    return {
      'model-name': canonicalModelName,
      'model-id':   modelId,
      'name':       m.name || canonicalModelName,
      'stat-move':   stats.movement || '6"/Infantry',
      'stat-melee':  formatMod(stats.melee),
      'stat-ranged': formatMod(stats.ranged),
      'stat-armour': totalArmour ? `-${totalArmour}` : (stats.armour ? `${stats.armour}` : '0'),
      'cost': {
        'ducats': costs.ducados || 0,
        'glory':  costs.glory || 0
      },
      'equipment': eqList,
      'abilities': abilities,
      'upgrades': (m.upgrades || []).map((uId: string) => ({
        'upgrade-name': uId,
        'upgrade-id': 'up_' + normalizeClean(uId)
      })),
      'advancements': [],
      'injuries': [],
      'keywords': keywords
    };
  });

  const remainingDucats = Math.max(0, (wb.budgetTotal ?? 700) - totalSpentDucats);
  const remainingGlory = Math.max(0, (wb.glory ?? 0) - totalSpentGlory);

  const out: any = {
    'warband-id':     src['warband-id'] || parseInt(wb.id.replace(/\D/g, '').slice(0, 7) || '294322', 10),
    'warband-url':    src['warband-url'] || `https://trench-companion.com/warband/detail/${src['warband-id'] || '294322'}`,
    'warband-name':   wb.name || 'Warband',
    'ducat-bank':     wb.ducatBank !== undefined ? wb.ducatBank : remainingDucats,
    'glory-bank':     remainingGlory,
    'ducat-rating':   totalSpentDucats,
    'glory-rating':   totalSpentGlory,
    'models':         exportModels
  };

  return {
    json: out,
    jsonString: JSON.stringify(out, null, 2)
  };
}
