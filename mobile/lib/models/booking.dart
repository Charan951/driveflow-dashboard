import 'service.dart';
import 'vehicle.dart';

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

  Map<String, dynamic> toJson() => {
    if (address != null && address!.trim().isNotEmpty)
      'address': address!.trim(),
    if (lat != null) 'lat': lat,
    if (lng != null) 'lng': lng,
  };
}

class Booking {
  final String id;
  final String status;
  final String date;
  final num totalAmount;
  final Vehicle? vehicle;
  final List<ServiceItem> services;
  final BookingLocation? location;
  final bool pickupRequired;
  final String? notes;
  final String? paymentStatus;
  final String? createdAt;
  final BookingLocation? merchantLocation;
  final String? merchantName;
  final String? merchantPhone;

  Booking({
    required this.id,
    required this.status,
    required this.date,
    required this.totalAmount,
    required this.vehicle,
    required this.services,
    required this.location,
    required this.pickupRequired,
    required this.notes,
    required this.paymentStatus,
    required this.createdAt,
    this.merchantLocation,
    this.merchantName,
    this.merchantPhone,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    Vehicle? vehicle;
    final v = json['vehicle'];
    if (v is Map<String, dynamic>) {
      vehicle = Vehicle.fromJson(v);
    } else if (v is Map) {
      vehicle = Vehicle.fromJson(Map<String, dynamic>.from(v));
    }

    final services = <ServiceItem>[];
    final s = json['services'];
    if (s is List) {
      for (final e in s) {
        if (e is Map<String, dynamic>) {
          services.add(ServiceItem.fromJson(e));
        } else if (e is Map) {
          services.add(ServiceItem.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }

    BookingLocation? location;
    final loc = json['location'];
    if (loc is Map<String, dynamic>) {
      location = BookingLocation.fromJson(loc);
    } else if (loc is Map) {
      location = BookingLocation.fromJson(Map<String, dynamic>.from(loc));
    }

    BookingLocation? merchantLocation;
    String? merchantName;
    String? merchantPhone;
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
      final nameRaw = mm['name'];
      final phoneRaw = mm['phone'];
      final nameStr = nameRaw?.toString().trim();
      final phoneStr = phoneRaw?.toString().trim();
      merchantName = nameStr != null && nameStr.isNotEmpty ? nameStr : null;
      merchantPhone = phoneStr != null && phoneStr.isNotEmpty ? phoneStr : null;
    }

    return Booking(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      totalAmount: (json['totalAmount'] ?? 0) as num,
      vehicle: vehicle,
      services: services,
      location: location,
      pickupRequired: (json['pickupRequired'] ?? false) == true,
      notes: (json['notes'] ?? '').toString().trim().isEmpty
          ? null
          : (json['notes'] ?? '').toString(),
      paymentStatus: (json['paymentStatus'] ?? '').toString().trim().isEmpty
          ? null
          : (json['paymentStatus'] ?? '').toString(),
      createdAt: (json['createdAt'] ?? '').toString().trim().isEmpty
          ? null
          : (json['createdAt'] ?? '').toString(),
      merchantLocation: merchantLocation,
      merchantName: merchantName,
      merchantPhone: merchantPhone,
    );
  }
}
