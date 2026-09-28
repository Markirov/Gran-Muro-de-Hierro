/* ======================================================================
   ACTIONS
   ====================================================================== */

function onSelectFaction(factionId) {
  const wb = STATE.currentWarband;
  if (!wb) {
    STATE.currentWarband = newWarband(factionId);
    persistWarband(STATE.currentWarband);
    renderAll();
    return;
  }
  if (wb.factionId === factionId) return;
  if (wb.models.length > 0) {
    confirmModal({
      title: 'Cambiar facción',
      message: `Tu banda actual tiene ${wb.models.length} modelos. Cambiar de facción los eliminará. ¿Continuar?`,
      confirmText: 'Cambiar',
      onConfirm: () => {
        wb.factionId = factionId;
        wb.variantId = null;
        wb.models = [];
        wb.budgetTotal = DATA.factions[factionId].budget;
        STATE.selectedModelUid = null;
        persistWarband(wb);
        renderAll();
      }
    });
  } else {
    wb.factionId = factionId;
    wb.variantId = null;
    wb.budgetTotal = DATA.factions[factionId].budget;
    persistWarband(wb);
    renderAll();
  }
}

function addUnitToRoster(unit, isMerc=false) {
  let wb = STATE.currentWarband;
  if (!wb) {
    wb = newWarband();
    STATE.currentWarband = wb;
  }
  const model = {
    uid: uid(),
    unitId: unit.id,
    customName: null,
    battlekit: [],
    notes: '',
    isMercenary: !!isMerc,
  };
  if (unit.costAlt) model.costVariant = 'base';
  wb.models.push(model);
  STATE.selectedModelUid = model.uid;
  persistWarband(wb);
  renderAll();
}


