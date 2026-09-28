/* ======================================================================
   BATTLE LAB — SIMULATOR CORE (Phase B)
   ----------------------------------------------------------------------
   Toma una warband importada de Companion (con todas sus stats, equipment
   y keywords ya resueltos) y la convierte en un BattleModel para simular
   batallas estadísticamente. El simulador apoya nuestras decisiones
   tácticas: ¿esta lista mata mejor a X o a Y?, ¿conviene cambiar el
   Heavy Flamethrower por un Machine Gun?, etc.

   IMPORTANTE: el simulador es UNA APROXIMACIÓN ESTADÍSTICA. No modela:
     - Posicionamiento ni line of sight
     - Escenarios con objetivos (asume "claim no man's land")
     - ACTIONs especiales (Hold Your Fire!, Puppet Master, etc.)
     - Habilidades complejas (INFILTRATOR, Levitate, etc.)
     - Algunas keywords de armas se simplifican (BLAST, GAS contextual)
   La banda real probablemente rinde +5 a +8pp por encima del simulador
   debido a estas omisiones (caveat documentado al usuario en la UI).

   Bug fix conocido respecto a la versión original del analyzer:
     - scaleEnemyBand: capa el número de modelos al canon
       warbandThresholdByGame (Game 8: ~13 fieldStrength). Antes generaba
       hordas absurdas (100+ Thralls a 1700 ducats).
     - NEGATE HEAVY se respeta correctamente (modelHasNegateHeavyForBattle).
   ====================================================================== */

/**
 * Parses a Companion stat string into an integer.
 * Examples: "+2" → 2, "0" → 0, "-1" → -1, "" → 0.
 */
function parseStatToInt(s) {
  if (s == null) return 0;
  const t = String(s).trim().replace('+', '');
  const n = parseInt(t, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Returns true if a battle model should ignore the HEAVY rule (max 1 HEAVY).
 * STRONG → NEGATE HEAVY per canon; explicit NEGATE HEAVY also counts.
 * Companion already resolves these in the JSON, so we just check the keyword set.
 */
function modelHasNegateHeavyForBattle(bm) {
  if (!bm || !bm.keywords) return false;
  return bm.keywords.has('NEGATE HEAVY')
      || bm.keywords.has('NEGATE_HEAVY')
      || bm.keywords.has('STRONG');
}

/**
 * Returns true if `bm` is immune to FEAR (charging fear targets does not
 * trigger the Risky Success Roll). Source: NEGATE FEAR keyword from canon
 * (rulebook + Companion).
 */
function modelHasNegateFear(bm) {
  if (!bm || !bm.keywords) return false;
  return bm.keywords.has('NEGATE FEAR')
      || bm.keywords.has('NEGATE_FEAR');
}

/**
 * FEAR (Keyword Glossary, Rulebook 1.0.2): -1 DICE a los ataques cuerpo a
 * cuerpo contra un modelo con FEAR. Los modelos que causan FEAR son inmunes,
 * igual que los que tienen NEGATE FEAR.
 *
 * @param {Object} attacker  battle model
 * @param {Object} target    battle model (the target being engaged)
 * @returns {number} -1 o 0 (modificador de DICE)
 */
function modelFearDiceMod(attacker, target) {
  if (!target || !target.fear) return 0;
  if (attacker && (attacker.fear || (attacker.keywords && attacker.keywords.has('FEAR')))) return 0;
  if (modelHasNegateFear(attacker)) return 0;
  // Onward Christian Soldiers! aura: if attacker is NEW ANTIOCH and any
  // friendly Cleric with onwardChristianSoldiers is alive on its band,
  // attacker gets effective NEGATE FEAR (canon: aura at 8" range, abstracted
  // to band-wide because we don't model space).
  if (attacker && attacker._band && attacker.keywords && attacker.keywords.has('NEW ANTIOCH')) {
    const cleric = attacker._band.find(m =>
      m && !m.isOut && m.onwardChristianSoldiers
    );
    if (cleric) return 0;
  }
  return -1;
}

/**
 * Returns true if `bm` has the INFILTRATOR keyword. Used by the sim to
 * advance an INFILTRATOR's effective opening phase from 'long' to 'mid'
 * (representing forward deployment).
 */
function modelHasInfiltrator(bm) {
  if (!bm || !bm.keywords) return false;
  return bm.keywords.has('INFILTRATOR');
}

/**
 * Returns true if a model has the "Hold Your Fire!" ACTION (canon: New
 * Antioch Lieutenant). The Lieutenant can spend their Activation to point
 * at an enemy model, which the opponent MUST then activate next. Useful
 * for blunting a high-priority target's effectiveness.
 *
 * Detection: the ability is identified either by Companion ability-id
 * (`ab_holdyourfire`) or by name (`hold your fire!`). To make the helper
 * easy to test, we look at TWO optional fields: bm._abilityIds and
 * bm._abilityNames (both Sets), populated by companionModelToBattleModel.
 */
function modelHasHoldYourFire(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_holdyourfire')) return true;
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('hold your fire!')) return true;
    if (bm._abilityNames.has('hold your fire')) return true;
  }
  return false;
}

