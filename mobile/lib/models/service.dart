class ServiceItem {
  final String id;
  final String name;
  final num price;
  final String? category;
  final String? description;
  final String? image;
  final int? duration;
  int? get estimatedMinutes => duration;
  final String? estimationTime;
  final String? vehicleType;
  final List<String> features;
  final bool isQuickService;

  ServiceItem({
    required this.id,
    required this.name,
    required this.price,
    this.category,
    this.description,
    this.image,
    this.duration,
    this.estimationTime,
    this.vehicleType,
    this.features = const [],
    this.isQuickService = false,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      price: (json['price'] ?? 0) as num,
      category: json['category']?.toString(),
      description: json['description']?.toString(),
      image: json['image']?.toString(),
      duration: json['duration'] is num
          ? (json['duration'] as num).toInt()
          : (json['estimatedMinutes'] is num
                ? (json['estimatedMinutes'] as num).toInt()
                : null),
      estimationTime: json['estimationTime']?.toString(),
      vehicleType: json['vehicleType']?.toString(),
      features: (json['features'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      isQuickService: json['isQuickService'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      if (category != null) 'category': category,
      if (description != null) 'description': description,
      if (image != null) 'image': image,
      if (duration != null) 'duration': duration,
      if (estimationTime != null) 'estimationTime': estimationTime,
      if (vehicleType != null) 'vehicleType': vehicleType,
      'features': features,
      'isQuickService': isQuickService,
    };
  }
}
