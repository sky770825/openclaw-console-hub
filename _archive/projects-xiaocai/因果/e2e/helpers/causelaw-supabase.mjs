import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_PATH = path.join(ROOT, 'causelaw-config.js');
const DEFAULT_SCHEMA = (process.env.CAUSELAW_DB_SCHEMA || 'causelaw_yinguo_v1').trim() || 'causelaw_yinguo_v1';
const DEFAULT_PASSWORD = (process.env.CAUSELAW_SMOKE_PASSWORD || 'SmokeTest!20260306').trim() || 'SmokeTest!20260306';
const DEFAULT_EMAIL_DOMAIN = (process.env.CAUSELAW_SMOKE_EMAIL_DOMAIN || 'mailinator.com').trim() || 'mailinator.com';

function readConfigText() {
    if (!fs.existsSync(CONFIG_PATH)) return '';
    return fs.readFileSync(CONFIG_PATH, 'utf8');
}

function readJsAssignment(source, key) {
    if (!source) return '';
    const match = source.match(new RegExp(`${key}[\\s\\S]*?['"]([^'"]+)['"]`));
    return match ? match[1].trim() : '';
}

export function getPublicConfig() {
    const source = readConfigText();
    const url = (process.env.CAUSELAW_SUPABASE_URL || readJsAssignment(source, 'CAUSELAW_SUPABASE_URL')).trim();
    const anonKey = (process.env.CAUSELAW_SUPABASE_ANON_KEY || readJsAssignment(source, 'CAUSELAW_SUPABASE_ANON_KEY')).trim();
    const schema = (process.env.CAUSELAW_DB_SCHEMA || readJsAssignment(source, 'CAUSELAW_DB_SCHEMA') || DEFAULT_SCHEMA).trim() || DEFAULT_SCHEMA;
    return { url, anonKey, schema };
}

export function getServiceRoleKey() {
    return (process.env.CAUSELAW_SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

export function getSmokePassword() {
    return DEFAULT_PASSWORD;
}

export function getTaipeiDateString() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

export function uniqueSmokeEmail(prefix = 'causelaw.e2e') {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `${prefix}.${stamp}@${DEFAULT_EMAIL_DOMAIN}`;
}

async function parseResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (err) {
        return text;
    }
}

export async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
    const response = await fetch(url, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body)
    });
    const data = await parseResponse(response);
    return { ok: response.ok, status: response.status, data, headers: response.headers };
}

function authHeaders({ service = false, token = '', extra = {} } = {}) {
    const { anonKey } = getPublicConfig();
    const serviceRoleKey = getServiceRoleKey();
    const apikey = service ? serviceRoleKey : anonKey;
    const authorization = service
        ? `Bearer ${serviceRoleKey}`
        : (token ? `Bearer ${token}` : '');
    return {
        apikey,
        ...(authorization ? { Authorization: authorization } : {}),
        ...extra
    };
}

function restHeaders({ service = false, token = '', extra = {} } = {}) {
    const { schema } = getPublicConfig();
    return authHeaders({
        service,
        token,
        extra: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Accept-Profile': schema,
            'Content-Profile': schema,
            ...extra
        }
    });
}

export async function authAdminCreateUser({ email, password, displayName }) {
    const { url } = getPublicConfig();
    const result = await requestJson(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: authHeaders({
            service: true,
            extra: { 'Content-Type': 'application/json' }
        }),
        body: {
            email,
            password,
            email_confirm: true,
            user_metadata: displayName ? { display_name: displayName } : undefined
        }
    });
    if (!result.ok || !result.data || !result.data.id) {
        throw new Error(`建立測試會員失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

export async function authAdminDeleteUser(userId) {
    const { url } = getPublicConfig();
    const result = await requestJson(`${url}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders({ service: true })
    });
    if (!result.ok && result.status !== 404) {
        throw new Error(`刪除測試會員失敗: ${JSON.stringify(result.data)}`);
    }
}

