'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import LoginForm from '../components/auth/LoginForm';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        router.push('/dashboard');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return <LoginForm />;
}