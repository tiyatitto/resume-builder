/**
 * API Utility for Resume Builder
 * Handles token management, common headers, and error processing
 */
const API_URL = '/api';

const api = {
  // Helper to get token
  getToken: () => localStorage.getItem('token'),
  
  // Helper to set token
  setToken: (token) => localStorage.setItem('token', token),
  
  // Helper to clear token
  clearToken: () => localStorage.removeItem('token'),

  // Base fetch wrapper
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/login.html';
        }
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Auth APIs
  auth: {
    register: (data) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    getProfile: () => api.request('/auth/profile', { method: 'GET' })
  },

  // Resume APIs
  resume: {
    create: (data) => api.request('/resume', { method: 'POST', body: JSON.stringify(data) }),
    getAll: () => api.request('/resume', { method: 'GET' }),
    getById: (id) => api.request(`/resume/${id}`, { method: 'GET' }),
    update: (id, data) => api.request(`/resume/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => api.request(`/resume/${id}`, { method: 'DELETE' }),
    uploadCertificate: (resumeId, certificationId, data) => api.request(
      `/resume/${resumeId}/certificates/${certificationId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),
    deleteCertificate: (resumeId, certificationId) => api.request(
      `/resume/${resumeId}/certificates/${certificationId}`,
      { method: 'DELETE' }
    )
  }
};

window.api = api;
