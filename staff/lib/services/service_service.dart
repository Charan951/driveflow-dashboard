import '../../core/api_client.dart';

class ServiceItem {
  final String id;
  final String name;
  final String description;
  final double price;
  final int duration;
  final String category;
  final String vehicleType;

  ServiceItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.duration,
    required this.category,
    required this.vehicleType,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      duration: json['duration'] ?? 0,
      category: json['category'] ?? '',
      vehicleType: json['vehicleType'] ?? '',
    );
  }
}

class ServiceService {
  final ApiClient _api = ApiClient();

  Future<List<ServiceItem>> getServices() async {
    final response = await _api.getAny('/services');
    if (response is List) {
      return response.map((json) => ServiceItem.fromJson(json)).toList();
    }
    return [];
  }
}
