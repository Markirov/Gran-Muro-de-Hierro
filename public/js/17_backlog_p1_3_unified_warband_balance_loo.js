/* ======================================================================
   BACKLOG P1/3 — Unified warband balance lookup.

   In campaign context, balance lives in campaign.finances and is
   computed by campaignBalance. In free context, balance lives on
   wb.strongbox. This helper picks the right path so UI code stays
   context-agnostic.
   ====================================================================== */

/* P2/7 — One-shot retro-fill helper. Resets wb.strongbox and re-sums
 * fb.loot/fb.glory across all wb.freeBattles. Useful for warbands
 * that accumulated free battles before P1/3 landed (their strongbox
 * starts at 0 even though the battles already happened) or as a
 * "fix my balance" action after manual edits.
 */
function rebuildStrongboxFromFreeBattles(wb) {
  if (!wb) return;
  wb.strongbox = { ducados: 0, glory: 0 };
  const list = Array.isArray(wb.freeBattles) ? wb.freeBattles : [];
  for (const fb of list) {
    if (!fb) continue;
    if (typeof fb.loot  === 'number') wb.strongbox.ducados += fb.loot;
    if (typeof fb.glory === 'number') wb.strongbox.glory   += fb.glory;
  }
}

function getWarbandBalance(wb, c) {
  if (!wb) return { ducados: 0, glory: 0 };
  if (c && typeof campaignBalance === 'function') {
    return campaignBalance(c, wb.id);
  }
  const sb = wb.strongbox || { ducados: 0, glory: 0 };
  return {
    ducados: typeof sb.ducados === 'number' ? sb.ducados : 0,
    glory:   typeof sb.glory   === 'number' ? sb.glory   : 0,
  };
}


