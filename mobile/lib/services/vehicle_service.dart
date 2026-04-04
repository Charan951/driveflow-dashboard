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
    String? vin,
    num? mileage,
    String? fuelType,
    String? color,
    String? frontTyres,
    String? rearTyres,
    String? batteryDetails,
  }) async {
    final res = await _api.postAny(
      ApiEndpoints.vehicles,
      body: {
        'licensePlate': licensePlate,
        'make': make,
        'model': model,
        'year': year,
        'type': type,
        'vin': vin,
        'mileage': mileage,
        'fuelType': fuelType,
        'color': color,
        'frontTyres': frontTyres,
        'rearTyres': rearTyres,
        'batteryDetails': batteryDetails,
      }..removeWhere((k, v) => v == null),
    );
    if (res is Map<String, dynamic>) return Vehicle.fromJson(res);
    if (res is Map) return Vehicle.fromJson(Map<String, dynamic>.from(res));
    throw ApiException(statusCode: 500, message: 'Unexpected response type');
  }

  Future<Map<String, dynamic>?> searchReference({
    required String make,
    required String model,
    String? variant,
  }) async {
    try {
      final queryParams = {
        'brand_name': make,
        'model': model,
        if (variant != null) 'variant': variant,
      };

      final queryString = queryParams.entries
          .map(
            (e) =>
                '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}',
          )
          .join('&');

      final res = await _api.getAny(
        '${ApiEndpoints.vehicleReferenceSearch}?$queryString',
      );
      if (res is Map<String, dynamic>) return res;
      if (res is Map) return Map<String, dynamic>.from(res);
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> fetchDetails(String licensePlate) async {
    try {
      final res = await _api.postAny(
        ApiEndpoints.fetchVehicleDetails,
        body: {'licensePlate': licensePlate},
      );
      if (res is Map<String, dynamic>) return res;
      if (res is Map) return Map<String, dynamic>.from(res);
      return null;
    } catch (e) {
      return null;
    }
  }
}
