import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/coupon_service.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';
import '../state/auth_provider.dart';

class CouponsPage extends StatefulWidget {
  const CouponsPage({super.key});

  @override
  State<CouponsPage> createState() => _CouponsPageState();
}

class _CouponsPageState extends State<CouponsPage> {
  final _couponService = CouponService();
  bool _loading = true;
  List<dynamic> _coupons = [];
  String? _error;

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
        title: const Text(
          'Available Coupons',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _fetchCoupons,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 48,
                      color: Colors.red,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Failed to load coupons',
                      style: AppStyles.headingStyle,
                    ),
                    TextButton(
                      onPressed: _fetchCoupons,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              )
            : _coupons.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.local_offer_outlined,
                      size: 64,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No coupons available right now',
                      style: AppStyles.captionStyle,
                    ),
                  ],
                ),
              )
            : GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 1,
                  mainAxisExtent: 160,
                  mainAxisSpacing: 16,
                ),
                itemCount: _coupons.length,
                itemBuilder: (context, index) {
                  final coupon = _coupons[index];
                  return _buildCouponCard(coupon, isDark);
                },
              ),
      ),
    );
  }

  Widget _buildCouponCard(Map<String, dynamic> coupon, bool isDark) {
    final colors = [
      [const Color(0xFF4F46E5), const Color(0xFF4338CA)], // Indigo
      [const Color(0xFFE11D48), const Color(0xFFBE123C)], // Rose
      [const Color(0xFF059669), const Color(0xFF047857)], // Emerald
      [const Color(0xFFD97706), const Color(0xFFB45309)], // Amber
      [const Color(0xFF0284C7), const Color(0xFF0369A1)], // Light Blue
    ];
    final gradientColors = colors[_coupons.indexOf(coupon) % colors.length];

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradientColors,
        ),
        boxShadow: [
          BoxShadow(
            color: gradientColors[0].withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Positioned(
              right: -20,
              top: -20,
              child: Opacity(
                opacity: 0.1,
                child: Transform.rotate(
                  angle: 0.2,
                  child: const Icon(
                    Icons.local_offer_rounded,
                    size: 140,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'OFFER',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            coupon['code']?.toString().toUpperCase() ?? '',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.content_copy_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${coupon['discountPercentage']}% OFF',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          if (coupon['description'] != null)
                            Text(
                              coupon['description'],
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                      if (coupon['minOrderAmount'] != null &&
                          coupon['minOrderAmount'] > 0)
                        Text(
                          'Min. ₹${coupon['minOrderAmount']}',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            // Notch effect
            Positioned(
              left: -10,
              top: 0,
              bottom: 0,
              child: Center(
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.backgroundPrimary
                        : AppColors.backgroundPrimaryLight,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
            Positioned(
              right: -10,
              top: 0,
              bottom: 0,
              child: Center(
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.backgroundPrimary
                        : AppColors.backgroundPrimaryLight,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
