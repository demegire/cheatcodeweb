import React from 'react'
import ShareButton from './ShareButton'
import StatButton from './StatsButton'
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'

interface BottomBarProps {
  groupId: string
  isStatView: boolean
  onStatView: () => void
  onToggleLeftSidebar?: () => void
  onToggleRightSidebar?: () => void
}

export default function BottomBar({
  groupId,
  isStatView,
  onStatView,
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: BottomBarProps) {
  const isStandalone = !!(window.navigator as any).standalone;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 w-full bg-black z-30">
      <div className={`flex justify-around items-center p-2 ${isStandalone && "pb-6"}`}>
        <button
          onClick={onToggleLeftSidebar}
          className="px-3 py-2 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center"
        >
          <Bars3Icon className="h-5 w-5" />
          <span className="ml-1 text-sm hidden sm:inline">Menu</span>
        </button>
        <StatButton isStatView={isStatView} onStatView={onStatView} />
        <ShareButton groupId={groupId} />
        <button
          onClick={onToggleRightSidebar}
          className="px-3 py-2 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center"
          data-comment-toggle="true"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          <span className="ml-1 text-sm hidden sm:inline">Comments</span>
        </button>
      </div>
    </div>
  )
}

