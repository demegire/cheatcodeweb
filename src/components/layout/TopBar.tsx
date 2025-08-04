import React from 'react';
import CompactGroupHeader from './CompactGroupHeader';
import ShareButton from './ShareButton';
import StatButton from './StatsButton';
import { UserCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface TopBarProps {
  groupId: string;
  groupName: string;
  onUpdateGroupName?: (newName: string) => void;
  isStatView: boolean;
  onStatView: () => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  centerContent?: React.ReactNode;
}

export default function TopBar({
  groupId,
  groupName,
  onUpdateGroupName,
  isStatView,
  onStatView,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  centerContent,
}: TopBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 relative">
      <div className="flex flex-col items-center sm:flex-row sm:items-center w-full sm:w-auto relative">
        <div className="flex-shrink-0">
          <CompactGroupHeader groupName={groupName} onUpdateName={onUpdateGroupName} />
        </div>
        {centerContent && (
          <div className="mt-2 sm:mt-0 w-full flex justify-center sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:pointer-events-none">
            <div className="pointer-events-auto relative">{centerContent}</div>
          </div>
        )}
      </div>
      <div className="flex gap-2 items-center justify-end mt-2 sm:mt-0">
        <button
          onClick={onToggleLeftSidebar}
          className="px-3 py-2 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center cursor-pointer"
        >
          <UserCircleIcon className="h-5 w-5 mr-0 sm:mr-1" />
          <span className="text-sm hidden sm:inline">Groups</span>
        </button>
        <div>
          <StatButton isStatView={isStatView} onStatView={onStatView} />
        </div>
        <div>
          <ShareButton groupId={groupId} />
        </div>
        <button
          onClick={onToggleRightSidebar}
          className="px-3 py-2 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center cursor-pointer"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5 mr-0 sm:mr-1" />
          <span className="text-sm hidden sm:inline">Comments</span>
        </button>
      </div>
    </div>
  );
}

