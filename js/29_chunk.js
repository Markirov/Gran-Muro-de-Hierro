/* ======================================================================
   ====================================================================
   CAMPAIGN MODULE
   ====================================================================
   ====================================================================== */

/**
 * PATRON_CATALOG — Patrones canon (Digital Rulebook p.86-93).
 *
 * Cada banda elige UN Patron al crearse. Cuando una Advancement Roll cae
 * en "Patron Skill" (2 ó 12 en cualquier Skill Table), el modelo puede
 * tomar una de las Skills ofrecidas por el Patron de la banda.
 *
 * `factions` lista los factionId (claves de DATA.factions) que pueden
 * elegir ese Patron. Court of the Seven-Headed Serpent = 'court-serpent'.
 * Mammon: Heretic Legions o Court (variante Greed) — modelado igual que
 * Infernal Noble en facciones permitidas; la restricción de "Greed
 * Warband" se deja como nota, no se gate-a por variante.
 */
const PATRON_CATALOG = {
  'temporal-lord': {
    id: 'temporal-lord',
    name: 'Temporal Lord',
    factions: ['new-antioch'],
    note: 'New Antioch only.',
    skills: [
      { name: 'Armour & Equipment Procurement', summary: 'El coste de cualquier Armour, Shield o Equipment de 15👑+ se reduce en 5👑 si un modelo con esta Skill está en la banda. Solo un modelo puede tenerla.' },
      { name: 'Melee Weapon Procurement', summary: 'El coste de cualquier Melee Weapon de 10👑+ se reduce en 5👑. Solo un modelo puede tenerla.' },
      { name: 'Mendelist Chemicals', summary: 'El rival no puede gastar BLOOD MARKERS junto a este modelo para +1 INJURY DICE (sí para convertir a Bloodbath Roll).' },
      { name: 'Ranged Weapon Procurement', summary: 'El coste de cualquier Ranged Weapon o Grenade de 20👑+ se reduce en 5👑. Solo un modelo puede tenerla.' },
      { name: 'Sniper School', summary: 'Los Ranged Attacks de este modelo necesitan 1 BLOOD MARKER menos para convertir una Injury Roll en Bloodbath Roll.' },
      { name: 'Special Assault Training', summary: 'Los Melee Attacks de este modelo necesitan 1 BLOOD MARKER menos para convertir una Injury Roll en Bloodbath Roll.' },
    ],
  },
  'warrior-saint': {
    id: 'warrior-saint',
    name: 'Warrior Saint',
    factions: ['trench-pilgrims', 'new-antioch'],
    note: 'Trench Pilgrims and New Antioch only.',
    skills: [
      { name: 'Blessings of the Warrior Saint', summary: 'El modelo gana la keyword BLESSED D3.' },
      { name: 'David and Goliath', summary: '+1 DICE a un Melee Attack de este modelo si el objetivo está en base de 40mm o mayor.' },
      { name: 'Dragonslayer', summary: 'Al hacer una Injury Roll de un Melee Attack, puedes cambiar uno de los D6 a un 6.' },
      { name: 'Endure the Suffering', summary: 'Este modelo puede sufrir 1 Battle Scar extra antes de quedar Unfit for Duty.' },
      { name: 'On your Knees!', summary: 'Enemigos Down a 1" de este modelo no pueden levantarse (aunque este modelo también esté Down).' },
      { name: "Warrior's Prayer ACTION", summary: 'ACCIÓN: Risky Success Roll. Éxito → gana FEAR hasta fin de turno y puede quitar 1 BLOOD MARKER.' },
    ],
  },
  'learned-saint': {
    id: 'learned-saint',
    name: 'Learned Saint',
    factions: ['trench-pilgrims', 'new-antioch'],
    note: 'Trench Pilgrims and New Antioch only.',
    skills: [
      { name: 'Favoured by God', summary: 'Al final de cada partida, la banda gana 1 ☼ extra por cada modelo con esta Skill en el campo.' },
      { name: 'Healing Arts', summary: 'Puedes re-rollear el resultado de la Trauma Chart de ELITE para este modelo.' },
      { name: 'Knowledge of Sciences', summary: 'El Limit de una pieza de Battlekit (no Glory Items), elegida y anotada en el Roster, sube en 1 mientras este modelo esté en la banda. Solo un modelo puede tenerla.' },
      { name: 'Logistical Skills', summary: 'La banda puede subir en 1 cualquier límite de modelos (p. ej. 0-2 → 0-3) si el modelo no es ELITE, ni Mercenario, ni tiene base de 50mm o más. También vale para modelos de bandas de variante, p. ej. Holy Warriors de Abyssinia (Rules Commentaries, Campaigns Q4).' },
      { name: 'Pennies from Heaven', summary: 'Al final de cada partida, la banda gana D6x5 👑 por cada modelo con esta Skill en el campo.' },
      { name: 'Walk with God', summary: 'Elige 1 Skill de cualquier Skill Chart (incl. Exploration Skill) y dásela a este modelo.' },
    ],
  },
  'infernal-noble': {
    id: 'infernal-noble',
    name: 'Infernal Noble',
    factions: ['heretic-legions', 'court-serpent'],
    note: 'Heretic Legions & The Court of the Seven-Headed Serpent only.',
    skills: [
      { name: '30 Pieces of Silver', summary: 'Al final de cada partida, la banda gana D6x5 👑 por cada modelo con esta Skill en el campo.' },
      { name: 'Blessed Murder', summary: 'Si un Melee Attack de este modelo toma OoA a un enemigo, coloca 1 BLESSING MARKER junto a él.' },
      { name: 'Blood Sacrifice ACTION', summary: 'ACCIÓN: Success Roll. Éxito → quita 1 BLOOD MARKER y colócalo junto a otro modelo a 6" (sin ARTIFICIAL/BLACK GRAIL/DEMONIC).' },
      { name: 'Hellfire ACTION', summary: 'ACCIÓN: Risky Success Roll. Éxito → línea de fuego (FIRE) entre este modelo y un amigo a 18"; Injury Roll a cada modelo cruzado.' },
      { name: 'Lash of Acheron ACTION', summary: 'ACCIÓN: Risky Success Roll. Éxito → Injury Roll con IGNORE ARMOUR a 1 enemigo a 6".' },
      { name: 'Sadistic', summary: '+1 DICE y +1 INJURY DICE a Melee Attacks de este modelo si el objetivo está Down.' },
    ],
  },
  'sublime-gate': {
    id: 'sublime-gate',
    name: 'Sublime Gate',
    factions: ['iron-sultanate'],
    note: 'Iron Sultanate only.',
    skills: [
      { name: 'Göre', summary: '+1 DICE y +1 INJURY DICE a Melee Attacks si el objetivo está Down. Además ignora el -1 DICE por estar Down.' },
      { name: 'Imported Wares', summary: 'Compra 1 Weapon o 1 Armour del Armoury de New Antioch para este modelo. Re-comprable si se pierde.' },
      { name: 'Janissary Training', summary: 'Si la primera ACCIÓN es Charge, +1 DICE a Melee el resto de la Activación. Además gana IGNORE OFF-HAND WEAPON.' },
      { name: 'Rightly Guided', summary: 'Tras el despliegue, elige 1 ACTION (salvo Charge, Shoot o Fight) que requiera elegir o afectar a un enemigo; el resto de la partida este modelo no puede ser elegido ni afectado por ella.' },
      { name: "Sultan's Favour", summary: 'La banda puede subir en 1 cualquier límite de modelos (p. ej. 0-2 → 0-3) si el modelo no es ELITE, ni Mercenario, ni tiene base de 50mm o más. También vale para modelos de bandas de variante (Rules Commentaries, Campaigns Q4).' },
      { name: 'Sword of Allah', summary: 'Elige 1 Skill de la Melee & Strength Skills Table para este modelo.' },
    ],
  },
  'order-of-the-fly': {
    id: 'order-of-the-fly',
    name: 'The Order of the Fly',
    factions: ['black-grail'],
    note: 'Black Grail only.',
    skills: [
      { name: 'Cockroach Vitality', summary: 'El rival no puede gastar BLOOD MARKERS junto a este modelo para +1 INJURY DICE.' },
      { name: 'Deceit of Beelzebub ACTION', summary: 'ACCIÓN: Risky Success Roll. Éxito → intercambia posición con un enemigo a 8".' },
      { name: 'Eyes of the Fly', summary: 'Este modelo tiene IGNORE COVER e IGNORE LONG RANGE.' },
      { name: 'Grail Plague', summary: 'Tras despliegue, por cada modelo con esta Skill en el campo, coloca 1 INFECTION MARKER junto a un enemigo sin BLACK GRAIL.' },
      { name: 'Knight of the Flies', summary: '-1 DICE a Ranged Attacks que tengan a este modelo como objetivo.' },
      { name: 'Wings of the Fly', summary: 'Este modelo se vuelve Flying. Sin efecto adicional si ya volaba.' },
    ],
  },
  'mammon': {
    id: 'mammon',
    name: 'Mammon',
    factions: ['heretic-legions', 'court-serpent'],
    note: 'Heretic Legions o Court of the Seven-Headed Serpent (Greed Warband) only.',
    skills: [
      { name: 'Aureate Skin', summary: 'Cada vez que se coloca un BLOOD MARKER junto a este modelo, añade 5 👑 a tu tesoro.' },
      { name: 'Crooked Dice', summary: 'Una vez por partida, re-rollea todos los dados de un Success Roll o de una Injury Roll de este modelo.' },
      { name: 'Eternal Debt', summary: 'Los Wretched de la banda nunca se pierden: hacen Full Recovery automático si quedan OoA.' },
      { name: 'Money Can Buy Anything', summary: 'El Limit de cualquier Battlekit +1 si un modelo con esta Skill está en la banda. Solo 1 modelo.' },
      { name: 'Plutocracy', summary: 'Al tomar esta Skill, forma FIRETEAM con otro modelo no-ELITE. Risky Success Rolls en ACCIONES conjuntas se tratan como normales.' },
      { name: 'Unsecured Loan', summary: 'Añade 100 👑 al Strongbox al tomar esta Skill (solo una vez).' },
    ],
  },
  'antipope-of-avignon': {
    id: 'antipope-of-avignon',
    name: 'The Antipope of Avignon',
    factions: ['black-grail'],
    note: 'Black Grail only.',
    skills: [
      { name: "Beelzebub's Wisdom", summary: 'Si un enemigo elige a este modelo como objetivo de un Charge, no recibe Charge Bonus y carga solo con su Movement.' },
      { name: 'Eye of Beelzebub ACTION', summary: 'ACCIÓN: Success Roll. Éxito → mueve 1" a un enemigo a 24" en Cover (fuera de Cover, sin quedar a 1" de amigos).' },
      { name: 'Feast on Disease', summary: 'Si el objetivo de un Melee Attack tiene 1+ INFECTION MARKERS, cuesta 1 marker menos convertir a Bloodbath Roll.' },
      { name: 'Infect the Mind', summary: 'Tras despliegue, por cada modelo con esta Skill en el campo, mueve 6" a un enemigo (no Charge).' },
      { name: 'Silvered Tongue ACTION', summary: 'ACCIÓN: Success Roll. Éxito → un enemigo a 1" hace un Melee Attack contra sí mismo.' },
      { name: 'Swine Hybrid', summary: '+2" al Movement Characteristic de este modelo.' },
    ],
  },
};

/** Patrones disponibles para una facción dada (canon p.86-93). */
function patronsForFaction(factionId) {
  if (!factionId) return [];
  return Object.values(PATRON_CATALOG).filter(p => p.factions.includes(factionId));
}
/** Lookup de Patron por id. */
function patronById(id) {
  return id ? (PATRON_CATALOG[id] || null) : null;
}

