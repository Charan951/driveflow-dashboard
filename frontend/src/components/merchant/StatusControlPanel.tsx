import React, { useState } from 'react';
import { Activity, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { PICKUP_FLOW_ORDER, NO_PICKUP_FLOW_ORDER, STATUS_LABELS, BookingStatus, getFlowForService } from '@/lib/statusFlow';

interface StatusControlPanelProps {
  booking: Booking;
  onUpdate: () => void;
}

const DELAY_REASONS = [
  'Waiting for parts',
  'Customer approval pending',
  'Other'
];

const StatusControlPanel: React.FC<StatusControlPanelProps> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayReason, setDelayReason] = useState(DELAY_REASONS[0]);
  const [delayNote, setDelayNote] = useState('');

  const activeStatusFlow = getFlowForService(booking.services || []);
  const currentStatusIndex = activeStatusFlow.indexOf(booking.status as BookingStatus);

  let nextStatus = '';
  if (booking.status === 'REACHED_MERCHANT') nextStatus = 'SERVICE_STARTED';
  else if (booking.status === 'SERVICE_STARTED') nextStatus = ''; // Forced via Bill Upload
  else if (booking.status === 'SERVICE_COMPLETED') nextStatus = 'OUT_FOR_DELIVERY';
  else if (booking.status === 'OUT_FOR_DELIVERY') nextStatus = 'DELIVERED';

  const handleStatusChange = async (status: BookingStatus | string) => {
    // Validation before completing
    if (status === 'SERVICE_COMPLETED') {
        if (!booking.inspection?.completedAt) {
            toast.error('Please complete the Inspection in the "Inspection" tab.');
            return;
        }

        if (!booking.qc?.completedAt) {
            toast.error('Please complete the QC Check in the "QC Check" tab.');
            return;
        }

        if (!booking.billing?.fileUrl) {
            toast.error('Please upload and submit the bill in the "Billing" tab before completing the service.');
            return;
        }
    }

    if (status === 'OUT_FOR_DELIVERY') {
        if (booking.paymentStatus !== 'paid') {
            toast.error('Please wait for the customer to complete the payment before moving to Out For Delivery.');
            return;
        }
    }

    setLoading(true);
    try {
      await bookingService.updateBookingStatus(booking._id, status);
      
      // specific logic for SERVICE_STARTED to set start time
      if (status === 'SERVICE_STARTED' && !booking.serviceExecution?.jobStartTime) {
        await bookingService.updateBookingDetails(booking._id, {
            serviceExecution: {
                jobStartTime: new Date().toISOString()
            }
        });
      }
      
      // Set jobEndTime when moving to SERVICE_COMPLETED
      if (status === 'SERVICE_COMPLETED' && !booking.serviceExecution?.jobEndTime) {
          await bookingService.updateBookingDetails(booking._id, {
              serviceExecution: {
                  jobEndTime: new Date().toISOString()
              }
          });
      }

      toast.success(`Status updated to ${status}`);
      onUpdate();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelaySubmit = async () => {
    setLoading(true);
    try {
        // Update status to On Hold or just log the delay?
        // Requirement says "Merchant can mark order: Waiting for parts... Admin notified instantly."
        // We can use 'On Hold' status or 'Awaiting Parts' status with delay details.
        
        const statusToSet = 'On Hold'; // Or Awaiting Parts?
        
        await bookingService.updateBookingDetails(booking._id, {
            delay: {
                isDelayed: true,
                reason: delayReason,
                note: delayNote,
                startTime: new Date().toISOString()
            }
        });
        
        await bookingService.updateBookingStatus(booking._id, statusToSet);
        
        toast.success('Order marked as delayed');
        setShowDelayModal(false);
        onUpdate();
    } catch (error: unknown) {
        console.error(error);
        toast.error('Failed to mark delay');
    } finally {
        setLoading(false);
    }
  };

  const nextActionLabel = STATUS_LABELS[nextStatus as keyof typeof STATUS_LABELS] || nextStatus;
  const isWaitingForPayment = booking.status === 'SERVICE_COMPLETED' && booking.paymentStatus !== 'paid';

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base md:text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <span className="truncate">Status & Workflow</span>
        </h3>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-bold md:font-medium uppercase tracking-wider ${
              booking.status === 'SERVICE_COMPLETED' || booking.status === 'DELIVERED' || booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
          }`}>
              {booking.status}
          </span>
          {booking.paymentStatus === 'paid' ? (
            <span className="text-[9px] md:text-[10px] text-green-600 font-bold uppercase tracking-widest">● Paid</span>
          ) : (
            <span className="text-[9px] md:text-[10px] text-amber-600 font-bold uppercase tracking-widest">○ {booking.paymentStatus}</span>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="relative">
        {/* Horizontal line for desktop */}
        <div className="hidden md:block absolute left-0 top-[16px] w-full h-0.5 bg-gray-200 -z-10"></div>
        {/* Vertical line for mobile - Starts from middle of first circle to middle of last circle */}
        <div className="md:hidden absolute left-[16px] top-[16px] bottom-[16px] w-0.5 bg-gray-200 -z-10"></div>
        
        <div className="md:overflow-x-auto pb-2 md:pb-4">
          <div
            className="flex flex-col md:grid gap-6 md:gap-3"
            style={{ gridTemplateColumns: `repeat(${activeStatusFlow.length}, minmax(80px,1fr))` }}
          >
            {activeStatusFlow.map((step, idx) => {
              const stepIndex = activeStatusFlow.indexOf(step);
              const isActive = booking.status === step;
              const isCompleted = currentStatusIndex > stepIndex;
              const label = STATUS_LABELS[step as keyof typeof STATUS_LABELS] || step;
              return (
                <div key={step} className="flex flex-row md:flex-col items-center gap-4 md:gap-0">
                  <div
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 bg-white border-2 ${
                      isActive
                        ? 'bg-primary text-white border-primary ring-4 ring-blue-100 scale-110'
                        : isCompleted
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-xs md:text-[10px] md:mt-2 text-left md:text-center leading-tight transition-colors ${
                      isActive ? 'font-bold text-primary' : 'font-medium text-gray-600'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {nextStatus ? (
            <div className="flex-1 space-y-3">
              {isWaitingForPayment && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-xs md:text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Waiting for Customer Payment (₹{booking.totalAmount}). Cannot move to Out For Delivery.</span>
                </div>
              )}
              <button
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={loading || isWaitingForPayment}
                  className={`w-full py-2.5 px-4 rounded-lg transition-all font-bold text-sm shadow-sm active:scale-[0.98] ${
                    isWaitingForPayment 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
              >
                  Move to {nextActionLabel}
              </button>
            </div>
        ) : (
            booking.status === 'SERVICE_STARTED' && (
                <div className="flex-1 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-xs md:text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Go to <strong>Billing</strong> tab to upload bill and complete service.</span>
                </div>
            )
        )}
        
        {booking.status !== 'Completed' && booking.status !== 'Delivered' && booking.status !== 'On Hold' && (
            <button
                onClick={() => setShowDelayModal(true)}
                disabled={loading}
                className="w-full sm:w-auto py-2.5 px-4 border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all text-sm font-bold active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
                <Clock className="w-4 h-4" />
                Mark Delay / Hold
            </button>
        )}

        {booking.status === 'On Hold' && (
            <button
                onClick={() => handleStatusChange(booking.delay?.previousStatus || 'Repair In Progress')} // Fallback needed?
                disabled={loading}
                className="w-full sm:w-auto py-2.5 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-bold shadow-sm active:scale-[0.98]"
            >
                Resume Work
            </button>
        )}
      </div>

      <Dialog open={showDelayModal} onOpenChange={setShowDelayModal}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mark Order as Delayed / On Hold</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Reason for Delay (Mandatory)</label>
                    <select 
                        value={delayReason} 
                        onChange={(e) => setDelayReason(e.target.value)}
                        className="w-full p-2 border border-input rounded-lg"
                    >
                        {DELAY_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Additional Notes</label>
                    <textarea 
                        value={delayNote}
                        onChange={(e) => setDelayNote(e.target.value)}
                        className="w-full p-2 border border-input rounded-lg"
                        placeholder="Explain the situation..."
                    />
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800">Admin will be notified instantly about this delay.</p>
                </div>
            </div>
            <DialogFooter>
                <button 
                    onClick={() => setShowDelayModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleDelaySubmit}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg"
                >
                    Confirm Delay
                </button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatusControlPanel;
