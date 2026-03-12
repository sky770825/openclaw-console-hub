const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Supabase License 管理系統
 * 用於雲端儲存和同步授權資料
 */
class SupabaseLicenseManager {
  constructor() {
    // 從環境變數讀取，或直接使用老蔡的 Supabase
    this.supabaseUrl = process.env.SUPABASE_URL || 'https://vbejswywswaeyfasnwjq.supabase.co';
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY; // 需要設定環境變數
    
    if (!this.supabaseKey) {
      throw new Error('請設定 SUPABASE_SERVICE_KEY 環境變數');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    this.localDbPath = path.join(__dirname, '../licenses.json');
  }

  /**
   * 同步本地授權到雲端
   */
  async syncToCloud() {
    console.log('☁️  正在同步到 Supabase...');
    
    // 讀取本地授權
    const localLicenses = JSON.parse(fs.readFileSync(this.localDbPath, 'utf8'));
    
    for (const [licenseKey, data] of Object.entries(localLicenses)) {
      const { error } = await this.supabase
        .from('licenses')
        .upsert({
          license_key: licenseKey,
          tier: data.tier,
          status: data.status,
          created_at: data.created_at,
          expires_at: data.expires_at,
          user_id: data.user_id,
          user_email: data.user_email,
          machine_fingerprint: data.machine_fingerprint,
          activated_at: data.activated_at,
          activations: data.activations,
          max_activations: data.max_activations,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'license_key'
        });
      
      if (error) {
        console.error(`❌ 同步失敗 ${licenseKey}:`, error);
      } else {
        console.log(`✅ 已同步: ${licenseKey}`);
      }
    }
    
    console.log('🎉 同步完成！');
  }

  /**
   * 從雲端恢復到本地
   */
  async syncFromCloud() {
    console.log('📥 正在從 Supabase 恢復...');
    
    const { data, error } = await this.supabase
      .from('licenses')
      .select('*');
    
    if (error) {
      console.error('❌ 恢復失敗:', error);
      return;
    }
    
    // 轉換為本地格式
    const localFormat = {};
    for (const row of data) {
      localFormat[row.license_key] = {
        tier: row.tier,
        status: row.status,
        created_at: row.created_at,
        expires_at: row.expires_at,
        user_id: row.user_id,
        user_email: row.user_email,
        machine_fingerprint: row.machine_fingerprint,
        activated_at: row.activated_at,
        activations: row.activations,
        max_activations: row.max_activations
      };
    }
    
    // 備份舊檔案
    if (fs.existsSync(this.localDbPath)) {
      const backupPath = this.localDbPath + '.backup.' + Date.now();
      fs.copyFileSync(this.localDbPath, backupPath);
      console.log(`📦 已備份舊檔案: ${backupPath}`);
    }
    
    // 寫入新檔案
    fs.writeFileSync(this.localDbPath, JSON.stringify(localFormat, null, 2));
    console.log(`🎉 已恢復 ${data.length} 個授權`);
  }

  /**
   * 查詢授權（從雲端）
   */
  async getLicenseFromCloud(licenseKey) {
    const { data, error } = await this.supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();
    
    if (error) return null;
    return data;
  }

  /**
   * 更新授權狀態（從雲端）
   */
  async updateLicenseInCloud(licenseKey, updates) {
    const { error } = await this.supabase
      .from('licenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('license_key', licenseKey);
    
    return !error;
  }

  /**
   * 獲取統計資訊
   */
  async getStats() {
    const { data, error } = await this.supabase
      .from('licenses')
      .select('tier, status, count');
    
    if (error) return null;
    
    const stats = {
      total: data.length,
      byTier: {},
      byStatus: {},
      active: 0,
      bound: 0
    };
    
    for (const row of data) {
      stats.byTier[row.tier] = (stats.byTier[row.tier] || 0) + 1;
      stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + 1;
      if (row.status === 'active') stats.active++;
      if (row.machine_fingerprint) stats.bound++;
    }
    
    return stats;
  }
}

// CLI 介面
async function main() {
  const manager = new SupabaseLicenseManager();
  const cmd = process.argv[2];
  
  switch (cmd) {
    case 'sync-to-cloud':
      await manager.syncToCloud();
      break;
    case 'sync-from-cloud':
      await manager.syncFromCloud();
      break;
    case 'stats':
      const stats = await manager.getStats();
      console.log('\n📊 授權統計:\n');
      console.log(JSON.stringify(stats, null, 2));
      break;
    default:
      console.log('使用方式:');
      console.log('  node supabase-license.js sync-to-cloud    # 上傳到雲端');
      console.log('  node supabase-license.js sync-from-cloud  # 從雲端恢復');
      console.log('  node supabase-license.js stats            # 查看統計');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SupabaseLicenseManager };
