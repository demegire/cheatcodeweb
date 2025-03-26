import React from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import Image from 'next/image';

export default function LoginForm() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-xs w-full">
        <h1 className="text-3xl font-bold mb-8 text-blue-600 text-center">cheat-code.cc</h1>
        <p className="mb-8 text-center max-w-md text-gray-600">
          Stay accountable together.
        </p>
        
        <div className="flex justify-center">
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-md shadow hover:shadow-md transition-shadow"
          >
            <Image 
              src="/google-logo.svg" 
              alt="Google Logo" 
              width={20} 
              height={20} 
            />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}