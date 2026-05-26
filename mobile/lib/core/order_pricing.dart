import '../models/service.dart' show ServiceItem;

const double checkoutGstRate = 0.18;

double _round2(double n) => (n * 100).roundToDouble() / 100;

/// Display INR with 2 decimal places (values are not truncated to integers).
String formatInrAmount(num value) {
  final amount = value is double ? value : value.toDouble();
  return amount.toStringAsFixed(2);
}

bool isGeneralServiceItem(ServiceItem service) {
  final cat = service.category ?? '';
  final name = service.name.toLowerCase();
  return cat == 'Periodic' ||
      cat == 'Services' ||
      name.contains('general service');
}

bool isGeneralServiceList(Iterable<ServiceItem> services) {
  return services.any(isGeneralServiceItem);
}

class OrderTotals {
  final double subtotal;
  final double discountAmount;
  final double discountedSubtotal;
  final double tax;
  final double total;

  const OrderTotals({
    required this.subtotal,
    required this.discountAmount,
    required this.discountedSubtotal,
    required this.tax,
    required this.total,
  });
}

OrderTotals calculateOrderTotals(
  double subtotal, [
  double discountAmount = 0,
  bool applyTax = true,
]) {
  final sub = _round2(subtotal < 0 ? 0 : subtotal);
  final disc = _round2(discountAmount < 0 ? 0 : discountAmount);
  final discountedSubtotal = _round2((sub - disc).clamp(0, double.infinity));
  final tax = applyTax ? _round2(discountedSubtotal * checkoutGstRate) : 0.0;
  final total = _round2(discountedSubtotal + tax);
  return OrderTotals(
    subtotal: sub,
    discountAmount: disc,
    discountedSubtotal: discountedSubtotal,
    tax: tax,
    total: total,
  );
}
