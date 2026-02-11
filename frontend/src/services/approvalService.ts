import api from './api';

export interface ApprovalRequest {
  _id: string;
  type: 'UserRegistration' | 'PartReplacement' | 'ExtraCost' | 'BillEdit';
  status: 'Pending' | 'Approved' | 'Rejected';
  relatedId: string | Record<string, unknown>; // Populated object
  relatedModel: 'User' | 'Booking';
  data?: any;
  requestedBy: { _id: string; name: string; email: string; role: string };
  adminComment?: string;
  createdAt: string;
}

export const getApprovals = async () => {
  const response = await api.get('/approvals');
  return response.data;
};

export const getMyApprovals = async () => {
  const response = await api.get('/approvals/my-approvals');
  return response.data;
};

export const updateApprovalStatus = async (id: string, status: 'Approved' | 'Rejected', adminComment?: string) => {
  const response = await api.put(`/approvals/${id}`, { status, adminComment });
  return response.data;
};

export const createApproval = async (data: Partial<ApprovalRequest>) => {
  const response = await api.post('/approvals', data);
  return response.data;
};