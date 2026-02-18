import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:url_launcher/url_launcher.dart';

import '../core/env.dart';
import '../core/storage.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';

class TrackBookingPage extends StatefulWidget {
  const TrackBookingPage({super.key});

  @override
  State<TrackBookingPage> createState() => _TrackBookingPageState();
}

class _TrackBookingPageState extends State<TrackBookingPage> {
  final _service = BookingService();
  final _mapController = MapController();

  bool _loading = true;
  String? _error;
  Booking? _booking;
  String? _bookingId;

  io.Socket? _socket;
  bool _socketConnected = false;
  String? _socketError;
  LatLng? _liveLatLng;
  String? _liveName;
  DateTime? _liveUpdatedAt;
  bool _isPaymentLoading = false;
  bool _nearAlertShown = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    final nextId = args?.toString();
    if (nextId != null && nextId.isNotEmpty && nextId != _bookingId) {
      _bookingId = nextId;
      _nearAlertShown = false;
      _load();
      _connectSocket(nextId);
    }
  }

  @override
  void dispose() {
    final socket = _socket;
    if (socket != null) {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('liveLocation');
      socket.off('bookingUpdated');
      socket.emit('leave', 'booking_${_bookingId ?? ''}');
      socket.dispose();
    }
    super.dispose();
  }

  static const _adminUpiId = '6301028401@axl';
  static const _adminName = 'DriveFlow Admin';

  Future<void> _handlePayment() async {
    final booking = _booking;
    if (booking == null) return;

    if (kIsWeb) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('UPI payment is available only in the mobile app'),
        ),
      );
      return;
    }

    setState(() => _isPaymentLoading = true);
    try {
      await _showUpiOptions(booking);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment action failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isPaymentLoading = false);
      }
    }
  }

  Future<void> _showUpiOptions(Booking booking) async {
    await showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Pay using UPI',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Amount: ₹${booking.totalAmount}',
                  textAlign: TextAlign.center,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _launchUpiPayment(booking, 'Google Pay');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black87,
                    side: const BorderSide(color: Color(0xFFE5E7EB)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Pay with Google Pay'),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _launchUpiPayment(booking, 'PhonePe');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black87,
                    side: const BorderSide(color: Color(0xFFE5E7EB)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Pay with PhonePe'),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _launchUpiPayment(booking, 'Paytm');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black87,
                    side: const BorderSide(color: Color(0xFFE5E7EB)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Pay with Paytm'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _launchUpiPayment(booking, 'UPI app');
                  },
                  child: const Text('Other UPI app'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _launchUpiPayment(Booking booking, String label) async {
    final amount = booking.totalAmount.toDouble().toStringAsFixed(2);
    final vpa = _adminUpiId;
    final pn = Uri.encodeComponent(_adminName);
    final note = Uri.encodeComponent('Booking ${booking.id}');

    final uri = Uri.parse(
      'upi://pay?pa=$vpa&pn=$pn&tn=$note&am=$amount&cu=INR',
    );

    final canOpen = await canLaunchUrl(uri);
    if (!canOpen) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No UPI app found to open $label'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open $label'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _connectSocket(String bookingId) async {
    try {
      final token = await AppStorage().getToken();
      final next = io.io(
        Env.baseUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .enableForceNew()
            .setAuth(token != null && token.isNotEmpty ? {'token': token} : {})
            .build(),
      );

      _socket?.dispose();
      _socket = next;

      next.onConnect((_) {
        if (!mounted) return;
        setState(() {
          _socketConnected = true;
          _socketError = null;
        });
        next.emit('join', 'booking_$bookingId');
      });
      next.onDisconnect((_) {
        if (!mounted) return;
        setState(() => _socketConnected = false);
      });
      next.onConnectError((data) {
        if (!mounted) return;
        setState(() {
          _socketError = data?.toString();
          _socketConnected = false;
        });
      });
      next.on('liveLocation', (data) {
        if (!mounted) return;
        final booking = _booking;
        if (booking != null && booking.pickupRequired == false) {
          return;
        }
        if (data is Map) {
          final role = data['role'];
          if (role != null && role.toString() != 'staff') {
            return;
          }
          final latRaw = data['lat'];
          final lngRaw = data['lng'];
          final nameRaw = data['name'];
          final updatedAtRaw = data['updatedAt'] ?? data['timestamp'];
          if (latRaw is num && lngRaw is num) {
            setState(() {
              _liveLatLng = LatLng(latRaw.toDouble(), lngRaw.toDouble());
              _liveName = nameRaw is String && nameRaw.trim().isNotEmpty
                  ? nameRaw
                  : null;
              _liveUpdatedAt = updatedAtRaw is String
                  ? DateTime.tryParse(updatedAtRaw)?.toLocal()
                  : null;
            });
          }
        }
      });
      next.on('nearbyStaff', (data) {
        if (!mounted) return;
        final id = _bookingId;
        if (id == null || id.isEmpty) return;
        if (data is Map) {
          final bookingId = data['bookingId']?.toString();
          if (bookingId != id) return;
          if (_nearAlertShown) return;
          _nearAlertShown = true;
          String message;
          final distanceRaw = data['distanceMeters'];
          if (distanceRaw is num) {
            final d = distanceRaw.round();
            final clamped = d < 1 ? 1 : d;
            message = 'Staff is near your location (~$clamped m)';
          } else {
            message = 'Staff is near your location (≤300 m)';
          }
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }
      });
      next.on('bookingUpdated', (data) {
        if (!mounted) return;
        if (data is Map<String, dynamic>) {
          final updated = Booking.fromJson(data);
          setState(() {
            _booking = updated;
            if (updated.status == 'VEHICLE_AT_MERCHANT' ||
                updated.status == 'SERVICE_STARTED' ||
                updated.status == 'SERVICE_COMPLETED' ||
                updated.status == 'OUT_FOR_DELIVERY' ||
                updated.status == 'DELIVERED' ||
                updated.status == 'CANCELLED') {
              _liveLatLng = null;
              _liveName = null;
              _liveUpdatedAt = null;
            }
          });
        } else if (data is Map) {
          final updated = Booking.fromJson(Map<String, dynamic>.from(data));
          setState(() {
            _booking = updated;
            if (updated.status == 'VEHICLE_AT_MERCHANT' ||
                updated.status == 'SERVICE_STARTED' ||
                updated.status == 'SERVICE_COMPLETED' ||
                updated.status == 'OUT_FOR_DELIVERY' ||
                updated.status == 'DELIVERED' ||
                updated.status == 'CANCELLED') {
              _liveLatLng = null;
              _liveName = null;
              _liveUpdatedAt = null;
            }
          });
        }
      });

      next.connect();
    } catch (e) {
      if (!mounted) return;
      setState(() => _socketError = e.toString());
    }
  }

  Future<void> _load() async {
    final id = _bookingId;
    if (id == null || id.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'Missing booking id';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final booking = await _service.getBooking(id);
      if (mounted) {
        setState(() => _booking = booking);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  DateTime? _parseDate(String value) {
    try {
      return DateTime.parse(value).toLocal();
    } catch (_) {
      return null;
    }
  }

  String _formatDateTime(BuildContext context, String value) {
    final dt = _parseDate(value);
    if (dt == null) return value;
    final date =
        '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    final time = TimeOfDay.fromDateTime(dt).format(context);
    return '$date • $time';
  }

  String _formatClockTime(BuildContext context, DateTime dt) {
    return TimeOfDay.fromDateTime(dt).format(context);
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'CREATED':
        return 'Booked';
      case 'ASSIGNED':
        return 'Assigned';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REACHED_CUSTOMER':
        return 'Driver Reached';
      case 'VEHICLE_PICKED':
        return 'Vehicle Picked';
      case 'REACHED_MERCHANT':
        return 'Reached Garage';
      case 'VEHICLE_AT_MERCHANT':
        return 'At Garage';
      case 'JOB_CARD':
        return 'Job Card';
      case 'SERVICE_STARTED':
        return 'Servicing';
      case 'SERVICE_COMPLETED':
        return 'Ready';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  Future<void> _openMerchantDirections() async {
    final booking = _booking;
    if (booking == null) return;
    final loc = booking.merchantLocation;
    if (loc == null || loc.lat == null || loc.lng == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Merchant location not available')),
      );
      return;
    }
    final uri = Uri.https('www.google.com', '/maps/dir/', {
      'api': '1',
      'destination': '${loc.lat},${loc.lng}',
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
    final booking = _booking;
    final bookingLoc = booking?.location;
    final bookingLatLng = bookingLoc?.lat != null && bookingLoc?.lng != null
        ? LatLng(bookingLoc!.lat!, bookingLoc.lng!)
        : null;
    final merchantLoc = booking?.merchantLocation;
    final merchantLatLng = merchantLoc?.lat != null && merchantLoc?.lng != null
        ? LatLng(merchantLoc!.lat!, merchantLoc.lng!)
        : null;
    final mapLatLng = booking != null && booking.pickupRequired
        ? bookingLatLng
        : (merchantLatLng ?? bookingLatLng);
    final center =
        mapLatLng ??
        (booking != null && booking.pickupRequired ? _liveLatLng : null) ??
        const LatLng(12.9716, 77.5946);

    int currentIndex = -1;
    if (booking != null) {
      final s = booking.status;
      if (booking.pickupRequired) {
        if (s == 'CREATED') {
          currentIndex = 0;
        } else if (s == 'ASSIGNED' ||
            s == 'ACCEPTED' ||
            s == 'REACHED_CUSTOMER' ||
            s == 'VEHICLE_PICKED') {
          currentIndex = 1;
        } else if (s == 'REACHED_MERCHANT' ||
            s == 'VEHICLE_AT_MERCHANT' ||
            s == 'JOB_CARD') {
          currentIndex = 2;
        } else if (s == 'SERVICE_STARTED') {
          currentIndex = 3;
        } else if (s == 'SERVICE_COMPLETED' || s == 'OUT_FOR_DELIVERY') {
          currentIndex = 4;
        } else if (s == 'DELIVERED') {
          currentIndex = 5;
        }
      } else {
        if (s == 'CREATED') {
          currentIndex = 0;
        } else if (s == 'ASSIGNED') {
          currentIndex = 1;
        } else if (s == 'VEHICLE_AT_MERCHANT') {
          currentIndex = 2;
        } else if (s == 'SERVICE_STARTED') {
          currentIndex = 3;
        } else if (s == 'SERVICE_COMPLETED') {
          currentIndex = 4;
        } else if (s == 'DELIVERED') {
          currentIndex = 5;
        }
      }
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Track Service'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
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
                      'Failed to load booking',
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
            else if (booking == null)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: Center(child: Text('Booking not found')),
              )
            else ...[
              Container(
                height: 260,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(initialCenter: center, initialZoom: 13),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.carb.app',
                      ),
                      MarkerLayer(
                        markers: [
                          if (booking.pickupRequired) ...[
                            if (bookingLatLng != null)
                              Marker(
                                point: bookingLatLng,
                                width: 40,
                                height: 40,
                                child: const Icon(
                                  Icons.location_on,
                                  size: 40,
                                  color: Color(0xFF2563EB),
                                ),
                              ),
                            if (_liveLatLng != null)
                              Marker(
                                point: _liveLatLng!,
                                width: 40,
                                height: 40,
                                child: const Icon(
                                  Icons.navigation,
                                  size: 34,
                                  color: Color(0xFFEF4444),
                                ),
                              ),
                          ] else if (merchantLatLng != null)
                            Marker(
                              point: merchantLatLng,
                              width: 40,
                              height: 40,
                              child: const Icon(
                                Icons.location_on,
                                size: 40,
                                color: Color(0xFF2563EB),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              if (booking.pickupRequired && _nearAlertShown) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF3),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF22C55E),
                        ),
                        child: const Icon(
                          Icons.directions_car_filled,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Staff is nearby',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF166534),
                                  ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Your pickup partner has almost reached your location.',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: const Color(0xFF166534)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (booking.pickupRequired) ...[
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: _socketConnected
                                  ? const Color(0xFF22C55E)
                                  : const Color(0xFF94A3B8),
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _socketConnected
                                  ? 'Live tracking connected'
                                  : 'Live tracking disconnected',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ] else ...[
                          Expanded(
                            child: Text(
                              'Pickup not required. Go directly to the workshop.',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      booking.pickupRequired
                          ? (bookingLoc?.address != null &&
                                    bookingLoc!.address!.isNotEmpty
                                ? bookingLoc.address!
                                : (bookingLatLng == null
                                      ? 'Pickup location not set'
                                      : '${bookingLatLng.latitude.toStringAsFixed(6)}, ${bookingLatLng.longitude.toStringAsFixed(6)}'))
                          : (merchantLoc?.address != null &&
                                    merchantLoc!.address!.isNotEmpty
                                ? merchantLoc.address!
                                : (merchantLatLng == null
                                      ? 'Workshop location not set'
                                      : '${merchantLatLng.latitude.toStringAsFixed(6)}, ${merchantLatLng.longitude.toStringAsFixed(6)}')),
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: Colors.black87),
                    ),
                    if (booking.pickupRequired && _liveLatLng != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        '${_liveName ?? 'Staff'} • ${_liveUpdatedAt != null ? _formatClockTime(context, _liveUpdatedAt!) : 'Live'}',
                        style: Theme.of(
                          context,
                        ).textTheme.bodySmall?.copyWith(color: Colors.black87),
                      ),
                    ],
                    if (booking.pickupRequired &&
                        _socketError != null &&
                        _socketError!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        _socketError!,
                        style: Theme.of(
                          context,
                        ).textTheme.bodySmall?.copyWith(color: Colors.black54),
                      ),
                    ],
                  ],
                ),
              ),
              if (!booking.pickupRequired &&
                  merchantLatLng != null &&
                  merchantLoc != null) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _openMerchantDirections,
                    icon: const Icon(Icons.navigation),
                    label: const Text('Get directions to workshop'),
                  ),
                ),
                const SizedBox(height: 16),
              ] else
                const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Booking #${booking.id}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEDE9FE),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _statusLabel(booking.status),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF4F46E5),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _formatDateTime(context, booking.date),
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    if (booking.vehicle != null)
                      Text(
                        '${booking.vehicle!.make} ${booking.vehicle!.model} • ${booking.vehicle!.licensePlate}',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      'Total: ₹${booking.totalAmount}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.black87,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Service Progress',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (booking.pickupRequired &&
                        booking.status == 'REACHED_CUSTOMER' &&
                        _nearAlertShown) ...[
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF22C55E),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Staff is nearby',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF166534),
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                    ],
                    _HorizontalStepper(
                      labels: booking.pickupRequired
                          ? [
                              'Booking Confirmed',
                              booking.status == 'REACHED_CUSTOMER'
                                  ? 'Staff is waiting for pickup'
                                  : 'Pickup Scheduled',
                              'At Service Center',
                              'Service In Progress',
                              'Ready for Delivery',
                              'Delivered',
                            ]
                          : [
                              'Booking Confirmed',
                              'Merchant Assigned',
                              'Vehicle at Merchant',
                              'Service In Progress',
                              'Service Completed',
                              'Delivered',
                            ],
                      activeIndex: currentIndex >= 7
                          ? 5
                          : currentIndex >= 6
                          ? 4
                          : currentIndex >= 5
                          ? 3
                          : currentIndex >= 4
                          ? 2
                          : currentIndex >= 2
                          ? 1
                          : currentIndex >= 0
                          ? 0
                          : -1,
                      firstTimeLabel: _formatDateTime(context, booking.date),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              if (booking.paymentStatus != 'PAID') ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isPaymentLoading ? null : _handlePayment,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: _isPaymentLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Pay Now',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
              Text(
                'Services',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              if (booking.services.isEmpty)
                const Text('No services found')
              else
                ...booking.services.map((s) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            s.name,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ),
                        Text(
                          '₹${s.price}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Colors.black54,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ],
        ),
      ),
    );
  }
}

class _HorizontalStepper extends StatelessWidget {
  final List<String> labels;
  final int activeIndex;
  final String? firstTimeLabel;

  const _HorizontalStepper({
    required this.labels,
    required this.activeIndex,
    this.firstTimeLabel,
  });

  @override
  Widget build(BuildContext context) {
    final count = labels.length;
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        final spacing = count > 1 ? (w - 24) / (count - 1) : w;
        final safeIndex = activeIndex.clamp(-1, count - 1);
        final progress = count <= 1
            ? 0.0
            : ((safeIndex + 1) / count).clamp(0.0, 1.0);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 54,
              child: Stack(
                alignment: Alignment.centerLeft,
                children: [
                  Positioned.fill(
                    child: Container(
                      height: 6,
                      margin: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE5E7EB),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: TweenAnimationBuilder<double>(
                          tween: Tween<double>(begin: 0, end: progress),
                          duration: const Duration(milliseconds: 720),
                          curve: Curves.easeOutCubic,
                          builder: (context, value, _) => Container(
                            width: (w - 24) * value,
                            height: 6,
                            decoration: BoxDecoration(
                              color: const Color(0xFF4F46E5),
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: List.generate(count, (i) {
                      final completed = i <= safeIndex;
                      final isActive = i == safeIndex;
                      return SizedBox(
                        width: i == count - 1 ? 12 : spacing,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: AnimatedScale(
                            scale: isActive ? 1.1 : 1.0,
                            duration: const Duration(milliseconds: 220),
                            curve: Curves.easeOutCubic,
                            child: Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: completed
                                    ? const Color(0xFF4F46E5)
                                    : Colors.white,
                                border: Border.all(
                                  color: completed
                                      ? const Color(0xFF4F46E5)
                                      : const Color(0xFFE5E7EB),
                                  width: 2,
                                ),
                                boxShadow: [
                                  if (isActive)
                                    BoxShadow(
                                      color: const Color(
                                        0xFF4F46E5,
                                      ).withValues(alpha: 0.2),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                ],
                              ),
                              child: completed
                                  ? const Icon(
                                      Icons.check,
                                      size: 14,
                                      color: Colors.white,
                                    )
                                  : null,
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: BoxConstraints(minWidth: w),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: List.generate(count, (i) {
                    final completed = i <= safeIndex;
                    final isActive = i == safeIndex;
                    final label = labels[i];
                    final itemWidth = count <= 3 ? w / count : spacing;
                    return SizedBox(
                      width: i == count - 1 ? 12 : itemWidth,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            label,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isActive
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                              color: completed
                                  ? const Color(0xFF0F172A)
                                  : const Color(0xFF94A3B8),
                            ),
                          ),
                          if (i == 0 && firstTimeLabel != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                firstTimeLabel!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF64748B),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
