// @ts-nocheck
/* ======================================================================
   LOADOUT LAB — analyse single-model variants with different equipment
   Construye un battle model desde una unit + lista de items de armoury,
   sin necesidad de pasar por el flujo Companion → Forge. Útil para
   comparar configuraciones rápidas (ej: Janissary con shotgun+sword vs
   con halberd+jezzail) en duelos 1v1 contra arquetipos enemigos.
   ====================================================================== */

/**
 * Convierte un armoury item al shape de battle weapon (similar a
 * companionEquipToBattleWeapon, pero parte directamente de la entrada
 * canónica del armoury en DATA.factions[*].armoury).
 *
 * Returns null si el item no es un arma (shields, equipment, headgear, etc).
 */
export function _armouryItemToBattleWeapon(item) {
  if (!item) return null;
  // Determine if it's a weapon by presence in ranged/melee/grenades arrays
  // (callers already filter by category, but we double-check via type).
  const isRanged = !/melee|^-$/i.test(String(item.range || '')) &&
                   !/melee/i.test(String(item.type || ''));
  const range = (() => {
    const m = String(item.range || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  })();
  const kws = new Set();
  for (const k of (item.weaponKeywords || [])) {
    kws.add(String(k).toUpperCase());
  }
  let diceMod = 0, injuryDice = 0, injuryMod = 0;
  for (const k of (item.weaponKeywords || [])) {
    const ks = String(k);
    const dMod = ks.match(/^([+-]\d+)\s+DICE$/);
    if (dMod) { diceMod = parseInt(dMod[1], 10); continue; }
    const idMod = ks.match(/^([+-]\d+)\s+INJURY DICE$/);
    if (idMod) { injuryDice = parseInt(idMod[1], 10); continue; }
    const imMod = ks.match(/^([+-]\d+)\s+INJURY MODIFIER$/);
    if (imMod) { injuryMod = parseInt(imMod[1], 10); continue; }
  }
  return {
    name: item.name,
    isRanged: isRanged && range > 0,
    range: isRanged ? range : 0,
    diceMod,
    injuryDice,
    injuryMod,
    keywords: kws,
    // Flags de reglas especiales del arma (datos de la armería).
    critIgnoreArmour: !!item.critIgnoreArmour,
    shortRangeInjuryDice: item.shortRangeInjuryDice || 0,
    unnaturalInversion: !!item.unnaturalInversion,
  };
}

/**
 * Build a battle model variant from a unit + array of armoury items.
 * Used by the Loadout Lab to test "what-if" configurations without
 * requiring a full Companion JSON import.
 *
 * @param unit - DATA.factions[X].units[Y] entry (id, name, cost, stats, keywords, abilities)
 * @param items - Array of armoury items chosen for this variant
 * @param factionId - (optional) faction for context (kw inheritance)
 * @returns BattleModel (with .name, .cost, .meleeDice, .rangedDice, .armour, .weapons, .keywords, .bloodMarkers, .isDown, .isOut, .voiceOfGod, etc.)
 */
export function buildModelVariant(unit, items, factionId) {
  if (!unit) return null;
  items = items || [];
  // Parse stats
  const stats = unit.stats || {};
  const meleeDice  = parseStatToInt(stats.melee);
  const rangedDice = parseStatToInt(stats.ranged);
  const armour     = parseStatToInt(stats.armour);

  // Build keywords set: unit keywords + faction keyword from id
  const kws = new Set();
  for (const k of (unit.keywords || [])) kws.add(String(k).toUpperCase());
  // Add faction tag (matching the canonical battle-band format)
  const factionKwMap = {
    'new-antioch': 'NEW ANTIOCH',
    'trench-pilgrims': 'TRENCH PILGRIMS',
    'iron-sultanate': 'IRON SULTANATE',
    'heretic-legions': 'HERETIC LEGIONS',
    'black-grail': 'BLACK GRAIL',
    'court-of-the-seven-headed-serpent': 'COURT',
  };
  if (factionId && factionKwMap[factionId]) {
    kws.add(factionKwMap[factionId]);
  }

  // Build weapons from items (filter to weapons only; ignore armour/shield/equipment)
  const weapons = [];
  let extraCost = 0;
  for (const item of items) {
    extraCost += (item.cost || 0);
    const w = _armouryItemToBattleWeapon(item);
    if (w) weapons.push(w);
  }

  // Ability detection: build _abilityIds and _abilityNames from unit.abilities
  const abilityNames = new Set();
  for (const ab of (unit.abilities || [])) {
    abilityNames.add(String(ab).toLowerCase());
  }
  const abilityIds = new Set();  // we don't have id mapping here, so rely on names

  // Build the battle model — same shape as companionModelToBattleModel
  // returns. Match flag detection against ability names.
  const totalCost = (unit.cost || 0) + extraCost;
  return {
    name: unit.name + (items.length ? ' (' + items.map(i => i.name).join(', ') + ')' : ''),
    unitId: unit.id,
    cost: totalCost,
    movement: 6,
    meleeDice,
    rangedDice,
    armour,
    weapons,
    keywords: kws,
    bloodMarkers: 0,
    isDown: false,
    isOut: false,
    // Ability flags (mirroring companionModelToBattleModel)
    holdYourFire:  abilityNames.has('hold your fire!') || abilityNames.has('hold your fire action'),
    shockCharge:   abilityNames.has('shock charge'),
    godIsWithUs:   abilityNames.has('god is with us!') || abilityNames.has('god is with us! action'),
    onwardChristianSoldiers: abilityNames.has('onward christian soldiers!') || abilityNames.has('onward christian soldiers'),
    mementoMori:   abilityNames.has('memento mori'),
    loudspeakers:  abilityNames.has('loudspeakers action'),
    darkBlessing:  abilityNames.has('dark blessing'),
    battlefieldDemolition: abilityNames.has('battlefield demolition'),
    setMine:       abilityNames.has('set mine action'),
    defuseMine:    abilityNames.has('defuse mine'),
    puppetMaster:  abilityNames.has('puppet master action'),
    layingOnOfHands: abilityNames.has('laying on of hands action'),
    voiceOfGod:    abilityNames.has('voice of god action') || abilityNames.has('voice of god'),
    // Expose ability sets for detection helpers
    _abilityIds: abilityIds,
    _abilityNames: abilityNames,
  };
}

/**
 * Returns a list of canonical enemy archetypes for 1v1 loadout testing.
 * Each archetype is one model representative of a faction's mid-tier
 * threat. Used as fixed reference targets so loadout comparisons are
 * deterministic.
 *
 * Structure: [{ id, label, factory: () => [BattleModel] }]
 *
 * Note: archetypes are intentionally drawn from ENEMY_FACTORIES so they
 * stay in sync with the rest of the simulator.
 */
export function getLoadoutEnemyArchetypes() {
  // Pick one representative ELITE per faction at ~70-90 ducat range.
  // Use ENEMY_FACTORIES which already produces canonical battle models.
  if (typeof ENEMY_FACTORIES !== 'object') return [];
  const archetypes = [];
  const targets = {
    'newAntioch':       { label: 'NA Mech. Heavy Inf.',  preferName: /mech|heavy infantry/i,  fallbackIdx: 0 },
    'trenchPilgrims':   { label: 'Pilgrim Castigator',   preferName: /castigator|war prophet/i, fallbackIdx: 0 },
    'ironSultanate':    { label: 'Sultanate Mubarizun',  preferName: /mubarizun|mamluk|janissary/i, fallbackIdx: 0 },
    'hereticLegions':   { label: 'Heretic Shocktrooper', preferName: /shocktrooper|war wolf/i, fallbackIdx: 0 },
    'blackGrail':       { label: 'Plague Knight',        preferName: /plague knight|lord of tumours/i, fallbackIdx: 0 },
    'courtSerpent':     { label: 'Court Praetor',        preferName: /praetor|sorcerer/i, fallbackIdx: 0 },
  };
  for (const [factionId, target] of Object.entries(targets)) {
    if (!ENEMY_FACTORIES[factionId]) continue;
    archetypes.push({
      id: factionId,
      label: target.label,
      factory: () => {
        // Build the full enemy band, find the matching model
        const fullBand = ENEMY_FACTORIES[factionId]();
        const match = fullBand.find(m => target.preferName.test(m.name)) ||
                      fullBand[target.fallbackIdx] ||
                      fullBand[0];
        if (!match) return [];
        // Clone to ensure independent state per battle (deep enough for sim:
        // BLOOD MARKERS, isDown, isOut). The arrays/sets get shared, which
        // is fine because the sim only mutates per-instance counters.
        return [{
          ...match,
          bloodMarkers: 0,
          isDown: false,
          isOut: false,
          weapons: match.weapons.map(w => ({ ...w, keywords: new Set(w.keywords) })),
          keywords: new Set(match.keywords),
        }];
      },
    });
  }
  return archetypes;
}

/**
 * Run a 1v1 loadout analysis: each variant fights N battles against each
 * canonical enemy archetype.
 *
 * @param unit - DATA.factions[X].units[Y]
 * @param factionId - faction id of the unit
 * @param variants - Array of { label, items: [armouryItem,...] }
 * @param opts - { nBattles, terrain }
 * @returns { variants: [{ label, cost, matchups: [{archetypeId, archetypeLabel, winRate, avgUserOoA, avgEnemyOoA}], overallWinRate, efficiency, bestMatchup, worstMatchup }], archetypes: [...] }
 */
export function runLoadoutAnalysis(unit, factionId, variants, opts) {
  opts = opts || {};
  const nBattles = opts.nBattles || 100;
  const terrain  = opts.terrain  || 'mixed';
  const archetypes = getLoadoutEnemyArchetypes();

  const out = { variants: [], archetypes: archetypes.map(a => ({ id: a.id, label: a.label })) };

  for (const v of variants) {
    const cost = (unit.cost || 0) + (v.items || []).reduce((s, i) => s + (i.cost || 0), 0);
    const matchups = [];
    let totalWinRate = 0;

    for (const archetype of archetypes) {
      const variantFactory = () => [buildModelVariant(unit, v.items, factionId)];
      const enemyFactory = archetype.factory;
      const r = runBattleSeries_lab(variantFactory, enemyFactory, nBattles,
        { terrain, maxRounds: 6 });
      const winRate = r.winRateA || 0;
      matchups.push({
        archetypeId: archetype.id,
        archetypeLabel: archetype.label,
        winRate,
        lossRate: r.winRateB || 0,
        drawRate: (r.draws || 0) / Math.max(1, r.nBattles),
        avgUserOoA: r.avgCasualtiesA || 0,
        avgEnemyOoA: r.avgCasualtiesB || 0,
      });
      totalWinRate += winRate;
    }

    const overallWinRate = totalWinRate / Math.max(1, archetypes.length);
    const efficiency = cost > 0 ? (overallWinRate * 100) / cost : 0;
    // Find best and worst matchup
    const sortedByRate = [...matchups].sort((a, b) => b.winRate - a.winRate);
    const bestMatchup  = sortedByRate[0] || null;
    const worstMatchup = sortedByRate[sortedByRate.length - 1] || null;

    out.variants.push({
      label: v.label,
      cost,
      items: (v.items || []).map(i => ({ name: i.name, cost: i.cost })),
      matchups,
      overallWinRate,
      efficiency,
      bestMatchup,
      worstMatchup,
    });
  }
  return out;
}

/**
 * Identifies the top N enemy threats for a warband against a specific
 * faction. Runs nBattles vs the canonical enemy band for that faction
 * and aggregates kills+damage per enemy model.
 *
 * @param wb - Forge warband
 * @param factionId - 'newAntioch' | 'trenchPilgrims' | etc (matches ENEMY_FACTORIES key)
 * @param nBattles - default 50
 * @param opts - { topN: 3, terrain: 'mixed', userCost?: number }
 * @returns Array<{ name, kills, dmgDealt, cost, score }>
 */
export function identifyTopThreatsForBand(wb, factionId, nBattles, opts) {
  opts = opts || {};
  const topN = opts.topN || 3;
  const terrain = opts.terrain || 'mixed';
  if (!wb || !ENEMY_FACTORIES || !ENEMY_FACTORIES[factionId]) return [];

  const userBandFactory = () => buildBattleBandFromWarband(wb);
  // Use scaleEnemyBand to match user's cost (matches mainline simulator)
  const userCost = opts.userCost || (wb.models || []).reduce((s, m) => s + (m.companionCost || 0), 0);
  const enemyFactory = () => scaleEnemyBand(factionId, userCost);

  const r = runBattleSeries_lab(userBandFactory, enemyFactory, nBattles || 50,
    { terrain, maxRounds: 6 });

  if (!r || !Array.isArray(r.perModelB)) return [];

  // Score each enemy: kills primary, damage secondary
  const threats = r.perModelB
    .filter(m => (m.avgKills || 0) > 0 || (m.avgDmgDealt || 0) > 0.2)
    .map(m => ({
      name: m.name,
      kills: m.avgKills || 0,
      dmgDealt: m.avgDmgDealt || 0,
      cost: m.cost || 0,
      score: (m.avgKills || 0) * 3 + (m.avgDmgDealt || 0) * 0.5,
    }))
    .sort((a, b) => b.score - a.score);

  return threats.slice(0, topN);
}

/**
 * Mutates a battle band IN-PLACE to apply faction-variant rules conditional
 * on scenario archetype. This is what makes a Defenders-of-the-Iron-Wall
 * Azeb shine while defending and a Kingdom-of-Alba Yeoman shine while
 * rushing objectives — the same model with the same weapon performs
 * differently depending on its variant + scenario context.
 *
 * Canon-modelled variants (rules paraphrased; consult the official
 * Trench-Crusade Warbands rulebook for full text):
 *
 *   IRON SULTANATE / Defenders of the Iron Wall ('iron-wall-def'):
 *     - Marksmanship of the Iron Wall (canon: +2 DICE instead of +1 with
 *       Elevated Position). Sim: in defensive scenarios (hold-the-line,
 *       assault-defense defender role), all ranged weapons get +1 DICE
 *       to Success Rolls — represents the high-ground bonus that the
 *       defender naturally has.
 *     - Siege Jezzail Teams (canon: +1 DICE if ally within 1"). Sim:
 *       always-on +1 DICE for Siege Jezzail-named weapons (we don't
 *       model spatial proximity but the bonus is reliable as canon).
 *
 *   NEW ANTIOCH / Kingdom of Alba ('alba'):
 *     - Rampant Charge (canon: ALL models have IGNORE DEFENDED OBSTACLE).
 *       Sim: add the keyword to every model in the band. This is most
 *       impactful in objective-rush scenarios with terrain (capture-hold,
 *       relic-hunt) where defenders sit behind cover.
 *     - Highland Strength (canon: Lt + Shock Troopers have STRONG free).
 *       Sim: add STRONG to Lieutenant + Shocktrooper models — gives them
 *       access to HEAVY weapons without the move-and-shoot penalty.
 *
 *   NEW ANTIOCH / Stosstruppen of Prussia ('prussia'):
 *     - Masters of the Grenade (canon: +4" range to all grenades). Sim:
 *       add 4 to range of weapons whose name matches grenade patterns.
 *     - Rapid Assault (canon: +1 DICE to Dash Risky Roll for the ability).
 *       Sim: per-band rapidAssault flag (consumed by Dash logic).
 *
 * The function is IDEMPOTENT — calling it twice on the same band does
 * NOT stack bonuses. Each call sets keywords/flags rather than incrementing,
 * and re-applies the dice mod only if not already applied (tracked via
 * model._variantBonusApplied flag).
 *
 * @param {Array} band - battle band (array of BattleModels) to mutate
 * @param {string} factionId - 'iron-sultanate' | 'new-antioch' | etc.
 * @param {string|null} variantId - variant id from DATA.factions[X].variants
 * @param {object|null} scenario - { archetype, role } context
 */
export function applyVariantBonus(band, factionId, variantId, scenario) {
  if (!band || !Array.isArray(band) || !variantId) return;
  const archetype = scenario && scenario.archetype;
  const role = (scenario && scenario.role) || 'normal';

  // ── Defenders of the Iron Wall (Iron Sultanate) ──────────────────
  if (factionId === 'iron-sultanate' && variantId === 'iron-wall-def') {
    // Marksmanship of the Iron Wall: defensive scenarios trigger the
    // ranged buff (+1 DICE to all ranged Success Rolls). Outside of
    // defensive scenarios, no buff — the variant's strength is positional.
    const isDefensive = (
      archetype === 'hold-the-line' ||
      (archetype === 'assault-defense' && role === 'defender')
    );
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;  // idempotent
      if (isDefensive) {
        for (const w of (m.weapons || [])) {
          if (w.isRanged) w.diceMod = (w.diceMod || 0) + 1;
        }
      }
      // Siege Jezzail Teams: +1 DICE to Siege Jezzail-named weapons
      // (canon: only with ally within 1"; we apply unconditionally as
      // the canonical use-case of pairing is the norm in this band).
      for (const w of (m.weapons || [])) {
        if (w.isRanged && /siege jezzail/i.test(w.name || '')) {
          w.diceMod = (w.diceMod || 0) + 1;
        }
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Kingdom of Alba (New Antioch) ─────────────────────────────────
  if (factionId === 'new-antioch' && variantId === 'alba') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      // Rampant Charge: IGNORE DEFENDED OBSTACLE on every model
      if (!m.keywords) m.keywords = new Set();
      m.keywords.add('IGNORE DEFENDED OBSTACLE');
      m.ignoreDefendedObstacle = true;  // flag for sim helpers

      // Highland Strength: STRONG on Lieutenant + Shocktrooper
      const nm = String(m.name || '').toLowerCase();
      if (/lieutenant|shocktrooper|shock trooper/i.test(nm)) {
        m.keywords.add('STRONG');
        m.negateHeavy = true;  // STRONG implies HEAVY weapons usable
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Stosstruppen of Prussia (New Antioch) ─────────────────────────
  if (factionId === 'new-antioch' && variantId === 'prussia') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      // Masters of the Grenade: +4" to grenade range. Detect grenades
      // by name pattern (canon grenade items are listed under .grenades
      // in armoury, but the battle weapon doesn't carry that category;
      // we match by name).
      for (const w of (m.weapons || [])) {
        if (/grenade|frag|incendiary|gas|smoke/i.test(w.name || '') &&
            w.range > 0 && w.range <= 12) {
          w.range += 4;
        }
      }
      // Rapid Assault: per-model flag — Dash logic can consume this
      // for a +1 DICE bonus on the Risky Roll. Lt + Shock Troopers
      // canonically buy this for +5 ducats; we apply to those models.
      const nm = String(m.name || '').toLowerCase();
      if (/lieutenant|shocktrooper|shock trooper/i.test(nm)) {
        m.rapidAssault = true;
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Éire Rangers (New Antioch) ────────────────────────────────────
  // Canon: Hit & Run Tactics (-1 DICE a melee contra Ranger en Retreat),
  // Loose Formation (Lieutenant gana SKIRMISHER en vez de HYF).
  // Light Infantry restrictions are composition-time (only MHI can have
  // HEAVY/Reinforced) so they don't need engine modeling here.
  if (factionId === 'new-antioch' && variantId === 'eire-rangers') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      m.hitAndRun = true;  // -1 DICE on melee against this model when retreating
      const nm = String(m.name || '').toLowerCase();
      if (/lieutenant/i.test(nm)) {
        if (!m.keywords) m.keywords = new Set();
        m.keywords.add('SKIRMISHER');
        m.holdYourFire = false;  // canon: replaces HYF
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Iron Sultanate — Fida'i of Alamut ────────────────────────────
  // Cabal of Assassins. Cada modelo gana INFILTRATOR + flag assassin
  // (consumed por melee resolver para +1 injuryMod simulando stab
  // from shadows).
  if (factionId === 'iron-sultanate' && variantId === 'fidai-alamut') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      if (!m.keywords) m.keywords = new Set();
      m.keywords.add('INFILTRATOR');
      m.assassin = true;
      for (const w of (m.weapons || [])) {
        if (!w.isRanged) w.injuryMod = (w.injuryMod || 0) + 1;
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Iron Sultanate — House of Wisdom ──────────────────────────────
  // Sabios alquimistas. Marksmanship researched: +1 rangedDice cada
  // modelo. Flag scholar para tooling/UI.
  if (factionId === 'iron-sultanate' && variantId === 'house-wisdom') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      m.scholar = true;
      if (typeof m.rangedDice === 'number') {
        m.rangedDice += 1;
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Black Grail — Dirge of the Great Hegemon ─────────────────────
  // Cofradía de luto. Plague Knights y Bereaved canon-keyword reciben
  // +1 INJURY MOD a sus ataques (representa el ataque relentless de
  // los acólitos del Hegemón). Modelos sin keyword no se modifican.
  if (factionId === 'black-grail' && variantId === 'great-hegemon') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      const kws = m.keywords instanceof Set ? m.keywords : new Set();
      const isPlague = kws.has('PLAGUE') || /plague knight/i.test(m.name || '');
      const isBereaved = kws.has('BEREAVED') || /bereaved/i.test(m.name || '');
      if (isPlague || isBereaved) {
        for (const w of (m.weapons || [])) {
          w.injuryMod = (w.injuryMod || 0) + 1;
        }
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Black Grail — The Great Hunger ────────────────────────────────
  // Antipope insaciable. Cuando mata a un enemigo, absorbe un BLOOD
  // MARKER propio (flag bloodMarkerOnKill consumido por el injury
  // resolver). Identificado por name match para evitar acoplar a un
  // unit id concreto que pueda variar entre lineas Creature Caster.
  if (factionId === 'black-grail' && variantId === 'great-hunger') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      if (/antipope/i.test(m.name || '')) {
        m.hungry = true;
        m.bloodMarkerOnKill = true;
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Court of the Seven-Headed Serpent — 7 Sins ───────────────────
  // Cada Sin es un aura sobre el Desecrated Saint en canon. El Lab no
  // modela posiciones, así que aplicamos los flags uniformemente a
  // toda la banda como aproximación del aura always-on.
  if (factionId === 'court-serpent' && /^sin-/.test(variantId)) {
    const sinId = variantId.replace(/^sin-/, '');
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      if (!m.keywords) m.keywords = new Set();
      switch (sinId) {
        case 'wrath':
          // +1 DICE a melee Success Rolls. Aplicamos como diceMod al arma
          // de melee de cada modelo.
          for (const w of (m.weapons || [])) {
            if (!w.isRanged) w.diceMod = (w.diceMod || 0) + 1;
          }
          m.auraWrath = true;
          break;
        case 'envy':
          // Aura bloquea cargas enemigas en formación cerrada. BLOCK
          // keyword + flag para la lógica de charge resolver.
          m.keywords.add('BLOCK');
          m.auraEnvy = true;
          break;
        case 'lust':
          // Cancela keywords de armadura enemigas. Flag consumido en
          // injury phase para tratar armour del objetivo como 0.
          m.pierceArmour = true;
          m.auraLust = true;
          break;
        case 'pride':
          // BLOOD MARKERS automáticos en enemigos cercanos cada turno.
          // Aproximación: flag que aumenta bloodMarkerOnHit chance.
          m.auraBleed = true;
          m.bloodMarkerOnHit = true;
          break;
        case 'sloth':
          // Enemy Minor Hits cuenta como Down. Flag consumido por el
          // injury resolver para upgrade de minor → down.
          m.auraSloth = true;
          m.minorHitsAsDown = true;
          break;
        case 'gluttony':
          // -1 DICE a tiradas enemigas a 8" (no BLACK GRAIL/ARTIFICIAL).
          // Aproximación: flag que el motor consume aplicando -1 a
          // attacker.diceMod cuando golpean a este modelo.
          m.auraGluttony = true;
          m.enemyDiceMalus = 1;
          break;
        case 'greed':
          // Cargas enemigas obligadas a apuntar al Desecrated Saint.
          // Narrativo: no se modela como bonus mecánico directo, solo
          // marca para tooling/UI que lo quiera surfacear.
          m.auraGreed = true;
          break;
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── The Red Brigade (New Antioch) ─────────────────────────────────
  // Canon: Wear and Tear (start with 1 BLOOD MARKER per 200 ducats of
  // total band cost; opponent distributes), No Retreat (cannot Retreat
  // unless special rule forces it), Fury of Saint Ernest (Lt Gunslinger).
  // Sim: apply Wear and Tear BLOOD MARKERS at battle start, set noRetreat
  // flag. The wear is a meaningful debuff (penalises Risky Success Rolls).
  if (factionId === 'new-antioch' && variantId === 'red-brigade') {
    // Calculate total cost — we sum all model.cost in the band.
    const totalCost = band.reduce((s, m) => s + (m.cost || 0), 0);
    let wearMarkers = Math.floor(totalCost / 200);
    // Distribute BLOOD MARKERS: opponent spreads them. Sim: distribute to
    // most expensive models first (worst case for the band).
    const sorted = [...band].sort((a, b) => (b.cost || 0) - (a.cost || 0));
    let i = 0;
    while (wearMarkers > 0 && sorted.length > 0) {
      const target = sorted[i % sorted.length];
      if (target._variantBonusApplied !== variantId) {
        // Cap each model at 6 markers (canon max)
        if ((target.bloodMarkers || 0) < 6) {
          target.bloodMarkers = (target.bloodMarkers || 0) + 1;
          wearMarkers--;
        }
      }
      i++;
      if (i > 100) break;  // safety
    }
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      m.noRetreat = true;
      m.redBrigade = true;
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Procession of the Sacred Affliction (Trench Pilgrims) ────────
  // Canon recap: this variant is a flagellant order, melee-focused.
  // Three rules have engine-relevant effects:
  //   (1) Punishing Millstones: +1 INJURY DICE on melee attacks against
  //       Down targets (does not apply to Ecclesiastic Prisoners). The
  //       engine already grants +1 INJURY DICE on melee vs Down universally
  //       (line in applyInjury_lab), so we add a SECOND +1 via a per-model
  //       flag `punishingMillstones` that the injury resolver consumes.
  //   (2) Wrath of God: a single Castigator/Pilgrim/Martyr-Penitent gains
  //       NEGATE FEAR and is immune to BLOOD MARKERS. Loses ranged and
  //       armour. Sim: detect the model named "(Wrath of God)" or with
  //       the upgrade applied; clear its weapons of ranged, set
  //       wrathOfGod=true so the engine refuses to add bloodMarkers, and
  //       apply NEGATE FEAR.
  //   (3) Zealot Strength on up to 3 models: composition only, not engine.
  if (factionId === 'trench-pilgrims' && variantId === 'sacred-affliction') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      // Punishing Millstones: skip Ecclesiastic Prisoners. Everyone else
      // gets +1 INJURY DICE in melee against Down targets.
      const nm = String(m.name || '').toLowerCase();
      if (!/ecclesiastic|prisoner/i.test(nm)) {
        m.punishingMillstones = true;
      }
      // Sacred Affliction band-wide marker: every model in this variant
      // is tagged so downstream logic (UI badge, diagnostics) can detect
      // the variant context without having to re-read wb.variantId.
      m.sacredAffliction = true;
      // Wrath of God: applied to the Castigator if present. Canon limits
      // this to one model in the band (Castigator, Pilgrim or Martyr-
      // Penitent), and the Castigator is statistically the most likely
      // recipient. Also apply if the model's name explicitly contains
      // "Wrath of God" (post-rename via Forge upgrade).
      if (/^castigator/i.test(nm) || /wrath of god/i.test(nm)) {
        m.wrathOfGod = true;
        if (!m.keywords) m.keywords = new Set();
        m.keywords.add('NEGATE FEAR');
        m.keywords.delete('FEAR');  // negate cancels FEAR
        m.negateFear = true;
        // Canon: a Wrath of God model cannot have ranged weapons. Strip
        // them so the best-weapon picker doesn't choose one.
        if (/wrath of god/i.test(nm)) {
          m.weapons = (m.weapons || []).filter(w => !w.isRanged);
        }
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── War Pilgrimage of Saint Methodius (Trench Pilgrims) ──────────
  // The strength of this variant is compositional (up to 2 Anchorite
  // Shrines with Ranged +0 DICE, plus exclusive Anchorite battlekit
  // pieces such as Wrathful Cherub Face and Cower Before The Lord).
  // The motor doesn't simulate Anchorite-specific weapons in any
  // distinguishing way at battle level, so the variant has no per-model
  // engine flag. We mark each model with stMethodius=true purely for
  // diagnostics and downstream UI hooks; no stat changes.
  if (factionId === 'trench-pilgrims' && variantId === 'st-methodius') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      m.stMethodius = true;
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Cavalcade of the Tenth Plague (Trench Pilgrims) ──────────────
  // Two engine-relevant rules:
  //   (1) Blood of the Lamb: Castigators get TOUGH at no cost. We detect
  //       Castigators by name and add the tough flag if not already set.
  //   (2) Day of His Wrath: the War Prophet replaces Laying on of Hands
  //       with an offensive action (Risky Roll → Injury Roll at 3" with
  //       IGNORE ARMOUR). Sim: flag dayOfHisWrath=true on the War Prophet,
  //       which the activation logic uses (a War Prophet with this flag
  //       deals damage instead of healing on its action turn).
  //   (3) Favour of the Lord: 1 BLESSING MARKER per turn for the band.
  //       The motor already has a per-band _blessingPool — we increment
  //       it once at battle start to represent the steady flow.
  //   Sacrificial Lamb is composition (a 5-ducat consumable) and is not
  //   meaningfully different from other "first BLOOD MARKER ignored"
  //   gear; we don't apply it here.
  if (factionId === 'trench-pilgrims' && variantId === 'tenth-plague') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      const nm = String(m.name || '').toLowerCase();
      // Blood of the Lamb: Castigators gain TOUGH for free
      if (/castigator/i.test(nm)) {
        if (!m.keywords) m.keywords = new Set();
        m.keywords.add('TOUGH');
        m.tough = true;
      }
      // Day of His Wrath: War Prophet replaces Laying on of Hands. The
      // engine flag layingOnOfHands is checked in activateModel_lab —
      // setting it false here disables the heal action; setting
      // dayOfHisWrath=true tells the activation to do an Injury Roll
      // with IGNORE ARMOUR against an enemy within 3" (modeled as a
      // ranged attack against the strongest visible enemy).
      if (/war prophet/i.test(nm)) {
        m.layingOnOfHands = false;
        m.dayOfHisWrath = true;
      }
      // Favour of the Lord: bandwide flag. simulateBattle_lab inspects
      // this at the start of each turn and increments _blessingPool by
      // one if any model in the band carries the flag, which represents
      // the canonical "1 BLESSING MARKER placed at the start of each
      // Turn" rule.
      m.favourOfTheLord = true;
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Trench Ghosts (Heretic Legions) ──────────────────────────────
  // Canon: Undead Horror keywords + Semi-corporeal (-1 INJURY DICE on
  // ranged hits) + Slow and Creeping (Movement 3" on Dash, -1 DICE
  // attacks on Retreating models).
  if (factionId === 'heretic-legions' && variantId === 'trench-ghosts') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      if (!m.keywords) m.keywords = new Set();
      // Undead Horror: FEAR + NEGATE DIFFICULT TERRAIN + NEGATE GAS
      m.keywords.add('FEAR');
      m.keywords.add('NEGATE DIFFICULT TERRAIN');
      m.keywords.add('NEGATE GAS');
      m.fear = true;
      // Semi-corporeal: -1 INJURY DICE on ranged hits against Trench Ghosts.
      // Sim flag consumed in injury resolution.
      m.semiCorporeal = true;
      // Slow and Creeping: Dash Movement = 3" instead of normal. Flag
      // consumed by Dash logic; here we just set it.
      m.slowAndCreeping = true;
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Knights of Avarice (Heretic Legions) ─────────────────────────
  // Canon: no models <80 ducats (except Wretched), no FIRE/SHRAPNEL,
  // Heretic Priest gets Price of Greed ACTION. Sim: flag avariceKnight
  // on all models for downstream behavior; flag priceOfGreed on the
  // Heretic Priest specifically (replaces Puppet Master in canon).
  if (factionId === 'heretic-legions' && variantId === 'avarice-knights') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      m.avariceKnight = true;
      const nm = String(m.name || '').toLowerCase();
      if (/heretic priest/i.test(nm) || /^priest$/i.test(nm)) {
        m.priceOfGreed = true;
        // Disable Puppet Master in favour of Price of Greed
        m.puppetMaster = false;
      }
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // ── Heretic Naval Raiders (Heretic Legions) ──────────────────────
  // Canon: +1 DICE on Risky Success Roll for Dash ACTION (all models).
  // Plus Unseen Advance INFILTRATOR upgrade for Troopers/Wretched.
  // Sim: rapidAssault flag for all models (Dash bonus, same mechanic
  // as Stosstruppen but applies bandwide).
  if (factionId === 'heretic-legions' && variantId === 'naval-raiders') {
    for (const m of band) {
      if (m._variantBonusApplied === variantId) continue;
      m.rapidAssault = true;  // band-wide Dash bonus
      m._variantBonusApplied = variantId;
    }
    return;
  }

  // No matching variant — do nothing. Other variants (Eire Rangers,
  // Papal States, House of Wisdom, etc.) can be added here as their
  // sim-relevant rules are modelled.
}

export function runLoadoutAnalysisInBand(wb, modelUid, variants, opts) {
  opts = opts || {};
  const nBattles = opts.nBattles || 50;
  const terrain  = opts.terrain  || 'mixed';
  if (!wb || !wb.models || !ENEMY_FACTORIES) return { variants: [], factions: [], scenarios: [] };

  // Resolve the target model
  const targetModel = wb.models.find(m => m.uid === modelUid);
  if (!targetModel) return { variants: [], factions: [], scenarios: [] };

  // Resolve the unit data (for buildModelVariant)
  const unit = (typeof getUnit === 'function')
    ? getUnit(wb.factionId, targetModel.unitId)
    : (DATA.factions[wb.factionId]?.units || []).find(u => u.id === targetModel.unitId);
  if (!unit) {
    console.warn('Unit not found for', targetModel.unitId);
    return { variants: [], factions: [], scenarios: [] };
  }

  // Faction labels for display
  const factionLabels = {
    newAntioch:      'New Antioch',
    trenchPilgrims:  'Trench Pilgrims',
    ironSultanate:   'Iron Sultanate',
    hereticLegions:  'Heretic Legions',
    blackGrail:      'Black Grail',
    courtSerpent:    'Court of Serpent',
  };
  const factionIds = opts.factions || Object.keys(factionLabels)
    .filter(fid => ENEMY_FACTORIES[fid]);

  // Scenarios: if omitted, use a single "no-scenario" placeholder. Otherwise,
  // each matchup runs once per scenario, and we aggregate.
  const scenarios = (opts.scenarios && opts.scenarios.length > 0)
    ? opts.scenarios
    : [{ id: 'default', label: 'Default (terrain only)', archetype: null, role: null }];

  // Build factory that returns the warband's battle band but with the
  // target model replaced by a variant-built model. The factory takes
  // a scenario context so variant bonuses can be applied conditionally
  // (Defenders ranged buff in defensive scenarios, etc.).
  const buildBandWithVariant = (variant, scenarioCtx) => {
    return () => {
      // Convert all models EXCEPT the target one
      const battleBand = wb.models.map(m => {
        if (m.uid === modelUid) {
          return buildModelVariant(unit, variant.items || [], wb.factionId);
        }
        return companionModelToBattleModel(m);
      });
      // Apply faction-variant rules conditional on scenario archetype
      // (e.g. Defenders of the Iron Wall + hold-the-line → +1 DICE
      // ranged; Kingdom of Alba → IGNORE DEFENDED OBSTACLE always).
      if (wb.variantId) {
        applyVariantBonus(battleBand, wb.factionId, wb.variantId, scenarioCtx);
      }
      return battleBand;
    };
  };

  const out = {
    variants: [],
    factions: factionIds.map(fid => ({ id: fid, label: factionLabels[fid] || fid })),
    scenarios: scenarios.map(s => ({ id: s.id, label: s.label, archetype: s.archetype, role: s.role })),
  };

  for (const v of variants) {
    const itemsCost = (v.items || []).reduce((s, i) => s + (i.cost || 0), 0);
    const totalCost = (unit.cost || 0) + itemsCost;
    const matchups = [];   // (factionId, scenarioId) pairs
    const winRates = [];

    for (const factionId of factionIds) {
      for (const scn of scenarios) {
        // Calculate cost-matched scaling for the enemy band.
        const variantBandCost = wb.models.reduce((s, m) => {
          if (m.uid === modelUid) return s + totalCost;
          return s + (m.companionCost || 0);
        }, 0);

        const scenarioCtx = scn.archetype
          ? { archetype: scn.archetype, role: scn.role || 'normal' }
          : null;
        const userBandFactory = buildBandWithVariant(v, scenarioCtx);
        const enemyFactory = () => scaleEnemyBand(factionId, variantBandCost);

        const seriesOpts = {
          terrain,
          maxRounds: 6,
        };
        if (scenarioCtx) {
          seriesOpts.scenario = scenarioCtx;
        }

        const r = runBattleSeries_lab(userBandFactory, enemyFactory, nBattles, seriesOpts);

        // Per-model contribution
        const variantIdx = wb.models.findIndex(m => m.uid === modelUid);
        const variantStats = r.perModelA[variantIdx] || {};
        const modelKills = variantStats.avgKills || 0;
        const modelOoARate = variantStats.outRate || 0;

        // Top 3 threats for this matchup
        const threats = (r.perModelB || [])
          .filter(m => (m.avgKills || 0) > 0)
          .map(m => ({
            name: m.name,
            kills: m.avgKills || 0,
            cost: m.cost || 0,
            score: (m.avgKills || 0) * 3 + (m.avgDmgDealt || 0) * 0.5,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        const bandWinRate = r.winRateA || 0;
        winRates.push(bandWinRate);
        matchups.push({
          factionId,
          factionLabel: factionLabels[factionId] || factionId,
          scenarioId: scn.id,
          scenarioLabel: scn.label,
          scenarioArchetype: scn.archetype,
          bandWinRate,
          bandLossRate: r.winRateB || 0,
          bandDrawRate: (r.draws || 0) / Math.max(1, r.nBattles),
          modelKills,
          modelOoARate,
          topThreats: threats,
        });
      }
    }

    // Compute the 3 metrics across ALL matchups (factions × scenarios)
    const meanWR = winRates.reduce((a, b) => a + b, 0) / Math.max(1, winRates.length);
    const variance = winRates.reduce((s, w) => s + (w - meanWR) * (w - meanWR), 0)
                     / Math.max(1, winRates.length);
    const stdev = Math.sqrt(variance);
    const versatility = Math.max(0, Math.min(1, 1 - 2 * stdev));
    const efficiency = totalCost > 0 ? (meanWR * 100) / totalCost : 0;

    // Per-scenario aggregates: avg win rate per scenario across factions
    const byScenario = {};
    for (const m of matchups) {
      if (!byScenario[m.scenarioId]) {
        byScenario[m.scenarioId] = {
          scenarioId: m.scenarioId,
          scenarioLabel: m.scenarioLabel,
          archetype: m.scenarioArchetype,
          winRates: [], modelKills: [], modelOoARates: [],
        };
      }
      byScenario[m.scenarioId].winRates.push(m.bandWinRate);
      byScenario[m.scenarioId].modelKills.push(m.modelKills);
      byScenario[m.scenarioId].modelOoARates.push(m.modelOoARate);
    }
    const scenarioStats = Object.values(byScenario).map(s => ({
      scenarioId: s.scenarioId,
      scenarioLabel: s.scenarioLabel,
      archetype: s.archetype,
      avgWinRate: s.winRates.reduce((a,b) => a+b, 0) / Math.max(1, s.winRates.length),
      avgModelKills: s.modelKills.reduce((a,b) => a+b, 0) / Math.max(1, s.modelKills.length),
      avgModelOoARate: s.modelOoARates.reduce((a,b) => a+b, 0) / Math.max(1, s.modelOoARates.length),
    }));

    const sortedByRate = [...matchups].sort((a, b) => b.bandWinRate - a.bandWinRate);

    out.variants.push({
      label: v.label,
      cost: totalCost,
      itemsCost,
      items: (v.items || []).map(i => ({ name: i.name, cost: i.cost })),
      matchups,
      scenarioStats,
      overallWinRate: meanWR,
      metrics: {
        winRate: meanWR,
        efficiency,
        versatility,
      },
      bestMatchup:  sortedByRate[0] || null,
      worstMatchup: sortedByRate[sortedByRate.length - 1] || null,
    });
  }

  return out;
}

/**
 * Profiles for "fill" enemy models (the cheap troop used to scale a band
 * up to the target cost). Keep them minimal and canonical.
 */
export const FILL_MODEL_PROFILES = {
  'newAntioch':       { name: 'Yeoman',         cost: 35,  meleeDice: 0,  rangedDice: 0,  armour: 0,  weapons: [{ name: 'Bolt-Action Rifle', isRanged: true, range: 24, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }] },
  'trenchPilgrims':   { name: 'Pilgrim',        cost: 30,  meleeDice: 0,  rangedDice: -1, armour: 0,  weapons: [{ name: 'Trench Club', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }] },
  'ironSultanate':    { name: 'Azeb',           cost: 32,  meleeDice: -1, rangedDice: 0,  armour: 0,  weapons: [{ name: 'Jezzail', isRanged: true, range: 18, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }] },
  'hereticLegions':   { name: 'Heretic Trooper', cost: 30, meleeDice: 0,  rangedDice: 0,  armour: 0,  weapons: [{ name: 'Bolt-Action Rifle', isRanged: true, range: 24, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }] },
  'blackGrail':       { name: 'Thrall',         cost: 15,  meleeDice: -1, rangedDice: -2, armour: 0,  weapons: [{ name: 'Trench Club', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }] },
  'courtSerpent':     { name: 'Yoke Fiend',     cost: 25,  meleeDice: 0,  rangedDice: -2, armour: 0,  weapons: [{ name: 'Yoke Claws', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['CLEAVE']) }] },
};

/**
 * Base battle bands for each enemy faction (~700 ducats reference).
 * Used as starting point; scaleEnemyBand adds fillModels if target > 700.
 */
export const ENEMY_FACTORIES = {
  // (Implemented inline for now; later we can derive these from canonical data)
  newAntioch: () => [
    { name: 'Lieutenant',     cost: 70,  meleeDice: 2, rangedDice: 2, armour: -1, weapons: [{ name: 'Sword/Axe', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['CRITICAL']) }, { name: 'Pistol', isRanged: true, range: 12, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['PISTOL']) }], keywords: new Set(['LEADER','TOUGH','ELITE']), tough: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Sniper Priest',  cost: 50,  meleeDice: -1, rangedDice: 2, armour: 0, weapons: [{ name: 'Sniper Rifle', isRanged: true, range: 48, diceMod: 1, injuryDice: 0, injuryMod: 0, keywords: new Set(['CRITICAL','RISKY']) }], keywords: new Set(['ELITE']), bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Trench Cleric',  cost: 60,  meleeDice: 0, rangedDice: 0, armour: 0, weapons: [{ name: 'Sword/Axe', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['CRITICAL']) }], keywords: new Set(['ELITE','NEGATE FEAR','NEW ANTIOCH']), godIsWithUs: true, onwardChristianSoldiers: true, layingOnOfHands: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Combat Engineer',cost: 80,  meleeDice: 0, rangedDice: 1, armour: -2, weapons: [{ name: 'Shovel', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }], keywords: new Set(['NEW ANTIOCH','NEGATE MINED']), setMine: true, defuseMine: true, battlefieldDemolition: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Combat Medic',   cost: 65,  meleeDice: 0, rangedDice: 0, armour: 0, weapons: [{ name: 'Sword/Axe', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['CRITICAL']) }], keywords: new Set(['NEGATE FEAR']), bloodMarkers: 0, isDown: false, isOut: false },
    ...Array.from({length: 7}, () => ({ name: 'Yeoman', cost: 35, meleeDice: 0, rangedDice: 0, armour: 0, weapons: [{ name: 'Bolt-Action Rifle', isRanged: true, range: 24, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }], keywords: new Set(), bloodMarkers: 0, isDown: false, isOut: false })),
  ],
  trenchPilgrims: () => [
    { name: 'War Prophet',    cost: 80, meleeDice: 1, rangedDice: 0, armour: 0, weapons: [{ name: 'Prophet Staff', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set() }], keywords: new Set(['LEADER','ELITE','PILGRIM']), mementoMori: true, loudspeakers: true, layingOnOfHands: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Stigmatic Nun',  cost: 50, meleeDice: 1, rangedDice: 0, armour: 0, weapons: [{ name: 'Sword/Axe', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['CRITICAL']) }], keywords: new Set(['REGENERATE 1','PILGRIM']), regenerate: 1, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Castigator',     cost: 50, meleeDice: 1, rangedDice: 0, armour: 0, weapons: [{ name: 'Trench Club', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }], keywords: new Set(['ELITE','PILGRIM']), bloodMarkers: 0, isDown: false, isOut: false },
    ...Array.from({length: 12}, () => ({ name: 'Pilgrim', cost: 30, meleeDice: 0, rangedDice: -1, armour: 0, weapons: [{ name: 'Trench Club', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }], keywords: new Set(['PILGRIM']), bloodMarkers: 0, isDown: false, isOut: false })),
  ],
  ironSultanate: () => [
    { name: 'Yüzbaşı',        cost: 70, meleeDice: 1, rangedDice: 1, armour: -1, weapons: [{ name: 'Sword/Axe', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['CRITICAL']) }], keywords: new Set(['LEADER','TOUGH','ELITE','NEGATE FEAR']), tough: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Mubarizun',      cost: 45, meleeDice: 2, rangedDice: 0, armour: -1, weapons: [{ name: "Mubarizun's Greatsword", isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['CRITICAL','HEAVY']) }], keywords: new Set(['STRONG','NEGATE HEAVY']), bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Janissary',      cost: 55, meleeDice: 1, rangedDice: 1, armour: -1, weapons: [{ name: 'Shotgun', isRanged: true, range: 12, diceMod: 1, injuryDice: 0, injuryMod: 0, keywords: new Set(['SHOTGUN']) }], keywords: new Set(['STRONG','NEGATE HEAVY']), bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Sultanate Sapper',cost: 50, meleeDice: 0, rangedDice: 1, armour: 0, weapons: [{ name: 'Shovel', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }], keywords: new Set(['SULTANATE','NEGATE MINED']), setMine: true, defuseMine: true, bloodMarkers: 0, isDown: false, isOut: false },
    ...Array.from({length: 9}, () => ({ name: 'Azeb', cost: 32, meleeDice: -1, rangedDice: 0, armour: 0, weapons: [{ name: 'Jezzail', isRanged: true, range: 18, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }], keywords: new Set(), bloodMarkers: 0, isDown: false, isOut: false })),
  ],
  hereticLegions: () => [
    // Heretic Priest (canon): +2 Melee, +2 Ranged, 0 Armour, 32mm, TOUGH.
    // Cost 80. Puppet Master ACTION abstracted to a 50% pull-out-of-cover.
    { name: 'Heretic Priest', cost: 80, meleeDice: 2, rangedDice: 2, armour: 0,
      weapons: [{ name: 'Sword/Axe', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['CRITICAL']) }],
      keywords: new Set(['LEADER','ELITE','HERETIC','TOUGH']),
      tough: true, puppetMaster: true,
      bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Death Commando', cost: 80, meleeDice: 2, rangedDice: 1, armour: 0,
      weapons: [
        // Tartarus Claws are paired in canon: 2 attacks per melee swing already encoded as CLEAVE 2
        { name: 'Tartarus Claws', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['CLEAVE 2','CRITICAL','CUMBERSOME']) },
        // Pistol for ranged
        { name: 'Silenced Pistol', isRanged: true, range: 12, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['ASSAULT','PISTOL']) },
      ],
      keywords: new Set(['ELITE','HERETIC','INFILTRATOR']), bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'War Wolf', cost: 60, meleeDice: 1, rangedDice: -3, armour: 0,
      weapons: [
        // Chainsaw Mouth: +1 DICE, +1 INJURY DICE, IGNORE ARMOUR, RISKY (canon)
        { name: 'Chainsaw Mouth', isRanged: false, range: 0, diceMod: 1, injuryDice: 1, injuryMod: 0, keywords: new Set(['IGNORE ARMOUR','RISKY']) },
        // Shredding Claws: +1 INJURY DICE, CUMBERSOME, RISKY
        { name: 'Shredding Claws', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['CUMBERSOME','RISKY']) },
      ],
      keywords: new Set(['HERETIC','FEAR','TOUGH']), fear: true, tough: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Brazen Bull', cost: 130, meleeDice: 0, rangedDice: 0, armour: -2,
      weapons: [
        // Flame Cannon (HEAVY): canon profile from our audit. STRONG → NEGATE HEAVY allows it
        { name: 'Flame Cannon', isRanged: true, range: 12, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['FIRE','HEAVY','IGNORE ARMOUR','FLAMETHROWER']) },
        // Brazen Bull also has a melee profile
        { name: 'Crushing Hooves', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['HEAVY']) },
      ],
      keywords: new Set(['ELITE','HERETIC','STRONG','TOUGH','NEGATE HEAVY']),
      tough: true, negateHeavy: true,
      bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Chorister', cost: 50, meleeDice: 0, rangedDice: 0, armour: 0,
      weapons: [{ name: 'Hellblade', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['FIRE']) }],
      keywords: new Set(['ELITE','HERETIC','FEAR']), fear: true, bloodMarkers: 0, isDown: false, isOut: false },
    // 4 Wretched (cheap troops with Dark Blessing — feed BLESSING markers to ELITE+HERETIC)
    ...Array.from({length: 4}, () => ({ name: 'Wretched', cost: 25, meleeDice: -1, rangedDice: -1, armour: 0,
      weapons: [{ name: 'Trench Club', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }],
      keywords: new Set(['HERETIC']), darkBlessing: true,
      bloodMarkers: 0, isDown: false, isOut: false })),
    // Heretic Troopers (filling)
    ...Array.from({length: 4}, () => ({ name: 'Heretic Trooper', cost: 30, meleeDice: 0, rangedDice: 0, armour: 0,
      weapons: [{ name: 'Bolt-Action Rifle', isRanged: true, range: 24, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }],
      keywords: new Set(['HERETIC']), bloodMarkers: 0, isDown: false, isOut: false })),
  ],
  blackGrail: () => [
    { name: 'Lord of Tumours', cost: 130, meleeDice: 2, rangedDice: 0, armour: -1, weapons: [{ name: "Beelzebub's Axe", isRanged: false, range: 0, diceMod: 0, injuryDice: 2, injuryMod: 0, keywords: new Set(['HEAVY','INFECTION MARKERS']) }], keywords: new Set(['LEADER','ELITE','FEAR','STRONG','TOUGH','NEGATE GAS','NEGATE HEAVY']), tough: true, fear: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Plague Knight',  cost: 60, meleeDice: 1, rangedDice: 0, armour: -1, weapons: [{ name: 'Plague Blade', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['INFECTION MARKERS']) }], keywords: new Set(['ELITE','FEAR','STRONG','NEGATE GAS','NEGATE HEAVY']), fear: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Plague Knight',  cost: 60, meleeDice: 1, rangedDice: 0, armour: -1, weapons: [{ name: 'Plague Blade', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['INFECTION MARKERS']) }], keywords: new Set(['ELITE','FEAR','STRONG','NEGATE GAS','NEGATE HEAVY']), fear: true, bloodMarkers: 0, isDown: false, isOut: false },
    ...Array.from({length: 12}, () => ({ name: 'Thrall', cost: 15, meleeDice: -1, rangedDice: -2, armour: 0, weapons: [{ name: 'Trench Club', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set() }], keywords: new Set(['FEAR']), fear: true, bloodMarkers: 0, isDown: false, isOut: false })),
  ],
  courtSerpent: () => [
    { name: 'Praetor',        cost: 115, meleeDice: 2, rangedDice: 0, armour: -1, weapons: [{ name: 'Hellblade', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['FIRE']) }], keywords: new Set(['LEADER','ELITE','FEAR','FLYING','STRONG','TOUGH','NEGATE HEAVY']), tough: true, fear: true, bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Hell Knight',    cost: 100, meleeDice: 2, rangedDice: 0, armour: -2, weapons: [{ name: 'Malebranche Sword', isRanged: false, range: 0, diceMod: 0, injuryDice: 0, injuryMod: 0, keywords: new Set(['DEADLY','HEAVY']) }], keywords: new Set(['ELITE','STRONG','NEGATE HEAVY']), bloodMarkers: 0, isDown: false, isOut: false },
    { name: 'Sorcerer',       cost: 90, meleeDice: 0, rangedDice: 1, armour: 0, weapons: [{ name: 'Hellblade', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['FIRE']) }], keywords: new Set(['ELITE','FEAR','FLYING']), fear: true, bloodMarkers: 0, isDown: false, isOut: false },
    ...Array.from({length: 10}, () => ({ name: 'Yoke Fiend', cost: 25, meleeDice: 0, rangedDice: -2, armour: 0, weapons: [{ name: 'Yoke Claws', isRanged: false, range: 0, diceMod: 0, injuryDice: 1, injuryMod: 0, keywords: new Set(['CLEAVE']) }], keywords: new Set(), bloodMarkers: 0, isDown: false, isOut: false })),
  ],
};

/**
 * Scales an enemy band to the target cost by adding fill models.
 *
 * BUG FIX: Cap fill model count to canonical warbandThresholdByGame
 * (Game 8 = 13 field strength). Previous version added unbounded fill models,
 * producing absurd hordes of 100+ Thralls at high target costs.
 */
export function scaleEnemyBand(enemyName, targetCost) {
  const factory = ENEMY_FACTORIES[enemyName];
  if (!factory) return [];
  const baseModels = factory();
  if (!targetCost || targetCost <= 0) return baseModels;

  const baseCost = baseModels.reduce((s, m) => s + m.cost, 0);
  if (targetCost <= baseCost) return baseModels;

  const fillTemplate = FILL_MODEL_PROFILES[enemyName];
  if (!fillTemplate || fillTemplate.cost <= 0) return baseModels;

  // Naive: how many fill models would the target cost imply?
  const naiveExtra = Math.floor((targetCost - baseCost) / fillTemplate.cost);

  // CAP: use the canonical warbandThresholdByGame table to determine the
  // max field strength for this targetCost. Game 1 = 700/10mod, Game 12 =
  // 1800/22mod. The table is in CAMPAIGN_TABLES.warbandThresholdByGame.
  // Find the highest game whose threshold <= targetCost; allow that many.
  // Add a safety margin of +2 since real-world bands sometimes exceed.
  let canonicalMax = 22;  // conservative default if table not available
  if (typeof CAMPAIGN_TABLES !== 'undefined' &&
      CAMPAIGN_TABLES.warbandThresholdByGame) {
    let row = CAMPAIGN_TABLES.warbandThresholdByGame[0];
    for (const r of CAMPAIGN_TABLES.warbandThresholdByGame) {
      if (r.threshold <= targetCost) row = r;
    }
    canonicalMax = row.fieldStrength + 2;  // +2 buffer
  }
  const allowedExtra = Math.max(0, canonicalMax - baseModels.length);
  const nExtra = Math.min(naiveExtra, allowedExtra);

  const extras = [];
  for (let i = 0; i < nExtra; i++) {
    extras.push({
      ...fillTemplate,
      keywords: new Set(fillTemplate.keywords || []),
      weapons: (fillTemplate.weapons || []).map(w => ({
        ...w,
        keywords: new Set(w.keywords || []),
      })),
      bloodMarkers: 0, isDown: false, isOut: false,
    });
  }
  return [...baseModels, ...extras];
}

/* ----------------------------------------------------------------------
   Battle simulator — dice helpers and resolution
   ---------------------------------------------------------------------- */

export function rollD6_lab() { return Math.floor(Math.random() * 6) + 1; }

export function rollDicePool_lab(modifier, keep = 2) {
  const nDice = keep + Math.abs(modifier);
  const rolls = [];
  for (let i = 0; i < nDice; i++) rolls.push(rollD6_lab());
  rolls.sort((a, b) => a - b);
  const chosen = modifier >= 0 ? rolls.slice(-keep) : rolls.slice(0, keep);
  return { sum: chosen.reduce((a, b) => a + b, 0), dice: chosen };
}

export function successRoll_lab(modifier = 0, risky = false) {
  const { sum, dice } = rollDicePool_lab(modifier);
  if (risky && dice.includes(1)) return 'FAILURE';
  if (sum >= 12) return 'CRITICAL';
  if (sum >= 7) return 'SUCCESS';
  return 'FAILURE';
}

/**
 * Success roll wrapper that may consume a BLESSING MARKER from the
 * attacker's band on Failure. Canon: a BLESSING MARKER is spent to add
 * +1 DICE to a Success Roll (effectively a re-roll on Failure with bonus).
 *
 * Heuristic: only spend if the original attack was a Failure (no point
 * boosting a hit) AND if the modifier is not too negative (don't waste
 * markers on doomed attacks). We use modifier >= -2 as the threshold —
 * below that even +1 DICE rarely flips the result.
 */
export function successRollWithBlessing_lab(attacker, modifier = 0, risky = false) {
  const initial = successRoll_lab(modifier, risky);
  if (initial !== 'FAILURE') return initial;
  if (!attacker || !attacker._band) return initial;
  if (modifier < -2) return initial;
  if ((attacker._band._blessingPool || 0) <= 0) return initial;
  // Spend one and re-roll with +1 DICE
  attacker._band._blessingPool -= 1;
  return successRoll_lab(modifier + 1, risky);
}

// DEADLY (Rulebook 1.0.2): la Injury Roll se tira con 3D6 (se quedan 3 dados).
export function injuryRoll_lab(injuryDice, injuryMod, armour, bypassArmour = false, deadly = false) {
  const { sum } = rollDicePool_lab(injuryDice, deadly ? 3 : 2);
  let final = sum + injuryMod;
  if (!bypassArmour) final += armour;
  if (final <= 1) return 'NO_EFFECT';
  if (final <= 6) return 'BLOOD';
  if (final <= 8) return 'DOWN';
  return 'OUT';
}

export function shuffle_lab(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Targeting heuristic: pick the enemy that scores highest as a threat
 * but is also wounded enough to be finishable.
 */
/**
 * Picks a target for an attacker. By default returns the most-threatening
 * alive enemy. With `terrain` provided, applies FIRE DISTRIBUTION: there's
 * a probability the optimal target isn't reachable (LoS blocked, too far,
 * obstructed) and the attacker must pick a random alternative.
 *
 * Probability of "optimal pick" by terrain:
 *   open:  0.80 — most enemies are visible
 *   mixed: 0.60 — some obstructions
 *   urban: 0.40 — many LoS blocks
 *   undefined / unknown: 1.00 — legacy behavior (always optimal)
 *
 * This counters the simulator's bias of letting every enemy focus-fire the
 * same target. Without it, the most-threatening model (often the LEADER /
 * Lieutenant) absorbs all incoming damage every round, which is a real
 * dynamic but exaggerated by the sim's lack of spatial modelling.
 */
export function selectTarget_lab(enemies, terrain) {
  const alive = enemies.filter(e => !e.isOut);
  if (!alive.length) return null;

  // Most-threatening sort
  const sorted = alive.slice().sort((a, b) => {
    const sA = (a.meleeDice + a.rangedDice) * 1.5 - a.armour + a.bloodMarkers * 0.5;
    const sB = (b.meleeDice + b.rangedDice) * 1.5 - b.armour + b.bloodMarkers * 0.5;
    return sB - sA;
  });

  // Legacy / no terrain: always optimal
  const probMap = { open: 0.80, mixed: 0.60, urban: 0.40 };
  const pOptimal = (terrain && probMap[terrain] !== undefined) ? probMap[terrain] : 1.0;

  if (Math.random() < pOptimal) return sorted[0];
  // Otherwise pick a random alive enemy (could be the same one — that's OK)
  return alive[Math.floor(Math.random() * alive.length)];
}

/**
 * Picks the best weapon for the attack type and phase.
 * Honours NEGATE HEAVY: if the model has it, HEAVY weapons are always available
 * (otherwise only one HEAVY would be valid in a turn — but the simulator does
 * not enforce that limit explicitly; the canon HEAVY rule restricts equipping,
 * which is already handled at warband composition time, not in battle).
 */
export function bestWeapon_lab(attacker, target, type, phase) {
  const valid = attacker.weapons.filter(w => {
    if (type === 'ranged' && !w.isRanged) return false;
    if (type === 'melee' && w.isRanged) return false;
    if (w.isRanged) {
      // Range filtering by phase. Phases represent the abstract distance
      // between bands at the start of a round.
      //   - 'long':       enemies very far. Only weapons with range >= 24" reach them.
      //   - 'entrenched': defender holding position (enemy advances). Any
      //                   ranged weapon with range >= 12" eventually hits
      //                   the advancing enemy. HEAVY allowed (no movement).
      //   - 'mid':        enemies at medium range, weapons with range >= 12".
      //   - 'engagement': close quarters, only short-range / pistols / melee.
      if (phase === 'long' && w.range < 24) return false;
      if (phase === 'entrenched' && w.range < 12) return false;
      if (phase === 'mid' && w.range < 12) return false;
      if (phase === 'engagement' && w.range > 12) return false;
    }
    // HEAVY can't move and shoot (canon, RANGED weapons only — melee HEAVY
    // weapons like Beelzebub's Axe or Mubarizun's Greatsword are unaffected).
    // Without STRONG/NEGATE HEAVY (or Battlefield Demolition for Combat
    // Engineers), a model who has moved (mid/engagement phases) cannot fire
    // HEAVY ranged weapons. Long AND entrenched phases represent positions
    // where the model has not moved this round — HEAVY ranged is OK.
    if (w.isRanged && w.keywords.has('HEAVY') &&
        phase !== 'long' && phase !== 'entrenched' &&
        !attacker.negateHeavy && !attacker.battlefieldDemolition) {
      return false;
    }
    return true;
  });
  if (!valid.length) return null;
  return valid.sort((a, b) => {
    // Score baseline: raw stat additions
    const score = (w) => {
      let s = w.diceMod + w.injuryDice + w.injuryMod;
      // Target-aware bonuses
      if (w.keywords.has('IGNORE ARMOUR') && target.armour < 0) {
        s += Math.abs(target.armour) * 1.5;
      }
      if (w.keywords.has('CRITICAL')) s += 0.5;
      // CLEAVE: extra attacks. Strong vs DOWN targets (extra hits to finish)
      const hasCleave = keywordValue_lab(w, 'CLEAVE') > 1;
      if (hasCleave) s += keywordValue_lab(w, 'CLEAVE') - 1;
      if (hasCleave && target.isDown) s += 1.5;  // remate bonus
      // BLAST scales with target density (we don't know neighbours here, so
      // use a generic heuristic — already handled at applyInjury_lab time)
      if (hasBlastKeyword(w)) s += 1.5;
      if (keywordValue_lab(w, 'AUTOMATIC') > 1) s += 1.5;
      // FIRE: small bonus, but useless vs NEGATE FIRE
      if (w.keywords.has('FIRE')) s += target.negateFire ? 0 : 0.5;
      // GAS: useless vs NEGATE GAS
      if (w.keywords.has('GAS') && target.negateGas) s -= 0.3;
      // FLAMETHROWER: auto-hit, very strong
      if (w.keywords.has('FLAMETHROWER')) s += 2;
      // DEADLY: Injury Roll con 3D6
      if (w.keywords.has('DEADLY')) s += 1;
      // RELOAD: pierde el resto de la activación
      if (w.keywords.has('RELOAD')) s -= 0.5;
      // RISKY: small penalty (~30% miss probability is non-trivial)
      if (w.keywords.has('RISKY')) s -= 0.5;
      return s;
    };
    return score(b) - score(a);
  })[0];
}

/** BLAST X" con cualquier tamaño (canon: Frag BLAST 2", Gas BLAST 3"). */
export function hasBlastKeyword(weapon) {
  if (!weapon || !weapon.keywords) return false;
  for (const k of weapon.keywords) if (/^BLAST( |$)/.test(String(k))) return true;
  return false;
}

/** Valor X de una keyword paramétrica (CLEAVE 3 → 3, AUTOMATIC 5 → 5); 0 si no está. */
export function keywordValue_lab(weapon, name) {
  if (!weapon || !weapon.keywords) return 0;
  const re = new RegExp('^' + name + ' \\(?(\\d+)\\)?$');
  for (const k of weapon.keywords) { const m = String(k).match(re); if (m) return parseInt(m[1], 10); }
  return 0;
}

/** FIRE / GAS / SHRAPNEL (Rulebook 1.0.2): tras la Injury Roll, 1 BLOOD MARKER
 *  extra junto al objetivo aunque la tirada no tenga efecto. NEGATE X lo anula. */
export function extraBloodFromKeywords_lab(target, weapon) {
  if (!target || target.isOut || target.wrathOfGod) return;
  for (const k of ['FIRE', 'GAS', 'SHRAPNEL']) {
    if (!weapon.keywords.has(k)) continue;
    if (target.keywords && (target.keywords.has('NEGATE ' + k) || target.keywords.has('NEGATE_' + k))) continue;
    if ((k === 'FIRE' && target.negateFire) || (k === 'GAS' && target.negateGas) || (k === 'SHRAPNEL' && target.negateShrapnel)) continue;
    target.bloodMarkers = Math.min(6, target.bloodMarkers + 1);
  }
}

/** TOUGH (Rulebook 1.0.2): el primer Out of Action se trata como Down. */
export function toughSavesOut_lab(target) {
  if (!target || !target.tough || target._toughUsed) return false;
  target._toughUsed = true;
  return true;
}

/** Resultado de una Injury Roll en un modelo alcanzado de rebote (BLAST). */
export function applySecondaryHit_lab(e, weapon, result) {
  if (result === 'OUT' && toughSavesOut_lab(e)) result = 'DOWN';
  if (result === 'BLOOD') e.bloodMarkers = Math.min(6, e.bloodMarkers + 1);
  else if (result === 'DOWN') {
    if (e.isDown) e.bloodMarkers = Math.min(6, e.bloodMarkers + 2);
    else { e.bloodMarkers = Math.min(6, e.bloodMarkers + 1); e.isDown = true; }
  } else if (result === 'OUT') { e.isOut = true; e.isDown = true; }
  extraBloodFromKeywords_lab(e, weapon);
}

/** Short Range canon: objetivo a la mitad del alcance o menos. Solo se
 *  puede saber con posiciones (_pos); sin ellas devuelve false — el Lab
 *  abstracto no modela bandas de alcance (tampoco Long Range). */
export function isShortRange_lab(attacker, target, weapon) {
  if (!attacker || !target || !attacker._pos || !target._pos || !weapon) return false;
  const r = typeof weapon.range === 'number' ? weapon.range : parseInt(String(weapon.range || '').match(/(\d+)/)?.[1] || '0', 10);
  if (!r) return false;
  return distance(attacker, target) <= r / 2;
}

export function applyInjury_lab(attacker, target, weapon, isCritical, isMelee, allEnemies, extraInjuryMod) {
  // Hold Your Fire! consumption: if attacker was marked by HYF this turn,
  // ~50% of attacks fizzle. We model it as a coin flip per attack.
  if (attacker._hyfDamageMod && attacker._hyfDamageMod < 1.0) {
    if (Math.random() > attacker._hyfDamageMod) return;  // attack fizzles
  }
  let injuryDice = weapon.injuryDice;
  let injuryMod = weapon.injuryMod + (extraInjuryMod || 0);
  if (isCritical) injuryDice += weapon.keywords.has('CRITICAL') ? 2 : 1;
  // Tungsten-orichalcum Alloy Shot (Heavy Shotgun): +X INJURY DICE a Short Range.
  if (!isMelee && weapon.shortRangeInjuryDice && isShortRange_lab(attacker, target, weapon)) {
    injuryDice += weapon.shortRangeInjuryDice;
  }
  if (isMelee && target.isDown) injuryDice += 1;
  // Punishing Millstones (Procession of the Sacred Affliction variant):
  // canon adds another +1 INJURY DICE on top of the standard "Down bonus"
  // for melee attacks against Down targets. The flag is set on every
  // model in the band except Ecclesiastic Prisoners (canon explicit).
  if (isMelee && target.isDown && attacker.punishingMillstones) injuryDice += 1;
  if (target.artificialLife) injuryDice -= 1;
  // Trench Ghosts variant: Semi-corporeal — -1 INJURY DICE for ranged hits.
  // Canon: Add -1 INJURY DICE for Injury Rolls caused by Ranged Attacks
  // that hit a model from a Trench Ghost Warband.
  if (target.semiCorporeal && !isMelee) injuryDice -= 1;

  // Court Lust — attacker pierceArmour fuerza bypass.
  const bypass = applyLustPierce(
    weapon.keywords.has('IGNORE ARMOUR') || weapon.keywords.has('ARMOUR-PIERCING') ||
      // Liquid Fire (Incendiary Grenades, Molotov): el Crítico da IGNORE ARMOUR.
      (isCritical && !!weapon.critIgnoreArmour),
    attacker
  );
  const deadly = weapon.keywords.has('DEADLY');
  let result = injuryRoll_lab(injuryDice, injuryMod, target.armour, bypass, deadly);
  // Court Sloth — Minor Hits cuentan como DOWN si attacker tiene flag.
  result = applySlothMinorAsDown(result, attacker);
  if (result === 'OUT' && toughSavesOut_lab(target)) result = 'DOWN';

  // Track per-model stats: damage dealt / damage taken / kills.
  // BLOOD = 1 marker, DOWN = 1 (or 2 if already down), OUT = 3 (worth a kill).
  let dealt = 0;
  let killed = false;

  // Per-model stats: track damage dealt/received as a count of "damage events"
  // (BLOOD = 1 unit, DOWN = 2 units, OUT = 3 units). Kills tracked when target
  // goes Out from the attacker's strike.
  const wasOutBefore = target.isOut;
  const dmgWeight = result === 'BLOOD' ? 1 : result === 'DOWN' ? 2 : result === 'OUT' ? 3 : 0;
  if (dmgWeight > 0) {
    if (attacker._stats) attacker._stats.dmgDealt += dmgWeight;
    if (target._stats)   target._stats.dmgReceived += dmgWeight;
  }

  // Wrath of God (Procession of the Sacred Affliction variant): canon
  // says BLOOD MARKERS are NEVER placed next to a model with this rule.
  // We implement this by short-circuiting the BLOOD/DOWN paths so the
  // target.bloodMarkers counter never increments. The model can still
  // suffer DOWN and OUT results normally, but emerges unencumbered by
  // accumulated wounds — preserving its full dice throughput.
  const blocksBloodMarkers = !!target.wrathOfGod;

  if (result === 'BLOOD') {
    if (!blocksBloodMarkers) {
      target.bloodMarkers = Math.min(6, target.bloodMarkers + 1);
      // Court Pride — attacker bloodMarkerOnHit añade +1 extra.
      applyPrideOnBlood(target, attacker);
    }
  } else if (result === 'DOWN') {
    if (target.isDown) {
      if (!blocksBloodMarkers) target.bloodMarkers = Math.min(6, target.bloodMarkers + 2);
    } else {
      if (!blocksBloodMarkers) target.bloodMarkers = Math.min(6, target.bloodMarkers + 1);
      target.isDown = true;
    }
  } else if (result === 'OUT') {
    // Memento Mori (canon, War Prophet only): the FIRST time this model
    // would suffer an Out of Action result, treat it as No Effect instead.
    // Tracked via mementoUsed flag (consumed on first save).
    if (target.mementoMori && !target.mementoUsed) {
      target.mementoUsed = true;
      // No-op: do NOT set isOut, do NOT add BLOOD MARKERS, do NOT set isDown
    } else {
      target.isOut = true;
      target.isDown = true;
      // Dark Blessing (Wretched, Heretic Legions): when a model with
      // darkBlessing goes OoA, place a BLESSING MARKER on the band's pool
      // (intended for the nearest ELITE+HERETIC ally). Only credits the
      // pool if at least one such ally is alive.
      if (target.darkBlessing && target._band) {
        const eligible = target._band.some(m =>
          m && !m.isOut && m !== target &&
          m.keywords && m.keywords.has('ELITE') && m.keywords.has('HERETIC')
        );
        if (eligible) {
          target._band._blessingPool = (target._band._blessingPool || 0) + 1;
        }
      }
    }
  }

  extraBloodFromKeywords_lab(target, weapon);

  // Track kill: target newly went Out from this attacker's strike
  if (!wasOutBefore && target.isOut && attacker._stats) {
    attacker._stats.kills += 1;
    // Black Grail Hunger — Antipope absorbe 1 bloodMarker propio al matar.
    consumeHungerOnKill(attacker);
  }

  // Simplified BLAST: hits the target plus 1-2 random others
  if (hasBlastKeyword(weapon)) {
    const others = allEnemies.filter(e => e !== target && !e.isOut);
    // BLAST 2" (Frag) cubre menos área que 3": como mucho 1 modelo extra.
    const n = (others.length >= 5 && !weapon.keywords.has('BLAST 2"')) ? 2 : 1;
    shuffle_lab(others).slice(0, n).forEach(e => {
      if (Math.random() < 0.5) {
        let id = weapon.injuryDice;
        if (e.artificialLife) id -= 1;
        applySecondaryHit_lab(e, weapon, injuryRoll_lab(id, weapon.injuryMod, e.armour, bypass, deadly));
      }
    });
  }

}

export function resolveRanged_lab(attacker, target, weapon, allEnemies) {
  // Sub-A — range check usando _pos. Si fuera del range, el ataque
  // no se ejecuta. Back-compat: sin _pos, ignora check.
  if (!isWithinWeaponRange(attacker, target, weapon)) return;
  let diceMod = attacker.rangedDice + weapon.diceMod - attacker.bloodMarkers;
  // SHOTGUN canon = -1 INJURY DICE a Long Range. El Lab no modela bandas de
  // alcance, así que no se aplica; el +1 DICE de las escopetas ya va en el perfil.
  // Flag consumers — Court Gluttony aura del target reduce attacker
  // dice; Fortify ACTION bonifica defender contra ranged.
  diceMod = applyGluttonyMalus(diceMod, target);
  diceMod = applyFortifyMalus(diceMod, target);

  // Terrain cover modifier (canon: -1 DICE if target is in cover).
  // Probability depends on terrain mode injected via attacker._terrain.
  // IGNORE COVER weapon keyword and IGNORE DEFENDED OBSTACLE attacker
  // keyword (charge-only) negate it.
  const coverMod = applyTerrainCoverModifier({
    terrain: attacker._terrain,
    attackerHasIgnoreCover:
      weapon.keywords.has('IGNORE COVER') || weapon.keywords.has('IGNORES COVER'),
    attackerHasIgnoreDefendedObstacle:
      attacker.keywords && attacker.keywords.has('IGNORE DEFENDED OBSTACLE'),
    isCharge: false,  // ranged is never a charge
  });
  // Unnatural Inversion (Ophidian Rifle, Warbands 1.0.2): el Cover da +1 DICE
  // en vez de -1. Long Range no se modela en el Lab abstracto.
  diceMod += (coverMod < 0 && weapon.unnaturalInversion) ? -coverMod : coverMod;

  // Aim ACTION (Sniper Priest): if the model has Aim AND we're in a phase
  // where the model would shoot (i.e. not engagement melee), and this is the
  // first ranged attack of the activation, attempt to use Aim before firing.
  // Aim is Risky+2: success grants +2 DICE for the rest of the activation.
  // We resolve it lazily here per attack flag, with `_aimUsed` to ensure we
  // only attempt once per activation.
  if (attacker.aim && !attacker._aimUsed) {
    attacker._aimUsed = true;
    // Risky+2 success roll: 4 dice, lowest discarded, fails if any die is 1.
    const aimResult = successRoll_lab(2, true);
    if (aimResult === 'FAILURE') {
      // Activation ends — model gets no shot. We bail out.
      attacker._activationEnded = true;
      return;
    }
    // Success: +2 DICE for the rest of the activation
    attacker._aimBonus = 2;
  }
  if (attacker._aimBonus) diceMod += attacker._aimBonus;

  // Marksmanship of the Iron Wall (canon: only with Elevated Position
  // modifier). Since terrain elevation is not modelled yet, approximate by
  // assuming ~30% of ranged attacks happen from elevated position. This is
  // a deliberate downward revision from the previous 50% — elevation is
  // less common than half the time in typical games.
  if (attacker.marksmanshipIronWall && Math.random() < 0.30) diceMod += 1;

  // Siege Jezzail Teams: +1 DICE only when firing a Siege Jezzail AND there
  // is a friendly model within 1". The weapon name check filters out regular
  // Jezzails (which don't trigger). Without spatial modelling, approximate
  // proximity at ~40% (the band tends to cluster around its leader/officer).
  if (attacker.siegeTeam &&
      /siege jezzail/i.test(weapon.name || '') &&
      Math.random() < 0.40) {
    diceMod += 1;
  }

  const risky = weapon.keywords.has('RISKY');

  // AUTOMATIC X: X ataques. FLAMETHROWER: Success automático (sin Success
  // Roll, nunca Critical). RELOAD: la activación termina tras el ataque.
  const nAttacks = keywordValue_lab(weapon, 'AUTOMATIC') || 1;
  const flamethrower = weapon.keywords.has('FLAMETHROWER');
  if (weapon.keywords.has('RELOAD')) attacker._activationEnded = true;
  for (let i = 0; i < nAttacks; i++) {
    if (target.isOut) return;
    const r = flamethrower ? 'SUCCESS' : successRollWithBlessing_lab(attacker, diceMod, risky);
    if (r === 'FAILURE') {
      if (hasBlastKeyword(weapon)
          && weapon.keywords.has('SCATTER')
          && Math.random() < 0.3) {
        applyInjury_lab(attacker, target, weapon, false, false, allEnemies);
      }
      continue;
    }
    applyInjury_lab(attacker, target, weapon, r === 'CRITICAL', false, allEnemies);
  }
}

export function resolveMelee_lab(attacker, target, weapon, charged) {
  // MINED detonation on charge (canon): when a model moves into contact
  // with a MINED terrain piece, the mine detonates → Injury Roll with
  // SHRAPNEL. NEGATE MINED bypasses. Combat Engineer / Sapper with Defuse
  // Mine can attempt Risky Roll to defuse first. FLYING models only
  // trigger if they finish their move on the mine — sim approximation:
  // halve their trigger chance.
  if (charged && target._band && target._band !== attacker._band &&
      (target._band._mines || 0) > 0 &&
      !modelHasNegateMined(attacker)) {
    // ~25% chance the attacker's path crosses the mine. FLYING halves it.
    const flying = attacker.keywords && attacker.keywords.has('FLYING');
    const triggerProb = flying ? 0.125 : 0.25;
    if (Math.random() < triggerProb) {
      // Defuse Mine attempt (Risky Roll, ~50% success in canon at 0 DICE mod)
      const defused = modelHasDefuseMine(attacker) && Math.random() < 0.50;
      if (defused) {
        // Defused without detonation — mine consumed
        target._band._mines -= 1;
      } else {
        // Mine detonates: Injury Roll with SHRAPNEL on attacker
        const mineWeapon = {
          name: 'Mine', isRanged: false,
          diceMod: 0, injuryDice: 1, injuryMod: 0,
          keywords: new Set(['SHRAPNEL']),
        };
        applyInjury_lab(attacker, attacker, mineWeapon, false, false, [attacker]);
        target._band._mines -= 1;
        // If the attacker was taken Out of Action by the mine, the charge
        // is forfeit (no attack). Down models can still fight.
        if (attacker.isOut) return;
      }
    }
  }

  let diceMod = attacker.meleeDice + weapon.diceMod - attacker.bloodMarkers;
  diceMod += modelFearDiceMod(attacker, target);  // FEAR: -1 DICE cuerpo a cuerpo
  if (attacker.counterCharge && charged) diceMod += 1;
  if (target.block && charged) diceMod -= 1;
  // Terrain cover modifier on charges: a defender behind cover gives -1
  // DICE to the attacker. IGNORE DEFENDED OBSTACLE (canon Alba Highland's
  // Rampant Charge) negates this on charges. Non-charge melees ignore
  // cover (already in melee = no terrain advantage at point-blank).
  if (charged) {
    diceMod += applyTerrainCoverModifier({
      terrain: attacker._terrain,
      attackerHasIgnoreCover: false,  // not a weapon-keyword concern in melee
      attackerHasIgnoreDefendedObstacle:
        attacker.keywords && attacker.keywords.has('IGNORE DEFENDED OBSTACLE'),
      isCharge: true,
    });
  }
  // CLEAVE (X): X ataques cuerpo a cuerpo.
  const nAttacks = keywordValue_lab(weapon, 'CLEAVE') || 1;
  // CUMBERSOME (canon): -1 INJURY MODIFIER on charge attacks. Doesn't reduce
  // attack volume — the penalty is to the injury roll itself.
  const cumbPenalty = (charged && weapon.keywords.has('CUMBERSOME')) ? -1 : 0;
  for (let i = 0; i < nAttacks; i++) {
    if (target.isOut) return;
    const r = successRollWithBlessing_lab(attacker, diceMod);
    if (r === 'FAILURE') continue;
    applyInjury_lab(attacker, target, weapon, r === 'CRITICAL', true, [target], cumbPenalty);
  }
}

export function activateModel_lab(model, allies, enemies, phase) {
  if (model.isOut) return;
  if (model.isDown) {
    if (Math.random() < 0.6) model.isDown = false;
    return;
  }
  // Goetic — Whispers of the Serpent: skipNextActivation consume el
  // turno entero del modelo (canon: Resist Roll fallido → pierde
  // próxima ACCIÓN). El flag se setea por applyGoeticEffect cuando
  // un Sorcerer enemigo lanza el hechizo.
  if (applySkipActivation(model)) {
    if (model._stats) model._stats.skipped = (model._stats.skipped || 0) + 1;
    return;
  }
  // Reset per-activation flags (Aim, etc.)
  model._aimUsed = false;
  model._aimBonus = 0;
  model._activationEnded = false;

  // Eye of Beelzebub trigger — Antipope dispara con la Eye en su
  // 1ra activación non-engagement. Consume el flag eyeUsed para
  // garantizar 1x partida. Si está disponible y hay enemies en vivo,
  // ejecuta resolveRanged_lab con el weapon Eye y termina activación.
  if (model.eyeUsed === false && phase !== 'engagement') {
    const eyeWeapon = (model.weapons || []).find(w => w && w.eyeOfBeelzebub === true);
    const aliveTargets = enemies.filter(e => !e.isOut);
    if (eyeWeapon && aliveTargets.length > 0) {
      // Pick target: prefiere ELITE caro (alpha-strike anti-leader).
      const sorted = aliveTargets.slice().sort((a, b) => (b.cost || 0) - (a.cost || 0));
      const target = sorted[0];
      consumeEyeOfBeelzebub(model);
      if (model._stats) model._stats.eyeFired = (model._stats.eyeFired || 0) + 1;
      resolveRanged_lab(model, target, eyeWeapon, aliveTargets);
      return;  // Activación gastada en la Eye
    }
  }

  // Goetic — Sorcerer cast cycle. Si tiene casts disponibles y la
  // phase no es engagement (en melee no se lanzan hechizos), elige
  // un hechizo cuyo efecto NO esté ya aplicado al target y consume
  // la activación. Heurística simple de targeting: random alive
  // enemy. Priorización: curse-armour si target no cursed,
  // skip-activation si target no skipNextActivation, fallback al
  // primer spell del repertoire.
  if (model.isSorcerer && typeof model.castsRemaining === 'number' && model.castsRemaining > 0
      && phase !== 'engagement') {
    const aliveTargets = enemies.filter(e => !e.isOut);
    if (aliveTargets.length > 0) {
      // Heurística smarter: prefiere ELITE de mayor coste (alpha-strike
      // anti-leader). Fallback al de mayor coste, luego random.
      const elites = aliveTargets.filter(e => e.keywords && (e.keywords.has?.('ELITE') || /elite/i.test(Array.from(e.keywords || []).join(' '))));
      const pool = elites.length > 0 ? elites : aliveTargets;
      const sorted = pool.slice().sort((a, b) => (b.cost || 0) - (a.cost || 0));
      const target = sorted[0];
      const spells = Array.isArray(model.spells) ? model.spells : [];
      let chosen = null;
      for (const s of spells) {
        const eff = _spellToEffect(s);
        if (!eff) continue;
        if (eff.kind === 'curse-armour' && !target.cursed) { chosen = s; break; }
        if (eff.kind === 'skip-activation' && target.skipNextActivation !== true && !chosen) {
          chosen = s;
        }
      }
      if (!chosen) chosen = spells[0] || null;
      // Pre-check: no lanzar curse-armour si ya cursed (sería no-op
      // del effect canon-aplicable). Si todo lo aplicable está
      // saturado, falla por encima y cae al activation normal.
      if (chosen) {
        const eff = _spellToEffect(chosen);
        const wouldBeRedundant =
          (eff && eff.kind === 'curse-armour' && target.cursed) ||
          (eff && eff.kind === 'skip-activation' && target.skipNextActivation === true);
        if (!wouldBeRedundant) {
          const applied = castSpell(model, chosen, target);
          if (applied) {
            if (model._stats) model._stats.spellsCast = (model._stats.spellsCast || 0) + 1;
            return;  // Activación gastada en el hechizo
          }
        }
      }
    }
  }

  const aliveEnemies = enemies.filter(e => !e.isOut);
  if (!aliveEnemies.length) return;

  // God is With Us! ACTION (Trench Cleric): the Cleric spends activation
  // for a Risky Roll → on Success, place a BLESSING MARKER in band pool.
  // Heuristic: prefer this in long/mid phases (Cleric is a non-combatant
  // anyway). We model the Risky Roll at base rate (~52% success).
  if (model.godIsWithUs && phase !== 'engagement') {
    // Risky Roll: Failure on 1 (16.7%), so success rate ~83.3% per dice.
    // At 0 DICE Modifier, base Success Roll: ~52% (3+ on 1d6 with normal
    // success), but Risky penalises further. We use 50% as the canonical
    // approximation for activations that involve a Risky Roll at 0 mod.
    if (Math.random() < 0.5) {
      if (model._band) model._band._blessingPool = (model._band._blessingPool || 0) + 1;
    }
    return;  // Cleric activation ends after God is With Us!
  }

  // Voice of God ACTION (Observer Mercenary): Risky Roll. Success →
  // chained activation of any non-activated model. Sim: Observer sacrifices
  // its own activation to grant a "free" damage burst to the strongest
  // unactivated ELITE ally. Models the chained-activation tactical impact.
  // Risky Roll at 0 DICE: ~52% success. Effect: target ELITE deals double
  // damage in its next attack this round (modeled as +1 BLOOD MARKER on
  // the highest-cost enemy ELITE — proxy for accelerated kill).
  if (model.voiceOfGod && phase !== 'engagement') {
    if (Math.random() < 0.52) {
      // Pick strongest enemy ELITE to spike damage on (proxy for the
      // chained-activation alpha strike). The chained ally activation
      // would attack them; we just credit the BLOOD MARKER directly.
      const aliveEliteEnemies = enemies.filter(e =>
        !e.isOut && (e.keywords?.has?.('ELITE') || /elite/i.test(Array.from(e.keywords || []).join(' ')))
      );
      const eliteTarget = aliveEliteEnemies.sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
      if (eliteTarget) {
        eliteTarget.bloodMarkers = (eliteTarget.bloodMarkers || 0) + 1;
      } else if (enemies.length) {
        // No ELITE? Apply to most expensive remaining enemy
        const topEnemy = enemies.filter(e => !e.isOut).sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
        if (topEnemy) topEnemy.bloodMarkers = (topEnemy.bloodMarkers || 0) + 1;
      }
    }
    return;  // Observer activation ends after Voice of God
  }

  // Laying on of Hands ACTION (Trench Cleric / War Prophet): canon — Risky
  // Roll. Success → remove 1 BLOOD MARKER from ally within 6". Critical → 3.
  // Sim heuristic: only spend activation healing if at least one ally has
  // Day of his Wrath ACTION (Cavalcade of the Tenth Plague variant):
  // canon — Risky Success Roll for the War Prophet. On Failure the
  // Activation ends; on Success make an Injury Roll with IGNORE ARMOUR
  // for an enemy within 3"; on Critical Success add +1 INJURY DICE.
  // Sim approximation: 50% Success / 5% Critical / 45% Failure. The
  // model spends its activation casting this; we apply an injury roll
  // with bypass=true (IGNORE ARMOUR) and 1 dice (or 2 on critical).
  // Replaces Laying on of Hands when both flags exist (Cavalcade canon).
  if (model.dayOfHisWrath && phase !== 'engagement' && enemies && enemies.length) {
    const aliveEnemies = enemies.filter(e => !e.isOut);
    if (aliveEnemies.length) {
      // Pick the most expensive enemy ELITE within "3 inches" — in our
      // abstract model, that's just the strongest available target.
      const target = aliveEnemies.sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
      const r = Math.random();
      if (r < 0.05) {
        // Critical: +1 INJURY DICE (so 2 dice total) with IGNORE ARMOUR
        const result = injuryRoll_lab(2, 0, target.armour, true);
        if (result === 'BLOOD') {
          if (!target.wrathOfGod) target.bloodMarkers = Math.min(6, (target.bloodMarkers || 0) + 1);
        } else if (result === 'DOWN') {
          if (!target.isDown) target.isDown = true;
          if (!target.wrathOfGod) target.bloodMarkers = Math.min(6, (target.bloodMarkers || 0) + 1);
        } else if (result === 'OUT') {
          target.isOut = true; target.isDown = true;
          if (model._stats) model._stats.kills += 1;
        }
      } else if (r < 0.55) {
        // Success: 1 INJURY DICE with IGNORE ARMOUR
        const result = injuryRoll_lab(1, 0, target.armour, true);
        if (result === 'BLOOD') {
          if (!target.wrathOfGod) target.bloodMarkers = Math.min(6, (target.bloodMarkers || 0) + 1);
        } else if (result === 'DOWN') {
          if (!target.isDown) target.isDown = true;
          if (!target.wrathOfGod) target.bloodMarkers = Math.min(6, (target.bloodMarkers || 0) + 1);
        } else if (result === 'OUT') {
          target.isOut = true; target.isDown = true;
          if (model._stats) model._stats.kills += 1;
        }
      }
      // Failure: nothing happens. Activation ends regardless of outcome.
      return;
    }
  }

  // Day of His Wrath ACTION (Cavalcade of the Tenth Plague War Prophet):
  // canon replaces Laying on of Hands with an offensive Risky Roll. On
  // Success, make an Injury Roll with IGNORE ARMOUR for an enemy model
  // within 3" of the War Prophet. On Critical Success, the Injury Roll
  // gets +1 INJURY DICE. The 3" range means engagement-phase only is the
  // canonically-realistic case, but we allow it any phase the engine has
  // converged enemies (mid or engagement). The flag layingOnOfHands is
  // explicitly cleared by applyVariantBonus for this variant, so the
  // healing branch below won't fire for this model.
  if (model.dayOfHisWrath && phase !== 'long' && enemies && enemies.length) {
    // Pick the most threatening enemy in range (within 3" — abstracted as
    // any enemy in mid/engagement phase). Same priority rule as ranged
    // attacks: highest threat-score first.
    const target = selectTarget_lab(enemies, model._terrain || 'mixed');
    if (target) {
      // Risky Success Roll: ~52% success, ~5% critical
      const r = Math.random();
      if (r < 0.05) {
        // Critical: Injury Roll with +1 INJURY DICE and IGNORE ARMOUR
        const fakeWeapon = {
          name: 'Day of His Wrath',
          isRanged: true, range: 3,
          diceMod: 0, injuryDice: 2, injuryMod: 0,
          keywords: new Set(['IGNORE ARMOUR']),
        };
        applyInjury_lab(model, target, fakeWeapon, true, false, [target], 0);
      } else if (r < 0.52) {
        // Success: Injury Roll with IGNORE ARMOUR (1 die base)
        const fakeWeapon = {
          name: 'Day of His Wrath',
          isRanged: true, range: 3,
          diceMod: 0, injuryDice: 1, injuryMod: 0,
          keywords: new Set(['IGNORE ARMOUR']),
        };
        applyInjury_lab(model, target, fakeWeapon, false, false, [target], 0);
      }
      // Failure (~48%): nothing happens.
      return;  // War Prophet activation ends after the action
    }
    // No target in range: fall through to normal melee/ranged logic.
  }

  // bloodMarkers >= 2 (otherwise the marker isn't worth the activation).
  // Activation ends after the heal regardless of outcome.
  if (model.layingOnOfHands && phase !== 'engagement' && allies && allies.length) {
    const injuredAlly = allies.find(a =>
      a && !a.isOut && a !== model && (a.bloodMarkers || 0) >= 2
    );
    if (injuredAlly) {
      // Risky-style: 50% Success, 5% Critical
      const r = Math.random();
      if (r < 0.05) {
        injuredAlly.bloodMarkers = Math.max(0, (injuredAlly.bloodMarkers || 0) - 3);
      } else if (r < 0.55) {
        injuredAlly.bloodMarkers = Math.max(0, (injuredAlly.bloodMarkers || 0) - 1);
      }
      // Failure: nothing happens. Activation ends regardless.
      return;
    }
  }

  // Loudspeakers ACTION (Trench Pilgrims War Prophet): canon — Risky+2 Roll.
  // On Success, all allied PILGRIM models within 8" can move 3" toward
  // closest visible enemy (can charge if reaches 1"). Sim: in long phase,
  // mark all allied PILGRIM models for an effective phase upgrade (mid)
  // for the rest of this turn. We approximate the Risky+2 success rate
  // at ~75% (very high with +2 DICE).
  if (model.loudspeakers && phase === 'long' && allies && allies.length) {
    if (Math.random() < 0.75) {
      // Tag PILGRIM allies so their phase is upgraded to 'mid' next time
      // they activate this turn. We attach a per-turn flag.
      for (const a of allies) {
        if (a && !a.isOut && a.keywords && a.keywords.has('PILGRIM')) {
          a._loudspeakerBoosted = true;
        }
      }
    }
    return;  // War Prophet's activation ends after Loudspeakers
  }

  // Set Mine ACTION (Combat Engineer / Sultanate Sapper / Stosstruppen):
  // canon — Success Roll +2 DICE → terrain gets MINED. Sim: in long phase,
  // engineer spends activation laying a mine. We model the +2 DICE Success
  // Roll at ~80% effective rate. The mine is added to the engineer's band
  // pool; it triggers when an enemy charges into the band.
  if (model.setMine && phase === 'long' && model._band) {
    // Cap mines at 2 per band (avoid runaway accumulation in long matches)
    const currentMines = model._band._mines || 0;
    if (currentMines < 2 && Math.random() < 0.80) {
      model._band._mines = currentMines + 1;
    }
    return;  // engineer's activation ends after Set Mine
  }

  // Puppet Master ACTION (Heretic Priest): canon — Risky Roll. Success →
  // pick model (friend or foe) within 12" + LoS, move D6". Doesn't count as
  // charging if ending within 1" of enemy. Sim heuristic: priest in non-
  // engagement phase pulls an enemy ELITE out of cover. ~50% Risky success.
  // Effect: +1 BLOOD MARKER on the strongest enemy ELITE (represents being
  // repositioned to vulnerable spot + receiving a free hit from a Heretic
  // ally already nearby). The priest's activation ends regardless.
  if (model.puppetMaster && phase !== 'engagement') {
    if (Math.random() < 0.50) {
      // Find strongest enemy ELITE that's not already OoA. Prefer those
      // with armour (representing pull out of cover gains more value vs
      // armoured targets).
      const eliteEnemies = aliveEnemies.filter(e =>
        e && !e.isOut && e.keywords && e.keywords.has('ELITE')
      );
      let target = eliteEnemies.length
        ? eliteEnemies.reduce((best, e) =>
            (e.armour < best.armour) ? e : best, eliteEnemies[0])
        : (aliveEnemies.length ? aliveEnemies[0] : null);
      if (target) {
        target.bloodMarkers = (target.bloodMarkers || 0) + 1;
        // Track stat for damage attribution on the priest
        if (model._stats) {
          model._stats.dmgDealt = (model._stats.dmgDealt || 0) + 1;
        }
      }
    }
    return;  // priest's activation ends after Puppet Master
  }

  // Hold Your Fire! (Highland Lieutenant): the Lt spends the activation
  // marking the most dangerous enemy, who will next-activate at half
  // effectiveness. The Lt itself does NOT attack this turn.
  // Heuristic: only HYF when (a) Lt has a ranged weapon (canon: must point
  // a Ranged Weapon at the target with LoS), (b) phase != engagement (in
  // engagement the Lt is more useful attacking).
  if (model.holdYourFire && phase !== 'engagement') {
    const hasRanged = model.weapons.some(w => w.isRanged);
    if (hasRanged) {
      // Pick the most threatening enemy not already marked, that is not down/out
      const candidates = aliveEnemies.filter(e => !e._hyfMarked && !e.isDown);
      if (candidates.length) {
        const target = selectTarget_lab(candidates);
        if (target) {
          target._hyfMarked = true;
          // Lt's activation ends here without attacking
          return;
        }
      }
    }
  }

  // Apply Hold-Your-Fire-mark consumption: if THIS model is marked, halve
  // its effective ranged/melee output this activation. We do this by
  // setting a flag the resolveX_lab functions check.
  if (model._hyfMarked) {
    model._hyfDamageMod = 0.5;
    model._hyfMarked = false;  // consumed
  } else {
    model._hyfDamageMod = 1.0;
  }

  const hasAssaultRanged = model.weapons.some(w => w.isRanged && w.keywords.has('ASSAULT'));
  const hasMelee = model.weapons.some(w => !w.isRanged);
  let maxActions = 1;
  if (phase === 'engagement' && hasAssaultRanged && hasMelee) maxActions = 2;

  // Shock Charge (Highland Shocktrooper): canon — extra D6 to Charge Bonus.
  // Sim abstraction: in phase=long, Shocktrooper can already make a melee
  // attack (effective phase upgrade for charges only, paralel to INFILTRATOR
  // but only for melee). Without this, Shocktrooper would be ranged-only T1.
  let effPhase = phase;
  if (model.shockCharge && phase === 'long' && hasMelee) {
    effPhase = 'engagement';  // can charge T1
  }

  // Loudspeakers ACTION (War Prophet, Trench Pilgrims): canon — Risky+2 →
  // friendly PILGRIM models within 8" can move 3" toward enemy, count as
  // charging if they reach 1". Sim: the War Prophet's activation (above)
  // sets _loudspeakerBoosted=true on PILGRIM allies. When such an ally
  // activates THIS turn in phase=long with a melee weapon, treat as
  // engagement for charging. The flag is consumed on use.
  if (phase === 'long' && hasMelee && model._loudspeakerBoosted) {
    effPhase = 'engagement';
    model._loudspeakerBoosted = false;  // consumed
  }

  for (let i = 0; i < maxActions; i++) {
    if (model._activationEnded) return;  // Aim failure ends activation
    const aliveNow = enemies.filter(e => !e.isOut);
    if (!aliveNow.length) return;

    let attackType;
    if (i === 0 && effPhase === 'engagement' && hasAssaultRanged) attackType = 'ranged';
    else if (effPhase === 'engagement') {
      attackType = (model.meleeDice >= model.rangedDice && hasMelee) ? 'melee' : 'ranged';
    } else attackType = 'ranged';

    const target = selectTarget_lab(aliveNow, model._terrain);
    if (!target) return;
    let weapon = bestWeapon_lab(model, target, attackType, effPhase);
    if (!weapon) {
      const otherType = attackType === 'ranged' ? 'melee' : 'ranged';
      weapon = bestWeapon_lab(model, target, otherType, effPhase);
    }
    if (!weapon) return;
    if (weapon.isRanged) resolveRanged_lab(model, target, weapon, aliveNow);
    else resolveMelee_lab(model, target, weapon, effPhase === 'engagement');
  }
}

/**
 * Simulates one full battle between bandA and bandB.
 * Returns { winner: 'A'|'B'|'DRAW', casualtiesA, casualtiesB, totalA, totalB }.
 *
 * Simplifications:
 *   - 6 rounds max (no scenario objectives, just attrition)
 *   - Phases: long → mid → 4×engagement
 *   - Battle ends early if either side reaches 60% casualties
 *   - No positioning, line of sight, or terrain
 */
export function simulateBattle_lab(bandAFactory, bandBFactory, maxRoundsOrOpts) {
  // Accept either (bandA, bandB, maxRounds) (legacy) or (bandA, bandB, opts).
  let maxRounds = 6;
  let terrain = 'mixed';
  let scenario = null;  // { archetype, role } or null
  // P2 — Concentrated Attack flag per side. Lab approximation: each
  // model's rangedDice gets a band-wide bonus of min(max, bandSize-1).
  // The simulator doesn't track positions, so this represents the
  // "averaged" effect of coordinated fire across the entire band.
  let concentratedAttack = null;
  if (typeof maxRoundsOrOpts === 'number') {
    maxRounds = maxRoundsOrOpts;
  } else if (maxRoundsOrOpts && typeof maxRoundsOrOpts === 'object') {
    if (typeof maxRoundsOrOpts.maxRounds === 'number') maxRounds = maxRoundsOrOpts.maxRounds;
    if (typeof maxRoundsOrOpts.terrain === 'string')   terrain   = maxRoundsOrOpts.terrain;
    if (maxRoundsOrOpts.scenario && typeof maxRoundsOrOpts.scenario === 'object') {
      scenario = maxRoundsOrOpts.scenario;  // { archetype, role }
    }
    if (maxRoundsOrOpts.concentratedAttack && typeof maxRoundsOrOpts.concentratedAttack === 'object') {
      concentratedAttack = maxRoundsOrOpts.concentratedAttack;
    }
  }
  const bandA = bandAFactory();
  const bandB = bandBFactory();
  // P2 — apply Concentrated Attack bonus before stats/phases run.
  // 'positional' mode aplica bonus solo a grupos de modelos que
  // comparten arma a Distancia (refinamiento canon-fiel). 'uniform'
  // (default) sigue la aproximación previa.
  if (concentratedAttack) {
    const mode = concentratedAttack.mode || 'uniform';
    let applyFn;
    if (mode === 'real') {
      // Deploy bandas con _pos al table antes de calcular CA real.
      deployBands(bandA, bandB);
      applyFn = applyConcentratedAttackReal;
    } else if (mode === 'clustered') {
      applyFn = applyConcentratedAttackClustered;
    } else if (mode === 'positional') {
      applyFn = applyConcentratedAttackPositional;
    } else {
      applyFn = applyConcentratedAttackToBand;
    }
    if (concentratedAttack.bandA) applyFn(bandA, { max: concentratedAttack.max });
    if (concentratedAttack.bandB) applyFn(bandB, { max: concentratedAttack.max });
  }
  // Inject terrain into every model so resolvers can read it without changing
  // every signature in the engine.
  for (const m of [...bandA, ...bandB]) m._terrain = terrain;
  // Initialize per-model stats. _stats accumulates across the battle and
  // is read at the end to populate perModelA/perModelB return arrays.
  for (const m of [...bandA, ...bandB]) {
    m._stats = { kills: 0, dmgDealt: 0, dmgReceived: 0, turnsSurvived: 0 };
  }
  // Per-band blessing pool (BLESSING MARKERS from God is With Us!). Each
  // model also gets a reference to its band so resolvers can consume from
  // the pool. We attach the pool to the array itself.
  bandA._blessingPool = 0;
  bandB._blessingPool = 0;
  // Mine pool from Set Mine ACTION (Combat Engineer / Sultanate Sapper)
  bandA._mines = 0;
  bandB._mines = 0;
  for (const m of bandA) m._band = bandA;
  for (const m of bandB) m._band = bandB;
  // Build phase sequence: scenario archetype overrides terrain default.
  // NOTE: scenario applies to BAND A (user). Band B uses default terrain
  // phases — we don't currently model the enemy's role. Future: if the
  // scenario is asymmetric (Assault-Defense), bandB could get the inverted
  // role to reflect e.g. defender-vs-attacker dynamics.
  const phases = terrainPhases(terrain, scenario);

  for (let r = 0; r < Math.min(maxRounds, phases.length); r++) {
    const phase = phases[r];
    // Favour of the Lord (Cavalcade of the Tenth Plague variant): canon
    // adds 1 BLESSING MARKER next to a model from the band at the start
    // of each Turn. We model this as a blessingPool increment when any
    // model in the band carries the favourOfTheLord flag (set bandwide
    // by applyVariantBonus). Per-side: each band gets its own pool.
    if (bandA.some(m => m.favourOfTheLord)) {
      bandA._blessingPool = (bandA._blessingPool || 0) + 1;
    }
    if (bandB.some(m => m.favourOfTheLord)) {
      bandB._blessingPool = (bandB._blessingPool || 0) + 1;
    }
    // turnsSurvived: count this round for every model still alive
    for (const m of [...bandA, ...bandB]) {
      if (!m.isOut) m._stats.turnsSurvived += 1;
    }
    [...bandA, ...bandB].forEach(m => {
      if (!m.isOut && m.regenerate > 0 && m.bloodMarkers > 0) {
        m.bloodMarkers = Math.max(0, m.bloodMarkers - m.regenerate);
      }
    });

    const aliveA = shuffle_lab(bandA.filter(m => !m.isOut));
    const aliveB = shuffle_lab(bandB.filter(m => !m.isOut));
    const aFirst = Math.random() < 0.5;
    const ordered = [];
    const len = Math.max(aliveA.length, aliveB.length);
    for (let i = 0; i < len; i++) {
      if (aFirst) {
        if (i < aliveA.length) ordered.push([aliveA[i], 'A']);
        if (i < aliveB.length) ordered.push([aliveB[i], 'B']);
      } else {
        if (i < aliveB.length) ordered.push([aliveB[i], 'B']);
        if (i < aliveA.length) ordered.push([aliveA[i], 'A']);
      }
    }
    for (const [m, side] of ordered) {
      if (m.isOut) continue;
      const allies = side === 'A' ? bandA : bandB;
      const enemies = side === 'A' ? bandB : bandA;
      // INFILTRATOR (canon): forward deployment lets the model engage one
      // phase earlier than its peers. We approximate this by upgrading the
      // model's effective phase from 'long' → 'mid' on round 0.
      let effPhase = phase;
      if (phase === 'long' && modelHasInfiltrator(m)) effPhase = 'mid';
      activateModel_lab(m, allies, enemies, effPhase);
    }
    const outA = bandA.filter(m => m.isOut).length;
    const outB = bandB.filter(m => m.isOut).length;
    if (outA >= bandA.length * 0.6 || outB >= bandB.length * 0.6) break;
  }

  const outA = bandA.filter(m => m.isOut).length;
  const outB = bandB.filter(m => m.isOut).length;
  const pctA = outA / Math.max(1, bandA.length);
  const pctB = outB / Math.max(1, bandB.length);
  let winner;
  if (pctA < pctB) winner = 'A';
  else if (pctB < pctA) winner = 'B';
  else winner = 'DRAW';

  // Build per-model breakdown arrays
  // buildPerModel: per-model summary AFTER the battle. We include static
  // info (weapons, keywords, armour, cost) so downstream analysis can
  // reason about the model without re-reading the battle band. Keywords
  // are serialized as an array (the battle band stores them as Set).
  const buildPerModel = (band) => band.map(m => ({
    name: m.name,
    kills: m._stats.kills,
    dmgDealt: m._stats.dmgDealt,
    dmgReceived: m._stats.dmgReceived,
    turnsSurvived: m._stats.turnsSurvived,
    wentOut: !!m.isOut,
    // Static profile (does not change battle-to-battle)
    weapons: (m.weapons || []).map(w => ({
      name: w.name,
      isRanged: !!w.isRanged,
      range: w.range || 0,
      keywords: w.keywords ? Array.from(w.keywords) : [],
    })),
    keywords: m.keywords ? Array.from(m.keywords) : [],
    armour: m.armour || 0,
    cost: m.cost || 0,
  }));
  const perModelA = buildPerModel(bandA);
  const perModelB = buildPerModel(bandB);

  return {
    winner,
    casualtiesA: outA, casualtiesB: outB,
    totalA: bandA.length, totalB: bandB.length,
    perModelA, perModelB,
  };
}

/**
 * Runs N battles between two band factories and returns aggregated win rates.
 * Each factory should produce a fresh copy of the band.
 */
export function runBattleSeries_lab(bandAFactory, bandBFactory, nBattles = 100, opts) {
  let winsA = 0, winsB = 0, draws = 0;
  let casA = 0, casB = 0;
  // Sum of squared casualties — needed for stdev computation. Tracking
  // x² incrementally lets us compute stdev = √(E[x²] − E[x]²) at the end
  // without storing the full per-battle history.
  let casASumSq = 0, casBSumSq = 0;
  // Aggregate per-model stats by index-in-band (since names can repeat)
  const aggA = [];
  const aggB = [];
  // Pairwise co-survival: pairCoSurvA[i][j] = number of battles where
  // both model i and model j of band A survived together (neither OoA).
  // This is symmetric (used for synergy detection downstream).
  let pairCoSurvA = null;

  for (let i = 0; i < nBattles; i++) {
    const r = simulateBattle_lab(bandAFactory, bandBFactory, opts);
    if (r.winner === 'A') winsA++;
    else if (r.winner === 'B') winsB++;
    else draws++;
    casA += r.casualtiesA;
    casB += r.casualtiesB;
    casASumSq += r.casualtiesA * r.casualtiesA;
    casBSumSq += r.casualtiesB * r.casualtiesB;

    // Initialize aggregates on first battle. Capture the static profile
    // (weapons, keywords, armour, cost) which doesn't change battle-to-
    // battle — used by downstream threat analysis.
    if (i === 0) {
      for (const m of r.perModelA) {
        aggA.push({
          name: m.name, kills: 0, dmgDealt: 0, dmgReceived: 0, turnsSurvived: 0, outs: 0,
          weapons: m.weapons, keywords: m.keywords, armour: m.armour, cost: m.cost,
        });
      }
      for (const m of r.perModelB) {
        aggB.push({
          name: m.name, kills: 0, dmgDealt: 0, dmgReceived: 0, turnsSurvived: 0, outs: 0,
          weapons: m.weapons, keywords: m.keywords, armour: m.armour, cost: m.cost,
        });
      }
    }
    for (let j = 0; j < r.perModelA.length; j++) {
      const m = r.perModelA[j];
      aggA[j].kills += m.kills;
      aggA[j].dmgDealt += m.dmgDealt;
      aggA[j].dmgReceived += m.dmgReceived;
      aggA[j].turnsSurvived += m.turnsSurvived;
      if (m.wentOut) aggA[j].outs += 1;
    }
    // Pairwise co-survival: increment count for each (i,j) where neither
    // model i nor model j went OoA. Initialize on first battle.
    if (i === 0) {
      pairCoSurvA = Array.from({ length: r.perModelA.length }, () =>
        new Array(r.perModelA.length).fill(0)
      );
    }
    if (pairCoSurvA) {
      for (let j = 0; j < r.perModelA.length; j++) {
        if (r.perModelA[j].wentOut) continue;
        for (let k = 0; k < r.perModelA.length; k++) {
          if (j === k) continue;
          if (!r.perModelA[k].wentOut) pairCoSurvA[j][k]++;
        }
      }
    }
    for (let j = 0; j < r.perModelB.length; j++) {
      const m = r.perModelB[j];
      aggB[j].kills += m.kills;
      aggB[j].dmgDealt += m.dmgDealt;
      aggB[j].dmgReceived += m.dmgReceived;
      aggB[j].turnsSurvived += m.turnsSurvived;
      if (m.wentOut) aggB[j].outs += 1;
    }
  }

  // Compute averages. Preserve static profile fields (weapons, keywords,
  // armour, cost) so downstream consumers can analyze without re-loading.
  const finalize = (agg) => agg.map(a => ({
    name: a.name,
    avgKills: a.kills / nBattles,
    avgDmgDealt: a.dmgDealt / nBattles,
    avgDmgReceived: a.dmgReceived / nBattles,
    avgTurnsSurvived: a.turnsSurvived / nBattles,
    outRate: a.outs / nBattles,
    weapons: a.weapons || [],
    keywords: a.keywords || [],
    armour: a.armour || 0,
    cost: a.cost || 0,
  }));

  // Compute averages and stdev for casualties (variance = E[x²] - E[x]²)
  const meanA = casA / nBattles;
  const meanB = casB / nBattles;
  const varA = (casASumSq / nBattles) - (meanA * meanA);
  const varB = (casBSumSq / nBattles) - (meanB * meanB);
  const stdevA = Math.sqrt(Math.max(0, varA));
  const stdevB = Math.sqrt(Math.max(0, varB));

  return {
    nBattles,
    winsA, winsB, draws,
    winRateA: winsA / nBattles,
    winRateB: winsB / nBattles,
    avgCasualtiesA: meanA,
    avgCasualtiesB: meanB,
    stdevCasualtiesA: stdevA,
    stdevCasualtiesB: stdevB,
    perModelA: finalize(aggA),
    perModelB: finalize(aggB),
    // pairwiseSurvival[i][j] = count of battles where both i and j survived
    // (neither OoA). Used by detectModelSynergies_lab to identify pairs
    // whose performance correlates positively (synergy) or negatively.
    pairwiseSurvival: pairCoSurvA,
  };
}

/**
 * Runs N battles between two Companion warbands directly. Builds battle
 * factories from each warband (using buildBattleBandFromWarband) and
 * delegates to simulateBattle_lab. Returns the standard runBattleSeries_lab
 * shape with both perModelA and perModelB populated using the actual model
 * names from each warband.
 *
 * Differs from runBattleSeries_lab(factoryA, factoryB):
 *   - Takes warbands (not factories)
 *   - Easier to call from UI code that already has Companion warbands
 *   - Names in perModelB are the actual rival model names, not generic
 *     enemy factory names
 */
export function runDuel_lab(wbA, wbB, opts) {
  opts = opts || {};
  const nBattles = opts.nBattles || 100;
  const terrain = opts.terrain || 'mixed';
  const factoryA = () => buildBattleBandFromWarband(wbA);
  const factoryB = () => buildBattleBandFromWarband(wbB);
  return runBattleSeries_lab(factoryA, factoryB, nBattles, { terrain });
}

/**
 * Compares N warbands against the same set of canonical enemy factions.
 * Each enemy is scaled to opts.enemyCost (default 700) so all bands face
 * the same enemy composition.
 *
 * Returns:
 *   {
 *     results: [resultsForBand0, resultsForBand1, ...],  // one per warband
 *     comparison: [
 *       { enemyId, enemyLabel, winRates: [w0, w1, ...], bestIdx, allTied,
 *         enemyCost, enemyModelCount }
 *     ]
 *   }
 *
 * bestIdx: index of warband with highest winRate (only set if max - min ≥ 5pp).
 *   When all bands are within 5pp, bestIdx = -1 and allTied = true.
 *
 * Useful for A/B/C testing or mini-tournament evaluation across builds.
 */
export function runCompareN_lab(warbands, enemyIds, opts) {
  opts = opts || {};
  const nBattles = opts.nBattles || 100;
  const terrain = opts.terrain || 'mixed';
  const enemyCost = opts.enemyCost || 700;
  const TIE_THRESHOLD = 0.05;

  // Initialize one results array per warband
  const results = warbands.map(() => []);
  const comparison = [];

  for (const enemyId of enemyIds) {
    const enemyBand = scaleEnemyBand(enemyId, enemyCost);
    const enemyFactory = makeBandFactory_lab(enemyBand);
    const opt = (typeof LAB_ENEMY_OPTIONS !== 'undefined')
      ? LAB_ENEMY_OPTIONS.find(o => o.id === enemyId)
      : null;
    const enemyLabel = opt ? opt.label : enemyId;
    const enemyModelCount = enemyBand.length;

    const winRates = [];
    for (let i = 0; i < warbands.length; i++) {
      const wb = warbands[i];
      const factory = () => buildBattleBandFromWarband(wb);
      const stats = runBattleSeries_lab(factory, enemyFactory, nBattles, { terrain });
      results[i].push({
        enemyId, enemyLabel,
        enemyModelCount, enemyCost,
        ...stats,
      });
      winRates.push(stats.winRateA);
    }

    // Determine best band: highest winRate, but only if margin ≥ 5pp from
    // the second-best. With a single band there's no comparison to make,
    // so bestIdx=0 and allTied=false.
    let bestIdx = 0;
    for (let i = 1; i < winRates.length; i++) {
      if (winRates[i] > winRates[bestIdx]) bestIdx = i;
    }
    const minRate = Math.min(...winRates);
    const allTied = winRates.length > 1 &&
                    (winRates[bestIdx] - minRate) < TIE_THRESHOLD;

    comparison.push({
      enemyId, enemyLabel,
      enemyCost, enemyModelCount,
      winRates,
      bestIdx: allTied ? -1 : bestIdx,
      allTied,
    });
  }

  return { results, comparison };
}

/**
 * Compares two warbands against the same set of canonical enemy factions.
 * Useful for A/B testing two builds (e.g. with vs without an upgrade) against
 * the same competitive landscape.
 *
 * Legacy 2-band wrapper around runCompareN_lab. Returns:
 *   {
 *     resultsA: [...], resultsB: [...],
 *     comparison: [{ enemyId, enemyLabel, winA, winB, diff, betterBand }, ...]
 *   }
 *
 * diff = winA - winB; betterBand is 'A' if A wins by ≥5pp, 'B' if B wins by
 * ≥5pp, otherwise 'tie'.
 */
export function runCompare_lab(wbA, wbB, enemyIds, opts) {
  const n = runCompareN_lab([wbA, wbB], enemyIds, opts);
  const TIE_THRESHOLD = 0.05;
  const comparison = n.comparison.map(c => {
    const winA = c.winRates[0];
    const winB = c.winRates[1];
    const diff = winA - winB;
    let betterBand = 'tie';
    if (diff >=  TIE_THRESHOLD) betterBand = 'A';
    else if (diff <= -TIE_THRESHOLD) betterBand = 'B';
    return {
      enemyId: c.enemyId,
      enemyLabel: c.enemyLabel,
      winA, winB, diff, betterBand,
    };
  });
  return {
    resultsA: n.results[0],
    resultsB: n.results[1],
    comparison,
  };
}

/**
 * Computes a 6-dimensional structural coverage matrix for a warband.
 * Each dimension scores how well the band handles a tactical situation:
 *
 *   - antiArmour:  IGNORE ARMOUR + ARMOUR-PIERCING weapons / heavy injury dice
 *   - antiHorde:   BLAST + AUTOMATIC + FLAMETHROWER weapons (area damage)
 *   - antiElite:   CRITICAL + DEADLY + IGNORE ARMOUR (high-damage single-target)
 *   - antiFear:    NEGATE FEAR + Onward Christian Soldiers! + Berserker
 *   - resilience:  field strength + total armour + TOUGH count
 *   - mobility:    FLYING + INFILTRATOR + IGNORE DEFENDED OBSTACLE + FAST
 *
 * Score is 0-100 where 100 = saturated coverage. Labels:
 *   low (0-30) | medium (30-70) | high (70-100)
 */
/**
 * Persistent simulation history. Each saved entry is a compact summary of
 * a Lab run: timestamp, mode, terrain, banda, and matchup win-rates.
 *
 * Storage: localStorage key 'wf_sim_history' = JSON array, capped at 100
 * entries (oldest dropped). Robust against corrupted JSON (returns []).
 *
 * Used to compare a fresh simulation against previous runs of the same band
 * — e.g. to see if a recent upgrade actually moved the needle.
 */
export const SIM_HISTORY_KEY = 'wf_sim_history';
export const SIM_HISTORY_MAX = 100;

export function _loadRawSimHistory() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(SIM_HISTORY_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveSimToHistory(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const stored = _loadRawSimHistory();
  const enriched = {
    id: entry.id || ('sim_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)),
    timestamp: entry.timestamp || Date.now(),
    ...entry,
  };
  stored.push(enriched);
  // Cap at SIM_HISTORY_MAX (oldest dropped)
  while (stored.length > SIM_HISTORY_MAX) stored.shift();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIM_HISTORY_KEY, JSON.stringify(stored));
    }
  } catch (e) {
    // Storage might be full or unavailable; we silently fail rather than
    // breaking the Lab UX.
    console.warn('Sim history save failed:', e);
  }
  return enriched;
}

export function loadSimHistory(bandName) {
  const all = _loadRawSimHistory();
  if (bandName) return all.filter(e => e && e.bandName === bandName);
  return all;
}

export function clearSimHistory() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SIM_HISTORY_KEY);
    }
  } catch (e) {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────
// BATTLE SESSIONS (Live Game Tracking)
//
// Persistent sessions for live in-game tracking: scenario, model states
// (alive/down/out, BLOOD MARKERS, kills, Glorious Deeds), VPs, turn counter.
// Designed to integrate with campaign progression in the future (XP/scars
// would feed into model.baseProgression at session end).

/**
 * Catalog of canon scenarios (Trench Crusade Digital Rulebook, sections I-XII).
 * Each scenario defines numTurns, deeds (Glorious Deeds), and VP rules
 * (textual hints, not enforced — the user enters VPs manually).
 *
 * Glorious Deeds: in canon each Deed adds 1D6 to the Promotion Pool for
 * campaign games. Some Deeds also award +1 XP to the LEADER (Hold Your
 * Ground, Victory or Death). We track this via a `awardsLeaderXP` flag.
 */
export const SCENARIOS_CATALOG = {
  'hold-the-line': {
    name: 'I — Claim No Man\'s Land',
    summary: 'Batalla por el control de un tramo de tierra: expulsa a tus enemigos. Sin restricciones de Force.',
    numTurns: 4,
    archetype: 'hold-ground',
    vpHints: '2 VPs por cada Objective que controles al final de cada turno · 1 VP por Glorious Deed · victoria inmediata si el rival no tiene modelos en el campo o huye (Morale)',
    deeds: [
      { name: 'Bloodletting', desc: 'un ataque de un modelo amigo pone el sexto BLOOD MARKER a un enemigo.' },
      { name: 'Cast Them Down', desc: 'Un modelo amigo hace que un enemigo caiga (Fall) desde al menos 3" de altura.' },
      { name: 'Hold Your Ground', desc: 'Tu banda es la primera en superar un Morale Check en la partida. 1 VP; en campaña, 1 XP a un ELITE con LEADER.', awardsLeaderXP: true },
      { name: 'Lord of War', desc: 'un modelo amigo deja a dos enemigos Out of Action con Melee Attacks en un mismo turno.' },
      { name: 'Resist and Bite', desc: 'Un modelo amigo que empezó su activación Down deja a un enemigo Out of Action en esa misma activación.' },
      { name: 'Sniper', desc: 'Un modelo amigo deja Out of Action a un ELITE enemigo con un Ranged Attack con los modificadores de Long Range y Cover.' },
      { name: 'Suicidal Bravery', desc: 'un modelo amigo carga con éxito a dos modelos con el mismo movimiento de carga.' },
    ],
  },
  'hunt-heroes': {
    name: 'II — Hunt for Heroes',
    summary: 'Caza a los líderes enemigos mientras proteges a los tuyos. Ambos incluyen tantos ELITE como puedan; Assets y Marks secretos.',
    numTurns: 5,
    archetype: 'hunt-heroes',
    vpHints: 'Cada turno: 1 VP por Objective con un modelo tuyo a 1" y 1 VP por Objective que controles · al final: 1 VP por Glorious Deed, 2 VPs por Mark enemigo Out of Action, 3 VPs si tu Asset no cayó',
    deeds: [
      { name: 'Sharpshooter', desc: 'un modelo amigo en cobertura deja Out of Action a un ELITE enemigo con un Ranged Attack a Long Range.' },
      { name: 'Dangerous Fall', desc: 'un modelo amigo hace que un enemigo caiga en un cráter.' },
      { name: 'Death From Above', desc: 'Un modelo amigo deja a un enemigo Out of Action con un Melee Attack con el modificador de Diving Charge.' },
      { name: 'High Risk, High Reward', desc: 'un Asset deja Out of Action a un Mark enemigo (hay que revelar ambos).' },
      { name: 'Kill their Leaders', desc: 'dejar Out of Action a todos los Marks enemigos; cuenta para quien deja fuera al último.' },
    ],
  },
  'mines': {
    name: 'IV — Trench Warfare',
    summary: 'Asalta las trincheras o defiéndelas. Atacante = banda con más modelos; el defensor gasta la mitad de ducados.',
    numTurns: 5,
    archetype: 'assault-defense',
    hasRoles: true,
    deployLimit: { defender: 6, attacker: 9, hasReinforcements: true },
    vpHints: 'Cada turno: el defensor 1 VP por sección de trinchera de 8"+ con defensores (2 si no hay atacantes); el atacante 2 VPs por sección con atacantes (3 si no hay defensores) · 1 VP por Glorious Deed · dura 4 turnos y el atacante tira D6: con 3+ se juega el 5.º',
    deeds: [
      { name: 'Good Hunting', desc: 'un modelo amigo deja a un enemigo Out of Action con un Ranged Attack a Long Range.' },
      { name: 'Headshot', desc: 'un modelo amigo que se retiró antes en su activación deja Out of Action a uno de los enemigos de los que se retiró.' },
      { name: 'Hold Your Ground', desc: 'Tu banda es la primera en superar un Morale Check en la partida. 1 VP; en campaña, 1 XP a un ELITE con LEADER.', awardsLeaderXP: true },
      { name: 'Into the Trenches!', desc: 'un modelo amigo carga con éxito a un enemigo en una sección de trinchera y lo deja Out of Action con un Melee Attack.' },
      { name: 'Survive to Tell the Tale', desc: 'un modelo amigo sufre dos Injury Rolls por explosiones de minas y ninguna lo deja Out of Action.' },
      { name: 'Victory or Death', desc: 'Tu banda gana la partida. Solo en campaña y sin VP: 1 XP a un ELITE con LEADER.', awardsLeaderXP: true },
    ],
  },
  'resupply': {
    name: 'VII — Supply Raid',
    summary: 'Asalta los suministros enemigos o defiende tus depósitos. Atacante = banda con más modelos.',
    numTurns: 4,
    archetype: 'assault-defense',
    hasRoles: true,
    deployLimit: { defender: 6, attacker: 9, hasReinforcements: true },
    vpHints: 'Atacante: 1 VP por Supply Cache destruido · defensor: 2 VPs por Supply Cache intacto · ambos: 1 VP por enemigo Out of Action y 1 VP por Glorious Deed',
    deeds: [
      { name: 'Daring Raid (Attacker only)', desc: 'un modelo amigo destruye un Supply Cache Marker.' },
      { name: 'Hold Your Ground', desc: 'Tu banda es la primera en superar un Morale Check en la partida. 1 VP; en campaña, 1 XP a un ELITE con LEADER.', awardsLeaderXP: true },
      { name: 'Rampage (Attacker only)', desc: 'un modelo amigo destruye un segundo Supply Cache Marker.' },
      { name: 'Save the Supplies! (Defender only)', desc: 'quedan cuatro o más Supply Cache Markers sin destruir al final de la partida.' },
      { name: 'Stop Them! (Defender only)', desc: 'un modelo amigo deja Out of Action a un enemigo que está total o parcialmente en su propia zona de despliegue.' },
      { name: 'Victory or Death', desc: 'Tu banda gana la partida. Solo en campaña y sin VP: 1 XP a un ELITE con LEADER.', awardsLeaderXP: true },
    ],
  },
  'relic-hunt': {
    name: 'III — Relic Hunt',
    summary: 'Encuentra y asegura reliquias sagradas para la gloria de tu Patrón. Refuerzos D3 por turno; To the Death! (sin Morale Checks y nadie puede huir).',
    numTurns: 4,
    archetype: 'capture-hold',
    deployLimit: { normal: 6, hasReinforcements: true, bigBaseDoubleCost: true },
    noMoraleChecks: true,
    vpHints: 'Turnos 1-3: 1 VP por Reliquary reclamado (máx. 4 por turno) · turno 4: 2 VPs por Reliquary · 1 VP por Glorious Deed · victoria inmediata si el rival no tiene modelos tras los refuerzos',
    deeds: [
      { name: 'Blood Sacrifice', desc: 'un modelo amigo deja a tres enemigos Out of Action durante la partida.' },
      { name: 'Cast Them Down', desc: 'Un modelo amigo hace que un enemigo caiga (Fall) desde al menos 3" de altura.' },
      { name: 'Protect the Relic', desc: 'un modelo amigo deja Out of Action a un enemigo que está a 1" de un Reliquary Marker.' },
      { name: 'Relic Hunter', desc: 'un modelo amigo reclama dos Reliquaries distintos durante la partida.' },
      { name: 'Resist and Bite', desc: 'Un modelo amigo que empezó su activación Down deja a un enemigo Out of Action en esa misma activación.' },
      { name: 'Sniper', desc: 'Un modelo amigo deja Out of Action a un ELITE enemigo con un Ranged Attack con los modificadores de Long Range y Cover.' },
    ],
  },
  'from-below': {
    name: 'VIII — From Below',
    summary: 'Una Bestia duerme bajo el campo; extrae Ichor Vials de los Ichor Pits sin despertarla.',
    numTurns: 5,
    archetype: 'capture-hold',
    deployLimit: { normal: 'half-up', hasReinforcements: false },
    vpHints: '1 VP por Ichor Vial extraído y 1 VP por Glorious Deed · empate si la Bestia despierta · dura 4 turnos y con 3+ en D6 se juega el 5.º',
    deeds: [
      { name: 'Bloodlust', desc: 'un modelo amigo envenenado usa una Bloodbath Roll para dejar Out of Action a un enemigo envenenado.' },
      { name: 'For Science', desc: 'un modelo amigo extrae 3 Ichor Vials.' },
      { name: 'Ichor Frenzy', desc: 'un modelo amigo extrae un Ichor Vial estando totalmente dentro de la zona de despliegue enemiga.' },
      { name: 'Risk Taker', desc: 'un modelo amigo provoca una explosión que deja a 2 o más enemigos Out of Action.' },
      { name: 'Sadistic Wretch', desc: 'un modelo amigo deja a un enemigo Out of Action haciéndole entrar en un Ichor Pit.' },
      { name: 'Vial Thief', desc: 'un modelo amigo roba un Ichor Vial a un enemigo y consigue extraerlo.' },
    ],
  },
  'dont-breathe': {
    name: 'X — Don\'t Breathe',
    summary: 'Asalta búnkeres enemigos entre nubes de gas mostaza o rechaza a los atacantes. Atacante = banda con más modelos.',
    numTurns: 6,
    archetype: 'assault-defense',
    hasRoles: true,
    deployLimit: { defender: 6, attacker: 9, hasReinforcements: true },
    vpHints: 'Cada turno: defensor 1 VP por sección de trinchera de 8"+ con defensores (2 sin atacantes); atacante 2 VPs por sección con atacantes (3 sin defensores) y 2 VPs por Bunker destruido con Demo Charge · al final: 1 VP por Glorious Deed y 4 VPs por Bunker controlado · dura 5 turnos y con 3+ en D6 se juega el 6.º',
    deeds: [
      { name: 'Burning Sight', desc: 'un modelo amigo hace explotar un Gas Cloud Marker a más de 14" y la explosión deja a un enemigo o más Out of Action.' },
      { name: 'Combustive', desc: 'un modelo amigo hace explotar un Gas Cloud Marker y la explosión deja a dos o más enemigos Out of Action.' },
      { name: 'Deep Breaths', desc: 'un modelo amigo deja a un enemigo Out of Action haciéndole moverse a 6" del centro de un Gas Cloud Marker.' },
      { name: 'Iron Lungs', desc: 'tu banda controla un Bunker a 6" del centro de un Gas Cloud Marker al final de dos turnos seguidos.' },
      { name: 'Poisonous Rage', desc: 'un modelo amigo a 6" del centro de un Gas Cloud deja a un enemigo Out of Action con un Melee Attack.' },
    ],
  },
  'capture-hold': {
    name: 'XI — The High Ground (entrada duplicada)',
    summary: 'Duplicado de XI — The High Ground (antes "X — Capture and Hold", que no existe en el Rulebook 1.0.2). Se conserva para las partidas guardadas.',
    numTurns: 5,
    archetype: 'capture-hold',
    vpHints: '1 VP por enemigo Out of Action con Diving Charge · 2 VPs por Objective controlado al final de cada turno · al final: 1 VP por Glorious Deed, 3 VPs si controlas el Top Priority rival y 3 VPs si controlas el tuyo',
    deeds: [
      { name: 'Back to the Mud', desc: 'un modelo amigo hace caer a un enemigo que está sobre un Objetivo y la caída lo deja Out of Action.' },
      { name: 'Death From Above', desc: 'Un modelo amigo deja a un enemigo Out of Action con un Melee Attack con el modificador de Diving Charge.' },
      { name: 'Down with You', desc: 'un modelo amigo sobre un Objetivo deja Out of Action con un Ranged Attack a un enemigo sobre otro Objetivo más alto.' },
      { name: 'Victory or Death', desc: 'Tu banda gana la partida. Solo en campaña y sin VP: 1 XP a un ELITE con LEADER.', awardsLeaderXP: true },
      { name: 'King of the Hill', desc: 'un modelo ha estado sobre los cinco Objetivos.' },
    ],
  },
  'high-ground': {
    name: 'XI — The High Ground',
    summary: 'Captura el terreno alto a toda costa. Cinco Objectives elevados y un Top Priority Objective secreto por jugador.',
    numTurns: 5,
    archetype: 'high-ground',
    vpHints: '1 VP por enemigo Out of Action con Diving Charge · 2 VPs por Objective controlado al final de cada turno · al final: 1 VP por Glorious Deed, 3 VPs si controlas el Top Priority rival y 3 VPs si controlas el tuyo',
    deeds: [
      { name: 'Back to the Mud', desc: 'un modelo amigo hace caer a un enemigo que está sobre un Objetivo y la caída lo deja Out of Action.' },
      { name: 'Death From Above', desc: 'Un modelo amigo deja a un enemigo Out of Action con un Melee Attack con el modificador de Diving Charge.' },
      { name: 'Down with You', desc: 'un modelo amigo sobre un Objetivo deja Out of Action con un Ranged Attack a un enemigo sobre otro Objetivo más alto.' },
      { name: 'Victory or Death', desc: 'Tu banda gana la partida. Solo en campaña y sin VP: 1 XP a un ELITE con LEADER.', awardsLeaderXP: true },
      { name: 'King of the Hill', desc: 'un modelo ha estado sobre los cinco Objetivos.' },
    ],
  },
  'great-war': {
    name: 'XII — Great War',
    summary: 'Se ha dado la orden de asalto general: aniquila al enemigo. Sin Glorious Deeds.',
    numTurns: 5,
    archetype: 'great-war',
    noMoraleChecks: true,
    vpHints: 'VPs por cada enemigo Out of Action = su coste en 👑 / 10 o en ☼ / 3 (redondeando arriba), con Battlekit y Glory Items · victoria inmediata si el rival no tiene modelos',
    deeds: [],  // Great War has no Glorious Deeds in canon
  },
  // Nombres, turnos, VPs y Glorious Deeds según el Rulebook 1.0.2.
  'armoured-train': {
    name: 'V — Armoured Train',
    summary: 'Dos bandas se disputan un tren acorazado descarrilado cargado de botín y munición. En campaña, Field Strength 15; tablero de 48"×48".',
    numTurns: 5,
    archetype: 'assault-defense',
    hasRoles: true,
    deployLimit: { defender: 6, attacker: 9, hasReinforcements: true },
    vpHints: 'Al final: 1 VP por Glorious Deed, 1 VP por caja de la que sacaste suministros, 2 VPs por caja destruida y 3 VPs por caja con la que escapaste',
    deeds: [
      { name: 'King of the Hill', desc: 'un modelo amigo termina 3 turnos seguidos sobre un terraplén o el puente y a 3" de un vagón.' },
      { name: 'Meat-Grinder', desc: 'un modelo amigo deja a 3 enemigos Out of Action con Ranged Attacks de la Gun Battery.' },
      { name: 'No Stone Left Unturned', desc: 'un modelo amigo abre dos vagones distintos.' },
      { name: 'Over the Enemy Line', desc: 'un modelo amigo escapa con una caja estando totalmente dentro de la zona de despliegue enemiga.' },
      { name: 'Supply Run', desc: 'dos modelos amigos escapan con una caja; cuenta para el que escapa con la segunda.' },
    ],
  },
  'dragon-hunt': {
    name: 'VI — Dragon Hunt',
    summary: 'Por la gloria de tu Patrón, caza a una criatura monstruosa (un tanque poseído o una bestia infernal). Requiere un Dragón y 6 Peasants.',
    numTurns: 5,
    archetype: 'hunt-heroes',
    vpHints: '2 VPs por Peasant Out of Action · 3 VPs si tu ataque deja Down al Dragón · 6 VPs si lo dejas Out of Action · 1 VP por Glorious Deed · empate si el Dragón sale del campo · dura 4 turnos y con 3+ en D6 se juega el 5.º',
    deeds: [
      { name: 'Dragon Slayer', desc: 'un modelo amigo encima del Dragón lo deja Out of Action con un Melee Attack. Da 2 ☼.' },
      { name: 'Fire with Fire', desc: 'un ataque amigo con FIRE, GAS y/o SHRAPNEL pone 2 BLOOD MARKERS al Dragón.' },
      { name: 'Genocidal', desc: 'un modelo deja a 3 Peasants Out of Action.' },
      { name: 'Opportunist', desc: 'un modelo está a 3" de un Peasant cuando el Dragón lo pisotea.' },
      { name: 'Off My Back', desc: 'un modelo amigo deja Down a un modelo que está encima del Dragón y este cae.' },
    ],
  },
  'fields-of-glory': {
    name: 'IX — Fields of Glory',
    summary: 'Demuestra tu poder y valor en las líneas de trinchera. Lucha hasta una muerte gloriosa.',
    numTurns: 4,
    archetype: 'great-war',
    vpHints: '1 VP por Glorious Deed · +1 VP extra por Elite Hunter, Personal Revenge y Risk It All · +2 VPs extra por Trench Raider',
    deeds: [
      { name: 'Death From Above', desc: 'Un modelo amigo deja a un enemigo Out of Action con un Melee Attack con el modificador de Diving Charge.' },
      { name: 'Elite Hunter', desc: 'un modelo amigo deja Out of Action a dos enemigos ELITE.' },
      { name: 'No Escape', desc: 'un modelo amigo carga con éxito a un enemigo que no tenía en Line of Sight al empezar su activación.' },
      { name: 'Personal Revenge', desc: 'un modelo amigo usa una Bloodbath Roll para dejar Out of Action a un enemigo que antes dejó fuera a un amigo.' },
      { name: 'Reaper', desc: 'un modelo amigo deja a tres enemigos Out of Action.' },
      { name: 'Risk It All', desc: 'un modelo amigo hace dos Risky Success Rolls en la misma activación y ambas son Success o Critical Success.' },
      { name: 'The Real Killer', desc: 'un modelo amigo deja Out of Action a un enemigo que está en terreno Dangerous o Difficult.' },
      { name: 'Trench Raider', desc: 'tu banda captura una sección de trinchera de al menos 6" totalmente a 8" de la zona de despliegue enemiga.' },
    ],
  },
};

export const BATTLE_SESSIONS_KEY = 'wf_battle_sessions';

export function _loadRawBattleSessions() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(BATTLE_SESSIONS_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

export function _saveRawBattleSessions(sessions) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BATTLE_SESSIONS_KEY, JSON.stringify(sessions));
    }
  } catch (e) {
    console.warn('Battle sessions save failed:', e);
  }
}

