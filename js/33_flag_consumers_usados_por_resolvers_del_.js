/* ======================================================================
   Flag consumers — usados por resolvers del motor Lab.

   Cada helper aplica un flag al estado attacker/target durante ranged
   o injury resolution. Diseñados puros (o quasi-puros: mutan el
   modelo de forma localizable) para tests aislables sin necesidad de
   stub de Math.random.
   ====================================================================== */

// Black Grail Hunger — Antipope que mata absorbe 1 bloodMarker propio.
function consumeHungerOnKill(attacker) {
  if (!attacker || !attacker.hungry) return;
  if (typeof attacker.bloodMarkers !== 'number') return;
  if (attacker.bloodMarkers > 0) attacker.bloodMarkers -= 1;
}

// Court Pride — BLOOD result añade +1 bloodMarker extra (cap 6).
function applyPrideOnBlood(target, attacker) {
  if (!target || !attacker || !attacker.bloodMarkerOnHit) return;
  const cur = typeof target.bloodMarkers === 'number' ? target.bloodMarkers : 0;
  target.bloodMarkers = Math.min(6, cur + 1);
}

// Court Sloth — Minor Hits (BLOOD) cuentan como DOWN si attacker tiene flag.
function applySlothMinorAsDown(result, attacker) {
  if (!attacker || !attacker.minorHitsAsDown) return result;
  if (result === 'BLOOD') return 'DOWN';
  return result;
}

// Court Lust — pierceArmour fuerza bypass del armour del target.
function applyLustPierce(bypass, attacker) {
  if (bypass) return true;
  return !!(attacker && attacker.pierceArmour);
}

// Court Gluttony — target con enemyDiceMalus reduce attacker.diceMod.
function applyGluttonyMalus(diceMod, target) {
  if (!target || typeof target.enemyDiceMalus !== 'number') return diceMod;
  return diceMod - target.enemyDiceMalus;
}

// Fortify ACTION — target en banda fortificada reduce attacker.diceMod.
function applyFortifyMalus(diceMod, target) {
  if (!target || !target.bandFortified) return diceMod;
  return diceMod - 1;
}

// Goetic Whispers of the Serpent — consumir flag skip-activation.
// Devuelve true si el modelo debe saltarse su activación (consumiendo flag).
function applySkipActivation(model) {
  if (!model || model.skipNextActivation !== true) return false;
  model.skipNextActivation = false;
  return true;
}


