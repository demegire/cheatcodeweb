import React, { useState, useEffect } from 'react';

interface CompactGroupHeaderProps {
  groupName: string;
  onUpdateName?: (newName: string) => void;
}

export default function CompactGroupHeader({ groupName, onUpdateName }: CompactGroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(groupName);

  useEffect(() => {
    setName(groupName);
  }, [groupName]);

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

  return (
    <div className="py-2 flex justify-center items-center">
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
          className="text-2xl text-gray-800 font-bold cursor-pointer"
          onClick={() => onUpdateName && setIsEditing(true)}
        >
          <span className="sm:hidden">
            {groupName.length > 8 ? `${groupName.slice(0, 8)}...` : groupName}
          </span>
          <span className="hidden sm:inline">{groupName}</span>
        </h1>
      )}
    </div>
  );
}
