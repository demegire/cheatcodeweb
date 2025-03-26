import React, { useState } from 'react';
import { ShareIcon } from '@heroicons/react/24/outline';

interface GroupHeaderProps {
  groupName: string;
  groupId: string; // Add groupId parameter
  onUpdateName?: (newName: string) => void;
}

export default function GroupHeader({ groupName, groupId, onUpdateName }: GroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(groupName);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    if (onUpdateName && name.trim()) {
      onUpdateName(name.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

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
    <div className="p-4 border-b flex justify-between items-center">
      <div></div> {/* Empty div for layout balance */}
      
      {isEditing ? (
        <div className="flex items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="border text-gray-800 rounded px-2 py-1 text-xl font-bold"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
          >
            Save
          </button>
          <button
            onClick={() => {
              setName(groupName);
              setIsEditing(false);
            }}
            className="ml-2 bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
          >
            Cancel
          </button>
        </div>
      ) : (
        <h1 
          className="text-xl text-gray-800 font-bold cursor-pointer"
          onClick={() => onUpdateName && setIsEditing(true)}
        >
          {groupName}
        </h1>
      )}
      
      <button 
        onClick={handleShare} 
        className="text-blue-500 hover:text-blue-700 flex items-center"
      >
        <ShareIcon className="h-5 w-5 mr-1" />
        <span className="text-sm">{copied ? "Copied!" : "Share"}</span>
      </button>
    </div>
  );
}