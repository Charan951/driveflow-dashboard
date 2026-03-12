import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, CheckCircle, Clock, MapPin } from 'lucide-react';
import { carWashService, CarWashBooking } from '../services/carWashService';
import { uploadService } from '../services/uploadService';
import { toast } from '../hooks/use-toast';

interface CarWashPanelProps {
  booking: CarWashBooking;
  onUpdate: () => void;
}

export const CarWashPanel: React.FC<CarWashPanelProps> = ({ booking, onUpdate }) => {
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const canUploadBefore = booking.status === 'REACHED_CUSTOMER' && 
    (!booking.carWash.beforeWashPhotos || booking.carWash.beforeWashPhotos.length === 0);
  
  const canStartWash = booking.status === 'REACHED_CUSTOMER' && 
    booking.carWash.beforeWashPhotos && booking.carWash.beforeWashPhotos.length > 0;
  
  const canCompleteWash = booking.status === 'CAR_WASH_STARTED';

  const handleBeforeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxImages = Math.max(0, 4 - beforeImages.length);
      const limitedFiles = files.slice(0, maxImages);
      setBeforeImages(prev => [...prev, ...limitedFiles].slice(0, 4));
      
      if (files.length > maxImages) {
        toast({
          title: "Image Limit",
          description: `Only ${maxImages} more images can be added (maximum 4 total)`,
          variant: "destructive"
        });
      }
    }
  };

  const handleAfterImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxImages = Math.max(0, 4 - afterImages.length);
      const limitedFiles = files.slice(0, maxImages);
      setAfterImages(prev => [...prev, ...limitedFiles].slice(0, 4));
      
      if (files.length > maxImages) {
        toast({
          title: "Image Limit",
          description: `Only ${maxImages} more images can be added (maximum 4 total)`,
          variant: "destructive"
        });
      }
    }
  };

  const removeBeforeImage = (index: number) => {
    setBeforeImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeAfterImage = (index: number) => {
    setAfterImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadBeforePhotos = async () => {
    if (beforeImages.length === 0) {
      toast({
        title: "No Images",
        description: "Please select at least one before wash photo",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload images
      const uploadResponse = await uploadService.uploadFiles(beforeImages);
      const photoUrls = uploadResponse.files.map(f => f.url);

      // Save to booking
      await carWashService.uploadBeforePhotos(booking._id, photoUrls);
      
      setBeforeImages([]);
      onUpdate();
      toast({
        title: "Success",
        description: "Before wash photos uploaded successfully"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload before wash photos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startWash = async () => {
    setLoading(true);
    try {
      await carWashService.startCarWash(booking._id);
      onUpdate();
      toast({
        title: "Car Wash Started",
        description: "Car wash has been started successfully"
      });
    } catch (error) {
      console.error('Start wash error:', error);
      toast({
        title: "Error",
        description: "Failed to start car wash",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const completeWash = async () => {
    if (afterImages.length === 0) {
      toast({
        title: "No Images",
        description: "Please select at least one after wash photo",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload after images
      const uploadResponse = await uploadService.uploadFiles(afterImages);
      const photoUrls = uploadResponse.files.map(f => f.url);

      // Complete car wash
      await carWashService.completeCarWash(booking._id, photoUrls);
      
      setAfterImages([]);
      onUpdate();
      toast({
        title: "Car Wash Completed",
        description: "Car wash completed successfully. Customer will receive OTP."
      });
    } catch (error) {
      console.error('Complete wash error:', error);
      toast({
        title: "Error",
        description: "Failed to complete car wash",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Booking Info */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Car Wash Service #{booking.orderNumber}</h3>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            booking.status === 'REACHED_CUSTOMER' ? 'bg-blue-100 text-blue-800' :
            booking.status === 'CAR_WASH_STARTED' ? 'bg-yellow-100 text-yellow-800' :
            booking.status === 'CAR_WASH_COMPLETED' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {booking.status.replace('_', ' ')}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{booking.user.name}</p>
            <p className="text-sm text-muted-foreground">{booking.user.phone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vehicle</p>
            <p className="font-medium">{booking.vehicle.make} {booking.vehicle.model}</p>
            <p className="text-sm text-muted-foreground">{booking.vehicle.registrationNumber}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm">{booking.location.address}</p>
        </div>
      </div>

      {/* Before Wash Photos */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Before Wash Photos
          </h3>
          {booking.carWash.beforeWashPhotos?.length > 0 && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
        </div>

        {/* Existing Before Photos */}
        {booking.carWash.beforeWashPhotos?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Uploaded Photos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {booking.carWash.beforeWashPhotos.map((url, i) => (
                <div key={`existing-before-${i}`} className="aspect-square rounded-lg overflow-hidden border border-border">
                  <button
                    onClick={() => window.open(url, '_blank')}
                    className="w-full h-full hover:opacity-90 transition-opacity"
                  >
                    <img src={url} alt={`Before ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload New Before Photos */}
        {canUploadBefore && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {beforeImages.map((file, i) => (
                <div key={`new-before-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeBeforeImage(i)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {beforeImages.length < 4 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground text-center">Add Photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleBeforeImageChange} 
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end">
              <button 
                onClick={uploadBeforePhotos}
                disabled={loading || beforeImages.length === 0}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload Before Photos'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Start Car Wash */}
      {canStartWash && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Start Car Wash
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Begin the car wash service after uploading before photos
              </p>
            </div>
            <button 
              onClick={startWash}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Car Wash'}
            </button>
          </div>
        </div>
      )}

      {/* After Wash Photos */}
      {canCompleteWash && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              After Wash Photos
            </h3>
            <span className="text-sm text-muted-foreground">
              {afterImages.length}/4 images
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {afterImages.map((file, i) => (
              <div key={`new-after-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeAfterImage(i)}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {afterImages.length < 4 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground text-center">Add Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handleAfterImageChange} 
                />
              </label>
            )}
          </div>

          <div className="flex justify-end">
            <button 
              onClick={completeWash}
              disabled={loading || afterImages.length === 0}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Completing...' : 'Complete Car Wash'}
            </button>
          </div>
        </div>
      )}

      {/* Completed State */}
      {booking.status === 'CAR_WASH_COMPLETED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">Car Wash Completed</h3>
              <p className="text-sm text-green-600">
                Service completed successfully. Customer has received the delivery OTP.
              </p>
            </div>
          </div>
          
          {booking.carWash.afterWashPhotos?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-green-800 mb-3">After Wash Photos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {booking.carWash.afterWashPhotos.map((url, i) => (
                  <div key={`completed-after-${i}`} className="aspect-square rounded-lg overflow-hidden border border-green-200">
                    <button
                      onClick={() => window.open(url, '_blank')}
                      className="w-full h-full hover:opacity-90 transition-opacity"
                    >
                      <img src={url} alt={`After ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};