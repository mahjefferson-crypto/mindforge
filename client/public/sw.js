// Mind Forge Service Worker
const CACHE_NAME = 'mindforge-v2';

// Assets to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept SSE streams or API calls
  if (url.pathname.includes('/api/') || url.pathname.includes('/stream')) {
    return;
  }

  // Cache-first for static assets with content hashes
  if (url.pathname.match(/\.(js|css|png|ico|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML / navigation
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match('/index.html'))
  );
});

// ─── Push Notifications ──────────────────────────────────────────

// Motivational messages (rotated)
const MOTIVATIONAL = [
  "Your streak is waiting. Don't break the chain 🔥",
  "Discipline beats motivation. Show up today.",
  "5 minutes is all it takes. Start the forge.",
  "Strong men are built in silence. Open Mind Forge.",
  "The only way out is through. Check in now.",
  "Consistency creates change. Let's go.",
  "You showed up yesterday. Do it again today.",
  "Your future self is watching. Make him proud.",
];

const PRACTICAL = [
  "Time to check in — 2 min to log today's mood and habits.",
  "Your habits are waiting. Tap to complete them.",
  "Don't forget your daily check-in. +10 XP.",
  "Journal prompt is ready. 5 min of honest writing.",
  "Quick check-in time — how's your energy today?",
  "Your streak resets at midnight. Complete a habit now.",
];

self.addEventListener('push', (event) => {
  // Alternate between motivational and practical
  const isMotivational = Math.random() > 0.5;
  const pool = isMotivational ? MOTIVATIONAL : PRACTICAL;
  const body = pool[Math.floor(Math.random() * pool.length)];

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'daily-reminder',
    renotify: true,
    data: {
      url: '/',
    },
    actions: [
      { action: 'open', title: 'Open Mind Forge' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('Mind Forge 🔥', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing window if found
      for (const client of clients) {
        if (client.url.includes('mind-forge') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/');
    })
  );
});
