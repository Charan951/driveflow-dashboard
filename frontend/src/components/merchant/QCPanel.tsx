import React, { useState } from 'react';
import { ClipboardCheck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService } from '../../services/bookingService';

interface QCPanelProps {
  booking: any;
  onUpdate: () => void;
}

const QCPanel: React.FC<QCPanelProps> = ({ booking, onUpdate }) => {
  const [checklist, setChecklist] = useState({
    testRide: booking.qc?.testRide || false,
    safetyChecks: booking.qc?.safetyChecks || false,
    noLeaks: booking.qc?.noLeaks || false,
    noErrorLights: booking.qc?.noErrorLights || false,
  });
  const [notes, setNotes] = useState(booking.qc?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSaveQC = async () => {
    // Validate all checked?
    const allChecked = Object.values(checklist).every(v => v);
    if (!allChecked) {
        toast.warning('Please complete all QC checks before saving.');
        return;
    }

    setLoading(true);
    try {
      await bookingService.updateBookingDetails(booking._id, {
        qc: {
            ...checklist,
            notes,
            completedAt: new Date().toISOString()
        }
      });
      toast.success('QC Checklist saved successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to save QC details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-green-600" />
        Quality Check (QC)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted" onClick={() => handleCheck('testRide')}>
                <div className={`w-6 h-6 rounded border flex items-center justify-center ${checklist.testRide ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400'}`}>
                    {checklist.testRide && <Check className="w-4 h-4" />}
                </div>
                <span className="font-medium">Test Ride Completed</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted" onClick={() => handleCheck('safetyChecks')}>
                <div className={`w-6 h-6 rounded border flex items-center justify-center ${checklist.safetyChecks ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400'}`}>
                    {checklist.safetyChecks && <Check className="w-4 h-4" />}
                </div>
                <span className="font-medium">Safety Checks Performed</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted" onClick={() => handleCheck('noLeaks')}>
                <div className={`w-6 h-6 rounded border flex items-center justify-center ${checklist.noLeaks ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400'}`}>
                    {checklist.noLeaks && <Check className="w-4 h-4" />}
                </div>
                <span className="font-medium">No Leaks Detected</span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted" onClick={() => handleCheck('noErrorLights')}>
                <div className={`w-6 h-6 rounded border flex items-center justify-center ${checklist.noErrorLights ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400'}`}>
                    {checklist.noErrorLights && <Check className="w-4 h-4" />}
                </div>
                <span className="font-medium">No Dashboard Error Lights</span>
            </div>
        </div>

        <div className="space-y-4">
            <label className="text-sm font-medium">QC Notes / Remarks</label>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 border border-input rounded-lg h-[150px]"
                placeholder="Any final observations..."
            />
            
            <button
                onClick={handleSaveQC}
                disabled={loading}
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
                Confirm QC Checks
            </button>
        </div>
      </div>
    </div>
  );
};

export default QCPanel;
