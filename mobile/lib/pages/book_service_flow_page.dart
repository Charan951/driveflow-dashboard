import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_cashfree_pg_sdk/api/cferrorresponse/cferrorresponse.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfwebcheckoutpayment.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfpaymentgateway/cfpaymentgatewayservice.dart';
import 'package:flutter_cashfree_pg_sdk/api/cfsession/cfsession.dart';
import 'package:flutter_cashfree_pg_sdk/utils/cfenums.dart';

import '../models/service.dart';
import '../core/app_colors.dart';
import '../core/app_styles.dart';
import '../core/env.dart';
import '../models/vehicle.dart';
import '../models/booking.dart';
import '../services/catalog_service.dart';
import '../services/vehicle_service.dart';
import '../services/booking_service.dart';
import '../services/payment_service.dart';
import '../services/coupon_service.dart';
import '../state/auth_provider.dart';
import '../state/navigation_provider.dart';
import '../services/socket_service.dart';
import '../widgets/custom_stepper.dart';
import '../widgets/vehicle_card.dart';
import '../widgets/gradient_button.dart';

class BookServiceFlowPage extends StatefulWidget {
  final String? initialCategory;

  const BookServiceFlowPage({super.key, this.initialCategory});

  @override
  State<BookServiceFlowPage> createState() => _BookServiceFlowPageState();
}

class _BookServiceFlowPageState extends State<BookServiceFlowPage> {
  int _currentStep = 0;
  bool _loading = false;
  bool _hasAttemptedFetch = false;
  String? _error;
  final _catalogService = CatalogService();
  final _vehicleService = VehicleService();
  final _bookingService = BookingService();
  final _paymentService = PaymentService();
  final _socketService = SocketService();
  final _couponService = CouponService();
  final _cashfreeGateway = CFPaymentGatewayService();
  Map<String, dynamic>? _currentTempBookingData;

  List<dynamic> _availableCoupons = [];
  Map<String, dynamic>? _appliedCoupon;
  bool _loadingCoupons = false;
  bool _validatingCoupon = false;

  List<Vehicle> _vehicles = [];
  List<ServiceItem> _allServices = [];
  String? _initialServiceId;

  String? _selectedVehicleId;
  List<String> _selectedServiceIds = [];
  String? _activeSubCategory;
  final Map<String, String> _tireSizes = {};
  final Map<String, bool> _isManualSize = {};
  final Map<String, TextEditingController> _tireSizeControllers = {};
  DateTime _selectedDate = DateTime.now();
  String? _selectedTimeSlot;
  List<String> _availableSlots = [];
  List<String> _availableServicePincodes = [];
  bool _pincodesReady = false;
  String? _selectedAddress;
  LatLng? _selectedLatLng;
  bool _showCustomLocation = false;
  final _notesController = TextEditingController();
  bool _locating = false;
  bool _resolvingAddress = false;
  final MapController _mapController = MapController();
  String? _selectedVehicleOEMTire;
  double _pickupDropPrice = 0;

  String? _extractPincode(String? address) {
    if (address == null) return null;
    final match = RegExp(r'(\d{6})(?!\d)').firstMatch(address);
    return match?.group(1);
  }

  bool _isSameCalendarDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Future<void> _handleGlobalSync(dynamic data) async {
    if (!mounted || data == null) return;
    try {
      final mapData = data is Map<String, dynamic>
          ? data
          : Map<String, dynamic>.from(data as Map);
      final entity = (mapData['entity'] ?? '').toString();
      final payload = mapData['data'];
      final payloadMap = payload is Map<String, dynamic>
          ? payload
          : (payload is Map ? Map<String, dynamic>.from(payload) : null);

      if (entity == 'availableServicePincode') {
        final pinsRaw = payloadMap?['availablePincodes'];
        if (pinsRaw is List) {
          setState(() {
            _availableServicePincodes = pinsRaw
                .map((e) => e.toString())
                .toList();
            _pincodesReady = true;
            if (!_isSelectedLocationAllowed) {
              _selectedTimeSlot = null;
            }
          });
        } else {
          final pins = await _bookingService.getAvailableServicePincodes();
          if (!mounted) return;
          setState(() {
            _availableServicePincodes = pins;
            _pincodesReady = true;
            if (!_isSelectedLocationAllowed) {
              _selectedTimeSlot = null;
            }
          });
        }
        return;
      }

      if (entity == 'slotBlock') {
        final dateRaw = payloadMap?['date']?.toString();
        if (dateRaw != null && dateRaw.isNotEmpty) {
          final changedDate = DateTime.tryParse(dateRaw);
          if (changedDate != null &&
              _isSameCalendarDay(changedDate, _selectedDate)) {
            await _fetchSlotsForDate(_selectedDate);
          }
        } else {
          await _fetchSlotsForDate(_selectedDate);
        }
        return;
      }

      if (entity == 'booking') {
        final dateRaw = payloadMap?['date']?.toString();
        if (dateRaw == null || dateRaw.isEmpty) {
          await _fetchSlotsForDate(_selectedDate);
          return;
        }
        final changedDate = DateTime.tryParse(dateRaw);
        if (changedDate != null &&
            _isSameCalendarDay(changedDate, _selectedDate)) {
          await _fetchSlotsForDate(_selectedDate);
        }
      }

      if (entity == 'coupon') {
        await _fetchCoupons();
      }
    } catch (_) {}
  }

  bool get _isSelectedLocationAllowed {
    final pin = _extractPincode(_selectedAddress);
    if (pin == null) return false;
    if (!_pincodesReady) return true;
    if (_availableServicePincodes.isEmpty) return false;
    return _availableServicePincodes.contains(pin);
  }

