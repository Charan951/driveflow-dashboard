import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

import { updateApprovalStatus } from '@/services/approvalService';

const SocketNotificationListener = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, role: userRole, updateUser } = useAuthStore();
  const { addNotification } = useAppStore();

  useEffect(() => {
    if (!user) return;

    // Connect to socket if not connected
    socketService.connect();

    socketService.on('connect', () => {
      if (userRole) {
        socketService.joinRoom(userRole.toLowerCase());
      }
      socketService.joinRoom(`user_${user._id}`);
    });

    // Also join immediately if already connected to avoid duplicate join messages
    // but the 'connect' listener above handles the re-connection logic
    const isConnected = socketService.isConnected();
    if (isConnected) {
      if (userRole) {
        socketService.joinRoom(userRole.toLowerCase());
      }
      socketService.joinRoom(`user_${user._id}`);
    }

    const handleNotification = (data: any) => {
      if (!data) return;
      // Add to local store
      addNotification({
        title: data.title || 'New Notification',
        message: data.body || data.message || '',
        type: data.type === 'error' ? 'error' : data.type === 'success' ? 'success' : data.type === 'warning' ? 'warning' : 'info',
      });

      // Show toast if it's not a booking update (which has its own toast)
      if (data.type !== 'order') {
        toast.info(data.title || 'New Notification', {
          description: data.body || data.message || '',
        });
      }
      
      // Refresh notifications query if any
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleBookingUpdate = (data: any) => {
      if (!data || !data._id) return;
      // Refresh relevant queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', data._id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show notification
      const orderNum = data.orderNumber || data._id.toString().slice(-6).toUpperCase();
      const status = (data.status || 'updated').replace(/_/g, ' ');
      
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
      if (!data || !data._id) return;
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
      if (!data || !data._id) return;
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

    const handleRoleUpdated = (data: any) => {
      if (data && data.role) {
        updateUser({ role: data.role, subRole: data.subRole, status: data.status });
        toast.success(`Role Updated`, {
          description: `Your account role has been updated to ${data.role}.`,
        });
        
        // Optionally redirect based on the new role
        if (data.role === 'merchant') {
          navigate('/merchant/dashboard');
        } else if (data.role === 'staff') {
          navigate('/staff/dashboard');
        } else if (data.role === 'customer') {
          navigate('/dashboard');
        }
      }
    };

    const handleNewApproval = (data: any) => {
      if (!data || !data.relatedId) return;
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['booking', data.relatedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      const approvalId = data._id;
      const title = data.type === 'PartReplacement' 
        ? 'New Part Approval' 
        : data.type === 'ExtraCost'
          ? 'Extra Cost Approval'
          : 'New Approval Request';
      
      const message = data.type === 'PartReplacement'
        ? `A new part replacement (${data.data?.name}) requires your approval.`
        : data.type === 'ExtraCost'
          ? `An extra cost of ₹${data.data?.amount} requires your approval.`
          : 'A new request requires your approval.';

      if (userRole === 'customer') {
        toast(title, {
          description: message,
          duration: 10000, // Show longer
          action: {
            label: 'Approve',
            onClick: async () => {
              try {
                await updateApprovalStatus(approvalId, 'Approved');
                toast.success('Request approved successfully');
                queryClient.invalidateQueries({ queryKey: ['booking', data.relatedId] });
              } catch (err) {
                toast.error('Failed to approve request');
              }
            }
          },
          cancel: {
            label: 'Reject',
            onClick: async () => {
              try {
                await updateApprovalStatus(approvalId, 'Rejected');
                toast.success('Request rejected successfully');
                queryClient.invalidateQueries({ queryKey: ['booking', data.relatedId] });
              } catch (err) {
                toast.error('Failed to reject request');
              }
            }
          }
        });
      } else {
        toast.info(title, {
          description: message,
          action: {
            label: 'View',
            onClick: () => {
              if (userRole === 'admin') {
                navigate(`/admin/approvals`);
              }
            },
          },
        });
      }
    };

    const handleUserUpdated = (data: any) => {
      if (!data || !data.userId) return;
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', data.userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // If the current user was updated, we might want to refresh their local profile too
      if (user?._id === data.userId) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    };

    const handleVehicleCreated = (data: any) => {
      if (!data) return;
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['tracking'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      if (userRole === 'admin') {
        toast.info('New Vehicle Added', {
          description: `Vehicle ${data.licensePlate || ''} has been registered.`
        });
      }
    };

    const handleVehicleDeleted = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['tracking'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleLiveLocation = (data: any) => {
      if (!data) return;
      // For real-time map updates, we update the tracking query cache directly
      // but only if we are an admin or merchant who might be watching the map
      if (userRole === 'admin' || userRole === 'merchant') {
        queryClient.setQueryData(['tracking'], (prev: any) => {
          if (!prev) return prev;
          
          const timestamp = data.timestamp || data.updatedAt;

          // Logic similar to AdminTrackingPage but simplified for global sync
          const newStaff = (prev.staff || []).map((s: any) => {
            if (s._id === data.userId) {
              return { 
                ...s, 
                isOnline: true,
                location: { ...s.location, lat: data.lat, lng: data.lng, updatedAt: timestamp } 
              };
            }
            return s;
          });

          const newVehicles = (prev.vehicles || []).map((v: any) => {
            if (v._id === data.vehicleId || (v.user?._id === data.userId)) {
              return { 
                ...v, 
                location: { ...v.location, lat: data.lat, lng: data.lng, updatedAt: timestamp } 
              };
            }
            return v;
          });

          return { ...prev, staff: newStaff, vehicles: newVehicles, timestamp: new Date().toISOString() };
        });
      }
    };

    const handleGlobalSync = (data: any) => {
      if (!data) return;
      const entityRaw = (data as any).entity;
      const actionRaw = (data as any).action;
      const entity = typeof entityRaw === 'string' ? entityRaw.toLowerCase() : '';
      const action = typeof actionRaw === 'string' ? actionRaw.toLowerCase() : '';

      if (!entity || !action) return;

      // Map entities to query keys
      const entityQueryMap: Record<string, string[]> = {
        'booking': ['bookings', 'booking', 'dashboard'],
        'ticket': ['tickets', 'ticket', 'dashboard'],
        'vehicle': ['vehicles', 'tracking', 'dashboard'],
        'user': ['users', 'user', 'dashboard', 'profile'],
        'approval': ['approvals', 'dashboard'],
        'payment': ['payments', 'dashboard'],
        'product': ['products', 'dashboard'],
        'service': ['services', 'dashboard'],
        'setting': ['settings', 'public-settings', 'dashboard'],
        'role': ['roles', 'dashboard'],
        'hero': ['hero', 'dashboard'],
        'notification': ['notifications', 'dashboard']
      };

      const keysToInvalidate = entityQueryMap[entity] || ['dashboard'];
      
      keysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      // Special handling for some actions
      if (action === 'deleted_all' && entity === 'notification') {
        queryClient.setQueryData(['notifications'], []);
      }
    };

    socketService.on('notification', handleNotification);
    socketService.on('bookingUpdated', handleBookingUpdate);
    socketService.on('bookingCreated', handleBookingCreated);
    socketService.on('bookingCancelled', handleBookingCancelled);
    socketService.on('user_role_updated', handleRoleUpdated);
    socketService.on('newApproval', handleNewApproval);
    socketService.on('userUpdated', handleUserUpdated);
    socketService.on('vehicleCreated', handleVehicleCreated);
    socketService.on('vehicleDeleted', handleVehicleDeleted);
    socketService.on('liveLocation', handleLiveLocation);
    socketService.on('global:sync', handleGlobalSync);

    return () => {
      socketService.off('connect');
      socketService.off('notification', handleNotification);
      socketService.off('bookingUpdated', handleBookingUpdate);
      socketService.off('bookingCreated', handleBookingCreated);
      socketService.off('bookingCancelled', handleBookingCancelled);
      socketService.off('user_role_updated', handleRoleUpdated);
      socketService.off('newApproval', handleNewApproval);
      socketService.off('userUpdated', handleUserUpdated);
      socketService.off('vehicleCreated', handleVehicleCreated);
      socketService.off('vehicleDeleted', handleVehicleDeleted);
      socketService.off('liveLocation', handleLiveLocation);
      socketService.off('global:sync', handleGlobalSync);
    };
  }, [queryClient, user, userRole, navigate, addNotification, updateUser]);

  return null; // This component doesn't render anything
};

export default SocketNotificationListener;
