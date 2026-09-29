const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000/bandas/roster');
  
  await page.evaluate(() => {
    const mockWb = {
      id: 'mock_123',
      factionId: 'iron-sultanate',
      name: 'Test Warband',
      budgetTotal: 700,
      glory: 0,
      models: [
        { uid: 'm_test1', unitId: 'trench-janissary', isElite: true, equipment: [], battlekit: [] }
      ]
    };
    localStorage.setItem('warband-forge-v1:current', 'mock_123');
    localStorage.setItem('warband-forge-v1:mock_123', JSON.stringify(mockWb));
  });
  
  await page.reload();
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Clicking model...');
  await page.evaluate(() => {
    const el = document.querySelector('.space-y-2 > div');
    if (el) el.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  const html = await page.evaluate(() => document.body.innerHTML);
  const fs = require('fs');
  fs.writeFileSync('puppeteer_output.html', html);
  console.log('Saved to puppeteer_output.html');
  await browser.close();
})();
