import 'dart:convert';
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
    final addressStr = json['address']?.toString().trim();
    return BookingLocation(
      address: (addressStr == null || addressStr.isEmpty) ? null : addressStr,
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

class DeliveryOtp {
  final String code;
  final String? expiresAt;
  final bool verified;

  const DeliveryOtp({
    required this.code,
    this.expiresAt,
    required this.verified,
  });

  factory DeliveryOtp.fromJson(Map<String, dynamic> json) {
    final rawCode = (json['code'] ?? '').toString();
    final rawExpires = (json['expiresAt'] ?? '').toString();
    return DeliveryOtp(
      code: rawCode,
      expiresAt: rawExpires.trim().isEmpty ? null : rawExpires,
      verified: json['verified'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'code': code,
      if (expiresAt != null) 'expiresAt': expiresAt,
      'verified': verified,
    };
  }
}

class Booking {
  final String id;
  final int? orderNumber;
  final String status;
  final String date;
  final num totalAmount;
  final Vehicle? vehicle;
  final List<ServiceItem> services;
  final BookingLocation? location;
  final String? notes;
  final String? paymentStatus;
  final String? createdAt;
  final BookingLocation? merchantLocation;
  final String? merchantName;
  final String? merchantPhone;
  final DeliveryOtp? deliveryOtp;
  final List<String> prePickupPhotos;
  final List<String> beforeServicePhotos;
  final List<String> duringServicePhotos;
  final List<String> postServicePhotos;
  final String? invoiceUrl;
  final String? driverName;
  final String? driverPhone;
  final bool pickupRequired;
  final String? inspectionCompletedAt;
  final String? qcCompletedAt;

  Booking({
    required this.id,
    this.orderNumber,
    required this.status,
    required this.date,
    required this.totalAmount,
    required this.vehicle,
    required this.services,
    required this.location,
    required this.notes,
    required this.paymentStatus,
    required this.createdAt,
    this.merchantLocation,
    this.merchantName,
    this.merchantPhone,
    this.deliveryOtp,
    this.prePickupPhotos = const [],
    this.beforeServicePhotos = const [],
    this.duringServicePhotos = const [],
    this.postServicePhotos = const [],
    this.invoiceUrl,
    this.driverName,
    this.driverPhone,
    this.pickupRequired = true,
    this.inspectionCompletedAt,
    this.qcCompletedAt,
  });

  static const statusLabels = {
    'CREATED': 'Created',
    'ASSIGNED': 'Assigned',
    'ACCEPTED': 'Accepted',
    'REACHED_CUSTOMER': 'Reached Customer',
    'VEHICLE_PICKED': 'Vehicle Picked',
    'REACHED_MERCHANT': 'Reached Merchant',
    'VEHICLE_AT_MERCHANT': 'At Merchant',
    'SERVICE_STARTED': 'Service Started',
    'SERVICE_COMPLETED': 'Service Completed',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled',
    'COMPLETED': 'Completed',
  };

  static String getStatusLabel(String status) {
    return statusLabels[status.toUpperCase()] ?? status;
  }

  factory Booking.fromJson(Map<String, dynamic>? map) {
    if (map == null) {
      throw ArgumentError('Booking.fromJson: map must be a non-null Map');
    }
    Vehicle? vehicle;
    final v = map['vehicle'];
    if (v is Map) {
      try {
        final vehicleMap = jsonDecode(jsonEncode(v)) as Map<String, dynamic>;
        vehicle = Vehicle.fromJson(vehicleMap);
      } catch (_) {}
    }

    final services = <ServiceItem>[];
    final s = map['services'];
    if (s is List) {
      for (final e in s) {
        if (e is Map) {
          try {
            final serviceMap =
                jsonDecode(jsonEncode(e)) as Map<String, dynamic>;
            services.add(ServiceItem.fromJson(serviceMap));
          } catch (_) {}
        }
      }
    }

    BookingLocation? location;
    final loc = map['location'];
    if (loc is Map) {
      try {
        final locMap = jsonDecode(jsonEncode(loc)) as Map<String, dynamic>;
        location = BookingLocation.fromJson(locMap);
      } catch (_) {}
    }

    BookingLocation? merchantLocation;
    String? merchantName;
    String? merchantPhone;
    final m = map['merchant'];
    if (m is Map) {
      try {
        final mm = jsonDecode(jsonEncode(m)) as Map<String, dynamic>;
        final mLoc = mm['location'];
        if (mLoc is Map) {
          try {
            final merchantLocMap =
                jsonDecode(jsonEncode(mLoc)) as Map<String, dynamic>;
            merchantLocation = BookingLocation.fromJson(merchantLocMap);
          } catch (_) {}
        }
        final nameRaw = mm['name'];
        final phoneRaw = mm['phone'];
        final nameStr = nameRaw?.toString().trim();
        final phoneStr = phoneRaw?.toString().trim();
        merchantName = nameStr != null && nameStr.isNotEmpty ? nameStr : null;
        merchantPhone = phoneStr != null && phoneStr.isNotEmpty
            ? phoneStr
            : null;
      } catch (_) {}
    }

    DeliveryOtp? deliveryOtp;
    final d = map['deliveryOtp'];
    if (d is Map) {
      try {
        final dMap = jsonDecode(jsonEncode(d)) as Map<String, dynamic>;
        deliveryOtp = DeliveryOtp.fromJson(dMap);
      } catch (_) {}
    }

    final prePickupPhotos = <String>[];
    final beforeServicePhotos = <String>[];
    final duringServicePhotos = <String>[];
    final postServicePhotos = <String>[];

    final inspection = map['inspection'];
    if (inspection is Map) {
      final inspPhotos = inspection['photos'];
      if (inspPhotos is List) {
        for (final p in inspPhotos) {
          if (p != null) prePickupPhotos.add(p.toString());
        }
      }
    }

    final execution = map['serviceExecution'];
    if (execution is Map) {
      final beforePhotos = execution['beforePhotos'];
      if (beforePhotos is List) {
        for (final p in beforePhotos) {
          if (p != null) beforeServicePhotos.add(p.toString());
        }
      }
      final duringPhotos = execution['duringPhotos'];
      if (duringPhotos is List) {
        for (final p in duringPhotos) {
          if (p != null) duringServicePhotos.add(p.toString());
        }
      }
      final afterPhotos = execution['afterPhotos'];
      if (afterPhotos is List) {
        for (final p in afterPhotos) {
          if (p != null) postServicePhotos.add(p.toString());
        }
      }
    }

    final billing = map['billing'];
    final invoiceUrl = billing is Map ? billing['fileUrl']?.toString() : null;

    final inspectionObj = map['inspection'];
    final inspectionCompletedAt = inspectionObj is Map
        ? inspectionObj['completedAt']?.toString()
        : null;

    final qcObj = map['qc'];
    final qcCompletedAt = qcObj is Map
        ? qcObj['completedAt']?.toString()
        : null;

    String? driverName;
    String? driverPhone;
    final driver = map['pickupDriver'];
    if (driver is Map) {
      driverName = driver['name']?.toString();
      driverPhone = driver['phone']?.toString();
    }

    return Booking(
      id: (map['_id'] ?? '').toString(),
      orderNumber: map['orderNumber'] is num
          ? (map['orderNumber'] as num).toInt()
          : null,
      status: (map['status'] ?? 'PENDING').toString(),
      date: (map['date'] ?? '').toString(),
      totalAmount: map['totalAmount'] is num ? (map['totalAmount'] as num) : 0,
      vehicle: vehicle,
      services: services,
      location: location,
      notes: map['notes']?.toString(),
      paymentStatus: (map['paymentStatus'] ?? 'PENDING').toString(),
      createdAt: map['createdAt']?.toString(),
      merchantLocation: merchantLocation,
      merchantName: merchantName,
      merchantPhone: merchantPhone,
      deliveryOtp: deliveryOtp,
      prePickupPhotos: prePickupPhotos,
      beforeServicePhotos: beforeServicePhotos,
      duringServicePhotos: duringServicePhotos,
      postServicePhotos: postServicePhotos,
      invoiceUrl: invoiceUrl,
      driverName: driverName,
      driverPhone: driverPhone,
      pickupRequired: map['pickupRequired'] != false,
      inspectionCompletedAt: inspectionCompletedAt,
      qcCompletedAt: qcCompletedAt,
    );
  }

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'id': id,
      if (orderNumber != null) 'orderNumber': orderNumber,
      'status': status,
      'date': date,
      'totalAmount': totalAmount,
      if (vehicle != null) 'vehicle': vehicle!.toJson(),
      'services': services.map((s) => s.toJson()).toList(),
      if (location != null) 'location': location!.toJson(),
      if (notes != null) 'notes': notes,
      if (paymentStatus != null) 'paymentStatus': paymentStatus,
      if (createdAt != null) 'createdAt': createdAt,
    };

    final merchant = <String, dynamic>{};
    if (merchantLocation != null) {
      final loc = merchantLocation!.toJson();
      if (loc.isNotEmpty) {
        merchant['location'] = loc;
      }
    }
    if (merchantName != null && merchantName!.trim().isNotEmpty) {
      merchant['name'] = merchantName;
    }
    if (merchantPhone != null && merchantPhone!.trim().isNotEmpty) {
      merchant['phone'] = merchantPhone;
    }
    if (merchant.isNotEmpty) {
      map['merchant'] = merchant;
    }

    if (deliveryOtp != null) {
      map['deliveryOtp'] = deliveryOtp!.toJson();
    }

    return map;
  }
}
