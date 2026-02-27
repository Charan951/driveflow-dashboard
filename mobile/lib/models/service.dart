class ServiceItem {
  final String id;
  final String name;
  final num price;
  final String? category;
  final String? description;
  final String? image;
  final num? estimatedMinutes;

  ServiceItem({
    required this.id,
    required this.name,
    required this.price,
    this.category,
    this.description,
    this.image,
    this.estimatedMinutes,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      price: (json['price'] ?? 0) as num,
      category: json['category']?.toString(),
      description: json['description']?.toString(),
      image: json['image']?.toString(),
      estimatedMinutes: json['estimatedMinutes'] is num
          ? (json['estimatedMinutes'] as num)
          : null,
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
      if (estimatedMinutes != null) 'estimatedMinutes': estimatedMinutes,
    };
  }
}
