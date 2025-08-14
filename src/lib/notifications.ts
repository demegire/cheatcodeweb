import { app, db } from './firebase';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Request browser notification permission and store the FCM token for the user.
 * Can be triggered during onboarding or later via a bell icon.
 */
export async function requestNotificationPermission(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await setDoc(doc(db, 'users', userId, 'fcmTokens', token), {
        token,
        createdAt: new Date(),
      });
    }
  } catch (err) {
    console.error('Unable to get permission to notify.', err);
  }
}