/**
 * Creates a new battle session for the given warband + scenario.
 * Initializes per-model state with alive status + zero counters.
 */
export function createBattleSession(opts) {
  opts = opts || {};
  const wb = opts.warband;
  const scenarioId = opts.scenarioId;
  if (!wb || !scenarioId) {
    throw new Error('createBattleSession requires { warband, scenarioId }');
  }
  const scenario = SCENARIOS_CATALOG[scenarioId];
  if (!scenario) {
    throw new Error('Unknown scenario: ' + scenarioId);
  }

  const modelStates = {};
  for (const m of (wb.models || [])) {
    modelStates[m.uid] = {
      uid: m.uid,
      name: m.name,
      unitId: m.unitId,
      isElite: !!(m.companionKeywords || []).find(kw => /elite/i.test(kw.name || kw)),
      isLeader: !!(m.companionKeywords || []).find(kw => /leader/i.test(kw.name || kw)),
      cost: m.companionCost || 0,
      status: 'alive',         // 'alive' | 'down' | 'out'
      bloodMarkers: 0,
      kills: 0,
      deedsCompleted: [],      // names from scenario.deeds
      notes: '',
    };
  }

  return {
    id: 'btl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    startedAt: Date.now(),
    finishedAt: null,
    scenarioId,
    scenarioName: scenario.name,
    numTurns: scenario.numTurns,
    warbandId: wb.id || null,
    warbandName: wb.name || '—',
    factionId: wb.factionId || null,
    turn: 1,
    vps: { you: 0, them: 0 },
    modelStates,
    scenarioDeedsCompleted: [],   // global deeds completed (e.g., for Promotion Pool count)
    notes: '',
    finished: false,
    outcome: null,                // 'win' | 'loss' | 'draw'
    rivalLabel: opts.rivalLabel || null,
  };
}

