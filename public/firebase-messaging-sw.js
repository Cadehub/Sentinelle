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
  console.log('Received background message in service worker:', payload);
  const notificationTitle = payload.notification?.title || 'Notification Sentinelle';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.image || '/favicon.ico',
    data: payload.data || {}
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  
  event.notification.close();
  
  const data = event.notification.data;
  let targetUrl = '/';
  
  if (data.type === 'private_message' && data.room_id) {
    targetUrl = `/chats/${data.room_id}`;
  } else if (data.type === 'global_alert') {
    targetUrl = data.cta_url && data.cta_url.trim() ? data.cta_url : '/';
  } else if (data.type === 'citizen_alert' && data.alert_id) {
    targetUrl = `/alerts/${data.alert_id}`;
  }
  
  console.log(`Navigation vers: ${targetUrl}`);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
