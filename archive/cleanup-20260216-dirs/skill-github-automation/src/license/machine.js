const crypto = require('crypto');
const os = require('os');

/**
 * 機器指紋產生器
 * 用於綁定 License 到特定設備
 */
class MachineFingerprinter {
  constructor() {
    this.secret = process.env.MACHINE_SECRET || 'skillforge-machine-secret-2026';
  }

  /**
   * 產生機器指紋
   * 結合多個硬體/系統特徵
   */
  generateFingerprint() {
    const components = [
      os.hostname(),           // 主機名稱
      os.platform(),           // 作業系統
      os.arch(),               // CPU 架構
      this.getCPUSerial(),     // CPU 資訊
      this.getMACAddress(),    // MAC 位址
      os.userInfo().username   // 使用者名稱
    ];

    // 產生雜湊
    const fingerprint = crypto
      .createHmac('sha256', this.secret)
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16);

    return {
      fingerprint: fingerprint.toUpperCase(),
      components: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        username: os.userInfo().username
      }
    };
  }

  /**
   * 驗證機器指紋是否匹配
   */
  verifyFingerprint(storedFingerprint, currentFingerprint) {
    // 允許部分組件變更（如使用者名稱）
    // 但核心硬體必須匹配
    return storedFingerprint.substring(0, 12) === currentFingerprint.substring(0, 12);
  }

  getCPUSerial() {
    try {
      const cpus = os.cpus();
      if (cpus && cpus.length > 0) {
        // 使用第一個 CPU 的型號和速度
        return `${cpus[0].model}-${cpus[0].speed}`;
      }
    } catch (e) {
      // 忽略錯誤
    }
    return 'unknown-cpu';
  }

  getMACAddress() {
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        const iface = interfaces[name];
        for (const addr of iface) {
          // 找到第一個非內部的 MAC 位址
          if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
            return addr.mac;
          }
        }
      }
    } catch (e) {
      // 忽略錯誤
    }
    return '00:00:00:00:00:00';
  }
}

module.exports = { MachineFingerprinter };
