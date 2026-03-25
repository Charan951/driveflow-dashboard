import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Plus, Trash2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService, Booking } from '../../services/bookingService';
import { uploadService } from '../../services/uploadService';

interface MediaUploadPanelProps {
  bookingId: string;
  booking?: Booking;
  onUploadComplete: () => void;
}

const MediaUploadPanel: React.FC<MediaUploadPanelProps> = ({ bookingId, booking, onUploadComplete }) => {
  // Check if booking is completed (read-only mode)
  const isReadOnly = booking?.status === 'COMPLETED' || booking?.status === 'DELIVERED' || booking?.paymentStatus === 'paid';
  
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [serviceParts, setServiceParts] = useState<Array<{
    name: string;
    price: number;
    quantity: number;
    image?: File;
    imageUrl?: string;
    fromInspection?: boolean;
    inspectionPartId?: string;
    oldImage?: string;
    needsNewImage?: boolean;
  }>>([]);
  
  // State for existing images (URLs) - only after service
  const [existingAfter, setExistingAfter] = useState<string[]>(
    booking?.serviceExecution?.afterPhotos || []
  );

  // State for existing service parts
  const [existingServiceParts, setExistingServiceParts] = useState<Array<{
    name: string;
    price: number;
    quantity: number;
    approved: boolean;
    approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
    image?: string;
    oldImage?: string;
    addedDuringService?: boolean;
    fromInspection?: boolean;
    inspectionPartId?: string;
  }>>(
    booking?.serviceExecution?.serviceParts || []
  );

  // Get approved additional parts from inspection that can be sent to service
  const approvedInspectionParts = booking?.inspection?.additionalParts?.filter(
    part => part.approvalStatus === 'Approved' || part.approved
  ) || [];

  // Track which inspection parts have been sent to service
  const [sentInspectionParts, setSentInspectionParts] = useState<string[]>(
    existingServiceParts
      .filter(part => part.fromInspection)
      .map(part => part.inspectionPartId || '')
      .filter(Boolean)
  );

  const [loading, setLoading] = useState(false);

  // Initialize service parts from existing data
  useEffect(() => {
    if (booking?.serviceExecution?.afterPhotos) {
      setExistingAfter(booking.serviceExecution.afterPhotos);
    }
    if (booking?.serviceExecution?.serviceParts) {
      setExistingServiceParts(booking.serviceExecution.serviceParts);
      // Update sent inspection parts
      const sentIds = booking.serviceExecution.serviceParts
        .filter(part => part.fromInspection)
        .map(part => part.inspectionPartId || '')
        .filter(Boolean);
      setSentInspectionParts(sentIds);
    }
  }, [booking]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Limit to 4 images total (existing + new)
      const maxNewImages = Math.max(0, 4 - existingAfter.length);
      const limitedFiles = files.slice(0, maxNewImages);
      setAfterImages(prev => [...prev, ...limitedFiles].slice(0, maxNewImages));
      
      if (files.length > maxNewImages) {
        toast.warning(`Only ${maxNewImages} more images can be added (maximum 4 total)`);
      }
    }
  };

  const removeImage = (index: number) => {
    setAfterImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingAfter(prev => prev.filter((_, i) => i !== index));
  };

  const sendInspectionPartToService = (inspectionPart: any, inspectionPartIndex: number) => {
    const inspectionPartId = `inspection_${inspectionPartIndex}`;
    
    if (sentInspectionParts.includes(inspectionPartId)) {
      toast.info('This part has already been sent to service');
      return;
    }

    const servicePart = {
      name: inspectionPart.name,
      price: inspectionPart.price,
      quantity: inspectionPart.quantity,
      imageUrl: inspectionPart.image, // Old image from inspection
      fromInspection: true,
      inspectionPartId: inspectionPartId,
      oldImage: inspectionPart.image, // Keep reference to old image
      needsNewImage: true // Flag to indicate new image needed
    };

    setServiceParts(prev => [...prev, servicePart]);
    setSentInspectionParts(prev => [...prev, inspectionPartId]);
    toast.success(`${inspectionPart.name} sent to service - upload new image after replacement`);
  };

  const addServicePart = () => {
    setServiceParts(prev => [...prev, {
      name: '',
      price: 0,
      quantity: 1,
      needsNewImage: false
    }]);
  };

  const updateServicePart = (index: number, field: string, value: any) => {
    setServiceParts(prev => prev.map((part, i) => 
      i === index ? { ...part, [field]: value } : part
    ));
  };

  const removeServicePart = (index: number) => {
    const part = serviceParts[index];
    if (part.fromInspection && part.inspectionPartId) {
      setSentInspectionParts(prev => prev.filter(id => id !== part.inspectionPartId));
    }
    setServiceParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleServicePartImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateServicePart(index, 'image', e.target.files[0]);
      // Mark that new image has been uploaded
      if (serviceParts[index].fromInspection) {
        updateServicePart(index, 'needsNewImage', false);
      }
    }
  };

  const handleUpload = async () => {
    if (afterImages.length === 0 && serviceParts.length === 0 && 
        existingAfter.length === booking?.serviceExecution?.afterPhotos?.length &&
        existingServiceParts.length === booking?.serviceExecution?.serviceParts?.length) {
      toast.info('No changes to save');
      return;
    }
    
    setLoading(true);
    try {
        let newAfterUrls: string[] = [];

        // Upload new after service images
        if (afterImages.length > 0) {
          const res: { files: { url: string }[] } = await uploadService.uploadFiles(afterImages);
          newAfterUrls = res.files.map((f) => f.url);
        }
        
        const finalAfter = [...existingAfter, ...newAfterUrls];

        // Process service parts (both from inspection and new discoveries)
        const processedServiceParts = [];
        for (const part of serviceParts) {
          let newImageUrl = part.imageUrl; // Keep old image as fallback
          
          // Handle single image upload
          if (part.image) {
            const res: { files: { url: string }[] } = await uploadService.uploadFiles([part.image]);
            newImageUrl = res.files[0].url;
          }
          
          processedServiceParts.push({
            name: part.name,
            price: part.price,
            quantity: part.quantity,
            image: newImageUrl, // New image after replacement
            oldImage: part.oldImage, // Keep reference to old image from inspection
            approved: part.fromInspection ? true : false,
            approvalStatus: part.fromInspection ? 'Approved' : 'Pending',
            addedDuringService: !part.fromInspection,
            fromInspection: part.fromInspection || false,
            inspectionPartId: part.inspectionPartId
          });
        }

        const finalServiceParts = [...existingServiceParts, ...processedServiceParts];
        
        await bookingService.updateBookingDetails(bookingId, {
            serviceExecution: {
                afterPhotos: finalAfter,
                serviceParts: finalServiceParts
            }
        });

        // Update existing state
        setExistingAfter(finalAfter);
        setExistingServiceParts(finalServiceParts);
        setAfterImages([]);
        setServiceParts([]);

        onUploadComplete();
        toast.success('Service data updated successfully');
    } catch (error) {
        console.error(error);
        toast.error('Failed to upload data');
    } finally {
        setLoading(false);
    }
  };

  const totalImages = existingAfter.length + afterImages.length;

  return (
    <div className="space-y-6">
      {/* Approved Inspection Parts - Can be sent to service */}
      {!isReadOnly && approvedInspectionParts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  Approved Additional Parts from Inspection
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Customer approved these parts. Send to service and upload new images after replacement.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedInspectionParts.map((part, index) => {
              const inspectionPartId = `inspection_${index}`;
              const alreadySent = sentInspectionParts.includes(inspectionPartId);
              
              return (
                <div key={`inspection-part-${index}`} className="flex items-center gap-4 p-4 border border-green-200 bg-green-50/50 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    {part.image && (
                      <img src={part.image} alt={part.name} className="w-16 h-16 object-cover rounded" />
                    )}
                    <span className="text-xs text-muted-foreground">Before</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{part.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {part.quantity} • Price: ₹{part.price}
                    </p>
                    <span className="text-xs text-green-600 font-medium">✓ Customer Approved</span>
                  </div>
                  <button
                    onClick={() => sendInspectionPartToService(part, index)}
                    disabled={alreadySent}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      alreadySent 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {alreadySent ? 'Sent' : 'Send to Service'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Service Parts - Upload new images of replaced parts */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                {isReadOnly ? 'Service Parts Completed' : 'Service Parts - Upload New Images'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isReadOnly 
                ? 'Parts that were replaced/serviced during the booking'
                : 'Upload new images of parts after replacement/installation'
              }
            </p>
          </div>
          {!isReadOnly && (
            <button 
                onClick={addServicePart}
                className="px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
                Add New Discovery
            </button>
          )}
        </div>

        {/* Existing Service Parts */}
        {existingServiceParts.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {isReadOnly ? 'Service Parts Completed' : 'Current Service Parts'}
            </h4>
            <div className="space-y-3">
              {existingServiceParts.map((part, index) => (
                <div key={`existing-service-part-${index}`} className={`flex items-center gap-4 p-3 rounded-lg ${
                  part.fromInspection ? 'bg-green-50 border border-green-200' : 'bg-muted/50'
                }`}>
                  <div className="flex gap-2">
                    {part.oldImage && (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => window.open(part.oldImage!, '_blank')}
                          className="w-12 h-12 object-cover rounded hover:opacity-90 transition-opacity"
                        >
                          <img src={part.oldImage} alt="Before" className="w-full h-full object-cover rounded" />
                        </button>
                        <span className="text-xs text-muted-foreground">Before</span>
                      </div>
                    )}
                    {part.image && (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => window.open(part.image!, '_blank')}
                          className="w-12 h-12 object-cover rounded hover:opacity-90 transition-opacity"
                        >
                          <img src={part.image} alt="After" className="w-full h-full object-cover rounded" />
                        </button>
                        <span className="text-xs text-muted-foreground">After</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{part.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {part.quantity} • Price: ₹{part.price}
                    </p>
                    <span className={`text-xs font-medium ${
                      part.fromInspection ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {part.fromInspection ? '✓ From approved inspection' : '⚡ New discovery during service'}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    part.approvalStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                    part.approvalStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {part.approvalStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Service Parts */}
        {!isReadOnly && serviceParts.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">New Service Parts</h4>
            {serviceParts.map((part, index) => (
              <div key={`new-service-part-${index}`} className={`grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg ${
                part.fromInspection ? 'border-green-200 bg-green-50/50' : 'border-border'
              }`}>
                <div>
                  <label className="block text-sm font-medium mb-1">Part Name</label>
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => updateServicePart(index, 'name', e.target.value)}
                    className="w-full p-2 border border-input rounded-lg"
                    placeholder="Enter part name"
                    disabled={part.fromInspection}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={part.price}
                    onChange={(e) => updateServicePart(index, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-input rounded-lg"
                    placeholder="0"
                    disabled={part.fromInspection}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={part.quantity}
                    onChange={(e) => updateServicePart(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-input rounded-lg"
                    min="1"
                    disabled={part.fromInspection}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Before Image</label>
                  <div className="w-full h-16 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                    {part.oldImage ? (
                      <img src={part.oldImage} alt="Before" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No before image</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    After Image {part.needsNewImage && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex flex-col gap-2">
                    {part.image && (
                      <div className="w-full h-16 rounded-lg overflow-hidden border border-border">
                        <img src={URL.createObjectURL(part.image)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className={`p-2 border border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors text-center ${
                      part.needsNewImage ? 'border-red-300 bg-red-50' : 'border-border'
                    }`}>
                      <span className="text-sm text-muted-foreground">
                        {part.image ? 'Change image' : part.needsNewImage ? 'Upload after image' : 'Choose image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleServicePartImageChange(index, e)}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => removeServicePart(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {serviceParts.length === 0 && existingServiceParts.length === 0 && !isReadOnly && (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No service parts added yet</p>
            <p className="text-sm">Send approved inspection parts or add new discoveries during service</p>
          </div>
        )}
      </div>

      {/* After Service Photos */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              {isReadOnly ? 'Service Completion Photos' : 'After Service Photos'}
          </h3>
          <span className="text-sm text-muted-foreground">
            {isReadOnly 
              ? `${totalImages} photos taken after service completion`
              : `${totalImages}/4 images`
            }
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Existing Images */}
          {existingAfter.map((url, i) => (
              <div key={`existing-after-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <button
                    onClick={() => window.open(url, '_blank')}
                    className="w-full h-full hover:opacity-90 transition-opacity"
                  >
                    <img src={url} alt={`After Service ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                  {!isReadOnly && (
                    <button
                        onClick={() => removeExistingImage(i)}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                  )}
              </div>
          ))}
          
          {/* New Images */}
          {!isReadOnly && afterImages.map((file, i) => (
            <div key={`new-after-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {/* Add Photo Button - only show if less than 4 total images */}
          {!isReadOnly && totalImages < 4 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground text-center">Add Photo</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={handleImageChange} 
              />
            </label>
          )}
        </div>

        {totalImages === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {isReadOnly ? 'No service photos available' : 'No after service photos yet'}
            </p>
            <p className="text-sm">
              {isReadOnly 
                ? 'No photos were taken after service completion'
                : 'Upload up to 4 photos showing the completed work'
              }
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      {!isReadOnly && (
        <div className="flex justify-end">
          <button 
              onClick={handleUpload}
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
              {loading ? 'Saving...' : 'Save Service Data'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaUploadPanel;