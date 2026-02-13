class User {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatar;
  final String? role;
  final String? subRole;
  final bool? isShopOpen;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatar,
    this.role,
    this.subRole,
    this.isShopOpen,
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
      isShopOpen: json['isShopOpen'] is bool ? json['isShopOpen'] as bool : null,
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
    };
  }
}
