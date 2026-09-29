// @ts-nocheck
/* ======================================================================
   GENERAL TERMS LIBRARY
   Game terms referenced from rules: Bloodbath Roll, Risky, Charge Bonus...
   ====================================================================== */
const GENERAL_TERMS_LIBRARY = {
  'Success Roll': {
    type: 'game-term',
    summary: 'Tira 2D6; por cada +DICE añade un dado y quédate con los 2 más altos, por cada -DICE añade uno y quédate con los 2 más bajos (+DICE y -DICE se anulan por parejas). Suma los 2 dados: 2-6 Failure, 7-11 Success, 12+ Critical Success.',
  },
  'Risky Success Roll': {
    type: 'game-term',
    summary: 'Se tira igual que una Success Roll, pero si es una Failure la activación del modelo termina inmediatamente. Si se hacía como parte de una ACTION fuera de su activación, esa ACTION termina.',
  },
  'Critical Success': {
    type: 'game-term',
    summary: 'Resultado de 12+ en una Success Roll. En un ataque, impacta y la Injury Roll recibe +1 INJURY DICE (las armas con CRITICAL tienen efectos extra según su keyword).',
  },
  'Bloodbath Roll': {
    type: 'game-term',
    summary: 'Al hacer una Injury Roll contra un enemigo puedes gastar 6 BLOOD MARKERS del objetivo (3 si está Down) para convertirla en Bloodbath Roll: tira 3D6 y suma los 3 (con INJURY DICE te quedas con los 3 más altos o más bajos). Con DEADLY, 4D6.',
  },
  'Charge Bonus': {
    type: 'game-term',
    summary: 'Al cargar, tira D6 y súmalo al Movement del modelo, hasta un máximo de 12". Un modelo que se levanta de Down lo tiene a la mitad; con Machine Armour (Bulky) es D3.',
  },
  'Injury Roll': {
    type: 'game-term',
    summary: 'Tira 2D6 con los +/- INJURY DICE (2 más altos o más bajos), suma los dados y aplica los INJURY MODIFIERS (máximo -3 en total). Tabla: 1 o menos No Effect; 2-6 Minor Hit (1 BLOOD MARKER); 7-8 Down (1 BLOOD MARKER, 2 si ya estaba Down); 9+ Out of Action. Modificadores habituales: +1 INJURY DICE por BLOOD MARKER gastado, -1 por BLESSING MARKER gastado, +1 por Critical Success, +1 en melee contra un Down, y la armadura del modelo.',
  },
  'BLOOD MARKER': {
    type: 'marker',
    summary: 'Se coloca 1 junto a un modelo cada vez que sufre una herida (máximo 6). Cuando tiras una Success Roll para ese modelo, tu rival puede gastar los que quiera: -1 DICE por marcador gastado. O, cuando tu rival hace una Injury Roll contra él, puede gastarlos: +1 INJURY DICE por marcador. Los marcadores gastados se retiran.',
  },
  'BLESSING MARKER': {
    type: 'marker',
    summary: 'Funciona como un BLOOD MARKER pero a tu favor (máximo 6). Al tirar una Success Roll para el modelo puedes gastar los que quieras: +1 DICE por marcador. O, cuando el rival hace una Injury Roll contra él, puedes gastarlos: -1 INJURY DICE por marcador. Los marcadores gastados se retiran.',
  },
  'INFECTION MARKER': {
    type: 'marker',
    summary: 'Funciona como un BLOOD MARKER (se gasta para modificar Success Rolls e Injury Rolls o para una Bloodbath Roll, y se puede combinar con BLOOD MARKERS). Un modelo puede tener hasta 6 de cada. Las reglas que retiran BLOOD MARKERS no retiran INFECTION MARKERS salvo que lo digan. The Infection Spreads: si un modelo con INFECTION MARKERS se activa, recibe 1 más antes de hacer ninguna ACTION.',
  },
  'MINED': {
    type: 'tag',
    summary: 'Pieza de terreno minada. Cuando un modelo se mueve hasta tocarla (sin tener NEGATE MINED), detona automáticamente: tirada de Injury con SHRAPNEL contra el modelo. Combat Engineers pueden colocar y desactivar MINED.',
  },
  'Out of Action': {
    type: 'game-term',
    summary: 'Resultado 9+ en la Injury Roll: el modelo se retira del campo de batalla. En campaña, tras la partida: los Troops hacen una Survival Roll (D6; con 1-2 mueren y salen del Roster) y los ELITE tiran D66 en la Trauma Table y reciben una Battle Scar (a la tercera, Unfit for Duty).',
  },
  'Down': {
    type: 'game-term',
    summary: 'Resultado 7-8 en la Injury Roll: 1 BLOOD MARKER y el modelo queda Down. Si le pasa durante su activación, esta termina. -1 DICE a sus Success Rolls; +1 INJURY DICE a los ataques cuerpo a cuerpo contra él; no puede moverse salvo si cae. Se levanta en su siguiente activación con el Movement a la mitad (también el Charge Bonus).',
  },
  'Activation': {
    type: 'game-term',
    summary: 'Los jugadores activan por turnos un modelo que no se haya activado, hasta activarlos todos. El modelo activado puede hacer cada ACTION una vez, en cualquier orden: Move, Charge o Retreat (solo una de las tres); Dash; Shoot; Fight; y otras ACTIONS propias. No puede Shoot y Charge/Fight en la misma activación salvo con un arma ASSAULT.',
  },
  'Treat ACTION': {
    type: 'game-term',
    summary: 'La concede el Medi-kit. Risky Success Roll: con Failure la activación termina; con Success o Critical Success, retira 1 BLOOD MARKER del modelo o de un amigo a 1", o levanta a un amigo Down a 1".',
  },
  'Dash ACTION': {
    type: 'game-term',
    summary: 'Se puede hacer además de un Move, Charge o Retreat. Tras una Risky Success Roll superada, el modelo mueve su Movement en cualquier dirección (no puede cargar ni retirarse); si falla, su activación termina.',
  },
  'Standfast': {
    type: 'effect',
    summary: 'Regla de la Machine Armour (y del Tank Palanquin): cuando el modelo sufre un resultado Down en la Injury Roll, se trata como Minor Hit.',
  },
  'Bulky': {
    type: 'effect',
    summary: 'Regla de la Machine Armour: la base pasa a 40mm salvo que ya sea de 40mm o mayor, no puede llevar Trench Shield y su Charge Bonus es D3" en vez de D6".',
  },
};


