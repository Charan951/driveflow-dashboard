import React, { useEffect, useState } from 'react';
import { getApprovals, updateApprovalStatus, ApprovalRequest, createApproval } from '@/services/approvalService';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Wrench,  
  DollarSign, 
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('Pending');

  // Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [adminComment, setAdminComment] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    filterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvals, filterType, filterStatus]);

  const fetchApprovals = async () => {
    try {
      const data = await getApprovals();
      setApprovals(data);
    } catch (error) {
      toast.error('Failed to load approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let result = approvals;

    // Filter out UserRegistration
    result = result.filter(item => item.type !== 'UserRegistration');

    if (filterStatus !== 'all') {
      result = result.filter(item => item.status === filterStatus);
    }

    if (filterType !== 'all') {
      if (filterType === 'financial') {
        result = result.filter(item => ['BillEdit', 'ExtraCost'].includes(item.type));
      } else if (filterType === 'operational') {
        result = result.filter(item => item.type === 'PartReplacement');
      }
    }

    setFilteredApprovals(result);
  };

  const handleApprove = async (id: string) => {
    try {
      await updateApprovalStatus(id, 'Approved');
      toast.success('Request approved');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleRejectClick = (request: ApprovalRequest) => {
    setSelectedApproval(request);
    setAdminComment('');
    setIsRejectModalOpen(true);
  };

  const submitRejection = async () => {
    if (!selectedApproval) return;
    if (!adminComment.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await updateApprovalStatus(selectedApproval._id, 'Rejected', adminComment);
      toast.success('Request rejected');
      setIsRejectModalOpen(false);
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const simulateRequest = async () => {
    try {
      // Simulate a Bill Edit Request
      // In real app, this comes from Merchant
      // We need a valid User ID to be the 'requestedBy'
      // Since we are admin, we can just use our ID or skip if backend handles it
      // But backend expects requestedBy from req.user
      
      // We also need a valid relatedId. Since we might not have one handy, 
      // this simulation might fail if backend validation is strict.
      // But let's try to send a dummy request that might fail or succeed depending on validation.
      // Actually, let's just create a mock UI item if API fails, for demonstration?
      // No, better to try real API.
      
      await createApproval({
        type: 'ExtraCost',
        relatedId: '65c23b24f9f1b9b1a1a1a1a1', // Dummy ID
        relatedModel: 'Booking',
        data: { amount: 1500, reason: 'Additional engine oil required' }
      });
      toast.success('Simulated request created');
      fetchApprovals();
    } catch (error) {
      // If it fails (e.g. invalid ID), we can't easily simulate without real IDs.
      // Let's just toast.
      toast.error('Simulation failed (Backend validation)');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PartReplacement': return <Wrench className="w-5 h-5 text-orange-500" />;
      case 'BillEdit': return <FileText className="w-5 h-5 text-purple-500" />;
      case 'ExtraCost': return <DollarSign className="w-5 h-5 text-green-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PartReplacement': return 'Part Replacement';
      case 'BillEdit': return 'Bill Modification';
      case 'ExtraCost': return 'Extra Cost Approval';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval Center</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage all pending requests and approvals</p>
        </div>
        <div className="flex gap-2">
           <button
            onClick={simulateRequest}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Simulate Request
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filterType === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setFilterType('financial')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filterType === 'financial' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Financial
          </button>
          <button
            onClick={() => setFilterType('operational')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filterType === 'operational' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Operational
          </button>
        </div>
        
        <div className="md:ml-auto flex items-center gap-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">All Caught Up!</h3>
              <p className="text-gray-500 dark:text-gray-400">No pending approvals found matching your filters.</p>
            </div>
          ) : (
            filteredApprovals.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-6"
              >
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    request.status === 'Pending' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    request.status === 'Approved' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {getTypeIcon(request.type)}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {getTypeLabel(request.type)}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Requested By</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.requestedBy?.name || 'Unknown User'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Related To</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.relatedModel} #{request.relatedId?._id?.slice(-6) || request.relatedId?.toString().slice(-6) || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Data Display */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Request Details</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {Object.entries(request.data || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 last:border-0">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {request.adminComment && (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg mb-4">
                      <span className="font-medium">Admin Comment:</span> {request.adminComment}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center gap-2 min-w-[120px]">
                  {request.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(request._id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectClick(request)}
                        className="w-full px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <div className={`flex flex-col items-center justify-center p-3 rounded-lg ${
                      request.status === 'Approved' 
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {request.status === 'Approved' ? <CheckCircle className="w-6 h-6 mb-1" /> : <XCircle className="w-6 h-6 mb-1" />}
                      <span className="font-medium">{request.status}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl"
            >
              <h2 className="text-xl font-bold mb-4 dark:text-white">Reject Request</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Please provide a reason for rejecting this request.
              </p>
              <textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                className="w-full h-32 px-3 py-2 border rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Reason for rejection..."
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRejection}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminApprovalsPage;