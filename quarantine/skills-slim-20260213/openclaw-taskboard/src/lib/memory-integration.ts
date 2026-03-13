/**
 * Memory Integration Module - SeekDB 記憶整合模組
 * 
 * 提供任務執行前的記憶查詢和執行後的記憶記錄功能
 */

import type {
  TaskMemory,
  MemoryQueryResult,
  MemoryQueryOptions,
  MemoryContext,
  MemoryIntegrationConfig
} from '../types/memory';

// 預設配置
const DEFAULT_CONFIG: MemoryIntegrationConfig = {
  enabled: true,
  collectionName: 'taskboard_memories',
  recordFailures: true,
  similarityThreshold: 0.6,
  defaultQueryOptions: {
    strategy: 'hybrid',
    threshold: 0.5,
    limit: 5,
    hours: 168 // 7天
  }
};

/**
 * SeekDB Memory Client 包裝類
 */
class SeekDBMemoryClient {
  private config: MemoryIntegrationConfig;
  private client: any = null;
  private collection: any = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<MemoryIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化 SeekDB 連接
   */
  async initialize(): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('[MemoryIntegration] 記憶功能已禁用');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      // 動態導入 SeekDB 模組
      const seekdbPath = process.env.SEEKDB_MODULE_PATH || 
        '/Users/sky770825/.openclaw/workspace/seekdb-memory-integration/src/config/database.js';
      
      const { createClient, createEmbeddingFunction } = await import(seekdbPath);
      
      this.client = await createClient();
      
      const embeddingFunction = createEmbeddingFunction();
      
      this.collection = await this.client.getOrCreateCollection({
        name: this.config.collectionName,
        configuration: {
          dimension: 4096, // Qwen3 Embedding 維度
          distance: 'cosine',
        },
        embeddingFunction,
      });

