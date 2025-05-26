import { getCurrentISOWeek } from '@/src/lib/dateUtils';
import React, { useState } from 'react';

interface ThisWeekButtonProps {
    currentISOWeek: string;
    onCurrentWeek: () => void;
}

export default function ThisWeekButton({ 
    currentISOWeek,
    onCurrentWeek
}: ThisWeekButtonProps) {

    // Check if the current week is being viewed
    const isCurrentWeek = currentISOWeek === getCurrentISOWeek();

    // Default handler if not provided
    const handleCurrentWeek = onCurrentWeek || (() => {});

  return (
    <>
        {!isCurrentWeek && (
        <button
            onClick={handleCurrentWeek}
            className={`mr-4 px-3 py-2 text-sm rounded-full bg-theme hover:bg-theme-hover text-white cursor-pointer`}
            aria-label="Go to current week"
        >
            This Week
        </button>
        )}
    </>
    );
}