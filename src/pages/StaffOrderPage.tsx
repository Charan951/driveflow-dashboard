import React from 'react';
import { useParams } from 'react-router-dom';
import { staffOrders } from '@/services/dummyData';

const StaffOrderPage: React.FC = () => {
  const { id } = useParams();
  const order = staffOrders.find(o => o.id === id) || staffOrders[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order Details</h1>
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4">{order.service}</h2>
        <p className="text-muted-foreground">Customer: {order.customer}</p>
        <p className="text-muted-foreground">Vehicle: {order.vehicle.make} {order.vehicle.model}</p>
      </div>
    </div>
  );
};

export default StaffOrderPage;
