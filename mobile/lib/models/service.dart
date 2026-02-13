class ServiceItem {
  final String id;
  final String name;
  final num price;

  ServiceItem({required this.id, required this.name, required this.price});

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      price: (json['price'] ?? 0) as num,
    );
  }
}
