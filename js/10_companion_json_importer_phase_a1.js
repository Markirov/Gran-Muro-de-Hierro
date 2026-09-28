/* ======================================================================
   COMPANION JSON IMPORTER (Phase A1)
   ----------------------------------------------------------------------
   Warband Forge no es un builder. La construcción de bandas se hace en
   Trench Companion (https://trench-companion.com), el builder oficial.
   Forge se dedica a:
     - Importar bandas desde JSONs de Companion
     - Trackear progression de campaña (XP, advancements, traumas, scars)
     - Permitir personalizaciones (house rules, escenarios homebrew)
     - Re-exportar a Companion sin pérdida (round-trip)

   El catálogo canónico nativo (DATA.factions) se sigue manteniendo, pero
   ahora SOLO sirve para enriquecer la UI (tooltips, glosario PDF, simulador
   del Lab). NO se usa para validar composición — Companion ya lo hace.

   El "Plan C" (merge inteligente): cuando el usuario re-importa una banda
   ya en Forge tras editarla en Companion, conservamos la progression de
   los modelos que sigan presentes (matched por companionRef), añadimos los
   nuevos sin progression, y archivamos los eliminados en archivedModels.
   ====================================================================== */

/**
 * Parses and validates a Companion JSON.
 * @param {string} text  raw JSON text
 * @returns {{ok:true, data:Object} | {ok:false, error:string}}
 */
function parseCompanionJson(text) {
  let data;
  try {
    data = (typeof text === 'string') ? JSON.parse(text) : text;
  } catch (e) {
    return { ok: false, error: 'JSON inválido: ' + e.message };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'JSON debe ser un objeto raíz' };
  }
  if (typeof data['warband-id'] !== 'string' && typeof data['warband-id'] !== 'number') {
    return { ok: false, error: 'Falta campo "warband-id" — re-exporta desde Trench Companion' };
  }
  if (typeof data['warband-name'] !== 'string') {
    return { ok: false, error: 'Falta campo "warband-name"' };
  }
  if (!Array.isArray(data.models)) {
    return { ok: false, error: 'Falta campo "models" (debe ser array)' };
  }
  return { ok: true, data };
}

/**
 * Re-importa una banda desde un JSON nuevo de Companion, preservando
 * estado local. Sub-Fase 11.5 PIVOT v2 — opts permite descartar
 * campos selectivamente (decisión 5 del doc: "Pregunta antes qué
 * conservar"). Default = preserva todo (back-compat con Fase 9-A).
 *
 * @param {Object} wb       banda existente (con id estable)
 * @param {Object|string} newJson  JSON parseado o string a parsear
 * @param {Object} [opts]   { experimentalVariants:bool, shoppingList:bool,
 *                            freeBattles:bool, campaignIds:bool,
 *                            discoveredLocations:bool }
 *                          undefined o key undefined = true (preserva).
 *                          false explícito = resetea ese campo a [].
 * @returns {{ok:true} | {ok:false, error:string}}
 */
