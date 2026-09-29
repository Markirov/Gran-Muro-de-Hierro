const fs = require('fs');
let c = fs.readFileSync('tracking/PENDING.md', 'utf8');

c = c.replace(/- \[ \] \*\*Abyssinia\*\*: "Chewa & ELITE only" — actualmente dice q necesitas Chewa obligatoriamente\n/, '');
c = c.replace(/- \[ \] \*\*Escudo \+ STRONG \+ arma 2H sin Shield Combo\*\*: el motor lo bloquea, debería permitirlo \(falso 1H\)\n/, '');
c = c.replace(/- \[ \] \*\*Retirar la keyword `ALCHEMIST`\*\*: no existe en el rulebook oficial, los jabireans son ELITE, quitar de todo el motor y los tests.\n/, '');
c = c.replace(/- \[ \] \*\*Lab: simulación de reglas inventadas.*borrar código, datos y tests\.\n/, '');

// Find "Tareas En Cola" and append completed below
c = c.replace(/### 🛠 Tareas En Cola\n/, '### 🛠 Tareas En Cola\n\n## ✅ Completado\n- [x] Abyssinia: "Chewa & ELITE only" (Permitir Shotel/Anfarro sin Chewa si eres ELITE).\n- [x] Escudo + STRONG + arma 2H sin Shield Combo: Permitido (Strong ignora restricción).\n- [x] Retirar keyword ALCHEMIST: eliminada de glossary y fixtures.\n- [x] Lab: borrada simulación de reglas inventadas (Concentrated Attack, Goetics, Eye of Beelzebub).\n');

fs.writeFileSync('tracking/PENDING.md', c);
