'use client';
import * as React from 'react'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useParams } from 'next/navigation';

export default function InvitePage() {
  const router = useRouter();
  const { user, loading, needsProfileSetup } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const groupId = params.code as string;
  
  useEffect(() => {
    // If user needs profile setup, redirect to home page
    // The profile will be completed there, and user will be redirected back here
    //if (!user || needsProfileSetup) {
    //  localStorage.setItem('pendingInvite', groupId);
    //  router.push('/');
    //  return;
    //}

    const joinGroup = async () => {
      try {
        // Check if group exists
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        
        if (!groupSnap.exists()) {
          setError('Invalid invite link. The group may no longer exist.');
          return;
        }
        
        if (!user) {
          console.log('no user')
          // Store the invite code in localStorage to use after login
          localStorage.setItem('pendingInvite', groupId);
          
          // Redirect to login page
          router.push('/');
          return;
        }
        
        // Check if user is already in the group
        const groupData = groupSnap.data();
        const isAlreadyMember = groupData.members.some((member: any) => member.id === user.uid);
        
        if (isAlreadyMember) {
          router.push('/dashboard');
          return;
        }
        
        // Get user's display name and color from completed profile
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        const displayName = userData?.displayName || 'User';
        const userColor = userData?.color || '#' + Math.floor(Math.random()*16777215).toString(16);
        
        // Add user to group members
        await updateDoc(groupRef, {
          members: arrayUnion({
            id: user.uid,
            name: displayName,
            color: userColor
          })
        });
        
        // Add group to user's groups
        await updateDoc(userRef, {
          groups: arrayUnion(groupId)
        });
        
        // Clear the pendingInvite from localStorage
        localStorage.removeItem('pendingInvite');
                
        // Redirect to dashboard
        router.push('/dashboard');
        
      } catch (error) {
        console.error('Error joining group:', error);
        setError('Something went wrong. Please try again.');
      }
    };
    
    if (!loading) {
      joinGroup();
    }
  }, [groupId, user, loading, needsProfileSetup, router]);
  
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-xs w-full">        
        {error ? (
          <div className="text-red-500 text-center mb-4">{error}</div>
        ) : (
          <div className="text-center text-gray-600">
            <p>Validating invite...</p>
          </div>
        )}
      </div>
    </div>
  );
}