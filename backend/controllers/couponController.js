import Coupon from '../models/Coupon.js';
import { emitEntitySync } from '../utils/syncService.js';

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ valid: false, message: 'Coupon is not active' });
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired' });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ valid: false, message: 'Coupon usage limit reached' });
    }

    if (orderAmount !== undefined && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ 
        valid: false, 
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required` 
      });
    }

    let discountAmount = 0;
    if (orderAmount !== undefined) {
      discountAmount = (orderAmount * coupon.discountPercentage) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    }

    res.json({
      valid: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderAmount: coupon.minOrderAmount,
        description: coupon.description,
        discountAmount: discountAmount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { 
      code, 
      discountPercentage, 
      maxDiscountAmount, 
      minOrderAmount, 
      usageLimit, 
      validFrom, 
      validUntil, 
      isActive, 
      description 
    } = req.body;

    const missingFields = [];
    if (!code) missingFields.push('code');
    if (!discountPercentage) missingFields.push('discountPercentage');
    if (!validFrom) missingFields.push('validFrom');
    if (!validUntil) missingFields.push('validUntil');

    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }

    if (discountPercentage < 1 || discountPercentage > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 1 and 100' });
    }

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountPercentage,
      maxDiscountAmount: maxDiscountAmount || null,
      minOrderAmount: minOrderAmount || 0,
      usageLimit: usageLimit || null,
      usageCount: 0,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      isActive: isActive !== undefined ? isActive : true,
      description: description || ''
    });

    const createdCoupon = await coupon.save();
    emitEntitySync('coupon', 'created', createdCoupon);

    res.status(201).json(createdCoupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { 
      code, 
      discountPercentage, 
      maxDiscountAmount, 
      minOrderAmount, 
      usageLimit, 
      validFrom, 
      validUntil, 
      isActive, 
      description 
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (code !== undefined) {
      const existingCoupon = await Coupon.findOne({ 
        code: code.toUpperCase(), 
        _id: { $ne: req.params.id } 
      });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
      coupon.code = code.toUpperCase();
    }

    if (discountPercentage !== undefined) {
      if (discountPercentage < 1 || discountPercentage > 100) {
        return res.status(400).json({ message: 'Discount percentage must be between 1 and 100' });
      }
      coupon.discountPercentage = discountPercentage;
    }

    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount || null;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount || 0;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit || null;
    if (validFrom !== undefined) coupon.validFrom = new Date(validFrom);
    if (validUntil !== undefined) coupon.validUntil = new Date(validUntil);
    if (isActive !== undefined) coupon.isActive = isActive;
    if (description !== undefined) coupon.description = description;

    const updatedCoupon = await coupon.save();
    emitEntitySync('coupon', 'updated', updatedCoupon);

    res.json(updatedCoupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const couponId = coupon._id;
    await coupon.deleteOne();
    emitEntitySync('coupon', 'deleted', { _id: couponId });

    res.json({ message: 'Coupon removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const incrementCouponUsage = async (couponId) => {
  try {
    const coupon = await Coupon.findById(couponId);
    if (coupon) {
      coupon.usageCount += 1;
      await coupon.save();
    }
  } catch (error) {
    console.error('Error incrementing coupon usage:', error);
  }
};
