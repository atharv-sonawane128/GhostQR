// Firebase Cloud Messaging Service Worker
// Place this file in the /public directory

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// These values will be read from the environment — for SW we use hardcoded config
// Replace these with your actual Firebase config values for production use
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || 'your-api-key',
  authDomain: self.FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: self.FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: self.FIREBASE_APP_ID || 'your-app-id',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[GhostQR SW] Background message received:', payload);

  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || 'GhostQR Alert', {
    body: body || 'Someone scanned your QR code!',
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view') {
    event.waitUntil(clients.openWindow('/notifications'));
  }
});
