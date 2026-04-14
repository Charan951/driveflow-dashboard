import '../core/api_client.dart';
import '../core/env.dart';
import '../models/service.dart';

class CatalogService {
  final ApiClient _api = ApiClient();

  static List<ServiceItem>? _cachedServices;
  static DateTime? _lastFetchAt;
  static Future<List<ServiceItem>>? _activeFetch;
  static const Duration _cacheDuration = Duration(minutes: 5);

  Future<List<ServiceItem>> listServices({
    bool forceRefresh = false,
    bool? isQuickService,
    String? category,
    String? vehicleType,
  }) async {
    final now = DateTime.now();

    // Use cache if available and not forced
    if (!forceRefresh &&
        isQuickService == null &&
        category == null &&
        vehicleType == null &&
        _cachedServices != null &&
        _lastFetchAt != null &&
        now.difference(_lastFetchAt!) < _cacheDuration) {
      return _cachedServices!;
    }

    // Return active fetch if one is already in progress
    if (_activeFetch != null && !forceRefresh) {
      return _activeFetch!;
    }

    _activeFetch = _doFetch(
      forceRefresh,
      isQuickService,
      category,
      vehicleType,
    );
    try {
      return await _activeFetch!;
    } finally {
      _activeFetch = null;
    }
  }

  Future<List<ServiceItem>> _doFetch(
    bool forceRefresh,
    bool? isQuickService,
    String? category,
    String? vehicleType,
  ) async {
    final items = <ServiceItem>[];
    String url = ApiEndpoints.services;
    final List<String> params = [];
    if (isQuickService != null) params.add('isQuickService=$isQuickService');
    if (category != null) params.add('category=$category');
    if (vehicleType != null) params.add('vehicleType=$vehicleType');

    if (params.isNotEmpty) {
      url += '?${params.join('&')}';
    }

    final res = await _api.getAny(url);
    final data = res is Map ? (res['data'] ?? res['services'] ?? res) : res;
    if (data is List) {
      for (final e in data) {
        if (e is Map<String, dynamic>) {
          items.add(ServiceItem.fromJson(e));
        } else if (e is Map) {
          items.add(ServiceItem.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }

    // Only cache full service list
    if (isQuickService == null && category == null && vehicleType == null) {
      _cachedServices = items;
      _lastFetchAt = DateTime.now();
    }

    return items;
  }
}
