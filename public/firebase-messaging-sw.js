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
    icon: payload.notification?.image || '/favicon.ico'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
