import User from '../models/User.js';
import Service from '../models/Service.js';

const getCategoryGroup = (serviceCategory) => {
  const cat = (serviceCategory || '').trim();
  if (cat === 'Car Wash' || cat === 'Wash') return 'Car Wash';
  if (cat === 'Tyres' || cat === 'Battery' || cat === 'Tyre & Battery') return 'Tyres & Battery';
  if (cat === 'Essentials') return 'Essentials';
  return 'General Services';
};

const merchantCategoryForGroup = (group) => {
  switch (group) {
    case 'Tyres & Battery':
      return ['battery', 'tires'];
    case 'General Services':
    case 'Car Wash':
    case 'Essentials':
    default:
      return ['general'];
  }
};

export async function validateAssignees(booking, assignees = {}) {
  const { merchantId, driverId, technicianId, carWashStaffId } = assignees;
  const errors = [];

  if (merchantId) {
    const merchant = await User.findById(merchantId);
    if (!merchant || merchant.role !== 'merchant') {
      errors.push('Invalid merchant assignment');
    } else if (!merchant.isApproved) {
      errors.push('Merchant is not approved');
    } else {
      const services = await Service.find({ _id: { $in: booking.services } }).lean();
      const groups = [...new Set(services.map((s) => getCategoryGroup(s.category)))];
      const merchantCats = Array.isArray(merchant.category) ? merchant.category : ['general'];

      const allowed = groups.every((group) => {
        const required = merchantCategoryForGroup(group);
        if (group === 'Tyres & Battery') {
          return merchantCats.some((c) => required.includes(c));
        }
        return merchantCats.includes('general') || required.every((r) => merchantCats.includes(r));
      });

      if (!allowed) {
        errors.push('Merchant is not authorized for this booking service category');
      }
    }
  }

  if (driverId) {
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'staff' || driver.subRole !== 'Driver') {
      errors.push('Invalid driver assignment');
    } else if (!driver.isApproved) {
      errors.push('Driver is not approved');
    }
  }

  if (technicianId) {
    const technician = await User.findById(technicianId);
    if (!technician || technician.role !== 'staff') {
      errors.push('Invalid technician assignment');
    } else if (!technician.isApproved) {
      errors.push('Technician is not approved');
    }
  }

  if (carWashStaffId) {
    const staff = await User.findById(carWashStaffId);
    if (!staff || staff.role !== 'staff') {
      errors.push('Invalid car wash staff assignment');
    } else if (!staff.isApproved) {
      errors.push('Car wash staff is not approved');
    }
  }

  return errors;
}
