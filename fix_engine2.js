const fs = require('fs');
let c = fs.readFileSync('app/lib/battlekit_legality_engine.ts', 'utf8');

c = c.replace(/const shieldHasCombo = r\.tags\.has\('Shield Combo'\) && !\(upWeaponLimits && upWeaponLimits\.noShieldCombo\);/, 
'const shieldHasCombo = r.tags.has(\'Shield Combo\') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);\n    const isStrong = (unit ? effectiveKeywords(model, unit, wb) : []).includes(\'STRONG\');');

c = c.replace(/if \(!shieldHasCombo \|\| !er\.tags\.has\('Shield Combo'\)\) \{\s*return \{ state: 'disabled', reason: 'Escudo \\\+ 2H requiere Shield Combo en ambos' \};\s*\}/,
`const isStrongOverride = isStrong && getArmouryCategory(wb.factionId, kid) === 'melee' && !itemHasWeaponKeyword(eit, 'CUMBERSOME');
      if (!isStrongOverride && (!shieldHasCombo || !er.tags.has('Shield Combo'))) {
        return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos (o STRONG)' };
      }`);


c = c.replace(/const has2hCombo = r\.tags\.has\('Shield Combo'\) && !\(upWeaponLimits && upWeaponLimits\.noShieldCombo\);/,
'const has2hCombo = r.tags.has(\'Shield Combo\') && !(upWeaponLimits && upWeaponLimits.noShieldCombo);\n    const isStrong = (unit ? effectiveKeywords(model, unit, wb) : []).includes(\'STRONG\');\n    const isStrongOverride = isStrong && category === \'melee\' && !itemHasWeaponKeyword(item, \'CUMBERSOME\');');

c = c.replace(/if \(!has2hCombo \|\| !er\.tags\.has\('Shield Combo'\)\) \{\s*return \{ state: 'disabled', reason: 'Escudo \\\+ 2H requiere Shield Combo en ambos' \};\s*\}/,
`if (!isStrongOverride && (!has2hCombo || !er.tags.has('Shield Combo'))) {
          return { state: 'disabled', reason: 'Escudo + 2H requiere Shield Combo en ambos (o STRONG)' };
        }`);

fs.writeFileSync('app/lib/battlekit_legality_engine.ts', c);
