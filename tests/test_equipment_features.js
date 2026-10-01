const { extractEquipmentDetails } = require('../app/lib/weapon_helpers');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) {
    console.log('  ✓ ' + msg);
    pass++;
  } else {
    console.log('  ✗ ' + msg);
    fail++;
  }
}

console.log('\n--- Test 1: Tactical Equipment Actions ---');
const medikit = { name: 'Medi-kit' };
const medDetails = extractEquipmentDetails(medikit);
ok(medDetails.categoryTag === 'Médico', 'Medi-kit tiene categoría Médico');
ok(medDetails.actionGranted === 'Treat ACTION', 'Medi-kit concede Treat ACTION');
ok(medDetails.actionDescription.includes('1"') && medDetails.actionDescription.includes('Blood Marker'), 'Treat ACTION detalla alcance y efecto');

const binoculars = { name: 'Binoculars' };
const binocDetails = extractEquipmentDetails(binoculars);
ok(binocDetails.categoryTag === 'Óptica', 'Binoculars tiene categoría Óptica');
ok(binocDetails.actionGranted === 'Spotter ACTION', 'Binoculars concede Spotter ACTION');
ok(binocDetails.actionDescription.includes('Cover'), 'Spotter ACTION anula Cover');

const shovel = { name: 'Shovel' };
const shovelDetails = extractEquipmentDetails(shovel);
ok(shovelDetails.categoryTag === 'Trinchera', 'Shovel tiene categoría Trinchera');
ok(shovelDetails.actionGranted === 'Entrench ACTION', 'Shovel concede Entrench ACTION');
ok(shovelDetails.actionDescription.includes('marcador de Trinchera'), 'Entrench ACTION detalla colocación de trinchera');

const instrument = { name: 'Musical Instrument' };
const instDetails = extractEquipmentDetails(instrument);
ok(instDetails.categoryTag === 'Moral', 'Instrument tiene categoría Moral');
ok(instDetails.actionGranted === 'Rallying Horn ACTION', 'Instrument concede Rallying Horn ACTION');
ok(instDetails.actionDescription.includes('Morale Checks'), 'Instrument detalla bonificador a chequeos de moral');

const altar = { name: 'Golden Calf Altar' };
const altarDetails = extractEquipmentDetails(altar);
ok(altarDetails.categoryTag === 'Desplegable', 'Golden Calf Altar es Desplegable');
ok(altarDetails.actionGranted === 'Place Altar ACTION', 'Altar concede Place Altar ACTION');

const anqGuard = { name: 'Anq Guard' };
const anqDetails = extractEquipmentDetails(anqGuard);
ok(anqDetails.actionGranted === 'Combat Deployment ACTION', 'Anq Guard concede Combat Deployment ACTION');

console.log('\n--- Test 2: Passive Tools and Mobility ---');
const mountKit = { name: 'Mountaineer Kit' };
const mountDetails = extractEquipmentDetails(mountKit);
ok(mountDetails.categoryTag === 'Movilidad', 'Mountaineer Kit tiene categoría Movilidad');
ok(mountDetails.summary.includes('Climb'), 'Mountaineer Kit detalla ignorar penalizaciones por escalar');

const bloodCloak = { name: 'Blood Cloak' };
const cloakDetails = extractEquipmentDetails(bloodCloak);
ok(cloakDetails.traits.includes('SKIRMISHER'), 'Blood Cloak concede SKIRMISHER');

console.log('\n--- Test 3: Relics and Banners ---');
const anfarro = { name: 'Anfarro (Warriors Crown)' };
const anfarroDetails = extractEquipmentDetails(anfarro);
ok(anfarroDetails.categoryTag === 'Reliquia', 'Anfarro es Reliquia');
ok(anfarroDetails.summary.includes('+1 DICE') && anfarroDetails.summary.includes('Melee'), 'Anfarro detalla +1 DICE a Melee');
ok(anfarroDetails.traits.includes('HEADGEAR'), 'Anfarro tiene rasgo HEADGEAR');

const crucifix = { name: "Supreme Pontiff's Crucifix" };
const cruciDetails = extractEquipmentDetails(crucifix);
ok(cruciDetails.summary.includes('Inspiring Relic'), 'Crucifijo papal detalla regla Inspiring Relic');

const redBanner = { name: 'Red Banner' };
const bannerDetails = extractEquipmentDetails(redBanner);
ok(bannerDetails.categoryTag === 'Estandarte', 'Red Banner es Estandarte');
ok(bannerDetails.traits.includes('LEADER'), 'Red Banner tiene LEADER');

console.log('\n--- Test 4: Consumables and Enhancements ---');
const hashashin = { name: 'Hashashin Leaf', weaponKeywords: ['CONSUMABLE'] };
const leafDetails = extractEquipmentDetails(hashashin);
ok(leafDetails.categoryTag === 'Consumible', 'Hashashin Leaf es Consumible');
ok(leafDetails.traits.includes('STRONG'), 'Hashashin Leaf concede STRONG');
ok(leafDetails.traits.includes('CONSUMABLE'), 'Hashashin Leaf es CONSUMABLE');

const elixir = { name: 'Elixir of Al-Khidr', weaponKeywords: ['CONSUMABLE'] };
const elixirDetails = extractEquipmentDetails(elixir);
ok(elixirDetails.traits.includes('TOUGH'), 'Elixir of Al-Khidr concede TOUGH');

console.log('\n' + pass + ' passed · ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
