import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/navigation_provider.dart';

import '../core/app_colors.dart';
import '../core/app_spacing.dart';
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
import '../widgets/customer_drawer.dart';

class CustomerDashboardPage extends StatefulWidget {
  const CustomerDashboardPage({super.key});

  @override
  State<CustomerDashboardPage> createState() => _CustomerDashboardPageState();
}

class _CustomerDashboardPageState extends State<CustomerDashboardPage> {
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();
  final _scrollController = ScrollController();
  String? _selectedVehicleId;

  bool _loading = false;
  String? _error;
  DateTime? _lastLoadedAt;
  bool _isShowingNoVehicleDialog = false;

  List<ServiceItem> _services = [];
  List<Vehicle> _vehicles = [];
  List<Booking> _bookings = [];
  Booking? _upcomingBookingCached;

  @override
  void initState() {
    super.initState();

    // Load data after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _restoreAndLoad();
      }
    });

    // Listen to socket updates for real-time refresh
    final socket = context.read<SocketService>();
    socket.addListener(_onSocketUpdate);
  }

  @override
  void dispose() {
    // Remove listener
    try {
      final socket = context.read<SocketService>();
      socket.removeListener(_onSocketUpdate);
    } catch (_) {
      // Might fail if context is no longer available or Provider not found
    }
    _scrollController.dispose();
    super.dispose();
  }

  void _onSocketUpdate() {
    final event = context.read<SocketService>().value;
    // Reload data if a booking was created, updated or cancelled, or new approval
    if ((event == 'booking_created' ||
            event == 'booking_updated' ||
            event == 'booking_cancelled' ||
            event == 'new_approval') &&
        mounted) {
      _load();
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

      setState(() {
        _vehicles = vehicles;
        _bookings = bookings;
        _services = services;
        _upcomingBookingCached = upcoming;
        if (_selectedVehicleId == null && _vehicles.isNotEmpty) {
          _selectedVehicleId = _vehicles.first.id;
        }
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

  Future<void> _load({bool isInitial = false}) async {
    if (!mounted) return;

    final now = DateTime.now();
    if (!isInitial &&
        _lastLoadedAt != null &&
        now.difference(_lastLoadedAt!) < const Duration(seconds: 5)) {
      return;
    }
    _lastLoadedAt = now;

    // Only show full loading if it's the initial call or we have no data
    final shouldShowFullLoading =
        isInitial &&
        (_vehicles.isEmpty && _bookings.isEmpty && _services.isEmpty);

    if (shouldShowFullLoading) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final results = await Future.wait<dynamic>([
        _vehicleService.listMyVehicles(),
        _bookingService.listMyBookings(),
        _catalogService.listServices(isQuickService: true),
      ]);

      if (mounted) {
        final vehicles = (results[0] as List<Vehicle>);
        final bookings = (results[1] as List<Booking>);
        final services = (results[2] as List<ServiceItem>);
        final upcoming = _computeUpcomingBooking(bookings);

        setState(() {
          _vehicles = vehicles;
          _bookings = bookings;
          _services = services;
          _upcomingBookingCached = upcoming;
          if (_selectedVehicleId == null && _vehicles.isNotEmpty) {
            _selectedVehicleId = _vehicles.first.id;
          }
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
      }
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
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
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

  // Removed unused _openAddVehicleSheet (functionality available in MyVehicles page)

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
      case 'SERVICE_STARTED':
      case 'SERVICE_IN_PROGRESS':
        return 'Servicing';
      case 'SERVICE_COMPLETED':
        return 'Ready';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  Booking? _upcomingBooking() {
    if (_upcomingBookingCached != null) return _upcomingBookingCached;
    final computed = _computeUpcomingBooking(_bookings);
    _upcomingBookingCached = computed;
    return computed;
  }

  Booking? _computeUpcomingBooking(List<Booking> source) {
    final active = source
        .where(
          (b) =>
              b.status != 'DELIVERED' &&
              b.status != 'COMPLETED' &&
              b.status != 'CANCELLED',
        )
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
    final bottomInset = MediaQuery.of(context).padding.bottom;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      extendBody: true,
      backgroundColor: isDark
          ? AppColors.backgroundPrimary
          : AppColors.backgroundPrimaryLight,
      drawer: const CustomerDrawer(currentRouteName: '/customer'),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 8,
        automaticallyImplyLeading: false,
        leading: Builder(
          builder: (context) => IconButton(
            icon: Icon(
              Icons.menu,
              color: isDark ? Colors.white : Colors.black87,
            ),
            tooltip: 'Menu',
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: null,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: ListView(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.fromLTRB(16, 14, 16, 110 + bottomInset),
              children: [
                Selector<AuthProvider, String>(
                  selector: (_, auth) {
                    final rawName = (auth.user?.name ?? '').trim();
                    return rawName.isEmpty ? '' : rawName.split(' ').first;
                  },
                  builder: (context, firstName, _) {
                    return _GreetingHeader(
                      greeting: _greeting(),
                      name: firstName,
                      tagline: 'Track your service status',
                    );
                  },
                ),
                AppSpacing.verticalSmall,
                if (_loading && _vehicles.isEmpty && _bookings.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 32),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_error != null && _vehicles.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.section),
                    child: Column(
                      children: [
                        Text(
                          'Failed to load dashboard',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        AppSpacing.verticalSmall,
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: Colors.black54),
                        ),
                        AppSpacing.verticalMedium,
                        OutlinedButton(
                          onPressed: _load,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                else ...[
                  RepaintBoundary(
                    child: _UpcomingBookingCard(
                      booking: _upcomingBooking(),
                      vehicles: _vehicles,
                      selectedVehicleId: _selectedVehicleId,
                      onSelectVehicle: (id) => setState(() {
                        _selectedVehicleId = id;
                      }),
                      statusLabel: _statusLabel,
                      formatDate: (v) => _formatDate(context, v),
                      formatTime: (v) => _formatTime(context, v),
                    ),
                  ),
                  AppSpacing.verticalDefault,
                  if (_vehicles.isEmpty) const _AddVehicleCta(),
                  AppSpacing.verticalDefault,
                  _QuickServicesSection(services: _services),
                  AppSpacing.verticalDefault,
                  _RecentBookingsSection(
                    bookings: _bookings,
                    statusLabel: _statusLabel,
                    formatDate: (v) => _formatDate(context, v),
                    formatTime: (v) => _formatTime(context, v),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AddVehicleCta extends StatelessWidget {
  const _AddVehicleCta();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: AppSpacing.edgeInsetsAllDefault,
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.backgroundSurface
                  : AppColors.backgroundSurfaceLight,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.directions_car_filled_outlined,
              color: AppColors.primaryBlue,
            ),
          ),
          AppSpacing.horizontalMedium,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Add your vehicle',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: isDark
                        ? AppColors.textPrimary
                        : AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Save a vehicle to get quick bookings and updates.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isDark
                        ? AppColors.textSecondary
                        : AppColors.textSecondaryLight,
                  ),
                ),
              ],
            ),
          ),
          AppSpacing.horizontalMedium,
          Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primaryBlue, AppColors.primaryBlueDark],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ElevatedButton(
              onPressed: () {
                context.read<NavigationProvider>().setTab(0);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Add Vehicle'),
            ),
          ),
        ],
      ),
    );
  }
}

class _UpcomingBookingCard extends StatelessWidget {
  final Booking? booking;
  final List<Vehicle> vehicles;
  final String? selectedVehicleId;
  final ValueChanged<String> onSelectVehicle;
  final String Function(String status) statusLabel;
  final String Function(String value) formatDate;
  final String Function(String value) formatTime;

  const _UpcomingBookingCard({
    required this.booking,
    required this.vehicles,
    required this.selectedVehicleId,
    required this.onSelectVehicle,
    required this.statusLabel,
    required this.formatDate,
    required this.formatTime,
  });

  double _statusProgress(String status) {
    switch (status) {
      case 'CREATED':
        return 0.06;
      case 'ASSIGNED':
        return 0.14;
      case 'ACCEPTED':
        return 0.22;
      case 'REACHED_CUSTOMER':
        return 0.32;
      case 'VEHICLE_PICKED':
        return 0.42;
      case 'REACHED_MERCHANT':
        return 0.52;
      case 'VEHICLE_AT_MERCHANT':
        return 0.62;
      case 'JOB_CARD':
        return 0.72;
      case 'SERVICE_STARTED':
        return 0.84;
      case 'SERVICE_COMPLETED':
        return 0.93;
      case 'OUT_FOR_DELIVERY':
        return 0.96;
      case 'DELIVERED':
        return 1.0;
      case 'COMPLETED':
        return 1.0;
      case 'CANCELLED':
        return 0.0;
      default:
        return 0.2;
    }
  }

  @override
  Widget build(BuildContext context) {
    final booking = this.booking;
    if (booking == null) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryService = booking.services.isNotEmpty
        ? booking.services.first.name
        : 'Service';

    final progress = _statusProgress(booking.status).clamp(0.0, 1.0);
    final percent = (progress * 100).round();
    final miniCount = vehicles.length > 6 ? 6 : vehicles.length;

    Widget miniVehicle(Vehicle v) {
      final selected = selectedVehicleId == v.id;
      return InkWell(
        onTap: () => onSelectVehicle(v.id),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 98,
          padding: AppSpacing.edgeInsetsAllSmall,
          decoration: BoxDecoration(
            color: selected
                ? (isDark
                      ? AppColors.backgroundSurface
                      : AppColors.backgroundSurfaceLight)
                : (isDark ? AppColors.backgroundSecondary : Colors.white),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected
                  ? AppColors.primaryBlue
                  : (isDark
                        ? AppColors.borderColor
                        : AppColors.borderColorLight),
              width: selected ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.05),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.backgroundSurface
                      : AppColors.backgroundSurfaceLight,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.directions_car_filled_outlined,
                  color: AppColors.primaryBlue,
                  size: 20,
                ),
              ),
              AppSpacing.verticalSmall,
              Text(
                v.make,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isDark
                      ? AppColors.textPrimary
                      : AppColors.textPrimaryLight,
                ),
              ),
              Text(
                v.licensePlate.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  color: isDark
                      ? AppColors.textSecondary
                      : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return InkWell(
      onTap: () =>
          Navigator.pushNamed(context, '/track', arguments: booking.id),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: AppSpacing.edgeInsetsAllDefault,
        decoration: BoxDecoration(
          color: isDark ? AppColors.backgroundSecondary : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? AppColors.borderColor : AppColors.borderColorLight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.05),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Service in progress',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: isDark
                              ? AppColors.textSecondary
                              : AppColors.textSecondaryLight,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        primaryService,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: isDark
                              ? AppColors.textPrimary
                              : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  width: 56,
                  height: 56,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 6,
                        backgroundColor: isDark
                            ? AppColors.borderColor
                            : AppColors.borderColorLight,
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          AppColors.primaryBlue,
                        ),
                      ),
                      Text(
                        '$percent%',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: isDark
                              ? AppColors.textPrimary
                              : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            AppSpacing.verticalMedium,
            Container(
              height: 98,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: isDark
                    ? AppColors.backgroundSurface
                    : AppColors.backgroundSurfaceLight,
                border: Border.all(
                  color: isDark
                      ? AppColors.borderColor
                      : AppColors.borderColorLight,
                ),
              ),
              child: Stack(
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: FractionallySizedBox(
                      widthFactor: 0.44,
                      child: ClipRRect(
                        borderRadius: const BorderRadius.only(
                          topRight: Radius.circular(16),
                          bottomRight: Radius.circular(16),
                        ),
                        child: Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.primaryBlueSoft,
                                AppColors.primaryBlue,
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    top: 18,
                    child: Transform.rotate(
                      angle: -0.08,
                      child: Icon(
                        Icons.two_wheeler,
                        size: 64,
                        color: AppColors.primaryBlue.withValues(
                          alpha: isDark ? 0.65 : 0.15,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 12,
                    top: 18,
                    child: Transform.rotate(
                      angle: 0.08,
                      child: Icon(
                        Icons.directions_car_filled,
                        size: 68,
                        color: AppColors.primaryBlueDark.withValues(
                          alpha: isDark ? 0.55 : 0.25,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 14,
                    bottom: 12,
                    right: 14,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.backgroundPrimary
                                : Colors.white,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: isDark
                                  ? AppColors.borderColor
                                  : AppColors.borderColorLight,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.analytics_outlined,
                                size: 16,
                                color: isDark
                                    ? AppColors.textPrimary
                                    : AppColors.textPrimaryLight,
                              ),
                              AppSpacing.horizontalSmall,
                              Text(
                                'Status: ${statusLabel(booking.status)}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: isDark
                                          ? AppColors.textPrimary
                                          : AppColors.textPrimaryLight,
                                    ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${formatDate(booking.date)} • ${formatTime(booking.date)}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: isDark
                                    ? AppColors.textSecondary
                                    : AppColors.textSecondaryLight,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            AppSpacing.verticalMedium,
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Progress',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: isDark
                            ? AppColors.textPrimary
                            : AppColors.textPrimaryLight,
                      ),
                    ),
                    AppSpacing.horizontalSmall,
                    Text(
                      '$percent%',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: isDark
                            ? AppColors.textPrimary
                            : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                AppSpacing.verticalSmall,
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: isDark
                        ? AppColors.borderColor
                        : AppColors.borderColorLight,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.primaryBlue,
                    ),
                  ),
                ),
              ],
            ),
            if (vehicles.isNotEmpty) ...[
              const SizedBox(height: 14),
              SizedBox(
                height: 108,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: miniCount,
                  separatorBuilder: (context, _) => AppSpacing.horizontalSmall,
                  itemBuilder: (context, index) => miniVehicle(vehicles[index]),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _QuickServicesSection extends StatelessWidget {
  final List<ServiceItem> services;

  const _QuickServicesSection({required this.services});

  @override
  Widget build(BuildContext context) {
    final items = services.take(4).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Quick Services',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            TextButton(
              onPressed: () => context.read<NavigationProvider>().setTab(0),
              child: const Text('View all'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 118,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (context, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final s = items[index];
              return _QuickServiceTile(
                title: s.name,
                onTap: () {
                  final nav = context.read<NavigationProvider>();
                  final cat = (s.category ?? '').trim();
                  String route = '/services';

                  if (['Car Wash', 'Wash', 'Detailing'].contains(cat)) {
                    route = '/car-wash';
                  } else if (['Insurance'].contains(cat)) {
                    route = '/insurance';
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

                  nav.navigateTo(route, arguments: s);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _RecentBookingsSection extends StatelessWidget {
  final List<Booking> bookings;
  final String Function(String status) statusLabel;
  final String Function(String value) formatDate;
  final String Function(String value) formatTime;

  const _RecentBookingsSection({
    required this.bookings,
    required this.statusLabel,
    required this.formatDate,
    required this.formatTime,
  });

  @override
  Widget build(BuildContext context) {
    final items = bookings.take(3).toList();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Activity',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.textPrimary : AppColors.textPrimaryLight,
          ),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Center(
              child: Text(
                'No recent services found',
                style: TextStyle(
                  color: isDark
                      ? AppColors.textSecondary
                      : AppColors.textSecondaryLight,
                ),
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
                  ? '${b.vehicle!.make} ${b.vehicle!.model}${b.vehicle!.variant != null && b.vehicle!.variant!.isNotEmpty ? ' ${b.vehicle!.variant}' : ''} • ${b.vehicle!.licensePlate}'
                  : '';
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () =>
                      Navigator.pushNamed(context, '/track', arguments: b.id),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.backgroundSecondary
                          : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark
                            ? AppColors.borderColor
                            : AppColors.borderColorLight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(
                            alpha: isDark ? 0.4 : 0.05,
                          ),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.backgroundSurface
                                : AppColors.backgroundSurfaceLight,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.receipt_long,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                serviceName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isDark
                                      ? AppColors.textPrimary
                                      : AppColors.textPrimaryLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                vehicleLabel,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark
                                      ? AppColors.textSecondary
                                      : AppColors.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              statusLabel(b.status),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryBlue,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              formatDate(b.date),
                              style: TextStyle(
                                fontSize: 10,
                                color: isDark
                                    ? AppColors.textMuted
                                    : AppColors.textMutedLight,
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

class _VehicleMiniCard extends StatefulWidget {
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _VehicleMiniCard({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  State<_VehicleMiniCard> createState() => _VehicleMiniCardState();
}

class _VehicleMiniCardState extends State<_VehicleMiniCard> {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        width: 190,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.backgroundSecondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFEDE9FE),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.directions_car_filled_outlined,
                color: Color(0xFF4F46E5),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    widget.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}

class _QuickServiceTile extends StatefulWidget {
  final String title;
  final VoidCallback onTap;

  const _QuickServiceTile({required this.title, required this.onTap});

  @override
  State<_QuickServiceTile> createState() => _QuickServiceTileState();
}

class _QuickServiceTileState extends State<_QuickServiceTile> {
  IconData _iconForTitle(String title) {
    final v = title.toLowerCase();
    if (v.contains('wash') || v.contains('polish') || v.contains('detail')) {
      return Icons.local_car_wash_outlined;
    }
    if (v.contains('battery') || v.contains('tire') || v.contains('tyre')) {
      return Icons.battery_charging_full_outlined;
    }
    if (v.contains('engine') || v.contains('repair')) {
      return Icons.settings_suggest_outlined;
    }
    if (v.contains('insurance')) return Icons.shield_outlined;
    return Icons.build_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final icon = _iconForTitle(widget.title);
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        width: 118,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.backgroundSecondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(icon, color: const Color(0xFF2563EB)),
            ),
            const Spacer(),
            Text(
              widget.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w900,
                color: const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GreetingHeader extends StatelessWidget {
  final String greeting;
  final String name;
  final String tagline;

  const _GreetingHeader({
    required this.greeting,
    required this.name,
    required this.tagline,
  });

  TextStyle _gradientStyle(
    BuildContext context, {
    required List<Color> colors,
    double size = 34,
    FontWeight weight = FontWeight.w900,
  }) {
    final base =
        Theme.of(context).textTheme.displaySmall ??
        const TextStyle(fontSize: 34, fontWeight: FontWeight.w900);
    final shader = LinearGradient(
      colors: colors,
    ).createShader(const Rect.fromLTWH(0, 0, 300, 60));
    return base.copyWith(
      fontSize: size,
      fontWeight: weight,
      foreground: Paint()..shader = shader,
      height: 1.05,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 4, 6, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.waving_hand_outlined,
              color: Color(0xFF2563EB),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: _gradientStyle(
                    context,
                    colors: const [
                      Color(0xFF34D399),
                      Color(0xFF22D3EE),
                      Color(0xFF60A5FA),
                    ],
                    size: 28,
                  ),
                ),
                Text(
                  name.isEmpty ? 'Guest' : name,
                  style: _gradientStyle(
                    context,
                    colors: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
                    size: 30,
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 6),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFE0F2FE), Color(0xFFFCE7F3)],
                    ),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: const Color(0xFF22C55E),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        tagline,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
