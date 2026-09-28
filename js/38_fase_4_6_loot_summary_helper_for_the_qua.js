/* ======================================================================
   FASE 4.6 — Loot summary helper for the Quartermaster step.

   Sums each participant's earnings from the Resultados step
   (ducatsEarned, gloryEarned) with the lootDucats produced by the
   Exploration roll for that warband. Pillaged rolls still grant loot
   per canon (rollTotal × 10), so they contribute too.

   Application of these totals to the actual warband (campaign:
   campaign.finances; free: a strongbox field on the warband) is the
   responsibility of the save path in Fase 4.7. This function is a
   read-only snapshot used by the QM step to show the player what is
   about to be applied.
   ====================================================================== */


