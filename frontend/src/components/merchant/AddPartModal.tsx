import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { uploadService } from '@/services/uploadService';
import { createApproval } from '@/services/approvalService';

interface AddPartModalProps {
  bookingId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const AddPartModal: React.FC<AddPartModalProps> = ({ bookingId, onClose, onUpdate }) => {
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files (JPEG, PNG, WEBP, etc.) are allowed for part photos.');
        e.target.value = '';
        return;
      }
      setImageFile(file);
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!partName || price <= 0) {
      toast.error('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const res = await uploadService.uploadFile(imageFile);
        imageUrl = res.url;
      }

      await createApproval({
        type: 'PartReplacement',
        relatedId: bookingId,
        relatedModel: 'Booking',
        data: {
          name: partName,
          price: price,
          quantity: quantity,
          image: imageUrl,
        },
      });

      toast.success('Part approval request sent.');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to send approval request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-card rounded-xl shadow-2xl w-full max-w-md min-w-0 overflow-hidden"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Add Additional Part</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 min-w-0">
          <div className="min-w-0">
            <label htmlFor="add-part-name" className="text-sm font-medium mb-1.5 block">
              Part Name
            </label>
            <textarea
              id="add-part-name"
              rows={2}
              placeholder="Enter part name"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              className="w-full min-w-0 max-w-full box-border p-2 border rounded-md bg-background resize-y min-h-[2.75rem] max-h-32 overflow-auto break-words"
            />
          </div>
          <div className="flex gap-4 min-w-0">
            <div className="flex-1 min-w-0">
              <label htmlFor="add-part-quantity" className="text-sm font-medium mb-1.5 block">
                Quantity
              </label>
              <input
                id="add-part-quantity"
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full min-w-0 max-w-full box-border p-2 border rounded-md"
                min="1"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="add-part-price" className="text-sm font-medium mb-1.5 block">
                Price
              </label>
              <input
                id="add-part-price"
                type="number"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full min-w-0 max-w-full box-border p-2 border rounded-md"
                min="0"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="text-sm font-medium mb-1.5 block">Part Image (Optional)</label>
            <label className="cursor-pointer p-4 border-2 border-dashed rounded-md flex flex-col items-center justify-center hover:border-primary/50 min-w-0 overflow-hidden">
              {imageFile ? (
                <div className="flex items-center gap-2 min-w-0 max-w-full">
                  <ImageIcon className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm font-medium text-green-500 truncate">{imageFile.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Click to upload</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send for Approval'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddPartModal;