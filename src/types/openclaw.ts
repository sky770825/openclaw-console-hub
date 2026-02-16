export interface OpenClawSubTask {
  t: string;
  d: boolean;
}

export type OpenClawTaskStatus = 'queued' | 'in_progress' | 'done' | 'ready';

export interface OpenClawTask {
  id: string;
  title?: string;
  name?: string;
  cat?: string;
  status: OpenClawTaskStatus;
  progress: number;
  auto?: boolean;
  fromR?: string | null;
  from_review_id?: string | null;
  subs: OpenClawSubTask[];
  thought?: string;
}

export type OpenClawReviewStatus = 'pending' | 'approved' | 'rejected';
export type OpenClawReviewPriority = 'critical' | 'high' | 'medium';

export interface OpenClawReview {
  id: string;
  title: string;
  type: string;
  desc?: string;
  description?: string;
  src?: string;
  pri?: OpenClawReviewPriority | string;
  status: OpenClawReviewStatus | string;
  date?: string;
  reasoning?: string;
}

export interface OpenClawAutomation {
  id: string;
  name: string;
  cron: string;
  active: boolean;
  chain: string[];
  health: number;
  runs: number;
  lastRun?: string;
  last_run?: string;
}

export interface OpenClawEvoLog {
  id?: string;
  t: string;
  x: string;
  c?: string;
  tag?: string;
  tc?: string;
  created_at?: string;
}

export interface OpenClawN8nFlow {
  id: string;
  name: string;
  status: string;
  trigger: string;
  nodes: number;
  execs: number;
  lastExec: string;
  desc: string;
}

export interface OpenClawApiEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | string;
  path: string;
  auth: string;
  authDesc: string;
  desc: string;
  rateLimit: string;
  status: 'live' | 'beta' | string;
  storage: string;
}

export interface OpenClawSecurityLayer {
  id: string;
  name: string;
  status: string;
  detail: string;
  icon: string;
}

export interface OpenClawRbacRow {
  resource: string;
  admin: string;
  user: string;
  agent: string;
}

export interface OpenClawPlugin {
  id: string;
  name: string;
  status: string;
  desc: string;
  icon: string;
  calls: number;
}

export interface OpenClawBoardConfig {
  n8nFlows: OpenClawN8nFlow[];
  apiEndpoints: OpenClawApiEndpoint[];
  securityLayers: OpenClawSecurityLayer[];
  rbacMatrix: OpenClawRbacRow[];
  plugins: OpenClawPlugin[];
}

export interface OpenClawApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}
