import React, { useState, useEffect } from 'react';
import StatButton from '../layout/StatsButton';
import ShareButton from '../layout/ShareButton';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from "chart.js";
import { Line } from 'react-chartjs-2';
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase';
import { Task } from '../../types'
import { getISOWeek, getCurrentISOWeek, getDateFromISOWeek } from '../../lib/dateUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface StatsViewProps {
    groupID: string,
    groupName: string,
    members: { id: string; name: string; color: string }[];
    isStatView: boolean
    onStatView: () => void
}

export default function StatsView({
    groupID,
    groupName,
    members,
    isStatView,
    onStatView
}: StatsViewProps) {
  // State to store weekly completion rates for each user
  const [weeklyStats, setWeeklyStats] = useState<{
    weekLabels: string[],
    memberStats: Record<string, number[]>
  }>({
    weekLabels: [],
    memberStats: {}
  });
  
  useEffect(() => {
    if (!groupID) return;
    
    // Calculate current year for filtering
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-W01`;
    const yearEnd = `${currentYear}-W53`; // Using W53 to ensure we capture all weeks
    
    // Reference to tasks collection
    const tasksRef = collection(db, 'groups', groupID, 'tasks');
    
    // Query tasks for the current year
    const q = query(
      tasksRef,
      where('weekId', '>=', yearStart),
      where('weekId', '<=', yearEnd)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Initialize data structure to hold all tasks by member and week
      const tasksByMemberAndWeek: Record<string, Record<string, Task[]>> = {};
      
      // Initialize for all members
      members.forEach(member => {
        tasksByMemberAndWeek[member.id] = {};
      });
      
      // Collect all weeks present in the data
      const weeksSet = new Set<string>();
      
      // Process all tasks from the snapshot
      snapshot.forEach(doc => {
        const task = { 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Task;
        
        // Add the week to our set of weeks
        weeksSet.add(task.weekId);
        
        // Ensure the member exists in our structure
        if (!tasksByMemberAndWeek[task.createdBy]) {
          tasksByMemberAndWeek[task.createdBy] = {};
        }
        
        // Ensure the week exists for this member
        if (!tasksByMemberAndWeek[task.createdBy][task.weekId]) {
          tasksByMemberAndWeek[task.createdBy][task.weekId] = [];
        }
        
        // Add the task to the appropriate member and week
        tasksByMemberAndWeek[task.createdBy][task.weekId].push(task);
      });
      
      // Convert the set of weeks to a sorted array
      const existingWeeks = Array.from(weeksSet).sort();
      
      // Generate all weeks in the range
      const allWeeks: string[] = [];
      if (existingWeeks.length > 0) {
        // Find min and max weeks from the data
        const minWeek = existingWeeks[0];
        const maxWeek = existingWeeks[existingWeeks.length - 1];
        
        const [minYear, minWeekNum] = minWeek.split('-W').map(Number);
        const [maxYear, maxWeekNum] = maxWeek.split('-W').map(Number);
        
        // Generate all weeks between min and max
        let currentWeek = minWeek;
        while (currentWeek <= maxWeek) {
          allWeeks.push(currentWeek);
          // Move to next week
          const date = getDateFromISOWeek(currentWeek);
          date.setDate(date.getDate() + 7); // Add 7 days
          currentWeek = getISOWeek(date);
        }
      }
      
      // If no data, return empty
      if (allWeeks.length === 0) {
        setWeeklyStats({
          weekLabels: [],
          memberStats: {}
        });
        return;
      }
      
      // Initialize the stats object for all members
      const memberStats: Record<string, number[]> = {};
      members.forEach(member => {
        memberStats[member.id] = Array(allWeeks.length).fill(0);
      });
      
      // Calculate completion rate for each member for each week
      allWeeks.forEach((week, weekIndex) => {
        members.forEach(member => {
          const weekTasks = tasksByMemberAndWeek[member.id][week] || [];
          
          if (weekTasks.length > 0) {
            const completedCount = weekTasks.filter(t => t.status === 'completed').length;
            const completionRate = (completedCount / weekTasks.length) * 100;
            memberStats[member.id][weekIndex] = completionRate;
          }
          // If no tasks, rate remains 0 from our fill(0) initialization
        });
      });
      
      // Format week labels as dates (first day of each week)
      const weekLabels = allWeeks.map(week => {
        const weekDate = getDateFromISOWeek(week);
        return weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      
      setWeeklyStats({
        weekLabels,
        memberStats
      });
    });
    
    return () => unsubscribe();
  }, [groupID, members]);
  
  // Chart configuration
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Weekly Task Completion Rates',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Completion Rate (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Week Starting'
        }
      }
    }
  };
  
  // Prepare dataset for chart
  const data = {
    labels: weeklyStats.weekLabels,
    datasets: members.map(member => ({
      label: member.name,
      data: weeklyStats.memberStats[member.id] || [],
      borderColor: member.color,
      backgroundColor: `${member.color}33`, // Add transparency
      fill: false,
    }))
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden p-4 relative">
        <div className="flex justify-between items-center mb-3 relative">
            {/* Left section: Group name */}
            <div className="py-2 flex justify-center items-center">
                <h1 
                className="text-2xl text-gray-800 font-bold cursor-pointer"
                >{groupName}</h1>
            </div>
            {/* Right section: Share button */}
            <div className="flex gap-4">
                <div>
                <StatButton isStatView={isStatView} onStatView={onStatView} />
                </div>
                <div>
                <ShareButton groupId={groupID} />
                </div>
            </div>
        </div>
        <div className="h-[80vh]">
          <Line options={options} data={data}/>
        </div>
    </div>
  );
}