/* ======================================================================
   FASE 5.1 — Exploration option picker helpers.

   Most discovery entries (canon p.113) offer multiple options. The
   wizard step now lets the user pick one; the pick is stored on the
   discovery record so the save path can serialize it and Fase 5.3 can
   apply the option's effect to the warband.

   optionIsAllowedFor honours the restriction.factionsAllowed shape
   used in the canon table. Absent restriction = anyone may pick; an
   empty factionsAllowed list = nobody may pick (corner case but kept
   strict to match the table's semantics).
   ====================================================================== */

function optionIsAllowedFor(opt, factionId) {
  if (!opt) return false;
  const restriction = opt.restriction;
  if (!restriction) return true;
  if (!('factionsAllowed' in restriction)) return true;
  const allowed = restriction.factionsAllowed;
  if (!Array.isArray(allowed)) return true;
  return factionId ? allowed.includes(factionId) : false;
}