  DateTime? _composeBookingDateTime() {
    final slot = _selectedTimeSlot;
    if (slot == null || slot.isEmpty) return null;
    final m = RegExp(r'^(\d{1,2}):(\d{2})\s([AP]M)$').firstMatch(slot);
    if (m == null) return null;
    var hour = int.tryParse(m.group(1)!);
    final minute = int.tryParse(m.group(2)!);
    final period = m.group(3)!;
    if (hour == null || minute == null) return null;
    if (period == 'PM' && hour < 12) hour += 12;
    if (period == 'AM' && hour == 12) hour = 0;
    return DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      hour,
      minute,
    );
  }

  String _getBookingCategory() {
    if (_selectedServiceIds.isEmpty) return 'All';
    final selectedServices = _allServices
        .where((s) => _selectedServiceIds.contains(s.id))
        .toList();
    if (selectedServices.isEmpty) return 'All';

    final categories = selectedServices.map((s) => s.category).toList();

    if (categories.any((c) => c == 'Car Wash' || c == 'Wash')) {
      return 'Car Wash';
    }
    if (categories.any(
      (c) => c == 'Tyres' || c == 'Battery' || c == 'Tyre & Battery',
    )) {
      return 'Tyres & Battery';
    }
    if (categories.any((c) => c == 'Essentials')) {
      return 'Essentials';
    }

    return 'General Services';
  }

  Future<void> _fetchSlotsForDate(DateTime date) async {
    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(date);
      final category = _getBookingCategory();
      var slots = await _bookingService.getAvailableSlots(
        dateStr,
        category: category,
      );

      final now = DateTime.now();
      if (_isSameCalendarDay(date, now)) {
        slots = slots.where((slot) {
          final m = RegExp(r'^(\d{1,2}):(\d{2})\s([AP]M)$').firstMatch(slot);
          if (m == null) return true;
          var hour = int.tryParse(m.group(1)!);
          final minute = int.tryParse(m.group(2)!);
          final period = m.group(3)!;
          if (hour == null || minute == null) return true;
          if (period == 'PM' && hour < 12) hour += 12;
          if (period == 'AM' && hour == 12) hour = 0;

          final slotTime = DateTime(now.year, now.month, now.day, hour, minute);
          return slotTime.isAfter(now);
        }).toList();
      }

      if (!mounted) return;
      setState(() {
        _availableSlots = slots;
        if (_selectedTimeSlot != null &&
            !_availableSlots.contains(_selectedTimeSlot)) {
          _selectedTimeSlot = null;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _availableSlots = [];
        _selectedTimeSlot = null;
      });
    }
  }

  Future<void> _fetchCoupons() async {
    setState(() => _loadingCoupons = true);
    try {
      final coupons = await _couponService.getCoupons();
      if (!mounted) return;
      final authProvider = context.read<AuthProvider>();
      final user = authProvider.user;
      final serviceType = _getSelectedServiceType();

      setState(() {
        _availableCoupons = coupons.where((c) {
          if (c['isActive'] != true) return false;

          // Filter by service applicability
          final List<dynamic>? applicableServices = c['applicableServices'];
          if (serviceType != null &&
              applicableServices != null &&
              applicableServices.isNotEmpty) {
            final bool isAllApplicable = applicableServices.contains('All');
            if (!isAllApplicable && !applicableServices.contains(serviceType)) {
              return false;
            }
          }

          // Filter by targeted users
          final List<dynamic>? targetUsers = c['targetUsers'];
          if (targetUsers != null && targetUsers.isNotEmpty) {
            final bool isTargeted = targetUsers.any((target) {
              final String? targetEmail = target['email'];
              final String? targetMobile = target['mobile'];

              return (user?.email != null &&
                      targetEmail != null &&
                      targetEmail.toLowerCase() == user!.email.toLowerCase()) ||
                  (user?.phone != null &&
                      targetMobile != null &&
                      targetMobile == user!.phone);
            });
            if (!isTargeted) return false;
          }

          // Check if eligible (Min Order) - ONLY show if eligible
          final double total = _calculateTotal();
          final num minAmount = (c['minOrderAmount'] ?? 0) as num;
          if (total < minAmount) return false;

          return true;
        }).toList();
        _loadingCoupons = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingCoupons = false);
    }
  }

  Future<void> _applyCouponByCode(String code, double totalAmount) async {
    setState(() => _validatingCoupon = true);
    try {
      final authProvider = context.read<AuthProvider>();
      final user = authProvider.user;

      final result = await _couponService.validateCoupon(
        code,
        totalAmount,
        serviceType: _getSelectedServiceType(),
        email: user?.email,
        mobile: user?.phone,
      );
      if (mounted) {
        if (result['valid'] == true && result['coupon'] != null) {
          setState(() {
            _appliedCoupon = result['coupon'];
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Coupon applied successfully!')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['message'] ?? 'Invalid coupon')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().replaceAll(
                'Exception: Failed to validate coupon: ',
                '',
              ),
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _validatingCoupon = false);
      }
    }
  }

  String? _getSelectedServiceType() {
    if (_selectedServiceIds.isEmpty) return null;

    final service = _allServices.firstWhere(
      (s) => s.id == _selectedServiceIds.first,
      orElse: () => _allServices.first,
    );

    final category = service.category?.toLowerCase() ?? '';

    if (category.contains('periodic') || category.contains('general')) {
      return 'General Services';
    } else if (category.contains('wash')) {
      return 'Car Wash';
    } else if (category.contains('essential')) {
      return 'Essentials';
    } else if (category.contains('tyre') || category.contains('battery')) {
      return 'Tyres and Battery';
    }

    return null;
  }

  double _calculateTotal() {
    final selectedServices = _allServices
        .where((s) => _selectedServiceIds.contains(s.id))
        .toList();

    final isGeneralService = selectedServices.any((s) {
      final cat = s.category;
      final name = s.name.toLowerCase();
      return cat == 'Periodic' ||
          cat == 'Services' ||
          name.contains('general service');
    });

    final double baseTotal = selectedServices.fold<double>(
      0,
      (sum, item) => sum + item.price,
    );

    return baseTotal + (isGeneralService ? _pickupDropPrice : 0);
  }

  void _removeCoupon() {
    setState(() {
      _appliedCoupon = null;
    });
  }

  Future<void> _autoFillTireSize(String serviceId, Vehicle vehicle) async {
    String format(String v) {
      var s = v.trim();
      s = s.replaceAll(RegExp(r'\s*/\s*'), '/');
      s = s.replaceAll(RegExp(r'\s+'), ' ');
      s = s.replaceAllMapped(
        RegExp(r'(\d{2,3})/(\d{2})\s*R\s*(\d{2})'),
        (m) => '${m[1]}/${m[2]} R${m[3]}',
      );
      return s;
    }

    String clean(String? v) {
      if (v == null) return '';
      var s = v.replaceAll(RegExp(r'\[[^\]]*\]'), '');
      s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
      return s;
    }

    const overrides = {'tata|nexon|xe': '195/60 R16'};

    if (_allServices.isEmpty) return;

    final service = _allServices.firstWhere(
      (s) => s.id == serviceId,
      orElse: () => _allServices.first,
    );
    final isTireService =
        service.name.toLowerCase().contains('change') ||
        service.name.toLowerCase().contains('size');

    if (!isTireService) return;

    String? tireSize;

    // Always try reference first with cleaned brand, model, and variant
    try {
      final ref = await _vehicleService.searchReference(
        make: clean(vehicle.make),
        model: clean(vehicle.model),
        variant: vehicle.variant != null && vehicle.variant!.trim().isNotEmpty
            ? clean(vehicle.variant)
            : null,
      );
      if (ref != null) {
        tireSize = (ref['front_tyres'] ?? ref['rear_tyres'])?.toString();
      }
    } catch (e) {
      debugPrint('Failed to auto-fetch tire size from reference: $e');
    }

    // Fallback to vehicle-saved tyres if reference not found
    tireSize ??= vehicle.frontTyres ?? vehicle.rearTyres;

    if (tireSize != null && tireSize.isNotEmpty) {
      tireSize = format(tireSize);
    }

    final b = clean(vehicle.make).toLowerCase();
    final m = clean(vehicle.model).toLowerCase();
    final v = (vehicle.variant != null && vehicle.variant!.trim().isNotEmpty)
        ? clean(vehicle.variant).toLowerCase()
        : null;
    final k1 = v != null && v.isNotEmpty ? '$b|$m|$v' : '$b|$m';
    if (overrides.containsKey(k1)) {
      tireSize = overrides[k1];
    } else if (overrides.containsKey('$b|$m')) {
      tireSize = overrides['$b|$m'];
    }

    if (tireSize != null && tireSize.isNotEmpty) {
      final nonNullTireSize = tireSize;
      setState(() {
        _tireSizes[serviceId] = nonNullTireSize;

        // Update controller if it exists
        if (_tireSizeControllers.containsKey(serviceId)) {
          _tireSizeControllers[serviceId]!.text = nonNullTireSize;
        }

        if (!commonTireSizes.contains(nonNullTireSize)) {
          _isManualSize[serviceId] = true;
        }
      });
    }
  }

  Future<void> _prefetchVehicleTire(Vehicle vehicle) async {
    String format(String v) {
      var s = v.trim();
      s = s.replaceAll(RegExp(r'\s*/\s*'), '/');
      s = s.replaceAll(RegExp(r'\s+'), ' ');
      s = s.replaceAllMapped(
        RegExp(r'(\d{2,3})/(\d{2})\s*R\s*(\d{2})'),
        (m) => '${m[1]}/${m[2]} R${m[3]}',
      );
      return s;
    }

    String clean(String? v) {
      if (v == null) return '';
      var s = v.replaceAll(RegExp(r'\[[^\]]*\]'), '');
      s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
      return s;
    }

    try {
      final ref = await _vehicleService.searchReference(
        make: clean(vehicle.make),
        model: clean(vehicle.model),
        variant: vehicle.variant != null && vehicle.variant!.trim().isNotEmpty
            ? clean(vehicle.variant)
            : null,
      );

      double pickupPrice = 0;
      if (ref != null && ref['pickup_drop_price'] != null) {
        pickupPrice = double.tryParse(ref['pickup_drop_price'].toString()) ?? 0;
      }

      setState(() {
        _pickupDropPrice = pickupPrice;
      });

      String? tireSize = (ref?['front_tyres'] ?? ref?['rear_tyres'])
          ?.toString();
      tireSize ??= vehicle.frontTyres ?? vehicle.rearTyres;
      if (tireSize != null && tireSize.isNotEmpty) {
        final formatted = format(tireSize);
        setState(() {
          _selectedVehicleOEMTire = formatted;
          for (final sid in _selectedServiceIds) {
            _tireSizes[sid] = formatted;
            if (!commonTireSizes.contains(formatted)) {
              _isManualSize[sid] = true;
            }
            if (_tireSizeControllers.containsKey(sid)) {
              _tireSizeControllers[sid]!.text = formatted;
            }
          }
        });
      }
    } catch (_) {}
  }

  static const List<String> commonTireSizes = [
    '145/70 R12',
    '155/80 R13',
    '165/80 R14',
    '175/65 R14',
    '185/65 R15',
    '195/60 R16',
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
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      await _socketService.init(context.read<AuthProvider>().user);
      _socketService.on('global:sync', _handleGlobalSync);
    });

    if (!kIsWeb) {
      _cashfreeGateway.setCallback(_handlePaymentSuccess, _handlePaymentError);
    }

    if (widget.initialCategory == 'Tyres' ||
        widget.initialCategory == 'Tyre & Battery') {
      _activeSubCategory = 'Tyres'; // Default to Tyres
    } else {
      _activeSubCategory = 'All';
    }

    // Check for arguments from NavigationProvider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkArguments();
      context.read<NavigationProvider>().addListener(_onNavChanged);
    });
  }

  void _onNavChanged() {
    if (!mounted) return;
    final nav = context.read<NavigationProvider>();
    final Map<String, int> tabMapping = {
      'Periodic': 0,
      'Essentials': 1,
      'Wash': 3,
      'Tyres': 4,
    };
    if (tabMapping[widget.initialCategory] == nav.selectedIndex) {
      _checkArguments();
    }
  }

  void _checkArguments() {
    if (!mounted) return;
    final nav = context.read<NavigationProvider>();
    if (nav.arguments != null && nav.arguments is ServiceItem) {
      final service = nav.arguments as ServiceItem;
      setState(() {
        _initialServiceId = service.id;
        _selectedServiceIds = [service.id];
        _currentStep = 0; // Start at vehicle selection step

        // Auto-set subcategory for Tyres flow
        if (widget.initialCategory == 'Tyres' ||
            widget.initialCategory == 'Tyre & Battery') {
          if (service.category?.toLowerCase().contains('battery') == true) {
            _activeSubCategory = 'Battery';
          } else {
            _activeSubCategory = 'Tyres';
          }
        }
      });
      nav.clearArguments();
    }
  }

  @override
  void dispose() {
    try {
      context.read<NavigationProvider>().removeListener(_onNavChanged);
    } catch (_) {}
    _socketService.off('global:sync', _handleGlobalSync);
    _notesController.dispose();
    for (final controller in _tireSizeControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _handlePaymentSuccess(String orderId) async {
    // Show a loading dialog while verifying
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final verifyData = {
        'cashfree_order_id': orderId,
        'tempBookingData': _currentTempBookingData,
      };

      final result = await _paymentService.verifyPayment(verifyData);

      if (mounted) {
        Navigator.pop(context); // Close loading dialog

        if (result['success'] == true || result['bookingId'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment successful! Booking created.'),
            ),
          );

          context.read<SocketService>().sendEvent('booking_created');

          context.read<NavigationProvider>().setTab(2);
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/customer',
            (route) => false,
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Payment verification failed: ${result['message']}',
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Verification error: $e')));
      }
    }
  }

  void _handlePaymentError(CFErrorResponse response, String orderId) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Payment failed: ${response.getMessage()}. Order: $orderId',
        ),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  void didUpdateWidget(BookServiceFlowPage oldWidget) {
    super.didUpdateWidget(oldWidget);
  }

  Future<void> _fetchInitialData({bool forceRefresh = false}) async {
    if (!mounted) return;

    // Only show full loading if we have no data yet
    final isFirstLoad = _vehicles.isEmpty && _allServices.isEmpty;
    if (isFirstLoad || forceRefresh) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final List<dynamic> results = await Future.wait([
        _vehicleService.listMyVehicles(forceRefresh: forceRefresh).catchError((
          e,
        ) {
          debugPrint('Error fetching vehicles: $e');
          return <Vehicle>[];
        }),
        _catalogService.listServices(forceRefresh: forceRefresh).catchError((
          e,
        ) {
          debugPrint('Error fetching services: $e');
          return <ServiceItem>[];
        }),
        _bookingService.getAvailableServicePincodes().catchError((e) {
          debugPrint('Error fetching available service pincodes: $e');
          return <String>[];
        }),
      ]);

      final List<Vehicle> vehicles = results[0] as List<Vehicle>;
      final List<ServiceItem> services = results[1] as List<ServiceItem>;
      final List<String> availablePincodes = results[2] as List<String>;

      if (mounted) {
        if (vehicles.isEmpty && services.isEmpty && forceRefresh) {
          // If both failed and it was a force refresh, show error
          setState(() {
            _error = 'Failed to load data. Please check your connection.';
            _loading = false;
          });
          return;
        }

        setState(() {
          _vehicles = List<Vehicle>.from(vehicles);
          _allServices = services;
          _availableServicePincodes = availablePincodes;
          _pincodesReady = true;
          _hasAttemptedFetch = true;
          _error =
              null; // Clear any previous errors if we got at least something

          if (_vehicles.isNotEmpty && _selectedVehicleId == null) {
            _selectedVehicleId = _vehicles.first.id;

            // Auto-fill tire size for the default selected vehicle
            final vehicle = _vehicles.first;
            _prefetchVehicleTire(vehicle);
            for (final serviceId in _selectedServiceIds) {
              _autoFillTireSize(serviceId, vehicle);
            }
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
        await _fetchSlotsForDate(_selectedDate);
        await _fetchCoupons();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
          _hasAttemptedFetch = true;
        });
      }
    }
  }

  final List<String> _steps = ['Vehicle', 'Service', 'Schedule', 'Confirm'];

  void _showSlotPicker(bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            height: MediaQuery.of(context).size.height * 0.5,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 20,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Column(
              children: [
                const SizedBox(height: 12),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white10 : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Select Time Slot',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : Colors.black,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            DateFormat('EEEE, MMMM d').format(_selectedDate),
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.white38 : Colors.black38,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: Icon(
                          Icons.close_rounded,
                          color: isDark ? Colors.white38 : Colors.black38,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: _availableSlots.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.event_busy_rounded,
                                color: isDark
                                    ? Colors.white10
                                    : Colors.grey.shade200,
                                size: 48,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No slots available for this date',
                                style: TextStyle(
                                  color: isDark
                                      ? Colors.white24
                                      : Colors.grey.shade400,
                                ),
                              ),
                            ],
                          ),
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                          child: Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: _availableSlots.map((slot) {
                              final isSelected = _selectedTimeSlot == slot;
                              return GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedTimeSlot = slot;
                                  });
                                  setModalState(() {});
                                  Future.delayed(
                                    const Duration(milliseconds: 150),
                                    () {
                                      if (context.mounted) {
                                        Navigator.pop(context);
                                      }
                                    },
                                  );
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 14,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primaryBlue
                                        : (isDark
                                              ? Colors.white.withValues(
                                                  alpha: 0.05,
                                                )
                                              : Colors.grey.shade100),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isSelected
                                          ? AppColors.primaryBlue
                                          : (isDark
                                                ? Colors.white.withValues(
                                                    alpha: 0.05,
                                                  )
                                                : Colors.grey.shade200),
                                      width: 1.5,
                                    ),
                                    boxShadow: [
                                      if (isSelected)
                                        BoxShadow(
                                          color: AppColors.primaryBlue
                                              .withValues(alpha: 0.3),
                                          blurRadius: 12,
                                          offset: const Offset(0, 6),
                                        ),
                                    ],
                                  ),
                                  child: Text(
                                    slot,
                                    style: TextStyle(
                                      color: isSelected
                                          ? Colors.white
                                          : (isDark
                                                ? Colors.white70
                                                : Colors.black87),
                                      fontWeight: isSelected
                                          ? FontWeight.w900
                                          : FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final currentIdx = nav.selectedIndex;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Check if this page's tab is active and if we should refresh
    final Map<String, int> tabMapping = {
      'Periodic': 0,
      'Essentials': 1,
      'Wash': 3,
      'Tyres': 4,
    };

    if (tabMapping[widget.initialCategory] == currentIdx) {
      // If we are on the active tab, and data is missing and we haven't tried fetching yet
      if ((_vehicles.isEmpty || _allServices.isEmpty) &&
          !_loading &&
          !_hasAttemptedFetch &&
          _error == null) {
        Future.microtask(() => _fetchInitialData());
      }
    }

    return PopScope(
      canPop: _currentStep == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _handleBack();
      },
      child: Scaffold(
        backgroundColor: isDark
            ? AppColors.backgroundPrimary
            : AppStyles.softBackground,
        appBar: AppBar(
          title: Text(
            widget.initialCategory == 'Tyres' ||
                    widget.initialCategory == 'Tyre & Battery'
                ? 'Book Tyre & Battery'
                : widget.initialCategory != null &&
                      widget.initialCategory != 'Services'
                ? 'Book ${widget.initialCategory}'
                : 'Book a Service',
            style: AppStyles.headingStyle.copyWith(
              color: isDark ? AppColors.textPrimary : const Color(0xFF222222),
            ),
          ),
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(
            color: isDark ? AppColors.textPrimary : Colors.black,
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : Stack(
                children: [
                  Positioned.fill(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 200),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          RepaintBoundary(
                            child: CustomStepper(
                              steps: _steps,
                              currentStep: _currentStep,
                            ),
                          ),
                          const SizedBox(height: 32),
                          RepaintBoundary(
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 250),
                              switchInCurve: Curves.easeOutCubic,
                              switchOutCurve: Curves.easeInCubic,
                              transitionBuilder:
                                  (Widget child, Animation<double> animation) {
                                    return FadeTransition(
                                      opacity: animation,
                                      child: SlideTransition(
                                        position: Tween<Offset>(
                                          begin: const Offset(0.05, 0),
                                          end: Offset.zero,
                                        ).animate(animation),
                                        child: child,
                                      ),
                                    );
                                  },
                              child: KeyedSubtree(
                                key: ValueKey(_currentStep),
                                child: _buildStepContent(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 120, // Adjusted for the new PillBottomBar height
                    left: 20,
                    right: 20,
                    child: RepaintBoundary(child: _buildBottomButtons()),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildBottomButtons() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      children: [
        if (_currentStep > 0) ...[
          Expanded(
            flex: 1,
            child: TextButton(
              onPressed: _handleBack,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                  side: BorderSide(
                    color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
                  ),
                ),
                backgroundColor: isDark
                    ? AppColors.backgroundSecondary
                    : Colors.white,
              ),
              child: Text(
                'Back',
                style: TextStyle(
                  color: isDark
                      ? AppColors.textPrimary
                      : const Color(0xFF555555),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          flex: 2,
          child: GradientButton(
            text: _currentStep == _steps.length - 1
                ? 'Confirm Booking'
                : 'Continue',
            icon: Icons.arrow_forward_rounded,
            onPressed: _handleNext,
          ),
        ),
      ],
    );
  }

  void _handleNext() {
    if (_currentStep == 2) {
      if (_selectedTimeSlot == null || _selectedAddress == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select slot and location')),
        );
        return;
      }
      if (!_isSelectedLocationAllowed) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Service booking is not enabled for this pincode. Please choose another location.',
            ),
          ),
        );
        return;
      }
    }
    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);
    } else {
      _submitBooking();
    }
  }

  void _handleBack() {
    if (_currentStep > 0) {
      setState(() {
        if (widget.initialCategory == 'Tyres' ||
            widget.initialCategory == 'Tyre & Battery') {
          _activeSubCategory = null;
          _selectedServiceIds = [];
        }
        _currentStep--;
      });
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
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primaryBlue, AppColors.primaryBlueDark],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: ElevatedButton(
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/add-vehicle',
                ).then((_) => _fetchInitialData()),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: AppColors.textPrimary,
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Select Vehicle',
              style: AppStyles.headingStyle.copyWith(fontSize: 18),
            ),
            TextButton.icon(
              onPressed: () => Navigator.pushNamed(
                context,
                '/add-vehicle',
              ).then((_) => _fetchInitialData()),
              icon: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppStyles.primaryBlue.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.add,
                  color: AppStyles.primaryBlue,
                  size: 14,
                ),
              ),
              label: const Text(
                'Add Another Vehicle',
                style: TextStyle(
                  color: AppStyles.primaryBlue,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ..._vehicles.map(
          (v) => VehicleCard(
            vehicle: v,
            isSelected: _selectedVehicleId == v.id,
            onTap: () {
              setState(() {
                _selectedVehicleId = v.id;
                for (final serviceId in _selectedServiceIds) {
                  _autoFillTireSize(serviceId, v);
                }
              });
              _prefetchVehicleTire(v);
            },
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
      // Keep this aligned with web app logic
      'Tyres': ['Tyre & Battery', 'Tyres', 'Battery'],
      'Essentials': ['Essentials', 'Insurance'],
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
                Text(
                  'Quick Service Selection',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.textMuted : Colors.grey.shade600,
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _initialServiceId = null),
                  child: const Text('Show all services'),
                ),
              ],
            ),
          ),

        // Category-specific tabs for Tyre & Battery
        if (widget.initialCategory == 'Tyres' ||
            widget.initialCategory == 'Tyre & Battery')
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (_activeSubCategory != 'Tyres') {
                        setState(() {
                          _activeSubCategory = 'Tyres';
                          _selectedServiceIds =
                              []; // Clear selection when switching
                        });
                      }
                    },
                    icon: const Icon(Icons.circle_outlined),
                    label: const Text('Tires'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _activeSubCategory == 'Tyres'
                          ? AppColors.primaryBlue
                          : (isDark
                                ? AppColors.backgroundSurface
                                : Colors.grey.shade100),
                      foregroundColor: _activeSubCategory == 'Tyres'
                          ? AppColors.textPrimary
                          : (isDark
                                ? AppColors.textSecondary
                                : Colors.grey.shade700),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (_activeSubCategory != 'Battery') {
                        setState(() {
                          _activeSubCategory = 'Battery';
                          _selectedServiceIds =
                              []; // Clear selection when switching
                        });
                      }
                    },
                    icon: const Icon(Icons.battery_charging_full),
                    label: const Text('Battery'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _activeSubCategory == 'Battery'
                          ? AppColors.primaryBlue
                          : (isDark
                                ? AppColors.backgroundSurface
                                : Colors.grey.shade100),
                      foregroundColor: _activeSubCategory == 'Battery'
                          ? AppColors.textPrimary
                          : (isDark
                                ? AppColors.textSecondary
                                : Colors.grey.shade700),
                    ),
                  ),
                ),
              ],
            ),
          ),

        if (_activeSubCategory == null &&
            (widget.initialCategory == 'Tyres' ||
                widget.initialCategory == 'Tyre & Battery'))
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
                style: BorderStyle.solid,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.touch_app_outlined,
                  size: 48,
                  color: isDark ? Colors.grey.shade700 : Colors.grey.shade400,
                ),
                const SizedBox(height: 16),
                Text(
                  'Please select a category',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Choose Tires or Battery to see available services',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 16),
        ...(() {
          // If we have initialCategory (tabbed view)
          if (widget.initialCategory != null) {
            List<ServiceItem> services;

            if (widget.initialCategory == 'Tyres' ||
                widget.initialCategory == 'Tyre & Battery') {
              services = _allServices.where((s) {
                final cat = s.category?.toLowerCase() ?? '';
                if (_activeSubCategory == 'Tyres') {
                  return cat.contains('tyre') || cat.contains('tire');
                } else if (_activeSubCategory == 'Battery') {
                  return cat.contains('battery');
                }
                return false;
              }).toList();
            } else {
              // Non-tyre categories: keep original category grouping behavior
              final filteredCategories = categoriesToDisplay;
              services = _allServices
                  .where((s) => filteredCategories.contains(s.category))
                  .toList();
            }

            if (_initialServiceId != null) {
              services = services
                  .where((s) => s.id == _initialServiceId)
                  .toList();
            }

            if (services.isEmpty) {
              return [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.search_off_outlined,
                        size: 48,
                        color: isDark
                            ? Colors.grey.shade700
                            : Colors.grey.shade400,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No services found',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Try selecting another category or check back later.',
                        textAlign: TextAlign.center,
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
              ];
            }

            return [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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

                                // Pre-fill tire size if vehicle is selected
                                if (_selectedVehicleId != null) {
                                  final vehicle = _vehicles.firstWhere(
                                    (v) => v.id == _selectedVehicleId,
                                    orElse: () => _vehicles.first,
                                  );
                                  if (_selectedVehicleOEMTire != null &&
                                      _selectedVehicleOEMTire!.isNotEmpty) {
                                    _tireSizes[service.id] =
                                        _selectedVehicleOEMTire!;
                                    if (!commonTireSizes.contains(
                                      _selectedVehicleOEMTire,
                                    )) {
                                      _isManualSize[service.id] = true;
                                    }
                                  }
                                  _autoFillTireSize(service.id, vehicle);
                                }
                              }
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.backgroundSecondary
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: selected
                                    ? AppColors.primaryBlue
                                    : isDark
                                    ? AppColors.borderColor
                                    : AppColors.borderColorLight,
                                width: selected ? 2 : 1,
                              ),
                              boxShadow: [
                                if (selected)
                                  BoxShadow(
                                    color: AppColors.primaryBlue.withAlpha(25),
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
                                        ? AppColors.backgroundSurface
                                        : Colors.grey.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                    image:
                                        (service.image != null &&
                                            service.image!.isNotEmpty)
                                        ? DecorationImage(
                                            image: NetworkImage(service.image!),
                                            fit: BoxFit.contain,
                                          )
                                        : null,
                                  ),
                                  child:
                                      (service.image == null ||
                                          service.image!.isEmpty)
                                      ? const Icon(
                                          Icons.build_circle,
                                          color: AppColors.primaryBlue,
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
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: isDark
                                              ? AppColors.textPrimary
                                              : AppColors.textPrimaryLight,
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
                                                  ? AppColors.textSecondary
                                                  : AppColors
                                                        .textSecondaryLight,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            '• Time: ${service.estimatedMinutes} mins',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: isDark
                                                  ? AppColors.textSecondary
                                                  : AppColors
                                                        .textSecondaryLight,
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
                                    color: AppColors.primaryBlue,
                                  )
                                else
                                  Icon(
                                    Icons.add_circle_outline,
                                    color: isDark
                                        ? AppColors.textMuted
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
                                    controller: _tireSizeControllers
                                        .putIfAbsent(
                                          service.id,
                                          () => TextEditingController(
                                            text: _tireSizes[service.id] ?? '',
                                          ),
                                        ),
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
              ),
            ];
          }

          // Fallback for when no initialCategory is provided (show all with headers)
          final filteredCategories = categoriesToDisplay;
          return filteredCategories.map((category) {
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

                              // Pre-fill tire size if vehicle is selected
                              if (_selectedVehicleId != null) {
                                final vehicle = _vehicles.firstWhere(
                                  (v) => v.id == _selectedVehicleId,
                                  orElse: () => _vehicles.first,
                                );
                                if (_selectedVehicleOEMTire != null &&
                                    _selectedVehicleOEMTire!.isNotEmpty) {
                                  _tireSizes[service.id] =
                                      _selectedVehicleOEMTire!;
                                  if (!commonTireSizes.contains(
                                    _selectedVehicleOEMTire,
                                  )) {
                                    _isManualSize[service.id] = true;
                                  }
                                  if (_tireSizeControllers.containsKey(
                                    service.id,
                                  )) {
                                    _tireSizeControllers[service.id]!.text =
                                        _selectedVehicleOEMTire!;
                                  }
                                }
                                _autoFillTireSize(service.id, vehicle);
                              }
                            }
                          });
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.backgroundSecondary
                                : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: selected
                                  ? AppColors.primaryBlue
                                  : isDark
                                  ? AppColors.borderColor
                                  : AppColors.borderColorLight,
                              width: selected ? 2 : 1,
                            ),
                            boxShadow: [
                              if (selected)
                                BoxShadow(
                                  color: AppColors.primaryBlue.withAlpha(25),
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
                                      ? AppColors.backgroundSurface
                                      : Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  image:
                                      (service.image != null &&
                                          service.image!.isNotEmpty)
                                      ? DecorationImage(
                                          image: NetworkImage(service.image!),
                                          fit: BoxFit.contain,
                                        )
                                      : null,
                                ),
                                child:
                                    (service.image == null ||
                                        service.image!.isEmpty)
                                    ? const Icon(
                                        Icons.build_circle,
                                        color: AppColors.primaryBlue,
                                      )
                                    : null,
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      service.name,
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: isDark
                                            ? AppColors.textPrimary
                                            : AppColors.textPrimaryLight,
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
                                                ? AppColors.textSecondary
                                                : AppColors.textSecondaryLight,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '• Time: ${service.estimatedMinutes} mins',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: isDark
                                                ? AppColors.textSecondary
                                                : AppColors.textSecondaryLight,
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
                                  color: AppColors.primaryBlue,
                                )
                              else
                                Icon(
                                  Icons.add_circle_outline,
                                  color: isDark
                                      ? AppColors.textMuted
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
                                  controller: _tireSizeControllers.putIfAbsent(
                                    service.id,
                                    () => TextEditingController(
                                      text: _tireSizes[service.id] ?? '',
                                    ),
                                  ),
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
                                            () => _tireSizes[service.id] = size,
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
          }).toList();
        })(),
      ],
    );
  }

  Widget _buildScheduleStep() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Location Section
        Text(
          'Service Location',
          style: AppStyles.headingStyle.copyWith(fontSize: 18),
        ),
        const SizedBox(height: 12),
        _buildLocationPickerContent(),

        const SizedBox(height: 24),

        Text(
          'Schedule & Location',
          style: AppStyles.headingStyle.copyWith(fontSize: 16),
        ),
        const SizedBox(height: 24),

        // Date & Time Selection Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundSecondary
                : AppColors.backgroundPrimaryLight,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [AppStyles.cardShadow],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.calendar_month_rounded,
                    color: AppStyles.primaryBlue,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Select Date & Time',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: isDark
                          ? AppColors.textPrimary
                          : const Color(0xFF1E293B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(
                            const Duration(days: 90),
                          ),
                        );
                        if (date != null) {
                          setState(() {
                            _selectedDate = date;
                            _selectedTimeSlot = null;
                          });
                          await _fetchSlotsForDate(date);
                        }
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 16,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.grey.shade900
                              : AppStyles.softBackground,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark
                                ? AppColors.borderColor
                                : Colors.grey.shade200,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Date', style: AppStyles.captionStyle),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(
                                  Icons.calendar_month_rounded,
                                  size: 14,
                                  color: isDark
                                      ? Colors.white38
                                      : Colors.black38,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  DateFormat(
                                    'EEE, MMM d',
                                  ).format(_selectedDate),
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: isDark
                                        ? AppColors.textPrimary
                                        : Colors.black,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () => _showSlotPicker(isDark),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 16,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.grey.shade900
                              : AppStyles.softBackground,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark
                                ? AppColors.borderColor
                                : Colors.grey.shade200,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Slot', style: AppStyles.captionStyle),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(
                                  Icons.access_time_rounded,
                                  size: 14,
                                  color: isDark
                                      ? Colors.white38
                                      : Colors.black38,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _selectedTimeSlot ?? 'Select slot',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14,
                                      color: isDark
                                          ? (_selectedTimeSlot != null
                                                ? AppColors.textPrimary
                                                : Colors.white38)
                                          : (_selectedTimeSlot != null
                                                ? Colors.black
                                                : Colors.black38),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
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

  Widget _buildLocationPickerContent() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark
        ? AppColors.textPrimary
        : AppColors.textPrimaryLight;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
                final pin = _extractPincode(addr.address);
                final isBlockedAddress =
                    _pincodesReady &&
                    (_availableServicePincodes.isEmpty ||
                        pin == null ||
                        !_availableServicePincodes.contains(pin));
                final selected = _selectedAddress == addr.address;
                return ChoiceChip(
                  label: Text(addr.label),
                  selected: selected && !isBlockedAddress,
                  selectedColor: AppStyles.primaryBlue.withValues(alpha: 0.2),
                  labelStyle: TextStyle(
                    color: isBlockedAddress
                        ? Colors.red
                        : (selected ? AppStyles.primaryBlue : textColor),
                    fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (v) {
                    if (v && !isBlockedAddress) {
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
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark
                  ? AppStyles.primaryBlue.withValues(alpha: 0.1)
                  : const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark
                    ? AppStyles.primaryBlue.withValues(alpha: 0.3)
                    : const Color(0xFFBFDBFE),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: AppStyles.primaryBlue),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _selectedAddress!,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark
                          ? AppColors.textPrimary
                          : const Color(0xFF1E40AF),
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _showCustomLocation = true),
                  child: const Text(
                    'Change',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
          if (!_isSelectedLocationAllowed)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _availableServicePincodes.isEmpty
                    ? 'Service is currently unavailable for this area.'
                    : (_extractPincode(_selectedAddress) == null
                          ? 'Address must include a valid 6-digit pincode.'
                          : 'Service booking is not enabled for this pincode.'),
                style: const TextStyle(color: Colors.red, fontSize: 12),
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
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.my_location),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _resolvingAddress == true
                ? 'Resolving address...'
                : (_selectedAddress ?? 'Tap on map to select location'),
            style: TextStyle(
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              fontSize: 12,
            ),
          ),
          if (_selectedAddress != null && !_isSelectedLocationAllowed)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _availableServicePincodes.isEmpty
                    ? 'Service is currently unavailable for this area.'
                    : (_extractPincode(_selectedAddress) == null
                          ? 'Address must include a valid 6-digit pincode.'
                          : 'Service booking is not enabled for this pincode.'),
                style: const TextStyle(color: Colors.red, fontSize: 12),
              ),
            ),
        ],
      ],
    );
  }

  Widget _buildConfirmStep() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Vehicle? selectedVehicle;
    if (_selectedVehicleId != null) {
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

    final isGeneralService = selectedServices.any((s) {
      final cat = s.category;
      final name = s.name.toLowerCase();
      return cat == 'Periodic' ||
          cat == 'Services' ||
          name.contains('general service');
    });

    final double baseTotal = selectedServices.fold<double>(
      0,
      (sum, item) => sum + item.price,
    );

    final double total = baseTotal + (isGeneralService ? _pickupDropPrice : 0);

    final totalTime = selectedServices.fold<num>(
      0,
      (sum, item) => sum + (item.estimatedMinutes ?? 0),
    );

    final isCarWash = selectedServices.any((s) {
      final cat = s.category;
      return cat == 'Car Wash' || cat == 'Wash' || cat == 'Detailing';
    });
    final isBatteryTire = selectedServices.any((s) {
      final cat = s.category;
      return cat == 'Battery' || cat == 'Tyres' || cat == 'Tyre & Battery';
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Confirm Booking',
          style: AppStyles.headingStyle.copyWith(fontSize: 18),
        ),
        const SizedBox(height: 24),

        // Summary Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundSecondary
                : AppColors.backgroundPrimaryLight,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [AppStyles.cardShadow],
          ),
          child: Column(
            children: [
              if (selectedVehicle != null)
                _buildSummaryRow(
                  'Vehicle',
                  '${selectedVehicle.make} ${selectedVehicle.model}',
                  Icons.directions_car_filled_rounded,
                  trailing: selectedVehicle.licensePlate.toUpperCase(),
                ),
              const Divider(height: 32),
              _buildSummaryRow(
                'Schedule',
                DateFormat('EEE, MMM d').format(_selectedDate),
                Icons.calendar_today_rounded,
                trailing: _selectedTimeSlot ?? 'Not selected',
              ),
              const Divider(height: 32),
              _buildSummaryRow(
                'Location',
                _selectedAddress ?? 'Not selected',
                Icons.location_on_rounded,
              ),
              if (_notesController.text.isNotEmpty) ...[
                const Divider(height: 32),
                _buildSummaryRow(
                  'Notes',
                  _notesController.text,
                  Icons.notes_rounded,
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Services List Card
        Text(
          'Selected Services',
          style: AppStyles.headingStyle.copyWith(fontSize: 16),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundSecondary
                : AppColors.backgroundPrimaryLight,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [AppStyles.cardShadow],
          ),
          child: Column(
            children: [
              ...selectedServices.map(
                (s) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          s.name,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ),
                      Text(
                        '₹${s.price.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
              if (isGeneralService && _pickupDropPrice > 0)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Text(
                          'Pickup & Drop Charges',
                          style: TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ),
                      Text(
                        '₹${_pickupDropPrice.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Total Amount',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'Estimated Time: $totalTime mins',
                        style: AppStyles.captionStyle,
                      ),
                    ],
                  ),
                  Text(
                    '₹${total.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              if (_appliedCoupon != null) ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Discount',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: Colors.green,
                      ),
                    ),
                    Text(
                      '-₹${(_appliedCoupon!['discountAmount'] ?? 0).toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Final Amount',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    Text(
                      '₹${(total - ((_appliedCoupon!['discountAmount'] ?? 0) as num).toDouble()).clamp(0, double.infinity).toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: AppStyles.primaryBlue,
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                      ),
                    ),
                  ],
                ),
              ] else ...[
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Final Amount',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    Text(
                      '₹${total.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: AppStyles.primaryBlue,
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Coupon Section
        if (_getSelectedServiceType() != 'General Services') ...[
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Apply Coupon',
              style: AppStyles.headingStyle.copyWith(fontSize: 16),
            ),
            if (_availableCoupons.isNotEmpty)
              TextButton(
                onPressed: () => Navigator.pushNamed(context, '/coupons'),
                child: const Text('View All'),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundSecondary
                : AppColors.backgroundPrimaryLight,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [AppStyles.cardShadow],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_loadingCoupons)
                const Center(child: CircularProgressIndicator())
              else if (_availableCoupons.isNotEmpty) ...[
                () {
                  final eligibleCoupons = _availableCoupons.where((c) {
                    final minRequired = (c['minOrderAmount'] ?? 0) as num;
                    return minRequired == 0 || total >= minRequired;
                  }).toList();

                  if (eligibleCoupons.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 10),
                      child: Text(
                        'No eligible coupons for this amount',
                        style: TextStyle(fontSize: 13, color: Colors.grey),
                      ),
                    );
                  }

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Available coupons:',
                        style: TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 140,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: eligibleCoupons.length,
                          itemBuilder: (context, index) {
                            final coupon = eligibleCoupons[index];
                            final isSelected =
                                _appliedCoupon?['_id'] == coupon['_id'];

                            return _buildCouponTicket(
                              coupon,
                              isSelected,
                              true, // Already filtered for min order
                              total,
                            );
                          },
                        ),
                      ),
                    ],
                  );
                }(),
                if (_appliedCoupon != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.green.withValues(alpha: 0.1)
                          : Colors.green.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.green.shade300,
                        width: 1.5,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.green.shade600,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.check,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _appliedCoupon!['code'],
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: Colors.green.shade700,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                                Text(
                                  'Coupon Applied',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.green.shade600,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        TextButton(
                          onPressed: _removeCoupon,
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.red,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            backgroundColor: Colors.red.withValues(alpha: 0.1),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'REMOVE',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ] else
                const Text(
                  'No coupons available at this time',
                  style: TextStyle(color: Colors.grey),
                ),
            ],
          ),
        ),
      ],

        if (isCarWash || isBatteryTire) ...[
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppStyles.primaryBlue.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppStyles.primaryBlue.withValues(alpha: 0.1),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: AppStyles.primaryBlue,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Payment is required to confirm this booking.',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark
                          ? Colors.blue.shade200
                          : const Color(0xFF1E40AF),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSummaryRow(
    String title,
    String value,
    IconData icon, {
    String? trailing,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppStyles.primaryBlue.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppStyles.primaryBlue, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppStyles.captionStyle),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isDark
                      ? AppColors.textPrimary
                      : const Color(0xFF1E293B),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (trailing != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              trailing,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
              ),
            ),
          ),
      ],
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
      if (!enabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enable location services')),
          );
        }
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied')),
          );
        }
        return;
      }

      // Check for precise location (Android 12+)
      if (!kIsWeb && Platform.isAndroid) {
        final accuracy = await Geolocator.getLocationAccuracy();
        if (accuracy == LocationAccuracyStatus.reduced) {
          debugPrint(
            'MobileApp: Reduced accuracy granted, requesting precise location',
          );
          permission = await Geolocator.requestPermission();
          if (permission == LocationPermission.denied ||
              permission == LocationPermission.deniedForever) {
            return;
          }
        }
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 15),
      );
      final latLng = LatLng(pos.latitude, pos.longitude);
      _mapController.move(latLng, 15);
      _setSelectedLocation(latLng);
    } catch (e) {
      debugPrint('Error getting current location: $e');
    } finally {
      if (mounted) {
        setState(() => _locating = false);
      }
    }
  }

  Future<void> _submitBooking() async {
    if (_selectedVehicleId == null ||
        _selectedServiceIds.isEmpty ||
        _selectedAddress == null ||
        _selectedTimeSlot == null) {
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

      final bookingDateTime = _composeBookingDateTime();
      if (bookingDateTime == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a valid slot')),
        );
        return;
      }
      if (_selectedLatLng == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a valid map location')),
        );
        return;
      }
      if (!_isSelectedLocationAllowed) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Service booking is not enabled for this pincode. Please choose another location.',
            ),
          ),
        );
        return;
      }

      final res = await _bookingService.createBooking(
        vehicleId: _selectedVehicleId!,
        serviceIds: _selectedServiceIds,
        date: bookingDateTime,
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
        final tempBookingId = res['tempBookingId'];
        if (tempBookingId != null) {
          // If a coupon is applied, update tempBookingData with coupon details
          if (_appliedCoupon != null) {
            final double baseTotal = (res['totalAmount'] as num).toDouble();
            final double discountAmount =
                (_appliedCoupon!['discountAmount'] ?? 0).toDouble();
            final double finalAmount = (baseTotal - discountAmount).clamp(
              0,
              double.infinity,
            );

            res['coupon'] = _appliedCoupon!['_id'];
            res['discountAmount'] = discountAmount;
            res['finalAmount'] = finalAmount;
            res['totalAmount'] =
                finalAmount; // Used as amount in cashfree create order
          }
          await _processPayment(tempBookingData: res);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Payment setup error: missing temporary booking id. Please try again.',
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Send a socket event to trigger a refresh on the dashboard
      context.read<SocketService>().sendEvent('booking_created');

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Booking confirmed! We have scheduled your service.'),
        ),
      );

      context.read<NavigationProvider>().setTab(2);
      // Navigate to dashboard/home after booking confirmation
      Navigator.pushNamedAndRemoveUntil(context, '/customer', (route) => false);
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

  Future<void> _processPayment({Map<String, dynamic>? tempBookingData}) async {
    // Show a loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final orderData = await _paymentService.createOrder(
        tempBookingData: tempBookingData,
      );

      if (mounted) {
        Navigator.pop(context); // Close loading dialog

        _currentTempBookingData = tempBookingData;
        final orderId =
            (orderData['orderId'] ??
                    orderData['order_id'] ??
                    orderData['id'] ??
                    '')
                .toString();
        final paymentSessionId = (orderData['paymentSessionId'] ?? '')
            .toString();
        final environment = (orderData['environment'] ?? 'sandbox').toString();

        if (orderId.isEmpty || paymentSessionId.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment setup failed. Please try again.'),
              backgroundColor: Colors.red,
            ),
          );
          return;
        }

        if (kIsWeb) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payments are only available on mobile'),
            ),
          );
        } else {
          final session = CFSessionBuilder()
              .setEnvironment(
                environment == 'production'
                    ? CFEnvironment.PRODUCTION
                    : CFEnvironment.SANDBOX,
              )
              .setOrderId(orderId)
              .setPaymentSessionId(paymentSessionId)
              .build();

          final cfPayment = CFWebCheckoutPaymentBuilder()
              .setSession(session)
              .build();

          _cashfreeGateway.doPayment(cfPayment);
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Payment initiation error: $e')));
      }
    }
  }

  Widget _buildCouponTicket(
    Map<String, dynamic> coupon,
    bool isSelected,
    bool meetsMinOrder,
    double total,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final code = coupon['code']?.toString() ?? '';
    final discount = '${coupon['discountPercentage']}% OFF';
    final minAmount = coupon['minOrderAmount'] ?? 0;

    final Color primaryColor = isSelected
        ? AppColors.primaryBlue
        : (meetsMinOrder ? const Color(0xFF6366F1) : Colors.grey);

    return Container(
      width: 260,
      margin: const EdgeInsets.only(right: 16, bottom: 8, top: 4),
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.backgroundSecondary
                  : AppColors.backgroundPrimaryLight,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: primaryColor.withValues(alpha: isSelected ? 0.3 : 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(
                color: isSelected
                    ? primaryColor
                    : (isDark ? Colors.white10 : Colors.grey.shade200),
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 60,
                  decoration: BoxDecoration(
                    color: primaryColor.withValues(alpha: 0.1),
                    borderRadius: const BorderRadius.horizontal(
                      left: Radius.circular(14),
                    ),
                  ),
                  child: RotatedBox(
                    quarterTurns: 3,
                    child: Center(
                      child: Text(
                        code,
                        style: TextStyle(
                          color: primaryColor,
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ),
                ),
                CustomPaint(
                  size: const Size(1, double.infinity),
                  painter: DashedLinePainter(
                    color: isDark ? Colors.white10 : Colors.grey.shade300,
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          discount,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Min. order ₹$minAmount',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.white38 : Colors.black38,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const Spacer(),
                        InkWell(
                          onTap: !meetsMinOrder || _validatingCoupon
                              ? null
                              : () => _applyCouponByCode(code, total),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              vertical: 8,
                              horizontal: 12,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.green
                                  : (meetsMinOrder
                                        ? primaryColor
                                        : (isDark
                                              ? Colors.white10
                                              : Colors.grey.shade100)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Text(
                                isSelected
                                    ? 'APPLIED'
                                    : (meetsMinOrder ? 'APPLY' : 'LOCKED'),
                                style: TextStyle(
                                  color: meetsMinOrder
                                      ? Colors.white
                                      : (isDark ? Colors.white24 : Colors.grey),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: 54,
            top: -10,
            child: Container(
              width: 12,
              height: 20,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.backgroundSurface
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          Positioned(
            left: 54,
            bottom: -10,
            child: Container(
              width: 12,
              height: 20,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.backgroundSurface
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class DashedLinePainter extends CustomPainter {
  final Color color;
  DashedLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    double dashHeight = 5, dashSpace = 3, startY = 10;
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    while (startY < size.height - 10) {
      canvas.drawLine(Offset(0, startY), Offset(0, startY + dashHeight), paint);
      startY += dashHeight + dashSpace;
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
