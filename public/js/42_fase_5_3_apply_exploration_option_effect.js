/* ======================================================================
   FASE 5.3 — Apply exploration option effects.

   The canon table's options carry an `effect` object describing what
   happens when the player picks that option. Some effects are
   deterministic and trivially auto-appliable (add-ducats); others
   need interactive resolution (choose-battlekit, grant-xp-to-elites
   with maxModels >= 2, etc.). 5.3 implements the deterministic ones
   and serializes the rest as pendingEffect on the saved discovery so
   the historial preserves them for later UI passes.

     - extractExplorationEffectSummary(disc): {ducatsBonus, pending}.
       ducatsBonus captures add-ducats amount. Pending captures any
       other effect kind verbatim (or null when there's nothing).
     - sumExplorationDucatsBonus(w): total across all discoveries.

   wizardBattleToFreeBattle reads both: fb.loot grows by ducatsBonus,
   and fb.discoveries[i].pendingEffect carries the unresolved effect.
   ====================================================================== */


