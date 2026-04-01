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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Stock Monitoring</h1>
        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium">
            Total Inventory Value: ₹{stats.totalValue.toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Items</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.totalItems}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Low Stock Alerts</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.lowStock}</h3>
            </div>
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
              <AlertTriangle size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 sm:col-span-2 md:col-span-1"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Out of Stock</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mt-1">{stats.outOfStock}</h3>
            </div>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search product or merchant..."
            className="w-full pl-10 pr-4 py-2 text-sm md:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <Filter size={18} className="text-gray-400 shrink-0" />
          <select
            className="border border-gray-200 rounded-lg px-3 md:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

      {/* Stock View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile View: Card Layout */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredProducts.map((product) => (
            <div key={product._id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-800 text-sm truncate">{product.name}</h3>
                  <p className="text-[10px] text-gray-500">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹{product.price}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Stock Level</span>
                    <span className={`text-[10px] font-medium ${
                      product.quantity <= product.threshold ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {product.quantity} items
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        product.quantity === 0 ? 'bg-red-500' :
                        product.quantity <= product.threshold ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (product.quantity / (product.threshold * 3)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                {product.quantity <= product.threshold && (
                  <button
                    onClick={() => handleNotifyMerchant(product.merchant?._id, product.name)}
                    className="p-2 text-yellow-600 bg-yellow-50 rounded-lg border border-yellow-100 shrink-0"
                  >
                    <Bell size={16} />
                  </button>
                )}
              </div>

              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">Merchant</span>
                  <span className="font-medium text-gray-700">{product.merchant?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-400">{product.merchant?.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
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
