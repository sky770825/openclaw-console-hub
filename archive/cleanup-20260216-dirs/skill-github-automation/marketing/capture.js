const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function capturePosters() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1920, height: 3000 }
  });
  
  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'posters.html');
  
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  // 等待一下確保字體渲染
  await new Promise(r => setTimeout(r, 1000));
  
  // 截圖主海報 (1200x630)
  const poster1 = await page.$('.poster-main');
  await poster1.screenshot({ 
    path: path.join(__dirname, 'poster-1200x630.png'),
    type: 'png'
  });
  console.log('✅ 主海報 1200x630 已儲存');
  
  // 截圖 IG 方形 (1080x1080)
  const poster2 = await page.$('.poster-ig');
  await poster2.screenshot({ 
    path: path.join(__dirname, 'poster-1080x1080.png'),
    type: 'png'
  });
  console.log('✅ IG 方形 1080x1080 已儲存');
  
  // 截圖限時動態 (1080x1920)
  const poster3 = await page.$('.poster-story');
  await poster3.screenshot({ 
    path: path.join(__dirname, 'poster-1080x1920.png'),
    type: 'png'
  });
  console.log('✅ 限時動態 1080x1920 已儲存');
  
  // 截圖 Logo (512x512)
  const logo = await page.$('.logo-poster');
  await logo.screenshot({ 
    path: path.join(__dirname, 'logo-512x512.png'),
    type: 'png'
  });
  console.log('✅ Logo 512x512 已儲存');
  
  await browser.close();
  console.log('\n🎉 全部海報製作完成！');
}

capturePosters().catch(console.error);