      this.isInitialized = true;
      console.log(`[MemoryIntegration] SeekDB 連接成功，集合: ${this.config.collectionName}`);
      return true;
    } catch (error) {
      console.error('[MemoryIntegration] SeekDB 初始化失敗:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 記錄任務記憶
   */
  async recordMemory(memory: TaskMemory): Promise<boolean> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return false;
    }

    // 如果禁用記錄失敗任務，且狀態為失敗，則跳過
    if (!this.config.recordFailures && memory.status === 'failed') {
      console.log('[MemoryIntegration] 跳過記錄失敗任務（配置設定）');
      return false;
    }

    try {
      // 構建記憶文件內容（用於向量嵌入）
      const document = this.buildMemoryDocument(memory);
      
      // 構建元數據
      const metadata = {
        taskType: memory.taskType,
        agentType: memory.agentType,
        status: memory.status,
        complexity: memory.complexity,
        timestamp: memory.timestamp,
        workflowId: memory.workflowId || '',
        duration: memory.duration || 0,
        hasError: !!memory.error,
        hasSolution: !!memory.solution,
      };

      await this.collection.add({
        ids: memory.id,
        documents: document,
        metadatas: metadata,
      });

      console.log(`[MemoryIntegration] 記憶已記錄: ${memory.id}`);
      return true;
    } catch (error) {
      console.error('[MemoryIntegration] 記錄記憶失敗:', error);
      return false;
    }
  }

  /**
   * 查詢相似任務記憶
   */
  async queryMemories(
    query: string,
    options: MemoryQueryOptions = {}
  ): Promise<MemoryQueryResult[]> {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return [];
    }

    const opts = { ...this.config.defaultQueryOptions, ...options };
    
    try {
      let results: any[];

      switch (opts.strategy) {
        case 'threshold':
          results = await this.queryByThreshold(query, opts.threshold || 0.5);
          break;
        case 'limit':
          results = await this.queryByLimit(query, opts.limit || 5);
          break;
        case 'timeDecay':
          results = await this.queryWithTimeDecay(query, opts.threshold || 0.5, opts.hours || 168);
          break;
        case 'hybrid':
        default:
          results = await this.queryHybrid(query, opts.threshold || 0.5, opts.limit || 5);
          break;
      }

      // 過濾條件
      if (opts.taskType) {
        results = results.filter(r => r.metadata?.taskType === opts.taskType);
      }
      if (opts.agentType) {
        results = results.filter(r => r.metadata?.agentType === opts.agentType);
      }

      // 轉換為 MemoryQueryResult
      return results.map(r => ({
        memory: this.convertToTaskMemory(r),
        similarity: r.similarity,
        timeWeight: r.timeWeight,
        weightedScore: r.weightedScore,
      }));
    } catch (error) {
      console.error('[MemoryIntegration] 查詢記憶失敗:', error);
      return [];
    }
  }

  /**
   * 取得記憶上下文（用於注入 prompt）
   */
  async getMemoryContext(
    taskDescription: string,
    options?: MemoryQueryOptions
  ): Promise<MemoryContext> {
    const memories = await this.queryMemories(taskDescription, options);
    
    if (memories.length === 0) {
      return {
        relevantMemories: [],
        summary: '沒有找到相關的歷史記憶。'
      };
    }

    // 分析記憶生成建議
    const suggestions: string[] = [];
    const similarErrors: string[] = [];

    for (const mem of memories) {
      const { memory, similarity } = mem;
      
      // 檢查失敗記錄
      if (memory.status === 'failed' && memory.error) {
        similarErrors.push(`[相似度: ${(similarity * 100).toFixed(0)}%] ${memory.error}`);
        if (memory.solution) {
          suggestions.push(`之前類似問題的解決方案: ${memory.solution}`);
        }
      }
      
      // 檢查成功的複雜任務
      if (memory.status === 'success' && memory.complexity === 'high') {
        suggestions.push(`參考之前成功的 ${memory.agentType} 執行經驗`);
      }
    }

    // 生成摘要
    const summary = this.generateContextSummary(memories);

    return {
      relevantMemories: memories,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      similarErrors: similarErrors.length > 0 ? similarErrors : undefined,
      summary
    };
  }

  /**
   * 閾值查詢
   */
  private async queryByThreshold(query: string, threshold: number): Promise<any[]> {
    const results = await this.collection.query({
      queryTexts: query,
      nResults: 50,
    });

    const memories: any[] = [];
    const ids = results.ids[0];
    const documents = results.documents[0];
    const distances = results.distances?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];

    for (let i = 0; i < ids.length; i++) {
      const similarity = 1 - (distances[i] || 0);
      if (similarity >= threshold) {
        memories.push({
          id: ids[i],
          document: documents[i],
          metadata: metadatas[i],
          similarity: parseFloat(similarity.toFixed(4)),
        });
      }
    }

    return memories;
  }

  /**
   * 限制數量查詢
   */
  private async queryByLimit(query: string, limit: number): Promise<any[]> {
    const results = await this.collection.query({
      queryTexts: query,
      nResults: limit,
    });

    const memories: any[] = [];
    const ids = results.ids[0];
    const documents = results.documents[0];
    const distances = results.distances?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];

    for (let i = 0; i < ids.length; i++) {
      const similarity = 1 - (distances[i] || 0);
      memories.push({
        id: ids[i],
        document: documents[i],
        metadata: metadatas[i],
        similarity: parseFloat(similarity.toFixed(4)),
      });
    }

    return memories;
  }

  /**
   * 混合查詢（閾值 + 限制）
   */
  private async queryHybrid(query: string, threshold: number, limit: number): Promise<any[]> {
    const thresholdResults = await this.queryByThreshold(query, threshold);
    return thresholdResults.slice(0, limit);
  }

  /**
   * 時間衰減查詢
   */
  private async queryWithTimeDecay(query: string, threshold: number, hours: number): Promise<any[]> {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

    const results = await this.collection.query({
      queryTexts: query,
      where: {
        timestamp: { $gte: cutoffTime },
      },
      nResults: 50,
    });

    const memories: any[] = [];
    const ids = results.ids[0];
    const documents = results.documents[0];
    const distances = results.distances?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];

    for (let i = 0; i < ids.length; i++) {
      const similarity = 1 - (distances[i] || 0);
      if (similarity >= threshold) {
        const age = Date.now() - (metadatas[i]?.timestamp || 0);
        const hoursOld = age / (1000 * 60 * 60);
        const timeWeight = Math.exp(-hoursOld * 0.1);

        memories.push({
          id: ids[i],
          document: documents[i],
          metadata: metadatas[i],
          similarity: parseFloat(similarity.toFixed(4)),
          timeWeight: parseFloat(timeWeight.toFixed(4)),
          weightedScore: parseFloat((similarity * timeWeight).toFixed(4)),
        });
      }
    }

    // 按加權分數排序
    memories.sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));
    return memories;
  }

  /**
   * 構建記憶文件內容
   */
  private buildMemoryDocument(memory: TaskMemory): string {
    const parts: string[] = [
      `任務: ${memory.taskDescription}`,
      `類型: ${memory.taskType}`,
      `複雜度: ${memory.complexity}`,
      `Agent: ${memory.agentType}`,
      `狀態: ${memory.status}`,
    ];

    if (memory.result) {
      parts.push(`結果: ${memory.result}`);
    }
    if (memory.error) {
      parts.push(`錯誤: ${memory.error}`);
    }
    if (memory.solution) {
      parts.push(`解決方案: ${memory.solution}`);
    }
    if (memory.files && memory.files.length > 0) {
      parts.push(`相關檔案: ${memory.files.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * 轉換為 TaskMemory
   */
  private convertToTaskMemory(record: any): TaskMemory {
    const lines = record.document.split('\n');
    const getValue = (prefix: string) => {
      const line = lines.find((l: string) => l.startsWith(prefix));
      return line ? line.substring(prefix.length).trim() : '';
    };

    return {
      id: record.id,
      taskDescription: getValue('任務: '),
      taskType: getValue('類型: ') as TaskMemory['taskType'],
      complexity: getValue('複雜度: ') as TaskMemory['complexity'],
      agentType: getValue('Agent: '),
      status: getValue('狀態: ') as TaskMemory['status'],
      result: getValue('結果: ') || undefined,
      error: getValue('錯誤: ') || undefined,
      solution: getValue('解決方案: ') || undefined,
      timestamp: record.metadata?.timestamp || Date.now(),
      workflowId: record.metadata?.workflowId,
      duration: record.metadata?.duration,
    };
  }

  /**
   * 生成上下文摘要
   */
  private generateContextSummary(memories: MemoryQueryResult[]): string {
    const successCount = memories.filter(m => m.memory.status === 'success').length;
    const failedCount = memories.filter(m => m.memory.status === 'failed').length;
    const highComplexityCount = memories.filter(m => m.memory.complexity === 'high').length;

    return `找到 ${memories.length} 個相關記憶：` +
           `${successCount} 個成功，` +
           `${failedCount} 個失敗，` +
           `${highComplexityCount} 個高複雜度任務。` +
           `最高相似度: ${(memories[0]?.similarity * 100).toFixed(0)}%`;
  }

  /**
   * 取得統計信息
   */
  async getStats(): Promise<{ total: number; isInitialized: boolean }> {
    if (!this.isInitialized) {
      return { total: 0, isInitialized: false };
    }

    try {
      const count = await this.collection.count();
      return { total: count, isInitialized: true };
    } catch (error) {
      return { total: 0, isInitialized: false };
    }
  }
}

// 單例實例
let memoryClient: SeekDBMemoryClient | null = null;

/**
 * 取得記憶客戶端實例
 */
export function getMemoryClient(config?: Partial<MemoryIntegrationConfig>): SeekDBMemoryClient {
  if (!memoryClient) {
    memoryClient = new SeekDBMemoryClient(config);
  }
  return memoryClient;
}

/**
 * 兼容舊版的記憶整合對象
 * 提供與 workflow-engine.ts 兼容的接口
 */
export const memoryIntegration = {
  /**
   * 初始化記憶系統
   */
  async initialize(): Promise<boolean> {
    const client = getMemoryClient();
    return client.initialize();
  },

  /**
   * 生成記憶上下文
   */
  async generateContext(taskDescription: string): Promise<MemoryContext> {
    const client = getMemoryClient();
    return client.getMemoryContext(taskDescription, {
      strategy: 'hybrid',
      threshold: 0.5,
      limit: 5,
      hours: 168
    });
  },

  /**
   * 記錄任務記憶
   */
  async recordTaskMemory(
    task: any,
    workflow: any,
    result: { success: boolean; error?: string; duration: number }
  ): Promise<boolean> {
    const client = getMemoryClient();
    
    const taskMemory: TaskMemory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskDescription: task.description || task.title,
      taskType: inferTaskType(task.description || task.title),
      complexity: 'medium',
      agentType: task.agentType,
      status: result.success ? 'success' : 'failed',
      result: result.success ? `任務完成，耗時 ${result.duration}ms` : undefined,
      error: result.error,
      duration: result.duration,
      timestamp: Date.now(),
      workflowId: workflow.id,
    };

    return client.recordMemory(taskMemory);
  },

  /**
   * 將記憶上下文注入到 prompt
   */
  injectMemoryContext(prompt: string, context: MemoryContext): string {
    if (!context || !context.relevantMemories || context.relevantMemories.length === 0) {
      return prompt;
    }

    let memorySection = '\n## 🧠 歷史經驗參考\n\n';
    memorySection += `${context.summary}\n\n`;

    // 添加相關記憶
    context.relevantMemories.slice(0, 3).forEach((mem, index) => {
      const statusIcon = mem.memory.status === 'success' ? '✅' : '❌';
      memorySection += `### ${index + 1}. ${statusIcon} 相似任務 (${(mem.similarity * 100).toFixed(0)}% 相似)\n`;
      memorySection += `- 描述: ${mem.memory.taskDescription.substring(0, 100)}...\n`;
      if (mem.memory.result) {
        memorySection += `- 結果: ${mem.memory.result.substring(0, 80)}...\n`;
      }
      if (mem.memory.error) {
        memorySection += `- ⚠️ 注意: 之前遇到錯誤: ${mem.memory.error.substring(0, 80)}...\n`;
      }
      if (mem.memory.solution) {
        memorySection += `- 💡 解決方案: ${mem.memory.solution.substring(0, 80)}...\n`;
      }
      memorySection += '\n';
    });

    // 添加建議
    if (context.suggestions && context.suggestions.length > 0) {
      memorySection += `## 💬 執行建議\n`;
      context.suggestions.slice(0, 3).forEach((s, i) => {
        memorySection += `${i + 1}. ${s.substring(0, 100)}${s.length > 100 ? '...' : ''}\n`;
      });
      memorySection += '\n';
    }

    // 添加類似錯誤警告
    if (context.similarErrors && context.similarErrors.length > 0) {
      memorySection += `## ⚠️ 類似錯誤警告\n`;
      memorySection += `以下錯誤在相似任務中曾經發生，請特別注意避免:\n`;
      context.similarErrors.slice(0, 2).forEach(e => {
        memorySection += `- ${e.substring(0, 120)}${e.length > 120 ? '...' : ''}\n`;
      });
      memorySection += '\n';
    }

    // 將記憶部分插入到 prompt 的開頭
    return prompt + memorySection;
  }
};

/**
 * 推斷任務類型（輔助函數）
 */
function inferTaskType(description: string): TaskMemory['taskType'] {
  const lower = description.toLowerCase();
  if (lower.includes('寫') || lower.includes('code') || lower.includes('程式') || 
      lower.includes('開發') || lower.includes('api') || lower.includes('功能')) {
    return 'coding';
  } else if (lower.includes('分析') || lower.includes('review')) {
    return 'analysis';
  } else if (lower.includes('自動') || lower.includes('批次') || lower.includes('定時')) {
    return 'automation';
  } else if (lower.includes('網站') || lower.includes('網頁') || lower.includes('前後端') ||
             lower.includes('完整') || lower.includes('系統')) {
    return 'composite';
  }
  return 'research';
}

/**
 * 創建新的記憶客戶端實例
 */
export function createMemoryClient(config?: Partial<MemoryIntegrationConfig>): SeekDBMemoryClient {
  return new SeekDBMemoryClient(config);
}

// 導出類型
export type {
  TaskMemory,
  MemoryQueryResult,
  MemoryQueryOptions,
  MemoryContext,
  MemoryIntegrationConfig
};

// 導出默認實例
export default {
  getMemoryClient,
  createMemoryClient,
};