/**
 * Persists a battle session to localStorage. If a session with the same id
 * exists, it's replaced; otherwise it's appended.
 */
export function saveBattleSession(session) {
  if (!session || !session.id) return;
  const all = _loadRawBattleSessions();
  const idx = all.findIndex(s => s && s.id === session.id);
  if (idx >= 0) all[idx] = session;
  else all.push(session);
  _saveRawBattleSessions(all);
}

export function loadBattleSession(id) {
  if (!id) return null;
  const all = _loadRawBattleSessions();
  return all.find(s => s && s.id === id) || null;
}

export function listBattleSessions() {
  return _loadRawBattleSessions();
}

export function deleteBattleSession(id) {
  const all = _loadRawBattleSessions();
  const filtered = all.filter(s => s && s.id !== id);
  _saveRawBattleSessions(filtered);
}

/**
 * Computes XP per model per canon (Trench Crusade Digital Rulebook page 105):
 *   - Each ELITE model that took part and survived gains 1 XP, even if OoA
 *   - Each ELITE that performed at least 1 Glorious Deed gains a 2nd XP
 *     (no more for multiple Deeds)
 *   - Non-ELITE Troops do not gain XP through this mechanism (they get
 *     Promotion Dice instead)
 *
 * Returns map { [modelUid]: xp }. Only ELITE models get a non-zero entry.
 *
 * Note: "survived" in canon includes "even if they were taken Out of Action"
 * — the model is OoA in the battle but did not die in the post-battle Trauma
 * step. In our session, status='out' represents OoA which still counts as
 * survived for XP purposes.
 */
