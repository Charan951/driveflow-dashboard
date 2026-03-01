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

  factory BookingSummary.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? vehicle;
    if (json['vehicle'] is Map<String, dynamic>) {
      vehicle = json['vehicle'] as Map<String, dynamic>;
    } else if (json['vehicle'] is Map) {
      vehicle = Map<String, dynamic>.from(json['vehicle'] as Map);
    }

    Map<String, dynamic>? location;
    if (json['location'] is Map<String, dynamic>) {
      location = json['location'] as Map<String, dynamic>;
    } else if (json['location'] is Map) {
      location = Map<String, dynamic>.from(json['location'] as Map);
    }

    final make = vehicle?['make']?.toString();
    final model = vehicle?['model']?.toString();
    final plate = vehicle?['licensePlate']?.toString();
    final vehicleName = [
      if (make != null && make.isNotEmpty) make,
      if (model != null && model.isNotEmpty) model,
      if (plate != null && plate.isNotEmpty) plate,
    ].join(' ');

    return BookingSummary(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      orderNumber: json['orderNumber'] is num
          ? (json['orderNumber'] as num).toInt()
          : null,
      status: json['status']?.toString() ?? '',
      date: json['date']?.toString(),
      vehicleName: vehicleName.isEmpty ? null : vehicleName,
      locationAddress: location?['address']?.toString(),
      serviceName:
          (json['services'] is List && (json['services'] as List).isNotEmpty)
          ? ((json['services'][0] is Map)
                ? json['services'][0]['name']?.toString()
                : 'General Service')
          : (json['service'] is Map
                ? json['service']['name']?.toString()
                : 'General Service'),
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

  factory BookingDetail.fromJson(Map<String, dynamic> json) {
    BookingLocation? location;
    final loc = json['location'];
    if (loc is Map<String, dynamic>) {
      location = BookingLocation.fromJson(loc);
    } else if (loc is Map) {
      location = BookingLocation.fromJson(Map<String, dynamic>.from(loc));
    }

    BookingLocation? merchantLocation;
    final mloc = json['merchant']?['location'];
    if (mloc is Map<String, dynamic>) {
      merchantLocation = BookingLocation.fromJson(mloc);
    } else if (mloc is Map) {
      merchantLocation = BookingLocation.fromJson(
        Map<String, dynamic>.from(mloc),
      );
    }

    Map<String, dynamic>? vehicle;
    if (json['vehicle'] is Map<String, dynamic>) {
      vehicle = json['vehicle'] as Map<String, dynamic>;
    } else if (json['vehicle'] is Map) {
      vehicle = Map<String, dynamic>.from(json['vehicle'] as Map);
    }
    final make = vehicle?['make']?.toString();
    final model = vehicle?['model']?.toString();
    final plate = vehicle?['licensePlate']?.toString();
    final vehicleName = [
      if (make != null && make.isNotEmpty) make,
      if (model != null && model.isNotEmpty) model,
      if (plate != null && plate.isNotEmpty) plate,
    ].join(' ');

    final photos =
        (json['prePickupPhotos'] as List?)?.whereType<String>().toList() ?? [];

    return BookingDetail(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      orderNumber: json['orderNumber'] is num
          ? (json['orderNumber'] as num).toInt()
          : null,
      status: (json['status'] ?? '').toString(),
      date: (json['date'] ?? '').toString(),
      location: location,
      merchantLocation: merchantLocation,
      vehicleName: vehicleName.isEmpty ? null : vehicleName,
      prePickupPhotos: photos,
      paymentStatus: json['paymentStatus']?.toString(),
      totalAmount: json['totalAmount'] is num
          ? (json['totalAmount'] as num)
          : null,
      pickupRequired: json['pickupRequired'] as bool? ?? true,
      inspection: json['inspection'] != null
          ? InspectionData.fromJson(json['inspection'])
          : null,
      qc: json['qc'] != null ? QCData.fromJson(json['qc']) : null,
      serviceExecution: json['serviceExecution'] != null
          ? ServiceExecutionData.fromJson(json['serviceExecution'])
          : null,
      billing: json['billing'] != null
          ? BillingData.fromJson(json['billing'])
          : null,
      parts:
          (json['parts'] as List?)?.map((p) => PartItem.fromJson(p)).toList() ??
          [],
      user: json['user'] != null ? UserSummary.fromJson(json['user']) : null,
      inspectionCompletedAt: json['inspection']?['completedAt']?.toString(),
      qcCompletedAt: json['qc']?['completedAt']?.toString(),
    );
  }
}

class UserSummary {
  final String id;
  final String name;
  final String? email;
  final String? phone;

  UserSummary({required this.id, required this.name, this.email, this.phone});

  factory UserSummary.fromJson(Map<String, dynamic> json) {
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

  factory InspectionData.fromJson(Map<String, dynamic> json) {
    return InspectionData(
      photos: (json['photos'] as List?)?.whereType<String>().toList() ?? [],
      damageReport: json['damageReport']?.toString(),
      completedAt: json['completedAt']?.toString(),
      additionalParts:
          (json['additionalParts'] as List?)
              ?.map((p) => AdditionalPart.fromJson(p))
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

  factory AdditionalPart.fromJson(Map<String, dynamic> json) {
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

  factory QCData.fromJson(Map<String, dynamic> json) {
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

  factory ServiceExecutionData.fromJson(Map<String, dynamic> json) {
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

  factory BillingData.fromJson(Map<String, dynamic> json) {
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

  factory PartItem.fromJson(Map<String, dynamic> json) {
    return PartItem(
      name: json['name']?.toString(),
      quantity: json['quantity'] is num ? (json['quantity'] as num) : 0,
      price: json['price'] is num ? (json['price'] as num) : 0,
    );
  }
}
