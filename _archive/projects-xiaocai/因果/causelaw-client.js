(function () {
    'use strict';

    var PROFILE_KEY = 'causelaw_member_profile';
    var EXTERNAL_SESSION_KEY = 'causelaw_external_session';
    var DEFAULT_SUPABASE_URL = 'https://vbejswywswaeyfasnwjq.supabase.co';
    var DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_T18cUQH5Ja-vbttzljBMdA_C3Yc5l03';
    var DEFAULT_SCHEMA = 'causelaw_yinguo_v1';
    var DB_SCHEMA = ((window.CAUSELAW_DB_SCHEMA || DEFAULT_SCHEMA) + '').trim() || DEFAULT_SCHEMA;
    var ACCOUNT_EMAIL_DOMAIN = (((window.CAUSELAW_ACCOUNT_EMAIL_DOMAIN || 'account.causelaw.local') + '').trim() || 'account.causelaw.local').replace(/^@+/, '').toLowerCase();
    var ACCOUNT_PATTERN = /^[a-z0-9_]{4,24}$/;
    var _authClient = null;
    var _externalDataClient = null;

    var DB = {
        schema: DB_SCHEMA,
        tables: {
            members: 'members',
            posts: 'posts',
            comments: 'comments',
            moderationAuditLog: 'moderation_audit_log',
            dailyCheckin: 'daily_checkin',
            tasks: 'tasks',
            wallEntries: 'wall_entries'
        },
        rpc: {
            ensureMemberProfile: 'ensure_member_profile',
            submitPost: 'submit_post',
            submitComment: 'submit_comment',
            createWallEntry: 'create_wall_entry',
            incrementPostView: 'increment_post_view',
            incrementPostCommentCount: 'increment_post_comment_count',
            incrementCommentLike: 'increment_comment_like'
        }
    };

    function getConfig() {
        var fallbackUrl = (window.CAUSELAW_SUPABASE_URL_FALLBACK || DEFAULT_SUPABASE_URL || '').trim();
        var fallbackKey = (window.CAUSELAW_SUPABASE_ANON_KEY_FALLBACK || DEFAULT_SUPABASE_ANON_KEY || '').trim();
        var url = (window.CAUSELAW_SUPABASE_URL || '').trim() || fallbackUrl;
        var key = (window.CAUSELAW_SUPABASE_ANON_KEY || '').trim() || fallbackKey;
        return {
            url: url,
            key: key
        };
    }

    function isReady() {
        var cfg = getConfig();
        return Boolean(window.supabase && cfg.url && cfg.key);
    }

    function getBooleanFlag(value) {
        if (value === true || value === false) return value;
        if (typeof value === 'string') {
            var normalized = value.trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
        }
        return false;
    }

    function normalizeAccountName(value) {
        return (value || '').toString().trim().toLowerCase();
    }

    function validateAccountName(value) {
        var account = normalizeAccountName(value);
        if (!account) return '請輸入帳號。';
        if (!ACCOUNT_PATTERN.test(account)) {
            return '帳號需為 4-24 碼，僅可使用英文字母、數字與底線。';
        }
        return '';
    }

    function accountToEmail(account) {
        var normalized = normalizeAccountName(account);
        var err = validateAccountName(normalized);
        if (err) throw new Error(err);
        return normalized + '@' + ACCOUNT_EMAIL_DOMAIN;
    }

    function emailToAccount(email) {
        var value = (email || '').toString().trim().toLowerCase();
        if (!value) return '';
        var suffix = '@' + ACCOUNT_EMAIL_DOMAIN;
        if (value.slice(-suffix.length) === suffix) {
            return value.slice(0, -suffix.length);
        }
        return value;
    }

    function resolveSignInIdentity(accountOrEmail) {
        var raw = (accountOrEmail || '').toString().trim();
        if (!raw) throw new Error('請輸入帳號。');
        if (raw.indexOf('@') !== -1) {
            return {
                email: raw.toLowerCase(),
                account: emailToAccount(raw)
            };
        }
        var normalized = normalizeAccountName(raw);
        var err = validateAccountName(normalized);
        if (err) throw new Error(err);
        return {
            email: accountToEmail(normalized),
            account: normalized
        };
    }

    function isLineLoginEnabled() {
        return isReady() && getBooleanFlag(window.CAUSELAW_LINE_LOGIN_ENABLED);
    }

    function resetExternalDataClient() {
        _externalDataClient = null;
    }

    function getAuthClient() {
        if (!isReady()) return null;
        if (_authClient) return _authClient;
        _authClient = window.supabase.createClient(getConfig().url, getConfig().key, {
            db: { schema: DB_SCHEMA }
        });
        return _authClient;
    }

    function decodeBase64Url(segment) {
        if (!segment) return '';
        var normalized = String(segment).replace(/-/g, '+').replace(/_/g, '/');
        while (normalized.length % 4) normalized += '=';
        try {
            var binary = window.atob(normalized);
            var encoded = Array.prototype.map.call(binary, function (char) {
                return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
            }).join('');
            return decodeURIComponent(encoded);
        } catch (err) {
            return '';
        }
    }

    function decodeJwtClaims(token) {
        if (!token || String(token).split('.').length < 2) return null;
        try {
            return JSON.parse(decodeBase64Url(String(token).split('.')[1]));
        } catch (err) {
            return null;
        }
    }

    function getStoredExternalSession() {
        try {
            var raw = localStorage.getItem(EXTERNAL_SESSION_KEY) || '';
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }

    function clearExternalSession() {
        localStorage.removeItem(EXTERNAL_SESSION_KEY);
        resetExternalDataClient();
    }

    function normalizeExternalSession(next) {
        if (!next || !next.accessToken) return null;
        var claims = decodeJwtClaims(next.accessToken);
        if (!claims || !claims.sub) return null;

        var expiresAt = Number(next.expiresAt || 0);
        if (!expiresAt && claims.exp) expiresAt = Number(claims.exp) * 1000;
        if (!expiresAt) expiresAt = Date.now() + (12 * 60 * 60 * 1000);

        return {
            provider: (next.provider || 'external').trim() || 'external',
            accessToken: String(next.accessToken),
            expiresAt: expiresAt,
            claims: claims
        };
    }

    function setExternalSession(next) {
        var normalized = normalizeExternalSession(next);
        if (!normalized) {
            clearExternalSession();
            return null;
        }

        localStorage.setItem(EXTERNAL_SESSION_KEY, JSON.stringify(normalized));
        resetExternalDataClient();
        return normalized;
    }

    function getExternalSession() {
        var current = normalizeExternalSession(getStoredExternalSession());
        if (!current) return null;
        if (current.expiresAt <= Date.now()) {
            clearExternalSession();
            return null;
        }
        return current;
    }

    function buildExternalUser(claims) {
        if (!claims || !claims.sub) return null;
        return {
            id: claims.sub,
            email: claims.email || '',
            aud: claims.aud || 'authenticated',
            role: claims.role || 'authenticated',
            app_metadata: claims.app_metadata || {},
            user_metadata: claims.user_metadata || {},
            identities: [
                {
                    provider: ((claims.app_metadata || {}).provider || 'external'),
                    identity_id: claims.sub
                }
            ]
        };
    }

    function getDataClient() {
        if (!isReady()) return null;

        var externalSession = getExternalSession();
        if (!externalSession) return getAuthClient();
        if (_externalDataClient) return _externalDataClient;

        _externalDataClient = window.supabase.createClient(getConfig().url, getConfig().key, {
            db: { schema: DB_SCHEMA },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            },
            accessToken: async function () {
                var latest = getExternalSession();
                if (!latest) throw new Error('LINE 會員登入已過期，請重新登入。');
                return latest.accessToken;
            }
        });
        return _externalDataClient;
    }

    function getClient() {
        return getDataClient();
    }

    function getProfile() {
        try {
            var raw = localStorage.getItem(PROFILE_KEY) || '{}';
            var parsed = JSON.parse(raw);
            return {
                displayName: (parsed.displayName || '').trim(),
                email: (parsed.email || '').trim()
            };
        } catch (err) {
            return { displayName: '', email: '' };
        }
    }

    function setProfile(next) {
        var current = getProfile();
        var merged = {
            displayName: typeof next.displayName === 'string' ? next.displayName.trim() : current.displayName,
            email: typeof next.email === 'string' ? next.email.trim() : current.email
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
        if (merged.displayName) localStorage.setItem('causelaw_display_name', merged.displayName);
        return merged;
    }

    function clearProfile() {
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem('causelaw_display_name');
    }

    function syncProfileFromMember(user, member) {
        var next = {};
        var displayName = member && typeof member.display_name === 'string'
            ? member.display_name.trim()
            : '';
        var email = member && typeof member.email === 'string'
            ? member.email.trim()
            : ((user && user.email) || '').trim();

        if (!displayName && user && user.user_metadata) {
            displayName = ((user.user_metadata.display_name || user.user_metadata.displayName || '') + '').trim();
        }

        if (displayName) next.displayName = displayName;
        if (email) next.email = email;
        if (next.displayName || next.email) setProfile(next);
    }

    function buildFunctionUrl(functionName, params) {
        var cfg = getConfig();
        if (!cfg.url) return '';
        var url = new URL('/functions/v1/' + functionName, cfg.url);
        var query = params || {};
        Object.keys(query).forEach(function (key) {
            if (query[key] == null || query[key] === '') return;
            url.searchParams.set(key, String(query[key]));
        });
        return url.toString();
    }

    function consumeExternalSessionFromUrl() {
        var hash = window.location.hash || '';
        if (!hash || hash.indexOf('cl_') === -1) return null;

        var params = new URLSearchParams(hash.replace(/^#/, ''));
        var accessToken = params.get('cl_access_token');
        var provider = (params.get('cl_provider') || 'line').trim() || 'line';
        var expiresAt = params.get('cl_expires_at');
        var error = params.get('cl_auth_error');
        var description = params.get('cl_auth_error_description');
        var cleanUrl = window.location.pathname + window.location.search;

        if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState({}, document.title, cleanUrl);
        } else {
            window.location.hash = '';
        }

        if (error) {
            clearExternalSession();
            return {
                ok: false,
                provider: provider,
                message: description || error
            };
        }

        if (!accessToken) return null;

        var session = setExternalSession({
            provider: provider,
            accessToken: accessToken,
            expiresAt: expiresAt
        });
        if (!session) {
            return {
                ok: false,
                provider: provider,
                message: 'LINE 登入回傳無效，請重新登入。'
            };
        }

        var user = buildExternalUser(session.claims);
        syncProfileFromMember(user, {
            email: session.claims.email || null,
            display_name: session.claims.user_metadata
                ? (session.claims.user_metadata.display_name || session.claims.user_metadata.displayName || null)
                : null
        });
        return {
            ok: true,
            provider: provider,
            user: user,
            message: provider === 'line' ? '已使用 LINE 登入。' : '已登入會員。'
        };
    }

    async function getSessionUser() {
        var externalSession = getExternalSession();
        if (externalSession) return buildExternalUser(externalSession.claims);

        var client = getAuthClient();
        if (!client) return null;
        try {
            var result = await client.auth.getSession();
            return result && result.data && result.data.session ? result.data.session.user : null;
        } catch (err) {
            return null;
        }
    }

    async function sendOtp(email) {
        var client = getAuthClient();
        if (!client) throw new Error('Supabase 尚未設定');
        var redirectTo = window.location.origin + window.location.pathname;
        var result = await client.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: redirectTo }
        });
        if (result.error) throw result.error;
        return true;
    }

    async function signInWithPassword(email, password) {
        var client = getAuthClient();
        if (!client) throw new Error('Supabase 尚未設定');
        clearExternalSession();
        var result = await client.auth.signInWithPassword({
            email: (email || '').trim(),
            password: password || ''
        });
        if (result.error) throw result.error;
        if (result.data && result.data.user) {
            syncProfileFromMember(result.data.user, {
                email: result.data.user.email || null,
                display_name: result.data.user.user_metadata
                    ? (result.data.user.user_metadata.display_name || result.data.user.user_metadata.displayName || null)
                    : null
            });
        }
        return result.data || null;
    }

    async function signUpWithPassword(email, password, options) {
        var client = getAuthClient();
        if (!client) throw new Error('Supabase 尚未設定');
        clearExternalSession();
        var opts = options || {};
        var accountName = normalizeAccountName(opts.account || '');
        var result = await client.auth.signUp({
            email: (email || '').trim(),
            password: password || '',
            options: {
                data: {
                    display_name: (opts.displayName || '').trim() || undefined,
                    account_name: accountName || undefined
                },
                emailRedirectTo: opts.emailRedirectTo || window.location.origin + window.location.pathname
            }
        });
        if (result.error) throw result.error;
        if (result.data && result.data.user) {
            syncProfileFromMember(result.data.user, {
                email: result.data.user.email || null,
                display_name: opts.displayName || null
            });
        }
        return result.data || null;
    }

    async function signInWithAccount(accountOrEmail, password) {
        var identity = resolveSignInIdentity(accountOrEmail);
        var data = await signInWithPassword(identity.email, password);
        setProfile({
            email: identity.account || identity.email
        });
        return data;
    }

    async function signUpWithAccount(account, password, options) {
        var identity = resolveSignInIdentity(account);
        var opts = options || {};
        var data = await signUpWithPassword(identity.email, password, {
            displayName: opts.displayName || identity.account,
            account: identity.account,
            emailRedirectTo: opts.emailRedirectTo
        });
        setProfile({
            email: identity.account || identity.email,
            displayName: (opts.displayName || '').trim()
        });
        return data;
    }

    async function signInWithOAuth(provider, options) {
        var client = getAuthClient();
        if (!client) throw new Error('Supabase 尚未設定');
        clearExternalSession();
        var redirectTo = options && options.redirectTo
            ? options.redirectTo
            : (window.location.origin + window.location.pathname);
        var result = await client.auth.signInWithOAuth({
            provider: provider,
            options: { redirectTo: redirectTo }
        });
        if (result.error) throw result.error;
        return result.data || null;
    }

    async function signInWithGoogle(options) {
        return signInWithOAuth('google', options || null);
    }

    function startLineLogin(options) {
        if (!isLineLoginEnabled()) throw new Error('LINE 登入尚未啟用。');
        var opts = options || {};
        var returnTo = opts.returnTo || (window.location.origin + window.location.pathname + window.location.search);
        var target = buildFunctionUrl('line-login-start', {
            return_to: returnTo
        });
        if (!target) throw new Error('LINE 登入入口尚未設定。');
        window.location.assign(target);
        return target;
    }

    async function signOut() {
        clearExternalSession();
        var client = getAuthClient();
        if (!client) return;
        await client.auth.signOut();
    }

    function effectiveDisplayName() {
        var p = getProfile();
        if (p.displayName) return p.displayName;
        var externalSession = getExternalSession();
        if (externalSession && externalSession.claims && externalSession.claims.user_metadata) {
            var externalName = (externalSession.claims.user_metadata.display_name || externalSession.claims.user_metadata.displayName || '').trim();
            if (externalName) return externalName;
        }
        var legacy = (localStorage.getItem('causelaw_display_name') || '').trim();
        return legacy || '匿名';
    }

    function isMissingRpcError(err) {
        if (!err) return false;
        var text = [err.code || '', err.message || '', err.details || ''].join(' ').toLowerCase();
        return text.indexOf('pgrst202') !== -1
            || text.indexOf('could not find the function') !== -1
            || text.indexOf('does not exist') !== -1
            || text.indexOf('404') !== -1;
    }

    async function callRpc(client, rpcName, params, fallbackName) {
        var result = null;
        try {
            result = await client.rpc(rpcName, params || {});
        } catch (err) {
            result = { error: err };
        }
        if (result && !result.error) return result;
        if (fallbackName && result && result.error && isMissingRpcError(result.error)) {
            return client.rpc(fallbackName, params || {});
        }
        return result;
    }

    async function ensureMemberProfile(sessionUser) {
        var client = getDataClient();
        if (!client) throw new Error('Supabase 尚未設定');
        var user = sessionUser || await getSessionUser();
        if (!user) throw new Error('尚未登入會員');

        var metadataName = user && user.user_metadata
            ? ((user.user_metadata.display_name || user.user_metadata.displayName || '') + '').trim()
            : '';
        var preferredName = effectiveDisplayName();
        if (!preferredName || preferredName === '匿名') {
            preferredName = metadataName || preferredName;
        }
        var rpcResult = await callRpc(client, DB.rpc.ensureMemberProfile, {
            p_display_name: preferredName
        }, 'ensure_member_profile');
        if (rpcResult && !rpcResult.error) {
            syncProfileFromMember(user, rpcResult.data || null);
            return rpcResult.data || null;
        }
        if (rpcResult && rpcResult.error && !isMissingRpcError(rpcResult.error)) {
            throw rpcResult.error;
        }

        var payload = {
            id: user.id,
            email: user.email || null,
            display_name: preferredName || '匿名'
        };
        var upsertResult = await client
            .from(DB.tables.members)
            .upsert([payload], { onConflict: 'id' })
            .select('id,email,display_name,role,status')
            .maybeSingle();
        if (upsertResult.error) throw upsertResult.error;
        syncProfileFromMember(user, upsertResult.data || payload);
        return upsertResult.data || payload;
    }

    async function rpcCall(rpcName, params, fallbackName) {
        var client = getDataClient();
        if (!client) throw new Error('Supabase 尚未設定');
        var result = await callRpc(client, rpcName, params || {}, fallbackName);
        if (result && result.error) throw result.error;
        return result ? (result.data || null) : null;
    }

    window.CauseLawClient = {
        isReady: isReady,
        isLineLoginEnabled: isLineLoginEnabled,
        getClient: getClient,
        getAuthClient: getAuthClient,
        getProfile: getProfile,
        setProfile: setProfile,
        clearProfile: clearProfile,
        getSessionUser: getSessionUser,
        consumeExternalSessionFromUrl: consumeExternalSessionFromUrl,
        getExternalSession: getExternalSession,
        setExternalSession: setExternalSession,
        clearExternalSession: clearExternalSession,
        sendOtp: sendOtp,
        signInWithPassword: signInWithPassword,
        signUpWithPassword: signUpWithPassword,
        signInWithAccount: signInWithAccount,
        signUpWithAccount: signUpWithAccount,
        signInWithOAuth: signInWithOAuth,
        signInWithGoogle: signInWithGoogle,
        startLineLogin: startLineLogin,
        signOut: signOut,
        normalizeAccountName: normalizeAccountName,
        validateAccountName: validateAccountName,
        accountToEmail: accountToEmail,
        emailToAccount: emailToAccount,
        effectiveDisplayName: effectiveDisplayName,
        ensureMemberProfile: ensureMemberProfile,
        rpcCall: rpcCall,
        isMissingRpcError: isMissingRpcError,
        DB: DB
    };
})();
