class ServiceItem {
  final String id;
  final String name;
  final num price;
  final String? category;
  final String? description;
  final num? estimatedMinutes;

  ServiceItem({
    required this.id,
    required this.name,
    required this.price,
    this.category,
    this.description,
    this.estimatedMinutes,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      price: (json['price'] ?? 0) as num,
      category: json['category']?.toString(),
      description: json['description']?.toString(),
      estimatedMinutes: json['estimatedMinutes'] is num
          ? (json['estimatedMinutes'] as num)
          : null,
    );
  }
}
