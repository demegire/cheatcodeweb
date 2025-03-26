import React from 'react';
import { formatDateRange, getCurrentISOWeek } from '../../lib/dateUtils';

interface WeekNavigationProps {
  currentISOWeek: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export default function WeekNavigation({ 
  currentISOWeek, 
  onPreviousWeek, 
  onNextWeek 
}: WeekNavigationProps) {
  const dateRangeText = formatDateRange(currentISOWeek);
  
  return (
    <div className="flex justify-center items-center p-4 border-t">
      <button
        onClick={onPreviousWeek}
        className="px-4 py-2 bg-blue-500 rounded-l hover:bg-blue-600"
      >
        ←
      </button>
      <span className="px-4 text-gray-600 font-medium">
        {dateRangeText}
      </span>
      <button
        onClick={onNextWeek}
        className="px-4 py-2 bg-blue-500 rounded-r hover:bg-blue-600"
      >
        →
      </button>
    </div>
  );
}