import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: '/Users/john/Desktop/coding/sock-template/v2_preview.png' });
  console.log("Screenshot saved to /Users/john/Desktop/coding/sock-template/v2_preview.png");
  await browser.close();
})();
