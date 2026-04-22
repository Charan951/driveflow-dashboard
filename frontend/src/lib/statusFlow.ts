export const PICKUP_FLOW_ORDER = [
  'CREATED',
  'ASSIGNED',
  'REACHED_CUSTOMER',
  'VEHICLE_PICKED',
  'REACHED_MERCHANT',
  'SERVICE_STARTED',
  'SERVICE_COMPLETED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
] as const;

export const CAR_WASH_FLOW_ORDER = [
  'CREATED',
  'ASSIGNED',
  'REACHED_CUSTOMER',
  'CAR_WASH_STARTED',
  'CAR_WASH_COMPLETED',
  'DELIVERED'
] as const;

export const BATTERY_TIRE_FLOW_ORDER = [
  'CREATED',
  'ASSIGNED',
  'STAFF_REACHED_MERCHANT',
  'PICKUP_BATTERY_TIRE',
  'REACHED_CUSTOMER',
  'INSTALLATION',
  'DELIVERY',
  'COMPLETED'
] as const;

export const NO_PICKUP_FLOW_ORDER = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'MERCHANT_INSPECTION',
  'PENDING_APPROVAL',
  'SERVICE_STARTED',
  'SERVICE_COMPLETED',
  'DELIVERED'
] as const;

export type BookingStatus = (typeof PICKUP_FLOW_ORDER[number]) | (typeof CAR_WASH_FLOW_ORDER[number]) | (typeof NO_PICKUP_FLOW_ORDER[number]) | (typeof BATTERY_TIRE_FLOW_ORDER[number]) | 'COMPLETED' | 'ACCEPTED';

export const STATUS_LABELS: Record<BookingStatus, string> = {
  CREATED: 'Created',
  ASSIGNED: 'Assigned',
  REACHED_CUSTOMER: 'Reached Customer',
  VEHICLE_PICKED: 'Vehicle Picked',
  REACHED_MERCHANT: 'Reached Merchant',
  SERVICE_STARTED: 'Service Started',
  SERVICE_COMPLETED: 'Service is completed',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  MERCHANT_INSPECTION: 'Inspecting',
  PENDING_APPROVAL: 'Waiting for Approval',
  ACCEPTED: 'Accepted',
  // Car wash specific statuses
  CAR_WASH_STARTED: 'Car Wash Started',
  CAR_WASH_COMPLETED: 'Car Wash Completed',
  // Battery and Tire specific statuses
  STAFF_REACHED_MERCHANT: 'Staff Reached Merchant',
  PICKUP_BATTERY_TIRE: 'Pickup Battery/Tire',
  INSTALLATION: 'Installation',
  DELIVERY: 'Delivery',
};

export const getFlowForService = (services: any[]): readonly BookingStatus[] => {
  if (!Array.isArray(services) || services.length === 0) {
    return PICKUP_FLOW_ORDER; // Default fallback
  }

  // Check if it's a car wash service
  const isCarWash = services.some(service => {
    if (!service || typeof service !== 'object' || !service.category) return false;
    const cat = service.category.toLowerCase();
    return cat.includes('car wash') || cat.includes('wash');
  });

  // Check if it's a battery or tire service
  const isBatteryOrTire = services.some(service => {
    if (!service || typeof service !== 'object' || !service.category) return false;
    const cat = service.category.toLowerCase();
    return cat.includes('battery') || cat.includes('tire') || cat.includes('tyre');
  });

  if (isCarWash) {
    return CAR_WASH_FLOW_ORDER;
  } else if (isBatteryOrTire) {
    return BATTERY_TIRE_FLOW_ORDER;
  } else {
    // Determine if it's a pickup service based on category
    // Categories that typically require vehicle pickup:
    const pickupCategories = ['Services', 'Periodic', 'Repair', 'Painting', 'Denting', 'AC', 'Detailing'];
    
    // Categories that are typically done at merchant location (no pickup):
    const noPickupCategories = ['Insurance', 'Accessories', 'Other'];
    
    const hasPickupService = services.some(service => 
      typeof service === 'object' && pickupCategories.includes(service.category)
    );
    
    const hasNoPickupService = services.some(service => 
      typeof service === 'object' && noPickupCategories.includes(service.category)
    );
    
    // If mixed services, prioritize pickup workflow for safety
    if (hasPickupService || (!hasPickupService && !hasNoPickupService)) {
      return PICKUP_FLOW_ORDER;
    } else {
      return NO_PICKUP_FLOW_ORDER;
    }
  }
};
