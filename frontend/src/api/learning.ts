import { apiClient } from "./client";

export const getCourses = () => {
  return apiClient("/learning_center/courses/");
};

export const getAccessRequests = () => {
  return apiClient("/learning_center/access_requests/");
};

export const updateAccessRequest = (id: string, action: string) => {
  return apiClient(`/learning_center/access_requests/${id}/`, {
    method: "PATCH",
    data: { action },
  });
};

export const getCertificates = () => {
  return apiClient("/learning_center/certificates/");
};

export const createCertificate = (data: any) => {
  return apiClient("/learning_center/certificates/", {
    method: "POST",
    data,
  });
};

export const updateCertificate = (id: string, data: any) => {
  return apiClient(`/learning_center/certificates/${id}/`, {
    method: "PUT",
    data,
  });
};

export const deleteCertificate = (id: string) => {
  return apiClient(`/learning_center/certificates/${id}/`, {
    method: "DELETE",
  });
};

export const startAssessment = (courseId: string, employeeName?: string) => {
  return apiClient("/learning_center/assessments/start/", {
    method: "POST",
    data: { course_id: courseId, employee_name: employeeName },
  });
};

export const submitAssessmentAnswer = (sessionId: string, data: any) => {
  return apiClient(`/learning_center/assessments/${sessionId}/submit_answer/`, {
    method: "POST",
    data,
  });
};

export const finishAssessment = (sessionId: string) => {
  return apiClient(`/learning_center/assessments/${sessionId}/finish/`, {
    method: "POST",
  });
};