export function computeBattleXP(session, warband) {
  if (!session || !session.modelStates) return {};
  const xp = {};
  for (const [uid, ms] of Object.entries(session.modelStates)) {
    if (!ms.isElite) continue;
    // Took part = participated. We assume all models in the session participated.
    // Survived = anything except status === 'dead' (we don't have this status,
    // but trauma step would mark it). For now, OoA still gets +1 XP.
    let modelXP = 1;
    if (ms.deedsCompleted && ms.deedsCompleted.length >= 1) {
      modelXP += 1;
    }
    xp[uid] = modelXP;
  }
  return xp;
}

/**
 * Applies the XP from a finished battle session to the warband models'
 * baseProgression. Mutates wb.models in-place. Returns a summary
 * { applied, totalXP, perModel, alreadyApplied }.
 *
 * Idempotent: marks session.xpApplied=true so calling twice has no effect.
 *
 * Per canon (Trench Crusade Digital Rulebook page 105):
 *   - Each ELITE survivor gains 1 XP (even if OoA)
 *   - +1 additional if ELITE completed ≥1 Glorious Deed (max +1 extra)
 *   - Troops do not gain XP through this mechanism; they enter the
 *     Promotion Pool roll instead.
 */
export function applyBattleXPToWarband(session, warband) {
  if (!session || !warband || !warband.models) {
    return { applied: 0, totalXP: 0, perModel: {}, alreadyApplied: false };
  }
  if (session.xpApplied === true) {
    return { applied: 0, totalXP: 0, perModel: {}, alreadyApplied: true };
  }
  const xp = computeBattleXP(session, warband);
  const perModel = {};
  let totalXP = 0;
  let applied = 0;
  for (const [uid, awardedXP] of Object.entries(xp)) {
    const model = warband.models.find(m => m.uid === uid);
    if (!model) continue;
    if (!model.baseProgression) {
      model.baseProgression = { xp: 0, advancements: [], scars: [] };
    }
    if (typeof model.baseProgression.xp !== 'number') {
      model.baseProgression.xp = 0;
    }
    model.baseProgression.xp += awardedXP;
    perModel[uid] = {
      name: model.name,
      xpGained: awardedXP,
      xpTotal: model.baseProgression.xp,
    };
    totalXP += awardedXP;
    applied += 1;
  }
  session.xpApplied = true;
  // Persist immediately if save fn is available (no-op in tests)
  try {
    if (typeof saveBattleSession === 'function') saveBattleSession(session);
  } catch (e) {}
  return { applied, totalXP, perModel, alreadyApplied: false };
}

