import api from './api';

export const musicService = {
  getSongs: async (params = {}) => {
    const response = await api.get('/songs', { params });
    return response.data;
  },

  getSongById: async (id) => {
    const response = await api.get(`/songs/${id}`);
    return response.data;
  },

  uploadSong: async (formData) => {
    const response = await api.post('/songs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  streamSong: (id) => {
    const token = localStorage.getItem('token');
    return `${api.defaults.baseURL}/songs/${id}/stream${token ? `?token=${token}` : ''}`;
  },

  recordListening: async (songId, duration) => {
    const response = await api.post('/songs/record-listening', {
      songId,
      duration,
    });
    return response.data;
  },

  getPlaylists: async () => {
    const response = await api.get('/playlists');
    return response.data;
  },

  getPlaylistById: async (id) => {
    const response = await api.get(`/playlists/${id}`);
    return response.data;
  },

  createPlaylist: async (name, description, isPublic) => {
    const response = await api.post('/playlists', {
      name,
      description,
      isPublic,
    });
    return response.data;
  },

  addSongToPlaylist: async (playlistId, songId) => {
    const response = await api.post('/playlists/add-song', {
      playlistId,
      songId,
    });
    return response.data;
  },

  generateAIPlaylist: async (prompt, name) => {
    const response = await api.post('/playlists/generate-ai', {
      prompt,
      name,
    });
    return response.data;
  },

  deletePlaylist: async (id) => {
    const response = await api.delete(`/playlists/${id}`);
    return response.data;
  },

  getPlaybackState: async () => {
    const response = await api.get('/playback/state');
    return response.data;
  },

  updatePlaybackState: async (state) => {
    const response = await api.post('/playback/state', state);
    return response.data;
  },

  getRooms: async () => {
    const response = await api.get('/rooms');
    return response.data;
  },

  getRoomById: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  createRoom: async (name, isPublic, maxListeners) => {
    const response = await api.post('/rooms', {
      name,
      isPublic,
      maxListeners,
    });
    return response.data;
  },

  joinRoom: async (id) => {
    const response = await api.post(`/rooms/${id}/join`);
    return response.data;
  },

  leaveRoom: async (id) => {
    const response = await api.post(`/rooms/${id}/leave`);
    return response.data;
  },

  deleteRoom: async (id) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },
};
