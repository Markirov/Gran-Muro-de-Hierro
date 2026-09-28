/* ======================================================================
   FASE 7.1 — Warband battle history (free + campaign, chronological).

   Combines wb.freeBattles with battles from every campaign the warband
   participates in. Returns an array of items shaped for badge-aware
   rendering:
     { kind:'free'|'campaign', date, battle, campaign? }
   sorted ascending by date.

   Pure: the caller (UI or test) passes opts.campaigns. In real use the
   campaign list comes from loadCampaignIndex; tests inject a stub list.
   ====================================================================== */

/* Fase 7.4 — Lista de campañas donde una banda participa.
 * Filtrado puro sobre opts.campaigns con metadata mínima para badges
 * en una lista del panel banda.
 */
function getWarbandCampaigns(wb, opts) {
  if (!wb || !opts || !Array.isArray(opts.campaigns)) return [];
  const out = [];
  for (const c of opts.campaigns) {
    if (!c || !Array.isArray(c.warbandIds)) continue;
    if (!c.warbandIds.includes(wb.id)) continue;
    const battleCount = Array.isArray(c.battles) ? c.battles.length : 0;
    out.push({
      id: c.id,
      name: c.name || '(sin nombre)',
      battleCount,
      gameNumber: typeof c.gameNumber === 'number' ? c.gameNumber : null,
    });
  }
  return out;
}

function getWarbandBattleHistory(wb, opts) {
  if (!wb || !opts) return [];
  const items = [];
  // Free battles
  if (Array.isArray(wb.freeBattles)) {
    for (const fb of wb.freeBattles) {
      if (!fb) continue;
      const date = fb.completedAt || fb.timestamp || '';
      items.push({ kind: 'free', date, battle: fb });
    }
  }
  // Campaign battles where this warband participated
  const campaigns = Array.isArray(opts.campaigns) ? opts.campaigns : [];
  for (const c of campaigns) {
    if (!c || !Array.isArray(c.battles)) continue;
    for (const b of c.battles) {
      const parts = Array.isArray(b.participants) ? b.participants : [];
      if (!parts.some(p => p && p.warbandId === wb.id)) continue;
      items.push({
        kind: 'campaign',
        date: b.date || '',
        battle: b,
        campaign: { id: c.id, name: c.name },
      });
    }
  }
  // Sort ascending by date (string compare is fine for ISO/YYYY-MM-DD).
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return items;
}

function filterUnitsForContext(list, context) {
  if (!Array.isArray(list)) return [];
  if (context !== 'free') return list.slice();
  return list.filter(u => u && u.currency !== '☼');
}

function deleteCampaignWithConversion(c) {
  if (!c) return;
  const map = convertCampaignBattlesToFreeBattles(c);
  for (const wbId of Object.keys(map)) {
    if (typeof loadWarband !== 'function') break;
    const wb = loadWarband(wbId);
    if (!wb) continue;
    for (const fb of map[wbId]) {
      addFreeBattle(wb, fb);
    }
  }
  deleteCampaignStore(c.id);
}

/* ----- Warband state computation -----
 * Replays the battles and produces a per-warband state with
 * per-model XP, scars, advancements, kills, status. */
function emptyModelState() {
  return {
    xp: 0,
    kills: 0,
    advancements: [],     // [{ name, source: 'battle:btlid' }]
    scars: [],            // [{ name, detail, source: 'battle:btlid' }]
    status: 'alive',      // alive | dead | recovering | captured
    recoversNextBattles: 0,
    notes: '',
  };
}
function emptyWarbandState() {
  return {
    battlesPlayed: 0,
    wins: 0, losses: 0, draws: 0,
    glory: 0,                     // accumulated ☼
    modelStates: {},              // modelUid -> state
  };
}

