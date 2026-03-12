(function () {
    'use strict';
    if (document && document.documentElement) {
        document.documentElement.classList.add('cl-ready');
    }

    var MOBILE_QUERY = '(max-width: 900px)';
    var PREFETCH_MAX = 8;
    var PREFETCH_FLAG = 'causelawPrefetchBooted';
    var GROUPS = [
        { key: 'main', title: '主路徑', labels: ['首頁', '回首頁', '神明', '地獄', '輪迴'] },
        { key: 'practice', title: '修行實作', labels: ['功過格', '加持台', '懺悔', '測驗', '經咒・禪樂'] },
        { key: 'explore', title: '探索延伸', labels: ['參悟', '導航', '因果案例', '案例', '討論區', '加持商城', '白皮書', '任務中心', '後台', '監測'] }
    ];

    function isMobileViewport() {
        return window.matchMedia(MOBILE_QUERY).matches;
    }

    function normalizeLabel(text) {
        return (text || '').replace(/\s+/g, '').trim();
    }

    function createNode(tag, className, text) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (typeof text === 'string') el.textContent = text;
        return el;
    }

    function ensureAdminLink(links) {
        if (!links) return;
        var anchors = links.querySelectorAll('a[href]');
        var exists = Array.prototype.some.call(anchors, function (a) {
            var label = normalizeLabel(a.textContent);
            if (label === normalizeLabel('後台')) return true;
            var href = (a.getAttribute('href') || '').toLowerCase();
            return href.indexOf('admin.html') !== -1 || href === '/pages/admin' || href === '/pages/admin/';
        });
        if (exists) return;

        var link = document.createElement('a');
        link.href = '/pages/admin.html';
        link.className = 'hover:text-gold transition';
        link.textContent = '後台';
        links.appendChild(link);
    }

    function collectNavItems(links) {
        return Array.prototype.filter.call(links.children, function (node) {
            if (!node || !node.tagName) return false;
            var tag = node.tagName.toLowerCase();
            if (tag === 'a') return true;
            if (node.getAttribute && node.getAttribute('aria-current') === 'page') return true;
            return false;
        });
    }

    function buildMobilePanel(links) {
        var sourceItems = collectNavItems(links);
        var panel = createNode('div', 'cl-nav-mobile-panel');
        panel.setAttribute('aria-hidden', 'true');

        var groupBuckets = {};
        GROUPS.forEach(function (group) {
            groupBuckets[group.key] = [];
        });
        var misc = [];

        sourceItems.forEach(function (item) {
            var label = normalizeLabel(item.textContent);
            var matched = false;
            for (var i = 0; i < GROUPS.length; i += 1) {
                var group = GROUPS[i];
                for (var j = 0; j < group.labels.length; j += 1) {
                    if (normalizeLabel(group.labels[j]) === label) {
                        groupBuckets[group.key].push(item);
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
            if (!matched) misc.push(item);
        });

        GROUPS.forEach(function (group) {
            var items = groupBuckets[group.key] || [];
            if (!items.length) return;
            var section = createNode('section', 'cl-nav-group');
            section.setAttribute('data-group-key', group.key);
            section.appendChild(createNode('h3', 'cl-nav-group-title', group.title));
            var grid = createNode('div', 'cl-nav-group-grid');
            items.forEach(function (item) {
                var clone = item.cloneNode(true);
                clone.classList.add('cl-nav-link-item');
                grid.appendChild(clone);
            });
            section.appendChild(grid);
            panel.appendChild(section);
        });

        if (misc.length) {
            var miscSection = createNode('section', 'cl-nav-group');
            miscSection.setAttribute('data-group-key', 'misc');
            miscSection.appendChild(createNode('h3', 'cl-nav-group-title', '其他'));
            var miscGrid = createNode('div', 'cl-nav-group-grid');
            misc.forEach(function (item) {
                var clone = item.cloneNode(true);
                clone.classList.add('cl-nav-link-item');
                miscGrid.appendChild(clone);
            });
            miscSection.appendChild(miscGrid);
            panel.appendChild(miscSection);
        }

        return panel;
    }

    function scheduleIdle(task) {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(function () { task(); }, { timeout: 1200 });
            return;
        }
        setTimeout(task, 220);
    }

    function canPrefetch() {
        var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        var type = String(connection.effectiveType || '').toLowerCase();
        return type !== 'slow-2g' && type !== '2g';
    }

    function sameOriginUrl(href) {
        if (!href) return null;
        try {
            var resolved = new URL(href, window.location.href);
            if (resolved.origin !== window.location.origin) return null;
            if (resolved.pathname === window.location.pathname && resolved.search === window.location.search) return null;
            if (resolved.hash && resolved.pathname === window.location.pathname && !resolved.search) return null;
            return resolved.href;
        } catch (e) {
            return null;
        }
    }

    function enqueuePrefetch(url) {
        if (!url) return;
        var selector = 'link[rel="prefetch"][href="' + url.replace(/"/g, '\\"') + '"]';
        if (document.head.querySelector(selector)) return;
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'document';
        link.href = url;
        document.head.appendChild(link);
    }

    function collectPrefetchTargets() {
        var anchors = document.querySelectorAll('nav a[href], .btn-premium[href], #line-cta a[href], footer a[href]');
        var seen = {};
        var urls = [];
        Array.prototype.forEach.call(anchors, function (anchor) {
            var url = sameOriginUrl(anchor.getAttribute('href'));
            if (!url || seen[url]) return;
            seen[url] = true;
            urls.push(url);
        });
        return urls.slice(0, PREFETCH_MAX);
    }

    function bootSmartPrefetch() {
        if (window[PREFETCH_FLAG]) return;
        window[PREFETCH_FLAG] = true;
        if (!canPrefetch()) return;

        scheduleIdle(function () {
            collectPrefetchTargets().forEach(enqueuePrefetch);
        });

        function prefetchFromEvent(event) {
            var target = event.target;
            if (!target || !target.closest) return;
            var anchor = target.closest('a[href]');
            if (!anchor) return;
            enqueuePrefetch(sameOriginUrl(anchor.getAttribute('href')));
        }

        document.addEventListener('mouseover', prefetchFromEvent, { passive: true });
        document.addEventListener('touchstart', prefetchFromEvent, { passive: true });
        document.addEventListener('focusin', prefetchFromEvent, { passive: true });
    }

    function enhanceNav(nav) {
        if (!nav || nav.dataset.navEnhanced === '1') return;

        var divChildren = Array.prototype.filter.call(nav.children, function (el) {
            return el && el.tagName && el.tagName.toLowerCase() === 'div';
        });
        if (divChildren.length < 2) return;

        var brand = divChildren[divChildren.length - 1];
        var member = null;
        var links = null;

        if (divChildren[0].id === 'member-bar') {
            member = divChildren[0];
            links = divChildren[1] || null;
        } else {
            links = divChildren[0];
        }
        if (!links || !brand) return;

        nav.dataset.navEnhanced = '1';
        nav.classList.add('cl-nav-ready');
        brand.classList.add('cl-nav-brand');
        links.classList.add('cl-nav-links');
        ensureAdminLink(links);
        if (member) member.classList.add('cl-nav-member');
        var mobilePanel = buildMobilePanel(links);
        nav.appendChild(mobilePanel);

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'cl-nav-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', '展開選單');
        toggle.innerHTML = '<span class="cl-nav-toggle-label">選單</span>';
        nav.appendChild(toggle);

        function setToggleText(text) {
            var label = toggle.querySelector('.cl-nav-toggle-label');
            if (label) label.textContent = text;
        }

        function closeMenu() {
            nav.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', '展開選單');
            setToggleText('選單');
            mobilePanel.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('cl-nav-lock');
        }

        function openMenu() {
            nav.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
            toggle.setAttribute('aria-label', '收合選單');
            setToggleText('收合');
            mobilePanel.setAttribute('aria-hidden', 'false');
            if (isMobileViewport()) {
                document.body.classList.add('cl-nav-lock');
            }
        }

        function toggleMenu() {
            if (nav.classList.contains('is-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        toggle.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            toggleMenu();
        });

        nav.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !isMobileViewport()) return;
            if (target.closest('.cl-nav-mobile-panel a, .cl-nav-links a')) {
                closeMenu();
                return;
            }
            if (target.closest('.cl-nav-member button, .cl-nav-member a')) {
                closeMenu();
            }
        });

        document.addEventListener('click', function (event) {
            if (!isMobileViewport()) return;
            if (!nav.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });

        window.addEventListener('resize', function () {
            if (!isMobileViewport()) {
                closeMenu();
            }
        });

        closeMenu();
    }

    function init() {
        var navs = document.querySelectorAll('nav.nav-premium, nav.fixed.top-0.left-0.w-full');
        Array.prototype.forEach.call(navs, enhanceNav);
        bootSmartPrefetch();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
