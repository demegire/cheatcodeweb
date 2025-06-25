import React from 'react';
import { ChartBarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface StatButtonProps {
    isStatView: boolean,
    onStatView: () => void
}

export default function StatButton({
    isStatView,
    onStatView
}: StatButtonProps) {
 
  return (
    <button
      onClick={onStatView}
      className="px-3 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center"
    >
        {isStatView ? (
          <>
            <CalendarDaysIcon className="h-5 w-5 mr-0 sm:mr-1" />
            <span className="text-sm hidden sm:inline">Calendar</span>
          </>
        ) : (
          <>
            <ChartBarIcon className="h-5 w-5 mr-0 sm:mr-1" />
            <span className="text-sm hidden sm:inline">Stats</span>
          </>
        )}
    </button>
  );
}
