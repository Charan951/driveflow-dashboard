import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import { notificationService, UserNotification } from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getNotificationRedirectUrl, isNotificationClickable } from '@/lib/notificationUtils';

const MyNotificationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, notificationsLoading, clearAllNotifications } = useAppStore();
  const [initialLoading, setInitialLoading] = useState(false);
  const navigate = useNavigate();

  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      
      try {
        setInitialLoading(true);
        await fetchNotifications();
      } catch (error: any) {
        console.error('Failed to load notifications:', error);
        
        // Handle specific error cases
        if (error?.response?.data?.code === 'PENDING_APPROVAL') {
          toast.error('Your account is pending approval. Please wait for admin approval.');
        } else if (error?.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
        } else {
          toast.error('Failed to load notifications');
        }
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [user, fetchNotifications]);

  const handleNotificationClick = async (notification: { id: string; data?: any }) => {
    const redirectUrl = getNotificationRedirectUrl(notification.data, user?.role);
    
    if (redirectUrl) {
      // Mark as read when clicking
      const currentNotification = notifications.find(n => n.id === notification.id);
      if (currentNotification && !currentNotification.read) {
        try {
          await markAsRead(notification.id);
        } catch (error) {
          console.error('Failed to mark as read:', error);
          // Don't prevent navigation if mark as read fails
        }
      }
      
      navigate(redirectUrl);
    } else {
      // If no redirect URL, just mark as read
      const currentNotification = notifications.find(n => n.id === notification.id);
      if (currentNotification && !currentNotification.read) {
        handleMarkAsRead({ id: notification.id });
      }
    }
  };

  const handleMarkAsRead = async (notification: { id: string }) => {
    try {
      await markAsRead(notification.id);
    } catch (error) {
      console.error(error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => markAsRead(n.id)));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error(error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to clear all ${notifications.length} notifications? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      if (!user) {
        toast.error('Please log in to clear notifications');
        return;
      }
      
      await clearAllNotifications();
      toast.success('All notifications cleared');
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;
      const status = error?.response?.status;
      
      // Handle specific error cases
      if (errorCode === 'PENDING_APPROVAL') {
        toast.error('Your account is pending approval. Please contact support.');
      } else if (status === 401) {
        toast.error('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else if (status === 403) {
        toast.error('Access denied. Please check your permissions.');
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Failed to clear notifications. Please try again.');
      }
    }
  };

  const renderTypeBadge = (type: UserNotification['type']) => {
    switch (type) {
      case 'success':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Success</Badge>;
      case 'warning':
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-50 text-red-700 border border-red-200">Alert</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const renderTypeIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const loading = initialLoading || notificationsLoading;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">My Notifications</h1>
            <p className="text-sm text-muted-foreground">
              All alerts sent to you across customer, staff, merchant, and admin portals.
            </p>
          </div>
        </div>

        {hasNotifications && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={notificationsLoading}
            >
              Mark all as read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={notificationsLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {loading && !hasNotifications ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Loading your notifications...</p>
            </div>
          </CardContent>
        </Card>
      ) : !hasNotifications ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">You have no notifications yet</p>
                <p className="text-xs text-muted-foreground">
                  Alerts about bookings, staff status, or system updates will appear here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isClickable = isNotificationClickable(n.data);
            
            return (
              <Card
                key={n.id}
                className={`border ${
                  n.read ? 'border-border' : 'border-blue-200 bg-blue-50/40'
                } ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200' : ''}`}
              >
                {isClickable ? (
                  <button
                    className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                    onClick={() => handleNotificationClick({ id: n.id, data: n.data })}
                  >
                    <CardHeader className="flex flex-row items-start gap-3 pb-3">
                      <div className="mt-1">{renderTypeIcon(n.type)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {n.title}
                            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-60" />
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {renderTypeBadge(n.type)}
                            {!n.read && (
                              <span className="inline-flex w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {n.message}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-0 pb-3 px-6">
                      <span className="text-xs text-muted-foreground">
                        {n.createdAt.toLocaleString()}
                      </span>
                    </CardContent>
                  </button>
                ) : (
                  <div>
                    <CardHeader className="flex flex-row items-start gap-3 pb-3">
                      <div className="mt-1">{renderTypeIcon(n.type)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base font-semibold">
                            {n.title}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {renderTypeBadge(n.type)}
                            {!n.read && (
                              <span className="inline-flex w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {n.message}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-0 pb-3 px-6">
                      <span className="text-xs text-muted-foreground">
                        {n.createdAt.toLocaleString()}
                      </span>
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead({ id: n.id })}
                          disabled={notificationsLoading}
                        >
                          Mark as read
                        </Button>
                      )}
                    </CardContent>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyNotificationsPage;
