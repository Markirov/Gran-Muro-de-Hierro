// @ts-nocheck
/* ======================================================================
   WEAPON KEYWORD LIBRARY
   Mechanical effects of weapon keywords (effects + rules).
   Each entry has { type, summary } where type ∈ {'effect','tag','game'}
   ====================================================================== */
const WEAPON_KEYWORD_LIBRARY = {
  // --- Damage/attack modifiers ---
  '+1 DICE': {
    type: 'effect',
    summary: 'Añade +1 DICE a las tiradas de éxito (Success Rolls) hechas con esta arma.',
  },
  '+2 DICE': {
    type: 'effect',
    summary: 'Añade +2 DICE a las tiradas de éxito (Success Rolls) hechas con esta arma.',
  },
  '-1 DICE': {
    type: 'effect',
    summary: 'Aplica -1 DICE a las tiradas de éxito hechas con esta arma.',
  },
  '+1 INJURY DICE': {
    type: 'effect',
    summary: 'Cuando el arma causa lesión, añade +1 DICE adicional a la tirada de Injury (sumando al base habitual).',
  },
  '+2 INJURY DICE': {
    type: 'effect',
    summary: 'Cuando el arma causa lesión, añade +2 DICE adicionales a la tirada de Injury. Reservado a armas brutales (espadas Malebranche, Titan Zulfiqar, Anti-Materiel Rifle).',
  },
  '+1 INJURY MODIFIER': {
    type: 'effect',
    summary: 'Suma +1 al modificador final de la tirada de Injury con esta arma (no al número de dados).',
  },
  '+2 INJURY MODIFIER': {
    type: 'effect',
    summary: 'Suma +2 al modificador final de la tirada de Injury con esta arma (no al número de dados). Reservado a armas extraordinariamente potentes como el Titan Zulfiqar.',
  },
  '-1 INJURY DICE': {
    type: 'effect',
    summary: 'Resta -1 DICE de la tirada de Injury contra modelos protegidos por esta pieza/regla.',
  },
  '-1 INJURY MODIFIER': {
    type: 'effect',
    summary: 'Aplica -1 al modificador final de Injury contra el portador. Es la armadura ligera estándar.',
  },
  '-2 INJURY MODIFIER': {
    type: 'effect',
    summary: 'Aplica -2 al modificador final de Injury contra el portador. Armadura intermedia (Reinforced).',
  },
  '-3 INJURY MODIFIER': {
    type: 'effect',
    summary: 'Aplica -3 al modificador final de Injury contra el portador. Armadura pesada (Machine Armour).',
  },

  // --- Common weapon keywords ---
  'ASSAULT': {
    type: 'effect',
    summary: 'Disparar con un arma ASSAULT no termina la activación: el modelo puede seguir moviendo o cargando tras el disparo. Útil para presionar al enemigo en avance.',
  },
  'AUTOMATIC': {
    type: 'effect',
    summary: 'Multiplicador de impactos: por cada éxito, el arma puede infligir más de un Injury Roll. El número entre paréntesis (AUTOMATIC 3) indica cuántos.',
  },
  'AUTOMATIC 2': {
    type: 'effect',
    summary: 'Por cada éxito al disparar, hace 2 Injury Rolls en lugar de 1. Armas semiautomáticas o ráfagas cortas.',
  },
  'AUTOMATIC 3': {
    type: 'effect',
    summary: 'Por cada éxito al disparar, hace 3 Injury Rolls en lugar de 1. Característica de armas de ráfaga rápida.',
  },
  'AUTOMATIC 5': {
    type: 'effect',
    summary: 'Por cada éxito al disparar, hace 5 Injury Rolls en lugar de 1. Armas de fuego sostenido pesadas (autocannons).',
  },
  'BLAST': {
    type: 'effect',
    summary: 'Daña a todos los modelos en un radio del impacto (medido en pulgadas, indicado entre paréntesis). Amigos y enemigos por igual.',
  },
  'BLAST 3"': {
    type: 'effect',
    summary: 'Tras el impacto, hace una tirada de Injury contra todo modelo a 3" o menos del punto de impacto (amigo o enemigo).',
  },
  'BLOCK': {
    type: 'effect',
    summary: 'Cuando el portador es atacado en cuerpo a cuerpo, puede bloquear: aplica un -DICE adicional a las tiradas del atacante.',
  },
  'CLEAVE': {
    type: 'effect',
    summary: 'Ignora una cantidad de armadura del objetivo. El número entre paréntesis (CLEAVE 2) indica cuántos puntos de Armour Modifier ignora la tirada.',
  },
  'CLEAVE 2': {
    type: 'effect',
    summary: 'Al hacer Injury Roll, ignora hasta 2 puntos de modificador de armadura del objetivo.',
  },
  'CRITICAL': {
    type: 'effect',
    summary: 'Cuando un Critical Success se logra con esta arma, en vez del +1 INJURY DICE habitual añade +2 INJURY DICE a la tirada de Injury.',
  },
  'CUMBERSOME': {
    type: 'effect',
    summary: 'Arma estorbosa: el modelo no puede tomar acción de Charge en la misma activación que use esta arma. Reduce el ritmo de combate cuerpo a cuerpo.',
  },
  'DEADLY': {
    type: 'effect',
    summary: 'En cada Injury Roll exitoso con esta arma, añade un BLOOD MARKER adicional al objetivo (sangrado continuo).',
  },
  'FIRE': {
    type: 'effect',
    summary: 'Tras la Injury Roll contra el objetivo, aunque no tenga efecto, pon 1 BLOOD MARKER adicional (salvo NEGATE FIRE).',
  },
  'FLAMETHROWER': {
    type: 'effect',
    summary: 'Al hacer un Shoot ACTION con esta arma, en lugar de elegir un objetivo, traza una línea recta desde el modelo de hasta su Range. Todos los modelos en esa línea son alcanzados (Injury Roll para cada uno). Ignora cobertura.',
  },
  'GAS': {
    type: 'effect',
    summary: 'Ataque químico. Modelos con Gas Mask aplican -DICE; modelos con NEGATE GAS son inmunes. La nube persiste y daña por proximidad.',
  },
  'HEAVY': {
    type: 'effect',
    summary: 'Un modelo no puede equipar más de 1 arma con HEAVY (de cualquier tipo). El portador no puede hacer Dash ACTION en la misma activación que use el arma.',
  },
  'HELD': {
    type: 'effect',
    summary: 'Esta pieza de Battlekit ocupa una mano y no puede soltarse. El portador solo puede llevar 1 arma a 1 mano O un escudo (nunca arma + escudo, nunca arma a 2 manos). Sí puede llevar granadas.',
  },
  'IGNORE ARMOUR': {
    type: 'effect',
    summary: 'Ignora todos los modificadores de armadura del objetivo. La armadura no aporta defensa contra esta arma.',
  },
  'IGNORE COVER': {
    type: 'effect',
    summary: 'Ignora la regla COVER del objetivo: el modelo a cubierto no recibe sus -DICE habituales contra este ataque.',
  },
  'IGNORE LONG RANGE': {
    type: 'effect',
    summary: 'Ignora el -1 DICE por atacar a Long Range (más de la mitad del alcance del arma).',
  },
  'DEPLOYABLE': {
    type: 'tag',
    summary: 'Battlekit representado por una miniatura o pieza de escenografía que se puede colocar durante la partida.',
  },
  'BLESSED': {
    type: 'effect',
    summary: 'La primera vez que despliegas el modelo en la partida, coloca junto a él tantos BLESSING MARKERS como indique X.',
  },
  'AMMUNITION': {
    type: 'effect',
    summary: 'Se usa en la siguiente partida del modelo. Al desplegarlo, elige 1 arma a distancia: gana la keyword indicada entre paréntesis hasta el final de la partida. El arma no puede tener BLAST, FIRE, GAS ni SHRAPNEL, ni más de un tipo de AMMUNITION.',
  },
  'RELOAD': {
    type: 'effect',
    summary: 'Tras disparar, el arma queda sin munición y debe recargarse: la siguiente activación del modelo se gasta automáticamente recargándola, no puede atacar otra vez.',
  },
  'RISKY': {
    type: 'effect',
    summary: 'Toda Success Roll asociada al uso del arma se convierte en Risky Success Roll: si sacas un 1, fallo automático con consecuencias adversas (consultar reglas Risky).',
  },
  'SCATTER': {
    type: 'effect',
    summary: 'Si fallas el Success Roll, el ataque desvía: relanzas la dirección y distancia del impacto. Puede afectar a tu propio bando si hay aliados cerca.',
  },
  'SHOTGUN': {
    type: 'effect',
    summary: 'A corta distancia (≤6"), las armas SHOTGUN pueden añadir +1 DICE a Success Rolls. A larga distancia pierden eficacia.',
  },
  'PISTOL': {
    type: 'effect',
    summary: 'Arma dual: puede usarse como arma a distancia o cuerpo a cuerpo, y como ambas en la misma activación. Cuenta como una sola arma de 1 mano.',
  },
  'SHRAPNEL': {
    type: 'effect',
    summary: 'Tras la Injury Roll principal, hace 1 tirada de Injury extra contra cada modelo a 1" o menos del objetivo. Modelos con NEGATE SHRAPNEL son inmunes.',
  },
  'NEGATE SHRAPNEL': {
    type: 'effect',
    summary: 'No le afecta el Efecto de la keyword SHRAPNEL (no recibe el BLOOD MARKER extra tras la Injury Roll).',
  },
  'INFECTION MARKERS': {
    type: 'effect',
    summary: 'Cuando el ataque coloque un BLOOD MARKER en el objetivo, coloca también 1 INFECTION MARKER junto a él. Las INFECTION MARKERS son el recurso central de la facción Black Grail (ver reglas de facción).',
  },
  'ARMOUR-PIERCING': {
    type: 'effect',
    summary: 'Reduce el modificador -INJURY MODIFIER total del objetivo (procedente de Armour y/o Shields) en 1, hasta un mínimo de 0. Ej: objetivo con Standard Armour + Trench Shield pasa de -2 a -1.',
  },
  'IMPERVIOUS': {
    type: 'effect',
    summary: 'El modificador -INJURY MODIFIER de esta Armadura/Escudo no puede ser reducido por la regla ARMOUR-PIERCING ni por ningún otro efecto similar.',
  },

  // --- Stipulations (purchase/equipment rules) ---
  'Bayonet Lug': {
    type: 'stipulation',
    summary: 'Hay que comprar un arma a distancia con la estipulación Bayonet Lug antes de poder comprar una Bayonet para ese modelo.',
  },
  'Shield Combo': {
    type: 'stipulation',
    summary: 'Un modelo puede llevar un escudo y un arma de 2 manos a la vez si ambos tienen la estipulación Shield Combo.',
  },
  'Consumable': {
    type: 'stipulation',
    summary: 'Este Battlekit se retira del Roster de la banda al final de la partida en que se usa.',
  },
  'Unique': {
    type: 'stipulation',
    summary: 'Etiqueta de Trench Companion / Forge: no es una estipulación de Warbands of Trench Crusade (allí se usa Limit: X, máximo de copias en la banda).',
  },
  'Headgear': {
    type: 'stipulation',
    summary: 'Un modelo no puede tener más de una pieza de Headgear (aunque tenga más de una cabeza).',
  },

  // --- Combat keywords (model-level) ---
  'COVER': {
    type: 'effect',
    summary: 'El modelo está protegido: aplica -DICE adicional a tiradas de Success contra ataques a distancia que lo tengan como objetivo.',
  },

  // --- Special weapon-specific rules (named) ---
  'Bypass Shield': {
    type: 'effect',
    summary: 'El arma esquiva el efecto del escudo: ignora -INJURY DICE/-INJURY MODIFIERS de Shields contra ataques cuerpo a cuerpo de esta arma. Otras reglas del escudo (BLOCK, etc.) se mantienen.',
  },
  'Overcharge': {
    type: 'effect',
    summary: 'Antes de disparar puedes sobrecargar el arma si el modelo tiene STRONG o está en contacto con un aliado. El ataque gana BLAST 3" y RELOAD; después el tirador recibe 1 BLOOD MARKER y su activación termina.',
  },
  'High Trajectory': {
    type: 'effect',
    summary: 'El modelo o punto objetivo no puede estar a 6" o menos del atacante (si el disparo hace Scatter, sí puede acabar más cerca).',
  },
  'Despatch': {
    type: 'effect',
    summary: 'Si el objetivo está Down, el ataque tiene IGNORE ARMOUR — la Misericordia es un arma para rematar enemigos heridos.',
  },
  'Full Auto': {
    type: 'effect',
    summary: 'En cada Shoot ACTION con el Autocannon eliges disparar con el perfil Bursts (AUTOMATIC 3) o con el perfil Full Auto (AUTOMATIC 5, RELOAD, RISKY).',
  },
  'Cloud of Gas': {
    type: 'effect',
    summary: 'Al atacar a distancia con el Gas Censer no se hace Success Roll: todos los demás modelos a 6" o menos del portador, amigos o enemigos y sin importar la Line of Sight, son alcanzados y reciben una Injury Roll.',
  },
  // ---- Anchorite Battlekit specials ----
  'Impossible to Stop': {
    type: 'effect',
    summary: 'Grand Anchorite: los enemigos a 1" no pueden hacer un Melee Attack cuando este Grand Anchorite Shrine se retira. Además puede hacer Move o Charge ACTION aunque empiece a 1" de enemigos.',
  },
  'Manifold Blessings': {
    type: 'effect',
    summary: 'Anchorite Battlekit: en el Promotions & Experience Step de campaña, el Anchorite Hallowed puede ser ascendido a estatus ELITE.',
  },
  'Advanced Design': {
    type: 'effect',
    summary: 'Anchorite Battlekit: al hacer una Dash ACTION puedes añadir +2 DICE a la Success Roll; si lo haces, coloca 1 BLOOD MARKER junto al modelo.',
  },
  'Grind to Dust ACTION': {
    type: 'action',
    summary: 'Anchorite Battlekit: ACCIÓN especial. Hace un Melee Attack contra un enemigo Down a 1" con base ≤32mm. No usa arma cuerpo a cuerpo.',
  },
  'Divine Accuracy': {
    type: 'effect',
    summary: 'Anchorite Battlekit: +1 DICE a la característica Ranged del Anchorite.',
  },
  'Cower Before The Lord': {
    type: 'effect',
    summary: 'Anchorite Battlekit: enemigos sin FEAR que empiecen una Activación a 1" del Anchorite deben hacer Retreat ACTION en esa Activación. No pueden hacer ACCIONES con Risky Success Roll mientras estén a 1".',
  },
};

