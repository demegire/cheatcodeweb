import React, { useState, useRef, useEffect } from 'react';
import { formatDateRange, getWeekDateRange} from '../../lib/dateUtils';
import MonthlyNavigation from './MonthlyNavigation';
import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface WeeklyNavigationProps {
  currentISOWeek: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onMonthSelect?: (year: number, month: number) => void;
  onYearSelect?: (year: number) => void;
}

export default function WeeklyNavigation({ 
  currentISOWeek, 
  onPreviousWeek, 
  onNextWeek,
  onMonthSelect,
  onYearSelect
}: WeeklyNavigationProps) {
  const [showMonthlyPopup, setShowMonthlyPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Get the date range and extract the year
  const { start } = getWeekDateRange(currentISOWeek);
  const year = start.getFullYear();
  const dateRangeText = formatDateRange(currentISOWeek);
  
  const toggleMonthlyPopup = () => {
    setShowMonthlyPopup(!showMonthlyPopup);
  };
  
  // Click-away listener
  useEffect(() => {
    if (!showMonthlyPopup) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowMonthlyPopup(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthlyPopup]);
  
  return (
    <div className="flex items-center">
      <button
        onClick={onPreviousWeek}
        className="px-2 py-2 hover:bg-gray-200 rounded-full text-gray-700 text-lg mr-2 cursor-pointer"
        aria-label="Previous week"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </button>

      <div
        className="hidden sm:flex flex-col hover:bg-gray-200 rounded-fill items-center w-[265px] cursor-pointer"
        onClick={toggleMonthlyPopup}
      >
        <span className="text-lg font-bold text-gray-800">
          {dateRangeText}
        </span>
        <span className="text-sm text-gray-500">
          {year}
        </span>
      </div>

      <button
        onClick={onNextWeek}
        className="px-2 py-2 hover:bg-gray-200 rounded-full text-gray-700 text-lg ml-2 cursor-pointer"
        aria-label="Next week"
      >
        <ArrowRightIcon className="h-5 w-5" />
      </button>
      
      {/* Monthly Navigation Popup */}
      {showMonthlyPopup && onMonthSelect && (
        <div
          className="hidden sm:block absolute z-10 top-full mt-2 left-1/2 transform -translate-x-1/2"
          ref={popupRef}
        >
          <div className="relative z-20 bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-auto">
            <MonthlyNavigation
              currentISOWeek={currentISOWeek}
              onMonthSelect={(year, month) => {
                if (onMonthSelect) {
                  onMonthSelect(year, month);
                }
              }}
              onYearSelect={onYearSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
} 