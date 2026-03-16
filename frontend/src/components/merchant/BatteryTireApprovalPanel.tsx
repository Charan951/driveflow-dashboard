import React, { useState } from 'react';
import { CheckCircle, XCircle, ImageIcon, IndianRupee, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import api from '@/services/api';

import { socketService } from '@/services/socket';

interface BatteryTireApprovalPanelProps {
  booking: Booking;
  onUpdate: () => void;
}

const BatteryTireApprovalPanel: React.FC<BatteryTireApprovalPanelProps> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [price, setPrice] = useState<string>(booking.batteryTire?.merchantApproval?.price?.toString() || '');
  const [image, setImage] = useState<string>(booking.batteryTire?.merchantApproval?.image || '');
  const [notes, setNotes] = useState<string>(booking.batteryTire?.merchantApproval?.notes || '');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set local preview
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImage(data.url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      setLocalPreview(null); // Clear preview on error
    } finally {
      setUploading(false);
    }
  };

  const handleClearImage = () => {
    setImage('');
    setLocalPreview(null);
  };

  const handleApproval = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'APPROVED') {
      if (!price || parseFloat(price) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }
      if (!image) {
        toast.error('Please upload an image of the battery/tire');
        return;
      }
    } else {
      if (!notes) {
        toast.error('Please provide a reason for rejection in the notes');
        return;
      }
    }

    setLoading(true);
    try {
      const result = await bookingService.batteryTireApproval(booking._id, {
        status,
        price: status === 'APPROVED' ? parseFloat(price) : undefined,
        image: status === 'APPROVED' ? image : undefined,
        notes
      });
      toast.success(`Service ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
      
      // Emit manual socket update for immediate UI refresh across all portals
      if (result) {
        socketService.emit('bookingUpdated', result);
      }
      
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit approval');
    } finally {
      setLoading(false);
    }
  };

  const approvalStatus = booking.batteryTire?.merchantApproval?.status;

  if (approvalStatus !== 'PENDING') {
    return (
      <Card className={`border-2 ${approvalStatus === 'APPROVED' ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {approvalStatus === 'APPROVED' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Battery/Tire Service {approvalStatus === 'APPROVED' ? 'Approved' : 'Rejected'}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {approvalStatus === 'APPROVED' 
                ? new Date(booking.batteryTire?.merchantApproval?.approvedAt!).toLocaleString()
                : new Date(booking.batteryTire?.merchantApproval?.rejectedAt!).toLocaleString()
              }
            </span>
          </div>
          <CardDescription>
            {approvalStatus === 'APPROVED' 
              ? 'You have approved this service and set the price.' 
              : 'You have rejected this service request.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvalStatus === 'APPROVED' && (
            <div className="flex flex-col md:flex-row gap-6">
              {booking.batteryTire?.merchantApproval?.image && (
                <div className="w-full md:w-1/3 aspect-square rounded-lg overflow-hidden border border-green-200">
                  <img 
                    src={booking.batteryTire.merchantApproval.image} 
                    alt="Battery/Tire" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-lg font-bold text-green-700">
                  <IndianRupee className="w-5 h-5" />
                  {booking.batteryTire?.merchantApproval?.price}
                </div>
                {booking.batteryTire?.merchantApproval?.notes && (
                  <div className="p-3 bg-white/50 rounded-lg border border-green-100">
                    <p className="text-sm font-medium text-green-800 mb-1">Your Note:</p>
                    <p className="text-sm text-green-700">{booking.batteryTire.merchantApproval.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {approvalStatus === 'REJECTED' && booking.batteryTire?.merchantApproval?.notes && (
            <div className="p-3 bg-white/50 rounded-lg border border-red-100">
              <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-700">{booking.batteryTire.merchantApproval.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Battery/Tire Service Approval
        </CardTitle>
        <CardDescription>
          Please inspect the vehicle and provide the estimated price and an image of the required battery/tire for approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-muted-foreground" /> Price (₹)
              </label>
              <Input
                type="number"
                placeholder="Enter estimated price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="text-lg font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" /> Notes / Remarks
              </label>
              <Textarea
                placeholder="Add any specific details or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" /> Product Image
            </label>
            <div className="relative group">
              {image || localPreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-dashed border-primary/30">
                  <img src={image || localPreview!} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  <button 
                    onClick={handleClearImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Click to upload photo</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700" 
            onClick={() => handleApproval('APPROVED')}
            disabled={loading || uploading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Approve & Send Price
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1" 
            onClick={() => handleApproval('REJECTED')}
            disabled={loading || uploading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
            Reject Request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatteryTireApprovalPanel;