function computeWarbandState(campaign, warbandId) {
  const state = emptyWarbandState();
  const wb = loadWarband(warbandId);
  if (!wb) return state;
  // Initialise model state for every existing model.
  // If the model has a `baseProgression` set (used to import banda from paper or
  // to correct mistakes), seed the state from it.
  for (const m of wb.models) {
    const base = m.baseProgression || null;
    const ms = emptyModelState();
    if (base) {
      ms.xp = base.xp || 0;
      ms.kills = base.kills || 0;
      ms.advancements = (base.advancements || []).map(a => ({
        name: a.name, source: a.source || 'base'
      }));
      ms.scars = (base.scars || []).map(s => ({
        name: s.name, detail: s.detail || '', source: s.source || 'base'
      }));
      if (base.status) ms.status = base.status;
      if (base.recoversNextBattles) ms.recoversNextBattles = base.recoversNextBattles;
    }
    state.modelStates[m.uid] = ms;
  }
  // Same for warband-level base totals (battlesPlayed, wins, etc.)
  if (wb.baseProgression) {
    const wbb = wb.baseProgression;
    state.battlesPlayed = wbb.battlesPlayed || 0;
    state.wins   = wbb.wins   || 0;
    state.losses = wbb.losses || 0;
    state.draws  = wbb.draws  || 0;
    state.glory  = wbb.glory  || 0;
  }

  // Replay all battles in order
  const battles = (campaign.battles || []).slice().sort((a,b) => a.date.localeCompare(b.date));
  for (const battle of battles) {
    const part = (battle.participants || []).find(p => p.warbandId === warbandId);
    if (!part) continue;
    state.battlesPlayed++;
    if (part.result === 'win')  state.wins++;
    if (part.result === 'loss') state.losses++;
    if (part.result === 'draw') state.draws++;
    state.glory += part.gloryEarned || 0;
    // Glorious Deeds — +1 ☼ each (canon p.97), on top of the base reward.
    state.glory += participantDeedCount(part);
    // Glory Hound (Wildcard 10) — +1 ☼ per model with the skill that
    // was on the battlefield this game.
    state.glory += gloryHoundBonus(wb, part.modelOutcomes || []);

    // Decrement recovery counters at battle start (a "missing next battle" model
    // returns to alive after one battle).
    for (const ms of Object.values(state.modelStates)) {
      if (ms.status === 'recovering' && ms.recoversNextBattles > 0) {
        ms.recoversNextBattles--;
        if (ms.recoversNextBattles <= 0) ms.status = 'alive';
      }
      if (ms.status === 'captured') {
        // Captured returns next battle automatically
        ms.status = 'alive';
      }
    }

    // Apply per-model outcomes
    for (const out of (part.modelOutcomes || [])) {
      const ms = state.modelStates[out.modelUid];
      if (!ms) continue;
      // Skip dead/captured models — gate XP after Trauma (canon p.103).
      if (ms.status === 'dead' || ms.status === 'captured') continue;

      if (out.participated === false) continue;

      // Always track kill stats for the model (display only).
      ms.kills += (out.kills || 0);

      // XP awards (canon Digital Rulebook p.103-104):
      //   Only ELITE; +1 if survived (even if OoA); +1 cap if ≥1 Deed.
      let xpDelta = 0;
      const model = wb.models.find(x => x.uid === out.modelUid);
      const isElite = model ? _outcomeModelIsElite(model, wb) : false;
      const killedByTrauma = out.injury && (out.injury.id === 'dead' || out.injury.id === 'captured');
      if (isElite && !killedByTrauma) {
        xpDelta = 1;
        if ((out.feats || 0) >= 1) xpDelta += 1;
        // War Stories (Wildcard 11) — +1 to each ELITE without the skill
        // when the warband has a bearer.
        if (model) xpDelta += warStoriesBonusFor(model, wb);
      }

      // Apply chosen advancements (these were picked at battle entry time)
      for (const adv of (out.advancementsChosen || [])) {
        ms.advancements.push({ name: adv.name, source: 'battle:' + battle.id });
      }

      // Apply injury roll
      if (out.outOfAction && out.injury) {
        const inj = out.injury;
        if (inj.id === 'bitter-exp' && isElite) xpDelta += 1;
        if (inj.id === 'light-wound')  { ms.status = 'recovering'; ms.recoversNextBattles = 1; }
        if (inj.id === 'old-wound')    {
          ms.scars.push({ name: inj.statDownLabel || 'Old Battle Wound',
                          detail: inj.detail || '', source: 'battle:'+battle.id });
        }
        if (inj.id === 'captured')     { ms.status = 'captured'; state.glory = Math.max(0, state.glory - 1); }
        if (inj.id === 'dead')         { ms.status = 'dead'; }
      }
      ms.xp += xpDelta;
    }
  }
  return state;
}

