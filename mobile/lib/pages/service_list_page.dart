import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/catalog_service.dart';
import '../services/booking_service.dart';
import '../services/vehicle_service.dart';
import '../models/service.dart';
import '../models/vehicle.dart';
import '../state/auth_provider.dart';

class ServiceListPage extends StatefulWidget {
  const ServiceListPage({super.key});
  @override
  State<ServiceListPage> createState() => _ServiceListPageState();
}

class _ServiceListPageState extends State<ServiceListPage> {
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();
  late Future<List<ServiceItem>> _future;
  bool _handledInitialService = false;

  @override
  void initState() {
    super.initState();
    _future = _catalogService.listServices();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_handledInitialService) return;
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is ServiceItem) {
      _handledInitialService = true;
      Future.microtask(() async {
        try {
          final services = await _future;
          if (!mounted) return;
          await _openBookServiceFlow(initialService: args, services: services);
        } catch (_) {}
      });
    }
  }

  Future<void> _openBookServiceFlow({
    required ServiceItem initialService,
    required List<ServiceItem> services,
  }) async {
    final messenger = ScaffoldMessenger.of(context);
    final notesController = TextEditingController();

    try {
      final auth = context.read<AuthProvider>();
      if (!auth.isAuthenticated) {
        await auth.loadMe();
      }
      if (!mounted) return;
      if (!auth.isAuthenticated) {
        messenger.showSnackBar(
          const SnackBar(content: Text('Please login to book a service')),
        );
        await Navigator.pushNamed(context, '/login');
        return;
      }

      List<Vehicle> vehicles = const [];
      try {
        vehicles = await _vehicleService.listMyVehicles();
      } catch (e) {
        messenger.showSnackBar(SnackBar(content: Text(e.toString())));
        return;
      }

      if (!mounted) return;

      final result = await showModalBottomSheet<_BookFlowResult>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (sheetContext) {
          var step = 0;
          var saving = false;
          var selectedVehicleId = vehicles.isNotEmpty
              ? vehicles.first.id
              : null;
          var selectedDateTime = DateTime.now().add(const Duration(days: 1));
          var pickupRequired = false;
          final selectedServiceIds = <String>{initialService.id};

          num totalForSelected() {
            num sum = 0;
            for (final s in services) {
              if (selectedServiceIds.contains(s.id)) {
                sum += s.price;
              }
            }
            return sum;
          }

          Future<void> goNext(StateSetter setModalState) async {
            if (step == 0) {
              if (vehicles.isEmpty) {
                return;
              }
              if (selectedVehicleId == null) {
                messenger.showSnackBar(
                  const SnackBar(content: Text('Select a vehicle')),
                );
                return;
              }
            }
            if (step == 1 && selectedServiceIds.isEmpty) {
              messenger.showSnackBar(
                const SnackBar(content: Text('Select at least one service')),
              );
              return;
            }
            setModalState(() => step = (step + 1).clamp(0, 3));
          }

          Future<void> goBack(StateSetter setModalState) async {
            setModalState(() => step = (step - 1).clamp(0, 3));
          }

          String vehicleLabel(String id) {
            final v = vehicles.firstWhere((e) => e.id == id);
            return '${v.make} ${v.model} • ${v.licensePlate}';
          }

          String formatDateTime(DateTime v) {
            final date = MaterialLocalizations.of(
              sheetContext,
            ).formatMediumDate(v);
            final time = MaterialLocalizations.of(sheetContext).formatTimeOfDay(
              TimeOfDay.fromDateTime(v),
              alwaysUse24HourFormat: false,
            );
            return '$date • $time';
          }

          return StatefulBuilder(
            builder: (sheetContext, setModalState) {
              Widget stepBody() {
                if (step == 0) {
                  if (vehicles.isEmpty) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'No vehicles found.',
                          style: Theme.of(sheetContext).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Add a vehicle first to book a service.',
                          style: TextStyle(color: Colors.black54),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () => Navigator.pop(
                            sheetContext,
                            const _BookFlowResult(openAddVehicle: true),
                          ),
                          child: const Text('Add Vehicle'),
                        ),
                      ],
                    );
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Select Vehicle',
                        style: Theme.of(sheetContext).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      ...vehicles.map((v) {
                        final selected = selectedVehicleId == v.id;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: selected
                                ? const Color(0xFFF5F3FF)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: selected
                                  ? const Color(0xFF4F46E5)
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: InkWell(
                            onTap: () =>
                                setModalState(() => selectedVehicleId = v.id),
                            borderRadius: BorderRadius.circular(16),
                            child: ListTile(
                              leading: Icon(
                                selected
                                    ? Icons.radio_button_checked
                                    : Icons.radio_button_off,
                                color: selected
                                    ? const Color(0xFF4F46E5)
                                    : Colors.black38,
                              ),
                              title: Text('${v.make} ${v.model}'),
                              subtitle: Text('${v.licensePlate} • ${v.year}'),
                            ),
                          ),
                        );
                      }),
                    ],
                  );
                }

                if (step == 1) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Select Services',
                        style: Theme.of(sheetContext).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 10),
                      ...services.map((s) {
                        final checked = selectedServiceIds.contains(s.id);
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                          ),
                          child: CheckboxListTile(
                            value: checked,
                            onChanged: (v) {
                              setModalState(() {
                                if (v == true) {
                                  selectedServiceIds.add(s.id);
                                } else {
                                  selectedServiceIds.remove(s.id);
                                }
                              });
                            },
                            title: Text(s.name),
                            subtitle: Text('₹${s.price}'),
                            controlAffinity: ListTileControlAffinity.leading,
                          ),
                        );
                      }),
                      const SizedBox(height: 8),
                      Text(
                        'Total: ₹${totalForSelected()}',
                        textAlign: TextAlign.right,
                        style: Theme.of(sheetContext).textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  );
                }

                if (step == 2) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Schedule',
                        style: Theme.of(sheetContext).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () async {
                          final now = DateTime.now();
                          final date = await showDatePicker(
                            context: sheetContext,
                            firstDate: DateTime(now.year, now.month, now.day),
                            lastDate: now.add(const Duration(days: 180)),
                            initialDate: selectedDateTime,
                          );
                          if (date == null) return;
                          if (!sheetContext.mounted) return;
                          final time = await showTimePicker(
                            context: sheetContext,
                            initialTime: TimeOfDay.fromDateTime(
                              selectedDateTime,
                            ),
                          );
                          if (time == null) return;
                          setModalState(() {
                            selectedDateTime = DateTime(
                              date.year,
                              date.month,
                              date.day,
                              time.hour,
                              time.minute,
                            );
                          });
                        },
                        icon: const Icon(Icons.calendar_month_outlined),
                        label: Text(formatDateTime(selectedDateTime)),
                      ),
                      const SizedBox(height: 12),
                      SwitchListTile(
                        value: pickupRequired,
                        onChanged: (v) => setModalState(() {
                          pickupRequired = v;
                        }),
                        title: const Text('Pickup required'),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: notesController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Notes (optional)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  );
                }

                final vId = selectedVehicleId;
                final vehicleText = vId == null ? '-' : vehicleLabel(vId);
                final selectedServices = services
                    .where((s) => selectedServiceIds.contains(s.id))
                    .toList();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Confirm',
                      style: Theme.of(sheetContext).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 14),
                    _SummaryRow(label: 'Vehicle', value: vehicleText),
                    const SizedBox(height: 8),
                    _SummaryRow(
                      label: 'Schedule',
                      value: formatDateTime(selectedDateTime),
                    ),
                    const SizedBox(height: 8),
                    _SummaryRow(
                      label: 'Pickup',
                      value: pickupRequired ? 'Yes' : 'No',
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Services',
                      style: Theme.of(sheetContext).textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    ...selectedServices.map((s) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                s.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text('₹${s.price}'),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 10),
                    _SummaryRow(
                      label: 'Total',
                      value: '₹${totalForSelected()}',
                      isEmphasis: true,
                    ),
                  ],
                );
              }

              Future<void> submit() async {
                if (saving) return;
                final vehicleId = selectedVehicleId;
                if (vehicleId == null || vehicleId.isEmpty) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Select a vehicle')),
                  );
                  return;
                }
                if (selectedServiceIds.isEmpty) {
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('Select at least one service'),
                    ),
                  );
                  return;
                }
                setModalState(() => saving = true);
                try {
                  final booking = await _bookingService.createBooking(
                    vehicleId: vehicleId,
                    serviceIds: selectedServiceIds.toList(),
                    date: selectedDateTime,
                    notes: notesController.text,
                    pickupRequired: pickupRequired,
                  );
                  if (!sheetContext.mounted) return;
                  Navigator.pop(
                    sheetContext,
                    _BookFlowResult(bookingId: booking.id),
                  );
                } catch (e) {
                  messenger.showSnackBar(SnackBar(content: Text(e.toString())));
                } finally {
                  setModalState(() => saving = false);
                }
              }

              return DraggableScrollableSheet(
                expand: false,
                initialChildSize: 0.76,
                minChildSize: 0.50,
                maxChildSize: 0.92,
                builder: (context, scrollController) {
                  final bottom = MediaQuery.of(context).padding.bottom;
                  return Container(
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(28),
                      ),
                    ),
                    child: ListView(
                      controller: scrollController,
                      padding: EdgeInsets.fromLTRB(16, 10, 16, 16 + bottom),
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
                                'Book Service',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                            ),
                            Text(
                              '${step + 1}/4',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: Colors.black54),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        stepBody(),
                        const SizedBox(height: 18),
                        Row(
                          children: [
                            if (step > 0)
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: saving
                                      ? null
                                      : () => goBack(setModalState),
                                  child: const Text('Back'),
                                ),
                              ),
                            if (step > 0) const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton(
                                onPressed: saving
                                    ? null
                                    : step == 3
                                    ? submit
                                    : () => goNext(setModalState),
                                child: saving
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : Text(step == 3 ? 'Confirm' : 'Next'),
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

      if (result == null) return;
      if (result.openAddVehicle) {
        if (!mounted) return;
        Navigator.pop(context, 'openAddVehicle');
        return;
      }
      final bookingId = result.bookingId;
      if (bookingId != null && bookingId.isNotEmpty) {
        if (!mounted) return;
        await Navigator.pushNamed(context, '/track', arguments: bookingId);
      }
    } finally {
      notesController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Services')),
      body: FutureBuilder<List<ServiceItem>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error'));
          }
          final items = snapshot.data ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('No services'));
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (context, _) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final s = items[i];
              return ListTile(
                title: Text(s.name),
                subtitle: Text('₹${s.price}'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () =>
                    _openBookServiceFlow(initialService: s, services: items),
              );
            },
          );
        },
      ),
    );
  }
}

class _BookFlowResult {
  final bool openAddVehicle;
  final String? bookingId;

  const _BookFlowResult({this.openAddVehicle = false, this.bookingId});
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isEmphasis;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isEmphasis = false,
  });

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyMedium;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(label, style: style?.copyWith(color: Colors.black54)),
        ),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: isEmphasis
                ? style?.copyWith(fontWeight: FontWeight.w700)
                : style,
          ),
        ),
      ],
    );
  }
}
