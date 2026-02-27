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
  final bool pickupRequired;
  final String? notes;
  final String? paymentStatus;
  final String? createdAt;
  final BookingLocation? merchantLocation;
  final String? merchantName;
  final String? merchantPhone;
  final DeliveryOtp? deliveryOtp;
  final List<String> prePickupPhotos;
  final List<String> postServicePhotos;
  final String? invoiceUrl;

  Booking({
    required this.id,
    this.orderNumber,
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
    this.deliveryOtp,
    this.prePickupPhotos = const [],
    this.postServicePhotos = const [],
    this.invoiceUrl,
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

    DeliveryOtp? deliveryOtp;
    final d = json['deliveryOtp'];
    if (d is Map<String, dynamic> || d is Map) {
      final dd = d is Map<String, dynamic>
          ? d
          : Map<String, dynamic>.from(d as Map);
      deliveryOtp = DeliveryOtp.fromJson(dd);
    }

    final prePickupPhotos = <String>[];
    final inspPhotos = json['inspection']?['photos'];
    if (inspPhotos is List) {
      for (final p in inspPhotos) {
        if (p != null) prePickupPhotos.add(p.toString());
      }
    }

    final postServicePhotos = <String>[];
    final afterPhotos = json['serviceExecution']?['afterPhotos'];
    if (afterPhotos is List) {
      for (final p in afterPhotos) {
        if (p != null) postServicePhotos.add(p.toString());
      }
    }

    final invoiceUrl = json['billing']?['fileUrl']?.toString();

    return Booking(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      orderNumber: json['orderNumber'] is num
          ? (json['orderNumber'] as num).toInt()
          : null,
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
      deliveryOtp: deliveryOtp,
      prePickupPhotos: prePickupPhotos,
      postServicePhotos: postServicePhotos,
      invoiceUrl: invoiceUrl != null && invoiceUrl.isNotEmpty
          ? invoiceUrl
          : null,
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
      'pickupRequired': pickupRequired,
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
