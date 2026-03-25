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

class CarWashDetails {
  final bool isCarWashService;
  final List<String> beforeWashPhotos;
  final List<String> afterWashPhotos;
  final String? washStartedAt;
  final String? washCompletedAt;
  final String? staffName;
  final String? staffPhone;

  const CarWashDetails({
    this.isCarWashService = false,
    this.beforeWashPhotos = const [],
    this.afterWashPhotos = const [],
    this.washStartedAt,
    this.washCompletedAt,
    this.staffName,
    this.staffPhone,
  });

  factory CarWashDetails.fromJson(Map<String, dynamic> json) {
    final staff = json['staffAssigned'];
    return CarWashDetails(
      isCarWashService: json['isCarWashService'] == true,
      beforeWashPhotos: (json['beforeWashPhotos'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      afterWashPhotos: (json['afterWashPhotos'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      washStartedAt: json['washStartedAt']?.toString(),
      washCompletedAt: json['washCompletedAt']?.toString(),
      staffName: staff is Map ? staff['name']?.toString() : null,
      staffPhone: staff is Map ? staff['phone']?.toString() : null,
    );
  }
}

class BatteryTireDetails {
  final bool isBatteryTireService;
  final String? merchantApprovalStatus;
  final num? merchantPrice;
  final String? merchantImage;
  final String? merchantNotes;
  final String? warrantyName;
  final num? warrantyPrice;
  final int? warrantyMonths;
  final String? warrantyImage;

  const BatteryTireDetails({
    this.isBatteryTireService = false,
    this.merchantApprovalStatus,
    this.merchantPrice,
    this.merchantImage,
    this.merchantNotes,
    this.warrantyName,
    this.warrantyPrice,
    this.warrantyMonths,
    this.warrantyImage,
  });

  factory BatteryTireDetails.fromJson(Map<String, dynamic> json) {
    final approval = json['merchantApproval'];
    final warranty = json['warranty'];
    return BatteryTireDetails(
      isBatteryTireService: json['isBatteryTireService'] == true,
      merchantApprovalStatus: approval is Map
          ? approval['status']?.toString()
          : null,
      merchantPrice: approval is Map ? approval['price'] as num? : null,
      merchantImage: approval is Map ? approval['image']?.toString() : null,
      merchantNotes: approval is Map ? approval['notes']?.toString() : null,
      warrantyName: warranty is Map ? warranty['name']?.toString() : null,
      warrantyPrice: warranty is Map ? warranty['price'] as num? : null,
      warrantyMonths: warranty is Map
          ? warranty['warrantyMonths'] as int?
          : null,
      warrantyImage: warranty is Map ? warranty['image']?.toString() : null,
    );
  }
}

class ServicePart {
  final String name;
  final num price;
  final int quantity;
  final String? approvalStatus;
  final bool approved;
  final String? image;
  final String? oldImage;
  final bool fromInspection;

  ServicePart({
    required this.name,
    required this.price,
    required this.quantity,
    this.approvalStatus,
    this.approved = false,
    this.image,
    this.oldImage,
    this.fromInspection = false,
  });

  factory ServicePart.fromJson(Map<String, dynamic> json) {
    return ServicePart(
      name: (json['name'] ?? '').toString(),
      price: json['price'] is num ? (json['price'] as num) : 0,
      quantity: json['quantity'] is num ? (json['quantity'] as num).toInt() : 1,
      approvalStatus: json['approvalStatus']?.toString(),
      approved: json['approved'] == true,
      image: json['image']?.toString(),
      oldImage: json['oldImage']?.toString(),
      fromInspection: json['fromInspection'] == true,
    );
  }
}

class InspectionDetails {
  final String? frontPhoto;
  final String? backPhoto;
  final String? leftPhoto;
  final String? rightPhoto;
  final String? damageReport;
  final List<String> photos;

  InspectionDetails({
    this.frontPhoto,
    this.backPhoto,
    this.leftPhoto,
    this.rightPhoto,
    this.damageReport,
    this.photos = const [],
  });

  factory InspectionDetails.fromJson(Map<String, dynamic> json) {
    return InspectionDetails(
      frontPhoto: json['frontPhoto']?.toString(),
      backPhoto: json['backPhoto']?.toString(),
      leftPhoto: json['leftPhoto']?.toString(),
      rightPhoto: json['rightPhoto']?.toString(),
      damageReport: json['damageReport']?.toString(),
      photos: (json['photos'] as List? ?? []).map((e) => e.toString()).toList(),
    );
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
  final List<ServicePart> serviceParts;
  final String? invoiceUrl;
  final String? driverName;
  final String? driverPhone;
  final String? technicianName;
  final String? technicianPhone;
  final bool pickupRequired;
  final String? inspectionCompletedAt;
  final String? qcCompletedAt;
  final CarWashDetails? carWash;
  final BatteryTireDetails? batteryTire;
  final InspectionDetails? inspection;
  final List<Map<String, String>> statusHistory;

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
    this.serviceParts = const [],
    this.invoiceUrl,
    this.driverName,
    this.driverPhone,
    this.technicianName,
    this.technicianPhone,
    this.pickupRequired = true,
    this.inspectionCompletedAt,
    this.qcCompletedAt,
    this.carWash,
    this.batteryTire,
    this.inspection,
    this.statusHistory = const [],
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
    // Car wash specific statuses
    'CAR_WASH_STARTED': 'Car Wash Started',
    'CAR_WASH_COMPLETED': 'Car Wash Completed',
    // Battery and Tire specific statuses
    'STAFF_REACHED_MERCHANT': 'Staff Reached Merchant',
    'PICKUP_BATTERY_TIRE': 'Battery/Tire Picked Up',
    'INSTALLATION': 'Installation in Progress',
    'DELIVERY': 'Out for Delivery',
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
    final serviceParts = <ServicePart>[];

    final inspectionMap = map['inspection'];
    InspectionDetails? inspection;
    if (inspectionMap is Map) {
      inspection = InspectionDetails.fromJson(
        Map<String, dynamic>.from(inspectionMap),
      );
      final inspPhotos = inspectionMap['photos'];
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
      final parts = execution['serviceParts'];
      if (parts is List) {
        for (final p in parts) {
          if (p is Map) {
            serviceParts.add(
              ServicePart.fromJson(Map<String, dynamic>.from(p)),
            );
          }
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

    String? technicianName;
    String? technicianPhone;
    final tech = map['technician'];
    if (tech is Map) {
      technicianName = tech['name']?.toString();
      technicianPhone = tech['phone']?.toString();
    }

    final carWash = map['carWash'] is Map
        ? CarWashDetails.fromJson(Map<String, dynamic>.from(map['carWash']))
        : null;
    final batteryTire = map['batteryTire'] is Map
        ? BatteryTireDetails.fromJson(
            Map<String, dynamic>.from(map['batteryTire']),
          )
        : null;

    final statusHistory = (map['statusHistory'] as List? ?? [])
        .map((e) => Map<String, String>.from(e as Map))
        .toList();

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
      serviceParts: serviceParts,
      invoiceUrl: invoiceUrl,
      driverName: driverName,
      driverPhone: driverPhone,
      technicianName: technicianName,
      technicianPhone: technicianPhone,
      pickupRequired: map['pickupRequired'] != false,
      inspectionCompletedAt: inspectionCompletedAt,
      qcCompletedAt: qcCompletedAt,
      carWash: carWash,
      batteryTire: batteryTire,
      inspection: inspection,
      statusHistory: statusHistory,
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
