import '../core/api_client.dart';
import '../core/env.dart';
import '../models/service.dart';

class CatalogService {
  final ApiClient _api = ApiClient();

  static List<ServiceItem>? _cachedServices;
  static DateTime? _lastFetchAt;
  static const Duration _cacheDuration = Duration(minutes: 5);

  Future<List<ServiceItem>> listServices({
    bool forceRefresh = false,
    bool? isQuickService,
    String? category,
    String? vehicleType,
  }) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        isQuickService == null &&
        category == null &&
        vehicleType == null &&
        _cachedServices != null &&
        _lastFetchAt != null &&
        now.difference(_lastFetchAt!) < _cacheDuration) {
      return _cachedServices!;
    }

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
    _cachedServices = items;
    _lastFetchAt = now;
    return items;
  }
}
