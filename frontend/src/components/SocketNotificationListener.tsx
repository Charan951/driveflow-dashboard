import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

const SocketNotificationListener = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, role: userRole } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Connect to socket if not connected
    socketService.connect();

    socketService.on('connect', () => {
      console.log('Socket connected in listener, joining rooms...');
      if (userRole === 'admin') {
        socketService.joinRoom('admin');
      }
      socketService.joinRoom(`user_${user._id}`);
    });

    // Join rooms immediately if already connected
    if (userRole === 'admin') {
      console.log('Joining admin room as user role is admin');
      socketService.joinRoom('admin');
    }
    console.log(`Joining personal room user_${user._id}`);
    socketService.joinRoom(`user_${user._id}`);

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
            if (userRole === 'admin') {
              navigate(`/admin/bookings/${data._id}`);
            } else if (userRole === 'merchant') {
              navigate(`/merchant/orders/${data._id}`);
            } else if (userRole === 'customer') {
              navigate(`/track/${data._id}`);
            }
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
        action: {
          label: 'View',
          onClick: () => {
            if (userRole === 'admin') {
              navigate(`/admin/bookings/${data._id}`);
            } else if (userRole === 'merchant') {
              navigate(`/merchant/orders/${data._id}`);
            } else if (userRole === 'customer') {
              navigate(`/track/${data._id}`);
            }
          },
        },
      });
    };

    const handleBookingCancelled = (data: any) => {
      console.log('Booking cancelled:', data);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      const orderNum = data.orderNumber || data._id.toString().slice(-6).toUpperCase();
      toast.error(`Booking Cancelled`, {
        description: `Booking #${orderNum} has been cancelled.`,
        action: {
          label: 'View',
          onClick: () => {
            if (userRole === 'admin') {
              navigate(`/admin/bookings/${data._id}`);
            } else if (userRole === 'merchant') {
              navigate(`/merchant/orders/${data._id}`);
            } else if (userRole === 'customer') {
              navigate(`/track/${data._id}`);
            }
          },
        },
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
      // Clean up rooms
      if (userRole === 'admin') {
        socketService.leaveRoom('admin');
      }
      if (user?._id) {
        socketService.leaveRoom(`user_${user._id}`);
      }

      // Clean up listeners
      socketService.off('bookingUpdated');
      socketService.off('bookingCreated');
      socketService.off('bookingCancelled');
      socketService.off('ticketUpdated');
      socketService.off('notification');
    };
  }, [queryClient, user, userRole, navigate]);

  return null; // This component doesn't render anything
};

export default SocketNotificationListener;
