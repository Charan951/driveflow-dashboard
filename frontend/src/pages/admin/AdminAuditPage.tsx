import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Search, User, BadgeCheck, Copy } from 'lucide-react';
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
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial load only!

  const fetchLogs = async (currentFilters = filters) => { // Accept currentFilters as parameter!
    setLoading(true);
    try {
      // Remove empty filters
      const activeFilters = Object.fromEntries(
        Object.entries(currentFilters).filter(([_, v]) => v !== '')
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
      const allowedRegex = /^[a-zA-Z0-9\s_@.-]*$/;
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
      const allowedRegex = /^[a-zA-Z0-9\s_@.-]*$/;
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
      const allowedRegex = /^[a-zA-Z0-9\s_@.-]*$/;
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
      const allowedRegex = /^[a-zA-Z0-9\s_@.-]*$/;
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
    // Check that end date is not before start date
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      if (end < start) {
        toast.error('End date cannot be before start date');
        return;
      }
    }

    fetchLogs(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = { // Create the new filters first!
      action: '',
      user: '',
      startDate: '',
      endDate: '',
    };
    setFilters(clearedFilters); // Update state
    setResetKey(prev => prev + 1);
    fetchLogs(clearedFilters); // Pass clearedFilters directly to fetchLogs!
  };

  return (
    <div className="p-4 sm:p-6 min-w-0 max-w-full overflow-x-hidden pb-24 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Audit Logs</h1>
        <p className="text-sm sm:text-base text-gray-600">Track system activities and user actions</p>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 mb-6 min-w-0 overflow-hidden"
      >
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end min-w-0">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <div className="relative min-w-0">
              <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <input
                type="text"
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                placeholder="Create, Update, Delete"
                maxLength={50}
                className="w-full min-w-0 box-border pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <div className="relative min-w-0">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <input
                type="text"
                name="user"
                value={filters.user}
                onChange={handleFilterChange}
                placeholder="Name or email"
                maxLength={100}
                className="w-full min-w-0 box-border pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              key={`start-${resetKey}`}
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              onBlur={(e) => {
                const val = e.target.value;
                if (val && !isValidDate(val)) {
                  toast.error('Please enter a valid start date');
                }
              }}
              maxLength={10}
              min="1900-01-01"
              max="2100-12-31"
              className="w-full min-w-0 box-border px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:light]"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              key={`end-${resetKey}`}
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              onBlur={(e) => {
                const val = e.target.value;
                if (val && !isValidDate(val)) {
                  toast.error('Please enter a valid end date');
                }
              }}
              maxLength={10}
              min="1900-01-01"
              max="2100-12-31"
              className="w-full min-w-0 box-border px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:light]"
            />
          </div>

          <div className="sm:col-span-2 xl:col-span-4 flex flex-col sm:flex-row gap-3 min-w-0">
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Search size={18} />
              Filter Logs
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </form>
      </motion.div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-w-0 max-w-full">
        {loading ? (
          <div className="px-6 py-10 text-center text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No audit logs found matching criteria.</div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-100 min-w-0">
              {logs.map((log) => {
                const cashfreeOrderId =
                  log.details?.orderId != null && String(log.details.orderId).trim() !== ''
                    ? String(log.details.orderId)
                    : null;
                const paid = isPaidStatus(log.details);

                return (
                  <div key={log._id} className="p-4 space-y-3 min-w-0">
                    <p className="text-xs text-gray-500">{formatAuditDateTime(log.createdAt)}</p>
                    <div className="flex items-start gap-2 min-w-0">
                      <User size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-gray-800 break-words min-w-0">
                        {log.user?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-medium ${getActionColorClass(log.action)}`}>
                          {formatAuditAction(log.action)}
                        </span>
                        {paid && (
                          <BadgeCheck size={16} className="text-green-600 shrink-0" aria-label="Payment verified" />
                        )}
                      </div>
                      {cashfreeOrderId && (
                        <span className="inline-flex items-start gap-1 max-w-full">
                          <span className="text-xs text-gray-500 font-mono break-all leading-snug">{cashfreeOrderId}</span>
                          <CopyButton text={cashfreeOrderId} label="Order ID" />
                        </span>
                      )}
                    </div>
                    <div className="pt-1 border-t border-gray-100">
                      {formatAuditDetails(log.details)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto max-w-full">
          <table className="w-full text-left min-w-[720px]">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-4 lg:px-6 py-3 font-medium text-left whitespace-nowrap">Date & Time</th>
                <th className="px-4 lg:px-6 py-3 font-medium text-left">User</th>
                <th className="px-4 lg:px-6 py-3 font-medium text-left">Action</th>
                <th className="px-4 lg:px-6 py-3 font-medium text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const cashfreeOrderId =
                    log.details?.orderId != null && String(log.details.orderId).trim() !== ''
                      ? String(log.details.orderId)
                      : null;
                  const paid = isPaidStatus(log.details);

                  return (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatAuditDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-800 font-medium max-w-[180px]">
                      <div className="flex items-start gap-2 min-w-0">
                        <User size={14} className="text-gray-400 shrink-0 mt-0.5" />
                        <span className="break-words min-w-0">{log.user?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm align-top">
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
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 align-top">
                      {formatAuditDetails(log.details)}
                    </td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAuditPage;