/**
 * Shock Charge (Highland Shocktrooper): canon — when rolling Charge Bonus,
 * roll an extra D6 and use the highest. Sim abstraction: the model can
 * attack in melee in phase='long' (its effective phase upgrades to 'mid'
 * for melee purposes — paralel to INFILTRATOR's deployment advantage,
 * but only for charges).
 */
function modelHasShockCharge(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_shockcharge')) return true;
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('shock charge')) return true;
  }
  return false;
}

/**
 * God is With Us! (Trench Cleric): canon — Cleric spends Activation, makes
 * Risky Roll. On Success, places a BLESSING MARKER. The marker can be
 * spent by any allied model to add +1 DICE to a Success Roll. Sim:
 * per-band `_blessingPool` count. The Cleric's activation increments it
 * (~52% chance, the base Risky Success rate at 0 DICE).
 */
function modelHasGodIsWithUs(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has) {
    if (bm._abilityIds.has('ab_godiswithusaction')) return true;
    if (bm._abilityIds.has('ab_godiswithus')) return true;
  }
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('god is with us!')) return true;
    if (bm._abilityNames.has('god is with us! action')) return true;
    if (bm._abilityNames.has('god is with us')) return true;
  }
  return false;
}

/**
 * Onward Christian Soldiers! (Trench Cleric): canon — friendly NEW ANTIOCH
 * models within 8" of Cleric have NEGATE FEAR. Without spatial modeling we
 * approximate as: if any Cleric with this aura is alive on the band side,
 * ALL NA-allied models gain effective NEGATE FEAR. (Mild over-approximation
 * — in mesa real, models could be out of 8" — but symmetric with how we
 * model other passive auras.)
 */
function modelHasOnwardChristianSoldiers(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has) {
    if (bm._abilityIds.has('ab_onwardchristiansoldiers')) return true;
    if (bm._abilityIds.has('ab_onwardchristiansoldiers!')) return true;
  }
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('onward christian soldiers!')) return true;
    if (bm._abilityNames.has('onward christian soldiers')) return true;
  }
  return false;
}

/**
 * Memento Mori (Trench Pilgrims War Prophet, passive): the first time the
 * model would suffer an Out of Action, treat it as No Effect instead. Sim:
 * model.mementoMori → on first OoA, set mementoMoriUsed=true and skip the
 * isOut transition.
 */
function modelHasMementoMori(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_mementomori')) return true;
  if (bm._abilityNames && bm._abilityNames.has && bm._abilityNames.has('memento mori')) return true;
  return false;
}

/**
 * Dark Blessing (Heretic Legions Wretched, passive): when a Wretched is
 * taken Out of Action, place 1 BLESSING MARKER beside the nearest friendly
 * model with the ELITE and HERETIC keywords. Sim: on OoA, increment band
 * _blessingPool by 1 (we don't model spatial proximity; the pool is shared
 * by the band, only consumed by allies on Failure rolls).
 */
function modelHasDarkBlessing(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_darkblessing')) return true;
  if (bm._abilityNames && bm._abilityNames.has && bm._abilityNames.has('dark blessing')) return true;
  return false;
}

/**
 * Laying on of Hands (Trench Cleric / War Prophet ACTION): Risky Roll. On
 * Success, remove 1 BLOOD MARKER from a friendly model within 6". On
 * Critical Success, remove 3 BLOOD MARKERS instead. Sim: when the model
 * activates and at least one ally has bloodMarkers > 0, spend the activation
 * healing (~50% chance of full Risky success).
 */
function modelHasLayingOnOfHands(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_layingonofhands')) return true;
  if (bm._abilityNames && bm._abilityNames.has && bm._abilityNames.has('laying on of hands')) return true;
  return false;
}

/**
 * Set Mine ACTION (Combat Engineer / Sultanate Sapper / Stosstruppen
 * Engineer): canon — Success Roll +2 DICE → terrain gets MINED. Sim:
 * engineer in long phase, ~80% chance of adding 1 mine to band's mine pool.
 */
