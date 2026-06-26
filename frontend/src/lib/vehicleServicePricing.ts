import type { Service } from '@/services/serviceService';

export type VehicleReferenceRecord = Record<string, unknown> | null;

export function isGeneralServiceItem(service: Service): boolean {
  return (
    service.category === 'Periodic' ||
    service.category === 'Services' ||
    (service.name?.toLowerCase().includes('general service') ?? false)
  );
}

function isCarWashService(service: Service): boolean {
  return service.category === 'Car Wash' || service.category === 'Wash';
}

function isBatteryService(service: Service): boolean {
  return (
    service.category === 'Battery' ||
    (service.name?.toLowerCase().includes('battery') ?? false)
  );
}

function isTireService(service: Service): boolean {
  return (
    !isBatteryService(service) &&
    (service.category === 'Tyres' ||
      service.category === 'Tyre & Battery' ||
      (service.name?.toLowerCase().includes('tyre') ?? false))
  );
}

function carWashPricesFromRef(ref: VehicleReferenceRecord) {
  if (!ref) {
    return { exterior: null, interiorExterior: null, underbody: null, legacy: null };
  }
  return {
    exterior: ref.car_wash_exterior_price != null ? Number(ref.car_wash_exterior_price) : null,
    interiorExterior:
      ref.car_wash_interior_exterior_price != null
        ? Number(ref.car_wash_interior_exterior_price)
        : null,
    underbody:
      ref.car_wash_interior_exterior_underbody_price != null
        ? Number(ref.car_wash_interior_exterior_underbody_price)
        : null,
    legacy: ref.car_wash_price != null ? Number(ref.car_wash_price) : null,
  };
}

/** Unit price for one service line — matches BookServicePage / backend calculateServicesTotal. */
export function getServiceUnitPrice(
  service: Service,
  vehicleRef: VehicleReferenceRecord,
  selectedTireBrand?: string,
): number {
  const isGeneral = isGeneralServiceItem(service);
  const isWash = isCarWashService(service);
  const isBattery = isBatteryService(service);
  const isTire = isTireService(service);

  if (isGeneral && vehicleRef?.general_service_price != null) {
    const refPrice = Number(vehicleRef.general_service_price);
    if (!Number.isNaN(refPrice) && refPrice > 0) return refPrice;
  }

  if (isBattery && vehicleRef) {
    let brand = selectedTireBrand;
    if (!brand && service.name) {
      const nameLower = service.name.toLowerCase();
      if (nameLower.includes('amaron')) brand = 'Amaron';
      else if (nameLower.includes('exide')) brand = 'Exide';
    }
    if (brand) {
      const brandKey = `battery_price_${brand.toLowerCase().replace(/\s+/g, '')}`;
      const price = vehicleRef[brandKey];
      if (price != null) {
        const n = Number(price);
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
  }

  if (isTire && selectedTireBrand && vehicleRef) {
    const brandKey = `tyre_price_${selectedTireBrand.toLowerCase().replace(/\s+/g, '')}`;
    const price = vehicleRef[brandKey];
    if (price != null) {
      const n = Number(price);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }

  if (isWash && vehicleRef) {
    const prices = carWashPricesFromRef(vehicleRef);
    const sName = service.name.toLowerCase();
    let price: number | null = null;

    if (sName.includes('exterior wash') && !sName.includes('interior')) {
      price = prices.exterior;
    } else if (sName.includes('interior + exterior') && !sName.includes('underbody')) {
      price = prices.interiorExterior;
    } else if (
      sName.includes('underbody wash') ||
      (sName.includes('interior') && sName.includes('exterior') && sName.includes('underbody'))
    ) {
      price = prices.underbody;
    }

    if (price === null || price === 0) {
      price = prices.legacy;
    }

    if (price != null && price > 0) return price;
  }

  return Number(service.price || 0);
}

/** Sum service line prices using vehicle reference data when available. */
export function sumBookingServicesSubtotal(
  services: Service[],
  vehicleRef: VehicleReferenceRecord,
  selectedBrands?: Record<string, string>,
  serviceQuantities?: Record<string, number | string>,
): number {
  return services.reduce((sum, service) => {
    if (!service || typeof service !== 'object') return sum;
    const serviceId = service._id?.toString() || '';
    const selectedBrand = selectedBrands?.[serviceId];
    const unitPrice = getServiceUnitPrice(service, vehicleRef, selectedBrand);
    const qty = serviceQuantities?.[serviceId] != null ? Number(serviceQuantities[serviceId]) : 1;
    return sum + (unitPrice * qty);
  }, 0);
}
