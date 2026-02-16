/**
 * 小蔡發想審核服務
 * 與後端 /api/openclaw/reviews 端點通訊
 */
import { dataConfig } from './config';

const base = dataConfig.apiBaseUrl.replace(/\/$/, '');

// 發想狀態類型
export type IdeaStatus = 'pending' | 'approved' | 'rejected';

// 發想資料結構
export interface Idea {
  id: string;
  number: number;
  title: string;
  summary: string;
  filePath: string;
  status: IdeaStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  tags: string[];
}

// API 回傳格式（與後端對應）
interface ReviewApiResponse {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  status: 'pending' | 'approved' | 'rejected';
  filePath?: string;
  number?: number;
  tags?: string[];
  createdAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  metadata?: {
    filePath?: string;
    number?: number;
    tags?: string[];
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * 將 API 回傳轉換為前端格式
 */
function mapApiToIdea(apiReview: ReviewApiResponse): Idea {
  const createdAtRaw = apiReview.created_at ?? apiReview.createdAt ?? '';
  const updatedAtRaw = apiReview.updated_at ?? apiReview.reviewedAt ?? createdAtRaw;
  const summary = apiReview.description ?? apiReview.summary ?? '';
  const filePath = apiReview.metadata?.filePath ?? apiReview.filePath ?? '';
  const number = apiReview.metadata?.number ?? apiReview.number ?? 0;
  const tags = apiReview.metadata?.tags ?? apiReview.tags ?? [];

  return {
    id: apiReview.id,
    number,
    title: apiReview.title,
    summary,
    filePath,
    status: apiReview.status,
    createdAt: createdAtRaw?.split('T')[0] || '',
    reviewedAt: updatedAtRaw !== createdAtRaw
      ? updatedAtRaw?.split('T')[0]
      : undefined,
    reviewNote: apiReview.reviewNote,
    tags,
  };
}

/**
 * 將前端格式轉換為 API 格式
 */
function mapIdeaToApi(idea: Partial<Idea>): Partial<ReviewApiResponse> {
  return {
    title: idea.title,
    description: idea.summary,
    status: idea.status,
    metadata: {
      filePath: idea.filePath,
      number: idea.number,
      tags: idea.tags,
    },
  };
}

/**
 * 獲取所有發想
 */
export async function fetchIdeas(): Promise<Idea[]> {
  try {
    const response = await fetch(`${base}/api/openclaw/reviews`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ideas: ${response.status}`);
    }
    const data = await response.json();
    return data.map(mapApiToIdea);
  } catch (error) {
    console.error('Failed to fetch ideas:', error);
    // 如果 API 不可用，返回空陣列
    return [];
  }
}

/**
 * 創建新發想
 */
export async function createIdea(idea: Omit<Idea, 'id' | 'createdAt'>): Promise<Idea | null> {
  try {
    const response = await fetch(`${base}/api/openclaw/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapIdeaToApi(idea)),
    });
    if (!response.ok) {
      throw new Error(`Failed to create idea: ${response.status}`);
    }
    const data = await response.json();
    return mapApiToIdea(data);
  } catch (error) {
    console.error('Failed to create idea:', error);
    return null;
  }
}

/**
 * 更新發想（用於審核）
 */
export async function updateIdea(
  id: string, 
  updates: Partial<Idea>
): Promise<Idea | null> {
  try {
    const response = await fetch(`${base}/api/openclaw/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapIdeaToApi(updates)),
    });
    if (!response.ok) {
      throw new Error(`Failed to update idea: ${response.status}`);
    }
    const data = await response.json();
    return mapApiToIdea(data);
  } catch (error) {
    console.error('Failed to update idea:', error);
    return null;
  }
}

/**
 * 審核發想（通過或拒絕）
 */
export async function reviewIdea(
  id: string,
  status: 'approved' | 'rejected',
  reviewNote?: string
): Promise<Idea | null> {
  return updateIdea(id, {
    status,
    reviewNote,
    reviewedAt: new Date().toISOString().split('T')[0],
  });
}

/**
 * 讀取發想文件內容
 * 從本地文件系統讀取 Markdown 內容
 */
export async function fetchIdeaContent(filePath: string): Promise<string | null> {
  try {
    // 嘗試從後端 API 讀取文件內容
    const response = await fetch(
      `${base}/api/openclaw/file?path=${encodeURIComponent(filePath)}`
    );
    if (!response.ok) {
      // 如果 API 不存在，返回提示
      return `文件路徑: ${filePath}\n\n(請直接開啟該路徑查看完整內容)`;
    }
    return await response.text();
  } catch (error) {
    console.error('Failed to fetch idea content:', error);
    return `文件路徑: ${filePath}\n\n(請直接開啟該路徑查看完整內容)`;
  }
}
