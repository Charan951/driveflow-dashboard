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

export type BookingStatus = (typeof PICKUP_FLOW_ORDER[number]) | (typeof CAR_WASH_FLOW_ORDER[number]) | (typeof NO_PICKUP_FLOW_ORDER[number]) | 'COMPLETED';

export const STATUS_LABELS: Record<BookingStatus, string> = {
  CREATED: 'Created',
  ASSIGNED: 'Assigned',
  REACHED_CUSTOMER: 'Reached Customer',
  VEHICLE_PICKED: 'Vehicle Picked',
  REACHED_MERCHANT: 'Reached Merchant',
  SERVICE_STARTED: 'Service Started',
  SERVICE_COMPLETED: 'Service Completed',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  MERCHANT_INSPECTION: 'Inspecting',
  PENDING_APPROVAL: 'Waiting for Approval',
  ACCEPTED: 'Accepted',
  // Car wash specific statuses
  CAR_WASH_STARTED: 'Car Wash Started',
  CAR_WASH_COMPLETED: 'Car Wash Completed',
};
