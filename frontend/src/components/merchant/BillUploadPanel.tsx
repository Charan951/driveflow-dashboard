import React, { useState } from 'react';
import { Upload, X, FileText, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface BillUploadPanelProps {
  bookingId: string;
  onUploadComplete: () => void;
}

const BillUploadPanel: React.FC<BillUploadPanelProps> = ({ bookingId, onUploadComplete }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    partsCost: '',
    labourCost: '',
    gst: '',
    totalAmount: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please upload a bill image or PDF');
      return;
    }
    // Mock upload
    setTimeout(() => {
      setIsUploaded(true);
      onUploadComplete();
      toast.success('Bill uploaded successfully');
    }, 1000);
  };

  if (isUploaded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-800">Bill Uploaded</h3>
        <p className="text-green-600 mb-4">Invoice #{formData.invoiceNumber}</p>
        <button className="text-sm text-muted-foreground underline cursor-not-allowed" title="Admin Approval Required to Edit">
            Edit Bill (Admin Approval Required)
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
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Upload Bill & Submit
        </button>
      </form>
    </div>
  );
};

export default BillUploadPanel;
