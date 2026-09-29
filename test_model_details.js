import { getUnit, effectiveStats, effectiveKeywords, allAvailableUpgrades, effectiveUnitName, armouryItemsForWarband, foreignArmouryItems, battlekitPurchaseCost, displayAbilitiesForCard } from './app/lib/cost_calculation';
import { classifyBattlekitItem } from './app/lib/battlekit_legality_engine';
const wb = {
    id: 'test',
    factionId: 'new-antioch',
    name: 'Test Warband',
    budgetTotal: 700,
    glory: 0,
    models: [
        { uid: 'm_test1', unitId: 'mechanized-heavy-infantry', isElite: true, equipment: [], battlekit: [] }
    ]
};
const model = wb.models[0];
const unit = getUnit(wb.factionId, model.unitId);
console.log('Unit found:', unit.name);
effectiveStats(model, unit, wb);
effectiveKeywords(model, unit, wb);
allAvailableUpgrades(unit, wb);
effectiveUnitName(model, unit);
armouryItemsForWarband(wb, 'ranged');
foreignArmouryItems(wb);
const items = armouryItemsForWarband(wb, 'ranged');
items.forEach(item => {
    classifyBattlekitItem(item, model, unit, wb);
    battlekitPurchaseCost(item, model, unit, wb);
});
displayAbilitiesForCard(model, unit);
console.log('All function calls succeeded!');
