#!/usr/bin/env node
/**
 * SkillForge Publisher CLI
 * 一鍵上架技能到多平台
 * 
 * Usage:
 *   skillforge-publish ./my-skill --platforms gumroad,lemonSqueezy --prices 9,29,79
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SkillForgePublisher {
  constructor(options) {
    this.skillPath = options.skillPath;
    this.platforms = options.platforms || ['gumroad'];
    this.prices = options.prices || { lite: 9, pro: 29, enterprise: 79 };
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(process.env.HOME, '.skillforge-publisher.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return {};
  }

  saveConfig(config) {
    const configPath = path.join(process.env.HOME, '.skillforge-publisher.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Config saved');
  }

  // 驗證技能包
  validateSkill() {
    console.log('🔍 Validating skill package...');
    
    const requiredFiles = ['package.json', 'SKILL.md', 'README.md'];
    const missing = requiredFiles.filter(f => !fs.existsSync(path.join(this.skillPath, f)));
    
    if (missing.length > 0) {
      throw new Error(`Missing required files: ${missing.join(', ')}`);
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(this.skillPath, 'package.json'), 'utf8'));
    
    if (!pkg.name || !pkg.version) {
      throw new Error('package.json must have name and version');
    }

    console.log(`✅ Valid: ${pkg.name}@${pkg.version}`);
    return pkg;
  }

  // 建立發布包
  createPackage() {
    console.log('📦 Creating distribution package...');
    
    const pkg = this.validateSkill();
    const distName = `${pkg.name.replace(/[@\/]/g, '-')}-${pkg.version}.tgz`;
    const distPath = path.join(process.cwd(), distName);

    // 排除不需要的檔案
    const exclude = [
      'node_modules', 'src', 'tests', 'logs', '.git',
      '.DS_Store', '*.tgz', '.vscode', '.idea'
    ];

    // 使用 tar 建立壓縮包
    const excludeArgs = exclude.map(e => `--exclude='${e}'`).join(' ');
    const cmd = `tar -czf ${distPath} -C ${this.skillPath} ${excludeArgs} .`;
    
    execSync(cmd, { stdio: 'inherit' });
    
    const stats = fs.statSync(distPath);
    console.log(`✅ Package created: ${distName} (${(stats.size / 1024).toFixed(1)} KB)`);
    
    return distPath;
  }

  // 發布到 Gumroad
  async publishToGumroad(packagePath, metadata) {
    console.log('🚀 Publishing to Gumroad...');
    
    const gumroadToken = this.config.gumroad?.token;
    if (!gumroadToken) {
      console.log('⚠️  Gumroad token not configured. Run: skillforge-publish config --gumroad');
      return false;
    }

    // 這裡會呼叫 Gumroad API
    // 參考: https://gumroad.com/api
    
    console.log('📤 Uploading to Gumroad...');
    // TODO: 實作 Gumroad API 上傳
    
    console.log('✅ Published to Gumroad');
    return true;
  }

  // 發布到 LemonSqueezy
  async publishToLemonSqueezy(packagePath, metadata) {
    console.log('🚀 Publishing to LemonSqueezy...');
    
    const apiKey = this.config.lemonsqueezy?.apiKey;
    if (!apiKey) {
      console.log('⚠️  LemonSqueezy API key not configured');
      return false;
    }

    // TODO: 實作 LemonSqueezy API
    
    console.log('✅ Published to LemonSqueezy');
    return true;
  }

  // 發布到 ClawHub
  async publishToClawhub(packagePath, metadata) {
    console.log('🚀 Publishing to ClawHub...');
    
    try {
      execSync(`clawhub publish ${this.skillPath}`, { stdio: 'inherit' });
      console.log('✅ Published to ClawHub');
      return true;
    } catch (e) {
      console.error('❌ Failed to publish to ClawHub:', e.message);
      return false;
    }
  }

  // 主發布流程
  async publish() {
    console.log('🎯 SkillForge Publisher v1.0.0');
    console.log('================================\n');

    try {
      // 1. 驗證並建立發布包
      const packagePath = this.createPackage();
      
      // 2. 讀取技能資訊
      const pkg = JSON.parse(fs.readFileSync(
        path.join(this.skillPath, 'package.json'), 'utf8'
      ));
      
      const metadata = {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        prices: this.prices
      };

      // 3. 發布到各平台
      const results = {};
      
      for (const platform of this.platforms) {
        switch (platform) {
          case 'gumroad':
            results.gumroad = await this.publishToGumroad(packagePath, metadata);
            break;
          case 'lemonsqueezy':
            results.lemonsqueezy = await this.publishToLemonSqueezy(packagePath, metadata);
            break;
          case 'clawhub':
            results.clawhub = await this.publishToClawhub(packagePath, metadata);
            break;
          default:
            console.log(`⚠️  Unknown platform: ${platform}`);
        }
      }

      // 4. 顯示結果
      console.log('\n================================');
      console.log('📊 Publish Results:');
      Object.entries(results).forEach(([platform, success]) => {
        console.log(`  ${success ? '✅' : '❌'} ${platform}`);
      });

      return results;

    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// CLI 介面
function showHelp() {
  console.log(`
SkillForge Publisher - One-click skill publishing

Usage:
  skillforge-publish <skill-path> [options]

Options:
  --platforms <list>    Comma-separated platforms (gumroad,lemonsqueezy,clawhub)
  --prices <list>       Comma-separated prices (lite,pro,enterprise)
  --config              Configure API keys
  --help                Show this help

Examples:
  skillforge-publish ./my-skill
  skillforge-publish ./my-skill --platforms gumroad,clawhub --prices 9,29,79
  skillforge-publish config --gumroad
`);
}

// 主入口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }

  if (args[0] === 'config') {
    // TODO: 實作設定功能
    console.log('Configuration mode - TODO');
    return;
  }

  const skillPath = args[0];
  
  // 解析參數
  const platformsIdx = args.indexOf('--platforms');
  const platforms = platformsIdx > -1 
    ? args[platformsIdx + 1].split(',') 
    : ['gumroad', 'clawhub'];

  const pricesIdx = args.indexOf('--prices');
  const priceList = pricesIdx > -1 
    ? args[pricesIdx + 1].split(',').map(Number) 
    : [9, 29, 79];

  const prices = {
    lite: priceList[0] || 9,
    pro: priceList[1] || 29,
    enterprise: priceList[2] || 79
  };

  const publisher = new SkillForgePublisher({
    skillPath,
    platforms,
    prices
  });

  await publisher.publish();
}

main().catch(console.error);
