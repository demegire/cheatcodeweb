import React from 'react';
import CompactGroupHeader from '../layout/CompactGroupHeader';
import StatButton from '../layout/StatsButton';
import ShareButton from '../layout/ShareButton';

interface StatsViewProps {
    groupID: string,
    groupName: string,
    isStatView: boolean
    onStatView: () => void
}

export default function StatsView({
    groupID,
    groupName,
    isStatView,
    onStatView
}: StatsViewProps) {

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 relative">
        <div className="flex justify-between items-center mb-3 relative">
            {/* Left section: Group name */}
            <div className="py-2 flex justify-center items-center">
                <h1 
                className="text-2xl text-gray-800 font-bold cursor-pointer"
                >{groupName}</h1>
            </div>
            {/* Right section: Share button */}
            <div className="flex gap-4">
                <div>
                <StatButton isStatView={isStatView} onStatView={onStatView} />
                </div>
                <div>
                <ShareButton groupId={groupID} />
                </div>
            </div>
        </div>
    </div>
  );
}