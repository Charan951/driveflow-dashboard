import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

import '../core/env.dart';
import '../core/api_client.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';
import '../services/review_service.dart';
import '../services/socket_service.dart';

class TrackBookingPage extends StatefulWidget {
  const TrackBookingPage({super.key});

  @override
  State<TrackBookingPage> createState() => _TrackBookingPageState();
}

class _TrackBookingPageState extends State<TrackBookingPage> {
  final _service = BookingService();
  final _reviewService = ReviewService();
  final _mapController = MapController();
  final _api = ApiClient();

  bool _loading = true;
  String? _error;
  Booking? _booking;
  String? _bookingId;

  late SocketService _socketService;
  bool _nearAlertShown = false;
  bool _hasMerchantReview = false;
  bool _hasPlatformReview = false;
  bool _isReviewLoading = false;
  final double _bearingRad = 0.0;
  String? _etaTextDuration;
  String? _etaTextDistance;
  List<Map<String, dynamic>> _pendingApprovals = [];
  Timer? _approvalsTimer;
  List<LatLng> _routePoints = [];

  // Live tracking state
  LatLng? _liveLatLng;
  String? _liveName;
  DateTime? _liveUpdatedAt;
  bool _isPaymentLoading = false;
  final bool _socketConnected = false;
  String? _socketError;

  @override
  void initState() {
    super.initState();
    _socketService = SocketService();
    _socketService.addListener(_onSocketUpdate);
  }

  void _onSocketUpdate() {
    if (_loading || _bookingId == null) return;
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    final nextId = args?.toString();
    if (nextId != null && nextId.isNotEmpty && nextId != _bookingId) {
      if (_bookingId != null) {
        _socketService.emit('leave', 'booking_$_bookingId');
      }
      _bookingId = nextId;
      _nearAlertShown = false;
      _load();
      _socketService.emit('join', 'booking_$nextId');

      _socketService.on('liveLocation', (data) {
        if (!mounted) return;
        if (data is Map<String, dynamic>) {
          final lat = data['lat'];
          final lng = data['lng'];
          if (lat is num && lng is num) {
            final next = LatLng(lat.toDouble(), lng.toDouble());
            setState(() {
              _liveLatLng = next;
              _liveName = data['name']?.toString();
              _liveUpdatedAt = DateTime.tryParse(
                data['updatedAt']?.toString() ?? '',
              );
            });
            _mapController.move(next, 16.0); // Auto-zoom to live location
            if (_booking?.location?.lat != null &&
                _booking?.location?.lng != null) {
              _fetchRoute(
                next,
                LatLng(_booking!.location!.lat!, _booking!.location!.lng!),
              );
            }
          }
        }
      });

      _socketService.on('bookingUpdated', (data) {
        if (!mounted) return;
        try {
          Booking? updated;
          if (data is Map<String, dynamic>) {
            updated = Booking.fromJson(data);
          } else if (data is Map) {
            updated = Booking.fromJson(Map<String, dynamic>.from(data));
          }
          if (updated != null && updated.id == _bookingId) {
            setState(() => _booking = updated);
            if (updated.status == 'DELIVERED' ||
                updated.status == 'COMPLETED') {
              _fetchReviewsStatus(updated.id);
            }
          }
        } catch (e) {
          // Silent catch
        }
      });
    }
  }

  @override
  void dispose() {
    _socketService.removeListener(_onSocketUpdate);
    _socketService.off('liveLocation');
    _socketService.off('bookingUpdated');
    if (_bookingId != null) {
      _socketService.emit('leave', 'booking_$_bookingId');
    }
    _approvalsTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchRoute(LatLng start, LatLng end) async {
    try {
      final url = Uri.parse(
        'https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson',
      );
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final routes = data['routes'] as List;
        if (routes.isNotEmpty) {
          final geometry = routes[0]['geometry'];
          final coordinates = geometry['coordinates'] as List;
          setState(() {
            _routePoints = coordinates
                .map((c) => LatLng(c[1].toDouble(), c[0].toDouble()))
                .toList();
          });
        }
      }
    } catch (e) {
      // Silent catch
    }
  }

