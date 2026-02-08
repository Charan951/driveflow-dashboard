import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { bookingService, Booking } from '@/services/bookingService';

const StaffOrderPage: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
        if (!id) return;
        try {
            const data = await bookingService.getBookingById(id);
            setOrder(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order Details</h1>
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {Array.isArray(order.services) ? order.services.map((s: any) => s.name || s).join(', ') : 'Service'}
        </h2>
        <p className="text-muted-foreground">
            Customer: {typeof order.user === 'object' ? order.user.name : 'Unknown'}
        </p>
        <p className="text-muted-foreground">
            Vehicle: {typeof order.vehicle === 'object' ? `${order.vehicle.make} ${order.vehicle.model}` : 'Unknown'}
        </p>
      </div>
    </div>
  );
};

export default StaffOrderPage;