function refreshCompanionWarband(wb, newJson, opts) {
  if (!wb || typeof wb !== 'object') {
    return { ok: false, error: 'wb requerido' };
  }
  const parsed = parseCompanionJson(newJson);
  if (!parsed.ok) return parsed;

  // Helper — opt undefined o true ⇒ preserva, false explícito ⇒ resetea.
  const keep = (k) => !opts || opts[k] !== false;

  // Snapshot estado local. Si opt es false, el campo va vacío.
  const preserved = {
    id: wb.id,
    experimentalVariants: keep('experimentalVariants')
      ? (Array.isArray(wb.experimentalVariants) ? wb.experimentalVariants : []) : [],
    shoppingList: keep('shoppingList')
      ? (Array.isArray(wb.shoppingList) ? wb.shoppingList : []) : [],
    freeBattles: keep('freeBattles')
      ? (Array.isArray(wb.freeBattles) ? wb.freeBattles : []) : [],
    campaignIds: keep('campaignIds')
      ? (Array.isArray(wb.campaignIds) ? wb.campaignIds : []) : [],
    discoveredLocations: keep('discoveredLocations')
      ? (Array.isArray(wb.discoveredLocations) ? wb.discoveredLocations : []) : [],
  };

  // SPEC-rediseno-ui Sub-I — Preservar orden custom local por uid.
  // Snapshot orden previo (uids) antes de importar fresco.
  const previousOrder = Array.isArray(wb.models)
    ? wb.models.map(m => m.uid).filter(Boolean) : [];

  // Importar fresco y volcar campos sobre wb existente — preserva referencia
  // del objeto (callers + STATE.wb siguen apuntando al mismo wb).
  const fresh = importCompanionWarband(parsed.data);

  // Limpiar props que vienen del JSON.
  for (const k of Object.keys(wb)) {
    if (!(k in preserved)) delete wb[k];
  }
  // Volcar fresh.
  for (const [k, v] of Object.entries(fresh)) {
    if (k in preserved) continue;  // no pisar preservados
    wb[k] = v;
  }
  // Restaurar preservados.
  for (const [k, v] of Object.entries(preserved)) {
    wb[k] = v;
  }

  // Aplicar orden custom: para cada uid del orden previo que aún exista en
  // los modelos frescos, mantener su posición relativa. Modelos nuevos
  // van al final. Modelos eliminados de TC desaparecen.
  if (previousOrder.length > 0 && Array.isArray(wb.models)) {
    const byUid = new Map(wb.models.map(m => [m.uid, m]));
    const reordered = [];
    for (const uid of previousOrder) {
      if (byUid.has(uid)) {
        reordered.push(byUid.get(uid));
        byUid.delete(uid);
      }
    }
    // Lo que queda en byUid son modelos nuevos de TC → al final.
    for (const m of byUid.values()) reordered.push(m);
    wb.models = reordered;
  }

  return { ok: true };
}

/**
 * Stable signature of a Companion model. Two models with the same model-id,
 * same equipment list (by ID, ordered), and same stats produce the same
 * signature. Used to match models across re-imports when position changed.
 *
 * Note: `name` is intentionally INCLUDED so that two structurally-identical
 * models with different custom names produce different signatures.
 */
function companionSignatureOf(cmodel) {
  if (!cmodel) return '';
  const parts = [];
  parts.push(cmodel['model-id'] || '');
  parts.push(cmodel['name'] || cmodel['model-name'] || '');
  parts.push(cmodel['stat-melee'] || '');
  parts.push(cmodel['stat-ranged'] || '');
  parts.push(cmodel['stat-armour'] || '');
  parts.push(cmodel['stat-move'] || '');
  const eqIds = (cmodel.equipment || [])
    .map(e => e['equipment-id'])
    .filter(Boolean)
    .sort();
  parts.push('[' + eqIds.join('|') + ']');
  const upIds = (cmodel.upgrades || [])
    .map(u => u['upgrade-id'])
    .filter(Boolean)
    .sort();
  parts.push('{' + upIds.join('|') + '}');
  return parts.join('§');
}

/**
 * Stable UID for a Companion model. Companion does not provide a per-model
 * unique ID, only model-id (the type). We synthesize a UID from
 * (model-id, position-in-json) — this is our best heuristic for "this is
 * THE specific Yeoman number 3 in the roster".
 *
 * This uses the position as the primary disambiguator, which is fragile:
 * if the user reorders models in Companion, UIDs change. The merge logic
 * compensates by re-matching via companionRef.signature when position fails.
 *
 * @param {Object} cmodel  Companion model object
 * @param {number} idx     position in models[] array
 * @returns {string}
 */
function companionUidFor(cmodel, idx) {
  const modelId = (cmodel && cmodel['model-id']) || 'unknown';
  return `cm_${modelId}_${idx}`;
}

/**
 * Tries to find the unit in DATA.factions matching a Companion model.
 * Returns null if not found (custom/regional content).
 *
 * Matching strategy (in priority order):
 *   1. Exact normalized model-id match (md_sniperpriest -> sniperpriest -> sniperpriests)
 *   2. Manual alias table (for known mismatches)
 *   3. Normalized name match (singular/plural tolerant)
 *   4. Substring match on name as last resort
 *
 * Companion IDs often differ from Forge IDs:
 *   - Companion uses singular (md_sniperpriest), Forge often plural (sniper-priests)
 *   - Companion has regional suffixes (md_lieutenant_alba), Forge has base (lieutenant)
 *   - Companion has variant prefixes (md_yuzbasicaptain_mv_silahdar) for variants
 */
