import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Upload, Calendar, AlertTriangle, Plus } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';
import { documentService, DocumentData } from '@/services/documentService';
import { vehicleService, Vehicle } from '@/services/vehicleService';

const documentTypes = [
  { id: 'all', label: 'All' },
  { id: 'rc', label: 'Registration' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'puc', label: 'PUC' },
  { id: 'invoice', label: 'Invoices' },
  { id: 'warranty', label: 'Warranty' },
];

const DocumentsPage: React.FC = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedType, setSelectedType] = useState('all');
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [docsData, vehiclesData] = await Promise.all([
        documentService.getAllDocuments(),
        vehicleService.getVehicles()
      ]);
      setDocuments(docsData);
      setVehicles(vehiclesData);
      if (vehiclesData.length > 0) {
        setSelectedVehicle(vehiclesData[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesVehicle = selectedVehicle ? doc.vehicleId === selectedVehicle : true;
    const matchesType = selectedType === 'all' || doc.type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesVehicle && matchesType;
  });

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return 100; // Safe default
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleUpload = () => {
    // In a real app, this would open a file picker or modal
    toast.info('Document upload feature coming soon!');
  };

  const handleDownload = (docName: string, url: string) => {
    // In a real app, this would trigger a download
    // window.open(url, '_blank');
    toast.success(`Downloading ${docName}...`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

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
      {vehicles.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {vehicles.map((vehicle) => (
            <button
              key={vehicle._id}
              onClick={() => setSelectedVehicle(vehicle._id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
                selectedVehicle === vehicle._id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {vehicle.make} {vehicle.model}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-muted/50 rounded-xl text-center text-muted-foreground">
          No vehicles found. Add a vehicle to manage documents.
        </div>
      )}

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
      {filteredDocuments.length > 0 ? (
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
                key={doc._id}
                variants={staggerItem}
                className="bg-card rounded-2xl border border-border overflow-hidden card-hover"
              >
                {/* Preview */}
                <div className="relative h-32 bg-gradient-primary flex items-center justify-center">
                  <FileText className="w-12 h-12 text-primary-foreground/50" />
                  {doc.expiryDate && (isExpiringSoon || isExpired) && (
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
                  {doc.expiryDate ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                    </div>
                  ) : (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>Date: {new Date(doc.date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors">
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(doc.name, doc.url)}
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
      ) : (
         <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No documents found</h3>
            <p className="text-muted-foreground">Upload documents or select another category.</p>
             <button
              onClick={handleUpload}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Upload Document
            </button>
          </div>
      )}
    </div>
  );
};

export default DocumentsPage;
