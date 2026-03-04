import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, CheckCircle, AlertCircle, Clock, User, Users, Trash2 } from 'lucide-react';
import { notificationService, NotificationHistoryItem, NotificationPayload } from '../../services/notificationService';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdminNotificationsPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotificationHistory();
      setHistory(data);
    } catch (error) {
      toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await notificationService.deleteNotification(id);
      setHistory(prev => prev.filter(n => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notif: NotificationHistoryItem) => {
    const data = notif.data;
    if (!data) return;

    if (data.type === 'order' && data.bookingId) {
      navigate(`/admin/bookings/${data.bookingId}`);
    } else if (data.type === 'support' && data.ticketId) {
      navigate(`/admin/support`); // Assuming it goes to support list or detail if implemented
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notification History</h1>
          <p className="text-gray-600">View and manage system notification alerts</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No notification history found</div>
        ) : (
          history.map((notif) => (
            <motion.div
              key={notif._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => handleNotificationClick(notif)}
              className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 transition-all ${
                notif.data ? 'cursor-pointer hover:shadow-md hover:border-blue-200' : ''
              }`}
            >
              <div className={`p-2 rounded-full ${
                notif.type === 'alert' ? 'bg-red-100 text-red-600' :
                notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                notif.type === 'success' ? 'bg-green-100 text-green-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {notif.type === 'alert' ? <AlertCircle size={20} /> :
                 notif.type === 'warning' ? <AlertCircle size={20} /> :
                 notif.type === 'success' ? <CheckCircle size={20} /> :
                 <Bell size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800">{notif.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={(e) => handleDelete(notif._id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mt-1">{notif.message}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{notif.targetGroup || 'Individual'}</span>
                  </div>
                  {notif.recipient && (
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>{notif.recipient.name || notif.recipient.email || 'Unknown User'}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
