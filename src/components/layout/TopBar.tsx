import React from 'react'
import CompactGroupHeader from './CompactGroupHeader'
import ShareButton from './ShareButton'
import StatButton from './StatsButton'
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'

interface TopBarProps {
  groupId: string
  groupName: string
  onUpdateGroupName?: (newName: string) => void
  isStatView: boolean
  onStatView: () => void
  onToggleLeftSidebar?: () => void
  onToggleRightSidebar?: () => void
  centerContent?: React.ReactNode
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
    <div className="p-2 lg:p-4 w-full sticky top-0 left-0 right-0 z-40 bg-white">
      {/* mobile: single-row */}
      <div className="lg:hidden flex items-center justify-between w-full gap-2">
        <div className="flex-1 min-w-0 overflow-hidden">
          <CompactGroupHeader
            groupName={groupName}
            onUpdateName={onUpdateGroupName}
          />
        </div>
        {centerContent && (
          <div className="flex-shrink-0">
            {centerContent}
          </div>
        )}
      </div>

      {/* desktop: auto | 1fr | auto */}
      <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-x-4 w-full lg:relative">
        {/* left */}
        <div className="justify-self-end flex gap-2 items-center overflow-hidden">
          <button
            onClick={onToggleLeftSidebar}
            className="flex-shrink-0 px-2 py-2 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center h-8 w-8 cursor-pointer"
          >
            <Bars3Icon className="h-7 w-7" />
          </button>
          <div className="min-w-0 overflow-hidden">
            <CompactGroupHeader
              groupName={groupName}
              onUpdateName={onUpdateGroupName}
            />
          </div>
        </div>
        {/* center */}
        {centerContent && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            {centerContent}
          </div>
        )}

        {/* right */}
        <div className="justify-self-end flex gap-2 items-center">
          <StatButton isStatView={isStatView} onStatView={onStatView} />
          <ShareButton groupId={groupId} />
          <button
            onClick={onToggleRightSidebar}
            className="px-3 py-2 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center cursor-pointer"
            data-comment-toggle="true"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-0 sm:mr-1" />
            <span className="text-sm hidden sm:inline">Comments</span>
          </button>
        </div>
      </div>
    </div>
  )
}
