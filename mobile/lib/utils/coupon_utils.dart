import '../models/user.dart';

/// Admin coupon `applicableServices` values (see AdminCouponsPage.tsx).
const couponServiceAll = 'All';
const couponServiceGeneral = 'General Service';
const couponServiceCarWash = 'Car Wash';
const couponServiceEssentials = 'Essentials';
const couponServiceTyresBattery = 'Tyres and Battery';

/// Strip non-digits and use last 10 digits for Indian mobile comparison.
String? normalizeCouponPhone(String? value) {
  if (value == null) return null;
  final digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return null;
  if (digits.length >= 10) return digits.substring(digits.length - 10);
  return digits;
}

bool phonesMatchCouponTarget(String? userPhone, String? targetMobile) {
  final a = normalizeCouponPhone(userPhone);
  final b = normalizeCouponPhone(targetMobile);
  if (a == null || b == null) return false;
  return a == b;
}

/// Map a service category/name to admin coupon service labels.
String? mapCategoryToCouponServiceType(String? category, {String? serviceName}) {
  final cat = (category ?? '').toLowerCase();
  final name = (serviceName ?? '').toLowerCase();

  if (cat.contains('wash')) return couponServiceCarWash;
  if (cat.contains('essential')) return couponServiceEssentials;
  if (cat.contains('tyre') ||
      cat.contains('tire') ||
      cat.contains('battery')) {
    return couponServiceTyresBattery;
  }
  if (cat.contains('periodic') ||
      cat.contains('general') ||
      cat == 'services') {
    return couponServiceGeneral;
  }
  if (name.contains('general service')) return couponServiceGeneral;

  return null;
}

bool couponMatchesServiceType(
  List<dynamic>? applicableServices,
  String? serviceType,
) {
  if (serviceType == null || serviceType.isEmpty) return true;
  if (applicableServices == null || applicableServices.isEmpty) return true;
  if (applicableServices.contains(couponServiceAll)) return true;

  final normalizedTarget = serviceType.toLowerCase().replaceAll('&', 'and');
  return applicableServices.any((service) {
    final normalized =
        service.toString().toLowerCase().replaceAll('&', 'and');
    return normalized == normalizedTarget;
  });
}

bool couponMatchesTargetUser(Map<String, dynamic> coupon, User? user) {
  final targetUsers = coupon['targetUsers'];
  if (targetUsers is! List || targetUsers.isEmpty) return true;
  if (user == null) return false;

  return targetUsers.any((target) {
    if (target is! Map) return false;
    final targetEmail = target['email']?.toString();
    final targetMobile = target['mobile']?.toString();

    final emailMatch = user.email.isNotEmpty &&
        targetEmail != null &&
        targetEmail.toLowerCase() == user.email.toLowerCase();
    final phoneMatch = phonesMatchCouponTarget(user.phone, targetMobile);

    return emailMatch || phoneMatch;
  });
}

bool isCouponWithinValidity(Map<String, dynamic> coupon, [DateTime? now]) {
  final current = now ?? DateTime.now();

  final validFromStr = coupon['validFrom']?.toString();
  if (validFromStr != null && validFromStr.isNotEmpty) {
    try {
      if (current.isBefore(DateTime.parse(validFromStr))) return false;
    } catch (_) {}
  }

  final validUntilStr = coupon['validUntil']?.toString();
  if (validUntilStr != null && validUntilStr.isNotEmpty) {
    try {
      if (current.isAfter(DateTime.parse(validUntilStr))) return false;
    } catch (_) {}
  }

  return true;
}

bool isCouponUsageAvailable(Map<String, dynamic> coupon) {
  final usageLimit = coupon['usageLimit'];
  final usageCount = coupon['usageCount'];
  if (usageLimit == null) return true;
  final limit = (usageLimit as num?)?.toInt();
  final count = (usageCount as num?)?.toInt() ?? 0;
  if (limit == null || limit <= 0) return true;
  return count < limit;
}

List<Map<String, dynamic>> filterCouponsForUser({
  required List<dynamic> coupons,
  User? user,
  String? serviceType,
  bool requireMinOrderMet = false,
  double orderTotal = 0,
}) {
  final results = <Map<String, dynamic>>[];

  for (final raw in coupons) {
    if (raw is! Map) continue;
    final coupon = Map<String, dynamic>.from(raw);

    if (coupon['isActive'] != true) continue;
    if (!isCouponWithinValidity(coupon)) continue;
    if (!isCouponUsageAvailable(coupon)) continue;
    if (!couponMatchesTargetUser(coupon, user)) continue;

    final applicable = coupon['applicableServices'] is List
        ? coupon['applicableServices'] as List<dynamic>
        : null;
    if (!couponMatchesServiceType(applicable, serviceType)) continue;

    if (requireMinOrderMet) {
      final minAmount = (coupon['minOrderAmount'] ?? 0) as num;
      if (minAmount > 0 && orderTotal < minAmount) continue;
    }

    results.add(coupon);
  }

  return results;
}

List<dynamic> parseCouponsResponse(dynamic res) {
  if (res is List) return res;
  if (res is Map) {
    for (final key in ['coupons', 'data', 'items']) {
      final value = res[key];
      if (value is List) return value;
    }
  }
  return [];
}
