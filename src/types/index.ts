export interface Task {
  id: string;
  text: string;
  status: 'not-done' | 'completed' | 'postponed';
  day: number; // 0-6 for Monday-Sunday
  createdBy: string; // ID of the user who owns the task
  createdAt: Date;
  weekId: string; // ISO week format like "2023-W42"
  suggestedBy?: string; // ID of the user who suggested this task (optional)
  /**
   * Indicates that the task comes from the user's personal collection rather
   * than a group. This property is not persisted in Firestore and is derived
   * from the document path when tasks are loaded.
   */
  isGlobal?: boolean;
}
  
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  groups: string[];
  createdAt: Date;
}

export interface GroupData {
  id: string;
  name: string;
  members: string[];
  tasks: Record<string, Task[]>; // userId -> tasks
  createdAt: Date;
  createdBy: string;
  // Remove weekOffset as it's no longer needed
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userColor: string;
  taskId: string | null;
  createdAt: Date;
  weekId: string;
}