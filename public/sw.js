importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDTkJkxnbcV3WS-Tm0WHL4ye6IgnvXfrJU",
  authDomain: "sentinelle-c4f3b.firebaseapp.com",
  projectId: "sentinelle-c4f3b",
  storageBucket: "sentinelle-c4f3b.firebaseapp.com",
  messagingSenderId: "574853926721",
  appId: "1:574853926721:web:78314a32395e44f1ba9bc0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Notification Sentinelle';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.image || 'https://res.cloudinary.com/droxtvmsy/image/upload/v1779060726/IMG-20260517-WA0007_rff0ko.png',
    data: payload.data || {}
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (data.type === 'private_message' && data.room_id) {
    targetUrl = `/discussions/${data.room_id}`;
  } else if (data.type === 'global_alert') {
    targetUrl = data.cta_url && String(data.cta_url).trim() ? String(data.cta_url) : '/';
  } else if (data.type === 'citizen_alert' && data.alert_id) {
    targetUrl = `/alert/${data.alert_id}`;
  }

  const normalizedTarget = new URL(targetUrl, self.location.origin);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === normalizedTarget.pathname) {
            if ('focus' in client && typeof client.focus === 'function') {
              return client.focus();
            }
          }
        } catch {}
      }
      for (const client of clientList) {
        if ('navigate' in client && typeof client.navigate === 'function') {
          return client.navigate(normalizedTarget.href).then(() => {
            if ('focus' in client && typeof client.focus === 'function') {
              return client.focus();
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(normalizedTarget.href);
      }
    })
  );
});

const CACHE_NAME = 'sentinelle-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Continue even if some assets fail to cache
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(event.request, response.clone()));
          return response.clone();
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache on network error
        return caches.match(event.request).then((response) => {
          return response || new Response('Offline - Page not cached', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});
