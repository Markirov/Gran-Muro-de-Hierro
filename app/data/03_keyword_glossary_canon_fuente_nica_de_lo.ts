// @ts-nocheck
/* ======================================================================
   KEYWORD GLOSSARY (canon) — fuente única de los textos de keywords.
   Base: Keyword Glossary del Digital Rulebook 1.0.2 (pp.52-57, publicado
   el 09-sep-2026 en trenchcrusade.com/rules), aclaraciones de Rules
   Commentaries 1.0.2, y el texto del Rulebook 1.0.1 en `prev`.
   Textos resumidos en español (no traducción literal).
     text  → versión vigente (1.0.1 + erratas 1.0.2)
     prev  → texto 1.0.1 si la 1.0.2 lo cambió; null si la
             keyword es nueva en 1.0.2; ausente si no cambió
     note  → aclaración de Rules Commentaries 1.0.2 (opcional)
     match → patrón de nombres de keyword que cubre (paramétricas: X)
   Lo consumen lookupRuleText (modo mesa, tarjetas) y las librerías
   WEAPON_KEYWORD_LIBRARY / KEYWORD_LIBRARY, que se sincronizan con él.
   ====================================================================== */
export const KEYWORD_GLOSSARY = [
  { key: '+/- DICE', type: 'Efecto', src: 'Rulebook 1.0.2', match: /^[+-]\d+ DICE$/,
    text: 'Dados que se añaden (o restan) a las Success Rolls. Si la keyword está en un arma, solo afecta a los ataques hechos con ella.' },
  { key: '+/- INJURY DICE', type: 'Efecto', src: 'Rulebook 1.0.2', match: /^[+-]\d+ INJURY DICE$/,
    text: 'Dados que se añaden (o restan) a las Injury Rolls. Si la keyword está en un arma, solo afecta a las Injury Rolls de sus ataques.' },
  { key: '+/- INJURY MODIFIER', type: 'Efecto', src: 'Rulebook 1.0.2', match: /^[+-]\d+ INJURY MODIFIER$/,
    text: 'Modificador que se aplica al resultado de la Injury Roll. Si la keyword está en un arma, solo afecta a las Injury Rolls de sus ataques; en armaduras y escudos, a las Injury Rolls contra quien los lleva.' },
  { key: 'ACTION', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'Actividad que un modelo puede realizar al activarse. Las más comunes son Move, Dash, Shoot y Fight.' },
  { key: 'AMMUNITION (X)', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', match: /^AMMUNITION( \(.+\))?$/, prev: null,
    text: 'La pieza se usa en la siguiente partida del modelo. Al desplegarlo, eliges 1 arma a distancia que gana la keyword X hasta el final de la partida. Esa arma no puede tener ya BLAST, FIRE, GAS ni SHRAPNEL, ni más de un tipo de AMMUNITION.',
    note: 'Las armas PISTOL también aplican la munición cuando se usan en cuerpo a cuerpo (Rules Commentaries, Keywords Q4).' },
  { key: 'ARMOUR PIERCING', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)', match: /^ARMOUR[- ]PIERCING$/,
    text: 'Reduce en 1, hasta un mínimo de 0, el -INJURY MODIFIER total que el objetivo obtiene de su característica de Armour y de las piezas de Armour o Shield que lleve. Ej.: Standard Armour + Trench Shield pasa de -2 a -1.',
    prev: 'Reduce en 1, hasta un mínimo de 0, el -INJURY MODIFIER total que el objetivo obtiene de su Armour y/o Shields. Ej.: Standard Armour + Trench Shield pasa de -2 a -1.' },
  { key: 'ARTIFICIAL', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'El modelo no es de origen biológico natural: está construido con elementos no orgánicos.' },
  { key: 'ASSAULT', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Hacer ataques a distancia con esta arma no impide que el modelo tome una acción de Charge o Fight en la misma activación.' },
  { key: 'AUTOMATIC (X)', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)', match: /^AUTOMATIC( \(?\d+\)?)?$/,
    text: 'Al tomar una acción Shoot y elegir esta arma puedes hacer X ataques a distancia con ella, uno tras otro. Pueden ir a enemigos distintos si están a 6" o menos entre sí. Cada ataque se resuelve por separado (pasos 2 a 6 de la secuencia de ataque a distancia) y los BLOOD MARKERS o BLESSING MARKERS gastados solo modifican la Injury Roll del ataque en que se gastan.',
    prev: 'Puedes hacer X ataques a distancia con el arma, uno tras otro. Pueden ir a enemigos distintos si están a 6" o menos entre sí. Cada ataque se resuelve por separado (pasos 2 a 6 de la secuencia de ataque a distancia) y los BLOOD MARKERS gastados solo modifican la Injury Roll del ataque en que se gastan.' },
  { key: 'BLACK GRAIL', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'El modelo pertenece a la facción Cult of the Black Grail.' },
  { key: 'BLAST (X")', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)', match: /^BLAST( \(?\d+"\)?)?$/,
    text: 'Radio de explosión de X pulgadas (también en vertical). Eliges como objetivo un modelo enemigo o un punto visible del campo de batalla o de una pieza de escenografía, dentro de Line of Sight y alcance. Si la Success Roll falla, el ataque no tiene efecto (salvo SCATTER). Con Success o Critical son alcanzados todos los modelos dentro del radio que tengan Line of Sight al objetivo, y también los modelos propios que estén a 1" o menos de un enemigo alcanzado. El radio se mide desde el centro de la peana (o del punto) hasta lo más cercano de la peana del otro modelo. Injury Roll a cada modelo alcanzado; con Critical, los INJURY DICE extra solo se suman al objetivo elegido.',
    prev: 'Radio de explosión de X pulgadas (también en vertical). Eliges como objetivo un punto del campo de batalla o un modelo enemigo, dentro de Line of Sight y alcance. Si la Success Roll falla, el ataque no tiene efecto (salvo SCATTER). Con Success o Critical se hace una Injury Roll a cada modelo dentro del radio que tenga línea de visión con el punto objetivo. Con Critical, el +1 INJURY DICE solo se suma al modelo elegido como objetivo.',
    note: 'No se puede apuntar al suelo bajo la peana de un modelo (Q1). Si el objetivo es un modelo, el radio se mide desde el centro de su peana (Q6). Alcanza a los modelos con Line of Sight al punto cuya peana esté dentro del radio (Q8). Un modelo alcanzado por estar a 1" de un enemigo alcanzado no arrastra a su vez a otros (Q9). Revisión de reglas abril 2026 (beta): las granadas con BLAST no pueden apuntar a un punto del campo de batalla, solo a un modelo enemigo.' },
  { key: 'BLESSED X', type: 'Efecto', src: 'Rulebook 1.0.2', match: /^BLESSED( "?\d+"?)?$/,
    text: 'La primera vez que despliegas el modelo en la partida, coloca junto a él X BLESSING MARKERS.' },
  { key: 'BLESSING MARKER', type: 'Etiqueta', src: 'Rulebook 1.0.2', match: /^BLESSING MARKERS?$/,
    text: 'El modelo está bajo una mejora sobrenatural o química que le da beneficios temporales (ver BLESSING MARKERS).' },
  { key: 'BLOCK', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)',
    text: '-1 DICE a los ataques cuerpo a cuerpo contra un modelo con esta keyword (o con un arma que la tenga) si el atacante ha hecho una acción de Charge antes del ataque en este turno.',
    prev: '-1 DICE a los ataques cuerpo a cuerpo contra un modelo con esta keyword (o con un arma que la tenga) si el atacante ha hecho una acción de Charge antes del ataque en esta ronda.' },
  { key: 'BLOOD MARKER', type: 'Etiqueta', src: 'Rulebook 1.0.2', match: /^BLOOD MARKERS?$/,
    text: 'Se colocan junto a los modelos que sufren heridas (ver BLOOD MARKERS). Un modelo no puede tener más de 6.' },
  { key: 'CLEAVE (X)', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', match: /^CLEAVE( \(?\d+\)?)?$/, prev: null,
    text: 'Al tomar una acción Fight y elegir esta arma puedes hacer X ataques cuerpo a cuerpo con ella, uno tras otro, contra el mismo enemigo o contra varios. Cada ataque se resuelve por separado (pasos 2 a 4 de la secuencia de ataque cuerpo a cuerpo) y los BLOOD MARKERS o BLESSING MARKERS gastados solo modifican la Injury Roll del ataque en que se gastan.' },
  { key: 'CONSUMABLE', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'En campaña, la pieza se pierde al final de la partida en la que se usa.' },
  { key: 'COVER', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'El modelo tiene los modificadores de ataque por Cover o Defended Obstacle.' },
  { key: 'CRITICAL', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Con un Critical Success en un ataque con esta arma se añaden +2 INJURY DICE en lugar de +1.' },
  { key: 'CUMBERSOME', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'El arma requiere dos manos aunque el modelo tenga STRONG, pero puede usarse junto a un escudo con la estipulación Shield Combo.' },
  { key: 'DANGEROUS TERRAIN', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', match: /^DANGEROUS TERRAIN( \(.+\))?$/, prev: null,
    text: 'Si activas un modelo que está en este terreno, o entra en él durante un movimiento, haz una Risky Success Roll. Con éxito sigue moviendo y no repite la tirada por más terreno peligroso en ese movimiento; si falla, haz una Injury Roll al modelo y su activación termina. Si lleva keywords entre paréntesis, p. ej. DANGEROUS TERRAIN (FIRE), esas Injury Rolls tienen esas keywords.' },
  { key: 'DEADLY', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', match: /^DEADLY( \d+)?$/, prev: null,
    text: 'Las Injury Rolls de los ataques con esta arma se tiran con 3D6 sumando los tres dados. Los +/- INJURY DICE se añaden normalmente, pero te quedas con los 3 dados más altos (o más bajos) en lugar de 2.' },
  { key: 'DEMONIC', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'El modelo tiene la keyword NEGATE FIRE.' },
  { key: 'DEPLOYABLE', type: 'Etiqueta', src: 'Rulebook 1.0.2 (nueva)', prev: null,
    text: 'Battlekit representado por una miniatura o pieza de escenografía que se puede colocar durante la partida.' },
  { key: 'DIFFICULT TERRAIN', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', prev: null,
    text: 'Cada 1" que un modelo se mueve por este terreno cuenta como 2".' },
  { key: 'ELITE', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'Los miembros más veteranos y heroicos de la banda.' },
  { key: 'FEAR', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: '-1 DICE a los ataques cuerpo a cuerpo contra un modelo con esta keyword. Los modelos que causan FEAR son inmunes a FEAR.' },
  { key: 'FIRE', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Tras la Injury Roll de un arma con esta keyword, coloca 1 BLOOD MARKER extra junto al objetivo (aunque la tirada no tenga efecto).' },
  { key: 'FIRETEAM', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)',
    text: 'Grupo de dos modelos, ambos con FIRETEAM, que se forma al reclutar la banda o en el Quartermaster Step y se anota en la hoja de banda. Puedes activar a la vez los dos modelos del mismo Fireteam: haces sus ACTIONS en el orden que quieras, alternando libremente. Si la activación de uno termina durante esa activación conjunta (p. ej., por una Risky fallida), termina también para el otro. Un modelo no puede estar en más de 1 Fireteam.',
    prev: 'Grupo de dos modelos, ambos con FIRETEAM, que se forma al reclutar la banda o en el Quartermaster Step y se anota en la hoja de banda. Puedes activar a la vez los dos modelos del mismo Fireteam: haces sus ACTIONS en el orden que quieras, alternando libremente. Si la activación de uno termina durante esa activación conjunta (p. ej., por una Risky fallida), termina también para el otro.',
    note: 'Si activas un miembro por separado, no puedes volver a activarlo más tarde en el mismo turno junto a su Fireteam (Q2).' },
  { key: 'FLAMETHROWER', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'El ataque a distancia con esta arma es un Success automático: no se hace Success Roll y, por tanto, no puede ser Critical.' },
  { key: 'FLYING', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', prev: null,
    text: 'Al mover, retirarse o cargar, la trayectoria se mide "por el aire"; debe terminar sobre el campo de batalla o una pieza de escenografía. Sigue haciendo la Risky Success Roll si se activa o termina en terreno peligroso y no puede terminar en terreno infranqueable. No hace Injury Roll si cae.' },
  { key: 'FUMBLE', type: 'Efecto', src: 'Revisión de reglas abril 2026 (beta sobre 1.0.2)', prev: null,
    text: 'Si la Success Roll de un ataque con esta arma es 2 o menos, el atacante se lo hace a sí mismo en vez de al objetivo: trátalo como un ataque con éxito de esa arma contra el modelo atacante.' },
  { key: 'GAS', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Tras la Injury Roll de un arma con esta keyword, coloca 1 BLOOD MARKER extra junto al objetivo (aunque la tirada no tenga efecto).' },
  { key: 'GOLEM', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Trata un resultado de Out of Action como Down, salvo que lo cause una Bloodbath Roll. Su propio jugador no puede retirarle BLOOD MARKERS (el rival sí puede usarlos). Tiene NEGATE FEAR y NEGATE GAS, pero no puede tener TOUGH.' },
  { key: 'HEAVY', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Un modelo no puede llevar más de una pieza con HEAVY y no recibe Charge Bonus al cargar. Si es un arma a distancia o granada, no puede usarse para atacar en la misma activación en que el modelo hace Move, Charge, Retreat o Dash.' },
  { key: 'HERETIC', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'El modelo pertenece a la facción Heretic Legions.' },
  { key: 'HELD', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)',
    text: 'La pieza ocupa una mano y no se puede soltar: el modelo solo puede equipar o usar además un arma de 1 mano o un escudo (ni armas de 2 manos, ni arma y escudo aunque el escudo tenga Shield Combo). Sí puede llevar granadas.',
    prev: 'La pieza ocupa una mano y no se puede soltar: el modelo solo puede llevar además un arma de 1 mano o un escudo (ni armas de 2 manos, ni arma y escudo aunque el escudo tenga Shield Combo). Sí puede llevar granadas.' },
  { key: 'IGNORE ARMOUR', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Los ataques con esta keyword ignoran los -INJURY DICE y -INJURY MODIFIERS de la característica de Armour del objetivo y de sus piezas de Armour o Shield.',
    note: 'No ignora las reglas especiales de esa armadura o escudo (Q3).' },
  { key: 'IGNORE [MODIFIER]', type: 'Efecto', src: 'Rulebook 1.0.2', match: /^IGNORES? (?!ARMOUR$).+/,
    text: 'Ignora el modificador de Success Roll o Injury Roll indicado. P. ej., con IGNORE COVER el -1 DICE por Cover no afecta al ataque; con IGNORE LONG RANGE, tampoco el -1 DICE por Long Range.',
    note: 'No ignora las reglas especiales de la fuente del modificador (Q3). Un ataque con IGNORE LONG RANGE o IGNORE COVER no cuenta para Glorious Deeds que exijan esos modificadores (Scenarios Q1).' },
  { key: 'IMPASSABLE TERRAIN', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', prev: null,
    text: 'Los modelos no pueden moverse sobre ni a través de terreno con esta keyword.' },
  { key: 'IMPERVIOUS', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'ARMOUR PIERCING e IGNORE ARMOUR no afectan a los -INJURY DICE ni -INJURY MODIFIERS de la pieza con esta keyword. El resto de piezas del modelo se ven afectadas normalmente.' },
  { key: 'INFECTION MARKERS', type: 'Etiqueta', src: 'Rulebook 1.0.2', match: /^INFECTION MARKERS?$/,
    text: 'El modelo sufre una dolencia sobrenatural o química con efectos temporales (ver INFECTION MARKERS en Warbands of Trench Crusade).' },
  { key: 'INFILTRATOR', type: 'Efecto', src: 'Revisión de reglas abril 2026 (beta sobre 1.0.2)',
    text: 'La primera vez que se despliega puede colocarse en cualquier punto fuera de la Line of Sight de todos los enemigos y a 8" o más del enemigo más cercano. Se despliega después de los modelos sin esta keyword. Si por cualquier motivo no puede desplegarse así (escenario, terreno, tamaño de mesa, habilidades o Battlekit enemigos…), puede desplegarse hasta 6" fuera de su zona de despliegue.',
    prev: 'La primera vez que se despliega puede colocarse en cualquier punto fuera de la Line of Sight de todos los enemigos y a 8" o más del enemigo más cercano. Se despliega después de los modelos sin esta keyword; si no puede hacerlo así, se despliega normalmente en su zona.' },
  { key: 'LEADER', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: '+1 DICE a los Morale Checks si la banda tiene en el campo al menos un modelo con esta keyword que no esté Down ni Out of Action.' },
  { key: 'MERCENARY', type: 'Efecto', src: 'Revisión de reglas abril 2026 (beta sobre 1.0.2)', prev: null,
    text: 'Mercenario: pueden reclutarlo varias facciones. No se beneficia de las reglas especiales de facción ni de variante que hablan de «modelos de una banda [Facción]» (p. ej. Concentrated Attack de New Antioch o Light Infantry de Éire), pero cuenta como amigo para las demás reglas de la banda (p. ej. Bagpipes de Alba), salvo que se diga otra cosa. En campaña cuenta para Threshold y Field Strength, completa Glorious Deeds, tira en la Trauma Table si es ELITE, asciende y gana experiencia. Su Battlekit no se puede quitar ni perder y no puede tener otro. El modificador de su armadura ya está en el perfil.' },
  { key: 'MINED', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', prev: null,
    text: 'Cuando un modelo entra en contacto con un marcador o pieza con MINED, la mina detona salvo que tenga NEGATE MINED: se hace una Injury Roll con SHRAPNEL a ese modelo y el marcador o pieza pierde MINED. Si el modelo no queda Down ni Out of Action, puede seguir moviendo. Los modelos FLYING solo la detonan si terminan el movimiento en contacto.' },
  { key: 'NEW ANTIOCH', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'El modelo pertenece a la facción Principality of New Antioch.' },
  { key: 'NEGATE [KEYWORD]', type: 'Efecto', src: 'Rulebook 1.0.2', match: /^NEGATE .+/,
    text: 'No le afecta el Efecto de la keyword indicada. P. ej., un modelo con NEGATE SHRAPNEL ignora el Efecto de SHRAPNEL.' },
  { key: 'PILGRIM', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'El modelo pertenece a la facción Trench Pilgrims.' },
  { key: 'PISTOL', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Puede usarse como arma a distancia o cuerpo a cuerpo, e incluso de ambas formas en la misma activación. A distancia usa el alcance de su perfil y la característica Ranged; en cuerpo a cuerpo puede usar la característica Ranged o Melee del modelo y servir como arma Off-Hand.',
    note: 'La munición especial (Incendiary Ammunition, Armour-Piercing Bullets...) también se aplica cuando la pistola se usa en cuerpo a cuerpo (Q4).' },
  { key: 'REGENERATE (X)', type: 'Efecto', src: 'Rulebook 1.0.2 (nueva)', match: /^REGENERATE( \(?\d+\)?)?$/, prev: null,
    text: 'Al activar el modelo, antes de hacer ninguna ACTION, puedes retirarle hasta X BLOOD MARKERS.' },
  { key: 'RELOAD', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Si el modelo ataca con esta arma, su activación termina al acabar la ACTION con la que atacó.' },
  { key: 'RISKY', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)',
    text: 'Toda Success Roll de un modelo al usar esta pieza pasa a ser Risky Success Roll (si falla, termina la activación o la ACTION). No se aplica si la tirada ya era Risky.',
    prev: 'Toda Success Roll de un modelo al usar esta pieza pasa a ser Risky Success Roll (si falla, termina la activación). No se aplica si la tirada ya era Risky.' },
  { key: 'SCATTER', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)',
    text: 'Solo en armas con BLAST. Si la Success Roll falla, el ataque se desvía en vez de fallar: 7 menos el resultado de la Success Roll en pulgadas (con un 4 → 3"). El rival mueve el ataque exactamente esa distancia en la dirección que elija, hasta un punto del campo de batalla, de la escenografía o de la peana de un modelo que tenga Line of Sight al objetivo original (si es imposible, el ataque falla). Después se resuelve quién es alcanzado como en BLAST.',
    prev: 'Solo en armas con BLAST. Si la Success Roll falla, el punto objetivo se desvía en vez de fallar: 7 menos el resultado de la Success Roll en pulgadas (con un 4 → 3"), en la dirección que elija el rival. Después se hace una Injury Roll a cada modelo dentro del radio de explosión del nuevo punto.',
    note: 'Si el ataque se desvía sobre la peana de otro modelo, el radio se mide desde el punto exacto de esa peana, no desde su centro (Q6).' },
  { key: 'SHOTGUN', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'A Long Range, los ataques con esta arma aplican -1 INJURY DICE en lugar del modificador habitual de Long Range (-1 DICE).' },
  { key: 'SHRAPNEL', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'Tras la Injury Roll de un arma con esta keyword, coloca 1 BLOOD MARKER extra junto al objetivo (aunque la tirada no tenga efecto).' },
  { key: 'SKIRMISHER', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)',
    text: 'Si un enemigo elige a este modelo como objetivo de una carga, puedes esquivar antes de la carga si no está a 1" de un enemigo: tira D3 y muévelo esa distancia, terminando a más de 1" de todos los enemigos. Si tras esquivar queda un modelo interpuesto, el que carga debe elegirlo como objetivo.',
    prev: 'Si un enemigo elige a este modelo como objetivo de una carga, puedes esquivar antes de la carga si no está a 1" de un enemigo: tira D3 y muévelo esa distancia, terminando a más de 1" de todos los enemigos.',
    note: 'Se le puede seguir cargando aunque salga de la Line of Sight del que carga (Q10).' },
  { key: 'STRONG', type: 'Efecto', src: 'Rulebook 1.0.2 (cambia)',
    text: 'Tiene la keyword NEGATE HEAVY. Además puede equipar y usar un arma cuerpo a cuerpo de 2 manos como si fuera de 1 mano.',
    prev: 'No le afecta la keyword HEAVY de su Battlekit. Además puede usar un arma cuerpo a cuerpo de 2 manos como si fuera de 1 mano.',
    note: 'Puede usar la Shovel como arma cuerpo a cuerpo a 1 mano (Rules Commentaries, Battlekit Q2).' },
  { key: 'SULTANATE', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'El modelo pertenece a la facción Sultanate of the Iron Wall.' },
  { key: 'THE COURT', type: 'Etiqueta', src: 'Rulebook 1.0.2',
    text: 'El modelo pertenece a la facción Court of the Seven-Headed Serpent.' },
  { key: 'TOUGH', type: 'Efecto', src: 'Rulebook 1.0.2',
    text: 'La primera vez que el modelo sufre un resultado de Out of Action en la Injury Table, se trata como Down.',
    note: 'Las reglas se aplican en orden: con Machine Armour (Standfast), ese Down pasa además a Minor Wound. Solo altera el primer Out of Action (Q5).' },
];