function modelHasSetMine(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has) {
    if (bm._abilityIds.has('ab_setmineaction')) return true;
    if (bm._abilityIds.has('ab_setmine')) return true;
  }
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('set mine action')) return true;
    if (bm._abilityNames.has('set mine')) return true;
  }
  return false;
}

/**
 * NEGATE MINED keyword: model is unaffected by MINED. Combat Engineer,
 * Sultanate Sapper, etc. have this innately.
 */
function modelHasNegateMined(bm) {
  if (!bm || !bm.keywords) return false;
  return bm.keywords.has('NEGATE MINED');
}

/**
 * Defuse Mine (passive trigger, Combat Engineer / Sultanate Sapper): canon
 * — when moving into a MINED marker, can take Risky Roll. Success → mine
 * removed. Failure → detonate. Sim: when an engineer charges into an enemy
 * band with mines, attempts defuse first.
 */
function modelHasDefuseMine(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has) {
    if (bm._abilityIds.has('ab_defusemine')) return true;
  }
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('defuse mine')) return true;
  }
  return false;
}

/**
 * Puppet Master ACTION (Heretic Priest, Heretic Legions): canon — Risky
 * Roll. Failure → activation ends. Success → pick model (friend or foe)
 * within 12" + LoS, move D6" in straight line. Doesn't count as charging.
 *
 * Sim abstraction (no positions): on success, pull an enemy ELITE out of
 * cover → +1 BLOOD MARKER on that enemy (represents being repositioned to
 * a vulnerable spot + hit by a Heretic ally).
 *
 * Knights of Avarice variant has Price of Greed instead (Risky → Injury
 * Roll on enemy, +1 INJURY DICE per -1 INJURY MODIFIER).
 */
function modelHasPuppetMaster(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has) {
    if (bm._abilityIds.has('ab_puppetmaster')) return true;
    if (bm._abilityIds.has('ab_puppetmasteraction')) return true;
  }
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('puppet master')) return true;
    if (bm._abilityNames.has('puppet master action')) return true;
  }
  return false;
}

/**
 * Memento Mori (War Prophet, Trench Pilgrims): canon — the first time the
 * War Prophet suffers an Out of Action result on the Injury Table, it is
 * treated as a No Effect result instead. The War Prophet cannot have TOUGH.
 * Sim: applyInjury_lab consumes a `mementoUsed` flag the first time OoA
 * would happen, ignoring the result.
 */
function modelHasMementoMori(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_mementomori')) return true;
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('memento mori')) return true;
  }
  return false;
}

/**
 * Loudspeakers ACTION (War Prophet, Trench Pilgrims): canon — Risky+2 → on
 * Success, friendly models within 8" can move 3" toward the nearest visible
 * enemy. If they end within 1" they count as charging. Sim: in phase=long,
 * if WP alive and passes Risky+2 (~83% success rate), all PILGRIM allies
 * gain effective 'engagement' phase for melee — paralel to Shock Charge but
 * faction-wide.
 */
function modelHasLoudspeakers(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has) {
    if (bm._abilityIds.has('ab_loudspeakersaction')) return true;
    if (bm._abilityIds.has('ab_loudspeakers')) return true;
  }
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('loudspeakers action')) return true;
    if (bm._abilityNames.has('loudspeakers')) return true;
  }
  return false;
}

/**
 * Dark Blessing (Wretched, Heretic Legions): canon — when a Wretched is
 * taken Out of Action, place 1 BLESSING MARKER next to the nearest friendly
 * model with the ELITE and HERETIC Keywords. Sim: when a model with
 * darkBlessing flag goes OoA, increment the band's _blessingPool by 1
 * (provided at least one ELITE+HERETIC ally is alive to receive it).
 */
function modelHasDarkBlessing(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_darkblessing')) return true;
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('dark blessing')) return true;
  }
  return false;
}

/**
 * Battlefield Demolition (Combat Engineer, New Antioch): canon — Combat
 * Engineers ignore HEAVY for 1 Satchel Charge. Still limited to 1 HEAVY
 * weapon total. Sim: model with battlefieldDemolition flag treats one of
 * its HEAVY ranged weapons as if it had NEGATE HEAVY (no movement filter).
 */
function modelHasBattlefieldDemolition(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has && bm._abilityIds.has('ab_battlefielddemolition')) return true;
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('battlefield demolition')) return true;
  }
  return false;
}

