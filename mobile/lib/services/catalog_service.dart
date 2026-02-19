import '../core/api_client.dart';
import '../core/env.dart';
import '../models/service.dart';

class CatalogService {
  final ApiClient _api = ApiClient();

  static List<ServiceItem>? _cachedServices;
  static DateTime? _lastFetchAt;
  static const Duration _cacheDuration = Duration(minutes: 5);

  Future<List<ServiceItem>> listServices({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedServices != null &&
        _lastFetchAt != null &&
        now.difference(_lastFetchAt!) < _cacheDuration) {
      return _cachedServices!;
    }

    final items = <ServiceItem>[];
    final res = await _api.getAny(ApiEndpoints.services);
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
