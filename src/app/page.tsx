'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/hooks/useAuth';
import LoginForm from '../components/auth/LoginForm';
import ProfileSetup from '../components/auth/ProfileSetup';

export default function Home() {
  const router = useRouter();
  const { user, loading, needsProfileSetup } = useAuth();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    // Check for pending invite
    const pendingInvite = localStorage.getItem('pendingInvite');
    if (pendingInvite) {
      setDestination(`/invite/${pendingInvite}`);
    } else {
      setDestination('/dashboard');
    }

    // If user is logged in and profile is completed, redirect to destination
    if (user && !needsProfileSetup && destination) {
      if (destination.startsWith('/invite/')) {
        // For invite links, we need to keep the pendingInvite in localStorage
        // It will be removed after the invite is processed
        router.push(destination);
      } else {
        // For dashboard, we can clear any pendingInvite
        localStorage.removeItem('pendingInvite');
        router.push(destination);
      }
    }
  }, [user, needsProfileSetup, router, destination]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Show profile setup if user is logged in but needs to complete profile
  if (user && needsProfileSetup) {
    return <ProfileSetup userId={user.uid} />;
  }

  // Show login form if user is not logged in
  if (!user) {
    return <LoginForm />;
  }

  // Fallback loading state
  return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
}