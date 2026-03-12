const crypto = require('crypto');

class LicenseVerifier {
  constructor() {
    this.secret = 'skillforge-secret-key-2026';
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
    if (parts.length !== 5) {
      return { valid: false, error: 'Invalid license key format' };
    }

    const prefixCode = `${parts[0]}-${parts[1]}`;
    const timestamp = parts[2];
    const random = parts[3];
    const hash = parts[4];

    if (!this.prefixes[prefixCode]) {
      return { valid: false, error: 'Invalid license tier' };
    }

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

    const tier = this.prefixes[prefixCode];
    const createdAt = parseInt(parseInt(timestamp, 36).toString(10));
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    return {
      valid: true,
      tier: tier,
      maxActivations: tier === 'enterprise' ? 5 : 1,
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(createdAt + oneYear).toISOString()
    };
  }
}

module.exports = { LicenseVerifier };
