import { apiClient } from "./client";

export const getProjects = () => {
  return apiClient("/projects/");
};

export const createProject = (data: any) => {
  return apiClient("/projects/", {
    method: "POST",
    data,
  });
};

export const updateProject = (id: string, data: any) => {
  return apiClient(`/projects/${id}/`, {
    method: "PATCH",
    data,
  });
};

export const deleteProject = (id: string) => {
  return apiClient(`/projects/${id}/`, {
    method: "DELETE",
  });
};

export const getDepartments = () => {
  return apiClient("/resources/departments/");
};

export const getTemplates = () => {
  return apiClient("/templates/");
};

export const importTemplate = (templateType: string, projectId: string) => {
  return apiClient(`/templates/${templateType}/import_template/`, {
    method: "POST",
    data: { project_id: projectId },
  });
};
