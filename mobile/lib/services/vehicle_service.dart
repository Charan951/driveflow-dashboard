import '../core/api_client.dart';
import '../core/env.dart';
import '../models/vehicle.dart';

class VehicleService {
  final ApiClient _api = ApiClient();

  static List<Vehicle>? _cachedVehicles;
  static DateTime? _lastFetchAt;
  static Future<List<Vehicle>>? _activeFetch;
  static const Duration _cacheDuration = Duration(minutes: 5);

  Future<List<Vehicle>> listMyVehicles({bool forceRefresh = false}) async {
    final now = DateTime.now();

    // Check cache
    if (!forceRefresh &&
        _cachedVehicles != null &&
        _lastFetchAt != null &&
        now.difference(_lastFetchAt!) < _cacheDuration) {
      return _cachedVehicles!;
    }

    // Return active fetch if one is in progress
    if (_activeFetch != null && !forceRefresh) {
      return _activeFetch!;
    }

    _activeFetch = _doFetch(forceRefresh);
    try {
      return await _activeFetch!;
    } finally {
      _activeFetch = null;
    }
  }

  Future<List<Vehicle>> _doFetch(bool forceRefresh) async {
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
    _cachedVehicles = items;
    _lastFetchAt = DateTime.now();
    return items;
  }

  void clearCache() {
    _cachedVehicles = null;
    _lastFetchAt = null;
  }

  Future<Vehicle> addVehicle({
    required String licensePlate,
    required String make,
    required String model,
    String? variant,
    required int year,
    String type = 'Car',
    String? vin,
    num? mileage,
    String? fuelType,
    String? color,
    String? registrationDate,
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
        'variant': variant,
        'year': year,
        'type': type,
        'vin': vin,
        'mileage': mileage,
        'fuelType': fuelType,
        'color': color,
        'registrationDate': registrationDate,
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
      final m = make.trim();
      final md = model.trim();
      final v = (variant ?? '').trim();
      if (m.isEmpty || md.isEmpty || v.isEmpty) return null;
      final queryParams = {'brand_name': m, 'model': md, 'variant': v};

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
