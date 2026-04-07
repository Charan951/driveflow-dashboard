import api from './api';

export interface Vehicle {
    _id: string;
    make: string;
    model: string;
    variant?: string;
    year: number;
    registrationDate?: string;
    licensePlate: string;
    color?: string;
    image?: string;
    vin?: string;
    mileage?: number;
    fuelType?: string;
    frontTyres?: string;
    rearTyres?: string;
    batteryDetails?: string;
    type?: 'Car';
    status?: 'Idle' | 'On Route' | 'In Service';
    lastService?: string;
    nextService?: string;
    user?: string | { _id: string; name: string; email: string; phone?: string }; // User ID or Populated User
    insurance?: {
        policyNumber: string;
        provider: string;
        startDate?: string;
        expiryDate: string;
        status: string;
    };
}

export const vehicleService = {
    getVehicles: async () => {
        const response = await api.get('/vehicles');
        return response.data;
    },
    getAllVehicles: async () => {
        const response = await api.get('/vehicles/all');
        return response.data;
    },
    getVehicleById: async (id: string) => {
        const response = await api.get(`/vehicles/${id}`);
        return response.data;
    },
    getInsuranceData: async () => {
        const response = await api.get('/vehicles/insurance/all');
        return response.data;
    },
    getUserVehicles: async (userId: string) => {
        const response = await api.get(`/vehicles/user/${userId}`);
        return response.data;
    },
    addVehicle: async (data: Partial<Omit<Vehicle, '_id'>>) => {
        const response = await api.post('/vehicles', data);
        return response.data;
    },
    deleteVehicle: async (id: string) => {
        const response = await api.delete(`/vehicles/${id}`);
        return response.data;
    },
    fetchVehicleDetails: async (licensePlate: string) => {
        const response = await api.post('/vehicles/fetch-details', { licensePlate });
        return response.data;
    },
    getVehicleRCDetails: async (vehicleNumber: string) => {
        const response = await api.post('/vehicles/rc-details', { vehicle_number: vehicleNumber });
        return response.data;
    },
};
