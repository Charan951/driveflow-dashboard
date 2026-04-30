import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/app_colors.dart';
import '../core/app_spacing.dart';
import '../core/app_styles.dart';
import '../core/storage.dart';
import '../models/booking.dart';
import '../models/service.dart';
import '../models/vehicle.dart';
import '../services/booking_service.dart';
import '../services/catalog_service.dart';
import '../services/notification_service.dart';
import '../services/socket_service.dart';
import '../services/vehicle_service.dart';
import '../services/review_service.dart';
import '../state/auth_provider.dart';
import '../state/navigation_provider.dart';

class CarzziDashboard extends StatefulWidget {
  const CarzziDashboard({super.key});

  @override
  State<CarzziDashboard> createState() => _CarzziDashboardState();
}

class _CarzziDashboardState extends State<CarzziDashboard>
    with WidgetsBindingObserver {
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();
  final _reviewService = ReviewService();
  final _notificationService = NotificationService();

  bool _loading = false;
  String? _error;
  DateTime? _lastLoadedAt;
  bool _isShowingNoVehicleDialog = false;

  List<ServiceItem> _services = [];
  List<Vehicle> _vehicles = [];
  List<Booking> _bookings = [];
  List<Map<String, dynamic>> _reviews = [];
  int _unreadNotificationsCount = 0;
  Booking? _upcomingBookingCached;
  List<Booking> _recentBookings = [];

  Color get _accentPurple => const Color(0xFF3B82F6);
  Color get _accentBlue => const Color.fromARGB(255, 105, 115, 226);
  Color get _neonBlue => const Color(0xFF38BDF8);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _restoreAndLoad();
    });

    final socket = SocketService();
    socket.addListener(_onSocketUpdate);
    socket.on('bookingUpdated', _onExternalUpdate);
    socket.on('bookingCreated', _onExternalUpdate);
    socket.on('bookingCancelled', _onExternalUpdate);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final socket = SocketService();
    socket.removeListener(_onSocketUpdate);
    socket.off('bookingUpdated', _onExternalUpdate);
    socket.off('bookingCreated', _onExternalUpdate);
    socket.off('bookingCancelled', _onExternalUpdate);
    super.dispose();
  }

  void _onSocketUpdate() {
    final event = SocketService().value;
    if (event == null) return;

    // Reload if connection changed or specific entity sync
    if (event == 'connected' ||
        event.contains('sync:booking') ||
        event.contains('sync:approval') ||
        event.contains('sync:payment') ||
        event.contains('sync:product') ||
        event.contains('sync:service') ||
        event.contains('sync:vehicle') ||
        event.contains('sync:user') ||
        event.contains('sync:notification') ||
        event.contains('sync:setting')) {
      if (mounted) _load();
    }
  }

  void _onExternalUpdate(dynamic payload) {
    if (!mounted) return;
    Booking? updated;
    if (payload != null) {
      try {
        final Map<String, dynamic> mapData = payload is Map<String, dynamic>
            ? payload
            : Map<String, dynamic>.from(payload as Map);
        updated = Booking.fromJson(mapData);
      } catch (e) {
        debugPrint('Error parsing external update: $e');
      }
    }
    if (updated == null) {
      _load(isInitial: true);
      return;
    }
    setState(() {
      final newList = List<Booking>.from(_bookings);
      final index = newList.indexWhere((b) => b.id == updated!.id);
      if (index >= 0) {
        newList[index] = updated!;
      } else {
        newList.insert(0, updated!);
      }
      _bookings = newList;
      _upcomingBookingCached = _computeUpcomingBooking(_bookings);
      _recentBookings = _computeRecentBookings(
        _bookings,
        _upcomingBookingCached,
      );
    });
    _persistDashboardState();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      SocketService().init();
      _refreshIfStale();
    }
  }

  Future<void> _load({bool isInitial = false}) async {
    if (!mounted) return;
    final now = DateTime.now();
    if (!isInitial &&
        _lastLoadedAt != null &&
        now.difference(_lastLoadedAt!) < const Duration(seconds: 5)) {
      return;
    }
    _lastLoadedAt = now;
    if (_loading && !isInitial) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        _vehicleService.listMyVehicles(),
        _bookingService.listMyBookings(forceRefresh: true),
        _catalogService.listServices(isQuickService: true),
        _reviewService.getMyReviews(),
      ]);

      if (!mounted) return;
      final vehicles = (results[0] as List<Vehicle>);
      final bookings = (results[1] as List<Booking>);
      final services = (results[2] as List<ServiceItem>);
      final reviews = (results[3] as List<Map<String, dynamic>>);
      var unreadCount = 0;
      try {
        final notifications = await _notificationService.listMyNotifications();
        unreadCount = notifications.where((n) => !n.isRead).length;
      } catch (_) {
        // Ignore notification count failures so dashboard still loads.
      }

      final upcoming = _computeUpcomingBooking(bookings);
      final recent = _computeRecentBookings(bookings, upcoming);

      setState(() {
        _vehicles = vehicles;
        _bookings = bookings;
        _services = services;
        _reviews = reviews;
        _unreadNotificationsCount = unreadCount;
        _upcomingBookingCached = upcoming;
        _recentBookings = recent;
        _loading = false;
      });

      // Show add vehicle popup if no vehicles found and not seen yet
      if (vehicles.isEmpty && !_isShowingNoVehicleDialog) {
        final hasSeen = await AppStorage().getHasSeenNoVehicleModal();
        if (!hasSeen && mounted) {
          setState(() => _isShowingNoVehicleDialog = true);
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) _showNoVehicleDialog();
          });
        }
      }

      await _persistDashboardState();
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        if (!mounted) return;
        final auth = context.read<AuthProvider>();
        await auth.logout();
        if (mounted) {
          Navigator.of(
            context,
          ).pushNamedAndRemoveUntil('/login', (route) => false);
        }
        return;
      }
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _showBookServiceDialog() {
    if (!mounted) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nav = context.read<NavigationProvider>();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF121212) : Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
        title: Text(
          'Select Service Category',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _CategoryTile(
              icon: Icons.settings_suggest_outlined,
              title: 'services',
              subtitle: 'General maintenance & repairs',
              color: AppColors.primaryBlue,
              onTap: () {
                Navigator.pop(context);
                nav.setTab(0);
              },
            ),
            const SizedBox(height: 12),
            _CategoryTile(
              icon: Icons.local_car_wash_outlined,
              title: 'Car Wash',
              subtitle: 'Premium cleaning services',
              color: Colors.blue,
              onTap: () {
                Navigator.pop(context);
                nav.setTab(3);
              },
            ),
            const SizedBox(height: 12),
            _CategoryTile(
              icon: Icons.battery_charging_full_outlined,
              title: 'Battery/tyres',
              subtitle: 'Replacement & maintenance',
              color: Colors.orange,
              onTap: () {
                Navigator.pop(context);
                nav.setTab(4);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showNoVehicleDialog() {
    if (!mounted) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? AppColors.backgroundSecondary : Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        titlePadding: const EdgeInsets.fromLTRB(24, 12, 12, 0),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                'Add Your First Vehicle',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
            ),
            TextButton(
              onPressed: () {
                AppStorage().setHasSeenNoVehicleModal(true);
                if (mounted) {
                  setState(() => _isShowingNoVehicleDialog = false);
                  Navigator.of(context).pop();
                }
              },
              child: Text(
                'Skip',
                style: TextStyle(color: isDark ? Colors.white60 : Colors.grey),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Please add a vehicle to start booking services and track maintenance.',
              textAlign: TextAlign.center,
              style: TextStyle(color: isDark ? Colors.white70 : Colors.black54),
            ),
            const SizedBox(height: 24),
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.primaryBlue.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.directions_car,
                size: 40,
                color: AppColors.primaryBlue,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No vehicles found',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                AppStorage().setHasSeenNoVehicleModal(true);
                if (mounted) {
                  setState(() => _isShowingNoVehicleDialog = false);
                  Navigator.of(context).pop();
                  Navigator.of(context).pushNamed('/add-vehicle');
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 4,
              ),
              icon: const Icon(Icons.add),
              label: const Text(
                'Add Vehicle',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  DateTime? _parseDate(String value) {
    try {
      return DateTime.parse(value).toLocal();
    } catch (_) {
      return null;
    }
  }

  String _formatDate(BuildContext context, String value) {
    final dt = _parseDate(value);
    if (dt == null) return value;
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  String _formatTime(BuildContext context, String value) {
    final dt = _parseDate(value);
    if (dt == null) return '';
    return TimeOfDay.fromDateTime(dt).format(context);
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'CREATED':
        return 'Booked';
      case 'ASSIGNED':
        return 'Assigned';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REACHED_CUSTOMER':
        return 'Reached Customer';
      case 'VEHICLE_PICKED':
        return 'Vehicle Picked';
      case 'REACHED_MERCHANT':
        return 'Reached Garage';
      case 'VEHICLE_AT_MERCHANT':
        return 'At Garage';
      case 'SERVICE_STARTED':
      case 'SERVICE_IN_PROGRESS':
        return 'Servicing';
      case 'SERVICE_COMPLETED':
        return 'Service is completed.';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Completed';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  Future<void> _showReviewDialog(
    BuildContext context,
    Booking booking, {
    int initialRating = 5,
  }) async {
    final bookingReviews = _reviews.where((r) {
      final bId = r['booking'];
      if (bId is String) return bId == booking.id;
      if (bId is Map) {
        final bidStr = (bId['_id'] ?? bId['id'])?.toString();
        return bidStr == booking.id;
      }
      return false;
    }).toList();

    bool hasMerchantReview = bookingReviews.any(
      (r) => r['category'] == 'Merchant',
    );
    bool hasPlatformReview = bookingReviews.any(
      (r) => r['category'] == 'Platform',
    );
    bool isReviewLoading = false;

    int merchantRating = initialRating;
    int platformRating = initialRating;
    final merchantCommentController = TextEditingController();
    final platformCommentController = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final isDark = Theme.of(context).brightness == Brightness.dark;
            final isComplete = hasMerchantReview && hasPlatformReview;

            if (isComplete) {
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 64,
                      color: Colors.green,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Feedback Submitted',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Thank you for sharing your experience with us!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isDark ? Colors.white70 : Colors.black54,
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryBlue,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Close'),
                      ),
                    ),
                  ],
                ),
              );
            }

            return Container(
              padding: EdgeInsets.fromLTRB(
                24,
                24,
                24,
                MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Service Feedback',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Booking #${booking.orderNumber ?? booking.id.substring(booking.id.length - 6).toUpperCase()}',
                      style: TextStyle(
                        color: isDark ? Colors.white60 : Colors.black54,
                      ),
                    ),
                    if (!hasMerchantReview &&
                        booking.merchant != null &&
                        (booking.merchant!['_id'] != null ||
                            booking.merchant!['id'] != null)) ...[
                      const SizedBox(height: 24),
                      Text(
                        'Service Center Rating',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          5,
                          (i) => IconButton(
                            onPressed: () =>
                                setModalState(() => merchantRating = i + 1),
                            icon: Icon(
                              i < merchantRating
                                  ? Icons.star
                                  : Icons.star_border,
                              color: Colors.amber,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                      TextField(
                        controller: merchantCommentController,
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Share your thoughts about the service...',
                          hintStyle: TextStyle(
                            color: isDark ? Colors.white38 : Colors.black38,
                          ),
                          border: const OutlineInputBorder(),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 24),
                    ],
                    if (!hasPlatformReview) ...[
                      Text(
                        'Platform Experience Rating',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          5,
                          (i) => IconButton(
                            onPressed: () =>
                                setModalState(() => platformRating = i + 1),
                            icon: Icon(
                              i < platformRating
                                  ? Icons.star
                                  : Icons.star_border,
                              color: Colors.amber,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                      TextField(
                        controller: platformCommentController,
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Share your thoughts about our app...',
                          hintStyle: TextStyle(
                            color: isDark ? Colors.white38 : Colors.black38,
                          ),
                          border: const OutlineInputBorder(),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 24),
                    ],
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isReviewLoading
                            ? null
                            : () async {
                                setModalState(() => isReviewLoading = true);
                                try {
                                  if (!hasMerchantReview &&
                                      booking.merchant != null &&
                                      (booking.merchant!['_id'] != null ||
                                          booking.merchant!['id'] != null)) {
                                    await _reviewService.createReview(
                                      bookingId: booking.id,
                                      rating: merchantRating,
                                      comment: merchantCommentController.text
                                          .trim(),
                                      category: 'Merchant',
                                      targetId:
                                          booking.merchant!['_id'] ??
                                          booking.merchant!['id'],
                                    );
                                  }
                                  if (!hasPlatformReview) {
                                    await _reviewService.createReview(
                                      bookingId: booking.id,
                                      rating: platformRating,
                                      comment: platformCommentController.text
                                          .trim(),
                                      category: 'Platform',
                                    );
                                  }
                                  if (context.mounted) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Thank you for your feedback!',
                                        ),
                                      ),
                                    );
                                    _load();
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Failed to submit review: $e',
                                        ),
                                      ),
                                    );
                                  }
                                } finally {
                                  setModalState(() => isReviewLoading = false);
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryBlue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: isReviewLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'Submit Review',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _formatPrice(num value) {
    if (value is int || value == value.roundToDouble()) {
      return '\u20B9 ${value.round()}';
    }
    return '\u20B9 ${value.toStringAsFixed(2)}';
  }

  Booking? _upcomingBooking() {
    if (_upcomingBookingCached != null) return _upcomingBookingCached;
    final computed = _computeUpcomingBooking(_bookings);
    _upcomingBookingCached = computed;
    return computed;
  }

  Future<void> _refreshIfStale() async {
    if (!mounted) return;
    final last = _lastLoadedAt;
    if (last == null) {
      await _load();
      return;
    }
    final now = DateTime.now();
    if (now.difference(last) > const Duration(minutes: 2)) {
      await _load();
    }
  }

  Future<void> _restoreAndLoad() async {
    await _loadFromCache();
    await _load(isInitial: true);
  }

  Future<void> _loadFromCache() async {
    if (!mounted) return;
    try {
      final jsonStr = await AppStorage().getDashboardJson();
      if (jsonStr == null || jsonStr.isEmpty) return;
      final decoded = jsonDecode(jsonStr);
      if (decoded is! Map) return;
      final map = Map<String, dynamic>.from(decoded);

      final vehicles = <Vehicle>[];
      final v = map['vehicles'];
      if (v is List) {
        for (final e in v) {
          if (e is Map<String, dynamic>) {
            vehicles.add(Vehicle.fromJson(e));
          } else if (e is Map) {
            vehicles.add(Vehicle.fromJson(Map<String, dynamic>.from(e)));
          }
        }
      }

      final bookings = <Booking>[];
      final b = map['bookings'];
      if (b is List) {
        for (final e in b) {
          if (e is Map<String, dynamic>) {
            bookings.add(Booking.fromJson(e));
          } else if (e is Map) {
            bookings.add(Booking.fromJson(Map<String, dynamic>.from(e)));
          }
        }
      }

      final services = <ServiceItem>[];
      final s = map['services'];
      if (s is List) {
        for (final e in s) {
          if (e is Map<String, dynamic>) {
            services.add(ServiceItem.fromJson(e));
          } else if (e is Map) {
            services.add(ServiceItem.fromJson(Map<String, dynamic>.from(e)));
          }
        }
      }

      if (!mounted) return;
      final upcoming = _computeUpcomingBooking(bookings);
      final recent = _computeRecentBookings(bookings, upcoming);

      setState(() {
        _vehicles = vehicles;
        _bookings = bookings;
        _services = services;
        _upcomingBookingCached = upcoming;
        _recentBookings = recent;
      });
    } catch (_) {}
  }

  Future<void> _persistDashboardState() async {
    try {
      final map = {
        'vehicles': _vehicles.map((v) => v.toJson()).toList(),
        'bookings': _bookings.map((b) => b.toJson()).toList(),
        'services': _services.map((s) => s.toJson()).toList(),
        'updatedAt': DateTime.now().toIso8601String(),
      };
      await AppStorage().setDashboardJson(jsonEncode(map));
    } catch (_) {}
  }

  Booking? _computeUpcomingBooking(List<Booking> source) {
    final active = source
        .where(
          (b) =>
              b.status != 'DELIVERED' &&
              b.status != 'CANCELLED' &&
              b.status != 'COMPLETED',
        )
        .toList();
    if (active.isEmpty) return null;

    final inProgressStatuses = [
      'ASSIGNED',
      'ACCEPTED',
      'STAFF_REACHED_MERCHANT',
      'PICKUP_BATTERY_TIRE',
      'MERCHANT_INSPECTION',
      'PENDING_APPROVAL',
      'SERVICE_STARTED',
      'CAR_WASH_STARTED',
      'INSTALLATION',
      'OUT_FOR_DELIVERY',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'REACHED_CUSTOMER',
    ];

    active.sort((a, b) {
      final aInProgress = inProgressStatuses.contains(a.status);
      final bInProgress = inProgressStatuses.contains(b.status);

      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;

      final da = _parseDate(a.date) ?? DateTime(1900);
      final db = _parseDate(b.date) ?? DateTime(1900);
      return db.compareTo(da); // DESCENDING - Most recent first
    });

    // If the top one is CREATED, but we have others that are actually in progress,
    // the sort above already handles it.
    // However, if the user specifically wants ASSIGNED to show up in ongoing,
    // and we have a CREATED one that is older, the CREATED one might still show
    // if we don't exclude it or prioritize ASSIGNED.

    // The user said: "when admin assigned should display in ongoing services"
    // This implies CREATED should NOT be in ongoing services if possible,
    // or at least ASSIGNED should be prioritized.

    return active.first;
  }

  List<Booking> _computeRecentBookings(List<Booking> source, Booking? ongoing) {
    if (source.isEmpty) return const [];
    final filtered = source
        .where(
          (b) =>
              b.id != ongoing?.id &&
              (b.status == 'CREATED' ||
                  b.status == 'DELIVERED' ||
                  b.status == 'CANCELLED' ||
                  b.status == 'COMPLETED' ||
                  b.status == 'SERVICE_COMPLETED'),
        )
        .toList();
    final sorted = [...filtered];
    sorted.sort((a, b) {
      // Primary: Created At (descending) - Most recently created first
      final ca = _parseDate(a.createdAt ?? '') ?? DateTime(1900);
      final cb = _parseDate(b.createdAt ?? '') ?? DateTime(1900);
      final cmp = cb.compareTo(ca);
      if (cmp != 0) return cmp;

      // Secondary: Service Date (descending) - Newest service date first
      final da = _parseDate(a.date) ?? DateTime(1900);
      final db = _parseDate(b.date) ?? DateTime(1900);
      final cmpDate = db.compareTo(da);
      if (cmpDate != 0) return cmpDate;

      // Fallback: ID (descending)
      return b.id.compareTo(a.id);
    });
    if (sorted.length <= 5) return sorted;
    return sorted.take(5).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Auto-refresh logic when navigated to from booking flow
    final shouldRefresh = context.select<NavigationProvider, bool>(
      (n) => n.shouldRefreshDashboard,
    );
    if (shouldRefresh) {
      final nav = context.read<NavigationProvider>();
      nav.consumeRefresh();
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _load(isInitial: true),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? Colors.black : AppColors.backgroundPrimaryLight,
      body: Stack(
        children: [
          if (isDark)
            Container(color: Colors.black)
          else
            Container(color: AppColors.backgroundPrimaryLight),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Padding(
                  padding: AppSpacing.edgeInsetsHorizontalDefault,
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: 120),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppSpacing.verticalSmall,
                        RepaintBoundary(child: _buildHeader()),
                        AppSpacing.verticalDefault,
                        if (_loading &&
                            _vehicles.isEmpty &&
                            _bookings.isEmpty &&
                            _services.isEmpty)
                          const Padding(
                            padding: EdgeInsets.only(
                              top: AppSpacing.section,
                              bottom: AppSpacing.small,
                            ),
                            child: Center(
                              child: SizedBox(
                                width: 28,
                                height: 28,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.6,
                                  valueColor: AlwaysStoppedAnimation(
                                    Color(0xFF38BDF8),
                                  ),
                                ),
                              ),
                            ),
                          )
                        else if (_error != null &&
                            _vehicles.isEmpty &&
                            _bookings.isEmpty &&
                            _services.isEmpty)
                          Padding(
                            padding: const EdgeInsets.only(
                              top: AppSpacing.section,
                              bottom: AppSpacing.small,
                            ),
                            child: _FrostedCard(
                              borderRadius: 20,
                              padding: AppSpacing.edgeInsetsAllDefault,
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.warning_amber_rounded,
                                    color: Colors.amberAccent.shade200,
                                  ),
                                  AppSpacing.horizontalMedium,
                                  Expanded(
                                    child: Text(
                                      'Unable to load your dashboard.\nPlease check your internet connection and try again.',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: Colors.white.withValues(
                                              alpha: 0.85,
                                            ),
                                          ),
                                    ),
                                  ),
                                  AppSpacing.horizontalSmall,
                                  TextButton(
                                    onPressed: () => _load(isInitial: true),
                                    child: const Text('Retry'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        AppSpacing.verticalDefault,
                        RepaintBoundary(child: _buildUpcomingServiceCard()),
                        AppSpacing.verticalSection,
                        RepaintBoundary(child: _buildQuickServices()),
                        AppSpacing.verticalSection,
                        RepaintBoundary(child: _buildRecentServices()),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    final auth = context.read<AuthProvider>();
    final rawName = (auth.user?.name ?? '').trim();
    final firstName = rawName.isEmpty ? '' : rawName.split(' ').first;
    final greeting = _greeting();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        _AnimatedDashboardCard(
          onTap: () => Scaffold.of(context).openDrawer(),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.28)
                    : Colors.black.withValues(alpha: 0.16),
                width: 1.0,
              ),
            ),
            child: IconButton(
              icon: Icon(
                Icons.menu,
                color: isDark ? Colors.white : AppColors.textPrimaryLight,
              ),
              tooltip: 'Menu',
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
        ),
        AppSpacing.horizontalMedium,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Carzzi VehicleCare',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: isDark ? Colors.white : AppColors.textMutedLight,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                firstName.isNotEmpty ? '$greeting, $firstName' : greeting,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: isDark ? Colors.white : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        _AnimatedDashboardCard(
          onTap: _openNotifications,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.28)
                        : Colors.black.withValues(alpha: 0.16),
                    width: 1.0,
                  ),
                ),
                child: IconButton(
                  icon: Icon(
                    Icons.notifications_none_rounded,
                    color: isDark ? Colors.white : AppColors.textPrimaryLight,
                  ),
                  tooltip: 'Notifications',
                  onPressed: _openNotifications,
                ),
              ),
              if (_unreadNotificationsCount > 0)
                Positioned(
                  right: -2,
                  top: -2,
                  child: Container(
                    constraints: const BoxConstraints(
                      minWidth: 18,
                      minHeight: 18,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 5,
                      vertical: 2,
                    ),
                    decoration: const BoxDecoration(
                      color: Colors.redAccent,
                      borderRadius: BorderRadius.all(Radius.circular(10)),
                    ),
                    child: Text(
                      _unreadNotificationsCount > 99
                          ? '99+'
                          : '$_unreadNotificationsCount',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  void _openNotifications() {
    Navigator.pushNamed(context, '/notifications').then((_) {
      if (!mounted) return;
      _load(isInitial: true);
    });
  }

  Widget _buildUpcomingServiceCard() {
    final booking = _upcomingBooking();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (booking == null) {
      return _NeonBorderCard(
        neonColor: _neonBlue,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'No upcoming service',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: isDark ? Colors.white : AppColors.textPrimaryLight,
                fontWeight: FontWeight.w700,
              ),
            ),
            AppSpacing.verticalSmall,
            Text(
              'Book a service to keep your vehicle in top condition.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: isDark ? Colors.white : AppColors.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 20),
            Align(
              alignment: Alignment.centerRight,
              child: _NeonButton(
                label: 'Book Service',
                purple: _accentPurple,
                blue: _accentBlue,
                onTap: _showBookServiceDialog,
              ),
            ),
          ],
        ),
      );
    }

    final primaryService = booking.services.isNotEmpty
        ? booking.services.first.name
        : 'Service';
    final vehicleLabel = booking.vehicle != null
        ? '${booking.vehicle!.make} ${booking.vehicle!.model}${booking.vehicle!.variant != null && booking.vehicle!.variant!.isNotEmpty ? ' ${booking.vehicle!.variant}' : ''} • ${booking.vehicle!.licensePlate}'
        : 'Vehicle service';
    final dateLabel = _formatDate(context, booking.date);
    final timeLabel = _formatTime(context, booking.date);
    final locationLabel =
        booking.location?.address ?? 'Pickup service scheduled';
    final showPayButton =
        booking.status == 'SERVICE_COMPLETED' && booking.paymentStatus != 'paid';
    final statusBadgeLabel = showPayButton
        ? 'Payment awaiting'
        : _statusLabel(booking.status);
    final payAmount =
        (booking.billing != null && booking.billing!.total > 0)
        ? booking.billing!.total
        : booking.calculatedTotal;

    void openTrackService() {
      Navigator.pushNamed(
        context,
        '/track',
        arguments: booking.id,
      ).then((_) {
        if (!mounted) return;
        _load(isInitial: true);
      });
    }

    return _NeonBorderCard(
      neonColor: _neonBlue,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Ongoing Service',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: isDark ? Colors.white : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF4A90E2).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusBadgeLabel,
                  style: TextStyle(
                    color: Color(0xFF4A90E2),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          AppSpacing.verticalSmall,
          Text(
            primaryService,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: isDark ? Colors.white : AppColors.textPrimaryLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            vehicleLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: isDark ? Colors.white : AppColors.textSecondaryLight,
            ),
          ),
          AppSpacing.verticalDefault,
          Row(
            children: [
              const Icon(
                Icons.access_time_filled_rounded,
                color: Color(0xFF4A90E2),
                size: 18,
              ),
              AppSpacing.horizontalSmall,
              Text(
                '$dateLabel • $timeLabel',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: isDark ? Colors.white : AppColors.textPrimaryLight,
                ),
              ),
            ],
          ),
          AppSpacing.verticalMedium,
          Row(
            children: [
              const Icon(
                Icons.location_on_rounded,
                color: Color(0xFF4A90E2),
                size: 18,
              ),
              AppSpacing.horizontalSmall,
              Expanded(
                child: Text(
                  locationLabel,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isDark ? Colors.white : AppColors.textSecondaryLight,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          if (booking.status == 'OUT_FOR_DELIVERY' &&
              booking.deliveryOtp?.code != null &&
              booking.deliveryOtp!.code.isNotEmpty) ...[
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : const Color(0xFF4A90E2).withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFF4A90E2).withValues(alpha: 0.2),
                  style: BorderStyle.solid,
                ),
              ),
              child: Column(
                children: [
                  Text(
                    (booking.carWash?.isCarWashService ?? false)
                        ? 'COMPLETION OTP'
                        : 'DELIVERY OTP',
                    style: TextStyle(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.6)
                          : const Color(0xFF4A90E2),
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    booking.deliveryOtp!.code,
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF4A90E2),
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 4,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          if (showPayButton)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _SecondaryActionButton(
                  label: 'Pay ₹$payAmount',
                  onTap: openTrackService,
                ),
                _NeonButton(
                  label: 'Track Service',
                  purple: _accentPurple,
                  blue: _accentBlue,
                  onTap: openTrackService,
                ),
              ],
            )
          else
            Align(
              alignment: Alignment.centerRight,
              child: _NeonButton(
                label: 'Track Service',
                purple: _accentPurple,
                blue: _accentBlue,
                onTap: openTrackService,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQuickServices() {
    final icons = [
      Icons.science_rounded,
      Icons.system_update_alt_rounded,
      Icons.shield_rounded,
      Icons.bolt_rounded,
    ];

    final List<_QuickServiceItem> items;
    if (_services.isEmpty) {
      items = [
        _QuickServiceItem(icon: Icons.science_rounded, label: 'Self Diagnosis'),
        _QuickServiceItem(
          icon: Icons.system_update_alt_rounded,
          label: 'Software Update',
        ),
        _QuickServiceItem(
          icon: Icons.shield_rounded,
          label: 'Engine Inspection',
        ),
        _QuickServiceItem(icon: Icons.bolt_rounded, label: 'Energy Check'),
      ];
    } else {
      final count = _services.length < 4 ? _services.length : 4;
      items = List.generate(count, (index) {
        final service = _services[index];
        return _QuickServiceItem(
          icon: icons[index % icons.length],
          label: service.name,
          price: service.price,
          category: service.category,
          estimatedMinutes: service.estimatedMinutes,
          source: service,
        );
      });
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Services',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: isDark ? Colors.white : AppColors.textPrimaryLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        AppSpacing.verticalMedium,
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: items.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: AppSpacing.medium,
            crossAxisSpacing: AppSpacing.medium,
            childAspectRatio: 0.58,
          ),
          itemBuilder: (context, index) {
            final item = items[index];
            final theme = Theme.of(context);
            final category = item.category?.trim();
            return _AnimatedDashboardCard(
              onTap: item.source == null
                  ? null
                  : () {
                      final nav = context.read<NavigationProvider>();
                      final source = item.source!;
                      final cat = (source.category ?? '').trim();

                      String route = '/services';

                      if (['Car Wash', 'Wash', 'Detailing'].contains(cat)) {
                        route = '/car-wash';
                      } else if (['Insurance', 'Essentials'].contains(cat)) {
                        route = '/essentials';
                      } else if ([
                        'Tyre & Battery',
                        'Tyres',
                        'Battery',
                        'Batteries',
                        'Tyre Service',
                        'Battery Service',
                        'Tires',
                      ].contains(cat)) {
                        route = '/tires';
                      }

                      nav.navigateTo(route, arguments: source);
                    },
              child: _FrostedCard(
                borderRadius: 16,
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 6,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    SizedBox(
                      height: 18,
                      child: (category != null && category.isNotEmpty)
                          ? Center(
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(999),
                                  gradient: AppStyles.primaryGradient,
                                ),
                                child: Text(
                                  category.toUpperCase(),
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white,
                                    fontSize: 7.5,
                                    letterSpacing: 0.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            )
                          : const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlue.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Icon(
                          item.icon,
                          size: 18,
                          color: AppColors.primaryBlue,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Expanded(
                      child: Center(
                        child: Text(
                          (category?.toUpperCase() == 'WASH' ||
                                  category?.toUpperCase() == 'CAR WASH' ||
                                  category?.toUpperCase() == 'DETAILING')
                              ? item.label.replaceFirst(' (', '\n(')
                              : item.label,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: isDark
                                ? Colors.white
                                : AppColors.textPrimaryLight,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            height: 1.1,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    SizedBox(
                      height: 14,
                      child: (item.price != null && item.price! > 0)
                          ? Text(
                              _formatPrice(item.price!),
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: isDark
                                    ? Colors.white
                                    : AppColors.textPrimaryLight,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            )
                          : const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildRecentServices() {
    final items = _recentBookings;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Services',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: isDark ? Colors.white : AppColors.textPrimaryLight,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        AppSpacing.verticalMedium,
        if (items.isEmpty)
          Padding(
            padding: AppSpacing.edgeInsetsVerticalDefault,
            child: _FrostedCard(
              borderRadius: 16,
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  Icon(
                    Icons.info_rounded,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.7)
                        : AppColors.textPrimaryLight,
                  ),
                  AppSpacing.horizontalMedium,
                  Expanded(
                    child: Text(
                      'No recent services yet. Your history will appear here.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.8)
                            : AppColors.textSecondaryLight,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          Column(
            children: items.map((b) {
              final serviceName = b.services.isNotEmpty
                  ? b.services.first.name
                  : 'Service';

              // Formatting vehicle label to match screenshot style: JUPITER 5G • TS08JY4741
              final vehicleLabel = b.vehicle != null
                  ? '${b.vehicle!.make.toUpperCase()} ${b.vehicle!.model.toUpperCase()}${b.vehicle!.variant != null && b.vehicle!.variant!.isNotEmpty ? ' ${b.vehicle!.variant!.toUpperCase()}' : ''} • ${b.vehicle!.licensePlate.toUpperCase()}'
                  : '';

              final statusText = _statusLabel(b.status);
              final amount = b.totalAmount;
              final priceLabel =
                  amount is int || amount == amount.roundToDouble()
                  ? '\u20B9 ${amount.round()}'
                  : '\u20B9 ${amount.toStringAsFixed(2)}';

              final isDelivered =
                  b.status == 'DELIVERED' || b.status == 'COMPLETED';
              final isServiceCompleted = b.status == 'SERVICE_COMPLETED';
              final isCompleted = isDelivered || isServiceCompleted;

              final statusColor = isDelivered
                  ? const Color(0xFF4ADE80)
                  : (isServiceCompleted
                        ? const Color(0xFF60A5FA)
                        : const Color(0xFF4A90E2));

              // Find reviews for this booking
              final bookingReviews = _reviews.where((r) {
                final bId = r['booking'];
                if (bId is String) return bId == b.id;
                if (bId is Map) {
                  final bidStr = (bId['_id'] ?? bId['id'])?.toString();
                  return bidStr == b.id;
                }
                return false;
              }).toList();

              final hasBeenReviewed = bookingReviews.isNotEmpty;
              final averageRating = hasBeenReviewed
                  ? bookingReviews
                            .map((r) => (r['rating'] as num).toDouble())
                            .reduce((a, b) => a + b) /
                        bookingReviews.length
                  : 0.0;

              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.medium),
                child: _AnimatedDashboardCard(
                  onTap: () => Navigator.pushNamed(
                    context,
                    '/track',
                    arguments: b.id,
                  ).then((_) {
                    if (!mounted) return;
                    _load(isInitial: true);
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: AppSpacing.defaultPadding,
                    ),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0A0A0A) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.08)
                            : Colors.grey.shade200,
                        width: 1,
                      ),
                      boxShadow: isDark
                          ? null
                          : [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Order #${b.orderNumber ?? b.id.substring(b.id.length - 6).toUpperCase()}',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.white54 : Colors.grey,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                isDelivered ? 'Completed' : statusText,
                                style: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          serviceName,
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(
                                color: isDark
                                    ? Colors.white
                                    : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                        ),
                        if (vehicleLabel.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            vehicleLabel,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: isDark
                                      ? Colors.white.withValues(alpha: 0.6)
                                      : AppColors.textSecondaryLight,
                                  fontSize: 12,
                                  letterSpacing: 0.2,
                                ),
                          ),
                        ],
                        if (isCompleted) ...[
                          const SizedBox(height: 12),
                          if (hasBeenReviewed)
                            Row(
                              children: [
                                ...List.generate(
                                  5,
                                  (index) => Icon(
                                    index < averageRating
                                        ? Icons.star
                                        : Icons.star_border,
                                    color: Colors.amber,
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Feedback submitted',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark
                                        ? Colors.white54
                                        : Colors.black54,
                                  ),
                                ),
                              ],
                            )
                          else
                            Row(
                              children: [
                                ...List.generate(
                                  5,
                                  (index) => InkWell(
                                    onTap: () => _showReviewDialog(
                                      context,
                                      b,
                                      initialRating: index + 1,
                                    ),
                                    child: const Padding(
                                      padding: EdgeInsets.only(right: 4),
                                      child: Icon(
                                        Icons.star_border,
                                        color: Color(0xFFCBD5E1),
                                        size: 20,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'Rate your service',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.access_time,
                                  size: 14,
                                  color: isDark ? Colors.white54 : Colors.grey,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${_formatDate(context, b.date)} • ${_formatTime(context, b.date)}',
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(
                                        color: isDark
                                            ? Colors.white.withValues(
                                                alpha: 0.5,
                                              )
                                            : AppColors.textMutedLight,
                                        fontSize: 11,
                                      ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                Text(
                                  priceLabel,
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        color: isDark
                                            ? Colors.white
                                            : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16,
                                      ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(
                                  Icons.chevron_right,
                                  size: 18,
                                  color: AppColors.primaryBlue,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}

class _AnimatedDashboardCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;

  const _AnimatedDashboardCard({required this.child, this.onTap});

  @override
  State<_AnimatedDashboardCard> createState() => _AnimatedDashboardCardState();
}

class _AnimatedDashboardCardState extends State<_AnimatedDashboardCard> {
  double _scale = 1.0;

  void _onTapDown(TapDownDetails details) {
    if (widget.onTap != null) {
      setState(() => _scale = 0.97);
    }
  }

  void _onTapUp(TapUpDetails details) {
    if (widget.onTap != null) {
      setState(() => _scale = 1.0);
    }
  }

  void _onTapCancel() {
    if (widget.onTap != null) {
      setState(() => _scale = 1.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeInOut,
        child: widget.child,
      ),
    );
  }
}

class _QuickServiceItem {
  final IconData icon;
  final String label;
  final num? price;
  final String? category;
  final num? estimatedMinutes;
  final ServiceItem? source;

  _QuickServiceItem({
    required this.icon,
    required this.label,
    this.price,
    this.category,
    this.estimatedMinutes,
    this.source,
  });
}

class _FrostedCard extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  const _FrostedCard({
    required this.child,
    this.borderRadius = 16,
    this.padding = AppSpacing.edgeInsetsAllMedium,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? Colors.black : Colors.white,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
          width: 1,
        ),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: child,
    );
  }
}

class _NeonBorderCard extends StatelessWidget {
  final Widget child;
  final Color neonColor;

  const _NeonBorderCard({required this.child, required this.neonColor});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderRadius = BorderRadius.circular(16);
    return Container(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        color: isDark ? Colors.black : Colors.white,
        border: Border.all(
          color: isDark
              ? neonColor.withValues(alpha: 0.5)
              : Colors.grey.shade200,
          width: 1,
        ),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [Colors.black, Colors.black]
                  : [Colors.white, Colors.white],
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _NeonButton extends StatelessWidget {
  final String label;
  final Color purple;
  final Color blue;
  final VoidCallback onTap;

  const _NeonButton({
    required this.label,
    required this.purple,
    required this.blue,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          gradient: AppStyles.primaryGradient,
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryBlue.withValues(alpha: 0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ),
    );
  }
}

class _SecondaryActionButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _SecondaryActionButton({
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: AppColors.primaryBlue, width: 1.4),
        foregroundColor: AppColors.primaryBlue,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
          color: AppColors.primaryBlue,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _CategoryTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white60 : Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: isDark ? Colors.white30 : Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }
}
