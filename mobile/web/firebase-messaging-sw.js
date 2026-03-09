importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: 'AIzaSyD5FIodSb7ZNqUTfjLHJzPGt_aknxJUtpQ',
  authDomain: 'speshway-3d072.firebaseapp.com',
  projectId: 'speshway-3d072',
  storageBucket: 'speshway-3d072.firebasestorage.app',
  messagingSenderId: '879267203995',
  appId: '1:879267203995:web:REPLACE_WITH_YOUR_WEB_APP_ID'
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload,
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});