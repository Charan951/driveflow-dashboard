class StaffUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? subRole;
  final String? phone;

  StaffUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.subRole,
    this.phone,
  });

  factory StaffUser.fromJson(Map<String, dynamic> json) {
    return StaffUser(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      subRole: json['subRole']?.toString(),
      phone: json['phone']?.toString(),
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
    };
  }
}
