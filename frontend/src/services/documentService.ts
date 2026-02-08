import api from './api';

export interface DocumentData {
  _id: string;
  name: string;
  type: string;
  url: string;
  owner: string;
  entityName: string;
  entityType: string;
  entityId: string;
  vehicleId?: string;
  date: string;
  expiryDate?: string;
  isInvoice?: boolean;
}

export const documentService = {
  getAllDocuments: async (): Promise<DocumentData[]> => {
    const response = await api.get('/documents');
    return response.data;
  },
};
