import React from 'react';
import { formatDateRange, getCurrentISOWeek, getDateFromISOWeek, getWeekDateRange } from '../../lib/dateUtils';

interface WeekNavigationProps {
  currentISOWeek: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onMonthSelect: (year: number, month: number) => void;
}

export default function WeekNavigation({ 
  currentISOWeek, 
  onPreviousWeek, 
  onNextWeek,
  onMonthSelect
}: WeekNavigationProps) {
  const dateRangeText = formatDateRange(currentISOWeek);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Get the date range of the currently viewed week
  const { start, end } = getWeekDateRange(currentISOWeek);
  
  // Use the end of the week (Sunday) to determine the viewed month
  // This ensures we highlight the later month when a week spans two months
  const viewedMonth = end.getMonth();
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return (
    <div className="flex flex-col border-t">
      <div className="flex justify-center items-center p-4">
        <button
          onClick={onPreviousWeek}
          className="px-4 py-2 bg-blue-500 rounded-l hover:bg-blue-600 text-white"
        >
          ←
        </button>
        <span className="px-4 text-gray-600 font-medium">
          {dateRangeText}
        </span>
        <button
          onClick={onNextWeek}
          className="px-4 py-2 bg-blue-500 rounded-r hover:bg-blue-600 text-white"
        >
          →
        </button>
      </div>
      
      <div className="flex justify-center items-center px-4 pb-4">
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-2xl">
          {months.map((month, index) => {
            // Determine button color based on relation to current month
            let bgColorClass = "bg-gray-200 hover:bg-gray-300";
            if (index < currentMonth) {
              // Past months: pastel green
              bgColorClass = "bg-green-200 hover:bg-green-300";
            } else if (index === currentMonth) {
              // Current month: pastel blue
              bgColorClass = "bg-blue-200 hover:bg-blue-300";
            } else {
              // Future months: pastel red
              bgColorClass = "bg-red-200 hover:bg-red-300";
            }
            
            // Add border if this is the month being viewed
            const isViewedMonth = index === viewedMonth;
            const borderClass = isViewedMonth ? "border-2 border-gray-700" : "";
            const fontWeightClass = isViewedMonth ? "font-bold" : "";
            
            return (
              <button
                key={month}
                onClick={() => onMonthSelect(currentYear, index)}
                className={`px-3 py-1 ${bgColorClass} ${borderClass} ${fontWeightClass} rounded text-sm text-gray-800`}
              >
                {month}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}