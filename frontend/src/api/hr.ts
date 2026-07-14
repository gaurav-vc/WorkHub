import { apiClient } from "./client";

export const getOrganizationManagement = () => {
  return apiClient("/organization/management/");
};

export const getOrganizationManagementDetails = (id: string) => {
  return apiClient(`/organization/management/${id}/`);
};

export const createOrUpdateOrganizationManagement = (id: string | null, data: any) => {
  return apiClient(`/organization/management/${id ? `${id}/` : ""}`, {
    method: id ? "PUT" : "POST",
    data,
  });
};

export const getHRRequests = () => {
  return apiClient("/hr/requests/");
};

export const createHRRequest = (data: any) => {
  return apiClient("/hr/requests/", {
    method: "POST",
    data,
  });
};

export const updateHRRequest = (id: string, data: any) => {
  return apiClient(`/hr/requests/${id}/`, {
    method: "PATCH",
    data,
  });
};

export const getCompanyPolicies = () => {
  return apiClient("/company/policies/");
};

export const createCompanyPolicy = (data: any) => {
  return apiClient("/company/policies/", {
    method: "POST",
    data,
  });
};

export const updateCompanyPolicy = (id: string, data: any) => {
  return apiClient(`/company/policies/${id}/`, {
    method: "PUT",
    data,
  });
};

export const deleteCompanyPolicy = (id: string) => {
  return apiClient(`/company/policies/${id}/`, {
    method: "DELETE",
  });
};
