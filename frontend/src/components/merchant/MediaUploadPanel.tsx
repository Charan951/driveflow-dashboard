import React, { useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface MediaUploadPanelProps {
  bookingId: string;
  onUploadComplete: () => void;
}

const MediaUploadPanel: React.FC<MediaUploadPanelProps> = ({ bookingId, onUploadComplete }) => {
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [isUploaded, setIsUploaded] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (type === 'before') {
        setBeforeImages(prev => [...prev, ...files]);
      } else {
        setAfterImages(prev => [...prev, ...files]);
      }
    }
  };

  const removeImage = (index: number, type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforeImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setAfterImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpload = () => {
    if (beforeImages.length === 0 || afterImages.length === 0) {
      toast.error('Please upload at least one image for both Before and After');
      return;
    }
    // Mock upload
    setTimeout(() => {
      setIsUploaded(true);
      onUploadComplete();
      toast.success('Service media uploaded successfully');
    }, 1000);
  };

  if (isUploaded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-800">Media Uploaded</h3>
        <p className="text-green-600">Service photos captured.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Service Media (Before & After)
        </h3>
        <button 
            onClick={handleUpload}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
            Save Media
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Before Service</h4>
          <div className="grid grid-cols-2 gap-2">
            {beforeImages.map((file, i) => (
              <div key={i} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <img src={URL.createObjectURL(file)} alt="Before" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(i, 'before')}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Add Photo</span>
              <input type="file" multiple accept="image/*" onChange={(e) => handleImageChange(e, 'before')} className="hidden" />
            </label>
          </div>
        </div>

        {/* After Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">After Service</h4>
          <div className="grid grid-cols-2 gap-2">
            {afterImages.map((file, i) => (
              <div key={i} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <img src={URL.createObjectURL(file)} alt="After" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(i, 'after')}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Add Photo</span>
              <input type="file" multiple accept="image/*" onChange={(e) => handleImageChange(e, 'after')} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadPanel;
