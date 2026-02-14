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

class CustomerDashboardPage extends StatefulWidget {
  const CustomerDashboardPage({super.key});

  @override
  State<CustomerDashboardPage> createState() => _CustomerDashboardPageState();
}

class _CustomerDashboardPageState extends State<CustomerDashboardPage>
    with SingleTickerProviderStateMixin {
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();
  final _scrollController = ScrollController();
  String? _selectedVehicleId;
  late final AnimationController _introController;

  bool _loading = true;
  String? _error;

  List<ServiceItem> _services = [];
  List<Vehicle> _vehicles = [];
  List<Booking> _bookings = [];

  Future<bool> _ensureAuthenticated() async {
    final auth = context.read<AuthProvider>();
    final navigator = Navigator.of(context);
    if (auth.isAuthenticated) return true;
    await auth.loadMe();
    if (!mounted) return false;
    if (!auth.isAuthenticated) {
      navigator.pushNamedAndRemoveUntil('/register', (route) => false);
      return false;
    }
    return true;
  }

  @override
  void initState() {
    super.initState();
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 720),
    )..forward();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final ok = await _ensureAuthenticated();
      if (!ok) return;
      await _load();
    });
  }

  @override
  void dispose() {
    _introController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final navigator = Navigator.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    final ok = await _ensureAuthenticated();
    if (!ok) {
      if (mounted) {
        setState(() => _loading = false);
      }
      return;
    }
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
        });
      }
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await auth.logout();
        if (!mounted) return;
        navigator.pushNamedAndRemoveUntil('/register', (route) => false);
        return;
      }
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _openAddVehicleSheet() async {
    final licensePlateController = TextEditingController();
    final makeController = TextEditingController();
    final modelController = TextEditingController();
    final yearController = TextEditingController();

    try {
      final messenger = ScaffoldMessenger.of(context);
      var vehiclesFuture = _vehicleService.listMyVehicles();
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (sheetContext) {
          var step = 0;
          var type = 'Car';
          var saving = false;

          return StatefulBuilder(
            builder: (sheetContext, setModalState) {
              void resetForm() {
                licensePlateController.clear();
                makeController.clear();
                modelController.clear();
                yearController.clear();
                type = 'Car';
              }

              Future<void> submit() async {
                final licensePlate = licensePlateController.text.trim();
                final make = makeController.text.trim();
                final model = modelController.text.trim();
                final yearRaw = yearController.text.trim();
                final year = int.tryParse(yearRaw);

                if (licensePlate.isEmpty ||
                    make.isEmpty ||
                    model.isEmpty ||
                    year == null) {
                  ScaffoldMessenger.of(sheetContext).showSnackBar(
                    const SnackBar(content: Text('Please fill all fields')),
                  );
                  return;
                }

                setModalState(() => saving = true);
                try {
                  await _vehicleService.addVehicle(
                    licensePlate: licensePlate,
                    make: make,
                    model: model,
                    year: year,
                    type: type,
                  );
                  if (!sheetContext.mounted) return;
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Vehicle added')),
                  );
                  setModalState(() {
                    saving = false;
                    step = 0;
                    vehiclesFuture = _vehicleService.listMyVehicles();
                  });
                  resetForm();
                  if (mounted) {
                    await _load();
                  }
                } catch (e) {
                  if (!sheetContext.mounted) return;
                  ScaffoldMessenger.of(
                    sheetContext,
                  ).showSnackBar(SnackBar(content: Text(e.toString())));
                  setModalState(() => saving = false);
                }
              }

              Widget vehicleCard(Vehicle v) {
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
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
                          Icons.directions_car_filled_outlined,
                          color: Color(0xFF4F46E5),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${v.make} ${v.model}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(sheetContext).textTheme.bodyMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${v.licensePlate} • ${v.year}',
                              style: Theme.of(sheetContext).textTheme.bodySmall
                                  ?.copyWith(color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }

              Widget addVehicleCard() {
                return InkWell(
                  onTap: () => setModalState(() => step = 1),
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: const Color(0xFFE5E7EB),
                        width: 2,
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(
                              0xFF4F46E5,
                            ).withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.add,
                            color: Color(0xFF4F46E5),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Add Vehicle',
                                style: Theme.of(sheetContext)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Register a new vehicle',
                                style: Theme.of(sheetContext)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: Colors.black54),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right),
                      ],
                    ),
                  ),
                );
              }

              Widget listStep() {
                return FutureBuilder<List<Vehicle>>(
                  future: vehiclesFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState != ConnectionState.done) {
                      return const Padding(
                        padding: EdgeInsets.only(top: 24),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (snapshot.hasError) {
                      return Padding(
                        padding: const EdgeInsets.only(top: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Failed to load vehicles',
                              style: Theme.of(sheetContext)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              snapshot.error.toString(),
                              style: Theme.of(sheetContext).textTheme.bodySmall
                                  ?.copyWith(color: Colors.black54),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton(
                              onPressed: () {
                                setModalState(() {
                                  vehiclesFuture = _vehicleService
                                      .listMyVehicles();
                                });
                              },
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      );
                    }

                    final vehicles = snapshot.data ?? [];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (vehicles.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 10),
                            child: Text(
                              'No vehicles yet.',
                              style: TextStyle(color: Colors.black54),
                            ),
                          )
                        else
                          ...vehicles.map((v) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: vehicleCard(v),
                            );
                          }),
                        addVehicleCard(),
                      ],
                    );
                  },
                );
              }

              Widget formStep() {
                final bottom = MediaQuery.of(sheetContext).viewInsets.bottom;
                return Padding(
                  padding: EdgeInsets.only(bottom: bottom),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Vehicle Details',
                        style: Theme.of(sheetContext).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: licensePlateController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'License Plate',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: makeController,
                              decoration: const InputDecoration(
                                labelText: 'Make',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: modelController,
                              decoration: const InputDecoration(
                                labelText: 'Model',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: yearController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Year',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: DropdownMenu<String>(
                              initialSelection: type,
                              dropdownMenuEntries: const [
                                DropdownMenuEntry(value: 'Car', label: 'Car'),
                                DropdownMenuEntry(value: 'Bike', label: 'Bike'),
                              ],
                              onSelected: saving
                                  ? null
                                  : (v) {
                                      if (v == null) return;
                                      setModalState(() => type = v);
                                    },
                              label: const Text('Type'),
                              inputDecorationTheme: const InputDecorationTheme(
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }

              return DraggableScrollableSheet(
                expand: false,
                initialChildSize: 0.78,
                minChildSize: 0.52,
                maxChildSize: 0.92,
                builder: (context, scrollController) {
                  final bottomInset = MediaQuery.of(context).padding.bottom;
                  return Container(
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(28),
                      ),
                    ),
                    child: ListView(
                      controller: scrollController,
                      padding: EdgeInsets.fromLTRB(
                        16,
                        10,
                        16,
                        16 + bottomInset,
                      ),
                      children: [
                        Center(
                          child: Container(
                            width: 42,
                            height: 5,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE5E7EB),
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                step == 0 ? 'Your Vehicles' : 'Add Vehicle',
                                style: Theme.of(sheetContext)
                                    .textTheme
                                    .titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                            ),
                            if (step == 1)
                              TextButton(
                                onPressed: saving
                                    ? null
                                    : () {
                                        setModalState(() => step = 0);
                                        resetForm();
                                      },
                                child: const Text('Cancel'),
                              ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        step == 0 ? listStep() : formStep(),
                        const SizedBox(height: 18),
                        if (step == 1)
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: saving
                                      ? null
                                      : () {
                                          setModalState(() => step = 0);
                                          resetForm();
                                        },
                                  child: const Text('Back'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: FilledButton(
                                  onPressed: saving ? null : submit,
                                  child: saving
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Text('Save'),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  );
                },
              );
            },
          );
        },
      );
    } finally {
      licensePlateController.dispose();
      makeController.dispose();
      modelController.dispose();
      yearController.dispose();
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
        return 'Pickup Assigned';
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
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
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
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final bottomInset = MediaQuery.of(context).padding.bottom;

    Widget enter(double start, Widget child) {
      final curve = CurvedAnimation(
        parent: _introController,
        curve: Interval(start, 1, curve: Curves.easeOutCubic),
      );
      return FadeTransition(
        opacity: curve,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.06),
            end: Offset.zero,
          ).animate(curve),
          child: child,
        ),
      );
    }

    String initials() {
      final name = (user?.name ?? '').trim();
      if (name.isEmpty) return 'U';
      final parts = name
          .split(RegExp(r'\s+'))
          .where((e) => e.isNotEmpty)
          .toList(growable: false);
      if (parts.isEmpty) return 'U';

      String firstChar(String v) {
        if (v.isEmpty) return '';
        final runes = v.runes.toList(growable: false);
        if (runes.isEmpty) return '';
        return String.fromCharCode(runes.first);
      }

      final a = firstChar(parts.first);
      final b = parts.length > 1 ? firstChar(parts.last) : '';
      final out = (a + b).trim();
      return (out.isEmpty ? 'U' : out).toUpperCase();
    }

    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 8,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_greeting()},',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
                color: const Color(0xFF0F172A),
              ),
            ),
            Text(
              user != null ? user.name : 'VehicleCare',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: const Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () async {
              final result = await Navigator.pushNamed(context, '/services');
              if (!context.mounted) return;
              if (result == 'openAddVehicle') await _openAddVehicleSheet();
            },
            icon: const Icon(Icons.search),
            tooltip: 'Services',
          ),
          Padding(
            padding: const EdgeInsets.only(right: 10),
            child: InkWell(
              onTap: () => context.read<NavigationProvider>().setTab(4),
              borderRadius: BorderRadius.circular(999),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFEDE9FE),
                child: Text(
                  initials(),
                  style: const TextStyle(
                    color: Color(0xFF4F46E5),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: ListView(
              controller: _scrollController,
              padding: EdgeInsets.fromLTRB(16, 14, 16, 110 + bottomInset),
              children: [
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.only(top: 32),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_error != null)
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
                  enter(
                    0.0,
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
                  ),
                  const SizedBox(height: 16),
                  enter(0.12, _VehiclesSection(vehicles: _vehicles)),
                  const SizedBox(height: 16),
                  enter(0.22, _QuickServicesSection(services: _services)),
                  const SizedBox(height: 16),
                  enter(
                    0.34,
                    _RecentBookingsSection(
                      bookings: _bookings,
                      statusLabel: _statusLabel,
                      formatDate: (v) => _formatDate(context, v),
                      formatTime: (v) => _formatTime(context, v),
                    ),
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
        return 0.98;
      case 'DELIVERED':
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
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
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
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 28,
              offset: const Offset(0, 18),
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
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: progress),
                  duration: const Duration(milliseconds: 720),
                  curve: Curves.easeOutCubic,
                  builder: (context, value, _) {
                    final label = '${(value * 100).round()}%';
                    return SizedBox(
                      width: 56,
                      height: 56,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CircularProgressIndicator(
                            value: value,
                            strokeWidth: 6,
                            backgroundColor: const Color(0xFFE2E8F0),
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              Color(0xFF38BDF8),
                            ),
                          ),
                          Text(
                            label,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              height: 98,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(22),
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFFE0F2FE),
                    const Color(0xFFEDE9FE).withValues(alpha: 0.85),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(
                  color: const Color(0xFF93C5FD).withValues(alpha: 0.45),
                ),
              ),
              child: Stack(
                children: [
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
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: const Duration(milliseconds: 720),
              curve: Curves.easeOutCubic,
              builder: (context, value, _) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Progress',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: const Color(0xFF64748B),
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '$percent%',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
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
                        value: value,
                        minHeight: 8,
                        backgroundColor: const Color(0xFFE2E8F0),
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          Color(0xFF38BDF8),
                        ),
                      ),
                    ),
                  ],
                );
              },
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

class _VehiclesSection extends StatelessWidget {
  final List<Vehicle> vehicles;

  const _VehiclesSection({required this.vehicles});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'My Vehicles',
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
        if (vehicles.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
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
                const Expanded(
                  child: Text(
                    'Add your vehicle to get started with booking services.',
                    style: TextStyle(color: Color(0xFF334155)),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () => Navigator.pushNamed(context, '/vehicles'),
                  style: FilledButton.styleFrom(
                    backgroundColor: scheme.primary,
                    foregroundColor: scheme.onPrimary,
                  ),
                  child: const Text('Add'),
                ),
              ],
            ),
          )
        else
          SizedBox(
            height: 112,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: vehicles.length,
              separatorBuilder: (context, index) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final v = vehicles[index];
                return _VehicleMiniCard(
                  title: '${v.make} ${v.model}',
                  subtitle: v.licensePlate,
                  onTap: () => context.read<NavigationProvider>().setTab(0),
                );
              },
            ),
          ),
      ],
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
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.98 : 1,
        duration: const Duration(milliseconds: 140),
        curve: Curves.easeOut,
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
  bool _pressed = false;

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
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1,
        duration: const Duration(milliseconds: 140),
        curve: Curves.easeOut,
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
      ),
    );
  }
}
