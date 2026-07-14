import { apiClient } from "./client";

export const getChatChannels = () => {
  return apiClient("/chat/channels/");
};

export const getAllUsersChannels = () => {
  return apiClient("/chat/channels/all_users/");
};

export const getChatMessages = (channelId: string) => {
  return apiClient("/chat/messages/", {
    params: { channel_id: channelId },
  });
};

export const sendChatMessage = (channelId: string, content: string, file: File | null = null) => {
  const formData = new FormData();
  formData.append("channel", channelId);
  formData.append("content", content);
  if (file) {
    formData.append("file", file);
  }

  return apiClient("/chat/messages/", {
    method: "POST",
    data: formData,
  });
};

export const createChannel = (name: string, type: string) => {
  return apiClient("/chat/channels/", {
    method: "POST",
    data: { name, channel_type: type },
  });
};

export const addMemberToChannel = (channelId: string, userId: string) => {
  return apiClient(`/chat/channels/${channelId}/add_member/`, {
    method: "POST",
    data: { user_id: userId },
  });
};

export const getKbArticles = (params: any = {}) => {
  return apiClient("/kb/articles/", { params });
};

export const createKbArticle = (data: any) => {
  return apiClient("/kb/articles/", {
    method: "POST",
    data,
  });
};
