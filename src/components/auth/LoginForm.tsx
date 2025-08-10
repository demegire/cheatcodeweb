import React from 'react';
import Image from 'next/image';
import { useAuth } from '../../lib/hooks/useAuth';
import TickCrossBackground from './TickCrossBackground';
import TaskDemoBox from './TaskDemoBox';
import AnnouncementsBox from './AnnouncementsBox';

export default function LoginForm() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 overflow-hidden">
      <TickCrossBackground />
      <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-8 overflow-y-auto max-h-screen">
        <div className="order-2 md:order-1">
          <TaskDemoBox />
        </div>
        <div className="order-1 md:order-2 bg-white p-8 rounded-lg shadow-md max-w-xs w-full">
          <div className="flex items-center justify-center mb-8">
            <h1 className="text-3xl font-bold text-black">cheat-code.</h1>
            <Image
              src="/android-chrome-192x192.png"
              alt="cc logo"
              width={36}
              height={36}
              className="h-9 w-9 relative top-0.75"
            />
          </div>
          <p className="mb-8 text-center max-w-md text-black">Stay accountable together.</p>
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
        <div className="order-3 md:order-3">
          <AnnouncementsBox />
        </div>
      </div>
    </div>
  );
}