function refreshAllWarbandStates(campaign) {
  campaign.warbandStates = {};
  for (const wid of campaign.warbandIds) {
    campaign.warbandStates[wid] = computeWarbandState(campaign, wid);
  }
}

/* ----- XP threshold helpers ----- */
function nextXpThreshold(currentXp) {
  for (const t of CAMPAIGN_TABLES.xpThresholds) {
    if (currentXp < t) return t;
  }
  return null;
}
function advancementsEarned(currentXp) {
  return CAMPAIGN_TABLES.xpThresholds.filter(t => currentXp >= t).length;
}

/* T2 — Concentrated Attack dice math (canon p.70-72).
 *
 * Lead attacker contributes their base DICE; each additional fireteam
 * contributor adds +1 DICE. Cap defaults to 4 additional (5-model
 * fireteam total) but is configurable via opts.max for factions with
 * smaller fireteam sizes. Used by the Lab simulator and any future
 * UI that wants to preview Concentrated Attack output.
 */
/* Lab integration aproximada: mutador que aplica un bonus uniforme
 * de rangedDice a cada modelo de la banda. El bonus emula el
 * coordinated fire de un Fireteam sin necesidad de posiciones (que
 * el Lab no modela). bandSize-1 capped a opts.max (default 4 = 5-model
 * fireteam canon).
 *
 * Devuelve el bonus aplicado para que el caller pueda loggear o
 * mostrarlo en la UI del Lab.
 */
/* Sub-fase F — Goetic Spells minimum integration.
 *
 * attachSorcerer(model, spellNames): añade spells (lookup en
 * CAMPAIGN_TABLES.specialRules.goeticSpells.spells) + castsRemaining
 * proporcional al repertoire.
 *
 * castSpell(model, spellName, target?): mapea hechizo a effect
 * descriptor canon-paraphrased y decrementa castsRemaining. Devuelve
 * null si no casts, hechizo no en repertoire o entry desconocido.
 *
 * applyGoeticEffect(target, effectDesc): mutador minimum para los 2
 * effect kinds más comunes: 'curse-armour' (Curse of Worms),
 * 'skip-activation' (Whispers of the Serpent). Otros effect kinds
 * se trackean pero no mutan (info-only para el simulador).
 */

function _spellToEffect(spellName) {
  // Mapeo canon-paraphrase → sim effect descriptor.
  const map = {
    'Curse of Worms':            { kind:'curse-armour', amount: 1 },
    'Whispers of the Serpent':   { kind:'skip-activation' },
    'Veil of Shadows':           { kind:'grant-cover' },
    'Conjure Wretched':          { kind:'summon-wretched' },
    'Black Communion':           { kind:'self-heal-blood' },
    "Serpent's Bite":            { kind:'ranged-attack', dice: 4, range: 24, keywords:['IGNORE ARMOUR','FIRE'] },
    'Hellfire Sigil':            { kind:'area-blast', range: 18 },
    'Soul Bargain':              { kind:'revive-friend', risky: true },
  };
  return map[spellName] || null;
}

