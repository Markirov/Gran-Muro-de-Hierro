const fs = require('fs');
let c = fs.readFileSync('app/lib/battlekit_legality_engine.ts', 'utf8');

const s1 = `  if (category === 'shields') {
    const shieldHasCombo = r.tags.has('Shield Combo') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);
    for (const kid of (model.battlekit || [])) {
      const eit = findBattlekitItem(wb.factionId, kid, wb);
      if (!eit || eit.type !== '2-Handed') continue;
      const er = parseRestriction(eit.restriction);
      if (!shieldHasCombo || !er.tags.has('Shield Combo')) {
        return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos' };
      }
    }`;

const r1 = `  if (category === 'shields') {
    const shieldHasCombo = r.tags.has('Shield Combo') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);
    const isStrong = (unit ? effectiveKeywords(model, unit, wb) : []).includes('STRONG');
    for (const kid of (model.battlekit || [])) {
      const eit = findBattlekitItem(wb.factionId, kid, wb);
      if (!eit || eit.type !== '2-Handed') continue;
      const er = parseRestriction(eit.restriction);
      const isStrongOverride = isStrong && getArmouryCategory(wb.factionId, kid) === 'melee' && !itemHasWeaponKeyword(eit, 'CUMBERSOME');
      if (!isStrongOverride && (!shieldHasCombo || !er.tags.has('Shield Combo'))) {
        return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos (o STRONG)' };
      }
    }`;

const s2 = `  if (item.type === '2-Handed') {
    const has2hCombo = r.tags.has('Shield Combo') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);
    for (const kid of (model.battlekit || [])) {
      const eit = findBattlekitItem(wb.factionId, kid, wb);
      if (!eit) continue;
      if (getArmouryCategory(wb.factionId, kid) === 'shields') {
        const er = parseRestriction(eit.restriction);
        if (!has2hCombo || !er.tags.has('Shield Combo')) {
          return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos' };
        }
      }
    }
  }`;

const r2 = `  if (item.type === '2-Handed') {
    const has2hCombo = r.tags.has('Shield Combo') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);
    const isStrong = (unit ? effectiveKeywords(model, unit, wb) : []).includes('STRONG');
    const isStrongOverride = isStrong && category === 'melee' && !itemHasWeaponKeyword(item, 'CUMBERSOME');
    for (const kid of (model.battlekit || [])) {
      const eit = findBattlekitItem(wb.factionId, kid, wb);
      if (!eit) continue;
      if (getArmouryCategory(wb.factionId, kid) === 'shields') {
        const er = parseRestriction(eit.restriction);
        if (!isStrongOverride && (!has2hCombo || !er.tags.has('Shield Combo'))) {
          return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos (o STRONG)' };
        }
      }
    }
  }`;

c = c.replace(s1, r1);
c = c.replace(s2, r2);
fs.writeFileSync('app/lib/battlekit_legality_engine.ts', c);
