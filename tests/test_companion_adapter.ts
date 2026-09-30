import fs from 'fs';
import path from 'path';
import { 
  parseCompanionJson, 
  importCompanionWarband, 
  exportCompanionWarband 
} from '../app/lib/companion_adapter';

let pass = 0, fail = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    console.log('  ✓ ' + msg);
    pass++;
  } else {
    console.log('  ✗ ' + msg);
    fail++;
  }
}

console.log('=== TEST: Trench Companion Adapter (app/lib/companion_adapter.ts) ===\n');

// 1. Parsing & Validation
console.log('Group 1: Parsing & Validation');
const invalidResult = parseCompanionJson('not a json');
ok(!invalidResult.ok, 'Rechaza string que no es JSON');

const missingModels = parseCompanionJson('{"warband-name": "Test"}');
ok(!missingModels.ok, 'Rechaza JSON sin campo models');

const cazaRaw = fs.readFileSync(path.resolve(__dirname, '../Bandas/Caza2.json'), 'utf8');
const validResult = parseCompanionJson(cazaRaw);
ok(validResult.ok, 'Parsea exitosamente Bandas/Caza2.json');

// 2. Importación de Caza2.json
console.log('\nGroup 2: Importación de Bandas/Caza2.json');
const importResult = importCompanionWarband(cazaRaw);
ok(importResult.ok, 'Importación completada con éxito');
const wb = importResult.warband;
ok(wb.name === 'Protectores del Muro', 'Nombre de la banda importado correctamente');
ok(wb.factionId === 'iron-sultanate', 'Facción detectada: iron-sultanate');
ok(wb.variantId === 'iron-wall-def', 'Variante detectada: iron-wall-def (Defenders of the Iron Wall)');
ok(wb.budgetTotal === 700, `Presupuesto total calculado: ${wb.budgetTotal} (esperado 700)`);
ok(wb.ducatBank === 2, `Banco de ducados: ${wb.ducatBank} (esperado 2)`);
ok(wb.models.length === 9, `Modelos importados: ${wb.models.length} (esperado 9)`);

// 3. Inspección de unidades y battlekit
console.log('\nGroup 3: Verificación de unidades y armas en battlekit');
const silahdar = wb.models[0];
ok(silahdar.unitId === 'silahdar-iw', `Silahdar unitId mapeado a: ${silahdar.unitId}`);
ok(silahdar.name === 'Silahdar', `Nombre Silahdar: ${silahdar.name}`);
ok(silahdar.battlekit.length > 0, `Silahdar tiene ${silahdar.battlekit.length} armas/equipo en battlekit`);
ok(silahdar.battlekit.includes('trench-shield-is'), 'Silahdar tiene Trench Shield en battlekit');
ok(silahdar.battlekit.includes('medikit-is'), 'Silahdar tiene Medi-Kit en battlekit');
ok(silahdar.battlekit.includes('great-sword-is'), 'Silahdar tiene Greatsword en battlekit');
ok(silahdar.battlekit.includes('alaybozan-is'), 'Silahdar tiene Alaybozan en battlekit');

const janofficer = wb.models[1];
ok(janofficer.unitId === 'janofficer-iw', `Janissary Officer unitId: ${janofficer.unitId}`);
ok(janofficer.battlekit.includes('reinforced-is'), 'Janissary Officer tiene Reinforced Armour en battlekit');
ok(janofficer.battlekit.includes('shotgun-is'), 'Janissary Officer tiene Shotgun en battlekit');

const azeb = wb.models[2];
ok(azeb.unitId === 'azebs', `Azeb unitId: ${azeb.unitId}`);
ok(azeb.battlekit.includes('jezzail-is'), 'Azeb tiene Jezzail en battlekit');

const jabirean = wb.models[8];
ok(jabirean.unitId === 'jabirean', `Jabirean unitId: ${jabirean.unitId}`);
ok(jabirean.battlekit.includes('sniper-is'), 'Jabirean tiene Sniper Rifle en battlekit');
ok(jabirean.battlekit.includes('standard-is'), 'Jabirean tiene Standard Armour en battlekit');
ok(jabirean.battlekit.includes('binoculars-is'), 'Jabirean tiene Binoculars en battlekit');

// 4. Exportación a formato Trench Companion
console.log('\nGroup 4: Exportación canónica a Trench Companion JSON');
const exportResult = exportCompanionWarband(wb);
ok(!!exportResult.json, 'Exportación produce objeto JSON válido');
const exp = exportResult.json;
ok(exp['warband-name'] === 'Protectores del Muro', `Nombre exportado: ${exp['warband-name']}`);
ok(exp['ducat-rating'] === 698, `Rating exportado: ${exp['ducat-rating']} (esperado 698)`);
ok(exp['ducat-bank'] === 2, `Ducat bank exportado: ${exp['ducat-bank']} (esperado 2)`);
ok(exp.models.length === 9, `Modelos exportados: ${exp.models.length}`);

const expSilahdar = exp.models[0];
ok(expSilahdar['model-id'] === 'md_yuzbasicaptain_mv_silahdar', `Silahdar model-id: ${expSilahdar['model-id']}`);
ok(expSilahdar.cost.ducats === 169, `Silahdar coste: ${expSilahdar.cost.ducats} (esperado 169)`);
const eqNamesSilahdar = expSilahdar.equipment.map((e: any) => e['equipment-name']);
ok(eqNamesSilahdar.includes('Trench Shield'), 'Silahdar exporta Trench Shield');
ok(eqNamesSilahdar.includes('Greatsword / Greataxe'), 'Silahdar exporta Greatsword / Greataxe');
ok(eqNamesSilahdar.includes('Alaybozan'), 'Silahdar exporta Alaybozan');
ok(eqNamesSilahdar.includes('Alchemist Armour'), 'Silahdar exporta Alchemist Armour');

// 5. Round-trip: Re-importar el JSON exportado
console.log('\nGroup 5: Round-trip (Import -> Export -> Re-import)');
const reimportResult = importCompanionWarband(exportResult.jsonString);
ok(reimportResult.ok, 'Re-importación del export exitosa');
const rewb = reimportResult.warband;
ok(rewb.name === wb.name, 'Nombre preservado en round-trip');
ok(rewb.factionId === wb.factionId, 'Facción preservada en round-trip');
ok(rewb.variantId === wb.variantId, 'Variante preservada en round-trip');
ok(rewb.models.length === wb.models.length, 'Cantidad de modelos preservada');
ok(rewb.budgetTotal === wb.budgetTotal, 'Presupuesto preservado');

console.log(`\n========================================`);
console.log(`TOTAL: ${pass} pasados · ${fail} fallados`);
if (fail > 0) process.exit(1);
