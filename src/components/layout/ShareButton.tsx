import React, { useState } from 'react';
import { ShareIcon } from '@heroicons/react/24/outline';

interface ShareButtonProps {
  groupId: string;
}

export default function ShareButton({ groupId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Create the invite URL with the groupId
    const inviteUrl = `${window.location.origin}/invite/${groupId}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button 
      onClick={handleShare} 
      className="px-3 py-2 text-sm rounded-full bg-theme hover:bg-theme-hover text-white flex items-center cursor-pointer"
    >
      <ShareIcon className="h-5 w-5 mr-1" />
      <span className="text-sm">{copied ? "Copied!" : "Share"}</span>
    </button>
  );
} 