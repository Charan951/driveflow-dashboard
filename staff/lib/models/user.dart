class StaffUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? subRole;
  final String? status;
  final String? category;
  final String? phone;
  final bool? isShopOpen;
  final bool? isOnline;
  final String? lastSeen;
  final bool? isApproved;
  final String? createdAt;
  final UserLocation? location;

  StaffUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.subRole,
    this.status,
    this.category,
    this.phone,
    this.isShopOpen,
    this.isOnline,
    this.lastSeen,
    this.isApproved,
    this.createdAt,
    this.location,
  });

  factory StaffUser.fromJson(Map<String, dynamic> json) {
    return StaffUser(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      subRole: json['subRole']?.toString(),
      status: json['status']?.toString(),
      category: json['category']?.toString(),
      phone: json['phone']?.toString(),
      isShopOpen: json['isShopOpen'] as bool?,
      isOnline: json['isOnline'] as bool?,
      lastSeen: json['lastSeen']?.toString(),
      isApproved: json['isApproved'] as bool?,
      createdAt: json['createdAt']?.toString(),
      location: json['location'] != null
          ? UserLocation.fromJson(Map<String, dynamic>.from(json['location']))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'role': role,
      'subRole': subRole,
      'status': status,
      'category': category,
      'phone': phone,
      'isShopOpen': isShopOpen,
      'isOnline': isOnline,
      'lastSeen': lastSeen,
      'isApproved': isApproved,
      'createdAt': createdAt,
      if (location != null) 'location': location!.toJson(),
    };
  }
}

class UserLocation {
  final String? address;
  final double? lat;
  final double? lng;

  const UserLocation({this.address, this.lat, this.lng});

  factory UserLocation.fromJson(Map<String, dynamic> json) {
    return UserLocation(
      address: json['address']?.toString(),
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {'address': address, 'lat': lat, 'lng': lng};
}
