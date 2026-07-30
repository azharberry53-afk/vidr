/* ============================================
   PERFORMANCE MODULE
   ============================================ */

const Performance = {
    
    /* ==================
       VIRTUAL SCROLL
       ================== */
    
    virtualScrollConfig: {
        itemHeight: window.innerHeight,
        bufferSize: 3,
        renderedItems: new Map()
    },
    
    setupVirtualScroll(container) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const video = entry.target.querySelector('video');
                    if (!video) return;
                    
                    if (entry.isIntersecting) {
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                        video.currentTime = 0;
                    }
                });
            },
            { threshold: 0.6, rootMargin: '0px' }
        );
        
        container.querySelectorAll('.feed-item').forEach(item => {
            observer.observe(item);
        });
        
        return observer;
    },
    
    /* ==================
       LAZY IMAGE LOADING
       ================== */
    
    setupLazyImages() {
        const imageObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            },
            { rootMargin: '200px' }
        );
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    },
    
    /* ==================
       DEBOUNCE
       ================== */
    
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },
    
    throttle(fn, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /* ==================
       PRELOAD NEXT BATCH
       ================== */
    
    preloadImages(urls) {
        urls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    },
    
    /* ==================
       MEMORY MANAGEMENT
       ================== */
    
    cleanup() {
        // Revoke object URLs
        document.querySelectorAll('[src^="blob:"]').forEach(el => {
            URL.revokeObjectURL(el.src);
        });
        
        // Clear old listeners
        if (Chat.chatsListener) Chat.chatsListener();
        if (Notifications.listener) Notifications.listener();
    },
    
    /* ==================
       NETWORK DETECTION
       ================== */
    
    getConnectionType() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return conn?.effectiveType || '4g';
    },
    
    isSlowConnection() {
        const type = this.getConnectionType();
        return type === '2g' || type === 'slow-2g';
    },
    
    adaptQualityToNetwork() {
        if (this.isSlowConnection()) {
            // Load lower quality images
            document.documentElement.dataset.quality = 'low';
            // Skip video autoplay
            document.querySelectorAll('video[autoplay]').forEach(v => {
                v.removeAttribute('autoplay');
            });
        }
    },
    
    /* ==================
       INDEXEDDB CACHE
       ================== */
    
    async cacheToIndexedDB(storeName, key, data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('vidr-cache', 1);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'key' });
                }
            };
            
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(storeName, 'readwrite');
                tx.objectStore(storeName).put({ key, data, timestamp: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = reject;
            };
            
            request.onerror = reject;
        });
    },
    
    async getFromIndexedDB(storeName, key) {
        return new Promise((resolve) => {
            const request = indexedDB.open('vidr-cache', 1);
            
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    resolve(null);
                    return;
                }
                const tx = db.transaction(storeName, 'readonly');
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = () => {
                    const result = req.result;
                    if (!result) { resolve(null); return; }
                    // Cache expires after 5 minutes
                    if (Date.now() - result.timestamp > 300000) { resolve(null); return; }
                    resolve(result.data);
                };
                req.onerror = () => resolve(null);
            };
            
            request.onerror = () => resolve(null);
        });
    }
};

// Auto-setup performance optimizations
document.addEventListener('DOMContentLoaded', () => {
    Performance.adaptQualityToNetwork();
    Performance.setupLazyImages();
    
    // Listen for network changes
    if (navigator.connection) {
        navigator.connection.addEventListener('change', () => {
            Performance.adaptQualityToNetwork();
        });
    }
    
    // Offline/Online detection
    window.addEventListener('offline', () => {
        App.showToast('📵 You are offline', 'warning');
    });
    
    window.addEventListener('online', () => {
        App.showToast('✅ Back online!', 'success');
        Feed.refresh();
    });
});