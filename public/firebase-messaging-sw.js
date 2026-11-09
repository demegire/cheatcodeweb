// Tapping a notification opens the task/week it's about (`data.url`, a
// same-origin path like /dashboard?group=..&week=..&task=..). Registered before
// the Firebase scripts, as Firebase recommends for custom click handling.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // The URL comes from another user's client (/api/notify takes any payload),
  // so only accept a task/week link and rebuild it from its params. Anything
  // else (other sites, /invite/..., extra params) just opens the dashboard.
  // Mirrors parseTaskLink in src/lib/taskLinks.ts.
  let target = null;
  try {
    const raw = event.notification.data && event.notification.data.url;
    if (raw) {
      const url = new URL(raw, self.location.origin);
      const group = url.searchParams.get('group');
      const week = url.searchParams.get('week');
      const task = url.searchParams.get('task');
      if (
        url.origin === self.location.origin &&
        url.pathname === '/dashboard' &&
        group && week && /^\d{4}-W\d{2}$/.test(week)
      ) {
        const params = new URLSearchParams({ group, week });
        if (task) params.set('task', task);
        target = `${self.location.origin}/dashboard?${params.toString()}`;
      }
    }
  } catch (e) {}

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((c) => new URL(c.url).origin === self.location.origin);

    if (existing) {
      await existing.focus();
      if (!target || existing.url === target) return;
      try {
        // Only works on pages this worker controls; otherwise open a new one.
        if (await existing.navigate(target)) return;
      } catch (e) {}
    }
    await self.clients.openWindow(target || '/dashboard');
  })());
});

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
    data: { url: payload.data?.url },
  };

  self.registration.showNotification(payload.data?.title || 'from cheat-code.cc', notificationOptions);
});
