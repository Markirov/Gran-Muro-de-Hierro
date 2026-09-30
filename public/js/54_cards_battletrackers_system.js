/* ======================================================================
   CARDS & BATTLETRACKERS SYSTEM
   Tarjetas formato Magic (63×88mm) + battletrackers (148×105mm).
   PDFs generados con jsPDF. Canvas 2D para los PNG embebidos.
   Spec: SPEC-tarjetas-battletrackers.md
   ====================================================================== */

// SPEC v2 — paletas en arrays RGB [R,G,B]. Helper rgbStr() convierte
// a string CSS para fillStyle/strokeStyle. Mantiene compat con
// código previo que usaba hex via auto-detect en helpers de draw.
const FACTION_PALETTES = {
  'new-antioch': {
    BG:[244,241,234], FRAME:[95,25,25], FRAME_DARK:[60,12,12], FRAME_LIGHT:[139,28,28],
    ACCENT:[201,169,97], ACCENT_DK:[160,130,65],
    VARIANT:[139,28,28], VARIANT_DK:[95,18,18],
    TEXT:[26,20,16], MUTED:[107,93,79], STAT_BG:[234,227,210],
    PROGRESS:[139,28,28], PANEL_BG:[228,220,200],
    SLOT_BG:[245,240,225], SLOT_SHADOW:[180,170,145], SLOT_HINT:[170,158,130],
    ORNAMENT:'papal_cross',
    STAT_HEADER_COLOR:null, SECTION_COLOR:null, NARRATIVE_COLOR:null,
  },
  'trench-pilgrims': {
    BG:[236,228,212], FRAME:[66,56,44], FRAME_DARK:[38,30,22], FRAME_LIGHT:[104,84,60],
    ACCENT:[158,142,102], ACCENT_DK:[122,106,70],
    VARIANT:[148,50,28], VARIANT_DK:[108,32,14],
    TEXT:[26,20,16], MUTED:[97,84,64], STAT_BG:[220,210,188],
    PROGRESS:[148,50,28], PANEL_BG:[224,212,192],
    SLOT_BG:[238,228,208], SLOT_SHADOW:[162,148,118], SLOT_HINT:[148,134,104],
    ORNAMENT:'iron_cross_rough',
    STAT_HEADER_COLOR:null, SECTION_COLOR:null, NARRATIVE_COLOR:null,
  },
  'iron-sultanate': {
    // v2 desértica.
    BG:[232,218,176], FRAME:[52,75,102], FRAME_DARK:[32,50,72], FRAME_LIGHT:[78,105,138],
    ACCENT:[192,138,60], ACCENT_DK:[148,100,38],
    VARIANT:[155,88,32], VARIANT_DK:[115,60,22],
    TEXT:[26,20,16], MUTED:[118,96,64], STAT_BG:[218,200,154],
    PROGRESS:[155,88,32], PANEL_BG:[220,204,162],
    SLOT_BG:[234,220,178], SLOT_SHADOW:[162,142,100], SLOT_HINT:[152,130,90],
    ORNAMENT:'crescent',
    STAT_HEADER_COLOR:[148,100,38], SECTION_COLOR:[148,100,38], NARRATIVE_COLOR:[115,60,22],
  },
  'heretic-legions': {
    BG:[212,192,152], FRAME:[26,20,16], FRAME_DARK:[10,8,6], FRAME_LIGHT:[60,38,30],
    ACCENT:[139,106,58], ACCENT_DK:[107,74,38],
    VARIANT:[147,26,26], VARIANT_DK:[108,16,16],
    TEXT:[26,20,16], MUTED:[97,78,56], STAT_BG:[198,178,142],
    PROGRESS:[147,26,26], PANEL_BG:[200,180,146],
    SLOT_BG:[216,198,162], SLOT_SHADOW:[140,122,92], SLOT_HINT:[130,112,82],
    ORNAMENT:'inverted_star',
    STAT_HEADER_COLOR:[155,80,18], SECTION_COLOR:[155,80,18], NARRATIVE_COLOR:[58,28,74],
    INFERNAL:[201,110,28], INFERNAL_DK:[155,80,18], PROFANE:[58,28,74],
  },
  'black-grail': {
    BG:[224,218,188], FRAME:[30,28,18], FRAME_DARK:[16,16,8], FRAME_LIGHT:[58,56,32],
    ACCENT:[138,130,60], ACCENT_DK:[102,96,42],
    VARIANT:[102,36,88], VARIANT_DK:[72,22,62],
    TEXT:[26,20,16], MUTED:[92,84,60], STAT_BG:[210,202,168],
    PROGRESS:[102,36,88], PANEL_BG:[212,204,172],
    SLOT_BG:[226,218,184], SLOT_SHADOW:[152,140,102], SLOT_HINT:[142,130,92],
    ORNAMENT:'fly_cross',
    STAT_HEADER_COLOR:[108,112,24], SECTION_COLOR:[102,36,88], NARRATIVE_COLOR:[108,112,24],
    PLAGUE:[148,152,38], PLAGUE_DK:[108,112,24],
  },
  'the-court': {
    BG:[228,218,198], FRAME:[34,22,38], FRAME_DARK:[18,10,22], FRAME_LIGHT:[70,48,76],
    ACCENT:[170,132,56], ACCENT_DK:[130,96,36],
    VARIANT:[110,28,88], VARIANT_DK:[78,14,62],
    TEXT:[26,20,16], MUTED:[98,84,76], STAT_BG:[218,206,184],
    PROGRESS:[110,28,88], PANEL_BG:[220,208,186],
    SLOT_BG:[228,216,196], SLOT_SHADOW:[152,138,118], SLOT_HINT:[140,124,108],
    ORNAMENT:'seven_headed_serpent',
    STAT_HEADER_COLOR:[78,14,62], SECTION_COLOR:[110,28,88], NARRATIVE_COLOR:[130,96,36],
    IRON:[88,78,88], CROWN_GOLD:[198,158,72],
  },
  // Alias: el factionId canon en DATA es 'court-serpent', no 'the-court'.
  // El render llama FACTION_PALETTES[wb.factionId] directamente.
  'court-serpent': {
    BG:[228,218,198], FRAME:[34,22,38], FRAME_DARK:[18,10,22], FRAME_LIGHT:[70,48,76],
    ACCENT:[170,132,56], ACCENT_DK:[130,96,36],
    VARIANT:[110,28,88], VARIANT_DK:[78,14,62],
    TEXT:[26,20,16], MUTED:[98,84,76], STAT_BG:[218,206,184],
    PROGRESS:[110,28,88], PANEL_BG:[220,208,186],
    SLOT_BG:[228,216,196], SLOT_SHADOW:[152,138,118], SLOT_HINT:[140,124,108],
    ORNAMENT:'seven_headed_serpent',
    STAT_HEADER_COLOR:[78,14,62], SECTION_COLOR:[110,28,88], NARRATIVE_COLOR:[130,96,36],
    IRON:[88,78,88], CROWN_GOLD:[198,158,72],
  },
};

const VARIANT_PALETTES = {
  // SPEC v2 — 8 variantes activas.
  'new-antioch:papal-states': {
    BG:[250,246,236], FRAME:[110,30,30], FRAME_LIGHT:[155,38,38],
    ACCENT:[220,185,100], ACCENT_DK:[175,145,70],
    VARIANT:[155,38,38], VARIANT_DK:[110,24,24],
    ORNAMENT:'crossed_keys',
  },
  'new-antioch:alba': {
    // Azul Saltire grimdark — decisión final.
    FRAME:[34,72,122], FRAME_DARK:[18,48,88], FRAME_LIGHT:[62,102,152],
    VARIANT:[62,100,60], VARIANT_DK:[35,65,35],
    PROGRESS:[62,100,60],
    ORNAMENT:'thistle',
    STAT_HEADER_COLOR:[34,72,122], SECTION_COLOR:[34,72,122], NARRATIVE_COLOR:[35,65,35],
  },
  'new-antioch:prussia': {
    BG:[228,222,210], FRAME:[40,38,36], FRAME_DARK:[20,18,16], FRAME_LIGHT:[78,72,64],
    ACCENT:[180,145,75], ACCENT_DK:[140,110,50],
    VARIANT:[95,25,25], VARIANT_DK:[60,12,12],
    ORNAMENT:'prussian_eagle',
    STAT_HEADER_COLOR:[40,38,36], SECTION_COLOR:[40,38,36], NARRATIVE_COLOR:[78,72,64],
  },
  'new-antioch:eire-rangers': {
    BG:[240,238,224], FRAME:[40,75,50], FRAME_DARK:[22,50,32], FRAME_LIGHT:[62,110,72],
    VARIANT:[155,30,30], VARIANT_DK:[110,18,18],
    ACCENT:[200,168,95], ACCENT_DK:[160,128,60],
    ORNAMENT:'irish_harp',
    STAT_HEADER_COLOR:[40,75,50], SECTION_COLOR:[40,75,50], NARRATIVE_COLOR:[22,50,32],
  },
  'new-antioch:abyssinia': {
    BG:[250,240,200], FRAME:[130,35,35], FRAME_DARK:[85,18,18], FRAME_LIGHT:[175,50,50],
    ACCENT:[220,175,60], ACCENT_DK:[175,130,35],
    VARIANT:[35,95,55], VARIANT_DK:[20,65,35],
    ORNAMENT:'lion_of_judah',
    STAT_HEADER_COLOR:[130,35,35], SECTION_COLOR:[130,35,35], NARRATIVE_COLOR:[20,65,35],
  },
  'iron-sultanate:fidai-alamut': {
    BG:[208,188,142], FRAME:[28,24,30], FRAME_DARK:[12,10,14], FRAME_LIGHT:[62,56,70],
    ACCENT:[175,130,55], ACCENT_DK:[130,92,35],
    VARIANT:[115,50,30], VARIANT_DK:[78,30,18],
    ORNAMENT:'jambiya',
    STAT_HEADER_COLOR:[28,24,30], SECTION_COLOR:[28,24,30], NARRATIVE_COLOR:[78,30,18],
  },
  'iron-sultanate:house-wisdom': {
    BG:[236,224,184], FRAME:[52,75,102], FRAME_LIGHT:[78,105,138],
    VARIANT:[32,105,75], VARIANT_DK:[18,78,55],
    ACCENT:[200,152,70], ACCENT_DK:[155,115,45],
    ORNAMENT:'astrolabe',
    STAT_HEADER_COLOR:[32,105,75], SECTION_COLOR:[32,105,75], NARRATIVE_COLOR:[18,78,55],
  },
  'iron-sultanate:iron-wall-def': {
    BG:[228,212,168], FRAME:[44,64,88], FRAME_DARK:[24,40,60], FRAME_LIGHT:[68,92,122],
    ACCENT:[175,122,55], ACCENT_DK:[132,88,32],
    VARIANT:[135,75,28], VARIANT_DK:[95,52,18],
    ORNAMENT:'fortified_tower',
    STAT_HEADER_COLOR:[132,88,32], SECTION_COLOR:[132,88,32], NARRATIVE_COLOR:[95,52,18],
  },
  // Roadmap fix — paridad reglas/paletas.
  'new-antioch:red-brigade': {
    // Soviético grimdark: rojo intenso + sickle/star, lleno de Wear and Tear.
    BG:[228,218,200], FRAME:[40,18,18], FRAME_DARK:[20,8,8], FRAME_LIGHT:[88,28,28],
    ACCENT:[210,170,70], ACCENT_DK:[160,128,42],
    VARIANT:[180,32,32], VARIANT_DK:[125,18,18],
    ORNAMENT:'red_star_hammer',
    STAT_HEADER_COLOR:[125,18,18], SECTION_COLOR:[125,18,18], NARRATIVE_COLOR:[40,18,18],
  },
  'black-grail:great-hegemon': {
    // Dirge of the Great Hegemon: ceniza + bilis plague + bronce viejo.
    BG:[218,208,180], FRAME:[28,30,18], FRAME_DARK:[14,16,8], FRAME_LIGHT:[58,60,32],
    ACCENT:[152,138,58], ACCENT_DK:[110,98,42],
    VARIANT:[140,148,40], VARIANT_DK:[100,108,28],
    ORNAMENT:'plague_banner',
    PLAGUE:[152,158,42], PLAGUE_DK:[112,118,28],
    STAT_HEADER_COLOR:[100,108,28], SECTION_COLOR:[100,108,28], NARRATIVE_COLOR:[28,30,18],
  },
  'black-grail:great-hunger': {
    // The Great Hunger: rojo visceral + dientes de hueso. Antipope devorador.
    BG:[218,200,176], FRAME:[26,16,16], FRAME_DARK:[12,6,6], FRAME_LIGHT:[58,32,32],
    ACCENT:[182,150,82], ACCENT_DK:[138,108,52],
    VARIANT:[152,28,40], VARIANT_DK:[105,18,28],
    ORNAMENT:'gluttony_maw',
    PLAGUE:[152,28,40], PLAGUE_DK:[105,18,28],
    STAT_HEADER_COLOR:[105,18,28], SECTION_COLOR:[105,18,28], NARRATIVE_COLOR:[26,16,16],
  },

  // ──── TRENCH PILGRIMS (3 variantes) ────
  'trench-pilgrims:sacred-affliction': {
    // Procesión flagelante: carmesí sangre + bronce religioso oxidado.
    BG:[228,212,182], FRAME:[58,18,18], FRAME_DARK:[32,10,10], FRAME_LIGHT:[98,32,32],
    ACCENT:[155,112,52], ACCENT_DK:[110,78,32],
    VARIANT:[148,30,30], VARIANT_DK:[100,18,18],
    ORNAMENT:'thorn_crown',
    STAT_HEADER_COLOR:[100,18,18], SECTION_COLOR:[100,18,18], NARRATIVE_COLOR:[58,18,18],
  },
  'trench-pilgrims:st-methodius': {
    // Orden Ortodoxa de Akakios: dorado bizantino + azul royal iconográfico.
    BG:[232,220,184], FRAME:[28,38,72], FRAME_DARK:[14,20,42], FRAME_LIGHT:[58,72,118],
    ACCENT:[208,170,68], ACCENT_DK:[160,128,48],
    VARIANT:[155,118,42], VARIANT_DK:[112,82,28],
    ORNAMENT:'orthodox_cross',
    STAT_HEADER_COLOR:[28,38,72], SECTION_COLOR:[28,38,72], NARRATIVE_COLOR:[112,82,28],
  },
  'trench-pilgrims:tenth-plague': {
    // Apocalíptica del cordero: marfil hueso + sangre seca de sacrificio.
    BG:[238,228,198], FRAME:[64,42,32], FRAME_DARK:[38,24,18], FRAME_LIGHT:[108,72,52],
    ACCENT:[176,140,82], ACCENT_DK:[132,102,55],
    VARIANT:[128,38,32], VARIANT_DK:[88,22,18],
    ORNAMENT:'lamb_skull',
    STAT_HEADER_COLOR:[88,22,18], SECTION_COLOR:[88,22,18], NARRATIVE_COLOR:[64,42,32],
  },

  // ──── HERETIC LEGIONS (3 variantes) ────
  'heretic-legions:trench-ghosts': {
    // Phantasmal infiltradores: gris pálido espectral + verde fosforescente.
    BG:[220,218,212], FRAME:[42,48,48], FRAME_DARK:[22,28,28], FRAME_LIGHT:[78,88,88],
    ACCENT:[148,148,138], ACCENT_DK:[108,108,98],
    VARIANT:[88,162,118], VARIANT_DK:[58,118,82],
    ORNAMENT:'ghost_mask',
    INFERNAL:[88,162,118], INFERNAL_DK:[58,118,82],
    STAT_HEADER_COLOR:[58,118,82], SECTION_COLOR:[42,48,48], NARRATIVE_COLOR:[58,118,82],
  },
  'heretic-legions:avarice-knights': {
    // Caballeros de la Codicia: dorado intenso + negro pez. Adoradores de Mammón.
    BG:[224,210,170], FRAME:[18,12,8], FRAME_DARK:[6,4,2], FRAME_LIGHT:[48,38,22],
    ACCENT:[225,178,52], ACCENT_DK:[180,138,32],
    VARIANT:[210,158,38], VARIANT_DK:[155,115,22],
    ORNAMENT:'coin_stack',
    INFERNAL:[210,158,38], INFERNAL_DK:[155,115,22],
    STAT_HEADER_COLOR:[18,12,8], SECTION_COLOR:[18,12,8], NARRATIVE_COLOR:[155,115,22],
  },
  'heretic-legions:naval-raiders': {
    // Naval Raiding Party: azul marino + óxido de sal naval.
    BG:[222,212,192], FRAME:[22,32,52], FRAME_DARK:[10,16,30], FRAME_LIGHT:[48,68,98],
    ACCENT:[148,118,78], ACCENT_DK:[108,82,52],
    VARIANT:[40,78,118], VARIANT_DK:[22,52,82],
    ORNAMENT:'anchor_skull',
    INFERNAL:[40,78,118], INFERNAL_DK:[22,52,82],
    STAT_HEADER_COLOR:[22,32,52], SECTION_COLOR:[22,32,52], NARRATIVE_COLOR:[108,82,52],
  },

  // ──── COURT OF THE SEVEN-HEADED SERPENT — 7 SINS ────
  // Comparten ornament canon seven_headed_serpent. Color VARIANT diferenciado
  // por pecado (tradición heráldica + canon Court).
  'court-serpent:sin-wrath': {
    BG:[228,212,200], FRAME:[42,18,18], FRAME_DARK:[22,8,8], FRAME_LIGHT:[88,32,32],
    ACCENT:[210,160,68], ACCENT_DK:[160,118,42],
    VARIANT:[170,30,30], VARIANT_DK:[120,18,18],
    ORNAMENT:'seven_headed_serpent',
    CROWN_GOLD:[210,160,68], IRON:[88,32,32],
    STAT_HEADER_COLOR:[120,18,18], SECTION_COLOR:[170,30,30], NARRATIVE_COLOR:[42,18,18],
  },
  'court-serpent:sin-envy': {
    BG:[224,222,196], FRAME:[28,48,32], FRAME_DARK:[14,28,18], FRAME_LIGHT:[58,88,62],
    ACCENT:[178,158,72], ACCENT_DK:[132,118,48],
    VARIANT:[88,138,52], VARIANT_DK:[58,98,32],
    ORNAMENT:'seven_headed_serpent',
    CROWN_GOLD:[178,158,72], IRON:[58,88,62],
    STAT_HEADER_COLOR:[58,98,32], SECTION_COLOR:[88,138,52], NARRATIVE_COLOR:[28,48,32],
  },
  'court-serpent:sin-lust': {
    BG:[232,218,212], FRAME:[68,22,52], FRAME_DARK:[42,10,32], FRAME_LIGHT:[112,42,88],
    ACCENT:[208,168,78], ACCENT_DK:[160,128,52],
    VARIANT:[182,52,118], VARIANT_DK:[132,32,88],
    ORNAMENT:'seven_headed_serpent',
    CROWN_GOLD:[208,168,78], IRON:[112,42,88],
    STAT_HEADER_COLOR:[132,32,88], SECTION_COLOR:[182,52,118], NARRATIVE_COLOR:[68,22,52],
  },
  'court-serpent:sin-pride': {
    BG:[218,210,222], FRAME:[42,22,68], FRAME_DARK:[22,10,42], FRAME_LIGHT:[78,52,112],
    ACCENT:[208,168,78], ACCENT_DK:[160,128,52],
    VARIANT:[108,52,158], VARIANT_DK:[72,28,118],
    ORNAMENT:'seven_headed_serpent',
    CROWN_GOLD:[228,178,88], IRON:[78,52,112],
    STAT_HEADER_COLOR:[72,28,118], SECTION_COLOR:[108,52,158], NARRATIVE_COLOR:[42,22,68],
  },
  'court-serpent:sin-sloth': {
    BG:[216,214,210], FRAME:[42,52,62], FRAME_DARK:[22,28,38], FRAME_LIGHT:[78,92,108],
    ACCENT:[148,148,138], ACCENT_DK:[108,108,98],
    VARIANT:[88,108,128], VARIANT_DK:[58,78,98],
    ORNAMENT:'seven_headed_serpent',
    CROWN_GOLD:[178,168,138], IRON:[78,92,108],
    STAT_HEADER_COLOR:[58,78,98], SECTION_COLOR:[88,108,128], NARRATIVE_COLOR:[42,52,62],
  },
  'court-serpent:sin-gluttony': {
    BG:[230,212,178], FRAME:[68,38,18], FRAME_DARK:[42,22,8], FRAME_LIGHT:[108,72,38],
    ACCENT:[208,158,68], ACCENT_DK:[160,118,42],
    VARIANT:[198,108,42], VARIANT_DK:[148,78,28],
    ORNAMENT:'seven_headed_serpent',
    CROWN_GOLD:[218,168,72], IRON:[108,72,38],
    STAT_HEADER_COLOR:[148,78,28], SECTION_COLOR:[198,108,42], NARRATIVE_COLOR:[68,38,18],
  },
  'court-serpent:sin-greed': {
    BG:[232,220,182], FRAME:[58,42,18], FRAME_DARK:[32,22,8], FRAME_LIGHT:[98,72,32],
    ACCENT:[228,178,52], ACCENT_DK:[180,138,32],
    VARIANT:[228,188,42], VARIANT_DK:[170,140,28],
    ORNAMENT:'seven_headed_serpent',
    CROWN_GOLD:[238,198,62], IRON:[98,72,32],
    STAT_HEADER_COLOR:[170,140,28], SECTION_COLOR:[228,188,42], NARRATIVE_COLOR:[58,42,18],
  },
};

// Helper: RGB array → CSS string. Tolera hex strings (back-compat) y null.
function rgbStr(c) {
  if (!c) return '#000';
  if (typeof c === 'string') return c;  // hex literal
  if (Array.isArray(c)) return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  return '#000';
}

// Reglas especiales (*) que concede cada pieza de Battlekit, verificadas en
// Digital Rulebook 1.0.1 / Warbands of Trench Crusade + Changelog 1.0.2.
// Las keywords de la pieza (NEGATE SHRAPNEL, HELD, LEADER...) no se repiten
// aquí: su texto sale del KEYWORD_GLOSSARY. Revisado 2026-09-26: fuera las
// entradas sin respaldo en los PDF (Combat Helmet, Reinforced Armour, Troop
// Flag, Bayonet, Frag/Smoke Grenade, Demo Charge).
const EQUIPMENT_IMPLICIT_ABILITIES = {
  // Warbands of TC 1.0.2, Iron Sultanate Battlekit.
  'Takwin Anqā Bird': [{
    name: 'Cause Confusion',
    desc: 'Los Success Rolls de ataques cuerpo a cuerpo contra este modelo son Risky. Antes de que un enemigo a 1" haga una retirada, su jugador hace un Risky Success Roll: si falla, no puede retirarse y su activación termina.',
  }],
  // Warbands of TC, estipulación Shield Combo.
  'Trench Shield': [{
    name: 'Shield Combo',
    desc: 'El modelo puede llevar este escudo junto a un arma de 2 manos si ambos tienen la estipulación Shield Combo.',
  }],
  'Binoculars': [{
    name: 'Binoculars',
    desc: 'Los enemigos con INFILTRATOR no pueden desplegarse a 16" o menos de este modelo, salvo en su propia zona de despliegue.',
  }],
  // Warbands of Trench Crusade: -2 INJURY MODIFIER, NEGATE FIRE, NEGATE GAS
  // + Protection From Harm. NEGATE [X] = ignora el Efecto de X (Rulebook).
  'Alchemist Armour': [
    { name: 'NEGATE FIRE', desc: 'No le afecta el Efecto de la keyword FIRE.' },
    { name: 'NEGATE GAS',  desc: 'No le afecta el Efecto de la keyword GAS.' },
    { name: 'Protection From Harm', desc: '-1 INJURY DICE a las Injury Rolls de ataques con armas FIRE o GAS contra el portador.' },
  ],
  'Medi-kit': [{
    name: 'Treat ACTION',
    desc: 'Risky Success Roll: si falla, la activación termina. Con éxito, retira 1 BLOOD MARKER del modelo o de un aliado a 1", o levanta a un aliado Down a 1".',
  }],
  // Revisión de reglas de abril 2026 (beta): Battlekit de mercenarios.
  'Tenderiser Maul': [{
    name: 'Mulch',
    desc: 'Al hacer Fight ACTION eliges Crushing Blow (las Injury Rolls tienen +2 INJURY MODIFIER en vez de +1) o Swinging Blow (1 Melee Attack contra cada enemigo a 1", de uno en uno en el orden que elijas).',
  }],
  'Vengeful Scripture': [{
    name: 'Unmaking',
    desc: '+1 INJURY MODIFIER por cada BLOOD MARKER del enemigo (además de lo que ganes gastándolos). Con Critical en la Success Roll, la Injury Roll tiene IGNORE ARMOUR, +1 INJURY DICE y +1 INJURY MODIFIER por cada BLOOD MARKER del enemigo.',
  }, {
    name: 'Spoken',
    desc: 'Puede hacer Ranged Attacks con Vengeful Scripture aunque esté a 1" de un enemigo.',
  }],
  // Revisión de reglas de abril 2026 (beta): Amalgam y Black Grail.
  'Gluttonous Arsenal': [{
    name: 'Putrid Spray',
    desc: 'Los Melee Attacks con el Gluttonous Arsenal tienen la keyword INFECTION MARKERS.',
  }],
  'Blessings of Beelzebub': [{
    name: 'Favoured Strain',
    desc: 'Al empezar cada partida elige 1 Strain; los modelos amigos con ella ganan su efecto Favoured: Bolgias Gut sin -1 INJURY DICE en Burst; Hellfly Host recupera Undead Fortitude; Leech Grip pone D3 BLOOD MARKERS; Tapeworm Throng da -2 DICE a Long Range en vez de -1.',
  }],
  // Revisión de reglas de abril 2026 (beta): equipo nuevo del Iron Sultanate.
  'Al-inbīq Kit': [{
    name: "'Ilm al-Mīzān ACTION",
    desc: 'Si no está a 1" de enemigos: Risky Success Roll. Con Success o Critical, elige un modelo amigo ARTIFICIAL a 6" y en Line of Sight: puede levantarse sin gastar movimiento y le quitas hasta D3 BLOOD MARKERS y/o INFECTION MARKERS.',
  }],
  'Alchemical Fire': [{
    name: 'Unfettered Flame',
    desc: 'Las Injury Rolls de los Ranged Attacks del portador no se ven afectadas por NEGATE FIRE.',
  }],
  'Corrosive Ammunition': [{
    name: 'Volatile Concoction',
    desc: 'Solo se puede usar con Alaybozan, Halberd-Gun, Jezzail o Siege Jezzail (aunque el Alaybozan tenga SHRAPNEL). En campaña no se puede reasignar a otro modelo.',
  }],
  'Regimental Kaşık': [{
    name: 'Brotherhood of the Spoon',
    desc: 'En la Morale Phase no cuentan los Janissaries amigos Down u Out of Action mientras haya en mesa un Janissary amigo con el Regimental Kaşık. Cuenta como Musical Instrument para Mehterân.',
  }],
  // Changelog 1.0.2 p.76: AMMUNITION (+1 DICE) + Guiding Path.
  'Alchemical Ammunition': [{
    name: 'Guiding Path',
    desc: 'Solo se puede usar con Alaybozan, Halberd-Gun, Jezzail o Siege Jezzail (aunque el Alaybozan tenga SHRAPNEL). En campaña no se puede reasignar a otro modelo.',
  }],
  'Gas Mask': [{
    name: 'NEGATE GAS',
    desc: 'No le afecta el Efecto de la keyword GAS.',
  }],
  'Field Shrine': [
    { name: 'Shrine', desc: 'Tras desplegar al portador, coloca un Field Shrine (peana de 40mm) en su zona de despliegue: terreno infranqueable que no se puede mover. En la Morale Phase, cada Field Shrine propio suma 3 a los modelos que no están Down ni Out of Action (máximo +9).' },
    { name: 'Tear It Down!', desc: 'Se puede atacar al Field Shrine como a un modelo enemigo. Si es alcanzado por un ataque o por el radio de un BLAST, se retira y se tacha de la hoja de banda (sin Injury Roll).' },
  ],
  'Musical Instrument': [{
    name: 'Fanfare',
    desc: '+1 DICE a las Risky Success Rolls de Dash de modelos aliados a 4" o menos de un modelo con Musical Instrument. El portador también se beneficia: un modelo está a X" de sí mismo, incluido el portador (Rules Commentaries, Misc Q2).',
  }],
  'Blessed Icon': [{
    name: 'Talisman',
    desc: 'Una vez por partida, si una Risky Success Roll del modelo falla, puedes usar el Talisman para que su activación no termine.',
  }],
  'Unholy Trinket': [{
    name: 'Talisman',
    desc: 'Una vez por partida, si una Risky Success Roll del modelo falla, puedes usarlo para que su activación no termine.',
  }],
};

