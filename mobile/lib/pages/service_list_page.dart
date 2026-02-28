import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../core/env.dart';
import '../state/navigation_provider.dart';
import '../models/booking.dart';
import '../services/catalog_service.dart';
import '../services/booking_service.dart';
import '../services/vehicle_service.dart';
import '../services/review_service.dart';
import '../models/service.dart';
import '../models/vehicle.dart';
import '../state/auth_provider.dart';
import '../widgets/customer_drawer.dart';

String? _resolveImageUrl(String? raw) {
  if (raw == null) return null;
  final s = raw.trim();
  if (s.isEmpty) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return '${Env.baseUrl}$s';
  return '${Env.baseUrl}/$s';
}

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
  String? _title;
  String? _filterKey;

  Color get _backgroundStart => const Color(0xFF020617);
  Color get _backgroundEnd => const Color(0xFF020617);
  Color get _accentPurple => const Color(0xFF3B82F6);
  Color get _accentBlue => const Color(0xFF22D3EE);

  @override
  void initState() {
    super.initState();
    _future = _catalogService.listServices();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final nav = context.watch<NavigationProvider>();
    final args = nav.arguments;

    if (args is ServiceItem) {
      Future.microtask(() async {
        try {
          final services = await _future;
          if (!mounted) return;
          await _openBookServiceFlow(initialService: args, services: services);
          nav.clearArguments();
        } catch (_) {}
      });
    } else if (args is Map) {
      final nextTitle = args['title']?.toString();
      final nextFilter = args['filter']?.toString();
      if (nextTitle != null && nextTitle.isNotEmpty) {
        setState(() => _title = nextTitle);
      }
      if (nextFilter != null && nextFilter.isNotEmpty) {
        setState(() => _filterKey = nextFilter);
      }
      final openBookHint = args['openBookHint'] == true;
      if (openBookHint) {
        Future.microtask(() {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Select a service to book')),
          );
          nav.clearArguments();
        });
      }
    }
  }

  List<ServiceItem> _applyFilter(List<ServiceItem> services) {
    final key = _filterKey;
    if (key == null || key.isEmpty) return services;
    final needle = key.toLowerCase();
    bool matches(ServiceItem s) {
      final name = s.name.toLowerCase();
      if (needle == 'car_wash') {
        return name.contains('wash') ||
            name.contains('polish') ||
            name.contains('detail');
      }
      if (needle == 'tires_battery') {
        return name.contains('tire') ||
            name.contains('tyre') ||
            name.contains('battery');
      }
      return name.contains(needle);
    }

    return services.where(matches).toList();
  }

  Future<void> _openBookServiceFlow({
    required ServiceItem initialService,
    required List<ServiceItem> services,
  }) async {
    final messenger = ScaffoldMessenger.of(context);
    final notesController = TextEditingController();
    final reviewService = ReviewService();

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

      // Check for pending feedback
      try {
        final pending = await reviewService.checkPendingFeedback();
        if (pending['hasPending'] == true) {
          final bookingId = pending['bookingId']?.toString();
          if (bookingId != null && mounted) {
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) => AlertDialog(
                title: const Text('Feedback Required'),
                content: Text(
                  'Please provide feedback for your previous booking (#${pending['orderNumber']}) before booking a new service.',
                ),
                actions: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(
                        context,
                        '/track-booking',
                        arguments: bookingId,
                      );
                    },
                    child: const Text('Go to Booking'),
                  ),
                ],
              ),
            );
            return;
          }
        }
      } catch (_) {}

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
          // Use the widget's context to determine theme consistency
          final isDark = Theme.of(context).brightness == Brightness.dark;
          final textColor = isDark ? Colors.white : Colors.black87;
          final subTextColor = isDark ? Colors.white70 : Colors.black54;

          var step = 0;
          var saving = false;
          var selectedVehicleId = vehicles.isNotEmpty
              ? vehicles.first.id
              : null;
          var selectedDateTime = DateTime.now().add(const Duration(days: 1));
          var pickupRequired = false;
          final user = context.read<AuthProvider>().user;
          final addresses = user?.addresses ?? [];
          final defaultAddress = addresses.isEmpty
              ? null
              : addresses.firstWhere(
                  (a) => a.isDefault,
                  orElse: () => addresses.first,
                );

          LatLng? selectedLatLng = defaultAddress != null
              ? LatLng(defaultAddress.lat, defaultAddress.lng)
              : null;
          String? selectedAddress = defaultAddress?.address;
          var locating = false;
          var showMap = addresses.isEmpty;
          var resolvingAddress = false;
          final mapController = MapController();
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
              Future<String?> reverseGeocode(LatLng v) async {
                try {
                  final uri =
                      Uri.https('nominatim.openstreetmap.org', '/reverse', {
                        'format': 'jsonv2',
                        'lat': v.latitude.toString(),
                        'lon': v.longitude.toString(),
                      });
                  final res = await http.get(
                    uri,
                    headers: const {'User-Agent': 'DriveFlowMobile/1.0'},
                  );
                  if (res.statusCode != 200) return null;
                  final decoded = jsonDecode(res.body);
                  if (decoded is Map<String, dynamic>) {
                    final name = decoded['display_name'];
                    if (name is String && name.trim().isNotEmpty) return name;
                  } else if (decoded is Map) {
                    final name = decoded['display_name'];
                    if (name is String && name.trim().isNotEmpty) return name;
                  }
                } catch (_) {}
                return null;
              }

              Future<void> setSelectedLocation(LatLng next) async {
                setModalState(() {
                  selectedLatLng = next;
                  selectedAddress = null;
                  resolvingAddress = true;
                });
                try {
                  final zoom = mapController.camera.zoom;
                  mapController.move(next, zoom);
                } catch (_) {}
                final addr = await reverseGeocode(next);
                if (!sheetContext.mounted) return;
                setModalState(() {
                  selectedAddress = addr;
                  resolvingAddress = false;
                });
              }

              Future<void> useCurrentLocation() async {
                if (locating) return;
                setModalState(() => locating = true);
                try {
                  final enabled = await Geolocator.isLocationServiceEnabled();
                  if (!enabled) {
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Enable location services to continue'),
                      ),
                    );
                    return;
                  }
                  var permission = await Geolocator.checkPermission();
                  if (permission == LocationPermission.denied) {
                    permission = await Geolocator.requestPermission();
                  }
                  if (permission == LocationPermission.denied ||
                      permission == LocationPermission.deniedForever) {
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Location permission is required'),
                      ),
                    );
                    return;
                  }
                  final pos = await Geolocator.getCurrentPosition(
                    desiredAccuracy: LocationAccuracy.best,
                    timeLimit: const Duration(seconds: 15),
                  );
                  await setSelectedLocation(
                    LatLng(pos.latitude, pos.longitude),
                  );
                  mapController.move(LatLng(pos.latitude, pos.longitude), 18);
                } catch (e) {
                  messenger.showSnackBar(SnackBar(content: Text(e.toString())));
                } finally {
                  if (sheetContext.mounted) {
                    setModalState(() => locating = false);
                  }
                }
              }

              Widget stepBody() {
                if (step == 0) {
                  if (vehicles.isEmpty) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'No vehicles found.',
                          style: Theme.of(sheetContext).textTheme.titleMedium
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: textColor,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Add a vehicle first to book a service.',
                          style: TextStyle(color: subTextColor),
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
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: textColor,
                            ),
                      ),
                      const SizedBox(height: 12),
                      ...vehicles.map((v) {
                        final selected = selectedVehicleId == v.id;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: selected
                                ? (isDark
                                      ? const Color(0xFF312E81)
                                      : const Color(0xFFF5F3FF))
                                : (isDark
                                      ? Colors.white.withValues(alpha: 0.05)
                                      : Colors.white),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: selected
                                  ? const Color(0xFF4F46E5)
                                  : (isDark
                                        ? Colors.white.withValues(alpha: 0.1)
                                        : const Color(0xFFE5E7EB)),
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
                                    : (isDark
                                          ? Colors.white54
                                          : Colors.black38),
                              ),
                              title: Text(
                                '${v.make} ${v.model}',
                                style: TextStyle(color: textColor),
                              ),
                              subtitle: Text(
                                '${v.licensePlate} • ${v.year}',
                                style: TextStyle(color: subTextColor),
                              ),
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
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: textColor,
                            ),
                      ),
                      const SizedBox(height: 10),
                      ...services.map((s) {
                        final checked = selectedServiceIds.contains(s.id);
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.05)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: CheckboxListTile(
                            value: checked,
                            activeColor: const Color(0xFF4F46E5),
                            checkColor: Colors.white,
                            onChanged: (v) {
                              setModalState(() {
                                if (v == true) {
                                  selectedServiceIds.add(s.id);
                                } else {
                                  selectedServiceIds.remove(s.id);
                                }
                              });
                            },
                            title: Text(
                              s.name,
                              style: TextStyle(color: textColor),
                            ),
                            subtitle: Text(
                              '₹${s.price}',
                              style: TextStyle(color: subTextColor),
                            ),
                            secondary:
                                (s.image != null &&
                                    _resolveImageUrl(s.image) != null)
                                ? Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: isDark
                                            ? Colors.white.withValues(
                                                alpha: 0.1,
                                              )
                                            : const Color(0xFFE5E7EB),
                                      ),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(7),
                                      child: Image.network(
                                        _resolveImageUrl(s.image)!,
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, _, _) =>
                                            const Icon(
                                              Icons.broken_image,
                                              size: 20,
                                            ),
                                      ),
                                    ),
                                  )
                                : null,
                            controlAffinity: ListTileControlAffinity.leading,
                          ),
                        );
                      }),
                      const SizedBox(height: 8),
                      Text(
                        'Total: ₹${totalForSelected()}',
                        textAlign: TextAlign.right,
                        style: Theme.of(sheetContext).textTheme.titleSmall
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: textColor,
                            ),
                      ),
                    ],
                  );
                }

                if (step == 2) {
                  final current =
                      selectedLatLng ?? const LatLng(12.9716, 77.5946);
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Schedule',
                        style: Theme.of(sheetContext).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: textColor,
                            ),
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
                        style: OutlinedButton.styleFrom(
                          foregroundColor: textColor,
                          side: isDark
                              ? BorderSide(
                                  color: Colors.white.withValues(alpha: 0.2),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SwitchListTile(
                        value: pickupRequired,
                        onChanged: (v) => setModalState(() {
                          pickupRequired = v;
                        }),
                        title: Text(
                          'Pickup required',
                          style: TextStyle(color: textColor),
                        ),
                      ),
                      const SizedBox(height: 6),
                      if (pickupRequired) ...[
                        if (user?.addresses.isNotEmpty ?? false) ...[
                          Text(
                            'Select from Saved Addresses',
                            style: Theme.of(sheetContext).textTheme.titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: textColor,
                                ),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            height: 40,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: user!.addresses.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(width: 8),
                              itemBuilder: (context, index) {
                                final addr = user.addresses[index];
                                final isSelected =
                                    selectedAddress == addr.address && !showMap;
                                return FilterChip(
                                  label: Text(addr.label),
                                  selected: isSelected,
                                  onSelected: (v) {
                                    if (v) {
                                      setSelectedLocation(
                                        LatLng(addr.lat, addr.lng),
                                      );
                                      setModalState(() {
                                        selectedAddress = addr.address;
                                        showMap = false;
                                      });
                                    }
                                  },
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 8),
                          ActionChip(
                            label: const Text('Other / Custom Location'),
                            onPressed: () {
                              setModalState(() {
                                showMap = true;
                                selectedAddress = null;
                              });
                            },
                            avatar: const Icon(
                              Icons.add_location_alt,
                              size: 16,
                            ),
                            backgroundColor: showMap
                                ? Theme.of(context).primaryColor
                                : null,
                            labelStyle: TextStyle(
                              color: showMap ? Colors.white : null,
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        if (showMap) ...[
                          Text(
                            'Pickup location',
                            style: Theme.of(sheetContext).textTheme.titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: textColor,
                                ),
                          ),
                          const SizedBox(height: 10),
                          Container(
                            height: 220,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isDark
                                    ? Colors.white.withValues(alpha: 0.1)
                                    : const Color(0xFFE5E7EB),
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: FlutterMap(
                                mapController: mapController,
                                options: MapOptions(
                                  initialCenter: current,
                                  initialZoom: 14,
                                  onTap: (_, latLng) =>
                                      setSelectedLocation(latLng),
                                ),
                                children: [
                                  TileLayer(
                                    urlTemplate:
                                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                    userAgentPackageName: 'com.carb.app',
                                  ),
                                  MarkerLayer(
                                    markers: [
                                      if (selectedLatLng != null)
                                        Marker(
                                          point: selectedLatLng!,
                                          width: 40,
                                          height: 40,
                                          child: const Icon(
                                            Icons.location_on,
                                            size: 40,
                                            color: Color(0xFFEF4444),
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: locating
                                      ? null
                                      : useCurrentLocation,
                                  icon: const Icon(Icons.my_location),
                                  label: Text(
                                    locating
                                        ? 'Locating...'
                                        : 'Use my location',
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: isDark
                                        ? Colors.white
                                        : null,
                                    side: isDark
                                        ? BorderSide(
                                            color: Colors.white.withValues(
                                              alpha: 0.2,
                                            ),
                                          )
                                        : null,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: selectedLatLng == null
                                      ? null
                                      : () => setModalState(() {
                                          selectedLatLng = null;
                                          selectedAddress = null;
                                          resolvingAddress = false;
                                        }),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: isDark
                                        ? Colors.white
                                        : null,
                                    side: isDark
                                        ? BorderSide(
                                            color: Colors.white.withValues(
                                              alpha: 0.2,
                                            ),
                                          )
                                        : null,
                                  ),
                                  child: const Text('Clear'),
                                ),
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.05)
                                : const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: Text(
                            selectedLatLng == null
                                ? 'Tap on the map to select an exact pickup point.'
                                : (resolvingAddress
                                      ? 'Resolving address...'
                                      : (selectedAddress ??
                                            '${selectedLatLng!.latitude.toStringAsFixed(6)}, ${selectedLatLng!.longitude.toStringAsFixed(6)}')),
                            style: Theme.of(sheetContext).textTheme.bodySmall
                                ?.copyWith(
                                  color: isDark
                                      ? Colors.white70
                                      : Colors.black87,
                                ),
                          ),
                        ),
                      ] else ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.05)
                                : const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: Text(
                            'Pickup not required. You will drop your vehicle at the workshop.',
                            style: Theme.of(sheetContext).textTheme.bodySmall
                                ?.copyWith(
                                  color: isDark
                                      ? Colors.white70
                                      : Colors.black87,
                                ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      TextField(
                        controller: notesController,
                        maxLines: 3,
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Notes (optional)',
                          labelStyle: TextStyle(
                            color: isDark ? Colors.white70 : Colors.black54,
                          ),
                          border: const OutlineInputBorder(),
                          enabledBorder: isDark
                              ? OutlineInputBorder(
                                  borderSide: BorderSide(
                                    color: Colors.white.withValues(alpha: 0.2),
                                  ),
                                )
                              : const OutlineInputBorder(),
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
                          ?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: textColor,
                          ),
                    ),
                    const SizedBox(height: 14),
                    _SummaryRow(
                      label: 'Vehicle',
                      value: vehicleText,
                      labelColor: subTextColor,
                      valueColor: textColor,
                    ),
                    const SizedBox(height: 8),
                    _SummaryRow(
                      label: 'Schedule',
                      value: formatDateTime(selectedDateTime),
                      labelColor: subTextColor,
                      valueColor: textColor,
                    ),
                    const SizedBox(height: 8),
                    _SummaryRow(
                      label: 'Pickup',
                      value: pickupRequired ? 'Yes' : 'No',
                      labelColor: subTextColor,
                      valueColor: textColor,
                    ),
                    const SizedBox(height: 8),
                    _SummaryRow(
                      label: 'Location',
                      value: pickupRequired
                          ? (selectedLatLng == null
                                ? '-'
                                : (selectedAddress ??
                                      '${selectedLatLng!.latitude.toStringAsFixed(6)}, ${selectedLatLng!.longitude.toStringAsFixed(6)}'))
                          : '-',
                      labelColor: subTextColor,
                      valueColor: textColor,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Services',
                      style: Theme.of(sheetContext).textTheme.titleSmall
                          ?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: textColor,
                          ),
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
                                style: TextStyle(color: textColor),
                              ),
                            ),
                            Text(
                              '₹${s.price}',
                              style: TextStyle(color: textColor),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 10),
                    _SummaryRow(
                      label: 'Total',
                      value: '₹${totalForSelected()}',
                      isEmphasis: true,
                      labelColor: subTextColor,
                      valueColor: textColor,
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
                final pick = selectedLatLng;
                if (pickupRequired && pick == null) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Select pickup location')),
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
                    location: pickupRequired && pick != null
                        ? BookingLocation(
                            address: selectedAddress,
                            lat: pick.latitude,
                            lng: pick.longitude,
                          )
                        : null,
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
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: const BorderRadius.vertical(
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
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.2)
                                  : const Color(0xFFE5E7EB),
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            if (step == 1)
                              Container(
                                width: 32,
                                height: 32,
                                margin: const EdgeInsets.only(right: 10),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isDark
                                      ? const Color(0xFF0C4A6E)
                                      : const Color(0xFFE0F2FE),
                                ),
                                child: Icon(
                                  Icons.build_rounded,
                                  color: isDark
                                      ? Colors.white
                                      : const Color(0xFF0F172A),
                                  size: 18,
                                ),
                              ),
                            Expanded(
                              child: Text(
                                'Book Service',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: textColor,
                                    ),
                              ),
                            ),
                            Text(
                              '${step + 1}/4',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: subTextColor),
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
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: textColor,
                                    side: isDark
                                        ? BorderSide(
                                            color: Colors.white.withValues(
                                              alpha: 0.2,
                                            ),
                                          )
                                        : null,
                                  ),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      drawer: const CustomerDrawer(currentRouteName: '/services'),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: LinearGradient(colors: [_accentPurple, _accentBlue]),
                boxShadow: [
                  BoxShadow(
                    color: _accentBlue.withValues(alpha: 0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Builder(
                builder: (context) => IconButton(
                  icon: const Icon(Icons.menu),
                  color: Colors.white,
                  tooltip: 'Menu',
                  onPressed: () => Scaffold.of(context).openDrawer(),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              _title ?? 'Services',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: isDark ? Colors.white : const Color(0xFF0F172A),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          if (isDark)
            Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(0, -1.2),
                  radius: 1.4,
                  colors: [
                    _accentPurple.withValues(alpha: 0.14),
                    _accentBlue.withValues(alpha: 0.06),
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
                  colors: [Colors.black.withValues(alpha: 0.9), _backgroundEnd],
                ),
              ),
            ),
          FutureBuilder<List<ServiceItem>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return const Center(child: Text('Error'));
              }
              final items = _applyFilter(snapshot.data ?? []);
              if (items.isEmpty) {
                return const Center(child: Text('No services'));
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                separatorBuilder: (context, _) => const SizedBox(height: 12),
                itemBuilder: (context, i) {
                  final s = items[i];
                  return _ServiceCard(
                    title: s.name,
                    price: s.price,
                    image: s.image,
                    duration: s.estimatedMinutes,
                    onTap: () => _openBookServiceFlow(
                      initialService: s,
                      services: items,
                    ),
                  );
                },
              );
            },
          ),
        ],
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
  final Color? labelColor;
  final Color? valueColor;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isEmphasis = false,
    this.labelColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyMedium;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final lColor = labelColor ?? (isDark ? Colors.white70 : Colors.black54);
    final vColor = valueColor ?? (isDark ? Colors.white : Colors.black87);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(label, style: style?.copyWith(color: lColor)),
        ),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: isEmphasis
                ? style?.copyWith(fontWeight: FontWeight.w700, color: vColor)
                : style?.copyWith(color: vColor),
          ),
        ),
      ],
    );
  }
}

