import api from './api';

export const authService = {
  register: async (username, email, password, displayName) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      displayName,
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};