function getFactionPalette(wb) {
  if (!wb || typeof wb !== 'object') return FACTION_PALETTES['new-antioch'];
  const base = FACTION_PALETTES[wb.factionId] || FACTION_PALETTES['new-antioch'];
  const key = (wb.factionId || '') + ':' + (wb.variantId || '');
  const variant = VARIANT_PALETTES[key] || {};
  return Object.assign({}, base, variant);
}

/* ─── Placeholder imágenes WWI dominio público (CATALOGO-imagenes-placeholders.md)
 *
 * Sistema híbrido: assets/wwi-placeholders/{faction}/*.jpg como fuente
 * primaria; EMBEDDED_PLACEHOLDERS como fallback base64 si assets falla
 * (file:// + adblocker, asset missing, tainted canvas).
 *
 * Posición: zona vacía tras NARRATIVE en drawCardOnCanvas (~últimos 100px).
 * Selección determinística por simpleHashStr(model.name) → siempre misma
 * foto para el mismo modelo.
 */
const FACTION_PLACEHOLDERS = {
  // Pool poblado tras descarga manual de Wikimedia Commons (~65 imágenes
  // WWI dominio público). Selección determinística por nombre del modelo
  // (simpleHashStr). Mapeo temático grimdark, no histórico estricto:
  //
  // - new-antioch    → Aliados (francés / británico / ANZAC).
  // - trench-pilgrims → trincheras + procesiones + soldados ascéticos.
  // - iron-sultanate → Otomano / Mesopotamia / Kemal Atatürk.
  // - heretic-legions → Imperios Centrales (alemán Stosstrupp / austríaco).
  // - black-grail    → masacre / gas / artillería / devastación (MG icónica).
  // - the-court      → tecnología pesada noble (Maxim / Vickers / Wz1910).
  //
  // Variante > base. Si una variante específica define su pool, sustituye.

  'new-antioch': [
    'assets/wwi-placeholders/soldado_frances.JPG',
    'assets/wwi-placeholders/soldado_frances_uniforme_temprano.jpg',
    'assets/wwi-placeholders/artilleria_britanica_accion.jpg',
    'assets/wwi-placeholders/gallipoli_anzac_1915.jpg',
    'assets/wwi-placeholders/loc_sol_001.jpg',
    'assets/wwi-placeholders/loc_sol_002.jpg',
    'assets/wwi-placeholders/loc_sol_003.jpg',
  ],
  'trench-pilgrims': [
    'assets/wwi-placeholders/loc_tr_001.jpg',
    'assets/wwi-placeholders/loc_tr_002.jpg',
    'assets/wwi-placeholders/loc_tr_003.jpg',
    'assets/wwi-placeholders/loc_tr_004.jpg',
    'assets/wwi-placeholders/no_mans_land_cullen.jpg',
    'assets/wwi-placeholders/trinchera_aerea_primera_guerra.jpg',
    'assets/wwi-placeholders/loc_sol_004.jpg',
    'assets/wwi-placeholders/loc_sol_005.jpg',
  ],
  'iron-sultanate': [
    'assets/wwi-placeholders/otomano_ataturk_1907.JPG',
    'assets/wwi-placeholders/otomano_ataturk_uniforme.JPG',
    'assets/wwi-placeholders/otomano_kemal5.JPG',
    'assets/wwi-placeholders/otomano_kemal_postcard.jpg',
    'assets/wwi-placeholders/loc_ot_001.jpg',
    'assets/wwi-placeholders/loc_ot_002.jpg',
    'assets/wwi-placeholders/loc_ot_003.jpg',
    'assets/wwi-placeholders/loc_ot_004.jpg',
    'assets/wwi-placeholders/loc_ot_005.jpg',
  ],
  'heretic-legions': [
    'assets/wwi-placeholders/armadura_escudo_aleman.jpg',
    'assets/wwi-placeholders/soldados_alemanes.jpg',
    'assets/wwi-placeholders/soldados_germano_austriacos_postal.jpg',
    'assets/wwi-placeholders/uniforme_infanteria_alemana_1914.jpg',
    'assets/wwi-placeholders/mortero_trinchera_aleman_1916.jpg',
    'assets/wwi-placeholders/porra_asalto_trinchera.jpg',
    'assets/wwi-placeholders/ametrallador_aleman_acorazado.jpg',
  ],
  'black-grail': [
    'assets/wwi-placeholders/loc_mg_001.jpg',
    'assets/wwi-placeholders/loc_mg_002.jpg',
    'assets/wwi-placeholders/loc_mg_003.jpg',
    'assets/wwi-placeholders/loc_mg_004.jpg',
    'assets/wwi-placeholders/loc_mg_005.jpg',
    'assets/wwi-placeholders/ametralladora_vickers_gas.jpg',
    'assets/wwi-placeholders/proyectiles_artilleria.jpg',
    'assets/wwi-placeholders/ametralladoras_museo.jpg',
  ],
  'the-court': [
    'assets/wwi-placeholders/maxim_mg_1.jpg',
    'assets/wwi-placeholders/maxim_mg_2.jpg',
    'assets/wwi-placeholders/maxim_wz1910.jpg',
    'assets/wwi-placeholders/vickers_hmg.jpg',
    'assets/wwi-placeholders/municion_rifle.jpg',
  ],
  // Alias del factionId real en DATA.
  'court-serpent': [
    'assets/wwi-placeholders/maxim_mg_1.jpg',
    'assets/wwi-placeholders/maxim_mg_2.jpg',
    'assets/wwi-placeholders/maxim_wz1910.jpg',
    'assets/wwi-placeholders/vickers_hmg.jpg',
    'assets/wwi-placeholders/municion_rifle.jpg',
  ],
  // Variantes (override) — pool propio si la sub-facción tiene aesthetic
  // diferenciable de la base.
  'iron-sultanate:iron-wall-def': [
    'assets/wwi-placeholders/loc_ot_006.jpg',
    'assets/wwi-placeholders/loc_ot_007.jpg',
    'assets/wwi-placeholders/loc_ot_008.jpg',
    'assets/wwi-placeholders/loc_ot_009.jpg',
    'assets/wwi-placeholders/loc_ot_010.jpg',
  ],
};

const EMBEDDED_PLACEHOLDERS = {
  // dataURL base64. Vacío pre-Fase F. Migración a embebido tras validar
  // visual con assets externos.
};

const IMAGE_CACHE = new Map();

