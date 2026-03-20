import '../core/api_client.dart';
import '../core/env.dart';

class PaymentData {
  final String id;
  final String bookingId;
  final num amount;
  final num platformFee;
  final num merchantEarnings;
  final String status;
  final String? paymentId;
  final String date;
  final String? userName;
  final String? userEmail;

  PaymentData({
    required this.id,
    required this.bookingId,
    required this.amount,
    required this.platformFee,
    required this.merchantEarnings,
    required this.status,
    this.paymentId,
    required this.date,
    this.userName,
    this.userEmail,
  });

  factory PaymentData.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return PaymentData(
      id: (json['_id'] ?? '').toString(),
      bookingId: (json['bookingId'] ?? '').toString(),
      amount: (json['amount'] ?? 0) as num,
      platformFee: (json['platformFee'] ?? 0) as num,
      merchantEarnings: (json['merchantEarnings'] ?? 0) as num,
      status: (json['status'] ?? '').toString(),
      paymentId: json['paymentId']?.toString(),
      date: (json['date'] ?? '').toString(),
      userName: user is Map ? user['name']?.toString() : null,
      userEmail: user is Map ? user['email']?.toString() : null,
    );
  }
}

class PaymentService {
  final ApiClient _api = ApiClient();

  // Dummy payment (replaces Razorpay)
  Future<Map<String, dynamic>> processDummyPayment(
    String bookingId, {
    Map<String, dynamic>? tempBookingData,
  }) async {
    return await _api.postJson(
      ApiEndpoints.paymentsDummyPay,
      body: {
        'bookingId': tempBookingData != null ? null : bookingId,
        'tempBookingData': ?tempBookingData,
      },
    );
  }

  // Legacy Razorpay endpoints
  Future<Map<String, dynamic>> createOrder(String bookingId) async {
    return await _api.postJson(
      ApiEndpoints.paymentsCreateOrder,
      body: {'bookingId': bookingId},
    );
  }

  Future<Map<String, dynamic>> verifyPayment(Map<String, dynamic> data) async {
    return await _api.postJson(ApiEndpoints.paymentsVerifyPayment, body: data);
  }

  Future<List<PaymentData>> getAllPayments() async {
    final res = await _api.getAny('/payments');
    final items = <PaymentData>[];
    if (res is List) {
      for (final e in res) {
        if (e is Map<String, dynamic>) {
          items.add(PaymentData.fromJson(e));
        } else if (e is Map) {
          items.add(PaymentData.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    return items;
  }
}
