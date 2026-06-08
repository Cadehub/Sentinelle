import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

async function registerFirebaseMessagingServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!existing) {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Firebase Messaging service worker enregistré.');
    }
  } catch (error) {
    console.warn('Impossible d\'enregistrer firebase-messaging-sw.js :', error);
  }
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerFirebaseMessagingServiceWorker();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
