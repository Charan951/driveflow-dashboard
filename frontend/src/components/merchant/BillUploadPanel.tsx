import React, { useState } from 'react';
import { Upload, X, FileText, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { uploadService } from '../../services/uploadService';
import { PICKUP_FLOW_ORDER, NO_PICKUP_FLOW_ORDER } from '@/lib/statusFlow';

interface BillUploadPanelProps {
  booking: Booking;
  onUploadComplete: () => void;
}

const BillUploadPanel: React.FC<BillUploadPanelProps> = ({ booking, onUploadComplete }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: booking.billing?.invoiceNumber || '',
    invoiceDate: booking.billing?.invoiceDate ? new Date(booking.billing.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    partsCost: booking.billing?.partsTotal || '',
    labourCost: booking.billing?.labourCost || '',
    gst: booking.billing?.gst || '',
    totalAmount: booking.billing?.total || '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploaded, setIsUploaded] = useState(!!booking.billing?.fileUrl);
  const [loading, setLoading] = useState(false);

  // Sync form data with booking prop changes (e.g. when parts are added in Inspection)
  React.useEffect(() => {
    setFormData(prev => ({
        ...prev,
        partsCost: booking.billing?.partsTotal || prev.partsCost, // Update parts cost if backend updated it
        // Only update total if we are taking the new parts cost
        totalAmount: (parseFloat(booking.billing?.partsTotal || prev.partsCost || 0) + 
                      parseFloat(prev.labourCost || 0) + 
                      parseFloat(prev.gst || 0)).toString()
    }));
  }, [booking.billing?.partsTotal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // Auto calculate total if costs change
        if (['partsCost', 'labourCost', 'gst'].includes(name)) {
            const parts = parseFloat(newData.partsCost) || 0;
            const labour = parseFloat(newData.labourCost) || 0;
            const gst = parseFloat(newData.gst) || 0;
            newData.totalAmount = (parts + labour + gst).toString();
        }
        return newData;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if Inspection is completed
    if (!booking.inspection?.completedAt) {
      toast.error('Please complete the Inspection in the "Inspection" tab before uploading the bill.');
      return;
    }

    // Check if QC is completed
    if (!booking.qc?.completedAt) {
      toast.error('Please complete the QC Check in the "QC Check" tab before uploading the bill.');
      return;
    }

    if (!file && !isUploaded) {
      toast.error('Please upload a bill image or PDF');
      return;
    }
    
    setLoading(true);
    try {
        let fileUrl = booking.billing?.fileUrl || '';

        if (file) {
            const res = await uploadService.uploadFile(file);
            fileUrl = res.url;
        }

        await bookingService.updateBookingDetails(booking._id, {
            billing: {
                invoiceNumber: formData.invoiceNumber,
                invoiceDate: formData.invoiceDate,
                partsTotal: parseFloat(formData.partsCost) || 0,
                labourCost: parseFloat(formData.labourCost) || 0,
                gst: parseFloat(formData.gst) || 0,
                total: parseFloat(formData.totalAmount) || 0,
                fileUrl: fileUrl
            }
        });

        // Automatically move status to SERVICE_COMPLETED
        // We do this if the status is currently anywhere before SERVICE_COMPLETED
        const activeFlow = PICKUP_FLOW_ORDER;
        const currentIndex = activeFlow.indexOf(booking.status as (typeof activeFlow)[number]);
        const completedIndex = activeFlow.indexOf('SERVICE_COMPLETED' as (typeof activeFlow)[number]);

        if (currentIndex < completedIndex && currentIndex !== -1) {
            await bookingService.updateBookingStatus(booking._id, 'SERVICE_COMPLETED');
            
            // Also set jobEndTime if not set
            if (!booking.serviceExecution?.jobEndTime) {
                await bookingService.updateBookingDetails(booking._id, {
                    serviceExecution: {
                        jobEndTime: new Date().toISOString()
                    }
                });
            }
        }

        setIsUploaded(true);
        onUploadComplete();
        toast.success('Bill uploaded and service marked as completed');
    } catch (error) {
        console.error(error);
        toast.error('Failed to save bill details');
    } finally {
        setLoading(false);
    }
  };

  if (isUploaded && !file) { // Show uploaded state if already uploaded (and not currently editing with new file)
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-800">Bill Uploaded</h3>
        {booking.billing?.fileUrl && (
            <a 
                href={booking.billing.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-700 underline text-sm mb-2 block hover:text-green-900"
            >
                View Uploaded Document
            </a>
        )}
        <p className="text-green-600 mb-4">Invoice #{formData.invoiceNumber}</p>
        <p className="text-sm text-green-700">Total: ₹{formData.totalAmount}</p>
        <button 
            onClick={() => setIsUploaded(false)} // Allow edit
            className="text-sm text-primary underline"
        >
            Edit Bill Details
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Upload Bill (Mandatory)
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Number</label>
            <input
              type="text"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-input rounded-lg bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Date</label>
            <input
              type="date"
              name="invoiceDate"
              value={formData.invoiceDate}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-input rounded-lg bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Parts Cost</label>
            <input
              type="number"
              name="partsCost"
              value={formData.partsCost}
              onChange={handleInputChange}
              min="0"
              className="w-full p-2 border border-input rounded-lg bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Labour Cost</label>
            <input
              type="number"
              name="labourCost"
              value={formData.labourCost}
              onChange={handleInputChange}
              min="0"
              className="w-full p-2 border border-input rounded-lg bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">GST</label>
            <input
              type="number"
              name="gst"
              value={formData.gst}
              onChange={handleInputChange}
              min="0"
              className="w-full p-2 border border-input rounded-lg bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Total Amount</label>
            <input
              type="number"
              name="totalAmount"
              value={formData.totalAmount}
              readOnly
              className="w-full p-2 border border-input rounded-lg bg-muted text-muted-foreground"
            />
          </div>
        </div>

        <div className="border-2 border-dashed border-input rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            {file ? (
              <>
                <FileText className="w-8 h-8 text-primary" />
                <p className="font-medium text-primary">{file.name}</p>
              </>
            ) : (
              <>
                <Camera className="w-8 h-8 text-muted-foreground" />
                <p className="font-medium">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground">Camera image, PDF, Scanned copy</p>
              </>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Saving...' : 'Upload Bill & Submit'}
        </button>
      </form>
    </div>
  );
};

export default BillUploadPanel;
