import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/coupon_service.dart';
import '../state/auth_provider.dart';

class CouponSlider extends StatefulWidget {
  final List<dynamic>? initialCoupons;

  const CouponSlider({super.key, this.initialCoupons});

  @override
  State<CouponSlider> createState() => _CouponSliderState();
}

class _CouponSliderState extends State<CouponSlider> {
  final _couponService = CouponService();
  final _scrollController = ScrollController();
  Timer? _scrollTimer;
  List<dynamic> _coupons = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    if (widget.initialCoupons != null) {
      _coupons = _filterActive(widget.initialCoupons!);
      _loading = false;
      if (_coupons.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _startAutoScroll());
      } else {
        _fetchCoupons(); // Fallback to fetch if provided list is empty after filtering
      }
    } else {
      _fetchCoupons();
    }
  }

  @override
  void didUpdateWidget(CouponSlider oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialCoupons != oldWidget.initialCoupons &&
        widget.initialCoupons != null) {
      setState(() {
        _coupons = _filterActive(widget.initialCoupons!);
        _loading = false;
      });
      if (_coupons.isNotEmpty) {
        _startAutoScroll();
      }
    }
  }

  List<dynamic> _filterActive(List<dynamic> data) {
    final now = DateTime.now();
    final user = context.read<AuthProvider>().user;

    return data.where((c) {
      if (c is! Map) return false;
      final isActive = c['isActive'] == true;
      if (!isActive) return false;

      final validUntilStr = c['validUntil'];
      if (validUntilStr != null) {
        try {
          final validUntil = DateTime.parse(validUntilStr);
          if (validUntil.isBefore(now)) return false;
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
  }

  Future<void> _fetchCoupons() async {
    try {
      final data = await _couponService.getCoupons();
      final active = _filterActive(data);
      if (mounted) {
        setState(() {
          _coupons = active;
          _loading = false;
        });
        if (_coupons.isNotEmpty) {
          _startAutoScroll();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _coupons = [];
          _loading = false;
        });
      }
    }
  }

  double _getItemWidth(dynamic coupon) {
    if (coupon is! Map) return 200.0;
    final code = coupon['code']?.toString() ?? '';
    // Each character is roughly 12px, left side is 3/7 of total width.
    // We add more buffer to account for padding, margins, and the divider.
    final double calculated = (code.length * 12.0) / 3 * 7 + 80;
    return calculated < 200.0 ? 200.0 : calculated;
  }

  void _startAutoScroll() {
    _scrollTimer?.cancel();
    _scrollTimer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (_scrollController.hasClients) {
        double totalWidth = 0;
        for (final c in _coupons) {
          totalWidth += _getItemWidth(c) + 16; // width + horizontal margins
        }

        if (_scrollController.offset >= totalWidth) {
          // Jump back by one set width for seamless loop
          _scrollController.jumpTo(_scrollController.offset - totalWidth);
        } else {
          _scrollController.jumpTo(_scrollController.offset + 1);
        }
      }
    });
  }

  @override
  void dispose() {
    _scrollTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox.shrink();
    if (_coupons.isEmpty) return const SizedBox.shrink();

    // Multiply coupons for seamless loop
    final displayCoupons = [..._coupons, ..._coupons, ..._coupons, ..._coupons];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: SizedBox(
        height: 82, // Significantly reduced height for banner style
        child: ListView.builder(
          controller: _scrollController,
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: displayCoupons.length,
          itemBuilder: (context, index) {
            final coupon = displayCoupons[index];
            // Luxury Gold Theme
            const cardColor = Color(0xFFD4AF37);
            const textColor = Colors.black87;
            const accentColor = Color(0xFF996515);

            return AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: _getItemWidth(coupon),
              margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [cardColor, cardColor.withValues(alpha: 0.9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: accentColor.withValues(alpha: 0.4),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  children: [
                    // Background Decoration - Ticket Icon
                    Positioned(
                      top: -10,
                      right: -10,
                      child: Opacity(
                        opacity: 0.08,
                        child: Transform.rotate(
                          angle: 0.1,
                          child: const Icon(
                            Icons.confirmation_number_rounded,
                            size: 60,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),

                    // Card Content
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      child: Row(
                        children: [
                          // Left Section: Code and Label
                          Expanded(
                            flex: 3,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.local_offer_rounded,
                                      size: 8,
                                      color: textColor,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'OFFER',
                                      style: TextStyle(
                                        color: textColor.withValues(alpha: 0.6),
                                        fontSize: 7,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.0,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  coupon['code']?.toString().toUpperCase() ??
                                      '',
                                  style: const TextStyle(
                                    color: textColor,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Divider
                          Container(
                            width: 1,
                            height: 30,
                            margin: const EdgeInsets.symmetric(horizontal: 8),
                            color: textColor.withValues(alpha: 0.1),
                          ),

                          // Right Section: Discount and Min Order
                          Expanded(
                            flex: 4,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  '${coupon['discountPercentage']}% OFF',
                                  style: const TextStyle(
                                    color: textColor,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                if (coupon['minOrderAmount'] != null)
                                  Text(
                                    'Min. ₹${coupon['minOrderAmount']}',
                                    style: TextStyle(
                                      color: textColor.withValues(alpha: 0.7),
                                      fontSize: 8,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Card Notch Effects (Circular Cutouts)
                    Positioned(
                      left: -6,
                      top: 0,
                      bottom: 0,
                      child: Center(
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: Theme.of(context).scaffoldBackgroundColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      right: -6,
                      top: 0,
                      bottom: 0,
                      child: Center(
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: Theme.of(context).scaffoldBackgroundColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
