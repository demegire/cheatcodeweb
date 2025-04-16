import React from 'react';
import { formatDateRange, getWeekDateRange, getCurrentISOWeek } from '../../lib/dateUtils';

interface WeeklyNavigationProps {
  currentISOWeek: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek?: () => void;
}

export default function WeeklyNavigation({ 
  currentISOWeek, 
  onPreviousWeek, 
  onNextWeek,
  onCurrentWeek
}: WeeklyNavigationProps) {
  // Get the date range and extract the year
  const { start } = getWeekDateRange(currentISOWeek);
  const year = start.getFullYear();
  const dateRangeText = formatDateRange(currentISOWeek);
  
  // Check if the current week is being viewed
  const isCurrentWeek = currentISOWeek === getCurrentISOWeek();
  
  // Default handler if not provided
  const handleCurrentWeek = onCurrentWeek || (() => {});
  
  return (
    <div className="flex items-center">
      <button
        onClick={onPreviousWeek}
        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 text-sm mr-2"
        aria-label="Previous week"
      >
        ←
      </button>
      
      <div className="flex flex-col">
        <span className="text-lg font-bold text-gray-800">
          {dateRangeText}
        </span>
        <span className="text-sm text-gray-500">
          {year}
        </span>
      </div>
      
      <button
        onClick={onNextWeek}
        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 text-sm ml-2"
        aria-label="Next week"
      >
        →
      </button>
      
      <button
        onClick={handleCurrentWeek}
        disabled={isCurrentWeek}
        className={`ml-4 px-3 py-1 text-sm rounded-md ${
          isCurrentWeek 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
        }`}
        aria-label="Go to current week"
      >
        This Week
      </button>
    </div>
  );
} 