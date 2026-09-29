// @ts-nocheck
/* ======================================================================
   ABILITY LIBRARY
   Short paraphrased reminders of each unit ability — written in our own
   words. Use the official rulebook for the full text and edge cases.
   The format is:
     <Ability Name>: { summary, type? }
       - type: 'action' | 'passive' | 'campaign' (optional, for icons)
   ====================================================================== */
export const ABILITY_LIBRARY = {
  // ----- New Antioch -----
  'Hold Your Fire! ACTION': {
    type: 'action',
    summary: 'Elige 1 enemigo en Line of Sight del Lieutenant que el rival pueda activar. La activación del Lieutenant termina y el rival debe activar ese modelo.',
  },
  'Absolute Faith': {
    type: 'passive',
    summary: 'El oponente no puede gastar BLOOD MARKERS para añadir -DICE a un ataque a distancia de un Sniper Priest.',
  },
  'Aim ACTION': {
    type: 'action',
    summary: 'Risky Success Roll +2 DICE. Si tiene éxito: +2 DICE a las tiradas de ataque a distancia durante el resto de la Activación.',
  },
  'God is With Us! ACTION': {
    type: 'action',
    summary: 'Risky Success Roll. Si falla, no pasa nada y la activación del Trench Cleric termina. Con Success o Critical, pon 1 BLESSING MARKER junto al Trench Cleric o a un modelo amigo a 6" o menos.',
  },
  'Onward Christian Soldiers!': {
    type: 'passive',
    summary: 'Modelos NEW ANTIOCH amigos a 8" del Trench Cleric ganan NEGATE FEAR.',
  },
  'Trench Moles': {
    type: 'passive',
    summary: 'Hasta 2 Yeomen pueden ser Trench Moles con la keyword INFILTRATOR por +10 👑 cada uno. Puedes tener un 3.º si el resto de la banda (con su Battlekit) suma 1.000 👑 o más.',
  },
  'Assault Drill': {
    type: 'passive',
    summary: 'Ignoran HEAVY en 1 arma cuerpo a cuerpo. Aún limitados a 1 arma HEAVY total.',
  },
  'Shock Charge': {
    type: 'passive',
    summary: 'Al tirar el Charge Bonus, lanza 1 D6 extra y usa el más alto.',
  },
  'Battlefield Demolition': {
    type: 'passive',
    summary: 'Ignoran HEAVY para 1 Satchel Charge. Aún limitados a 1 arma HEAVY total.',
  },
  'Set Mine ACTION': {
    type: 'action',
    summary: 'En contacto con una pieza de terreno de hasta 8"x8" sin MINED: Success Roll con +2 DICE. Si falla, no pasa nada; con Success o Critical, la pieza gana la keyword MINED.',
  },
  'Defuse Mine': {
    type: 'passive',
    summary: 'Al mover el modelo a contacto con un Marker o terreno MINED puede intentar desactivarlo: Risky Success Roll. Si falla, la mina detona y su activación termina; con Success o Critical no detona y pierde MINED. El modelo que puso la mina la desactiva sin tirar.',
  },
  'Fortify ACTION': {
    type: 'action',
    summary: 'Risky Success Roll. Si falla, la activación termina. Con Success o Critical, el modelo tiene la keyword COVER hasta que se mueva de su posición.',
  },
  'Expert Medic': {
    type: 'passive',
    summary: '+2 DICE al Risky Success Roll cuando usa el Medi-kit en un Treat ACTION.',
  },
  'Finish the Fallen': {
    type: 'passive',
    summary: '+1 INJURY DICE en ataques cuerpo a cuerpo si el objetivo está Down y no es BLACK GRAIL ni DEMONIC.',
  },

  // ----- Trench Pilgrims -----
  'Loudspeakers ACTION': {
    type: 'action',
    summary: 'Risky Success Roll con +2 DICE. Si falla, la activación del War Prophet termina. Con Success o Critical, todos los modelos amigos a 8" o menos pueden moverse hasta 3", acabando lo más cerca posible del enemigo más cercano que vieran al empezar; si llegan a 1" de un enemigo cuentan como carga. Si no ven enemigos, se mueven libremente.',
  },
  'Laying on of Hands ACTION': {
    type: 'action',
    summary: 'El War Prophet hace Success Roll. Si tiene éxito: retira 1 BLOOD MARKER de un amigo a 6" o menos (3 si Critical Success). Puede usarse a sí mismo.',
  },
  'Memento Mori': {
    type: 'passive',
    summary: 'La primera vez que el War Prophet sufra un resultado Out of Action en la tabla de Injury, se trata como No Effect en su lugar. El War Prophet no puede tener TOUGH.',
  },
  'Bodyguard': {
    type: 'passive',
    summary: 'Si un amigo del mismo grupo (PILGRIM, BLACK GRAIL, etc.) a 1" o menos recibe un Ranged o Melee Attack, este modelo puede recibir el impacto en su lugar (haz la tirada de Injury contra él). No funciona contra ataques con BLAST.',
  },
  'The Communicant Cross': {
    type: 'passive',
    summary: 'El Communicant lleva clavada una cruz sagrada en la cara. Cuenta con Iron Capirote (Headgear) y Gas Mask permanentes y gratuitos. No se pueden retirar ni perder.',
  },
  'Enforced Orthodoxy ACTION': {
    type: 'action',
    summary: 'Risky Success Roll con +1 DICE. Si falla, la activación del Castigator termina. Con Success o Critical, todos los modelos amigos Down a 8" o menos se levantan sin gastar movimiento.',
  },
  'Resurrection': {
    type: 'campaign',
    summary: 'Si un Trench Pilgrim muere tras una partida de campaña, puede resucitar en el siguiente Quartermaster Step como Martyr Penitent (perfil Martyr Penitent) por 45 👑. Conserva su Battlekit y Zealot Strength, pero pierde Scars, Experience y Advancements. Las Injury Rolls contra un Martyr Penitent tienen -1 INJURY DICE y las Martyrdom Pills no le afectan. No puede resucitar el que murió por Broken on the Wheel (Rules Commentaries, Trench Pilgrims Q1).',
  },
  'Agile': {
    type: 'passive',
    summary: '+1 DICE a la Risky Success Roll cuando el modelo trepa (Climb), salta (Jump), hace una Diving Charge o una Dash ACTION.',
  },
  'Trigger Martyrdom Device ACTION': {
    type: 'action',
    summary: 'El Martyrdom Device detona (un solo uso): Injury Roll a todos los modelos a 3" (amigos y enemigos, incluido el Prisoner). La del Prisoner se hace con 4D6 sumando los 4 dados, y los demás a 1" suman +1 INJURY DICE.',
  },
  'Awaited': {
    type: 'passive',
    summary: 'Un Ecclesiastic Prisoner que queda Out of Action al activarse su Martyrdom Device no cuenta para los Morale Checks de la banda.',
  },
  'Broken on the Wheel': {
    type: 'campaign',
    summary: 'Al empezar cada partida, antes del despliegue, puedes romper en la rueda a 1 Trench Pilgrim o Ecclesiastic Prisoner: sale de la banda para siempre (en campaña su Battlekit puede pasar a otros en el siguiente Quartermaster Step). Hasta que el Anchorite Shrine sufra un Out of Action tiene Armour 0, no tiene NEGATE SHRAPNEL ni TOUGH y trata los Down como Minor Hit. Ese primer Out of Action cuenta como No Effect: se retiran sus BLOOD MARKERS y desde entonces tiene Armour -3, NEGATE SHRAPNEL y TOUGH (TOUGH se aplica al siguiente Out of Action).',
  },
  'Symphony of Slaughter': {
    type: 'passive',
    summary: 'El Anchorite tiene 2 armas a 1 mano (Catherine Wheel + Bonebreaker Mace). En un Fight ACTION puede atacar 1 vez con cualquiera de las dos, o atacar 2 veces (primero Catherine Wheel, luego Bonebreaker Mace con el modificador Off-Hand).',
  },
  'Iron Capirote': {
    type: 'passive',
    summary: 'Headgear con las keywords NEGATE FEAR y NEGATE SHRAPNEL.',
  },

  // ----- Iron Sultanate -----
  'Mubarizun': {
    type: 'passive',
    summary: 'Añade +1 INJURY DICE a los ataques del Yüzbaşı si el objetivo tiene la keyword TOUGH.',
  },
  'Mastery of the Elements': {
    type: 'passive',
    summary: 'Al desplegarlo por primera vez en la partida, puedes dar FIRE, GAS o SHRAPNEL (la misma) a todas sus armas a distancia y cuerpo a cuerpo. Elemental Change ACTION: Risky Success Roll; si falla, su activación termina; con Success o Critical cambias esa keyword por una de las otras dos.',
  },
  'Temporal Assassin': {
    type: 'passive',
    summary: 'Tras el Charge Bonus, si aún no ha hecho una Fight ACTION en su activación, puede elegir un segundo enemigo como objetivo de la carga. Carga al primero y hace una Fight ACTION; después se redespliega a 1" del segundo y hace otra Fight ACTION contra él, con la misma arma. No puede hacer más Fight ACTIONS en esa activación.',
  },
  'Hallucinogen Disguise': {
    type: 'passive',
    summary: 'Si se despliega con INFILTRATOR, debe hacerlo a 8" o más de cualquier enemigo pero ignora el resto de restricciones de INFILTRATOR (puede desplegar en Line of Sight enemiga, los Guard Dogs no le afectan, etc.).',
  },
  'Mirage of Time': {
    type: 'passive',
    summary: '-1 DICE a la Success Roll de los ataques contra este Assassin.',
  },
  'Secret Paths': {
    type: 'passive',
    summary: 'Antes del despliegue puedes declarar que usa Secret Paths: no se despliega y no puede activarse en el turno 1. Desde el turno 2, al activarlo se despliega en contacto con cualquier borde del tablero a más de 8" de todos los enemigos y sigue su activación con normalidad.',
  },
  'Thunderbolt of Alamut': {
    type: 'passive',
    summary: '+2" a su Movement y +1 DICE a la Risky Success Roll de su Dash ACTION.',
  },
  'Whirling Dervish': {
    type: 'passive',
    summary: '-1 DICE a la Success Roll de los Ranged Attacks contra un Dervish.',
  },
  'Light Skirmishers': {
    type: 'passive',
    summary: 'Cualquier número de Azebs puede tener la keyword SKIRMISHER por +5 👑 cada uno.',
  },
  'Sapper Set Mine ACTION': {
    type: 'action',
    summary: 'En contacto con una pieza de terreno de hasta 8"x8" sin MINED: Success Roll con +2 DICE. Si falla, no pasa nada; con Success o Critical, la pieza gana la keyword MINED.',
  },
  'Lion Agile': {
    type: 'passive',
    summary: '+1 DICE a la Risky Success Roll cuando el Lion of Jabir trepa (Climb), salta (Jump), hace una Diving Charge o una Dash ACTION.',
  },
  'Teeth and Claws': {
    type: 'passive',
    summary: 'Puede hacer ataques cuerpo a cuerpo aunque no tenga arma de cuerpo a cuerpo equipada.',
  },
  'Pin': {
    type: 'passive',
    summary: 'Modelos enemigos en estado Down con base de 40mm o menos no pueden levantarse mientras un Lion of Jabir esté a 1" o menos (incluso si el Lion también está Down).',
  },
  'Rapid Assault': {
    type: 'passive',
    summary: '+1 DICE a la Risky Success Roll cuando el modelo hace una Dash ACTION. (Athleticism, Stosstruppen of Prussia.)',
  },
  'Day of His Wrath ACTION': {
    type: 'action',
    summary: 'Risky Success Roll. Si falla, su activación termina. Con Success, Injury Roll con IGNORE ARMOUR a 1 enemigo a 3"; con Critical, además +1 INJURY DICE. (Sustituye a Laying on of Hands en el Cavalcade of the Tenth Plague.)',
  },
  'Blessed Psalm ACTION': {
    type: 'action',
    summary: 'Quita 1 BLESSING MARKER del Holy Warrior y ponlo junto a un modelo amigo. No requiere Success Roll.',
  },
  'Flanking': {
    type: 'passive',
    summary: 'Al desplegarlo por primera vez, puede desplegarse en su zona o en contacto con cualquier borde del tablero a 8" o más de enemigos. Despliega antes que los INFILTRATOR y después del resto; si el escenario obliga a los INFILTRATOR a desplegar normalmente, este también.',
  },
  'Chewa': {
    type: 'passive',
    summary: '+1 DICE a la Success Roll de sus Melee Attacks por cada otro modelo amigo a 1" del objetivo, hasta +2 DICE.',
  },
  'Arise and be Healed! ACTION': {
    type: 'action',
    summary: 'Risky Success Roll. Si falla, no pasa nada y su activación termina. Con Success o Critical elige al Trench Cleric o a 1 amigo a 3": se levanta sin gastar movimiento y puedes retirarle hasta D3 BLOOD MARKERS y/o INFECTION MARKERS.',
  },
  'Away Serpents! ACTION': {
    type: 'action',
    summary: 'Elige 1 enemigo a 12" y haz una Risky Success Roll (-1 DICE si su base es de 40mm o más). Si falla, no pasa nada y su activación termina. Con Success o Critical, el enemigo queda Down.',
  },
  'Pummelling Blows': {
    type: 'passive',
    summary: 'Un Takwin Homunculus puede hacer Melee Attacks aunque no tenga armas cuerpo a cuerpo.',
  },
  'Re-creation': {
    type: 'passive',
    summary: 'Si el Takwin Homunculus muere en la secuencia de después de la partida, puedes pagar 40 👑 en el siguiente Quartermaster Step para dejarlo en el Roster.',
  },
  'School of Medicine ACTION': {
    type: 'action',
    summary: 'Success Roll con +1 DICE. Si falla, no pasa nada; con Success o Critical elige: retirar 2 BLOOD MARKERS o 1 INFECTION MARKER del Alchemist o de un amigo a 1", o levantar a un amigo Down a 1". (School of Medicine, House of Wisdom.)',
  },
  'Cartography & Geometry': {
    type: 'passive',
    summary: 'Al empezar la partida, antes del despliegue, elige hasta 2 modelos de la banda con base de 32mm o menos: tienen INFILTRATOR esa partida.',
  },
  'Secrets of Takwin': {
    type: 'passive',
    summary: 'Si el Alchemist recibe un impacto estando a 1" de su Takwin Homunculus, puedes aplicarlo al Homunculus y hacer la Injury Roll por él.',
  },
  'Chemistry & Alchemy': {
    type: 'passive',
    summary: 'Al empezar el primer turno, antes de activar modelos, coloca un Elemental Obstacle de hasta 2" x 6" a más de 1" de otros terrenos y a más de 6" de modelos. Tiene DIFFICULT TERRAIN y DANGEROUS TERRAIN (X); X es FIRE, GAS o SHRAPNEL, a tu elección.',
  },
  'Philosophy, Poetry and Theology': {
    type: 'passive',
    summary: '+1 DICE a las Morale Checks de la banda mientras el Alchemist no esté Down ni Out of Action. Si la banda está Shaken, sus Success Rolls no pasan a ser Risky (aunque sigue comprobando si huye). Tiene NEGATE FEAR.',
  },
  'Counter-Charge': {
    type: 'passive',
    summary: 'Si la primera ACCIÓN de la activación de este modelo es Charge, añade +1 DICE a sus ataques cuerpo a cuerpo durante el resto de la activación.',
  },
  'Artificial Life': {
    type: 'passive',
    summary: '-1 INJURY DICE en tiradas de lesión contra este modelo.',
  },
  'Mehterân': {
    type: 'passive',
    summary: '+1 DICE a la Risky Success Roll de un Dash ACTION si está a 4" o menos de un modelo amigo con Musical Instrument (+2 DICE en total con Fanfare).',
  },
  'Living Battering Ram ACTION': {
    type: 'action',
    summary: 'Si termina una Charge ACTION a 1" o menos de enemigos, puede tomar esta ACTION: Success Roll por cada enemigo a 1" (-1 DICE si su base es de 40mm o más). Con Success o Critical, el enemigo queda Down.',
  },
  'Ferocious Claws': {
    type: 'passive',
    summary: 'Sus Melee Attacks tienen la keyword CLEAVE 2.',
  },
  'Trample ACTION': {
    type: 'action',
    summary: 'Hace un Melee Attack contra un enemigo Down. Este ataque no usa arma cuerpo a cuerpo y tiene IGNORE ARMOUR.',
  },
  'Strong in Faith': {
    type: 'passive',
    summary: 'Una banda Éire Rangers puede tener 0-2 Trench Clerics, que cambian Onward Christian Soldiers por: Arise and be Healed! ACTION (Risky; con éxito, el Cleric o un amigo a 3" se levanta gratis y retira hasta D3 BLOOD y/o INFECTION MARKERS) y Away Serpents! ACTION (elige 1 enemigo a 12"; Risky, con -1 DICE si su base es de 40mm o más; con éxito queda Down).',
  },

  // ----- Heretic Legions -----
  'Price of Greed ACTION': {
    type: 'action',
    summary: 'Risky Success Roll; si falla, su activación termina. Con Success o Critical, Injury Roll a un enemigo a 12" en Line of Sight: +1 INJURY DICE con Critical y +1 INJURY DICE por cada -1 INJURY MODIFIER del objetivo (el modificador se sigue aplicando). Sustituye a Puppet Master en Knights of Avarice.',
  },
  'Levitate': {
    type: 'passive',
    summary: 'No hace Risky Success Roll al Climb o Jump, ni Injury Roll al caer.',
  },
  'Infernal Bombs': {
    type: 'passive',
    summary: 'Infernal Bomb (1-Handed, 36"): BLAST 3", IGNORE COVER, IGNORE ELEVATED POSITION, IGNORE LONG RANGE, RELOAD, SCATTER, SHRAPNEL. Duck: -1 INJURY DICE si el modelo está en contacto con terreno de ½" o más entre él y el punto objetivo. Infernal Strike: con Success o Critical contra un enemigo (o si falla y el punto cae sobre una base), la Injury Roll de ese modelo tiene DEADLY. Mighty Explosion: el modelo impactado que no queda Out of Action sale despedido D3" en línea recta.',
  },
  'Gas Bombs': {
    type: 'passive',
    summary: 'Gas Bomb (1-Handed, 36"): -1 INJURY DICE, BLAST 3", GAS, IGNORE ARMOUR, IGNORE COVER, IGNORE ELEVATED POSITION, IGNORE LONG RANGE, RELOAD, SCATTER. Choking Gas: el modelo impactado que no queda Out of Action se tambalea D3" en línea recta (el objetivo, en la dirección que elige el atacante; los del BLAST, alejándose del punto objetivo). Sustituye a las Infernal Bombs en Knights of Avarice.',
  },
  'Puppet Master ACTION': {
    type: 'action',
    summary: 'Risky Success Roll. Si falla, la activación del Heretic Priest termina. Con Success o Critical, elige 1 modelo (amigo o enemigo, no él mismo) a 12" o menos y en Line of Sight y muévelo D6" en línea recta en cualquier dirección: puede acabar a 1" de un enemigo, retirarse, trepar o saltar, pero no hacer una Diving Charge ni contar como carga.',
  },
  'Stealth Generator': {
    type: 'passive',
    summary: '-1 DICE a tiradas para ataques a distancia que tengan a este modelo como objetivo. Afecta a un ataque con BLAST solo si apunta al Death Commando, no si apunta a un punto del suelo (Rules Commentaries, Heretic Legions Q2).',
  },
  'Barbed Wire Banshee': {
    type: 'passive',
    summary: '+1 INJURY DICE a las Injury Rolls contra modelos enemigos a 8" o menos de la Barbed Wire Banshee. (Sustituye a Unholy Hymns.)',
  },
  'Unholy Hymns': {
    type: 'passive',
    summary: '-1 DICE a Success Rolls de modelos enemigos a 8" o menos del Chorister.',
  },
  'Heretic Legionnaires': {
    type: 'passive',
    summary: 'Puedes mejorar Heretic Troopers a Heretic Legionnaires por +10 👑 cada uno, sin que haya más Legionnaires que Troopers. El Legionnaire cambia su Ranged o su Melee de 0 a +1.',
  },
  'Assault Beast': {
    type: 'passive',
    summary: 'El War Wolf lleva dos armas cuerpo a cuerpo (Chainsaw Mouth y Shredding Claws). Ataca una vez con cualquiera o dos veces: primero Chainsaw Mouth y luego Shredding Claws con el modificador Off-Hand. Ambas son RISKY: si falla cualquier Success Roll, su activación termina.',
  },
  'Chattel': {
    type: 'campaign',
    summary: 'En campaña, los Wretched se pueden vender en el Quartermaster Step por 25 👑 más la mitad del coste de su Battlekit.',
  },
  'Abiotic Life': {
    type: 'passive',
    summary: 'Añade -1 INJURY DICE a las Injury Rolls contra la Artillery Witch por ataques con la keyword GAS.',
  },
  'Tormentor Chains': {
    type: 'passive',
    summary: 'Glory Item del Rulebook 1.0.2 (1-Handed, 10", ASSAULT, IGNORE COVER, IGNORE LONG RANGE, SHRAPNEL). Dragged Forwards: con Success o Critical no hay Injury Roll; pon 1 BLOOD MARKER más 1 por SHRAPNEL y arrastra al objetivo hasta 12" en línea recta hacia el atacante. Deadly Embrace: los enemigos a 1" del portador no pueden retirarse.',
  },

  // ----- Black Grail -----
  "Beelzebub's Touch": {
    type: 'passive',
    summary: 'Cuando un ataque cuerpo a cuerpo del Lord of Tumours coloca BLOOD MARKERS o INFECTION MARKERS en el objetivo, añade 1 INFECTION MARKER extra al objetivo.',
  },
  'Crushing Blows': {
    type: 'passive',
    summary: 'El Lord of Tumours puede hacer un ataque cuerpo a cuerpo Crushing Blows aunque no tenga arma cuerpo a cuerpo equipada (o en lugar de usar las armas que tenga). El ataque tiene CLEAVE 2. Puede hacerlo aunque no tenga armas cuerpo a cuerpo y aunque lleve Shield (Rules Commentaries, Black Grail Q1).',
  },
  'Command Bereaved ACTION': {
    type: 'action',
    summary: 'Quita cualquier número de INFECTION MARKERS de modelos enemigos. Por cada uno, un Bereaved (Grail o Fly Thrall) a 18" o menos cumple una orden: Charge (carga), Fight (Melee Attack), Move (mueve, sin Charge ni Retreat) o Shoot (Ranged Attack). Máx. 1 orden por Bereaved y turno; no impide activarlo ese turno.',
  },
  'Blind Rage': {
    type: 'passive',
    summary: 'Goetic Ability. +1 DICE a la Risky Success Roll de Dash.',
  },
  'Charge of Hatred': {
    type: 'passive',
    summary: 'Goetic Ability. Al cargar cuenta con Movement 12" y no tira el Charge Bonus. Si el objetivo no es el enemigo más cercano en Line of Sight, Risky Success Roll antes: con Failure no mueve y su activación termina.',
  },
  'Lesser Mark of Cain': {
    type: 'passive',
    summary: 'Goetic Ability. Tiene la keyword -1 INJURY DICE.',
  },
  'Coveted Position': {
    type: 'action',
    summary: 'Goetic Spell (Cost 2). Cast Spell ACTION: intercambia su posición con un modelo (amigo o enemigo) a 12" en Line of Sight y a más de 1" de otros modelos (centro de base por centro de base). Si no es posible, nadie se mueve. Puede lanzarlo a 1" de un enemigo sin sufrir su ataque.',
  },
  'Envious Eyes': {
    type: 'passive',
    summary: 'Goetic Ability. Puedes comprarle 1 pieza de Battlekit de las armerías de New Antioch, Trench Pilgrims o Iron Sultanate (con sus estipulaciones). No se vende ni se reasigna; se puede recomprar si se pierde.',
  },
  'What is Yours is Mine': {
    type: 'action',
    summary: 'Goetic Spell (Cost 1). Cast Spell ACTION: quita 1 BLOOD MARKER o BLESSING MARKER de un modelo en Line of Sight (amigo o enemigo) y ponlo junto al lanzador.',
  },
  'Call of the Flesh': {
    type: 'action',
    summary: 'Goetic Spell (Cost 2). Cast Spell ACTION: su activación termina y el siguiente modelo que active el rival debe empezar con Move, Charge o Retreat (se levanta si está Down) y acabar lo más cerca posible del lanzador (Retreat si está a 1" de un enemigo, Charge si está a 12"), cruzando lo que haga falta. Ese turno no puede atacar al lanzador.',
  },
  'Exquisite Pain': {
    type: 'action',
    summary: 'Goetic Spell (Cost 1-2). Cast Spell ACTION: pon los BLOOD MARKERS pagados junto a un modelo en Line of Sight (amigo o enemigo).',
  },
  'Forbidden Pleasures': {
    type: 'passive',
    summary: 'Goetic Ability. Antes del despliegue, por cada modelo con esta habilidad, elige un modelo de tu banda sin DEMONIC y ponle 3 BLOOD MARKERS.',
  },
  'Light of Samael': {
    type: 'action',
    summary: 'Goetic Spell (Cost 2). Cast Spell ACTION: Injury Roll a un enemigo a 24" en Line of Sight; si su base es de 32mm o menos, retrocede D6" en línea recta alejándose del lanzador.',
  },
  'Proud Defiance': {
    type: 'passive',
    summary: 'Goetic Ability. La banda no hace Morale Checks mientras tenga en el campo al menos 1 modelo con esta habilidad.',
  },
  'Too Proud to Fall': {
    type: 'action',
    summary: 'Goetic Spell (Cost 2). Justo después de quedar Down: ignora el Down y sigue en pie (el resto de efectos de la Injury Roll se aplican).',
  },
  'Charm of Acedia': {
    type: 'action',
    summary: 'Goetic Spell (Cost 1). Cast Spell ACTION: si la siguiente ACTION de esta activación requiere Success Rolls o Risky Success Rolls, la primera es un Success automático.',
  },
  'Daemonium Meridianum': {
    type: 'passive',
    summary: 'Goetic Ability. Los enemigos tratan el terreno Open o Dangerous a 6" o menos como DIFFICULT TERRAIN.',
  },
  'Morphean Mind': {
    type: 'passive',
    summary: 'Goetic Ability. El rival no puede gastar más de 1 BLOOD MARKER para añadir -1 DICE a sus Success Rolls.',
  },
  'Belly of the Beast': {
    type: 'passive',
    summary: 'Goetic Ability. Si un Melee Attack contra él le pone al menos 1 BLOOD MARKER, pon 1 BLOOD MARKER al atacante.',
  },
  'Eater of the Flesh': {
    type: 'passive',
    summary: 'Goetic Ability. Tras un Melee Attack suyo, quítale 1 BLOOD MARKER por cada uno que ponga al objetivo (no contra BLACK GRAIL ni DEMONIC).',
  },
  'Uncaring Gluttony': {
    type: 'action',
    summary: 'Goetic Spell (Cost 2). Cast Spell ACTION: elige un enemigo no activado este turno y una pieza de Equipment suya (no CONSUMABLE; DEPLOYABLE solo a 1"): queda inutilizable el resto de la partida.',
  },
  'Black Heart': {
    type: 'action',
    summary: 'Goetic Spell (Cost 1). Antes de una Success Roll o Risky Success Roll del lanzador: +1 DICE. Como cualquier hechizo, no se lanza más de una vez por activación; fuera de tu activación sí puedes usarlo en cada Success Roll o Risky Success Roll (Rules Commentaries, The Court Q2).',
  },
  'Body of Gold': {
    type: 'passive',
    summary: 'Goetic Ability. Tiene GOLEM; pierde TOUGH y no puede ganarlo por ningún medio.',
  },
  'Greedy Hearts': {
    type: 'passive',
    summary: 'Goetic Ability. Tras el despliegue, pon 1 BLESSING MARKER junto a él por cada enemigo que valga 150 👑 o más (con su Battlekit).',
  },
  'Aura of Wrath': {
    type: 'passive',
    summary: 'Demonic Aura del Desecrated Saint (Sin of Wrath): +1 DICE a los Melee Attacks y a la Risky Success Roll de Dash de los modelos amigos a 8" (incluido el Saint).',
  },
  'Aura of Envy': {
    type: 'passive',
    summary: 'Demonic Aura del Desecrated Saint (Sin of Envy): Los enemigos a 12" no pueden cargar a un modelo de su banda que esté a 1" de un modelo de la banda del que carga (pueden rodearlos).',
  },
  'Aura of Lust': {
    type: 'passive',
    summary: 'Demonic Aura del Desecrated Saint (Sin of Lust): Puedes anular las keywords y reglas de la armadura (sin IMPERVIOUS) de los enemigos a 4" mientras sigan ahí, salvo las que afectan a la base.',
  },
  'Aura of Pride': {
    type: 'passive',
    summary: 'Demonic Aura del Desecrated Saint (Sin of Pride): Al terminar su activación, pon 1 BLOOD MARKER a cada enemigo a 8".',
  },
  'Aura of Sloth': {
    type: 'passive',
    summary: 'Demonic Aura del Desecrated Saint (Sin of Sloth): Los enemigos a 8" tratan Minor Hit como Down (también los que normalmente tratan Down como Minor Hit, p. ej. Machine Armour).',
  },
  'Aura of Gluttony': {
    type: 'passive',
    summary: 'Demonic Aura del Desecrated Saint (Sin of Gluttony): -1 DICE a las tiradas de los enemigos a 8", salvo BLACK GRAIL o ARTIFICIAL.',
  },
  'Aura of Greed': {
    type: 'passive',
    summary: 'Demonic Aura del Desecrated Saint (Sin of Greed): Los enemigos a 12" que cargan deben cargar al Saint si está a 12", en Line of Sight y alcanzable sin Dangerous terrain, Climb, Jump, Jump Down ni Diving Charge.',
  },
  'Four Paws': {
    type: 'passive',
    summary: '+1 DICE a Dash y a Jump o Diving Charge. No puede trepar superficies verticales.',
  },
  'Guard Dog': {
    type: 'passive',
    summary: 'Ningún INFILTRATOR puede desplegar a 12" o menos; puede cargar a cualquier enemigo a 4" aunque no lo vea.',
  },
  'Mercy Dog': {
    type: 'passive',
    summary: 'Lleva un Medi-kit que cualquier modelo amigo a 1" puede usar sobre sí mismo. Puede arrastrar a un modelo Down a 1" (base menor de 40mm) al moverse o hacer Dash, a la mitad de velocidad; si así sale del cuerpo a cuerpo, no provoca ataque gratuito.',
  },
  'Dog Grenades': {
    type: 'passive',
    summary: 'Cualquier otro modelo de la banda (no Aliados, Mercenarios, Combat Medic ni otros perros) a 1" del perro durante su activación puede usar sus Grenades.',
  },
  'Atonement Bell': {
    type: 'passive',
    summary: 'Ocupa una mano en cuerpo a cuerpo (no a distancia). Ataque Off-Hand sin daño: el enemigo impactado (base de 40mm o menor) se desplaza D3" en la dirección que elija el Communicant; puede sacarlo del cuerpo a cuerpo (ataques gratuitos), hacerle caer o meterlo en terreno peligroso, pero no llevarlo a otro combate.',
  },
  'Strength through Pain': {
    type: 'passive',
    summary: '+1 DICE a su Melee por cada BLOOD MARKER que tenga.',
  },
  'Undead Fortitude': {
    type: 'passive',
    summary: 'Añade -1 INJURY DICE a las tiradas de lesión contra este modelo, salvo si el ataque tiene la keyword FIRE.',
  },
  'Cadre of Flesh': {
    type: 'passive',
    summary: 'Si la Matagot Hag recibe un ataque con un Ravenous amigo a 3", ese Ravenous puede recibirlo en su lugar (Injury Roll para él). Con BLAST, la Injury Roll de la Hag se hace antes que la del resto.',
  },
  'Frenzied Followers': {
    type: 'passive',
    summary: '+1 DICE a la Risky Success Roll de Dash de los modelos amigos a 8" de la Matagot Hag.',
  },
  "Mother's Call ACTION": {
    type: 'action',
    summary: 'Quita INFECTION MARKERS de modelos (amigos o enemigos) a 18". Por cada uno, un Ravenous a 8" cumple una orden (máx. 1 por turno, no impide activarlo): Feast (Ravenous Infection ACTION; con Success, 1 INFECTION MARKER extra), Fight (Melee Attack con +1 DICE) o Follow (mueve, sin Charge ni Retreat).',
  },
  'Pestilent': {
    type: 'passive',
    summary: 'Hace Melee Attacks con INFECTION MARKERS y CRITICAL sin arma. Si pone INFECTION MARKERS, pone 1 más.',
  },
  'Gluttonous Horde': {
    type: 'passive',
    summary: 'Hace Melee Attacks con CRITICAL sin arma, con +1 DICE por cada otro modelo amigo a 3" del atacante.',
  },
  'Ravenous Infection ACTION': {
    type: 'action',
    summary: 'Risky Success Roll; si falla, su activación termina. Con Success o Critical, pon 1 INFECTION MARKER a otro modelo a 1"; después su activación termina.',
  },
  'More Worm Than Man': {
    type: 'passive',
    summary: 'El rival no puede gastar los INFECTION MARKERS de un Desiccated Husk salvo para convertir una Injury Roll en Bloodbath Roll.',
  },
  'Dormant Hunger': {
    type: 'passive',
    summary: 'Una vez por turno, en vez de quedar Out of Action queda latente: quita sus INFECTION MARKERS y cámbiala por un marcador de 60mm (Impassable). Si un Ravenous amigo termina un movimiento a 1", retira marcador y Ravenous y vuelve la Gula Down. Latente cuenta como Out of Action para Morale y Trauma; el Ravenous usado muere.',
  },
  'Gnashing and Tearing': {
    type: 'passive',
    summary: 'Hace Melee Attacks con +1 INJURY DICE, INFECTION MARKERS y CLEAVE 2 sin arma; CLEAVE 3 si cargó en esa activación.',
  },
  'Plague-Ridden Flesh': {
    type: 'passive',
    summary: '-2 INJURY DICE a las Injury Rolls contra ella salvo ataques con FIRE.',
  },
  'Unholy Gut': {
    type: 'passive',
    summary: 'Puede llevar el arma Vomitus por 40 👑; no se puede perder ni retirar.',
  },
  'Vomitus': {
    type: 'passive',
    summary: 'Special, 8", +1 INJURY MODIFIER, ASSAULT, INFECTION MARKERS. Sin Success Roll: línea recta de 8" (se corta en terreno más alto que el atacante) e Injury Roll a cada modelo que toque. Vile Ferment: quitando 2 INFECTION MARKERS de la Gula, +1 INJURY MODIFIER.',
  },
  'Devour ACTION': {
    type: 'action',
    summary: 'Melee Attack sin arma con CRITICAL contra un enemigo a 1". Si no lo deja Out of Action, pon 1 BLOOD MARKER al atacante.',
  },
  'Grasp ACTION': {
    type: 'action',
    summary: 'Risky Success Roll; si falla, su activación termina. Con Success o Critical, arrastra 3" en línea recta hacia él a un enemigo a 12" en Line of Sight (puede hacerle saltar, entrar a 1" de un enemigo o retirarse sin ataques de huida). Se detiene ante modelos, terreno Difficult, Dangerous o Impassable, o terreno que exija Climb o Jump.',
  },
  'Lockjaw Bite': {
    type: 'passive',
    summary: 'Cuando un enemigo hace Retreat a 1" de este modelo, ponle 1 INFECTION MARKER antes de los ataques de huida.',
  },
  'Papillal Hide': {
    type: 'passive',
    summary: 'No necesita Line of Sight al objetivo para cargar (el resto de restricciones sigue).',
  },
  'Rotten Cutters': {
    type: 'passive',
    summary: 'Sus Melee Attacks tienen CLEAVE 2.',
  },
  'Unending Starvation': {
    type: 'passive',
    summary: '+1" a su Movement.',
  },
  'Butcher King': {
    type: 'passive',
    summary: 'Al final de la batalla, si no está Out of Action y dejó Out of Action a un enemigo con un Melee Attack, ganas 1 ☼.',
  },
  'Knight Companion of the Feast': {
    type: 'passive',
    summary: '+1 DICE a la Risky Success Roll de Ravenous Infection ACTION de los modelos amigos a 3".',
  },
  'Knight of Twin Cleavers': {
    type: 'passive',
    summary: 'IGNORE OFF-HAND WEAPON y sus Melee Attacks tienen SHRAPNEL.',
  },
  'Plague Knight Ranks': {
    type: 'campaign',
    summary: 'Cada Plague Knight puede tener uno de estos rangos. Plague Almoner (10 👑): las Bloodbath Rolls de sus ataques cuestan 1 marcador menos. Knight Companion of the Fly (5 👑): +1 DICE a su Ranged o a su Melee. Knight of the Rotten Cross (5 👑, Limit: 1): puede comprar 1 arma a distancia o cuerpo a cuerpo de las armerías de New Antioch o Heretic Legions (no se vende ni se reasigna).',
  },
  'Black Grail Bodyguard': {
    type: 'passive',
    summary: 'Si un BLACK GRAIL amigo a 1" del Corpse Guard recibe un ataque a distancia o cuerpo a cuerpo, el Corpse Guard puede recibir el impacto en su lugar (haz la tirada de Injury contra el Corpse Guard). No funciona contra ataques con la keyword BLAST.',
  },
  'Parasite Host': {
    type: 'passive',
    summary: 'Cuando un ataque cuerpo a cuerpo del Corpse Guard coloca BLOOD MARKERS o INFECTION MARKERS en el objetivo, puedes retirar hasta 1 BLOOD MARKER o INFECTION MARKER del propio Corpse Guard.',
  },
  'Absorb': {
    type: 'passive',
    summary: 'Cuando un modelo (amigo o enemigo) a 1" del Amalgam queda Out of Action, puedes quitar 1 BLOOD MARKER del Amalgam. Si era de base 40mm o mayor y el Amalgam ya usó TOUGH, puede volver a usarlo.',
  },
  'Corpulent': {
    type: 'passive',
    summary: '-2 INJURY DICE a las Injury Rolls de cualquier ataque contra el Amalgam.',
  },
  'Curse on Creation': {
    type: 'passive',
    summary: 'Campaña: si el resto de la banda vale 1000 👑 o más, en un Promotion Step puedes quitar 6 Grail Thralls de la hoja para subir el límite de Amalgams a 0-2 y reclutar uno gratis.',
  },
  'Unstoppable': {
    type: 'passive',
    summary: 'Los enemigos de base 32mm o menor no pueden hacer Melee Attack cuando el Amalgam se retira a 1" de ellos. Puede tomar Move o Charge si todos los enemigos a 1" son de base 32mm o menor.',
  },
  'Bombardment Horde': {
    type: 'passive',
    summary: 'Vile Corpus: Ranged +1 DICE y Melee +0 DICE. Al tomar Shoot con el Gluttonous Arsenal puede cambiar AUTOMATIC 3 por BLAST 3" y SCATTER.',
  },
  'Burst ACTION': {
    type: 'action',
    summary: 'Bolgias Gut: todos los modelos (amigos o enemigos) a 3" y en Line of Sight reciben un Ranged Attack con -1 INJURY DICE, GAS e INFECTION MARKERS; después el modelo queda Out of Action. También puede explotar interrumpiendo la activación de un enemigo que termina un movimiento a 3".',
  },
  'Leech Grip': {
    type: 'passive',
    summary: 'Cuando un enemigo hace Retreat a 1" de este modelo, pon 1 BLOOD MARKER junto al que se retira (antes de los Melee Attacks contra él).',
  },
  'Tapeworm Throng': {
    type: 'passive',
    summary: '-1 DICE a los Ranged Attacks contra este modelo si está a Short Range del atacante. Sin efecto si el modelo tiene NEGATE FEAR.',
  },
  'Overwhelming Horde': {
    type: 'passive',
    summary: 'Un Grail Thrall o Fly Thrall puede hacer ataques cuerpo a cuerpo aunque no tenga arma cuerpo a cuerpo. Además suma +1 DICE al Success Roll de sus ataques cuerpo a cuerpo por cada otro modelo amigo a 3" o menos del atacante.',
  },
  'Disease Carrier': {
    type: 'passive',
    summary: 'Si un modelo enemigo se activa estando a 1" o menos de este modelo, pon 1 INFECTION MARKER junto a él antes de que haga ninguna ACTION.',
  },
  'Frightening Speed': {
    type: 'passive',
    summary: '+1 DICE a la Risky Success Roll de su Dash ACTION. Además, su Movement no se reduce a la mitad al levantarse al inicio de una activación.',
  },
  'Infected Proboscis': {
    type: 'passive',
    summary: 'El Herald de Beelzebub puede hacer un ataque cuerpo a cuerpo con la keyword INFECTION MARKERS aunque no tenga arma. Si el ataque coloca algún INFECTION MARKER en el objetivo, retira hasta 1 BLOOD MARKER del propio Herald.',
  },
  'Maddening Buzzing': {
    type: 'passive',
    summary: 'Hasta 1 Herald of Beelzebub puede tenerla por +10 👑. Las Success Rolls de los enemigos a 8" o menos se convierten en Risky Success Rolls (sin efecto extra si ya lo eran).',
  },
  'Six-armed Monstrosity': {
    type: 'passive',
    summary: 'Puede hacer 1 Shoot ACTION por activación con cada arma a distancia equipada y 1 Fight ACTION con cada arma cuerpo a cuerpo. El modificador Off-Hand no se aplica a sus ataques cuerpo a cuerpo.',
  },

  // ----- Court of Serpent -----
  'Goetic Powers': {
    type: 'passive',
    summary: 'Los modelos ELITE de una banda de la Court of the Seven-Headed Serpent pueden tener Goetic Powers (el número figura en su Warband Entry). Se dividen en Goetic Abilities y Goetic Spells; ver la Goetic Powers List.',
  },
  'Law of Hell': {
    type: 'passive',
    summary: 'Si un ataque de un Wretched deja Out of Action a un enemigo con la keyword ELITE, el Wretched gana su libertad: se retira de la partida, deja de contar para los Morale Checks y sale de la hoja de banda.',
  },
  'Poison Stingers': {
    type: 'passive',
    summary: 'El Pit Locust puede hacer un ataque cuerpo a cuerpo con CLEAVE 2 y SHRAPNEL aunque no tenga arma cuerpo a cuerpo equipada.',
  },
  'Hateful': {
    type: 'passive',
    summary: 'Cuando un Yoke Fiend se activa: si está a más de 1" de cualquier enemigo y hay un enemigo no-BLACK GRAIL ni DEMONIC a 12" o menos en línea de visión, debe hacer un Charge ACTION contra el enemigo más cercano. Si estaba Down, se levanta y carga.',
  },
  'Torturer': {
    type: 'passive',
    summary: 'Cuando un Yoke Fiend hace un ataque cuerpo a cuerpo, puede atacar a un modelo amigo no-DEMONIC. Si lo hace, no puede atacar de nuevo en la misma Activación.',
  },
  'Annihilator': {
    type: 'passive',
    summary: 'Un Desecrated Saint puede hacer 1 Fight ACTION por Activación con cada arma cuerpo a cuerpo equipada (puede tener hasta 3 a 1 mano, o 2 a 1 mano + 1 a 2 manos).',
  },
  'Demonic Aura': {
    type: 'passive',
    summary: 'Según el Pecado de la banda. Wrath: +1 DICE a ataques cuerpo a cuerpo y a la Risky de Dash de amigos a 8" (incluido él). Envy: los enemigos a 12" no pueden cargar a un modelo de su banda que esté a 1" de un modelo de la banda del que carga. Lust: a enemigos a 4" con Armour no IMPERVIOUS puedes anularles keywords y reglas de esa armadura (salvo las del tamaño de base). Pride: al terminar su activación, 1 BLOOD MARKER a cada enemigo a 8". Sloth: los enemigos a 8" tratan los Minor Hit como Down. Gluttony: -1 DICE a las tiradas de enemigos a 8" salvo BLACK GRAIL o ARTIFICIAL. Greed: los enemigos a 12" que carguen deben cargarle si está a 12", en su Line of Sight y alcanzable sin terreno Dangerous ni Climb, Jump, Jump Down o Diving Charge.',
  },

  // ----- Mercenaries -----
  'Mercenary': {
    type: 'campaign',
    summary: 'Se pagan con Glory Points. No se benefician de las reglas especiales de facción ni de variante que hablan de «modelos de una banda [Facción]» (p. ej. Concentrated Attack de New Antioch o Light Infantry de Éire), pero cuentan como amigos para las demás reglas de la banda (p. ej. Bagpipes de Alba). En campaña cuentan como cualquier otro modelo: Threshold y Field Strength, Glorious Deeds, Trauma si son ELITE, ascensos y experiencia. Su Battlekit no se puede quitar ni perder y no pueden tener otro; la armadura ya va en su perfil.',
  },
  'Battlefield Vivisection': {
    type: 'campaign',
    summary: 'Mientras el Combat Biologist esté en la banda, añade la Glorious Deed "Gather Knowledge" a los disponibles cada partida.',
  },
  'Gather Knowledge': {
    type: 'campaign',
    summary: 'Glorious Deed: completada si 3+ enemigos quedan Out of Action a 1" o menos de un Combat Biologist amigo.',
  },
  'Prize Specimens': {
    type: 'passive',
    summary: 'Cuando el Combat Biologist deja Out of Action a un enemigo DEMONIC o BLACK GRAIL en cuerpo a cuerpo, gana 1 BLESSING MARKER.',
  },
  'Iron Fists': {
    type: 'passive',
    summary: 'Puede hacer ataque cuerpo a cuerpo con CLEAVE 2 sin arma. Aplica modificador de Off-Hand al segundo ataque.',
  },
  'Barbed Embrace': {
    type: 'passive',
    summary: 'Los enemigos a 1" del Goetic Warlock no pueden hacer Retreat ACTION. Además, pon 1 BLOOD MARKER junto a cada enemigo que se activa a 1" de él.',
  },
  'Goetic Portal': {
    type: 'action',
    summary: 'Goetic Spell (Cost 2), solo Goetic Warlock; el Warlock usa Goetic Powers pero solo paga con BLOOD MARKERS de enemigos o de Wretched amigos. Cast Spell ACTION: redespliega al Warlock a 6" o menos de donde estaba (de centro a centro; no cuenta como Move ni Retreat). Si estaba a 1" de enemigos de base 32mm o menor, puede llevarse uno y desplegarlo a 1" de él (si no cabe, se queda donde estaba; puede quedar a punto de caer).',
  },
  'Automaton Destrier': {
    type: 'passive',
    summary: 'Puede desplegarse como Infiltrator: tras los Infiltrators normales, hasta 1" del borde y a más de 8" de enemigos.',
  },
  'Martial Prowess': {
    type: 'passive',
    summary: 'Greatsword sin HEAVY. Jezzail con ASSAULT y Shield Combo.',
  },
  'Sworn Brethren': {
    type: 'campaign',
    summary: 'Al reclutar un Mamluk Faris puedes formar un FIRETEAM con 1 modelo ELITE de tu banda (ambos ganan FIRETEAM). Es adicional a los demás Fireteams; si el compañero es de New Antioch, solo él puede usar Concentrated Attack.',
  },
  'Ammunition Sacrament ACTION': {
    type: 'action',
    summary: 'Risky Success Roll. Si falla, la activación termina. Con Success o Critical, elige 1 amigo a 1" y en Line of Sight y un Sacramento, que dura hasta el final de su siguiente activación (un modelo solo puede tener un Sacramento a la vez): Bullet of the Guided Path (IGNORE COVER e IGNORE LONG RANGE en sus ataques con armas a distancia), Cartridge of his Wrath (BLAST 2" y SHRAPNEL a sus armas a distancia sin AUTOMATIC, BLAST, HEAVY ni FLAMETHROWER) o Echo of his Word (+1 INJURY DICE a sus ataques a distancia).',
  },
  'Eye of God': {
    type: 'passive',
    summary: 'Puedes repetir las Success Rolls y Risky Success Rolls fallidas del Observer. Si algún dado repetido saca 1, la tirada es Failure, el Observer queda Down y su activación termina.',
  },
  'Lightning Speed': {
    type: 'passive',
    summary: 'El Polearm del Observer tiene CLEAVE 2.',
  },
  'Temporal Fugue': {
    type: 'passive',
    summary: '-1 DICE a tiradas de ataque (cuerpo a cuerpo y distancia) que tengan al Observer como objetivo.',
  },
  'Voice of God ACTION': {
    type: 'action',
    summary: 'Risky Success Roll. Si falla, la activación del Observer termina. Con Success o Critical, elige 1 modelo (amigo o enemigo) en cualquier parte que no se haya activado este turno: la activación del Observer termina y la de ese modelo empieza de inmediato.',
  },
  'Necrotic Gaze': {
    type: 'action',
    summary: 'Goetic Spell (Cost 0), solo Goetic Warlock (paga solo con BLOOD MARKERS de enemigos o de Wretched amigos). Cast Spell ACTION: Ranged Attack a 24"; con Success o Critical no hay Injury Roll: dobla los BLOOD MARKERS del objetivo (máximo 6) o, si no tiene, pon 1.',
  },
  'Disturbing Presence': {
    type: 'passive',
    summary: 'Tu rival no puede quitar BLOOD MARKERS de sus modelos mientras estén a 1" de un Goetic Warlock.',
  },
  'Slow': {
    type: 'passive',
    summary: 'Trata el Movimiento del Scripture Guardian como 3"/Infantry al hacer Dash ACTION.',
  },
  'Devour the Guilty ACTION': {
    type: 'action',
    summary: 'Elige 1 modelo a 1" con base de 40mm o menos: si es enemigo, Risky Success Roll; si es amigo, Success Roll con +1 DICE. Si falla, la activación termina. Con éxito lo devora: se aparta con sus MARKERS, no puede verse afectado ni hacer ACTIONS, sus BLOOD MARKERS pueden pagar Goetic Spells y cuenta como Down para los Morale Checks. Solo 1 devorado a la vez; mientras lo tenga, el Sin Eater tiene REGENERATE 1. Si el Sin Eater sufre un Out of Action en la Injury table (aunque TOUGH lo deje en Down), despliega al devorado a 1" y Down (si no se puede, queda Out of Action). Al acabar la partida, el devorado cuenta como Out of Action. En cada activación del Sin Eater recibe 1 BLOOD MARKER; con 6 queda Out of Action (aunque tenga TOUGH). Purge ACTION: lo despliega a 1" y Down (si no cabe, sigue dentro; puede quedar a punto de caer) y no se puede volver a devorar en esa activación.',
  },
  'Dignified Conduct': {
    type: 'passive',
    summary: 'El Witchburner no puede hacer Dash ACTION, no divide su Movement al levantarse al empezar su activación y ninguna habilidad ni ACTION de un enemigo puede moverlo.',
  },
  'Elitist': {
    type: 'passive',
    summary: 'Los enemigos sin ELITE no pueden hacer Melee Attack cuando el Witchburner se retira a 1" de ellos. Puede hacer Move o Charge si ningún enemigo a 1" tiene ELITE.',
  },
  'Found Guilty': {
    type: 'passive',
    summary: 'Tras la Injury Roll de un ataque con Divine Judgement o Gavel of Justice, pon 1 BLOOD MARKER extra al modelo si es de una banda Fallen (aunque el resultado sea No Effect).',
  },
  'Divine Judgement ACTION': {
    type: 'action',
    summary: 'Ranged Attack a 18" con FIRE, IGNORE COVER e IGNORE LONG RANGE, sin necesidad de Line of Sight. Un resultado Out of Action en la Injury Table causado por este ataque cuenta como Down.',
  },

  /* ─── KEYWORDS CORE TC: el texto se sincroniza con KEYWORD_GLOSSARY ─── */
  'TOUGH': {
    type: 'keyword',
    summary: '−1 INJURY DICE a las tiradas de lesión contra este modelo.',
  },
  'STRONG': {
    type: 'keyword',
    summary: 'Tiene la keyword NEGATE HEAVY. Además puede equipar y usar un arma cuerpo a cuerpo de 2 manos como si fuera de 1 mano.',
  },
  'FEAR': {
    type: 'keyword',
    summary: 'Modelos enemigos que vayan a cargar/atacar a este modelo deben pasar un Risky Success Roll o pierden la acción.',
  },
  'INFILTRATOR': {
    type: 'keyword',
    summary: 'Despliegue avanzado: fuera de la Line of Sight enemiga y a 8" o más del enemigo más cercano, después de los modelos sin la keyword. Si no puede, hasta 6" fuera de su zona de despliegue.',
  },
  'LEADER': {
    type: 'keyword',
    summary: 'Modelos amigos a 6" pueden usar el Morale del Leader para Morale Checks. Bonus de mando.',
  },
  'ELITE': {
    type: 'tier',
    summary: '',  // sin desc por petición Marcos — ELITE es tier conocido.
  },
  'TROOPS': { type: 'tier', summary: '' },
  'MERCENARY': { type: 'tier', summary: '' },
  'ARTIFICIAL': {
    type: 'keyword',
    summary: 'Construcción/criatura artificial: inmune a FEAR, INFECTION MARKERS y efectos psicológicos.',
  },
  'SKIRMISHER': {
    type: 'keyword',
    summary: '+1" al stat Movement. Puede moverse a través de modelos amigos.',
  },
  'FLYING': {
    type: 'keyword',
    summary: 'Movimiento aéreo: ignora terreno y obstáculos en movimiento normal.',
  },

  /* ─── FACTION TAGS (sin desc canon, kind interno) ─── */
  'SULTANATE': { type: 'factionTag', summary: 'Modelo de la Sultanate of the Iron Wall.' },
  'HERETIC': { type: 'factionTag', summary: 'Modelo de las Heretic Legions.' },
  'NEW ANTIOCH': { type: 'factionTag', summary: 'Modelo de New Antioch.' },
  'PILGRIM': { type: 'factionTag', summary: 'Modelo de los Trench Pilgrims.' },
  'BLACK GRAIL': { type: 'factionTag', summary: 'Modelo del Cult of the Black Grail.' },
  'COURT': { type: 'factionTag', summary: 'Modelo de la Court of the Seven-Headed Serpent.' },
  'DEMONIC': { type: 'factionTag', summary: 'Modelo de origen demoníaco (Heretic, Black Grail, Court).' },
};


