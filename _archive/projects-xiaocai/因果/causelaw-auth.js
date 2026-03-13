(function () {
    'use strict';

    var EVENT_NAME = 'causelaw:auth-state-changed';
    var BAR_SELECTOR = '[data-causelaw-auth-bar]';
    var BOUND_ATTR = 'data-causelaw-auth-bound';
    var NAV_SELECTOR = 'nav.nav-premium, nav.fixed.top-0.left-0.w-full';
    var authSubscription = null;

    function getClientApi() {
        return window.CauseLawClient || null;
    }

    function getUiApi() {
        return window.CauseLawUI || null;
    }

    function isClientReady() {
        var clientApi = getClientApi();
        return Boolean(clientApi && typeof clientApi.isReady === 'function' && clientApi.isReady());
    }

    function toast(message, tone) {
        if (!message) return;
        var ui = getUiApi();
        if (ui && typeof ui.showToast === 'function') {
            ui.showToast(message, tone || 'info');
            return;
        }
        if (tone === 'error') {
            window.alert(message);
        }
    }

    function createMemberBar() {
        var bar = document.createElement('div');
        bar.className = 'flex items-center gap-2';
        bar.setAttribute('data-causelaw-auth-bar', '1');
        bar.innerHTML = [
            '<span class="text-gold/90 text-sm font-bold" data-causelaw-auth-display>訪客</span>',
            '<button type="button" class="member-nav-btn" data-auth-action="toggle-auth">會員登入</button>',
            '<button type="button" class="member-nav-btn" data-auth-action="set-name">設定顯示名稱</button>',
            '<a href="/pages/admin.html" class="member-nav-btn member-nav-btn--muted" data-auth-action="go-admin">後台入口</a>',
            '<button type="button" class="member-nav-btn member-nav-btn--muted hidden" data-auth-action="clear-name">清除</button>'
        ].join('');
        return bar;
    }

    function normalizeMemberBar(bar) {
        if (!bar) return null;
        bar.setAttribute('data-causelaw-auth-bar', '1');

        var display = bar.querySelector('[data-causelaw-auth-display]') || bar.querySelector('#member-name-display');
        var authBtn = bar.querySelector('[data-auth-action="toggle-auth"]') || bar.querySelector('#member-auth-btn');
        var setBtn = bar.querySelector('[data-auth-action="set-name"]') || bar.querySelector('#member-set-btn');
        var adminBtn = bar.querySelector('[data-auth-action="go-admin"]') || bar.querySelector('#member-admin-btn');
        var clearBtn = bar.querySelector('[data-auth-action="clear-name"]') || bar.querySelector('#member-clear-btn');

        if (display) display.setAttribute('data-causelaw-auth-display', '');
        if (authBtn) authBtn.setAttribute('data-auth-action', 'toggle-auth');
        if (setBtn) setBtn.setAttribute('data-auth-action', 'set-name');
        if (adminBtn) adminBtn.setAttribute('data-auth-action', 'go-admin');
        if (clearBtn) clearBtn.setAttribute('data-auth-action', 'clear-name');

        if (!adminBtn) {
            var link = document.createElement('a');
            link.href = '/pages/admin.html';
            link.className = 'member-nav-btn member-nav-btn--muted';
            link.setAttribute('data-auth-action', 'go-admin');
            link.textContent = '後台入口';
            bar.appendChild(link);
        }
        return bar;
    }

    function ensureMemberBar(nav) {
        if (!nav) return null;
        var existing = nav.querySelector('#member-bar') || nav.querySelector(BAR_SELECTOR);
        if (existing) return normalizeMemberBar(existing);

        var divChildren = Array.prototype.filter.call(nav.children, function (el) {
            return el && el.tagName && el.tagName.toLowerCase() === 'div';
        });
        if (!divChildren.length) return null;

        var links = divChildren[0];
        var bar = createMemberBar();
        nav.insertBefore(bar, links);
        if (nav.classList.contains('cl-nav-ready')) {
            bar.classList.add('cl-nav-member');
        }
        return normalizeMemberBar(bar);
    }

    function collectManagedBars() {
        return Array.prototype.slice.call(document.querySelectorAll(BAR_SELECTOR));
    }

    async function resolveUserContext() {
        var clientApi = getClientApi();
        if (!clientApi) {
            return { ready: false, user: null, name: '', profile: { displayName: '', email: '' } };
        }
        var profile = clientApi.getProfile ? clientApi.getProfile() : { displayName: '', email: '' };
        if (!isClientReady()) {
            return {
                ready: false,
                user: null,
                name: (clientApi.effectiveDisplayName ? clientApi.effectiveDisplayName() : (profile.displayName || '')),
                profile: profile
            };
        }
        var user = null;
        try {
            user = await clientApi.getSessionUser();
        } catch (err) {
            user = null;
        }
        if (user && typeof clientApi.ensureMemberProfile === 'function') {
            try {
                await clientApi.ensureMemberProfile(user);
            } catch (err) {
                console.error('會員檔案初始化失敗:', err);
            }
        }
        return {
            ready: true,
            user: user,
            name: clientApi.effectiveDisplayName ? clientApi.effectiveDisplayName() : (profile.displayName || ''),
            profile: profile
        };
    }

    async function syncBar(bar) {
        if (!bar) return;

        var ctx = await resolveUserContext();
        var display = bar.querySelector('[data-causelaw-auth-display]');
        var authBtn = bar.querySelector('[data-auth-action="toggle-auth"]');
        var setBtn = bar.querySelector('[data-auth-action="set-name"]');
        var clearBtn = bar.querySelector('[data-auth-action="clear-name"]');
        var hasCustomName = Boolean((ctx.profile && ctx.profile.displayName) || (ctx.name && ctx.name !== '匿名'));
        var label = '訪客';

        if (!ctx.ready) {
            label = '會員未啟用';
            if (authBtn) authBtn.textContent = '會員未啟用';
            if (authBtn) authBtn.disabled = true;
            if (setBtn) setBtn.disabled = false;
            if (setBtn) setBtn.textContent = hasCustomName ? '更換稱呼' : '設定顯示名稱';
            if (clearBtn) clearBtn.classList.toggle('hidden', !hasCustomName);
            if (display) {
                display.classList.remove('hidden');
                display.textContent = label;
            }
            return;
        }

        if (ctx.user) {
            var accountLabel = '';
            if (ctx.user.email && window.CauseLawClient && typeof window.CauseLawClient.emailToAccount === 'function') {
                accountLabel = window.CauseLawClient.emailToAccount(ctx.user.email);
            } else {
                accountLabel = ctx.user.email || '';
            }
            label = '已登入：' + (ctx.name && ctx.name !== '匿名' ? ctx.name : (accountLabel || '會員'));
        } else if (ctx.name && ctx.name !== '匿名') {
            label = '訪客：' + ctx.name;
        }

        if (display) {
            display.classList.remove('hidden');
            display.textContent = label;
        }
        if (authBtn) {
            authBtn.disabled = false;
            authBtn.textContent = ctx.user ? '登出會員' : '會員登入';
        }
        if (setBtn) {
            setBtn.disabled = false;
            setBtn.textContent = hasCustomName ? '更換稱呼' : '設定顯示名稱';
        }
        if (clearBtn) clearBtn.classList.toggle('hidden', !hasCustomName);
    }

    async function refresh(reason) {
        var bars = collectManagedBars();
        for (var i = 0; i < bars.length; i += 1) {
            await syncBar(bars[i]);
        }
        var detail = { reason: reason || 'refresh', user: null };
        if (isClientReady()) {
            try {
                detail.user = await getClientApi().getSessionUser();
            } catch (err) {
                detail.user = null;
            }
        }
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: detail }));
    }

    async function promptDisplayName() {
        var clientApi = getClientApi();
        var current = clientApi && clientApi.getProfile ? clientApi.getProfile().displayName : '';
        var ui = getUiApi();
        var next = null;

        if (ui && typeof ui.prompt === 'function') {
            next = await ui.prompt({
                title: '設定顯示名稱',
                description: '此名稱會用於投稿、留言與頁面會員列顯示。',
                placeholder: '請輸入顯示名稱',
                value: current || '',
                submitText: '儲存',
                cancelText: '取消',
                validate: function (value) {
                    var v = (value || '').trim();
                    if (!v) return '顯示名稱不可空白。';
                    if (v.length > 24) return '顯示名稱請控制在 24 字以內。';
                    return '';
                }
            });
        } else {
            next = window.prompt('請輸入顯示名稱（24 字以內）', current || '');
        }

        if (next == null) return false;
        next = String(next || '').trim();
        if (!next) {
            toast('顯示名稱不可空白。', 'error');
            return false;
        }
        if (next.length > 24) {
            toast('顯示名稱請控制在 24 字以內。', 'error');
            return false;
        }

        if (clientApi && typeof clientApi.setProfile === 'function') {
            clientApi.setProfile({ displayName: next });
        } else {
            localStorage.setItem('causelaw_display_name', next);
        }
        toast('顯示名稱已更新。', 'ok');
        await refresh('profile');
        return true;
    }

    async function openAuthFlow() {
        if (!isClientReady()) {
            toast('尚未設定 Supabase，暫時無法啟用會員登入。', 'error');
            return;
        }

        var clientApi = getClientApi();
        var currentUser = await clientApi.getSessionUser();
        if (currentUser) {
            await clientApi.signOut();
            toast('已登出會員。', 'ok');
            await refresh('logout');
            return;
        }

        var ui = getUiApi();
        var authResult = ui && typeof ui.promptAuth === 'function'
            ? await ui.promptAuth()
            : null;
        if (!authResult) return;

        try {
            if (authResult.action === 'login') {
                await clientApi.signInWithAccount(authResult.account, authResult.password);
                toast('已登入會員。', 'ok');
                await refresh('login');
                return;
            }
            if (authResult.action === 'register') {
                await clientApi.signUpWithAccount(authResult.account, authResult.password, {
                    displayName: authResult.displayName
                });
                clientApi.setProfile({
                    email: authResult.account || '',
                    displayName: authResult.displayName || ''
                });
                toast('註冊成功。請使用帳號 + 密碼登入。', 'ok');
                await refresh('register');
                return;
            }
            toast('目前僅支援帳號 + 密碼登入。', 'error');
        } catch (err) {
            console.error('會員登入流程失敗:', err);
            var msg = err && err.message ? err.message : '登入或註冊失敗，請稍後再試。';
            if (msg.indexOf('Invalid login credentials') !== -1) msg = '帳號或密碼錯誤，請重試。';
            if (msg.indexOf('Email not confirmed') !== -1) msg = '帳號尚未啟用，請聯絡管理員。';
            toast(msg, 'error');
        }
    }

    async function handleBarClick(event) {
        var actionEl = event.target.closest('[data-auth-action]');
        if (!actionEl) return;
        var bar = actionEl.closest(BAR_SELECTOR);
        if (!bar) return;

        event.preventDefault();
        var action = actionEl.getAttribute('data-auth-action');
        if (action === 'toggle-auth') {
            await openAuthFlow();
            return;
        }
        if (action === 'set-name') {
            await promptDisplayName();
            return;
        }
        if (action === 'go-admin') {
            window.location.href = '/pages/admin.html';
            return;
        }
        if (action === 'clear-name') {
            var clientApi = getClientApi();
            if (clientApi && typeof clientApi.setProfile === 'function') {
                clientApi.setProfile({ displayName: '' });
            } else {
                localStorage.removeItem('causelaw_display_name');
            }
            toast('顯示名稱已清除。', 'ok');
            await refresh('profile-cleared');
        }
    }

    function bindBars() {
        var bars = collectManagedBars();
        bars.forEach(function (bar) {
            if (bar.getAttribute(BOUND_ATTR) === '1') return;
            bar.setAttribute(BOUND_ATTR, '1');
        });
        document.addEventListener('click', function (event) {
            handleBarClick(event).catch(function (err) {
                console.error('會員列操作失敗:', err);
                toast('會員操作失敗，請稍後再試。', 'error');
            });
        });
    }

    function ensureAuthSubscription() {
        if (authSubscription || !isClientReady()) return;
        var clientApi = getClientApi();
        var client = clientApi && typeof clientApi.getAuthClient === 'function'
            ? clientApi.getAuthClient()
            : clientApi.getClient();
        if (!client || !client.auth || typeof client.auth.onAuthStateChange !== 'function') return;
        authSubscription = client.auth.onAuthStateChange(function () {
            refresh('supabase-auth');
        });
    }

    async function init() {
        var clientApi = getClientApi();
        if (clientApi && typeof clientApi.consumeExternalSessionFromUrl === 'function') {
            var callbackResult = clientApi.consumeExternalSessionFromUrl();
            if (callbackResult) {
                toast(
                    callbackResult.message || (callbackResult.ok ? '已登入會員。' : '登入失敗，請稍後再試。'),
                    callbackResult.ok ? 'ok' : 'error'
                );
            }
        }
        var navs = document.querySelectorAll(NAV_SELECTOR);
        Array.prototype.forEach.call(navs, function (nav) {
            var bar = ensureMemberBar(nav);
            if (bar && nav.classList.contains('cl-nav-ready') && !bar.classList.contains('cl-nav-member')) {
                bar.classList.add('cl-nav-member');
            }
        });
        bindBars();
        ensureAuthSubscription();
        refresh('init');
    }

    window.CauseLawAuth = {
        openAuthFlow: openAuthFlow,
        promptDisplayName: promptDisplayName,
        refresh: refresh,
        eventName: EVENT_NAME
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            init().catch(function (err) {
                console.error('會員 bootstrap 失敗:', err);
            });
        });
    } else {
        init().catch(function (err) {
            console.error('會員 bootstrap 失敗:', err);
        });
    }
})();
