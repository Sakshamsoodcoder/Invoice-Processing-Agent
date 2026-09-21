import api from './api';

export const analyticsService = {
  async getSummary() {
    const response = await api.get('/api/analytics/summary');
    return response.data;
  },

  async getVendors() {
    const response = await api.get('/api/analytics/vendors');
    return response.data;
  },

  async getMonthly() {
    const response = await api.get('/api/analytics/monthly');
    return response.data;
  },
};
