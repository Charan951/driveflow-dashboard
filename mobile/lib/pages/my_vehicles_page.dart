import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_colors.dart';
import '../core/app_spacing.dart';
import '../core/api_client.dart';
import '../state/navigation_provider.dart';
import '../models/vehicle.dart';
import '../services/vehicle_service.dart';
import '../state/auth_provider.dart';
import '../widgets/customer_drawer.dart';

class MyVehiclesPage extends StatefulWidget {
  const MyVehiclesPage({super.key});

  @override
  State<MyVehiclesPage> createState() => _MyVehiclesPageState();
}

class _MyVehiclesPageState extends State<MyVehiclesPage> {
  final _service = VehicleService();
  bool _loading = true;
  String? _error;
  List<Vehicle> _vehicles = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    if (!mounted) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await _service.listMyVehicles();
      if (mounted) setState(() => _vehicles = items);
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
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openAddVehicleSheet() async {
    final result = await Navigator.pushNamed(context, '/add-vehicle');
    if (result == true) {
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      drawer: const CustomerDrawer(currentRouteName: '/vehicles'),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(left: AppSpacing.defaultPadding),
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryBlue, AppColors.primaryBlueDark],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryBlue.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Builder(
                  builder: (context) => IconButton(
                    icon: const Icon(Icons.menu),
                    color: Colors.white,
                    onPressed: () => Scaffold.of(context).openDrawer(),
                  ),
                ),
              ),
              AppSpacing.horizontalMedium,
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'My Vehicles',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(
                    'Manage your garage',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading && _vehicles.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? ListView(
                padding: AppSpacing.edgeInsetsAllDefault,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.section),
                    child: Column(
                      children: [
                        Text(
                          'Failed to load vehicles',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        AppSpacing.verticalSmall,
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        AppSpacing.verticalMedium,
                        OutlinedButton(
                          onPressed: _load,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ],
              )
            : _vehicles.isEmpty
            ? ListView(
                padding: AppSpacing.edgeInsetsAllDefault,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.section),
                    child: Column(
                      children: [
                        Icon(
                          Icons.directions_car_outlined,
                          size: 64,
                          color: AppColors.textSecondary.withValues(alpha: 0.5),
                        ),
                        AppSpacing.verticalMedium,
                        Text(
                          'Your garage is empty',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        AppSpacing.verticalSmall,
                        Text(
                          'Add your vehicles to get started with services.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        AppSpacing.verticalSection,
                        ElevatedButton(
                          onPressed: _openAddVehicleSheet,
                          child: const Text('Add My First Vehicle'),
                        ),
                      ],
                    ),
                  ),
                ],
              )
            : ListView.separated(
                padding: AppSpacing.edgeInsetsAllDefault,
                itemCount: _vehicles.length,
                separatorBuilder: (context, _) => AppSpacing.verticalMedium,
                itemBuilder: (context, index) {
                  final v = _vehicles[index];
                  return _VehicleCard(
                    vehicle: v,
                    onBookService: () => context
                        .read<NavigationProvider>()
                        .setTab(0, arguments: {'openBookHint': true}),
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddVehicleSheet,
        icon: const Icon(Icons.add),
        label: const Text('Add Vehicle'),
      ),
    );
  }
}

class _VehicleCard extends StatefulWidget {
  final Vehicle vehicle;
  final VoidCallback onBookService;

  const _VehicleCard({required this.vehicle, required this.onBookService});

  @override
  State<_VehicleCard> createState() => _VehicleCardState();
}

class _VehicleCardState extends State<_VehicleCard> {
  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Color _accentForType(String? type) {
    final t = type?.toLowerCase() ?? '';
    if (t.contains('bike')) return const Color(0xFF22D3EE);
    return const Color(0xFF2563EB);
  }

  String _typeLabel(String? type) {
    if (type == null || type.trim().isEmpty) return 'VEHICLE';
    final t = type.toLowerCase();
    if (t.contains('car')) return 'CAR';
    if (t.contains('bike')) return 'BIKE';
    return type.toUpperCase();
  }

  IconData _iconForType(String? type) {
    final t = type?.toLowerCase() ?? '';
    if (t.contains('bike')) return Icons.two_wheeler_outlined;
    return Icons.directions_car_filled_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.vehicle;
    final accent = _accentForType(v.type);
    return Container(
      padding: AppSpacing.edgeInsetsAllDefault,
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
      child: Stack(
        children: [
          Positioned.fill(
            child: Align(
              alignment: Alignment.centerRight,
              child: FractionallySizedBox(
                widthFactor: 0.20,
                child: ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          accent.withValues(alpha: 0.1),
                          accent.withValues(alpha: 0.2),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.backgroundSurface,
                  border: Border.all(color: AppColors.borderColor),
                ),
                child: Icon(_iconForType(v.type), color: accent),
              ),
              AppSpacing.horizontalMedium,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${v.make} ${v.model}${v.variant != null && v.variant!.isNotEmpty ? ' ${v.variant}' : ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${v.licensePlate} • ${v.year}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    AppSpacing.verticalSmall,
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        color: accent.withValues(alpha: 0.1),
                        border: Border.all(
                          color: accent.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Text(
                        _typeLabel(v.type),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: accent,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: widget.onBookService,
                icon: const Icon(
                  Icons.add_task_outlined,
                  color: AppColors.primaryBlue,
                ),
                tooltip: 'Book Service',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
