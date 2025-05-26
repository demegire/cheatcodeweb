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
      className="px-3 py-2 rounded-full bg-theme hover:bg-theme-hover text-white flex items-center cursor-pointer"
    >
      
      
        {isStatView ? (
          <>
            <CalendarDaysIcon className="h-5 w-5 mr-1" />
            <span className="text-sm">
              Calendar
            </span>
          </>
        ) : (
          <>
            <ChartBarIcon className="h-5 w-5 mr-1" />
            <span className="text-sm">
                Stats
            </span>
          </>
        )} 
    </button>
  );
}
