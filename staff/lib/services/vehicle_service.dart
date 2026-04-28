import '../../core/api_client.dart';

class Vehicle {
  final String id;
  final String brand;
  final String model;
  final String number;
  final String? year;
  final String? color;
  final String? ownerName;
  final Map<String, dynamic>? healthIndicators;

  Vehicle({
    required this.id,
    required this.brand,
    required this.model,
    required this.number,
    this.year,
    this.color,
    this.ownerName,
    this.healthIndicators,
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
      healthIndicators: json['healthIndicators'] is Map
          ? Map<String, dynamic>.from(json['healthIndicators'])
          : null,
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

  Future<void> updateVehicleHealth(
    String vehicleId,
    Map<String, dynamic> healthIndicators,
  ) async {
    await _api.putJson(
      '/vehicles/$vehicleId/health',
      body: {'healthIndicators': healthIndicators},
    );
  }
}
