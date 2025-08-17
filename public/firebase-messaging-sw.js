importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase configuration (values should be provided via env injection at build time)
const firebaseConfig = {
  apiKey: "AIzaSyCW5_FGdw751zrXx45PbfLsedU5T-mOW2o",
  authDomain: "auth.cheat-code.cc",
  projectId: "cheatcode-cc",
  storageBucket: "cheatcode-cc.firebasestorage.app",
  messagingSenderId: "369737877345",
  appId: "1:369737877345:web:8511e3d48e9be09a9f2720",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

  const notificationIcon = "/apple-touch-icon.png";

  const notificationOptions = {
    body: payload.data?.body,
    icon: notificationIcon,
  };

  self.registration.showNotification(payload.data?.title || 'from cheat-code.cc', notificationOptions);
});
