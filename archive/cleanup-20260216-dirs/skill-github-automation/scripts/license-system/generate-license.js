const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * SkillForge License Key 產生器
 * 
 * 使用方式:
 * node generate-license.js --tier=lite --count=5
 * node generate-license.js --tier=pro --count=1 --output=licenses.json
 */

class LicenseGenerator {
  constructor() {
    this.secret = process.env.LICENSE_SECRET || 'skillforge-secret-key-2026';
    this.prefixes = {
      lite: 'SF-LT',
      pro: 'SF-PR',
      enterprise: 'SF-EN'
    };
  }

  generateKey(tier = 'lite') {
    const prefix = this.prefixes[tier] || this.prefixes.lite;
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // 產生驗證碼
    const data = `${prefix}-${timestamp}-${random}`;
    const hash = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
    
    return `${prefix}-${timestamp}-${random}-${hash}`;
  }

  generateBatch(tier, count) {
    const licenses = [];
    for (let i = 0; i < count; i++) {
      licenses.push({
        key: this.generateKey(tier),
        tier: tier,
        createdAt: new Date().toISOString(),
        status: 'active',
        activations: 0,
        maxActivations: tier === 'enterprise' ? 5 : 1
      });
    }
    return licenses;
  }

  saveToFile(licenses, filename) {
    const outputPath = path.resolve(filename);
    fs.writeFileSync(outputPath, JSON.stringify(licenses, null, 2));
    console.log(`✅ 已儲存 ${licenses.length} 個 License Key 到 ${outputPath}`);
  }
}

// CLI 介面
function main() {
  const args = process.argv.slice(2);
  const params = {};
  
  args.forEach(arg => {
    const [key, value] = arg.replace('--', '').split('=');
    params[key] = value;
  });

  const tier = params.tier || 'lite';
  const count = parseInt(params.count) || 1;
  const output = params.output || `licenses-${tier}-${Date.now()}.json`;

  // 驗證 tier
  if (!['lite', 'pro', 'enterprise'].includes(tier)) {
    console.error('❌ 錯誤: tier 必須是 lite、pro 或 enterprise');
    process.exit(1);
  }

  const generator = new LicenseGenerator();
  const licenses = generator.generateBatch(tier, count);
  
  console.log(`\n🎫 產生 ${count} 個 ${tier.toUpperCase()} License Key:\n`);
  licenses.forEach((license, i) => {
    console.log(`${i + 1}. ${license.key}`);
  });
  
  generator.saveToFile(licenses, output);
  
  console.log('\n💡 使用方式:');
  console.log('  驗證: node verify-license.js --key=SF-LT-XXXX...');
}

if (require.main === module) {
  main();
}

module.exports = { LicenseGenerator };
