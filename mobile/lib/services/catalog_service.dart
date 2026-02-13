import '../core/api_client.dart';
import '../core/env.dart';
import '../models/service.dart';

class CatalogService {
  final ApiClient _api = ApiClient();

  Future<List<ServiceItem>> listServices() async {
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
    return items;
  }
}
