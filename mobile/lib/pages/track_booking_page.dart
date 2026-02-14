import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    final nextId = args?.toString();
    if (nextId != null && nextId.isNotEmpty && nextId != _bookingId) {
      _bookingId = nextId;
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
      socket.off('connect_error');
      socket.off('liveLocation');
      socket.off('bookingUpdated');
      socket.emit('leave', 'booking_${_bookingId ?? ''}');
      socket.dispose();
    }
    super.dispose();
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
        if (data is Map) {
          final latRaw = data['lat'];
          final lngRaw = data['lng'];
          final nameRaw = data['name'];
          final updatedAtRaw = data['updatedAt'];
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
      next.on('bookingUpdated', (data) {
        if (!mounted) return;
        if (data is Map<String, dynamic>) {
          setState(() => _booking = Booking.fromJson(data));
        } else if (data is Map) {
          setState(
            () => _booking = Booking.fromJson(Map<String, dynamic>.from(data)),
          );
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
        return 'Pickup Assigned';
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

  int _getStatusIndex(String status) {
    const statuses = [
      'CREATED',
      'ASSIGNED',
      'REACHED_CUSTOMER',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'DELIVERED',
    ];
    return statuses.indexOf(status);
  }

  Widget _buildTimelineStep({
    required String title,
    required bool isCompleted,
    required bool isLast,
    String? subtitle,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted ? const Color(0xFF4F46E5) : Colors.white,
                border: Border.all(
                  color: isCompleted
                      ? const Color(0xFF4F46E5)
                      : const Color(0xFFE5E7EB),
                  width: 2,
                ),
              ),
              child: isCompleted
                  ? const Icon(Icons.check, size: 12, color: Colors.white)
                  : null,
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: isCompleted
                    ? const Color(0xFF4F46E5)
                    : const Color(0xFFE5E7EB),
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isCompleted ? FontWeight.w700 : FontWeight.w500,
                  color: isCompleted ? Colors.black87 : Colors.black45,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: Colors.black45),
                ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ],
    );
  }

  bool _isPaymentLoading = false;

  Future<void> _handlePayment() async {
    final booking = _booking;
    if (booking == null) return;

    setState(() => _isPaymentLoading = true);
    try {
      // 1. Create Order on Backend
      final orderData = await _service.createRazorpayOrder(booking.id);
      final orderId = orderData['id'] as String;

      if (!mounted) return;

      // 2. Mock Razorpay Payment for now since package is missing
      // In a real app, you would use:
      // final razorpay = Razorpay();
      // razorpay.open(options);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Processing payment... (Mocking Razorpay)'),
          backgroundColor: Color(0xFF4F46E5),
        ),
      );

      // Simulate a small delay for payment gateway
      await Future.delayed(const Duration(seconds: 2));

      // 3. Verify Payment on Backend (Mocking the callback data)
      await _service.verifyPayment(
        bookingId: booking.id,
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_mock_${DateTime.now().millisecondsSinceEpoch}',
        razorpaySignature: 'sig_mock_${DateTime.now().millisecondsSinceEpoch}',
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Payment Successful!'),
          backgroundColor: Colors.green,
        ),
      );

      // 4. Refresh Booking Data
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment Failed: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isPaymentLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final booking = _booking;
    final bookingLoc = booking?.location;
    final bookingLatLng = bookingLoc?.lat != null && bookingLoc?.lng != null
        ? LatLng(bookingLoc!.lat!, bookingLoc.lng!)
        : null;
    final center =
        bookingLatLng ?? _liveLatLng ?? const LatLng(12.9716, 77.5946);

    final currentIndex = booking != null ? _getStatusIndex(booking.status) : -1;

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
                        ],
                      ),
                    ],
                  ),
                ),
              ),
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
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      bookingLoc?.address != null &&
                              bookingLoc!.address!.isNotEmpty
                          ? bookingLoc.address!
                          : (bookingLatLng == null
                                ? 'Pickup location not set'
                                : '${bookingLatLng.latitude.toStringAsFixed(6)}, ${bookingLatLng.longitude.toStringAsFixed(6)}'),
                      style: Theme.of(
                        context,
                      ).textTheme.bodySmall?.copyWith(color: Colors.black87),
                    ),
                    if (_liveLatLng != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        '${_liveName ?? 'Staff'} • ${_liveUpdatedAt != null ? _formatClockTime(context, _liveUpdatedAt!) : 'Live'}',
                        style: Theme.of(
                          context,
                        ).textTheme.bodySmall?.copyWith(color: Colors.black87),
                      ),
                    ],
                    if (_socketError != null && _socketError!.isNotEmpty) ...[
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
                  children: [
                    _buildTimelineStep(
                      title: 'Booking Confirmed',
                      isCompleted: currentIndex >= 0,
                      isLast: false,
                      subtitle: _formatDateTime(context, booking.date),
                    ),
                    _buildTimelineStep(
                      title: booking.status == 'REACHED_CUSTOMER'
                          ? 'Staff is waiting for pickup'
                          : 'Pickup Scheduled',
                      isCompleted: currentIndex >= 2,
                      isLast: false,
                    ),
                    _buildTimelineStep(
                      title: 'At Service Center',
                      isCompleted: currentIndex >= 4,
                      isLast: false,
                    ),
                    _buildTimelineStep(
                      title: 'Service In Progress',
                      isCompleted: currentIndex >= 5,
                      isLast: false,
                    ),
                    _buildTimelineStep(
                      title: 'Ready for Delivery',
                      isCompleted: currentIndex >= 6,
                      isLast: false,
                    ),
                    _buildTimelineStep(
                      title: 'Delivered',
                      isCompleted: currentIndex >= 7,
                      isLast: true,
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
