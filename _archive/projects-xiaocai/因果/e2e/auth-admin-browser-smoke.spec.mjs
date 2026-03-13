import { expect, test } from 'playwright/test';
import {
    authAdminCreateUser,
    authAdminDeleteUser,
    createPost,
    createTask,
    deleteAuditLogs,
    deletePosts,
    fetchAuditLogsForTargets,
    fetchCommentsForPost,
    fetchMemberById,
    fetchPostsByTitlePrefix,
    fetchPostsForUser,
    fetchPostById,
    fetchTaskById,
    fetchWallEntriesForUser,
    getPublicConfig,
    getServiceRoleKey,
    getSmokePassword,
    setMemberRole,
    waitFor,
    uniqueSmokeEmail
} from './helpers/causelaw-supabase.mjs';

const serviceRoleKey = getServiceRoleKey();
const password = getSmokePassword();

function ensureAuthAdminConfig() {
    const { url, anonKey } = getPublicConfig();
    test.skip(!url || !anonKey, '缺少 Supabase public 設定，略過登入瀏覽器 smoke。');
    test.skip(!serviceRoleKey, '缺少 CAUSELAW_SUPABASE_SERVICE_ROLE_KEY，略過 admin 瀏覽器 smoke。');
}

async function loginViaHome(page, { email, password: pwd }) {
    await page.goto('/index.html');
    await page.click('#member-auth-btn');
    await page.fill('#cl-auth-email-login', email);
    await page.fill('#cl-auth-pwd-login', pwd);
    await page.click('#cl-auth-submit-login');
    await expect(page.locator('#member-auth-btn')).toHaveText('登出會員');
    await expect(page.locator('.cl-toast.ok')).toContainText('已登入會員');
}

async function submitPost(page, { name, title, content, category = '其他' }) {
    await page.goto('/index.html#submit');
    await page.fill('#submit-name', name);
    await page.fill('#submit-title', title);
    await page.selectOption('#submit-category', category);
    await page.fill('#submit-content', content);
    const dialogPromise = page.waitForEvent('dialog', { timeout: 800 })
        .then((dialog) => dialog.accept())
        .catch(() => {});
    await page.click('#submit-btn');
    await dialogPromise;
    await expect(page.locator('#submit-status')).toContainText(/投稿已送出/);
}

