import Coupon from '../models/Coupon.js';
import { emitEntitySync } from '../utils/syncService.js';
import { isValidEmail, isValidPhone10 } from '../utils/validation.js';
import { mapCategoryToCouponServiceType } from '../utils/orderPricing.js';

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
    const { code, orderAmount, serviceType, email, mobile, serviceIds } = req.body;

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

    // Check service applicability and calculate discount amount
    let applicableAmount = orderAmount;

    if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
      const Service = (await import('../models/Service.js')).default;
      const services = await Service.find({ _id: { $in: serviceIds } }).lean();
      
      const isAllApplicable = coupon.applicableServices.includes('All');
      if (!isAllApplicable) {
        const applicableServicesList = services.filter(service => {
          const mappedCat = mapCategoryToCouponServiceType(service.category);
          return coupon.applicableServices.includes(mappedCat);
        });

        if (applicableServicesList.length === 0) {
          return res.status(400).json({ 
            valid: false, 
            message: `Coupon is not applicable for any of the selected services` 
          });
        }

        const applicableServicesTotal = applicableServicesList.reduce((sum, s) => sum + s.price, 0);
        const totalBasePrice = services.reduce((sum, s) => sum + s.price, 0);
        
        const prop = totalBasePrice > 0 ? (applicableServicesTotal / totalBasePrice) : 0;
        applicableAmount = orderAmount * prop;
      }
    } else if (serviceType && coupon.applicableServices && coupon.applicableServices.length > 0) {
      const isAllApplicable = coupon.applicableServices.includes('All');
      if (!isAllApplicable && !coupon.applicableServices.includes(serviceType)) {
        return res.status(400).json({ 
          valid: false, 
          message: `Coupon is not applicable for ${serviceType}` 
        });
      }
    }

    // Check targeted users
    if (coupon.targetUsers && coupon.targetUsers.length > 0) {
      const isTargeted = coupon.targetUsers.some(user => 
        (email && user.email && user.email.toLowerCase() === email.toLowerCase()) ||
        (mobile && user.mobile && user.mobile === mobile)
      );
      if (!isTargeted) {
        return res.status(400).json({ 
          valid: false, 
          message: 'This coupon is only available for specific users' 
        });
      }
    }

    if (orderAmount !== undefined && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ 
        valid: false, 
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required` 
      });
    }

    let discountAmount = 0;
    if (orderAmount !== undefined) {
      discountAmount = (applicableAmount * coupon.discountPercentage) / 100;
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
      applicableServices,
      targetUsers,
      description 
    } = req.body;

    const missingFields = [];
    if (!code) missingFields.push('code');
    if (!discountPercentage) missingFields.push('discountPercentage');
    if (!maxDiscountAmount && maxDiscountAmount !== 0) missingFields.push('maxDiscountAmount');
    if (!minOrderAmount && minOrderAmount !== 0) missingFields.push('minOrderAmount');
    if (!usageLimit && usageLimit !== 0) missingFields.push('usageLimit');
    if (!validFrom) missingFields.push('validFrom');
    if (!validUntil) missingFields.push('validUntil');
    if (!description) missingFields.push('description');

    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
    }

    // Validate coupon code: only alphanumeric, underscores, and hyphens
    const couponCodeRegex = /^[A-Z0-9_-]+$/i;
    if (!couponCodeRegex.test(code)) {
      return res.status(400).json({ message: 'Please enter valid data' });
    }
    // Validate coupon code length
    if (code.length > 20) {
      return res.status(400).json({ message: 'Coupon code cannot exceed 20 characters' });
    }

    if (discountPercentage < 1 || discountPercentage > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 1 and 100' });
    }
    if (Number(maxDiscountAmount) < 0 || Number(maxDiscountAmount) > 999999) {
      return res.status(400).json({ message: 'Max discount must be between 0 and 999999' });
    }
    if (Number(minOrderAmount) < 0 || Number(minOrderAmount) > 999999) {
      return res.status(400).json({ message: 'Min order amount must be between 0 and 999999' });
    }
    if (Number(usageLimit) < 1 || Number(usageLimit) > 999999) {
      return res.status(400).json({ message: 'Usage limit must be between 1 and 999999' });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ message: 'Description cannot exceed 500 characters' });
    }
    const descriptionRegex = /^[\w\s.,!?'"()-]*$/;
    if (!descriptionRegex.test(description)) {
      return res.status(400).json({ message: 'Please enter valid data' });
    }
    // Validate target users
    if (targetUsers && Array.isArray(targetUsers)) {
      for (const user of targetUsers) {
        if (user.email) {
          if (user.email.length > 100) {
            return res.status(400).json({ message: 'Email cannot exceed 100 characters' });
          }
          if (!isValidEmail(user.email).valid) {
            return res.status(400).json({ message: 'Please enter valid email address' });
          }
        }
        if (user.mobile) {
          if (!isValidPhone10(user.mobile)) {
            return res.status(400).json({ message: 'Please enter valid 10-digit mobile number' });
          }
        }
      }
    }
    // Validate date ranges
    const maxDate = new Date('2999-12-31');
    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);
    if (validFromDate > maxDate) {
      return res.status(400).json({ message: 'Valid From date cannot exceed 2999-12-31' });
    }
    if (validUntilDate > maxDate) {
      return res.status(400).json({ message: 'Valid Until date cannot exceed 2999-12-31' });
    }

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountPercentage,
      maxDiscountAmount: Number(maxDiscountAmount),
      minOrderAmount: Number(minOrderAmount),
      usageLimit: usageLimit || null,
      usageCount: 0,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      isActive: isActive !== undefined ? isActive : true,
      applicableServices: applicableServices || ['All'],
      targetUsers: targetUsers || [],
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
      applicableServices,
      targetUsers,
      description 
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    if (code !== undefined) {
      // Validate coupon code: only alphanumeric, underscores, and hyphens
      const couponCodeRegex = /^[A-Z0-9_-]+$/i;
      if (!couponCodeRegex.test(code)) {
        return res.status(400).json({ message: 'Please enter valid data' });
      }
      // Validate coupon code length
      if (code.length > 20) {
        return res.status(400).json({ message: 'Coupon code cannot exceed 20 characters' });
      }
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
    if (maxDiscountAmount !== undefined) {
      if (Number(maxDiscountAmount) < 0 || Number(maxDiscountAmount) > 999999) {
        return res.status(400).json({ message: 'Max discount must be between 0 and 999999' });
      }
      coupon.maxDiscountAmount = Number(maxDiscountAmount);
    }
    if (minOrderAmount !== undefined) {
      if (Number(minOrderAmount) < 0 || Number(minOrderAmount) > 999999) {
        return res.status(400).json({ message: 'Min order amount must be between 0 and 999999' });
      }
      coupon.minOrderAmount = Number(minOrderAmount);
    }
    if (usageLimit !== undefined) {
      if (Number(usageLimit) < 1 || Number(usageLimit) > 999999) {
        return res.status(400).json({ message: 'Usage limit must be between 1 and 999999' });
      }
      coupon.usageLimit = Number(usageLimit);
    }
    // Validate target users
    if (targetUsers !== undefined && Array.isArray(targetUsers)) {
      for (const user of targetUsers) {
        if (user.email) {
          if (user.email.length > 100) {
            return res.status(400).json({ message: 'Email cannot exceed 100 characters' });
          }
          if (!isValidEmail(user.email).valid) {
            return res.status(400).json({ message: 'Please enter valid email address' });
          }
        }
        if (user.mobile) {
          if (!isValidPhone10(user.mobile)) {
            return res.status(400).json({ message: 'Please enter valid 10-digit mobile number' });
          }
        }
      }
    }
    if (description !== undefined) {
      if (description && description.length > 500) {
        return res.status(400).json({ message: 'Description cannot exceed 500 characters' });
      }
      const descriptionRegex = /^[\w\s.,!?'"()-]*$/;
      if (!descriptionRegex.test(description)) {
        return res.status(400).json({ message: 'Please enter valid data' });
      }
    }
    if (validFrom !== undefined || validUntil !== undefined) {
      const maxDate = new Date('2999-12-31');
      const validFromDate = validFrom !== undefined ? new Date(validFrom) : coupon.validFrom;
      const validUntilDate = validUntil !== undefined ? new Date(validUntil) : coupon.validUntil;
      if (validFromDate > maxDate) {
        return res.status(400).json({ message: 'Valid From date cannot exceed 2999-12-31' });
      }
      if (validUntilDate > maxDate) {
        return res.status(400).json({ message: 'Valid Until date cannot exceed 2999-12-31' });
      }
    }
    if (validFrom !== undefined) coupon.validFrom = new Date(validFrom);
    if (validUntil !== undefined) coupon.validUntil = new Date(validUntil);
    if (isActive !== undefined) coupon.isActive = isActive;
    if (applicableServices !== undefined) coupon.applicableServices = applicableServices;
    if (targetUsers !== undefined) coupon.targetUsers = targetUsers;
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
