import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/coupon_service.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';
import '../state/auth_provider.dart';
import '../models/booking.dart';

class CouponsPage extends StatefulWidget {
  final bool isSelectionMode;
  final Function(Map<String, dynamic>)? onSelect;
  final double? bookingTotal;
  final String? bookingCategory;
  final Booking? booking;

  const CouponsPage({
    super.key,
    this.isSelectionMode = false,
    this.onSelect,
    this.bookingTotal,
    this.bookingCategory,
    this.booking,
  });

  @override
  State<CouponsPage> createState() => _CouponsPageState();
}

class _CouponsPageState extends State<CouponsPage> {
  final _couponService = CouponService();
  bool _loading = true;
  List<dynamic> _coupons = [];
  String? _error;
  Map<String, dynamic>? _selectedCoupon;

  @override
  void initState() {
    super.initState();
    _fetchCoupons();
  }

  Future<void> _fetchCoupons() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _couponService.getCoupons();
      if (!mounted) return;
      final user = context.read<AuthProvider>().user;

      final active = data.where((c) {
        if (c is! Map) return false;
        final isActive = c['isActive'] == true;
        if (!isActive) return false;

        // Filter by category if in selection mode
        if (widget.isSelectionMode &&
            widget.bookingCategory != null &&
            widget.bookingCategory!.isNotEmpty &&
            widget.bookingCategory!.toLowerCase() != 'all') {
          final List<dynamic>? couponCategories = c['applicableCategories'];
          if (couponCategories != null && couponCategories.isNotEmpty) {
            final matchesCategory = couponCategories.any((cat) =>
                cat.toString().toLowerCase() ==
                widget.bookingCategory!.toLowerCase());
            if (!matchesCategory) return false;
          }
        }

        final validUntilStr = c['validUntil'];
        if (validUntilStr != null) {
          try {
            final validUntil = DateTime.parse(validUntilStr);
            if (validUntil.isBefore(DateTime.now())) return false;
          } catch (_) {}
        }

        // Filter by targeted users
        final List<dynamic>? targetUsers = c['targetUsers'];
        if (targetUsers != null && targetUsers.isNotEmpty) {
          final bool isTargeted = targetUsers.any((target) {
            final String? targetEmail = target['email'];
            final String? targetMobile = target['mobile'];

            return (user?.email != null &&
                    targetEmail != null &&
                    targetEmail.toLowerCase() == user!.email.toLowerCase()) ||
                (user?.phone != null &&
                    targetMobile != null &&
                    targetMobile == user!.phone);
          });
          if (!isTargeted) return false;
        }

        return true;
      }).toList();

