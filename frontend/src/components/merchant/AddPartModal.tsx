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
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
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
        className="bg-card rounded-xl shadow-2xl w-full max-w-md"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Add Additional Part</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <input
            type="text"
            placeholder="Part Name"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
              min="1"
            />
            <input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              className="w-full p-2 border rounded-md"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Part Image (Optional)</label>
            <label className="cursor-pointer p-4 border-2 border-dashed rounded-md flex flex-col items-center justify-center hover:border-primary/50">
              {imageFile ? (
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-500">{imageFile.name}</span>
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