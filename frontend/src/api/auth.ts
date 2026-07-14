import { apiClient } from "./client";

export const getMyAccess = () => {
  return apiClient("/rbac/role-access/my_access/");
};

export const login = (data: any) => {
  return apiClient("/auth/login/", {
    method: "POST",
    data,
  });
};

export const register = (data: any) => {
  return apiClient("/auth/register/", {
    method: "POST",
    data,
  });
};

export const forgotPassword = (data: any) => {
  return apiClient("/auth/forgot-password/", {
    method: "POST",
    data,
  });
};

export const verifyOtp = (data: any) => {
  return apiClient("/auth/verify-otp/", {
    method: "POST",
    data,
  });
};

export const resetPassword = (data: any) => {
  return apiClient("/auth/reset-password/", {
    method: "POST",
    data,
  });
};
