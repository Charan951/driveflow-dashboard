import React, { useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService } from '../../services/bookingService';
import { uploadService } from '../../services/uploadService';

interface MediaUploadPanelProps {
  bookingId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  booking?: any; 
  onUploadComplete: () => void;
}

const MediaUploadPanel: React.FC<MediaUploadPanelProps> = ({ bookingId, booking, onUploadComplete }) => {
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [duringImages, setDuringImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  
  // State for existing images (URLs)
  const [existingBefore, setExistingBefore] = useState<string[]>(booking?.serviceExecution?.beforePhotos || []);
  const [existingDuring, setExistingDuring] = useState<string[]>(booking?.serviceExecution?.duringPhotos || []);
  const [existingAfter, setExistingAfter] = useState<string[]>(booking?.serviceExecution?.afterPhotos || []);

  const [isUploaded, setIsUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'during' | 'after') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (type === 'before') {
        setBeforeImages(prev => [...prev, ...files]);
      } else if (type === 'during') {
        setDuringImages(prev => [...prev, ...files]);
      } else {
        setAfterImages(prev => [...prev, ...files]);
      }
    }
  };

  const removeImage = (index: number, type: 'before' | 'during' | 'after') => {
    if (type === 'before') {
      setBeforeImages(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'during') {
        setDuringImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setAfterImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Logic to remove existing images (not actually deleting from server, just removing from current view/update)
  const removeExistingImage = (index: number, type: 'before' | 'during' | 'after') => {
    if (type === 'before') {
        setExistingBefore(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'during') {
        setExistingDuring(prev => prev.filter((_, i) => i !== index));
    } else {
        setExistingAfter(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpload = async () => {
    if (beforeImages.length === 0 && duringImages.length === 0 && afterImages.length === 0 && 
        existingBefore.length === booking?.serviceExecution?.beforePhotos?.length &&
        existingDuring.length === booking?.serviceExecution?.duringPhotos?.length &&
        existingAfter.length === booking?.serviceExecution?.afterPhotos?.length) {
      toast.info('No changes to save');
      return;
    }
    
    setLoading(true);
    try {
        let newBeforeUrls: string[] = [];
        let newDuringUrls: string[] = [];
        let newAfterUrls: string[] = [];

        // Upload new files
        if (beforeImages.length > 0) {
            const res = await uploadService.uploadFiles(beforeImages);
            newBeforeUrls = res.files.map((f: any) => f.url);
        }
        if (duringImages.length > 0) {
            const res = await uploadService.uploadFiles(duringImages);
            newDuringUrls = res.files.map((f: any) => f.url);
        }
        if (afterImages.length > 0) {
            const res = await uploadService.uploadFiles(afterImages);
            newAfterUrls = res.files.map((f: any) => f.url);
        }
        
        const finalBefore = [...existingBefore, ...newBeforeUrls];
        const finalDuring = [...existingDuring, ...newDuringUrls];
        const finalAfter = [...existingAfter, ...newAfterUrls];
        
        await bookingService.updateBookingDetails(bookingId, {
            serviceExecution: {
                beforePhotos: finalBefore,
                duringPhotos: finalDuring,
                afterPhotos: finalAfter
            }
        });

        // Update existing state
        setExistingBefore(finalBefore);
        setExistingDuring(finalDuring);
        setExistingAfter(finalAfter);
        setBeforeImages([]);
        setDuringImages([]);
        setAfterImages([]);

        setIsUploaded(true);
        onUploadComplete();
        toast.success('Service media updated successfully');
    } catch (error) {
        console.error(error);
        toast.error('Failed to upload media');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Service Media
        </h3>
        <button 
            onClick={handleUpload}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
            {loading ? 'Saving...' : 'Save Media'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Before Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Before Service</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Existing Images */}
            {existingBefore.map((url, i) => (
                <div key={`existing-before-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    <img src={url} alt={`Before ${i}`} className="w-full h-full object-cover" />
                    <button
                        onClick={() => removeExistingImage(i, 'before')}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
            {/* New Images */}
            {beforeImages.map((file, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i, 'before')}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
              <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">Add Photo</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageChange(e, 'before')} />
            </label>
          </div>
        </div>

        {/* During Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">During Service</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Existing Images */}
            {existingDuring.map((url, i) => (
                <div key={`existing-during-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    <img src={url} alt={`During ${i}`} className="w-full h-full object-cover" />
                    <button
                        onClick={() => removeExistingImage(i, 'during')}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
            {/* New Images */}
            {duringImages.map((file, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i, 'during')}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
              <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">Add Photo</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageChange(e, 'during')} />
            </label>
          </div>
        </div>

        {/* After Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">After Service</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Existing Images */}
            {existingAfter.map((url, i) => (
                <div key={`existing-after-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    <img src={url} alt={`After ${i}`} className="w-full h-full object-cover" />
                    <button
                        onClick={() => removeExistingImage(i, 'after')}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
            {/* New Images */}
            {afterImages.map((file, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i, 'after')}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
              <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">Add Photo</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageChange(e, 'after')} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadPanel;