const COMPANION_ID_ALIASES = {
  // Map Companion model-id → Forge unit id (faction-qualified or bare)
  'md_yuzbasicaptain':            'yuzbasi',
  'md_yuzbasicaptain_mv_silahdar': 'yuzbasi',  // Iron Wall variant
  'md_janissaries_mv_officer':    'janissaries',  // Iron Wall variant: Janissary Officer
  'md_jabireanalchemist':         'jabirean-alchemist',
  'md_mechanisedheavyinfantry':   'mech-heavy-inf',
  'md_mechanisedheavyinfantry_alba': 'mech-heavy-inf',  // Highland regional variant
  'md_lieutenant_alba':           'lieutenant',     // Highland regional variant
  'md_shocktrooper_alba':         'shock-troopers',  // Highland regional variant
  'md_combatengineer':            'combat-engineers',
  'md_combatmedic':               'combat-medic',
  'md_anchoriteshrine':           'anchorite-shrine',
  'md_warprophet':                'war-prophet',
  'md_trenchpilgrim':             'trench-pilgrim',
  'md_stigmaticnun':              'stigmatic-nuns',
  'md_ecclesiasticprisoner':      'ecclesiastic-prisoners',
  'md_warwolf':                   'war-wolf',
  'md_anointedheavyinfantry':     'anointed-heavy-infantry',
  'md_artillerywitch':            'artillery-witch',
  'md_corpseguard':               'corpse-guards',
  'md_lordoftumours':             'lord-of-tumours',
  'md_plagueknight':              'plague-knights',
  'md_heraldofbeelzebub':         'heralds-of-beelzebub',
  'md_houndoftheblackgrail':      'hounds-bg',
  'md_hellknight':                'hell-knights',
  'md_pitlocust':                 'pit-locusts',
  'md_yokefiend':                 'yoke-fiends',
  'md_desecratedsaint':           'desecrated-saint',
  'md_hunterofthelefthandpath':   'hunter-of-the-left-hand-path',
  'md_lionofjabir':               'lions',
  'md_sultanateassassin':         'sultanate-assassin',
  'md_sultanatesappers':          'sultanate-sappers',
  'md_brazenbull':                'brazen-bull',
  'md_hereticpriest':             'heretic-priest',
  'md_deathcommando':             'death-commando',
  'md_chorister':                 'chorister',
  'md_heretictrooper':            'heretic-troopers',
  'md_wretched':                  'wretched',
  'md_sniperpriest':              'sniper-priests',  // singular → plural
  'md_yeoman':                    'yeomen',          // singular → plural
  'md_azeb':                      'azebs',           // singular → plural
  'md_castigator':                'castigator',
  'md_trenchcleric':              'trench-cleric',
  'md_communicant':               'communicant',
  'md_amalgam':                   'amalgam',
  'md_praetor':                   'praetor',
  'md_sorcerer':                  'sorcerer',
};

function _normalizeIdForMatch(s) {
  return (s || '').toLowerCase().replace(/[\s\-_]/g, '');
}

function findUnitByCompanionId(modelId, modelName) {
  if (!modelId) return null;

  // Phase 1: alias table (most reliable)
  const aliasTarget = COMPANION_ID_ALIASES[modelId];
  if (aliasTarget) {
    for (const factionId of Object.keys(DATA.factions)) {
      const f = DATA.factions[factionId];
      const u = (f.units || []).find(u => u.id === aliasTarget);
      if (u) return { factionId, unit: u };
    }
  }

  // Phase 2: normalized id match
  const cidNorm = _normalizeIdForMatch(modelId.replace(/^md_/, ''));
  for (const factionId of Object.keys(DATA.factions)) {
    const f = DATA.factions[factionId];
    for (const u of (f.units || [])) {
      const uidNorm = _normalizeIdForMatch(u.id);
      if (cidNorm === uidNorm) return { factionId, unit: u };
      // Singular/plural tolerance (basic)
      if (cidNorm + 's' === uidNorm) return { factionId, unit: u };
      if (cidNorm === uidNorm + 's') return { factionId, unit: u };
    }
  }

  // Phase 3: name match (singular/plural tolerant)
  if (modelName) {
    const nNorm = _normalizeIdForMatch(modelName);
    for (const factionId of Object.keys(DATA.factions)) {
      const f = DATA.factions[factionId];
      for (const u of (f.units || [])) {
        const unNorm = _normalizeIdForMatch(u.name);
        if (nNorm === unNorm) return { factionId, unit: u };
        if (nNorm + 's' === unNorm) return { factionId, unit: u };
        if (nNorm === unNorm + 's') return { factionId, unit: u };
      }
    }
  }

  return null;
}

