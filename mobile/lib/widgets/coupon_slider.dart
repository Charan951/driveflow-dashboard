import 'dart:async';
import 'package:flutter/material.dart';
import '../services/coupon_service.dart';
import '../core/app_colors.dart';

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

  final List<Color> _cardColors = [
    const Color(0xFF2563EB), // blue-600
    const Color(0xFF9333EA), // purple-600
    const Color(0xFFDB2777), // pink-600
    const Color(0xFFEA580C), // orange-600
    const Color(0xFF16A34A), // green-600
    const Color(0xFF4F46E5), // indigo-600
    const Color(0xFFE11D48), // rose-600
    const Color(0xFFD97706), // amber-600
  ];

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

  void _startAutoScroll() {
    _scrollTimer?.cancel();
    _scrollTimer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (_scrollController.hasClients) {
        final itemWidth = 228.0; // 208 width + 20 margin
        final totalWidth = _coupons.length * itemWidth;

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
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: SizedBox(
        height: 104, // Decreased overall height
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
            const accentColor = Color(0xFF996515); // Golden Brown for contrast

            return AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 208, // Slightly narrower
              margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [cardColor, cardColor.withOpacity(0.8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: accentColor.withOpacity(0.3),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: cardColor.withOpacity(0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Stack(
                  children: [
                    // Background Decoration - Ticket Icon
                    Positioned(
                      top: -15,
                      right: -15,
                      child: Opacity(
                        opacity: 0.1,
                        child: Transform.rotate(
                          angle: 0.2,
                          child: const Icon(
                            Icons.confirmation_number_rounded,
                            size: 100,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),

                    // Card Content
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.local_offer_rounded,
                                      size: 8,
                                      color: textColor,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'PREMIUM OFFER',
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 7,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                coupon['code']?.toString().toUpperCase() ?? '',
                                style: const TextStyle(
                                  color: textColor,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ],
                          ),

                          // Bottom Section
                          Container(
                            padding: const EdgeInsets.only(top: 6),
                            decoration: BoxDecoration(
                              border: Border(
                                top: BorderSide(
                                  color: textColor.withOpacity(0.1),
                                  width: 1,
                                ),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${coupon['discountPercentage']}% OFF',
                                      style: const TextStyle(
                                        color: textColor,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'Min. ₹${coupon['minOrderAmount']}',
                                      style: const TextStyle(
                                        color: textColor,
                                        fontSize: 8,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Card Notch Effects (Circular Cutouts)
                    Positioned(
                      left: -8,
                      top: 0,
                      bottom: 0,
                      child: Center(
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            color: Theme.of(context).scaffoldBackgroundColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      right: -8,
                      top: 0,
                      bottom: 0,
                      child: Center(
                        child: Container(
                          width: 16,
                          height: 16,
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

class _DashPainter extends CustomPainter {
  final Color color;
  _DashPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    var paint = Paint()
      ..color = color
      ..strokeWidth = 2;
    var max = size.width;
    var dashWidth = 5;
    var dashSpace = 3;
    double startX = 0;
    while (startX < max) {
      canvas.drawLine(Offset(startX, 0), Offset(startX + dashWidth, 0), paint);
      startX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