/**
 * Deploys a reinforcement model from the bench during an active session.
 * Removes the uid from session.benchModelUids and adds an entry to
 * session.modelStates marked isReinforcement=true.
 *
 * Caller must ensure: session is active (not finished), uid is in bench.
 * Returns { success, error?, modelState? }.
 */
export function deployReinforcement(session, modelUid) {
  if (!session) return { success: false, error: 'No session' };
  if (session.finished) return { success: false, error: 'Session finished' };
  if (!Array.isArray(session.benchModelUids) || session.benchModelUids.length === 0) {
    return { success: false, error: 'No bench available' };
  }
  if (!session.benchModelUids.includes(modelUid)) {
    return { success: false, error: 'UID not in bench' };
  }
  // Find the model data from session.benchSourceModels (set when entering
  // the game with a filtered warband — the picker stores them).
  const sourceModel = (session.benchSourceModels || []).find(m => m.uid === modelUid);
  if (!sourceModel) {
    return { success: false, error: 'Bench source data missing' };
  }
  // Build model state matching createBattleSession's shape
  session.modelStates[modelUid] = {
    uid: modelUid,
    name: sourceModel.name,
    unitId: sourceModel.unitId,
    isElite: !!(sourceModel.companionKeywords || []).find(kw => /elite/i.test(kw.name || kw)),
    isLeader: !!(sourceModel.companionKeywords || []).find(kw => /leader/i.test(kw.name || kw)),
    cost: sourceModel.companionCost || 0,
    status: 'alive',
    bloodMarkers: 0,
    kills: 0,
    deedsCompleted: [],
    notes: '',
    isReinforcement: true,
    deployedOnTurn: session.turn,
  };
  // Remove from bench
  session.benchModelUids = session.benchModelUids.filter(u => u !== modelUid);
  return { success: true, modelState: session.modelStates[modelUid] };
}


