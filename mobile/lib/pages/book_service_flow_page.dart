import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../models/booking.dart';
import '../models/service.dart';
import '../models/vehicle.dart';
import '../services/booking_service.dart';
import '../services/catalog_service.dart';
import '../services/vehicle_service.dart';
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
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();
  final _reviewService = ReviewService();
  final _mapController = MapController();
  final _notesController = TextEditingController();

  int _currentStep = 0;
  bool _loading = false;

  List<Vehicle> _vehicles = [];
  List<ServiceItem> _allServices = [];

  String? _selectedVehicleId;
  String? _selectedCategoryId;
  String? _selectedSubCategory;
  List<String> _selectedServiceIds = [];

  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _selectedTime = const TimeOfDay(hour: 10, minute: 0);

  LatLng? _selectedLatLng;
  String? _selectedAddress;
  bool _locating = false;
  bool _resolvingAddress = false;
  bool _showCustomLocation = false;

  final List<String> _steps = [
    'Vehicle',
    'Sub-category',
    'Schedule',
    'Confirm',
  ];

  final List<Map<String, dynamic>> _categories = [
    {
      'id': 'Periodic',
      'label': 'SERVICES',
      'icon': Icons.build_rounded,
      'subcategories': ['General Service', 'Body Shop', 'Insurance Claim'],
    },
    {
      'id': 'Wash',
      'label': 'CAR WASH',
      'icon': Icons.water_drop_rounded,
      'subcategories': [
        'Exterior only (45 mins)',
        'Interior + Exterior (60–70 mins)',
        'Interior + Exterior + Underbody (90 mins)',
      ],
    },
    {
      'id': 'Tyres',
      'label': 'TYRES & BATTERY',
      'icon': Icons.album_rounded,
      'subcategories': [
        'Default OEM size',
        'Customer can opt change',
        'Amaron Battery',
        'Exide Battery',
      ],
    },
    {
      'id': 'Insurance',
      'label': 'INSURANCE',
      'icon': Icons.shield_rounded,
      'subcategories': ['INSURANCE'],
    },
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategoryId = widget.initialCategory ?? 'Periodic';
    _fetchInitialData();

    // Check for arguments from NavigationProvider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final nav = context.read<NavigationProvider>();
      if (nav.arguments != null && nav.arguments is ServiceItem) {
        final service = nav.arguments as ServiceItem;
        setState(() {
          _selectedCategoryId = service.category ?? 'Periodic';
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
    if (widget.initialCategory != oldWidget.initialCategory) {
      setState(() {
        _selectedCategoryId = widget.initialCategory ?? 'Periodic';
        _selectedSubCategory = null;
        _selectedServiceIds = [];
        _currentStep = 0; // Reset to Vehicle step if category changed
      });
    }
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
        _loading = false;
      });

      // If category is provided, maybe we want to skip Step 0 if vehicle is already selected
      if (widget.initialCategory != null && _selectedVehicleId != null) {
        // We stay at step 0 for now to let user confirm vehicle
      }
    } catch (e) {
      setState(() {
        _loading = false;
      });
    }
  }

  void _showFeedbackRequiredDialog(Map<String, dynamic> pending) {
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
                arguments: pending['bookingId'],
              );
            },
            child: const Text('Go to Booking'),
          ),
        ],
      ),
    );
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0:
        return _selectedVehicleId != null;
      case 1:
        return _selectedSubCategory != null && _selectedServiceIds.isNotEmpty;
      case 2:
        return _selectedLatLng != null && _selectedAddress != null;
      case 3:
        return true;
      default:
        return false;
    }
  }

  void _handleNext() {
    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);
    } else {
      _handleSubmit();
    }
  }

  void _handleBack() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    } else {
      // If at step 0, go back to Home Dashboard
      context.read<NavigationProvider>().setTab(2);
    }
  }

  Future<void> _handleSubmit() async {
    if (_selectedVehicleId == null || _selectedLatLng == null) return;

    setState(() => _loading = true);
    try {
      final bookingDate = DateTime(
        _selectedDate.year,
        _selectedDate.month,
        _selectedDate.day,
        _selectedTime.hour,
        _selectedTime.minute,
      );

      await _bookingService.createBooking(
        vehicleId: _selectedVehicleId!,
        serviceIds: _selectedServiceIds,
        date: bookingDate,
        notes: _notesController.text,
        location: BookingLocation(
          address: _selectedAddress,
          lat: _selectedLatLng!.latitude,
          lng: _selectedLatLng!.longitude,
        ),
      );

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Booking confirmed!')));

        // Reset flow state before navigating
        setState(() {
          _currentStep = 0;
          _selectedSubCategory = null;
          _selectedServiceIds = [];
          _notesController.clear();
        });

        // Go to dashboard tab (index 2) in MainNavigationPage and request refresh
        context.read<NavigationProvider>().setTab(2, refreshDashboard: true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Booking failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _useCurrentLocation() async {
    if (_locating) return;
    setState(() => _locating = true);
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) throw 'Enable location services to continue';

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw 'Location permission is required';
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final latLng = LatLng(pos.latitude, pos.longitude);
      await _setSelectedLocation(latLng);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _setSelectedLocation(LatLng latLng) async {
    setState(() {
      _selectedLatLng = latLng;
      _resolvingAddress = true;
    });

    try {
      _mapController.move(latLng, 15);
      final addr = await _reverseGeocode(latLng);
      if (mounted) {
        setState(() {
          _selectedAddress = addr;
          _resolvingAddress = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _resolvingAddress = false);
    }
  }

  Future<String?> _reverseGeocode(LatLng v) async {
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
        'format': 'jsonv2',
        'lat': v.latitude.toString(),
        'lon': v.longitude.toString(),
      });
      final res = await http.get(
        uri,
        headers: const {'User-Agent': 'DriveFlowMobile/1.0'},
      );
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        return decoded['display_name']?.toString();
      }
    } catch (_) {}
    return null;
  }

  String _getAppBarTitle() {
    switch (_selectedCategoryId) {
      case 'Wash':
        return 'Book a Car Wash';
      case 'Insurance':
        return 'Book Insurance';
      case 'Tyres':
        return 'Book Battery/Tire';
      default:
        return 'Book a Service';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      appBar: AppBar(
        title: Text(
          _getAppBarTitle(),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _handleBack,
        ),
      ),
      body: _loading && _vehicles.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildProgressStepper(),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: _buildStepContent(),
                  ),
                ),
                _buildNavigationButtons(),
              ],
            ),
    );
  }

  Widget _buildProgressStepper() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      child: Row(
        children: List.generate(_steps.length, (index) {
          final isCompleted = index < _currentStep;
          final isCurrent = index == _currentStep;

          return Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 2,
                        color: index == 0
                            ? Colors.transparent
                            : (isCompleted || isCurrent
                                  ? Colors.blue
                                  : Colors.grey.shade300),
                      ),
                    ),
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isCompleted || isCurrent
                            ? Colors.blue
                            : Colors.grey.shade300,
                      ),
                      child: Center(
                        child: isCompleted
                            ? const Icon(
                                Icons.check,
                                size: 14,
                                color: Colors.white,
                              )
                            : Text(
                                '${index + 1}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ),
                    Expanded(
                      child: Container(
                        height: 2,
                        color: index == _steps.length - 1
                            ? Colors.transparent
                            : (isCompleted
                                  ? Colors.blue
                                  : Colors.grey.shade300),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  _steps[index],
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                    color: isCurrent ? Colors.blue : Colors.grey,
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildVehicleStep();
      case 1:
        return _buildSubCategoryStep();
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

  Widget _buildSubCategoryStep() {
    final cat = _categories.firstWhere((c) => c['id'] == _selectedCategoryId);
    final subs = cat['subcategories'] as List<String>;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select Sub-category for ${cat['label']}',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        ...subs.map((sub) {
          final selected = _selectedSubCategory == sub;
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
                  _selectedSubCategory = sub;
                  // Auto-select matching service from _allServices
                  final matching = _allServices
                      .where(
                        (s) =>
                            s.category?.toLowerCase() ==
                            _selectedCategoryId?.toLowerCase(),
                      )
                      .toList();
                  if (matching.isNotEmpty) {
                    _selectedServiceIds = [matching.first.id];
                  } else if (_allServices.isNotEmpty) {
                    _selectedServiceIds = [_allServices.first.id];
                  } else {
                    _selectedServiceIds = [];
                  }
                });
                _handleNext();
              },
              title: Text(
                sub,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              trailing: selected
                  ? const Icon(Icons.check_circle, color: Colors.blue)
                  : const Icon(Icons.chevron_right),
            ),
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
              color: Colors.blue.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
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
    final cat = _categories.firstWhere((c) => c['id'] == _selectedCategoryId);

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
        _buildSummaryItem('Category', cat['label'], cat['icon']),
        _buildSummaryItem(
          'Sub-category',
          _selectedSubCategory ?? '-',
          Icons.subdirectory_arrow_right,
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
          'Estimated Price',
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
        const SizedBox(height: 12),
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

  Widget _buildSummaryItem(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationButtons() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.fromLTRB(
        16,
        16,
        16,
        100,
      ), // Added bottom padding to stay above PillBottomBar
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.white,
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        children: [
          if (_currentStep > 0) ...[
            Expanded(
              child: OutlinedButton(
                onPressed: _handleBack,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: BorderSide(
                    color: isDark ? Colors.white24 : Colors.grey.shade300,
                  ),
                  foregroundColor: isDark ? Colors.white : Colors.black87,
                ),
                child: const Text('Back'),
              ),
            ),
            const SizedBox(width: 16),
          ],
          Expanded(
            child: ElevatedButton(
              onPressed: _canProceed() ? _handleNext : null,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                elevation: 0,
              ),
              child: Text(
                _currentStep == _steps.length - 1 ? 'Confirm Booking' : 'Next',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
