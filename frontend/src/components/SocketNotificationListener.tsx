import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

const SocketNotificationListener = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, role: userRole } = useAuthStore();
  const { addNotification } = useAppStore();

  useEffect(() => {
    if (!user) return;

    // Connect to socket if not connected
    socketService.connect();

    socketService.on('connect', () => {
      if (userRole === 'admin') {
        socketService.joinRoom('admin');
      }
      socketService.joinRoom(`user_${user._id}`);
    });

    // Only join immediately if already connected to avoid duplicate join messages
    // but the 'connect' listener above handles the re-connection logic
    const isConnected = socketService.isConnected();
    if (isConnected) {
      if (userRole === 'admin') {
        socketService.joinRoom('admin');
      }
      socketService.joinRoom(`user_${user._id}`);
    }

    const handleNotification = (data: any) => {
      // Add to local store
      addNotification({
        title: data.title,
        message: data.body || data.message,
        type: data.type === 'error' ? 'error' : data.type === 'success' ? 'success' : data.type === 'warning' ? 'warning' : 'info',
      });

      // Show toast if it's not a booking update (which has its own toast)
      if (data.type !== 'order') {
        toast.info(data.title, {
          description: data.body || data.message,
        });
      }
      
      // Refresh notifications query if any
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleBookingUpdate = (data: any) => {
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

    socketService.on('notification', handleNotification);
    socketService.on('bookingUpdated', handleBookingUpdate);
    socketService.on('bookingCreated', handleBookingCreated);
    socketService.on('bookingCancelled', handleBookingCancelled);

    return () => {
      socketService.off('notification', handleNotification);
      socketService.off('bookingUpdated', handleBookingUpdate);
      socketService.off('bookingCreated', handleBookingCreated);
      socketService.off('bookingCancelled', handleBookingCancelled);
    };
  }, [queryClient, user, userRole, navigate, addNotification]);

  return null; // This component doesn't render anything
};

export default SocketNotificationListener;
