
import React, { useState } from 'react';
import { AlertTriangle, Plus, Trash2, CheckCircle, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import { bookingService, Booking, BookingDetailsUpdate } from '../../services/bookingService';
import { createApproval } from '../../services/approvalService';
import { uploadService } from '../../services/uploadService';
import { toast } from 'sonner';

interface InspectionPanelProps {
  booking: Booking;
  onUpdate: () => void;
}

type BookingAdditionalPart =
  NonNullable<NonNullable<Booking['inspection']>['additionalParts']>[number];

interface UIAdditionalPart extends BookingAdditionalPart {
  imageFile?: File | null;
  oldImageFile?: File | null;
}

const InspectionPanel: React.FC<InspectionPanelProps> = ({ booking, onUpdate }) => {
  const [damageReport, setDamageReport] = useState(booking.inspection?.damageReport || '');
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>(booking.inspection?.photos || []);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  
  const [additionalParts, setAdditionalParts] = useState<UIAdditionalPart[]>(
    (booking.inspection?.additionalParts || []).map((p) => ({
      ...p,
      image: p.image || '',
      oldImage: p.oldImage || '',
      approvalStatus: p.approvalStatus || (p.approved ? 'Approved' : 'Pending'),
      imageFile: null,
      oldImageFile: null,
    }))
  );
  const [loading, setLoading] = useState(false);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingPhotos(true);
      try {
        const res = await uploadService.uploadFile(e.target.files[0]);
        setInspectionPhotos(prev => [...prev, res.url]);
        toast.success('Photo uploaded');
      } catch (err) {
        toast.error('Failed to upload photo');
      } finally {
        setUploadingPhotos(false);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setInspectionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPart = () => {
    setAdditionalParts((prev) => [
      ...prev,
      {
        name: '',
        price: 0,
        quantity: 1,
        approved: false,
        approvalStatus: 'Pending',
        image: '',
        imageFile: null,
        oldImage: '',
        oldImageFile: null,
      },
    ]);
  };

  const handleRemovePart = (index: number) => {
    const newParts = [...additionalParts];
    newParts.splice(index, 1);
    setAdditionalParts(newParts);
  };

  const handlePartChange = (index: number, field: keyof UIAdditionalPart, value: string | number | boolean) => {
    setAdditionalParts((prev) => {
      const newParts = [...prev];
      newParts[index] = { ...newParts[index], [field]: value } as UIAdditionalPart;
      return newParts;
    });
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'old' = 'new') => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const newParts = [...additionalParts];
        if (type === 'new') {
            newParts[index] = { ...newParts[index], imageFile: file };
        } else {
            newParts[index] = { ...newParts[index], oldImageFile: file };
        }
        setAdditionalParts(newParts);
    }
  };

  const handleSave = async (isFinal: boolean = false) => {
    setLoading(true);
    try {
      // 0. Upload images first
      const updatedParts: UIAdditionalPart[] = [...additionalParts];
      for (let i = 0; i < updatedParts.length; i++) {
        let part = updatedParts[i];
        
        // Upload New Part Image
        if (part.imageFile) {
          try {
            const res = await uploadService.uploadFile(part.imageFile);
            part = { 
              ...part, 
              image: res.url,
              imageFile: null 
            };
          } catch (err) {
            console.error("Failed to upload image for part", part.name);
            toast.error(`Failed to upload image for ${part.name}`);
          }
        }

        // Upload Old Part Image
        if (part.oldImageFile) {
          try {
            const res = await uploadService.uploadFile(part.oldImageFile);
            part = { 
              ...part, 
              oldImage: res.url,
              oldImageFile: null 
            };
          } catch (err) {
            console.error("Failed to upload old image for part", part.name);
            toast.error(`Failed to upload old image for ${part.name}`);
          }
        }
        
        updatedParts[i] = part;
      }
      setAdditionalParts(updatedParts);

      // 1. Identify approved parts for billing
      const approvedParts: NonNullable<BookingDetailsUpdate['parts']> = updatedParts
        .filter((p) => p.approved)
        .map((p) => ({
          name: p.name,
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 1,
          image: p.image,
        }));

      // 2. Save additional parts list
      const partsToSave: BookingAdditionalPart[] = updatedParts.map((p) => {
        const approvalStatus = p.approvalStatus || (p.approved ? 'Approved' : 'Pending');
        const { imageFile, oldImageFile, ...rest } = p;
        return { ...rest, approvalStatus };
      });

      const inspectionUpdate: BookingDetailsUpdate['inspection'] = {
        damageReport,
        photos: inspectionPhotos,
        additionalParts: partsToSave
      };

      if (isFinal && inspectionUpdate) {
        inspectionUpdate.completedAt = new Date().toISOString();
      }

      await bookingService.updateBookingDetails(booking._id, {
        inspection: inspectionUpdate,
        parts: approvedParts
      });

      // 3. Create approval requests for NEW unapproved parts
      const unapprovedParts = updatedParts.filter(
        (p) => !p.approved && (Number(p.price) || 0) > 0
      );
      
      let requestCount = 0;
      for (const part of unapprovedParts) {
          // Optimization: Check if this part already has a pending approval in the system
          // For now, we rely on the merchant to only save/confirm when they want to send requests.
          
          await createApproval({
              type: 'PartReplacement',
              relatedId: booking._id,
              relatedModel: 'Booking',
              data: {
                  name: part.name || 'Unnamed Additional Part',
                  price: Number(part.price),
                  quantity: Number(part.quantity),
                  image: part.image,
                  oldImage: part.oldImage
              }
          });
          requestCount++;
      }

      if (isFinal) {
        toast.success('Inspection completed successfully');
      } else if (requestCount > 0) {
        toast.success(`Additional parts saved. ${requestCount} approval request(s) sent.`);
      } else {
        toast.success('Additional parts saved');
      }
      
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save inspection details');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = !!booking.inspection?.completedAt;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Vehicle Inspection
        </h3>
        {isCompleted && (
            <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                <CheckCircle className="w-4 h-4" />
                Inspection Completed
            </div>
        )}
      </div>

      {/* Damage Report & Photos Section */}
      <div className="space-y-4 pt-2 border-t border-border">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Damage Report / Inspection Findings</label>
          <textarea
            value={damageReport}
            onChange={(e) => setDamageReport(e.target.value)}
            disabled={isCompleted}
            placeholder="Describe any damages or findings from the initial inspection..."
            className="w-full p-3 border border-input rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Inspection Photos</label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {inspectionPhotos.map((url, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                <img src={url} alt={`Inspection ${i}`} className="w-full h-full object-cover" />
                {!isCompleted && (
                  <button
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            
            {!isCompleted && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                {uploadingPhotos ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] mt-1 text-muted-foreground font-medium">Add Photo</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleAddPhoto} />
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Additional Parts Needed</label>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <Trash2 className="w-3 h-3 text-red-500" />
              <span>Rejected</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-500" />
              <span>Pending</span>
            </div>
          </div>
          <button
            onClick={handleAddPart}
            disabled={isCompleted}
            className={`text-sm flex items-center gap-1 hover:underline ${isCompleted ? 'text-gray-400 cursor-not-allowed' : 'text-primary'}`}
          >
            <Plus className="w-4 h-4" /> Add Part
          </button>
        </div>

        {additionalParts.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No additional parts added.</p>
        )}

        {additionalParts.map((part, index: number) => {
          const isApproved = part.approvalStatus === 'Approved' || part.approved;
          const isDisabled = isApproved || isCompleted;
          return (
          <div key={index} className="flex flex-col gap-3 bg-muted/30 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
                <input
                type="text"
                placeholder="Part Name"
                value={part.name}
                onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                className="flex-1 p-2 border border-input rounded-md text-sm"
                disabled={isDisabled}
                />
                <input
                type="number"
                placeholder="Qty"
                value={part.quantity}
                onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value))}
                className="w-16 p-2 border border-input rounded-md text-sm"
                min="1"
                disabled={isDisabled}
                />
                <input
                type="number"
                placeholder="Price"
                value={part.price}
                onChange={(e) => handlePartChange(index, 'price', parseFloat(e.target.value))}
                className="w-24 p-2 border border-input rounded-md text-sm"
                min="0"
                disabled={isDisabled}
                />
                
                {isApproved ? (
                  <div title="Approved by customer" className="text-green-500">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                ) : part.approvalStatus === 'Rejected' ? (
                  <div title={`Rejected by customer${part.rejectionReason ? ': ' + part.rejectionReason : ''}`} className="text-red-500 flex flex-col items-center">
                    <Trash2 className="w-5 h-5" />
                    {part.rejectionReason && <span className="text-[10px] italic">Rejected</span>}
                  </div>
                ) : (part.name && part.price > 0) ? (
                  <div title="Pending customer approval" className="text-yellow-500">
                    <Clock className="w-5 h-5" />
                  </div>
                ) : null}

                <button
                onClick={() => {
                  if (isDisabled) return;
                  handleRemovePart(index);
                }}
                disabled={isDisabled}
                className={`p-2 rounded-md ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                >
                <Trash2 className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex gap-4">
                {/* New Part Image */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">New Part:</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(index, e, 'new')}
                        disabled={isDisabled}
                        className="hidden"
                        id={`part-image-${index}`}
                    />
                    <label 
                        htmlFor={`part-image-${index}`} 
                        className={`cursor-pointer p-2 rounded-md flex items-center gap-2 text-xs ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
                        title="Upload New Part Image"
                    >
                        {part.imageFile || part.image ? (
                            <>
                                <ImageIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-500">Uploaded</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 text-gray-500" />
                                <span>Upload Photo</span>
                            </>
                        )}
                    </label>
                </div>

                {/* Old Part Image */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Old Part:</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(index, e, 'old')}
                        disabled={isDisabled}
                        className="hidden"
                        id={`part-old-image-${index}`}
                    />
                    <label 
                        htmlFor={`part-old-image-${index}`} 
                        className={`cursor-pointer p-2 rounded-md flex items-center gap-2 text-xs ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
                        title="Upload Old Part Image"
                    >
                        {part.oldImageFile || part.oldImage ? (
                            <>
                                <ImageIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-500">Uploaded</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 text-gray-500" />
                                <span>Upload Photo</span>
                            </>
                        )}
                    </label>
                </div>
            </div>
          </div>
        );
        })}
      </div>

      <div className="pt-4 border-t flex gap-4">
        <button
          onClick={() => handleSave(false)}
          disabled={loading || isCompleted}
          className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-lg transition-colors font-medium ${isCompleted ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-gray-700 hover:bg-gray-50 border-input'}`}
        >
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={loading || isCompleted}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg transition-colors font-medium ${isCompleted ? 'bg-green-600/50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {loading ? 'Completing...' : 'Confirm Inspection'}
        </button>
      </div>
    </div>
  );
};

export default InspectionPanel;
