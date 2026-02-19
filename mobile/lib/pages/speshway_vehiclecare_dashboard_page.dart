import 'dart:ui';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../models/booking.dart';
import '../models/service.dart';
import '../models/vehicle.dart';
import '../services/booking_service.dart';
import '../services/catalog_service.dart';
import '../services/socket_service.dart';
import '../services/vehicle_service.dart';
import '../state/auth_provider.dart';
import '../state/navigation_provider.dart';

class SpeshwayVehicleCareDashboard extends StatefulWidget {
  const SpeshwayVehicleCareDashboard({super.key});

  @override
  State<SpeshwayVehicleCareDashboard> createState() =>
      _SpeshwayVehicleCareDashboardState();
}

class _SpeshwayVehicleCareDashboardState
    extends State<SpeshwayVehicleCareDashboard>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();

  late final AnimationController _glowController;
  final int _currentIndex = 2;

  bool _loading = false;
  String? _error;

  List<ServiceItem> _services = [];
  List<Vehicle> _vehicles = [];
  List<Booking> _bookings = [];
  final Set<int> _pressedQuickServiceIndices = {};

  Color get _backgroundStart => const Color(0xFF020617);
  Color get _backgroundEnd => const Color(0xFF020617);
  Color get _accentPurple => const Color(0xFF7C3AED);
  Color get _accentBlue => const Color(0xFF22D3EE);
  Color get _neonBlue => const Color(0xFF38BDF8);
  Color get _cardTint => Colors.white.withValues(alpha: 0.07);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load(isInitial: true);
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
    _glowController.dispose();
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

  void _onExternalUpdate(dynamic _) {
    _load();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _load();
      SocketService().init();
    }
  }

  Future<void> _load({bool isInitial = false}) async {
    if (!mounted) return;
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
      setState(() {
        _vehicles = (results[0] as List<Vehicle>);
        _bookings = (results[1] as List<Booking>);
        _services = (results[2] as List<ServiceItem>);
        _loading = false;
      });
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
    final active = _bookings
        .where((b) => b.status != 'DELIVERED' && b.status != 'CANCELLED')
        .toList();
    active.sort((a, b) {
      final da = _parseDate(a.date) ?? DateTime(2999);
      final db = _parseDate(b.date) ?? DateTime(2999);
      return da.compareTo(db);
    });
    if (active.isEmpty) return null;
    return active.first;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
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
                        _buildHeader(),
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
                                      'Unable to load your dashboard.\n$_error',
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
                                    onPressed: _load,
                                    child: const Text('Retry'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        const SizedBox(height: 16),
                        _buildUpcomingServiceCard(),
                        const SizedBox(height: 24),
                        _buildQuickServices(),
                        const SizedBox(height: 24),
                        _buildRecentServices(),
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
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 700),
                builder: (context, value, child) {
                  return Opacity(
                    opacity: value,
                    child: Transform.translate(
                      offset: Offset(0, (1 - value) * 8),
                      child: child,
                    ),
                  );
                },
                child: Text(
                  firstName.isNotEmpty ? '$greeting, $firstName' : greeting,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ),
        _GlassIconButton(icon: Icons.search_rounded, onTap: () {}),
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
    final locationLabel = booking.pickupRequired
        ? (booking.location?.address ?? 'Pickup service scheduled')
        : (booking.merchantLocation?.address ??
              booking.merchantName ??
              'Service center assigned');

    return _NeonBorderCard(
      neonColor: _neonBlue,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Upcoming Service',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: isDark ? Colors.white : const Color(0xFF0F172A),
              fontWeight: FontWeight.w700,
            ),
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
            final isPressed = _pressedQuickServiceIndices.contains(index);
            return InkWell(
              borderRadius: BorderRadius.circular(18),
              onHighlightChanged: (v) {
                setState(() {
                  if (v) {
                    _pressedQuickServiceIndices.add(index);
                  } else {
                    _pressedQuickServiceIndices.remove(index);
                  }
                });
              },
              onTap: item.source == null
                  ? null
                  : () {
                      final nav = context.read<NavigationProvider>();
                      nav.navigateTo('/services', arguments: item.source!);
                    },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 140),
                transform: Matrix4.identity()
                  ..translate(0.0, isPressed ? 2.0 : 0.0)
                  ..scale(isPressed ? 0.97 : 1.0),
                child: _FrostedCard(
                  borderRadius: 18,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 10,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (category != null && category.isNotEmpty) ...[
                        AnimatedBuilder(
                          animation: _glowController,
                          builder: (context, child) {
                            final t = _glowController.value;
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(999),
                                gradient: LinearGradient(
                                  begin: Alignment(-1 + t, 0),
                                  end: Alignment(1 - t, 0),
                                  colors: [
                                    _accentPurple.withValues(alpha: 0.9),
                                    _accentBlue.withValues(alpha: 0.9),
                                  ],
                                ),
                              ),
                              child: child,
                            );
                          },
                          child: Text(
                            category.toUpperCase(),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.white,
                              fontSize: 8,
                              letterSpacing: 0.8,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                      AnimatedBuilder(
                        animation: _glowController,
                        builder: (context, child) {
                          final t = _glowController.value;
                          final scale = 0.94 + 0.12 * t;
                          return Transform.scale(
                            scale: scale,
                            child: Hero(
                              tag: item.source != null
                                  ? 'service-hero-${item.source!.id}'
                                  : 'service-hero-${item.label}',
                              child: Container(
                                width: 34,
                                height: 34,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: RadialGradient(
                                    center: Alignment(0, -0.2 + 0.2 * t),
                                    colors: [
                                      _accentBlue.withValues(alpha: 0.9),
                                      _accentPurple.withValues(alpha: 0.3),
                                    ],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: _accentBlue.withValues(alpha: 0.8),
                                      blurRadius: 18,
                                      spreadRadius: 1.2,
                                    ),
                                  ],
                                ),
                                child: child,
                              ),
                            ),
                          );
                        },
                        child: Center(
                          child: Icon(item.icon, size: 20, color: Colors.white),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        item.label,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.95)
                              : const Color(0xFF0F172A),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (item.price != null && item.price! > 0) ...[
                        const SizedBox(height: 4),
                        Text(
                          _formatPrice(item.price!),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.8)
                                : const Color(0xFF0F172A),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                      if (item.estimatedMinutes != null &&
                          item.estimatedMinutes! > 0) ...[
                        const SizedBox(height: 2),
                        Text(
                          '${item.estimatedMinutes!.round()} min',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.6)
                                : const Color(0xFF64748B),
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildRecentServices() {
    final sorted = [..._bookings];
    sorted.sort((a, b) {
      final da = _parseDate(a.date) ?? DateTime(1900);
      final db = _parseDate(b.date) ?? DateTime(1900);
      return db.compareTo(da);
    });
    final items = sorted.take(3).toList();

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
    final useBlur = !kIsWeb;
    final blurSigma = useBlur ? 10.0 : 0.0;
    final container = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: child,
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: useBlur
          ? BackdropFilter(
              filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
              child: container,
            )
          : container,
    );
  }
}

class _NeonBorderCard extends StatelessWidget {
  final Widget child;
  final Color neonColor;

  const _NeonBorderCard({required this.child, required this.neonColor});

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(26);
    final useBlur = !kIsWeb;
    final blurSigma = useBlur ? 10.0 : 0.0;
    return Stack(
      children: [
        Container(
          decoration: BoxDecoration(
            borderRadius: borderRadius,
            boxShadow: [
              BoxShadow(
                color: neonColor.withValues(alpha: 0.7),
                blurRadius: 25,
                spreadRadius: 1,
                offset: const Offset(0, 0),
              ),
            ],
          ),
        ),
        ClipRRect(
          borderRadius: borderRadius,
          child: useBlur
              ? BackdropFilter(
                  filter: ImageFilter.blur(
                    sigmaX: blurSigma,
                    sigmaY: blurSigma,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      borderRadius: borderRadius,
                      border: Border.all(
                        color: neonColor.withValues(alpha: 0.9),
                        width: 1.6,
                      ),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Colors.white.withValues(alpha: 0.06),
                          Colors.white.withValues(alpha: 0.02),
                        ],
                      ),
                    ),
                    child: child,
                  ),
                )
              : Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    borderRadius: borderRadius,
                    border: Border.all(
                      color: neonColor.withValues(alpha: 0.9),
                      width: 1.6,
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white.withValues(alpha: 0.06),
                        Colors.white.withValues(alpha: 0.02),
                      ],
                    ),
                  ),
                  child: child,
                ),
        ),
      ],
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
          boxShadow: [
            BoxShadow(
              color: blue.withValues(alpha: 0.7),
              blurRadius: 18,
              spreadRadius: 1,
            ),
          ],
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

