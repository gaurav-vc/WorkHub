export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
}

export interface TaskComment {
  id: string;
  user: string;
  initials: string;
  text: string;
  time: string;
  attachments?: string[];
  mentions?: string[];
}

export interface TaskChatMessage {
  id: string;
  user: string;
  initials: string;
  text: string;
  time: string;
  file?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface RepeatConfig {
  enabled: boolean;
  type: "daily" | "weekly" | "monthly" | "custom";
  interval?: number;
  unit?: "days" | "weeks" | "months";
  endDate?: string;
  infinite?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  taskType: "self" | "assign";
  priority: "P1" | "P2" | "P3" | "P4";
  status: "todo" | "in-progress" | "done" | "blocked";
  project: string;
  assignees: Array<{ id?: string | number; name: string; initials: string }>;
  createdBy: { name: string; initials: string };
  createdDate: string;
  dueDate: string;
  dueTime: string;
  startDate: string;
  estimatedEffort: number;
  effortUnit: "hours" | "days";
  actualEffort: number;
  isUrgent: boolean;
  repeat: RepeatConfig;
  dependencies: string[];
  checklist: ChecklistItem[];
  subtasks: SubTask[];
  comments: TaskComment[];
  chat: TaskChatMessage[];
  attachments: TaskAttachment[];
  tags: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  capacity: number;
  capacityUnit: "hours/day" | "hours/week";
  avatar?: string;
}

export interface ResourceAllocation {
  resourceId: string;
  taskId: string;
  hours: number;
  startDate: string;
  endDate: string;
}

export interface Notification {
  id: string;
  type: "task-assigned" | "task-updated" | "comment" | "mention" | "dependency-complete" | "urgent";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tasks: number;
  icon: string;
  popular?: boolean;
}
