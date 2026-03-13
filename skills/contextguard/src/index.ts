import type { Skill, Context, SkillAPI } from '@openclaw/core';

/**
 * ContextGuard - 智能 Context 管理與優化助手
 * 
 * 核心功能：
 * 1. Context Monitor — 即時監控 context 使用率
 * 2. Smart Compaction — 智能建議 compact 時機
 * 3. Token Optimizer — 自動優化建議
 * 4. Cost Dashboard — 成本儀表板
 */

interface ContextStats {
  totalTokens: number;
  maxTokens: number;
  usagePercent: number;
  messages: number;
  estimatedCost: number;
}

interface OptimizationSuggestion {
  type: 'compact' | 'summarize' | 'remove';
  priority: 'low' | 'medium' | 'high';
  description: string;
  potentialSavings: number;
}

export default class ContextGuard implements Skill {
  name = 'contextguard';
  version = '0.1.0';
  description = '智能 Context 管理與優化助手';

  private api: SkillAPI | null = null;
  private config = {
    thresholdWarning: 0.7,
    thresholdCritical: 0.9,
    autoSuggest: true
  };

  async initialize(api: SkillAPI): Promise<void> {
    this.api = api;
    await this.loadConfig();
    
    // 註冊命令
    api.registerCommand('/context', this.handleCommand.bind(this));
    
    console.log('[ContextGuard] 已初始化');
  }

  private async loadConfig(): Promise<void> {
    const userConfig = await this.api?.getConfig('contextguard');
    if (userConfig) {
      this.config = { ...this.config, ...userConfig };
    }
  }

  private async handleCommand(args: string[]): Promise<string> {
    const subcommand = args[0] || 'status';

    switch (subcommand) {
      case 'status':
        return this.getStatusReport();
      case 'optimize':
        return this.getOptimizationReport();
      case 'dashboard':
        return this.getDashboardReport();
      case 'compact':
        return this.suggestCompaction();
      default:
        return `未知命令: ${subcommand}\n可用命令: status, optimize, dashboard, compact`;
    }
  }

  /**
   * Context Monitor — 即時監控 context 使用率
   */
  private async getContextStats(): Promise<ContextStats> {
    const context = await this.api?.getCurrentContext();
    if (!context) {
      throw new Error('無法獲取 context');
    }

    const totalTokens = context.tokenCount || 0;
    const maxTokens = context.maxTokens || 128000;
    const usagePercent = totalTokens / maxTokens;

    return {
      totalTokens,
      maxTokens,
      usagePercent,
      messages: context.messages?.length || 0,
      estimatedCost: this.estimateCost(totalTokens)
    };
  }

  private estimateCost(tokens: number): number {
    // 簡易成本估算 (以 GPT-4 為例)
    return (tokens / 1000) * 0.03;
  }

  private async getStatusReport(): Promise<string> {
    const stats = await this.getContextStats();
    const status = this.getStatusLevel(stats.usagePercent);

    return [
      '📊 ContextGuard 狀態報告',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      `📈 Token 使用: ${stats.totalTokens.toLocaleString()} / ${stats.maxTokens.toLocaleString()}`,
      `📊 使用率: ${(stats.usagePercent * 100).toFixed(1)}% ${status.icon}`,
      `💬 訊息數: ${stats.messages}`,
      `💰 估計成本: $${stats.estimatedCost.toFixed(4)}`,
      '',
      status.message
    ].join('\n');
  }

  private getStatusLevel(percent: number): { icon: string; message: string } {
    if (percent >= this.config.thresholdCritical) {
      return { icon: '🔴', message: '⚠️ Critical: 建議立即執行 /context compact' };
    }
    if (percent >= this.config.thresholdWarning) {
      return { icon: '🟡', message: '⚡ Warning: 建議考慮優化 context' };
    }
    return { icon: '🟢', message: '✅ 狀態良好' };
  }

  /**
   * Smart Compaction — 智能建議 compact 時機
   */
  private async suggestCompaction(): Promise<string> {
    const stats = await this.getContextStats();
    
    if (stats.usagePercent < this.config.thresholdWarning) {
      return '✅ Context 使用率較低，暫無需 compact';
    }

    const suggestions = await this.analyzeForCompaction();
    
    return [
      '📦 Smart Compaction 建議',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      ...suggestions.map((s, i) => `${i + 1}. [${s.priority.toUpperCase()}] ${s.description}`),
      '',
      '執行 compact: 使用 /new 開始新會話或執行系統 compact'
    ].join('\n');
  }

  private async analyzeForCompaction(): Promise<OptimizationSuggestion[]> {
    // 這裡實現智能分析邏輯
    return [
      {
        type: 'summarize',
        priority: 'high',
        description: '前 10 條訊息可摘要為上下文',
        potentialSavings: 0.3
      }
    ];
  }

  /**
   * Token Optimizer — 自動優化建議
   */
  private async getOptimizationReport(): Promise<string> {
    const suggestions = await this.generateOptimizations();
    
    if (suggestions.length === 0) {
      return '✅ 沒有明顯的優化建議';
    }

    return [
      '🔧 Token Optimizer 報告',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      ...suggestions.map((s, i) => 
        `${i + 1}. [${s.type}] ${s.description}\n   💡 預計節省: ${(s.potentialSavings * 100).toFixed(0)}%`
      ),
      '',
      '提示: 使用 /context dashboard 查看詳細分析'
    ].join('\n');
  }

  private async generateOptimizations(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const stats = await this.getContextStats();

    if (stats.usagePercent > 0.5) {
      suggestions.push({
        type: 'compact',
        priority: 'medium',
        description: '使用 /new 開啟新會話以重置 context',
        potentialSavings: 0.8
      });
    }

    return suggestions;
  }

  /**
   * Cost Dashboard — 成本儀表板
   */
  private async getDashboardReport(): Promise<string> {
    const stats = await this.getContextStats();

    return [
      '📈 Cost Dashboard',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      `📊 Token 使用: ${stats.totalTokens.toLocaleString()} / ${stats.maxTokens.toLocaleString()}`,
      `💰 當前會話成本: $${stats.estimatedCost.toFixed(4)}`,
      '',
      '📋 優化建議：',
      '• 定期使用 /context status 檢查使用率',
      '• 在 70% 時考慮優化',
      '• 在 90% 時強烈建議 /new',
      '',
      '💡 Tip: 設定 auto_suggest: true 可自動接收建議'
    ].join('\n');
  }

  /**
   * 鉤子：在每次對話後檢查 context 狀態
   */
  async onAfterMessage(): Promise<void> {
    if (!this.config.autoSuggest) return;

    const stats = await this.getContextStats();
    
    if (stats.usagePercent >= this.config.thresholdCritical) {
      this.api?.notify('🔴 ContextGuard: 使用率過高！建議執行 /context compact');
    } else if (stats.usagePercent >= this.config.thresholdWarning) {
      this.api?.notify('🟡 ContextGuard: 使用率上升，建議查看 /context status');
    }
  }
}
