// Utility functions for service type checking

export const isPaymentRequiredService = (services: any[]): boolean => {
  return Array.isArray(services) && services.some(service => 
    typeof service === 'object' && (
      service.category === 'Car Wash' || 
      service.category === 'Wash' ||
      service.category === 'Essentials' ||
      service.category === 'Battery' ||
      service.category === 'Tyres' ||
      service.category === 'Tyre & Battery'
    )
  );
};

export const isCarWashService = (services: any[]): boolean => {
  return Array.isArray(services) && services.some(service => 
    typeof service === 'object' && (
      service.category === 'Car Wash' || 
      service.category === 'Wash' ||
      service.category === 'Essentials'
    )
  );
};

export const isBatteryService = (services: any[]): boolean => {
  return Array.isArray(services) && services.some(service => 
    typeof service === 'object' && (
      service.category === 'Battery' ||
      service.category === 'Tyre & Battery'
    )
  );
};

export const isTireService = (services: any[]): boolean => {
  return Array.isArray(services) && services.some(service => 
    typeof service === 'object' && (
      service.category === 'Tyres' ||
      service.category === 'Tyre & Battery'
    )
  );
};

export const isBatteryOrTireService = (services: any[]): boolean => {
  return Array.isArray(services) && services.some(service => 
    typeof service === 'object' && (
      service.category === 'Battery' ||
      service.category === 'Tyres' ||
      service.category === 'Tyre & Battery'
    )
  );
};

export const getServiceTypeName = (services: any[]): string => {
  if (isCarWashService(services)) return 'Car Wash';
  if (isBatteryOrTireService(services)) return 'Battery/Tire';
  if (isBatteryService(services)) return 'Battery';
  if (isTireService(services)) return 'Tire';
  return 'Service';
};
