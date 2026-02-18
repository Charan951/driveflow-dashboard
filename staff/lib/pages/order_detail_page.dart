import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';

import '../core/env.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';
import '../services/tracking_service.dart';

class StaffOrderDetailPage extends StatefulWidget {
  const StaffOrderDetailPage({super.key});

  @override
  State<StaffOrderDetailPage> createState() => _StaffOrderDetailPageState();
}

class _StaffOrderDetailPageState extends State<StaffOrderDetailPage> {
  final BookingService _service = BookingService();
  final StaffTrackingService _tracking = StaffTrackingService.instance;

  BookingDetail? _booking;
  bool _loading = true;
  String? _error;
  bool _updatingStatus = false;
  bool _uploadingPhotos = false;
  List<File> _selectedPhotos = const [];
  final ImagePicker _picker = ImagePicker();

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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final booking = await _service.getBookingById(id);
      if (!mounted) return;
      setState(() {
        _booking = booking;
      });
      _tracking.setActiveBookingId(booking.id);
      if (booking.status == 'ACCEPTED' &&
          booking.location?.lat != null &&
          booking.location?.lng != null) {
        _tracking.setAutoStatusTarget(
          lat: booking.location!.lat,
          lng: booking.location!.lng,
          status: 'REACHED_CUSTOMER',
        );
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
      if (status == 'VEHICLE_PICKED' && booking.pickupRequired) {
        if (booking.prePickupPhotos.length < 4) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Please upload 4 vehicle photos before picking up the vehicle',
              ),
            ),
          );
          setState(() {
            _updatingStatus = false;
          });
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
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location not available to update status'),
            ),
          );
          setState(() {
            _updatingStatus = false;
          });
          return;
        }
        final distance = Geolocator.distanceBetween(
          staffLat,
          staffLng,
          targetLat,
          targetLng,
        );
        if (distance > StaffTrackingService.autoStatusDistanceMeters) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('You are too far from the location to update status'),
            ),
          );
          setState(() {
            _updatingStatus = false;
          });
          return;
        }
      }
      if (status == 'DELIVERED') {
        final controller = TextEditingController();
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
          setState(() {
            _updatingStatus = false;
          });
          return;
        }
        final otp = controller.text.trim();
        if (otp.isEmpty) {
          setState(() {
            _updatingStatus = false;
          });
          return;
        }
        await _service.verifyDeliveryOtp(booking.id, otp);
      }
      await _service.updateBookingStatus(booking.id, status);
      if (!mounted) return;
      setState(() {
        _booking = BookingDetail(
          id: booking.id,
          status: status,
          date: booking.date,
          location: booking.location,
          merchantLocation: booking.merchantLocation,
          pickupRequired: booking.pickupRequired,
          vehicleName: booking.vehicleName,
          prePickupPhotos: booking.prePickupPhotos,
        );
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Status updated to $status')));
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
        s == 'OUT_FOR_DELIVERY') {
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

  Future<void> _pickPrePickupPhotos() async {
    final booking = _booking;
    if (booking == null || _uploadingPhotos) return;
    if (!booking.pickupRequired) return;
    final images = await _picker.pickMultiImage(imageQuality: 80);
    if (!mounted) return;
    if (images.isEmpty) return;
    if (images.length != 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select exactly 4 photos')),
      );
      return;
    }
    final files = images.map((x) => File(x.path)).toList();
    setState(() {
      _selectedPhotos = files;
    });
    await _uploadPrePickupPhotos();
  }

  Future<void> _uploadPrePickupPhotos() async {
    final booking = _booking;
    if (booking == null || _uploadingPhotos) return;
    if (_selectedPhotos.length != 4) {
      return;
    }
    setState(() {
      _uploadingPhotos = true;
    });
    try {
      final uploaded = await _service.uploadPrePickupPhotos(
        booking.id,
        _selectedPhotos,
      );
      if (!mounted) return;
      final urls = uploaded;
      setState(() {
        _booking = BookingDetail(
          id: booking.id,
          status: booking.status,
          date: booking.date,
          location: booking.location,
          merchantLocation: booking.merchantLocation,
          pickupRequired: booking.pickupRequired,
          vehicleName: booking.vehicleName,
          prePickupPhotos: urls,
        );
        _selectedPhotos = const [];
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pre-pickup photos uploaded')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Failed to upload photos')));
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
    final booking = _booking;
    final staffPos = _staffLatLng();
    final destPos = booking != null ? _destinationLatLng(booking) : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          booking?.vehicleName ?? 'Order Detail',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        centerTitle: false,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Text(_error!))
          : booking == null
          ? const Center(child: Text('Booking not found'))
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                          booking.vehicleName ?? 'Booking',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              'Status: ${booking.status}',
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
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            if (booking.status == 'ASSIGNED')
                              FilledButton(
                                onPressed: _updatingStatus
                                    ? null
                                    : () => _updateStatus('ACCEPTED'),
                                child: const Text('Accept Job'),
                              )
                            else if (booking.status == 'ACCEPTED')
                              FilledButton(
                                onPressed: _updatingStatus
                                    ? null
                                    : () => _updateStatus('REACHED_CUSTOMER'),
                                child: const Text('Reached Location'),
                              )
                            else if (booking.status == 'REACHED_CUSTOMER')
                              Row(
                                children: [
                                  FilledButton(
                                    onPressed: _updatingStatus
                                        ? null
                                        : () => _updateStatus('VEHICLE_PICKED'),
                                    child: const Text('Vehicle Picked'),
                                  ),
                                  const SizedBox(width: 8),
                                  FilledButton.tonal(
                                    onPressed: _uploadingPhotos
                                        ? null
                                        : _pickPrePickupPhotos,
                                    child: Text(
                                      _uploadingPhotos
                                          ? 'Uploading...'
                                          : (booking.prePickupPhotos.length >= 4
                                                ? 'Photos Captured'
                                                : 'Capture 4 Photos'),
                                    ),
                                  ),
                                ],
                              )
                            else if (booking.status == 'VEHICLE_PICKED')
                              FilledButton(
                                onPressed: _updatingStatus
                                    ? null
                                    : () => _updateStatus('REACHED_MERCHANT'),
                                child: const Text('Reached Garage'),
                              )
                            else if (booking.status == 'REACHED_MERCHANT')
                              Text(
                                'Waiting for handover from merchant',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFF6B7280),
                                ),
                              )
                            else if (booking.status == 'SERVICE_COMPLETED')
                              FilledButton(
                                onPressed: _updatingStatus
                                    ? null
                                    : () => _updateStatus('OUT_FOR_DELIVERY'),
                                child: const Text('Out for Delivery'),
                              )
                            else if (booking.status == 'OUT_FOR_DELIVERY')
                              FilledButton(
                                onPressed: _updatingStatus
                                    ? null
                                    : () => _updateStatus('DELIVERED'),
                                child: const Text('Mark Delivered'),
                              ),
                            const Spacer(),
                            FilledButton.icon(
                              onPressed: () => _openDirections(booking),
                              icon: const Icon(Icons.directions),
                              label: const Text('Get Directions'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: DecoratedBox(
                        decoration: const BoxDecoration(
                          color: Color(0xFFF3F4F6),
                        ),
                        child: FlutterMap(
                          options: MapOptions(
                            initialCenter: _initialCenter(booking),
                            initialZoom: 13,
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: Env.mapTileUrlTemplate,
                              subdomains: Env.mapTileSubdomains,
                              userAgentPackageName: 'com.example.staff',
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
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
