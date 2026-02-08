import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, FileText, Download, ExternalLink } from 'lucide-react';
import { documentService, DocumentData } from '../../services/documentService';
import { toast } from 'react-hot-toast';

const AdminDocumentsPage = () => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await documentService.getAllDocuments();
      setDocuments(data);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesType = filterType === 'All' || doc.type === filterType;
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.entityName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleViewDocument = (url: string) => {
    if (url.startsWith('http') || url.startsWith('/')) {
        // If it's a relative path like /api/..., prepend backend URL if needed, 
        // but typically /api is proxied or absolute in dev.
        // Assuming relative paths work with proxy or absolute URL needed
        const fullUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
        window.open(fullUrl, '_blank');
    } else {
        toast.error('Invalid document URL');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Document Center</h1>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
            Total Documents: {documents.length}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, owner, or vehicle..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={20} className="text-gray-400" />
          <select
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Invoice">Invoices</option>
            <option value="Insurance">Insurance</option>
            <option value="Registration">Registration</option>
            <option value="Battery Warranty">Battery Warranty</option>
            <option value="Tire Warranty">Tire Warranty</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Document Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Related To</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Owner</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocuments.map((doc) => (
                <tr key={doc._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <span className="font-medium text-gray-800">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium
                      ${doc.type === 'Invoice' ? 'bg-green-100 text-green-800' :
                        doc.type === 'Insurance' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-medium">{doc.entityName}</div>
                    <div className="text-xs text-gray-500">{doc.entityType}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.owner}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(doc.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewDocument(doc.url)}
                      className="text-gray-400 hover:text-blue-600 transition-colors flex items-center space-x-1"
                      title="View Document"
                    >
                      <ExternalLink size={18} />
                      <span className="text-sm">View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDocuments.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No documents found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDocumentsPage;
