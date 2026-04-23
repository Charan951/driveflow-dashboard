import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Shield, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { vehicleService, Vehicle } from '../../services/vehicleService';
import { toast } from 'react-hot-toast';

const AdminInsurancePage = () => {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Insurance</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-600">
        <p className="mb-2 font-medium">Insurance features have been removed from this version of the portal.</p>
        <p className="text-sm text-gray-500">
          Please manage essentials and other services using the Services and Essentials modules instead.
        </p>
      </div>
    </div>
  );
};

export default AdminInsurancePage;
