/* ======================================================================
   FASE 9 — Filtros canon-extendido para contexto libre.

   En partida libre, la banda se forrajea entre encargos del Patron:
     - No recibe dados/habilidades de Patron.
     - No compra Glory Items en el Quartermaster.

   Estas dos funciones son puras y defensivas. Hoy CAMPAIGN_TABLES
   .advancements no incluye Patron entries y openQuartermaster no abre
   en contexto libre (P1/3 deferred). Los filtros sirven como guard
   para cuando esos entry points sí surfean Patron/Glory items.
   ====================================================================== */

function filterAdvancementsForContext(list, context) {
  if (!Array.isArray(list)) return [];
  if (context !== 'free') return list.slice();
  return list.filter(a => {
    if (!a) return false;
    if (a.category && String(a.category).toLowerCase() === 'patron') return false;
    if (a.name && /Patron/i.test(a.name)) return false;
    return true;
  });
}