/**
 * Converts a single Companion model into a Forge model.
 * Preserves stats, cost, equipment, abilities, keywords as Companion data.
 */
function companionModelToForgeModel(cmodel, idx) {
  const sig = companionSignatureOf(cmodel);
  const uid = companionUidFor(cmodel, idx);
  const modelId = cmodel['model-id'] || '';
  const matched = findUnitByCompanionId(
    modelId,
    cmodel['name'] || cmodel['model-name']
  );

  // customContent indicates this model is NOT a known stock unit (regional
  // variant, custom unit, or unrecognized). We detect it by:
  //   - Exact matching on the model-id stem (after stripping "md_")
  //     against a known Forge unit id. Variants like md_lieutenant_alba
  //     have suffixes that mark them as non-stock.
  // The unitId is best-effort enrichment: if we have a related stock unit
  // we point to it for tooltips/glossary, but the authoritative data
  // (stats, equipment, keywords) always comes from companionStats etc.
  const idStem = modelId.replace(/^md_/, '');
  const hasVariantSuffix = /_(mv|alba)/.test(idStem) ||  // variant markers
                           /_/.test(idStem.replace(/^[a-z]+/, '')); // any extra _ after primary
  const isCustom = hasVariantSuffix || matched === null;

  return {
    uid,
    // unitId points to the closest stock unit (for enrichment); may be
    // non-null even for customContent variants.
    unitId: matched ? matched.unit.id : null,
    customContent: isCustom,
    // Display name from Companion (may differ from unit type, e.g. user-renamed)
    name: cmodel['name'] || cmodel['model-name'] || 'Unknown',
    // Reference to original Companion data for matching on re-import
    companionRef: {
      modelId: cmodel['model-id'] || '',
      position: idx,
      signature: sig,
    },
    // Companion data preserved verbatim (authoritative)
    companionStats: {
      move:   cmodel['stat-move']   || '',
      melee:  cmodel['stat-melee']  || '',
      ranged: cmodel['stat-ranged'] || '',
      armour: cmodel['stat-armour'] || '',
    },
    companionCost: (cmodel.cost && cmodel.cost.ducats) || 0,
    companionGlory: (cmodel.cost && cmodel.cost.glory) || 0,
    companionEquipment: (cmodel.equipment || []).map(e => ({
      id: e['equipment-id'],
      name: e['equipment-name'],
      type: e['equipment-type'],
    })),
    companionAbilities: (cmodel.abilities || []).map(a => ({
      id: a['ability-id'],
      name: a['ability-name'],
    })),
    companionUpgrades: (cmodel.upgrades || []).map(u => ({
      id: u['upgrade-id'],
      name: u['upgrade-name'],
    })),
    companionKeywords: (cmodel.keywords || []).map(k => ({
      id: k['keyword-id'],
      name: k['keyword-name'],
    })),
    // Forge-native fields (start empty; campaign progression goes here)
    battlekit: [],
    upgrades: [],
    baseProgression: { xp: 0, kills: 0, advancements: [], scars: [] },
    advancements: [],
    injuries: [],
    notes: '',
  };
}

/**
 * Imports a Companion warband JSON object as a fresh Forge warband.
 *
 * @param {Object} json  parsed Companion JSON (use parseCompanionJson first)
 * @returns {Object}     Forge warband
 */
