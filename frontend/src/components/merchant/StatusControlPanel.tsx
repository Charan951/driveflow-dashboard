import React, { useState } from 'react';
import { Activity, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { PICKUP_FLOW_ORDER, NO_PICKUP_FLOW_ORDER, STATUS_LABELS, BookingStatus } from '@/lib/statusFlow';

interface StatusControlPanelProps {
  booking: Booking;
  onUpdate: () => void;
}

const DELAY_REASONS = [
  'Waiting for parts',
  'Technician unavailable',
  'Customer approval pending',
  'Other'
];

const StatusControlPanel: React.FC<StatusControlPanelProps> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayReason, setDelayReason] = useState(DELAY_REASONS[0]);
  const [delayNote, setDelayNote] = useState('');

  const pickupStatusFlow = PICKUP_FLOW_ORDER;
  const noPickupStatusFlow: BookingStatus[] = NO_PICKUP_FLOW_ORDER;

  const activeStatusFlow: BookingStatus[] = booking.pickupRequired ? pickupStatusFlow : noPickupStatusFlow;
  const currentStatusIndex = activeStatusFlow.indexOf(booking.status as BookingStatus);

  let nextStatus = '';
  if (booking.pickupRequired) {
    if (booking.status === 'REACHED_MERCHANT') nextStatus = 'VEHICLE_AT_MERCHANT';
    else if (booking.status === 'VEHICLE_AT_MERCHANT') nextStatus = 'SERVICE_STARTED';
    else if (booking.status === 'SERVICE_STARTED') nextStatus = ''; // Forced via Bill Upload
    else if (booking.status === 'SERVICE_COMPLETED') nextStatus = 'OUT_FOR_DELIVERY';
    else if (booking.status === 'OUT_FOR_DELIVERY') nextStatus = 'DELIVERED';
  } else {
    if (booking.status === 'ACCEPTED') nextStatus = 'VEHICLE_AT_MERCHANT';
    else if (booking.status === 'VEHICLE_AT_MERCHANT') nextStatus = 'SERVICE_STARTED';
    else if (booking.status === 'SERVICE_STARTED') nextStatus = ''; // Forced via Bill Upload
    else if (booking.status === 'SERVICE_COMPLETED') nextStatus = 'DELIVERED';
  }

  const handleStatusChange = async (status: BookingStatus | string) => {
    // Validation before completing
    if (status === 'SERVICE_COMPLETED') {
        if (!booking.billing?.fileUrl) {
            toast.error('Please upload and submit the bill in the "Billing" tab before completing the service.');
            return;
        }
        
        if (!booking.qc?.completedAt) {
            // Optional: warn but allow, or block. User didn't specify QC check strictness.
            // Keeping it permissive for now or just warning.
            // toast.warning('QC Checklist not completed.'); 
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

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Status & Workflow
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            booking.status === 'SERVICE_COMPLETED' || booking.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
            booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
        }`}>
            {booking.status}
        </span>
      </div>

      {/* Workflow Progress */}
      <div className="relative">
        <div className="absolute left-0 top-[22px] w-full h-0.5 bg-gray-200 -z-10"></div>
        <div className="overflow-x-auto pb-4">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${activeStatusFlow.length}, minmax(80px,1fr))` }}
          >
            {activeStatusFlow.map((step, idx) => {
              const stepIndex = activeStatusFlow.indexOf(step);
              const isActive = booking.status === step;
              const isCompleted = currentStatusIndex > stepIndex;
              const label = STATUS_LABELS[step as keyof typeof STATUS_LABELS] || step;
              return (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-primary text-white ring-4 ring-blue-100'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-2 text-center leading-tight ${
                      isActive ? 'font-semibold text-primary' : 'text-gray-600'
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

      <div className="flex flex-wrap gap-3">
        {nextStatus ? (
            <button
                onClick={() => handleStatusChange(nextStatus)}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
                Move to {STATUS_LABELS[nextStatus as keyof typeof STATUS_LABELS] || nextStatus}
            </button>
        ) : (
            booking.status === 'SERVICE_STARTED' && (
                <div className="flex-1 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Go to <strong>Billing</strong> tab to upload bill and complete service.</span>
                </div>
            )
        )}
        
        {booking.status !== 'Completed' && booking.status !== 'Delivered' && booking.status !== 'On Hold' && (
            <button
                onClick={() => setShowDelayModal(true)}
                disabled={loading}
                className="py-2 px-4 border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
            >
                <Clock className="w-4 h-4" />
                Mark Delay / Hold
            </button>
        )}

        {booking.status === 'On Hold' && (
            <button
                onClick={() => handleStatusChange(booking.delay?.previousStatus || 'Repair In Progress')} // Fallback needed?
                disabled={loading}
                className="py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
