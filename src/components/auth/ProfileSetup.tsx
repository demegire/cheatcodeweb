'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HexColorPicker } from 'react-colorful';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/hooks/useAuth';

interface ProfileSetupProps {
  userId: string;
}

export default function ProfileSetup({ userId }: ProfileSetupProps) {
  const router = useRouter();
  const { completeProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#3498DB');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (displayName.length > 20) {
      setError('Display name must be 20 characters or less');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Update user profile in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        color,
        profileCompleted: true
      });

      // Update auth state so that needsProfileSetup becomes false
      await completeProfile();
      
      // Redirect based on any pending invite stored in localStorage
      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        router.push(`/invite/${pendingInvite}`);
      } else {
        router.push('/dashboard');
      }
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose a display name and a color
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 
                       placeholder-gray-500 text-gray-900 rounded-md 
                       focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter a name that you always wanted to have."
            />
            <p className="text-xs text-gray-500">
              {20 - displayName.length} characters remaining
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Choose Your Color Wisely...
            </label>
            <p className="text-xs text-gray-500">
              ... you will not be able to change it.
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className="w-full h-12 rounded-md border border-gray-300 shadow-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: color }}
              >
                <span className="bg-white px-2 py-1 rounded text-sm text-gray-700">
                  {color}
                </span>
              </button>
              
              {isColorPickerOpen && (
                <div className="absolute z-10 mt-2">
                  <div 
                    className="fixed inset-0" 
                    onClick={() => setIsColorPickerOpen(false)}
                  />
                  <div className="relative z-20 bg-white p-4 rounded-lg shadow-xl border border-gray-200">
                    <HexColorPicker
                      color={color}
                      onChange={setColor}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent 
                       text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
