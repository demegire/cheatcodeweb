import React, { useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface StatButtonProps {
    groupID: string;
}

export default function StatButton({ groupID }: StatButtonProps) {
 
  return (
    <button
      //onClick={}
      className="px-3 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center"
    >
      <ChartBarIcon className="h-5 w-5 mr-1" />
      <span className="text-sm"> Stats </span> 
    </button>
  );
}
