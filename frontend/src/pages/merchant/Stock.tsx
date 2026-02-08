import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Minus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getProducts, createProduct, updateProduct } from '@/services/productService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

interface StockItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  threshold: number;
}

const DEFAULT_CATEGORIES = ['Batteries', 'Tires', 'Consumables'];

const Stock: React.FC = () => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // New Item State
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    customCategory: '',
    price: '',
    quantity: '',
    threshold: '5',
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setItems(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [toast]);

  const updateQuantity = async (id: string, delta: number) => {
    const item = items.find(i => i._id === id);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + delta);
    
    // Optimistic update
    setItems(prev => prev.map(i => 
      i._id === id ? { ...i, quantity: newQuantity } : i
    ));

    try {
      await updateProduct(id, { quantity: newQuantity });
    } catch (error) {
      // Revert if failed
      setItems(prev => prev.map(i => 
        i._id === id ? item : i
      ));
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.quantity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const categoryToUse = newItem.category === 'other' ? newItem.customCategory : newItem.category;

    if (!categoryToUse) {
      toast({
        title: "Validation Error",
        description: "Please select or enter a category",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData = {
        name: newItem.name,
        category: categoryToUse,
        price: Number(newItem.price),
        quantity: Number(newItem.quantity),
        threshold: Number(newItem.threshold),
      };

      const createdProduct = await createProduct(productData);
      setItems(prev => [...prev, createdProduct]);
      setIsAddDialogOpen(false);
      setNewItem({
        name: '',
        category: '',
        customCategory: '',
        price: '',
        quantity: '',
        threshold: '5',
      });
      toast({
        title: "Success",
        description: "Product added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    }
  };

  const getStatus = (quantity: number, threshold: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (quantity <= threshold) return { label: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { label: 'Available', color: 'text-green-600 bg-green-100' };
  };

  // Extract unique categories from items + default ones
  const allCategories = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...items.map(item => item.category)
  ]));

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || item.category === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="all">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Stock Item</DialogTitle>
                <DialogDescription>
                  Add a new item to your inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newItem.category}
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Create New Category...</SelectItem>
                    </SelectContent>
                  </Select>
                  {newItem.category === 'other' && (
                    <Input
                      placeholder="Enter new category name"
                      value={newItem.customCategory}
                      onChange={(e) => setNewItem({ ...newItem, customCategory: e.target.value })}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="threshold">Low Stock Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    value={newItem.threshold}
                    onChange={(e) => setNewItem({ ...newItem, threshold: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No items found. Add some stock to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const status = getStatus(item.quantity, item.threshold);
            
            return (
              <motion.div
                key={item._id}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${
                    item.category === 'Batteries' ? 'bg-blue-100 text-blue-600' :
                    item.category === 'Tires' ? 'bg-gray-100 text-gray-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                  <p className="font-medium text-gray-900">₹{item.price}</p>
                </div>

                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <button
                    onClick={() => updateQuantity(item._id, -1)}
                    className="p-1 hover:bg-white rounded-md shadow-sm transition-colors text-gray-600 disabled:opacity-50"
                    disabled={item.quantity === 0}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-mono font-medium text-lg w-12 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item._id, 1)}
                    className="p-1 hover:bg-white rounded-md shadow-sm transition-colors text-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Stock;