test.describe('Auth/Admin Browser Smoke', () => {
    test.beforeEach(() => {
        ensureAuthAdminConfig();
    });

    test('member 可登入投稿，但無法進入 admin panel', async ({ page }) => {
        const email = uniqueSmokeEmail('causelaw.e2e.member-only');
        const displayName = 'E2E Member';
        let title = '';
        let userId = '';
        let postIds = [];
        try {
            const user = await authAdminCreateUser({ email, password, displayName });
            userId = user.id;

            await loginViaHome(page, { email, password });
            await page.goto('/pages/deities.html');
            await expect(page.locator('[data-causelaw-auth-bar] [data-auth-action="toggle-auth"]')).toHaveText('登出會員');
            await expect(page.locator('[data-causelaw-auth-bar] [data-causelaw-auth-display]')).toContainText(displayName);
            title = `E2E-MEMBER-${Date.now()}`;
            await submitPost(page, {
                name: displayName,
                title,
                content: 'member 角色可投稿，但不可打開後台審核面板。'
            });

            const posts = await waitFor(async () => {
                const rows = await fetchPostsForUser(userId, title);
                return rows.length === 1 ? rows : null;
            }, { label: 'member pending post' });
            postIds = posts.map((row) => row.id);

            await page.goto('/pages/admin.html');
            await expect(page.locator('#admin-gate-msg')).toContainText('權限不足：目前角色為 member');
            await expect(page.locator('#admin-panel')).toHaveClass(/hidden/);
        } finally {
            if (!postIds.length && title) {
                try {
                    postIds = (await fetchPostsByTitlePrefix(title)).map((row) => row.id);
                } catch (err) {}
            }
            if (postIds.length) await deletePosts(postIds);
            if (userId) await authAdminDeleteUser(userId);
        }
    });

    test('admin 可在後台通過與拒絕待審投稿，並寫入 audit log', async ({ page }) => {
        const email = uniqueSmokeEmail('causelaw.e2e.admin');
        const displayName = 'E2E Admin';
        let approveTitle = '';
        let rejectTitle = '';
        let userId = '';
        let postIds = [];
        let auditIds = [];
        try {
            const user = await authAdminCreateUser({ email, password, displayName });
            userId = user.id;

            await loginViaHome(page, { email, password });

            approveTitle = `E2E-APPROVE-${Date.now()}`;
            rejectTitle = `E2E-REJECT-${Date.now()}`;
            await submitPost(page, {
                name: displayName,
                title: approveTitle,
                content: '這篇投稿含測試詞靠北，應由 admin 在後台核准。'
            });
            await submitPost(page, {
                name: displayName,
                title: rejectTitle,
                content: '這篇投稿含測試詞靠北，應由 admin 在後台拒絕。'
            });

            const pendingPosts = await waitFor(async () => {
                const rows = await fetchPostsForUser(userId, 'E2E-');
                return rows.length >= 2 ? rows : null;
            }, { label: 'admin pending posts' });
            postIds = pendingPosts.map((row) => row.id);

            const approvePost = pendingPosts.find((row) => row.title === approveTitle);
            const rejectPost = pendingPosts.find((row) => row.title === rejectTitle);
            if (!approvePost || !rejectPost) {
                throw new Error(`待審投稿不足: ${JSON.stringify(pendingPosts)}`);
            }

            await setMemberRole(userId, 'admin');

            await page.goto('/pages/admin.html');
            const refreshAccessBtn = page.getByRole('button', { name: '我已完成登入，重新檢查權限' });
            if (await refreshAccessBtn.isVisible().catch(() => false)) {
                await refreshAccessBtn.click();
            }
            await expect(page.locator('#admin-panel')).toBeVisible();
            await expect(page.locator('#submissions-list')).toContainText(approveTitle);
            await expect(page.locator('#submissions-list')).toContainText(rejectTitle);

            await page.fill(`textarea[data-reason-for="${approvePost.id}"]`, 'E2E 核准理由');
            await page.click(`button[data-action="approve"][data-id="${approvePost.id}"]`);

            await waitFor(async () => {
                const row = await fetchPostById(approvePost.id);
                return row && row.status === 'approved' && row.moderation_reason === 'E2E 核准理由' ? row : null;
            }, { label: 'approved post state' });

            await page.fill(`textarea[data-reason-for="${rejectPost.id}"]`, 'E2E 拒絕理由');
            await page.click(`button[data-action="reject"][data-id="${rejectPost.id}"]`);

            await waitFor(async () => {
                const row = await fetchPostById(rejectPost.id);
                return row && row.status === 'rejected' && row.moderation_reason === 'E2E 拒絕理由' ? row : null;
            }, { label: 'rejected post state' });

            const auditRows = await waitFor(async () => {
                const rows = await fetchAuditLogsForTargets([approvePost.id, rejectPost.id]);
                return rows.length >= 2 ? rows : null;
            }, { label: 'moderation audit logs' });
            auditIds = auditRows.map((row) => row.id);
        } finally {
            if (auditIds.length) await deleteAuditLogs(auditIds);
            if (!postIds.length) {
                try {
                    var fallbackIds = [];
                    if (approveTitle) fallbackIds = fallbackIds.concat((await fetchPostsByTitlePrefix(approveTitle)).map((row) => row.id));
                    if (rejectTitle) fallbackIds = fallbackIds.concat((await fetchPostsByTitlePrefix(rejectTitle)).map((row) => row.id));
                    postIds = Array.from(new Set(fallbackIds));
                } catch (err) {}
            }
            if (postIds.length) await deletePosts(postIds);
            if (userId) await authAdminDeleteUser(userId);
        }
    });

    test('member 可留言按讚、同步祈福牆並完成任務', async ({ page }) => {
        const email = uniqueSmokeEmail('causelaw.e2e.member-flow');
        const displayName = 'E2E Flow Member';
        const commentText = `E2E COMMENT ${Date.now()}`;
        const wallText = `E2E WALL ${Date.now()}`;
        const taskTitle = `E2E TASK ${Date.now()}`;
        const seededPostTitle = `E2E-SEED-${Date.now()}`;
        let userId = '';
        let seededPostId = '';
        let taskId = '';
        try {
            const user = await authAdminCreateUser({ email, password, displayName });
            userId = user.id;

            await loginViaHome(page, { email, password });

            await waitFor(async () => {
                const member = await fetchMemberById(userId);
                return member ? member : null;
            }, { label: 'member profile ready' });

            const seededPost = await createPost({
                title: seededPostTitle,
                content: 'seeded approved post for browser comment flow',
                displayName: 'Smoke Seed',
                status: 'approved'
            });
            seededPostId = seededPost.id;

            const seededTask = await createTask({
                memberId: userId,
                taskTitle,
                taskType: 'chanting',
                targetCount: 1
            });
            taskId = seededTask.id;

            await page.goto(`/pages/post.html?id=${seededPostId}`);
            await expect(page.locator('#post-content')).toContainText(seededPostTitle);
            await page.fill('#comment-name', displayName);
            await page.fill('#comment-content', commentText);
            await page.getByRole('button', { name: '提交留言' }).click();
            await expect(page.locator('#comments-container')).toContainText(commentText);

            const comments = await waitFor(async () => {
                const rows = await fetchCommentsForPost(seededPostId, commentText);
                return rows.length === 1 ? rows : null;
            }, { label: 'browser comment created' });
            const commentId = comments[0].id;

            const likeBtn = page.locator(`button.comment-like-btn[data-comment-id="${commentId}"]`);
            await likeBtn.click();
            await expect(likeBtn).toContainText('已按讚 1');

            await waitFor(async () => {
                const rows = await fetchCommentsForPost(seededPostId, commentText);
                return rows[0] && Number(rows[0].like_count || 0) === 1 ? rows[0] : null;
            }, { label: 'comment like count updated' });

            await page.goto('/pages/wall.html');
            await expect(page.locator('#wall-sync-status')).toContainText('已連線會員雲端牆');
            page.once('dialog', async (dialog) => {
                expect(dialog.message()).toContain('已同步會員雲端');
                await dialog.accept();
            });
            await page.fill('#bless-target', '家人');
            await page.fill('#bless-name', displayName);
            await page.fill('#bless-text', wallText);
            await page.getByRole('button', { name: '點燃祈福燈' }).click();
            await expect(page.locator('#wall-sync-status')).toContainText('已同步最新祈福燈到會員雲端牆');

            await waitFor(async () => {
                const rows = await fetchWallEntriesForUser(userId, wallText);
                return rows.length === 1 ? rows : null;
            }, { label: 'wall entry synced' });

            await page.goto('/pages/tasks.html');
            await expect(page.locator('#tasks-container')).toContainText(taskTitle);
            const taskCard = page.locator('.task-card', { hasText: taskTitle });
            await taskCard.getByRole('button', { name: '標記完成' }).click();
            await expect(taskCard.locator('.task-chip')).toContainText('已完成');

            await waitFor(async () => {
                const row = await fetchTaskById(taskId);
                return row && row.status === 'completed' && Number(row.completed_count || 0) === 1 ? row : null;
            }, { label: 'task completed in db' });
        } finally {
            if (seededPostId) await deletePosts([seededPostId]);
            if (userId) await authAdminDeleteUser(userId);
        }
    });
});
