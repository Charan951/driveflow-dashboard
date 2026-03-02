class BookingSummary {
  final String id;
  final int? orderNumber;
  final String status;
  final String? date;
  final String? vehicleName;
  final String? locationAddress;
  final String? serviceName;

  BookingSummary({
    required this.id,
    this.orderNumber,
    required this.status,
    this.date,
    this.vehicleName,
    this.locationAddress,
    this.serviceName,
  });

  factory BookingSummary.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return BookingSummary(id: '', status: 'UNKNOWN');
    }

    // Defensive access to avoid json[$_get] on null
    dynamic getField(String key) {
      try {
        return json[key];
      } catch (_) {
        return null;
      }
    }

    Map<String, dynamic>? vehicle;
    try {
      final v = getField('vehicle');
      if (v is Map<String, dynamic>) {
        vehicle = v;
      } else if (v is Map) {
        vehicle = Map<String, dynamic>.from(v);
      }
    } catch (_) {}

    Map<String, dynamic>? location;
    try {
      final l = getField('location');
      if (l is Map<String, dynamic>) {
        location = l;
      } else if (l is Map) {
        location = Map<String, dynamic>.from(l);
      }
    } catch (_) {}

    final make = vehicle?['make']?.toString();
    final model = vehicle?['model']?.toString();
    final plate = vehicle?['licensePlate']?.toString();
    final vehicleName = [
      if (make != null && make.isNotEmpty) make,
      if (model != null && model.isNotEmpty) model,
      if (plate != null && plate.isNotEmpty) plate,
    ].join(' ');

    String serviceName = 'General Service';
    try {
      final services = getField('services');
      final service = getField('service');
      if (services is List && services.isNotEmpty) {
        final firstService = services[0];
        if (firstService is Map) {
          serviceName = firstService['name']?.toString() ?? 'General Service';
        }
      } else if (service is Map) {
        serviceName = service['name']?.toString() ?? 'General Service';
      }
    } catch (_) {}

    return BookingSummary(
      id: (getField('id') ?? getField('_id') ?? '').toString(),
      orderNumber: getField('orderNumber') is num
          ? (getField('orderNumber') as num).toInt()
          : null,
      status: getField('status')?.toString() ?? '',
      date: getField('date')?.toString(),
      vehicleName: vehicleName.isEmpty ? null : vehicleName,
      locationAddress: location?['address']?.toString(),
      serviceName: serviceName,
    );
  }
}

class BookingLocation {
  final String? address;
  final double? lat;
  final double? lng;

  const BookingLocation({this.address, this.lat, this.lng});

  factory BookingLocation.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const BookingLocation();

    // Defensive access to avoid json[$_get] on null
    dynamic getField(String key) {
      try {
        return json[key];
      } catch (_) {
        return null;
      }
    }

    final latRaw = getField('lat');
    final lngRaw = getField('lng');
    return BookingLocation(
      address: (getField('address') ?? '').toString().trim().isEmpty
          ? null
          : (getField('address') ?? '').toString(),
      lat: latRaw is num ? latRaw.toDouble() : null,
      lng: lngRaw is num ? lngRaw.toDouble() : null,
    );
  }
}

class BookingDetail {
  final String id;
  final int? orderNumber;
  final String status;
  final String date;
  final BookingLocation? location;
  final BookingLocation? merchantLocation;
  final String? vehicleName;
  final List<String> prePickupPhotos;
  final String? paymentStatus;
  final num? totalAmount;
  final bool pickupRequired;
  final InspectionData? inspection;
  final QCData? qc;
  final ServiceExecutionData? serviceExecution;
  final BillingData? billing;
  final List<PartItem> parts;
  final UserSummary? user;
  final String? inspectionCompletedAt;
  final String? qcCompletedAt;