function attachSorcerer(model, spellNames) {
  if (!model) return;
  if (!Array.isArray(spellNames) || spellNames.length === 0) return;
  model.isSorcerer = true;
  model.spells = spellNames.slice();
  // Repertoire size determines casts: 1 cast por 2 hechizos en
  // el repertoire, mínimo 1. Aproximación.
  model.castsRemaining = Math.max(1, Math.ceil(spellNames.length / 2));
}

function castSpell(model, spellName, target) {
  if (!model || !model.isSorcerer) return null;
  if (typeof model.castsRemaining !== 'number' || model.castsRemaining <= 0) return null;
  if (!Array.isArray(model.spells) || !model.spells.includes(spellName)) return null;
  const eff = _spellToEffect(spellName);
  if (!eff) return null;
  model.castsRemaining -= 1;
  if (target) applyGoeticEffect(target, eff);
  return eff;
}

function applyGoeticEffect(target, effectDesc) {
  if (!target || !effectDesc) return;
  switch (effectDesc.kind) {
    case 'curse-armour': {
      const amount = typeof effectDesc.amount === 'number' ? effectDesc.amount : 1;
      target.armour = (typeof target.armour === 'number' ? target.armour : 0) - amount;
      target.cursed = true;
      break;
    }
    case 'skip-activation':
      target.skipNextActivation = true;
      break;
    case 'grant-cover':
      target.grantedCover = true;
      break;
    case 'self-heal-blood': {
      // Black Communion-like — caster reduces own bloodMarkers.
      const cur = typeof target.bloodMarkers === 'number' ? target.bloodMarkers : 0;
      target.bloodMarkers = Math.max(0, cur - 1);
      break;
    }
    case 'ranged-attack': {
      // Serpent's Bite — ataque directo. Aproximación simplificada:
      // probabilidad de daño ~50% (dado canon 4 DICE típicos). Si
      // hit, escala 60% BLOOD, 30% DOWN, 10% OUT.
      const dice = typeof effectDesc.dice === 'number' ? effectDesc.dice : 4;
      const hitChance = Math.min(0.85, 0.25 + dice * 0.1);
      if (Math.random() < hitChance) {
        const r = Math.random();
        const cur = typeof target.bloodMarkers === 'number' ? target.bloodMarkers : 0;
        if (r < 0.6) {
          target.bloodMarkers = Math.min(6, cur + 1);
        } else if (r < 0.9) {
          target.bloodMarkers = Math.min(6, cur + 1);
          target.isDown = true;
        } else {
          target.isOut = true;
          target.isDown = true;
        }
      }
      break;
    }
    case 'area-blast': {
      // Hellfire Sigil — daño al target + 1-2 random adicionales
      // del mismo band. ~60% chance BLOOD al target.
      if (Math.random() < 0.6) {
        const cur = typeof target.bloodMarkers === 'number' ? target.bloodMarkers : 0;
        target.bloodMarkers = Math.min(6, cur + 1);
      }
      // Salpicaduras
      if (Array.isArray(target._band)) {
        const others = target._band.filter(m => m && m !== target && !m.isOut);
        const n = Math.min(2, others.length);
        for (let i = 0; i < n; i++) {
          if (Math.random() < 0.4) {
            const o = others[i];
            const ocur = typeof o.bloodMarkers === 'number' ? o.bloodMarkers : 0;
            o.bloodMarkers = Math.min(6, ocur + 1);
          }
        }
      }
      break;
    }
    case 'summon-wretched': {
      // Conjure Wretched — añade modelo temporal a la banda del
      // caster. Stats reducidas (proxy: 0 dice básicos, sin armour).
      if (Array.isArray(target._band)) {
        target._band.push({
          name: 'Conjured Wretched',
          temporary: true,
          isOut: false, isDown: false, bloodMarkers: 0,
          rangedDice: -2, meleeDice: -1, armour: 0,
          weapons: [{ name:'Claws', isRanged:false, range:0, diceMod:0, injuryDice:0, injuryMod:0, keywords: new Set() }],
          keywords: new Set(),
          _stats: { kills:0, dmgDealt:0, dmgReceived:0, turnsSurvived:0 },
          _terrain: target._terrain || 'mixed',
          _band: target._band,
        });
      }
      break;
    }
    case 'revive-friend': {
      // Soul Bargain — Risky 50%. Si success, revive un ally OoA
      // del band con bloodMarkers=5 (canon: vuelve marcado).
      if (Array.isArray(target._band) && Math.random() < 0.5) {
        const fallen = target._band.find(m => m && m.isOut === true && m !== target);
        if (fallen) {
          fallen.isOut = false;
          fallen.isDown = false;
          fallen.bloodMarkers = 5;
        }
      }
      break;
    }
    // Otros kinds: info-only.
    default:
      break;
  }
}

