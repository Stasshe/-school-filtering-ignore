// plz, before you paste, use this.
// https://crocro.com/tools/item/gen_bookmarklet/#google_vignette

(function() {
    const selectors = ['[class*="ad-"]','[class*="ads-"]','[class*="banner"]','[class*="popup"]','[class*="overlay"]','[id*="ad-"]','[id*="ads-"]','[id*="banner"]','[data-ad]','[data-ads]','iframe[src*="doubleclick"]','iframe[src*="googlesyndication"]','iframe[src*="googleadservices"]','iframe[src*="amazon-adsystem"]','iframe[src*="facebook.com/tr"]','iframe[src*="twitter.com/i/jot"]','ins.adsbygoogle','div.google-auto-placed','amp-ad','amp-embed','.ad-container','.advertisement','.sponsored','.promotion','.commercial'];
    const scripts = ['googletag','googletagmanager','googletagservices','doubleclick','google-analytics','googleadservices','googlesyndication','adnxs','adsystem','adsafeprotected','amazon-adsystem','facebook.com/tr','scorecardresearch','outbrain','taboola','criteo','quantserve'];
    let removedCount = 0;
    let blockedScriptsCount = 0;

    const removeElements = () => {
        let count = 0;
        selectors.forEach(s => {
            try {
                document.querySelectorAll(s).forEach(e => {
                    e.style.setProperty('display','none','important');
                    e.style.setProperty('visibility','hidden','important');
                    e.style.setProperty('opacity','0','important');
                    e.style.setProperty('pointer-events','none','important');
                    e.style.setProperty('position','absolute','important');
                    e.style.setProperty('z-index','-9999','important');
                    count++;
                });
            } catch(err) {}
        });
        removedCount += count;
        return count;
    };

    const blockScripts = () => {
        let count = 0;
        document.querySelectorAll('script').forEach(s => {
            const src = s.src || s.innerHTML;
            if(scripts.some(pattern => src.includes(pattern))) {
                s.remove();
                count++;
            }
        });
        blockedScriptsCount += count;
        return count;
    };

    const interceptXHR = () => {
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if(scripts.some(pattern => url.includes(pattern))) {
                return;
            }
            return originalOpen.apply(this, arguments);
        };
    };

    const interceptFetch = () => {
        const originalFetch = window.fetch;
        window.fetch = function(url) {
            if(typeof url === 'string' && scripts.some(pattern => url.includes(pattern))) {
                return Promise.reject(new Error('Blocked'));
            }
            return originalFetch.apply(this, arguments);
        };
    };

    const blockPopups = () => {
        window.open = () => null;
        window.alert = () => {};
        window.confirm = () => true;
    };

    const disableAntiAdblock = () => {
        Object.defineProperty(window, 'adBlockEnabled', {value: false, writable: false});
        Object.defineProperty(window, 'adBlockDetected', {value: false, writable: false});
        Object.defineProperty(window, 'canRunAds', {value: true, writable: false});
        Object.defineProperty(window, 'hasAdBlock', {value: false, writable: false});
        const bait = document.createElement('div');
        bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-text adSense adBlock adContent adBanner';
        bait.style.cssText = 'width:1px!important;height:1px!important;position:absolute!important;left:-10000px!important;top:-1000px!important;';
        document.body.appendChild(bait);
    };

    const cleanDOM = () => {
        let count = 0;
        document.querySelectorAll('*').forEach(el => {
            const computed = window.getComputedStyle(el);
            if(computed.position === 'fixed' && (computed.zIndex > 9999 || el.style.zIndex > 9999)) {
                if(el.querySelector('iframe') || el.querySelector('ins') || el.className.match(/modal|popup|overlay/i)) {
                    el.remove();
                    count++;
                }
            }
        });
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
            if(el.offsetWidth > window.innerWidth * 0.5 && el.offsetHeight > window.innerHeight * 0.5) {
                el.remove();
                count++;
            }
        });
        return count;
    };

    const preventTimers = () => {
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        window.setTimeout = function(fn, delay) {
            if(fn && fn.toString().match(/ad|popup|banner|track/i)) {
                return 0;
            }
            return originalSetTimeout.apply(this, arguments);
        };
        window.setInterval = function(fn, delay) {
            if(fn && fn.toString().match(/ad|popup|banner|track/i)) {
                return 0;
            }
            return originalSetInterval.apply(this, arguments);
        };
    };

    const observeChanges = () => {
        const observer = new MutationObserver(() => {
            removeElements();
            blockScripts();
            cleanDOM();
        });
        observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['style','class']});
    };

    const protectVideoPlayers = () => {
        document.querySelectorAll('video').forEach(v => {
            v.style.setProperty('display','block','important');
            v.style.setProperty('visibility','visible','important');
            v.style.setProperty('opacity','1','important');
        });
    };

    const removeStickyElements = () => {
        let count = 0;
        document.querySelectorAll('[style*="sticky"],[style*="fixed"]').forEach(el => {
            if(el.className.match(/cookie|gdpr|consent|newsletter|subscribe|notification|alert|banner|bar|strip/i)) {
                el.remove();
                count++;
            }
        });
        return count;
    };

    const disableEventListeners = () => {
        ['click','mousedown','mouseup','contextmenu','selectstart'].forEach(event => {
            document.addEventListener(event, e => {
                if(e.target.closest('[onclick*="window.open"]') || e.target.closest('[href^="javascript:"]')) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }, true);
        });
    };

    const restoreScrolling = () => {
        document.documentElement.style.setProperty('overflow','auto','important');
        document.body.style.setProperty('overflow','auto','important');
        document.documentElement.style.setProperty('position','static','important');
        document.body.style.setProperty('position','static','important');
    };

    const removeOverlays = () => {
        let count = 0;
        document.querySelectorAll('div,section').forEach(el => {
            const styles = window.getComputedStyle(el);
            if(styles.position === 'fixed' && styles.zIndex > 999 && el.offsetWidth >= window.innerWidth * 0.8 && el.offsetHeight >= window.innerHeight * 0.8) {
                el.remove();
                count++;
            }
        });
        return count;
    };

    const waitForBody = (callback) => {
        if (document.body) {
            callback();
        } else if (document.documentElement) {
            setTimeout(callback, 100);
        } else {
            setTimeout(() => waitForBody(callback), 100);
        }
    };

    interceptXHR();
    interceptFetch();
    blockPopups();
    disableAntiAdblock();
    preventTimers();
    disableEventListeners();

    const initialRemovedElements = removeElements();
    const initialBlockedScripts = blockScripts();
    const initialCleanedElements = cleanDOM();
    const initialStickyElements = removeStickyElements();
    const initialOverlays = removeOverlays();

    protectVideoPlayers();
    observeChanges();

    const totalBlocked = initialRemovedElements + initialBlockedScripts + initialCleanedElements + initialStickyElements + initialOverlays;

    setInterval(() => {
        removeElements();
        cleanDOM();
        removeStickyElements();
        removeOverlays();
        protectVideoPlayers();
    }, 2000);

    // 通知表示を確実に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            requestAnimationFrame(() => {
                showNotification(totalBlocked);
            });
        });
    } else {
        requestAnimationFrame(() => {
            showNotification(totalBlocked);
        });
    }

    function showNotification(blockedCount) {
        if (!document.body) {
            setTimeout(() => showNotification(blockedCount), 100);
            return;
        }
        
        const notification = document.createElement('div');
        notification.textContent = `AdBlocker: ${blockedCount} blocked`;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 99999;
            background: #4CAF50;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(notification);
        console.log(`AdBlocker: ${blockedCount} elements blocked`);
        console.log(`Notification element created:`, notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
                console.log('Notification removed');
            }
        }, 3000);
    }

    console.log('Advanced AdBlocker activated');
})();
