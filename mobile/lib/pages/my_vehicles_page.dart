import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../state/navigation_provider.dart';
import '../models/vehicle.dart';
import '../services/vehicle_service.dart';
import '../state/auth_provider.dart';

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

  Future<bool> _ensureAuthenticated() async {
    final auth = context.read<AuthProvider>();
    final navigator = Navigator.of(context);
    if (auth.isAuthenticated) return true;
    await auth.loadMe();
    if (!mounted) return false;
    if (!auth.isAuthenticated) {
      navigator.pushNamedAndRemoveUntil('/login', (route) => false);
      return false;
    }
    return true;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final ok = await _ensureAuthenticated();
      if (!ok) return;
      await _load();
    });
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loading = true;
      _error = null;
    });
    final ok = await _ensureAuthenticated();
    if (!ok) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final items = await _service.listMyVehicles();
      if (mounted) setState(() => _vehicles = items);
    } catch (e) {
      if (e is ApiException && e.statusCode == 401) {
        await auth.logout();
        if (!mounted) return;
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil('/login', (route) => false);
        return;
      }
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openAddVehicleSheet() async {
    final licensePlateController = TextEditingController();
    final makeController = TextEditingController();
    final modelController = TextEditingController();
    final yearController = TextEditingController();
    var type = 'Car';

    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (sheetContext) {
          var saving = false;
          var fetching = false;
          return StatefulBuilder(
            builder: (sheetContext, setModalState) {
              Future<void> fetchDetails() async {
                final plate = licensePlateController.text.trim();
                if (plate.isEmpty) return;

                setModalState(() => fetching = true);
                try {
                  final details = await _service.fetchDetails(plate);
                  if (details != null) {
                    setModalState(() {
                      makeController.text = details['make']?.toString() ?? '';
                      modelController.text = details['model']?.toString() ?? '';
                      yearController.text = details['year']?.toString() ?? '';
                      if (details['type'] != null) {
                        type = details['type'].toString();
                      }
                    });
                    if (sheetContext.mounted) {
                      ScaffoldMessenger.of(sheetContext).showSnackBar(
                        const SnackBar(content: Text('Details fetched!')),
                      );
                    }
                  } else {
                    if (sheetContext.mounted) {
                      ScaffoldMessenger.of(sheetContext).showSnackBar(
                        const SnackBar(
                          content: Text('Could not find vehicle details'),
                        ),
                      );
                    }
                  }
                } catch (e) {
                  if (sheetContext.mounted) {
                    ScaffoldMessenger.of(
                      sheetContext,
                    ).showSnackBar(SnackBar(content: Text('Error: $e')));
                  }
                } finally {
                  setModalState(() => fetching = false);
                }
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
                  await _service.addVehicle(
                    licensePlate: licensePlate,
                    make: make,
                    model: model,
                    year: year,
                    type: type,
                  );
                  if (!sheetContext.mounted) return;
                  Navigator.pop(sheetContext);
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Vehicle added')),
                  );
                  await _load();
                } catch (e) {
                  if (!sheetContext.mounted) return;
                  ScaffoldMessenger.of(
                    sheetContext,
                  ).showSnackBar(SnackBar(content: Text(e.toString())));
                  setModalState(() => saving = false);
                }
              }

              Widget field({
                required TextEditingController controller,
                required String label,
                TextInputType? keyboardType,
              }) {
                return TextField(
                  controller: controller,
                  keyboardType: keyboardType,
                  decoration: InputDecoration(
                    labelText: label,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                );
              }

              final bottomInset = MediaQuery.of(sheetContext).viewInsets.bottom;
              return Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottomInset),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Add Vehicle',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: saving
                                ? null
                                : () => Navigator.pop(sheetContext),
                            icon: const Icon(Icons.close),
                            tooltip: 'Close',
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: field(
                              controller: licensePlateController,
                              label: 'License Plate',
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton.filledTonal(
                            onPressed: fetching ? null : fetchDetails,
                            icon: fetching
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.search),
                            tooltip: 'Fetch Details',
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      field(controller: makeController, label: 'Make'),
                      const SizedBox(height: 10),
                      field(controller: modelController, label: 'Model'),
                      const SizedBox(height: 10),
                      field(
                        controller: yearController,
                        label: 'Year',
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 10),
                      DropdownMenu<String>(
                        initialSelection: type,
                        enabled: !saving,
                        dropdownMenuEntries: const [
                          DropdownMenuEntry(value: 'Car', label: 'Car'),
                          DropdownMenuEntry(value: 'Bike', label: 'Bike'),
                        ],
                        onSelected: (v) {
                          if (v == null) return;
                          setModalState(() => type = v);
                        },
                        label: const Text('Type'),
                      ),
                      const SizedBox(height: 14),
                      FilledButton(
                        onPressed: saving ? null : submit,
                        child: saving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Save'),
                      ),
                    ],
                  ),
                ),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('My Vehicles'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _openAddVehicleSheet,
            icon: const Icon(Icons.add),
            tooltip: 'Add Vehicle',
          ),
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
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
                      'Failed to load vehicles',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _load,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              )
            else if (_vehicles.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: Column(
                  children: [
                    const Text('No vehicles added yet'),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _openAddVehicleSheet,
                      icon: const Icon(Icons.add),
                      label: const Text('Add Vehicle'),
                    ),
                  ],
                ),
              )
            else ...[
              for (final v in _vehicles)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
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
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${v.licensePlate} • ${v.year}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: Colors.black54),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => context
                              .read<NavigationProvider>()
                              .setTab(1, arguments: {'openBookHint': true}),
                          icon: const Icon(Icons.add_task_outlined),
                          tooltip: 'Book Service',
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
