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
    targetUrl = data.cta_url && data.cta_url.trim() ? data.cta_url : '/';
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
            if ('focus' in client) return client.focus();
          }
        } catch {}
      }
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return (client as any).navigate(normalizedTarget.href).then(() => (client as any).focus?.());
        }
      }
      if (clients.openWindow) return clients.openWindow(normalizedTarget.href);
    })
  );
});