/* Las librerías de keywords toman el texto canon del KEYWORD_GLOSSARY
 * para toda keyword que cubra (incluidas las paramétricas: CLEAVE 2,
 * BLAST 3", AUTOMATIC 3...). Las estipulaciones y reglas especiales que
 * no son keywords (Shield Combo, Overcharge...) conservan su texto. */
(function syncKeywordLibrariesWithGlossary() {
  for (const k of Object.keys(WEAPON_KEYWORD_LIBRARY)) {
    const t = glossaryText(k);
    if (t) WEAPON_KEYWORD_LIBRARY[k] = Object.assign({}, WEAPON_KEYWORD_LIBRARY[k], { summary: t });
  }
  for (const k of Object.keys(KEYWORD_LIBRARY)) {
    const t = glossaryText(k);
    if (t) KEYWORD_LIBRARY[k] = t;
  }
  // Chips de keywords de fichas y modo mesa (ABILITY_LIBRARY) y términos en
  // mayúsculas de GENERAL_TERMS_LIBRARY. Los marcadores conservan su texto
  // largo (reglas de Placing/Spending del Rulebook 1.0.2).
  for (const lib of [ABILITY_LIBRARY]) {
    for (const k of Object.keys(lib)) {
      if (k !== k.toUpperCase() || lib[k].type === 'tier' || lib[k].type === 'marker') continue;
      const t = glossaryText(k);
      if (t) lib[k] = Object.assign({}, lib[k], { summary: t });
    }
  }
})();


