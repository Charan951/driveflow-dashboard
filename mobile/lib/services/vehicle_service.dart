import '../core/api_client.dart';
import '../core/env.dart';
import '../models/vehicle.dart';

class VehicleService {
  final ApiClient _api = ApiClient();

  Future<List<Vehicle>> listMyVehicles() async {
    final res = await _api.getAny(ApiEndpoints.vehicles);
    final items = <Vehicle>[];
    if (res is List) {
      for (final e in res) {
        if (e is Map<String, dynamic>) {
          items.add(Vehicle.fromJson(e));
        } else if (e is Map) {
          items.add(Vehicle.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    return items;
  }

  Future<Vehicle> addVehicle({
    required String licensePlate,
    required String make,
    required String model,
    required int year,
    String type = 'Car',
  }) async {
    final res = await _api.postAny(
      ApiEndpoints.vehicles,
      body: {
        'licensePlate': licensePlate,
        'make': make,
        'model': model,
        'year': year,
        'type': type,
      },
    );
    if (res is Map<String, dynamic>) return Vehicle.fromJson(res);
    if (res is Map) return Vehicle.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }
}