  BookingDetail({
    required this.id,
    this.orderNumber,
    required this.status,
    required this.date,
    this.location,
    this.merchantLocation,
    this.vehicleName,
    required this.prePickupPhotos,
    this.paymentStatus,
    this.totalAmount,
    this.pickupRequired = true,
    this.inspection,
    this.qc,
    this.serviceExecution,
    this.billing,
    this.parts = const [],
    this.user,
    this.inspectionCompletedAt,
    this.qcCompletedAt,
  });

  BookingDetail copyWith({
    String? id,
    int? orderNumber,
    String? status,
    String? date,
    BookingLocation? location,
    BookingLocation? merchantLocation,
    String? vehicleName,
    List<String>? prePickupPhotos,
    String? paymentStatus,
    num? totalAmount,
    bool? pickupRequired,
    InspectionData? inspection,
    QCData? qc,
    ServiceExecutionData? serviceExecution,
    BillingData? billing,
    List<PartItem>? parts,
    UserSummary? user,
    String? inspectionCompletedAt,
    String? qcCompletedAt,
  }) {
    return BookingDetail(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      status: status ?? this.status,
      date: date ?? this.date,
      location: location ?? this.location,
      merchantLocation: merchantLocation ?? this.merchantLocation,
      vehicleName: vehicleName ?? this.vehicleName,
      prePickupPhotos: prePickupPhotos ?? this.prePickupPhotos,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      totalAmount: totalAmount ?? this.totalAmount,
      pickupRequired: pickupRequired ?? this.pickupRequired,
      inspection: inspection ?? this.inspection,
      qc: qc ?? this.qc,
      serviceExecution: serviceExecution ?? this.serviceExecution,
      billing: billing ?? this.billing,
      parts: parts ?? this.parts,
      user: user ?? this.user,
      inspectionCompletedAt:
          inspectionCompletedAt ?? this.inspectionCompletedAt,
      qcCompletedAt: qcCompletedAt ?? this.qcCompletedAt,
    );
  }

  factory BookingDetail.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return BookingDetail(
        id: '',
        status: 'UNKNOWN',
        date: '',
        prePickupPhotos: [],
      );
    }

    // Defensive access to avoid json[$_get] on null
    dynamic getField(String key) {
      try {
        return json[key];
      } catch (_) {
        return null;
      }
    }

    BookingLocation? location;
    final loc = getField('location');
    if (loc is Map<String, dynamic>) {
      location = BookingLocation.fromJson(loc);
    } else if (loc is Map) {
      location = BookingLocation.fromJson(Map<String, dynamic>.from(loc));
    }

    BookingLocation? merchantLocation;
    try {
      final merchant = getField('merchant');
      if (merchant is Map) {
        final mloc = merchant['location'];
        if (mloc is Map<String, dynamic>) {
          merchantLocation = BookingLocation.fromJson(mloc);
        } else if (mloc is Map) {
          merchantLocation = BookingLocation.fromJson(
            Map<String, dynamic>.from(mloc),
          );
        }
      }
    } catch (_) {}

    Map<String, dynamic>? vehicle;
    try {
      final v = getField('vehicle');
      if (v is Map<String, dynamic>) {
        vehicle = v;
      } else if (v is Map) {
        vehicle = Map<String, dynamic>.from(v);
      }
    } catch (_) {}
    final make = vehicle?['make']?.toString();
    final model = vehicle?['model']?.toString();
    final plate = vehicle?['licensePlate']?.toString();
    final vehicleName = [
      if (make != null && make.isNotEmpty) make,
      if (model != null && model.isNotEmpty) model,
      if (plate != null && plate.isNotEmpty) plate,
    ].join(' ');

    final photos =
        (getField('prePickupPhotos') as List?)?.whereType<String>().toList() ??
        [];

    return BookingDetail(
      id: (getField('id') ?? getField('_id') ?? '').toString(),
      orderNumber: getField('orderNumber') is num
          ? (getField('orderNumber') as num).toInt()
          : null,
      status: (getField('status') ?? '').toString(),
      date: (getField('date') ?? '').toString(),
      location: location,
      merchantLocation: merchantLocation,
      vehicleName: vehicleName.isEmpty ? null : vehicleName,
      prePickupPhotos: photos,
      paymentStatus: getField('paymentStatus')?.toString(),
      totalAmount: getField('totalAmount') is num
          ? (getField('totalAmount') as num)
          : null,
      pickupRequired: getField('pickupRequired') as bool? ?? true,
      inspection: getField('inspection') is Map
          ? InspectionData.fromJson(
              Map<String, dynamic>.from(getField('inspection')),
            )
          : null,
      qc: getField('qc') is Map
          ? QCData.fromJson(Map<String, dynamic>.from(getField('qc')))
          : null,
      serviceExecution: getField('serviceExecution') is Map
          ? ServiceExecutionData.fromJson(
              Map<String, dynamic>.from(getField('serviceExecution')),
            )
          : null,
      billing: getField('billing') is Map
          ? BillingData.fromJson(Map<String, dynamic>.from(getField('billing')))
          : null,
      parts:
          (getField('parts') as List?)
              ?.where((p) => p is Map)
              .map((p) => PartItem.fromJson(Map<String, dynamic>.from(p)))
              .toList() ??
          [],
      user: getField('user') is Map
          ? UserSummary.fromJson(Map<String, dynamic>.from(getField('user')))
          : null,
      inspectionCompletedAt: getField('inspection') is Map
          ? getField('inspection')['completedAt']?.toString()
          : null,
      qcCompletedAt: getField('qc') is Map
          ? getField('qc')['completedAt']?.toString()
          : null,
    );
  }
}

