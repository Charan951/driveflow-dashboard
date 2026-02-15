import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

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
                        Text(
                          'Status: ${booking.status}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF2563EB),
                          ),
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
                              FilledButton(
                                onPressed: _updatingStatus
                                    ? null
                                    : () => _updateStatus('VEHICLE_PICKED'),
                                child: const Text('Vehicle Picked'),
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
                              urlTemplate:
                                  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                              subdomains: const ['a', 'b', 'c'],
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
