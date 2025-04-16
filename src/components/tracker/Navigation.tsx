import React from 'react';
import WeeklyNavigation from './WeeklyNavigation';
import MonthlyNavigation from './MonthlyNavigation';

interface NavigationProps {
  currentISOWeek: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onMonthSelect: (year: number, month: number) => void;
  onYearSelect?: (year: number) => void;
}

export default function Navigation({ 
  currentISOWeek, 
  onPreviousWeek, 
  onNextWeek,
  onMonthSelect,
  onYearSelect = () => {}
}: NavigationProps) {
  return (
    <>
      <MonthlyNavigation 
        currentISOWeek={currentISOWeek}
        onMonthSelect={onMonthSelect}
        onYearSelect={onYearSelect}
      />
    </>
  );
}