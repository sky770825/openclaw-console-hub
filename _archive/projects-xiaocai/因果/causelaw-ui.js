(function () {
    'use strict';

    var STYLE_ID = 'causelaw-ui-style';
    var TOAST_HOST_ID = 'causelaw-toast-host';

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '#'+TOAST_HOST_ID+'{position:fixed;top:1rem;right:1rem;z-index:3000;display:flex;flex-direction:column;gap:.5rem;max-width:min(92vw,360px)}',
            '.cl-toast{padding:.75rem .9rem;border-radius:.55rem;border:1px solid rgba(212,175,55,.28);background:rgba(10,10,10,.95);color:#e7e5e4;font-size:.86rem;line-height:1.45;box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;transform:translateY(-6px);transition:all .18s ease}',
            '.cl-toast.show{opacity:1;transform:translateY(0)}',
            '.cl-toast.ok{border-color:rgba(52,211,153,.45);color:#a7f3d0}',
            '.cl-toast.error{border-color:rgba(248,113,113,.5);color:#fecaca}',
            '.cl-toast.info{border-color:rgba(212,175,55,.35);color:#fde68a}',
            '.cl-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:3200;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;transition:opacity .18s ease}',
            '.cl-modal-mask.open{opacity:1}',
            '.cl-modal{width:min(94vw,460px);background:#0b0b0b;border:1px solid rgba(212,175,55,.3);border-radius:.75rem;padding:1rem 1rem .9rem;box-shadow:0 30px 80px rgba(0,0,0,.65)}',
            '.cl-modal-title{margin:0 0 .35rem;color:#d4af37;font-weight:800;letter-spacing:.06em;font-size:1rem}',
            '.cl-modal-desc{margin:0 0 .8rem;color:#a8a29e;font-size:.85rem;line-height:1.5}',
            '.cl-modal-input{width:100%;padding:.65rem .72rem;border-radius:.5rem;border:1px solid rgba(212,175,55,.35);background:#020202;color:#f5f5f4;outline:none;font-size:.9rem}',
            '.cl-modal-input:focus{border-color:#d4af37;box-shadow:0 0 0 2px rgba(212,175,55,.12)}',
            '.cl-modal-error{min-height:1.1rem;margin:.45rem 0 0;color:#fca5a5;font-size:.76rem}',
            '.cl-modal-actions{margin-top:.9rem;display:flex;justify-content:flex-end;gap:.5rem}',
            '.cl-btn{border-radius:.45rem;padding:.5rem .8rem;font-size:.82rem;cursor:pointer;border:1px solid rgba(212,175,55,.35);background:transparent;color:#d4af37}',
            '.cl-btn:hover{background:rgba(212,175,55,.1)}',
            '.cl-btn.primary{background:#d4af37;color:#111;border-color:#d4af37}',
            '.cl-btn.primary:hover{background:#e8c660}',
            '.cl-auth-tabs{display:flex;gap:0;border-bottom:1px solid rgba(212,175,55,.25);margin-bottom:.9rem}',
            '.cl-auth-tab{padding:.5rem .85rem;font-size:.82rem;cursor:pointer;color:#a8a29e;border-bottom:2px solid transparent;margin-bottom:-1px}',
            '.cl-auth-tab:hover{color:#d4af37}',
            '.cl-auth-tab.active{color:#d4af37;border-bottom-color:#d4af37}',
            '.cl-auth-panel{display:none}',
            '.cl-auth-panel.active{display:block}',
            '.cl-auth-field{margin-bottom:.65rem}',
            '.cl-auth-field label{display:block;margin-bottom:.25rem;font-size:.8rem;color:#a8a29e}',
            '.cl-auth-hint{font-size:.75rem;color:#78716c;margin-top:.25rem}'
        ].join('');
        document.head.appendChild(style);
    }

    function getToastHost() {
        var host = document.getElementById(TOAST_HOST_ID);
        if (host) return host;
        host = document.createElement('div');
        host.id = TOAST_HOST_ID;
        document.body.appendChild(host);
        return host;
    }

    function showToast(message, tone, duration) {
        if (!message) return;
        ensureStyle();
        var host = getToastHost();
        var toast = document.createElement('div');
        toast.className = 'cl-toast ' + (tone || 'info');
        toast.textContent = message;
        host.appendChild(toast);
        requestAnimationFrame(function () {
            toast.classList.add('show');
        });
        var ttl = typeof duration === 'number' ? duration : 2800;
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 180);
        }, ttl);
    }

    function prompt(options) {
        ensureStyle();
        var opts = options || {};
        return new Promise(function (resolve) {
            var mask = document.createElement('div');
            mask.className = 'cl-modal-mask';
            mask.innerHTML = [
                '<div class="cl-modal" role="dialog" aria-modal="true">',
                '  <h3 class="cl-modal-title"></h3>',
                '  <p class="cl-modal-desc"></p>',
                '  <form class="cl-modal-form">',
                '    <input class="cl-modal-input" />',
                '    <p class="cl-modal-error"></p>',
                '    <div class="cl-modal-actions">',
                '      <button type="button" class="cl-btn cancel"></button>',
                '      <button type="submit" class="cl-btn primary submit"></button>',
                '    </div>',
                '  </form>',
                '</div>'
            ].join('');

            var titleEl = mask.querySelector('.cl-modal-title');
            var descEl = mask.querySelector('.cl-modal-desc');
            var inputEl = mask.querySelector('.cl-modal-input');
            var errorEl = mask.querySelector('.cl-modal-error');
            var cancelEl = mask.querySelector('.cancel');
            var submitEl = mask.querySelector('.submit');
            var formEl = mask.querySelector('.cl-modal-form');

            titleEl.textContent = opts.title || '請輸入';
            descEl.textContent = opts.description || '';
            inputEl.placeholder = opts.placeholder || '';
            inputEl.type = opts.type || 'text';
            inputEl.value = opts.value || '';
            cancelEl.textContent = opts.cancelText || '取消';
            submitEl.textContent = opts.submitText || '確認';

            function close(result) {
                mask.classList.remove('open');
                setTimeout(function () {
                    if (mask.parentNode) mask.parentNode.removeChild(mask);
                    resolve(result);
                }, 170);
            }

            function validate(rawValue) {
                if (typeof opts.validate === 'function') {
                    return opts.validate(rawValue);
                }
                return '';
            }

            formEl.addEventListener('submit', function (e) {
                e.preventDefault();
                var rawValue = inputEl.value || '';
                var normalized = opts.preserveWhitespace ? rawValue : rawValue.trim();
                var error = validate(normalized);
                if (error) {
                    errorEl.textContent = error;
                    return;
                }
                close(normalized);
            });

            cancelEl.addEventListener('click', function () {
                close(null);
            });

            mask.addEventListener('click', function (e) {
                if (e.target === mask) close(null);
            });

            document.addEventListener('keydown', function escHandler(e) {
                if (e.key !== 'Escape') return;
                document.removeEventListener('keydown', escHandler);
                if (document.body.contains(mask)) close(null);
            }, { once: true });

            document.body.appendChild(mask);
            requestAnimationFrame(function () {
                mask.classList.add('open');
                inputEl.focus();
                if (inputEl.value) inputEl.select();
            });
        });
    }

    /**
     * 會員登入/註冊彈窗：僅提供帳號密碼登入與自行註冊
     * @returns {Promise<{action:'login'|'register',account?:string,password?:string,displayName?:string}|null>}
     */
    function promptAuth() {
        ensureStyle();
        return new Promise(function (resolve) {
            var mask = document.createElement('div');
            mask.className = 'cl-modal-mask';
            mask.innerHTML = [
                '<div class="cl-modal" role="dialog" aria-modal="true" style="max-width:400px">',
                '  <h3 class="cl-modal-title">會員登入 / 註冊</h3>',
                '  <p class="cl-modal-desc">使用帳號 + 密碼登入，或直接註冊新帳號。</p>',
                '  <div class="cl-auth-tabs">',
                '    <button type="button" class="cl-auth-tab active" data-tab="login">帳號密碼登入</button>',
                '    <button type="button" class="cl-auth-tab" data-tab="register">註冊新帳號</button>',
                '  </div>',
                '  <div id="cl-auth-panel-login" class="cl-auth-panel active">',
                '    <div class="cl-auth-field"><label>帳號</label><input type="text" id="cl-auth-email-login" class="cl-modal-input" placeholder="例如 andy_8888" /></div>',
                '    <div class="cl-auth-field"><label>密碼</label><input type="password" id="cl-auth-pwd-login" class="cl-modal-input" placeholder="請輸入密碼" /></div>',
                '    <p class="cl-modal-error" id="cl-auth-err-login"></p>',
                '    <div class="cl-modal-actions"><button type="button" class="cl-btn cancel">取消</button><button type="button" class="cl-btn primary" id="cl-auth-submit-login">登入</button></div>',
                '  </div>',
                '  <div id="cl-auth-panel-register" class="cl-auth-panel">',
                '    <div class="cl-auth-field"><label>帳號</label><input type="text" id="cl-auth-email-reg" class="cl-modal-input" placeholder="4-24 碼（英文/數字/底線）" /></div>',
                '    <div class="cl-auth-field"><label>密碼</label><input type="password" id="cl-auth-pwd-reg" class="cl-modal-input" placeholder="至少 6 碼" /></div>',
                '    <div class="cl-auth-field"><label>顯示名稱（選填）</label><input type="text" id="cl-auth-name-reg" class="cl-modal-input" placeholder="用於投稿/留言顯示" /></div>',
                '    <p class="cl-auth-hint">帳號需為 4-24 碼，僅可使用英文字母、數字與底線。</p>',
                '    <p class="cl-modal-error" id="cl-auth-err-reg"></p>',
                '    <div class="cl-modal-actions"><button type="button" class="cl-btn cancel">取消</button><button type="button" class="cl-btn primary" id="cl-auth-submit-reg">註冊</button></div>',
                '  </div>',
                '</div>'
            ].join('');

            var tabs = mask.querySelectorAll('.cl-auth-tab');
            var panels = mask.querySelectorAll('.cl-auth-panel');
            function setActive(tabName) {
                tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === tabName); });
                panels.forEach(function (p) { p.classList.toggle('active', p.id === 'cl-auth-panel-' + tabName); });
            }
            tabs.forEach(function (t) {
                t.addEventListener('click', function () { setActive(t.getAttribute('data-tab')); });
            });

            function close(result) {
                mask.classList.remove('open');
                setTimeout(function () {
                    if (mask.parentNode) mask.parentNode.removeChild(mask);
                    resolve(result);
                }, 170);
            }

            function accountValid(account) {
                var v = (account || '').trim().toLowerCase();
                if (!v) return false;
                if (v.indexOf('@') !== -1) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                return /^[a-z0-9_]{4,24}$/.test(v);
            }

            mask.querySelector('#cl-auth-submit-login').addEventListener('click', function () {
                var account = (mask.querySelector('#cl-auth-email-login').value || '').trim().toLowerCase();
                var password = mask.querySelector('#cl-auth-pwd-login').value || '';
                var err = mask.querySelector('#cl-auth-err-login');
                err.textContent = '';
                if (!accountValid(account)) { err.textContent = '請輸入有效帳號（4-24 碼，英文/數字/底線）。'; return; }
                if (!password || password.length < 6) { err.textContent = '密碼至少 6 碼。'; return; }
                close({ action: 'login', account: account, password: password });
            });
            mask.querySelector('#cl-auth-submit-reg').addEventListener('click', function () {
                var account = (mask.querySelector('#cl-auth-email-reg').value || '').trim().toLowerCase();
                var password = mask.querySelector('#cl-auth-pwd-reg').value || '';
                var displayName = (mask.querySelector('#cl-auth-name-reg').value || '').trim();
                var err = mask.querySelector('#cl-auth-err-reg');
                err.textContent = '';
                if (!accountValid(account)) { err.textContent = '請輸入有效帳號（4-24 碼，英文/數字/底線）。'; return; }
                if (!password || password.length < 6) { err.textContent = '密碼至少 6 碼。'; return; }
                close({ action: 'register', account: account, password: password, displayName: displayName || undefined });
            });

            var cancelBtns = mask.querySelectorAll('.cl-btn.cancel');
            cancelBtns.forEach(function (b) { b.addEventListener('click', function () { close(null); }); });
            mask.addEventListener('click', function (e) { if (e.target === mask) close(null); });
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key !== 'Escape') return;
                document.removeEventListener('keydown', escHandler);
                if (document.body.contains(mask)) close(null);
            }, { once: true });

            document.body.appendChild(mask);
            requestAnimationFrame(function () {
                mask.classList.add('open');
                var first = mask.querySelector('.cl-modal-input');
                if (first) first.focus();
            });
        });
    }

    window.CauseLawUI = {
        showToast: showToast,
        prompt: prompt,
        promptAuth: promptAuth
    };
})();
