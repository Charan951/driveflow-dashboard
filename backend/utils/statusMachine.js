const ALIAS_TO_CANON = {
  REQUESTED: 'CREATED',
  ASSIGNED: 'ASSIGNED',

  ON_THE_WAY_TO_CUSTOMER: 'ACCEPTED',
  NEAR_CUSTOMER: 'REACHED_CUSTOMER',
  REACHED_PICKUP: 'REACHED_CUSTOMER',
  VEHICLE_PICKED_UP: 'VEHICLE_PICKED',
  REACHED_GARAGE: 'REACHED_MERCHANT',
  IN_SERVICE: 'SERVICE_STARTED',
  SERVICE_COMPLETED: 'SERVICE_COMPLETED',
  RETURNING_TO_CUSTOMER: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
};

const CANON_TRANSITIONS = {
  CREATED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['REACHED_CUSTOMER', 'CANCELLED'],
  REACHED_CUSTOMER: ['VEHICLE_PICKED', 'CAR_WASH_STARTED', 'CANCELLED'], // Car wash can start directly at customer location
  VEHICLE_PICKED: ['REACHED_MERCHANT', 'CANCELLED'],
  REACHED_MERCHANT: ['SERVICE_STARTED', 'CANCELLED'],
  SERVICE_STARTED: ['SERVICE_COMPLETED', 'CANCELLED'],
  SERVICE_COMPLETED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: [],
  // Car wash specific transitions
  CAR_WASH_STARTED: ['CAR_WASH_COMPLETED', 'CANCELLED'],
  CAR_WASH_COMPLETED: ['DELIVERED', 'CANCELLED'],
};

export const normalizeStatus = (status) => {
  if (!status) return null;
  if (Object.prototype.hasOwnProperty.call(CANON_TRANSITIONS, status)) return status;
  return ALIAS_TO_CANON[status] || null;
};

export const isValidTransition = (from, to) => {
  if (!from || !to) return false;
  if (!CANON_TRANSITIONS[from]) return false;
  if (from === to) return true;
  return CANON_TRANSITIONS[from].includes(to);
};

export const v2FromCanon = (canon) => {
  const entries = Object.entries(ALIAS_TO_CANON);
  const v2 = entries.find(([k, v]) => v === canon && ['REQUESTED','ASSIGNED','ACCEPTED','ON_THE_WAY_TO_CUSTOMER','NEAR_CUSTOMER','REACHED_PICKUP','VEHICLE_PICKED_UP','AT_SERVICE_CENTER','IN_SERVICE','SERVICE_COMPLETED','RETURNING_TO_CUSTOMER','DELIVERED'].includes(k));
  return v2 ? v2[0] : canon;
};
