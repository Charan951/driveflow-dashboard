import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Search, User, Calendar, BadgeCheck, Copy } from 'lucide-react';
import { auditService, AuditLog } from '../../services/auditService';
import { toast } from 'sonner';
import { isValidDate } from '../../lib/formValidation';

const ACTION_LABELS: Record<string, string> = {
  CREATE_CASHFREE_ORDER: 'Payment order created',
  VERIFY_CASHFREE_PAYMENT: 'Payment verified',
  CREATE_PAYMENT_ORDER: 'Payment order created',
  PAYMENT_VERIFIED: 'Payment verified',
  WEBHOOK_PROCESSED: 'Payment webhook received',
  PAYMENT_REFUNDED: 'Payment refunded',
};

const formatAuditAction = (action: string): string => {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getActionColorClass = (action: string): string => {
  const key = action.toLowerCase();
  if (key.includes('delete') || key.includes('refund')) return 'text-red-600';
  if (key.includes('create')) return 'text-green-600';
  if (key.includes('verify') || key.includes('verified')) return 'text-blue-600';
  if (key.includes('webhook')) return 'text-amber-700';
  if (key.includes('update')) return 'text-blue-600';
  return 'text-gray-800';
};

const AUDIT_DETAIL_KEYS = ['amount', 'bookingId'] as const;

const DETAIL_LABELS: Record<(typeof AUDIT_DETAIL_KEYS)[number], string> = {
  amount: 'Amount',
  bookingId: 'Booking ID',
};

const isPaidStatus = (details?: Record<string, unknown>): boolean =>
  String(details?.status ?? '').toLowerCase() === 'paid';

const formatAuditDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const hours24 = d.getHours();
  const ampm = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;
  const hours = String(hours12).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
};

const formatInr = (value: unknown): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
};

const CopyButton = ({ text, label }: { text: string; label: string }) => (
  <button
    type="button"
    onClick={() => copyToClipboard(text, label)}
    className="shrink-0 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300"
    aria-label={`Copy ${label}`}
    title={`Copy ${label}`}
  >
    <Copy size={18} />
  </button>
);

const formatDetailValue = (key: (typeof AUDIT_DETAIL_KEYS)[number], value: unknown): string => {
  if (value == null || value === '') return '—';
  if (key === 'amount') return formatInr(value);
  if (key === 'bookingId' && typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

const formatAuditDetails = (details: Record<string, unknown> | undefined) => {
  if (!details || typeof details !== 'object') {
    return <span className="text-gray-400">—</span>;
  }

  const entries = AUDIT_DETAIL_KEYS.map((key) => ({
    key,
    label: DETAIL_LABELS[key],
    value: formatDetailValue(key, details[key]),
  }));

  if (entries.every((e) => e.value === '—')) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <dl className="space-y-1 text-xs min-w-[200px]">
      {entries.map(({ key, label, value }) => (
        <div key={key} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt className="text-gray-500 whitespace-nowrap">{label}</dt>
          <dd className="text-gray-800 break-all font-medium">
            {key === 'bookingId' && value !== '—' ? (
              <span className="inline-flex items-start gap-1 max-w-full">
                <span className="break-all">{value}</span>
                <CopyButton text={value} label="Booking ID" />
              </span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const AdminAuditPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Remove empty filters
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const data = await auditService.getAuditLogs(activeFilters);
      setLogs(data);
    } catch (error: any) {
      // Handle specific error messages from backend
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validate Action Type
    if (name === 'action') {
      if (value.length > 50) {
        toast.error('Too long data: Please enter a maximum of 50 characters');
        return;
      }
      // Allow letters, numbers, underscores, spaces, hyphens, periods, @ for email
      const allowedRegex = /^[a-zA-Z0-9\s_@.\-]*$/;
      if (!allowedRegex.test(value)) {
        toast.error('Please enter valid data');
        return;
      }
    }

    // Validate User
    if (name === 'user') {
      if (value.length > 100) {
        toast.error('Too long data: Please enter a maximum of 100 characters');
        return;
      }
      // Allow letters, numbers, spaces, periods, @, hyphens, underscores
      const allowedRegex = /^[a-zA-Z0-9\s_@.\-]*$/;
      if (!allowedRegex.test(value)) {
        toast.error('Please enter valid data');
        return;
      }
    }

    // Validate date fields
    if (name === 'startDate' || name === 'endDate') {
      // Check for too long data first
      if (value.length > 10) {
        toast.error('Too long data: Please enter a valid date in YYYY-MM-DD format');
        return;
      }
      if (value && !isValidDate(value)) {
        toast.error('Please enter a valid date');
        return;
      }
    }

    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate action type field
    if (filters.action) {
      if (filters.action.length > 50) {
        toast.error('Too long data: Please enter a maximum of 50 characters');
        return;
      }
      const allowedRegex = /^[a-zA-Z0-9\s_@.\-]*$/;
      if (!allowedRegex.test(filters.action)) {
        toast.error('Please enter valid data');
        return;
      }
    }

    // Validate user field
    if (filters.user) {
      if (filters.user.length > 100) {
        toast.error('Too long data: Please enter a maximum of 100 characters');
        return;
      }
      const allowedRegex = /^[a-zA-Z0-9\s_@.\-]*$/;
      if (!allowedRegex.test(filters.user)) {
        toast.error('Please enter valid data');
        return;
      }
    }

    // Check if any date fields are invalid
    if (filters.startDate) {
      if (filters.startDate.length > 10) {
        toast.error('Too long data: Please enter a valid date in YYYY-MM-DD format');
        return;
      }
      if (!isValidDate(filters.startDate)) {
        toast.error('Invalid start date');
        return;
      }
    }
    if (filters.endDate) {
      if (filters.endDate.length > 10) {
        toast.error('Too long data: Please enter a valid date in YYYY-MM-DD format');
        return;
      }
      if (!isValidDate(filters.endDate)) {
        toast.error('Invalid end date');
        return;
      }
    }

    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      action: '',
      user: '',
      startDate: '',
      endDate: '',
    });
    fetchLogs();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
          <p className="text-gray-600">Track system activities and user actions</p>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6"
      >
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <div className="relative">
              <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                placeholder="e.g. Create, Update, Payment verified"
                maxLength={50}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                name="user"
                value={filters.user}
                onChange={handleFilterChange}
                placeholder="e.g. John, john@example.com"
                maxLength={100}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                maxLength={10}
                min="1900-01-01"
                max="2100-12-31"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                maxLength={10}
                min="1900-01-01"
                max="2100-12-31"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Search size={18} />
                Filter Logs
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                Clear Filters
              </button>
        </form>
      </motion.div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Date & Time</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No audit logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const cashfreeOrderId =
                    log.details?.orderId != null && String(log.details.orderId).trim() !== ''
                      ? String(log.details.orderId)
                      : null;
                  const paid = isPaidStatus(log.details);

                  return (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatAuditDateTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        {log.user?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${getActionColorClass(log.action)}`}>
                            {formatAuditAction(log.action)}
                          </span>
                          {paid && (
                            <BadgeCheck
                              size={18}
                              className="text-green-600 shrink-0"
                              aria-label="Payment verified"
                            />
                          )}
                        </div>
                        {cashfreeOrderId && (
                          <span className="inline-flex items-start gap-1 max-w-full">
                            <span className="text-xs text-gray-500 font-mono break-all leading-snug">
                              {cashfreeOrderId}
                            </span>
                            <CopyButton text={cashfreeOrderId} label="Order ID" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 align-top">
                      {formatAuditDetails(log.details)}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditPage;
