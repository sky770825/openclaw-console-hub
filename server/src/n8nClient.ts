/**
 * n8n REST API 客戶端
 * 用於與 Zeabur 部署的 n8n 實例通訊
 * 文件：https://docs.n8n.io/api/
 */
function getN8nConfig() {
  const url = process.env.N8N_API_URL?.replace(/\/$/, '');
  const key = process.env.N8N_API_KEY;
  return { url, key };
}

export function hasN8n(): boolean {
  const { url, key } = getN8nConfig();
  return !!(url && key);
}

async function n8nFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { url: baseUrl, key } = getN8nConfig();
  if (!baseUrl || !key) {
    throw new Error('n8n 未設定：請設定 N8N_API_URL 與 N8N_API_KEY');
  }
  const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': key,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n API 錯誤 ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8nWorkflowsResponse {
  data: N8nWorkflow[];
}

/** 取得工作流列表 */
export async function listWorkflows(activeOnly = false): Promise<N8nWorkflow[]> {
  const qs = activeOnly ? '?active=true' : '';
  const data = await n8nFetch<N8nWorkflowsResponse>(`/api/v1/workflows${qs}`);
  return data.data ?? [];
}

/**
 * 觸發 n8n Webhook
 * 在 n8n 工作流中新增 Webhook 節點取得 URL，直接 POST 到該 URL 即可觸發
 * 此方法不需 API Key，Webhook URL 通常格式：https://your-n8n.zeabur.app/webhook/xxx
 */
export async function triggerWebhook(
  webhookUrl: string,
  data?: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : '{}',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook 觸發失敗 ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/** 健康檢查：確認 n8n 連線正常 */
export async function healthCheck(): Promise<{ ok: boolean; message?: string }> {
  if (!hasN8n()) {
    return { ok: false, message: 'n8n 未設定' };
  }
  try {
    await listWorkflows();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
