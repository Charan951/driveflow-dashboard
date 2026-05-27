import '../models/service.dart' show ServiceItem;

Map<String, double> _carWashPricesFromRef(Map<String, dynamic>? ref) {
  if (ref == null) {
    return {'exterior': 0, 'interiorExterior': 0, 'underbody': 0, 'legacy': 0};
  }
  return {
    'exterior': ref['car_wash_exterior_price'] != null
        ? double.tryParse(ref['car_wash_exterior_price'].toString()) ?? 0
        : 0,
    'interiorExterior': ref['car_wash_interior_exterior_price'] != null
        ? double.tryParse(ref['car_wash_interior_exterior_price'].toString()) ??
              0
        : 0,
    'underbody': ref['car_wash_interior_exterior_underbody_price'] != null
        ? double.tryParse(
                ref['car_wash_interior_exterior_underbody_price'].toString(),
              ) ??
              0
        : 0,
    'legacy': ref['car_wash_price'] != null
        ? double.tryParse(ref['car_wash_price'].toString()) ?? 0
        : 0,
  };
}

double getServiceUnitPrice(
  ServiceItem service,
  Map<String, dynamic>? vehicleRef, {
  String? selectedTireBrand,
}) {
  final cat = service.category?.toLowerCase() ?? '';
  final name = service.name.toLowerCase();
  final isGeneral =
      cat == 'periodic' ||
      cat == 'services' ||
      name.contains('general service');
  final isWash =
      cat.contains('car wash') ||
      cat.contains('wash') ||
      cat.contains('detailing');
  final isTire = cat.contains('tyre') || cat.contains('tire');
  final isBattery = cat.contains('battery');

  if (isGeneral && vehicleRef != null) {
    final refPrice = double.tryParse(
      vehicleRef['general_service_price']?.toString() ?? '',
    );
    if (refPrice != null && refPrice > 0) return refPrice;
  }

  if ((isTire || isBattery) &&
      selectedTireBrand != null &&
      vehicleRef != null) {
    final prefix = isBattery ? 'battery_price' : 'tyre_price';
    final brandKey =
        '$prefix${selectedTireBrand.toLowerCase().replaceAll(' ', '')}';
    final price = vehicleRef[brandKey];
    if (price != null) {
      final priceNum = double.tryParse(price.toString());
      if (priceNum != null && priceNum > 0) return priceNum;
    }
  }

  if (isWash && vehicleRef != null) {
    final prices = _carWashPricesFromRef(vehicleRef);
    double price = 0;

    if (name.contains('exterior wash') && !name.contains('interior')) {
      price = prices['exterior'] ?? 0;
    } else if (name.contains('interior + exterior') &&
        !name.contains('underbody')) {
      price = prices['interiorExterior'] ?? 0;
    } else if (name.contains('underbody wash') ||
        (name.contains('interior') &&
            name.contains('exterior') &&
            name.contains('underbody'))) {
      price = prices['underbody'] ?? 0;
    }

    if (price == 0) {
      price = prices['legacy'] ?? 0;
    }

    if (price > 0) return price;
  }

  return service.price.toDouble();
}

double sumBookingServicesSubtotal(
  List<ServiceItem> services,
  Map<String, dynamic>? vehicleRef,
) {
  return services.fold(0.0, (sum, service) {
    return sum + getServiceUnitPrice(service, vehicleRef);
  });
}