class UserSummary {
  final String id;
  final String name;
  final String? email;
  final String? phone;

  UserSummary({required this.id, required this.name, this.email, this.phone});

  factory UserSummary.fromJson(Map<String, dynamic>? json) {
    if (json == null) return UserSummary(id: '', name: 'Guest');
    return UserSummary(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Guest',
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
    );
  }
}

class InspectionData {
  final List<String> photos;
  final String? damageReport;
  final String? completedAt;
  final List<AdditionalPart> additionalParts;

  InspectionData({
    this.photos = const [],
    this.damageReport,
    this.completedAt,
    this.additionalParts = const [],
  });

  factory InspectionData.fromJson(Map<String, dynamic>? json) {
    if (json == null) return InspectionData();
    return InspectionData(
      photos: (json['photos'] as List?)?.whereType<String>().toList() ?? [],
      damageReport: json['damageReport']?.toString(),
      completedAt: json['completedAt']?.toString(),
      additionalParts:
          (json['additionalParts'] as List?)
              ?.where((p) => p is Map)
              .map((p) => AdditionalPart.fromJson(Map<String, dynamic>.from(p)))
              .toList() ??
          [],
    );
  }
}

class AdditionalPart {
  final String name;
  final num price;
  final num quantity;
  final bool approved;
  final String? approvalStatus;
  final String? image;
  final String? oldImage;

  AdditionalPart({
    required this.name,
    required this.price,
    required this.quantity,
    required this.approved,
    this.approvalStatus,
    this.image,
    this.oldImage,
  });

  factory AdditionalPart.fromJson(Map<String, dynamic>? json) {
    if (json == null)
      return AdditionalPart(name: '', price: 0, quantity: 0, approved: false);
    return AdditionalPart(
      name: json['name']?.toString() ?? '',
      price: json['price'] is num ? (json['price'] as num) : 0,
      quantity: json['quantity'] is num ? (json['quantity'] as num) : 0,
      approved: json['approved'] as bool? ?? false,
      approvalStatus: json['approvalStatus']?.toString(),
      image: json['image']?.toString(),
      oldImage: json['oldImage']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'price': price,
      'quantity': quantity,
      'approved': approved,
      'approvalStatus': approvalStatus,
      'image': image,
      'oldImage': oldImage,
    };
  }
}

class QCData {
  final bool testRide;
  final bool safetyChecks;
  final bool noLeaks;
  final bool noErrorLights;
  final String? completedAt;
  final String? notes;