export async function signInWithPassword({ email, password }) {
    const { url, anonKey } = getPublicConfig();
    const result = await requestJson(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            apikey: anonKey,
            'Content-Type': 'application/json'
        },
        body: { email, password }
    });
    if (!result.ok || !result.data || !result.data.access_token) {
        throw new Error(`測試會員登入失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

export async function fetchMemberById(userId) {
    const result = await restRequest(`/rest/v1/members?id=eq.${encodeURIComponent(userId)}&select=id,email,display_name,role,status`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`查詢會員資料失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data[0] || null;
}

export async function restRequest(pathname, { method = 'GET', token = '', service = false, body, headers = {} } = {}) {
    const { url } = getPublicConfig();
    return requestJson(`${url}${pathname}`, {
        method,
        headers: restHeaders({ service, token, extra: headers }),
        body
    });
}

export async function setMemberRole(userId, role) {
    const result = await restRequest(`/rest/v1/members?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        service: true,
        body: { role, status: 'active' },
        headers: { Prefer: 'return=representation' }
    });
    if (!result.ok || !Array.isArray(result.data) || result.data.length !== 1 || result.data[0].role !== role) {
        throw new Error(`設定會員角色失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data[0];
}

export async function createPost({
    userId = null,
    displayName = 'Smoke Seed',
    title,
    content,
    category = '其他',
    status = 'approved'
}) {
    const result = await restRequest('/rest/v1/posts', {
        method: 'POST',
        service: true,
        body: [{
            user_id: userId,
            display_name: displayName,
            title,
            content,
            category,
            status
        }],
        headers: { Prefer: 'return=representation' }
    });
    if (!result.ok || !Array.isArray(result.data) || result.data.length !== 1) {
        throw new Error(`建立測試投稿失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data[0];
}

export async function fetchPostsForUser(userId, titlePrefix = '') {
    const filters = [`user_id=eq.${encodeURIComponent(userId)}`];
    if (titlePrefix) filters.push(`title=like.${encodeURIComponent(`${titlePrefix}%`)}`);
    const result = await restRequest(`/rest/v1/posts?select=id,title,status,moderation_reason,created_at&${filters.join('&')}&order=created_at.asc`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`查詢測試投稿失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

export async function fetchPostsByTitlePrefix(titlePrefix) {
    const result = await restRequest(`/rest/v1/posts?select=id,title,status,moderation_reason,created_at&title=like.${encodeURIComponent(`${titlePrefix}%`)}&order=created_at.asc`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`依標題查詢投稿失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

export async function fetchPostById(postId) {
    const result = await restRequest(`/rest/v1/posts?id=eq.${encodeURIComponent(postId)}&select=id,title,status,moderation_reason`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`讀取投稿失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data[0] || null;
}

export async function fetchCommentsForPost(postId, contentPrefix = '') {
    const filters = [`post_id=eq.${encodeURIComponent(postId)}`];
    if (contentPrefix) filters.push(`content=like.${encodeURIComponent(`${contentPrefix}%`)}`);
    const result = await restRequest(`/rest/v1/comments?select=id,content,like_count,created_at&${filters.join('&')}&order=created_at.asc`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`查詢留言失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

export async function fetchAuditLogsForTargets(targetIds) {
    if (!targetIds.length) return [];
    const inValue = targetIds.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
    const result = await restRequest(`/rest/v1/moderation_audit_log?target_id=in.(${encodeURIComponent(inValue)})&select=id,target_id,action,reason,created_at&order=created_at.asc`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`查詢稽核紀錄失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

export async function createTask({
    memberId,
    taskTitle,
    taskType = 'chanting',
    targetCount = 1,
    completedCount = 0,
    status = 'pending',
    evidenceNote = 'seeded by browser smoke',
    pointsReward = 10,
    taskDate = getTaipeiDateString()
}) {
    const result = await restRequest('/rest/v1/tasks', {
        method: 'POST',
        service: true,
        body: [{
            member_id: memberId,
            task_date: taskDate,
            task_type: taskType,
            task_title: taskTitle,
            target_count: targetCount,
            completed_count: completedCount,
            status,
            evidence_note: evidenceNote,
            points_reward: pointsReward
        }],
        headers: { Prefer: 'return=representation' }
    });
    if (!result.ok || !Array.isArray(result.data) || result.data.length !== 1) {
        throw new Error(`建立測試任務失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data[0];
}

export async function fetchTaskById(taskId) {
    const result = await restRequest(`/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}&select=id,task_title,completed_count,status`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`查詢任務失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data[0] || null;
}

export async function fetchWallEntriesForUser(userId, textPrefix = '') {
    const filters = [`member_id=eq.${encodeURIComponent(userId)}`];
    if (textPrefix) filters.push(`text_content=like.${encodeURIComponent(`${textPrefix}%`)}`);
    const result = await restRequest(`/rest/v1/wall_entries?select=id,entry_type,text_content,created_at&${filters.join('&')}&order=created_at.asc`, {
        method: 'GET',
        service: true
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`查詢牆面資料失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

export async function deletePosts(postIds) {
    if (!postIds.length) return;
    const inValue = postIds.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
    const result = await restRequest(`/rest/v1/posts?id=in.(${encodeURIComponent(inValue)})`, {
        method: 'DELETE',
        service: true
    });
    if (!result.ok && result.status !== 404) {
        throw new Error(`清理投稿失敗: ${JSON.stringify(result.data)}`);
    }
}

export async function deleteAuditLogs(auditIds) {
    if (!auditIds.length) return;
    const inValue = auditIds.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
    const result = await restRequest(`/rest/v1/moderation_audit_log?id=in.(${encodeURIComponent(inValue)})`, {
        method: 'DELETE',
        service: true
    });
    if (!result.ok && result.status !== 404) {
        throw new Error(`清理稽核紀錄失敗: ${JSON.stringify(result.data)}`);
    }
}

export async function fetchFirstApprovedPostId() {
    const result = await restRequest('/rest/v1/posts?select=id&status=eq.approved&order=created_at.desc&limit=1', {
        method: 'GET'
    });
    if (!result.ok || !Array.isArray(result.data)) {
        throw new Error(`讀取已核准文章失敗: ${JSON.stringify(result.data)}`);
    }
    return result.data[0] ? result.data[0].id : null;
}

export async function waitFor(checkFn, { timeoutMs = 20_000, intervalMs = 800, label = 'condition' } = {}) {
    const deadline = Date.now() + timeoutMs;
    let lastValue = null;
    while (Date.now() < deadline) {
        lastValue = await checkFn();
        if (lastValue) return lastValue;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`等待 ${label} 超時: ${JSON.stringify(lastValue)}`);
}