      if (mounted) {
        setState(() {
          _coupons = active;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark
          ? AppColors.backgroundPrimary
          : AppColors.backgroundPrimaryLight,
      appBar: AppBar(
        title: Text(
          widget.isSelectionMode ? 'Checkout' : 'Available Coupons',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: _buildBody(isDark),
      bottomNavigationBar: widget.isSelectionMode ? _buildBottomButton() : null,
    );
  }

  Widget _buildBody(bool isDark) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Failed to load coupons', style: AppStyles.headingStyle),
            TextButton(onPressed: _fetchCoupons, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (!widget.isSelectionMode && _coupons.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_offer_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text('No coupons available right now', style: AppStyles.captionStyle),
          ],
        ),
      );
    }

    if (widget.isSelectionMode) {
      return RefreshIndicator(
        onRefresh: _fetchCoupons,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildBillSummary(isDark),
              const SizedBox(height: 24),
              _buildCouponsSection(isDark),
              const SizedBox(height: 100), // Space for bottom button
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchCoupons,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 1,
          mainAxisExtent: 160,
          mainAxisSpacing: 16,
        ),
        itemCount: _coupons.length,
        itemBuilder: (context, index) => _buildCouponCard(_coupons[index], isDark),
      ),
    );
  }

  Widget _buildBillSummary(bool isDark) {
    final booking = widget.booking;
    if (booking == null) return const SizedBox.shrink();

    final billing = booking.billing;
    final total = billing?.total ?? booking.totalAmount;
    final labourCost = billing?.labourCost ?? 0;
    final partsTotal = billing?.partsTotal ?? 0;
    final pickupDropPrice = billing?.pickupDropPrice ?? 0;
    final gst = billing?.gst ?? 0;

    double couponDiscount = 0;
    if (_selectedCoupon != null) {
      final percent = (_selectedCoupon!['discountPercentage'] ?? 0) as num;
      couponDiscount = (total * percent) / 100;
    }
    final finalAmount = total - couponDiscount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Selected Services',
          style: TextStyle(
            color: Color(0xFF4A90E2),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              // General Service Cost
              if (labourCost > 0)
                _buildBillItem('General Service Cost', labourCost, isDark)
              else if (booking.services.isNotEmpty)
                ...booking.services.map((s) => _buildBillItem(s.name, s.price, isDark)),

              // Replaced Parts Cost
              if (partsTotal > 0)
                _buildBillItem('Replaced Parts Cost', partsTotal, isDark),

              // Pickup and Drop Cost
              if (pickupDropPrice > 0)
                _buildBillItem('Pickup & Drop Cost', pickupDropPrice, isDark),

              // GST
              if (gst > 0)
                _buildBillItem('GST', gst, isDark),

              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Amount',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      ),
                      const Text(
                        'Estimated Time: 90 mins',
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                    ],
                  ),
                  Text(
                    '₹${total.toStringAsFixed(0)}',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ],
              ),
              if (couponDiscount > 0) ...[
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Coupon Discount',
                      style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '-₹${couponDiscount.toStringAsFixed(0)}',
                      style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Final Amount',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  Text(
                    '₹${finalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF4A90E2),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBillItem(String label, num price, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark ? Colors.white70 : Colors.black87,
            ),
          ),
          Text(
            '₹${price.toStringAsFixed(0)}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCouponsSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Apply Coupon',
              style: TextStyle(
                color: Color(0xFF4A90E2),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (!widget.isSelectionMode)
              TextButton(
                onPressed: () {},
                child: const Text('View All'),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (_coupons.isEmpty)
          const Text('No coupons available')
        else
          SizedBox(
            height: 160,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _coupons.length,
              separatorBuilder: (context, index) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                final coupon = _coupons[index];
                return SizedBox(
                  width: 300,
                  child: _buildCouponCard(coupon, isDark),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildBottomButton() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: () {
              Navigator.pop(context, _selectedCoupon);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4A90E2),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Proceed to checkout',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCouponCard(Map<String, dynamic> coupon, bool isDark) {
    final String code = coupon['code']?.toString().toUpperCase() ?? '';
    final minAmount = (coupon['minOrderAmount'] ?? 0) as num;
    final meetsMinOrder =
        widget.bookingTotal == null || widget.bookingTotal! >= minAmount;
    final isSelected = _selectedCoupon?['code'] == coupon['code'];

    final cardBg = isDark ? const Color(0xFF121212) : const Color(0xFFF8F9FF);
    final accentColor = const Color(0xFF6366F1);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSelected
              ? accentColor
              : (isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05)),
          width: 2,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            Row(
              children: [
                // Left side: Rotated Code
                Container(
                  width: 50,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? accentColor.withValues(alpha: 0.1)
                        : (isDark ? Colors.white.withValues(alpha: 0.03) : Colors.black.withValues(alpha: 0.02)),
                  ),
                  child: Center(
                    child: RotatedBox(
                      quarterTurns: 3,
                      child: Text(
                        code,
                        style: TextStyle(
                          color: isSelected ? accentColor : (isDark ? Colors.white38 : Colors.black38),
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                        ),
                      ),
                    ),
                  ),
                ),

                // Dotted Divider
                CustomPaint(
                  size: const Size(1, double.infinity),
                  painter: _DottedLinePainter(
                    color: isDark ? Colors.white10 : Colors.black12,
                  ),
                ),

                // Right side: Content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${coupon['discountPercentage']}% OFF',
                          style: TextStyle(
                            color: isDark ? Colors.white : Colors.black,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Min. order ₹$minAmount',
                          style: TextStyle(
                            color: isDark ? Colors.white54 : Colors.black54,
                            fontSize: 13,
                          ),
                        ),
                        if (widget.isSelectionMode) ...[
                          const SizedBox(height: 16),
                          InkWell(
                            onTap: !meetsMinOrder
                                ? null
                                : () {
                                    setState(() {
                                      if (isSelected) {
                                        _selectedCoupon = null;
                                      } else {
                                        _selectedCoupon = coupon;
                                      }
                                    });
                                  },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: !meetsMinOrder
                                    ? Colors.grey.withValues(alpha: 0.1)
                                    : (isSelected ? accentColor : accentColor.withValues(alpha: 0.8)),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                !meetsMinOrder
                                    ? 'LOCKED'
                                    : (isSelected ? 'APPLIED' : 'APPLY'),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Top Notch
            Positioned(
              top: -10,
              left: 40,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.backgroundPrimary : AppColors.backgroundPrimaryLight,
                  shape: BoxShape.circle,
                ),
              ),
            ),
            // Bottom Notch
            Positioned(
              bottom: -10,
              left: 40,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.backgroundPrimary : AppColors.backgroundPrimaryLight,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DottedLinePainter extends CustomPainter {
  final Color color;
  _DottedLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    const dashHeight = 4;
    const dashSpace = 4;
    double startY = 10;
    while (startY < size.height - 10) {
      canvas.drawLine(Offset(0, startY), Offset(0, startY + dashHeight), paint);
      startY += dashHeight + dashSpace;
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
