class StaffUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? subRole;
  final String? phone;
  final bool? isShopOpen;
  final UserLocation? location;

  StaffUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.subRole,
    this.phone,
    this.isShopOpen,
    this.location,
  });

  factory StaffUser.fromJson(Map<String, dynamic> json) {
    return StaffUser(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      subRole: json['subRole']?.toString(),
      phone: json['phone']?.toString(),
      isShopOpen: json['isShopOpen'] as bool?,
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
      'phone': phone,
      'isShopOpen': isShopOpen,
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
