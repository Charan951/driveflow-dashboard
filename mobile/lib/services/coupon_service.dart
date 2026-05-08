import '../core/api_client.dart';

class CouponService {
  final ApiClient _api = ApiClient();

  Future<List<dynamic>> getCoupons() async {
    final res = await _api.getAny('/coupons');
    if (res is List) {
      return res;
    }
    return [];
  }

  Future<Map<String, dynamic>> validateCoupon(
    String code,
    double orderAmount,
  ) async {
    try {
      final res = await _api.postAny(
        '/coupons/validate',
        body: {'code': code, 'orderAmount': orderAmount},
      );
      return res as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to validate coupon: $e');
    }
  }
}
