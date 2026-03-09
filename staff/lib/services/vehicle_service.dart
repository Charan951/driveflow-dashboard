import '../../core/api_client.dart';

class Vehicle {
  final String id;
  final String brand;
  final String model;
  final String number;
  final String? year;
  final String? color;
  final String? ownerName;

  Vehicle({
    required this.id,
    required this.brand,
    required this.model,
    required this.number,
    this.year,
    this.color,
    this.ownerName,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['_id'] ?? '',
      brand: json['brand'] ?? '',
      model: json['model'] ?? '',
      number: json['number'] ?? '',
      year: json['year']?.toString(),
      color: json['color']?.toString(),
      ownerName: json['user'] is Map ? json['user']['name'] : null,
    );
  }
}

class VehicleService {
  final ApiClient _api = ApiClient();

  Future<List<Vehicle>> getVehicles() async {
    final response = await _api.getAny('/vehicles/all');
    if (response is List) {
      return response.map((json) => Vehicle.fromJson(json)).toList();
    }
    return [];
  }
}
