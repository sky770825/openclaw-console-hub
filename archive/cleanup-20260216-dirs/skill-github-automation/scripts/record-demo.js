const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 確保輸出目錄存在
const outputDir = path.join(__dirname, '../assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function recordDemo() {
  console.log('🎬 開始錄製 Demo 影片...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 建立示範用的 HTML 頁面
  const demoHTML = `<!DOCTYPE html>
<html>
<head>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d1117;
  color: #c9d1d9;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.github-icon { font-size: 32px; }
.title { font-size: 20px; font-weight: 600; color: #f0f6fc; }
.content {
  flex: 1;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
.section {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.6s ease forwards;
}
@keyframes fadeInUp {
  to { opacity: 1; transform: translateY(0); }
}
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #58a6ff;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.code-block {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  font-family: 'SF Mono', monospace;
  font-size: 14px;
  overflow-x: auto;
  white-space: pre;
}
.success-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #238636;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 12px;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.feature-card {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}
.feature-card .emoji { font-size: 32px; margin-bottom: 8px; }
.feature-card .label { font-size: 14px; color: #8b949e; }
.cta {
  background: linear-gradient(90deg, #8957e5, #a371f7);
  color: white;
  padding: 16px 32px;
  border-radius: 8px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  margin-top: 32px;
}
</style>
</head>
<body>
  <div class="header">
    <span class="github-icon">🐙</span>
    <span class="title">SkillForge GitHub Automation Demo</span>
  </div>
  
  <div class="content">
    <div class="section" style="animation-delay: 0.2s;">
      <div class="section-title">✨ 四大核心功能</div>
      <div class="feature-grid">
        <div class="feature-card"><div class="emoji">📋</div><div class="label">Issue 自動化</div></div>
        <div class="feature-card"><div class="emoji">🔍</div><div class="label">PR 審查輔助</div></div>
        <div class="feature-card"><div class="emoji">🏷️</div><div class="label">Release 自動</div></div>
        <div class="feature-card"><div class="emoji">📊</div><div class="label">Repo 分析</div></div>
      </div>
    </div>
    
    <div class="section" style="animation-delay: 1s;">
      <div class="section-title">📋 Issue 自動化</div>
      <div class="code-block">// 自動建立 Issue 並加上標籤
await skill.execute({
  action: 'issue.create',
  params: {
    title: '[BUG] 登入失敗',
    labels: ['bug', 'priority-high'],
    assignees: ['developer']
  }
});</div>
      <div class="success-badge">✓ Issue #123 已建立</div>
    </div>
    
    <div class="section" style="animation-delay: 2s;">
      <div class="section-title">🔍 PR 審查輔助</div>
      <div class="code-block">// 分析 PR 變更統計
const analysis = await skill.execute({
  action: 'pr.analyze',
  params: { pullNumber: 42 }
});

// 變更檔案: 12 | 新增: 486 | 刪除: 123</div>
      <div class="success-badge">✓ PR #42 分析完成</div>
    </div>
    
    <div class="section" style="animation-delay: 3s;">
      <div class="section-title">🏷️ Release 自動化</div>
      <div class="code-block">// 一鍵建立 Release
await skill.execute({
  action: 'release.create',
  params: {
    tagName: 'v1.0.0',
    generateReleaseNotes: true
  }
});</div>
      <div class="success-badge">✓ Release v1.0.0 已發布</div>
    </div>
    
    <div class="section" style="animation-delay: 4s; text-align: center;">
      <div class="cta">立即體驗 @WhiDan66bot</div>
      <p style="margin-top: 16px; color: #8b949e;">USDT $20 起 • 支援 Lite / Pro / Enterprise</p>
    </div>
  </div>
</body>
</html>`;
  
  const tempFile = path.join(__dirname, 'demo-temp.html');
  fs.writeFileSync(tempFile, demoHTML);
  
  await page.goto(`file://${tempFile}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  
  // 截圖每一幀
  console.log('📸 錄製畫面...');
  const frameDir = path.join(__dirname, 'frames');
  fs.mkdirSync(frameDir, { recursive: true });
  
  const duration = 6000; // 6 秒
  const fps = 15;
  const totalFrames = (duration / 1000) * fps;
  
  for (let i = 0; i < totalFrames; i++) {
    await page.screenshot({ 
      path: path.join(frameDir, `frame_${String(i).padStart(4, '0')}.jpg`),
      type: 'jpeg',
      quality: 90
    });
    await new Promise(r => setTimeout(r, 1000 / fps));
    process.stdout.write(`\r  進度: ${Math.round((i + 1) / totalFrames * 100)}%`);
  }
  
  console.log('\n✅ 畫面錄製完成！\n');
  
  // 使用 ffmpeg 合併成影片
  console.log('🎞️  合成影片...');
  const outputPath = path.join(outputDir, 'demo.mp4');
  
  try {
    execSync(`ffmpeg -framerate ${fps} -i ${frameDir}/frame_%04d.jpg -c:v libx264 -pix_fmt yuv420p -y "${outputPath}" 2>&1`, { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log('✅ Demo 影片已儲存: assets/demo.mp4\n');
  } catch (err) {
    console.error('❌ ffmpeg 錯誤:', err.message);
  }
  
  // 清理
  fs.rmSync(frameDir, { recursive: true });
  fs.unlinkSync(tempFile);
  await browser.close();
  
  console.log('🎉 Demo 製作完成！');
}

recordDemo().catch(err => {
  console.error('❌ 錄製失敗:', err);
  process.exit(1);
});
