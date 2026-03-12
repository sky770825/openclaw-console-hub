const crypto = require('crypto');

/**
 * SkillForge License Key 驗證器
 * 
 * 使用方式:
 * node verify-license.js --key=SF-LT-XXXX...
 * 
 * 或在程式中使用:
 * const { LicenseVerifier } = require('./verify-license');
 * const verifier = new LicenseVerifier();
 * const result = verifier.verify('SF-LT-XXXX...');
 */

class LicenseVerifier {
  constructor() {
    this.secret = process.env.LICENSE_SECRET || 'skillforge-secret-key-2026';
    this.prefixes = {
      'SF-LT': 'lite',
      'SF-PR': 'pro',
      'SF-EN': 'enterprise'
    };
  }

  verify(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return { valid: false, error: 'Invalid license key format' };
    }

    const parts = licenseKey.split('-');
    
    // 檢查格式
    if (parts.length !== 5) {
      return { valid: false, error: 'Invalid license key format' };
    }

    // License format: PREFIX-TIMESTAMP-RANDOM-HASH
    // PREFIX includes tier code (e.g., "SF-LT")
    // So we need to reconstruct: parts[0]-parts[1] = "SF-LT"
    const prefixCode = `${parts[0]}-${parts[1]}`; // e.g., "SF-LT"
    const timestamp = parts[2];
    const random = parts[3];
    const hash = parts[4];
    
    // 檢查 prefix
    if (!this.prefixes[prefixCode]) {
      return { valid: false, error: 'Invalid license tier' };
    }

    // 驗證 hash
    const data = `${prefixCode}-${timestamp}-${random}`;
    const expectedHash = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    if (hash !== expectedHash) {
      return { valid: false, error: 'Invalid license key' };
    }

    // 檢查是否過期（可選）
    const tier = this.prefixes[prefixCode];
    const createdAt = parseInt(parseInt(timestamp, 36).toString(10));
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    
    if (now - createdAt > oneYear) {
      return { valid: false, error: 'License expired' };
    }

    return {
      valid: true,
      tier: tier,
      maxActivations: tier === 'enterprise' ? 5 : 1,
      createdAt: new Date(createdAt).toISOString()
    };
  }

  getTier(licenseKey) {
    const result = this.verify(licenseKey);
    return result.valid ? result.tier : null;
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

  if (!params.key) {
    console.log('使用方法:');
    console.log('  node verify-license.js --key=SF-LT-XXXX...');
    process.exit(1);
  }

  const verifier = new LicenseVerifier();
  const result = verifier.verify(params.key);

  console.log('\n🔐 License 驗證結果:\n');
  
  if (result.valid) {
    console.log('✅ 驗證成功');
    console.log(`   版本: ${result.tier.toUpperCase()}`);
    console.log(`   最大啟用數: ${result.maxActivations}`);
    console.log(`   建立時間: ${result.createdAt}`);
  } else {
    console.log('❌ 驗證失敗');
    console.log(`   原因: ${result.error}`);
  }
  
  console.log();
}

if (require.main === module) {
  main();
}

module.exports = { LicenseVerifier };
