import api from './api';

export const invoiceService = {
  async processInvoice(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/invoices/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  async getInvoices(params = {}) {
    const response = await api.get('/api/invoices', { params });
    return response.data;
  },

  async getInvoiceById(id) {
    const response = await api.get(`/api/invoices/${id}`);
    return response.data;
  },

  async deleteInvoice(id) {
    const response = await api.delete(`/api/invoices/${id}`);
    return response.data;
  },

  async getInvoiceReport(id) {
    const response = await api.get(`/api/invoices/${id}/report`);
    return response.data;
  },

  async getSystemHealth() {
    const response = await api.get('/health');
    return response.data;
  }
};