function importCompanionWarband(json) {
  const wb = newWarband('new-antioch');  // factionId is best-effort (overridden below)
  wb.name = json['warband-name'] || '';
  wb.companionSource = json;  // store the original JSON for round-trip
  wb.budgetTotal = json['ducat-rating'] || 0;
  wb.startingGlory = json['glory-rating'] || 0;
  wb.glory = json['glory-bank'] || 0;
  wb.ducatBank = json['ducat-bank'] || 0;
  wb.archivedModels = [];

  wb.models = (json.models || []).map((cmodel, idx) =>
    companionModelToForgeModel(cmodel, idx));

  // Best-effort faction inference from the most common faction keyword
  const factionVotes = {};
  const factionKwToId = {
    'kw_antioch':       'new-antioch',
    'kw_pilgrim':       'trench-pilgrims',
    'kw_pilgrims':      'trench-pilgrims',
    'kw_sultanate':     'iron-sultanate',
    'kw_heretic':       'heretic-legions',
    'kw_blackgrail':    'black-grail',
    'kw_black_grail':   'black-grail',
    'kw_court':         'court-of-the-serpent',
    'kw_thecourt':      'court-of-the-serpent',
  };
  for (const m of wb.models) {
    for (const k of (m.companionKeywords || [])) {
      const fid = factionKwToId[k.id];
      if (fid) factionVotes[fid] = (factionVotes[fid] || 0) + 1;
    }
  }
  let bestFaction = null, bestCount = 0;
  for (const [fid, count] of Object.entries(factionVotes)) {
    if (count > bestCount) { bestCount = count; bestFaction = fid; }
  }
  if (bestFaction) wb.factionId = bestFaction;

  // Best-effort variant inference from companion rules (rl_*) on any model.
  // Companion lists faction-variant special rules as abilities with id
  // prefix `rl_`. We map known rule ids to variant ids in our DATA.
  const ruleToVariant = {
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
    'rl_heretivnavalraiders':       'naval-raiders',  // possible typo variant
    'rl_unseenadvance':             'naval-raiders',
    // Additional Pilgrim entries (sacrificiallamb + alt capitalization)
    'rl_sacrificiallamb':           'tenth-plague',
    'rl_favouroftheLord':           'tenth-plague',  // alt capitalization seen in JSON
  };
  const variantVotes = {};
  for (const m of wb.models) {
    for (const a of (m.companionAbilities || [])) {
      const vid = ruleToVariant[a.id];
      if (vid) variantVotes[vid] = (variantVotes[vid] || 0) + 1;
    }
  }
  let bestVariant = null, bestVcount = 0;
  for (const [vid, count] of Object.entries(variantVotes)) {
    if (count > bestVcount) { bestVcount = count; bestVariant = vid; }
  }
  if (bestVariant) wb.variantId = bestVariant;

  return wb;
}

/**
 * Smart merge of a re-imported Companion JSON into an existing Forge
 * warband. Conserves progression of matched models, archives removed ones,
 * imports new ones with empty progression. (Plan C)
 *
 * Matching strategy (in priority order):
 *   1. Same companionRef.signature in same modelId family + same relative
 *      order: STRONG match (most likely the same individual)
 *   2. Same modelId + signature in any position: PROBABLE match
 *      (model moved within JSON)
 *   3. New model in JSON not matched: ADDED
 *   4. Existing Forge model not matched in JSON: ARCHIVED
 *
 * @returns {{merged:Object, report:{matched:number, added:number, archived:number}}}
 */
