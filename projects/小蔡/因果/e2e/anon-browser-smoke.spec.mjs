import { expect, test } from 'playwright/test';
import { fetchFirstApprovedPostId, getPublicConfig } from './helpers/causelaw-supabase.mjs';

function ensurePublicConfig() {
    const { url, anonKey } = getPublicConfig();
    test.skip(!url || !anonKey, '缺少 Supabase public 設定，略過匿名瀏覽器 smoke。');
}

async function openPostForAnon(page) {
    let approvedId = null;
    try {
        approvedId = await fetchFirstApprovedPostId();
    } catch (err) {
        approvedId = null;
    }
    if (approvedId) {
        await page.goto(`/pages/post.html?id=${approvedId}`);
        await page.waitForLoadState('networkidle');
        return;
    }
    await page.goto('/pages/post.html?id=sample-1');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
        currentPost = {
            id: '00000000-0000-0000-0000-000000000001',
            source: 'supabase',
            title: 'Mock Approved Post',
            category: '其他',
            author: 'Smoke',
            content: 'Mock',
            createdAt: new Date().toISOString(),
            viewCount: 0,
            commentCount: 0,
            likeCount: 0
        };
        comments = [];
        renderPost();
        renderComments();
    });
}

test.describe('Anon Browser Smoke', () => {
    test.beforeEach(() => {
        ensurePublicConfig();
    });

    test('純內容頁也會顯示共用會員列', async ({ page }) => {
        await page.goto('/pages/deities.html');
        await expect(page.locator('[data-causelaw-auth-bar] [data-auth-action="toggle-auth"]')).toHaveText('會員登入');
        await expect(page.locator('[data-causelaw-auth-bar] [data-causelaw-auth-display]')).toContainText('訪客');
    });

    test('首頁未登入投稿會被登入門檻擋下', async ({ page }) => {
        await page.goto('/index.html#submit');
        await page.fill('#submit-title', 'Anon browser smoke');
        await page.fill('#submit-content', '匿名使用者不應直接送出雲端投稿。');
        await page.click('#submit-btn');
        await expect(page.locator('#submit-status')).toContainText('請先登入會員後再投稿');
    });

    test('任務中心未登入會顯示登入需求', async ({ page }) => {
        await page.goto('/pages/tasks.html');
        await expect(page.locator('#task-member-status')).toContainText('尚未登入會員，請先登入');
    });

    test('懺悔牆未登入不可同步雲端', async ({ page }) => {
        await page.goto('/pages/wall.html');
        await expect(page.locator('#wall-sync-status')).toContainText(/尚未登入會員|會員未連線/);
        page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('請先登入會員後再同步祈福或懺悔');
            await dialog.accept();
        });
        await page.fill('#bless-text', '匿名 smoke 祈福測試');
        await page.getByRole('button', { name: '點燃祈福燈' }).click();
    });

    test('文章頁未登入不可留言', async ({ page }) => {
        await openPostForAnon(page);
        await page.fill('#comment-name', 'Anon smoke');
        await page.fill('#comment-content', '匿名留言 smoke');
        await page.getByRole('button', { name: '提交留言' }).click();
        await expect(page.locator('.cl-toast.error')).toContainText('請先登入會員後再留言');
    });
});