class _GlowingHomeButton extends StatelessWidget {
  final AnimationController controller;
  final Color purple;
  final Color blue;
  final VoidCallback onTap;

  const _GlowingHomeButton({
    required this.controller,
    required this.purple,
    required this.blue,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        final t = 0.5 + 0.5 * controller.value;
        final size = 72 + 4 * controller.value;
        final blur = 24 + 12 * controller.value;

        return GestureDetector(
          onTap: onTap,
          child: Container(
            width: size + 20,
            height: size + 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [purple.withValues(alpha: 0.1), Colors.transparent],
              ),
            ),
            child: Center(
              child: Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(colors: [purple, blue]),
                  boxShadow: [
                    BoxShadow(
                      color: purple.withValues(alpha: 0.7 * t),
                      blurRadius: blur,
                      spreadRadius: 2,
                    ),
                    BoxShadow(
                      color: blue.withValues(alpha: 0.7 * t),
                      blurRadius: blur,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.home_rounded,
                  color: Colors.white,
                  size: 32,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _NeonBottomNavigationBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final Color purple;
  final Color blue;
  final Color backgroundTint;

  const _NeonBottomNavigationBar({
    required this.currentIndex,
    required this.onTap,
    required this.purple,
    required this.blue,
    required this.backgroundTint,
  });

  @override
  Widget build(BuildContext context) {
    final useBlur = !kIsWeb;
    final blurSigma = useBlur ? 10.0 : 0.0;
    return Container(
      margin: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.7),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: useBlur
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
                child: Container(
                  decoration: BoxDecoration(
                    color: backgroundTint,
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.08),
                      width: 1,
                    ),
                  ),
                  child: BottomNavigationBar(
                    type: BottomNavigationBarType.fixed,
                    backgroundColor: Colors.transparent,
                    elevation: 0,
                    selectedFontSize: 11,
                    unselectedFontSize: 10,
                    selectedItemColor: Colors.white,
                    unselectedItemColor: Colors.white.withValues(alpha: 0.6),
                    showUnselectedLabels: true,
                    currentIndex: currentIndex,
                    onTap: onTap,
                    items: [
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.directions_car_filled_rounded),
                        label: 'Vehicles',
                      ),
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.build_circle_rounded),
                        label: 'Services',
                      ),
                      BottomNavigationBarItem(
                        icon: Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.4),
                            ),
                          ),
                        ),
                        label: 'Home',
                      ),
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.receipt_long_rounded),
                        label: 'Orders',
                      ),
                      const BottomNavigationBarItem(
                        icon: Icon(Icons.person_rounded),
                        label: 'Profile',
                      ),
                    ],
                  ),
                ),
              )
            : Container(
                decoration: BoxDecoration(
                  color: backgroundTint,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.08),
                    width: 1,
                  ),
                ),
                child: BottomNavigationBar(
                  type: BottomNavigationBarType.fixed,
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  selectedFontSize: 11,
                  unselectedFontSize: 10,
                  selectedItemColor: Colors.white,
                  unselectedItemColor: Colors.white.withValues(alpha: 0.6),
                  showUnselectedLabels: true,
                  currentIndex: currentIndex,
                  onTap: onTap,
                  items: [
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.directions_car_filled_rounded),
                      label: 'Vehicles',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.build_circle_rounded),
                      label: 'Services',
                    ),
                    BottomNavigationBarItem(
                      icon: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.4),
                          ),
                        ),
                      ),
                      label: 'Home',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.receipt_long_rounded),
                      label: 'Orders',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.person_rounded),
                      label: 'Profile',
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _GlassIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _GlassIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _FrostedCard(
      borderRadius: 999,
      padding: const EdgeInsets.all(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(
            icon,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            size: 22,
          ),
        ),
      ),
    );
  }
}
