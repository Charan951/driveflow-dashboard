class Vehicle {
  final String id;
  final String make;
  final String model;
  final int year;
  final String licensePlate;
  final String? type;
  final String? status;
  final String? image;

  Vehicle({
    required this.id,
    required this.make,
    required this.model,
    required this.year,
    required this.licensePlate,
    this.type,
    this.status,
    this.image,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      make: (json['make'] ?? '').toString(),
      model: (json['model'] ?? '').toString(),
      year: (json['year'] is num) ? (json['year'] as num).toInt() : 0,
      licensePlate: (json['licensePlate'] ?? '').toString(),
      type: json['type']?.toString(),
      status: json['status']?.toString(),
      image: json['image']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'make': make,
      'model': model,
      'year': year,
      'licensePlate': licensePlate,
      if (type != null) 'type': type,
      if (status != null) 'status': status,
      if (image != null) 'image': image,
    };
  }
}
