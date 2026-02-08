import Product from '../models/Product.js';

// @desc    Get all products for the logged in merchant
// @route   GET /api/products
// @access  Private/Merchant
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ merchant: req.user._id });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Merchant
export const createProduct = async (req, res) => {
  const { name, category, price, quantity, threshold } = req.body;

  try {
    const product = new Product({
      merchant: req.user._id,
      name,
      category,
      price,
      quantity,
      threshold,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Merchant
export const updateProduct = async (req, res) => {
  const { name, category, price, quantity, threshold } = req.body;

  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      if (product.merchant.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized to update this product' });
      }

      product.name = name || product.name;
      product.category = category || product.category;
      product.price = price !== undefined ? price : product.price;
      product.quantity = quantity !== undefined ? quantity : product.quantity;
      product.threshold = threshold !== undefined ? threshold : product.threshold;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Merchant
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      if (product.merchant.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'Not authorized to delete this product' });
      }

      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get products by merchant ID (Admin)
// @route   GET /api/products/merchant/:merchantId
// @access  Private/Admin
export const getMerchantProducts = async (req, res) => {
  try {
    const products = await Product.find({ merchant: req.params.merchantId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all products (Admin)
// @route   GET /api/products/all
// @access  Private/Admin
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('merchant', 'name email');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
