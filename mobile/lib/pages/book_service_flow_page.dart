import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:convert';
import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:http/http.dart' as http;

import '../models/service.dart';
import '../core/env.dart';
import '../models/vehicle.dart';
import '../models/booking.dart';
import '../services/catalog_service.dart';
import '../services/vehicle_service.dart';
import '../services/booking_service.dart';
import '../state/auth_provider.dart';
import '../state/navigation_provider.dart';
import '../services/socket_service.dart';

class BookServiceFlowPage extends StatefulWidget {
  final String? initialCategory;

  const BookServiceFlowPage({super.key, this.initialCategory});

  @override
  State<BookServiceFlowPage> createState() => _BookServiceFlowPageState();
}

class _BookServiceFlowPageState extends State<BookServiceFlowPage> {
  int _currentStep = 0;
  bool _loading = false;
  String? _error;
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();

  List<Vehicle> _vehicles = [];
  List<ServiceItem> _allServices = [];
  String? _initialServiceId;

  String? _selectedVehicleId;
  List<String> _selectedServiceIds = [];
  String _activeSubCategory = 'All';
  final Map<String, String> _tireSizes = {};
  final Map<String, bool> _isManualSize = {};
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();
  String? _selectedAddress;
  LatLng? _selectedLatLng;
  bool _showCustomLocation = false;
  final _notesController = TextEditingController();
  bool _locating = false;
  bool _resolvingAddress = false;
  final MapController _mapController = MapController();

  static const List<String> commonTireSizes = [
    '145/70 R12',
    '155/80 R13',
    '165/80 R14',
    '175/65 R14',
    '185/65 R15',
    '195/55 R16',
    '205/55 R16',
    '215/60 R16',
    '225/45 R17',
    '235/45 R18',
  ];

