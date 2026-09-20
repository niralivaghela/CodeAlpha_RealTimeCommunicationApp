import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('realconnect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePresence: (presence, statusMessage) => api.put('/auth/presence', { presence, statusMessage }),
};

export const meetingAPI = {
  createMeeting: (title, options, scheduledFor, durationMinutes) =>
    api.post('/meetings/create', { title, options, scheduledFor, durationMinutes }),
  scheduleMeeting: (data) => api.post('/meetings/schedule', data),
  verifyMeeting: (meetingId) => api.get(`/meetings/verify/${meetingId}`),
  joinMeeting: (meetingId) => api.post(`/meetings/${meetingId}/join`),
  getUserMeetings: () => api.get('/meetings/user-meetings'),
  endMeeting: (meetingId, durationSeconds) => api.post(`/meetings/end/${meetingId}`, { durationSeconds }),
  
  // Collaborative Notes
  getNotes: (meetingId) => api.get(`/meetings/${meetingId}/notes`),
  updateNotes: (meetingId, content) => api.put(`/meetings/${meetingId}/notes`, { content }),

  // Live Polls
  getPolls: (meetingId) => api.get(`/meetings/${meetingId}/polls`),
  createPoll: (meetingId, data) => api.post(`/meetings/${meetingId}/polls`, data),
  votePoll: (meetingId, pollId, optionId) => api.post(`/meetings/${meetingId}/polls/${pollId}/vote`, { optionId }),

  // Q&A
  getQnA: (meetingId) => api.get(`/meetings/${meetingId}/qna`),
  createQuestion: (meetingId, question) => api.post(`/meetings/${meetingId}/qna`, { question }),
  upvoteQuestion: (meetingId, questionId) => api.post(`/meetings/${meetingId}/qna/${questionId}/upvote`),
  answerQuestion: (meetingId, questionId) => api.put(`/meetings/${meetingId}/qna/${questionId}/answer`),

  // Invitations
  invite: (meetingId, email) => api.post(`/meetings/${meetingId}/invite`, { email }),
};

export const contactAPI = {
  getContacts: () => api.get('/contacts'),
  addContact: (data) => api.post('/contacts/add', data),
  removeContact: (contactId) => api.delete(`/contacts/${contactId}`),
};

export const directMessageAPI = {
  getConversations: () => api.get('/messages/direct/conversations'),
  getMessages: (partnerId) => api.get(`/messages/direct/${partnerId}`),
  sendMessage: (recipientId, content) => api.post('/messages/direct', { recipientId, content }),
  deleteMessage: (messageId) => api.delete(`/messages/direct/${messageId}`),
};

export const searchAPI = {
  globalSearch: (q) => api.get(`/search?q=${encodeURIComponent(q)}`),
};

export const systemAPI = {
  getHealth: () => api.get('/system/health'),
  getActivityLogs: () => api.get('/system/activity'),
};

export const fileAPI = {
  uploadFile: (formData) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMeetingFiles: (meetingId) => api.get(`/files/meeting/${meetingId}`),
  getDownloadUrl: (fileId) => `${API_BASE}/api/files/download/${fileId}`,
};

export const messageAPI = {
  getMeetingMessages: (meetingId) => api.get(`/messages/meeting/${meetingId}`),
};

export default api;
