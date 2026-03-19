import React, { useState } from 'react';
import { Shield, IndianRupee, Calendar, ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import api from '@/services/api';

interface WarrantyPanelProps {
  booking: Booking;
  onUpdate: () => void;
}

const WarrantyPanel: React.FC<WarrantyPanelProps> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [name, setName] = useState<string>(booking.batteryTire?.warranty?.name || '');
  const [price, setPrice] = useState<string>(booking.batteryTire?.warranty?.price?.toString() || '');
  const [warrantyMonths, setWarrantyMonths] = useState<string>(booking.batteryTire?.warranty?.warrantyMonths?.toString() || '');
  const [image, setImage] = useState<string>(booking.batteryTire?.warranty?.image || '');

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter warranty name');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!warrantyMonths || parseInt(warrantyMonths) <= 0) {
      toast.error('Please enter valid warranty months');
      return;
    }

    setLoading(true);
    try {
      const result = await bookingService.addWarranty(booking._id, {
        name: name.trim(),
        price: parseFloat(price),
        warrantyMonths: parseInt(warrantyMonths),
        image
      });
      toast.success('Warranty information added successfully');
      
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add warranty information');
    } finally {
      setLoading(false);
    }
  };

  // If warranty already exists, show read-only view
  if (booking.batteryTire?.warranty?.name) {
    return (
      <Card className="border-2 border-green-100 bg-green-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Warranty Information Added
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {booking.batteryTire.warranty.addedAt && 
                new Date(booking.batteryTire.warranty.addedAt).toLocaleString()
              }
            </span>
          </div>
          <CardDescription>
            Warranty details have been added for this battery/tire service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            {booking.batteryTire.warranty.image && (
              <div className="w-full md:w-1/3 aspect-square rounded-lg overflow-hidden border border-green-200">
                <img 
                  src={booking.batteryTire.warranty.image} 
                  alt="Warranty Item" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">Product Name:</p>
                <p className="text-lg font-semibold text-green-700">{booking.batteryTire.warranty.name}</p>
              </div>
              <div className="flex items-center gap-2 text-lg font-bold text-green-700">
                <IndianRupee className="w-5 h-5" />
                {booking.batteryTire.warranty.price}
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{booking.batteryTire.warranty.warrantyMonths} months warranty</span>
              </div>
              {booking.batteryTire.warranty.addedBy && (
                <div className="p-3 bg-white/50 rounded-lg border border-green-100">
                  <p className="text-sm font-medium text-green-800 mb-1">Added by:</p>
                  <p className="text-sm text-green-700">{booking.batteryTire.warranty.addedBy.name}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Add Warranty Information
        </CardTitle>
        <CardDescription>
          Add warranty details for the battery/tire service. This information will be visible to both admin and customer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input
                type="text"
                placeholder="e.g., Exide Car Battery 12V 65Ah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-muted-foreground" /> Price (₹)
              </label>
              <Input
                type="number"
                placeholder="Enter price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loading}
                min="1"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" /> Warranty (Months)
              </label>
              <Input
                type="number"
                placeholder="Enter warranty months"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                disabled={loading}
                min="1"
                step="1"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" /> Product Image
              </label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                {(image || localPreview) ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-square max-w-[200px] mx-auto rounded-lg overflow-hidden border">
                      <img 
                        src={localPreview || image} 
                        alt="Product preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearImage}
                        disabled={uploading || loading}
                      >
                        Remove
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('warranty-image-upload')?.click()}
                        disabled={uploading || loading}
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Upload product image</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('warranty-image-upload')?.click()}
                      disabled={uploading || loading}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Choose Image'}
                    </Button>
                  </div>
                )}
                <input
                  id="warranty-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading || loading}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading || !name.trim() || !price || !warrantyMonths}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add Warranty'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WarrantyPanel;