function simpleHashStr(s) {
  // djb2 — hash determinístico no-crypto.
  let hash = 5381;
  if (!s) return hash;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getPlaceholderForModel(model, wb) {
  if (!model || !wb) return null;
  const fid = wb.factionId || '';
  const vid = wb.variantId || '';
  const variantKey = fid + ':' + vid;
  // Pool prioridad: variante > facción base.
  let pool = (Array.isArray(FACTION_PLACEHOLDERS[variantKey]) && FACTION_PLACEHOLDERS[variantKey].length)
    ? FACTION_PLACEHOLDERS[variantKey]
    : (FACTION_PLACEHOLDERS[fid] || []);
  if (pool.length === 0) {
    // Fallback embebido (dataURL base64).
    return EMBEDDED_PLACEHOLDERS[variantKey] || EMBEDDED_PLACEHOLDERS[fid] || null;
  }
  const h = simpleHashStr(model.name || model.uid || '');
  return pool[h % pool.length];
}

function preloadFactionImages(wb) {
  if (!wb || typeof window === 'undefined' || typeof window.Image !== 'function') {
    return Promise.resolve([]);
  }
  const fid = wb.factionId || '';
  const vid = wb.variantId || '';
  const variantKey = fid + ':' + vid;
  const paths = [];
  if (Array.isArray(FACTION_PLACEHOLDERS[variantKey])) paths.push(...FACTION_PLACEHOLDERS[variantKey]);
  if (Array.isArray(FACTION_PLACEHOLDERS[fid])) paths.push(...FACTION_PLACEHOLDERS[fid]);
  for (const k of [variantKey, fid]) {
    const d = EMBEDDED_PLACEHOLDERS[k];
    if (d) paths.push(d);
  }
  const promises = paths.map(src => new Promise(resolve => {
    if (IMAGE_CACHE.has(src)) { resolve(IMAGE_CACHE.get(src)); return; }
    const img = new window.Image();
    img.onload = () => { IMAGE_CACHE.set(src, img); resolve(img); };
    img.onerror = () => { resolve(null); };  // Fallo silencioso → PDF no rompe.
    img.src = src;
  }));
  return Promise.all(promises);
}

function getImplicitAbilities(model) {
  if (!model) return [];
  const out = [];
  const eq = model.companionEquipment || model.equipment || [];
  for (const item of eq) {
    const name = (typeof item === 'string') ? item : (item && item.name);
    if (!name) continue;
    const abs = EQUIPMENT_IMPLICIT_ABILITIES[name];
    if (Array.isArray(abs)) out.push(...abs);
  }
  return out;
}

/* Variant-specific band-wide rules. Aplicadas a TODOS los modelos
 * de la banda en el bloque REGLAS & HABILIDADES de la tarjeta.
 * Cada entrada: { name, desc }.
 */
const VARIANT_FACTION_RULES = {
  'iron-sultanate:iron-wall-def': [
    { name: 'Siege Jezzail Teams',
      desc: '+1 DICE al disparar un Siege Jezzail si hay un amigo a 1" o menos.' },
    { name: 'Marksmanship of the Iron Wall',
      desc: '+2 DICE (en vez de +1) a los disparos con Elevated Position.' },
  ],
  'new-antioch:alba': [
    { name: 'Brave',
      desc: '+1 DICE a los Morale Checks de la banda.' },
    { name: 'Rampant Charge',
      desc: 'Todos los modelos tienen IGNORE DEFENDED OBSTACLE.' },
    { name: 'Bagpipes',
      desc: 'Los amigos a 8" del modelo con Bagpipes tienen NEGATE FEAR.' },
    { name: 'Celtic Machine Armour',
      desc: 'La Machine Armour mantiene Charge Bonus D6" y sus armaduras no sufren penalización de movimiento por Down.' },
  ],
  'new-antioch:prussia': [
    { name: 'Masters of the Grenade',
      desc: '+4" al alcance de todas las granadas; si el objetivo está a más de 8", -1 DICE a la Success Roll.' },
  ],
  'new-antioch:eire-rangers': [
    { name: 'Hit & Run Tactics',
      desc: '-1 DICE a los ataques cuerpo a cuerpo contra un modelo de la banda que se está retirando.' },
  ],
  'new-antioch:abyssinia': [
    { name: 'Short-Range Marksmanship',
      desc: '+1 DICE a los disparos a Short Range del Lieutenant y los Yeomen (no granadas ni armas HEAVY).' },
  ],
  'trench-pilgrims:sacred-affliction': [
    { name: 'Punishing Millstones',
      desc: '+1 INJURY DICE a los ataques cuerpo a cuerpo contra objetivos Down (no Ecclesiastic Prisoners).' },
  ],
  'trench-pilgrims:tenth-plague': [
    { name: 'Favour of the Lord',
      desc: 'Al empezar cada turno, 1 BLESSING MARKER a un modelo de la banda.' },
  ],
  'heretic-legions:trench-ghosts': [
    { name: 'Semi-corporeal',
      desc: '-1 INJURY DICE a las Injury Rolls de disparos contra modelos de la banda.' },
    { name: 'Slow and Creeping',
      desc: 'Dash como 3"/Infantry; -1 DICE a sus ataques contra un enemigo que se retira.' },
    { name: 'Undead Horror',
      desc: 'Todos tienen FEAR, NEGATE DIFFICULT TERRAIN y NEGATE GAS.' },
  ],
  'heretic-legions:naval-raiders': [
    { name: 'Fast as Lightning',
      desc: '+1 DICE a la Risky Success Roll de Dash.' },
  ],
  'new-antioch:red-brigade': [
    { name: 'Wear and Tear',
      desc: 'Empieza con 1 BLOOD MARKER por cada 200 👑 completos de la banda; los reparte el rival (máx. 2 por modelo).' },
    { name: 'No Retreat',
      desc: 'Nadie sale voluntariamente del cuerpo a cuerpo salvo los Mercy Dogs y quien arrastren.' },
  ],
  'black-grail:great-hunger': [
    { name: 'Eternal Appetence',
      desc: 'Al empezar cada turno eliges un efecto del Hambre (Agonised Churning, Ruinous Masticating, Spasmodic Wretching o Vile Craving) para los amigos a 8" de una Matagot Hag.' },
  ],
};

function getVariantFactionRules(wb) {
  if (!wb || !wb.factionId) return [];
  const key = wb.factionId + ':' + (wb.variantId || '');
  return (VARIANT_FACTION_RULES[key] || []).slice();
}

function buildModelCardData(model, wb) {
  // Defensive: model o wb null → datos minimales sin crash.
  model = model || {};
  wb = wb || {};
  const palette = getFactionPalette(wb);

  // Sub-D — Fallback nativo. Si el modelo NO tiene companion data,
  // intenta resolver unit canon vía getUnit(fid, unitId) y usar sus
  // stats/keywords/abilities/equipment. Compatible con bandas creadas
  // sin Companion import.
  let stats, equipment, kws, abilitiesNative;
  if (model.companionRef || model.companionStats) {
    stats = model.companionStats || {};
    equipment = model.companionEquipment || [];
    kws = (model.companionKeywords || []).map(k => (typeof k === 'string' ? k : k && k.name) || '').filter(Boolean);
    abilitiesNative = (model.companionAbilities || []).map(a => typeof a === 'string' ? { name: a } : a);
  } else {
    // Native path: el motor de Forge (variante, mejoras y progresión).
    const unit = (typeof getUnit === 'function' && wb.factionId && model.unitId)
      ? getUnit(wb.factionId, model.unitId) : null;
    if (unit && unit.stats) {
      const es = effectiveStats(model, unit, wb);
      stats = {
        move: es.movement || es.move || '0',
        ranged: es.ranged || '0',
        melee: es.melee || '0',
        armour: es.armour || '0',
      };
    } else {
      stats = {};
    }
    kws = unit ? effectiveKeywords(model, unit, wb) : [];
    // Habilidades de la unidad (con la variante) y después las mejoras activas.
    abilitiesNative = unit ? effectiveAbilities(model, unit, wb).map(n => ({ name: n, desc: '' })) : [];
    for (const upg of (unit ? activeUpgrades(model, unit, wb) : [])) {
      abilitiesNative.push({ name: upg.name, desc: upg.note || '' });
    }
    // Battlekit: armas por su categoría de la armería (type "2-Handed weapon"…).
    const WEAPON_CATS = ['ranged', 'melee', 'grenades', 'anchoriteRanged', 'anchoriteMelee'];
    const bkIds = Array.isArray(model.battlekit) ? model.battlekit : [];
    equipment = bkIds.map(bid => {
      const it = findBattlekitItem(wb.factionId, bid, wb);
      if (!it) return { name: bid };
      const cat = getArmouryCategory(wb.factionId, bid);
      const isWeapon = WEAPON_CATS.includes(cat);
      return { name: it.name, keywords: it.weaponKeywords || [], range: it.range,
               type: isWeapon ? (cat === 'grenades' ? 'Grenade' : String(it.type || '') + ' weapon') : (it.type || '') };
    });
    // Equipo permanente de la entrada (Anointed, Hunter of the Left-Hand Path…).
    const perm = ((unit && getUnitWithVariant(wb, unit.id)) || unit || {}).permanentEquipment || [];
    for (const pname of perm) {
      const it = findArmouryItemByName(wb, pname);
      const isWeapon = it && !/shield/i.test(String(it.type || '')) &&
        (/handed|grenade/i.test(String(it.type || '')) || (it.range && it.range !== '-'));
      equipment.push(it
        ? { name: pname, keywords: it.weaponKeywords || [], range: it.range,
            type: isWeapon ? String(it.type) + ' weapon' : (it.type || 'Equipment') }
        : { name: pname, type: 'Equipment' });
    }
  }
  const stats0 = stats;  // alias para mantener referencia luego.
  stats = stats0;
  const implicit = getImplicitAbilities((model.companionEquipment || model.equipment) ? model : { equipment });
  // MERCENARY: no se benefician de las reglas de facción/variante de la banda
  const isMercModel = !model.companionRef && (DATA.mercenaries || []).some(m => m.id === model.unitId);
  const factionRules = isMercModel ? [] : getVariantFactionRules(wb);

  // Compose abilities con tag kind para filtrado de descripción.
  // Dedupe case-insensitive + fallback ABILITY_LIBRARY.summary.
  // kind: 'native' | 'keyword' | 'factionRule' | 'implicit'
  // Render decide si muestra desc según kind (factionRule + NEGATE skip).
  const _abSeen = new Map();
  function _abAdd(name, desc, kind) {
    if (!name) return;
    const nameStr = String(name);
    const key = nameStr.toLowerCase().trim();
    if (!key) return;
    let d = desc || '';
    if (!d && typeof ABILITY_LIBRARY !== 'undefined') {
      // Lookup directo + case-insensitive normalizado.
      let entry = ABILITY_LIBRARY[nameStr];
      if (!entry) {
        const lcKey = nameStr.toLowerCase().trim();
        for (const k of Object.keys(ABILITY_LIBRARY)) {
          if (k.toLowerCase().trim() === lcKey) { entry = ABILITY_LIBRARY[k]; break; }
        }
      }
      if (entry) d = entry.summary || '';
    }
    const existing = _abSeen.get(key);
    if (!existing) {
      _abSeen.set(key, { name: nameStr, desc: d, kind: kind || 'native' });
    } else {
      if (!existing.desc && d) existing.desc = d;
      // factionRule gana prioridad si llega después (señala origen real).
      if (kind === 'factionRule') existing.kind = 'factionRule';
    }
  }
  for (const a of abilitiesNative) _abAdd(a.name || String(a), a.desc || '', 'native');
  for (const k of kws) _abAdd(k, '', 'keyword');
  for (const r of factionRules) _abAdd(r.name, r.desc, 'factionRule');
  for (const i of implicit) _abAdd(i.name, i.desc, 'implicit');
  const abilities = Array.from(_abSeen.values());

  const hasElementalMastery = abilities.some(a =>
    /mastery of (the )?elements/i.test(a.name || '')
  );

  // Nombre split en 2 líneas si >18 chars.
  const fullName = model.name || '';
  let nameL1 = fullName, nameL2 = '';
  if (fullName.length > 18) {
    const mid = Math.floor(fullName.length / 2);
    const sp = fullName.lastIndexOf(' ', mid + 3);
    if (sp > 0) { nameL1 = fullName.slice(0, sp); nameL2 = fullName.slice(sp + 1); }
  }

  // Stats — leer companionStats con fallbacks razonables.
  const parseStat = (v) => {
    if (v == null) return '0';
    const s = String(v).replace(/"/g, '');
    return s;
  };
  // 4 stats canon: Movement / Ranged / Melee / Armour.
  // (Eliminada B = Blood Markers placeholder — siempre 0, confundía.)
  const statRow = [
    { label:'MOV',    value: parseStat(stats.move) },
    { label:'RNG',    value: parseStat(stats.ranged) },
    { label:'MEL',    value: parseStat(stats.melee) },
    { label:'ARM',    value: parseStat(stats.armour) },
  ];

  // Weapons (de equipment con type weapon/grenade). Perfil completo:
  // nombre + manos + rango + keywords. Enriquece desde DATA.armoury si el
  // import Companion no trajo los detalles.
  function _findArmouryByName(name) {
    return findArmouryItemByName(wb, name);
  }
  const weapons = equipment.filter(e =>
    /weapon/i.test(e.type || '') || /grenade/i.test(e.type || '')
  ).map(w => {
    const enriched = _findArmouryByName(w.name) || {};
    const t = String(w.type || enriched.type || '');
    let hand = '';
    if (/2-?handed/i.test(t)) hand = '2H';
    else if (/1-?handed/i.test(t)) hand = '1H';
    else if (/pistol/i.test(t)) hand = 'Pistol';
    else if (/grenade/i.test(t)) hand = 'Granada';
    else if (/shield/i.test(t)) hand = 'Shield';
    const kwArrSrc = (Array.isArray(w.keywords) && w.keywords.length) ? w.keywords
                   : (Array.isArray(enriched.weaponKeywords) ? enriched.weaponKeywords : []);
    const kwArr = kwArrSrc.map(k => typeof k === 'string' ? k : (k && k.name) || '').filter(Boolean);
    return {
      name: w.name,
      type: t,
      hand,
      range: w.range || enriched.range || '—',
      dice:  w.dice  || '—',
      injury: w.injury || '—',
      keywords: kwArr,
      keyword: kwArr.join(' · '),
    };
  });

  // Battlekit (equipment no-weapon).
  const battlekit = equipment.filter(e =>
    !/weapon/i.test(e.type || '') && !/grenade/i.test(e.type || '')
  ).map(b => ({ name: b.name, type: b.type || '' }));

  // Progresión PE (XP visual scale 0-12).
  const prog = model.baseProgression || {};
  const pe = { current: prog.xp || 0, max: 12 };
  const advancements = (prog.advancements || []).length;
  const scars = (prog.scars || []).length;
  const record = ''; // placeholder kill count

  // Placeholder watermark: lookup en IMAGE_CACHE. Null si no precargada
  // (drawCardPlaceholder hace skip silencioso).
  const placeholderPath = (typeof getPlaceholderForModel === 'function')
    ? getPlaceholderForModel(model, wb) : null;
  const placeholderImg = (placeholderPath && typeof IMAGE_CACHE !== 'undefined')
    ? (IMAGE_CACHE.get(placeholderPath) || null) : null;

  return {
    palette,
    nameL1, nameL2,
    role: model.unitId || model.role || '',
    cost: typeof model.companionCost === 'number' ? model.companionCost : (typeof model.cost === 'number' ? model.cost : 0),
    factionTop: (wb.factionId || '').toUpperCase(),
    factionBot: (wb.variantId || '').toUpperCase(),
    stats: statRow,
    weapons,
    abilities,
    battlekit,
    oneShotAbilities: abilitiesNative.filter(a => /1.*uso|once per|1\/game/i.test(a.desc || '')),
    hasElementalMastery,
    pe, advancements, scars, record,
    narrative: model.narrative || '',
    placeholderImg,
  };
}

/* ─── Canvas helpers para tarjetas + trackers ───────────────────── */

const CARD_W = 744, CARD_H = 1039;       // 63×88mm @ 300dpi
const TRACKER_W = 1748, TRACKER_H = 1240; // 148×105mm @ 300dpi

function drawTextCentered(ctx, text, cx, cy, font, fill) {
  if (!ctx || text == null) return;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = fill || '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), cx, cy);
  ctx.restore();
}

function drawTextLeft(ctx, text, x, y, font, fill) {
  if (!ctx || text == null) return;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = fill || '#000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

// SPEC v2 — 13 ornamentos canon. Cada función drawOrnament_<key> usa
// rgbStr(palette.X) para color (arrays RGB v2 + back-compat hex).

function drawOrnament_papalCross(ctx, cx, cy, P, s) {
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
  ctx.moveTo(cx - s*0.6, cy - s*0.3); ctx.lineTo(cx + s*0.6, cy - s*0.3);
  ctx.moveTo(cx - s*0.4, cy + s*0.1); ctx.lineTo(cx + s*0.4, cy + s*0.1);
  ctx.stroke();
  ctx.restore();
}

function drawOrnament_crossedKeys(ctx, cx, cy, P, s) {
  // Papal States: 2 llaves cruzadas en X.
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT || P.ACCENT_DK);
  ctx.lineWidth = 2;
  // Llave izquierda diagonal /.
  ctx.beginPath();
  ctx.moveTo(cx - s*0.8, cy + s*0.8); ctx.lineTo(cx + s*0.5, cy - s*0.5);
  ctx.stroke();
  // Anillo izquierdo.
  ctx.beginPath(); ctx.arc(cx - s*0.7, cy + s*0.7, s*0.18, 0, Math.PI*2); ctx.stroke();
  // Llave derecha diagonal \.
  ctx.beginPath();
  ctx.moveTo(cx + s*0.8, cy + s*0.8); ctx.lineTo(cx - s*0.5, cy - s*0.5);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + s*0.7, cy + s*0.7, s*0.18, 0, Math.PI*2); ctx.stroke();
  // Dientes (pequeños rectángulos en las puntas superiores).
  ctx.fillStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  ctx.fillRect(cx + s*0.4, cy - s*0.5, s*0.15, s*0.15);
  ctx.fillRect(cx - s*0.55, cy - s*0.5, s*0.15, s*0.15);
  ctx.restore();
}

function drawOrnament_thistle(ctx, cx, cy, P, s) {
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = rgbStr(P.VARIANT);
  ctx.fill();
  ctx.restore();
}

function drawOrnament_prussianEagle(ctx, cx, cy, P, s) {
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  ctx.lineWidth = 2;
  // Alas en V abierta.
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s*0.2);
  ctx.lineTo(cx, cy - s*0.5);
  ctx.lineTo(cx + s, cy - s*0.2);
  ctx.stroke();
  // Cuerpo vertical.
  ctx.beginPath();
  ctx.moveTo(cx, cy - s*0.5);
  ctx.lineTo(cx, cy + s*0.5);
  ctx.stroke();
  // Cola triangular.
  ctx.fillStyle = rgbStr(P.ACCENT);
  ctx.beginPath();
  ctx.moveTo(cx - s*0.3, cy + s*0.5);
  ctx.lineTo(cx + s*0.3, cy + s*0.5);
  ctx.lineTo(cx, cy + s);
  ctx.closePath();
  ctx.fill();
  // Cabeza pico.
  ctx.beginPath();
  ctx.arc(cx, cy - s*0.55, s*0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrnament_irishHarp(ctx, cx, cy, P, s) {
  // Arpa irlandesa: marco curvo + 4 cuerdas verticales.
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  ctx.lineWidth = 2;
  // Marco curvo (arco superior derecho).
  ctx.beginPath();
  ctx.moveTo(cx - s*0.5, cy + s*0.7);
  ctx.lineTo(cx - s*0.5, cy - s*0.4);
  ctx.quadraticCurveTo(cx + s*0.2, cy - s, cx + s*0.5, cy - s*0.2);
  ctx.stroke();
  // Base.
  ctx.beginPath();
  ctx.moveTo(cx - s*0.7, cy + s*0.7);
  ctx.lineTo(cx + s*0.7, cy + s*0.7);
  ctx.stroke();
  // 4 cuerdas verticales.
  for (let i = 0; i < 4; i++) {
    const x = cx - s*0.3 + i * (s*0.2);
    ctx.beginPath();
    ctx.moveTo(x, cy + s*0.7);
    ctx.lineTo(x, cy - s*0.5 + i*0.1*s);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrnament_lionOfJudah(ctx, cx, cy, P, s) {
  // León con melena (círculo + radiación) + corona.
  ctx.save();
  // Melena radial.
  ctx.fillStyle = rgbStr(P.ACCENT);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
    ctx.lineTo(cx + Math.cos(a + 0.3) * s*0.7, cy + Math.sin(a + 0.3) * s*0.7);
    ctx.closePath();
    ctx.fill();
  }
  // Cara central.
  ctx.fillStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  ctx.beginPath();
  ctx.arc(cx, cy, s*0.4, 0, Math.PI * 2);
  ctx.fill();
  // Corona arriba (3 puntas).
  ctx.fillStyle = rgbStr(P.VARIANT || P.ACCENT);
  ctx.beginPath();
  ctx.moveTo(cx - s*0.3, cy - s*0.4);
  ctx.lineTo(cx - s*0.15, cy - s*0.7);
  ctx.lineTo(cx, cy - s*0.45);
  ctx.lineTo(cx + s*0.15, cy - s*0.7);
  ctx.lineTo(cx + s*0.3, cy - s*0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOrnament_ironCrossRough(ctx, cx, cy, P, s) {
  // Trench Pilgrims: cruz hierro tosca + gota de sangre.
  ctx.save();
  ctx.fillStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  const t = s * 0.25;
  ctx.fillRect(cx - t/2, cy - s, t, s*2);
  ctx.fillRect(cx - s, cy - t/2, s*2, t);
  // Gota de sangre en el centro.
  ctx.fillStyle = rgbStr(P.VARIANT || [148,50,28]);
  ctx.beginPath();
  ctx.arc(cx, cy + s*0.05, s*0.18, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawOrnament_crescent(ctx, cx, cy, P, s) {
  // Media luna otomana + estrella pequeña.
  ctx.save();
  ctx.fillStyle = rgbStr(P.ACCENT);
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = rgbStr(P.BG);
  ctx.beginPath();
  ctx.arc(cx + s*0.3, cy, s*0.95, 0, Math.PI*2);
  ctx.fill();
  // Estrella pequeña dentro de la concavidad.
  ctx.fillStyle = rgbStr(P.ACCENT);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI/2 + (i/10) * Math.PI * 2;
    const r = i % 2 === 0 ? s*0.2 : s*0.08;
    const x = cx + s*0.55 + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOrnament_jambiya(ctx, cx, cy, P, s) {
  // Daga curva árabe vertical.
  ctx.save();
  ctx.fillStyle = rgbStr(P.ACCENT);
  // Hoja curva (bezier).
  ctx.beginPath();
  ctx.moveTo(cx - s*0.1, cy + s*0.4);
  ctx.quadraticCurveTo(cx + s*0.3, cy - s*0.2, cx + s*0.1, cy - s);
  ctx.lineTo(cx + s*0.15, cy - s);
  ctx.quadraticCurveTo(cx + s*0.4, cy - s*0.15, cx, cy + s*0.4);
  ctx.closePath();
  ctx.fill();
  // Guarda horizontal.
  ctx.fillRect(cx - s*0.4, cy + s*0.4, s*0.8, s*0.1);
  // Mango.
  ctx.fillStyle = rgbStr(P.VARIANT_DK || P.ACCENT_DK);
  ctx.fillRect(cx - s*0.1, cy + s*0.5, s*0.2, s*0.45);
  ctx.restore();
}

function drawOrnament_astrolabe(ctx, cx, cy, P, s) {
  // Círculos concéntricos + marcas radiales.
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, s*0.65, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, s*0.3, 0, Math.PI*2); ctx.stroke();
  // Marcas radiales 8 direcciones.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * s*0.85, cy + Math.sin(a) * s*0.85);
    ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
    ctx.stroke();
  }
  // Central pin.
  ctx.fillStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  ctx.beginPath(); ctx.arc(cx, cy, s*0.1, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawOrnament_fortifiedTower(ctx, cx, cy, P, s) {
  // Torre con almenas + puerta.
  ctx.save();
  ctx.fillStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  // Cuerpo principal.
  ctx.fillRect(cx - s*0.6, cy - s*0.5, s*1.2, s*1.3);
  // Almenas (3 dientes).
  ctx.fillRect(cx - s*0.6, cy - s*0.8, s*0.3, s*0.3);
  ctx.fillRect(cx - s*0.15, cy - s*0.8, s*0.3, s*0.3);
  ctx.fillRect(cx + s*0.3, cy - s*0.8, s*0.3, s*0.3);
  // Puerta arqueada.
  ctx.fillStyle = rgbStr(P.BG);
  ctx.beginPath();
  ctx.moveTo(cx - s*0.2, cy + s*0.8);
  ctx.lineTo(cx - s*0.2, cy + s*0.1);
  ctx.quadraticCurveTo(cx, cy - s*0.1, cx + s*0.2, cy + s*0.1);
  ctx.lineTo(cx + s*0.2, cy + s*0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOrnament_invertedStar(ctx, cx, cy, P, s) {
  // Pentáculo invertido con centro ámbar.
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT || P.INFERNAL);
  ctx.lineWidth = 1.5;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i / 5) * Math.PI * 2;  // invertido (punta abajo)
    pts.push({ x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s });
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[4].x, pts[4].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.stroke();
  // Centro ámbar.
  ctx.fillStyle = rgbStr(P.INFERNAL || P.ACCENT);
  ctx.beginPath(); ctx.arc(cx, cy, s*0.18, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawOrnament_flyCross(ctx, cx, cy, P, s) {
  // Black Grail: cruz con alas de mosca + ojo verde.
  ctx.save();
  // Cruz simple.
  ctx.fillStyle = rgbStr(P.ACCENT_DK || P.ACCENT);
  const t = s * 0.2;
  ctx.fillRect(cx - t/2, cy - s*0.8, t, s*1.6);
  ctx.fillRect(cx - s*0.5, cy - t/2, s, t);
  // Alas de mosca (4 elipses radiales).
  ctx.fillStyle = rgbStr(P.PLAGUE || P.ACCENT);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, s*0.35, s*0.15, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  // Ojo verde central.
  ctx.fillStyle = rgbStr(P.PLAGUE_DK || [108,112,24]);
  ctx.beginPath(); ctx.arc(cx, cy, s*0.18, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawOrnament_sevenHeadedSerpent(ctx, cx, cy, P, s) {
  // The Court: corona de 7 puntas + gema central.
  ctx.save();
  ctx.fillStyle = rgbStr(P.CROWN_GOLD || P.ACCENT);
  // 7 puntas radiales.
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 7) * Math.PI * 2;
    const x = cx + Math.cos(a) * s;
    const y = cy + Math.sin(a) * s;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    // Punta intermedia hacia el centro entre puntas.
    const a2 = a + Math.PI / 7;
    ctx.lineTo(cx + Math.cos(a2) * s*0.4, cy + Math.sin(a2) * s*0.4);
  }
  ctx.closePath();
  ctx.fill();
  // Gema central.
  ctx.fillStyle = rgbStr(P.VARIANT);
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Iron rim.
  ctx.strokeStyle = rgbStr(P.IRON || P.FRAME_DARK);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// Roadmap fix — 3 ornamentos para variantes con reglas pero sin paleta.

function drawOrnament_redStarHammer(ctx, cx, cy, P, s) {
  // Red Brigade: estrella roja de 5 puntas + hoz cruzada (Soviet grimdark).
  ctx.save();
  // Estrella 5 puntas.
  ctx.fillStyle = rgbStr(P.VARIANT || [180,32,32]);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = (i % 2 === 0) ? s : s * 0.42;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // Borde oscuro.
  ctx.strokeStyle = rgbStr(P.VARIANT_DK || P.FRAME_DARK);
  ctx.lineWidth = 1;
  ctx.stroke();
  // Hoz dorada cruzada (arco simple).
  ctx.strokeStyle = rgbStr(P.ACCENT || [210,170,70]);
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.35, Math.PI * 0.15, Math.PI * 0.95);
  ctx.stroke();
  ctx.restore();
}

function drawOrnament_plagueBanner(ctx, cx, cy, P, s) {
  // Great Hegemon: pendón fúnebre + campana plague.
  ctx.save();
  // Asta vertical.
  ctx.fillStyle = rgbStr(P.FRAME_DARK || [14,16,8]);
  const t = Math.max(1.5, s * 0.1);
  ctx.fillRect(cx - t/2, cy - s, t, s * 1.8);
  // Pendón rectangular sesgado.
  ctx.fillStyle = rgbStr(P.PLAGUE || P.VARIANT);
  ctx.beginPath();
  ctx.moveTo(cx + t/2, cy - s * 0.85);
  ctx.lineTo(cx + s * 0.8, cy - s * 0.85);
  ctx.lineTo(cx + s * 0.65, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.8, cy - s * 0.05);
  ctx.lineTo(cx + t/2, cy - s * 0.05);
  ctx.closePath();
  ctx.fill();
  // Cruz pequeña en pendón.
  ctx.fillStyle = rgbStr(P.FRAME_DARK || [14,16,8]);
  const cc = cx + s * 0.4, cv = cy - s * 0.45;
  ctx.fillRect(cc - s*0.04, cv - s*0.2, s*0.08, s*0.4);
  ctx.fillRect(cc - s*0.16, cv - s*0.04, s*0.32, s*0.08);
  // Campana plague colgando.
  ctx.fillStyle = rgbStr(P.ACCENT_DK || [110,98,42]);
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.55, s * 0.22, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOrnament_thornCrown(ctx, cx, cy, P, s) {
  // Sacred Affliction: corona de espinas + 3 gotas de sangre.
  ctx.save();
  ctx.strokeStyle = rgbStr(P.FRAME_DARK || [32,10,10]);
  ctx.lineWidth = Math.max(1.5, s * 0.1);
  // Anillo central.
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  // 12 espinas radiales.
  const espinas = 12;
  for (let i = 0; i < espinas; i++) {
    const a = (i / espinas) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * s * 0.55;
    const y1 = cy + Math.sin(a) * s * 0.55;
    const x2 = cx + Math.cos(a) * s * 0.95;
    const y2 = cy + Math.sin(a) * s * 0.95;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // 3 gotas de sangre (Trinidad del dolor).
  ctx.fillStyle = rgbStr(P.VARIANT || [148,30,30]);
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
    const gx = cx + Math.cos(a) * s * 0.35;
    const gy = cy + Math.sin(a) * s * 0.35;
    ctx.beginPath();
    ctx.arc(gx, gy, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawOrnament_orthodoxCross(ctx, cx, cy, P, s) {
  // St Methodius: cruz ortodoxa de 3 brazos (Patriarcal).
  ctx.save();
  ctx.fillStyle = rgbStr(P.ACCENT || [208,170,68]);
  const t = Math.max(2, s * 0.16);
  // Vertical.
  ctx.fillRect(cx - t/2, cy - s * 0.95, t, s * 1.9);
  // Brazo superior (corto).
  ctx.fillRect(cx - s * 0.32, cy - s * 0.65, s * 0.64, t);
  // Brazo central (largo).
  ctx.fillRect(cx - s * 0.55, cy - s * 0.05, s * 1.1, t);
  // Brazo inferior inclinado (Stauros).
  ctx.save();
  ctx.translate(cx, cy + s * 0.45);
  ctx.rotate(-Math.PI / 9);
  ctx.fillRect(-s * 0.42, -t/2, s * 0.84, t);
  ctx.restore();
  // Halo dorado tras la cruz.
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || [160,128,48]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.45, s * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawOrnament_lambSkull(ctx, cx, cy, P, s) {
  // Tenth Plague: cráneo del cordero sacrificial con cuernos curvos.
  ctx.save();
  // Cráneo (óvalo).
  ctx.fillStyle = rgbStr(P.BG || [238,228,198]);
  ctx.strokeStyle = rgbStr(P.FRAME_DARK || [38,24,18]);
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.55, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Cuernos curvos (espirales simples).
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || [132,102,55]);
  ctx.lineWidth = Math.max(2, s * 0.12);
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sign * s * 0.5, cy - s * 0.4);
    ctx.quadraticCurveTo(cx + sign * s * 1.1, cy - s * 0.1,
                         cx + sign * s * 0.85, cy + s * 0.4);
    ctx.stroke();
  }
  // Ojos huecos + boca alargada.
  ctx.fillStyle = rgbStr(P.FRAME_DARK || [38,24,18]);
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.18, cy - s * 0.08, s * 0.1, s * 0.14, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + s * 0.18, cy - s * 0.08, s * 0.1, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - s * 0.12, cy + s * 0.28, s * 0.24, s * 0.06);
  // Mancha de sangre.
  ctx.fillStyle = rgbStr(P.VARIANT || [128,38,32]);
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.5, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrnament_ghostMask(ctx, cx, cy, P, s) {
  // Trench Ghosts: máscara fantasmal de hocico alargado tipo plague mask.
  ctx.save();
  // Máscara base alargada.
  ctx.fillStyle = rgbStr(P.ACCENT || [148,148,138]);
  ctx.strokeStyle = rgbStr(P.FRAME_DARK || [22,28,28]);
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.95);
  ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.4, cx + s * 0.4, cy + s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.25, cy + s * 0.85, cx, cy + s * 0.95);
  ctx.quadraticCurveTo(cx - s * 0.25, cy + s * 0.85, cx - s * 0.4, cy + s * 0.1);
  ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.4, cx, cy - s * 0.95);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Ojos verdes fosforescentes.
  ctx.fillStyle = rgbStr(P.VARIANT || [88,162,118]);
  ctx.beginPath();
  ctx.arc(cx - s * 0.16, cy - s * 0.25, s * 0.14, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.16, cy - s * 0.25, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
  // Bulto del pico inferior.
  ctx.strokeStyle = rgbStr(P.FRAME_DARK || [22,28,28]);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawOrnament_coinStack(ctx, cx, cy, P, s) {
  // Avarice Knights: pila de 3 monedas + espada cruzando vertical detrás.
  ctx.save();
  // Espada vertical detrás (mango + hoja).
  ctx.fillStyle = rgbStr(P.FRAME_DARK || [6,4,2]);
  const t = Math.max(2, s * 0.12);
  ctx.fillRect(cx - t/2, cy - s * 0.95, t, s * 1.9);
  // Guarda.
  ctx.fillRect(cx - s * 0.3, cy + s * 0.2, s * 0.6, t);
  // 3 monedas apiladas.
  ctx.fillStyle = rgbStr(P.ACCENT || [225,178,52]);
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || [180,138,32]);
  ctx.lineWidth = Math.max(1, s * 0.06);
  for (let i = 0; i < 3; i++) {
    const y = cy + s * 0.5 - i * s * 0.25;
    ctx.beginPath();
    ctx.ellipse(cx, y, s * 0.55, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  // Símbolo M (Mammón) en moneda superior.
  ctx.fillStyle = rgbStr(P.FRAME_DARK || [6,4,2]);
  ctx.font = 'bold ' + (s * 0.28) + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', cx, cy + 0);
  ctx.restore();
}

function drawOrnament_anchorSkull(ctx, cx, cy, P, s) {
  // Naval Raiders: ancla naval + calavera sobre la cruceta.
  ctx.save();
  ctx.strokeStyle = rgbStr(P.ACCENT_DK || [108,82,52]);
  ctx.lineWidth = Math.max(2, s * 0.12);
  // Asta vertical del ancla.
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.3);
  ctx.lineTo(cx, cy + s * 0.85);
  ctx.stroke();
  // Cruceta superior.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.3);
  ctx.stroke();
  // Arco inferior del ancla (semi-círculo).
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.45, s * 0.55, 0.15, Math.PI - 0.15);
  ctx.stroke();
  // Brazos curvos del ancla.
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.55, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.7, cy + s * 0.3);
  ctx.moveTo(cx + s * 0.55, cy + s * 0.45);
  ctx.lineTo(cx + s * 0.7, cy + s * 0.3);
  ctx.stroke();
  // Calavera encima.
  ctx.fillStyle = rgbStr(P.BG || [222,212,192]);
  ctx.strokeStyle = rgbStr(P.FRAME_DARK || [10,16,30]);
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.6, s * 0.32, s * 0.36, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Cuencas.
  ctx.fillStyle = rgbStr(P.FRAME_DARK || [10,16,30]);
  ctx.beginPath();
  ctx.arc(cx - s * 0.1, cy - s * 0.62, s * 0.07, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.1, cy - s * 0.62, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrnament_gluttonyMaw(ctx, cx, cy, P, s) {
  // Great Hunger: fauces dentadas circulares (boca devoradora del Antipope).
  ctx.save();
  // Boca circular roja.
  ctx.fillStyle = rgbStr(P.VARIANT_DK || [105,18,28]);
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.85, 0, Math.PI * 2);
  ctx.fill();
  // Borde rojo más claro (labio).
  ctx.strokeStyle = rgbStr(P.VARIANT || [152,28,40]);
  ctx.lineWidth = Math.max(1.5, s * 0.1);
  ctx.stroke();
  // Dientes triangulares (12) hacia el centro.
  ctx.fillStyle = rgbStr(P.ACCENT || [182,150,82]);
  const dientes = 12;
  for (let i = 0; i < dientes; i++) {
    const a = (i / dientes) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * s * 0.85;
    const y1 = cy + Math.sin(a) * s * 0.85;
    const a2 = a + Math.PI / dientes * 0.7;
    const x2 = cx + Math.cos(a2) * s * 0.85;
    const y2 = cy + Math.sin(a2) * s * 0.85;
    const xt = cx + Math.cos(a + Math.PI/dientes*0.35) * s * 0.45;
    const yt = cy + Math.sin(a + Math.PI/dientes*0.35) * s * 0.45;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(xt, yt);
    ctx.closePath();
    ctx.fill();
  }
  // Punto negro central (garganta).
  ctx.fillStyle = rgbStr(P.FRAME_DARK || [12,6,6]);
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const ORNAMENT_FUNCTIONS = {
  'papal_cross':           drawOrnament_papalCross,
  'crossed_keys':          drawOrnament_crossedKeys,
  'thistle':               drawOrnament_thistle,
  'prussian_eagle':        drawOrnament_prussianEagle,
  'irish_harp':            drawOrnament_irishHarp,
  'lion_of_judah':         drawOrnament_lionOfJudah,
  'iron_cross_rough':      drawOrnament_ironCrossRough,
  'crescent':              drawOrnament_crescent,
  'jambiya':               drawOrnament_jambiya,
  'astrolabe':             drawOrnament_astrolabe,
  'fortified_tower':       drawOrnament_fortifiedTower,
  'inverted_star':         drawOrnament_invertedStar,
  'fly_cross':             drawOrnament_flyCross,
  'seven_headed_serpent':  drawOrnament_sevenHeadedSerpent,
  'red_star_hammer':       drawOrnament_redStarHammer,
  'plague_banner':         drawOrnament_plagueBanner,
  'gluttony_maw':          drawOrnament_gluttonyMaw,
  'thorn_crown':           drawOrnament_thornCrown,
  'orthodox_cross':        drawOrnament_orthodoxCross,
  'lamb_skull':            drawOrnament_lambSkull,
  'ghost_mask':            drawOrnament_ghostMask,
  'coin_stack':            drawOrnament_coinStack,
  'anchor_skull':          drawOrnament_anchorSkull,
};

function drawOrnament(ctx, cx, cy, palette, size) {
  size = size || 22;
  // Acepta UPPER (SPEC v2) y lower (back-compat).
  const k = (palette && (palette.ORNAMENT || palette.ornament)) || 'papal_cross';
  const fn = ORNAMENT_FUNCTIONS[k] || drawOrnament_papalCross;
  return fn(ctx, cx, cy, palette || {}, size);
}

function drawCardPlaceholder(ctx, x0, y0, w, h, img, palette) {
  // Watermark WWI dominio público. Zona reservada inferior (último tercio
  // ~250px en card 1039) — todo texto se pinta encima (z-order garantiza
  // "tras NARRATIVE" del CATALOGO).
  // Skip silencioso si img null o no cargada (preload no completado).
  if (!ctx || !img || !img.complete || !img.naturalWidth) return;
  ctx.save();
  // Zona reservada: tercio inferior excluyendo bordes.
  const zoneY = y0 + Math.floor(h * 0.72);          // ~y0+748 en CARD_H=1039
  const zoneH = Math.floor(h * 0.25);               // ~260px
  const zoneX = x0 + 25;
  const zoneW = w - 50;
  // Clip a la zona — evita pintar fuera del marco interior.
  ctx.beginPath();
  ctx.rect(zoneX, zoneY, zoneW, zoneH);
  ctx.clip();
  // Cover-fit: la imagen llena toda la zona, recortando exceso.
  const scale = Math.max(zoneW / img.naturalWidth, zoneH / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const dx = zoneX + (zoneW - drawW) / 2;
  const dy = zoneY + (zoneH - drawH) / 2;
  ctx.globalAlpha = 0.18;
  // grayscale+sepia subtle — atmósfera WWI, no domina sobre tinta facción.
  if (typeof ctx.filter !== 'undefined') ctx.filter = 'grayscale(100%) sepia(15%)';
  ctx.drawImage(img, dx, dy, drawW, drawH);
  // Overlay tinta facción multiply (sutil).
  if (palette && Array.isArray(palette.FRAME)) {
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = rgbStr(palette.FRAME);
    ctx.fillRect(zoneX, zoneY, zoneW, zoneH);
  }
  ctx.restore();
}

function drawCardOnCanvas(ctx, x0, y0, w, h, data) {
  if (!ctx || !data || !data.palette) return;
  const p = data.palette;
  // SPEC v2 — colores SECTION_COLOR/STAT_HEADER_COLOR/NARRATIVE_COLOR
  // se usan si están definidos; null → fallback al FRAME/MUTED.
  const sectionColor = p.SECTION_COLOR || p.FRAME;
  const statHeader = p.STAT_HEADER_COLOR || p.FRAME;
  const narrativeColor = p.NARRATIVE_COLOR || p.MUTED;

  // 1) Background + doble marco grimdark.
  ctx.fillStyle = rgbStr(p.BG);
  ctx.fillRect(x0, y0, w, h);
  // 1.5) Placeholder watermark tras NARRATIVE (z-order: bajo todo el texto).
  drawCardPlaceholder(ctx, x0, y0, w, h, data.placeholderImg, p);
  ctx.strokeStyle = rgbStr(p.FRAME);
  ctx.lineWidth = 8;
  ctx.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
  ctx.strokeStyle = rgbStr(p.ACCENT);
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 16, y0 + 16, w - 32, h - 32);

  // 2) Ornamentos esquineros 4×.
  drawOrnament(ctx, x0 + 30, y0 + 30, p, 12);
  drawOrnament(ctx, x0 + w - 30, y0 + 30, p, 12);
  drawOrnament(ctx, x0 + 30, y0 + h - 30, p, 12);
  drawOrnament(ctx, x0 + w - 30, y0 + h - 30, p, 12);

  // 3) Texto faccional arriba/abajo.
  drawTextCentered(ctx, data.factionTop, x0 + w / 2, y0 + 26,
                   '14px monospace', rgbStr(p.MUTED));
  drawTextCentered(ctx, data.factionBot, x0 + w / 2, y0 + h - 26,
                   '12px monospace', rgbStr(p.MUTED));

  // 4) Cabecera: nombre + rol + coste.
  let cy = y0 + 70;
  drawTextCentered(ctx, data.nameL1, x0 + w / 2, cy, 'bold 36px serif', rgbStr(p.FRAME_DARK || p.FRAME));
  if (data.nameL2) { cy += 38; drawTextCentered(ctx, data.nameL2, x0 + w / 2, cy, 'bold 32px serif', rgbStr(p.FRAME_DARK || p.FRAME)); }
  if (data.role) {
    cy += 30;
    drawTextCentered(ctx, data.role, x0 + w / 2, cy, 'italic 18px serif', rgbStr(p.MUTED));
  }
  ctx.fillStyle = rgbStr(p.ACCENT);
  ctx.fillRect(x0 + w / 2 - 60, cy + 20, 120, 50);
  drawTextCentered(ctx, String(data.cost), x0 + w / 2, cy + 38, 'bold 28px serif', rgbStr(p.TEXT));
  drawTextCentered(ctx, 'ducados', x0 + w / 2, cy + 60, '11px serif', rgbStr(p.TEXT));

  // 5) Tira de stats. Header usa STAT_HEADER_COLOR si lo define la variante.
  let sy = cy + 95;
  const statW = (w - 80) / Math.max(data.stats.length, 1);
  for (let i = 0; i < data.stats.length; i++) {
    const sx = x0 + 40 + i * statW;
    ctx.fillStyle = rgbStr(statHeader);
    ctx.fillRect(sx, sy, statW - 4, 24);
    drawTextCentered(ctx, data.stats[i].label, sx + statW / 2 - 2, sy + 12, 'bold 14px monospace', rgbStr(p.BG));
    ctx.fillStyle = rgbStr(p.STAT_BG);
    ctx.fillRect(sx, sy + 24, statW - 4, 40);
    drawTextCentered(ctx, data.stats[i].value, sx + statW / 2 - 2, sy + 44, 'bold 22px monospace', rgbStr(p.TEXT));
  }
  sy += 80;

  // 6) EQUIPO — armas (perfil completo: manos/rango/keywords) + battlekit.
  drawTextLeft(ctx, 'EQUIPO', x0 + 30, sy, 'bold 14px serif', rgbStr(sectionColor));
  sy += 18;
  ctx.strokeStyle = rgbStr(p.MUTED); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0 + 30, sy); ctx.lineTo(x0 + w - 30, sy); ctx.stroke();
  sy += 8;
  // Armas con perfil completo. Intenta 1 línea (nombre+manos+rango+keywords)
  // si cabe en ancho de tarjeta; sino, fallback a 3 líneas multi.
  const maxWeaponWidth = w - 70;  // ancho útil
  for (const wpn of (data.weapons || []).slice(0, 4)) {
    const handStr = wpn.hand ? ' [' + wpn.hand + ']' : '';
    const rangeStr = (wpn.range && wpn.range !== '—') ? wpn.range : '';
    const kwStr = (wpn.keyword || '').trim();
    // Línea única candidata: "⚔ Name [1H] · 12" · CRITICAL · HEAVY"
    const parts = ['⚔ ' + wpn.name + handStr];
    if (rangeStr) parts.push(rangeStr);
    if (kwStr) parts.push(kwStr);
    const singleLine = parts.join('  ·  ');
    ctx.save();
    ctx.font = '12px serif';
    const singleW = ctx.measureText(singleLine).width;
    ctx.restore();
    if (singleW <= maxWeaponWidth) {
      // 1 línea: cabe entero.
      drawTextLeft(ctx, singleLine, x0 + 36, sy, '12px serif', rgbStr(p.TEXT));
      sy += 18;
    } else {
      // Fallback multi-línea: nombre+manos arriba, perfil+keywords debajo.
      drawTextLeft(ctx, '⚔ ' + wpn.name + handStr, x0 + 36, sy, 'bold 12px serif', rgbStr(p.TEXT));
      sy += 13;
      const stats = rangeStr +
                    (wpn.dice && wpn.dice !== '—' ? '  ·  ' + wpn.dice + 'D' : '') +
                    (wpn.injury && wpn.injury !== '—' ? '  ·  I' + wpn.injury : '');
      if (stats.trim()) {
        drawTextLeft(ctx, stats, x0 + 48, sy, '10px monospace', rgbStr(p.MUTED));
        sy += 12;
      }
      if (kwStr) {
        let kw = kwStr.length > 80 ? kwStr.slice(0, 79) + '…' : kwStr;
        drawTextLeft(ctx, kw, x0 + 48, sy, '9px serif', rgbStr(p.MUTED));
        sy += 11;
      }
      sy += 3;
    }
  }
  // Battlekit (gear no-arma) bajo armas.
  for (const b of (data.battlekit || []).slice(0, 6)) {
    drawTextLeft(ctx, '◆ ' + (b.name || ''), x0 + 36, sy, '12px serif', rgbStr(p.TEXT));
    if (b.type) drawTextLeft(ctx, b.type, x0 + w - 200, sy, 'italic 11px serif', rgbStr(p.MUTED));
    sy += 17;
  }
  sy = Math.max(sy + 8, y0 + 520);

  // 7) REGLAS & HABILIDADES.
  drawTextLeft(ctx, 'REGLAS & HABILIDADES', x0 + 30, sy, 'bold 14px serif', rgbStr(sectionColor));
  sy += 18;
  ctx.beginPath(); ctx.moveTo(x0 + 30, sy); ctx.lineTo(x0 + w - 30, sy); ctx.stroke();
  sy += 10;
  const abList = data.abilities || [];
  const nameFont = abList.length >= 8 ? 'bold 10px serif'
                 : abList.length >= 6 ? 'bold 11px serif'
                                       : 'bold 12px serif';
  const descFont = abList.length >= 6 ? '9px serif' : '10px serif';
  if (abList.length === 0) {
    drawTextLeft(ctx, '— Sin habilidades especiales —', x0 + 36, sy, 'italic 12px serif', rgbStr(p.MUTED));
    sy += 18;
  } else {
    const maxDescChars = 110;
    // Regla: desc siempre, excepto:
    //   · NEGATE (X) — autoexplicativos
    //   · factionTags (SULTANATE, HERETIC) — type='factionTag' en library
    //   · tiers (ELITE, TROOPS, MERCENARY) — type='tier' en library
    // Variant rules (Siege Jezzail Teams, Bagpipes, etc) SÍ muestran desc.
    const shouldShowDesc = (a) => {
      if (!a.desc || !a.desc.trim()) return false;
      if (/^NEGATE\b/i.test(a.name || '')) return false;
      if (typeof ABILITY_LIBRARY !== 'undefined') {
        const entry = ABILITY_LIBRARY[a.name];
        if (entry && (entry.type === 'factionTag' || entry.type === 'tier')) return false;
      }
      return true;
    };
    // Reorden: items con desc visible primero, sin desc al final.
    // Marcos: "Mueve todas las palabras sin descripción al final, para
    // que sea más fácil de buscar".
    const sortedList = abList.slice().sort((a, b) => {
      const ad = shouldShowDesc(a) ? 0 : 1;
      const bd = shouldShowDesc(b) ? 0 : 1;
      return ad - bd;
    });
    for (const a of sortedList.slice(0, 12)) {
      drawTextLeft(ctx, '▸ ' + (a.name || ''), x0 + 36, sy, nameFont, rgbStr(p.TEXT));
      if (shouldShowDesc(a)) {
        let d = a.desc.trim();
        if (d.length > maxDescChars) d = d.slice(0, maxDescChars - 1) + '…';
        drawTextLeft(ctx, d, x0 + 48, sy + 12, descFont, rgbStr(p.MUTED));
        sy += abList.length >= 6 ? 26 : 30;
      } else {
        sy += abList.length >= 8 ? 14 : 16;
      }
    }
  }
  sy = Math.max(sy + 8, y0 + 780);

  // (BATTLEKIT unificado dentro de EQUIPO arriba — sección eliminada.)
  // (Bloque PROGRESIÓN — PE bar + Avances/Cicatrices/Récord — eliminado
  //  por petición Marcos: tarjetas más limpias, sin tracking ingame.)

  // 11) Cita narrativa — NARRATIVE_COLOR si definido.
  if (data.narrative) {
    const cite = data.narrative.length > 60 ? data.narrative.slice(0, 57) + '...' : data.narrative;
    drawTextCentered(ctx, '« ' + cite + ' »', x0 + w / 2, y0 + h - 50, 'italic 11px serif', rgbStr(narrativeColor));
  }
}

function renderCardCanvas(model, wb) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const data = buildModelCardData(model, wb);
  drawCardOnCanvas(ctx, 0, 0, CARD_W, CARD_H, data);
  return canvas.toDataURL('image/png');
}

/* Battletracker — panel derecho con zonas de tracking.
 * Spec: SPEC-tarjetas-battletrackers.md sección "Battletracker".
 * Layout: tarjeta a la izquierda (centrada vertical) + panel a la derecha.
 */
function drawTrackerSlot(ctx, cx, cy, r, label, palette, filled) {
  ctx.save();
  ctx.fillStyle = rgbStr(filled ? palette.PROGRESS : palette.SLOT_BG);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgbStr(palette.SLOT_SHADOW);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (label) {
    drawTextCentered(ctx, label, cx, cy + r + 14, '11px monospace', rgbStr(palette.MUTED));
  }
  ctx.restore();
}

function drawTrackerPanelOnCanvas(ctx, x0, y0, w, h, data) {
  if (!ctx || !data || !data.palette) return;
  const p = data.palette;
  const sectionColor = p.SECTION_COLOR || p.FRAME;

  // Fondo panel.
  ctx.fillStyle = rgbStr(p.PANEL_BG);
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = rgbStr(p.FRAME); ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);

  let sy = y0 + 40;
  const sxLeft = x0 + 30;

  // 1) ESTADO: 3 slots circulares (ACTIVO / DOWN / OoA).
  drawTextLeft(ctx, 'ESTADO', sxLeft, sy, 'bold 14px serif', rgbStr(sectionColor));
  sy += 30;
  const stateLabels = ['ACTIVO', 'DOWN', 'OoA'];
  for (let i = 0; i < 3; i++) {
    drawTrackerSlot(ctx, sxLeft + 40 + i * 100, sy, 24, stateLabels[i], p, false);
  }
  sy += 80;

  // 2) BLOOD, BLESSING e INFECTION MARKERS: 7 slots horizontales 0-6 cada uno.
  for (const title of ['BLOOD MARKERS', 'BLESSING MARKERS', 'INFECTION MARKERS']) {
    drawTextLeft(ctx, title, sxLeft, sy, 'bold 14px serif', rgbStr(sectionColor));
    sy += 30;
    for (let i = 0; i < 7; i++) {
      drawTrackerSlot(ctx, sxLeft + 30 + i * 60, sy, 18, String(i), p, false);
    }
    sy += 80;
  }

  // 3) HABILIDADES (1 uso): rejilla 3×2 = 6 slots.
  drawTextLeft(ctx, 'HABILIDADES (1 uso)', sxLeft, sy, 'bold 14px serif', rgbStr(sectionColor));
  sy += 30;
  const oneShot = (data.oneShotAbilities || []).slice(0, 6);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const cx = sxLeft + 40 + col * 130;
      const cy = sy + row * 70;
      const lbl = oneShot[idx] ? oneShot[idx].name.slice(0, 14) : '—';
      drawTrackerSlot(ctx, cx, cy, 22, lbl, p, false);
    }
  }
  sy += 160;

  // 4) MAESTRO DE ELEMENTOS (condicional).
  if (data.hasElementalMastery) {
    drawTextLeft(ctx, 'MAESTRO DE ELEMENTOS', sxLeft, sy, 'bold 14px serif', rgbStr(sectionColor));
    sy += 30;
    const elements = ['FIRE', 'GAS', 'SHRAPNEL'];
    for (let i = 0; i < 3; i++) {
      drawTrackerSlot(ctx, sxLeft + 40 + i * 110, sy, 22, elements[i], p, false);
    }
    sy += 80;
  }

  // 5) EFECTOS: los mismos chips que el modo mesa para este modelo, 3 por fila
  //    (los elementos ya van en su bloque).
  drawTextLeft(ctx, 'EFECTOS', sxLeft, sy, 'bold 14px serif', rgbStr(sectionColor));
  sy += 30;
  const efx = getTableEffectCodes(Object.assign({}, data, { hasElementalMastery: false }));
  efx.forEach((code, idx) => {
    drawTrackerSlot(ctx, sxLeft + 40 + (idx % 3) * 130, sy + Math.floor(idx / 3) * 70, 22, code, p, false);
  });
}

/* ─── MODO MESA — sesión de partida en el móvil ─────────────────────
 * PLAN: tracking/plans/PLAN_2026-09-25_modo-mesa.md.
 * Estado solo de la partida, en localStorage['wf-mesa-<wb.id>']. Nunca
 * se escribe en la banda (no afecta a guardado, historial ni export TC).
 * Funciones puras: mutan la sesión recibida y la devuelven.
 */
const TABLE_SESSION_VERSION = 1;
const TABLE_STATUSES = ['up', 'down', 'out'];
// Recordatorios del battletracker PDF. BLESSING e INFECTION MARKERS no son
// chips: son contadores 0-6 como los BLOOD MARKERS (Rulebook / Warbands 1.0.2).
const TABLE_EFFECTS_BASE = ['AIM', 'MEM', 'FEAR', 'CHARGED', 'OTRO'];
const TABLE_EFFECTS_ELEMENTAL = ['FIRE', 'GAS', 'SHRAPNEL'];

function _defaultTableModelState() {
  return { activated: false, blood: 0, blessing: 0, infection: 0, spread: false,
           status: 'up', effects: [], spent: [] };
}

function newTableSession(wb) {
  const s = {
    v: TABLE_SESSION_VERSION,
    warbandId: wb && wb.id,
    startedAt: new Date().toISOString(),
    turn: 1,
    models: {},
  };
  return syncTableSession(s, wb);
}

// Añade estado limpio para modelos nuevos. Los que ya no están en la banda
// se conservan (por si vuelven) y simplemente no se muestran.
function syncTableSession(session, wb) {
  const models = (wb && Array.isArray(wb.models)) ? wb.models : [];
  for (const m of models) {
    if (m && m.uid && !session.models[m.uid]) session.models[m.uid] = _defaultTableModelState();
  }
  // Sesiones anteriores: contadores nuevos y el chip BLES pasa a 1 BLESSING MARKER.
  for (const st of Object.values(session.models)) {
    if (typeof st.blessing !== 'number') st.blessing = 0;
    if (typeof st.infection !== 'number') st.infection = 0;
    if (Array.isArray(st.effects) && st.effects.includes('BLES')) {
      st.effects = st.effects.filter(e => e !== 'BLES');
      st.blessing = Math.max(st.blessing, 1);
    }
  }
  return session;
}

function getTableModelState(session, uid) {
  return (session && session.models && session.models[uid]) || _defaultTableModelState();
}

function _tableModel(session, uid) {
  if (!session.models[uid]) session.models[uid] = _defaultTableModelState();
  return session.models[uid];
}

// The Infection Spreads (Warbands 1.0.2): al activarse con INFECTION
// MARKERS, recibe 1 más antes de sus ACTIONS. Desmarcar la activación lo deshace.
function toggleTableActivated(session, uid) {
  const st = _tableModel(session, uid);
  st.activated = !st.activated;
  if (st.activated) {
    st.spread = (st.infection || 0) > 0 && st.infection < TABLE_MAX_MARKERS;
    if (st.spread) st.infection += 1;
  } else if (st.spread) {
    st.infection = Math.max(0, (st.infection || 0) - 1);
    st.spread = false;
  }
  return session;
}

// Rulebook: un modelo no puede tener más de 6 BLOOD MARKERS.
const TABLE_MAX_BLOOD = 6;

function setTableBlood(session, uid, n) {
  const st = _tableModel(session, uid);
  st.blood = Math.min(TABLE_MAX_BLOOD, Math.max(0, Math.round(Number(n) || 0)));
  return session;
}

// Máximo 6 BLESSING MARKERS (Rulebook) y 6 INFECTION MARKERS (Warbands).
const TABLE_MAX_MARKERS = 6;
function _clampMarkers(n) {
  return Math.min(TABLE_MAX_MARKERS, Math.max(0, Math.round(Number(n) || 0)));
}
function setTableBlessing(session, uid, n) {
  _tableModel(session, uid).blessing = _clampMarkers(n);
  return session;
}
function setTableInfection(session, uid, n) {
  const st = _tableModel(session, uid);
  st.infection = _clampMarkers(n);
  st.spread = false;
  return session;
}

function adjustTableBlood(session, uid, delta) {
  const st = _tableModel(session, uid);
  return setTableBlood(session, uid, (st.blood || 0) + (Number(delta) || 0));
}

function setTableStatus(session, uid, status) {
  if (!TABLE_STATUSES.includes(status)) return session;
  _tableModel(session, uid).status = status;
  return session;
}

function _toggleInList(list, value) {
  const i = list.indexOf(value);
  if (i >= 0) list.splice(i, 1); else list.push(value);
}

function toggleTableEffect(session, uid, code) {
  _toggleInList(_tableModel(session, uid).effects, code);
  return session;
}

function toggleTableSpent(session, uid, abilityName) {
  _toggleInList(_tableModel(session, uid).spent, abilityName);
  return session;
}

// Pasar turno solo desmarca activaciones: sangre, efectos y usos los retira
// el jugador a mano (cuándo se retira cada marcador depende de la regla).
function advanceTableTurn(session) {
  session.turn = (session.turn || 1) + 1;
  for (const uid of Object.keys(session.models)) {
    session.models[uid].activated = false;
    session.models[uid].spread = false;
  }
  return session;
}

// Cuenta sobre los modelos presentes en la banda que no están Fuera de combate.
function tableActivationCount(session, wb) {
  const models = (wb && Array.isArray(wb.models)) ? wb.models : [];
  let activated = 0, total = 0;
  for (const m of models) {
    const st = getTableModelState(session, m.uid);
    if (st.status === 'out') continue;
    total++;
    if (st.activated) activated++;
  }
  return { activated, total };
}

// Solo los chips que el modelo puede necesitar: AIM con Aim ACTION (Sniper
// Priest), MEM con Memento Mori (War Prophet), FEAR con Warrior's Prayer
// (FEAR hasta fin de turno). CHARGED y OTRO valen para cualquiera.
const TABLE_EFFECT_SOURCES = {
  AIM: /^Aim ACTION\b/i,
  MEM: /^Memento Mori\b/i,
  FEAR: /^Warrior'?s Prayer\b/i,
};
function getTableEffectCodes(cardData) {
  const names = ((cardData && cardData.abilities) || []).map(a => String((a && a.name) || a || ''));
  const base = TABLE_EFFECTS_BASE.filter(code =>
    !TABLE_EFFECT_SOURCES[code] || names.some(n => TABLE_EFFECT_SOURCES[code].test(n)));
  return cardData && cardData.hasElementalMastery ? base.concat(TABLE_EFFECTS_ELEMENTAL) : base;
}

function _tableSessionKey(wbOrId) {
  return 'wf-mesa-' + (typeof wbOrId === 'string' ? wbOrId : (wbOrId && wbOrId.id));
}

function _tableStorage(storage) {
  if (storage) return storage;
  try { return (typeof localStorage !== 'undefined') ? localStorage : null; } catch (e) { return null; }
}

function loadTableSession(wb, storage) {
  const st = _tableStorage(storage);
  let s = null;
  try {
    const raw = st && st.getItem(_tableSessionKey(wb));
    if (raw) s = JSON.parse(raw);
  } catch (e) { s = null; }
  if (!s || s.v !== TABLE_SESSION_VERSION || s.warbandId !== (wb && wb.id) || !s.models) {
    return newTableSession(wb);
  }
  return syncTableSession(s, wb);
}

// Devuelve false si no pudo guardar (storage bloqueado o lleno).
function saveTableSession(session, storage) {
  const st = _tableStorage(storage);
  try {
    if (!st) return false;
    st.setItem(_tableSessionKey(session.warbandId), JSON.stringify(session));
    return true;
  } catch (e) { return false; }
}

function clearTableSession(wb, storage) {
  const st = _tableStorage(storage);
  try { st && st.removeItem(_tableSessionKey(wb)); } catch (e) { /* sin storage */ }
}

/* Busca una pieza de la armería por nombre tolerando las variantes de
 * Companion: "Greatsword / Greataxe" ↔ "Great Sword/Axe" (misma cabeza
 * antes de "/"), "Medi-Kit" ↔ "Medi-kit", diacríticos, y alias explícitos.
 * Primero la armería de la facción de la banda; luego cualquier facción. */
const COMPANION_EQUIPMENT_ALIASES = {
  'anqa guard': 'Anq Guard',   // Companion "Anqa Guard"; PDF Defenders "Anq Guard"
};
function _normEquipName(n) {
  return String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9/+-]/g, '');
}
function findArmouryItemByName(wb, name) {
  const alias = COMPANION_EQUIPMENT_ALIASES[String(name || '').toLowerCase().trim()];
  const target = _normEquipName(alias || name);
  if (!target) return null;
  const head = (n) => n.split('/')[0];
  const factions = (typeof DATA !== 'undefined' && DATA.factions) ? DATA.factions : {};
  const order = [wb && wb.factionId].concat(Object.keys(factions)).filter((f, i, a) => f && factions[f] && a.indexOf(f) === i);
  const lists = [];
  for (const fid of order) lists.push(...Object.values(factions[fid].armoury || {}));
  lists.push((typeof DATA !== 'undefined' && DATA.mercenaryArmoury) || []);
  for (const pass of ['exact', 'head']) {
    for (const cat of lists) {
      for (const it of (cat || [])) {
        const n = _normEquipName(it.name);
        if (pass === 'exact' ? n === target : (head(n) && head(n) === head(target))) return it;
      }
    }
  }
  return null;
}

/* Texto de regla para una keyword/habilidad/término, desde las bibliotecas
 * de Forge (armas, keywords de modelo, habilidades, términos generales).
 * Insensible a mayúsculas; si una keyword paramétrica ("AUTOMATIC 4",
 * "BLAST 2\"") no tiene entrada exacta, cae a su base ("AUTOMATIC").
 * Sin dato → '' (mandato canon: no se inventa texto). */
function lookupRuleText(name) {
  const libs = [
    typeof WEAPON_KEYWORD_LIBRARY !== 'undefined' ? WEAPON_KEYWORD_LIBRARY : null,
    typeof KEYWORD_LIBRARY !== 'undefined' ? KEYWORD_LIBRARY : null,
    typeof ABILITY_LIBRARY !== 'undefined' ? ABILITY_LIBRARY : null,
    typeof GENERAL_TERMS_LIBRARY !== 'undefined' ? GENERAL_TERMS_LIBRARY : null,
  ].filter(Boolean);
  const textOf = (v) => (typeof v === 'string' ? v : (v && v.summary) || '');
  const find = (key) => {
    const lc = key.toLowerCase().trim();
    for (const lib of libs) {
      if (lib[key] != null) return textOf(lib[key]);
      for (const k of Object.keys(lib)) if (k.toLowerCase().trim() === lc) return textOf(lib[k]);
    }
    return '';
  };
  const raw = String(name || '').trim();
  if (!raw) return '';
  const canon = glossaryText(raw);
  if (canon) return canon;
  return find(raw) || find(raw.replace(/\s+[\d+-]+"?$/, '')) || find(raw.replace(/\s*\([^)]*\)$/, '')) || '';
}

/* Datos de consulta de la ficha del modo mesa: armas, equipo (con las
 * habilidades que concede cada pieza) y habilidades propias con texto.
 * Reutiliza buildModelCardData; enriquece desde la armería de la facción
 * (o de cualquier facción si no aparece). */
function buildTableRefData(model, wb) {
  const data = buildModelCardData(model, wb);
  const findItem = (name) => findArmouryItemByName(wb, name) || {};
  // EQUIPMENT_IMPLICIT_ABILITIES por nombre, insensible a mayúsculas (Medi-Kit/Medi-kit).
  const implicitFor = (name) => {
    if (typeof EQUIPMENT_IMPLICIT_ABILITIES === 'undefined') return [];
    const lc = String(name || '').toLowerCase().trim();
    const k = Object.keys(EQUIPMENT_IMPLICIT_ABILITIES).find(x => x.toLowerCase() === lc);
    return k ? EQUIPMENT_IMPLICIT_ABILITIES[k] : [];
  };
  const rule = (n) => ({ name: n, desc: lookupRuleText(n) });
  // Tokens de la restricción que son reglas con texto (p. ej. "Shield Combo").
  const restrictionRules = (restr) => String(restr || '').split('·').map(t => t.trim())
    .filter(t => t && lookupRuleText(t)).map(rule);
  const uniqueByName = (list) => {
    const seen = new Set();
    return list.filter(r => { const k = r.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  };

  const weapons = (data.weapons || []).map(wp => {
    const item = findItem(wp.name);
    // Companion trae type "ranged weapon": las manos salen de la armería.
    const it = String(item.type || '');
    const hand = wp.hand || (/2-?handed/i.test(it) ? '2H' : /1-?handed/i.test(it) ? '1H' : /pistol/i.test(it) ? 'Pistol' : '');
    return {
      name: wp.name, hand, type: item.type || wp.type || '',
      range: (wp.range && wp.range !== '—') ? wp.range : (item.range || '—'),
      dice: wp.dice, injury: wp.injury,
      restriction: item.restriction || '',
      rules: uniqueByName((wp.keywords || []).map(rule).concat(restrictionRules(item.restriction))),
    };
  });

  const granted = new Set();
  const equipment = (data.battlekit || []).map(bk => {
    const item = findItem(bk.name);
    const grants = implicitFor(bk.name).map(g => ({ name: g.name, desc: g.desc || lookupRuleText(g.name) }));
    grants.forEach(g => granted.add(g.name.toLowerCase()));
    const kws = Array.isArray(item.weaponKeywords) ? item.weaponKeywords : [];
    // Si la pieza concede una habilidad con el mismo nombre que una regla
    // genérica (Trench Shield → Shield Combo), manda el texto concedido.
    const grantNames = new Set(grants.map(g => g.name.toLowerCase()));
    return {
      name: bk.name, type: bk.type || item.type || '',
      restriction: item.restriction || '',
      note: item.note || '',
      rules: uniqueByName(kws.map(rule).concat(restrictionRules(item.restriction)))
        .filter(r => !grantNames.has(r.name.toLowerCase())),
      grants,
    };
  });

  const abilities = (data.abilities || [])
    .filter(a => !granted.has(String(a.name).toLowerCase()))
    .map(a => ({ name: a.name, kind: a.kind, desc: a.desc || lookupRuleText(a.name) }));

  return { weapons, equipment, abilities };
}

/* ─── MODO MESA — interfaz (overlay móvil) ──────────────────────────
 * Una ficha por miniatura en un carrusel con scroll-snap. Cada toque:
 * función pura → saveTableSession → re-render de esa ficha + cabecera +
 * puntos (sin tocar el scroll del carrusel).
 */
const TABLE_MODE = { wb: null, session: null, canSave: true };
const TABLE_STATUS_LABELS = { up: 'En pie', down: 'Down', out: 'Fuera de combate' };

function _tmPresentModels() {
  return (TABLE_MODE.wb && Array.isArray(TABLE_MODE.wb.models)) ? TABLE_MODE.wb.models : [];
}

function _tmCardHtml(model) {
  const wb = TABLE_MODE.wb;
  const data = buildModelCardData(model, wb);
  const st = getTableModelState(TABLE_MODE.session, model.uid);
  const out = st.status === 'out';
  const dis = out ? ' disabled' : '';
  const name = [data.nameL1, data.nameL2].filter(Boolean).join(' ') || model.name || '—';
  // Companion da MOV como "6/Infantry": número grande, tipo en pequeño.
  const stats = (data.stats || []).map(s => {
    const [main, ...rest] = String(s.value).split('/');
    return `<div class="tm-stat"><span class="tm-stat-lbl">${escapeHtml(s.label)}</span><span class="tm-stat-val">${escapeHtml(main)}</span>${rest.length ? `<span class="tm-stat-sub">${escapeHtml(rest.join('/'))}</span>` : ''}</div>`;
  }).join('');
  const statusBtns = ['up', 'down', 'out'].map(k =>
    `<button type="button" data-status="${k}" aria-pressed="${st.status === k}">${TABLE_STATUS_LABELS[k]}</button>`).join('');
  const effects = getTableEffectCodes(data).map(code =>
    `<button type="button" class="tm-chip tm-effect" data-effect="${code}" aria-pressed="${st.effects.includes(code)}"${dis}>${code}</button>`).join('');
  const oneShot = (data.oneShotAbilities || []).map(a =>
    `<button type="button" class="tm-chip tm-spent" data-ability="${escapeHtml(a.name)}" aria-pressed="${st.spent.includes(a.name)}"${dis}>${escapeHtml(a.name)}</button>`).join('');
  const ref = buildTableRefData(model, wb);
  const rulesHtml = (rules) => rules.length ? `<ul class="tm-rules">${rules.map(r =>
    `<li><b>${escapeHtml(r.name)}</b>${r.desc ? `<span class="tm-rule-desc"> — ${escapeHtml(r.desc)}</span>` : ''}</li>`).join('')}</ul>` : '';
  const known = (v) => v && v !== '—' && v !== '-';
  const weapons = ref.weapons.map(wp => {
    const meta = [wp.hand, known(wp.range) ? wp.range : '', known(wp.dice) ? wp.dice + ' dados' : '',
      known(wp.injury) ? 'herida ' + wp.injury : ''].filter(Boolean).join(' · ');
    return `<div class="tm-ref-item"><div class="tm-ref-title"><b>${escapeHtml(wp.name)}</b>${meta ? ` <span class="tm-ref-meta">${escapeHtml(meta)}</span>` : ''}</div>
      ${wp.restriction ? `<div class="tm-ref-restr">${escapeHtml(wp.restriction)}</div>` : ''}${rulesHtml(wp.rules)}</div>`;
  }).join('');
  const equipment = ref.equipment.map(eq =>
    `<div class="tm-ref-item"><div class="tm-ref-title"><b>${escapeHtml(eq.name)}</b>${eq.type ? ` <span class="tm-ref-meta">${escapeHtml(eq.type)}</span>` : ''}</div>
      ${eq.restriction ? `<div class="tm-ref-restr">${escapeHtml(eq.restriction)}</div>` : ''}${rulesHtml(eq.rules.concat(eq.grants))}
      ${eq.note ? `<p class="tm-ref-note">${escapeHtml(eq.note)}</p>` : ''}</div>`).join('');
  const abilities = rulesHtml(ref.abilities);
  return `<section class="tm-card${st.status === 'down' ? ' tm-down' : ''}${out ? ' tm-out' : ''}" data-uid="${escapeHtml(model.uid)}">
    <header class="tm-card-head">
      <h3 class="tm-name">${escapeHtml(name)}</h3>
      ${data.role ? `<div class="tm-role">${escapeHtml(String(data.role).replace(/[-_]/g, ' '))}</div>` : ''}
    </header>
    <div class="tm-stats">${stats}</div>
    <button type="button" class="tm-activate" aria-pressed="${st.activated}"${dis}>${st.activated ? '✓ Activado' : 'Activar'}</button>
    <div class="tm-block">
      <div class="tm-label">Estado</div>
      <div class="tm-status">${statusBtns}</div>
      <div class="tm-blood">
        <span class="tm-label">Blood markers</span>
        <div class="tm-blood-row">${Array.from({ length: TABLE_MAX_BLOOD + 1 }, (_, n) =>
          `<button type="button" class="tm-blood-btn" data-blood="${n}" aria-pressed="${st.blood === n}" aria-label="${n} blood markers"${dis}>${n}</button>`).join('')}</div>
      </div>
      <div class="tm-blood tm-blessing">
        <span class="tm-label">Blessing markers</span>
        <div class="tm-blood-row">${Array.from({ length: TABLE_MAX_MARKERS + 1 }, (_, n) =>
          `<button type="button" class="tm-blood-btn" data-blessing="${n}" aria-pressed="${(st.blessing || 0) === n}" aria-label="${n} blessing markers"${dis}>${n}</button>`).join('')}</div>
      </div>
      <div class="tm-blood tm-infection">
        <span class="tm-label">Infection markers</span>
        <div class="tm-blood-row">${Array.from({ length: TABLE_MAX_MARKERS + 1 }, (_, n) =>
          `<button type="button" class="tm-blood-btn" data-infection="${n}" aria-pressed="${(st.infection || 0) === n}" aria-label="${n} infection markers"${dis}>${n}</button>`).join('')}</div>
      </div>
    </div>
    <div class="tm-block">
      <div class="tm-label">Efectos</div>
      <div class="tm-chips">${effects}</div>
    </div>
    ${oneShot ? `<div class="tm-block"><div class="tm-label">Habilidades de un uso</div><div class="tm-chips">${oneShot}</div></div>` : ''}
    <div class="tm-ref">
      <section class="tm-ref-sec tm-ref-weapons"><div class="tm-label">Armas</div>${weapons || '<p class="tm-ref-empty">Sin armas.</p>'}</section>
      <section class="tm-ref-sec tm-ref-equipment"><div class="tm-label">Equipo</div>${equipment || '<p class="tm-ref-empty">Sin equipo.</p>'}</section>
      <section class="tm-ref-sec tm-ref-abilities"><div class="tm-label">Habilidades</div>${abilities || '<p class="tm-ref-empty">Sin habilidades.</p>'}</section>
    </div>
  </section>`;
}

function _tmRenderHeader() {
  const ov = document.getElementById('table-mode');
  const c = tableActivationCount(TABLE_MODE.session, TABLE_MODE.wb);
  ov.querySelector('.tm-turn').textContent = 'Turno ' + TABLE_MODE.session.turn;
  ov.querySelector('.tm-count').textContent = c.activated + '/' + c.total + ' activadas';
}

function _tmRenderDots() {
  const ov = document.getElementById('table-mode');
  const dots = ov.querySelector('.tm-dots');
  const current = Number(dots.dataset.current || 0);
  dots.innerHTML = _tmPresentModels().map((m, i) => {
    const st = getTableModelState(TABLE_MODE.session, m.uid);
    const cls = ['tm-dot', i === current ? 'current' : '', st.activated && st.status !== 'out' ? 'activated' : '',
      st.status === 'out' ? 'out' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-idx="${i}" aria-label="Ficha ${i + 1}"></button>`;
  }).join('');
}

function _tmRenderCard(uid) {
  const model = _tmPresentModels().find(m => m.uid === uid);
  const ov = document.getElementById('table-mode');
  const old = Array.from(ov.querySelectorAll('.tm-card')).find(c => c.dataset.uid === uid);
  if (!model || !old) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _tmCardHtml(model);
  const fresh = tmp.firstElementChild;
  fresh.scrollTop = old.scrollTop;  // no saltar arriba al tocar un control
  old.replaceWith(fresh);
}

function _tmCommit(uid) {
  TABLE_MODE.canSave = saveTableSession(TABLE_MODE.session);
  document.getElementById('tm-nostore').hidden = TABLE_MODE.canSave;
  if (uid) _tmRenderCard(uid); else _tmRenderAllCards();
  _tmRenderHeader();
  _tmRenderDots();
}

function _tmRenderAllCards() {
  const track = document.querySelector('#table-mode .tm-track');
  track.innerHTML = _tmPresentModels().map(_tmCardHtml).join('');
}

function openTableMode(wb) {
  TABLE_MODE.wb = wb;
  TABLE_MODE.session = loadTableSession(wb);
  const ov = document.getElementById('table-mode');
  ov.querySelector('.tm-band').textContent = wb.name || 'Banda';
  ov.querySelector('.tm-dots').dataset.current = '0';
  _tmCommit(null);
  ov.querySelector('.tm-track').scrollLeft = 0;
  ov.classList.add('show');
  document.body.classList.add('table-mode-open');
}

function closeTableMode() {
  document.getElementById('table-mode').classList.remove('show');
  document.body.classList.remove('table-mode-open');
}

document.getElementById('btn-table-mode')?.addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb || !Array.isArray(wb.models) || wb.models.length === 0) {
    alert('La banda no tiene modelos.');
    return;
  }
  openTableMode(wb);
});

(function wireTableMode() {
  const ov = document.getElementById('table-mode');
  if (!ov) return;
  ov.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t || t.disabled || !TABLE_MODE.session) return;
    const S = TABLE_MODE.session;
    if (t.id === 'tm-close') { closeTableMode(); return; }
    if (t.id === 'tm-next-turn') {
      if (!confirm('¿Pasar al turno ' + (S.turn + 1) + '? Se desmarcan todas las activaciones.')) return;
      advanceTableTurn(S); _tmCommit(null); return;
    }
    if (t.id === 'tm-reset') {
      if (!confirm('¿Empezar una partida nueva? Se borra todo el estado marcado.')) return;
      clearTableSession(TABLE_MODE.wb);
      TABLE_MODE.session = newTableSession(TABLE_MODE.wb);
      _tmCommit(null); return;
    }
    if (t.classList.contains('tm-dot')) {
      const cards = ov.querySelectorAll('.tm-card');
      const card = cards[Number(t.dataset.idx)];
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      return;
    }
    const card = t.closest('.tm-card');
    if (!card) return;
    const uid = card.dataset.uid;
    if (t.classList.contains('tm-activate')) toggleTableActivated(S, uid);
    else if (t.dataset.blessing != null) setTableBlessing(S, uid, Number(t.dataset.blessing));
    else if (t.dataset.infection != null) setTableInfection(S, uid, Number(t.dataset.infection));
    else if (t.classList.contains('tm-blood-btn')) setTableBlood(S, uid, Number(t.dataset.blood));
    else if (t.dataset.status) setTableStatus(S, uid, t.dataset.status);
    else if (t.classList.contains('tm-effect')) toggleTableEffect(S, uid, t.dataset.effect);
    else if (t.classList.contains('tm-spent')) toggleTableSpent(S, uid, t.dataset.ability);
    else return;
    _tmCommit(uid);
  });
  // Punto actual según la ficha visible (scroll-snap deja una centrada).
  const track = ov.querySelector && ov.querySelector('.tm-track');
  if (!track) return;
  track.addEventListener('scroll', () => {
    const w = track.clientWidth || 1;
    const idx = Math.round(track.scrollLeft / w);
    const dots = ov.querySelector('.tm-dots');
    if (String(idx) !== dots.dataset.current) {
      dots.dataset.current = String(idx);
      dots.querySelectorAll('.tm-dot').forEach((d, i) => d.classList.toggle('current', i === idx));
    }
  }, { passive: true });
})();

/* ─── PDF generation: tarjetas + battletrackers ──────────────────── */

function _drawCropMarks(doc, x, y, w, h) {
  // Marcas de corte tenues en las 4 esquinas (gris claro, 0.2pt).
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.1);
  const len = 2; // mm
  // Top-left
  doc.line(x, y, x + len, y); doc.line(x, y, x, y + len);
  // Top-right
  doc.line(x + w - len, y, x + w, y); doc.line(x + w, y, x + w, y + len);
  // Bottom-left
  doc.line(x, y + h - len, x, y + h); doc.line(x, y + h, x + len, y + h);
  // Bottom-right
  doc.line(x + w, y + h - len, x + w, y + h); doc.line(x + w - len, y + h, x + w, y + h);
}

function _drawCardsHeaderFooter(doc, wb, pageIdx, totalPages) {
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const factionLabel = (wb.factionId || '').replace(/-/g, ' ');
  doc.text('Warband Forge · ' + (wb.name || 'Banda') + ' · ' + factionLabel,
           105, 8, { align: 'center' });
  doc.text('Recortar por las líneas guía con cúter o guillotina · Página ' +
           (pageIdx + 1) + '/' + totalPages,
           105, 292, { align: 'center' });
}

/* Rejilla de tarjetas en A4 portrait. '3x3' = 9 por folio a tamaño carta
 * Magic (63×88 mm); '2x2' = 4 por folio a ×1,5 (94,5×132 mm), misma
 * proporción. Cualquier otro valor cae a '3x3'. */
function getCardsPdfLayout(layout) {
  const big = layout === '2x2';
  const cols = big ? 2 : 3, rows = big ? 2 : 3;
  const cardW = big ? 94.5 : 63, cardH = big ? 132 : 88;
  return {
    id: big ? '2x2' : '3x3',
    cols, rows, perPage: cols * rows, cardW, cardH,
    marginX: (210 - cols * cardW) / 2,
    marginY: (297 - rows * cardH) / 2,
  };
}

async function generateCardsPdf(wb, opts) {
  if (!wb || !Array.isArray(wb.models) || wb.models.length === 0) {
    throw new Error('La banda no tiene modelos para exportar tarjetas.');
  }
  if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('jsPDF no cargado. Causa probable: estás abriendo el HTML con file:// y un adblocker/firewall bloquea los CDN. Solución: 1) descarga https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js junto al HTML, o 2) sirve el HTML desde un servidor local (python -m http.server).');
  }
  // Precarga placeholders WWI antes del loop de renderizado — sin esto el
  // primer batch saldría sin foto (IMAGE_CACHE vacío).
  try { await preloadFactionImages(wb); } catch (e) { /* silencioso, PDF sin watermarks */ }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { cols, cardW, cardH, marginX, marginY, perPage } =
    getCardsPdfLayout(opts && opts.layout);
  const totalPages = Math.ceil(wb.models.length / perPage);

  for (let i = 0; i < wb.models.length; i++) {
    if (i > 0 && i % perPage === 0) {
      doc.addPage('a4', 'portrait');
    }
    const idx = i % perPage;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = marginX + col * cardW;
    const y = marginY + row * cardH;
    const dataURL = renderCardCanvas(wb.models[i], wb);
    if (dataURL) doc.addImage(dataURL, 'PNG', x, y, cardW, cardH);
    _drawCropMarks(doc, x, y, cardW, cardH);
  }

  // Cabecera y pie en cada página.
  for (let pi = 0; pi < totalPages; pi++) {
    if (pi > 0) {
      // Workaround: jsPDF requiere setPage, no siempre disponible en stubs.
      // Fallback silencioso — el stub no necesita esta semántica.
      try { doc.setPage && doc.setPage(pi + 1); } catch (e) {}
    }
    _drawCardsHeaderFooter(doc, wb, pi, totalPages);
  }

  return doc.output('blob');
}

/* Roadmap baja prio — Glosario PDF imprimible.
 * Reusa pdfRenderSpecialRulesSection (Section 3 del warband PDF completo)
 * en un documento dedicado A4 portrait, sin roster ni quartermaster.
 *
 * Pensado para imprimir como hoja de referencia rápida en mesa:
 *  - Regla especial de la facción (Pride of Jabir, Hellbound Soul, etc.)
 *  - Variante de banda (si aplica).
 *  - Habilidades de unidades ELITE (con companion-aware grouping del
 *    fix Silahdar — agrupa por model.name en bandas TC).
 *  - Términos generales referenciados (BLAST, FIRE, GAS, INFILTRATOR, ...).
 *
 * Devuelve Blob A4. El caller decide nombre del archivo + URL.createObjectURL.
 */
async function generateGlossaryPdf(wb) {
  if (!wb) throw new Error('No hay banda activa para generar el glosario.');
  if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('jsPDF no cargado. Causa probable: estás abriendo el HTML con file:// y un adblocker/firewall bloquea los CDN. Solución: 1) descarga https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js junto al HTML, o 2) sirve el HTML desde un servidor local (python -m http.server).');
  }
  const td = new TCDocument();
  td.setWarband(wb);

  // Cabecera específica del glosario (no full title page del warband PDF).
  td.h1((wb.name || 'Banda') + ' — Glosario de Reglas', { newPage: false });
  td.paragraph(
    'Referencia rápida para llevar a mesa: reglas de la facción, habilidades de las unidades ELITE y términos generales del juego que aparecen en esta banda. Sigue las paráfrasis de Trench Companion + canon Trench Crusade.',
    { size: 9, color: PDF_COLORS.greyMid, style: 'italic' }
  );
  td.y += 3;

  // Reusa la sección 3 ya implementada en el warband PDF completo.
  pdfRenderSpecialRulesSection(td);

  td.drawPageFooter();
  return td.doc.output('blob');
}

/* Fase 13-B PIVOT v2 — Lista de compra PDF imprimible.
 * A4 portrait, checklist con casillas físicas, items por sección.
 * Histórico se imprime al final con tachado visual (sigue útil como
 * recordatorio de qué ya cubriste).
 */
async function generateShoppingListPdf(wb) {
  if (!wb) throw new Error('Banda no cargada.');
  if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('jsPDF no cargado.');
  }
  const items = (wb.shoppingList || []);
  if (items.length === 0) throw new Error('Lista vacía.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 18, pageW = 210, pageH = 297;
  let y = margin;

  // Header.
  doc.setFontSize(16);
  doc.setTextColor(60, 12, 12);
  doc.text('Lista de la compra — ' + (wb.name || 'Banda'), margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Generado: ' + new Date().toLocaleString() + ' · Warband Forge', margin, y);
  y += 10;

  const groups = groupShoppingItems(wb);
  const variants = Array.isArray(wb.experimentalVariants) ? wb.experimentalVariants : [];
  const variantName = (vid) => {
    const v = variants.find(x => x.id === vid);
    return v ? v.name : 'Variante eliminada';
  };

  function drawSection(title, secItems, opts) {
    opts = opts || {};
    if (!secItems || secItems.length === 0) return;
    if (y > pageH - 30) { doc.addPage(); y = margin; }
    doc.setFontSize(12);
    doc.setTextColor(95, 25, 25);
    doc.text(title, margin, y);
    y += 6;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    for (const it of secItems) {
      if (y > pageH - 15) { doc.addPage(); y = margin; }
      // Checkbox físico (cuadrado 4mm).
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.3);
      doc.rect(margin, y - 3.5, 4, 4);
      // Si checked, marca diagonal.
      if (it.checked) {
        doc.line(margin, y - 3.5, margin + 4, y + 0.5);
        doc.line(margin + 4, y - 3.5, margin, y + 0.5);
      }
      const typeIcon = it.type === 'model' ? '[M]' : '[E]';
      let text = typeIcon + ' ' + (it.name || '(sin nombre)');
      if (it.forModel) text += ' (para ' + it.forModel + ')';
      if (it.description) text += ' — ' + it.description;
      doc.text(text, margin + 6, y);
      y += 6;
    }
    y += 4;
  }

  drawSection('Manuales', groups.manual);
  for (const vid of Object.keys(groups.byVariant)) {
    drawSection('Desde variante: ' + variantName(vid), groups.byVariant[vid]);
  }
  drawSection('Histórico (ya cubierto)', groups.historico);

  // Notas finales: líneas vacías para anotar precios.
  if (y > pageH - 50) { doc.addPage(); y = margin; }
  doc.setFontSize(11);
  doc.setTextColor(95, 25, 25);
  doc.text('Notas (precios, códigos, prioridades)', margin, y);
  y += 6;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);
  for (let i = 0; i < 6 && y < pageH - 15; i++) {
    doc.line(margin, y, pageW - margin, y);
    y += 7;
  }

  return doc.output('blob');
}

async function generateTrackersPdf(wb) {
  if (!wb || !Array.isArray(wb.models) || wb.models.length === 0) {
    throw new Error('La banda no tiene modelos para exportar battletrackers.');
  }
  if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('jsPDF no cargado. Causa probable: estás abriendo el HTML con file:// y un adblocker/firewall bloquea los CDN. Solución: 1) descarga https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js junto al HTML, o 2) sirve el HTML desde un servidor local (python -m http.server).');
  }
  try { await preloadFactionImages(wb); } catch (e) { /* silencioso */ }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const trackerW = 148, trackerH = 105;
  const perPage = 2; // 2×1
  const marginX = (297 - 2 * trackerW) / 2;  // ~0.5mm
  const marginY = (210 - trackerH) / 2;       // ~52.5mm
  const totalPages = Math.ceil(wb.models.length / perPage);

  for (let i = 0; i < wb.models.length; i++) {
    if (i > 0 && i % perPage === 0) {
      doc.addPage('a4', 'landscape');
    }
    const idx = i % perPage;
    const x = marginX + idx * trackerW;
    const y = marginY;
    const dataURL = renderBattletrackerCanvas(wb.models[i], wb);
    if (dataURL) doc.addImage(dataURL, 'PNG', x, y, trackerW, trackerH);
    _drawCropMarks(doc, x, y, trackerW, trackerH);
  }

  for (let pi = 0; pi < totalPages; pi++) {
    if (pi > 0) {
      try { doc.setPage && doc.setPage(pi + 1); } catch (e) {}
    }
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const factionLabel = (wb.factionId || '').replace(/-/g, ' ');
    doc.text('Warband Forge · ' + (wb.name || 'Banda') + ' · ' + factionLabel + ' · Battletrackers',
             148.5, 8, { align: 'center' });
    doc.text('Página ' + (pi + 1) + '/' + totalPages, 148.5, 205, { align: 'center' });
  }

  return doc.output('blob');
}

function renderBattletrackerCanvas(model, wb) {
  const canvas = document.createElement('canvas');
  canvas.width = TRACKER_W;
  canvas.height = TRACKER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const data = buildModelCardData(model, wb);
  // Background general.
  ctx.fillStyle = rgbStr(data.palette.BG);
  ctx.fillRect(0, 0, TRACKER_W, TRACKER_H);
  // Tarjeta a la izquierda, centrada vertical.
  const cardX = 40;
  const cardY = Math.floor((TRACKER_H - CARD_H) / 2);
  drawCardOnCanvas(ctx, cardX, cardY, CARD_W, CARD_H, data);
  // Panel tracker a la derecha.
  const panelX = cardX + CARD_W + 30;
  const panelY = 40;
  const panelW = TRACKER_W - panelX - 40;
  const panelH = TRACKER_H - 80;
  drawTrackerPanelOnCanvas(ctx, panelX, panelY, panelW, panelH, data);
  return canvas.toDataURL('image/png');
}

/**
 * Trench Crusade visual palette for PDF (RGB tuples 0-255).
 * Mirrors the on-screen colors but optimised for print legibility.
 */
const PDF_COLORS = {
  ink:        [22, 18, 14],     // body text (almost black, warm)
  parchment:  [250, 244, 230],  // page background
  rust:       [120, 60, 40],    // borders / dividers
  gold:       [184, 134, 60],   // section accents (faithful)
  goldBright: [212, 165, 95],   // highlights / type tags
  blood:      [156, 38, 30],    // danger / fallen accents
  bloodBright:[193, 60, 48],    // section titles for fallen banner
  greyMid:    [110, 100, 88],   // secondary text (paráfrasis, hints)
  greyLight:  [205, 195, 175],  // table dividers, subtle lines
  black:      [0, 0, 0],
  white:      [255, 255, 255],
};

/**
 * Page geometry for A4. Margins are generous (15mm) so content has air.
 */
const PDF_LAYOUT = {
  pageWidth:  210,   // A4 width in mm
  pageHeight: 297,
  marginX:    15,
  marginTop:  18,
  marginBottom: 18,
  // Derived
  contentWidth:  210 - 15 * 2,   // 180
  contentBottom: 297 - 18,        // 279 (yLimit)
};

/**
 * Replace emoji and unicode glyphs with WinAnsi-safe text equivalents.
 * jsPDF's built-in Helvetica/Times/Courier fonts only support WinAnsi
 * encoding — emojis and various symbols come out garbled. We strip them
 * to ASCII so the PDF is legible everywhere.
 */
function pdfSafeText(s) {
  if (s == null) return '';
  return String(s)
    .replace(/👑/g, 'D')   // Ducados
    .replace(/☼/g,  'G')   // Glory
    .replace(/⏳/g, '')    // hourglass — drop
    .replace(/★/g, '*')    // star
    .replace(/⚕/g, '#')    // medical / scar
    .replace(/◊/g, 'o')    // diamond marker
    .replace(/⚡/g, '!')    // action lightning
    .replace(/🗓/g, '')    // calendar — drop
    .replace(/📜/g, '')    // scroll — drop
    .replace(/●/g, '·')    // dot
    .replace(/▶/g, '>')
    .replace(/▼/g, 'v')
    .replace(/✓/g, 'OK')
    .replace(/✕/g, 'X')
    .replace(/✠/g, '+')
    .replace(/⚔/g, '')
    .replace(/🩸/g, '')
    .replace(/🛒/g, '')
    .replace(/💀/g, '')
    .replace(/🔒/g, '')
    .replace(/🎯/g, '')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    // Strip any non-WinAnsi (>=0x100) characters that aren't covered above —
    // including astral-plane emojis (>0xFFFF) which need /u flag with a
    // wider range to catch surrogate pairs properly.
    .replace(/[\u0100-\uFFFF]/g, '')      // BMP outside WinAnsi
    .replace(/[\uD800-\uDFFF]/g, '');     // surrogate pairs (astral emojis)
}

/**
 * Wrap class around jsPDF doc to track current Y, page numbers, and
 * provide helper methods for headings, paragraphs, tables.
 */
class TCDocument {
  constructor() {
    if (typeof window.jspdf === 'undefined') {
      throw new Error('jsPDF no se ha cargado. Verifica la conexión.');
    }
    const { jsPDF } = window.jspdf;
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Wrap text() and splitTextToSize() so they auto-sanitise emojis/non-WinAnsi
    // characters. This way every caller can use natural strings (with 👑 ☼ etc.)
    // and we don't need to remember to wrap each one.
    const origText = this.doc.text.bind(this.doc);
    this.doc.text = function(text, x, y, options) {
      if (typeof text === 'string') text = pdfSafeText(text);
      else if (Array.isArray(text)) text = text.map(t => typeof t === 'string' ? pdfSafeText(t) : t);
      return origText(text, x, y, options);
    };
    const origSplit = this.doc.splitTextToSize.bind(this.doc);
    this.doc.splitTextToSize = function(text, maxLen, opts) {
      if (typeof text === 'string') text = pdfSafeText(text);
      return origSplit(text, maxLen, opts);
    };
    const origGetTextWidth = this.doc.getTextWidth.bind(this.doc);
    this.doc.getTextWidth = function(text) {
      if (typeof text === 'string') text = pdfSafeText(text);
      return origGetTextWidth(text);
    };

    this.y = PDF_LAYOUT.marginTop;
    this.pageNumber = 1;
    this.side = 'faithful';   // determines accent colour
    this.warband = null;
    this.faction = null;
  }

  setWarband(wb) {
    this.warband = wb;
    this.faction = DATA.factions[wb.factionId];
    this.side = this.faction ? this.faction.side : 'faithful';
  }

  /** Returns the accent colour for the current side. */
  accent() {
    return this.side === 'fallen' ? PDF_COLORS.bloodBright : PDF_COLORS.goldBright;
  }
  accentDark() {
    return this.side === 'fallen' ? PDF_COLORS.blood : PDF_COLORS.gold;
  }

  /** Move to a new page, reset Y. Optionally draws header. */
  newPage() {
    this.doc.addPage();
    this.pageNumber++;
    this.y = PDF_LAYOUT.marginTop;
    this.drawPageFooter();
  }

  /** Ensure there's at least `needed` mm of vertical space, else paginate. */
  ensureSpace(needed) {
    if (this.y + needed > PDF_LAYOUT.contentBottom) {
      this.newPage();
    }
  }

  /** Set fill color from a [R,G,B] tuple. */
  setFill(rgb) { this.doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
  setText(rgb) { this.doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
  setStroke(rgb){ this.doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

  /** ─── HEADERS / DIVIDERS ─────────────────────────────────────── */

  /**
   * Draws a Trench-Crusade-style H1: red title text with thin red rule
   * underneath, plus a short coloured tick on the left of the rule.
   * Use for new sections (forces page break before).
   */
  h1(text, opts = {}) {
    const forceNewPage = opts.newPage !== false;
    if (forceNewPage && this.y > PDF_LAYOUT.marginTop + 5) this.newPage();
    else this.ensureSpace(20);
    const accent = this.accentDark();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(20);
    this.setText(accent);
    this.doc.text(text.toUpperCase(), PDF_LAYOUT.marginX, this.y);
    this.y += 3;
    // Underline rule
    this.setStroke(accent);
    this.doc.setLineWidth(0.6);
    this.doc.line(PDF_LAYOUT.marginX, this.y + 2,
                  PDF_LAYOUT.marginX + PDF_LAYOUT.contentWidth, this.y + 2);
    // Coloured tick on the left
    this.setStroke(this.accent());
    this.doc.setLineWidth(1.5);
    this.doc.line(PDF_LAYOUT.marginX, this.y + 2,
                  PDF_LAYOUT.marginX + 30, this.y + 2);
    this.y += 8;
    this.doc.setLineWidth(0.2);
  }

  /** H2 subsection heading. Smaller, no full underline rule. */
  h2(text) {
    this.ensureSpace(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.setText(this.accentDark());
    this.doc.text(text, PDF_LAYOUT.marginX, this.y);
    this.y += 5;
    // Short underline
    this.setStroke(this.accentDark());
    this.doc.setLineWidth(0.3);
    const w = this.doc.getTextWidth(text);
    this.doc.line(PDF_LAYOUT.marginX, this.y - 1.5, PDF_LAYOUT.marginX + w, this.y - 1.5);
    this.y += 3;
  }

  /** ─── BODY TEXT HELPERS ──────────────────────────────────────── */

  /**
   * Paragraph: justified body text. Auto-wraps and paginates.
   * size defaults to 10pt; lineHeight 4.4mm.
   */
  paragraph(text, opts = {}) {
    const size = opts.size || 10;
    const lineHeight = opts.lineHeight || 4.4;
    const indent = opts.indent || 0;
    const color = opts.color || PDF_COLORS.ink;
    const style = opts.style || 'normal';
    const align = opts.align || 'justify';
    const maxWidth = PDF_LAYOUT.contentWidth - indent;
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(size);
    this.setText(color);
    const lines = this.doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      if (align === 'justify' && lines.indexOf(line) < lines.length - 1) {
        // jsPDF supports 'justify' via text() options — but only with maxWidth
        this.doc.text(line, PDF_LAYOUT.marginX + indent, this.y, { maxWidth, align: 'left' });
      } else {
        this.doc.text(line, PDF_LAYOUT.marginX + indent, this.y);
      }
      this.y += lineHeight;
    }
    this.y += 1;  // small gap after paragraph
  }

  /**
   * Definition entry as used in glossary/abilities sections.
   * Format:  TERM (type)
   *          definition body indented underneath
   */
  definition(term, type, body) {
    this.ensureSpace(14);
    // Term in bold red, type in gold parens after it
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.setText(this.accentDark());
    this.doc.text(term, PDF_LAYOUT.marginX, this.y);
    const termWidth = this.doc.getTextWidth(term);
    if (type) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8.5);
      this.setText(this.accent());
      this.doc.text(`(${type})`, PDF_LAYOUT.marginX + termWidth + 2, this.y);
    }
    this.y += 4.5;
    // Body, indented 4mm, justified
    this.paragraph(body, { indent: 4, size: 9.5, lineHeight: 4.2 });
    this.y += 1;
  }

  /** ─── TABLES ─────────────────────────────────────────────────── */

  /**
   * Renders a table with header row + data rows.
   *   columns: [{ header, width, align?: 'left'|'center'|'right' }]
   *   rows:    [[cell1, cell2, ...], ...]
   * Widths are in mm. Sum should be <= contentWidth.
   */
  table(columns, rows) {
    if (!rows.length) return;
    const totalWidth = columns.reduce((a, c) => a + c.width, 0);
    const startX = PDF_LAYOUT.marginX;

    // Header
    this.ensureSpace(8);
    this.setFill(this.accentDark());
    this.doc.rect(startX, this.y, totalWidth, 6, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setText(PDF_COLORS.parchment);
    let x = startX;
    for (const col of columns) {
      this.doc.text(col.header.toUpperCase(), x + 1.5, this.y + 4);
      x += col.width;
    }
    this.y += 6;

    // Data rows — alternating background for readability
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.setText(PDF_COLORS.ink);
    rows.forEach((row, rowIdx) => {
      // Compute row height by checking each cell's wrapped lines
      const cellLines = row.map((cell, colIdx) => {
        const text = String(cell == null ? '' : cell);
        return this.doc.splitTextToSize(text, columns[colIdx].width - 3);
      });
      const maxLines = Math.max(...cellLines.map(L => L.length), 1);
      const rowHeight = Math.max(5.5, maxLines * 3.6 + 1.6);
      this.ensureSpace(rowHeight);

      // Zebra stripe
      if (rowIdx % 2 === 0) {
        this.setFill([248, 242, 228]);
        this.doc.rect(startX, this.y, totalWidth, rowHeight, 'F');
      }

      // Cell content
      x = startX;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const lines = cellLines[colIdx];
        const align = columns[colIdx].align || 'left';
        const colW = columns[colIdx].width;
        for (let li = 0; li < lines.length; li++) {
          let textX = x + 1.5;
          if (align === 'center') {
            const w = this.doc.getTextWidth(lines[li]);
            textX = x + (colW - w) / 2;
          } else if (align === 'right') {
            const w = this.doc.getTextWidth(lines[li]);
            textX = x + colW - w - 1.5;
          }
          this.doc.text(lines[li], textX, this.y + 3.5 + li * 3.6);
        }
        x += colW;
      }

      // Bottom rule
      this.setStroke(PDF_COLORS.greyLight);
      this.doc.setLineWidth(0.15);
      this.doc.line(startX, this.y + rowHeight,
                    startX + totalWidth, this.y + rowHeight);
      this.y += rowHeight;
    });
    this.doc.setLineWidth(0.2);
    this.y += 2;
  }

  /** ─── FOOTER / FRAME ─────────────────────────────────────────── */

  drawPageFooter() {
    const w = PDF_LAYOUT.pageWidth;
    const h = PDF_LAYOUT.pageHeight;
    // Thin rule bottom
    this.setStroke(this.accentDark());
    this.doc.setLineWidth(0.3);
    this.doc.line(PDF_LAYOUT.marginX, h - 12,
                  w - PDF_LAYOUT.marginX, h - 12);
    // Warband + page number
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.setText(PDF_COLORS.greyMid);
    const wbName = this.warband ? (this.warband.name || 'Banda sin nombre') : 'Warband Forge';
    this.doc.text(wbName, PDF_LAYOUT.marginX, h - 7);
    const factionLine = this.faction ? this.faction.shortName : '';
    if (factionLine) {
      const fx = w / 2;
      const fw = this.doc.getTextWidth(factionLine);
      this.doc.text(factionLine, fx - fw / 2, h - 7);
    }
    const pageStr = `Pág. ${this.pageNumber}`;
    const pw = this.doc.getTextWidth(pageStr);
    this.doc.text(pageStr, w - PDF_LAYOUT.marginX - pw, h - 7);
  }

  /** Save PDF with the warband name as filename. */
  save(filename) {
    const safe = (filename || 'warband').replace(/[^a-z0-9_\-]+/gi, '_');
    this.doc.save(safe + '.pdf');
  }
}

/**
 * Renders the title page: warband name, faction, point total, model count.
 * Used as the cover of the generated PDF.
 */
function pdfRenderTitlePage(td) {
  const wb = td.warband;
  const f = td.faction;
  const totals = warbandTotals(wb);
  const accent = td.accentDark();

  // Big banner
  td.setFill(accent);
  td.doc.rect(0, 0, PDF_LAYOUT.pageWidth, 30, 'F');
  td.doc.setFont('helvetica', 'bold');
  td.doc.setFontSize(11);
  td.setText(PDF_COLORS.parchment);
  td.doc.text('TRENCH CRUSADE', PDF_LAYOUT.marginX, 12);
  td.doc.setFontSize(9);
  td.doc.setFont('helvetica', 'normal');
  td.doc.text('Warband Forge', PDF_LAYOUT.marginX, 19);
  // Right-aligned faction name
  if (f) {
    const facStr = f.name.toUpperCase();
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(9);
    const fw = td.doc.getTextWidth(facStr);
    td.doc.text(facStr, PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginX - fw, 19);
  }

  td.y = 50;

  // Warband name (huge)
  td.doc.setFont('helvetica', 'bold');
  td.doc.setFontSize(26);
  td.setText(PDF_COLORS.ink);
  const name = wb.name || '(Sin nombre)';
  const nameLines = td.doc.splitTextToSize(name, PDF_LAYOUT.contentWidth);
  for (const line of nameLines) {
    const lw = td.doc.getTextWidth(line);
    td.doc.text(line, (PDF_LAYOUT.pageWidth - lw) / 2, td.y);
    td.y += 11;
  }
  td.y += 4;

  // Variant if any
  if (wb.variantId && f) {
    const variant = f.variants.find(v => v.id === wb.variantId);
    if (variant) {
      td.doc.setFont('helvetica', 'italic');
      td.doc.setFontSize(13);
      td.setText(td.accentDark());
      const vw = td.doc.getTextWidth(variant.name);
      td.doc.text(variant.name, (PDF_LAYOUT.pageWidth - vw) / 2, td.y);
      td.y += 8;
    }
  }
  td.y += 6;

  // Decorative divider
  td.setStroke(accent);
  td.doc.setLineWidth(0.6);
  const cx = PDF_LAYOUT.pageWidth / 2;
  td.doc.line(cx - 30, td.y, cx + 30, td.y);
  td.doc.setLineWidth(1.5);
  td.setStroke(td.accent());
  td.doc.line(cx - 5, td.y, cx + 5, td.y);
  td.doc.setLineWidth(0.2);
  td.y += 14;

  // Stats grid: 3 columns (4 if game number is set)
  const stats = [
    { label: 'MODELOS',   value: String(wb.models.length) },
    { label: 'DUCADOS',   value: `${totals.ducados} / ${wb.budgetTotal} 👑` },
    { label: 'GLORY',     value: `${totals.glory} ☼` },
  ];
  // Add Game / Threshold info if this band is tied to a campaign game
  if (wb.gameNumber) {
    const row = warbandThresholdForGame(wb.gameNumber);
    if (row) {
      stats.push({
        label: `GAME ${row.game}`,
        value: `${row.fieldStrength} mod. máx`,
      });
    }
  }
  const cellW = PDF_LAYOUT.contentWidth / stats.length;
  const baseX = PDF_LAYOUT.marginX;
  for (let i = 0; i < stats.length; i++) {
    const sx = baseX + i * cellW + cellW / 2;
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(8);
    td.setText(PDF_COLORS.greyMid);
    const lw = td.doc.getTextWidth(stats[i].label);
    td.doc.text(stats[i].label, sx - lw / 2, td.y);
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(stats.length === 4 ? 13 : 15);  // smaller font when 4 columns
    td.setText(PDF_COLORS.ink);
    const vw = td.doc.getTextWidth(stats[i].value);
    td.doc.text(stats[i].value, sx - vw / 2, td.y + 7);
  }
  td.y += 20;

  // Field Strength warning (over the cap)
  if (wb.gameNumber) {
    const row = warbandThresholdForGame(wb.gameNumber);
    if (row && wb.models.length > row.fieldStrength) {
      td.doc.setFont('helvetica', 'italic');
      td.doc.setFontSize(9);
      td.setText(PDF_COLORS.blood);
      const msg = `⚠ Excede Field Strength: ${wb.models.length} > ${row.fieldStrength} (canon Game ${row.game})`;
      const mw = td.doc.getTextWidth(msg);
      td.doc.text(msg, (PDF_LAYOUT.pageWidth - mw) / 2, td.y);
      td.y += 6;
    }
  }

  // Notes if present
  if (wb.notes && wb.notes.trim()) {
    td.y += 4;
    td.h2('Notas');
    td.paragraph(wb.notes, { size: 10, color: PDF_COLORS.greyMid, style: 'italic' });
  }

  // Footer of cover
  td.doc.setFont('helvetica', 'italic');
  td.doc.setFontSize(8);
  td.setText(PDF_COLORS.greyMid);
  const dateStr = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const dw = td.doc.getTextWidth(dateStr);
  td.doc.text(dateStr,
    (PDF_LAYOUT.pageWidth - dw) / 2,
    PDF_LAYOUT.pageHeight - 25);

  td.drawPageFooter();
}

/**
 * Renders one model's full sheet (stats, equipment, abilities) as a card.
 * Used in the PDF body, after the title page.
 */
function pdfRenderModel(td, model) {
  const wb = td.warband;
  const unit = getUnit(wb.factionId, model.unitId);
  if (!unit) return;
  const cost = modelCost(model, wb.factionId, wb);
  const accent = td.accentDark();

  // Estimate space — paginate if not enough
  td.ensureSpace(60);

  // Card frame
  const startY = td.y;
  const startX = PDF_LAYOUT.marginX;
  const w = PDF_LAYOUT.contentWidth;

  // Top stripe with name (effective name reflects upgrades like Trooper → Legionnaire)
  const pdfEffName = effectiveUnitName(model, unit);
  td.setFill(accent);
  td.doc.rect(startX, startY, w, 8, 'F');
  td.doc.setFont('helvetica', 'bold');
  td.doc.setFontSize(12);
  td.setText(PDF_COLORS.parchment);
  td.doc.text(model.customName || pdfEffName, startX + 2, startY + 5.5);
  // Cost on the right
  const costStr = `${cost.ducados ? cost.ducados + ' 👑' : ''}${cost.ducados && cost.glory ? ' · ' : ''}${cost.glory ? cost.glory + ' ☼' : ''}`;
  td.doc.setFontSize(10);
  const cw = td.doc.getTextWidth(costStr);
  td.doc.text(costStr, startX + w - cw - 2, startY + 5.5);
  // Unit name subline (show original unit name if either renamed by upgrade or has custom name)
  td.doc.setFont('helvetica', 'italic');
  td.doc.setFontSize(8);
  td.setText(PDF_COLORS.parchment);
  if (model.customName) {
    td.doc.text(pdfEffName, startX + 2, startY + 11);
  } else if (pdfEffName !== unit.name) {
    td.doc.text('(de ' + unit.name + ')', startX + 2, startY + 11);
  }

  td.y = startY + 13;

  // Stats table (single row, effective stats with upgrade overrides)
  const statCols = [
    { header: 'MOV',     width: 28, align: 'center' },
    { header: 'RANGED',  width: 32, align: 'center' },
    { header: 'MELEE',   width: 32, align: 'center' },
    { header: 'ARMOUR',  width: 30, align: 'center' },
    { header: 'BASE',    width: 30, align: 'center' },
    { header: 'TIER',    width: 28, align: 'center' },
  ];
  const s = effectiveStats(model, unit);
  // Promoted Troops display as ELITE in the tier column (canon page 104)
  const promoted = !!(model.baseProgression && model.baseProgression.promotedToElite);
  const tier = (unit.tier === 'elite' || promoted)
    ? (promoted && unit.tier !== 'elite' ? 'ELITE ★' : 'ELITE')
    : (unit.tier === 'troops' ? 'TROOPS' : 'MERC');
  td.table(statCols, [[
    s.movement || '-',
    s.ranged   || '-',
    s.melee    || '-',
    s.armour   || '0',
    s.base     || '-',
    tier,
  ]]);

  // Keywords inline (effective set: base + upgrades)
  const pdfEffKeywords = effectiveKeywords(model, unit);
  if (pdfEffKeywords.length) {
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(7.5);
    td.setText(PDF_COLORS.greyMid);
    td.doc.text('KEYWORDS:', startX, td.y);
    td.doc.setFont('helvetica', 'normal');
    td.setText(PDF_COLORS.ink);
    td.doc.text(pdfEffKeywords.join(' · '), startX + 22, td.y);
    td.y += 5;
  }

  // Active upgrades (small line with cost) — only if any
  const pdfUpgrades = activeUpgrades(model, unit);
  if (pdfUpgrades.length) {
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(7.5);
    td.setText(PDF_COLORS.greyMid);
    td.doc.text('MEJORAS:', startX, td.y);
    td.doc.setFont('helvetica', 'italic');
    td.setText(td.accentDark());
    const upStr = pdfUpgrades.map(u => `${u.name} (+${u.cost} ${u.currency})`).join(' · ');
    td.doc.text(upStr, startX + 22, td.y);
    td.y += 5;
  }

  // Equipment list
  if (model.battlekit && model.battlekit.length) {
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(8);
    td.setText(td.accentDark());
    td.doc.text('EQUIPO', startX, td.y);
    td.y += 4;
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(8.5);
    td.setText(PDF_COLORS.ink);
    for (const kid of model.battlekit) {
      const it = findBattlekitItem(wb.factionId, kid, wb);
      if (!it) continue;
      td.ensureSpace(4);
      const left = `• ${it.name}`;
      const right = `${it.cost} ${it.currency}`;
      td.doc.text(left, startX + 2, td.y);
      const rw = td.doc.getTextWidth(right);
      td.doc.text(right, startX + w - rw - 2, td.y);
      td.y += 4;
    }
    td.y += 1;
  }

  // ----- XP boxes (canon: ☐ ○ ☐ ○ ☐ ☐ ○ ☐ ☐ ○ ☐ ☐ ○...) -----
  // Show the canonical experience track for ELITE / progressed models.
  // Pattern: positions 2, 4, 7, 10, 13... are circles (advancement triggers).
  const bp = model.baseProgression;
  const hasProgress = bp && (
    (bp.xp || 0) > 0 ||
    (bp.advancements || []).length > 0 ||
    (bp.scars || []).length > 0
  );
  const isElite = unit.tier === 'elite' || (unit.tier !== 'mercenary' && hasProgress);
  if (hasProgress || isElite) {
    td.ensureSpace(14);
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(8);
    td.setText(td.accentDark());
    td.doc.text('EXPERIENCIA', startX, td.y);
    td.y += 4;

    // Layout: a row of boxes.
    const xpVal = bp ? (bp.xp || 0) : 0;
    const xpCap = xpCapFor(wb.factionId, unit.id);
    const totalBoxes = xpCap !== Infinity
      ? Math.min(xpCap, 28)
      : 28; // canon track ends at 28 XP / 10 advancements
    const boxSize = 3.5;
    const gap = 0.7;
    const rowMaxWidth = w - 16; // leave room for the "x XP" label
    const boxesPerRow = Math.floor((rowMaxWidth + gap) / (boxSize + gap));
    let bx = startX + 2;
    let by = td.y;

    // Build the position-map: which positions are circles (advancements)?
    // The canon thresholds are [2,4,7,10,13,16,19,22,25,28] — these are the
    // 1-indexed positions of the circles. All other positions are squares.
    const circlePositions = new Set(CAMPAIGN_TABLES.xpThresholds);

    td.doc.setLineWidth(0.25);
    for (let i = 1; i <= totalBoxes; i++) {
      const isCircle = circlePositions.has(i);
      const isSpent = i <= xpVal;
      // Draw shape
      if (isCircle) {
        // Filled-light circle (ring)
        td.setStroke(PDF_COLORS.ink);
        td.setFill(PDF_COLORS.greyLight);
        td.doc.circle(bx + boxSize / 2, by + boxSize / 2, boxSize / 2, 'FD');
      } else {
        td.setStroke(PDF_COLORS.ink);
        td.setFill(PDF_COLORS.white);
        td.doc.rect(bx, by, boxSize, boxSize, 'FD');
      }
      // Mark spent boxes with an X
      if (isSpent) {
        td.setStroke(td.accentDark());
        td.doc.setLineWidth(0.6);
        td.doc.line(bx + 0.4, by + 0.4, bx + boxSize - 0.4, by + boxSize - 0.4);
        td.doc.line(bx + 0.4, by + boxSize - 0.4, bx + boxSize - 0.4, by + 0.4);
        td.doc.setLineWidth(0.25);
      }
      // Advance position
      if (i % boxesPerRow === 0 && i < totalBoxes) {
        bx = startX + 2;
        by += boxSize + 1.2;
      } else {
        bx += boxSize + gap;
      }
    }
    // Move y past the boxes (always, including the single-row case)
    td.y = by + boxSize + 2.5;

    // XP / cap label
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(8);
    td.setText(PDF_COLORS.ink);
    let xpLabel = `${xpVal} XP`;
    if (xpCap !== Infinity) xpLabel += ` / ${xpCap}`;
    const earned = advancementsEarned(xpVal);
    const next = nextXpThreshold(xpVal);
    xpLabel += `   ·   ${earned} ascensos`;
    if (next) xpLabel += `   ·   próx. en ${next}`;
    td.doc.text(xpLabel, startX + 2, td.y);
    td.y += 4;

    // Battle scar count + kills + Glorious Deeds
    const scarCount = (bp && bp.scars || []).length;
    const traumaScars = (bp && bp.scars || []).filter(s => s.source === 'trauma').length;
    const killCount = bp ? (bp.kills || 0) : 0;
    const deedCount = bp ? (bp.gloriousDeeds || []).length : 0;
    const status = bp && bp.status ? bp.status : 'alive';
    const detailParts = [];
    if (killCount > 0) detailParts.push(`${killCount} kills`);
    if (deedCount > 0) detailParts.push(`${deedCount} ☼ glorious deed${deedCount===1?'':'s'}`);
    if (scarCount > 0) detailParts.push(`${scarCount} cicatrices${traumaScars >= unfitScarThreshold(model) ? ' (UNFIT FOR DUTY)' : ''}`);
    if (status !== 'alive') detailParts.push(status);
    if (detailParts.length) {
      td.doc.setFont('helvetica', 'italic');
      td.doc.setFontSize(7.5);
      td.setText(PDF_COLORS.greyMid);
      td.doc.text(detailParts.join(' · '), startX + 2, td.y);
      td.y += 4;
    }

    // Cannot-be-promoted note
    if (!canBePromoted(wb.factionId, unit.id) && unit.tier === 'troops') {
      td.doc.setFont('helvetica', 'italic');
      td.doc.setFontSize(7);
      td.setText(PDF_COLORS.blood);
      td.doc.text('No puede ser ascendido a ELITE (canon)', startX + 2, td.y);
      td.y += 3.5;
    }
    td.y += 1;
  }

  // Abilities (just names + summaries — short, leaves room).
  // Modelos Companion-imported: TC es verdad oficial. Saltamos unit base
  // abilities para evitar el bug Silahdar (alias yuzbasi inyectaba Mubarizun).
  const pdfHasCompanion = !!(model.companionStats || (Array.isArray(model.companionAbilities) && model.companionAbilities.length));
  const pdfBaseUnitAbilities = pdfHasCompanion ? [] : (unit.abilities || []);
  const pdfEffAbilities = pdfHasCompanion ? [] : effectiveAbilities(model, unit);
  const baseAdvancements = (model.baseProgression && model.baseProgression.advancements) || [];
  // Companion abilities (bandas importadas de Trench Companion). Pueden
  // duplicar nombres con effectiveAbilities — el dedupe los une por name.
  const companionAbs = (model.companionAbilities || [])
    .map(a => (typeof a === 'string' ? { name: a } : a))
    .filter(a => a && a.name);
  if (pdfEffAbilities.length || baseAdvancements.length || companionAbs.length) {
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(8);
    td.setText(td.accentDark());
    td.doc.text('HABILIDADES', startX, td.y);
    td.y += 4;
    const rawAll = [
      ...pdfEffAbilities.map(n => ({
        name: n,
        source: pdfBaseUnitAbilities.includes(n) ? 'unit' : 'upgrade',
      })),
      ...baseAdvancements.map(a => ({
        name: a.name,
        source: 'advancement',
        adv: a,
      })),
      ...companionAbs.map(a => ({
        name: a.name,
        source: 'companion',
        companionDesc: a.description || a.desc || a.text || '',
      })),
    ];
    // Dedupe por nombre normalizado (case-insensitive + trim). Mantiene
    // la primera ocurrencia + funde descripción de companion si falta.
    const seen = new Map();
    for (const entry of rawAll) {
      const key = (entry.name || '').toLowerCase().trim();
      if (!key) continue;
      if (!seen.has(key)) {
        seen.set(key, entry);
      } else {
        // Funde companion description al primer entry si no tenía.
        const first = seen.get(key);
        if (entry.companionDesc && !first.companionDesc) {
          first.companionDesc = entry.companionDesc;
        }
      }
    }
    const all = Array.from(seen.values());
    for (const { name, source, adv, companionDesc } of all) {
      const lib = ABILITY_LIBRARY[name];
      const userNote = (model.abilityNotes && model.abilityNotes[name]) || '';
      // Prioridad summary: userNote > ABILITY_LIBRARY > companionDesc
      //                    > placeholder "(sin descripción canon disponible)"
      let summary = userNote.trim() || (lib ? lib.summary : '');
      if (!summary && companionDesc) summary = companionDesc;
      if (!summary) summary = '(descripción no disponible — añade nota en model.abilityNotes para personalizar)';
      td.ensureSpace(8);
      // Name in bold (with marker for source: ★ adv, ⊕ upgrade, ◊ unit)
      td.doc.setFont('helvetica', 'bold');
      td.doc.setFontSize(9);
      td.setText(PDF_COLORS.ink);
      let prefix = '◊ ';
      if (source === 'advancement') prefix = '★ ';
      else if (source === 'upgrade') prefix = '⊕ ';
      td.doc.text(prefix + name, startX + 2, td.y);
      td.y += 4;

      // Canonical provenance line for advancements (when known)
      if (source === 'advancement' && adv) {
        let provenance = null;
        if (adv.source === 'roll' && adv.skillTable && adv.rolled) {
          // From an in-app Skill Tables roll
          const tableName = CAMPAIGN_TABLES.skillTables[adv.skillTable]?.name || adv.skillTable;
          provenance = `📜 ${tableName} · 2D6 = ${adv.rolled}`;
        } else if (adv.source === 'trauma' && adv.traumaRoll) {
          // From a Trauma roll (e.g. Hardened from D66 64)
          provenance = `⚕ Trauma D66 = ${adv.traumaRoll}`;
        } else if (adv.id) {
          // Legacy preset (look up canonical source if known)
          const legacy = CAMPAIGN_TABLES.advancements.find(x => x.id === adv.id);
          if (legacy && legacy.sourceTable && legacy.sourceRoll) {
            const tableName = CAMPAIGN_TABLES.skillTables[legacy.sourceTable]?.name || legacy.sourceTable;
            provenance = `📜 ${tableName} (canon roll ${legacy.sourceRoll})`;
          }
        }
        if (provenance) {
          td.doc.setFont('helvetica', 'normal');
          td.doc.setFontSize(7);
          td.setText(td.accentDark());
          td.ensureSpace(3.5);
          td.doc.text(provenance, startX + 5, td.y);
          td.y += 3.5;
        }
      }

      if (summary) {
        td.doc.setFont('helvetica', 'italic');
        td.doc.setFontSize(8.5);
        td.setText(PDF_COLORS.greyMid);
        const lines = td.doc.splitTextToSize(summary, w - 8);
        for (const line of lines) {
          td.ensureSpace(3.6);
          td.doc.text(line, startX + 5, td.y);
          td.y += 3.6;
        }
        td.y += 1;
      }
    }
  }

  // Notes
  if (model.notes && model.notes.trim()) {
    td.ensureSpace(8);
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(8);
    td.setText(td.accentDark());
    td.doc.text('NOTAS', startX, td.y);
    td.y += 4;
    td.paragraph(model.notes, { size: 8.5, color: PDF_COLORS.greyMid, style: 'italic' });
  }

  // Card border (drawn AT END so it wraps the whole thing — but jsPDF
  // draws over content, so we keep just a bottom rule for separation)
  td.setStroke(PDF_COLORS.greyLight);
  td.doc.setLineWidth(0.3);
  td.doc.line(startX, td.y + 1, startX + w, td.y + 1);
  td.y += 5;
}

/**
 * Recopila todo el equipo único en uso por la banda, agrupado por
 * categoría amplia: 'ranged', 'melee', 'grenades', 'gear' (armaduras +
 * escudos + equipo).
 *
 * Devuelve un objeto:
 *   {
 *     ranged:   [{ item, modelCount }],
 *     melee:    [...],
 *     grenades: [...],
 *     gear:     [...],
 *     allKeywords: Set<string>,    // todas las weaponKeywords presentes
 *     hasMultipleOneHand: bool,    // ¿hay modelos con 2+ armas a 1 mano?
 *     hasBayonet: bool,            // ¿hay bayoneta equipada en algún modelo?
 *     hasBayonetLug: bool,         // ¿hay un rifle/escopeta con Bayonet Lug?
 *   }
 */
function gatherWarbandEquipment(wb) {
  const result = {
    ranged: [],
    melee: [],
    grenades: [],
    gear: [],
    allKeywords: new Set(),
    hasMultipleOneHand: false,
    hasBayonet: false,
    hasBayonetLug: false,
  };
  if (!wb || !wb.models) return result;

  // Per-item count and category bucketing
  const seen = {};   // itemId -> { item, count, cat }
  for (const model of wb.models) {
    let oneHandCount = 0;
    for (const kid of (model.battlekit || [])) {
      const item = findBattlekitItem(wb.factionId, kid, wb);
      if (!item) continue;
      // Track keywords
      for (const kw of (item.weaponKeywords || [])) result.allKeywords.add(kw);
      // Detect bayonet usage
      if (/bayonet/i.test(item.name)) result.hasBayonet = true;
      // Detect bayonet-lug-capable rifles
      if (item.restriction && /Bayonet Lug/i.test(item.restriction)) {
        result.hasBayonetLug = true;
      }
      // Count one-handed weapons per model
      if (item.type === '1-Handed') oneHandCount++;
      // Bucket by category
      let cat;
      if (/^1-Handed|^2-Handed/.test(item.type) && item.range && item.range !== 'Melee' && item.range !== '-') {
        cat = 'ranged';
      } else if (item.range === 'Melee') {
        cat = 'melee';
      } else if (item.type === 'Grenade') {
        cat = 'grenades';
      } else {
        // Shields, Armour, Headgear, Equipment
        cat = 'gear';
      }
      // Aggregate
      if (!seen[kid]) {
        seen[kid] = { item, count: 0, cat };
      }
      seen[kid].count++;
    }
    if (oneHandCount >= 2) result.hasMultipleOneHand = true;
  }
  // Sort each category alphabetically
  for (const key in seen) {
    const { item, count, cat } = seen[key];
    result[cat].push({ item, modelCount: count });
  }
  for (const cat of ['ranged','melee','grenades','gear']) {
    result[cat].sort((a, b) => a.item.name.localeCompare(b.item.name));
  }
  return result;
}

/**
 * Renders the Campaign Status section in the PDF: an overview of the
 * warband's campaign-relevant state — game number / threshold, ELITE
 * roster slots, models requiring attention (UNFIT FOR DUTY, captured,
 * dead), and aggregate Battle Scars across the band.
 *
 * Skipped entirely if the band has no game number AND no progressed
 * models (so it doesn't appear on plain "fresh" rosters).
 */
function pdfRenderCampaignStatus(td) {
  const wb = td.warband;
  if (!wb || !wb.models) return;

  // Decide whether to render at all.
  const hasGame = !!wb.gameNumber;
  const hasProgressedModel = wb.models.some(m => {
    const bp = m.baseProgression;
    return bp && (
      (bp.xp || 0) > 0 ||
      (bp.advancements || []).length > 0 ||
      (bp.scars || []).length > 0 ||
      bp.promotedToElite ||
      (bp.status && bp.status !== 'alive')
    );
  });
  if (!hasGame && !hasProgressedModel) return;

  // Aggregate state
  const eliteCount = countEliteInWarband(wb);
  const elig = eligibleForPromotion(wb);
  const slotsLeft = Math.max(0, CAMPAIGN_TABLES.promotionRules.maxElites - eliteCount);
  const gameRow = hasGame ? warbandThresholdForGame(wb.gameNumber) : null;

  // Lists of models needing attention
  const dead = [];
  const captured = [];
  const unfit = [];
  const limitedAtCap = [];
  const allScars = []; // {model, scars: [...]}
  for (const m of wb.models) {
    const bp = m.baseProgression;
    if (!bp) continue;
    const u = getUnit(wb.factionId, m.unitId);
    const name = m.customName || u?.name || '?';
    if (bp.status === 'dead') dead.push({ name, m });
    else if (bp.status === 'captured') captured.push({ name, m });
    const scars = (bp.scars || []);
    const traumaScars = scars.filter(s => s.source === 'trauma');
    if (traumaScars.length >= unfitScarThreshold(m)) unfit.push({ name, m, count: traumaScars.length });
    if (scars.length > 0) allScars.push({ name, m, scars });
    // At Limited Potential cap?
    const cap = xpCapFor(wb.factionId, m.unitId);
    if (cap !== Infinity && (bp.xp || 0) >= cap) limitedAtCap.push({ name, m, cap });
  }

  // Force a new page if there are several blocks to show
  td.ensureSpace(60);
  if (td.y > 100) td.newPage();
  td.h1('Estado de campaña', { newPage: false });

  // ---- Game / Threshold block ----
  if (hasGame && gameRow) {
    td.h2('Partida');
    const totals = warbandTotals(wb);
    const overFs = wb.models.length > gameRow.fieldStrength;
    const overBudget = totals.ducados > gameRow.threshold;
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(10);
    td.setText(PDF_COLORS.ink);
    const lines = [
      `Game ${gameRow.game} de la campaña`,
      `Threshold canónico: ${gameRow.threshold} 👑   ·   Field Strength máx: ${gameRow.fieldStrength} modelos`,
      `Coste actual: ${totals.ducados} 👑${overBudget ? ' ⚠ excede threshold' : ''}   ·   Modelos: ${wb.models.length}${overFs ? ' ⚠ excede field strength' : ''}`,
    ];
    if (wb.reinforcementsCalled) {
      lines.push('Reinforcements llamados — sin Exploration ni Quartermaster en este ciclo');
    } else if (totals.ducados < gameRow.threshold) {
      const available = gameRow.threshold - totals.ducados;
      lines.push(`Por debajo del threshold (puede llamar a Reinforcements: ${available} disponibles)`);
    }
    for (const line of lines) {
      td.ensureSpace(5);
      td.doc.text(line, PDF_LAYOUT.marginX + 2, td.y);
      td.y += 5;
    }
    td.y += 3;
  }

  // ---- ELITE composition ----
  td.h2('Composición ELITE');
  td.doc.setFont('helvetica', 'normal');
  td.doc.setFontSize(10);
  td.setText(PDF_COLORS.ink);
  const eliteLines = [
    `ELITE actuales: ${eliteCount} / ${CAMPAIGN_TABLES.promotionRules.maxElites} (canon máx)`,
    `Plazas libres: ${slotsLeft}`,
    `Troops elegibles para Promotion: ${elig.length}`,
  ];
  for (const line of eliteLines) {
    td.ensureSpace(5);
    td.doc.text(line, PDF_LAYOUT.marginX + 2, td.y);
    td.y += 5;
  }
  // Promoted models list (those who became ELITE via promotion)
  const promotedList = wb.models.filter(m => m.baseProgression?.promotedToElite);
  if (promotedList.length) {
    td.y += 2;
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(9);
    td.setText(td.accentDark());
    td.doc.text('Promocionados a ELITE en campaña:', PDF_LAYOUT.marginX + 2, td.y);
    td.y += 4.5;
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(9);
    td.setText(PDF_COLORS.ink);
    for (const m of promotedList) {
      const u = getUnit(wb.factionId, m.unitId);
      const name = m.customName || u?.name || '?';
      td.ensureSpace(4.5);
      td.doc.text(`★ ${name}${u && u.tier !== 'elite' ? ` (era ${u.name})` : ''}`,
        PDF_LAYOUT.marginX + 6, td.y);
      td.y += 4.5;
    }
  }
  td.y += 3;

  // ---- Glorious Deeds tally ----
  // Count both manual entries and wizard-recorded feats from campaign battles.
  const c = STATE.currentCampaign;
  const totalDeeds = countGloriousDeeds(wb, undefined, c);
  const deedsThisGame = wb.gameNumber ? countGloriousDeeds(wb, wb.gameNumber, c) : 0;
  const modelsWithDeeds = wb.models.filter(m => (m.baseProgression?.gloriousDeeds || []).length > 0);
  if (totalDeeds > 0) {
    td.ensureSpace(20);
    td.h2('Glorious Deeds');
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(10);
    td.setText(PDF_COLORS.ink);
    const deedLines = [
      `Total acumulado: ${totalDeeds} ☼`,
    ];
    if (wb.gameNumber) {
      deedLines.push(`Game ${wb.gameNumber} (más reciente): ${deedsThisGame} ☼${deedsThisGame > 0 ? ` (= +${deedsThisGame} D6 al Promotion Pool)` : ''}`);
    }
    for (const line of deedLines) {
      td.ensureSpace(5);
      td.doc.text(line, PDF_LAYOUT.marginX + 2, td.y);
      td.y += 5;
    }
    // Per-model breakdown
    if (modelsWithDeeds.length) {
      td.y += 2;
      td.doc.setFont('helvetica', 'bold');
      td.doc.setFontSize(9);
      td.setText(td.accentDark());
      td.doc.text('Por modelo:', PDF_LAYOUT.marginX + 2, td.y);
      td.y += 4.5;
      td.doc.setFont('helvetica', 'normal');
      td.doc.setFontSize(9);
      td.setText(PDF_COLORS.ink);
      for (const m of modelsWithDeeds) {
        const u = getUnit(wb.factionId, m.unitId);
        const name = m.customName || u?.name || '?';
        const deeds = m.baseProgression.gloriousDeeds || [];
        for (const d of deeds) {
          td.ensureSpace(4.5);
          const gameStr = d.game ? ` (Game ${d.game})` : '';
          td.doc.text(`☼ ${name} — ${d.name}${gameStr}`, PDF_LAYOUT.marginX + 6, td.y);
          td.y += 4.5;
        }
      }
    }
    td.y += 3;
  }

  // ---- Models needing attention ----
  if (dead.length || captured.length || unfit.length || limitedAtCap.length) {
    td.ensureSpace(20);
    td.h2('Modelos que requieren atención');
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(9.5);
    td.setText(PDF_COLORS.ink);

    const showList = (title, list, formatter, color) => {
      if (!list.length) return;
      td.ensureSpace(8);
      td.doc.setFont('helvetica', 'bold');
      td.doc.setFontSize(9);
      td.setText(color || td.accentDark());
      td.doc.text(title, PDF_LAYOUT.marginX + 2, td.y);
      td.y += 4.5;
      td.doc.setFont('helvetica', 'normal');
      td.doc.setFontSize(9);
      td.setText(PDF_COLORS.ink);
      for (const item of list) {
        td.ensureSpace(4.5);
        td.doc.text(formatter(item), PDF_LAYOUT.marginX + 6, td.y);
        td.y += 4.5;
      }
      td.y += 1.5;
    };
    showList('Muertos (eliminar del Roster):',
      dead, x => `• ${x.name}`, PDF_COLORS.blood);
    showList('Capturados (negociar rescate):',
      captured, x => `• ${x.name}`, PDF_COLORS.blood);
    showList('Unfit for Duty (3+ Battle Scars - retirar):',
      unfit, x => `• ${x.name} - ${x.count} cicatrices de trauma`,
      PDF_COLORS.blood);
    showList('En cap de Limited Potential:',
      limitedAtCap, x => `• ${x.name} - ${x.cap} XP / ${x.cap}`,
      PDF_COLORS.gold);
  }

  // ---- Battle Scars summary ----
  if (allScars.length) {
    td.ensureSpace(20);
    td.h2('Cicatrices de la banda');
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(9);
    td.setText(PDF_COLORS.ink);
    for (const entry of allScars) {
      td.ensureSpace(5 + 4.5 * entry.scars.length);
      td.doc.setFont('helvetica', 'bold');
      td.setText(td.accentDark());
      td.doc.text(entry.name, PDF_LAYOUT.marginX + 2, td.y);
      td.y += 4.5;
      td.doc.setFont('helvetica', 'normal');
      td.setText(PDF_COLORS.ink);
      for (const scar of entry.scars) {
        td.ensureSpace(4.5);
        const src = scar.source === 'trauma' ? '⚕ ' : '◊ ';
        td.doc.text(`${src}${scar.name}`, PDF_LAYOUT.marginX + 6, td.y);
        td.y += 4.5;
      }
      td.y += 1.5;
    }
  }

  td.y += 4;
}

/**
 * Renders the Quartermaster Log section: a chronological list of
 * Quartermaster transactions (recruits, sales, equipment purchases)
 * grouped by Game number, with running totals per game and a final
 * grand-total summary.
 *
 * Skipped if the warband has no transactions OR if the warband isn't
 * part of an active campaign (the data only exists in `STATE.currentCampaign.finances`).
 */
function pdfRenderQuartermasterLog(td) {
  const wb = td.warband;
  if (!wb) return;
  // Find the campaign this warband belongs to (via STATE)
  const c = STATE.currentCampaign;
  if (!c) return;
  if (!c.warbandIds || !c.warbandIds.includes(wb.id)) return;
  const fin = c.finances && c.finances[wb.id];
  if (!fin || !fin.transactions || !fin.transactions.length) return;

  // Group by game; sort transactions within each group by timestamp
  const groups = groupTransactionsByGame(fin.transactions);
  if (!groups.length) return;

  // Force a new page
  td.newPage();
  td.h1('Quartermaster Log', { newPage: false });
  td.doc.setFont('helvetica', 'italic');
  td.doc.setFontSize(9);
  td.setText(PDF_COLORS.greyMid);
  td.doc.text('Histórico de transacciones agrupadas por partida.', PDF_LAYOUT.marginX, td.y);
  td.y += 6;

  // Grand totals (across all games)
  const grand = {
    spentDucados: 0, spentGlory: 0,
    refundedDucados: 0, refundedGlory: 0,
  };
  for (const g of groups) {
    grand.spentDucados    += g.totals.spentDucados;
    grand.spentGlory      += g.totals.spentGlory;
    grand.refundedDucados += g.totals.refundedDucados;
    grand.refundedGlory   += g.totals.refundedGlory;
  }

  // Banner with grand totals
  td.ensureSpace(20);
  td.doc.setFillColor(232, 220, 192); // very light parchment
  td.doc.rect(PDF_LAYOUT.marginX, td.y, PDF_LAYOUT.contentWidth, 14, 'F');
  td.setStroke(td.accentDark());
  td.doc.setLineWidth(0.4);
  td.doc.rect(PDF_LAYOUT.marginX, td.y, PDF_LAYOUT.contentWidth, 14, 'S');
  td.doc.setFont('helvetica', 'bold');
  td.doc.setFontSize(8);
  td.setText(td.accentDark());
  td.doc.text('TOTAL ACUMULADO', PDF_LAYOUT.marginX + 3, td.y + 5);
  td.doc.setFont('helvetica', 'normal');
  td.doc.setFontSize(9);
  td.setText(PDF_COLORS.ink);
  const netDucados = grand.refundedDucados - grand.spentDucados;
  const netGlory = grand.refundedGlory - grand.spentGlory;
  const grandText =
    `Gastado: ${grand.spentDucados} 👑 · ${grand.spentGlory} ☼   ` +
    `Recuperado: ${grand.refundedDucados} 👑 · ${grand.refundedGlory} ☼   ` +
    `Neto: ${netDucados >= 0 ? '+' : ''}${netDucados} 👑 · ${netGlory >= 0 ? '+' : ''}${netGlory} ☼`;
  td.doc.text(grandText, PDF_LAYOUT.marginX + 3, td.y + 11);
  td.y += 18;

  // Per-game blocks
  for (const group of groups) {
    td.ensureSpace(28);
    // Game header
    td.doc.setFont('helvetica', 'bold');
    td.doc.setFontSize(11);
    td.setText(td.accentDark());
    const gameLabel = group.gameNumber == null
      ? 'Sin partida asignada'
      : `Game ${group.gameNumber}`;
    td.doc.text(gameLabel, PDF_LAYOUT.marginX, td.y);
    td.y += 5;

    // Per-game totals
    td.doc.setFont('helvetica', 'normal');
    td.doc.setFontSize(8);
    td.setText(PDF_COLORS.greyMid);
    const t = group.totals;
    const totalsLine =
      `${group.transactions.length} tx · ` +
      `Gasto ${t.spentDucados} 👑 / ${t.spentGlory} ☼ · ` +
      `Refund ${t.refundedDucados} 👑 / ${t.refundedGlory} ☼`;
    td.doc.text(totalsLine, PDF_LAYOUT.marginX + 2, td.y);
    td.y += 5;

    // Transactions table for this game
    const cols = [
      { header: 'Fecha',     width: 26, align: 'left' },
      { header: 'Tipo',      width: 32, align: 'left' },
      { header: 'Detalle',   width: 90, align: 'left' },
      { header: 'Coste',     width: 22, align: 'right' },
      { header: 'Refund',    width: 22, align: 'right' },
    ];
    const rows = [];
    // Sort transactions within group by timestamp (ascending)
    const sorted = group.transactions.slice().sort((a, b) =>
      (a.ts || '').localeCompare(b.ts || ''));
    for (const tx of sorted) {
      const date = tx.ts ? new Date(tx.ts).toLocaleDateString('es-ES', { month:'2-digit', day:'2-digit' }) : '—';
      const typeLabel = (() => {
        switch (tx.type) {
          case 'recruit':        return '+ Recluta';
          case 'sale-model':     return '- Venta mod.';
          case 'sale-equipment': return '- Venta eq.';
          case 'buy-equipment':  return '+ Compra eq.';
          default:               return tx.type;
        }
      })();
      const detail = tx.unitName || tx.kitName || '—';
      const isSpend = tx.type === 'recruit' || tx.type === 'buy-equipment';
      const isRefund = tx.type === 'sale-model' || tx.type === 'sale-equipment';
      const costStr = isSpend ? `${tx.cost || 0} ${tx.currency || ''}` : '—';
      const refundStr = isRefund ? `${tx.refund || 0} ${tx.currency || ''}` : '—';
      rows.push([date, typeLabel, detail, costStr, refundStr]);
    }
    td.table(cols, rows);
    td.y += 4;
  }

  td.y += 4;
}

/**
 * Renders the "Weapons & Equipment Tables" section of the PDF.
 * One table per category that the warband actually uses.
 * Followed by a "Notes on weapon usage" subsection that explains only
 * the keyword rules relevant to the warband's loadout.
 */
function pdfRenderWeaponsSection(td) {
  const wb = td.warband;
  const eq = gatherWarbandEquipment(wb);

  // Skip the whole section if the warband is empty
  if (!eq.ranged.length && !eq.melee.length && !eq.grenades.length && !eq.gear.length) {
    return;
  }

  td.h1('Tabla de Armas y Equipo');
  td.paragraph(
    'Resumen del armamento adquirido por la banda. Solo se incluyen las armas y piezas de equipo que algún modelo lleva equipadas. Consulta la sección "Notas" al final para ver las reglas relevantes para tu loadout.',
    { size: 9, color: PDF_COLORS.greyMid, style: 'italic' }
  );
  td.y += 2;

  // Helper: cell with a comma-list of keywords as text
  const fmtKW = (item) => (item.weaponKeywords || []).join(', ') || '—';
  const fmtRange = (item) => item.range || '-';
  const fmtType = (item) => item.type || '-';

  // Weapon-table columns (Arma | Tipo | Alcance | Keywords)
  const weaponCols = [
    { header: 'Arma',     width: 56 },
    { header: 'Tipo',     width: 28, align: 'center' },
    { header: 'Alcance',  width: 22, align: 'center' },
    { header: 'Keywords', width: 74 },
  ];

  // 1) Armas a Distancia
  if (eq.ranged.length) {
    td.y += 3;
    td.h2('Armas a Distancia');
    const rows = eq.ranged.map(({ item, modelCount }) => [
      modelCount > 1 ? `${item.name} (×${modelCount})` : item.name,
      fmtType(item),
      fmtRange(item),
      fmtKW(item),
    ]);
    td.table(weaponCols, rows);
  }

  // 2) Armas Cuerpo a Cuerpo
  if (eq.melee.length) {
    td.y += 3;
    td.h2('Armas Cuerpo a Cuerpo');
    const rows = eq.melee.map(({ item, modelCount }) => [
      modelCount > 1 ? `${item.name} (×${modelCount})` : item.name,
      fmtType(item),
      fmtRange(item),
      fmtKW(item),
    ]);
    td.table(weaponCols, rows);
  }

  // 3) Granadas
  if (eq.grenades.length) {
    td.y += 3;
    td.h2('Granadas');
    const rows = eq.grenades.map(({ item, modelCount }) => [
      modelCount > 1 ? `${item.name} (×${modelCount})` : item.name,
      fmtType(item),
      fmtRange(item),
      fmtKW(item),
    ]);
    td.table(weaponCols, rows);
  }

  // 4) Armadura y Equipo (Pieza | Tipo | Efecto)
  if (eq.gear.length) {
    td.y += 3;
    td.h2('Armadura y Equipo');
    const gearCols = [
      { header: 'Pieza',  width: 70 },
      { header: 'Tipo',   width: 30, align: 'center' },
      { header: 'Efecto', width: 80 },
    ];
    const rows = eq.gear.map(({ item, modelCount }) => [
      modelCount > 1 ? `${item.name} (×${modelCount})` : item.name,
      fmtType(item),
      fmtKW(item),
    ]);
    td.table(gearCols, rows);
  }

  // ── Notes subsection: only relevant rules ──
  td.y += 4;
  pdfRenderWeaponsNotes(td, eq);
}

/**
 * Renders the "Notas sobre el uso de armas" subsection.
 * Only emits explanations for weapon keywords that are actually present
 * in the warband's loadout. Plus a couple of cross-cutting rules:
 * dual-wielding pistols/1H weapons and Bayonet Lug pairing.
 */
function pdfRenderWeaponsNotes(td, eq) {
  const notes = [];

  // Sort the keywords found in a sensible reading order: hard rules first
  const orderedKeywords = [
    'HEAVY','RELOAD','RISKY','CRITICAL','AUTOMATIC','AUTOMATIC 3','AUTOMATIC 5',
    'SHOTGUN','SHRAPNEL','BLAST','BLAST 3"','FIRE','GAS','IGNORE ARMOUR',
    'IGNORE COVER','CLEAVE','CLEAVE 2','BLOCK','DEADLY','CUMBERSOME',
    'ASSAULT','SCATTER','High Trajectory','Full Auto','Cloud of Gas',
    'Overcharge','Bypass Shield',
  ];

  for (const kw of orderedKeywords) {
    if (!eq.allKeywords.has(kw)) continue;
    const def = WEAPON_KEYWORD_LIBRARY[kw];
    if (!def) continue;
    notes.push({ name: kw, type: def.type, summary: def.summary });
  }

  // Cross-cutting rules
  if (eq.hasMultipleOneHand) {
    notes.push({
      name: 'Off-Hand (uso de 2 armas a 1 mano)',
      type: 'rule',
      summary: 'Cuando un modelo lleva 2 armas a 1 mano (incluidas pistolas), puede usar la segunda como arma secundaria en cuerpo a cuerpo o disparo. La segunda arma sufre el modificador de Off-Hand: -1 DICE a Success Roll. Algunas habilidades (Iron Fists, Tartarus Claws, Iron-Clawed Hands) eliminan o modifican este penalizador.',
    });
  }
  if (eq.hasBayonet && eq.hasBayonetLug) {
    notes.push({
      name: 'Bayonet Lug',
      type: 'stipulation',
      summary: 'Para añadir una Bayoneta a un modelo, este debe llevar previamente un arma a distancia con la estipulación Bayonet Lug (rifles, escopetas, mosquetes). Las pistolas no aceptan bayoneta.',
    });
  }

  // Skip the section entirely if there's nothing to say
  if (!notes.length) return;

  td.h2('Notas sobre el uso de armas');
  td.paragraph(
    'Solo se incluyen aquí las reglas que afectan al equipo presente en la banda.',
    { size: 8.5, color: PDF_COLORS.greyMid, style: 'italic' }
  );
  td.y += 1;

  for (const n of notes) {
    const typeLabel =
      n.type === 'effect'      ? 'Efecto' :
      n.type === 'stipulation' ? 'Estipulación' :
      n.type === 'tag'         ? 'Etiqueta' :
      n.type === 'rule'        ? 'Regla' : '';
    td.definition(n.name, typeLabel, n.summary);
  }
}

/**
 * Recopila todas las entradas relevantes para el Glosario de la banda.
 * Filtra cada librería por lo que la banda realmente usa.
 *
 * Devuelve un objeto con 5 grupos:
 *   {
 *     factionTags:    [{ name, summary }],   // NEW ANTIOCH, ELITE, LEADER...
 *     modelKeywords:  [{ name, summary }],   // TOUGH, FEAR, FLYING...
 *     markers:        [{ name, summary }],   // BLOOD MARKER, INFECTION MARKER, MINED...
 *     weaponKeywords: [{ name, summary }],   // CLEAVE, BLAST, RELOAD...
 *     stipulations:   [{ name, summary }],   // ELITE only, Limit: N, Bayonet Lug...
 *   }
 */
function gatherWarbandGlossary(wb) {
  const result = {
    factionTags: [],
    modelKeywords: [],
    markers: [],
    weaponKeywords: [],
    stipulations: [],
  };
  if (!wb || !wb.models) return result;

  // Collect all keywords actually used by units in the warband
  const allUnitKeywords = new Set();
  // And all stipulations (item.restriction strings)
  const allStipulations = new Set();
  // And the equipment to detect markers (BLOOD/INFECTION/FIRE/BLESSING)
  const eq = gatherWarbandEquipment(wb);

  for (const model of wb.models) {
    const u = getUnit(wb.factionId, model.unitId);
    if (!u) continue;
    const kws = effectiveKeywords(model, u);
    kws.forEach(k => allUnitKeywords.add(k));

    for (const kid of (model.battlekit || [])) {
      const item = findBattlekitItem(wb.factionId, kid, wb);
      if (!item || !item.restriction) continue;
      // Some restrictions are compound ("ELITE & Mech. Heavy Inf. only").
      // We split on common delimiters to extract individual stipulations.
      // But also keep the original string in case it matches a library entry.
      allStipulations.add(item.restriction);
    }
  }

  // Sets to classify keywords:
  // Faction tags = the faction-name keywords plus tier/role tags
  const FACTION_TAGS = new Set([
    'NEW ANTIOCH', 'PILGRIM', 'SULTANATE', 'HERETIC', 'BLACK GRAIL', 'THE COURT',
    'ELITE', 'LEADER',
  ]);

  // Faction tags subsection
  for (const k of Array.from(allUnitKeywords).sort()) {
    if (!FACTION_TAGS.has(k)) continue;
    const desc = KEYWORD_LIBRARY[k];
    if (desc) result.factionTags.push({ name: k, summary: desc });
  }

  // Model keyword subsection (everything else)
  for (const k of Array.from(allUnitKeywords).sort()) {
    if (FACTION_TAGS.has(k)) continue;
    const desc = KEYWORD_LIBRARY[k];
    if (desc) result.modelKeywords.push({ name: k, summary: desc });
  }

  // Markers: scan our paraphrases for marker references and include the
  // ones that show up in keywords or weapon-keywords. Also always include
  // markers tied to faction (BLACK GRAIL → INFECTION MARKER) or weapons
  // (INFECTION MARKERS, MINED...).
  const markersToInclude = new Set();
  // Always include BLOOD MARKER if any model is mortal (which is all of them)
  markersToInclude.add('BLOOD MARKER');
  // BLESSING: if any model has an ability that mentions BLESSING (Combat Biologist,
  // Trench Cleric, etc.) — easier check: faction is faithful (NA, TP, IS)
  if (wb.factionId === 'new-antioch' || wb.factionId === 'trench-pilgrims' ||
      wb.factionId === 'iron-sultanate') {
    markersToInclude.add('BLESSING MARKER');
  }
  // INFECTION: if Black Grail or Hounds with INFECTION upgrade or any GAS weapon
  if (wb.factionId === 'black-grail') markersToInclude.add('INFECTION MARKER');
  if (allUnitKeywords.has('INFECTION MARKERS')) markersToInclude.add('INFECTION MARKER');
  // MINED: if Combat Engineers in band or any weapon/ability mentions MINED
  if (wb.models.some(m => m.unitId === 'combat-engineers' || m.unitId === 'sappers')) {
    markersToInclude.add('MINED');
  }

  for (const m of Array.from(markersToInclude).sort()) {
    const def = GENERAL_TERMS_LIBRARY[m];
    if (def) result.markers.push({ name: m, summary: def.summary });
  }

  // Weapon keyword subsection: every keyword present on any weapon
  for (const k of Array.from(eq.allKeywords).sort()) {
    const def = WEAPON_KEYWORD_LIBRARY[k];
    if (def) result.weaponKeywords.push({ name: k, summary: def.summary });
  }

  // Stipulations subsection
  // Match each restriction string against library entries.
  const matchedStips = new Set();
  for (const stip of allStipulations) {
    // Direct match in library
    if (STIPULATION_LIBRARY[stip]) {
      matchedStips.add(stip);
      continue;
    }
    // Pattern: "Limit: N" or "Limit: N excl. MHI"
    if (/^Limit:\s*\d/i.test(stip)) matchedStips.add('Limit: N');
    // Pattern: contains "ELITE only"
    if (/ELITE only/.test(stip)) matchedStips.add('ELITE only');
    if (/Mech\.\s*Heavy\s*Inf\.\s*only/i.test(stip)) matchedStips.add('Mech. Heavy Inf. only');
    if (/ELITE\s*&\s*Mech/i.test(stip)) matchedStips.add('ELITE & Mech. Heavy Inf. only');
    if (/Unique/.test(stip)) matchedStips.add('Unique');
    if (/Consumable/.test(stip)) matchedStips.add('Consumable');
    if (/Shield\s*Combo/.test(stip)) matchedStips.add('Shield Combo');
    if (/Bayonet\s*Lug/.test(stip)) matchedStips.add('Bayonet Lug');
  }

  for (const s of Array.from(matchedStips).sort()) {
    const def = STIPULATION_LIBRARY[s];
    if (def) result.stipulations.push({ name: s, summary: def.summary });
  }

  return result;
}

/**
 * Recopila las habilidades y reglas especiales relevantes para la banda:
 *   {
 *     factionRule: { name, summary } | null,    // regla de la facción base
 *     eliteAbilities: [{ unitName, abilities: [{ name, type, summary }] }],
 *     generalTerms: [{ name, type, summary }],  // términos referenciados
 *   }
 */
function gatherWarbandSpecialRules(wb) {
  const result = {
    factionRule: null,
    variantRule: null,
    variantSummary: null,
    eliteAbilities: [],
    generalTerms: [],
  };
  if (!wb || !wb.models) return result;

  // Faction rule — find the entry whose `faction` field matches and is a
  // base rule (not variant). Pick the first base one matching.
  // Warbands of TC 1.0.2: Trench Pilgrims, Iron Sultanate y Heretic Legions
  // no tienen reglas especiales de facción (solo sus variantes).
  const baseRulesByFaction = {
    'new-antioch':     'New Antioch Fireteams',
    'black-grail':     'Infection Markers',
    'court-serpent':   'Goetic Powers (Faction Rule)',
  };
  const ruleName = baseRulesByFaction[wb.factionId];
  if (ruleName && FACTION_RULES_LIBRARY[ruleName]) {
    const def = FACTION_RULES_LIBRARY[ruleName];
    result.factionRule = { name: ruleName, summary: def.summary };
  }

  // Variant rule — if the warband has an active variant with specialRule,
  // include it as well. The variant summary gives a short description.
  const variant = getActiveVariant(wb);
  if (variant) {
    result.variantSummary = { name: variant.name, summary: variant.summary || '' };
    if (variant.specialRule && FACTION_RULES_LIBRARY[variant.specialRule]) {
      const def = FACTION_RULES_LIBRARY[variant.specialRule];
      result.variantRule = { name: variant.specialRule, summary: def.summary };
    }
  }

  // Elite unit abilities — for each ELITE model en la banda, list its abilities.
  // Group key:
  //   - Companion model (TC): por model.name (Silahdar, Janissary Officer)
  //     — el alias unitId puede apuntar a yuzbasi/janissaries base y mezclaría
  //     abilities de unidad equivocada. Header de sección refleja canon TC.
  //   - Native model: por unit.id como antes.
  const eliteUnitsSeen = new Map();
  for (const model of wb.models) {
    const u = getUnit(wb.factionId, model.unitId);
    if (!u || u.tier !== 'elite') continue;
    const hasCompanion = !!(model.companionStats || (Array.isArray(model.companionAbilities) && model.companionAbilities.length));
    const groupKey = hasCompanion ? ('companion:' + (model.name || u.name)) : u.id;
    if (eliteUnitsSeen.has(groupKey)) continue;
    const abilitiesObj = displayAbilitiesForCard(model, u);
    if (!abilitiesObj.length) continue;
    const items = abilitiesObj
      .map(({ name }) => {
        const lib = ABILITY_LIBRARY[name];
        if (!lib) return null;
        return { name, type: lib.type, summary: lib.summary };
      })
      .filter(Boolean);
    if (items.length) {
      eliteUnitsSeen.set(groupKey, {
        unitName: hasCompanion ? (model.name || u.name) : u.name,
        abilities: items,
      });
    }
  }
  result.eliteAbilities = Array.from(eliteUnitsSeen.values());

  // General terms — only include terms that appear in the warband's content.
  // Strategy: scan all paraphrases (unit abilities, weapon keywords, faction
  // rule, etc.) for ALL-CAPS / Title-Case references to known terms.
  const referencedTerms = new Set();
  // Always include the most fundamental terms
  referencedTerms.add('Success Roll');
  referencedTerms.add('Activation');
  referencedTerms.add('Out of Action');
  referencedTerms.add('Down');
  referencedTerms.add('Injury Roll');

  // Helper to scan a string for term references
  const scanText = (text) => {
    if (!text) return;
    for (const term of Object.keys(GENERAL_TERMS_LIBRARY)) {
      // Skip markers (already in glossary section)
      const def = GENERAL_TERMS_LIBRARY[term];
      if (def.type === 'marker') continue;
      // Match by exact phrase (term names have specific capitalisation)
      if (text.includes(term)) referencedTerms.add(term);
    }
  };

  // Scan every paraphrase in use
  for (const u of result.eliteAbilities) {
    for (const a of u.abilities) scanText(a.summary);
  }
  if (result.factionRule) scanText(result.factionRule.summary);
  // Also scan weapon keywords used and stipulations used (their definitions
  // may reference terms — Risky Success Roll, etc.)
  const eq = gatherWarbandEquipment(wb);
  for (const k of eq.allKeywords) {
    const def = WEAPON_KEYWORD_LIBRARY[k];
    if (def) scanText(def.summary);
  }

  // Build the output list, sorted alphabetically (basic terms first by hand)
  const orderedTerms = [
    'Success Roll', 'Risky Success Roll', 'Critical Success', 'Injury Roll',
    'Charge Bonus', 'Activation', 'Treat ACTION', 'Dash ACTION',
    'Bloodbath Roll', 'Out of Action', 'Down', 'Standfast', 'Bulky',
  ];
  for (const t of orderedTerms) {
    if (!referencedTerms.has(t)) continue;
    const def = GENERAL_TERMS_LIBRARY[t];
    if (def) result.generalTerms.push({ name: t, type: def.type, summary: def.summary });
  }

  return result;
}

/**
 * Renders the Glossary section (Section 2) of the PDF: 5 subsections that
 * filter to only what the warband actually uses.
 */
function pdfRenderGlossarySection(td) {
  const wb = td.warband;
  const gl = gatherWarbandGlossary(wb);

  // Skip the whole section if everything is empty (very unlikely)
  const total = gl.factionTags.length + gl.modelKeywords.length +
                gl.markers.length + gl.weaponKeywords.length +
                gl.stipulations.length;
  if (!total) return;

  td.h1('Glosario');
  td.paragraph(
    'Definiciones de las etiquetas, palabras clave, marcadores y estipulaciones presentes en esta banda. Solo se incluyen las que efectivamente aparecen en el roster.',
    { size: 9, color: PDF_COLORS.greyMid, style: 'italic' }
  );
  td.y += 2;

  if (gl.factionTags.length) {
    td.y += 3;
    td.h2('Etiquetas de facción y unidad');
    for (const e of gl.factionTags) {
      td.definition(e.name, 'Etiqueta', e.summary);
    }
  }

  if (gl.modelKeywords.length) {
    td.y += 3;
    td.h2('Palabras clave de modelo');
    for (const e of gl.modelKeywords) {
      td.definition(e.name, 'Keyword', e.summary);
    }
  }

  if (gl.markers.length) {
    td.y += 3;
    td.h2('Marcadores');
    for (const e of gl.markers) {
      td.definition(e.name, 'Marcador', e.summary);
    }
  }

  if (gl.weaponKeywords.length) {
    td.y += 3;
    td.h2('Palabras clave de arma');
    for (const e of gl.weaponKeywords) {
      td.definition(e.name, 'Efecto de arma', e.summary);
    }
  }

  if (gl.stipulations.length) {
    td.y += 3;
    td.h2('Estipulaciones de equipo');
    for (const e of gl.stipulations) {
      td.definition(e.name, 'Estipulación', e.summary);
    }
  }
}

/**
 * Renders the Special Rules section (Section 3) of the PDF: faction rule,
 * elite abilities (one block per ELITE unit), and general game terms.
 */
function pdfRenderSpecialRulesSection(td) {
  const wb = td.warband;
  const sr = gatherWarbandSpecialRules(wb);

  const total = (sr.factionRule ? 1 : 0) +
                (sr.variantRule || sr.variantSummary ? 1 : 0) +
                sr.eliteAbilities.reduce((a, u) => a + u.abilities.length, 0) +
                sr.generalTerms.length;
  if (!total) return;

  td.h1('Habilidades y Reglas Especiales');
  td.paragraph(
    'Reglas de la facción, habilidades de las unidades ELITE y términos generales del juego referenciados por las paráfrasis anteriores.',
    { size: 9, color: PDF_COLORS.greyMid, style: 'italic' }
  );
  td.y += 2;

  if (sr.factionRule) {
    td.y += 3;
    td.h2('Regla especial de la facción');
    td.definition(sr.factionRule.name, 'Regla de facción', sr.factionRule.summary);
  }

  // Variant rule (when the warband has an active variant)
  if (sr.variantSummary) {
    td.y += 3;
    td.h2('Variante de banda');
    if (sr.variantRule) {
      td.definition(sr.variantSummary.name, 'Variante', sr.variantSummary.summary || sr.variantRule.summary);
    } else {
      td.definition(sr.variantSummary.name, 'Variante', sr.variantSummary.summary || '(Sin descripción detallada)');
    }
  }

  if (sr.eliteAbilities.length) {
    td.y += 3;
    td.h2('Habilidades de unidades ELITE');
    for (const u of sr.eliteAbilities) {
      td.ensureSpace(10);
      // Bold subheading for the unit name
      td.doc.setFont('helvetica', 'bold');
      td.doc.setFontSize(10);
      td.setText(td.accentDark());
      td.doc.text(u.unitName, PDF_LAYOUT.marginX, td.y);
      td.y += 4;
      for (const a of u.abilities) {
        const typeLabel =
          a.type === 'action'   ? 'ACCIÓN' :
          a.type === 'campaign' ? 'Campaña' :
          a.type === 'passive'  ? 'Pasiva' : '';
        td.definition(a.name, typeLabel, a.summary);
      }
      td.y += 1;
    }
  }

  if (sr.generalTerms.length) {
    td.y += 3;
    td.h2('Términos generales');
    for (const t of sr.generalTerms) {
      const typeLabel =
        t.type === 'game-term' ? 'Término' :
        t.type === 'effect'    ? 'Efecto' :
        t.type === 'tag'       ? 'Etiqueta' : '';
      td.definition(t.name, typeLabel, t.summary);
    }
  }
}

/**
 * Top-level entry point: generate the PDF for the current warband.
 * Phases 3+4 will plug their sections into this function.
 */
function generateWarbandPDF() {
  const wb = STATE.currentWarband;
  if (!wb) {
    alert('No hay banda activa para exportar.');
    return;
  }
  if (typeof window.jspdf === 'undefined') {
    alert('La librería jsPDF no se ha cargado. Verifica tu conexión a internet y recarga la página.');
    return;
  }
  if (!wb.models.length) {
    if (!confirm('La banda no tiene modelos. ¿Generar PDF igualmente?')) return;
  }

  try {
    const td = new TCDocument();
    td.setWarband(wb);

    // Page 1 — Cover
    pdfRenderTitlePage(td);

    // Body — one model per card, multiple per page if they fit
    if (wb.models.length) {
      td.newPage();
      td.h1('Roster', { newPage: false });
      for (const model of wb.models) {
        pdfRenderModel(td, model);
      }
    }

    // Campaign Status section (only if relevant)
    pdfRenderCampaignStatus(td);

    // Quartermaster Log (only if there are transactions)
    pdfRenderQuartermasterLog(td);

    // Phase 3: weapons & equipment table
    pdfRenderWeaponsSection(td);

    // Phase 4: glossary + special rules
    pdfRenderGlossarySection(td);
    pdfRenderSpecialRulesSection(td);

    // Final footer on last page
    td.drawPageFooter();
    // Save
    const filename = (wb.name || 'banda').toLowerCase().replace(/\s+/g, '-');
    td.save(filename);
  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Error generando el PDF: ' + (err.message || err));
  }
}


