import mongoose from 'mongoose';

const MAX_CONSECUTIVE_CHARS = 10;

const hasExcessiveRepeatedChars = (str) => {
  if (!str) return false;
  const regex = new RegExp(`(.)\\1{${MAX_CONSECUTIVE_CHARS},}`, 'g');
  return regex.test(str);
};

const nameValidator = {
  validator: function(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 100) return false;
    if (hasExcessiveRepeatedChars(trimmed)) return false;
    return /^[a-zA-Z0-9][a-zA-Z0-9\s'&-]*$/.test(trimmed);
  },
  message: 'Product name is invalid'
};

const productSchema = new mongoose.Schema({
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Merchant is required'],
    ref: 'User',
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    validate: nameValidator,
    maxlength: [100, 'Product name cannot exceed 100 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    default: 0,
    min: [0, 'Price cannot be negative'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    default: 0,
    min: [0, 'Quantity cannot be negative'],
  },
  threshold: {
    type: Number,
    required: [true, 'Threshold is required'],
    default: 5,
    min: [1, 'Threshold must be at least 1'],
  },
}, {
  timestamps: true,
});

const Product = mongoose.model('Product', productSchema);

export default Product;
