/**
 * 記憶系統類型定義
 * 用於 SeekDB 記憶整合
 */

/**
 * 任務記憶結構
 */
export interface TaskMemory {
  /** 記憶唯一 ID */
  id: string;
  
  /** 任務描述 */
  taskDescription: string;
  
  /** 任務類型 */
  taskType: 'coding' | 'research' | 'analysis' | 'automation' | 'writing' | 'composite';
  
  /** 任務複雜度 */
  complexity: 'low' | 'medium' | 'high';
  
  /** 執行 Agent 類型 */
  agentType: string;
  
  /** 執行結果狀態 */
  status: 'success' | 'failed' | 'partial';
  
  /** 執行結果摘要 */
  result?: string;
  
  /** 錯誤信息 */
  error?: string;
  
  /** 解決方案/關鍵學習 */
  solution?: string;
  
  /** 執行耗時（毫秒） */
  duration?: number;
  
  /** 相關檔案 */
  files?: string[];
  
  /** 工作目錄 */
  workingDir?: string;
  
  /** 記憶創建時間 */
  timestamp: number;
  
  /** 工作流程 ID */
  workflowId?: string;
}

/**
 * 記憶查詢結果
 */
export interface MemoryQueryResult {
  /** 匹配的記憶 */
  memory: TaskMemory;
  
  /** 相似度分數 (0-1) */
  similarity: number;
  
  /** 時間衰減權重 */
  timeWeight?: number;
  
  /** 加權分數 */
  weightedScore?: number;
}

/**
 * 記憶查詢選項
 */
export interface MemoryQueryOptions {
  /** 查詢策略 */
  strategy?: 'threshold' | 'limit' | 'hybrid' | 'timeDecay';
  
  /** 相似度閾值 */
  threshold?: number;
  
  /** 最大返回數量 */
  limit?: number;
  
  /** 時間範圍（小時） */
  hours?: number;
  
  /** 任務類型過濾 */
  taskType?: TaskMemory['taskType'];
  
  /** Agent 類型過濾 */
  agentType?: string;
}

/**
 * 記憶上下文（注入到 prompt）
 */
export interface MemoryContext {
  /** 相關過往任務 */
  relevantMemories: MemoryQueryResult[];
  
  /** 建議或警告 */
  suggestions?: string[];
  
  /** 類似錯誤的解決方案 */
  similarErrors?: string[];
  
  /** 上下文摘要 */
  summary: string;
}

/**
 * SeekDB 記憶記錄結構
 */
export interface SeekDBMemoryRecord {
  id: string;
  document: string;
  metadata: {
    taskType: string;
    agentType: string;
    status: string;
    timestamp: number;
    workflowId?: string;
    complexity?: string;
    [key: string]: any;
  };
}

/**
 * 記憶整合配置
 */
export interface MemoryIntegrationConfig {
  /** 是否啟用記憶功能 */
  enabled: boolean;
  
  /** SeekDB 集合名稱 */
  collectionName: string;
  
  /** SeekDB 連接配置 */
  seekdbConfig?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  
  /** 查詢選項預設值 */
  defaultQueryOptions?: MemoryQueryOptions;
  
  /** 是否記錄失敗任務 */
  recordFailures: boolean;
  
  /** 相似度閾值 */
  similarityThreshold: number;
}
