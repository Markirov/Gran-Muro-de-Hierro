# Gran Compendio Maestro de Reglas, Habilidades y Términos — Trench Crusade (1.0.2)

> **Fuente Única de Verdad** que consolida absolutamente todas las reglas especiales, habilidades de miniatura, acciones tácticas, reglas de facción y variantes, y términos de juego. Todos los módulos, desarrolladores y jugadores leen de este documento.

---

## 1. Términos y Mecánicas Fundamentales del Sistema

| Término / Regla | Tipo | Definición y Mecánica Canónica |
|---|---|---|
| **Success Roll** | game-term | Tira 2D6; por cada +DICE añade un dado y quédate con los 2 más altos, por cada -DICE añade uno y quédate con los 2 más bajos (+DICE y -DICE se anulan por parejas). Suma los 2 dados: 2-6 Failure, 7-11 Success, 12+ Critical Success. |
| **Risky Success Roll** | game-term | Se tira igual que una Success Roll, pero si es una Failure la activación del modelo termina inmediatamente. Si se hacía como parte de una ACTION fuera de su activación, esa ACTION termina. |
| **Critical Success** | game-term | Resultado de 12+ en una Success Roll. En un ataque, impacta y la Injury Roll recibe +1 INJURY DICE (las armas con CRITICAL tienen efectos extra según su keyword). |
| **Bloodbath Roll** | game-term | Al hacer una Injury Roll contra un enemigo puedes gastar 6 BLOOD MARKERS del objetivo (3 si está Down) para convertirla en Bloodbath Roll: tira 3D6 y suma los 3 (con INJURY DICE te quedas con los 3 más altos o más bajos). Con DEADLY, 4D6. |
| **Charge Bonus** | game-term | Al cargar, tira D6 y súmalo al Movement del modelo, hasta un máximo de 12". Un modelo que se levanta de Down lo tiene a la mitad; con Machine Armour (Bulky) es D3. |
| **Injury Roll** | game-term | Tira 2D6 con los +/- INJURY DICE (2 más altos o más bajos), suma los dados y aplica los INJURY MODIFIERS (máximo -3 en total). Tabla: 1 o menos No Effect; 2-6 Minor Hit (1 BLOOD MARKER); 7-8 Down (1 BLOOD MARKER, 2 si ya estaba Down); 9+ Out of Action. Modificadores habituales: +1 INJURY DICE por BLOOD MARKER gastado, -1 por BLESSING MARKER gastado, +1 por Critical Success, +1 en melee contra un Down, y la armadura del modelo. |
| **BLOOD MARKER** | marker | Se coloca 1 junto a un modelo cada vez que sufre una herida (máximo 6). Cuando tiras una Success Roll para ese modelo, tu rival puede gastar los que quiera: -1 DICE por marcador gastado. O, cuando tu rival hace una Injury Roll contra él, puede gastarlos: +1 INJURY DICE por marcador. Los marcadores gastados se retiran. |
| **BLESSING MARKER** | marker | Funciona como un BLOOD MARKER pero a tu favor (máximo 6). Al tirar una Success Roll para el modelo puedes gastar los que quieras: +1 DICE por marcador. O, cuando el rival hace una Injury Roll contra él, puedes gastarlos: -1 INJURY DICE por marcador. Los marcadores gastados se retiran. |
| **INFECTION MARKER** | marker | Funciona como un BLOOD MARKER (se gasta para modificar Success Rolls e Injury Rolls o para una Bloodbath Roll, y se puede combinar con BLOOD MARKERS). Un modelo puede tener hasta 6 de cada. Las reglas que retiran BLOOD MARKERS no retiran INFECTION MARKERS salvo que lo digan. The Infection Spreads: si un modelo con INFECTION MARKERS se activa, recibe 1 más antes de hacer ninguna ACTION. |
| **MINED** | tag | Pieza de terreno minada. Cuando un modelo se mueve hasta tocarla (sin tener NEGATE MINED), detona automáticamente: tirada de Injury con SHRAPNEL contra el modelo. Combat Engineers pueden colocar y desactivar MINED. |
| **Out of Action** | game-term | Resultado 9+ en la Injury Roll: el modelo se retira del campo de batalla. En campaña, tras la partida: los Troops hacen una Survival Roll (D6; con 1-2 mueren y salen del Roster) y los ELITE tiran D66 en la Trauma Table y reciben una Battle Scar (a la tercera, Unfit for Duty). |
| **Down** | game-term | Resultado 7-8 en la Injury Roll: 1 BLOOD MARKER y el modelo queda Down. Si le pasa durante su activación, esta termina. -1 DICE a sus Success Rolls; +1 INJURY DICE a los ataques cuerpo a cuerpo contra él; no puede moverse salvo si cae. Se levanta en su siguiente activación con el Movement a la mitad (también el Charge Bonus). |
| **Activation** | game-term | Los jugadores activan por turnos un modelo que no se haya activado, hasta activarlos todos. El modelo activado puede hacer cada ACTION una vez, en cualquier orden: Move, Charge o Retreat (solo una de las tres); Dash; Shoot; Fight; y otras ACTIONS propias. No puede Shoot y Charge/Fight en la misma activación salvo con un arma ASSAULT. |
| **Treat ACTION** | game-term | La concede el Medi-kit. Risky Success Roll: con Failure la activación termina; con Success o Critical Success, retira 1 BLOOD MARKER del modelo o de un amigo a 1", o levanta a un amigo Down a 1". |
| **Dash ACTION** | game-term | Se puede hacer además de un Move, Charge o Retreat. Tras una Risky Success Roll superada, el modelo mueve su Movement en cualquier dirección (no puede cargar ni retirarse); si falla, su activación termina. |
| **Standfast** | effect | Regla de la Machine Armour (y del Tank Palanquin): cuando el modelo sufre un resultado Down en la Injury Roll, se trata como Minor Hit. |
| **Bulky** | effect | Regla de la Machine Armour: la base pasa a 40mm salvo que ya sea de 40mm o mayor, no puede llevar Trench Shield y su Charge Bonus es D3" en vez de D6". |

---

## 2. Habilidades de Miniaturas y Acciones Tácticas

