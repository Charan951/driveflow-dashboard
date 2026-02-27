import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Package, AlertTriangle, Bell, TrendingUp } from 'lucide-react';
import { getAllProducts } from '../../services/productService';
import { toast } from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  threshold: number;
  price: number;
  merchant?: {
    _id: string;
    name: string;
    email: string;
  };
}

const AdminStockPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.merchant?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    totalItems: products.reduce((sum, p) => sum + p.quantity, 0),
    lowStock: products.filter(p => p.quantity <= p.threshold).length,
    outOfStock: products.filter(p => p.quantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0),
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  const handleNotifyMerchant = (merchantId: string, productName: string) => {
    toast.success(`Notification sent to merchant for low stock: ${productName}`);
    // Implement actual notification logic here
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
        <h1 className="text-2xl font-bold text-gray-800">Stock Monitoring</h1>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
            Total Inventory Value: ₹{stats.totalValue.toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalItems}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.lowStock}</h3>
            </div>
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
              <AlertTriangle size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.outOfStock}</h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search product or merchant..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={20} className="text-gray-400" />
          <select
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Product</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Category</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Merchant</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Stock Level</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Price</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-medium">{product.merchant?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{product.merchant?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            product.quantity === 0 ? 'bg-red-500' :
                            product.quantity <= product.threshold ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (product.quantity / (product.threshold * 3)) * 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium ${
                        product.quantity <= product.threshold ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {product.quantity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    ₹{product.price}
                  </td>
                  <td className="px-6 py-4">
                    {product.quantity <= product.threshold && (
                      <button
                        onClick={() => handleNotifyMerchant(product.merchant?._id, product.name)}
                        className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center space-x-1"
                        title="Notify Merchant"
                      >
                        <Bell size={16} />
                        <span>Alert</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No stock items found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStockPage;
