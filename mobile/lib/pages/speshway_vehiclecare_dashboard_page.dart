import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/storage.dart';
import '../models/booking.dart';
import '../models/service.dart';
import '../models/vehicle.dart';
import '../services/booking_service.dart';
import '../services/catalog_service.dart';
import '../services/socket_service.dart';
import '../services/vehicle_service.dart';
import '../state/auth_provider.dart';
import '../state/navigation_provider.dart';
import '../widgets/customer_drawer.dart';

class SpeshwayVehicleCareDashboard extends StatefulWidget {
  const SpeshwayVehicleCareDashboard({super.key});

  @override
  State<SpeshwayVehicleCareDashboard> createState() =>
      _SpeshwayVehicleCareDashboardState();
}

class _SpeshwayVehicleCareDashboardState
    extends State<SpeshwayVehicleCareDashboard>
    with WidgetsBindingObserver {
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();

  bool _loading = false;
  String? _error;
  DateTime? _lastLoadedAt;

  List<ServiceItem> _services = [];
  List<Vehicle> _vehicles = [];
  List<Booking> _bookings = [];
  Booking? _upcomingBookingCached;
  List<Booking> _recentBookings = [];

  Color get _backgroundStart => const Color(0xFF020617);
  Color get _backgroundEnd => const Color(0xFF020617);
  Color get _accentPurple => const Color(0xFF3B82F6);
  Color get _accentBlue => const Color(0xFF22D3EE);
  Color get _neonBlue => const Color(0xFF38BDF8);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _restoreAndLoad();
    });

    final socket = SocketService();
    socket.addListener(_onSocketConnectionChanged);
    socket.on('bookingUpdated', _onExternalUpdate);
    socket.on('bookingCreated', _onExternalUpdate);
    socket.on('bookingCancelled', _onExternalUpdate);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final socket = SocketService();
    socket.removeListener(_onSocketConnectionChanged);
    socket.off('bookingUpdated', _onExternalUpdate);
    socket.off('bookingCreated', _onExternalUpdate);
    socket.off('bookingCancelled', _onExternalUpdate);
    super.dispose();
  }

  void _onSocketConnectionChanged() {
    if (SocketService().isConnected) {
      _load();
    }
  }

  void _onExternalUpdate(dynamic payload) {
    if (!mounted) return;
    Booking? updated;
    if (payload is Map<String, dynamic>) {
      updated = Booking.fromJson(payload);
    } else if (payload is Map) {
      updated = Booking.fromJson(Map<String, dynamic>.from(payload));
    }
    if (updated == null) {
      _load();
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
        _bookingService.listMyBookings(),
        _catalogService.listServices(),
      ]);

      if (!mounted) return;
      final vehicles = (results[0] as List<Vehicle>);
      final bookings = (results[1] as List<Booking>);
      final services = (results[2] as List<ServiceItem>);

      final upcoming = _computeUpcomingBooking(bookings);
      final recent = _computeRecentBookings(bookings, upcoming);

      setState(() {
        _vehicles = vehicles;
        _bookings = bookings;
        _services = services;
        _upcomingBookingCached = upcoming;
        _recentBookings = recent;
        _loading = false;
      });
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
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
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
        return 'Driver Reached';
      case 'VEHICLE_PICKED':
        return 'Vehicle Picked';
      case 'REACHED_MERCHANT':
        return 'Reached Garage';
      case 'VEHICLE_AT_MERCHANT':
        return 'At Garage';
      case 'JOB_CARD':
        return 'Job Card';
      case 'SERVICE_STARTED':
        return 'Servicing';
      case 'SERVICE_COMPLETED':
        return 'Ready';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Delivered';
      case 'COMPLETED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
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
              b.status != 'CREATED' &&
              b.status != 'DELIVERED' &&
              b.status != 'CANCELLED' &&
              b.status != 'COMPLETED',
        )
        .toList();
    if (active.isEmpty) return null;
    active.sort((a, b) {
      final da = _parseDate(a.date) ?? DateTime(2999);
      final db = _parseDate(b.date) ?? DateTime(2999);
      return da.compareTo(db);
    });
    return active.first;
  }

  List<Booking> _computeRecentBookings(List<Booking> source, Booking? ongoing) {
    if (source.isEmpty) return const [];
    final filtered = source
        .where(
          (b) =>
              b.status == 'CREATED' ||
              b.status == 'DELIVERED' ||
              b.status == 'CANCELLED' ||
              b.status == 'COMPLETED',
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
    if (sorted.length <= 3) return sorted;
    return sorted.take(3).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Auto-refresh logic when navigated to from booking flow
    final nav = context.watch<NavigationProvider>();
    if (nav.shouldRefreshDashboard) {
      nav.consumeRefresh();
      WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    }

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      drawer: const CustomerDrawer(currentRouteName: '/customer'),
      body: Stack(
        children: [
          if (isDark)
            Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, -1.2),
                  radius: 1.4,
                  colors: [
                    _accentPurple.withValues(alpha: 0.1),
                    _accentBlue.withValues(alpha: 0.05),
                    _backgroundStart,
                  ],
                ),
              ),
            )
          else
            Container(color: Colors.white),
          if (isDark)
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black.withValues(alpha: 0.7), _backgroundEnd],
                ),
              ),
            ),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.only(bottom: 120),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),
                        RepaintBoundary(child: _buildHeader()),
                        const SizedBox(height: 16),
                        if (_loading &&
                            _vehicles.isEmpty &&
                            _bookings.isEmpty &&
                            _services.isEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 24, bottom: 8),
                            child: Center(
                              child: SizedBox(
                                width: 28,
                                height: 28,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.6,
                                  valueColor: AlwaysStoppedAnimation(_neonBlue),
                                ),
                              ),
                            ),
                          )
                        else if (_error != null &&
                            _vehicles.isEmpty &&
                            _bookings.isEmpty &&
                            _services.isEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 24, bottom: 8),
                            child: _FrostedCard(
                              borderRadius: 20,
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.warning_amber_rounded,
                                    color: Colors.amberAccent.shade200,
                                  ),
                                  const SizedBox(width: 12),
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
                                  const SizedBox(width: 8),
                                  TextButton(
                                    onPressed: () => _load(isInitial: true),
                                    child: const Text('Retry'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 16),
                        RepaintBoundary(child: _buildUpcomingServiceCard()),
                        const SizedBox(height: 24),
                        RepaintBoundary(child: _buildQuickServices()),
                        const SizedBox(height: 24),
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
    final auth = context.watch<AuthProvider>();
    final rawName = (auth.user?.name ?? '').trim();
    final firstName = rawName.isEmpty ? '' : rawName.split(' ').first;
    final greeting = _greeting();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        _FrostedCard(
          borderRadius: 16,
          padding: EdgeInsets.zero,
          child: IconButton(
            icon: const Icon(Icons.menu),
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            tooltip: 'Menu',
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Speshway VehicleCare',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                firstName.isNotEmpty ? '$greeting, $firstName' : greeting,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
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
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Book a service to keep your vehicle in top condition.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.8)
                    : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 20),
            Align(
              alignment: Alignment.centerRight,
              child: _NeonButton(
                label: 'Book Service',
                purple: _accentPurple,
                blue: _accentBlue,
                onTap: () {
                  Navigator.pushNamed(context, '/services');
                },
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
        ? '${booking.vehicle!.make} ${booking.vehicle!.model} • ${booking.vehicle!.licensePlate}'
        : 'Vehicle service';
    final dateLabel = _formatDate(context, booking.date);
    final timeLabel = _formatTime(context, booking.date);
    final locationLabel =
        booking.location?.address ?? 'Pickup service scheduled';

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
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  fontWeight: FontWeight.w700,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _neonBlue.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _neonBlue.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  _statusLabel(booking.status).toUpperCase(),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: _neonBlue,
                    fontWeight: FontWeight.w800,
                    fontSize: 9,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            primaryService,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.9)
                  : const Color(0xFF0F172A),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            vehicleLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.6)
                  : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(
                Icons.access_time_filled_rounded,
                color: _neonBlue,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                '$dateLabel • $timeLabel',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.8)
                      : const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.location_on_rounded, color: _neonBlue, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  locationLabel,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.7)
                        : const Color(0xFF64748B),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.centerRight,
            child: _NeonButton(
              label: 'Track Service',
              purple: _accentPurple,
              blue: _accentBlue,
              onTap: () {
                Navigator.pushNamed(context, '/track', arguments: booking.id);
              },
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
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: items.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.7,
          ),
          itemBuilder: (context, index) {
            final item = items[index];
            final theme = Theme.of(context);
            final category = item.category?.trim();
            return InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: item.source == null
                  ? null
                  : () {
                      final nav = context.read<NavigationProvider>();
                      nav.navigateTo('/services', arguments: item.source!);
                    },
              child: _FrostedCard(
                borderRadius: 18,
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 12,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Category badge area with fixed height to ensure icons align
                    SizedBox(
                      height: 20,
                      child: (category != null && category.isNotEmpty)
                          ? Center(
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(999),
                                  gradient: LinearGradient(
                                    begin: const Alignment(-1, 0),
                                    end: const Alignment(1, 0),
                                    colors: [
                                      _accentPurple.withValues(alpha: 0.9),
                                      _accentBlue.withValues(alpha: 0.9),
                                    ],
                                  ),
                                ),
                                child: Text(
                                  category.toUpperCase(),
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white,
                                    fontSize: 7,
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
                    const SizedBox(height: 10),
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          center: const Alignment(0, -0.2),
                          colors: [
                            _accentBlue.withValues(alpha: 0.9),
                            _accentPurple.withValues(alpha: 0.4),
                          ],
                        ),
                      ),
                      child: Center(
                        child: Icon(item.icon, size: 20, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Label area with fixed height for 2 lines to ensure prices align
                    SizedBox(
                      height: 32,
                      child: Center(
                        child: Text(
                          item.label,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.95)
                                : const Color(0xFF0F172A),
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            height: 1.2,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const Spacer(),
                    if (item.price != null && item.price! > 0) ...[
                      Text(
                        _formatPrice(item.price!),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.8)
                              : const Color(0xFF0F172A),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
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
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: _FrostedCard(
              borderRadius: 18,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    Icons.info_rounded,
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.8)
                        : const Color(0xFF0F172A),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'No recent services yet. Your history will appear here.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.85)
                            : const Color(0xFF64748B),
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
              final vehicleLabel = b.vehicle != null
                  ? '${b.vehicle!.make} ${b.vehicle!.model} • ${b.vehicle!.licensePlate}'
                  : '';
              final statusText = _statusLabel(b.status);
              final amount = b.totalAmount;
              final priceLabel =
                  amount is int || amount == amount.roundToDouble()
                  ? '\u20B9 ${amount.round()}'
                  : '\u20B9 ${amount.toStringAsFixed(2)}';

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: () =>
                      Navigator.pushNamed(context, '/track', arguments: b.id),
                  borderRadius: BorderRadius.circular(18),
                  child: _FrostedCard(
                    borderRadius: 18,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                serviceName,
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(
                                      color: isDark
                                          ? Colors.white
                                          : const Color(0xFF0F172A),
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                              if (vehicleLabel.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  vehicleLabel,
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(
                                        color: isDark
                                            ? Colors.white.withValues(
                                                alpha: 0.7,
                                              )
                                            : const Color(0xFF64748B),
                                      ),
                                ),
                              ],
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(
                                    Icons.check_circle_rounded,
                                    size: 16,
                                    color: b.status == 'DELIVERED'
                                        ? Colors.greenAccent
                                        : _neonBlue,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    statusText,
                                    style: Theme.of(context).textTheme.bodySmall
                                        ?.copyWith(
                                          color: isDark
                                              ? Colors.white.withValues(
                                                  alpha: 0.8,
                                                )
                                              : const Color(0xFF0F172A),
                                        ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              priceLabel,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A),
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatDate(context, b.date),
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: isDark
                                        ? Colors.white.withValues(alpha: 0.6)
                                        : const Color(0xFF64748B),
                                  ),
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
    this.borderRadius = 20,
    this.padding = const EdgeInsets.all(12),
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : const Color(0xFFE2E8F0).withValues(alpha: 0.6),
          width: 1,
        ),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
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
    final borderRadius = BorderRadius.circular(26);
    return ClipRRect(
      borderRadius: borderRadius,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: borderRadius,
          border: Border.all(
            color: neonColor.withValues(alpha: isDark ? 0.5 : 0.35),
            width: 1.2,
          ),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [
                    Colors.white.withValues(alpha: 0.08),
                    Colors.white.withValues(alpha: 0.04),
                  ]
                : [
                    Colors.white.withValues(alpha: 0.9),
                    Colors.white.withValues(alpha: 0.6),
                  ],
          ),
        ),
        child: child,
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
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          gradient: LinearGradient(colors: [purple, blue]),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
