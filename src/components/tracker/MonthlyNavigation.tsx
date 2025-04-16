import React, { useState, useEffect } from 'react';
import { getWeekDateRange } from '../../lib/dateUtils';

interface MonthlyNavigationProps {
  currentISOWeek: string;
  onMonthSelect: (year: number, month: number) => void;
  onYearSelect?: (year: number) => void;
}

export default function MonthlyNavigation({ 
  currentISOWeek, 
  onMonthSelect,
  onYearSelect = () => {}
}: MonthlyNavigationProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Get the date range of the currently viewed week
  const { start, end } = getWeekDateRange(currentISOWeek);
  
  // Use the end of the week (Sunday) to determine the viewed month/year
  const viewedMonth = end.getMonth();
  const viewedYear = end.getFullYear();
  
  // State to track the displayed year (which may differ from the viewed year)
  const [displayedYear, setDisplayedYear] = useState(viewedYear);
  
  // Update displayed year when viewed year changes
  useEffect(() => {
    setDisplayedYear(viewedYear);
  }, [viewedYear]);
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return (
    <div className="flex flex-col border-t">
      <div className="flex justify-center items-center px-4 pb-4">
        <div className="flex items-center w-full max-w-4xl mx-auto justify-between">
          <button
            onClick={() => setDisplayedYear(displayedYear - 1)}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-800 font-medium flex-shrink-0 mr-2 flex items-center"
          >
            <span className="mr-1">←</span> {displayedYear - 1}
          </button>
          
          <div className="flex flex-nowrap justify-center gap-2 overflow-x-auto">
            {months.map((month, index) => {
              // Determine button color based on relation to current month/year
              let bgColorClass = "bg-gray-200 hover:bg-gray-300";
              
              // Current viewed date highlighting - only highlight if we're in the same year as being viewed
              const isViewedMonth = displayedYear === viewedYear && index === viewedMonth;
              
              // Color coding for past/present/future
              if (displayedYear === currentYear) {
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
              } else if (displayedYear < currentYear) {
                // Past year: all months are pastel green
                bgColorClass = "bg-green-200 hover:bg-green-300";
              } else {
                // Future year: all months are pastel red
                bgColorClass = "bg-red-200 hover:bg-red-300";
              }
              
              // Add border if this is the month being viewed
              const borderClass = isViewedMonth ? "border-2 border-gray-700" : "";
              const fontWeightClass = isViewedMonth ? "font-bold" : "";
              
              return (
                <button
                  key={month}
                  onClick={() => onMonthSelect(displayedYear, index)}
                  className={`px-3 py-1 ${bgColorClass} ${borderClass} ${fontWeightClass} rounded text-sm text-gray-800 flex-shrink-0`}
                >
                  {month}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setDisplayedYear(displayedYear + 1)}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-800 font-medium flex-shrink-0 ml-2 flex items-center"
          >
            {displayedYear + 1} <span className="ml-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
} 