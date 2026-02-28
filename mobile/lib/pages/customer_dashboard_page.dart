import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/navigation_provider.dart';

import '../core/api_client.dart';
import '../models/booking.dart';
import '../models/service.dart';
import '../models/vehicle.dart';
import '../services/booking_service.dart';
import '../services/catalog_service.dart';
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

  List<ServiceItem> _services = [];
  List<Vehicle> _vehicles = [];
  List<Booking> _bookings = [];

  @override
  void initState() {
    super.initState();

    // Load data after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _load(isInitial: true);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load({bool isInitial = false}) async {
    if (!mounted) return;

    // Prevent double loading if already loading
    if (_loading && !isInitial) return;

    // If we already have data and this is the initial call,
    // we might want to skip or just refresh in background.
    // For now, let's just ensure we don't show the loading indicator if we have data.
    setState(() {
      _loading = true;
      _error = null;
    });

    debugPrint('CustomerDashboard: _load called (isInitial: $isInitial)');

    try {
      final results = await Future.wait<dynamic>([
        _vehicleService.listMyVehicles(),
        _bookingService.listMyBookings(),
        _catalogService.listServices(),
      ]);

      if (mounted) {
        setState(() {
          _vehicles = (results[0] as List<Vehicle>);
          _bookings = (results[1] as List<Booking>);
          _services = (results[2] as List<ServiceItem>);
          if (_selectedVehicleId == null && _vehicles.isNotEmpty) {
            _selectedVehicleId = _vehicles.first.id;
          }
          _loading = false;
        });
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
        return 'Servicing';
      case 'SERVICE_COMPLETED':
        return 'Ready';
      case 'OUT_FOR_DELIVERY':
        return 'Waiting for Staff Pickup';
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

  Booking? _upcomingBooking() {
    final active = _bookings
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
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final bottomInset = MediaQuery.of(context).padding.bottom;
    final rawName = (user?.name ?? '').trim();
    final firstName = rawName.isEmpty ? '' : rawName.split(' ').first;

    return Scaffold(
      extendBody: true,
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
            icon: const Icon(Icons.menu),
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
              physics: const _FasterScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              padding: EdgeInsets.fromLTRB(16, 14, 16, 110 + bottomInset),
              children: [
                _GreetingHeader(
                  greeting: _greeting(),
                  name: firstName,
                  tagline: 'Track your service status',
                ),
                const SizedBox(height: 8),
                if (_loading && _vehicles.isEmpty && _bookings.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 32),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_error != null && _vehicles.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 24),
                    child: Column(
                      children: [
                        Text(
                          'Failed to load dashboard',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: Colors.black54),
                        ),
                        const SizedBox(height: 12),
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
                  const SizedBox(height: 16),
                  if (_vehicles.isEmpty) const _AddVehicleCta(),
                  const SizedBox(height: 16),
                  _QuickServicesSection(services: _services),
                  const SizedBox(height: 16),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFEDE9FE),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.directions_car_filled_outlined,
              color: Color(0xFF4F46E5),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Add your vehicle',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Save a vehicle to get quick bookings and updates.',
                  style: TextStyle(color: Colors.black54),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          FilledButton(
            onPressed: () {
              context.read<NavigationProvider>().setTab(0);
            },
            child: const Text('Add Vehicle'),
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
        borderRadius: BorderRadius.circular(18),
        child: Container(
          width: 98,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFE0F2FE) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected
                  ? const Color(0xFF38BDF8)
                  : const Color(0xFFE5E7EB),
              width: selected ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 14,
                offset: const Offset(0, 10),
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
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.directions_car_filled_outlined,
                  color: Color(0xFF2563EB),
                  size: 20,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                v.make,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                v.licensePlate,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
              ),
            ],
          ),
        ),
      );
    }

    return InkWell(
      onTap: () =>
          Navigator.pushNamed(context, '/track', arguments: booking.id),
      borderRadius: BorderRadius.circular(26),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(
            color: const Color(0xFF93C5FD).withValues(alpha: 0.55),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 16,
              offset: const Offset(0, 8),
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
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF64748B),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        primaryService,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF0F172A),
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
                        backgroundColor: const Color(0xFFE2E8F0),
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          Color(0xFF38BDF8),
                        ),
                      ),
                      Text(
                        '$percent%',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              height: 98,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(22),
                color: Colors.white,
                border: Border.all(
                  color: const Color(0xFF93C5FD).withValues(alpha: 0.45),
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
                          topRight: Radius.circular(22),
                          bottomRight: Radius.circular(22),
                        ),
                        child: Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFFE0F2FE), Color(0xFFEDE9FE)],
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
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.65),
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
                        color: const Color(0xFF4F46E5).withValues(alpha: 0.55),
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
                            color: Colors.white.withValues(alpha: 0.78),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: const Color(
                                0xFF93C5FD,
                              ).withValues(alpha: 0.40),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.analytics_outlined,
                                size: 16,
                                color: Color(0xFF0F172A),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Status: ${statusLabel(booking.status)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${formatDate(booking.date)} • ${formatTime(booking.date)}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF334155),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Progress',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF64748B),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$percent%',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF0F172A),
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFF38BDF8),
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
                  separatorBuilder: (context, _) => const SizedBox(width: 10),
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

class _FasterScrollPhysics extends ClampingScrollPhysics {
  const _FasterScrollPhysics({super.parent});

  @override
  _FasterScrollPhysics applyTo(ScrollPhysics? ancestor) {
    return _FasterScrollPhysics(parent: buildParent(ancestor));
  }

  @override
  double applyPhysicsToUserOffset(ScrollMetrics position, double offset) {
    return offset * 1.8;
  }

  @override
  Simulation? createBallisticSimulation(
    ScrollMetrics position,
    double velocity,
  ) {
    return super.createBallisticSimulation(position, velocity * 1.5);
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
              onPressed: () => context.read<NavigationProvider>().setTab(1),
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
                onTap: () =>
                    context.read<NavigationProvider>().setTab(1, arguments: s),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Activity',
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: Text('No recent services found')),
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
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () =>
                      Navigator.pushNamed(context, '/track', arguments: b.id),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEDE9FE),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.receipt_long,
                            color: Color(0xFF4F46E5),
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
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              if (vehicleLabel.isNotEmpty)
                                Text(
                                  vehicleLabel,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(color: Colors.black54),
                                ),
                              const SizedBox(height: 6),
                              Text(
                                '${formatDate(b.date)} • ${formatTime(b.date)}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: Colors.black54),
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
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '₹${b.totalAmount}',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: Colors.black54),
                            ),
                          ],
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.chevron_right),
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 18,
              offset: const Offset(0, 12),
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 18,
              offset: const Offset(0, 12),
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
        color: const Color(0xFFF8FAFC),
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
