const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { MachineFingerprinter } = require('./machine');

/**
 * 雲端授權驗證器
 * 需要連線到授權伺服器驗證
 */
class CloudLicenseVerifier {
  constructor() {
    this.apiEndpoint = process.env.SKILLFORGE_API || 'https://api.skillforge.dev/v1';
    this.licenseFile = path.join(process.env.HOME || process.env.USERPROFILE, '.skillforge', 'license.json');
    this.machineFP = new MachineFingerprinter();
  }

  /**
   * 初始化授權
   * 第一次使用時需要啟用
   */
  async initialize(licenseKey) {
    // 產生機器指紋
    const machineData = this.machineFP.generateFingerprint();
    
    console.log('🔐 正在驗證授權...');
    console.log(`📱 機器指紋: ${machineData.fingerprint}`);
    
    // 模擬雲端驗證（實際運作時會呼叫 API）
    // const response = await fetch(`${this.apiEndpoint}/license/activate`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     licenseKey,
    //     machineFingerprint: machineData.fingerprint,
    //     machineInfo: machineData.components
    //   })
    // });
    
    // 本地驗證模式（過渡期使用）
    const result = this.verifyLocally(licenseKey, machineData.fingerprint);
    
    if (result.valid) {
      // 儲存授權資訊
      this.saveLicense({
        licenseKey,
        machineFingerprint: machineData.fingerprint,
        tier: result.tier,
        activatedAt: new Date().toISOString(),
        expiresAt: result.expiresAt
      });
      
      console.log('✅ 授權驗證成功！');
      console.log(`📋 版本: ${result.tier.toUpperCase()}`);
      console.log(`⏰ 到期: ${new Date(result.expiresAt).toLocaleDateString()}`);
    } else {
      throw new Error(`授權驗證失敗: ${result.error}`);
    }
    
    return result;
  }

  /**
   * 驗證本地授權檔案
   */
  async verify() {
    // 讀取儲存的授權
    const licenseData = this.loadLicense();
    if (!licenseData) {
      throw new Error('未找到授權資訊，請先執行初始化');
    }
    
    // 產生當前機器指紋
    const currentMachine = this.machineFP.generateFingerprint();
    
    // 驗證機器是否匹配
    if (!this.machineFP.verifyFingerprint(
      licenseData.machineFingerprint,
      currentMachine.fingerprint
    )) {
      throw new Error('機器不匹配！此授權已綁定其他設備。如需轉移，請聯繫客服。');
    }
    
    // 檢查是否過期
    if (new Date(licenseData.expiresAt) < new Date()) {
      throw new Error('授權已過期，請續約或聯繫客服。');
    }
    
    return {
      valid: true,
      tier: licenseData.tier,
      licenseKey: licenseData.licenseKey
    };
  }

  /**
   * 本地驗證（過渡期使用）
   * 實際運作時會改為呼叫雲端 API
   */
  verifyLocally(licenseKey, machineFingerprint) {
    const { LicenseVerifier } = require('./verify');
    const verifier = new LicenseVerifier();
    
    // 驗證 License Key 格式
    const result = verifier.verify(licenseKey);
    if (!result.valid) {
      return result;
    }
    
    // 在實際雲端系統中，這裡會檢查：
    // 1. License 是否已綁定其他機器
    // 2. 是否超過最大啟用數
    // 3. 是否被列為黑名單
    
    return result;
  }

  /**
   * 解除綁定（轉移授權到新機器）
   */
  async unbind() {
    const licenseData = this.loadLicense();
    if (!licenseData) {
      throw new Error('未找到授權資訊');
    }
    
    console.log('🔄 正在解除機器綁定...');
    console.log(`📱 機器指紋: ${licenseData.machineFingerprint}`);
    
    // 實際運作時會呼叫 API：
    // await fetch(`${this.apiEndpoint}/license/unbind`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     licenseKey: licenseData.licenseKey,
    //     machineFingerprint: licenseData.machineFingerprint
    //   })
    // });
    
    // 刪除本地授權檔案
    if (fs.existsSync(this.licenseFile)) {
      fs.unlinkSync(this.licenseFile);
    }
    
    console.log('✅ 解除綁定成功！');
    console.log('💡 您現在可以在新設備上啟用此授權。');
  }

  saveLicense(data) {
    const dir = path.dirname(this.licenseFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.licenseFile, JSON.stringify(data, null, 2));
  }

  loadLicense() {
    if (!fs.existsSync(this.licenseFile)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(this.licenseFile, 'utf8'));
  }
}

module.exports = { CloudLicenseVerifier };
