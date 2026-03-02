import { useEffect } from 'react';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const SocketNotificationListener = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Connect to socket if not connected
    socketService.connect();

    const handleBookingUpdate = (data: any) => {
      console.log('Booking update received:', data);
      
      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', data._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show notification
      const orderNum = data.orderNumber || data._id.toString().slice(-6).toUpperCase();
      const status = data.status.replace(/_/g, ' ');
      
      toast.info(`Booking Updated`, {
        description: `Booking #${orderNum} status is now ${status}`,
        action: {
          label: 'View',
          onClick: () => {
            // Depending on role, redirect to appropriate page
            // For now just keep it simple
          },
        },
      });
    };

    const handleBookingCreated = (data: any) => {
      console.log('New booking created:', data);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      const orderNum = data.orderNumber || data._id.toString().slice(-6).toUpperCase();
      toast.success(`New Booking`, {
        description: `New booking #${orderNum} has been created!`,
      });
    };

    const handleBookingCancelled = (data: any) => {
      console.log('Booking cancelled:', data);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      const orderNum = data.orderNumber || data._id.toString().slice(-6).toUpperCase();
      toast.error(`Booking Cancelled`, {
        description: `Booking #${orderNum} has been cancelled.`,
      });
    };

    const handleTicketUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', data._id] });
      
      toast.info(`Support Ticket Updated`, {
        description: `A support ticket has been updated.`,
      });
    };

    const handleNotification = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(data.title || 'New Notification', {
        description: data.message || 'You have a new update.',
      });
    };

    // Listen to events
    socketService.on('bookingUpdated', handleBookingUpdate);
    socketService.on('bookingCreated', handleBookingCreated);
    socketService.on('bookingCancelled', handleBookingCancelled);
    socketService.on('ticketUpdated', handleTicketUpdate);
    socketService.on('notification', handleNotification);

    return () => {
      // Clean up listeners
      socketService.off('bookingUpdated');
      socketService.off('bookingCreated');
      socketService.off('bookingCancelled');
      socketService.off('ticketUpdated');
      socketService.off('notification');
    };
  }, [queryClient]);

  return null; // This component doesn't render anything
};

export default SocketNotificationListener;
