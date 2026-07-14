import { apiClient } from "./client";
import { Task } from "@/types/tasks";

export const getTasks = () => {
  return apiClient("/tasks/");
};

export const createTask = (task: Task) => {
  return apiClient("/tasks/", {
    method: "POST",
    data: task,
  });
};

export const updateTask = (id: string, updates: Partial<Task>) => {
  return apiClient(`/tasks/${id}/`, {
    method: "PATCH",
    data: updates,
  });
};

export const deleteTask = (id: string) => {
  return apiClient(`/tasks/${id}/`, {
    method: "DELETE",
  });
};

export const getMyDayDashboard = () => {
  return apiClient("/myday/dashboard/");
};

export const submitApprovalAction = (id: string, action: string) => {
  return apiClient(`/myday/approvals/${id}/action/`, {
    method: "POST",
    data: { action },
  });
};
