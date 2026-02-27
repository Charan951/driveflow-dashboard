class User {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatar;
  final String? role;
  final String? subRole;
  final bool? isShopOpen;
  final List<SavedAddress> addresses;
  final List<PaymentMethod> paymentMethods;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatar,
    this.role,
    this.subRole,
    this.isShopOpen,
    this.addresses = const [],
    this.paymentMethods = const [],
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      phone: json['phone']?.toString(),
      avatar: json['avatar']?.toString(),
      role: json['role']?.toString(),
      subRole: json['subRole']?.toString(),
      isShopOpen: json['isShopOpen'] is bool
          ? json['isShopOpen'] as bool
          : null,
      addresses: (json['addresses'] as List? ?? [])
          .map((e) => SavedAddress.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      paymentMethods: (json['paymentMethods'] as List? ?? [])
          .map((e) => PaymentMethod.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      if (phone != null) 'phone': phone,
      if (avatar != null) 'avatar': avatar,
      if (role != null) 'role': role,
      if (subRole != null) 'subRole': subRole,
      if (isShopOpen != null) 'isShopOpen': isShopOpen,
      'addresses': addresses.map((e) => e.toJson()).toList(),
      'paymentMethods': paymentMethods.map((e) => e.toJson()).toList(),
    };
  }
}

class SavedAddress {
  final String label;
  final String address;
  final double lat;
  final double lng;
  final bool isDefault;

  SavedAddress({
    required this.label,
    required this.address,
    required this.lat,
    required this.lng,
    this.isDefault = false,
  });

  factory SavedAddress.fromJson(Map<String, dynamic> json) {
    return SavedAddress(
      label: (json['label'] ?? 'Home').toString(),
      address: (json['address'] ?? '').toString(),
      lat: (json['lat'] ?? 0.0).toDouble(),
      lng: (json['lng'] ?? 0.0).toDouble(),
      isDefault: json['isDefault'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'label': label,
    'address': address,
    'lat': lat,
    'lng': lng,
    'isDefault': isDefault,
  };
}

class PaymentMethod {
  final String type;
  final String label;
  final String? details;
  final bool isDefault;

  PaymentMethod({
    required this.type,
    required this.label,
    this.details,
    this.isDefault = false,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      type: (json['type'] ?? 'card').toString(),
      label: (json['label'] ?? '').toString(),
      details: json['details']?.toString(),
      isDefault: json['isDefault'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'label': label,
    if (details != null) 'details': details,
    'isDefault': isDefault,
  };
}
