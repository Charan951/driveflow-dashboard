import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'merchant', 'staff'],
    default: 'customer',
  },
  subRole: {
    type: String,
    enum: ['Driver', 'Technician', 'Support', 'Manager', null],
    default: null,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave'],
    default: 'Active',
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
 rejectionReason: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