| Habilidad / Acción | Tipo | Poseída por | Efecto / Regla Canónica |
|---|---|---|---|
| **Hold Your Fire! ACTION** | action | Lieutenant (Principality of New Antioch) | Elige 1 enemigo en Line of Sight del Lieutenant que el rival pueda activar. La activación del Lieutenant termina y el rival debe activar ese modelo. |
| **Absolute Faith** | passive | Sniper Priests (Principality of New Antioch) | El oponente no puede gastar BLOOD MARKERS para añadir -DICE a un ataque a distancia de un Sniper Priest. |
| **Aim ACTION** | action | Sniper Priests (Principality of New Antioch) | Risky Success Roll +2 DICE. Si tiene éxito: +2 DICE a las tiradas de ataque a distancia durante el resto de la Activación. |
| **God is With Us! ACTION** | action | Trench Cleric (Principality of New Antioch), Holy Warrior (Principality of New Antioch) | Risky Success Roll. Si falla, no pasa nada y la activación del Trench Cleric termina. Con Success o Critical, pon 1 BLESSING MARKER junto al Trench Cleric o a un modelo amigo a 6" o menos. |
| **Onward Christian Soldiers!** | passive | Trench Cleric (Principality of New Antioch), Holy Warrior (Principality of New Antioch) | Modelos NEW ANTIOCH amigos a 8" del Trench Cleric ganan NEGATE FEAR. |
| **Trench Moles** | passive | Varias / Especial | Hasta 2 Yeomen pueden ser Trench Moles con la keyword INFILTRATOR por +10 👑 cada uno. Puedes tener un 3.º si el resto de la banda (con su Battlekit) suma 1.000 👑 o más. |
| **Assault Drill** | passive | Shock Troopers (Principality of New Antioch) | Ignoran HEAVY en 1 arma cuerpo a cuerpo. Aún limitados a 1 arma HEAVY total. |
| **Shock Charge** | passive | Shock Troopers (Principality of New Antioch) | Al tirar el Charge Bonus, lanza 1 D6 extra y usa el más alto. |
| **Battlefield Demolition** | passive | Combat Engineers (Principality of New Antioch) | Ignoran HEAVY para 1 Satchel Charge. Aún limitados a 1 arma HEAVY total. |
| **Set Mine ACTION** | action | Combat Engineers (Principality of New Antioch) | En contacto con una pieza de terreno de hasta 8"x8" sin MINED: Success Roll con +2 DICE. Si falla, no pasa nada; con Success o Critical, la pieza gana la keyword MINED. |
| **Defuse Mine** | passive | Combat Engineers (Principality of New Antioch), Sultanate Sappers (Sultanate of the Iron Wall) | Al mover el modelo a contacto con un Marker o terreno MINED puede intentar desactivarlo: Risky Success Roll. Si falla, la mina detona y su activación termina; con Success o Critical no detona y pierde MINED. El modelo que puso la mina la desactiva sin tirar. |
| **Fortify ACTION** | action | Combat Engineers (Principality of New Antioch) | Risky Success Roll. Si falla, la activación termina. Con Success o Critical, el modelo tiene la keyword COVER hasta que se mueva de su posición. |
| **Expert Medic** | passive | Combat Medic (Principality of New Antioch), Sister of Saint Cosmas (Mercenarios) | +2 DICE al Risky Success Roll cuando usa el Medi-kit en un Treat ACTION. |
| **Finish the Fallen** | passive | Combat Medic (Principality of New Antioch), Sister of Saint Cosmas (Mercenarios) | +1 INJURY DICE en ataques cuerpo a cuerpo si el objetivo está Down y no es BLACK GRAIL ni DEMONIC. |
| **Loudspeakers ACTION** | action | War Prophet (Trench Pilgrims) | Risky Success Roll con +2 DICE. Si falla, la activación del War Prophet termina. Con Success o Critical, todos los modelos amigos a 8" o menos pueden moverse hasta 3", acabando lo más cerca posible del enemigo más cercano que vieran al empezar; si llegan a 1" de un enemigo cuentan como carga. Si no ven enemigos, se mueven libremente. |
| **Laying on of Hands ACTION** | action | War Prophet (Trench Pilgrims) | El War Prophet hace Success Roll. Si tiene éxito: retira 1 BLOOD MARKER de un amigo a 6" o menos (3 si Critical Success). Puede usarse a sí mismo. |
| **Memento Mori** | passive | War Prophet (Trench Pilgrims) | La primera vez que el War Prophet sufra un resultado Out of Action en la tabla de Injury, se trata como No Effect en su lugar. El War Prophet no puede tener TOUGH. |
| **Bodyguard** | passive | Communicant (Trench Pilgrims) | Si un amigo del mismo grupo (PILGRIM, BLACK GRAIL, etc.) a 1" o menos recibe un Ranged o Melee Attack, este modelo puede recibir el impacto en su lugar (haz la tirada de Injury contra él). No funciona contra ataques con BLAST. |
| **The Communicant Cross** | passive | Communicant (Trench Pilgrims) | El Communicant lleva clavada una cruz sagrada en la cara. Cuenta con Iron Capirote (Headgear) y Gas Mask permanentes y gratuitos. No se pueden retirar ni perder. |
| **Enforced Orthodoxy ACTION** | action | Castigator (Trench Pilgrims) | Risky Success Roll con +1 DICE. Si falla, la activación del Castigator termina. Con Success o Critical, todos los modelos amigos Down a 8" o menos se levantan sin gastar movimiento. |
| **Resurrection** | campaign | Trench Pilgrim (Trench Pilgrims), Martyr Penitent (Trench Pilgrims) | Si un Trench Pilgrim muere tras una partida de campaña, puede resucitar en el siguiente Quartermaster Step como Martyr Penitent (perfil Martyr Penitent) por 45 👑. Conserva su Battlekit y Zealot Strength, pero pierde Scars, Experience y Advancements. Las Injury Rolls contra un Martyr Penitent tienen -1 INJURY DICE y las Martyrdom Pills no le afectan. No puede resucitar el que murió por Broken on the Wheel (Rules Commentaries, Trench Pilgrims Q1). |
| **Agile** | passive | Stigmatic Nuns (Trench Pilgrims) | +1 DICE a la Risky Success Roll cuando el modelo trepa (Climb), salta (Jump), hace una Diving Charge o una Dash ACTION. |
| **Trigger Martyrdom Device ACTION** | action | Varias / Especial | El Martyrdom Device detona (un solo uso): Injury Roll a todos los modelos a 3" (amigos y enemigos, incluido el Prisoner). La del Prisoner se hace con 4D6 sumando los 4 dados, y los demás a 1" suman +1 INJURY DICE. |
| **Awaited** | passive | Ecclesiastic Prisoners (Trench Pilgrims) | Un Ecclesiastic Prisoner que queda Out of Action al activarse su Martyrdom Device no cuenta para los Morale Checks de la banda. |
| **Broken on the Wheel** | campaign | Anchorite Shrine (Trench Pilgrims) | Al empezar cada partida, antes del despliegue, puedes romper en la rueda a 1 Trench Pilgrim o Ecclesiastic Prisoner: sale de la banda para siempre (en campaña su Battlekit puede pasar a otros en el siguiente Quartermaster Step). Hasta que el Anchorite Shrine sufra un Out of Action tiene Armour 0, no tiene NEGATE SHRAPNEL ni TOUGH y trata los Down como Minor Hit. Ese primer Out of Action cuenta como No Effect: se retiran sus BLOOD MARKERS y desde entonces tiene Armour -3, NEGATE SHRAPNEL y TOUGH (TOUGH se aplica al siguiente Out of Action). |
| **Symphony of Slaughter** | passive | Anchorite Shrine (Trench Pilgrims) | El Anchorite tiene 2 armas a 1 mano (Catherine Wheel + Bonebreaker Mace). En un Fight ACTION puede atacar 1 vez con cualquiera de las dos, o atacar 2 veces (primero Catherine Wheel, luego Bonebreaker Mace con el modificador Off-Hand). |
| **Iron Capirote** | passive | Ecclesiastic Prisoners (Trench Pilgrims) | Headgear con las keywords NEGATE FEAR y NEGATE SHRAPNEL. |
| **Mubarizun** | passive | Yüzbaşı (Sultanate of the Iron Wall) | Añade +1 INJURY DICE a los ataques del Yüzbaşı si el objetivo tiene la keyword TOUGH. |
| **Mastery of the Elements** | passive | Jabirean Alchemist (Sultanate of the Iron Wall) | Al desplegarlo por primera vez en la partida, puedes dar FIRE, GAS o SHRAPNEL (la misma) a todas sus armas a distancia y cuerpo a cuerpo. Elemental Change ACTION: Risky Success Roll; si falla, su activación termina; con Success o Critical cambias esa keyword por una de las otras dos. |
| **Temporal Assassin** | passive | Sultanate Assassin (Sultanate of the Iron Wall), Master Assassin (Sultanate of the Iron Wall) | Tras el Charge Bonus, si aún no ha hecho una Fight ACTION en su activación, puede elegir un segundo enemigo como objetivo de la carga. Carga al primero y hace una Fight ACTION; después se redespliega a 1" del segundo y hace otra Fight ACTION contra él, con la misma arma. No puede hacer más Fight ACTIONS en esa activación. |
| **Hallucinogen Disguise** | passive | Varias / Especial | Si se despliega con INFILTRATOR, debe hacerlo a 8" o más de cualquier enemigo pero ignora el resto de restricciones de INFILTRATOR (puede desplegar en Line of Sight enemiga, los Guard Dogs no le afectan, etc.). |
| **Mirage of Time** | passive | Varias / Especial | -1 DICE a la Success Roll de los ataques contra este Assassin. |
| **Secret Paths** | passive | Varias / Especial | Antes del despliegue puedes declarar que usa Secret Paths: no se despliega y no puede activarse en el turno 1. Desde el turno 2, al activarlo se despliega en contacto con cualquier borde del tablero a más de 8" de todos los enemigos y sigue su activación con normalidad. |
| **Thunderbolt of Alamut** | passive | Varias / Especial | +2" a su Movement y +1 DICE a la Risky Success Roll de su Dash ACTION. |
| **Whirling Dervish** | passive | Dervishes (Sultanate of the Iron Wall) | -1 DICE a la Success Roll de los Ranged Attacks contra un Dervish. |
| **Light Skirmishers** | passive | Varias / Especial | Cualquier número de Azebs puede tener la keyword SKIRMISHER por +5 👑 cada uno. |
| **Sapper Set Mine ACTION** | action | Sultanate Sappers (Sultanate of the Iron Wall) | En contacto con una pieza de terreno de hasta 8"x8" sin MINED: Success Roll con +2 DICE. Si falla, no pasa nada; con Success o Critical, la pieza gana la keyword MINED. |
| **Lion Agile** | passive | Lions of Jabir (Sultanate of the Iron Wall) | +1 DICE a la Risky Success Roll cuando el Lion of Jabir trepa (Climb), salta (Jump), hace una Diving Charge o una Dash ACTION. |
| **Teeth and Claws** | passive | Lions of Jabir (Sultanate of the Iron Wall), Hounds of the Black Grail (Cult of the Black Grail) | Puede hacer ataques cuerpo a cuerpo aunque no tenga arma de cuerpo a cuerpo equipada. |
| **Pin** | passive | Lions of Jabir (Sultanate of the Iron Wall) | Modelos enemigos en estado Down con base de 40mm o menos no pueden levantarse mientras un Lion of Jabir esté a 1" o menos (incluso si el Lion también está Down). |
| **Rapid Assault** | passive | Varias / Especial | +1 DICE a la Risky Success Roll cuando el modelo hace una Dash ACTION. (Athleticism, Stosstruppen of Prussia.) |
| **Day of His Wrath ACTION** | action | Varias / Especial | Risky Success Roll. Si falla, su activación termina. Con Success, Injury Roll con IGNORE ARMOUR a 1 enemigo a 3"; con Critical, además +1 INJURY DICE. (Sustituye a Laying on of Hands en el Cavalcade of the Tenth Plague.) |
| **Blessed Psalm ACTION** | action | Holy Warrior (Principality of New Antioch) | Quita 1 BLESSING MARKER del Holy Warrior y ponlo junto a un modelo amigo. No requiere Success Roll. |
| **Flanking** | passive | Varias / Especial | Al desplegarlo por primera vez, puede desplegarse en su zona o en contacto con cualquier borde del tablero a 8" o más de enemigos. Despliega antes que los INFILTRATOR y después del resto; si el escenario obliga a los INFILTRATOR a desplegar normalmente, este también. |
| **Chewa** | passive | Varias / Especial | +1 DICE a la Success Roll de sus Melee Attacks por cada otro modelo amigo a 1" del objetivo, hasta +2 DICE. |
| **Arise and be Healed! ACTION** | action | Holy Warrior (Principality of New Antioch) | Risky Success Roll. Si falla, no pasa nada y su activación termina. Con Success o Critical elige al Trench Cleric o a 1 amigo a 3": se levanta sin gastar movimiento y puedes retirarle hasta D3 BLOOD MARKERS y/o INFECTION MARKERS. |
| **Away Serpents! ACTION** | action | Varias / Especial | Elige 1 enemigo a 12" y haz una Risky Success Roll (-1 DICE si su base es de 40mm o más). Si falla, no pasa nada y su activación termina. Con Success o Critical, el enemigo queda Down. |
| **Pummelling Blows** | passive | Takwin Homunculus (Sultanate of the Iron Wall) | Un Takwin Homunculus puede hacer Melee Attacks aunque no tenga armas cuerpo a cuerpo. |
| **Re-creation** | passive | Takwin Homunculus (Sultanate of the Iron Wall) | Si el Takwin Homunculus muere en la secuencia de después de la partida, puedes pagar 40 👑 en el siguiente Quartermaster Step para dejarlo en el Roster. |
| **School of Medicine ACTION** | action | Varias / Especial | Success Roll con +1 DICE. Si falla, no pasa nada; con Success o Critical elige: retirar 2 BLOOD MARKERS o 1 INFECTION MARKER del Alchemist o de un amigo a 1", o levantar a un amigo Down a 1". (School of Medicine, House of Wisdom.) |
| **Cartography & Geometry** | passive | Varias / Especial | Al empezar la partida, antes del despliegue, elige hasta 2 modelos de la banda con base de 32mm o menos: tienen INFILTRATOR esa partida. |
| **Secrets of Takwin** | passive | Varias / Especial | Si el Alchemist recibe un impacto estando a 1" de su Takwin Homunculus, puedes aplicarlo al Homunculus y hacer la Injury Roll por él. |
| **Chemistry & Alchemy** | passive | Varias / Especial | Al empezar el primer turno, antes de activar modelos, coloca un Elemental Obstacle de hasta 2" x 6" a más de 1" de otros terrenos y a más de 6" de modelos. Tiene DIFFICULT TERRAIN y DANGEROUS TERRAIN (X); X es FIRE, GAS o SHRAPNEL, a tu elección. |
| **Philosophy, Poetry and Theology** | passive | Varias / Especial | +1 DICE a las Morale Checks de la banda mientras el Alchemist no esté Down ni Out of Action. Si la banda está Shaken, sus Success Rolls no pasan a ser Risky (aunque sigue comprobando si huye). Tiene NEGATE FEAR. |
| **Counter-Charge** | passive | Dervishes (Sultanate of the Iron Wall) | Si la primera ACCIÓN de la activación de este modelo es Charge, añade +1 DICE a sus ataques cuerpo a cuerpo durante el resto de la activación. |
| **Artificial Life** | passive | Lions of Jabir (Sultanate of the Iron Wall), Brazen Bull (Sultanate of the Iron Wall), Takwin Homunculus (Sultanate of the Iron Wall), War Wolf Assault Beast (Heretic Legions) | -1 INJURY DICE en tiradas de lesión contra este modelo. |
| **Mehterân** | passive | Janissaries (Sultanate of the Iron Wall), Janissary Officer (Sultanate of the Iron Wall), Fāris (Sultanate of the Iron Wall) | +1 DICE a la Risky Success Roll de un Dash ACTION si está a 4" o menos de un modelo amigo con Musical Instrument (+2 DICE en total con Fanfare). |
| **Living Battering Ram ACTION** | action | Brazen Bull (Sultanate of the Iron Wall) | Si termina una Charge ACTION a 1" o menos de enemigos, puede tomar esta ACTION: Success Roll por cada enemigo a 1" (-1 DICE si su base es de 40mm o más). Con Success o Critical, el enemigo queda Down. |
| **Ferocious Claws** | passive | Varias / Especial | Sus Melee Attacks tienen la keyword CLEAVE 2. |
| **Trample ACTION** | action | Brazen Bull (Sultanate of the Iron Wall), Amalgam (Cult of the Black Grail) | Hace un Melee Attack contra un enemigo Down. Este ataque no usa arma cuerpo a cuerpo y tiene IGNORE ARMOUR. |
| **Strong in Faith** | passive | Varias / Especial | Una banda Éire Rangers puede tener 0-2 Trench Clerics, que cambian Onward Christian Soldiers por: Arise and be Healed! ACTION (Risky; con éxito, el Cleric o un amigo a 3" se levanta gratis y retira hasta D3 BLOOD y/o INFECTION MARKERS) y Away Serpents! ACTION (elige 1 enemigo a 12"; Risky, con -1 DICE si su base es de 40mm o más; con éxito queda Down). |
| **Price of Greed ACTION** | action | Varias / Especial | Risky Success Roll; si falla, su activación termina. Con Success o Critical, Injury Roll a un enemigo a 12" en Line of Sight: +1 INJURY DICE con Critical y +1 INJURY DICE por cada -1 INJURY MODIFIER del objetivo (el modificador se sigue aplicando). Sustituye a Puppet Master en Knights of Avarice. |
| **Levitate** | passive | Artillery Witch (Heretic Legions) | No hace Risky Success Roll al Climb o Jump, ni Injury Roll al caer. |
| **Infernal Bombs** | passive | Artillery Witch (Heretic Legions) | Infernal Bomb (1-Handed, 36"): BLAST 3", IGNORE COVER, IGNORE ELEVATED POSITION, IGNORE LONG RANGE, RELOAD, SCATTER, SHRAPNEL. Duck: -1 INJURY DICE si el modelo está en contacto con terreno de ½" o más entre él y el punto objetivo. Infernal Strike: con Success o Critical contra un enemigo (o si falla y el punto cae sobre una base), la Injury Roll de ese modelo tiene DEADLY. Mighty Explosion: el modelo impactado que no queda Out of Action sale despedido D3" en línea recta. |
| **Gas Bombs** | passive | Varias / Especial | Gas Bomb (1-Handed, 36"): -1 INJURY DICE, BLAST 3", GAS, IGNORE ARMOUR, IGNORE COVER, IGNORE ELEVATED POSITION, IGNORE LONG RANGE, RELOAD, SCATTER. Choking Gas: el modelo impactado que no queda Out of Action se tambalea D3" en línea recta (el objetivo, en la dirección que elige el atacante; los del BLAST, alejándose del punto objetivo). Sustituye a las Infernal Bombs en Knights of Avarice. |
| **Puppet Master ACTION** | action | Heretic Priest (Heretic Legions) | Risky Success Roll. Si falla, la activación del Heretic Priest termina. Con Success o Critical, elige 1 modelo (amigo o enemigo, no él mismo) a 12" o menos y en Line of Sight y muévelo D6" en línea recta en cualquier dirección: puede acabar a 1" de un enemigo, retirarse, trepar o saltar, pero no hacer una Diving Charge ni contar como carga. |
| **Stealth Generator** | passive | Death Commando (Heretic Legions) | -1 DICE a tiradas para ataques a distancia que tengan a este modelo como objetivo. Afecta a un ataque con BLAST solo si apunta al Death Commando, no si apunta a un punto del suelo (Rules Commentaries, Heretic Legions Q2). |
| **Barbed Wire Banshee** | passive | Barbed Wire Banshee (Heretic Legions) | +1 INJURY DICE a las Injury Rolls contra modelos enemigos a 8" o menos de la Barbed Wire Banshee. (Sustituye a Unholy Hymns.) |
| **Unholy Hymns** | passive | Chorister (Heretic Legions) | -1 DICE a Success Rolls de modelos enemigos a 8" o menos del Chorister. |
| **Heretic Legionnaires** | passive | Varias / Especial | Puedes mejorar Heretic Troopers a Heretic Legionnaires por +10 👑 cada uno, sin que haya más Legionnaires que Troopers. El Legionnaire cambia su Ranged o su Melee de 0 a +1. |
| **Assault Beast** | passive | War Wolf Assault Beast (Heretic Legions) | El War Wolf lleva dos armas cuerpo a cuerpo (Chainsaw Mouth y Shredding Claws). Ataca una vez con cualquiera o dos veces: primero Chainsaw Mouth y luego Shredding Claws con el modificador Off-Hand. Ambas son RISKY: si falla cualquier Success Roll, su activación termina. |
| **Chattel** | campaign | Wretched (Heretic Legions) | En campaña, los Wretched se pueden vender en el Quartermaster Step por 25 👑 más la mitad del coste de su Battlekit. |
| **Abiotic Life** | passive | Artillery Witch (Heretic Legions) | Añade -1 INJURY DICE a las Injury Rolls contra la Artillery Witch por ataques con la keyword GAS. |
| **Tormentor Chains** | passive | Death Commando (Heretic Legions) | Glory Item del Rulebook 1.0.2 (1-Handed, 10", ASSAULT, IGNORE COVER, IGNORE LONG RANGE, SHRAPNEL). Dragged Forwards: con Success o Critical no hay Injury Roll; pon 1 BLOOD MARKER más 1 por SHRAPNEL y arrastra al objetivo hasta 12" en línea recta hacia el atacante. Deadly Embrace: los enemigos a 1" del portador no pueden retirarse. |
| **Beelzebub's Touch** | passive | Lord of Tumours (Cult of the Black Grail), Great Maw (Cult of the Black Grail) | Cuando un ataque cuerpo a cuerpo del Lord of Tumours coloca BLOOD MARKERS o INFECTION MARKERS en el objetivo, añade 1 INFECTION MARKER extra al objetivo. |
| **Crushing Blows** | passive | Lord of Tumours (Cult of the Black Grail), Great Maw (Cult of the Black Grail) | El Lord of Tumours puede hacer un ataque cuerpo a cuerpo Crushing Blows aunque no tenga arma cuerpo a cuerpo equipada (o en lugar de usar las armas que tenga). El ataque tiene CLEAVE 2. Puede hacerlo aunque no tenga armas cuerpo a cuerpo y aunque lleve Shield (Rules Commentaries, Black Grail Q1). |
| **Command Bereaved ACTION** | action | Varias / Especial | Quita cualquier número de INFECTION MARKERS de modelos enemigos. Por cada uno, un Bereaved (Grail o Fly Thrall) a 18" o menos cumple una orden: Charge (carga), Fight (Melee Attack), Move (mueve, sin Charge ni Retreat) o Shoot (Ranged Attack). Máx. 1 orden por Bereaved y turno; no impide activarlo ese turno. |
| **Blind Rage** | passive | Varias / Especial | Goetic Ability. +1 DICE a la Risky Success Roll de Dash. |
| **Charge of Hatred** | passive | Varias / Especial | Goetic Ability. Al cargar cuenta con Movement 12" y no tira el Charge Bonus. Si el objetivo no es el enemigo más cercano en Line of Sight, Risky Success Roll antes: con Failure no mueve y su activación termina. |
| **Lesser Mark of Cain** | passive | Varias / Especial | Goetic Ability. Tiene la keyword -1 INJURY DICE. |
| **Coveted Position** | action | Varias / Especial | Goetic Spell (Cost 2). Cast Spell ACTION: intercambia su posición con un modelo (amigo o enemigo) a 12" en Line of Sight y a más de 1" de otros modelos (centro de base por centro de base). Si no es posible, nadie se mueve. Puede lanzarlo a 1" de un enemigo sin sufrir su ataque. |
| **Envious Eyes** | passive | Varias / Especial | Goetic Ability. Puedes comprarle 1 pieza de Battlekit de las armerías de New Antioch, Trench Pilgrims o Iron Sultanate (con sus estipulaciones). No se vende ni se reasigna; se puede recomprar si se pierde. |
| **What is Yours is Mine** | action | Varias / Especial | Goetic Spell (Cost 1). Cast Spell ACTION: quita 1 BLOOD MARKER o BLESSING MARKER de un modelo en Line of Sight (amigo o enemigo) y ponlo junto al lanzador. |
| **Call of the Flesh** | action | Varias / Especial | Goetic Spell (Cost 2). Cast Spell ACTION: su activación termina y el siguiente modelo que active el rival debe empezar con Move, Charge o Retreat (se levanta si está Down) y acabar lo más cerca posible del lanzador (Retreat si está a 1" de un enemigo, Charge si está a 12"), cruzando lo que haga falta. Ese turno no puede atacar al lanzador. |
| **Exquisite Pain** | action | Varias / Especial | Goetic Spell (Cost 1-2). Cast Spell ACTION: pon los BLOOD MARKERS pagados junto a un modelo en Line of Sight (amigo o enemigo). |
| **Forbidden Pleasures** | passive | Varias / Especial | Goetic Ability. Antes del despliegue, por cada modelo con esta habilidad, elige un modelo de tu banda sin DEMONIC y ponle 3 BLOOD MARKERS. |
| **Light of Samael** | action | Varias / Especial | Goetic Spell (Cost 2). Cast Spell ACTION: Injury Roll a un enemigo a 24" en Line of Sight; si su base es de 32mm o menos, retrocede D6" en línea recta alejándose del lanzador. |
| **Proud Defiance** | passive | Varias / Especial | Goetic Ability. La banda no hace Morale Checks mientras tenga en el campo al menos 1 modelo con esta habilidad. |
| **Too Proud to Fall** | action | Varias / Especial | Goetic Spell (Cost 2). Justo después de quedar Down: ignora el Down y sigue en pie (el resto de efectos de la Injury Roll se aplican). |
| **Charm of Acedia** | action | Varias / Especial | Goetic Spell (Cost 1). Cast Spell ACTION: si la siguiente ACTION de esta activación requiere Success Rolls o Risky Success Rolls, la primera es un Success automático. |
| **Daemonium Meridianum** | passive | Varias / Especial | Goetic Ability. Los enemigos tratan el terreno Open o Dangerous a 6" o menos como DIFFICULT TERRAIN. |
| **Morphean Mind** | passive | Varias / Especial | Goetic Ability. El rival no puede gastar más de 1 BLOOD MARKER para añadir -1 DICE a sus Success Rolls. |
| **Belly of the Beast** | passive | Varias / Especial | Goetic Ability. Si un Melee Attack contra él le pone al menos 1 BLOOD MARKER, pon 1 BLOOD MARKER al atacante. |
| **Eater of the Flesh** | passive | Varias / Especial | Goetic Ability. Tras un Melee Attack suyo, quítale 1 BLOOD MARKER por cada uno que ponga al objetivo (no contra BLACK GRAIL ni DEMONIC). |
| **Uncaring Gluttony** | action | Varias / Especial | Goetic Spell (Cost 2). Cast Spell ACTION: elige un enemigo no activado este turno y una pieza de Equipment suya (no CONSUMABLE; DEPLOYABLE solo a 1"): queda inutilizable el resto de la partida. |
| **Black Heart** | action | Varias / Especial | Goetic Spell (Cost 1). Antes de una Success Roll o Risky Success Roll del lanzador: +1 DICE. Como cualquier hechizo, no se lanza más de una vez por activación; fuera de tu activación sí puedes usarlo en cada Success Roll o Risky Success Roll (Rules Commentaries, The Court Q2). |
| **Body of Gold** | passive | Varias / Especial | Goetic Ability. Tiene GOLEM; pierde TOUGH y no puede ganarlo por ningún medio. |
| **Greedy Hearts** | passive | Varias / Especial | Goetic Ability. Tras el despliegue, pon 1 BLESSING MARKER junto a él por cada enemigo que valga 150 👑 o más (con su Battlekit). |
| **Aura of Wrath** | passive | Varias / Especial | Demonic Aura del Desecrated Saint (Sin of Wrath): +1 DICE a los Melee Attacks y a la Risky Success Roll de Dash de los modelos amigos a 8" (incluido el Saint). |
| **Aura of Envy** | passive | Varias / Especial | Demonic Aura del Desecrated Saint (Sin of Envy): Los enemigos a 12" no pueden cargar a un modelo de su banda que esté a 1" de un modelo de la banda del que carga (pueden rodearlos). |
| **Aura of Lust** | passive | Varias / Especial | Demonic Aura del Desecrated Saint (Sin of Lust): Puedes anular las keywords y reglas de la armadura (sin IMPERVIOUS) de los enemigos a 4" mientras sigan ahí, salvo las que afectan a la base. |
| **Aura of Pride** | passive | Varias / Especial | Demonic Aura del Desecrated Saint (Sin of Pride): Al terminar su activación, pon 1 BLOOD MARKER a cada enemigo a 8". |
| **Aura of Sloth** | passive | Varias / Especial | Demonic Aura del Desecrated Saint (Sin of Sloth): Los enemigos a 8" tratan Minor Hit como Down (también los que normalmente tratan Down como Minor Hit, p. ej. Machine Armour). |
| **Aura of Gluttony** | passive | Varias / Especial | Demonic Aura del Desecrated Saint (Sin of Gluttony): -1 DICE a las tiradas de los enemigos a 8", salvo BLACK GRAIL o ARTIFICIAL. |
| **Aura of Greed** | passive | Varias / Especial | Demonic Aura del Desecrated Saint (Sin of Greed): Los enemigos a 12" que cargan deben cargar al Saint si está a 12", en Line of Sight y alcanzable sin Dangerous terrain, Climb, Jump, Jump Down ni Diving Charge. |
| **Four Paws** | passive | Trench Dog (Principality of New Antioch) | +1 DICE a Dash y a Jump o Diving Charge. No puede trepar superficies verticales. |
| **Guard Dog** | passive | Varias / Especial | Ningún INFILTRATOR puede desplegar a 12" o menos; puede cargar a cualquier enemigo a 4" aunque no lo vea. |
| **Mercy Dog** | passive | Varias / Especial | Lleva un Medi-kit que cualquier modelo amigo a 1" puede usar sobre sí mismo. Puede arrastrar a un modelo Down a 1" (base menor de 40mm) al moverse o hacer Dash, a la mitad de velocidad; si así sale del cuerpo a cuerpo, no provoca ataque gratuito. |
| **Dog Grenades** | passive | Varias / Especial | Cualquier otro modelo de la banda (no Aliados, Mercenarios, Combat Medic ni otros perros) a 1" del perro durante su activación puede usar sus Grenades. |
| **Atonement Bell** | passive | Crimson Communicant (Principality of New Antioch) | Ocupa una mano en cuerpo a cuerpo (no a distancia). Ataque Off-Hand sin daño: el enemigo impactado (base de 40mm o menor) se desplaza D3" en la dirección que elija el Communicant; puede sacarlo del cuerpo a cuerpo (ataques gratuitos), hacerle caer o meterlo en terreno peligroso, pero no llevarlo a otro combate. |
| **Strength through Pain** | passive | Crimson Communicant (Principality of New Antioch) | +1 DICE a su Melee por cada BLOOD MARKER que tenga. |
| **Undead Fortitude** | passive | Lord of Tumours (Cult of the Black Grail), Plague Knights (Cult of the Black Grail), Corpse Guards (Cult of the Black Grail), Executor (Cult of the Black Grail), Grail Thralls (Cult of the Black Grail), Hounds of the Black Grail (Cult of the Black Grail), Matagot Hag (Cult of the Black Grail), Ravenous (Cult of the Black Grail), Cradle Thralls (Cult of the Black Grail), Desiccated Husks (Cult of the Black Grail), Great Maw (Cult of the Black Grail) | Añade -1 INJURY DICE a las tiradas de lesión contra este modelo, salvo si el ataque tiene la keyword FIRE. |
| **Cadre of Flesh** | passive | Matagot Hag (Cult of the Black Grail) | Si la Matagot Hag recibe un ataque con un Ravenous amigo a 3", ese Ravenous puede recibirlo en su lugar (Injury Roll para él). Con BLAST, la Injury Roll de la Hag se hace antes que la del resto. |
| **Frenzied Followers** | passive | Matagot Hag (Cult of the Black Grail) | +1 DICE a la Risky Success Roll de Dash de los modelos amigos a 8" de la Matagot Hag. |
| **Mother's Call ACTION** | action | Matagot Hag (Cult of the Black Grail) | Quita INFECTION MARKERS de modelos (amigos o enemigos) a 18". Por cada uno, un Ravenous a 8" cumple una orden (máx. 1 por turno, no impide activarlo): Feast (Ravenous Infection ACTION; con Success, 1 INFECTION MARKER extra), Fight (Melee Attack con +1 DICE) o Follow (mueve, sin Charge ni Retreat). |
| **Pestilent** | passive | Matagot Hag (Cult of the Black Grail) | Hace Melee Attacks con INFECTION MARKERS y CRITICAL sin arma. Si pone INFECTION MARKERS, pone 1 más. |
| **Gluttonous Horde** | passive | Ravenous (Cult of the Black Grail), Cradle Thralls (Cult of the Black Grail) | Hace Melee Attacks con CRITICAL sin arma, con +1 DICE por cada otro modelo amigo a 3" del atacante. |
| **Ravenous Infection ACTION** | action | Ravenous (Cult of the Black Grail), Cradle Thralls (Cult of the Black Grail) | Risky Success Roll; si falla, su activación termina. Con Success o Critical, pon 1 INFECTION MARKER a otro modelo a 1"; después su activación termina. |
| **More Worm Than Man** | passive | Desiccated Husks (Cult of the Black Grail) | El rival no puede gastar los INFECTION MARKERS de un Desiccated Husk salvo para convertir una Injury Roll en Bloodbath Roll. |
| **Dormant Hunger** | passive | Gregori Gula (Cult of the Black Grail) | Una vez por turno, en vez de quedar Out of Action queda latente: quita sus INFECTION MARKERS y cámbiala por un marcador de 60mm (Impassable). Si un Ravenous amigo termina un movimiento a 1", retira marcador y Ravenous y vuelve la Gula Down. Latente cuenta como Out of Action para Morale y Trauma; el Ravenous usado muere. |
| **Gnashing and Tearing** | passive | Gregori Gula (Cult of the Black Grail) | Hace Melee Attacks con +1 INJURY DICE, INFECTION MARKERS y CLEAVE 2 sin arma; CLEAVE 3 si cargó en esa activación. |
| **Plague-Ridden Flesh** | passive | Gregori Gula (Cult of the Black Grail) | -2 INJURY DICE a las Injury Rolls contra ella salvo ataques con FIRE. |
| **Unholy Gut** | passive | Gregori Gula (Cult of the Black Grail) | Puede llevar el arma Vomitus por 40 👑; no se puede perder ni retirar. |
| **Vomitus** | passive | Varias / Especial | Special, 8", +1 INJURY MODIFIER, ASSAULT, INFECTION MARKERS. Sin Success Roll: línea recta de 8" (se corta en terreno más alto que el atacante) e Injury Roll a cada modelo que toque. Vile Ferment: quitando 2 INFECTION MARKERS de la Gula, +1 INJURY MODIFIER. |
| **Devour ACTION** | action | Varias / Especial | Melee Attack sin arma con CRITICAL contra un enemigo a 1". Si no lo deja Out of Action, pon 1 BLOOD MARKER al atacante. |
| **Grasp ACTION** | action | Varias / Especial | Risky Success Roll; si falla, su activación termina. Con Success o Critical, arrastra 3" en línea recta hacia él a un enemigo a 12" en Line of Sight (puede hacerle saltar, entrar a 1" de un enemigo o retirarse sin ataques de huida). Se detiene ante modelos, terreno Difficult, Dangerous o Impassable, o terreno que exija Climb o Jump. |
| **Lockjaw Bite** | passive | Varias / Especial | Cuando un enemigo hace Retreat a 1" de este modelo, ponle 1 INFECTION MARKER antes de los ataques de huida. |
| **Papillal Hide** | passive | Varias / Especial | No necesita Line of Sight al objetivo para cargar (el resto de restricciones sigue). |
| **Rotten Cutters** | passive | Varias / Especial | Sus Melee Attacks tienen CLEAVE 2. |
| **Unending Starvation** | passive | Varias / Especial | +1" a su Movement. |
| **Butcher King** | passive | Varias / Especial | Al final de la batalla, si no está Out of Action y dejó Out of Action a un enemigo con un Melee Attack, ganas 1 ☼. |
| **Knight Companion of the Feast** | passive | Varias / Especial | +1 DICE a la Risky Success Roll de Ravenous Infection ACTION de los modelos amigos a 3". |
| **Knight of Twin Cleavers** | passive | Varias / Especial | IGNORE OFF-HAND WEAPON y sus Melee Attacks tienen SHRAPNEL. |
| **Plague Knight Ranks** | campaign | Plague Knights (Cult of the Black Grail), Executor (Cult of the Black Grail) | Cada Plague Knight puede tener uno de estos rangos. Plague Almoner (10 👑): las Bloodbath Rolls de sus ataques cuestan 1 marcador menos. Knight Companion of the Fly (5 👑): +1 DICE a su Ranged o a su Melee. Knight of the Rotten Cross (5 👑, Limit: 1): puede comprar 1 arma a distancia o cuerpo a cuerpo de las armerías de New Antioch o Heretic Legions (no se vende ni se reasigna). |
| **Black Grail Bodyguard** | passive | Corpse Guards (Cult of the Black Grail) | Si un BLACK GRAIL amigo a 1" del Corpse Guard recibe un ataque a distancia o cuerpo a cuerpo, el Corpse Guard puede recibir el impacto en su lugar (haz la tirada de Injury contra el Corpse Guard). No funciona contra ataques con la keyword BLAST. |
| **Parasite Host** | passive | Corpse Guards (Cult of the Black Grail), Desiccated Husks (Cult of the Black Grail) | Cuando un ataque cuerpo a cuerpo del Corpse Guard coloca BLOOD MARKERS o INFECTION MARKERS en el objetivo, puedes retirar hasta 1 BLOOD MARKER o INFECTION MARKER del propio Corpse Guard. |
| **Absorb** | passive | Amalgam (Cult of the Black Grail) | Cuando un modelo (amigo o enemigo) a 1" del Amalgam queda Out of Action, puedes quitar 1 BLOOD MARKER del Amalgam. Si era de base 40mm o mayor y el Amalgam ya usó TOUGH, puede volver a usarlo. |
| **Corpulent** | passive | Amalgam (Cult of the Black Grail) | -2 INJURY DICE a las Injury Rolls de cualquier ataque contra el Amalgam. |
| **Curse on Creation** | passive | Amalgam (Cult of the Black Grail) | Campaña: si el resto de la banda vale 1000 👑 o más, en un Promotion Step puedes quitar 6 Grail Thralls de la hoja para subir el límite de Amalgams a 0-2 y reclutar uno gratis. |
| **Unstoppable** | passive | Amalgam (Cult of the Black Grail) | Los enemigos de base 32mm o menor no pueden hacer Melee Attack cuando el Amalgam se retira a 1" de ellos. Puede tomar Move o Charge si todos los enemigos a 1" son de base 32mm o menor. |
| **Bombardment Horde** | passive | Varias / Especial | Vile Corpus: Ranged +1 DICE y Melee +0 DICE. Al tomar Shoot con el Gluttonous Arsenal puede cambiar AUTOMATIC 3 por BLAST 3" y SCATTER. |
| **Burst ACTION** | action | Varias / Especial | Bolgias Gut: todos los modelos (amigos o enemigos) a 3" y en Line of Sight reciben un Ranged Attack con -1 INJURY DICE, GAS e INFECTION MARKERS; después el modelo queda Out of Action. También puede explotar interrumpiendo la activación de un enemigo que termina un movimiento a 3". |
| **Leech Grip** | passive | Varias / Especial | Cuando un enemigo hace Retreat a 1" de este modelo, pon 1 BLOOD MARKER junto al que se retira (antes de los Melee Attacks contra él). |
| **Tapeworm Throng** | passive | Varias / Especial | -1 DICE a los Ranged Attacks contra este modelo si está a Short Range del atacante. Sin efecto si el modelo tiene NEGATE FEAR. |
| **Overwhelming Horde** | passive | Grail Thralls (Cult of the Black Grail), Fly Thralls (Cult of the Black Grail) | Un Grail Thrall o Fly Thrall puede hacer ataques cuerpo a cuerpo aunque no tenga arma cuerpo a cuerpo. Además suma +1 DICE al Success Roll de sus ataques cuerpo a cuerpo por cada otro modelo amigo a 3" o menos del atacante. |
| **Disease Carrier** | passive | Hounds of the Black Grail (Cult of the Black Grail) | Si un modelo enemigo se activa estando a 1" o menos de este modelo, pon 1 INFECTION MARKER junto a él antes de que haga ninguna ACTION. |
| **Frightening Speed** | passive | Hounds of the Black Grail (Cult of the Black Grail) | +1 DICE a la Risky Success Roll de su Dash ACTION. Además, su Movement no se reduce a la mitad al levantarse al inicio de una activación. |
| **Infected Proboscis** | passive | Heralds of Beelzebub (Cult of the Black Grail) | El Herald de Beelzebub puede hacer un ataque cuerpo a cuerpo con la keyword INFECTION MARKERS aunque no tenga arma. Si el ataque coloca algún INFECTION MARKER en el objetivo, retira hasta 1 BLOOD MARKER del propio Herald. |
| **Maddening Buzzing** | passive | Varias / Especial | Hasta 1 Herald of Beelzebub puede tenerla por +10 👑. Las Success Rolls de los enemigos a 8" o menos se convierten en Risky Success Rolls (sin efecto extra si ya lo eran). |
| **Six-armed Monstrosity** | passive | Varias / Especial | Puede hacer 1 Shoot ACTION por activación con cada arma a distancia equipada y 1 Fight ACTION con cada arma cuerpo a cuerpo. El modificador Off-Hand no se aplica a sus ataques cuerpo a cuerpo. |
| **Goetic Powers** | passive | Praetor (Court of the Seven-Headed Serpent), Sorcerer (Court of the Seven-Headed Serpent), Hunter of the Left-Hand Path (Court of the Seven-Headed Serpent), Hell Knights (Court of the Seven-Headed Serpent) | Los modelos ELITE de una banda de la Court of the Seven-Headed Serpent pueden tener Goetic Powers (el número figura en su Warband Entry). Se dividen en Goetic Abilities y Goetic Spells; ver la Goetic Powers List. |
| **Law of Hell** | passive | Wretched (Court of the Seven-Headed Serpent) | Si un ataque de un Wretched deja Out of Action a un enemigo con la keyword ELITE, el Wretched gana su libertad: se retira de la partida, deja de contar para los Morale Checks y sale de la hoja de banda. |
| **Poison Stingers** | passive | Pit Locusts (Court of the Seven-Headed Serpent) | El Pit Locust puede hacer un ataque cuerpo a cuerpo con CLEAVE 2 y SHRAPNEL aunque no tenga arma cuerpo a cuerpo equipada. |
| **Hateful** | passive | Yoke Fiends (Court of the Seven-Headed Serpent) | Cuando un Yoke Fiend se activa: si está a más de 1" de cualquier enemigo y hay un enemigo no-BLACK GRAIL ni DEMONIC a 12" o menos en línea de visión, debe hacer un Charge ACTION contra el enemigo más cercano. Si estaba Down, se levanta y carga. |
| **Torturer** | passive | Yoke Fiends (Court of the Seven-Headed Serpent) | Cuando un Yoke Fiend hace un ataque cuerpo a cuerpo, puede atacar a un modelo amigo no-DEMONIC. Si lo hace, no puede atacar de nuevo en la misma Activación. |
| **Annihilator** | passive | Desecrated Saint (Court of the Seven-Headed Serpent) | Un Desecrated Saint puede hacer 1 Fight ACTION por Activación con cada arma cuerpo a cuerpo equipada (puede tener hasta 3 a 1 mano, o 2 a 1 mano + 1 a 2 manos). |
| **Demonic Aura** | passive | Desecrated Saint (Court of the Seven-Headed Serpent) | Según el Pecado de la banda. Wrath: +1 DICE a ataques cuerpo a cuerpo y a la Risky de Dash de amigos a 8" (incluido él). Envy: los enemigos a 12" no pueden cargar a un modelo de su banda que esté a 1" de un modelo de la banda del que carga. Lust: a enemigos a 4" con Armour no IMPERVIOUS puedes anularles keywords y reglas de esa armadura (salvo las del tamaño de base). Pride: al terminar su activación, 1 BLOOD MARKER a cada enemigo a 8". Sloth: los enemigos a 8" tratan los Minor Hit como Down. Gluttony: -1 DICE a las tiradas de enemigos a 8" salvo BLACK GRAIL o ARTIFICIAL. Greed: los enemigos a 12" que carguen deben cargarle si está a 12", en su Line of Sight y alcanzable sin terreno Dangerous ni Climb, Jump, Jump Down o Diving Charge. |
| **Mercenary** | campaign | Varias / Especial | Se pagan con Glory Points. No se benefician de las reglas especiales de facción ni de variante que hablan de «modelos de una banda [Facción]» (p. ej. Concentrated Attack de New Antioch o Light Infantry de Éire), pero cuentan como amigos para las demás reglas de la banda (p. ej. Bagpipes de Alba). En campaña cuentan como cualquier otro modelo: Threshold y Field Strength, Glorious Deeds, Trauma si son ELITE, ascensos y experiencia. Su Battlekit no se puede quitar ni perder y no pueden tener otro; la armadura ya va en su perfil. |
| **Battlefield Vivisection** | campaign | Combat Biologist (Mercenarios) | Mientras el Combat Biologist esté en la banda, añade la Glorious Deed "Gather Knowledge" a los disponibles cada partida. |
| **Gather Knowledge** | campaign | Combat Biologist (Mercenarios) | Glorious Deed: completada si 3+ enemigos quedan Out of Action a 1" o menos de un Combat Biologist amigo. |
| **Prize Specimens** | passive | Combat Biologist (Mercenarios) | Cuando el Combat Biologist deja Out of Action a un enemigo DEMONIC o BLACK GRAIL en cuerpo a cuerpo, gana 1 BLESSING MARKER. |
| **Iron Fists** | passive | Communicant Anti-Tank Hunter (Mercenarios) | Puede hacer ataque cuerpo a cuerpo con CLEAVE 2 sin arma. Aplica modificador de Off-Hand al segundo ataque. |
| **Barbed Embrace** | passive | Goetic Warlock (Mercenarios) | Los enemigos a 1" del Goetic Warlock no pueden hacer Retreat ACTION. Además, pon 1 BLOOD MARKER junto a cada enemigo que se activa a 1" de él. |
| **Goetic Portal** | action | Goetic Warlock (Mercenarios) | Goetic Spell (Cost 2), solo Goetic Warlock; el Warlock usa Goetic Powers pero solo paga con BLOOD MARKERS de enemigos o de Wretched amigos. Cast Spell ACTION: redespliega al Warlock a 6" o menos de donde estaba (de centro a centro; no cuenta como Move ni Retreat). Si estaba a 1" de enemigos de base 32mm o menor, puede llevarse uno y desplegarlo a 1" de él (si no cabe, se queda donde estaba; puede quedar a punto de caer). |
| **Automaton Destrier** | passive | Sipahi (Sultanate of the Iron Wall), Mamluk Faris (Mercenarios) | Puede desplegarse como Infiltrator: tras los Infiltrators normales, hasta 1" del borde y a más de 8" de enemigos. |
| **Martial Prowess** | passive | Sipahi (Sultanate of the Iron Wall), Mamluk Faris (Mercenarios) | Greatsword sin HEAVY. Jezzail con ASSAULT y Shield Combo. |
| **Sworn Brethren** | campaign | Sipahi (Sultanate of the Iron Wall), Mamluk Faris (Mercenarios) | Al reclutar un Mamluk Faris puedes formar un FIRETEAM con 1 modelo ELITE de tu banda (ambos ganan FIRETEAM). Es adicional a los demás Fireteams; si el compañero es de New Antioch, solo él puede usar Concentrated Attack. |
| **Ammunition Sacrament ACTION** | action | Mendelist Ammo Monk (Mercenarios) | Risky Success Roll. Si falla, la activación termina. Con Success o Critical, elige 1 amigo a 1" y en Line of Sight y un Sacramento, que dura hasta el final de su siguiente activación (un modelo solo puede tener un Sacramento a la vez): Bullet of the Guided Path (IGNORE COVER e IGNORE LONG RANGE en sus ataques con armas a distancia), Cartridge of his Wrath (BLAST 2" y SHRAPNEL a sus armas a distancia sin AUTOMATIC, BLAST, HEAVY ni FLAMETHROWER) o Echo of his Word (+1 INJURY DICE a sus ataques a distancia). |
| **Eye of God** | passive | Observer (Mercenarios) | Puedes repetir las Success Rolls y Risky Success Rolls fallidas del Observer. Si algún dado repetido saca 1, la tirada es Failure, el Observer queda Down y su activación termina. |
| **Lightning Speed** | passive | Observer (Mercenarios) | El Polearm del Observer tiene CLEAVE 2. |
| **Temporal Fugue** | passive | Observer (Mercenarios) | -1 DICE a tiradas de ataque (cuerpo a cuerpo y distancia) que tengan al Observer como objetivo. |
| **Voice of God ACTION** | action | Observer (Mercenarios) | Risky Success Roll. Si falla, la activación del Observer termina. Con Success o Critical, elige 1 modelo (amigo o enemigo) en cualquier parte que no se haya activado este turno: la activación del Observer termina y la de ese modelo empieza de inmediato. |
| **Necrotic Gaze** | action | Goetic Warlock (Mercenarios) | Goetic Spell (Cost 0), solo Goetic Warlock (paga solo con BLOOD MARKERS de enemigos o de Wretched amigos). Cast Spell ACTION: Ranged Attack a 24"; con Success o Critical no hay Injury Roll: dobla los BLOOD MARKERS del objetivo (máximo 6) o, si no tiene, pon 1. |
| **Disturbing Presence** | passive | Goetic Warlock (Mercenarios) | Tu rival no puede quitar BLOOD MARKERS de sus modelos mientras estén a 1" de un Goetic Warlock. |
| **Slow** | passive | Scripture Guardian (Mercenarios) | Trata el Movimiento del Scripture Guardian como 3"/Infantry al hacer Dash ACTION. |
| **Devour the Guilty ACTION** | action | Sin Eater (Mercenarios) | Elige 1 modelo a 1" con base de 40mm o menos: si es enemigo, Risky Success Roll; si es amigo, Success Roll con +1 DICE. Si falla, la activación termina. Con éxito lo devora: se aparta con sus MARKERS, no puede verse afectado ni hacer ACTIONS, sus BLOOD MARKERS pueden pagar Goetic Spells y cuenta como Down para los Morale Checks. Solo 1 devorado a la vez; mientras lo tenga, el Sin Eater tiene REGENERATE 1. Si el Sin Eater sufre un Out of Action en la Injury table (aunque TOUGH lo deje en Down), despliega al devorado a 1" y Down (si no se puede, queda Out of Action). Al acabar la partida, el devorado cuenta como Out of Action. En cada activación del Sin Eater recibe 1 BLOOD MARKER; con 6 queda Out of Action (aunque tenga TOUGH). Purge ACTION: lo despliega a 1" y Down (si no cabe, sigue dentro; puede quedar a punto de caer) y no se puede volver a devorar en esa activación. |
| **Dignified Conduct** | passive | Witchburner (Mercenarios) | El Witchburner no puede hacer Dash ACTION, no divide su Movement al levantarse al empezar su activación y ninguna habilidad ni ACTION de un enemigo puede moverlo. |
| **Elitist** | passive | Witchburner (Mercenarios) | Los enemigos sin ELITE no pueden hacer Melee Attack cuando el Witchburner se retira a 1" de ellos. Puede hacer Move o Charge si ningún enemigo a 1" tiene ELITE. |
| **Found Guilty** | passive | Witchburner (Mercenarios) | Tras la Injury Roll de un ataque con Divine Judgement o Gavel of Justice, pon 1 BLOOD MARKER extra al modelo si es de una banda Fallen (aunque el resultado sea No Effect). |
| **Divine Judgement ACTION** | action | Witchburner (Mercenarios) | Ranged Attack a 18" con FIRE, IGNORE COVER e IGNORE LONG RANGE, sin necesidad de Line of Sight. Un resultado Out of Action en la Injury Table causado por este ataque cuenta como Down. |
| **TOUGH** | keyword | Varias / Especial | −1 INJURY DICE a las tiradas de lesión contra este modelo. |
| **STRONG** | keyword | Varias / Especial | Tiene la keyword NEGATE HEAVY. Además puede equipar y usar un arma cuerpo a cuerpo de 2 manos como si fuera de 1 mano. |
| **FEAR** | keyword | Varias / Especial | Modelos enemigos que vayan a cargar/atacar a este modelo deben pasar un Risky Success Roll o pierden la acción. |
| **INFILTRATOR** | keyword | Varias / Especial | Despliegue avanzado: fuera de la Line of Sight enemiga y a 8" o más del enemigo más cercano, después de los modelos sin la keyword. Si no puede, hasta 6" fuera de su zona de despliegue. |
| **LEADER** | keyword | Varias / Especial | Modelos amigos a 6" pueden usar el Morale del Leader para Morale Checks. Bonus de mando. |
| **ELITE** | tier | Varias / Especial |  |
| **TROOPS** | tier | Varias / Especial |  |
| **MERCENARY** | tier | Varias / Especial |  |
| **ARTIFICIAL** | keyword | Varias / Especial | Construcción/criatura artificial: inmune a FEAR, INFECTION MARKERS y efectos psicológicos. |
| **SKIRMISHER** | keyword | Varias / Especial | +1" al stat Movement. Puede moverse a través de modelos amigos. |
| **FLYING** | keyword | Varias / Especial | Movimiento aéreo: ignora terreno y obstáculos en movimiento normal. |
| **SULTANATE** | factionTag | Varias / Especial | Modelo de la Sultanate of the Iron Wall. |
| **HERETIC** | factionTag | Varias / Especial | Modelo de las Heretic Legions. |
| **NEW ANTIOCH** | factionTag | Varias / Especial | Modelo de New Antioch. |
| **PILGRIM** | factionTag | Varias / Especial | Modelo de los Trench Pilgrims. |
| **BLACK GRAIL** | factionTag | Varias / Especial | Modelo del Cult of the Black Grail. |
| **COURT** | factionTag | Varias / Especial | Modelo de la Court of the Seven-Headed Serpent. |
| **DEMONIC** | factionTag | Varias / Especial | Modelo de origen demoníaco (Heretic, Black Grail, Court). |

---

## 3. Reglas Especiales de Facción y Doctrina

| Regla / Facción | Tipo | Descripción Canónica |
|---|---|---|
| **New Antioch Fireteams** | Regla de Facción | Una banda de New Antioch (y sus variantes) puede tener hasta 2 Fireteams de 2 modelos cualesquiera, que ganan FIRETEAM gratis. Concentrated Attack: si un modelo de un Fireteam impacta a un objetivo que ya impactó su compañero antes en la misma activación conjunta, puedes gastar 3 BLOOD MARKERS para convertir la Injury Roll del segundo ataque en una Bloodbath Roll, aunque el objetivo no esté Down. |
| **Wrath of God** | Regla de Facción | Regla de la Procession of the Sacred Affliction (no de los Trench Pilgrims normales): hasta 1 Castigator, Trench Pilgrim o Martyr Penitent puede tenerla por 15 👑. Nunca recibe BLOOD MARKERS, tiene NEGATE FEAR, no puede ser Broken on the Wheel, no puede llevar armas a distancia ni Armour (sí Shield) y su base pasa a 32mm. |
| **Pride of Jabir** | Regla de Facción | Regla de la variante House of Wisdom: la banda puede tener 0-3 Lions of Jabir. |
| **Hellbound Soul Contract** | Regla de Facción | Battlekit de las Heretic Legions (Heretic Troopers y Legionnaires, Limit: 3). Fiery Exodus: si el modelo queda Out of Action, antes de retirarlo pon 1 BLOOD MARKER a cada enemigo a 1" o menos (salvo los que tengan NEGATE FIRE). |
| **Infection Markers** | Regla de Facción | INFECTION MARKERS: algunas armas del Black Grail tienen la keyword INFECTION MARKERS y ponen INFECTION MARKERS en lugar de BLOOD MARKERS. Morale: el rival añade -1 DICE a todos sus Morale Checks salvo que su banda sea de la Court of the Seven-Headed Serpent o del Cult of the Black Grail. |
| **Morale Penalty vs. Faithful** | Regla de Facción | Morale: el rival añade -1 DICE a todos sus Morale Checks salvo que su banda sea de la Court of the Seven-Headed Serpent o del Cult of the Black Grail. |
| **Goetic Powers (Faction Rule)** | Regla de Facción | Seven Deadly Sins: antes de reclutar eliges a qué Pecado se dedica la banda (Wrath, Envy, Lust, Pride, Sloth, Gluttony o Greed). Goetic Powers: los modelos ELITE pueden tenerlos (el número figura en su Warband Entry); son Goetic Abilities (como una habilidad normal) o Goetic Spells, que no requieren Success Roll: se pagan retirando tantos BLOOD MARKERS como su coste de modelos sin BLACK GRAIL ni DEMONIC (amigos o enemigos, en cualquier parte). No se puede lanzar el mismo hechizo más de una vez por activación; algunos requieren una Cast Spell ACTION. |
| **Fireteams (Papal States)** | Regla de Facción | No existe en Warbands 1.0.2: una Papal States Intervention Force usa los Fireteams normales de New Antioch. |
| **Papal States Intervention** | Regla de Facción | Far from Home: sin Trench Moles. Lector: debe incluir 1 Trench Cleric (y no necesita Lieutenant); ese Cleric tiene LEADER y Arise and be Healed! ACTION (Risky; con éxito, él o un amigo a 3" se levanta gratis y retira hasta D3 BLOOD y/o INFECTION MARKERS). Specialist Force: 500 👑 y 11 ☼ para empezar la campaña, +4 ☼ en cada Reinforcements y Threshold 200 👑 menor; como latecomer o en partida suelta, 200 👑 menos y 11 ☼ más. Supreme Blessing: el Supreme Pontiff's Crucifix de un modelo es gratis al crear la banda. Swiss Guard: el Lieutenant y hasta 4 modelos pueden tener NEGATE FEAR gratis. |
| **Rapid Assault (Stosstruppen)** | Regla de Facción | Athleticism: el Lieutenant y los Shock Troopers pueden comprar Rapid Assault por +5 👑 cada uno (+1 DICE a la Risky Success Roll de su Dash ACTION). |
| **Rapid Assault** | Regla de Facción | Athleticism: Lieutenant y Shock Troopers pueden tener Rapid Assault por +5 👑 (+1 DICE a la Risky de Dash). Expert Fireteams: hasta 3 Fireteams. Feldkaplane: los Trench Clerics pueden llevar 1 dosis de Holy Smoke. Forward Positions: hasta 2 Shock Troopers con INFILTRATOR por +10 👑. Lightly-armoured: solo el Lieutenant y la Mechanized Heavy Infantry llevan Reinforced o Machine Armour. Light Melee: los Shock Troopers pierden Assault Drill (siguen costando 45). Masters of the Grenade: +4" de alcance a todas las granadas. Specialised Equipment: Submachine Guns Limit: 4, Automatic Pistols sin ELITE only, Machine Guns Limit: 1, sin Grenade Launchers ni Martyrdom Pills. Troop Selection: 2-8 Shock Troopers, sin Trench Moles, máximo 1 Sniper Priest y 1 Mechanized Heavy Infantry. |
| **Masters of the Grenade (Stosstruppen)** | Regla de Facción | Masters of the Grenade: +4" al alcance de todas las granadas de los modelos de una banda Stosstruppen; si el objetivo está a más de 8", -1 DICE a la Success Roll (revisión de reglas abril 2026). |
| **Éire Rangers Light Infantry** | Regla de Facción | Anointed Ammunition: Armour-Piercing Bullets a 5 👑 (Limit: 2). Berserker: el Lieutenant o un Fianna puede ser Berserker por +15 👑 (sin Armour, sí Shield; NEGATE FEAR; nunca recibe BLOOD MARKERS). Carnyx: un Musical Instrument puede tener FEAR gratis. Fianna: los Shock Troopers pueden tener INFILTRATOR y SKIRMISHER por +10 👑. Patrón siempre Learned Saint. Hit & Run Tactics: -1 DICE a los ataques cuerpo a cuerpo contra un modelo de la banda que se retira. Light Infantry: solo 1 Mechanized Heavy Infantry pero hasta 4 Combat Engineers y 4 Satchel Charges; máximo 3 Great Swords/Axes (ninguna en la MHI); solo la MHI lleva armas HEAVY (salvo Great Swords/Axes y Satchel Charges) y Reinforced o Machine Armour. Loose Formation: el Lieutenant cambia Hold Your Fire! por SKIRMISHER. Strong in Faith: 0-2 Trench Clerics con Arise and be Healed! y Away Serpents! en lugar de Onward Christian Soldiers. |
| **Kingdom of Alba Assault** | Regla de Facción | Bagpipes: un Musical Instrument puede ser Bagpipes gratis; los amigos a 8" tienen NEGATE FEAR. Brave: +1 DICE a los Morale Checks. Celtic Machine Armour: la Machine Armour mantiene Charge Bonus D6" y sus armaduras no sufren penalización de movimiento por Down. Claymore Smiths: Great Sword/Axe a 7 👑. Cold Steel: la primera compra de cada arma cuerpo a cuerpo cuesta la mitad. Dum-Dum Ammunition: Dum-Dum Bullets a 5 👑 (Limit: 3). Highland Strength: Lieutenant y Shock Troopers con STRONG gratis. Lightly-armoured: solo Lieutenant y MHI llevan Reinforced o Machine Armour. Melee-focused: la MHI tiene Melee +1 DICE y Ranged +0 DICE. Rampant Charge: IGNORE DEFENDED OBSTACLE. Strained Supply: Automatic Shotgun, Grenade Launcher, Machine Gun, Sniper Rifle y Submachine Gun con Limit: 1. Armería propia: Lochaber Axe. |
| **Expeditionary Forces of Abyssinia** | Regla de Facción | Abyssinian Healers: 0-2 Combat Medics y Misericordia con Limit: 2. Chieftain Panoply: la MHI no puede llevar Machine Armour. Faith of Ethiopia: sin Sniper Priests. Holy Warriors: 0-1 Trench Cleric y 0-2 Holy Warriors (entrada de Trench Cleric con Blessed Psalm ACTION y Arise and be Healed! ACTION). Short-Range Marksmanship: +1 DICE a los disparos a Short Range del Lieutenant y los Yeomen (no con granadas ni armas HEAVY). Vanguard Forces: sin Trench Moles; hasta 4 Yeomen con Flanking por +5 👑. Warrior Nobles: Shock Troopers y ELITE con Chewa por +5 👑 (+1 DICE en cuerpo a cuerpo por cada otro amigo a 1" del objetivo, máx. +2). Weapons of Mobile Warfare: máximo 3 armas a distancia HEAVY (sin contar Satchel Charges). Armería propia: Shotel, Holy Water of Lalibela, Anfarro, Tabot. |
| **The Red Brigade** | Regla de Facción | Wear and Tear: empieza cada partida con 1 BLOOD MARKER por cada 200 👑 completos del coste de la banda; los reparte el rival (1 por modelo mientras haya modelos sin marcadores, máx. 2 por modelo). No Retreat: nadie puede salir voluntariamente del cuerpo a cuerpo salvo los Mercy Dogs y quien arrastren. Trench Dogs (35 👑; no más perros que otros modelos): Guard, Mercy o Attack Dog por +5 👑. Glory Hounds: los perros ganan 2 ☼ por Glorious Deed. Remember the Fallen: tras la batalla, en vez de Exploración o Reinforcements, recupera el equipo de sus caídos. Live off the Land: no puede pedir Reinforcements dos partidas seguidas. Guns Blazing: el Lieutenant puede comprar Gunslinger por +5 👑. Displeasure of the Church: máximo 2 clérigos (1 Trench Cleric y 1 Sniper Priest, o 2 Sniper Priests). 0-1 Crimson Communicant (75 👑). |
| **Procession of the Sacred Affliction** | Regla de Facción | Face thy Fears: sin Iron Capirotes (los Ecclesiastic Prisoners tampoco lo tienen y cuestan lo mismo). Hammer and the Anvil: Anti-Tank Hammers sin ELITE only. Melee-focused: sin Machine Guns y Punt Guns con Limit: 1. Punishing Millstones: +1 INJURY DICE a los ataques cuerpo a cuerpo contra objetivos Down (no los Ecclesiastic Prisoners). Reliquary Armoury: Holy Icon Shields a 20 👑 sin ELITE only. Wrath of God: hasta 1 Castigator, Trench Pilgrim o Martyr Penitent por 15 👑 (sin BLOOD MARKERS, NEGATE FEAR, sin armas a distancia ni Armour, base 32mm). Zealot Strength: hasta 3 Trench Pilgrims y/o Martyr Penitents. Armería propia: Holy Icon Armour. |
| **War Pilgrimage of Saint Methodius** | Regla de Facción | Anchorite Armoury: los Anchorite Shrines tienen Ranged +0 DICE y acceden a Anchorite Ranged Weapons y Anchorite Battlekit. Anchorite Cloister: hasta 2 Anchorite Shrines. Chaste Order: las Stigmatic Nuns deben llevar Standard Armour y como máximo 3. Communicant Heresy: sin Ammo Monks, Communicants ni Communicant Anti-Tank Hunters. Patrón siempre Learned Saint. Mortal Sin: los Ecclesiastic Prisoners no llevan Martyrdom Device y nadie puede ser Broken on the Wheel. Treasure in Heaven: los Trench Pilgrims no resucitan como Martyr Penitents. |
| **Cavalcade of the Tenth Plague** | Regla de Facción | Blood of the Lamb: los Castigators tienen TOUGH gratis. Day of His Wrath: el War Prophet cambia Laying on of Hands por Day of his Wrath ACTION (Risky; con Success, Injury Roll con IGNORE ARMOUR a 1 enemigo a 3"; con Critical, además +1 INJURY DICE). Favour of the Lord: al empezar cada turno puedes poner 1 BLESSING MARKER a un modelo de la banda. Heaven Awaits: los Trench Pilgrims no resucitan como Martyr Penitents. Only the Righteous: cualquier PILGRIM (salvo Ecclesiastic Prisoners) puede llevar Sacrificial Lamb por 5 👑. Stolen Communicants: los Communicants cuestan 3 ☼ en vez de ducados. The Unclean: 0-2 Ecclesiastic Prisoners. |
| **Fida'i of Alamut** | Regla de Facción | Alamut Alone: sin Yüzbaşı, Jabirean Alchemist, Janissaries, Lions of Jabir ni Brazen Bulls. Art of Assassination: cada Assassin puede tener una habilidad distinta: Hallucinogen Disguise (20 👑), Mirage of Time (15 👑, -1 DICE a los ataques contra él), Secret Paths (10 👑, entra desde un borde a partir del turno 2) o Thunderbolt of Alamut (20 👑, +2" Movement y +1 DICE a la Risky de Dash). Assassin Acolytes: hasta 3 Azebs con INFILTRATOR por +10 👑. Dervishes: 0-4, entrada de Janissary sin Reinforced Armour y con IGNORE OFF-HAND WEAPON y Whirling Dervish (-1 DICE a los disparos contra él) en lugar de STRONG. Flock of Assassins: 0-2 Sultanate Assassins y 1 Master Assassin (obligatorio; entrada de Sultanate Assassin con LEADER y TOUGH, 95 👑). Killing Squad: 1 Fireteam. Armería propia: Bow of Alamut, Golden Khanjar, Hashashin Leaf. |
| **House of Wisdom** | Regla de Facción | Alchemists: 1-2 Jabirean Alchemists y Alchemist Armour con Limit: 2. Kavasses: hasta 3 Azebs con Melee +0 DICE por +5 👑 (pierden Light Skirmisher). Noble Guardians: 0-2 Fāris (entrada de Janissary con ELITE gratis). Pride of Jabir: 0-3 Lions of Jabir. Private Venture: sin Yüzbaşı, Janissaries ni Sultanate Assassins. Secrets of the House of Wisdom: cada Alchemist puede tener una habilidad distinta (Medicine, Cartography & Geometry, Secrets of Takwin, Chemistry & Alchemy, Philosophy, Poetry and Theology). Takwin Homunculus: uno por Alchemist (40 👑, con Alchemical Formulas). Weapon Collections: al crear la banda, 1 Battlekit de New Antioch y 1 de Trench Pilgrims. Armería propia: Elixir of Al-Khidr, Fire Shield. |
| **Defenders of the Iron Wall** | Regla de Facción | Far from the Sublime Gate: sin Lions of Jabir, Yüzbaşı ni Assassins, y sin Cloak of Alamut ni Wind Amulet. Grand Cannons: 0-2 Sultanate Grand Cannons (60 👑), dados a un Brazen Bull (máx. 1 cada uno) o como gun battery. Janissary Officers: 0-2 Janissaries con ELITE gratis. Marksmanship of the Iron Wall: +2 DICE en vez de +1 con Elevated Position. Sappers Corps: 0-4 Sultanate Sappers. Siege Jezzail Teams: +1 DICE al disparar un Siege Jezzail con un amigo a 1". Silahdar: 1 obligatorio (entrada de Yüzbaşı con STRONG en vez de Mubarizun; puede llevar Alaybozan, Anq Guard y Explosive Charges). Sipahi: hasta 1 Sipahi Automaton Cavalry por 110 👑 (entrada de Mamluk Faris, sin cambiar su Battlekit). |
| **Trench Ghosts** | Regla de Facción | Barbed Wire Banshee: puede sustituir al Chorister (mismo perfil y coste); en vez de Unholy Hymns, +1 INJURY DICE a las tiradas contra enemigos a 8". Enemies of All: sin Mercenarios. Lost Souls: sin modelos ARTIFICIAL, Hellbound Soul Contracts ni Infernal Brands (los Anointed no tienen Infernal Brand y siguen costando 95). Semi-corporeal: -1 INJURY DICE a las Injury Rolls de disparos contra modelos de la banda. Slow and Creeping: Dash como si tuvieran 3"/Infantry y -1 DICE a sus ataques contra un enemigo que se retira. Undead Horror: todos tienen FEAR, NEGATE DIFFICULT TERRAIN y NEGATE GAS. Armería propia: Sarcophagus Mine, Tank Palanquin. |
| **Knights of Avarice** | Regla de Facción | Corrupt Merchants: al crear la banda, 1 Battlekit de New Antioch y 1 del Iron Sultanate. Gas Bombs: las Artillery Witches cambian Infernal Bombs por Gas Bombs. Goetic Warlocks: hasta 2 como Mercenarios; el primero cuesta 110 👑 en vez de Glory. Infernal Rivalry: sin Death Commandos. Mammon's Chosen: ningún modelo con su Battlekit por debajo de 80 👑 salvo Wretched. Preserve the Loot: nada con FIRE o SHRAPNEL; el Grenade Launcher cambia SHRAPNEL por -1 INJURY DICE, GAS e IGNORE ARMOUR. Price of Greed: el Heretic Priest cambia Puppet Master por Price of Greed ACTION (Risky; Injury Roll a un enemigo a 12" en Line of Sight, +1 INJURY DICE con Critical y +1 INJURY DICE por cada -1 INJURY MODIFIER del objetivo). Patrón siempre Mammon. Armería propia: Coin Hammer, Golden Calf Altar, Standard of Mammon, Tarnished Armour. |
| **Heretic Naval Raiders** | Regla de Facción | Close Assault Weapons: Submachine Guns a 25 👑. Fast as Lightning: +1 DICE a la Risky Success Roll de Dash. Let Sleeping Dogs Lie: sin War Wolf. Light Troops: máximo 2 Anointed y 1 Artillery Witch (aunque la banda valga 1.000 👑 o más). Unseen Advance: hasta 3 modelos sin ELITE con INFILTRATOR por +10 👑. |
| **Dirge of the Great Hegemon** | Regla de Facción | The Executor: 1 obligatorio (entrada de Plague Knight con Ranged +1 DICE, LEADER y TOUGH, 80 👑); además 0-2 Plague Knights. The Fallen: sin Lord of Tumours ni Amalgam. The Lost: 0-2 Hounds y 0-2 Heralds of Beelzebub. The Bereaved: los Grail/Fly Thralls tienen Ranged +0 DICE, cuestan 30 👑 y pueden llevar armas a distancia, granadas, Musical Instrument o Troop Flag. Dishonoured: sin Beelzebub's Axe ni Black Grail Shield. Hegemon's Last Blessing: Putrid Shotgun Limit: 3 y Viscera Cannon Limit: 3 sin ELITE only. Hegemon's Will: Executor y Plague Knights tienen Command Bereaved ACTION (retira INFECTION MARKERS de enemigos; por cada uno, un Bereaved a 18" hace Charge, Fight, Move o Shoot, máx. 1 orden por turno). Armería propia: Broken Crown, Urn of the Bitter Ashes. |
| **The Great Hunger** | Regla de Facción | Eternal Appetence: al empezar cada turno eliges un efecto del Hambre (Agonised Churning, Ruinous Masticating, Spasmodic Wretching o Vile Craving) que usa los INFECTION MARKERS de los amigos a 8" de una Matagot Hag. Butcher Knights: 0-2 Plague Knights (base 32/40mm) con Ravenous Infection gratis y rangos propios (Butcher King, Knight Companion of the Feast, Knight of Twin Cleavers). Cradle of Filth: 0-3 Cradle Thralls (Ravenous con INFILTRATOR, 2 ☼, no cuentan para la Field Strength). Desiccated Husks: 0-2 (Corpse Guard con CRITICAL y More Worm Than Man). Excruciating Hunger: lista de armas y equipo prohibidos. The Great Maw: 0-1 si el resto vale 1.000 👑 o más (Lord of Tumours sin LEADER). Spawn of Gluttony: 1 Matagot Hag obligatoria; sin Lord of Tumours, Corpse Guards, Grail Thralls, Heralds of Beelzebub ni Amalgam. |
| **Sin: Wrath** | Regla de Facción | La banda está dedicada a Wrath (Seven Deadly Sins). Aura of Wrath del Desecrated Saint: +1 DICE a los ataques cuerpo a cuerpo y a la Risky de Dash de los amigos a 8" (incluido él). Da acceso a los Goetic Powers de Wrath. |
| **Sin: Envy** | Regla de Facción | La banda está dedicada a Envy (Seven Deadly Sins). Aura of Envy del Desecrated Saint: los enemigos a 12" no pueden cargar a un modelo de su banda que esté a 1" de un modelo de la banda del que carga. Da acceso a los Goetic Powers de Envy. |
| **Sin: Lust** | Regla de Facción | La banda está dedicada a Lust (Seven Deadly Sins). Aura of Lust del Desecrated Saint: a enemigos a 4" con Armour no IMPERVIOUS puedes anularles keywords y reglas de esa armadura (salvo las del tamaño de base). Da acceso a los Goetic Powers de Lust. |
| **Sin: Pride** | Regla de Facción | La banda está dedicada a Pride (Seven Deadly Sins). Aura of Pride del Desecrated Saint: al terminar su activación, 1 BLOOD MARKER a cada enemigo a 8". Da acceso a los Goetic Powers de Pride. |
| **Sin: Sloth** | Regla de Facción | La banda está dedicada a Sloth (Seven Deadly Sins). Aura of Sloth del Desecrated Saint: los enemigos a 8" tratan los Minor Hit como Down (también los que convierten Down en Minor Hit, como la Machine Armour). Da acceso a los Goetic Powers de Sloth. |
| **Sin: Gluttony** | Regla de Facción | La banda está dedicada a Gluttony (Seven Deadly Sins). Aura of Gluttony del Desecrated Saint: -1 DICE a las tiradas de enemigos a 8" salvo BLACK GRAIL o ARTIFICIAL. Da acceso a los Goetic Powers de Gluttony. |
| **Sin: Greed** | Regla de Facción | La banda está dedicada a Greed (Seven Deadly Sins). Aura of Greed del Desecrated Saint: los enemigos a 12" que carguen deben cargarle si está a 12", en su Line of Sight y alcanzable sin terreno Dangerous ni Climb, Jump, Jump Down o Diving Charge. Da acceso a los Goetic Powers de Greed. |

---

## 4. Reglas Especiales de Variantes de Banda (Subfacciones)

### Principality of New Antioch

#### Papal States Intervention Force (`papal-states`)
- **Resumen:** Fuerza de élite enviada por el Sumo Pontífice: Trench Cleric al mando (sin Lieutenant obligatorio), presupuesto 500 👑 y 11 ☼, Supreme Pontiff's Crucifix gratis y guardia suiza con NEGATE FEAR.
- **Regla Especial Principal:** Papal States Intervention
- **Unidades Obligatorias:** [object Object]

#### Éire Rangers (`eire-rangers`)
- **Resumen:** Infantería ligera y guerrilla: Fianna con INFILTRATOR y SKIRMISHER, Berserker, Hit & Run Tactics y casi sin armadura pesada ni armas HEAVY.
- **Regla Especial Principal:** Éire Rangers Light Infantry

#### Kingdom of Alba Assault Detachment (`alba`)
- **Resumen:** Asalto cuerpo a cuerpo de las Highlands: STRONG gratis para Lieutenant y Shock Troopers, Rampant Charge, Bagpipes y claymores baratas.
- **Regla Especial Principal:** Kingdom of Alba Assault

#### Stosstruppen of the Free State of Prussia (`prussia`)
- **Resumen:** Tropas de asalto de élite: 2-8 Shock Troopers, hasta 3 Fireteams, Rapid Assault comprable y granadas con +4" de alcance.
- **Regla Especial Principal:** Rapid Assault
- **Unidades Obligatorias:** [object Object]

#### Expeditionary Forces of Abyssinia (`abyssinia`)
- **Resumen:** Trono Salomónico: sin Sniper Priests, 0-2 Combat Medics y Holy Warriors, puntería a corta distancia y nobles Chewa en cuerpo a cuerpo.
- **Regla Especial Principal:** Expeditionary Forces of Abyssinia
- **Unidades Prohibidas:** sniper-priests

#### The Red Brigade (Westfalia) (`red-brigade`)
- **Resumen:** Hermandad de sangre de New Antioch con perros de trinchera: empieza con BLOOD MARKERS, nunca se retira del cuerpo a cuerpo y recupera el equipo de sus caídos.
- **Regla Especial Principal:** The Red Brigade

### Trench Pilgrims

#### Procession of the Sacred Affliction (`sacred-affliction`)
- **Resumen:** Cofradía flagelante de cuerpo a cuerpo: sin Iron Capirotes ni Machine Guns, +1 INJURY DICE contra objetivos Down y hasta 1 modelo con Wrath of God.
- **Regla Especial Principal:** Procession of the Sacred Affliction

#### War Pilgrimage of Saint Methodius (`st-methodius`)
- **Resumen:** Orden ortodoxa de Akakios: hasta 2 Anchorite Shrines con Ranged +0 DICE y armería de Anchorite; sin Communicants ni Martyrdom Devices.
- **Regla Especial Principal:** War Pilgrimage of Saint Methodius
- **Unidades Prohibidas:** communicant, ammo-monk, antitank-comm, martyr-penitent

#### Cavalcade of the Tenth Plague (`tenth-plague`)
- **Resumen:** Rechazan la doctrina del Meta-Cristo: Castigators con TOUGH, Sacrificial Lamb, 1 BLESSING MARKER por turno y Communicants robados por 3 ☼.
- **Regla Especial Principal:** Cavalcade of the Tenth Plague
- **Unidades Prohibidas:** martyr-penitent

### Sultanate of the Iron Wall

#### Fida'i of Alamut – Cabal of Assassins (`fidai-alamut`)
- **Resumen:** Cábala de asesinos de Alamut: Master Assassin al mando, hasta 2 Sultanate Assassins con Art of Assassination, Acolytes infiltrados y Dervishes.
- **Regla Especial Principal:** Fida'i of Alamut
- **Unidades Prohibidas:** yuzbasi, jabirean, janissaries, lions, brazen-bull
- **Unidades Obligatorias:** [object Object]

#### The House of Wisdom (`house-wisdom`)
- **Resumen:** Expedición de los sabios: 1-2 Jabirean Alchemists con sus secretos, Takwin Homunculi, Kavasses, Fāris y hasta 3 Lions of Jabir.
- **Regla Especial Principal:** House of Wisdom
- **Unidades Prohibidas:** yuzbasi, janissaries, sult-assassin
- **Unidades Obligatorias:** [object Object]

#### Defenders of the Iron Wall (`iron-wall-def`)
- **Resumen:** Guarnición del Iron Wall: Silahdar al mando, Janissary Officers, hasta 4 Sappers, Grand Cannons y tiradores expertos en posición elevada.
- **Regla Especial Principal:** Defenders of the Iron Wall
- **Unidades Prohibidas:** lions, yuzbasi, sult-assassin, janissaries
- **Unidades Obligatorias:** [object Object]

### Heretic Legions

#### Trench Ghosts (`trench-ghosts`)
- **Resumen:** Espectros semicorpóreos: FEAR, NEGATE DIFFICULT TERRAIN y NEGATE GAS para todos, -1 INJURY DICE contra disparos y sin Mercenarios ni modelos ARTIFICIAL.
- **Regla Especial Principal:** Trench Ghosts
- **Unidades Prohibidas:** war-wolf, art-witch

#### Knights of Avarice (`avarice-knights`)
- **Resumen:** Adoradores de Mammón: nada con FIRE ni SHRAPNEL, modelos de al menos 80 👑 (salvo Wretched), Goetic Warlocks y Price of Greed.
- **Regla Especial Principal:** Knights of Avarice
- **Unidades Prohibidas:** death-commando

#### Heretic Naval Raiders (`naval-raiders`)
- **Resumen:** Infantería de marina hereje: +1 DICE a la Risky de Dash, Submachine Guns a 25 👑, hasta 3 infiltrados y sin War Wolf.
- **Regla Especial Principal:** Heretic Naval Raiders
- **Unidades Prohibidas:** war-wolf

### Cult of the Black Grail

#### Dirge of the Great Hegemon (`great-hegemon`)
- **Resumen:** Cortejo fúnebre de un Hegemón caído: Executor al mando, Bereaved con armas a distancia y Command Bereaved ACTION.
- **Regla Especial Principal:** Dirge of the Great Hegemon
- **Unidades Prohibidas:** lord-tumours, amalgam
- **Unidades Obligatorias:** [object Object]

#### The Great Hunger (`great-hunger`)
- **Resumen:** Horda famélica guiada por una Matagot Hag: cada turno elige un efecto del Hambre que convierte los INFECTION MARKERS propios en ventaja.
- **Regla Especial Principal:** The Great Hunger
- **Unidades Prohibidas:** lord-tumours, corpse-guards, grail-thralls, heralds, amalgam
- **Unidades Obligatorias:** [object Object]

### Court of the Seven-Headed Serpent

#### Sin: Wrath (`sin-wrath`)
- **Resumen:** Pecado de la Ira. Bonificadores ofensivos al cuerpo a cuerpo. Aura of Wrath en el Desecrated Saint.
- **Regla Especial Principal:** Sin: Wrath

#### Sin: Envy (`sin-envy`)
- **Resumen:** Pecado de la Envidia. Bloqueo de cargas enemigas en formación cerrada. Aura of Envy en el Desecrated Saint.
- **Regla Especial Principal:** Sin: Envy

#### Sin: Lust (`sin-lust`)
- **Resumen:** Pecado de la Lujuria. Anula keywords de armadura enemiga. Aura of Lust en el Desecrated Saint.
- **Regla Especial Principal:** Sin: Lust

#### Sin: Pride (`sin-pride`)
- **Resumen:** Pecado de la Soberbia. BLOOD MARKERS automáticos en enemigos cercanos. Aura of Pride en el Desecrated Saint.
- **Regla Especial Principal:** Sin: Pride

#### Sin: Sloth (`sin-sloth`)
- **Resumen:** Pecado de la Pereza. Enemigos tratan Minor Hits como Down. Aura of Sloth en el Desecrated Saint.
- **Regla Especial Principal:** Sin: Sloth

#### Sin: Gluttony (`sin-gluttony`)
- **Resumen:** Pecado de la Gula. -1 DICE a tiradas enemigas a 8" (excepto BLACK GRAIL/ARTIFICIAL). Aura of Gluttony.
- **Regla Especial Principal:** Sin: Gluttony

#### Sin: Greed (`sin-greed`)
- **Resumen:** Pecado de la Avaricia. Cargas enemigas obligadas a apuntar al Desecrated Saint. Aura of Greed.
- **Regla Especial Principal:** Sin: Greed

