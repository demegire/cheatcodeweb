import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { ChevronLeftIcon, PlusIcon, ArrowLeftStartOnRectangleIcon, MapPinIcon, BellIcon } from '@heroicons/react/24/outline';
import { GoPin } from "react-icons/go";
import { Task, Comment } from '../../types';
import CommentSection from '../comments/CommentSection';
import TaskTracker from '../../components/tracker/TaskTracker';
import StatsView from '../stats/StatsView';
import PlusModal from '../modals/PlusModal';
import TutorialModal from '../modals/TutorialModal';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { requestNotificationPermission } from '../../lib/notifications';
import { useAuth } from '../../lib/hooks/useAuth';
import Image from 'next/image'

type TaskTrackerComponentProps = React.ComponentProps<typeof TaskTracker>;
type StatsViewComponentProps = React.ComponentProps<typeof StatsView>;

interface GroupData {
  id: string;
  name: string;
  members: {
    id: string;
    name: string;
    color: string;
    joinedAt?: number;
  }[];
}

interface MainLayoutProps {
  children: React.ReactNode;
  groups?: GroupData[];
  selectedGroup?: GroupData | null;
  onGroupSelect?: (group: GroupData) => void;
  onCreateGroup?: () => void;
  onLeaveGroup?: (groupId: string) => void;
  onPinGroup?: (groupId: string) => void;
  pinnedGroupId?: string | null;
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
  onLeaveGroup = () => {},
  onPinGroup = () => {},
  pinnedGroupId = null,
  groupId = '',
  currentWeekId = '',
  selectedTask = null,
  onSelectTask = () => {},
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showPlusModal, setShowPlusModal] = useState(false);
  const { user } = useAuth();
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [showInstallTutorial, setShowInstallTutorial] = useState(false);

  const installSlides = [
    {
      image: '/ios-share.png',
      text: 'Tap the share button in Safari',
    },
    {
      image: '/ios-add.png',
      text: 'Select "Add to Home Screen"',
    },
  ];

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setNotificationsSupported(supported);
      if (supported && Notification.permission === 'granted') {
        setNotificationsGranted(true);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (user && notificationsSupported) {
      await requestNotificationPermission(user.uid);
      if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsGranted(true);
      }
    }
  };

  return (
    <div className="flex h-[100dvh] relative overflow-x-hidden">
      {/* Left Sidebar - always absolute positioned */}
      <div
        className={`absolute top-0 bottom-0 left-0 h-full bg-gray-100 border-r border-gray-200 transition-all duration-500
        ${sidebarCollapsed ? 'w-0' : 'w-full md:w-64 shadow-lg z-50'}`}
      >
        {!sidebarCollapsed &&
        (
          <div className="h-full flex flex-col">
          {!sidebarCollapsed && (
            <div className="p-4  mt-2 border-b border-gray-200 flex items-center justify-between">
              <button onClick={toggleSidebar} className="text-gray-600 hover:text-gray-900">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <div className="text-black font-bold">cheat-code.cc</div>
              <Image src="/android-chrome-192x192.png" alt="cheat-code.cc" width={32} height={32} className="h-8 w-8" />
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto">
            {/* Group list */}
            <ul className="space-y-1 px-2 mt-2">
              {groups.map(group => (
                <li
                  key={group.id}
                  className={`rounded-lg transition-colors duration-500 cursor-pointer p-2 ${
                    selectedGroup?.id === group.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'
                  }`}
                  onMouseEnter={() => setActiveGroupId(group.id)}
                  onMouseLeave={() => setActiveGroupId(null)}
                  onClick={() => {
                    onGroupSelect(group);
                    setActiveGroupId(group.id);
                  }}
                >
                  {!sidebarCollapsed && (
                    <div className="flex items-center justify-between truncate text-gray-600">
                      <span className="truncate">{group.name}</span>
                      {activeGroupId === group.id && (
                        <div className="flex items-center ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinGroup(group.id);
                            }}
                            className={`w-6 h-6 flex items-center justify-center rounded-full text-white ${
                              pinnedGroupId === group.id
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                            title={pinnedGroupId === group.id ? 'Unpin group' : 'Pin group'}
                          >
                            <GoPin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLeaveGroup(group.id);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white ml-2"
                            title="Leave group"
                          >
                            <ArrowLeftStartOnRectangleIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
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
          
          <div
            className={`p-4 flex items-center ${
              sidebarCollapsed ? 'hidden' : 'border-t border-gray-200 justify-between'
            }`}
          >
            <button
              onClick={
                notificationsSupported
                  ? handleEnableNotifications
                  : () => setShowInstallTutorial(true)
              }
              className={`inline-flex items-center px-5 text-sm rounded-full text-white cursor-pointer ${
                notificationsSupported
                  ? notificationsGranted
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-theme hover:bg-theme-hover'
                  : 'bg-red-500 hover:bg-red-600'
              } ${sidebarCollapsed ? 'sr-only' : 'block'}`}
              title={
                notificationsSupported
                  ? 'Enable notifications'
                  : 'Add to home screen'
              }
            >
              <BellIcon className="h-5 w-5 min-h-8" />
            </button>
            <button
              onClick={handleLogout}
              className={`inline-flex items-center px-5 text-sm rounded-full bg-theme hover:bg-theme-hover text-white cursor-pointer ${
                sidebarCollapsed ? 'sr-only' : 'block'
              }`}
            >
              <ArrowLeftStartOnRectangleIcon className="h-5 w-5 min-h-8" />
            </button>
          </div>
        </div>
        )
        }
      </div>
      
      {/* Main Content */}
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Clone children with additional props if it's a TaskTracker component */}
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            if (child.type === TaskTracker) {
              return React.cloneElement(child as React.ReactElement<TaskTrackerComponentProps>, {
                highlightedTaskId: highlightedTaskId,
                comments: comments,
                onToggleLeftSidebar: toggleSidebar,
                onToggleRightSidebar: toggleRightSidebar,
                isLeftSidebarCollapsed: sidebarCollapsed,
                isRightSidebarCollapsed: rightSidebarCollapsed,
              });
            }
            if (child.type === StatsView) {
              return React.cloneElement(child as React.ReactElement<StatsViewComponentProps>, {
                onToggleLeftSidebar: toggleSidebar,
                onToggleRightSidebar: toggleRightSidebar,
                isLeftSidebarCollapsed: sidebarCollapsed,
                isRightSidebarCollapsed: rightSidebarCollapsed,
              });
            }
          }
          return child;
        })}
      </div>
      
      {/* Right Sidebar - always absolute positioned */}
      <div
        className={`absolute top-0 bottom-0 right-0 h-full bg-gray-100 border-l border-gray-200 transition-all duration-500
        ${rightSidebarCollapsed ? 'w-0' : 'w-full lg:w-64 shadow-lg z-50'}`}
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

      {showInstallTutorial && (
        <TutorialModal
          slides={installSlides}
          onFinish={() => setShowInstallTutorial(false)}
        />
      )}
      {showPlusModal && <PlusModal onClose={() => setShowPlusModal(false)} />}
    </div>
  );
}