class _ServiceCard extends StatefulWidget {
  final String title;
  final num price;
  final String? image;
  final num? duration;
  final VoidCallback onTap;

  const _ServiceCard({
    required this.title,
    required this.price,
    this.image,
    this.duration,
    required this.onTap,
  });

  @override
  State<_ServiceCard> createState() => _ServiceCardState();
}

class _ServiceCardState extends State<_ServiceCard> {
  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final imageUrl = _resolveImageUrl(widget.image);

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : const Color(0xFFE5E7EB),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 18,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: Align(
                alignment: Alignment.centerRight,
                child: FractionallySizedBox(
                  widthFactor: 0.22,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(18),
                      bottomRight: Radius.circular(18),
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFF22D3EE).withValues(alpha: 0.12),
                            const Color(0xFF2563EB).withValues(alpha: 0.22),
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
                if (imageUrl != null)
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, _, _) {
                          return Container(
                            color: isDark ? Colors.grey[800] : Colors.grey[200],
                            child: const Icon(
                              Icons.image_not_supported,
                              size: 20,
                            ),
                          );
                        },
                      ),
                    ),
                  )
                else
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: RadialGradient(
                        center: const Alignment(0, -0.2),
                        colors: [
                          const Color(0xFF22D3EE).withValues(alpha: 0.9),
                          const Color(0xFF2563EB).withValues(alpha: 0.3),
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(
                            0xFF22D3EE,
                          ).withValues(alpha: 0.12),
                          blurRadius: 18,
                          spreadRadius: 1.2,
                        ),
                      ],
                    ),
                    child: Icon(
                      _iconForTitle(widget.title),
                      color: Colors.white,
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            '₹${widget.price}',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: isDark
                                      ? Colors.white70
                                      : Colors.black54,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          if (widget.duration != null) ...[
                            const SizedBox(width: 8),
                            Container(
                              width: 4,
                              height: 4,
                              decoration: BoxDecoration(
                                color: isDark ? Colors.white30 : Colors.black26,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${widget.duration} mins',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: isDark
                                        ? Colors.white70
                                        : Colors.black54,
                                  ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  color: isDark ? Colors.white60 : Colors.black38,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
