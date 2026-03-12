const { SkillConfigBuilder } = require('./config');
const { CloudLicenseVerifier } = require('./license/cloud-verify');
const { IssueAutomation } = require('./actions/issue');
const { PRAnalyzer } = require('./actions/pr');
const { ReleaseManager } = require('./actions/release');

class SkillForgeGitHubAutomation {
  constructor() {
    this.config = null;
    this.licenseVerifier = new CloudLicenseVerifier();
    this.tier = null;
    this.initialized = false;
  }

  async initialize(config) {
    this.config = config;
    
    // 驗證機器綁定授權
    console.log('🔐 SkillForge GitHub Automation');
    console.log('═════════════════════════════════\n');
    
    try {
      // 嘗試驗證現有授權
      const verification = await this.licenseVerifier.verify();
      this.tier = verification.tier;
      this.initialized = true;
      
      console.log(`✅ 授權驗證成功 (${this.tier.toUpperCase()} 版本)`);
      console.log('═════════════════════════════════\n');
    } catch (error) {
      if (error.message.includes('未找到授權資訊')) {
        // 第一次使用，需要啟用
        if (!config.licenseKey) {
          throw new Error('首次使用需要提供 License Key。請向 @WhiDan66bot 購買。');
        }
        
        const activation = await this.licenseVerifier.initialize(config.licenseKey);
        this.tier = activation.tier;
        this.initialized = true;
        
        console.log('✅ 授權啟用成功！');
        console.log('═════════════════════════════════\n');
      } else {
        throw error;
      }
    }
    
    return this;
  }

  async execute(action) {
    if (!this.initialized) {
      throw new Error('請先呼叫 initialize() 初始化');
    }

    // 每次執行時驗證授權（防止過期）
    await this.licenseVerifier.verify();

    // 檢查權限
    if (!this.checkPermission(action.action)) {
      throw new Error(`❌ 功能 '${action.action}' 需要 ${this.getRequiredTier(action.action)} 版本`);
    }

    switch (action.action) {
      case 'issue.create':
        return await this.createIssue(action.params);
      case 'issue.list':
        return await this.listIssues(action.params);
      case 'pr.analyze':
        return await this.analyzePR(action.params);
      case 'release.create':
        return await this.createRelease(action.params);
      default:
        throw new Error(`未知功能: ${action.action}`);
    }
  }

  checkPermission(actionName) {
    const permissions = {
      lite: ['issue.create', 'issue.list', 'issue.update', 'pr.analyze'],
      pro: ['issue.create', 'issue.list', 'issue.update', 'pr.analyze', 'pr.summary', 'release.create', 'repo.stats'],
      enterprise: ['issue.create', 'issue.list', 'issue.update', 'pr.analyze', 'pr.summary', 'release.create', 'repo.stats', 'multi.repo', 'custom.rules']
    };
    
    return permissions[this.tier]?.includes(actionName) || false;
  }

  getRequiredTier(actionName) {
    if (['issue.create', 'issue.list', 'pr.analyze'].includes(actionName)) return 'Lite';
    if (['release.create', 'repo.stats'].includes(actionName)) return 'Pro';
    return 'Enterprise';
  }

  async createIssue(params) {
    const issue = new IssueAutomation(this.config);
    return await issue.create(params);
  }

  async listIssues(params) {
    const issue = new IssueAutomation(this.config);
    return await issue.list(params);
  }

  async analyzePR(params) {
    const pr = new PRAnalyzer(this.config);
    return await this.tier === 'lite' ? pr.basic(params) : pr.full(params);
  }

  async createRelease(params) {
    if (this.tier === 'lite') {
      throw new Error('❌ Release 自動化功能需要 Pro 或 Enterprise 版本\n💡 請升級: https://t.me/WhiDan66bot');
    }
    const release = new ReleaseManager(this.config);
    return await release.create(params);
  }

  /**
   * 解除機器綁定（轉移到新電腦）
   */
  async transferLicense() {
    await this.licenseVerifier.unbind();
  }
}

function createGitHubSkill() {
  return new SkillForgeGitHubAutomation();
}

module.exports = { SkillForgeGitHubAutomation, createGitHubSkill };