/* Sub-fase E — Fortify ACTION (Combat Engineer).
 *
 * Combat Engineer puede fortificar terrain piece adyacente, granting
 * cover-mejorada a amigos en él. Lab no modela posiciones, así que
 * la aproximación: una vez que el Combat Engineer ejecuta Fortify,
 * toda la banda gana bandFortified (consumido por sim para reducir
 * 1 DICE en ranged attacks enemigos contra cualquier modelo).
 */
function attachFortifyAction(model) {
  if (!model) return;
  model.canFortify = true;
}

function consumeFortifyAction(model) {
  if (!model || model.canFortify !== true || model.fortified === true) return false;
  model.fortified = true;
  return true;
}

function applyFortifyEffectToBand(band) {
  if (!Array.isArray(band)) return;
  const anyFortified = band.some(m => m && m.fortified === true);
  if (!anyFortified) return;
  for (const m of band) {
    if (m) m.bandFortified = true;
  }
}

/* Sub-fase D — Eye of Beelzebub.
 *
 * attachEyeOfBeelzebub(model): añade weapon Eye of Beelzebub al model
 * (5 DICE Ranged 24" BLAST+FIRE+IGNORE ARMOUR+IGNORE COVER) y setea
 * flag eyeUsed=false. Idempotente — segundo attach no duplica.
 *
 * consumeEyeOfBeelzebub(model): true si quedaba disponible, marca
 * usado. false si ya usado o no attached.
 *
 * Phase consumption: el sim engine puede llamar consumeEyeOfBeelzebub
 * en la fase ranged del Antipope en su primer turno con LoS al
 * objetivo. Por simplicidad no se enchufa automáticamente al
 * simulateBattle_lab — se expone como helper para futuro Lab work.
 */
function attachEyeOfBeelzebub(model) {
  if (!model) return;
  if (!Array.isArray(model.weapons)) model.weapons = [];
  if (model.weapons.some(w => /eye of beelzebub/i.test(w.name || ''))) return;
  model.weapons.push({
    name: 'Eye of Beelzebub',
    isRanged: true,
    range: 24,
    diceMod: 5,            // 5 DICE base (no es +5; pero el sim usa diceMod aditivo, así que aplicar a rangedDice base = 0)
    injuryDice: 1,
    injuryMod: 1,
    keywords: new Set(['BLAST 3"', 'FIRE', 'IGNORE ARMOUR', 'IGNORE COVER']),
    eyeOfBeelzebub: true,
  });
  model.eyeUsed = false;
}

function consumeEyeOfBeelzebub(model) {
  if (!model) return false;
  if (model.eyeUsed !== false) return false;
  model.eyeUsed = true;
  return true;
}

/* Sub-fase G — Concentrated Attack positional approximation.
 *
 * Refinamiento sobre applyConcentratedAttackToBand (uniforme). En vez
 * de bonificar a TODOS los modelos, agrupa por weapon name del arma
 * a Distancia primaria y aplica bonus solo a grupos de ≥2 modelos
 * que comparten arma. Más fiel al canon (Concentrated Attack exige
 * misma arma en el Fireteam) sin requerir posiciones reales.
 *
 * Devuelve array de { weaponName, count, bonus } para reporting.
 */

