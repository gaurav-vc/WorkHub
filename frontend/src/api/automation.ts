import { apiClient } from "./client";

export const getInsightsStats = () => {
  return apiClient("/insights/stats/");
};

export const getWorkflows = () => {
  return apiClient("/workflows/workflows/");
};

export const createWorkflow = (data: any) => {
  return apiClient("/workflows/workflows/", {
    method: "POST",
    data,
  });
};

export const updateWorkflow = (id: string, data: any) => {
  return apiClient(`/workflows/workflows/${id}/`, {
    method: "PATCH",
    data,
  });
};

export const deleteWorkflow = (id: string) => {
  return apiClient(`/workflows/workflows/${id}/`, {
    method: "DELETE",
  });
};

export const executeWorkflow = (id: string) => {
  return apiClient(`/workflows/workflows/${id}/execute/`, {
    method: "POST",
  });
};

export const getEmployees = () => {
  return apiClient("/auth/employees/");
};

export const getRoles = () => {
  return apiClient("/rbac/roles/");
};