/**
 * Voice of God ACTION (Observer Mercenary, NA + Pilgrims): canon —
 * Risky Success Roll. On Success: pick 1 model (friend or foe) anywhere
 * on the battlefield that has not been Activated this Turn. The Observer's
 * Activation ends and the chosen model's Activation begins immediately.
 *
 * Sim abstraction: a band with an Observer effectively gets a "free"
 * extra activation per turn (~52% chance — base Risky Success rate at
 * 0 DICE) for its strongest unactivated ELITE. We model this as a
 * per-band Voice-of-God boost: each round, with probability ~0.5, the
 * band's strongest ELITE that hasn't activated yet gets a damage bonus
 * (representing the chained activation impact).
 *
 * Detection: Observer is identified by ability id `ab_voiceofgodaction`
 * or by name `voice of god action` / `voice of god`.
 */
function modelHasVoiceOfGod(bm) {
  if (!bm) return false;
  if (bm._abilityIds && bm._abilityIds.has) {
    if (bm._abilityIds.has('ab_voiceofgodaction')) return true;
    if (bm._abilityIds.has('ab_voiceofgod')) return true;
  }
  if (bm._abilityNames && bm._abilityNames.has) {
    if (bm._abilityNames.has('voice of god action')) return true;
    if (bm._abilityNames.has('voice of god')) return true;
  }
  return false;
}

/**
 * Cover modifier from the terrain configuration. Called by ranged-attack
 * resolvers to decide whether the target is in cover (-1 DICE to attacker).
 *
 * Terrain modes (canon-aligned approximations):
 *   - 'open':  ~10% chance per attack of cover (some shell holes, bushes)
 *   - 'mixed': ~30% chance — default, balanced
 *   - 'urban': ~50% chance — dense, lots of walls/rubble
 *
 * Three "ignores" can negate cover:
 *   - attackerHasIgnoreCover: weapon keyword IGNORE COVER
 *   - attackerHasIgnoreDefendedObstacle + isCharge: keyword IGNORE DEFENDED
 *     OBSTACLE only neutralises cover when the attack is part of a charge
 *     (canon: Rampant Charge for Kingdom of Alba)
 *
 * Returns -1 if cover applies, 0 otherwise. Callers add this to diceMod.
 */
function applyTerrainCoverModifier(opts) {
  opts = opts || {};
  const terrain = opts.terrain || 'mixed';
  const probMap = { open: 0.10, mixed: 0.30, urban: 0.50 };
  const prob = probMap[terrain] !== undefined ? probMap[terrain] : 0.30;
  if (Math.random() >= prob) return 0;
  // Cover triggers; check for negators
  if (opts.attackerHasIgnoreCover) return 0;
  if (opts.attackerHasIgnoreDefendedObstacle && opts.isCharge) return 0;
  return -1;
}

/**
 * Per-terrain phase progression for the battle loop.
 *   - 'open':  faster engagement (shorter long phase)
 *   - 'mixed': default canon-style progression
 *   - 'urban': longer closing distance (more long phases before engagement)
 */
/**
 * Returns the phase sequence for a battle based on terrain and (optionally)
 * scenario archetype. Each "phase" is the abstract distance state at the
 * start of a round:
 *   - 'long':       both sides far apart, only LONG ranged weapons relevant.
 *                   HEAVY ranged weapons are usable here (no movement done).
 *   - 'mid':        models within MID range, can shoot or charge next round.
 *   - 'engagement': models in melee or about to be — close-quarters.
 *
 * Terrain modes (canon-aligned):
 *   - 'open':  short closing distance (most fights start near melee)
 *   - 'urban': longer closing distance (more long phases before engagement)
 *   - 'mixed': default balanced
 *
 * Scenario archetype modifies the sequence to reflect deployment dynamics:
 *   - 'hold-the-line':    defensive — model rooted in trench, much MORE
 *                         long phases (HEAVY weapons viable). Canon: defender
 *                         in I, fixed position.
 *   - 'assault-defense' (defender role): same as hold-the-line — entrenched
 *   - 'assault-defense' (attacker role): faster closing — fewer long phases
 *   - 'relic-hunt':       both sides converge on the centre — fewer long
 *                         phases, fast engagement (HEAVY penalised)
 *   - 'capture-hold':     similar to relic-hunt — objectives in the middle
 *   - 'from-below':       constrained deployment — fast engagement
 *   - 'hunt-heroes':      asymmetric — balanced default
 *   - 'great-war':        general assault, no objectives — balanced default
 */
