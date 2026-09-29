const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000/bandas/roster');
  
  // Set localStorage to simulate selected warband
  await page.evaluate(() => {
    const mockWb = {
      id: 'mock_123',
      factionId: 'new-antioch',
      name: 'Test Warband',
      budgetTotal: 700,
      glory: 0,
      models: [
        { uid: 'm_test1', unitId: 'mechanized-heavy-infantry', isElite: true, equipment: [], battlekit: [] }
      ]
    };
    localStorage.setItem('warband-forge-v1:current', 'mock_123');
    localStorage.setItem('warband-forge-v1:mock_123', JSON.stringify(mockWb));
  });
  
  await page.reload();
  await new Promise(r => setTimeout(r, 2000));
  
  // Click on the model in RosterList
  console.log('Clicking model...');
  await page.evaluate(() => {
    const el = document.querySelector('.space-y-2 > div');
    if (el) el.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  console.log('Done.');
  await browser.close();
})();
