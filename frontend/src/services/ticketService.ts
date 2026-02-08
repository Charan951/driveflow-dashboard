import api from './api';

export const ticketService = {
  getAllTickets: async () => {
    const response = await api.get('/tickets');
    return response.data;
  },

  getTicketById: async (id: string) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTicket: async (data: any) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  updateTicketStatus: async (id: string, status: string) => {
    const response = await api.put(`/tickets/${id}`, { status });
    return response.data;
  },

  assignTicket: async (id: string, userId: string) => {
    const response = await api.put(`/tickets/${id}`, { assignedTo: userId });
    return response.data;
  },

  addMessage: async (id: string, message: string) => {
    const response = await api.post(`/tickets/${id}/messages`, { message });
    return response.data;
  },
};
