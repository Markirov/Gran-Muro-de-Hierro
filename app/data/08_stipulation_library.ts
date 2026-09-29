// @ts-nocheck
/* ======================================================================
   STIPULATION LIBRARY
   Equipment stipulations that appear in the `restriction` field of items.
   Used by the PDF glossary "Estipulaciones de equipo" subsection.
   ====================================================================== */
// Términos en mayúsculas de GENERAL_TERMS_LIBRARY con entrada en el glosario
// (p. ej. MINED). Los marcadores conservan su texto largo (Placing/Spending,
// Rulebook 1.0.2).
for (const k of Object.keys(GENERAL_TERMS_LIBRARY)) {
  if (k !== k.toUpperCase() || GENERAL_TERMS_LIBRARY[k].type === 'marker') continue;
  const t = glossaryText(k);
  if (t) GENERAL_TERMS_LIBRARY[k] = Object.assign({}, GENERAL_TERMS_LIBRARY[k], { summary: t });
}

export const STIPULATION_LIBRARY = {
  'ELITE only': {
    type: 'stipulation',
    summary: 'Solo se puede comprar para modelos con la keyword ELITE ("X only": solo modelos de la Warband Entry X o con la keyword X).',
  },
  'Mech. Heavy Inf. only': {
    type: 'stipulation',
    summary: 'Solo se puede comprar para modelos de la Warband Entry Mechanized Heavy Infantry ("X only").',
  },
  'ELITE & Mech. Heavy Inf. only': {
    type: 'stipulation',
    summary: 'Solo se puede comprar para modelos ELITE o Mechanized Heavy Infantry.',
  },
  'Limit: N': {
    type: 'stipulation',
    summary: 'La banda no puede tener más de N piezas de este Battlekit en total. Si se pierden durante la campaña, se pueden comprar para reponerlas. "Limit: 1 excluding Mechanized Heavy Infantry": las de la MHI no cuentan.',
  },
  'Unique': {
    type: 'stipulation',
    summary: 'Etiqueta de Trench Companion / Forge: no es una estipulación de Warbands of Trench Crusade (allí se usa Limit: X, máximo de copias en la banda).',
  },
  'Consumable': {
    type: 'stipulation',
    summary: 'Este Battlekit se retira del Roster de la banda al final de la partida en que se usa.',
  },
  'Shield Combo': {
    type: 'stipulation',
    summary: 'Un modelo puede llevar un escudo y un arma de 2 manos a la vez si ambos tienen la estipulación Shield Combo.',
  },
  'Headgear': {
    type: 'stipulation',
    summary: 'Un modelo no puede tener más de una pieza de Headgear (aunque tenga más de una cabeza).',
  },
  'Bayonet Lug': {
    type: 'stipulation',
    summary: 'Hay que comprar un arma a distancia con la estipulación Bayonet Lug antes de poder comprar una Bayonet para ese modelo.',
  },
};



