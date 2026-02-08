import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, CheckCircle, AlertCircle, Clock, User, Users } from 'lucide-react';
import { notificationService, NotificationHistoryItem, NotificationPayload } from '../../services/notificationService';
import { toast } from 'react-hot-toast';

const AdminNotificationsPage = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [targetGroup, setTargetGroup] = useState('All');
  const [recipientId, setRecipientId] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      const payload: NotificationPayload = {
        title,
        message,
        type,
      };

      if (targetGroup === 'Specific User') {
        if (!recipientId) {
          toast.error('Recipient ID is required for specific user');
          return;
        }
        payload.recipientId = recipientId;
      } else {
        payload.targetGroup = targetGroup;
      }

      await notificationService.sendNotification(payload);
      toast.success('Notification sent successfully');
      
      // Reset form
      setTitle('');
      setMessage('');
      setType('info');
      setTargetGroup('All');
      setRecipientId('');
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send notification';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications Manager</h1>
          <p className="text-gray-600">Send alerts and manage system notifications</p>
        </div>
        <div className="flex bg-white rounded-lg shadow p-1">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'send'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send size={16} />
              Send New
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} />
              History
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'send' ? (
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <form onSubmit={handleSend} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                <div className="grid grid-cols-3 gap-3">
                  {['All', 'Customer', 'Merchant', 'Staff', 'Specific User'].map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setTargetGroup(group)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                        targetGroup === group
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              {targetGroup === 'Specific User' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    type="text"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="Enter user ID..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Information</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="alert">Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., System Maintenance Update"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Write your message here..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Send Notification
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
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
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4"
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
                    <span className="text-xs text-gray-500">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
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
      )}
    </div>
  );
};

export default AdminNotificationsPage;