  Future<void> _handlePayment() async {
    final booking = _booking;
    if (booking == null) return;

    setState(() => _isPaymentLoading = true);
    try {
      await _service.processDummyPayment(booking.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Payment Successful!'),
          backgroundColor: Colors.green,
        ),
      );
      await _load(); // Reload to update status
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isPaymentLoading = false);
      }
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
        _fetchPendingApprovals();
        _startApprovalsTimer();
        if (booking.status == 'DELIVERED' || booking.status == 'COMPLETED') {
          _fetchReviewsStatus(booking.id);
        }
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

  Future<void> _fetchReviewsStatus(String bookingId) async {
    try {
      final reviews = await _reviewService.getBookingReviews(bookingId);
      final hasMerchant = reviews.any((r) => r['category'] == 'Merchant');
      final hasPlatform = reviews.any((r) => r['category'] == 'Platform');
      if (mounted) {
        setState(() {
          _hasMerchantReview = hasMerchant;
          _hasPlatformReview = hasPlatform;
        });
      }
    } catch (_) {}
  }

  Future<void> _showReviewDialog() async {
    final booking = _booking;
    if (booking == null) return;

    int merchantRating = 5;
    int platformRating = 5;
    final merchantCommentController = TextEditingController();
    final platformCommentController = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final isDark = Theme.of(context).brightness == Brightness.dark;
            final isComplete = _hasMerchantReview && _hasPlatformReview;

            if (isComplete) {
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 64,
                      color: Colors.green,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Feedback Submitted',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Thank you for sharing your experience with us!',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Close'),
                      ),
                    ),
                  ],
                ),
              );
            }

            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                16 + MediaQuery.of(context).viewInsets.bottom,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Rate your experience',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (!_hasMerchantReview) ...[
                      Text(
                        'Service Center Rating',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          5,
                          (i) => IconButton(
                            onPressed: () =>
                                setModalState(() => merchantRating = i + 1),
                            icon: Icon(
                              i < merchantRating
                                  ? Icons.star
                                  : Icons.star_border,
                              color: Colors.amber,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                      TextField(
                        controller: merchantCommentController,
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        decoration: const InputDecoration(
                          hintText: 'Share your thoughts about the service...',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 24),
                    ],
                    if (!_hasPlatformReview) ...[
                      Text(
                        'Platform Experience Rating',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          5,
                          (i) => IconButton(
                            onPressed: () =>
                                setModalState(() => platformRating = i + 1),
                            icon: Icon(
                              i < platformRating
                                  ? Icons.star
                                  : Icons.star_border,
                              color: Colors.amber,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                      TextField(
                        controller: platformCommentController,
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        decoration: const InputDecoration(
                          hintText: 'Share your thoughts about our app...',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 24),
                    ],
                    ElevatedButton(
                      onPressed: _isReviewLoading
                          ? null
                          : () async {
                              setModalState(() => _isReviewLoading = true);
                              try {
                                if (!_hasMerchantReview) {
                                  await _reviewService.createReview(
                                    bookingId: booking.id,
                                    rating: merchantRating,
                                    comment: merchantCommentController.text
                                        .trim(),
                                    category: 'Merchant',
                                  );
                                }
                                if (!_hasPlatformReview) {
                                  await _reviewService.createReview(
                                    bookingId: booking.id,
                                    rating: platformRating,
                                    comment: platformCommentController.text
                                        .trim(),
                                    category: 'Platform',
                                  );
                                }
                                if (context.mounted) {
                                  Navigator.pop(context);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Thank you for your feedback!',
                                        ),
                                      ),
                                    );
                                  }
                                  _fetchReviewsStatus(booking.id);
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Failed to submit review: $e',
                                      ),
                                    ),
                                  );
                                }
                              } finally {
                                setModalState(() => _isReviewLoading = false);
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isReviewLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'Submit Review',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showImagePreview(String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(10),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              child: Image.network(
                url,
                fit: BoxFit.contain,
                errorBuilder: (context, _, _) => const Icon(
                  Icons.broken_image,
                  color: Colors.white,
                  size: 50,
                ),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  DateTime? _parseDate(String value) {
    try {
      return DateTime.parse(value).toLocal();
    } catch (_) {
      return null;
    }
  }

  String _formatDateTime(BuildContext context, String? value) {
    if (value == null || value.isEmpty) return '';
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

  String? _resolveImageUrl(dynamic raw) {
    if (raw == null) return null;
    final s = raw.toString().trim();
    if (s.isEmpty) return null;
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('/')) return '${Env.baseUrl}$s';
    return '${Env.baseUrl}/$s';
  }

  Future<void> _fetchPendingApprovals() async {
    final booking = _booking;
    if (booking == null) return;
    final res = await _api.getAny(ApiEndpoints.approvalsMyApprovals);
    final items = <Map<String, dynamic>>[];
    if (res is List) {
      for (final e in res) {
        if (e is Map) {
          final map = e is Map<String, dynamic>
              ? e
              : Map<String, dynamic>.from(e);
          final rawRelated = map['relatedId'];
          String relatedId = '';
          if (rawRelated is String) {
            relatedId = rawRelated;
          } else if (rawRelated is Map) {
            final inner = rawRelated;
            final candidate = inner['_id'];
            if (candidate is String) {
              relatedId = candidate;
            } else if (candidate != null) {
              relatedId = candidate.toString();
            } else {
              relatedId = rawRelated.toString();
            }
          } else if (rawRelated != null) {
            relatedId = rawRelated.toString();
          }
          final status = map['status']?.toString();
          final type = map['type']?.toString();
          if (relatedId == booking.id &&
              status == 'Pending' &&
              type == 'PartReplacement') {
            items.add(map);
          }
        }
      }
    }
    if (!mounted) return;
    setState(() {
      _pendingApprovals = items;
    });
  }

  void _startApprovalsTimer() {
    _approvalsTimer?.cancel();
    final booking = _booking;
    if (booking == null || booking.id.isEmpty) return;
    _approvalsTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _fetchPendingApprovals(),
    );
  }

  Future<void> _handleApprovalAction(
    String approvalId,
    String status, {
    String? reason,
  }) async {
    if (approvalId.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final body = <String, dynamic>{'status': status};
      if (reason != null && reason.trim().isNotEmpty) {
        body['adminComment'] = reason.trim();
      }
      await _api.putJson(ApiEndpoints.approvalById(approvalId), body: body);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            status == 'Approved' ? 'Request approved' : 'Request rejected',
          ),
        ),
      );
      await _fetchPendingApprovals();
      if (status == 'Approved') {
        final id = _bookingId;
        if (id != null && id.isNotEmpty) {
          final updated = await _service.getBooking(id);
          if (!mounted) return;
          setState(() => _booking = updated);
        }
      }
    } catch (_) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            status == 'Approved'
                ? 'Failed to approve request'
                : 'Failed to reject request',
          ),
        ),
      );
    }
  }

  Future<void> _showRejectReasonSheet(String approvalId) async {
    if (approvalId.isEmpty) return;
    final controller = TextEditingController();
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        final bottomInset = MediaQuery.of(context).viewInsets.bottom;
        return Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottomInset),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Reject request',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                'Please share the reason for rejection. This helps our team understand your concern.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 3,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  hintText: 'Type your reason here',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        final value = controller.text.trim();
                        if (value.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please enter a reason'),
                            ),
                          );
                          return;
                        }
                        Navigator.of(context).pop(value);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Submit'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );

    if (result == null || result.trim().isEmpty) return;
    await _handleApprovalAction(approvalId, 'Rejected', reason: result);
  }

  String _statusLabel(String status) {
    final booking = _booking;
    if (booking != null &&
        booking.pickupRequired &&
        status == 'ACCEPTED' &&
        booking.status == 'REACHED_CUSTOMER') {
      return 'Staff waiting at your location';
    }
    if (booking != null &&
        booking.pickupRequired &&
        status == 'OUT_FOR_DELIVERY' &&
        booking.paymentStatus != 'paid') {
      return 'Waiting for payment';
    }

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
      case 'COMPLETED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  Future<void> _handleMarkAtMerchant() async {
    final booking = _booking;
    if (booking == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Arrival'),
        content: const Text(
          'This button will work only when you are near the workshop (within 200 meters). We will check your location now.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final merchantLat = booking.merchantLocation?.lat;
    final merchantLng = booking.merchantLocation?.lng;

    if (merchantLat == null || merchantLng == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Workshop location is not available')),
      );
      return;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final distance = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        merchantLat,
        merchantLng,
      );

      if (distance > 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'You are not close enough to the workshop (within 200 m)',
            ),
          ),
        );
        return;
      }

      final updated = await _service.updateBookingStatus(
        booking.id,
        'VEHICLE_AT_MERCHANT',
      );
      if (!mounted) return;
      setState(() => _booking = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Status updated to At Merchant')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to update status: $e')));
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
    final center = _liveLatLng ?? mapLatLng ?? const LatLng(12.9716, 77.5946);
    final showLiveTrackingMap =
        booking != null &&
        booking.pickupRequired &&
        (booking.status == 'ASSIGNED' ||
            booking.status == 'ACCEPTED' ||
            booking.status == 'REACHED_CUSTOMER' ||
            booking.status == 'VEHICLE_PICKED' ||
            booking.status == 'REACHED_MERCHANT' ||
            booking.status == 'OUT_FOR_DELIVERY');

    int currentIndex = -1;
    if (booking != null) {
      final s = booking.status;
      switch (s) {
        case 'CREATED':
          currentIndex = 0;
          break;
        case 'ASSIGNED':
        case 'ACCEPTED':
        case 'REACHED_CUSTOMER':
          currentIndex = 1;
          break;
        case 'VEHICLE_PICKED':
        case 'REACHED_MERCHANT':
        case 'VEHICLE_AT_MERCHANT':
          currentIndex = 2;
          break;
        case 'SERVICE_STARTED':
          currentIndex = 3;
          break;
        case 'SERVICE_COMPLETED':
        case 'OUT_FOR_DELIVERY':
          currentIndex = 4;
          break;
        case 'DELIVERED':
        case 'COMPLETED':
          currentIndex = 5;
          break;
        default:
          currentIndex = 0;
      }
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      appBar: AppBar(
        backgroundColor: isDark ? Colors.transparent : Colors.white,
        surfaceTintColor: isDark ? Colors.transparent : Colors.white,
        elevation: isDark ? 0 : null,
        title: Text(
          'Track Service',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            fontWeight: FontWeight.w700,
          ),
        ),
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
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isDark ? Colors.white70 : Colors.black54,
                      ),
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
              if (showLiveTrackingMap) ...[
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
                      options: MapOptions(
                        initialCenter: center,
                        initialZoom: 13,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate:
                              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.carb.app',
                        ),
                        PolylineLayer(
                          polylines: [
                            if (_routePoints.isNotEmpty)
                              Polyline(
                                points: _routePoints,
                                color: const Color(0xFF2563EB),
                                strokeWidth: 4,
                              ),
                          ],
                        ),
                        MarkerLayer(
                          markers: [
                            if (mapLatLng != null)
                              Marker(
                                point: mapLatLng,
                                width: 40,
                                height: 40,
                                child: const Icon(
                                  Icons.person_pin_circle,
                                  size: 40,
                                  color: Color(0xFF22C55E),
                                ),
                              ),
                            if (booking.pickupRequired && _liveLatLng != null)
                              Marker(
                                point: _liveLatLng!,
                                width: 40,
                                height: 40,
                                child: Transform.rotate(
                                  angle: _bearingRad,
                                  child: const Icon(
                                    Icons.two_wheeler,
                                    size: 34,
                                    color: Color(0xFFEF4444),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
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
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.06)
                      : const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : const Color(0xFFE5E7EB),
                  ),
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
                          if (_liveLatLng != null && _liveUpdatedAt != null)
                            Text(
                              ' • ${_formatClockTime(context, _liveUpdatedAt!)}',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          if (_etaTextDuration != null &&
                              _etaTextDistance != null)
                            Padding(
                              padding: const EdgeInsets.only(left: 8),
                              child: Text(
                                'ETA: $_etaTextDuration • $_etaTextDistance',
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
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                    ),
                    if (booking.pickupRequired && _liveLatLng != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        '${_liveName ?? 'Staff'} • ${_liveUpdatedAt != null ? _formatClockTime(context, _liveUpdatedAt!) : 'Live'}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: isDark ? Colors.white70 : Colors.black87,
                        ),
                      ),
                    ],
                    if (booking.pickupRequired &&
                        _socketError != null &&
                        _socketError!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        _socketError!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Driver Details Section
              if (booking.pickupRequired)
                _buildInfoCard(
                  context,
                  title: 'Driver Details',
                  icon: Icons.two_wheeler,
                  name: booking.driverName,
                  phone: booking.driverPhone,
                  subtitle: booking.driverName == null
                      ? 'your driver details provided shortly'
                      : null,
                  isDark: isDark,
                  actions: booking.driverPhone != null
                      ? [
                          _buildCircleActionButton(
                            icon: Icons.phone,
                            color: const Color(0xFF22C55E),
                            bgColor: const Color(0xFFDCFCE7),
                            onTap: () => launchUrl(
                              Uri.parse('tel:${booking.driverPhone}'),
                            ),
                          ),
                        ]
                      : [],
                ),
              const SizedBox(height: 12),
              // Service Center Section
              _buildInfoCard(
                context,
                title: 'Service Center',
                icon: Icons.storefront,
                name: booking.merchantName,
                phone: booking.merchantPhone,
                subtitle: booking.merchantName == null
                    ? 'your authorised service center details provide shortly'
                    : null,
                isDark: isDark,
                actions: [
                  if (booking.merchantPhone != null)
                    _buildCircleActionButton(
                      icon: Icons.phone,
                      color: const Color(0xFF22C55E),
                      bgColor: const Color(0xFFDCFCE7),
                      onTap: () =>
                          launchUrl(Uri.parse('tel:${booking.merchantPhone}')),
                    ),
                  const SizedBox(width: 8),
                  _buildCircleActionButton(
                    icon: Icons.message,
                    color: const Color(0xFF4F46E5),
                    bgColor: const Color(0xFFEEF2FF),
                    onTap: () {
                      final phone =
                          booking.merchantPhone?.replaceAll(
                            RegExp(r'\D'),
                            '',
                          ) ??
                          '';
                      if (phone.isNotEmpty) {
                        launchUrl(
                          Uri.parse(
                            'https://wa.me/$phone?text=Hi, I have a query about order #${booking.orderNumber ?? booking.id}',
                          ),
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.06)
                      : const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : const Color(0xFFE5E7EB),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Booking #${booking.orderNumber ?? booking.id}',
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
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _formatDateTime(context, booking.date),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isDark ? Colors.white70 : Colors.black54,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (booking.vehicle != null) ...[
                      Row(
                        children: [
                          if (booking.vehicle!.image != null)
                            Container(
                              width: 60,
                              height: 60,
                              margin: const EdgeInsets.only(right: 12),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isDark
                                      ? Colors.white.withValues(alpha: 0.1)
                                      : const Color(0xFFE5E7EB),
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(11),
                                child: Image.network(
                                  _resolveImageUrl(booking.vehicle!.image)!,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${booking.vehicle!.make} ${booking.vehicle!.model}',
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                                Text(
                                  booking.vehicle!.licensePlate,
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(
                                        color: isDark
                                            ? Colors.white70
                                            : Colors.black54,
                                      ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total Amount',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                color: isDark ? Colors.white70 : Colors.black54,
                              ),
                        ),
                        Text(
                          '₹${booking.totalAmount}',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: isDark ? Colors.white : Colors.black87,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (booking.status == 'OUT_FOR_DELIVERY' &&
                  booking.deliveryOtp != null &&
                  booking.deliveryOtp!.code.trim().isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF6366F1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Delivery OTP',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF4F46E5),
                            ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              booking.deliveryOtp!.code,
                              style: const TextStyle(
                                fontSize: 22,
                                letterSpacing: 4,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF111827),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Share this code only with our staff at the time of delivery.',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: const Color(0xFF4B5563)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
              if (_pendingApprovals.isNotEmpty) ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFCD34D)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Icon(
                              Icons.warning_amber_rounded,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Approval required',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF92400E),
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ListView.builder(
                        shrinkWrap: true,
                        padding: EdgeInsets.zero,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _pendingApprovals.length,
                        itemBuilder: (context, index) {
                          final approval = _pendingApprovals[index];
                          final data = approval['data'];
                          String name = 'Part replacement';
                          int? quantity;
                          double? price;
                          String? newImageUrl;
                          String? oldImageUrl;
                          if (data is Map) {
                            final rawName = data['name'];
                            if (rawName != null &&
                                rawName.toString().trim().isNotEmpty) {
                              name = rawName.toString();
                            }
                            final rawQty = data['quantity'];
                            if (rawQty is num) {
                              quantity = rawQty.toInt();
                            }
                            final rawPrice = data['price'];
                            if (rawPrice is num) {
                              price = rawPrice.toDouble();
                            }
                            newImageUrl = _resolveImageUrl(data['image']);
                            oldImageUrl = _resolveImageUrl(data['oldImage']);
                          }
                          double? total;
                          if (quantity != null && price != null) {
                            total = quantity * price;
                          }
                          final approvalId = approval['_id']?.toString() ?? '';
                          return Container(
                            margin: const EdgeInsets.only(top: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  alignment: Alignment.center,
                                  child: const Text(
                                    'SC',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF92400E),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                          border: Border.all(
                                            color: const Color(0xFFFCD34D),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    name,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodyMedium
                                                        ?.copyWith(
                                                          fontWeight:
                                                              FontWeight.w600,
                                                        ),
                                                  ),
                                                ),
                                                if (total != null)
                                                  Text(
                                                    '₹${total.toStringAsFixed(2)}',
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodySmall
                                                        ?.copyWith(
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          color: const Color(
                                                            0xFF111827,
                                                          ),
                                                        ),
                                                  ),
                                              ],
                                            ),
                                            if (quantity != null ||
                                                price != null)
                                              Padding(
                                                padding: const EdgeInsets.only(
                                                  top: 2,
                                                ),
                                                child: Text(
                                                  'Qty: ${quantity ?? '-'} • Price: ₹${price != null ? price.toStringAsFixed(2) : '-'}',
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodySmall
                                                      ?.copyWith(
                                                        color: const Color(
                                                          0xFF92400E,
                                                        ),
                                                      ),
                                                ),
                                              ),
                                            const SizedBox(height: 8),
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        'New Part',
                                                        style: Theme.of(context)
                                                            .textTheme
                                                            .bodySmall
                                                            ?.copyWith(
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w600,
                                                              color:
                                                                  const Color(
                                                                    0xFF4B5563,
                                                                  ),
                                                              fontSize: 10,
                                                            ),
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                      ),
                                                      const SizedBox(height: 4),
                                                      SizedBox(
                                                        width: 80,
                                                        height: 80,
                                                        child: Container(
                                                          decoration: BoxDecoration(
                                                            color: const Color(
                                                              0xFFF9FAFB,
                                                            ),
                                                            borderRadius:
                                                                BorderRadius.circular(
                                                                  12,
                                                                ),
                                                            border: Border.all(
                                                              color:
                                                                  const Color(
                                                                    0xFFE5E7EB,
                                                                  ),
                                                            ),
                                                          ),
                                                          clipBehavior:
                                                              Clip.antiAlias,
                                                          child:
                                                              newImageUrl !=
                                                                  null
                                                              ? Image.network(
                                                                  newImageUrl,
                                                                  fit: BoxFit
                                                                      .cover,
                                                                )
                                                              : Center(
                                                                  child: Text(
                                                                    'No image',
                                                                    style: Theme.of(context)
                                                                        .textTheme
                                                                        .bodySmall
                                                                        ?.copyWith(
                                                                          color: const Color(
                                                                            0xFF9CA3AF,
                                                                          ),
                                                                          fontSize:
                                                                              8,
                                                                        ),
                                                                  ),
                                                                ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        'Old Part',
                                                        style: Theme.of(context)
                                                            .textTheme
                                                            .bodySmall
                                                            ?.copyWith(
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w600,
                                                              color:
                                                                  const Color(
                                                                    0xFF4B5563,
                                                                  ),
                                                              fontSize: 10,
                                                            ),
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                      ),
                                                      const SizedBox(height: 4),
                                                      SizedBox(
                                                        width: 80,
                                                        height: 80,
                                                        child: Container(
                                                          decoration: BoxDecoration(
                                                            color: const Color(
                                                              0xFFF9FAFB,
                                                            ),
                                                            borderRadius:
                                                                BorderRadius.circular(
                                                                  12,
                                                                ),
                                                            border: Border.all(
                                                              color:
                                                                  const Color(
                                                                    0xFFE5E7EB,
                                                                  ),
                                                            ),
                                                          ),
                                                          clipBehavior:
                                                              Clip.antiAlias,
                                                          child:
                                                              oldImageUrl !=
                                                                  null
                                                              ? Image.network(
                                                                  oldImageUrl,
                                                                  fit: BoxFit
                                                                      .cover,
                                                                )
                                                              : Center(
                                                                  child: Text(
                                                                    'No image',
                                                                    style: Theme.of(context)
                                                                        .textTheme
                                                                        .bodySmall
                                                                        ?.copyWith(
                                                                          color: const Color(
                                                                            0xFF9CA3AF,
                                                                          ),
                                                                          fontSize:
                                                                              8,
                                                                        ),
                                                                  ),
                                                                ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: [
                                          OutlinedButton(
                                            onPressed: approvalId.isEmpty
                                                ? null
                                                : () => _showRejectReasonSheet(
                                                    approvalId,
                                                  ),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: const Color(
                                                0xFFB91C1C,
                                              ),
                                              side: const BorderSide(
                                                color: Color(0xFFFCA5A5),
                                              ),
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 12,
                                                    vertical: 6,
                                                  ),
                                            ),
                                            child: const Text(
                                              'Reject',
                                              style: TextStyle(fontSize: 12),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            onPressed: approvalId.isEmpty
                                                ? null
                                                : () => _handleApprovalAction(
                                                    approvalId,
                                                    'Approved',
                                                  ),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: const Color(
                                                0xFF22C55E,
                                              ),
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 14,
                                                    vertical: 8,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(999),
                                              ),
                                              elevation: 0,
                                            ),
                                            child: const Text(
                                              'Approve',
                                              style: TextStyle(fontSize: 12),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
              Text(
                'Detailed Status',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.06)
                      : const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : const Color(0xFFE5E7EB),
                  ),
                ),
                child: Column(
                  children: [
                    _StatusRow(
                      label: 'Inspection',
                      isCompleted: booking.inspectionCompletedAt != null,
                      time: _formatDateTime(
                        context,
                        booking.inspectionCompletedAt,
                      ),
                      isDark: isDark,
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Divider(height: 1),
                    ),
                    _StatusRow(
                      label: 'Service & QC',
                      isCompleted: booking.qcCompletedAt != null,
                      time: _formatDateTime(context, booking.qcCompletedAt),
                      isDark: isDark,
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Divider(height: 1),
                    ),
                    _StatusRow(
                      label: 'Payment',
                      isCompleted: booking.paymentStatus == 'paid',
                      time: booking.paymentStatus == 'paid'
                          ? 'Completed'
                          : 'Pending',
                      isDark: isDark,
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
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.06)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : const Color(0xFFE5E7EB),
                  ),
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
                    Builder(
                      builder: (context) {
                        final labels = booking.pickupRequired
                            ? [
                                'Booking Confirmed',
                                booking.status == 'REACHED_CUSTOMER'
                                    ? 'Staff is waiting for pickup'
                                    : 'Pickup Scheduled',
                                'At Service Center',
                                'Service In Progress',
                                booking.status == 'SERVICE_COMPLETED' &&
                                        booking.paymentStatus != 'paid'
                                    ? 'Waiting for Payment'
                                    : (booking.status == 'OUT_FOR_DELIVERY'
                                          ? 'Out for Delivery'
                                          : 'Service Completed'),
                                'Delivered',
                              ]
                            : [
                                'Booking Confirmed',
                                'Merchant Assigned',
                                'At Service Center',
                                'Service In Progress',
                                booking.status == 'SERVICE_COMPLETED' &&
                                        booking.paymentStatus != 'paid'
                                    ? 'Waiting for Payment'
                                    : 'Service Completed',
                                'Delivered',
                              ];
                        final firstTime = _formatDateTime(
                          context,
                          booking.date,
                        );
                        if (labels.length >= 6) {
                          return _TwoLineStepper(
                            labels: labels,
                            activeIndex: currentIndex,
                            firstTimeLabel: firstTime,
                          );
                        }
                        return _HorizontalStepper(
                          labels: labels,
                          activeIndex: currentIndex,
                          firstTimeLabel: firstTime,
                        );
                      },
                    ),
                  ],
                ),
              ),
              if (booking.status == 'REACHED_MERCHANT') ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _handleMarkAtMerchant,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'I have arrived at Workshop',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
              if ((booking.status == 'DELIVERED' ||
                      booking.status == 'COMPLETED') &&
                  (!_hasMerchantReview || !_hasPlatformReview)) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _showReviewDialog,
                    icon: const Icon(Icons.star),
                    label: const Text(
                      'Rate your experience',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.amber,
                      foregroundColor: Colors.black87,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              if (booking.status == 'SERVICE_COMPLETED' &&
                  booking.paymentStatus != 'paid') ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF6366F1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.payment, color: Color(0xFF4F46E5)),
                          const SizedBox(width: 8),
                          Text(
                            'Payment Required',
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF4F46E5),
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Service is completed. Please pay ₹${booking.totalAmount} to proceed with vehicle delivery.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF4B5563),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isPaymentLoading ? null : _handlePayment,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4F46E5),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
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
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
              if (booking.prePickupPhotos.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Pre-Pickup Photos',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: booking.prePickupPhotos.length,
                    separatorBuilder: (context, _) => const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final url = _resolveImageUrl(
                        booking.prePickupPhotos[index],
                      )!;
                      return GestureDetector(
                        onTap: () => _showImagePreview(url),
                        child: Container(
                          width: 100,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.1)
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(11),
                            child: Image.network(url, fit: BoxFit.cover),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
              if (booking.beforeServicePhotos.isNotEmpty ||
                  booking.duringServicePhotos.isNotEmpty ||
                  booking.postServicePhotos.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(
                  'Service Photos',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (booking.beforeServicePhotos.isNotEmpty)
                        _buildHorizontalPhotoCategory(
                          context,
                          const SizedBox.shrink(),
                          title: 'Before Service',
                          photos: booking.beforeServicePhotos,
                          isDark: isDark,
                        ),
                      if (booking.duringServicePhotos.isNotEmpty)
                        _buildHorizontalPhotoCategory(
                          context,
                          booking.beforeServicePhotos.isNotEmpty
                              ? const SizedBox(width: 16)
                              : const SizedBox.shrink(),
                          title: 'During Service',
                          photos: booking.duringServicePhotos,
                          isDark: isDark,
                        ),
                      if (booking.postServicePhotos.isNotEmpty)
                        _buildHorizontalPhotoCategory(
                          context,
                          (booking.beforeServicePhotos.isNotEmpty ||
                                  booking.duringServicePhotos.isNotEmpty)
                              ? const SizedBox(width: 16)
                              : const SizedBox.shrink(),
                          title: 'After Service',
                          photos: booking.postServicePhotos,
                          isDark: isDark,
                        ),
                    ],
                  ),
                ),
              ],
              if (booking.invoiceUrl != null) ...[
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => launchUrl(
                      Uri.parse(_resolveImageUrl(booking.invoiceUrl)!),
                      mode: LaunchMode.externalApplication,
                    ),
                    icon: const Icon(Icons.download),
                    label: const Text('Download Invoice'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
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
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.06)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.08)
                            : const Color(0xFFE5E7EB),
                      ),
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
                                color: isDark ? Colors.white70 : Colors.black54,
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

  Widget _buildHorizontalPhotoCategory(
    BuildContext context,
    Widget spacing, {
    required String title,
    required List<String> photos,
    required bool isDark,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        spacing,
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white70 : Colors.black54,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: List.generate(photos.length, (index) {
                final url = _resolveImageUrl(photos[index])!;
                return GestureDetector(
                  onTap: () => _showImagePreview(url),
                  child: Container(
                    width: 100,
                    height: 100,
                    margin: EdgeInsets.only(
                      right: index == photos.length - 1 ? 0 : 10,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(11),
                      child: Image.network(url, fit: BoxFit.cover),
                    ),
                  ),
                );
              }),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    String? name,
    String? phone,
    String? subtitle,
    required bool isDark,
    required List<Widget> actions,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.06)
            : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : const Color(0xFFE5E7EB),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: const Color(0xFF4F46E5)),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (name != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (phone != null)
                        Text(
                          phone,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: isDark ? Colors.white70 : Colors.black54,
                              ),
                        ),
                    ],
                  ),
                ),
                Row(children: actions),
              ],
            ),
          ] else if (subtitle != null)
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: isDark ? Colors.white70 : Colors.black54,
                fontStyle: FontStyle.italic,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCircleActionButton({
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
        child: Icon(icon, size: 18, color: color),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final bool isCompleted;
  final String time;
  final bool isDark;

  const _StatusRow({
    required this.label,
    required this.isCompleted,
    required this.time,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isCompleted
                ? const Color(0xFF22C55E)
                : const Color(0xFF94A3B8),
          ),
          child: Icon(
            isCompleted ? Icons.check : Icons.access_time,
            size: 12,
            color: Colors.white,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
        ),
        Text(
          time,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: isDark ? Colors.white70 : Colors.black54,
          ),
        ),
      ],
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final barColor = isDark
        ? const Color(0xFF374151)
        : const Color(0xFFE5E7EB); // slate 700 / gray 200
    final inactiveDotFill = isDark
        ? const Color(0xFF9CA3AF)
        : Colors.white; // slate 400
    final inactiveDotBorder = isDark
        ? const Color(0xFF9CA3AF)
        : const Color(0xFFE5E7EB);
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
              height: 60,
              child: Stack(
                alignment: Alignment.centerLeft,
                children: [
                  Positioned.fill(
                    child: Container(
                      height: 6,
                      margin: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: barColor,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          width: (w - 24) * progress,
                          height: 6,
                          decoration: BoxDecoration(
                            color: const Color(0xFF4F46E5),
                            borderRadius: BorderRadius.circular(999),
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
                        width: math.max(spacing, 96.0),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: completed
                                  ? const Color(0xFF4F46E5)
                                  : inactiveDotFill,
                              border: Border.all(
                                color: completed
                                    ? const Color(0xFF4F46E5)
                                    : inactiveDotBorder,
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
                                    size: 15,
                                    color: Colors.white,
                                  )
                                : null,
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
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
                    final itemWidth = math.max(spacing, 96.0);
                    return SizedBox(
                      width: itemWidth,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            label,
                            maxLines: 3,
                            overflow: TextOverflow.visible,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isActive
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                              color: completed
                                  ? (isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A))
                                  : (isDark
                                        ? Colors.white60
                                        : const Color(0xFF94A3B8)),
                            ),
                          ),
                          if (i == 0 && firstTimeLabel != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                firstTimeLabel!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
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

class _TwoLineStepper extends StatelessWidget {
  final List<String> labels;
  final int activeIndex;
  final String? firstTimeLabel;

  const _TwoLineStepper({
    required this.labels,
    required this.activeIndex,
    this.firstTimeLabel,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final barColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);
    final inactiveDotFill = isDark ? const Color(0xFF9CA3AF) : Colors.white;
    final inactiveDotBorder = isDark
        ? const Color(0xFF9CA3AF)
        : const Color(0xFFE5E7EB);
    final total = labels.length;
    final split = (total + 1) ~/ 2;
    final top = labels.sublist(0, split);
    final bottom = labels.sublist(split);

    int topActive = activeIndex < split ? activeIndex : (split - 1);
    if (topActive < 0) topActive = -1;
    int bottomActive = activeIndex - split;
    if (bottomActive < 0) bottomActive = -1;

    Widget buildRowStepper(List<String> rowLabels, int rowActive) {
      final count = rowLabels.length;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 60,
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                Positioned.fill(
                  child: Container(
                    height: 6,
                    margin: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: barColor,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: List.generate(count, (i) {
                        final completed = i <= rowActive && rowActive >= 0;
                        return Expanded(
                          child: Align(
                            alignment: Alignment.center,
                            child: Container(
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: completed
                                    ? const Color(0xFF4F46E5)
                                    : inactiveDotFill,
                                border: Border.all(
                                  color: completed
                                      ? const Color(0xFF4F46E5)
                                      : inactiveDotBorder,
                                  width: 2,
                                ),
                              ),
                              child: completed
                                  ? const Icon(
                                      Icons.check,
                                      size: 15,
                                      color: Colors.white,
                                    )
                                  : null,
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: List.generate(count, (i) {
              final completed = i <= rowActive && rowActive >= 0;
              final isActive = i == rowActive;
              return Expanded(
                child: Column(
                  children: [
                    Text(
                      rowLabels[i],
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isActive
                            ? FontWeight.w800
                            : FontWeight.w600,
                        color: completed
                            ? (isDark ? Colors.white : const Color(0xFF0F172A))
                            : (isDark
                                  ? Colors.white60
                                  : const Color(0xFF94A3B8)),
                      ),
                    ),
                    if (i == 0 && firstTimeLabel != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          firstTimeLabel!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
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
        ],
      );
    }

    return Column(
      children: [
        buildRowStepper(top, topActive),
        const SizedBox(height: 16),
        if (bottom.isNotEmpty) buildRowStepper(bottom, bottomActive),
      ],
    );
  }
}
