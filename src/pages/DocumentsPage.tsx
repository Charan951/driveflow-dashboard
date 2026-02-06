import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Upload, Calendar, AlertTriangle, Plus } from 'lucide-react';
import { documents, vehicles } from '@/services/dummyData';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

const documentTypes = [
  { id: 'all', label: 'All' },
  { id: 'registration', label: 'Registration' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'puc', label: 'PUC' },
];

const DocumentsPage: React.FC = () => {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0].id);
  const [selectedType, setSelectedType] = useState('all');

  const filteredDocuments = documents.filter(doc => {
    const matchesVehicle = doc.vehicleId === selectedVehicle;
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesVehicle && matchesType;
  });

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleUpload = () => {
    toast.success('Document uploaded successfully!');
  };

  const handleDownload = (docName: string) => {
    toast.success(`Downloading ${docName}...`);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">Manage your vehicle documents</p>
        </div>
        <button
          onClick={handleUpload}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Vehicle Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {vehicles.map((vehicle) => (
          <button
            key={vehicle.id}
            onClick={() => setSelectedVehicle(vehicle.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
              selectedVehicle === vehicle.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {vehicle.make} {vehicle.model}
          </button>
        ))}
      </div>

      {/* Document Type Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {documentTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedType === type.id
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredDocuments.map((doc) => {
          const daysUntilExpiry = getDaysUntilExpiry(doc.expiryDate);
          const isExpiringSoon = daysUntilExpiry <= 30;
          const isExpired = daysUntilExpiry < 0;

          return (
            <motion.div
              key={doc.id}
              variants={staggerItem}
              className="bg-card rounded-2xl border border-border overflow-hidden card-hover"
            >
              {/* Preview */}
              <div className="relative h-32 bg-gradient-primary flex items-center justify-center">
                <FileText className="w-12 h-12 text-primary-foreground/50" />
                {(isExpiringSoon || isExpired) && (
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    isExpired ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    {isExpired ? 'Expired' : 'Expiring'}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1">{doc.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>Expires: {doc.expiryDate}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(doc.name)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Add New Document */}
        <motion.button
          variants={staggerItem}
          onClick={handleUpload}
          className="flex flex-col items-center justify-center h-full min-h-[200px] bg-muted/50 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <p className="font-medium text-foreground">Add Document</p>
          <p className="text-sm text-muted-foreground">Upload a new document</p>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default DocumentsPage;
