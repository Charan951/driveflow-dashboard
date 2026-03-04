import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/service.dart';
import '../models/vehicle.dart';
import '../models/booking.dart';
import '../services/catalog_service.dart';
import '../services/vehicle_service.dart';
import '../services/booking_service.dart';
import '../services/review_service.dart';
import '../state/auth_provider.dart';
import '../state/navigation_provider.dart';

class BookServiceFlowPage extends StatefulWidget {
  final String? initialCategory;

  const BookServiceFlowPage({super.key, this.initialCategory});

  @override
  State<BookServiceFlowPage> createState() => _BookServiceFlowPageState();
}

class _BookServiceFlowPageState extends State<BookServiceFlowPage> {
  int _currentStep = 0;
  bool _loading = false;
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();
  final _reviewService = ReviewService();

  List<Vehicle> _vehicles = [];
  List<ServiceItem> _allServices = [];

  String? _selectedVehicleId;
  List<String> _selectedServiceIds = [];
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();
  String? _selectedAddress;
  LatLng? _selectedLatLng;
  bool _showCustomLocation = false;
  final _notesController = TextEditingController();
  bool _locating = false;
  bool _resolvingAddress = false;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _fetchInitialData();

    // Check for arguments from NavigationProvider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final nav = context.read<NavigationProvider>();
      if (nav.arguments != null && nav.arguments is ServiceItem) {
        final service = nav.arguments as ServiceItem;
        setState(() {
          _selectedServiceIds = [service.id];
          _currentStep =
              2; // Skip to Schedule step (Step 2) if service is pre-selected
        });
      }
    });
  }

  @override
  void didUpdateWidget(BookServiceFlowPage oldWidget) {
    super.didUpdateWidget(oldWidget);
  }

  Future<void> _fetchInitialData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _vehicleService.listMyVehicles(),
        _catalogService.listServices(),
        _reviewService.checkPendingFeedback(),
      ]);

      final vehicles = results[0] as List<Vehicle>;
      final services = results[1] as List<ServiceItem>;
      final pendingFeedback = results[2] as Map<String, dynamic>;

      if (pendingFeedback['hasPending'] == true && mounted) {
        _showFeedbackRequiredDialog(pendingFeedback);
      }

      setState(() {
        _vehicles = vehicles;
        _allServices = services;
        if (vehicles.isNotEmpty) {
          _selectedVehicleId = vehicles.first.id;
        }

        // Pre-populate location from default saved address
        final user = context.read<AuthProvider>().user;
        if (user != null && user.addresses.isNotEmpty) {
          final defaultAddr = user.addresses.firstWhere(
            (a) => a.isDefault,
            orElse: () => user.addresses.first,
          );
          _selectedAddress = defaultAddr.address;
          _selectedLatLng = LatLng(defaultAddr.lat, defaultAddr.lng);
        }

        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
      });
    }
  }

  void _showFeedbackRequiredDialog(Map<String, dynamic> pendingFeedback) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Feedback Required'),
        content: Text(
          'Please provide feedback for your previous booking (#${pendingFeedback['orderNumber']}) before booking a new service.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(
                context,
                '/track',
                arguments: pendingFeedback['bookingId'],
              );
            },
            child: const Text('Give Feedback'),
          ),
        ],
      ),
    );
  }

  final List<String> _steps = ['Vehicle', 'Service', 'Schedule', 'Confirm'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Book a Service')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stepper(
              currentStep: _currentStep,
              onStepContinue: _handleNext,
              onStepCancel: _handleBack,
              controlsBuilder: (context, details) {
                return Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Row(
                    children: [
                      ElevatedButton(
                        onPressed: details.onStepContinue,
                        child: Text(
                          _currentStep == _steps.length - 1
                              ? 'Confirm'
                              : 'Next',
                        ),
                      ),
                      if (_currentStep > 0)
                        TextButton(
                          onPressed: details.onStepCancel,
                          child: const Text('Back'),
                        ),
                    ],
                  ),
                );
              },
              steps: _steps
                  .asMap()
                  .map(
                    (i, title) => MapEntry(
                      i,
                      Step(
                        title: Text(title),
                        content: _buildStepContent(),
                        isActive: _currentStep >= i,
                        state: _currentStep > i
                            ? StepState.complete
                            : StepState.indexed,
                      ),
                    ),
                  )
                  .values
                  .toList(),
            ),
    );
  }

  void _handleNext() {
    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);
    } else {
      _submitBooking();
    }
  }

  void _handleBack() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    }
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildVehicleStep();
      case 1:
        return _buildServiceStep();
      case 2:
        return _buildScheduleStep();
      case 3:
        return _buildConfirmStep();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildVehicleStep() {
    if (_vehicles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.car_repair, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'No vehicles found',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text('Please add a vehicle to your profile first.'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(
                context,
                '/add-vehicle',
              ).then((_) => _fetchInitialData()),
              child: const Text('Add Vehicle'),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Select your vehicle',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        ..._vehicles.map(
          (v) => Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: _selectedVehicleId == v.id
                    ? Colors.blue
                    : Colors.transparent,
                width: 2,
              ),
            ),
            child: ListTile(
              onTap: () => setState(() => _selectedVehicleId = v.id),
              leading: const CircleAvatar(child: Icon(Icons.directions_car)),
              title: Text('${v.make} ${v.model}'),
              subtitle: Text(v.licensePlate),
              trailing: _selectedVehicleId == v.id
                  ? const Icon(Icons.check_circle, color: Colors.blue)
                  : null,
            ),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () => Navigator.pushNamed(
            context,
            '/add-vehicle',
          ).then((_) => _fetchInitialData()),
          icon: const Icon(Icons.add),
          label: const Text('Add Another Vehicle'),
        ),
      ],
    );
  }

  Widget _buildServiceStep() {
    final categories = [
      'Services',
      'Periodic',
      'Wash',
      'Car Wash',
      'Tyre & Battery',
      'Tyres',
      'Battery',
      'Insurance',
      'Painting',
      'Denting',
      'Repair',
      'Detailing',
      'AC',
      'Accessories',
      'Other',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Select Services',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        ...categories.map((category) {
          final services = _allServices
              .where((s) => s.category == category)
              .toList();

          if (services.isEmpty) return const SizedBox.shrink();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  category,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
              ),
              ...services.map((service) {
                final selected = _selectedServiceIds.contains(service.id);
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: selected ? Colors.blue : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: ListTile(
                    onTap: () {
                      setState(() {
                        if (selected) {
                          _selectedServiceIds.remove(service.id);
                        } else {
                          _selectedServiceIds.add(service.id);
                        }
                      });
                    },
                    leading: CircleAvatar(
                      backgroundImage: NetworkImage(service.image ?? ''),
                    ),
                    title: Text(
                      service.name,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      '₹${service.price} • ${service.estimatedMinutes} mins',
                    ),
                    trailing: selected
                        ? const Icon(Icons.check_circle, color: Colors.blue)
                        : const Icon(Icons.add_circle_outline),
                  ),
                );
              }),
            ],
          );
        }),
      ],
    );
  }

  Widget _buildScheduleStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Schedule & Location',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        const Text(
          'Select Date & Time',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 90)),
                  );
                  if (date != null) setState(() => _selectedDate = date);
                },
                icon: const Icon(Icons.calendar_today),
                label: Text(DateFormat('EEE, MMM d').format(_selectedDate)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  final time = await showTimePicker(
                    context: context,
                    initialTime: _selectedTime,
                  );
                  if (time != null) setState(() => _selectedTime = time);
                },
                icon: const Icon(Icons.access_time),
                label: Text(_selectedTime.format(context)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'Pickup Location',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        // Saved Addresses
        if (context.read<AuthProvider>().user?.addresses.isNotEmpty ??
            false) ...[
          SizedBox(
            height: 50,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: context.read<AuthProvider>().user!.addresses.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final addr = context
                    .read<AuthProvider>()
                    .user!
                    .addresses[index];
                final selected = _selectedAddress == addr.address;
                return ChoiceChip(
                  label: Text(addr.label),
                  selected: selected,
                  onSelected: (v) {
                    if (v) {
                      setState(() {
                        _selectedLatLng = LatLng(addr.lat, addr.lng);
                        _selectedAddress = addr.address;
                        _showCustomLocation = false;
                      });
                    }
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 12),
        ],

        if (!_showCustomLocation && _selectedAddress != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.withAlpha(20),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.withAlpha(50)),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: Colors.blue),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _selectedAddress!,
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _showCustomLocation = true),
                  child: const Text('Change'),
                ),
              ],
            ),
          ),
        ] else ...[
          Container(
            height: 200,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter:
                          _selectedLatLng ?? const LatLng(12.9716, 77.5946),
                      initialZoom: 14,
                      onTap: (_, latLng) => _setSelectedLocation(latLng),
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.carb.app',
                      ),
                      if (_selectedLatLng != null)
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: _selectedLatLng!,
                              width: 40,
                              height: 40,
                              child: const Icon(
                                Icons.location_on,
                                color: Colors.red,
                                size: 40,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: FloatingActionButton.small(
                      onPressed: _useCurrentLocation,
                      child: _locating
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.my_location),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _resolvingAddress
                ? 'Resolving address...'
                : (_selectedAddress ?? 'Tap on map to select location'),
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
        ],

        const SizedBox(height: 16),
        TextField(
          controller: _notesController,
          decoration: const InputDecoration(
            labelText: 'Notes for the driver (Optional)',
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
        ),
      ],
    );
  }

  Widget _buildConfirmStep() {
    final vehicle = _vehicles.firstWhere((v) => v.id == _selectedVehicleId);
    final selectedServices = _allServices
        .where((s) => _selectedServiceIds.contains(s.id))
        .toList();
    final total = selectedServices.fold<num>(0, (sum, s) => sum + s.price);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Confirm Booking',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        _buildSummaryItem(
          'Vehicle',
          '${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})',
          Icons.directions_car,
        ),
        _buildSummaryItem(
          'Schedule',
          '${DateFormat('EEE, MMM d').format(_selectedDate)} at ${_selectedTime.format(context)}',
          Icons.calendar_today,
        ),
        _buildSummaryItem(
          'Location',
          _selectedAddress ?? '-',
          Icons.location_on,
        ),
        const Divider(height: 32),
        const Text(
          'Selected Services',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        ...selectedServices.map(
          (s) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(s.name),
                Text(
                  '₹${s.price}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Total Amount',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              '₹$total',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryItem(String title, String subtitle, IconData icon) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
    );
  }

  Future<void> _setSelectedLocation(LatLng latLng) async {
    setState(() {
      _selectedLatLng = latLng;
      _resolvingAddress = true;
    });
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
        'format': 'jsonv2',
        'lat': latLng.latitude.toString(),
        'lon': latLng.longitude.toString(),
      });
      final res = await http.get(
        uri,
        headers: const {'User-Agent': 'DriveFlowMobile/1.0'},
      );
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        final name = decoded['display_name'];
        if (name is String && name.trim().isNotEmpty) {
          setState(() {
            _selectedAddress = name;
          });
        }
      }
    } catch (e) {
      // Handle error
    } finally {
      setState(() => _resolvingAddress = false);
    }
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _locating = true);
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) return;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 15),
      );
      final latLng = LatLng(pos.latitude, pos.longitude);
      _mapController.move(latLng, 15);
      _setSelectedLocation(latLng);
    } catch (e) {
      // Handle error
    } finally {
      setState(() => _locating = false);
    }
  }

  Future<void> _submitBooking() async {
    if (_selectedVehicleId == null ||
        _selectedServiceIds.isEmpty ||
        _selectedAddress == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please complete all steps')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await _bookingService.createBooking(
        vehicleId: _selectedVehicleId!,
        serviceIds: _selectedServiceIds,
        date: DateTime(
          _selectedDate.year,
          _selectedDate.month,
          _selectedDate.day,
          _selectedTime.hour,
          _selectedTime.minute,
        ),
        location: BookingLocation(
          address: _selectedAddress!,
          lat: _selectedLatLng!.latitude,
          lng: _selectedLatLng!.longitude,
        ),
        notes: _notesController.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking created successfully!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to create booking: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }
}
