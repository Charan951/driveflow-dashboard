import '../core/api_client.dart';
import '../utils/coupon_utils.dart';

class CouponService {
  final ApiClient _api = ApiClient();

  Future<List<dynamic>> getCoupons() async {
    final res = await _api.getAny('/coupons');
    return parseCouponsResponse(res);
  }

  Future<Map<String, dynamic>> validateCoupon(
    String code,
    double orderAmount, {
    String? serviceType,
    String? email,
    String? mobile,
  }) async {
    try {
      final res = await _api.postAny(
        '/coupons/validate',
        body: {
          'code': code,
          'orderAmount': orderAmount,
          'serviceType': serviceType,
          'email': email,
          'mobile': mobile,
        },
      );
      return res as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to validate coupon: $e');
    }
  }
}
