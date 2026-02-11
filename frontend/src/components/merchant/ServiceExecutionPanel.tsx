import React, { useState, useEffect } from 'react';
import { Wrench, Clock, Camera, DollarSign, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService } from '../../services/bookingService';
import { userService, User } from '../../services/userService';
import { createApproval } from '../../services/approvalService';
import { uploadService } from '../../services/uploadService';

interface ServiceExecutionPanelProps {
  booking: any;
  onUpdate: () => void;
}

const ServiceExecutionPanel: React.FC<ServiceExecutionPanelProps> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [technicianId, setTechnicianId] = useState(booking.technician?._id || '');
  const [notes, setNotes] = useState(booking.serviceExecution?.notes || '');
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [extraCostReason, setExtraCostReason] = useState('');
  const [extraCostAmount, setExtraCostAmount] = useState('');

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        // Fetch staff with subRole 'Technician' or just role 'staff'
        // Adjust filter based on your business logic
        const staff = await userService.getAllUsers({ role: 'staff', subRole: 'Technician' });
        setTechnicians(staff);
      } catch (error) {
        console.error('Failed to fetch technicians', error);
        toast.error('Failed to load technicians');
      }
    };

    fetchTechnicians();
  }, []);

  const handleAssignTechnician = async () => {
    setLoading(true);
    try {
      await bookingService.assignBooking(booking._id, { technicianId });
      toast.success('Technician assigned successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to assign technician');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExecution = async () => {
    setLoading(true);
    try {
      await bookingService.updateBookingDetails(booking._id, {
        serviceExecution: {
            // ...booking.serviceExecution,
            // notes: notes // If we add notes to serviceExecution
        },
        notes: notes // Using main notes for now
      });
      toast.success('Service updates saved');
      onUpdate();
    } catch (error) {
      toast.error('Failed to save updates');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExtraCost = async () => {
    if (!extraCostAmount || !extraCostReason) return;
    setLoading(true);
    try {
        await createApproval({
            type: 'ExtraCost',
            relatedId: booking._id,
            relatedModel: 'Booking',
            data: {
                amount: Number(extraCostAmount),
                reason: extraCostReason
            }
        });
        toast.success('Extra cost approval requested');
        setExtraCostAmount('');
        setExtraCostReason('');
    } catch (error) {
        toast.error('Failed to request approval');
    } finally {
        setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'during' | 'after') => {
    if (e.target.files && e.target.files.length > 0) {
      setLoading(true);
      try {
        const files = Array.from(e.target.files);
        const res = await uploadService.uploadFiles(files);
        const newPhotos = res.files.map(f => f.url);
        
        // Get existing photos
        const currentPhotos = booking.serviceExecution?.[`${type}Photos`] || [];
        
        await bookingService.updateBookingDetails(booking._id, {
          serviceExecution: {
            [`${type}Photos`]: [...currentPhotos, ...newPhotos]
          }
        });
        
        toast.success(`${type} photos uploaded`);
        onUpdate();
      } catch (error) {
        toast.error('Failed to upload photos');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary" />
        Service Execution
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Assign Technician</label>
                <div className="flex gap-2">
                    <select
                        value={technicianId}
                        onChange={(e) => setTechnicianId(e.target.value)}
                        className="flex-1 p-2 border border-input rounded-lg"
                    >
                        <option value="">Select Technician</option>
                        {technicians.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleAssignTechnician}
                        disabled={loading || !technicianId}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90"
                    >
                        Assign
                    </button>
                </div>
                {booking.technician && (
                    <p className="text-sm text-green-600">
                        Currently assigned: <span className="font-medium">{booking.technician.name}</span>
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Job Timing</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Start Time</p>
                        <p className="font-medium">
                            {booking.serviceExecution?.jobStartTime 
                                ? new Date(booking.serviceExecution.jobStartTime).toLocaleString() 
                                : '-'}
                        </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">End Time</p>
                        <p className="font-medium">
                            {booking.serviceExecution?.jobEndTime 
                                ? new Date(booking.serviceExecution.jobEndTime).toLocaleString() 
                                : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Service Notes / Logs</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-input rounded-lg min-h-[120px]"
                    placeholder="Log key service activities..."
                />
            </div>
            <button
                onClick={handleUpdateExecution}
                disabled={loading}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
                Update Service Notes
            </button>
        </div>
      </div>
      
      <div className="pt-4 border-t space-y-4">
        <h4 className="font-medium flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Service Photos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['before', 'during', 'after'].map((type) => (
                <div key={type} className="space-y-2">
                    <label className="text-xs font-medium capitalize">{type} Service</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(booking.serviceExecution?.[`${type}Photos`] || []).map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-md overflow-hidden border">
                                <img src={url} alt={`${type} ${i}`} className="w-full h-full object-cover" />
                            </a>
                        ))}
                        <label className="flex items-center justify-center aspect-square border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50">
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoUpload(e, type as 'before' | 'during' | 'after')} 
                            />
                            <Plus className="w-6 h-6 text-muted-foreground" />
                        </label>
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Request Extra Cost Approval
        </h4>
        <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Reason</label>
                <input 
                    type="text" 
                    value={extraCostReason}
                    onChange={(e) => setExtraCostReason(e.target.value)}
                    placeholder="e.g. Deep cleaning required"
                    className="w-full p-2 border border-input rounded-md text-sm"
                />
            </div>
            <div className="w-32 space-y-1">
                <label className="text-xs text-muted-foreground">Amount ($)</label>
                <input 
                    type="number" 
                    value={extraCostAmount}
                    onChange={(e) => setExtraCostAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2 border border-input rounded-md text-sm"
                    min="0"
                />
            </div>
            <button
                onClick={handleRequestExtraCost}
                disabled={loading || !extraCostAmount || !extraCostReason}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
            >
                Request
            </button>
        </div>
      </div>

      {/* Photo upload placeholder - relying on MediaUploadPanel for now or can be added here */}
      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-2">Progress Photos (Upload via Media Panel)</p>
      </div>
    </div>
  );
};

export default ServiceExecutionPanel;
