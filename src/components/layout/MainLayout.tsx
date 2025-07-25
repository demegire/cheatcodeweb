import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Task, Comment } from '../../types';
import CommentSection from '../comments/CommentSection';
import TaskTracker from '../../components/tracker/TaskTracker';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

type TaskTrackerComponentProps = React.ComponentProps<typeof TaskTracker>;

interface GroupData {
  id: string;
  name: string;
  members: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface MainLayoutProps {
  children: React.ReactNode;
  groups?: GroupData[];
  selectedGroup?: GroupData | null;
  onGroupSelect?: (group: GroupData) => void;
  onCreateGroup?: () => void;
  groupId?: string;
  currentWeekId?: string;
  selectedTask?: Task | null;
  onSelectTask?: (task: Task | null) => void;
}

export default function MainLayout({ 
  children, 
  groups = [], 
  selectedGroup = null,
  onGroupSelect = () => {},
  onCreateGroup = () => {},
  groupId = '',
  currentWeekId = '',
  selectedTask = null,
  onSelectTask = () => {},
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  // Fetch comments when group or week changes
  useEffect(() => {
    if (!groupId || !currentWeekId) return;

    const commentsRef = collection(db, 'groups', groupId, 'comments');
    const q = query(
      commentsRef,
      where('weekId', '==', currentWeekId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsList: Comment[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        commentsList.push({
          id: doc.id,
          text: data.text,
          userId: data.userId,
          userName: data.userName,
          userColor: data.userColor,
          taskId: data.taskId,
          createdAt: data.createdAt.toDate(),
          weekId: data.weekId
        });
      });
      
      setComments(commentsList);
    });

    return () => unsubscribe();
  }, [groupId, currentWeekId]);

  const handleLogout = () => {
    auth.signOut();
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleRightSidebar = () => {
    setRightSidebarCollapsed(!rightSidebarCollapsed);
  };

  return (
    <div className="flex h-screen relative">
      {/* Left Sidebar - always absolute positioned */}
      <div
        className={`absolute top-0 bottom-0 left-0 h-full bg-gray-100 border-r border-gray-200 transition-all duration-300
        ${sidebarCollapsed ? 'w-8 md:w-16' : 'w-full md:w-64 shadow-lg z-10'}`}
      >
        <div className="h-full flex flex-col">
          <div className={`p-4 text-gray-600 font-bold ${sidebarCollapsed ? 'text-center' : ''}`}>
            {sidebarCollapsed ? '' : 'My Groups'}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Group list */}
            <ul className="space-y-1 px-2">
              {groups.map(group => (
                <li 
                  key={group.id}
                  className={`rounded-lg transition-colors duration-200 cursor-pointer p-2 ${
                    selectedGroup?.id === group.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'
                  }`}
                  onClick={() => onGroupSelect(group)}
                >
                  {sidebarCollapsed ? (
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                      {group.name.charAt(0)}
                    </div>
                  ) : (
                    <div className="truncate text-gray-600">{group.name}</div>
                  )}
                </li>
              ))}
            </ul>
            
            {/* Create new group button */}
            <div className="mt-4 px-2">
              <button 
                onClick={onCreateGroup}
                className={`flex items-center justify-${sidebarCollapsed ? 'center' : 'start'} w-full p-2 rounded-lg text-gray-700 hover:bg-gray-200`}
              >
                <PlusIcon className="h-5 w-5 text-gray-600" />
                {!sidebarCollapsed && <span className="ml-2">Create New Group</span>}
              </button>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button 
              onClick={handleLogout}
              className={`text-sm text-gray-600 hover:text-gray-900 ${sidebarCollapsed ? 'sr-only' : 'block'}`}
            >
              Logout
            </button>
            
            <button onClick={toggleSidebar} className="text-gray-600 hover:text-gray-900">
              {sidebarCollapsed ? (
                <ChevronRightIcon className="h-5 w-5" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content - fixed margins */}
      <div className="w-full h-full flex flex-col overflow-hidden pl-8 pr-8 md:pl-16 lg:pr-16">
        {/* Clone children with additional props if it's a TaskTracker component */}
        {React.Children.map(children, child => {
          // Check if it's a valid element
          if (React.isValidElement(child) && 
              child.type === TaskTracker) {
            // Pass the highlightedTaskId to the TaskTracker
            return React.cloneElement(child as React.ReactElement<TaskTrackerComponentProps>, { 
              highlightedTaskId: highlightedTaskId,
              comments: comments 
            });
          }
          return child;
        })}
      </div>
      
      {/* Right Sidebar - always absolute positioned */}
      <div
        className={`absolute top-0 bottom-0 right-0 h-full bg-gray-100 border-l border-gray-200 transition-all duration-300
        ${rightSidebarCollapsed ? 'w-8 lg:w-16' : 'w-full lg:w-64 shadow-lg z-10'}`}
      >
        {groupId && currentWeekId ? (
          <CommentSection 
            groupId={groupId}
            currentWeekId={currentWeekId}
            selectedTask={selectedTask}
            onSelectTask={onSelectTask}
            highlightedTaskId={highlightedTaskId}
            onHighlightTask={setHighlightedTaskId}
            isCollapsed={rightSidebarCollapsed}
            onToggleCollapse={toggleRightSidebar}
            members={selectedGroup?.members || []} // Pass members array
          />
        ) : (
          <div className="p-4 text-gray-500 text-center">
            Select a group to view comments
          </div>
        )}
      </div>
    </div>
  );
}