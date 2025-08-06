import React, { useState, useEffect } from 'react';

interface CompactGroupHeaderProps {
  groupName: string;
  onUpdateName?: (newName: string) => void;
}

export default function CompactGroupHeader({
  groupName,
  onUpdateName,
}: CompactGroupHeaderProps) {
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
    <div className="h-12 flex justify-start lg:justify-center items-center w-full">
      {isEditing ? (
        <div className="flex items-center h-full">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="h-full border text-gray-800 rounded px-2 text-xl font-bold max-w-[300px]"
            maxLength={24}
            autoFocus
          />
          <button
            onClick={handleSave}
            className="flex-shrink-0 w-8 h-8 ml-1 px-3 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setName(groupName);
              setIsEditing(false);
            }}
            className="flex-shrink-0 w-8 h-8 ml-1 px-3 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center"
          >
            x
          </button>
        </div>
      ) : (
        <h1
          className="h-full flex items-center text-2xl text-gray-800 font-bold cursor-pointer hover:bg-gray-200 rounded-full px-2 max-w-full overflow-hidden whitespace-nowrap"
          onClick={() => onUpdateName && setIsEditing(true)}
        >
          <span className="truncate max-w-full">
            {groupName}
          </span>
        </h1>
      )}
    </div>
  );
}
