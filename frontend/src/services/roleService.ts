import api from './api';

export interface RoleData {
  name: string;
  permissions: string[];
  description?: string;
}

export const roleService = {
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },
  createRole: async (roleData: RoleData) => {
    const response = await api.post('/roles', roleData);
    return response.data;
  },
  updateRole: async (id: string, roleData: Partial<RoleData>) => {
    const response = await api.put(`/roles/${id}`, roleData);
    return response.data;
  },
  deleteRole: async (id: string) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  },
};