function mergeCompanionImport(existingWb, newJson) {
  const newWb = importCompanionWarband(newJson);

  const oldModels = (existingWb.models || []).slice();
  const newModelsRaw = newWb.models;  // freshly converted, no progression yet

  // Build matching pools
  const oldByModelId = {};
  for (const om of oldModels) {
    const mid = om.companionRef && om.companionRef.modelId;
    if (!mid) continue;
    if (!oldByModelId[mid]) oldByModelId[mid] = [];
    oldByModelId[mid].push(om);
  }

  const merged = [];
  const matchedOldUids = new Set();
  let matched = 0, added = 0;

  for (const newM of newModelsRaw) {
    const mid = newM.companionRef.modelId;
    const sig = newM.companionRef.signature;
    const candidates = oldByModelId[mid] || [];

    // Phase 1: try exact signature match
    let pick = candidates.find(c =>
      !matchedOldUids.has(c.uid) &&
      c.companionRef && c.companionRef.signature === sig);
    // Phase 2: fall back to any unmatched candidate of same modelId
    if (!pick) {
      pick = candidates.find(c => !matchedOldUids.has(c.uid));
    }

    if (pick) {
      // Match: keep Forge-native fields (progression, etc.) but refresh
      // Companion data from new import.
      matchedOldUids.add(pick.uid);
      merged.push({
        // Preserve campaign progression and Forge-native data
        uid: pick.uid,
        battlekit: pick.battlekit || [],
        upgrades: pick.upgrades || [],
        baseProgression: pick.baseProgression || { xp: 0, kills: 0, advancements: [], scars: [] },
        advancements: pick.advancements || [],
        injuries: pick.injuries || [],
        notes: pick.notes || '',
        // Refresh Companion data (composition may have changed in Companion,
        // e.g. model gained new equipment via campaign purchase)
        unitId: newM.unitId,
        customContent: newM.customContent,
        name: newM.name,
        companionRef: newM.companionRef,
        companionStats: newM.companionStats,
        companionCost: newM.companionCost,
        companionGlory: newM.companionGlory,
        companionEquipment: newM.companionEquipment,
        companionAbilities: newM.companionAbilities,
        companionUpgrades: newM.companionUpgrades,
        companionKeywords: newM.companionKeywords,
      });
      matched++;
    } else {
      // New model — keep as fresh import
      merged.push(newM);
      added++;
    }
  }

  // Archive old models not matched
  const archived = oldModels.filter(om => !matchedOldUids.has(om.uid));
  const allArchived = (existingWb.archivedModels || []).concat(archived);

  const mergedWb = Object.assign({}, existingWb, {
    name: newWb.name,
    factionId: newWb.factionId,
    budgetTotal: newWb.budgetTotal,
    startingGlory: newWb.startingGlory,
    glory: newWb.glory,
    ducatBank: newWb.ducatBank,
    companionSource: newJson,
    models: merged,
    archivedModels: allArchived,
    updatedAt: new Date().toISOString(),
  });

  return {
    merged: mergedWb,
    report: { matched, added, archived: archived.length },
  };
}

/**
 * Re-exports a Forge warband as a Companion-compatible JSON.
 * If the warband originated from Companion (has companionSource), this
 * round-trips faithfully. Otherwise builds a best-effort JSON.
 *
 * NOTE: campaign progression (XP, scars, advancements) is NOT exported,
 * since Companion does not have a field for it. Progression stays in Forge.
 */
function exportCompanionJson(wb) {
  const src = wb.companionSource || {};
  const out = {
    'warband-id':     src['warband-id']  || null,
    'warband-url':    src['warband-url'] || '',
    'warband-name':   wb.name || src['warband-name'] || '',
    'ducat-bank':     wb.ducatBank || 0,
    'glory-bank':     wb.glory || 0,
    'ducat-rating':   wb.budgetTotal || src['ducat-rating'] || 0,
    'glory-rating':   wb.startingGlory || src['glory-rating'] || 0,
    'models': (wb.models || []).map(m => ({
      'model-name': m.name,
      'model-id':   m.companionRef ? m.companionRef.modelId : '',
      'name':       m.name,
      'stat-move':   (m.companionStats && m.companionStats.move) || '',
      'stat-melee':  (m.companionStats && m.companionStats.melee) || '',
      'stat-ranged': (m.companionStats && m.companionStats.ranged) || '',
      'stat-armour': (m.companionStats && m.companionStats.armour) || '',
      'cost': {
        ducats: m.companionCost || 0,
        glory:  m.companionGlory || 0,
      },
      'equipment': (m.companionEquipment || []).map(e => ({
        'equipment-name': e.name,
        'equipment-id':   e.id,
        'equipment-type': e.type,
      })),
      'abilities': (m.companionAbilities || []).map(a => ({
        'ability-name': a.name,
        'ability-id':   a.id,
      })),
      'upgrades': (m.companionUpgrades || []).map(u => ({
        'upgrade-name': u.name,
        'upgrade-id':   u.id,
      })),
      'advancements': [],   // Companion does not track these (Forge-only)
      'injuries':     [],   // Companion does not track these (Forge-only)
      'keywords': (m.companionKeywords || []).map(k => ({
        'keyword-name': k.name,
        'keyword-id':   k.id,
      })),
    })),
  };
  return out;
}


