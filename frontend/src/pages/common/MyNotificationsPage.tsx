import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { notificationService, UserNotification } from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const MyNotificationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, notificationsLoading } = useAppStore();
  const [initialLoading, setInitialLoading] = useState(false);

  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setInitialLoading(true);
        await fetchNotifications();
      } catch (error) {
        console.error(error);
        toast.error('Failed to load notifications');
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [user, fetchNotifications]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={notificationsLoading}
          >
            Mark all as read
          </Button>
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
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`border ${
                n.read ? 'border-border' : 'border-blue-200 bg-blue-50/40'
              }`}
            >
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyNotificationsPage;
