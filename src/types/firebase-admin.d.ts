declare module 'firebase-admin/app' {
  export const initializeApp: any;
  export const cert: any;
  export const getApps: any;
}

declare module 'firebase-admin/firestore' {
  export const getFirestore: any;
}

declare module 'firebase-admin/messaging' {
  export const getMessaging: any;
}
