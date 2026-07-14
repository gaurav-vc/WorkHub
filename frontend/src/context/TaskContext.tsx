import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Task, Notification } from "@/types/tasks";
import { getTasks, createTask, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from "@/api/tasks";
import { useAuth } from "./AuthContext";
import { API_BASE } from "@/config";
import { toast } from "sonner";

interface TaskContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTasks();
    } else if (!isAuthenticated) {
      setTasks([]);
    }
  }, [isAuthenticated, token]);

  const mapTaskFromApi = (t: any): Task => {
    return {
      ...t,
      dueDate: t.due_date || t.dueDate || "",
      startDate: t.start_date || t.created_at || t.startDate || "",
      assignees: t.assignees || (t.assignee_detail ? [{
        id: t.assignee_detail.id,
        name: t.assignee_detail.name,
        initials: t.assignee_detail.name.substring(0, 2).toUpperCase()
      }] : []),
      estimatedEffort: t.estimatedEffort || t.duration || 3,
      effortUnit: t.effortUnit || "hours",
      actualEffort: t.actualEffort || 0,
    };
  };

  const fetchTasks = async () => {
    try {
      const data = await getTasks();
      const rawTasks = data.results || data;
      setTasks(rawTasks.map(mapTaskFromApi));
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  const addTask = async (task: Task) => {
    try {
      const newTask = await createTask(task);
      setTasks((prev) => [...prev, mapTaskFromApi(newTask)]);
      toast.success("Task created");
    } catch (err) {
      toast.error("Failed to create task");
      console.error(err);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id.toString() === id.toString() ? { ...t, ...updates } : t)));
    if (selectedTask?.id.toString() === id.toString()) {
      setSelectedTask((prev) => prev ? { ...prev, ...updates } : prev);
    }

    try {
      await updateTaskApi(id, updates);
    } catch (err) {
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id.toString() !== id.toString()));
    if (selectedTask?.id.toString() === id.toString()) setSelectedTask(null);

    try {
      await deleteTaskApi(id);
      toast.success("Task deleted");
    } catch (err) {
      toast.error("Failed to delete task");
      fetchTasks();
    }
  };

  const markNotificationRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id.toString() === id.toString() ? { ...n, read: true } : n)));

  const markAllNotificationsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <TaskContext.Provider value={{
      tasks, setTasks, addTask, updateTask, deleteTask,
      notifications, setNotifications, markNotificationRead, markAllNotificationsRead, unreadCount,
      selectedTask, setSelectedTask,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTaskContext must be used within TaskProvider");
  return ctx;
}
