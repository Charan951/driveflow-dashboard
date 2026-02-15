class BookingSummary {
  final String id;
  final String status;
  final String? date;
  final String? vehicleName;
  final String? locationAddress;

  BookingSummary({
    required this.id,
    required this.status,
    this.date,
    this.vehicleName,
    this.locationAddress,
  });

  factory BookingSummary.fromJson(Map<String, dynamic> json) {
    final vehicle = json['vehicle'] as Map<String, dynamic>?;
    final location = json['location'] as Map<String, dynamic>?;
    final make = vehicle?['make']?.toString();
    final model = vehicle?['model']?.toString();
    final plate = vehicle?['licensePlate']?.toString();
    final vehicleName = [
      if (make != null && make.isNotEmpty) make,
      if (model != null && model.isNotEmpty) model,
      if (plate != null && plate.isNotEmpty) plate,
    ].join(' ');

    return BookingSummary(
      id: json['_id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      date: json['date']?.toString(),
      vehicleName: vehicleName.isEmpty ? null : vehicleName,
      locationAddress: location?['address']?.toString(),
    );
  }
}

class BookingLocation {
  final String? address;
  final double? lat;
  final double? lng;

  const BookingLocation({this.address, this.lat, this.lng});

  factory BookingLocation.fromJson(Map<String, dynamic> json) {
    final latRaw = json['lat'];
    final lngRaw = json['lng'];
    return BookingLocation(
      address: (json['address'] ?? '').toString().trim().isEmpty
          ? null
          : (json['address'] ?? '').toString(),
      lat: latRaw is num ? latRaw.toDouble() : null,
      lng: lngRaw is num ? lngRaw.toDouble() : null,
    );
  }
}

class BookingDetail {
  final String id;
  final String status;
  final String date;
  final BookingLocation? location;
  final BookingLocation? merchantLocation;
  final bool pickupRequired;
  final String? vehicleName;

  BookingDetail({
    required this.id,
    required this.status,
    required this.date,
    required this.location,
    required this.merchantLocation,
    required this.pickupRequired,
    required this.vehicleName,
  });

  factory BookingDetail.fromJson(Map<String, dynamic> json) {
    BookingLocation? location;
    final loc = json['location'];
    if (loc is Map<String, dynamic>) {
      location = BookingLocation.fromJson(loc);
    } else if (loc is Map) {
      location = BookingLocation.fromJson(Map<String, dynamic>.from(loc));
    }

    BookingLocation? merchantLocation;
    final m = json['merchant'];
    if (m is Map<String, dynamic> || m is Map) {
      final mm = m is Map<String, dynamic>
          ? m
          : Map<String, dynamic>.from(m as Map);
      final mLoc = mm['location'];
      if (mLoc is Map<String, dynamic>) {
        merchantLocation = BookingLocation.fromJson(mLoc);
      } else if (mLoc is Map) {
        merchantLocation = BookingLocation.fromJson(
          Map<String, dynamic>.from(mLoc),
        );
      }
    }

    String? vehicleName;
    final vehicle = json['vehicle'];
    if (vehicle is Map<String, dynamic> || vehicle is Map) {
      final v = vehicle is Map<String, dynamic>
          ? vehicle
          : Map<String, dynamic>.from(vehicle as Map);
      final make = v['make']?.toString();
      final model = v['model']?.toString();
      final plate = v['licensePlate']?.toString();
      final parts = <String>[];
      if (make != null && make.isNotEmpty) parts.add(make);
      if (model != null && model.isNotEmpty) parts.add(model);
      if (plate != null && plate.isNotEmpty) parts.add(plate);
      final label = parts.join(' ');
      vehicleName = label.isEmpty ? null : label;
    }

    return BookingDetail(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      location: location,
      merchantLocation: merchantLocation,
      pickupRequired: (json['pickupRequired'] ?? false) == true,
      vehicleName: vehicleName,
    );
  }
}
