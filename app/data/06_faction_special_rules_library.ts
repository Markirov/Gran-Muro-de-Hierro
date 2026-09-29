// @ts-nocheck
/* ======================================================================
   FACTION SPECIAL RULES LIBRARY
   Special rules of each faction / variant (Fireteams, Hellbound, etc.)
   ====================================================================== */
export const FACTION_RULES_LIBRARY = {
  // ----- New Antioch -----
  'New Antioch Fireteams': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Una banda de New Antioch (y sus variantes) puede tener hasta 2 Fireteams de 2 modelos cualesquiera, que ganan FIRETEAM gratis. Concentrated Attack: si un modelo de un Fireteam impacta a un objetivo que ya impactó su compañero antes en la misma activación conjunta, puedes gastar 3 BLOOD MARKERS para convertir la Injury Roll del segundo ataque en una Bloodbath Roll, aunque el objetivo no esté Down.',
  },

  // ----- Trench Pilgrims -----
  'Wrath of God': {
    type: 'special-rule',
    faction: 'trench-pilgrims',
    summary: 'Regla de la Procession of the Sacred Affliction (no de los Trench Pilgrims normales): hasta 1 Castigator, Trench Pilgrim o Martyr Penitent puede tenerla por 15 👑. Nunca recibe BLOOD MARKERS, tiene NEGATE FEAR, no puede ser Broken on the Wheel, no puede llevar armas a distancia ni Armour (sí Shield) y su base pasa a 32mm.',
  },

  // ----- Iron Sultanate -----
  'Pride of Jabir': {
    type: 'special-rule',
    faction: 'iron-sultanate',
    summary: 'Regla de la variante House of Wisdom: la banda puede tener 0-3 Lions of Jabir.',
  },

  // ----- Heretic Legions -----
  'Hellbound Soul Contract': {
    type: 'special-rule',
    faction: 'heretic-legions',
    summary: 'Battlekit de las Heretic Legions (Heretic Troopers y Legionnaires, Limit: 3). Fiery Exodus: si el modelo queda Out of Action, antes de retirarlo pon 1 BLOOD MARKER a cada enemigo a 1" o menos (salvo los que tengan NEGATE FIRE).',
  },

  // ----- Black Grail -----
  'Infection Markers': {
    type: 'special-rule',
    faction: 'black-grail',
    summary: 'INFECTION MARKERS: algunas armas del Black Grail tienen la keyword INFECTION MARKERS y ponen INFECTION MARKERS en lugar de BLOOD MARKERS. Morale: el rival añade -1 DICE a todos sus Morale Checks salvo que su banda sea de la Court of the Seven-Headed Serpent o del Cult of the Black Grail.',
  },
  'Morale Penalty vs. Faithful': {
    type: 'special-rule',
    faction: 'black-grail',
    summary: 'Morale: el rival añade -1 DICE a todos sus Morale Checks salvo que su banda sea de la Court of the Seven-Headed Serpent o del Cult of the Black Grail.',
  },

  // ----- Court of Serpent -----
  'Goetic Powers (Faction Rule)': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'Seven Deadly Sins: antes de reclutar eliges a qué Pecado se dedica la banda (Wrath, Envy, Lust, Pride, Sloth, Gluttony o Greed). Goetic Powers: los modelos ELITE pueden tenerlos (el número figura en su Warband Entry); son Goetic Abilities (como una habilidad normal) o Goetic Spells, que no requieren Success Roll: se pagan retirando tantos BLOOD MARKERS como su coste de modelos sin BLACK GRAIL ni DEMONIC (amigos o enemigos, en cualquier parte). No se puede lanzar el mismo hechizo más de una vez por activación; algunos requieren una Cast Spell ACTION.',
  },

  // ----- Variants -----
  'Fireteams (Papal States)': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'No existe en Warbands 1.0.2: una Papal States Intervention Force usa los Fireteams normales de New Antioch.',
  },
  'Papal States Intervention': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Far from Home: sin Trench Moles. Lector: debe incluir 1 Trench Cleric (y no necesita Lieutenant); ese Cleric tiene LEADER y Arise and be Healed! ACTION (Risky; con éxito, él o un amigo a 3" se levanta gratis y retira hasta D3 BLOOD y/o INFECTION MARKERS). Specialist Force: 500 👑 y 11 ☼ para empezar la campaña, +4 ☼ en cada Reinforcements y Threshold 200 👑 menor; como latecomer o en partida suelta, 200 👑 menos y 11 ☼ más. Supreme Blessing: el Supreme Pontiff\'s Crucifix de un modelo es gratis al crear la banda. Swiss Guard: el Lieutenant y hasta 4 modelos pueden tener NEGATE FEAR gratis.',
  },
  'Rapid Assault (Stosstruppen)': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Athleticism: el Lieutenant y los Shock Troopers pueden comprar Rapid Assault por +5 👑 cada uno (+1 DICE a la Risky Success Roll de su Dash ACTION).',
  },
  'Rapid Assault': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Athleticism: Lieutenant y Shock Troopers pueden tener Rapid Assault por +5 👑 (+1 DICE a la Risky de Dash). Expert Fireteams: hasta 3 Fireteams. Feldkaplane: los Trench Clerics pueden llevar 1 dosis de Holy Smoke. Forward Positions: hasta 2 Shock Troopers con INFILTRATOR por +10 👑. Lightly-armoured: solo el Lieutenant y la Mechanized Heavy Infantry llevan Reinforced o Machine Armour. Light Melee: los Shock Troopers pierden Assault Drill (siguen costando 45). Masters of the Grenade: +4" de alcance a todas las granadas. Specialised Equipment: Submachine Guns Limit: 4, Automatic Pistols sin ELITE only, Machine Guns Limit: 1, sin Grenade Launchers ni Martyrdom Pills. Troop Selection: 2-8 Shock Troopers, sin Trench Moles, máximo 1 Sniper Priest y 1 Mechanized Heavy Infantry.',
  },
  'Masters of the Grenade (Stosstruppen)': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Masters of the Grenade: +4" al alcance de todas las granadas de los modelos de una banda Stosstruppen; si el objetivo está a más de 8", -1 DICE a la Success Roll (revisión de reglas abril 2026).',
  },
  'Éire Rangers Light Infantry': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Anointed Ammunition: Armour-Piercing Bullets a 5 👑 (Limit: 2). Berserker: el Lieutenant o un Fianna puede ser Berserker por +15 👑 (sin Armour, sí Shield; NEGATE FEAR; nunca recibe BLOOD MARKERS). Carnyx: un Musical Instrument puede tener FEAR gratis. Fianna: los Shock Troopers pueden tener INFILTRATOR y SKIRMISHER por +10 👑. Patrón siempre Learned Saint. Hit & Run Tactics: -1 DICE a los ataques cuerpo a cuerpo contra un modelo de la banda que se retira. Light Infantry: solo 1 Mechanized Heavy Infantry pero hasta 4 Combat Engineers y 4 Satchel Charges; máximo 3 Great Swords/Axes (ninguna en la MHI); solo la MHI lleva armas HEAVY (salvo Great Swords/Axes y Satchel Charges) y Reinforced o Machine Armour. Loose Formation: el Lieutenant cambia Hold Your Fire! por SKIRMISHER. Strong in Faith: 0-2 Trench Clerics con Arise and be Healed! y Away Serpents! en lugar de Onward Christian Soldiers.',
  },
  'Kingdom of Alba Assault': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Bagpipes: un Musical Instrument puede ser Bagpipes gratis; los amigos a 8" tienen NEGATE FEAR. Brave: +1 DICE a los Morale Checks. Celtic Machine Armour: la Machine Armour mantiene Charge Bonus D6". Claymore Smiths: Great Sword/Axe a 7 👑. Cold Steel: la primera compra de cada arma cuerpo a cuerpo cuesta la mitad. Dum-Dum Ammunition: Dum-Dum Bullets a 5 👑 (Limit: 3). Highland Strength: Lieutenant y Shock Troopers con STRONG gratis. Lightly-armoured: solo Lieutenant y MHI llevan Reinforced o Machine Armour. Melee-focused: la MHI tiene Melee +1 DICE y Ranged +0 DICE. Rampant Charge: IGNORE DEFENDED OBSTACLE. Strained Supply: Automatic Shotgun, Grenade Launcher, Machine Gun, Sniper Rifle y Submachine Gun con Limit: 1. Armería propia: Lochaber Axe.',
  },
  'Expeditionary Forces of Abyssinia': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Abyssinian Healers: 0-2 Combat Medics y Misericordia con Limit: 2. Chieftain Panoply: la MHI no puede llevar Machine Armour. Faith of Ethiopia: sin Sniper Priests. Holy Warriors: 0-1 Trench Cleric y 0-2 Holy Warriors (entrada de Trench Cleric con Blessed Psalm ACTION y Arise and be Healed! ACTION). Short-Range Marksmanship: +1 DICE a los disparos a Short Range del Lieutenant y los Yeomen (no con granadas ni armas HEAVY). Vanguard Forces: sin Trench Moles; hasta 4 Yeomen con Flanking por +5 👑. Warrior Nobles: Shock Troopers y ELITE con Chewa por +5 👑 (+1 DICE en cuerpo a cuerpo por cada otro amigo a 1" del objetivo, máx. +2). Weapons of Mobile Warfare: máximo 3 armas a distancia HEAVY (sin contar Satchel Charges). Armería propia: Shotel, Holy Water of Lalibela, Anfarro, Tabot.',
  },
  'The Red Brigade': {
    type: 'special-rule',
    faction: 'new-antioch',
    summary: 'Wear and Tear: empieza cada partida con 1 BLOOD MARKER por cada 200 👑 completos del coste de la banda; los reparte el rival (1 por modelo mientras haya modelos sin marcadores, máx. 2 por modelo). No Retreat: nadie puede salir voluntariamente del cuerpo a cuerpo salvo los Mercy Dogs y quien arrastren. Trench Dogs (35 👑; no más perros que otros modelos): Guard, Mercy o Attack Dog por +5 👑. Glory Hounds: los perros ganan 2 ☼ por Glorious Deed. Remember the Fallen: tras la batalla, en vez de Exploración o Reinforcements, recupera el equipo de sus caídos. Live off the Land: no puede pedir Reinforcements dos partidas seguidas. Guns Blazing: el Lieutenant puede comprar Gunslinger por +5 👑. Displeasure of the Church: máximo 2 clérigos (1 Trench Cleric y 1 Sniper Priest, o 2 Sniper Priests). 0-1 Crimson Communicant (75 👑).',
  },
  'Procession of the Sacred Affliction': {
    type: 'special-rule',
    faction: 'trench-pilgrims',
    summary: 'Face thy Fears: sin Iron Capirotes (los Ecclesiastic Prisoners tampoco lo tienen y cuestan lo mismo). Hammer and the Anvil: Anti-Tank Hammers sin ELITE only. Melee-focused: sin Machine Guns y Punt Guns con Limit: 1. Punishing Millstones: +1 INJURY DICE a los ataques cuerpo a cuerpo contra objetivos Down (no los Ecclesiastic Prisoners). Reliquary Armoury: Holy Icon Shields a 20 👑 sin ELITE only. Wrath of God: hasta 1 Castigator, Trench Pilgrim o Martyr Penitent por 15 👑 (sin BLOOD MARKERS, NEGATE FEAR, sin armas a distancia ni Armour, base 32mm). Zealot Strength: hasta 3 Trench Pilgrims y/o Martyr Penitents. Armería propia: Holy Icon Armour.',
  },
  'War Pilgrimage of Saint Methodius': {
    type: 'special-rule',
    faction: 'trench-pilgrims',
    summary: 'Anchorite Armoury: los Anchorite Shrines tienen Ranged +0 DICE y acceden a Anchorite Ranged Weapons y Anchorite Battlekit. Anchorite Cloister: hasta 2 Anchorite Shrines. Chaste Order: las Stigmatic Nuns deben llevar Standard Armour y como máximo 3. Communicant Heresy: sin Ammo Monks, Communicants ni Communicant Anti-Tank Hunters. Patrón siempre Learned Saint. Mortal Sin: los Ecclesiastic Prisoners no llevan Martyrdom Device y nadie puede ser Broken on the Wheel. Treasure in Heaven: los Trench Pilgrims no resucitan como Martyr Penitents.',
  },
  'Cavalcade of the Tenth Plague': {
    type: 'special-rule',
    faction: 'trench-pilgrims',
    summary: 'Blood of the Lamb: los Castigators tienen TOUGH gratis. Day of His Wrath: el War Prophet cambia Laying on of Hands por Day of his Wrath ACTION (Risky; con Success, Injury Roll con IGNORE ARMOUR a 1 enemigo a 3"; con Critical, además +1 INJURY DICE). Favour of the Lord: al empezar cada turno puedes poner 1 BLESSING MARKER a un modelo de la banda. Heaven Awaits: los Trench Pilgrims no resucitan como Martyr Penitents. Only the Righteous: cualquier PILGRIM (salvo Ecclesiastic Prisoners) puede llevar Sacrificial Lamb por 5 👑. Stolen Communicants: los Communicants cuestan 3 ☼ en vez de ducados. The Unclean: 0-2 Ecclesiastic Prisoners.',
  },
  "Fida'i of Alamut": {
    type: 'special-rule',
    faction: 'iron-sultanate',
    summary: 'Alamut Alone: sin Yüzbaşı, Jabirean Alchemist, Janissaries, Lions of Jabir ni Brazen Bulls. Art of Assassination: cada Assassin puede tener una habilidad distinta: Hallucinogen Disguise (20 👑), Mirage of Time (15 👑, -1 DICE a los ataques contra él), Secret Paths (10 👑, entra desde un borde a partir del turno 2) o Thunderbolt of Alamut (20 👑, +2" Movement y +1 DICE a la Risky de Dash). Assassin Acolytes: hasta 3 Azebs con INFILTRATOR por +10 👑. Dervishes: 0-4, entrada de Janissary sin Reinforced Armour y con IGNORE OFF-HAND WEAPON y Whirling Dervish (-1 DICE a los disparos contra él) en lugar de STRONG. Flock of Assassins: 0-2 Sultanate Assassins y 1 Master Assassin (obligatorio; entrada de Sultanate Assassin con LEADER y TOUGH, 95 👑). Killing Squad: 1 Fireteam. Armería propia: Bow of Alamut, Golden Khanjar, Hashashin Leaf.',
  },
  'House of Wisdom': {
    type: 'special-rule',
    faction: 'iron-sultanate',
    summary: 'Alchemists: 1-2 Jabirean Alchemists y Alchemist Armour con Limit: 2. Kavasses: hasta 3 Azebs con Melee +0 DICE por +5 👑 (pierden Light Skirmisher). Noble Guardians: 0-2 Fāris (entrada de Janissary con ELITE gratis). Pride of Jabir: 0-3 Lions of Jabir. Private Venture: sin Yüzbaşı, Janissaries ni Sultanate Assassins. Secrets of the House of Wisdom: cada Alchemist puede tener una habilidad distinta (Medicine, Cartography & Geometry, Secrets of Takwin, Chemistry & Alchemy, Philosophy, Poetry and Theology). Takwin Homunculus: uno por Alchemist (40 👑, con Alchemical Formulas). Weapon Collections: al crear la banda, 1 Battlekit de New Antioch y 1 de Trench Pilgrims. Armería propia: Elixir of Al-Khidr, Fire Shield.',
  },
  'Defenders of the Iron Wall': {
    type: 'special-rule',
    faction: 'iron-sultanate',
    summary: 'Far from the Sublime Gate: sin Lions of Jabir, Yüzbaşı ni Assassins, y sin Cloak of Alamut ni Wind Amulet. Grand Cannons: 0-2 Sultanate Grand Cannons (60 👑), dados a un Brazen Bull (máx. 1 cada uno) o como gun battery. Janissary Officers: 0-2 Janissaries con ELITE gratis. Marksmanship of the Iron Wall: +2 DICE en vez de +1 con Elevated Position. Sappers Corps: 0-4 Sultanate Sappers. Siege Jezzail Teams: +1 DICE al disparar un Siege Jezzail con un amigo a 1". Silahdar: 1 obligatorio (entrada de Yüzbaşı con STRONG en vez de Mubarizun; puede llevar Alaybozan, Anq Guard y Explosive Charges). Sipahi: hasta 1 Sipahi Automaton Cavalry por 110 👑 (entrada de Mamluk Faris, sin cambiar su Battlekit).',
  },
  'Trench Ghosts': {
    type: 'special-rule',
    faction: 'heretic-legions',
    summary: 'Barbed Wire Banshee: puede sustituir al Chorister (mismo perfil y coste); en vez de Unholy Hymns, +1 INJURY DICE a las tiradas contra enemigos a 8". Enemies of All: sin Mercenarios. Lost Souls: sin modelos ARTIFICIAL, Hellbound Soul Contracts ni Infernal Brands (los Anointed no tienen Infernal Brand y siguen costando 95). Semi-corporeal: -1 INJURY DICE a las Injury Rolls de disparos contra modelos de la banda. Slow and Creeping: Dash como si tuvieran 3"/Infantry y -1 DICE a sus ataques contra un enemigo que se retira. Undead Horror: todos tienen FEAR, NEGATE DIFFICULT TERRAIN y NEGATE GAS. Armería propia: Sarcophagus Mine, Tank Palanquin.',
  },
  'Knights of Avarice': {
    type: 'special-rule',
    faction: 'heretic-legions',
    summary: 'Corrupt Merchants: al crear la banda, 1 Battlekit de New Antioch y 1 del Iron Sultanate. Gas Bombs: las Artillery Witches cambian Infernal Bombs por Gas Bombs. Goetic Warlocks: hasta 2 como Mercenarios; el primero cuesta 110 👑 en vez de Glory. Infernal Rivalry: sin Death Commandos. Mammon\'s Chosen: ningún modelo con su Battlekit por debajo de 80 👑 salvo Wretched. Preserve the Loot: nada con FIRE o SHRAPNEL; el Grenade Launcher cambia SHRAPNEL por -1 INJURY DICE, GAS e IGNORE ARMOUR. Price of Greed: el Heretic Priest cambia Puppet Master por Price of Greed ACTION (Risky; Injury Roll a un enemigo a 12" en Line of Sight, +1 INJURY DICE con Critical y +1 INJURY DICE por cada -1 INJURY MODIFIER del objetivo). Patrón siempre Mammon. Armería propia: Coin Hammer, Golden Calf Altar, Standard of Mammon, Tarnished Armour.',
  },
  'Heretic Naval Raiders': {
    type: 'special-rule',
    faction: 'heretic-legions',
    summary: 'Close Assault Weapons: Submachine Guns a 25 👑. Fast as Lightning: +1 DICE a la Risky Success Roll de Dash. Let Sleeping Dogs Lie: sin War Wolf. Light Troops: máximo 2 Anointed y 1 Artillery Witch (aunque la banda valga 1.000 👑 o más). Unseen Advance: hasta 3 modelos sin ELITE con INFILTRATOR por +10 👑.',
  },
  'Dirge of the Great Hegemon': {
    type: 'special-rule',
    faction: 'black-grail',
    summary: 'The Executor: 1 obligatorio (entrada de Plague Knight con Ranged +1 DICE, LEADER y TOUGH, 80 👑); además 0-2 Plague Knights. The Fallen: sin Lord of Tumours ni Amalgam. The Lost: 0-2 Hounds y 0-2 Heralds of Beelzebub. The Bereaved: los Grail/Fly Thralls tienen Ranged +0 DICE, cuestan 30 👑 y pueden llevar armas a distancia, granadas, Musical Instrument o Troop Flag. Dishonoured: sin Beelzebub\'s Axe ni Black Grail Shield. Hegemon\'s Last Blessing: Putrid Shotgun Limit: 3 y Viscera Cannon Limit: 3 sin ELITE only. Hegemon\'s Will: Executor y Plague Knights tienen Command Bereaved ACTION (retira INFECTION MARKERS de enemigos; por cada uno, un Bereaved a 18" hace Charge, Fight, Move o Shoot, máx. 1 orden por turno). Armería propia: Broken Crown, Urn of the Bitter Ashes.',
  },
  'The Great Hunger': {
    type: 'special-rule',
    faction: 'black-grail',
    summary: 'Eternal Appetence: al empezar cada turno eliges un efecto del Hambre (Agonised Churning, Ruinous Masticating, Spasmodic Wretching o Vile Craving) que usa los INFECTION MARKERS de los amigos a 8" de una Matagot Hag. Butcher Knights: 0-2 Plague Knights (base 32/40mm) con Ravenous Infection gratis y rangos propios (Butcher King, Knight Companion of the Feast, Knight of Twin Cleavers). Cradle of Filth: 0-3 Cradle Thralls (Ravenous con INFILTRATOR, 2 ☼, no cuentan para la Field Strength). Desiccated Husks: 0-2 (Corpse Guard con CRITICAL y More Worm Than Man). Excruciating Hunger: lista de armas y equipo prohibidos. The Great Maw: 0-1 si el resto vale 1.000 👑 o más (Lord of Tumours sin LEADER). Spawn of Gluttony: 1 Matagot Hag obligatoria; sin Lord of Tumours, Corpse Guards, Grail Thralls, Heralds of Beelzebub ni Amalgam.',
  },
  'Sin: Wrath': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'La banda está dedicada a Wrath (Seven Deadly Sins). Aura of Wrath del Desecrated Saint: +1 DICE a los ataques cuerpo a cuerpo y a la Risky de Dash de los amigos a 8" (incluido él). Da acceso a los Goetic Powers de Wrath.',
  },
  'Sin: Envy': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'La banda está dedicada a Envy (Seven Deadly Sins). Aura of Envy del Desecrated Saint: los enemigos a 12" no pueden cargar a un modelo de su banda que esté a 1" de un modelo de la banda del que carga. Da acceso a los Goetic Powers de Envy.',
  },
  'Sin: Lust': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'La banda está dedicada a Lust (Seven Deadly Sins). Aura of Lust del Desecrated Saint: a enemigos a 4" con Armour no IMPERVIOUS puedes anularles keywords y reglas de esa armadura (salvo las del tamaño de base). Da acceso a los Goetic Powers de Lust.',
  },
  'Sin: Pride': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'La banda está dedicada a Pride (Seven Deadly Sins). Aura of Pride del Desecrated Saint: al terminar su activación, 1 BLOOD MARKER a cada enemigo a 8". Da acceso a los Goetic Powers de Pride.',
  },
  'Sin: Sloth': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'La banda está dedicada a Sloth (Seven Deadly Sins). Aura of Sloth del Desecrated Saint: los enemigos a 8" tratan los Minor Hit como Down (también los que convierten Down en Minor Hit, como la Machine Armour). Da acceso a los Goetic Powers de Sloth.',
  },
  'Sin: Gluttony': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'La banda está dedicada a Gluttony (Seven Deadly Sins). Aura of Gluttony del Desecrated Saint: -1 DICE a las tiradas de enemigos a 8" salvo BLACK GRAIL o ARTIFICIAL. Da acceso a los Goetic Powers de Gluttony.',
  },
  'Sin: Greed': {
    type: 'special-rule',
    faction: 'court-serpent',
    summary: 'La banda está dedicada a Greed (Seven Deadly Sins). Aura of Greed del Desecrated Saint: los enemigos a 12" que carguen deben cargarle si está a 12", en su Line of Sight y alcanzable sin terreno Dangerous ni Climb, Jump, Jump Down o Diving Charge. Da acceso a los Goetic Powers de Greed.',
  },
};