function terrainPhases(terrain, scenarioCtx) {
  // Base sequence by terrain
  let base;
  switch (terrain) {
    case 'open':  base = ['mid', 'engagement', 'engagement', 'engagement', 'engagement', 'engagement']; break;
    case 'urban': base = ['long', 'long', 'mid', 'engagement', 'engagement', 'engagement']; break;
    case 'mixed':
    default:      base = ['long', 'mid', 'engagement', 'engagement', 'engagement', 'engagement']; break;
  }
  // No scenario override — return terrain-only sequence
  if (!scenarioCtx) return base;

  const archetype = scenarioCtx.archetype || scenarioCtx;
  const role = scenarioCtx.role || 'normal';

  // DEFENSIVE archetypes — model is rooted, mostly ENTRENCHED phases.
  // HEAVY ranged weapons are viable AND short-range (12") weapons can fire
  // because the enemy advances into range. Canon: defender in Hold the Line,
  // Assault-Defense (defender), or Resupply (defender).
  if (archetype === 'hold-the-line' ||
      (archetype === 'assault-defense' && role === 'defender')) {
    return ['entrenched', 'entrenched', 'entrenched', 'mid', 'engagement', 'engagement'];
  }

  // ASSAULTING attacker — closes faster but still uses long phase to
  // suppress before charging. Canon: attacker in Assault-Defense, Resupply.
  if (archetype === 'assault-defense' && role === 'attacker') {
    if (terrain === 'urban') return ['long', 'mid', 'mid', 'engagement', 'engagement', 'engagement'];
    return ['long', 'mid', 'engagement', 'engagement', 'engagement', 'engagement'];
  }

  // OBJECTIVE-RUSH archetypes — both sides converge on centre, very fast
  // engagement. HEAVY weapons are heavily penalised because models MUST
  // move to claim objectives. Canon: Relic Hunt, Capture-and-Hold,
  // Don't Breathe, From Below.
  if (archetype === 'capture-hold' || archetype === 'relic-hunt') {
    if (terrain === 'urban') return ['long', 'mid', 'engagement', 'engagement', 'engagement', 'engagement'];
    if (terrain === 'open')  return ['engagement', 'engagement', 'engagement', 'engagement', 'engagement', 'engagement'];
    return ['mid', 'engagement', 'engagement', 'engagement', 'engagement', 'engagement'];
  }

  // GREAT WAR / hunt-heroes — annihilation-focused, balanced default
  // applies here.
  return base;
}

/**
 * Internal: build a Set of normalised keywords from a list of {id,name} pairs.
 * Companion uses spaces ("NEGATE HEAVY"), legacy code expected underscores
 * ("NEGATE_HEAVY"). We store both forms so callers can use either.
 */
function _kwSetFromCompanion(arr) {
  const s = new Set();
  for (const k of (arr || [])) {
    const name = (k.name || k['keyword-name'] || '').toUpperCase();
    if (!name) continue;
    s.add(name);                      // "NEGATE HEAVY"
    s.add(name.replace(/ /g, '_'));   // "NEGATE_HEAVY"
  }
  return s;
}

/**
 * Best-effort lookup of a weapon's full data (range, dice, keywords) from
 * our canonical armoury. Companion provides equipment IDs like
 * 'eq_sniperrifle'; we map them to our internal IDs by name match.
 *
 * @param {Object} cmEq  Companion equipment {id, name, type}
 * @returns {Object|null}  weapon data or null if not found
 */
function lookupWeaponDataByName(cmEq) {
  if (!cmEq || !cmEq.name) return null;
  const target = cmEq.name.toLowerCase().trim();
  // Search across all factions' armouries
  for (const factionId of Object.keys(DATA.factions || {})) {
    const f = DATA.factions[factionId];
    const arm = f.armoury || {};
    const all = [...(arm.ranged || []), ...(arm.melee || []),
                 ...(arm.grenades || []), ...(arm.shields || []),
                 ...(arm.armour || []), ...(arm.equipment || [])];
    for (const item of all) {
      if (!item.name) continue;
      if (item.name.toLowerCase().trim() === target) return item;
    }
  }
  return null;
}

/**
 * Converts a Companion equipment entry into a BattleModel weapon entry.
 * Uses canonical data (our auditted armoury) when available; falls back
 * to a "stub" weapon with no keywords for unknown items.
 */
