export const PICKUP_FLOW_ORDER = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'REACHED_CUSTOMER',
  'VEHICLE_PICKED',
  'REACHED_MERCHANT',
  'VEHICLE_AT_MERCHANT',
  'SERVICE_STARTED',
  'SERVICE_COMPLETED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
] as const;

export const NO_PICKUP_FLOW_ORDER = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'VEHICLE_AT_MERCHANT',
  'SERVICE_STARTED',
  'SERVICE_COMPLETED',
  'DELIVERED'
] as const;

export type BookingStatus = (typeof PICKUP_FLOW_ORDER[number]) | (typeof NO_PICKUP_FLOW_ORDER[number]) | 'COMPLETED';

export const STATUS_LABELS: Record<BookingStatus, string> = {
  CREATED: 'Created',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  REACHED_CUSTOMER: 'Reached Customer',
  VEHICLE_PICKED: 'Vehicle Picked',
  REACHED_MERCHANT: 'Reached Merchant',
  VEHICLE_AT_MERCHANT: 'At Merchant',
  SERVICE_STARTED: 'Service Started',
  SERVICE_COMPLETED: 'Service Completed',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed'
};
