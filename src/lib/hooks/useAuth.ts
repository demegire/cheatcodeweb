import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { auth, db } from '../firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  needsProfileSetup: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    needsProfileSetup: false
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Check if user exists in Firestore
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // Create new user document
          await setDoc(userRef, {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName || '',
            photoURL: authUser.photoURL,
            createdAt: new Date(),
            profileCompleted: false,
            groups: []
          });

          // Only create a default group if the user is not joining via invite
          const pendingInvite = typeof window !== 'undefined'
            ? localStorage.getItem('pendingInvite')
            : null;

          if (!pendingInvite) {
            const groupId = nanoid(10);
            await setDoc(doc(db, 'groups', groupId), {
              name: `New Group (click to change)`,
              memberUids: {
                [authUser.uid]: true
              },
              createdBy: authUser.uid,
              createdAt: new Date()
            });

            await updateDoc(userRef, {
              groups: arrayUnion(groupId)
            });
          }

          setAuthState({
            user: authUser,
            loading: false,
            needsProfileSetup: true
          });
        } else {
          // Check if profile is completed
          const userData = userSnap.data();
          setAuthState({
            user: authUser,
            loading: false,
            needsProfileSetup: !userData.profileCompleted
          });
        }
        // We'll handle pendingInvite in the Home component now
      } else {
        setAuthState({
          user: null,
          loading: false,
          needsProfileSetup: false
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      return true;
    } catch (error) {
      console.error("Error signing in with Google", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("Error signing out", error);
      return false;
    }
  };

  const completeProfile = async () => {
    if (authState.user) {
      try {
        const userRef = doc(db, 'users', authState.user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.profileCompleted) {
            setAuthState(prev => ({
              ...prev,
              needsProfileSetup: false
            }));
          }
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
      }
    }
  };

  return { 
    user: authState.user, 
    loading: authState.loading, 
    needsProfileSetup: authState.needsProfileSetup,
    signInWithGoogle, 
    logout,
    completeProfile
  };
}