function companionEquipToBattleWeapon(cmEq) {
  const canonical = lookupWeaponDataByName(cmEq);
  const isWeapon = cmEq.type === 'melee weapon' || cmEq.type === 'ranged weapon'
                || cmEq.type === 'grenade';
  if (!isWeapon) return null;

  if (canonical) {
    // Parse range like "12\"", "12\"/Melee", "Melee", "6\"-36\""
    const rng = canonical.range || 'Melee';
    let range = 0;
    const isRanged = cmEq.type === 'ranged weapon' || cmEq.type === 'grenade';
    if (isRanged) {
      // Take first number from range string
      const mNum = String(rng).match(/(\d+)/);
      range = mNum ? parseInt(mNum[1], 10) : 12;
    }
    const kws = new Set();
    for (const k of (canonical.weaponKeywords || [])) {
      kws.add(String(k).toUpperCase());
    }
    // Extract numeric mods from keywords like "+1 DICE", "+2 INJURY DICE", etc.
    let diceMod = 0, injuryDice = 0, injuryMod = 0;
    for (const k of (canonical.weaponKeywords || [])) {
      const ks = String(k);
      const dMod = ks.match(/^([+-]\d+)\s+DICE$/);
      if (dMod) { diceMod = parseInt(dMod[1], 10); continue; }
      const idMod = ks.match(/^([+-]\d+)\s+INJURY DICE$/);
      if (idMod) { injuryDice = parseInt(idMod[1], 10); continue; }
      const imMod = ks.match(/^([+-]\d+)\s+INJURY MODIFIER$/);
      if (imMod) { injuryMod = parseInt(imMod[1], 10); continue; }
    }
    return {
      name: canonical.name,
      isRanged,
      range,
      diceMod,
      injuryDice,
      injuryMod,
      keywords: kws,
      // Flags de reglas especiales del arma (datos de la armería).
      critIgnoreArmour: !!canonical.critIgnoreArmour,
      shortRangeInjuryDice: canonical.shortRangeInjuryDice || 0,
      unnaturalInversion: !!canonical.unnaturalInversion,
    };
  }
  // Fallback for custom Companion items not in our catalogue
  return {
    name: cmEq.name,
    isRanged: cmEq.type === 'ranged weapon' || cmEq.type === 'grenade',
    range: cmEq.type === 'ranged weapon' ? 12 : 0,
    diceMod: 0,
    injuryDice: 0,
    injuryMod: 0,
    keywords: new Set(),
    customContent: true,
  };
}

/**
 * Converts a Companion-imported model (with companionStats/Equipment/etc)
 * into a BattleModel for the simulator.
 */
