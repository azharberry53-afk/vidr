/* ============================================
   SERVICE WORKER - Vidr PWA
   ============================================ */

const CACHE_NAME = 'vidr-v1.2';
const STATIC_CACHE = 'vidr-static-v1.2';
const DYNAMIC_CACHE = 'vidr-dynamic-v1.2';
const IMAGE_CACHE = 'vidr-images-v1.2';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/theme.css',
    '/css/main.css',
    '/css/animations.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/feed.js',
    '/js/profile.js',
    '/js/chat.js',
    '/js/create.js',
    '/js/live.js',
    '/js/shop.js',
    '/js/coins.js',
    '/js/games.js',
    '/js/notifications.js',
    '/js/ads.js',
    '/js/admin.js',
    '/js/firebase-config.js',
    '/assets/icons/default-avatar.png',
    '/assets/logo/favicon.png',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

/* ==================
   INSTALL EVENT
   ================== */

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => {
                    return new Request(url, { mode: 'cors' });
                })).catch(err => {
                    console.warn('[SW] Some assets failed to cache:', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

/* ==================
   ACTIVATE EVENT
   ================== */

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => 
                        name !== STATIC_CACHE && 
                        name !== DYNAMIC_CACHE && 
                        name !== IMAGE_CACHE
                    )
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

/* ==================
   FETCH EVENT
   ================== */

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip Firebase & external API calls
    if (
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('firebasestorage.googleapis.com') ||
        url.hostname.includes('identitytoolkit') ||
        url.hostname.includes('adsterra') ||
        url.hostname.includes('propellerads') ||
        url.hostname.includes('monetag')
    ) {
        return;
    }
    
    // Images - Cache First, Long TTL
    if (
        request.destination === 'image' ||
        url.pathname.includes('/assets/') ||
        url.hostname.includes('pravatar.cc') ||
        url.hostname.includes('imagecdn')
    ) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then(cache => {
                return cache.match(request).then(cached => {
                    if (cached) return cached;
                    
                    return fetch(request).then(response => {
                        if (response.ok) {
                            cache.put(request, response.clone());
                        }
                        return response;
                    }).catch(() => {
                        return caches.match('/assets/icons/default-avatar.png');
                    });
                });
            })
        );
        return;
    }
    
    // App Shell - Cache First
    if (
        url.origin === location.origin ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('cdnjs.cloudflare.com')
    ) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) {
                    // Update cache in background
                    fetch(request).then(response => {
                        if (response.ok) {
                            caches.open(STATIC_CACHE).then(cache => {
                                cache.put(request, response);
                            });
                        }
                    }).catch(() => {});
                    
                    return cached;
                }
                
                return fetch(request).then(response => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Offline fallback
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
        );
        return;
    }
    
    // Network First for everything else
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});

/* ==================
   PUSH NOTIFICATIONS
   ================== */

self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    
    const options = {
        body: data.body || 'New notification from Vidr',
        icon: '/assets/logo/icon-192.png',
        badge: '/assets/logo/icon-72.png',
        image: data.image || '',
        vibrate: [200, 100, 200],
        tag: data.tag || 'vidr-notification',
        renotify: true,
        actions: data.actions || [
            { action: 'open', title: 'Open Vidr' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        data: {
            url: data.url || '/',
            type: data.type
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Vidr', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'dismiss') return;
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

/* ==================
   BACKGROUND SYNC
   ================== */

self.addEventListener('sync', event => {
    if (event.tag === 'sync-posts') {
        event.waitUntil(syncPendingPosts());
    }
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncPendingMessages());
    }
});

async function syncPendingPosts() {
    const pending = await getFromIndexedDB('pendingPosts');
    if (pending && pending.length > 0) {
        console.log('[SW] Syncing pending posts...');
    }
}

async function syncPendingMessages() {
    const pending = await getFromIndexedDB('pendingMessages');
    if (pending && pending.length > 0) {
        console.log('[SW] Syncing pending messages...');
    }
}

function getFromIndexedDB(store) {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open('vidr-offline', 1);
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(store)) {
                    resolve([]);
                    return;
                }
                const tx = db.transaction(store, 'readonly');
                const data = tx.objectStore(store).getAll();
                data.onsuccess = () => resolve(data.result);
                data.onerror = () => resolve([]);
            };
            request.onerror = () => resolve([]);
        } catch {
            resolve([]);
        }
    });
}

self.options = {
    "domain": "3nbf4.com",
    "zoneId": 11455892
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')

console.log('[SW] Service Worker loaded ✅');