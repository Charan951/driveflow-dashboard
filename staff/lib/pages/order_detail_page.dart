import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../core/env.dart';
import '../core/api_client.dart';
import '../core/storage.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';
import '../services/tracking_service.dart';
import '../services/socket_service.dart';
import 'chat_page.dart';

class StaffOrderDetailPage extends StatefulWidget {
  const StaffOrderDetailPage({super.key});

  @override
  State<StaffOrderDetailPage> createState() => _StaffOrderDetailPageState();
}

class _StaffOrderDetailPageState extends State<StaffOrderDetailPage> {
  final BookingService _service = BookingService();
  final StaffTrackingService _tracking = StaffTrackingService.instance;
  final SocketService _socketService = SocketService();
  final MapController _mapController = MapController();

  BookingDetail? _booking;
  bool _loading = true;
  String? _error;
  bool _updatingStatus = false;
  bool _uploadingPhotos = false;
  bool _isMapExpanded = false;
  bool _mapReady = false;
  List<XFile> _selectedPhotos = const [];
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _socketService.addListener(_onSocketUpdate);
    _tracking.info.addListener(_onTrackingUpdate);
  }

  @override
  void dispose() {
    if (_booking != null) {
      _socketService.leaveRoom('booking_${_booking!.id}');
    }
    _socketService.removeListener(_onSocketUpdate);
    _tracking.info.removeListener(_onTrackingUpdate);
    super.dispose();
  }

  void _onTrackingUpdate() {
    final info = _tracking.info.value;
    if (info.lat != null && info.lng != null && mounted && _mapReady) {
      try {
        _mapController.move(LatLng(info.lat!, info.lng!), 16.0);
      } catch (e) {
        debugPrint('MapController.move failed in StaffOrderDetailPage: $e');
      }
    }
  }

  void _onSocketUpdate() {
    final event = _socketService.value;
    if (event == null) return;

    if (event.startsWith('booking_updated') ||
        event.startsWith('booking_cancelled') ||
        event.startsWith('new_approval') ||
        event.startsWith('notification') ||
        event.startsWith('sync:booking:updated') ||
        event.startsWith('sync:approval:updated')) {
      if (_loading || _booking == null) return;
      _load(_booking!.id);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    final id = args?.toString();
    if (_booking == null && _loading) {
      if (id == null || id.isEmpty) {
        setState(() {
          _loading = false;
          _error = 'Missing booking id';
        });
      } else {
        _load(id);
      }
    }
  }

  Future<void> _load(String id) async {
    // Only show full loading if we don't have a booking yet
    if (_booking == null) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final booking = await _service.getBookingById(id);
      if (!mounted) return;
      setState(() {
        _booking = booking;
      });
      _socketService.joinRoom('booking_$id');
      _tracking.setActiveBookingId(booking.id);

      // Automatic status target logic based on specialized flows
      final isCarWash = booking.carWash?.isCarWashService == true;
      final isBatteryTire = booking.batteryTire?.isBatteryTireService == true;

      if (isBatteryTire) {
        if (booking.status == 'ASSIGNED' &&
            booking.merchantLocation?.lat != null &&
            booking.merchantLocation?.lng != null) {
          _tracking.setAutoStatusTarget(
            lat: booking.merchantLocation!.lat,
            lng: booking.merchantLocation!.lng,
            status: 'STAFF_REACHED_MERCHANT',
          );
        } else if (booking.status == 'PICKUP_BATTERY_TIRE' &&
            booking.location?.lat != null &&
            booking.location?.lng != null) {
          _tracking.setAutoStatusTarget(
            lat: booking.location!.lat,
            lng: booking.location!.lng,
            status: 'REACHED_CUSTOMER',
          );
        } else {
          _tracking.setAutoStatusTarget(lat: null, lng: null, status: null);
        }
      } else if (isCarWash) {
        if (booking.status == 'ASSIGNED' &&
            booking.location?.lat != null &&
            booking.location?.lng != null) {
          _tracking.setAutoStatusTarget(
            lat: booking.location!.lat,
            lng: booking.location!.lng,
            status: 'REACHED_CUSTOMER',
          );
        } else {
          _tracking.setAutoStatusTarget(lat: null, lng: null, status: null);
        }
      } else {
        // Standard pickup flow
        if (booking.status == 'ACCEPTED' || booking.status == 'ASSIGNED') {
          if (booking.location?.lat != null && booking.location?.lng != null) {
            _tracking.setAutoStatusTarget(
              lat: booking.location!.lat,
              lng: booking.location!.lng,
              status: 'REACHED_CUSTOMER',
            );
          }
        } else if (booking.status == 'VEHICLE_PICKED' &&
            booking.merchantLocation?.lat != null &&
            booking.merchantLocation?.lng != null) {
          _tracking.setAutoStatusTarget(
            lat: booking.merchantLocation!.lat,
            lng: booking.merchantLocation!.lng,
            status: 'REACHED_MERCHANT',
          );
        } else {
          _tracking.setAutoStatusTarget(lat: null, lng: null, status: null);
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load booking';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _updateStatus(String status) async {
    final booking = _booking;
    if (booking == null || _updatingStatus) return;
    setState(() {
      _updatingStatus = true;
    });
    try {
      if (status == 'VEHICLE_PICKED') {
        if (booking.prePickupPhotos.length < 4) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Please upload 4 vehicle photos before picking up the vehicle',
                ),
              ),
            );
          }
          if (mounted) {
            setState(() {
              _updatingStatus = false;
            });
          }
          return;
        }
      }
      if (status == 'REACHED_CUSTOMER' ||
          status == 'REACHED_MERCHANT' ||
          status == 'DELIVERED') {
        final info = _tracking.info.value;
        final staffLat = info.lat;
        final staffLng = info.lng;
        BookingLocation? destLoc;
        if (status == 'REACHED_MERCHANT') {
          destLoc = booking.merchantLocation ?? booking.location;
        } else {
          destLoc = booking.location;
        }
        final targetLat = destLoc?.lat;
        final targetLng = destLoc?.lng;
        if (staffLat == null ||
            staffLng == null ||
            targetLat == null ||
            targetLng == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Location not available to update status'),
              ),
            );
          }
          if (mounted) {
            setState(() {
              _updatingStatus = false;
            });
          }
          return;
        }
        final distance = Geolocator.distanceBetween(
          staffLat,
          staffLng,
          targetLat,
          targetLng,
        );
        if (distance > StaffTrackingService.autoStatusDistanceMeters) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'You are too far from the location to update status',
                ),
              ),
            );
          }
          if (mounted) {
            setState(() {
              _updatingStatus = false;
            });
          }
          return;
        }
      }
      if (status == 'DELIVERED') {
        final controller = TextEditingController();
        if (!mounted) return;
        final ok = await showDialog<bool>(
          context: context,
          builder: (context) {
            return AlertDialog(
              title: const Text('Delivery OTP'),
              content: TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Enter OTP'),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Verify'),
                ),
              ],
            );
          },
        );
        if (ok != true) {
          if (mounted) {
            setState(() {
              _updatingStatus = false;
            });
          }
          return;
        }
        final otp = controller.text.trim();
        if (otp.isEmpty) {
          if (mounted) {
            setState(() {
              _updatingStatus = false;
            });
          }
          return;
        }
        await _service.verifyDeliveryOtp(booking.id, otp);
      }
      if (status == 'OUT_FOR_DELIVERY') {
        if (booking.paymentStatus != 'paid') {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Customer payment is pending. Please wait for payment before picking up the vehicle.',
                ),
              ),
            );
          }
          if (mounted) {
            setState(() {
              _updatingStatus = false;
            });
          }
          return;
        }
      }
      await _service.updateBookingStatus(booking.id, status);
      await _load(
        booking.id,
      ); // Reload to get full updated object with all fields

      if (['CAR_WASH_STARTED', 'INSTALLATION'].contains(status)) {
        _showChatDialog(booking);
      }
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Status updated to $status')));
      }
      if (status == 'ACCEPTED' ||
          status == 'REACHED_CUSTOMER' ||
          status == 'VEHICLE_PICKED' ||
          status == 'OUT_FOR_DELIVERY') {
        _tracking.setActiveBookingId(booking.id);
      }
      if (status == 'ACCEPTED' &&
          booking.location?.lat != null &&
          booking.location?.lng != null) {
        _tracking.setAutoStatusTarget(
          lat: booking.location!.lat,
          lng: booking.location!.lng,
          status: 'REACHED_CUSTOMER',
        );
      } else if (status == 'VEHICLE_PICKED' &&
          booking.merchantLocation?.lat != null &&
          booking.merchantLocation?.lng != null) {
        _tracking.setAutoStatusTarget(
          lat: booking.merchantLocation!.lat,
          lng: booking.merchantLocation!.lng,
          status: 'REACHED_MERCHANT',
        );
      } else {
        _tracking.setAutoStatusTarget(lat: null, lng: null, status: null);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to update status')));
    } finally {
      if (mounted) {
        setState(() {
          _updatingStatus = false;
        });
      }
    }
  }

  LatLng? _staffLatLng() {
    final info = _tracking.info.value;
    final lat = info.lat;
    final lng = info.lng;
    if (lat == null || lng == null) return null;
    return LatLng(lat, lng);
  }

  LatLng? _destinationLatLng(BookingDetail booking) {
    BookingLocation? loc = booking.location;
    final s = booking.status.toUpperCase();
    if (s == 'VEHICLE_PICKED' ||
        s == 'REACHED_MERCHANT' ||
        s == 'VEHICLE_AT_MERCHANT' ||
        s == 'SERVICE_STARTED' ||
        s == 'SERVICE_COMPLETED') {
      loc = booking.merchantLocation ?? booking.location;
    }
    final lat = loc?.lat;
    final lng = loc?.lng;
    if (lat == null || lng == null) return null;
    return LatLng(lat, lng);
  }

  LatLng _initialCenter(BookingDetail? booking) {
    final staff = _staffLatLng();
    if (staff != null) return staff;
    if (booking != null) {
      final dest = _destinationLatLng(booking);
      if (dest != null) return dest;
    }
    return LatLng(20.5937, 78.9629);
  }

  Future<void> _capturePrePickupPhoto() async {
    final booking = _booking;
    if (booking == null || _uploadingPhotos) return;
    if (!booking.pickupRequired) return;
    const maxPhotos = 4;
    final existingCount = booking.prePickupPhotos.length;
    final remaining = maxPhotos - existingCount;
    if (remaining <= 0) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You already captured 4 photos')),
      );
      return;
    }
    final image = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 50,
    );
    if (!mounted || image == null) return;
    setState(() {
      _selectedPhotos = [image];
    });
    await _uploadPrePickupPhotos();
  }

  Future<void> _showPrePickupPhotoOptions() async {
    final booking = _booking;
    if (booking == null || _uploadingPhotos) return;
    if (!booking.pickupRequired) return;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Take Photo'),
                onTap: () => Navigator.of(context).pop(ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Choose from Gallery'),
                onTap: () => Navigator.of(context).pop(ImageSource.gallery),
              ),
            ],
          ),
        );
      },
    );
    if (source == null) return;
    if (source == ImageSource.camera) {
      await _capturePrePickupPhoto();
    } else {
      await _pickPrePickupPhotos();
    }
  }

  Future<void> _pickPrePickupPhotos() async {
    final booking = _booking;
    if (booking == null || _uploadingPhotos) return;
    if (!booking.pickupRequired) return;
    const maxPhotos = 4;
    final existingCount = booking.prePickupPhotos.length;
    final remaining = maxPhotos - existingCount;
    if (remaining <= 0) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You already captured 4 photos')),
      );
      return;
    }
    final images = await _picker.pickMultiImage(
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 50,
    );
    if (!mounted) return;
    if (images.isEmpty) return;
    if (images.length > remaining) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'You can add only $remaining more photo(s) for this booking',
          ),
        ),
      );
    }
    final files = images.take(remaining).toList();
    setState(() {
      _selectedPhotos = files;
    });
    await _uploadPrePickupPhotos();
  }

  Future<void> _uploadPrePickupPhotos() async {
    final booking = _booking;
    if (booking == null || _uploadingPhotos) return;
    if (_selectedPhotos.isEmpty) {
      return;
    }
    setState(() {
      _uploadingPhotos = true;
    });
    try {
      final uploaded = await _service.uploadPrePickupPhotos(
        booking.id,
        _selectedPhotos,
        existing: booking.prePickupPhotos,
      );
      if (!mounted) return;
      final urls = uploaded;
      setState(() {
        _booking = BookingDetail(
          id: booking.id,
          orderNumber: booking.orderNumber,
          status: booking.status,
          date: booking.date,
          location: booking.location,
          merchantLocation: booking.merchantLocation,
          pickupRequired: booking.pickupRequired,
          vehicleName: booking.vehicleName,
          prePickupPhotos: urls,
          paymentStatus: booking.paymentStatus,
          totalAmount: booking.totalAmount,
          inspectionCompletedAt: booking.inspectionCompletedAt,
          qcCompletedAt: booking.qcCompletedAt,
        );
        _selectedPhotos = const [];
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pre-pickup photos uploaded')),
      );
    } catch (e) {
      if (!mounted) return;
      String message = 'Failed to upload photos';
      if (e is ApiException && e.message.isNotEmpty) {
        message = e.message;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) {
        setState(() {
          _uploadingPhotos = false;
        });
      }
    }
  }

  Future<void> _openDirections(BookingDetail booking) async {
    final dest = _destinationLatLng(booking);
    if (dest == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Destination location not available')),
      );
      return;
    }
    final uri = Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': '${dest.latitude},${dest.longitude}',
      'travelmode': 'driving',
    });
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Could not open maps')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Details')),
        body: Center(child: Text(_error!)),
      );
    }
    final booking = _booking;
    if (booking == null) {
      return const Scaffold(body: Center(child: Text('Order not found')));
    }

    final String orderNum =
        booking.orderNumber?.toString() ??
        booking.id.substring(booking.id.length - 6).toUpperCase();

    final staffPos = _staffLatLng();
    final destPos = _destinationLatLng(booking);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order #$orderNum',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            Row(
              children: [
                Text(
                  DateFormat(
                    'dd MMM yyyy',
                  ).format(DateTime.parse(booking.date)),
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(width: 8),
                const Text(
                  '•',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(width: 8),
                Text(
                  BookingDetail.getStatusLabel(
                    booking.status,
                    services: booking.services,
                  ),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF7C3AED),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: booking == null
          ? const SizedBox.shrink()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatusControl(booking),
                  const SizedBox(height: 16),
                  _buildStatusTimeline(booking),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${booking.orderNumber ?? booking.id}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF374151),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          booking.vehicleName ?? 'Booking',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              'Status: ${BookingDetail.getStatusLabel(booking.status, services: booking.services)}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: const Color(0xFF2563EB),
                              ),
                            ),
                            if (booking.pickupRequired) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: booking.prePickupPhotos.length >= 4
                                        ? const Color(0xFF16A34A)
                                        : const Color(0xFFF59E0B),
                                  ),
                                  color: booking.prePickupPhotos.length >= 4
                                      ? const Color(0xFFBBF7D0)
                                      : const Color(0xFFFEF3C7),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      booking.prePickupPhotos.length >= 4
                                          ? Icons.check_circle
                                          : Icons.warning_amber_rounded,
                                      size: 14,
                                      color: booking.prePickupPhotos.length >= 4
                                          ? const Color(0xFF15803D)
                                          : const Color(0xFFB45309),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      booking.prePickupPhotos.length >= 4
                                          ? '4/4 photos'
                                          : '${booking.prePickupPhotos.length}/4 photos',
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            fontSize: 11,
                                            color:
                                                booking
                                                        .prePickupPhotos
                                                        .length >=
                                                    4
                                                ? const Color(0xFF166534)
                                                : const Color(0xFF92400E),
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                        if (booking.location?.address != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            booking.location!.address!,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: _isMapExpanded
                        ? Alignment.center
                        : Alignment.centerLeft,
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _isMapExpanded = !_isMapExpanded;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        height: _isMapExpanded ? 450 : 120,
                        width: _isMapExpanded ? double.infinity : 200,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(24),
                          child: Stack(
                            children: [
                              DecoratedBox(
                                decoration: const BoxDecoration(
                                  color: Color(0xFFF3F4F6),
                                ),
                                child: FlutterMap(
                                  mapController: _mapController,
                                  options: MapOptions(
                                    initialCenter: _initialCenter(booking),
                                    initialZoom: 16,
                                    onMapReady: () {
                                      setState(() => _mapReady = true);
                                    },
                                  ),
                                  children: [
                                    TileLayer(
                                      urlTemplate: Env.mapTileUrlTemplate,
                                      userAgentPackageName: Env.userAgent,
                                      subdomains: Env.mapTileSubdomains,
                                    ),
                                    if (staffPos != null || destPos != null)
                                      MarkerLayer(
                                        markers: [
                                          if (destPos != null)
                                            Marker(
                                              point: destPos,
                                              width: 40,
                                              height: 40,
                                              child: const Icon(
                                                Icons.location_pin,
                                                size: 36,
                                                color: Color(0xFFDC2626),
                                              ),
                                            ),
                                          if (staffPos != null)
                                            Marker(
                                              point: staffPos,
                                              width: 40,
                                              height: 40,
                                              child: Container(
                                                decoration: BoxDecoration(
                                                  color: const Color(
                                                    0xFF2563EB,
                                                  ).withValues(alpha: 0.15),
                                                  shape: BoxShape.circle,
                                                ),
                                                child: const Icon(
                                                  Icons.directions_car_filled,
                                                  color: Color(0xFF2563EB),
                                                  size: 24,
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                  ],
                                ),
                              ),
                              Positioned(
                                top: 12,
                                right: 12,
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.1,
                                        ),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Icon(
                                    _isMapExpanded
                                        ? Icons.fullscreen_exit
                                        : Icons.fullscreen,
                                    size: 20,
                                    color: const Color(0xFF374151),
                                  ),
                                ),
                              ),
                              if (!_isMapExpanded)
                                Positioned(
                                  bottom: 12,
                                  left: 0,
                                  right: 0,
                                  child: Center(
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.black.withValues(
                                          alpha: 0.6,
                                        ),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: const Text(
                                        'Tap to expand',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
      floatingActionButton:
          _booking != null &&
              [
                'ASSIGNED',
                'ACCEPTED',
                'REACHED_CUSTOMER',
                'VEHICLE_PICKED',
                'REACHED_MERCHANT',
                'SERVICE_STARTED',
                'CAR_WASH_STARTED',
                'INSTALLATION',
                'On Hold',
                'SERVICE_COMPLETED',
                'OUT_FOR_DELIVERY',
                'STAFF_REACHED_MERCHANT',
                'PICKUP_BATTERY_TIRE',
                'DELIVERY',
              ].contains(_booking!.status)
          ? FloatingActionButton(
              onPressed: () => _showChatDialog(_booking!),
              backgroundColor: const Color(0xFF7C3AED),
              child: const Icon(Icons.chat_bubble, color: Colors.white),
            )
          : null,
    );
  }

  Widget _buildStatusControl(BookingDetail booking) {
    final isCarWash = booking.carWash?.isCarWashService == true;
    final isBatteryTire = booking.batteryTire?.isBatteryTireService == true;
    final isEssentials =
        booking.services?.any(
          (s) =>
              s['category']?.toString().toLowerCase().contains('essentials') ??
              false,
        ) ??
        false;

    List<Widget> actions = [];

    if (isBatteryTire) {
      if (booking.status == 'ASSIGNED') {
        actions.add(
          _statusButton('STAFF_REACHED_MERCHANT', 'Reached Merchant'),
        );
      } else if (booking.status == 'STAFF_REACHED_MERCHANT') {
        actions.add(_statusButton('PICKUP_BATTERY_TIRE', 'Pickup Part'));
      } else if (booking.status == 'PICKUP_BATTERY_TIRE') {
        actions.add(_statusButton('REACHED_CUSTOMER', 'Reached Customer'));
      } else if (booking.status == 'REACHED_CUSTOMER') {
        actions.add(_statusButton('INSTALLATION', 'Start Installation'));
      } else if (booking.status == 'INSTALLATION') {
        actions.add(_statusButton('DELIVERY', 'Out for Delivery'));
      } else if (booking.status == 'DELIVERY') {
        actions.add(_statusButton('COMPLETED', 'Mark Completed'));
      }
    } else if (isCarWash) {
      if (booking.status == 'ASSIGNED' || booking.status == 'ACCEPTED') {
        actions.add(_statusButton('REACHED_CUSTOMER', 'Reached Customer'));
      } else if (booking.status == 'REACHED_CUSTOMER') {
        actions.add(
          _statusButton(
            'CAR_WASH_STARTED',
            isEssentials ? 'Start Service' : 'Start Car Wash',
          ),
        );
      } else if (booking.status == 'CAR_WASH_STARTED') {
        actions.add(
          _statusButton(
            'CAR_WASH_COMPLETED',
            isEssentials ? 'Complete Service' : 'Complete Car Wash',
          ),
        );
      } else if (booking.status == 'CAR_WASH_COMPLETED') {
        actions.add(_statusButton('DELIVERED', 'Mark Delivered'));
      }
    } else {
      if (booking.status == 'ASSIGNED' || booking.status == 'ACCEPTED') {
        actions.add(_statusButton('REACHED_CUSTOMER', 'Reached Customer'));
      } else if (booking.status == 'REACHED_CUSTOMER') {
        actions.add(_statusButton('VEHICLE_PICKED', 'Vehicle Picked'));
        actions.add(const SizedBox(width: 12));
        actions.add(_photoUploadButton(booking));
      } else if (booking.status == 'VEHICLE_PICKED') {
        actions.add(_statusButton('REACHED_MERCHANT', 'Reached Garage'));
      } else if (booking.status == 'SERVICE_COMPLETED') {
        actions.add(_statusButton('OUT_FOR_DELIVERY', 'Out for Delivery'));
      } else if (booking.status == 'OUT_FOR_DELIVERY') {
        actions.add(_statusButton('DELIVERED', 'Mark Delivered'));
      }
    }

    // Always add directions button if it makes sense for current status
    final canShowDirections =
        booking.status != 'DELIVERED' &&
        booking.status != 'COMPLETED' &&
        booking.status != 'CAR_WASH_COMPLETED' &&
        booking.status != 'SERVICE_COMPLETED';

    if (actions.isEmpty && !canShowDirections) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (actions.isNotEmpty)
            Row(
              children: [
                ...actions.map((w) => w is SizedBox ? w : Expanded(child: w)),
              ],
            ),
          if (canShowDirections && actions.isNotEmpty)
            const SizedBox(height: 12),
          if (canShowDirections)
            SizedBox(width: double.infinity, child: _directionsButton(booking)),
        ],
      ),
    );
  }

  Widget _buildStatusTimeline(BookingDetail booking) {
    final bool isBattery = booking.batteryTire?.isBatteryTireService == true;
    final bool isCarWash = booking.carWash?.isCarWashService == true;

    List<String> flow = [
      'CREATED',
      'ASSIGNED',
      'REACHED_CUSTOMER',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];

    if (isCarWash) {
      flow = [
        'CREATED',
        'ASSIGNED',
        'REACHED_CUSTOMER',
        'CAR_WASH_STARTED',
        'CAR_WASH_COMPLETED',
        'DELIVERED',
      ];
    } else if (isBattery) {
      flow = [
        'CREATED',
        'ASSIGNED',
        'STAFF_REACHED_MERCHANT',
        'PICKUP_BATTERY_TIRE',
        'REACHED_CUSTOMER',
        'INSTALLATION',
        'DELIVERY',
        'COMPLETED',
      ];
    }

    final int currentIndex = flow.indexOf(booking.status.toUpperCase());

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.show_chart, size: 20, color: Color(0xFF7C3AED)),
              const SizedBox(width: 8),
              const Text(
                'Status & Workflow',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'STEP ${currentIndex + 1}/${flow.length}',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: flow.asMap().entries.map((entry) {
                final int index = entry.key;
                final String status = entry.value;
                final bool isCompleted = index <= currentIndex;
                final bool isActive = index == currentIndex;
                final bool isLast = index == flow.length - 1;

                return Row(
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? const Color(0xFF10B981)
                                : (isActive
                                      ? const Color(0xFF7C3AED)
                                      : const Color(0xFFF3F4F6)),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isActive
                                  ? const Color(
                                      0xFF7C3AED,
                                    ).withValues(alpha: 0.2)
                                  : Colors.transparent,
                              width: 4,
                            ),
                          ),
                          child: Center(
                            child: isCompleted
                                ? const Icon(
                                    Icons.check,
                                    size: 16,
                                    color: Colors.white,
                                  )
                                : Text(
                                    '${index + 1}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: isActive
                                          ? Colors.white
                                          : const Color(0xFF9CA3AF),
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: 80,
                          child: Text(
                            BookingDetail.getStatusLabel(
                              status,
                              services: _booking?.services,
                            ),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: isActive
                                  ? FontWeight.bold
                                  : FontWeight.w500,
                              color: isCompleted || isActive
                                  ? const Color(0xFF111827)
                                  : const Color(0xFF9CA3AF),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (!isLast)
                      Container(
                        width: 40,
                        height: 2,
                        margin: const EdgeInsets.only(bottom: 24),
                        color: isCompleted
                            ? const Color(0xFF10B981)
                            : const Color(0xFFE5E7EB),
                      ),
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusButton(String status, String label) {
    return SizedBox(
      height: 54,
      child: FilledButton(
        onPressed: _updatingStatus ? null : () => _updateStatus(status),
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFF7C3AED),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: _updatingStatus
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
      ),
    );
  }

  Widget _photoUploadButton(BookingDetail booking) {
    return SizedBox(
      height: 54,
      child: FilledButton.tonal(
        onPressed: _uploadingPhotos ? null : _showPrePickupPhotoOptions,
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFFF5F3FF),
          foregroundColor: const Color(0xFF7C3AED),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          side: const BorderSide(color: Color(0xFFEDE9FE), width: 1.5),
        ),
        child: _uploadingPhotos
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF7C3AED),
                ),
              )
            : Text(
                booking.prePickupPhotos.length >= 4
                    ? 'Photos Done'
                    : 'Capture 4 Photos',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _directionsButton(BookingDetail booking) {
    return SizedBox(
      height: 50,
      child: FilledButton.icon(
        onPressed: () => _openDirections(booking),
        icon: const Icon(Icons.directions_outlined, size: 22),
        label: const Text(
          'Get Directions',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFF1E293B),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
      ),
    );
  }

  void _showChatDialog(BookingDetail booking) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => StaffChatPage(
          bookingId: booking.id,
          orderNumber:
              booking.orderNumber?.toString() ??
              booking.id.substring(booking.id.length - 6).toUpperCase(),
        ),
      ),
    );
  }
}