function companionModelToBattleModel(cm) {
  const stats = cm.companionStats || {};
  const meleeDice  = parseStatToInt(stats.melee);
  const rangedDice = parseStatToInt(stats.ranged);
  const armourBase = parseStatToInt(stats.armour);

  const weapons = [];
  for (const eq of (cm.companionEquipment || [])) {
    const w = companionEquipToBattleWeapon(eq);
    if (w) weapons.push(w);
  }

  const kws = _kwSetFromCompanion(cm.companionKeywords || []);
  const abilityIds = new Set((cm.companionAbilities || [])
    .map(a => a.id || ''));
  const abilityNames = new Set((cm.companionAbilities || [])
    .map(a => (a.name || '').toLowerCase()));

  // Mastery of the Elements (Jabirean Alchemist): when deployed, all of the
  // alchemist's weapons gain ONE chosen keyword: FIRE, GAS, or SHRAPNEL.
  // Heuristic choice: SHRAPNEL gives +BLOOD MARKERS on Down/Out, the strongest
  // damage boost vs medium-armoured targets common in TC. (FIRE/GAS only help
  // against the few targets without NEGATE FIRE/GAS.)
  if (abilityIds.has('ab_masteryoftheelements') ||
      abilityNames.has('mastery of the elements')) {
    const chosen = 'SHRAPNEL';
    for (const w of weapons) {
      if (!w.keywords.has(chosen)) {
        w.keywords.add(chosen);
      }
    }
  }

  // AMMUNITION (X) (canon): equipment items with the AMMUNITION keyword grant
  // their effect to a chosen ranged weapon for the game. We map known
  // ammunition items to their canonical effect and apply to the FIRST matching
  // ranged weapon the model carries (per canon constraints, e.g. Alchemical
  // Ammunition only works with Alaybozan/Halberd-Gun/Jezzail/Siege Jezzail).
  const ammoMap = {
    'alchemical ammunition': {
      // AMMUNITION (+1 DICE), restricted to Alaybozan/Halberd-Gun/Jezzail/Siege Jezzail
      effect: (w) => { w.diceMod += 1; },
      validFor: (wName) => /alaybozan|halberd-gun|jezzail/i.test(wName),
    },
    'dum-dum bullets': {
      // AMMUNITION (CRITICAL)
      effect: (w) => { w.keywords.add('CRITICAL'); },
      validFor: () => true,
    },
    'incendiary ammunition': {
      // AMMUNITION (FIRE)
      effect: (w) => { w.keywords.add('FIRE'); },
      validFor: () => true,
    },
    'tracer bullets': {
      // AMMUNITION (+1 DICE)
      effect: (w) => { w.diceMod += 1; },
      validFor: () => true,
    },
    'armour-piercing bullets': {
      // AMMUNITION (ARMOUR-PIERCING)
      effect: (w) => { w.keywords.add('ARMOUR-PIERCING'); },
      validFor: () => true,
    },
  };
  for (const eq of (cm.companionEquipment || [])) {
    if (eq.type !== 'equipment') continue;
    const ammoKey = (eq.name || '').toLowerCase();
    const spec = ammoMap[ammoKey];
    if (!spec) continue;
    // Apply effect to the FIRST ranged weapon matching the constraint.
    // Canon: a single ammunition is applied to one weapon for the game.
    const target = weapons.find(w => w.isRanged && spec.validFor(w.name));
    if (target) spec.effect(target);
  }

  return {
    name: cm.name || 'Unknown',
    cost: cm.companionCost || 0,
    movement: 6,  // assume infantry default; could parse from stats.move
    meleeDice,
    rangedDice,
    armour: Math.max(armourBase, -3),
    weapons,
    keywords: kws,
    counterCharge: abilityIds.has('ab_countercharge'),
    block: weapons.some(w => w.keywords.has('BLOCK')),
    fear:  kws.has('FEAR'),
    tough: kws.has('TOUGH'),
    artificialLife: kws.has('ARTIFICIAL'),
    regenerate: [...kws].some(k => k.startsWith('REGENERATE')) ? 1 : 0,
    negateFire: kws.has('NEGATE FIRE') || kws.has('NEGATE_FIRE'),
    negateGas:  kws.has('NEGATE GAS')  || kws.has('NEGATE_GAS'),
    negateShrapnel: kws.has('NEGATE SHRAPNEL') || kws.has('NEGATE_SHRAPNEL'),
    negateHeavy: modelHasNegateHeavyForBattle({ keywords: kws }),
    marksmanshipIronWall: abilityIds.has('rl_marksmanshipoftheironwall'),
    siegeTeam: abilityIds.has('rl_siegejezzailteams'),
    // Aim (Sniper Priest): the model attempts to aim before the first
    // ranged attack each Activation. Risky+2 success grants +2 DICE to
    // ranged for the rest of the activation. We model this in
    // activateModel_lab below.
    aim: abilityIds.has('ab_aim') ||
         abilityNames.has('aim') ||
         abilityNames.has('aim action'),
    // Hold Your Fire! (Highland Lieutenant): canon — the Lt spends their
    // entire Activation pointing at an enemy in LoS; that enemy MUST
    // activate next, sacrificing their own pace for the team. The sim
    // approximates this by: (1) the Lt does NOT attack this turn,
    // (2) the most threatening enemy is "marked" and emits 50% reduced
    // damage during their next activation. Implementation in
    // activateModel_lab + a per-target `_hyfMarked` flag consumed when
    // they next activate.
    holdYourFire: abilityIds.has('ab_holdyourfire') ||
                  abilityNames.has('hold your fire!') ||
                  abilityNames.has('hold your fire'),
    // Shock Charge (Highland Shocktrooper): canon — extra D6 to Charge
    // Bonus, use highest. Sim: melee in phase=long is allowed.
    shockCharge: abilityIds.has('ab_shockcharge') ||
                 abilityNames.has('shock charge'),
    // God is With Us! (Trench Cleric): canon — Risky Roll, on success
    // place a BLESSING MARKER usable by allies for +1 DICE.
    godIsWithUs: abilityIds.has('ab_godiswithusaction') ||
                 abilityIds.has('ab_godiswithus') ||
                 abilityNames.has('god is with us!') ||
                 abilityNames.has('god is with us! action') ||
                 abilityNames.has('god is with us'),
    // Onward Christian Soldiers! (Trench Cleric, aura): canon — friendly
    // NA models within 8" gain NEGATE FEAR. Sim: if Cleric alive in band,
    // all NA allies gain effective NEGATE FEAR.
    onwardChristianSoldiers:
                 abilityIds.has('ab_onwardchristiansoldiers') ||
                 abilityIds.has('ab_onwardchristiansoldiers!') ||
                 abilityNames.has('onward christian soldiers!') ||
                 abilityNames.has('onward christian soldiers'),
    // Memento Mori (War Prophet, Trench Pilgrims): canon — first OoA → No Effect.
    mementoMori: abilityIds.has('ab_mementomori') ||
                 abilityNames.has('memento mori'),
    // Loudspeakers ACTION (War Prophet): canon — Risky+2, allies within 8"
    // can move 3" toward enemy, can charge if reach 1". Sim: phase upgrade
    // for melee for PILGRIM allies in long phase.
    loudspeakers: abilityIds.has('ab_loudspeakersaction') ||
                  abilityIds.has('ab_loudspeakers') ||
                  abilityNames.has('loudspeakers action') ||
                  abilityNames.has('loudspeakers'),
    // Dark Blessing (Wretched): canon — when OoA, place BLESSING MARKER on
    // nearest ELITE+HERETIC ally. Sim: increment band _blessingPool on death.
    darkBlessing: abilityIds.has('ab_darkblessing') ||
                  abilityNames.has('dark blessing'),
    // Battlefield Demolition (Combat Engineer): canon — ignore HEAVY for
    // one Satchel Charge. Sim: effective NEGATE HEAVY for ranged weapons.
    battlefieldDemolition: abilityIds.has('ab_battlefielddemolition') ||
                           abilityNames.has('battlefield demolition'),
    // Set Mine ACTION (Combat Engineer / Sultanate Sapper / Stosstruppen):
    // canon — Success Roll +2 DICE → terrain gets MINED. Sim: engineer in
    // long phase, ~80% chance of adding 1 mine to band's pool.
    setMine: abilityIds.has('ab_setmineaction') ||
             abilityIds.has('ab_setmine') ||
             abilityNames.has('set mine action') ||
             abilityNames.has('set mine'),
    // Defuse Mine (Combat Engineer / Sultanate Sapper, passive trigger):
    // canon — Risky Roll on entering MINED. Success → defuse, Failure →
    // detonate. Sim: ~50% defuse rate when engineer charges into mined band.
    defuseMine: abilityIds.has('ab_defusemine') ||
                abilityNames.has('defuse mine'),
    // NEGATE MINED is set via keyword propagation (kw_negatemined). The
    // sim helper modelHasNegateMined() checks the keywords set directly.
    // Puppet Master ACTION (Heretic Priest): canon — Risky Roll. Success →
    // move any model D6" within 12" + LoS. Sim: ~50% success → +1 BLOOD
    // MARKER on enemy ELITE (represents pull out of cover + free hit).
    puppetMaster: abilityIds.has('ab_puppetmaster') ||
                  abilityIds.has('ab_puppetmasteraction') ||
                  abilityNames.has('puppet master') ||
                  abilityNames.has('puppet master action'),
    // Laying on of Hands ACTION (Trench Cleric / War Prophet): canon —
    // Success Roll. Success → remove 1 BLOOD MARKER from ally within 6".
    // Critical → remove 3. Sim: model spends activation healing if any
    // ally has bloodMarkers > 0.
    layingOnOfHands: abilityIds.has('ab_layingonofhandsaction') ||
                     abilityIds.has('ab_layingonofhands') ||
                     abilityNames.has('laying on of hands action') ||
                     abilityNames.has('laying on of hands'),
    // Voice of God ACTION (Observer Mercenary): canon — Risky Roll. Success
    // → choose any model (friend/foe) not yet activated this Turn. Observer
    // ends, chosen model activates immediately. Sim: per-band flag triggers
    // a chained-activation bonus once per turn (~50% chance) for the band's
    // strongest unactivated ELITE ally.
    voiceOfGod: abilityIds.has('ab_voiceofgodaction') ||
                abilityIds.has('ab_voiceofgod') ||
                abilityNames.has('voice of god action') ||
                abilityNames.has('voice of god'),
    // Expose the ability sets to detection helpers (e.g. modelHasHoldYourFire)
    // — these are NOT used by the sim engine directly, only by helper
    // functions that introspect the model.
    _abilityIds:   abilityIds,
    _abilityNames: abilityNames,
    bloodMarkers: 0,
    isDown: false,
    isOut: false,
  };
}

/**
 * Builds a battle band (array of BattleModels) from a Forge warband.
 * Uses companionModelToBattleModel for each model.
 */
function buildBattleBandFromWarband(wb) {
  if (!wb || !Array.isArray(wb.models)) return [];
  return wb.models.map(companionModelToBattleModel);
}