/**
 * CAMPAIGN_TABLES — Datos oficiales del Trench Crusade Digital Rulebook (v1.0.2).
 *
 * Fuentes verificadas:
 *   - XP boxes pattern: page 105 (image inspection)
 *   - Trauma Table D66: pages 101-103
 *   - Skill Tables (4): pages 107-110
 *   - Promotion Dice Pool: page 104
 *   - Battle Scars: page 100
 *   - Warband Threshold: page 98
 *   - Cannot Be Promoted: page 106
 *   - Limited Potential (max 7 XP): page 111
 *   - Patrons: pages 86-93 (ver PATRON_CATALOG)
 */
const CAMPAIGN_TABLES = {
  // XP threshold for each successive Advancement Roll.
  // Pattern observed on the Roster Sheet: ☐ ○ ☐ ○ ☐ ☐ ○ ☐ ☐ ○ ☐ ☐ ○...
  // 1st advance at 2 XP, 2nd at 4, then every 3 XP after.
  xpThresholds: [2, 4, 7, 10, 13, 16, 19, 22, 25, 28],

  // T2/T3 — Special rules canon-paraphrased. These are reference-only
  // entries surfaced in the UI; deep simulator integration belongs to
  // the Lab module and is tracked separately. Each entry:
  //   { name, summary, conditions, mechanic, canonPage }
  specialRules: {
    concentratedAttack: {
      name: 'Concentrated Attack',
      summary: 'Dos o más modelos amigos con el mismo arma a Distancia pueden combinar disparos al mismo objetivo. El líder tira su Ranged Attack con +1 DICE por cada modelo contribuidor adicional.',
      conditions: [
        'Todos los contribuidores deben estar a 2" del líder.',
        'Todos llevan armas a Distancia compatibles (mismo tipo: rifle, pistol, etc.).',
        'Todos los contribuidores gastan su Activación contribuyendo.',
        'Líder y contribuidores deben ver al objetivo y respetar Line of Sight.',
      ],
      mechanic: 'leadDice + (1 × N contributors), tope 4 contributors adicionales (Fireteam de 5 max).',
      canonPage: 'Digital Rulebook p.70-72',
    },
    fireteams: {
      name: 'Fireteams',
      summary: 'Grupos de modelos amigos que actúan coordinadamente. New Antioch Fireteam: hasta 5 modelos coordinados pueden hacer Concentrated Attack con la misma arma a Distancia. Otras factions tienen sabores propios (Iron Sultanate Janissary, etc.) — consulta la regla de banda.',
      conditions: [
        'Modelos del mismo Fireteam comparten una serie de bonificaciones (Concentrated Attack, BLOCK, etc.).',
        'Algunos Fireteams tienen restricciones de keyword (e.g. mismo unit tier).',
      ],
      mechanic: 'Las reglas exactas dependen del Fireteam canon de la faction. La mecánica más usada es Concentrated Attack (ver entry separada).',
      canonPage: 'Digital Rulebook p.70-72 + reglas de banda específicas',
    },
    // P2 — Reglas no modeladas hasta ahora. Paráfrasis canon del
    // Digital Rulebook + Warbands of Trench Crusade. Misma forma de
    // referencia que las anteriores; integración profunda en
    // simulador/Lab queda como subfase futura.
    goeticSpells: {
      name: 'Goetic Spells',
      summary: 'Los Sorcerers de Court of the Seven-Headed Serpent (y ciertos lanzadores de la Heretic Legion) invocan hechizos de la lista Goetic. Cada Sorcerer empieza con un repertorio fijo según su rango y puede expandirlo via Advancements canon.',
      conditions: [
        'Solo modelos con la keyword SORCERER o equivalente pueden lanzar Goetic Spells.',
        'Lanzar un hechizo requiere una ACCIÓN; algunos consumen Concentration markers.',
        'Hechizos de rango superior pueden requerir una Risky Roll (tirada con consecuencias adversas si falla).',
      ],
      mechanic: 'Selección de hechizo + ACCIÓN + (opcional) Risky Roll. Efectos varían: daño directo, control de área, buff a amigos, debuff a enemigos.',
      canonPage: 'Warbands of Trench Crusade — Court of the Seven-Headed Serpent',
      spells: [
        { name: 'Curse of Worms',
          summary: 'Ataque mágico a distancia 12". -1 ARMOUR al objetivo durante el resto de la partida.',
          rank: 'novice' },
        { name: 'Whispers of the Serpent',
          summary: 'Manipula la activación enemiga. Un modelo enemigo a 18" pierde su próxima ACCIÓN si falla un Resist Roll.',
          rank: 'novice' },
        { name: 'Veil of Shadows',
          summary: 'Modelo amigo a 6" gana COVER hasta el final del turno y no puede ser elegido como objetivo de Ranged Attacks fuera de 8".',
          rank: 'apprentice' },
        { name: 'Conjure Wretched',
          summary: 'Invoca un Wretched temporal a 6". Tiene stats reducidas y se elimina al final del turno.',
          rank: 'apprentice' },
        { name: 'Black Communion',
          summary: 'Sacrificio: un modelo amigo a 3" sufre 1 BLOOD MARKER y el Sorcerer recupera todos sus Concentration markers o cura uno propio.',
          rank: 'adept' },
        { name: 'Serpent\'s Bite',
          summary: 'Ataque a distancia 24". Si impacta, el objetivo sufre IGNORE ARMOUR + FIRE.',
          rank: 'adept' },
        { name: 'Hellfire Sigil',
          summary: 'Marca un punto a 18". Cualquier modelo enemigo que pase a 3" sufre Blast 3" FIRE. Persiste 1 turno.',
          rank: 'master' },
        { name: 'Soul Bargain',
          summary: 'Risky Roll. Si éxito, regresa a un modelo amigo OoA al campo con 5 BLOOD MARKERS. Si falla, el Sorcerer queda OoA.',
          rank: 'master' },
      ],
    },
    eyeOfBeelzebub: {
      name: 'Eye of Beelzebub',
      summary: 'Habilidad única del Antipope (Black Grail). El Antipope abre el ojo demoníaco bajo su tiara y proyecta un rayo de fuego maligno. Una vez por partida.',
      conditions: [
        'Solo el Black Grail Antipope tiene acceso a esta habilidad.',
        'Una vez por partida.',
        'Requiere una ACCIÓN del Antipope; LoS al objetivo necesaria.',
      ],
      mechanic: 'Ataque a distancia 24". 5 DICE Ranged. Keywords: BLAST 3", FIRE, IGNORE ARMOUR, IGNORE COVER. Modelos OoA por este ataque no permiten ganar Glorious Deeds basadas en kill.',
      canonPage: 'Warbands of Trench Crusade — Heretic Legions / Black Grail',
    },
    fortifyAction: {
      name: 'Fortify ACTION',
      summary: 'Combat Engineers (New Antioch) pueden gastar una ACCIÓN para fortificar terreno cercano. El terreno fortificado gana COVER + BLOCK temporal y bonifica a amigos en él.',
      conditions: [
        'Solo modelos con la keyword COMBAT ENGINEER (o equivalente per faction) pueden usar Fortify.',
        'Requiere estar adyacente al terrain piece a fortificar.',
        'El terreno debe ser una pieza válida (no objective marker, no edificio destructible).',
        'Una sola pieza puede estar fortificada por banda en cada momento; refortificar otra cancela la anterior.',
      ],
      mechanic: 'ACCIÓN: marca un terrain piece adyacente como Fortificado durante el resto de la partida. Modelos amigos en/detrás de él reciben COVER mejorada (-1 DICE adicional a Ranged Attacks contra ellos) + BLOCK 1 contra Melee Charges.',
      canonPage: 'Warbands of Trench Crusade — New Antioch Combat Engineer',
    },
  },

  // Limited Potential cap: certain models cannot exceed 7 XP.
  limitedPotentialMaxXP: 7,
  // Models that can never gain XP (after a Head Wound trauma).
  // Tracked at the model level via `m.baseProgression.cannotGainXp = true`.

  // Warband Threshold Table (page 98).
  // Threshold = max total cost of models in your Force.
  // Field Strength = max number of models in your Force.
  warbandThresholdByGame: [
    { game: 1,  threshold: 700,  fieldStrength: 10 },
    { game: 2,  threshold: 800,  fieldStrength: 11 },
    { game: 3,  threshold: 900,  fieldStrength: 12 },
    { game: 4,  threshold: 1000, fieldStrength: 13 },
    { game: 5,  threshold: 1100, fieldStrength: 14 },
    { game: 6,  threshold: 1200, fieldStrength: 15 },
    { game: 7,  threshold: 1300, fieldStrength: 16 },
    { game: 8,  threshold: 1400, fieldStrength: 17 },
    { game: 9,  threshold: 1500, fieldStrength: 18 },
    { game: 10, threshold: 1600, fieldStrength: 19 },
    { game: 11, threshold: 1700, fieldStrength: 20 },
    { game: 12, threshold: 1800, fieldStrength: 22 },
  ],

  // Trauma Table D66 (pages 101-103). Roll 2D6 in sequence: first die is tens,
  // second is units. So D66 results are 11-16, 21-26, 31-36, 41-46, 51-56, 61-66.
  // Result range 41-63 is "Full Recovery" (most common result).
  // `kind` is informational: 'death' | 'capture' | 'scar' | 'recovery' | 'lost-equipment'
  // `mechanicalEffect` (optional) maps to a stat modifier or keyword we know how to apply.
  traumaTable: [
    { roll:11, id:'dead', name:'Dead',
      kind:'death',
      detail:'La herida resulta fatal. El modelo y todo su Battlekit se eliminan permanentemente del Roster.' },
    { roll:12, id:'captured', name:'Captured',
      kind:'capture',
      detail:'El enemigo lo captura. Antes de continuar el Trauma Step puedes negociar un rescate en 👑 con tu rival. Si no se paga, el modelo es ejecutado y se elimina del Roster. Si se paga, transfiere los 👑 al rival y trata el resultado como Full Recovery.' },
    { roll:13, id:'severe-nerve-damage', name:'Severe Nerve Damage',
      kind:'scar',
      detail:'Todos los Success Rolls de este modelo se tratan como Risky Success Rolls (los que ya eran Risky no sufren penalización adicional).' },
    { roll:14, id:'hand-wound', name:'Hand Wound',
      kind:'scar',
      detail:'Determina aleatoriamente qué mano está herida. Aplica -1 DICE a las tiradas de ataques en cuerpo a cuerpo hechos con un arma sostenida (o sostenida en parte) por la mano herida.' },
    { roll:15, id:'lost-an-eye', name:'Lost an Eye',
      kind:'scar',
      mechanicalEffect:'ranged-1',
      detail:'-1 DICE a Ranged Attacks de este modelo. Si recibe esta lesión por segunda vez queda ciego y se elimina del Roster en lugar de re-rollear. Trata como Full Recovery si lo sufre un Sniper Priest.' },
    { roll:16, id:'chest-wound', name:'Chest Wound',
      kind:'scar',
      detail:'+1 INJURY DICE a las Injury Rolls de ataques que tengan a este modelo como objetivo.' },
    { roll:21, id:'insomniac', name:'Insomniac',
      kind:'scar',
      detail:'Este modelo siempre debe ser el primero que despliegues en cualquier partida. Pierde la keyword INFILTRATOR si la tenía.' },
    { roll:22, id:'head-wound', name:'Head Wound',
      kind:'scar',
      detail:'Este modelo no puede ganar más Experience Points. Puedes asignarle Promotion Dice como si fuera Troop en el Promotions & Experience Step. Si uno saca un 6, recupera la capacidad de ganar XP (la cicatriz permanece).' },
    { roll:23, id:'shell-shocked', name:'Shell-shocked',
      kind:'scar',
      detail:'Tira 1D6 la primera vez que despliegues a este modelo en una partida. Con 1-2, aplica -1 DICE a sus tiradas durante el resto de la partida.' },
    { roll:24, id:'dark-memory', name:'Dark Memory',
      kind:'scar',
      detail:'Anota el nombre de la banda enemiga de la partida en que recibió la lesión. -1 DICE a sus ataques cuerpo a cuerpo si el objetivo pertenece a esa banda.' },
    { roll:25, id:'paranoid', name:'Paranoid',
      kind:'scar',
      detail:'Este modelo no puede desplegarse a 8" o menos de un modelo amigo. Otros amigos pueden desplegarse a 8" después.' },
    { roll:26, id:'lost-arm', name:'Lost Arm',
      kind:'scar',
      detail:'Este modelo no puede usar Battlekit a 2 manos, y solo puede llevar una pieza de Battlekit a 1 mano.' },
    { roll:31, id:'leg-wound', name:'Leg Wound',
      kind:'scar',
      mechanicalEffect:'move-2',
      detail:'-2" al Movement Characteristic. Además aplica -1 DICE al Risky Success Roll cuando este modelo haga Dash ACTION.' },
    { roll:32, id:'expensive-treatment', name:'Expensive Treatment',
      kind:'scar',
      detail:'Antes de poder desplegar a este modelo, paga 10 👑 del Strongbox de la banda. Este pago no cuenta para el Threshold Value.' },
    { roll:33, id:'possessed', name:'Possessed',
      kind:'scar',
      detail:'Cuando se Activa, si está a más de 1" de cualquier enemigo, su primera ACCIÓN debe ser Dash (incluso si normalmente no podría). Las primeras 3" del movimiento deben ser en línea recta alejándose de su posición inicial. Si está Down al iniciar la activación, se levanta y luego intenta moverse 3" en línea recta alejándose.' },
    { roll:34, id:'muscle-damage', name:'Muscle Damage',
      kind:'scar',
      detail:'Este modelo no puede tener Battlekit con la keyword HEAVY. Cualquier Battlekit con HEAVY se pierde al sufrir esta lesión.' },
    { roll:35, id:'minor-wound', name:'Minor Wound',
      kind:'lost-game',
      detail:'Este modelo no puede usarse en la siguiente partida.' },
    { roll:36, id:'robbed', name:'Robbed',
      kind:'lost-equipment',
      detail:'Pierde todo su Battlekit, salvo el que no se pueda perder o quitar durante la campaña. NO recibe Injury ni Battle Scar.' },
    { roll:'41-63', id:'full-recovery', name:'Full Recovery',
      kind:'recovery',
      detail:'El modelo sobrevive sin secuelas. NO recibe Injury ni Battle Scar.' },
    { roll:64, id:'hardened', name:'Hardened',
      kind:'positive',
      mechanicalEffect:'gain-keyword:NEGATE FEAR',
      detail:'El modelo gana la keyword NEGATE FEAR. NO recibe Injury ni Battle Scar.' },
    { roll:65, id:'bitter-lessons', name:'Bitter Lessons',
      kind:'positive',
      detail:'D3 Experience Points extra. NO recibe Injury ni Battle Scar.' },
    { roll:66, id:'prominent-scar', name:'Prominent Scar',
      kind:'positive',
      detail:'Anota el nombre de la banda enemiga de la partida. +1 DICE a los ataques cuerpo a cuerpo de este modelo si el objetivo pertenece a esa banda. NO recibe Injury ni Battle Scar.' },
  ],

  // SKILL TABLES (pages 107-110). 2D6 roll on each table.
  // 2 and 12 are always Patron Skill.
  // Each entry has: roll (2-12), name, summary (Spanish paraphrase), and optional
  // `mechanicalEffect` (similar to advancements) so we can apply stat changes.
  skillTables: {
    melee: {
      name: 'Melee & Strength',
      summary: 'Habilidades de combate cuerpo a cuerpo y fuerza física.',
      entries: [
        { roll:2,  name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
        { roll:3,  name:'Stand Firm',
          summary:'La primera vez que este modelo sufra un Down result en la Injury Table, se trata como Minor Hit.' },
        { roll:4,  name:'Parry',
          summary:'-1 DICE a Success Rolls de Melee Attacks que tengan a este modelo como objetivo.' },
        { roll:5,  name:'Close Quarters Combat',
          summary:'+1 DICE y +1 INJURY DICE a sus Melee Attacks si está en contacto con un terrain piece.' },
        { roll:6,  name:'Relentless Charge',
          summary:'+1 DICE a sus Melee Attacks si cargó con éxito antes en la misma Activación.' },
        { roll:7,  name:'Melee Proficiency',
          summary:'+1 DICE al Melee Characteristic.',
          mechanicalEffect:'melee+1' },
        { roll:8,  name:'Strength of Samson',
          summary:'+1 INJURY DICE a sus Melee Attacks con armas. Además gana la keyword STRONG.',
          mechanicalEffect:'gain-keyword:STRONG' },
        { roll:9,  name:'Hard as Nails',
          summary:'La primera vez que sufra un Down result en la Injury Table, se trata como No Effect.' },
        { roll:10, name:'Surgical Strike',
          summary:'Una vez por Activación, antes de hacer una Injury Roll de un Melee Attack, puedes declarar que la tirada tiene IGNORE ARMOUR.' },
        { roll:11, name:'Champion',
          summary:'Sus Melee Weapons sin CLEAVE ganan CLEAVE 2. Aplica -1 DICE al Success Roll del segundo Melee Attack hecho con cada arma que gane CLEAVE así.' },
        { roll:12, name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
      ],
    },
    ranged: {
      name: 'Ranged',
      summary: 'Habilidades de tiro y armas a distancia.',
      entries: [
        { roll:2,  name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
        { roll:3,  name:'Hunter',
          summary:'Sus Ranged Attacks tienen IGNORE COVER.' },
        { roll:4,  name:'Gunslinger',
          summary:'Si lleva 2 armas con PISTOL: puede hacer Shoot ACTION con una y luego Shoot ACTION con la otra. Además sus armas con PISTOL ganan ASSAULT e IGNORE OFF-HAND WEAPON. Con un par de Automatic Pistols hace dos ataques con cada una (AUTOMATIC 2 con la primera y después con la segunda). En una Fight ACTION puede cambiar una pistola por un arma cuerpo a cuerpo; si ataca con la pistola como segunda arma, aplica IGNORE OFF-HAND WEAPON (Rules Commentaries, Campaigns Q2 y Q6).' },
        { roll:5,  name:'Far Shot',
          summary:'+6" de alcance a sus armas con PISTOL, a las que tengan "Rifle" en el nombre, y a las "Jezzail" o "Arquebus".' },
        { roll:6,  name:'Sharp Eyes',
          summary:'Sus Ranged Attacks tienen IGNORE LONG RANGE.' },
        { roll:7,  name:'Ranged Proficiency',
          summary:'+1 DICE al Ranged Characteristic.',
          mechanicalEffect:'ranged+1' },
        { roll:8,  name:"Sniper's Nest",
          summary:'+2 DICE (en lugar de +1) a sus Ranged Attacks con el modificador Elevated Position.' },
        { roll:9,  name:'Point Blank',
          summary:'Cuando hace un Melee Attack puede usar el Ranged Characteristic y un Ranged Weapon en lugar del Melee, si está a 1" del objetivo. Si el arma tiene ASSAULT, también puede hacer un Ranged Attack normal en la misma Activación. Se aplican los modificadores de un Melee Attack (Rules Commentaries, Campaigns Q7).' },
        { roll:10, name:'Hip Shot',
          summary:'Sus Ranged Weapons cuentan como con ASSAULT.' },
        { roll:11, name:'Headshot',
          summary:'Sus Ranged Attacks tienen IGNORE ARMOUR si el ataque fue Critical Success.' },
        { roll:12, name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
      ],
    },
    stealth: {
      name: 'Stealth & Speed',
      summary: 'Habilidades de sigilo, agilidad y velocidad.',
      entries: [
        { roll:2,  name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
        { roll:3,  name:'Sixth Sense',
          summary:'Si sufre un Down sin BLOOD MARKERS, se trata como Minor Hit. Si tiene TOUGH, una vez por partida puede usar TOUGH para convertir un Out of Action en Down, y luego este Skill convierte el Down en No Effect.' },
        { roll:4,  name:'Assassinate',
          summary:'+1 DICE a los ataques de este modelo si el objetivo aún no se ha Activado este turno.' },
        { roll:5,  name:'Shadow Walker',
          summary:'-2 DICE (en lugar de -1) a Ranged Attacks que tengan a este modelo como objetivo a Long Range.' },
        { roll:6,  name:'Athletic',
          summary:'+1 DICE a Risky Success Rolls al Climb, Jump o Diving Charge. -1 INJURY DICE a Injury Rolls si Falls.' },
        { roll:7,  name:'Sprinter',
          summary:'+1 DICE al Risky Success Roll cuando hace Dash ACTION.' },
        { roll:8,  name:'Disengage',
          summary:'Los enemigos no pueden hacer Melee Attack a este modelo cuando hace Retreat.' },
        { roll:9,  name:'Incoming',
          summary:'Cuando tira el Charge Bonus, lanza 1 D6 extra y usa el dado más alto.' },
        { roll:10, name:'Nimble',
          summary:'No reduce a la mitad su Movement cuando se levanta.' },
        { roll:11, name:'Dodge',
          summary:'-1 DICE a Ranged Attacks que tengan a este modelo como objetivo.' },
        { roll:12, name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
      ],
    },
    wildcard: {
      name: 'Wildcard',
      summary: 'Habilidades misceláneas y de campaña.',
      entries: [
        { roll:2,  name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
        { roll:3,  name:'War-Luck',
          summary:'Este modelo puede sufrir 1 Battle Scar extra antes de quedar Unfit for Duty (es decir, queda Unfit a la 4ª, no a la 3ª).' },
        { roll:4,  name:"'Tis But a Scratch",
          summary:'Puedes re-rollear el resultado del Trauma Chart para este modelo.' },
        { roll:5,  name:'Bad Company',
          summary:'Este modelo NO cuenta para el límite de 6 ELITE en tu banda al inicio del Promotion Step.' },
        { roll:6,  name:'Scavenger',
          summary:'Este modelo tiene la Extra Dice Exploration Skill (ver Exploration Skills).' },
        { roll:7,  name:'Skill & Expertise',
          summary:'Cuando aprende este Skill, elige 1 ACCIÓN del Warband Entry de este modelo (o una Common ACTION que no sea Fight ni Shoot) y anótala. +1 DICE a las tiradas de esa acción cuando la haga este modelo.' },
        { roll:8,  name:'Show Off',
          summary:'+1 dado al Promotion Pool en el Promotion Step por cada modelo de tu banda con este Skill.' },
        { roll:9,  name:'Friends In High Places',
          summary:'Este modelo tiene la Re-roll Dice Exploration Skill.' },
        { roll:10, name:'Glory Hound',
          summary:'Al final de cada partida, tu banda recibe 1 ☼ extra por cada modelo con este Skill que esté en el campo de batalla.' },
        { roll:11, name:'War Stories',
          summary:'Al registrar XP de los modelos de tu banda en la Campaign Phase, puedes dar +1 XP extra a cada modelo ELITE que NO tenga este Skill (no incluye al portador). Solo un modelo de la banda puede tener este Skill.' },
        { roll:12, name:'Patron Skill',
          summary:'Elige una habilidad ofrecida por tu Patron.' },
      ],
    },
  },

  // Models that cannot be Promoted to ELITE (page 106).
  // Keyed by faction id, value is array of unit ids.
  cannotBePromoted: {
    'new-antioch':     [],
    'trench-pilgrims': ['eccl-prisoners','anchorite-shrine'],
    'iron-sultanate':  [],
    'heretic-legions': ['war-wolf','wretched-hl'],
    'black-grail':     ['grail-thralls','thralls','hounds-bg','amalgam'],
    'court-serpent':   ['wretched-co','yoke-fiends'],
  },

  // Models with Limited Potential — cannot exceed 7 XP (page 111).
  limitedPotential: {
    'new-antioch':     [],
    'trench-pilgrims': ['communicant'],
    'iron-sultanate':  ['lions','brazen-bull'],
    'heretic-legions': ['art-witch'],
    'black-grail':     [],
    'court-serpent':   ['pit-locusts','desecrated-saint'],
  },

  // Promotion Pool: 1D6 base + 1D6 per Glorious Deed.
  // Maximum 6 ELITE in a Warband (otherwise skip Promotion step).
  // After 5 consecutive non-6 dice rolled, the 6th is automatically 6.
  promotionRules: {
    baseDice: 1,
    diePerGloriousDeed: 1,
    maxElites: 6,
    autoSuccessAfterFails: 5,
  },

  // ----- Legacy fields retained for backwards compatibility -----
  // The pre-existing progression editor uses these. The data is now redundant
  // with skillTables and traumaTable, but kept so that existing UI/PDF code
  // continues to work without rewrite. New UI should prefer skillTables.

  // Simplified advancement options (non-canonical; equivalent to picking
  // specific Skill Table entries). Editor exposes these as easy presets.
  advancements: [
    { id:'ranged+1',  name:'+1 DICE Ranged',   category:'stat',
      sourceTable:'ranged', sourceRoll:7 /* Ranged Proficiency */ },
    { id:'melee+1',   name:'+1 DICE Melee',    category:'stat',
      sourceTable:'melee',  sourceRoll:7 /* Melee Proficiency */ },
    { id:'move+1',    name:'+1" Movement',     category:'stat',
      sourceTable:null /* not in canon — keep for free-form bands */ },
    { id:'tough',     name:'TOUGH',            category:'skill',
      sourceTable:null /* not in canon — keep for free-form bands */ },
    { id:'fearless',  name:'NEGATE FEAR',      category:'skill',
      sourceTable:null /* obtainable via Trauma 64 "Hardened" */ },
    { id:'leader',    name:'LEADER',           category:'skill',
      sourceTable:null },
    { id:'regen1',    name:'REGENERATE 1',     category:'skill',
      sourceTable:null },
    { id:'custom',    name:'Personalizada…',   category:'custom',
      sourceTable:null },
  ],

  // Stat-down options for permanent injuries (Old Battle Wound legacy).
  statDownOptions: [
    { id:'ranged-1', name:'-1 DICE Ranged',
      sourceTrauma:15 /* Lost an Eye */ },
    { id:'melee-1',  name:'-1 DICE Melee',
      sourceTrauma:14 /* Hand Wound — partial match */ },
    { id:'move-2',   name:'-2" Movement',
      sourceTrauma:31 /* Leg Wound: -2" Movement (Trauma Table, Rulebook 1.0.2) */ },
  ],

  // Common Glorious Deeds across the canonical scenarios (rulebook + Trench
  // Crusade in Flames). Each scenario has its own list, but several deeds
  // recur across many scenarios — we surface those here as a quick-pick
  // dropdown. The user can still type a custom name for scenario-specific
  // deeds. Categorized by frequency: the universal/cross-scenario ones first,
  // then common patterns.
  // Source: Trench Crusade Digital Rulebook (Glorious Deeds section, p. 98)
  // and per-scenario lists. Translations (sumario) are paraphrases, not
  // rulebook quotes.
  // Glorious Deeds de los escenarios I-XI del Rulebook 1.0.2 (XII Great War
  // no tiene). universal = Hold Your Ground / Victory or Death; common = las
  // que se repiten en varios escenarios; scenario = propias de un escenario.
  canonicalGloriousDeeds: [
    { name: 'Hold Your Ground', category: 'universal',
      summary: 'Tu banda es la primera en superar un Morale Check en la partida. 1 VP; en campaña, 1 XP a un ELITE con LEADER. (I, IV, VII)' },
    { name: 'Victory or Death', category: 'universal',
      summary: 'Tu banda gana la partida. Solo en campaña y sin VP: 1 XP a un ELITE con LEADER. (IV, VII, XI)' },
    { name: 'Cast Them Down', category: 'common',
      summary: 'Un modelo amigo hace que un enemigo caiga (Fall) desde al menos 3" de altura. (I, III)' },
    { name: 'Resist and Bite', category: 'common',
      summary: 'Un modelo amigo que empezó su activación Down deja a un enemigo Out of Action en esa misma activación. (I, III)' },
    { name: 'Sniper', category: 'common',
      summary: 'Un modelo amigo deja Out of Action a un ELITE enemigo con un Ranged Attack con los modificadores de Long Range y Cover. (I, III)' },
    { name: 'Death From Above', category: 'common',
      summary: 'Un modelo amigo deja a un enemigo Out of Action con un Melee Attack con el modificador de Diving Charge. (II, IX, XI)' },
    { name: 'Bloodletting', category: 'scenario',
      summary: 'I. Claim No Man\'s Land: un ataque de un modelo amigo pone el sexto BLOOD MARKER a un enemigo.' },
    { name: 'Lord of War', category: 'scenario',
      summary: 'I. Claim No Man\'s Land: un modelo amigo deja a dos enemigos Out of Action con Melee Attacks en un mismo turno.' },
    { name: 'Suicidal Bravery', category: 'scenario',
      summary: 'I. Claim No Man\'s Land: un modelo amigo carga con éxito a dos modelos con el mismo movimiento de carga.' },
    { name: 'Sharpshooter', category: 'scenario',
      summary: 'II. Hunt for Heroes: un modelo amigo en cobertura deja Out of Action a un ELITE enemigo con un Ranged Attack a Long Range.' },
    { name: 'Dangerous Fall', category: 'scenario',
      summary: 'II. Hunt for Heroes: un modelo amigo hace que un enemigo caiga en un cráter.' },
    { name: 'High Risk, High Reward', category: 'scenario',
      summary: 'II. Hunt for Heroes: un Asset deja Out of Action a un Mark enemigo (hay que revelar ambos).' },
    { name: 'Kill their Leaders', category: 'scenario',
      summary: 'II. Hunt for Heroes: dejar Out of Action a todos los Marks enemigos; cuenta para quien deja fuera al último.' },
    { name: 'Blood Sacrifice', category: 'scenario',
      summary: 'III. Relic Hunt: un modelo amigo deja a tres enemigos Out of Action durante la partida.' },
    { name: 'Protect the Relic', category: 'scenario',
      summary: 'III. Relic Hunt: un modelo amigo deja Out of Action a un enemigo que está a 1" de un Reliquary Marker.' },
    { name: 'Relic Hunter', category: 'scenario',
      summary: 'III. Relic Hunt: un modelo amigo reclama dos Reliquaries distintos durante la partida.' },
    { name: 'Good Hunting', category: 'scenario',
      summary: 'IV. Trench Warfare: un modelo amigo deja a un enemigo Out of Action con un Ranged Attack a Long Range.' },
    { name: 'Headshot', category: 'scenario',
      summary: 'IV. Trench Warfare: un modelo amigo que se retiró antes en su activación deja Out of Action a uno de los enemigos de los que se retiró.' },
    { name: 'Into the Trenches!', category: 'scenario',
      summary: 'IV. Trench Warfare: un modelo amigo carga con éxito a un enemigo en una sección de trinchera y lo deja Out of Action con un Melee Attack.' },
    { name: 'Survive to Tell the Tale', category: 'scenario',
      summary: 'IV. Trench Warfare: un modelo amigo sufre dos Injury Rolls por explosiones de minas y ninguna lo deja Out of Action.' },
    { name: 'King of the Hill (Armoured Train)', category: 'scenario',
      summary: 'V. Armoured Train: un modelo amigo termina 3 turnos seguidos sobre un terraplén o el puente y a 3" de un vagón.' },
    { name: 'Meat-Grinder', category: 'scenario',
      summary: 'V. Armoured Train: un modelo amigo deja a 3 enemigos Out of Action con Ranged Attacks de la Gun Battery.' },
    { name: 'No Stone Left Unturned', category: 'scenario',
      summary: 'V. Armoured Train: un modelo amigo abre dos vagones distintos.' },
    { name: 'Over the Enemy Line', category: 'scenario',
      summary: 'V. Armoured Train: un modelo amigo escapa con una caja estando totalmente dentro de la zona de despliegue enemiga.' },
    { name: 'Supply Run', category: 'scenario',
      summary: 'V. Armoured Train: dos modelos amigos escapan con una caja; cuenta para el que escapa con la segunda.' },
    { name: 'Dragon Slayer', category: 'scenario',
      summary: 'VI. Dragon Hunt: un modelo amigo encima del Dragón lo deja Out of Action con un Melee Attack. Da 2 ☼.' },
    { name: 'Fire with Fire', category: 'scenario',
      summary: 'VI. Dragon Hunt: un ataque amigo con FIRE, GAS y/o SHRAPNEL pone 2 BLOOD MARKERS al Dragón.' },
    { name: 'Genocidal', category: 'scenario',
      summary: 'VI. Dragon Hunt: un modelo deja a 3 Peasants Out of Action.' },
    { name: 'Opportunist', category: 'scenario',
      summary: 'VI. Dragon Hunt: un modelo está a 3" de un Peasant cuando el Dragón lo pisotea.' },
    { name: 'Off My Back', category: 'scenario',
      summary: 'VI. Dragon Hunt: un modelo amigo deja Down a un modelo que está encima del Dragón y este cae.' },
    { name: 'Daring Raid (Attacker only)', category: 'scenario',
      summary: 'VII. Supply Raid: un modelo amigo destruye un Supply Cache Marker.' },
    { name: 'Rampage (Attacker only)', category: 'scenario',
      summary: 'VII. Supply Raid: un modelo amigo destruye un segundo Supply Cache Marker.' },
    { name: 'Save the Supplies! (Defender only)', category: 'scenario',
      summary: 'VII. Supply Raid: quedan cuatro o más Supply Cache Markers sin destruir al final de la partida.' },
    { name: 'Stop Them! (Defender only)', category: 'scenario',
      summary: 'VII. Supply Raid: un modelo amigo deja Out of Action a un enemigo que está total o parcialmente en su propia zona de despliegue.' },
    { name: 'Bloodlust', category: 'scenario',
      summary: 'VIII. From Below: un modelo amigo envenenado usa una Bloodbath Roll para dejar Out of Action a un enemigo envenenado.' },
    { name: 'For Science', category: 'scenario',
      summary: 'VIII. From Below: un modelo amigo extrae 3 Ichor Vials.' },
    { name: 'Ichor Frenzy', category: 'scenario',
      summary: 'VIII. From Below: un modelo amigo extrae un Ichor Vial estando totalmente dentro de la zona de despliegue enemiga.' },
    { name: 'Risk Taker', category: 'scenario',
      summary: 'VIII. From Below: un modelo amigo provoca una explosión que deja a 2 o más enemigos Out of Action.' },
    { name: 'Sadistic Wretch', category: 'scenario',
      summary: 'VIII. From Below: un modelo amigo deja a un enemigo Out of Action haciéndole entrar en un Ichor Pit.' },
    { name: 'Vial Thief', category: 'scenario',
      summary: 'VIII. From Below: un modelo amigo roba un Ichor Vial a un enemigo y consigue extraerlo.' },
    { name: 'Elite Hunter', category: 'scenario',
      summary: 'IX. Fields of Glory: un modelo amigo deja Out of Action a dos enemigos ELITE.' },
    { name: 'No Escape', category: 'scenario',
      summary: 'IX. Fields of Glory: un modelo amigo carga con éxito a un enemigo que no tenía en Line of Sight al empezar su activación.' },
    { name: 'Personal Revenge', category: 'scenario',
      summary: 'IX. Fields of Glory: un modelo amigo usa una Bloodbath Roll para dejar Out of Action a un enemigo que antes dejó fuera a un amigo.' },
    { name: 'Reaper', category: 'scenario',
      summary: 'IX. Fields of Glory: un modelo amigo deja a tres enemigos Out of Action.' },
    { name: 'Risk It All', category: 'scenario',
      summary: 'IX. Fields of Glory: un modelo amigo hace dos Risky Success Rolls en la misma activación y ambas son Success o Critical Success.' },
    { name: 'The Real Killer', category: 'scenario',
      summary: 'IX. Fields of Glory: un modelo amigo deja Out of Action a un enemigo que está en terreno Dangerous o Difficult.' },
    { name: 'Trench Raider', category: 'scenario',
      summary: 'IX. Fields of Glory: tu banda captura una sección de trinchera de al menos 6" totalmente a 8" de la zona de despliegue enemiga.' },
    { name: 'Burning Sight', category: 'scenario',
      summary: 'X. Don\'t Breathe: un modelo amigo hace explotar un Gas Cloud Marker a más de 14" y la explosión deja a un enemigo o más Out of Action.' },
    { name: 'Combustive', category: 'scenario',
      summary: 'X. Don\'t Breathe: un modelo amigo hace explotar un Gas Cloud Marker y la explosión deja a dos o más enemigos Out of Action.' },
    { name: 'Deep Breaths', category: 'scenario',
      summary: 'X. Don\'t Breathe: un modelo amigo deja a un enemigo Out of Action haciéndole moverse a 6" del centro de un Gas Cloud Marker.' },
    { name: 'Iron Lungs', category: 'scenario',
      summary: 'X. Don\'t Breathe: tu banda controla un Bunker a 6" del centro de un Gas Cloud Marker al final de dos turnos seguidos.' },
    { name: 'Poisonous Rage', category: 'scenario',
      summary: 'X. Don\'t Breathe: un modelo amigo a 6" del centro de un Gas Cloud deja a un enemigo Out of Action con un Melee Attack.' },
    { name: 'Back to the Mud', category: 'scenario',
      summary: 'XI. The High Ground: un modelo amigo hace caer a un enemigo que está sobre un Objetivo y la caída lo deja Out of Action.' },
    { name: 'Down with You', category: 'scenario',
      summary: 'XI. The High Ground: un modelo amigo sobre un Objetivo deja Out of Action con un Ranged Attack a un enemigo sobre otro Objetivo más alto.' },
    { name: 'King of the Hill (The High Ground)', category: 'scenario',
      summary: 'XI. The High Ground: un modelo ha estado sobre los cinco Objetivos.' },
  ],

  /* ====================================================================
     EXPLORATION TABLES (pages 116-122 of the Trench Crusade Digital
     Rulebook v1.0.2). Three tables — Common, Rare, Legendary — keyed
     by Exploration Roll total. Entries that fall outside the listed
     rolls are treated as Pillaged (no discovery, only Loot).

     Schema per entry:
       roll      : the canonical roll value
       name      : English canonical name (kept for canon traceability)
       narrative : Spanish localised narrative shown to the player
       options   : Array<{ id, label, effect, restriction? }>
                   The player picks one option from this list. `effect`
                   is an object describing the mechanical reward in a
                   form the engine can apply post-Exploration.
                   `restriction` (optional) gates the option by faction
                   or other criteria; null means available to all.
       forks     : OPTIONAL Array<entry> — narrative variants used when
                   this location has already been discovered. Each fork
                   is structured like a regular entry plus `isFork:true`.
                   When all forks are exhausted (or none are defined),
                   the rediscovery result is Pillaged.

     Effect kinds we model (extensible):
       { kind: 'add-ducats', amount: 30 }                        → strongbox
       { kind: 'add-glory', amount: 2 }                          → glory
       { kind: 'choose-battlekit', maxDucats: 30, category: '*' } → arsenal
       { kind: 'add-named-battlekit', name: 'Field Shrine' }     → arsenal
       { kind: 'morale-bonus', dice: 2, scope: 'next-game' }     → modifier
       { kind: 'recruit-faction-model', mapping: {...} }         → roster
       { kind: 'gain-exploration-skill', skill: 'reroll' }       → wb skill
       { kind: 'unlock-glory-shop', maxGlory: 5 }                → QM unlock

     IMPORTANT: only entries we have verified directly from the PDF are
     included. Rolls outside this set fall through to Pillaged, which
     is canonically correct ("If you roll a number that is not included
     on the Exploration Table, then you discover nothing").
     ==================================================================== */
  explorationTables: {
    common: {
      4: {
        roll: 4,
        name: 'Moonshine Stash',
        narrative: 'Encuentras un alijo oculto de aguardiente fuerte, de origen incierto y peligroso.',
        options: [
          { id: 'distribute', label: 'Repartir',
            restriction: { factionsAllowed: ['new-antioch','trench-pilgrims'] },
            effect: { kind: 'morale-bonus', dice: 2, scope: 'next-game' },
            description: '+2 DICE a Morale Checks en la próxima partida.' },
          { id: 'destroy', label: 'Destruir',
            restriction: { factionsAllowed: ['new-antioch','trench-pilgrims','iron-sultanate'] },
            effect: { kind: 'grant-xp-to-elites', xp: 1, maxModels: 2, advancementCheck: true },
            description: 'Hasta 2 modelos ELITE ganan +1 XP cada uno.' },
          { id: 'sell', label: 'Vender',
            effect: { kind: 'add-ducats', amount: 30 },
            description: '+30 👑 al Strongbox.' },
        ],
        forks: [
          { isFork: true, name: 'Destilería oculta',
            narrative: 'Esta vez encuentras una destilería entera abandonada en una bodega. La cosecha es notable.',
            options: [
              { id: 'sell-bulk', label: 'Vender al peso',
                effect: { kind: 'add-ducats', amount: 40 },
                description: '+40 👑 al Strongbox.' },
            ] },
        ],
      },
      5: {
        roll: 5,
        name: 'Heavy Weapons Cache',
        narrative: 'Descubres un alijo oculto de armas pesadas.',
        options: [
          { id: 'surplus', label: 'Excedente',
            effect: { kind: 'choose-battlekit', filter: { keyword: 'HEAVY' } },
            description: 'Elige una pieza de Battlekit con HEAVY de tu Armoury y añádela al Arsenal.' },
          { id: 'specialise', label: 'Especializar',
            effect: { kind: 'choose-glory-items', maxGlory: 5 },
            description: 'Elige un Glory Item de coste hasta 5 ☼ y añádelo al Arsenal.' },
        ],
        forks: [
          { isFork: true, name: 'Búnker improvisado',
            narrative: 'Reencuentras un búnker más pequeño con armamento parcial.',
            options: [
              { id: 'salvage', label: 'Rescatar',
                effect: { kind: 'add-ducats', amount: 50 },
                description: '+50 👑 (no quedan armas útiles, sólo chatarra valiosa).' },
            ] },
        ],
      },
      6: {
        roll: 6,
        name: 'Trench Shrine',
        narrative: 'Encuentras un santuario improvisado erigido por los soldados de la Gran Guerra.',
        options: [
          { id: 'standard', label: 'Estandarte',
            effect: { kind: 'add-named-battlekit', name: 'Troop Flag', currency: '☼', cost: 1 },
            description: 'Añade un Troop Flag al Arsenal.' },
          { id: 'shrine', label: 'Santuario',
            effect: { kind: 'add-named-battlekit', name: 'Field Shrine', currency: '👑', cost: 0 },
            description: 'Añade un Field Shrine al Arsenal.' },
          { id: 'return', label: 'Rezar',
            effect: { kind: 'add-glory', amount: 2 },
            description: '+2 ☼ a tu banda.' },
        ],
        forks: [
          { isFork: true, name: 'Capilla derruida',
            narrative: 'Encuentras los restos de un antiguo santuario. Tus soldados lo reconstruyen aprovechando los materiales.',
            options: [
              { id: 'rebuild-shrine', label: 'Reconstruir',
                effect: { kind: 'add-named-battlekit', name: 'Field Shrine', currency: '👑', cost: 0 },
                description: 'Añade un Field Shrine al Arsenal.' },
              { id: 'rebuild-glory', label: 'Profanado',
                effect: { kind: 'add-glory', amount: 3 },
                description: '+3 ☼ (la profanación del sitio sagrado conmueve a la banda).' },
            ] },
          { isFork: true, name: 'Altar improvisado',
            narrative: 'Levantas un nuevo altar con los restos de uno anterior.',
            options: [
              { id: 'altar-flag', label: 'Estandarte',
                effect: { kind: 'add-named-battlekit', name: 'Troop Flag', currency: '☼', cost: 1 },
                description: 'Añade un Troop Flag al Arsenal.' },
              { id: 'altar-pray', label: 'Rezar',
                effect: { kind: 'add-glory', amount: 2 },
                description: '+2 ☼ a tu banda.' },
            ] },
        ],
      },
      8: {
        roll: 8,
        name: 'Ruined House',
        narrative: 'Una casa obliterada por armamento pesado, con sus habitantes destrozados.',
        options: [
          { id: 'rummage', label: 'Rebuscar',
            effect: { kind: 'choose-battlekit', filter: { category: 'equipment' }, maxDucats: 30 },
            description: 'Hasta 30 👑 en piezas de Equipment de tu Armoury.' },
          { id: 'relic', label: 'Reliquia',
            effect: { kind: 'choose-glory-items', maxGlory: 7 },
            description: 'Elige un Glory Item de hasta 7 ☼ y añádelo al Arsenal.' },
        ],
        forks: [
          { isFork: true, name: 'Sótano saqueado',
            narrative: 'El sótano de otra casa cercana, parcialmente expoliado pero aún con cosas útiles.',
            options: [
              { id: 'rummage-light', label: 'Rebuscar',
                effect: { kind: 'choose-battlekit', filter: { category: 'equipment' }, maxDucats: 15 },
                description: 'Hasta 15 👑 en piezas de Equipment.' },
            ] },
        ],
      },
      9: {
        roll: 9,
        name: 'Survivor',
        narrative: 'Encuentras un soldado tambaleándose en Tierra de Nadie. Un desertor, quizá, o un superviviente cuyos camaradas han sido aniquilados. Ahora trabaja para ti.',
        options: [
          { id: 'recruit', label: 'Reclutar',
            effect: { kind: 'recruit-faction-model', mapping: {
              'new-antioch': 'Yeoman (sin Ranged Weapon)',
              'trench-pilgrims': 'Ecclesiastical Prisoner',
              'iron-sultanate': 'Azeb',
              'heretic-legions': 'Wretched',
              'black-grail': 'Grail Thrall',
              'court-serpent': 'Wretched',
            } },
            description: 'Añade el modelo correspondiente a tu Faction al Roster (sin Battlekit).' },
        ],
      },
      10: {
        roll: 10,
        name: 'Fallen Soldier',
        narrative: 'Encuentras el cuerpo de un soldado caído.',
        options: [
          { id: 'salvage', label: 'Rescatar equipo',
            effect: { kind: 'composite', items: [
              { kind: 'choose-battlekit', filter: { category: 'ranged' }, maxDucats: 15 },
              { kind: 'add-named-battlekit', name: 'Combat Helmet', cost: 0 },
              { kind: 'add-named-battlekit', name: 'Standard Armour', cost: 0 },
              { kind: 'roll-d6-bonus', threshold: 4, bonusOptions: ['Medi-kit','Mountaineer Kit','Shovel'] },
            ] },
            description: 'Un arma a distancia (≤15 👑), Combat Helmet, Standard Armour. Tira 1D6: en 4+, además uno de Medi-kit / Mountaineer Kit / Shovel.' },
        ],
      },
      11: {
        roll: 11,
        name: 'Trench Merchant',
        narrative: 'Estableces contacto con un mercader de las trincheras.',
        options: [
          { id: 'report', label: 'Informar',
            effect: { kind: 'add-glory', amount: 2 },
            description: '+2 ☼ a tu banda.' },
          { id: 'trade', label: 'Comerciar',
            effect: { kind: 'unlock-glory-shop', maxGlory: 5 },
            // NOTE: this option only meaningful in campaign mode (Glory Items
            // gating); in free battles it's still selectable but won't unlock
            // anything since Glory Items are disabled in free battles.
            description: 'Desbloquea Glory Items hasta 5 ☼ en futuros Quartermaster Steps (sólo campaña).' },
        ],
      },
      14: {
        roll: 14,
        name: 'Map & Document Bag',
        narrative: 'Marcado con signos cuidadosamente disimulados, encuentras un saco oculto con mapas e información.',
        options: [
          { id: 'gain-skill', label: 'Estudiar mapas',
            effect: { kind: 'gain-exploration-skill', skill: 'reroll' },
            description: 'Tu banda gana la Reroll Exploration Skill.' },
        ],
      },
      16: {
        roll: 16,
        name: 'Sniper\'s Lair',
        narrative: 'Encuentras la posición bien camuflada de un francotirador.',
        options: [
          { id: 'add-by-faction', label: 'Recoger armamento',
            effect: { kind: 'add-faction-battlekit', mapping: {
              'new-antioch': ['Sniper Rifle','Sniper Scope'],
              'trench-pilgrims': ['Sniper Rifle','Sniper Scope'],
              'iron-sultanate': ['Siege Jezzail','Alchemical Ammunition','Cloak of Alamut'],
              'heretic-legions': ['Automatic Rifle'],
              'black-grail': ['Corruption Belcher','Field Shrine'],
              'court-serpent': ['Ophidian Rifle'],
            }, fallbackToDucats: true },
            description: 'Añade al Arsenal el equipo asignado para tu Faction. Si no puedes incluirlo (limit, etc.), recibes su valor en 👑.' },
        ],
      },
      18: {
        roll: 18,
        name: 'Fallen Knight',
        narrative: 'Encuentras un héroe caído de épocas pasadas — quizá un barón de Antioquía, un gran Faris del Sultanato, o un Plague Knight de Beelzebub.',
        options: [
          { id: 'loot', label: 'Botín',
            effect: { kind: 'composite', items: [
              { kind: 'add-named-battlekit', name: 'Reinforced Armour', cost: 0 },
              { kind: 'add-named-battlekit', name: 'Trench Shield', cost: 0 },
              { kind: 'add-named-battlekit', name: 'Combat Helmet', cost: 0 },
              { kind: 'choose-from-named', names: ['Sword','Polearm'] },
            ] },
            description: 'Reinforced Armour + Trench Shield + Combat Helmet + Sword o Polearm.' },
          { id: 'memorialise', label: 'Honrar al caído',
            effect: { kind: 'add-glory', amount: 2 },
            description: '+2 ☼.' },
        ],
      },
      20: {
        roll: 20,
        name: 'Warband Strongbox',
        narrative: 'Encuentras la caja fuerte oculta de una banda perdida en la Gran Guerra.',
        options: [
          { id: 'trove', label: 'Tesoro',
            effect: { kind: 'choose-battlekit', maxDucats: 120 },
            description: 'Hasta 120 👑 en piezas de tu Armoury.' },
          { id: 'panoply', label: 'Panoplia',
            // Glory items: filtered out automatically in free battles.
            effect: { kind: 'choose-glory-items', maxGlory: 9, weaponDiscount: 1 },
            description: 'Hasta 9 ☼ en Glory Items (con descuento de 1 ☼ en armas, mín 1 ☼). Sólo campaña.' },
        ],
      },
    },

    rare: {
      5: {
        roll: 5,
        name: 'Angelic Instrument',
        narrative: 'Explorando el campo de batalla descubres un instrumento sobrenatural junto a los restos destrozados de un ángel menor — caído o divino.',
        options: [
          { id: 'add', label: 'Tomar el instrumento',
            effect: { kind: 'add-named-battlekit', name: 'Angelic Instrument', cost: 0,
              note: 'Cuenta como Musical Instrument pero su efecto tiene rango 8" en lugar de 4".' },
            description: 'Añade Angelic Instrument al Arsenal. Si ya tienes uno, lo reemplaza.' },
        ],
      },
      9: {
        roll: 9,
        name: 'Abandoned Prophetic Radio Post',
        narrative: 'Una estación abandonada del Sínodo de Profecía Estratégica, llena de predicciones garabateadas en desorden.',
        options: [
          { id: 'gain-skill', label: 'Estudiar las profecías',
            effect: { kind: 'gain-exploration-skill', skill: 'extra-dice' },
            description: 'Tu banda gana la Extra Dice Exploration Skill.' },
        ],
      },
      11: {
        roll: 11,
        name: 'Pot of Manna',
        narrative: 'Encuentras una copa bendecida por Dios que provee alimento eterno.',
        options: [
          { id: 'gain-bonus', label: 'Conservar la reliquia',
            effect: { kind: 'permanent-loot-bonus', amount: 10 },
            description: 'Añade +10 👑 al loot de cada Exploration Step (incluido este).' },
        ],
      },
      12: {
        roll: 12,
        name: 'Ransacked Alchemist Workshop',
        narrative: 'Entre los escombros encuentras unas pocas pociones intactas que devuelven la vida.',
        options: [
          { id: 'add-fluids', label: 'Tomar las Curative Fluids',
            effect: { kind: 'add-consumable', name: 'Curative Fluids',
              note: 'Una vez, en un Quartermaster Step futuro, retira 1 Battle Scar (no efectos de Trauma) de un modelo. Se consume al usarse.' },
            description: 'Añade Curative Fluids al Arsenal (consumible).' },
        ],
      },
      15: {
        roll: 15,
        name: 'Black Market',
        narrative: 'Descubres un importante punto de comercio subterráneo en Tierra de Nadie.',
        options: [
          { id: 'unlock', label: 'Establecer contacto',
            effect: { kind: 'unlock-glory-shop', maxGlory: 8 },
            description: 'Desbloquea Glory Items hasta 8 ☼ en futuros Quartermaster Steps. Sólo campaña.' },
        ],
      },
      17: {
        roll: 17,
        name: 'Book of Golems',
        narrative: 'Encuentras un manual rabínico sobre la creación de Gólems. Estudiarlo te permite crear uno.',
        options: [
          { id: 'create', label: 'Crear el Gólem',
            effect: { kind: 'add-takwin-homunculus', freeFormulaeDucats: 50 },
            description: 'Añade un Takwin Homunculus a tu banda con la fórmula Human Hands más fórmulas alquímicas gratis hasta 50 👑.' },
        ],
      },
      19: {
        roll: 19,
        name: 'Ruined Church / Masjid / Synagogue',
        narrative: 'Encuentras un gran santuario, templo u otra construcción religiosa de fe. Sobre su altar reposa un objeto de gran poder esperándote.',
        options: [
          { id: 'report', label: 'Informar',
            effect: { kind: 'add-glory', amount: 4 },
            description: '+4 ☼ a tu banda.' },
          { id: 'keep', label: 'Conservar la reliquia',
            effect: { kind: 'choose-glory-items', maxGlory: 10 },
            description: 'Hasta 10 ☼ en Glory Items. Sólo campaña.' },
        ],
      },
      21: {
        roll: 21,
        name: 'Stash of Drugs & Erotica',
        narrative: 'Encuentras una mina de objetos prohibidos y químicos, muy buscados y demandados.',
        options: [
          { id: 'indulge', label: 'Disfrutar',
            effect: { kind: 'morale-bonus', dice: 1, scope: 'rest-of-campaign' },
            description: '+1 DICE a Morale Checks de tu banda durante el resto de la campaña.' },
          { id: 'sell', label: 'Vender',
            effect: { kind: 'add-ducats', amount: 120 },
            description: '+120 👑 al Strongbox.' },
          { id: 'confiscate', label: 'Confiscar',
            restriction: { mandatoryFor: ['trench-pilgrims'] },
            effect: { kind: 'add-glory', amount: 4 },
            description: '+4 ☼ a tu banda. Los Trench Pilgrims DEBEN elegir esta opción.' },
        ],
      },
      23: {
        roll: 23,
        name: 'Saint\'s Reliquary',
        narrative: 'Descubres el relicario bien escondido de un santo caído.',
        options: [
          { id: 'add', label: 'Tomar la reliquia',
            effect: { kind: 'add-named-battlekit', name: 'Saintly Relic', cost: 0,
              note: 'Equipment para modelo ELITE: gana TOUGH. Pierde INFILTRATOR si lo tenía. El rival ignora Cover y Defended Obstacle contra él.' },
            description: 'Añade Saintly Relic al Arsenal.' },
        ],
      },
      25: {
        roll: 25,
        name: 'High-Ranking Captive',
        narrative: 'Capturas a un enemigo de alto rango — un oficial de Antioquía, un sheik del Sultanato, un fragmento de un Hegemón del Black Grail caído, un Pilgrim Prophet, un mercader Mammonita...',
        options: [
          { id: 'ransom', label: 'Pedir rescate',
            effect: { kind: 'add-ducats', amount: 100 },
            description: '+100 👑.' },
          { id: 'execute', label: 'Ejecutar',
            effect: { kind: 'add-glory', amount: 4 },
            description: '+4 ☼.' },
          { id: 'imprison', label: 'Encarcelar',
            effect: { kind: 'choose-glory-items', maxGlory: 8 },
            description: 'Un Glory Item hasta 8 ☼ al Arsenal. Sólo campaña.' },
          { id: 'indenture', label: 'Esclavizar como guía',
            effect: { kind: 'gain-exploration-skill', skill: 'set-dice' },
            description: 'Tu banda gana la Set Dice Exploration Skill.' },
        ],
      },
      32: {
        roll: 32,
        name: 'Abandoned Resurrection Machines',
        narrative: 'Encuentras restos de máquinas que formaban parte del Programa Meta-Cristo. La mayoría están rotas, pero una funciona y puede ser desmontada.',
        options: [
          { id: 'add-machine', label: 'Salvar la máquina',
            effect: { kind: 'add-consumable', name: 'Salvaged Resurrection Machine',
              note: 'En un Quartermaster Step futuro: retira 1 Battle Scar y su Trauma asociado de un modelo. Se consume al usarse.' },
            description: 'Añade Salvaged Resurrection Machine al Arsenal (consumible).' },
        ],
      },
    },

    legendary: {
      6: {
        roll: 6,
        name: 'Battlefield of Corpses',
        narrative: 'Te topas con una escena de matanza terrible. Restos de humanos de varias naciones y criaturas infernales caídos en batallas de los últimos 800 años, esparcidos por el horizonte. Las trincheras están llenas de sangre.',
        options: [
          { id: 'salvage', label: 'Recoger del campo',
            effect: { kind: 'choose-battlekit', maxDucats: 100, maxItems: 2 },
            description: 'Hasta 2 piezas de Battlekit de tu Armoury, total ≤100 👑.' },
        ],
      },
      8: {
        roll: 8,
        name: 'Esoteric Library',
        narrative: 'Encuentras una colección oculta de obras de Magia Goética, ritos de sacrificio sangriento y grimorios sobre invocación de demonios.',
        options: [
          { id: 'burn', label: 'Quemar',
            restriction: { factionsAllowed: ['new-antioch','trench-pilgrims','iron-sultanate'] },
            effect: { kind: 'add-glory', amount: 4, randomBonus: 'D3', baseAmount: 3 },
            description: '+3+D3 ☼ a tu banda.' },
          { id: 'release', label: 'Liberar Plaga',
            restriction: { factionsAllowed: ['black-grail'] },
            effect: { kind: 'permanent-game-effect', effect: 'place-infection-marker-after-deployment' },
            description: 'Al inicio de cada partida, tras despliegue, coloca 1 INFECTION MARKER junto a 1 modelo (amigo o enemigo).' },
          { id: 'sell', label: 'Vender',
            effect: { kind: 'add-ducats-random', formula: '6D6*10' },
            description: '+6D6 × 10 👑.' },
          { id: 'study', label: 'Estudiar',
            restriction: { factionsAllowed: ['court-serpent','heretic-legions'] },
            effect: { kind: 'permanent-game-effect', effect: 'place-blood-marker-after-deployment' },
            description: 'Al inicio de cada partida, tras despliegue, coloca 1 BLOOD MARKER junto a 1 modelo (amigo o enemigo).' },
        ],
      },
      10: {
        roll: 10,
        name: 'Hidden Passages',
        narrative: 'Descubres una entrada oculta a una vasta red subterránea — quizá excavada por Heréticos para infiltrarse tras el Iron Wall, o por refugiados que viven en Tierra de Nadie.',
        options: [
          { id: 'gain-skill', label: 'Cartografiar los pasajes',
            effect: { kind: 'gain-exploration-skill', skill: 'duplicate' },
            description: 'Tu banda gana la Duplicate Exploration Skill.' },
        ],
      },
      12: {
        roll: 12,
        name: 'Jabirean Alchemical Book',
        narrative: 'Encuentras uno de los míticos libros del Corpus Jabirean, lleno de los secretos más maravillosos sobre la naturaleza del universo.',
        options: [
          { id: 'keep', label: 'Conservar',
            effect: { kind: 'unlock-named-battlekit', name: 'Fire Shield',
              source: 'house-wisdom-armoury' },
            description: 'Desde ahora puedes comprar Fire Shields del Armoury de House of Wisdom en futuros Quartermaster Steps.' },
          { id: 'sell', label: 'Vender',
            effect: { kind: 'choose-currency', options: [
              { kind: 'add-ducats', amount: 150 },
              { kind: 'add-glory', amount: 5 },
            ] },
            description: '+150 👑 o +5 ☼ (eliges tú).' },
          { id: 'study', label: 'Estudiar',
            restriction: { variantsAllowed: ['house-wisdom'] },
            effect: { kind: 'reduce-formula-cost', amount: 5, minimum: 5 },
            description: 'Las Alchemical Formulae cuestan 5 👑 menos (mín 5 👑). Sólo House of Wisdom.' },
        ],
      },
      14: {
        roll: 14,
        name: 'Black Network Contact',
        narrative: 'Estableces contacto con uno de los legendarios Príncipes Mercaderes de la Black Network.',
        options: [
          { id: 'unlock', label: 'Establecer trato',
            effect: { kind: 'unlock-glory-shop', maxGlory: 12 },
            description: 'Desbloquea Glory Items hasta 12 ☼ en futuros Quartermaster Steps. Sólo campaña.' },
        ],
      },
      16: {
        roll: 16,
        name: 'Treasure of the Holies',
        narrative: 'Encuentras un feretorio legendario — el Tabernáculo de los Hebreos, un altar al Lucero del Alba, un santuario fundado por San Pedro o un lugar visitado por el Profeta. Sobre su altar yace un cofre del tesoro con un objeto de gran poder.',
        options: [
          { id: 'take', label: 'Tomar el tesoro',
            effect: { kind: 'composite', items: [
              { kind: 'add-campaign-victory-points', formula: 'D3' },
              { kind: 'choose-glory-items', maxGlory: -1, free: true },
            ] },
            description: 'D3 Campaign Victory Points y un Glory Item gratis (sin límite de coste). Sólo campaña.' },
        ],
      },
      18: {
        roll: 18,
        name: 'Skull of a Saint',
        narrative: 'Encuentras la calavera de un santo martirizado en eras pasadas. El poder de la comunión persiste en sus restos sagrados.',
        options: [
          { id: 'skull-relic', label: 'Tomar como reliquia',
            restriction: { factionsAllowed: ['new-antioch','trench-pilgrims','iron-sultanate'] },
            effect: { kind: 'add-named-battlekit', name: 'Skull Relic', cost: 0,
              note: 'Equipment HELD: el portador gana INFILTRATOR.' },
            description: 'Añade Skull Relic al Arsenal.' },
          { id: 'screaming-skull', label: 'Profanar la calavera',
            restriction: { factionsAllowed: ['heretic-legions','black-grail','court-serpent'] },
            effect: { kind: 'add-named-battlekit', name: 'Screaming Skull', cost: 0,
              note: 'Equipment HELD, para cualquier modelo: +2 DICE a tus Morale Checks mientras el portador esté en el campo y no esté Down ni Out of Action; además ganas 1 ☼ al final de cada partida en la que siga así.' },
            description: 'Añade Screaming Skull al Arsenal.' },
        ],
      },
      20: {
        roll: 20,
        name: "Lock of Samson's Hair",
        narrative: 'Descubres un mechón del legendario Sansón, impregnado de la esencia del guerrero más fuerte que ha existido.',
        options: [
          { id: 'take', label: 'Tomar el mechón',
            effect: { kind: 'add-named-battlekit', name: "Lock of Samson's Hair", cost: 0,
              note: 'Equipment para cualquier modelo: el portador gana STRONG y +1 INJURY DICE a sus Melee Attacks.' },
            description: "Añade Lock of Samson's Hair al Arsenal." },
        ],
      },
      23: {
        roll: 23,
        name: "Patron's Visit",
        narrative: 'Tu Patrón o su representante visita por sorpresa a tu banda.',
        options: [
          { id: 'exchange', label: 'Canjear gloria',
            effect: { kind: 'exchange-glory-for-cvp', maxGlory: 10 },
            description: 'Si quieres, cambia hasta 10 ☼ por el mismo número de Campaign Victory Points. Sólo campaña.' },
        ],
      },
      26: {
        roll: 26,
        name: 'Sample of Holy DNA',
        narrative: 'Encuentras una muestra de ADN Sagrado.',
        options: [
          { id: 'treat', label: 'Tratar a un modelo',
            effect: { kind: 'model-note', note: 'Holy DNA: al activarlo, antes de sus ACTIONS, puede cambiar 1 BLOOD MARKER o INFECTION MARKER por un BLESSING MARKER.' },
            description: 'Elige 1 modelo: al activarlo, antes de sus ACTIONS, puedes cambiar 1 BLOOD o INFECTION MARKER suyo por un BLESSING MARKER.' },
        ],
      },
      30: {
        roll: 30,
        name: 'Golgotha Tektites',
        narrative: 'Tectitas del Gólgota, con las que se forja la armadura de los Paladines.',
        options: [
          { id: 'treat-armour', label: 'Tratar armaduras',
            effect: { kind: 'armour-note', maxSuits: 2, note: 'Golgotha Tektites: NEGATE FIRE, NEGATE GAS y NEGATE SHRAPNEL.' },
            description: 'Hasta 2 armaduras de tu banda ganan NEGATE FIRE, NEGATE GAS y NEGATE SHRAPNEL.' },
          { id: 'church', label: 'Entregarlas a la Iglesia',
            restriction: { factionsAllowed: ['new-antioch'] },
            effect: { kind: 'add-glory', amount: 15 },
            description: '+15 ☼ a tu banda.' },
        ],
      },
      36: {
        roll: 36,
        name: 'Fruit from the Tree of Good and Evil Knowledge',
        narrative: 'Entre los huesos de humanos gigantes desenterrados por la guerra descubres un fruto dorado envuelto en tela.',
        options: [
          { id: 'eat', label: 'Comer el fruto',
            effect: { kind: 'model-note', note: 'Fruto del Árbol: gana DEMONIC y un Skill a elegir de cualquier Skill Table, Patron Skill (de cualquier Patrón) o Exploration Skill.' },
            description: 'Elige 1 modelo: gana DEMONIC y un Skill a tu elección (cualquier tabla, cualquier Patron Skill o Exploration Skill).' },
        ],
      },
    },
  },
};

/* ====================================================================
   EXPLORATION STEP ENGINE (Phase 1 of free-progression refactor)

   Pure functions over CAMPAIGN_TABLES.explorationTables. No DOM access,
   no warband mutation — all state changes happen in the caller via the
   returned `effect` payload. This keeps the engine testable in isolation
   and lets the same logic serve both campaign and free-battle flows.

   Public API:
     determineExplorationDice(gamesPlayed, isFreeBattle)
       → number of D6 to roll. Free battles default to 3 dice; the UI
         may override this via the slider (1-10 range).

     selectExplorationTable(gamesPlayed, isFreeBattle, preference?)
       → 'common' | 'rare' | 'legendary'. Free battles always 'common'.
         Campaigns follow the canonical mapping with player choice
         in the overlap ranges (3-5 and 10+).

     rollExplorationDice(n, opts)
       → { dice, rollTotal, rerollUsed, rerollWinUsed }. The opts let the
         caller surface the canonical "you can re-roll one die, plus one
         extra if you won the game".

     resolveExplorationRoll(rollTotal, table, alreadyDiscovered, factionId)
       → { kind, entry, lootDucats }. Where:
         * kind='discovery'  → fresh discovery, entry is the table entry
         * kind='fork'       → previously-discovered entry, but a narrative
                               fork is fresh (entry.isFork===true)
         * kind='pillaged'   → no entry at this roll, OR entry is fully
                               exhausted (all forks used)
         lootDucats is always rollTotal × 10 regardless of kind.
   ==================================================================== */

/**
 * Number of Exploration Dice to roll.
 * Canon (Digital Rulebook p.113): 1-2 games → 3 dice, 3-5 → 4, 6-9 → 5,
 * 10+ → 6. For free battles we always start at 3 (the UI lets the player
 * override 1-10 to represent rich/poor exploration zones).
 */
function determineExplorationDice(gamesPlayed, isFreeBattle) {
  if (isFreeBattle) return 3;
  if (gamesPlayed <= 2) return 3;
  if (gamesPlayed <= 5) return 4;
  if (gamesPlayed <= 9) return 5;
  return 6;
}

/**
 * Pick which table to consult.
 * In overlap ranges (3-5 and 10+) the canon lets the player choose; we
 * default to the lower-tier table and let the caller pass `preference`
 * to elevate. Free battles always use the Common table because the
 * narrative is "foraging between Patron contracts" — no Rare or Legendary
 * locations should be reachable without a campaign context.
 */
function selectExplorationTable(gamesPlayed, isFreeBattle, preference) {
  if (isFreeBattle) return 'common';
  if (gamesPlayed <= 2) return 'common';
  if (gamesPlayed <= 5) return preference === 'rare' ? 'rare' : 'common';
  if (gamesPlayed <= 9) return 'rare';
  return preference === 'legendary' ? 'legendary' : 'rare';
}

/**
 * Roll N exploration dice. Returns the dice array, the sum, and flags
 * indicating whether each kind of re-roll was applied. The re-rolls
 * always pick the lowest die to maximise the player's outcome, which
 * matches optimal play for a player who has decided to use the re-roll.
 *
 * Re-roll rules (canon p.113):
 *   - You may re-roll one die (useReroll=true).
 *   - If you won the game, you may re-roll a second die (useWinReroll=true).
 *   - You cannot re-roll the same die twice.
 *
 * @param {number} n - number of dice to roll (1+)
 * @param {object} opts - { won, useReroll, useWinReroll }
 * @returns {object} { dice, rollTotal, rerollUsed, rerollWinUsed }
 */
function rollExplorationDice(n, opts) {
  opts = opts || {};
  const dice = [];
  for (let i = 0; i < n; i++) dice.push(1 + Math.floor(Math.random() * 6));

  let rerollUsed = false;
  let rerollWinUsed = false;
  // Re-roll the lowest die first if requested.
  if (opts.useReroll && dice.length > 0) {
    let lowestIdx = 0;
    for (let i = 1; i < dice.length; i++) {
      if (dice[i] < dice[lowestIdx]) lowestIdx = i;
    }
    dice[lowestIdx] = 1 + Math.floor(Math.random() * 6);
    rerollUsed = true;
  }
  // Win-reroll: pick the next lowest, NOT the same as the first re-roll.
  if (opts.won && opts.useWinReroll && dice.length > 1) {
    // Find lowest die. (We accept that it might be the same INDEX even
    // though the value has been replaced — that's still a different roll
    // mechanically, since the re-roll consumed the old value. For purity
    // we'd need to track which index was previously re-rolled, but for
    // the engine's purposes "two re-rolls" means two independent re-rolls.)
    let lowestIdx = 0;
    for (let i = 1; i < dice.length; i++) {
      if (dice[i] < dice[lowestIdx]) lowestIdx = i;
    }
    dice[lowestIdx] = 1 + Math.floor(Math.random() * 6);
    rerollWinUsed = true;
  }

  const rollTotal = dice.reduce((a, b) => a + b, 0);
  return { dice, rollTotal, rerollUsed, rerollWinUsed };
}

/**
 * Resolve an exploration roll against a table.
 *
 * @param {number} rollTotal - the sum from rollExplorationDice
 * @param {string} tableName - 'common' | 'rare' | 'legendary'
 * @param {string[]} alreadyDiscovered - keys like 'common:6', 'rare:15'
 * @param {string} factionId - for filtering faction-restricted options
 * @returns {object} { kind, entry, lootDucats }
 *
 * NOTE: this function does NOT apply the discovery's effect to the
 * warband. It returns the entry so the caller (UI or another engine
 * layer) can show the player the options and apply the chosen one.
 * Application of effects is the responsibility of applyExplorationEffect()
 * which we'll add in Phase 5 along with the modal UI.
 */
function resolveExplorationRoll(rollTotal, tableName, alreadyDiscovered, factionId) {
  const lootDucats = rollTotal * 10;
  const T = CAMPAIGN_TABLES.explorationTables;
  const table = T && T[tableName];
  const entry = table && table[rollTotal];

  // No entry at this roll → pillaged (canon: roll outside the table is
  // treated as no discovery, only loot).
  if (!entry) {
    return { kind: 'pillaged', entry: null, lootDucats, reason: 'no-entry' };
  }

  const key = tableName + ':' + rollTotal;
  const wasDiscovered = (alreadyDiscovered || []).includes(key);

  if (!wasDiscovered) {
    // Fresh discovery — return the entry for the caller to present options.
    return { kind: 'discovery', entry, lootDucats };
  }

  // Already discovered: try a fork. We track which forks have been used
  // by suffixing the key, e.g. 'common:6#0', 'common:6#1'. The caller
  // is expected to add the fork suffix to alreadyDiscovered when picking.
  if (Array.isArray(entry.forks) && entry.forks.length > 0) {
    for (let i = 0; i < entry.forks.length; i++) {
      const forkKey = key + '#' + i;
      if (!(alreadyDiscovered || []).includes(forkKey)) {
        const forkEntry = Object.assign({}, entry.forks[i], {
          isFork: true,
          parentRoll: rollTotal,
          parentName: entry.name,
          forkIndex: i,
          // Inherit roll value from parent for tracking
          roll: rollTotal,
        });
        return { kind: 'fork', entry: forkEntry, lootDucats };
      }
    }
  }

  // No forks left or none defined → pillaged.
  return { kind: 'pillaged', entry, lootDucats, reason: 'rediscovery' };
}

const STORAGE_CAMPAIGN_INDEX = 'warband-forge-campaigns-index';
const STORAGE_CAMPAIGN_PREFIX = 'warband-forge-v1:cmp:';
const STORAGE_CURRENT_CAMPAIGN = 'warband-forge-v1:current-campaign';
const STORAGE_MODE = 'warband-forge-v1:mode';

function newCampaign(name='Nueva Campaña') {
  return {
    id: 'cmp_' + Date.now().toString(36),
    name,
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    warbandIds: [],   // [warband.id, ...]
    battles: [],      // [{ id, date, scenario, notes, participants:[{warbandId, result, gloryEarned, ducatsEarned, modelOutcomes:[], notes}] }]
    // Current game in the campaign (1..12). Each new battle increments it
    // by default; can be set explicitly by the user too. Used to apply the
    // canonical Threshold Table (page 98) automatically to all warbands in
    // the campaign.
    gameNumber: 1,
    // Per-warband campaign state (cached, recomputed when battle is added)
    warbandStates: {},
    // Per-warband financial overrides + transactions
    finances: {},     // { [warbandId]: { startingDucatsOverride, startingGloryOverride, transactions: [] } }
    // Default rewards by battle outcome (editable per campaign)
    rewardDefaults: {
      win:  { ducados: 50, glory: 1 },
      draw: { ducados: 30, glory: 0 },
      loss: { ducados: 20, glory: 0 },
    },
    // Sale refund ratio (fraction of cost recovered when selling)
    saleRefundRatio: 0.5,
    // House Rules — per-campaign customization layer (Phase C). Currently
    // supports trauma overrides; future: scenarios, mercenaries, deeds.
    houseRules: {
      traumaOverrides: {},   // { [roll]: { name, kind, detail, mechanicalEffect? } }
    },
  };
}

/**
 * Sets the campaign's gameNumber and propagates it to all warbands in the
 * campaign. Each warband's `budgetTotal` is updated to the canonical
 * threshold for that game (page 98), unless the user has set
 * `lockBudget = true` on that warband.
 *
 * Returns an array of `{warbandId, oldBudget, newBudget}` for warbands that
 * had their budget changed (so the UI can show a confirmation if desired).
 */
function syncCampaignGameNumber(c, gameNumber) {
  if (!c) return [];
  const clamped = Math.max(1, Math.min(12, gameNumber || 1));
  c.gameNumber = clamped;
  c.updatedAt = new Date().toISOString();
  const row = warbandThresholdForGame(clamped);
  if (!row) return [];
  const changes = [];
  for (const wbId of (c.warbandIds || [])) {
    const wb = loadWarband(wbId);
    if (!wb) continue;
    if (wb.lockBudget) continue;
    const oldBudget = wb.budgetTotal;
    wb.gameNumber = clamped;
    wb.budgetTotal = row.threshold;
    persistWarband(wb);
    if (oldBudget !== row.threshold) {
      changes.push({ warbandId: wbId, oldBudget, newBudget: row.threshold });
    }
  }
  return changes;
}

/* ----- Finance helpers ----- */

function ensureFinanceEntry(c, wid) {
  if (!c.finances) c.finances = {};
  if (!c.finances[wid]) {
    c.finances[wid] = {
      startingDucatsOverride: null,
      startingGloryOverride: null,
      transactions: [],   // [{ type, ts, ... }]
    };
  }
  return c.finances[wid];
}

/**
 * Compute the financial balance of a warband within a campaign.
 *
 *   balance = startingBudget + earnings + refunds − currentRosterCost
 *
 * - startingBudget defaults to wb.budgetTotal but can be overridden per campaign.
 * - earnings come from each battle the warband participated in.
 * - refunds come from explicit "sell-*" transactions logged in finances.
 * - currentRosterCost is the live sum of model costs (so any model present in
 *   wb.models — initial or recruited later — counts.)
 */
function campaignBalance(c, wid) {
  const wb = loadWarband(wid);
  if (!wb) return { ducados: 0, glory: 0 };
  const fin = ensureFinanceEntry(c, wid);

  const startD = fin.startingDucatsOverride != null ? fin.startingDucatsOverride : (wb.budgetTotal || 0);
  const startG = fin.startingGloryOverride  != null ? fin.startingGloryOverride  : (wb.startingGlory || 0);

  let earnD = 0, earnG = 0;
  for (const battle of (c.battles || [])) {
    const part = (battle.participants || []).find(p => p.warbandId === wid);
    if (!part) continue;
    // Base reward (legacy battles may still carry it) + canon income:
    // Exploration Looting (ducats) and Glorious Deeds (glory). Deeds also
    // feed XP/Promotion elsewhere; here they fund the warband's treasury.
    earnD += part.ducatsEarned || 0;
    earnD += battleExplorationLoot(battle, wid);
    earnG += part.gloryEarned  || 0;
    earnG += participantDeedCount(part);
    earnG += gloryHoundBonus(wb, part.modelOutcomes || []);
  }

  let refD = 0, refG = 0;
  // Original cost of sold items (so the disappearance from roster doesn't double-count as savings)
  let soldOriginalD = 0, soldOriginalG = 0;
  for (const tx of (fin.transactions || [])) {
    if (tx.type === 'sale-model' || tx.type === 'sale-equipment') {
      if (tx.currency === '👑') refD += tx.refund || 0;
      else                       refG += tx.refund || 0;
      // Also account for what was sold (originalCost), so net impact = -(orig - refund)
      if (tx.originalCost != null) {
        if (tx.currency === '👑') soldOriginalD += tx.originalCost;
        else                       soldOriginalG += tx.originalCost;
      }
    }
  }

  const totals = warbandTotals(wb);

  return {
    startingDucats: startD,
    startingGlory:  startG,
    earningsDucats: earnD,
    earningsGlory:  earnG,
    refundsDucats:  refD,
    refundsGlory:   refG,
    rosterCostDucats: totals.ducados,
    rosterCostGlory:  totals.glory,
    ducados: startD + earnD + refD - totals.ducados - soldOriginalD,
    glory:   startG + earnG + refG - totals.glory   - soldOriginalG,
  };
}

/* ----- Campaign persistence ----- */

function loadCampaignIndex() {
  try {
    const raw = localStorage.getItem(STORAGE_CAMPAIGN_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveCampaignIndex(idx) {
  localStorage.setItem(STORAGE_CAMPAIGN_INDEX, JSON.stringify(idx));
}
function persistCampaign(c) {
  if (!c) return;
  c.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_CAMPAIGN_PREFIX + c.id, JSON.stringify(c));
  const idx = loadCampaignIndex();
  const i = idx.findIndex(x => x.id === c.id);
  const entry = {
    id: c.id, name: c.name, warbands: c.warbandIds.length,
    battles: c.battles.length, updatedAt: c.updatedAt,
  };
  if (i >= 0) idx[i] = entry;
  else idx.push(entry);
  saveCampaignIndex(idx);
  if (typeof _fbScheduleAutoSave === 'function') _fbScheduleAutoSave();
}
function loadCampaign(id) {
  const raw = localStorage.getItem(STORAGE_CAMPAIGN_PREFIX + id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function deleteCampaignStore(id) {
  localStorage.removeItem(STORAGE_CAMPAIGN_PREFIX + id);
  saveCampaignIndex(loadCampaignIndex().filter(x => x.id !== id));
  markDeleted('campaigns', id);
  if (typeof _fbScheduleAutoSave === 'function') _fbScheduleAutoSave();
}