  @override
  void initState() {
    super.initState();
    _fetchInitialData();

    if (widget.initialCategory == 'Tyres') {
      _activeSubCategory = 'Tyres';
    }

    // Check for arguments from NavigationProvider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final nav = context.read<NavigationProvider>();
      if (nav.arguments != null && nav.arguments is ServiceItem) {
        final service = nav.arguments as ServiceItem;
        setState(() {
          _initialServiceId = service.id;
          _selectedServiceIds = [service.id];
          _currentStep = 0; // Start at vehicle selection step
        });
      }
    });
  }

  @override
  void didUpdateWidget(BookServiceFlowPage oldWidget) {
    super.didUpdateWidget(oldWidget);
  }

  Future<void> _fetchInitialData() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _vehicleService.listMyVehicles(),
        _catalogService.listServices(category: widget.initialCategory),
      ]);

      final List<Vehicle> vehicles = results[0] as List<Vehicle>;
      final List<ServiceItem> services = results[1] as List<ServiceItem>;

      if (mounted) {
        setState(() {
          _vehicles = List<Vehicle>.from(vehicles);
          _allServices = services;
          if (_vehicles.isNotEmpty && _selectedVehicleId == null) {
            _selectedVehicleId = _vehicles.first.id;
          }

          // Pre-populate location from default saved address
          final user = context.read<AuthProvider>().user;
          if (user != null &&
              user.addresses.isNotEmpty &&
              _selectedAddress == null) {
            final defaultAddr = user.addresses.firstWhere(
              (a) => a.isDefault,
              orElse: () => user.addresses.first,
            );
            _selectedAddress = defaultAddr.address;
            _selectedLatLng = LatLng(defaultAddr.lat, defaultAddr.lng);
          }

          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  final List<String> _steps = ['Vehicle', 'Service', 'Schedule', 'Confirm'];

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final currentIdx = nav.selectedIndex;

    // Check if this page's tab is active and if we should refresh
    final Map<String, int> tabMapping = {
      'Periodic': 0,
      'Insurance': 1,
      'Wash': 3,
      'Tyres': 4,
    };

    if (tabMapping[widget.initialCategory] == currentIdx) {
      // If we are on the active tab, and the vehicle list is empty but we haven't checked in a while
      if (_vehicles.isEmpty && !_loading && _error == null) {
        Future.microtask(() => _fetchInitialData());
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.initialCategory != null && widget.initialCategory != 'Services'
              ? 'Book ${widget.initialCategory}'
              : 'Book a Service',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                Positioned.fill(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 180),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildStepper(),
                        const SizedBox(height: 30),
                        _buildStepContent(),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  bottom: 100, // Safe distance above the PillBottomBar
                  left: 0,
                  right: 0,
                  child: _buildBottomButtons(),
                ),
              ],
            ),
    );
  }

  Widget _buildStepper() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: isDark ? Colors.black : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
        ),
      ),
      child: Row(
        children: _steps.asMap().entries.map((entry) {
          int idx = entry.key;
          String label = entry.value;
          bool isActive = _currentStep == idx;
          bool isCompleted = _currentStep > idx;

          return Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: (isActive || isCompleted)
                              ? const Color(0xFF2563EB)
                              : isDark
                              ? Colors.black
                              : Colors.grey.shade50,
                          border: Border.all(
                            color: (isActive || isCompleted)
                                ? const Color(0xFF2563EB)
                                : isDark
                                ? Colors.grey.shade600
                                : Colors.grey.shade300,
                            width: 1,
                          ),
                        ),
                        child: Center(
                          child: isCompleted
                              ? const Icon(
                                  Icons.check,
                                  color: Colors.white,
                                  size: 14,
                                )
                              : Text(
                                  '${idx + 1}',
                                  style: TextStyle(
                                    color: (isActive || isCompleted)
                                        ? Colors.white
                                        : isDark
                                        ? Colors.white
                                        : Colors.grey.shade500,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 10,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 9,
                          color: (isActive || isCompleted)
                              ? isDark
                                    ? Colors.white
                                    : Colors.black
                              : isDark
                              ? Colors.white
                              : Colors.grey.shade400,
                          fontWeight: (isActive || isCompleted)
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                if (idx < _steps.length - 1)
                  Container(
                    width: 20,
                    height: 1,
                    margin: const EdgeInsets.only(bottom: 15),
                    color: isCompleted
                        ? const Color(0xFF2563EB)
                        : isDark
                        ? Colors.grey.shade700
                        : Colors.grey.shade200,
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBottomButtons() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? Colors.black : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(12),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          if (_currentStep > 0)
            Expanded(
              child: ElevatedButton(
                onPressed: _handleBack,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isDark
                      ? Colors.grey.shade900
                      : const Color(0xFFE5E7EB),
                  foregroundColor: isDark ? Colors.white : Colors.black,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Back',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          if (_currentStep > 0) const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _handleNext,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _currentStep == _steps.length - 1 ? 'Confirm' : 'Next',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.chevron_right, size: 20),
                ],
              ),
            ),
          ),
        ],
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (_vehicles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.car_repair,
              size: 64,
              color: isDark ? Colors.grey.shade600 : Colors.grey,
            ),
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
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
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
          (v) => GestureDetector(
            onTap: () => setState(() => _selectedVehicleId = v.id),
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey.shade800 : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _selectedVehicleId == v.id
                      ? const Color(0xFF2563EB)
                      : isDark
                      ? Colors.grey.shade700
                      : Colors.grey.shade200,
                  width: _selectedVehicleId == v.id ? 2 : 1,
                ),
                boxShadow: [
                  if (_selectedVehicleId == v.id)
                    BoxShadow(
                      color: const Color(0xFF2563EB).withAlpha(25),
                      blurRadius: 10,
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
                          ? Colors.grey.shade700
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.directions_car,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${v.make} ${v.model}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          v.licensePlate,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark
                                ? Colors.grey.shade400
                                : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_selectedVehicleId == v.id)
                    const Icon(Icons.check_circle, color: Color(0xFF2563EB)),
                ],
              ),
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
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF2563EB),
            side: const BorderSide(color: Color(0xFF2563EB)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          ),
        ),
      ],
    );
  }

  Widget _buildServiceStep() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final Map<String, List<String>> categoryMap = {
      'Periodic': ['Services', 'Periodic', 'Repair', 'AC'],
      'Wash': ['Car Wash', 'Wash', 'Detailing'],
      'Tyres': ['Tyre & Battery', 'Tyres', 'Battery'],
      'Insurance': ['Insurance'],
      'Other': ['Other', 'Painting', 'Denting', 'Accessories'],
    };

    List<String> categoriesToDisplay;

    if (widget.initialCategory != null &&
        categoryMap.containsKey(widget.initialCategory)) {
      categoriesToDisplay = categoryMap[widget.initialCategory!]!;
    } else if (widget.initialCategory != null) {
      categoriesToDisplay = [widget.initialCategory!];
    } else {
      categoriesToDisplay = categoryMap.values.expand((e) => e).toList();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_initialServiceId != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Quick Service Selection',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _initialServiceId = null),
                  child: const Text('Show all services'),
                ),
              ],
            ),
          ),

        // Category-specific tabs for Tyres & Battery
        if (widget.initialCategory == 'Tyres' ||
            widget.initialCategory == 'Tyre & Battery')
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () =>
                        setState(() => _activeSubCategory = 'Tyres'),
                    icon: const Icon(Icons.circle_outlined),
                    label: const Text('Tires'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _activeSubCategory == 'Tyres'
                          ? const Color(0xFF2563EB)
                          : (isDark
                                ? Colors.grey.shade800
                                : Colors.grey.shade200),
                      foregroundColor: _activeSubCategory == 'Tyres'
                          ? Colors.white
                          : (isDark ? Colors.white70 : Colors.black87),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () =>
                        setState(() => _activeSubCategory = 'Battery'),
                    icon: const Icon(Icons.battery_charging_full),
                    label: const Text('Battery'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _activeSubCategory == 'Battery'
                          ? const Color(0xFF2563EB)
                          : (isDark
                                ? Colors.grey.shade800
                                : Colors.grey.shade200),
                      foregroundColor: _activeSubCategory == 'Battery'
                          ? Colors.white
                          : (isDark ? Colors.white70 : Colors.black87),
                    ),
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 16),
        ...categoriesToDisplay
            .where((c) {
              if (widget.initialCategory == 'Tyres' ||
                  widget.initialCategory == 'Tyre & Battery') {
                if (_activeSubCategory == 'Tyres') {
                  return c == 'Tyres' || c == 'Tyre & Battery';
                }
                if (_activeSubCategory == 'Battery') {
                  return c == 'Battery';
                }
              }
              return true;
            })
            .map((category) {
              var services = _allServices
                  .where((s) => s.category == category)
                  .toList();

              if (_initialServiceId != null) {
                services = services
                    .where((s) => s.id == _initialServiceId)
                    .toList();
              }

              if (services.isEmpty) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (categoriesToDisplay.length > 1)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        category,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2563EB),
                        ),
                      ),
                    ),
                  ...services.map((service) {
                    final selected = _selectedServiceIds.contains(service.id);
                    final showSizeSelection =
                        selected &&
                        (service.name.toLowerCase().contains('change') ||
                            service.name.toLowerCase().contains('size'));

                    return Column(
                      children: [
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              if (selected) {
                                _selectedServiceIds.remove(service.id);
                              } else {
                                _selectedServiceIds.add(service.id);
                              }
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.grey.shade800
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: selected
                                    ? const Color(0xFF2563EB)
                                    : isDark
                                    ? Colors.grey.shade700
                                    : Colors.grey.shade200,
                                width: selected ? 2 : 1,
                              ),
                              boxShadow: [
                                if (selected)
                                  BoxShadow(
                                    color: const Color(
                                      0xFF2563EB,
                                    ).withAlpha(25),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? Colors.grey.shade700
                                        : Colors.grey.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                    image:
                                        (service.image != null &&
                                            service.image!.isNotEmpty)
                                        ? DecorationImage(
                                            image: NetworkImage(service.image!),
                                            fit: BoxFit.cover,
                                          )
                                        : null,
                                  ),
                                  child:
                                      (service.image == null ||
                                          service.image!.isEmpty)
                                      ? const Icon(
                                          Icons.build_circle,
                                          color: Color(0xFF2563EB),
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        service.name,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Text(
                                            'Price: ₹${service.price}',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: isDark
                                                  ? Colors.grey.shade400
                                                  : Colors.grey.shade600,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            '• Time: ${service.estimatedMinutes} mins',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: isDark
                                                  ? Colors.grey.shade400
                                                  : Colors.grey.shade600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                if (selected)
                                  const Icon(
                                    Icons.check_circle,
                                    color: Color(0xFF2563EB),
                                  )
                                else
                                  Icon(
                                    Icons.add_circle_outline,
                                    color: isDark
                                        ? Colors.grey.shade600
                                        : Colors.grey.shade300,
                                  ),
                              ],
                            ),
                          ),
                        ),
                        if (showSizeSelection)
                          Container(
                            margin: const EdgeInsets.only(left: 16, bottom: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.grey.shade900
                                  : Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFF2563EB).withAlpha(100),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Select Size',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _isManualSize[service.id] =
                                              !(_isManualSize[service.id] ??
                                                  false);
                                          _tireSizes[service.id] = '';
                                        });
                                      },
                                      child: Text(
                                        _isManualSize[service.id] == true
                                            ? 'Common Sizes'
                                            : 'Manual Entry',
                                        style: const TextStyle(fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                                if (_isManualSize[service.id] == true)
                                  TextField(
                                    onChanged: (val) => setState(
                                      () => _tireSizes[service.id] = val,
                                    ),
                                    decoration: const InputDecoration(
                                      hintText: 'Enter size (e.g. 185/65 R15)',
                                      isDense: true,
                                      border: OutlineInputBorder(),
                                    ),
                                  )
                                else
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 4,
                                    children: commonTireSizes.map((size) {
                                      final isSelected =
                                          _tireSizes[service.id] == size;
                                      return ChoiceChip(
                                        label: Text(
                                          size,
                                          style: const TextStyle(fontSize: 10),
                                        ),
                                        selected: isSelected,
                                        onSelected: (val) {
                                          if (val) {
                                            setState(
                                              () =>
                                                  _tireSizes[service.id] = size,
                                            );
                                          }
                                        },
                                        selectedColor: const Color(
                                          0xFF2563EB,
                                        ).withAlpha(50),
                                      );
                                    }).toList(),
                                  ),
                              ],
                            ),
                          ),
                      ],
                    );
                  }),
                ],
              );
            }),
      ],
    );
  }

  Widget _buildScheduleStep() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SingleChildScrollView(
      child: Column(
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
                      initialEntryMode: TimePickerEntryMode.dial,
                      builder: (context, child) {
                        return Theme(
                          data: Theme.of(context).copyWith(
                            timePickerTheme: TimePickerThemeData(
                              backgroundColor: isDark
                                  ? Colors.black
                                  : Colors.white,
                              hourMinuteTextColor: const Color(0xFF2563EB),
                              dayPeriodTextColor: const Color(0xFF2563EB),
                              dialHandColor: const Color(0xFF2563EB),
                              dialBackgroundColor: isDark
                                  ? Colors.grey.shade900
                                  : Colors.grey.shade100,
                              entryModeIconColor: const Color(0xFF2563EB),
                            ),
                          ),
                          child: child!,
                        );
                      },
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
                color: isDark
                    ? Colors.blue.withAlpha(40)
                    : Colors.blue.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.blue.withAlpha(80)
                      : Colors.blue.withAlpha(50),
                ),
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
                border: Border.all(
                  color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                ),
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
                          userAgentPackageName: Env.userAgent,
                          tileProvider: CancellableNetworkTileProvider(),
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
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
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
              style: TextStyle(
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                fontSize: 12,
              ),
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
      ),
    );
  }

  Widget _buildConfirmStep() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Vehicle? selectedVehicle;
    if (_selectedVehicleId != null) {
      // Using a loop to avoid exception if not found, which shouldn't happen in normal flow.
      for (final v in _vehicles) {
        if (v.id == _selectedVehicleId) {
          selectedVehicle = v;
          break;
        }
      }
    }

    final selectedServices = _allServices
        .where((s) => _selectedServiceIds.contains(s.id))
        .toList();
    final total = selectedServices.fold<double>(
      0,
      (sum, item) => sum + item.price,
    );
    final totalTime = selectedServices.fold<num>(
      0,
      (sum, item) => sum + (item.estimatedMinutes ?? 0),
    );

    final summaryItems = <Widget>[
      if (selectedVehicle != null)
        _buildSummaryItem(
          'Vehicle',
          '${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.licensePlate})',
          Icons.directions_car,
        ),
      if (selectedServices.isNotEmpty)
        _buildSummaryItem(
          'Services',
          selectedServices.map((s) => s.name).join(', '),
          Icons.build,
        ),
      _buildSummaryItem(
        'Schedule',
        '${DateFormat('EEE, MMM d, yyyy').format(_selectedDate)} at ${_selectedTime.format(context)}',
        Icons.calendar_today,
      ),
      if (_selectedAddress != null)
        _buildSummaryItem('Location', _selectedAddress!, Icons.location_on),
      if (_notesController.text.isNotEmpty)
        _buildSummaryItem('Notes', _notesController.text, Icons.notes),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Confirm Your Booking',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: summaryItems.length,
          itemBuilder: (context, index) => summaryItems[index],
          separatorBuilder: (context, index) => const Divider(),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total Estimate',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  Text(
                    'Approx. $totalTime mins',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark
                          ? Colors.grey.shade400
                          : Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ],
          ),
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
      final selectedServices = _allServices
          .where((s) => _selectedServiceIds.contains(s.id))
          .toList();

      final notesWithSizes = selectedServices
          .map((service) {
            final size = _tireSizes[service.id];
            String note = service.name;
            if (size != null && size.isNotEmpty) note += ' - Size: $size';
            return note;
          })
          .join(', ');

      final fullNotes = _notesController.text.isNotEmpty
          ? '${_notesController.text}\nServices: $notesWithSizes'
          : notesWithSizes;

      final res = await _bookingService.createBooking(
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
        notes: fullNotes,
      );

      if (!mounted) return;

      if (res is Map<String, dynamic> && res['requiresPayment'] == true) {
        // Special handling for payment-required services (Car Wash, Battery, Tyres)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              res['message'] ?? 'Please complete payment to create booking',
            ),
          ),
        );
        // Redirect to a payment page or show a payment dialog
        // For now, we'll use a dummy payment logic if possible
        final tempBookingId = res['tempBookingId'];
        if (tempBookingId != null) {
          _processPayment(tempBookingId, tempBookingData: res);
        }
        return;
      }

      final booking = res as Booking;

      // Send a socket event to trigger a refresh on the dashboard
      context.read<SocketService>().sendEvent('booking_created');

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Booking confirmed! We have scheduled your service.'),
        ),
      );

      // Navigate to track page (using Replacement to prevent back button coming here)
      Navigator.pushReplacementNamed(context, '/track', arguments: booking.id);
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

  Future<void> _processPayment(
    String tempBookingId, {
    Map<String, dynamic>? tempBookingData,
  }) async {
    // Show a loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      // In a real app, you'd integrate Razorpay/Stripe here.
      // For now, we'll simulate a dummy payment like the frontend does.
      final result = await _bookingService.processDummyPayment(
        tempBookingId,
        tempBookingData: tempBookingData,
      );

      if (mounted) {
        Navigator.pop(context); // Close loading dialog

        if (result['success'] == true || result['bookingId'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment successful! Booking created.'),
            ),
          );

          context.read<SocketService>().sendEvent('booking_created');

          Navigator.pushReplacementNamed(
            context,
            '/track',
            arguments: result['bookingId'],
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Payment failed: ${result['message']}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Payment processing error: $e')));
      }
    }
  }
}