/* Entrada del glosario para un nombre de keyword (exacto, alias o
 * paramétrica). Devuelve { entry, param } o null. */
function glossaryEntryFor(name) {
  const raw = String(name || '').trim().replace(/[“”]/g, '"').replace(/''/g, '"');
  if (!raw) return null;
  const up = raw.toUpperCase();
  for (const e of KEYWORD_GLOSSARY) {
    if (e.key.toUpperCase() === up) return { entry: e, param: null };
  }
  for (const e of KEYWORD_GLOSSARY) {
    if (e.match && e.match.test(up)) {
      // Parámetro X: lo que sigue a la base del nombre ("CLEAVE 2" → "2").
      let param = null;
      if (/\bX\b|\[.+\]/.test(e.key)) {
        const base = e.key.replace(/\s*(\(?X"?\)?|\[.+\])$/, '').toUpperCase();
        const head = up.startsWith(base + 'S ') ? base + 'S' : base;  // IGNORES COVER
        param = up.slice(head.length).trim().replace(/^\((.*)\)$/, '$1').replace(/^"(\d+)"$/, '$1') || null;
      }
      return { entry: e, param };
    }
  }
  return null;
}

/* Texto canon vigente de una keyword ('' si no está en el glosario). */
export function glossaryText(name) {
  const g = glossaryEntryFor(name);
  if (!g) return '';
  if (!g.param) return g.entry.text;
  return /\[.+\]/.test(g.entry.key) ? `${g.entry.text} (Aquí: ${g.param}.)` : `${g.entry.text} (X = ${g.param}.)`;
}


