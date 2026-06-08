importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDTkJkxnbcV3WS-Tm0WHL4ye6IgnvXfrJU",
  authDomain: "sentinelle-c4f3b.firebaseapp.com",
  projectId: "sentinelle-c4f3b",
  storageBucket: "sentinelle-c4f3b.firebasestorage.app",
  messagingSenderId: "574853926721",
  appId: "1:574853926721:web:78314a32395e44f1ba9bc0"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan :', payload);

  var notificationTitle = (payload.notification && payload.notification.title) ? payload.notification.title : 'Alerte Sentinelle';
  var notificationOptions = {
    body: (payload.notification && payload.notification.body) ? payload.notification.body : 'Une nouvelle alerte nécessite votre vigilance.',
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var data = event.notification.data || {};
  var targetUrl = '/';

  if (data.type === 'private_message' && data.room_id) {
    targetUrl = '/discussions/' + data.room_id;
  } else if (data.type === 'global_alert') {
    targetUrl = data.cta_url && data.cta_url.trim() ? data.cta_url : '/';
  } else if (data.type === 'citizen_alert' && data.alert_id) {
    targetUrl = '/alert/' + data.alert_id;
  }

  var normalizedTarget = new URL(targetUrl, self.location.origin);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        try {
          var clientUrl = new URL(client.url);
          if (clientUrl.pathname === normalizedTarget.pathname) {
            if ('focus' in client && typeof client.focus === 'function') {
              return client.focus();
            }
          }
        } catch (e) {
          // ignore invalid URL
        }
      }

      for (var j = 0; j < clientList.length; j++) {
        var clientToNavigate = clientList[j];
        if ('navigate' in clientToNavigate && typeof clientToNavigate.navigate === 'function') {
          return clientToNavigate.navigate(normalizedTarget.href).then(function() {
            if ('focus' in clientToNavigate && typeof clientToNavigate.focus === 'function') {
              return clientToNavigate.focus();
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