  QCData({
    required this.testRide,
    required this.safetyChecks,
    required this.noLeaks,
    required this.noErrorLights,
    this.completedAt,
    this.notes,
  });

  QCData copyWith({
    bool? testRide,
    bool? safetyChecks,
    bool? noLeaks,
    bool? noErrorLights,
    String? completedAt,
    String? notes,
  }) {
    return QCData(
      testRide: testRide ?? this.testRide,
      safetyChecks: safetyChecks ?? this.safetyChecks,
      noLeaks: noLeaks ?? this.noLeaks,
      noErrorLights: noErrorLights ?? this.noErrorLights,
      completedAt: completedAt ?? this.completedAt,
      notes: notes ?? this.notes,
    );
  }

  factory QCData.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return QCData(
        testRide: false,
        safetyChecks: false,
        noLeaks: false,
        noErrorLights: false,
      );
    }
    return QCData(
      testRide: json['testRide'] as bool? ?? false,
      safetyChecks: json['safetyChecks'] as bool? ?? false,
      noLeaks: json['noLeaks'] as bool? ?? false,
      noErrorLights: json['noErrorLights'] as bool? ?? false,
      completedAt: json['completedAt']?.toString(),
      notes: json['notes']?.toString(),
    );
  }
}

class ServiceExecutionData {
  final String? jobStartTime;
  final String? jobEndTime;
  final List<String> beforePhotos;
  final List<String> duringPhotos;
  final List<String> afterPhotos;
  final String? notes;

  ServiceExecutionData({
    this.jobStartTime,
    this.jobEndTime,
    this.beforePhotos = const [],
    this.duringPhotos = const [],
    this.afterPhotos = const [],
    this.notes,
  });

  factory ServiceExecutionData.fromJson(Map<String, dynamic>? json) {
    if (json == null) return ServiceExecutionData();
    return ServiceExecutionData(
      jobStartTime: json['jobStartTime']?.toString(),
      jobEndTime: json['jobEndTime']?.toString(),
      beforePhotos:
          (json['beforePhotos'] as List?)?.whereType<String>().toList() ?? [],
      duringPhotos:
          (json['duringPhotos'] as List?)?.whereType<String>().toList() ?? [],
      afterPhotos:
          (json['afterPhotos'] as List?)?.whereType<String>().toList() ?? [],
      notes: json['notes']?.toString(),
    );
  }
}

class BillingData {
  final String? invoiceNumber;
  final String? invoiceDate;
  final String? fileUrl;
  final num labourCost;
  final num gst;
  final num partsTotal;
  final num total;

  BillingData({
    this.invoiceNumber,
    this.invoiceDate,
    this.fileUrl,
    required this.labourCost,
    required this.gst,
    required this.partsTotal,
    required this.total,
  });

  factory BillingData.fromJson(Map<String, dynamic>? json) {
    if (json == null)
      return BillingData(labourCost: 0, gst: 0, partsTotal: 0, total: 0);
    return BillingData(
      invoiceNumber: json['invoiceNumber']?.toString(),
      invoiceDate: json['invoiceDate']?.toString(),
      fileUrl: json['fileUrl']?.toString(),
      labourCost: json['labourCost'] is num ? (json['labourCost'] as num) : 0,
      gst: json['gst'] is num ? (json['gst'] as num) : 0,
      partsTotal: json['partsTotal'] is num ? (json['partsTotal'] as num) : 0,
      total: json['total'] is num ? (json['total'] as num) : 0,
    );
  }
}

class PartItem {
  final String? name;
  final num quantity;
  final num price;

  PartItem({this.name, required this.quantity, required this.price});

  factory PartItem.fromJson(Map<String, dynamic>? json) {
    if (json == null) return PartItem(quantity: 0, price: 0);
    return PartItem(
      name: json['name']?.toString(),
      quantity: json['quantity'] is num ? (json['quantity'] as num) : 0,
      price: json['price'] is num ? (json['price'] as num) : 0,
    );
  }
}
