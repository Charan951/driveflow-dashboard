import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';

import 'package:flutter_map_cancellable_tile_provider/flutter_map_cancellable_tile_provider.dart';
import 'package:http/http.dart' as http;
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../core/env.dart';
import '../core/api_client.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';
import '../services/payment_service.dart';
import '../services/review_service.dart';
import '../services/socket_service.dart';
import '../state/auth_provider.dart';
import 'package:provider/provider.dart';

class TrackBookingPage extends StatefulWidget {
  const TrackBookingPage({super.key});

  @override
  State<TrackBookingPage> createState() => _TrackBookingPageState();
}

class _TrackBookingPageState extends State<TrackBookingPage> {
  final _service = BookingService();
  final _paymentService = PaymentService();
  Razorpay? _razorpay;
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
  bool _mapReady = false;

  // Live tracking state
  LatLng? _liveLatLng;
  String? _liveName;
  DateTime? _liveUpdatedAt;
  bool _isPaymentLoading = false;
  bool get _socketConnected => _socketService.isConnected;
  String? _socketError;

  @override
  void initState() {
    super.initState();
    _socketService = SocketService();
    _socketService.addListener(_onSocketUpdate);
    _setupSocketListeners();

    if (!kIsWeb) {
      _razorpay = Razorpay();
      _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
      _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
      _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    }
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    // Show a loading dialog while verifying
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final verifyData = {
        'razorpay_order_id': response.orderId,
        'razorpay_payment_id': response.paymentId,
        'razorpay_signature': response.signature,
        'bookingId': _bookingId,
      };

      final result = await _paymentService.verifyPayment(verifyData);

      if (mounted) {
        Navigator.pop(context); // Close loading dialog

        if (result['success'] == true || result['bookingId'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment Successful!'),
              backgroundColor: Colors.green,
            ),
          );
          _load(); // Reload to update status
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Payment verification failed: ${result['message']}',
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Verification error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Payment failed: ${response.message ?? "Unknown error"}'),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External wallet: ${response.walletName}')),
    );
  }

  void _setupSocketListeners() {
    _socketService.on('liveLocation', (data) {
      if (!mounted) return;
      if (data != null && data is Map) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final lat = mapData['lat'];
          final lng = mapData['lng'];
          if (lat is num && lng is num) {
            final next = LatLng(lat.toDouble(), lng.toDouble());
            setState(() {
              _liveLatLng = next;
              _liveName = mapData['name']?.toString();
              _liveUpdatedAt = DateTime.tryParse(
                mapData['updatedAt']?.toString() ?? '',
              );
            });

            // Safely move map if ready
            if (_mapReady) {
              try {
                _mapController.move(next, 16.0);
              } catch (e) {
                // Ignore
              }
            }

            if (_booking?.location?.lat != null &&
                _booking?.location?.lng != null) {
              _fetchRoute(
                next,
                LatLng(_booking!.location!.lat!, _booking!.location!.lng!),
              );
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    _socketService.on('bookingUpdated', (data) {
      if (!mounted) return;
      if (data != null && data is Map) {
        try {
          final mapData = jsonDecode(jsonEncode(data)) as Map<String, dynamic>;
          final updated = Booking.fromJson(mapData);
          if (updated.id == _bookingId) {
            setState(() => _booking = updated);
            if (updated.status == 'DELIVERED' ||
                updated.status == 'COMPLETED') {
              _fetchReviewsStatus(updated.id);
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    });
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
    }
  }

  @override
  void dispose() {
    _razorpay?.clear();
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

    debugPrint('Starting payment for booking: ${booking.id}');
    setState(() => _isPaymentLoading = true);
    try {
      // Create Razorpay order
      final orderData = await _paymentService.createOrder(
        bookingId: booking.id,
        amount: booking.totalAmount,
      );

      debugPrint('Order data received: $orderData');

      if (mounted) {
        final user = context.read<AuthProvider>().user;
        final razorpayKey =
            (orderData['key'] ?? orderData['razorpay_key'] ?? Env.razorpayKey)
                .toString();
        final orderId =
            (orderData['orderId'] ??
                    orderData['order_id'] ??
                    orderData['id'] ??
                    '')
                .toString();
        final amount = (orderData['amount'] as num).toInt();

        final options = {
          'key': razorpayKey,
          'amount': amount,
          'name': 'Speshway',
          if (orderId.isNotEmpty) 'order_id': orderId,
          'description': 'Service Payment',
          'prefill': {
            'contact': (user?.phone ?? '').toString(),
            'email': (user?.email ?? '').toString(),
          },
          'external': {
            'wallets': ['paytm', 'phonepe', 'mobikwik', 'freecharge'],
          },
          'timeout': 300, // 5 minutes
          'upi_link': true,
          'retry': {'enabled': true, 'max_count': 1},
          'theme': {'color': '#2563EB'},
        };

        debugPrint('Opening Razorpay with options: $options');
        if (razorpayKey == 'REPLACE_WITH_LIVE_KEY') {
          debugPrint('WARNING: Using placeholder Razorpay key in production!');
        }

        if (kIsWeb) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payments are only available on mobile'),
            ),
          );
        } else {
          _razorpay?.open(options);
        }
      }
    } catch (e) {
      debugPrint('Payment error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment initiation failed: $e'),
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
    if (url.isEmpty) return;
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(10),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              child: CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.contain,
                placeholder: (context, url) => const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
                errorWidget: (context, url, error) => const Icon(
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
        return 'Reached Customer';
      case 'VEHICLE_PICKED':
        return 'Vehicle Picked';
      case 'REACHED_MERCHANT':
        return 'Reached Merchant';
      case 'VEHICLE_AT_MERCHANT':
        return 'At Garage';
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
            booking.status == 'VEHICLE_AT_MERCHANT' ||
            booking.status == 'SERVICE_STARTED' ||
            booking.status == 'SERVICE_COMPLETED' ||
            booking.status == 'OUT_FOR_DELIVERY');

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
                        color: isDark ? Colors.white : Colors.black54,
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
            else if (_booking == null)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: Center(child: Text('Booking not found')),
              )
            else ...[
              Builder(
                builder: (context) {
                  final booking = _booking!;
                  final isCarWash =
                      booking.services.any((s) {
                        final cat = s.category;
                        return cat == 'Car Wash' ||
                            cat == 'Wash' ||
                            cat == 'Detailing';
                      }) ||
                      booking.carWash?.isCarWashService == true;
                  final isBatteryTire =
                      booking.services.any((s) {
                        final cat = s.category;
                        return cat == 'Battery' ||
                            cat == 'Tyres' ||
                            cat == 'Tyre & Battery';
                      }) ||
                      booking.batteryTire?.isBatteryTireService == true;

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                                onMapReady: () {
                                  setState(() => _mapReady = true);
                                },
                              ),
                              children: [
                                TileLayer(
                                  urlTemplate:
                                      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                  userAgentPackageName: Env.userAgent,
                                  tileProvider:
                                      CancellableNetworkTileProvider(),
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
                                    if (booking.pickupRequired &&
                                        _liveLatLng != null)
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
                                child: Icon(
                                  isCarWash
                                      ? Icons.wash
                                      : Icons.directions_car_filled,
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
                                      isCarWash
                                          ? 'Staff is nearby'
                                          : 'Staff is nearby',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                            color: const Color(0xFF166534),
                                          ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      isCarWash
                                          ? 'Your car wash partner has almost reached your location.'
                                          : 'Your pickup partner has almost reached your location.',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: const Color(0xFF166534),
                                          ),
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
                              ? Colors.black
                              : const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isDark
                                ? Colors.grey.shade900
                                : const Color(0xFFE5E7EB),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (booking.pickupRequired || isCarWash) ...[
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
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                  ),
                                  if (_liveLatLng != null &&
                                      _liveUpdatedAt != null)
                                    Text(
                                      ' • ${_formatClockTime(context, _liveUpdatedAt!)}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                  if (_etaTextDuration != null &&
                                      _etaTextDistance != null)
                                    Padding(
                                      padding: const EdgeInsets.only(left: 8),
                                      child: Text(
                                        'ETA: $_etaTextDuration • $_etaTextDistance',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                    ),
                                ] else ...[
                                  Expanded(
                                    child: Text(
                                      'Pickup not required. Go directly to the workshop.',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              (booking.pickupRequired || isCarWash)
                                  ? (bookingLoc?.address != null &&
                                            bookingLoc!.address!.isNotEmpty
                                        ? bookingLoc.address!
                                        : (bookingLatLng == null
                                              ? 'Service location not set'
                                              : '${bookingLatLng.latitude.toStringAsFixed(6)}, ${bookingLatLng.longitude.toStringAsFixed(6)}'))
                                  : (merchantLoc?.address != null &&
                                            merchantLoc!.address!.isNotEmpty
                                        ? merchantLoc.address!
                                        : (merchantLatLng == null
                                              ? 'Workshop location not set'
                                              : '${merchantLatLng.latitude.toStringAsFixed(6)}, ${merchantLatLng.longitude.toStringAsFixed(6)}')),
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: isDark
                                        ? Colors.white70
                                        : Colors.black87,
                                  ),
                            ),
                            if ((booking.pickupRequired || isCarWash) &&
                                _liveLatLng != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                '${_liveName ?? 'Staff'} • ${_liveUpdatedAt != null ? _formatClockTime(context, _liveUpdatedAt!) : 'Live'}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: isDark
                                          ? Colors.white70
                                          : Colors.black87,
                                    ),
                              ),
                            ],
                            if ((booking.pickupRequired || isCarWash) &&
                                _socketError != null &&
                                _socketError!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                _socketError!,
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color: isDark
                                          ? Colors.white70
                                          : Colors.black54,
                                    ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Driver/Staff Details Section
                      (() {
                        final name =
                            booking.carWash?.staffName ??
                            booking.driverName ??
                            booking.technicianName;
                        final phone =
                            booking.carWash?.staffPhone ??
                            booking.driverPhone ??
                            booking.technicianPhone;

                        return _buildInfoCard(
                          context,
                          title: isCarWash ? 'Staff Details' : 'Driver Details',
                          icon: isCarWash ? Icons.person : Icons.two_wheeler,
                          name: name,
                          phone: phone,
                          subtitle: name == null
                              ? 'your ${isCarWash ? 'staff' : 'driver'} details provided shortly'
                              : null,
                          isDark: isDark,
                          actions: phone != null
                              ? [
                                  _buildCircleActionButton(
                                    icon: Icons.phone,
                                    color: const Color(0xFF22C55E),
                                    bgColor: const Color(0xFFDCFCE7),
                                    onTap: () =>
                                        launchUrl(Uri.parse('tel:$phone')),
                                  ),
                                ]
                              : [],
                        );
                      })(),
                      const SizedBox(height: 12),
                      // Service Center Section - only for non-car wash
                      if (!isCarWash) ...[
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
                                onTap: () => launchUrl(
                                  Uri.parse('tel:${booking.merchantPhone}'),
                                ),
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
                      ],
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.black
                              : const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark
                                ? Colors.grey.shade900
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
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall
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
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: isDark
                                        ? Colors.white70
                                        : Colors.black54,
                                  ),
                            ),
                            const SizedBox(height: 12),
                            if (booking.vehicle != null) ...[
                              Row(
                                children: [
                                  if (_resolveImageUrl(
                                        booking.vehicle!.image,
                                      ) !=
                                      null)
                                    Container(
                                      width: 60,
                                      height: 60,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: isDark
                                              ? Colors.grey.shade900
                                              : const Color(0xFFE5E7EB),
                                        ),
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(11),
                                        child: CachedNetworkImage(
                                          imageUrl: _resolveImageUrl(
                                            booking.vehicle!.image,
                                          )!,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) =>
                                              const Center(
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                    ),
                                              ),
                                          errorWidget: (context, url, error) =>
                                              const Icon(
                                                Icons.broken_image,
                                                size: 20,
                                              ),
                                        ),
                                      ),
                                    ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${booking.vehicle!.make} ${booking.vehicle!.model}',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodyMedium
                                              ?.copyWith(
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                        Text(
                                          booking.vehicle!.licensePlate,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
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
                                        color: isDark
                                            ? Colors.white70
                                            : Colors.black54,
                                      ),
                                ),
                                Text(
                                  '₹${booking.totalAmount}',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        color: isDark
                                            ? Colors.white
                                            : Colors.black87,
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                              ],
                            ),
                            if ((isCarWash || isBatteryTire) &&
                                booking.paymentStatus == 'pending')
                              Container(
                                margin: const EdgeInsets.only(top: 12),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF7ED),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: const Color(0xFFFFEDD5),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.warning_amber_rounded,
                                      size: 16,
                                      color: Color(0xFFC2410C),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        isCarWash
                                            ? 'Payment required to confirm your car wash booking'
                                            : 'Payment required to confirm your battery/tire booking',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFFC2410C),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if ((isCarWash || isBatteryTire) &&
                                booking.paymentStatus == 'paid')
                              Container(
                                margin: const EdgeInsets.only(top: 12),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0FDF4),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: const Color(0xFFDCFCE7),
                                  ),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(
                                      Icons.check_circle_outline,
                                      size: 16,
                                      color: Color(0xFF15803D),
                                    ),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Payment completed',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF15803D),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (booking.paymentStatus != 'paid') ...[
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _isPaymentLoading
                                      ? null
                                      : _handlePayment,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF2563EB),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 16,
                                    ),
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
                                            color: Colors.white,
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : Text(
                                          (isCarWash || isBatteryTire)
                                              ? 'Pay Now to Confirm'
                                              : 'Pay Now',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if ((booking.status == 'OUT_FOR_DELIVERY' ||
                              booking.status == 'SERVICE_COMPLETED' ||
                              (isCarWash &&
                                  booking.status == 'CAR_WASH_COMPLETED')) &&
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
                                isCarWash ? 'Completion OTP' : 'Delivery OTP',
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
                                      isCarWash
                                          ? 'Share this code with our staff to confirm service completion.'
                                          : 'Share this code only with our staff at the time of delivery.',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: const Color(0xFF4B5563),
                                          ),
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
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
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
                                    newImageUrl = _resolveImageUrl(
                                      data['image'],
                                    );
                                    oldImageUrl = _resolveImageUrl(
                                      data['oldImage'],
                                    );
                                  }
                                  double? total;
                                  if (quantity != null && price != null) {
                                    total = quantity * price;
                                  }
                                  final approvalId =
                                      approval['_id']?.toString() ?? '';
                                  return Container(
                                    margin: const EdgeInsets.only(top: 8),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          width: 24,
                                          height: 24,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFEF3C7),
                                            borderRadius: BorderRadius.circular(
                                              999,
                                            ),
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
                                                padding: const EdgeInsets.all(
                                                  10,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: Colors.white,
                                                  borderRadius:
                                                      BorderRadius.circular(16),
                                                  border: Border.all(
                                                    color: const Color(
                                                      0xFFFCD34D,
                                                    ),
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
                                                                      FontWeight
                                                                          .w600,
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
                                                                      FontWeight
                                                                          .w700,
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
                                                        padding:
                                                            const EdgeInsets.only(
                                                              top: 2,
                                                            ),
                                                        child: Text(
                                                          'Qty: ${quantity ?? '-'} • Price: ₹${price != null ? price.toStringAsFixed(2) : '-'}',
                                                          style: Theme.of(context)
                                                              .textTheme
                                                              .bodySmall
                                                              ?.copyWith(
                                                                color:
                                                                    const Color(
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
                                                                      color: const Color(
                                                                        0xFF4B5563,
                                                                      ),
                                                                      fontSize:
                                                                          10,
                                                                    ),
                                                                overflow:
                                                                    TextOverflow
                                                                        .ellipsis,
                                                              ),
                                                              const SizedBox(
                                                                height: 4,
                                                              ),
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
                                                                      color: const Color(
                                                                        0xFFE5E7EB,
                                                                      ),
                                                                    ),
                                                                  ),
                                                                  clipBehavior:
                                                                      Clip.antiAlias,
                                                                  child:
                                                                      _resolveImageUrl(
                                                                            newImageUrl,
                                                                          ) !=
                                                                          null
                                                                      ? CachedNetworkImage(
                                                                          imageUrl: _resolveImageUrl(
                                                                            newImageUrl,
                                                                          )!,
                                                                          fit: BoxFit
                                                                              .cover,
                                                                          placeholder:
                                                                              (
                                                                                context,
                                                                                url,
                                                                              ) => const Center(
                                                                                child: CircularProgressIndicator(
                                                                                  strokeWidth: 2,
                                                                                ),
                                                                              ),
                                                                          errorWidget:
                                                                              (
                                                                                context,
                                                                                url,
                                                                                error,
                                                                              ) => const Icon(
                                                                                Icons.broken_image,
                                                                                size: 20,
                                                                              ),
                                                                        )
                                                                      : Center(
                                                                          child: Text(
                                                                            'No image',
                                                                            style:
                                                                                Theme.of(
                                                                                  context,
                                                                                ).textTheme.bodySmall?.copyWith(
                                                                                  color: const Color(
                                                                                    0xFF9CA3AF,
                                                                                  ),
                                                                                  fontSize: 8,
                                                                                ),
                                                                          ),
                                                                        ),
                                                                ),
                                                              ),
                                                            ],
                                                          ),
                                                        ),
                                                        const SizedBox(
                                                          width: 8,
                                                        ),
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
                                                                      color: const Color(
                                                                        0xFF4B5563,
                                                                      ),
                                                                      fontSize:
                                                                          10,
                                                                    ),
                                                                overflow:
                                                                    TextOverflow
                                                                        .ellipsis,
                                                              ),
                                                              const SizedBox(
                                                                height: 4,
                                                              ),
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
                                                                      color: const Color(
                                                                        0xFFE5E7EB,
                                                                      ),
                                                                    ),
                                                                  ),
                                                                  clipBehavior:
                                                                      Clip.antiAlias,
                                                                  child:
                                                                      _resolveImageUrl(
                                                                            oldImageUrl,
                                                                          ) !=
                                                                          null
                                                                      ? CachedNetworkImage(
                                                                          imageUrl: _resolveImageUrl(
                                                                            oldImageUrl,
                                                                          )!,
                                                                          fit: BoxFit
                                                                              .cover,
                                                                          placeholder:
                                                                              (
                                                                                context,
                                                                                url,
                                                                              ) => const Center(
                                                                                child: CircularProgressIndicator(
                                                                                  strokeWidth: 2,
                                                                                ),
                                                                              ),
                                                                          errorWidget:
                                                                              (
                                                                                context,
                                                                                url,
                                                                                error,
                                                                              ) => const Icon(
                                                                                Icons.broken_image,
                                                                                size: 20,
                                                                              ),
                                                                        )
                                                                      : Center(
                                                                          child: Text(
                                                                            'No image',
                                                                            style:
                                                                                Theme.of(
                                                                                  context,
                                                                                ).textTheme.bodySmall?.copyWith(
                                                                                  color: const Color(
                                                                                    0xFF9CA3AF,
                                                                                  ),
                                                                                  fontSize: 8,
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
                                                    onPressed:
                                                        approvalId.isEmpty
                                                        ? null
                                                        : () =>
                                                              _showRejectReasonSheet(
                                                                approvalId,
                                                              ),
                                                    style: OutlinedButton.styleFrom(
                                                      foregroundColor:
                                                          const Color(
                                                            0xFFB91C1C,
                                                          ),
                                                      side: const BorderSide(
                                                        color: Color(
                                                          0xFFFCA5A5,
                                                        ),
                                                      ),
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 12,
                                                            vertical: 6,
                                                          ),
                                                    ),
                                                    child: const Text(
                                                      'Reject',
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  ElevatedButton(
                                                    onPressed:
                                                        approvalId.isEmpty
                                                        ? null
                                                        : () =>
                                                              _handleApprovalAction(
                                                                approvalId,
                                                                'Approved',
                                                              ),
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor:
                                                          const Color(
                                                            0xFF22C55E,
                                                          ),
                                                      foregroundColor:
                                                          Colors.white,
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 14,
                                                            vertical: 8,
                                                          ),
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              999,
                                                            ),
                                                      ),
                                                      elevation: 0,
                                                    ),
                                                    child: const Text(
                                                      'Approve',
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                      ),
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
                      if (!isCarWash && !isBatteryTire) ...[
                        const SizedBox(height: 24),
                        Text(
                          'Detailed Status',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.black
                                : const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark
                                  ? Colors.grey.shade900
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: Column(
                            children: [
                              _StatusRow(
                                label: 'Inspection',
                                isCompleted:
                                    booking.inspectionCompletedAt != null,
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
                                time: _formatDateTime(
                                  context,
                                  booking.qcCompletedAt,
                                ),
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
                      ],
                      const SizedBox(height: 24),
                      Text(
                        'Service Progress',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.black : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark
                                ? Colors.grey.shade900
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
                                final services = booking.services;
                                final isCarWash =
                                    services.any((s) {
                                      final cat =
                                          s.category?.toLowerCase() ?? '';
                                      return cat.contains('car wash') ||
                                          cat.contains('wash');
                                    }) ||
                                    booking.carWash?.isCarWashService == true;

                                final isBatteryTire =
                                    services.any((s) {
                                      final cat =
                                          s.category?.toLowerCase() ?? '';
                                      return cat.contains('battery') ||
                                          cat.contains('tire') ||
                                          cat.contains('tyre');
                                    }) ||
                                    booking.batteryTire?.isBatteryTireService ==
                                        true;

                                List<String> labels;
                                List<String> statusFlow;
                                Map<String, String> labelToStatus;

                                if (isCarWash) {
                                  statusFlow = [
                                    'CREATED',
                                    'ASSIGNED',
                                    'REACHED_CUSTOMER',
                                    'CAR_WASH_STARTED',
                                    'CAR_WASH_COMPLETED',
                                    'DELIVERED',
                                  ];
                                  labels = [
                                    'Booking Confirmed',
                                    'Staff Assigned',
                                    'Reached Location',
                                    'Wash Started',
                                    'Wash Completed',
                                    'Delivered',
                                  ];
                                  labelToStatus = {
                                    'Booking Confirmed': 'CREATED',
                                    'Staff Assigned': 'ASSIGNED',
                                    'Reached Location': 'REACHED_CUSTOMER',
                                    'Wash Started': 'CAR_WASH_STARTED',
                                    'Wash Completed': 'CAR_WASH_COMPLETED',
                                    'Delivered': 'DELIVERED',
                                  };
                                } else if (isBatteryTire) {
                                  statusFlow = [
                                    'CREATED',
                                    'ASSIGNED',
                                    'STAFF_REACHED_MERCHANT',
                                    'PICKUP_BATTERY_TIRE',
                                    'REACHED_CUSTOMER',
                                    'INSTALLATION',
                                    'DELIVERY',
                                    'COMPLETED',
                                  ];
                                  labels = [
                                    'Booking Confirmed',
                                    'Staff Assigned',
                                    'Reached Merchant',
                                    'Picked Part',
                                    'Reached Location',
                                    'Installation',
                                    'Delivery',
                                    'Completed',
                                  ];
                                  labelToStatus = {
                                    'Booking Confirmed': 'CREATED',
                                    'Staff Assigned': 'ASSIGNED',
                                    'Reached Merchant':
                                        'STAFF_REACHED_MERCHANT',
                                    'Picked Part': 'PICKUP_BATTERY_TIRE',
                                    'Reached Location': 'REACHED_CUSTOMER',
                                    'Installation': 'INSTALLATION',
                                    'Delivery': 'DELIVERY',
                                    'Completed': 'COMPLETED',
                                  };
                                } else if (booking.pickupRequired) {
                                  // Pickup flow
                                  statusFlow = [
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
                                  labels = [
                                    'Booking Confirmed',
                                    'Staff Assigned',
                                    'Reached Customer',
                                    'Vehicle Picked',
                                    'Reached Merchant',
                                    'Service Started',
                                    'Service Completed',
                                    'Out for Delivery',
                                    'Delivered',
                                  ];
                                  labelToStatus = {
                                    'Booking Confirmed': 'CREATED',
                                    'Staff Assigned': 'ASSIGNED',
                                    'Reached Customer': 'REACHED_CUSTOMER',
                                    'Vehicle Picked': 'VEHICLE_PICKED',
                                    'Reached Merchant': 'REACHED_MERCHANT',
                                    'Service Started': 'SERVICE_STARTED',
                                    'Service Completed': 'SERVICE_COMPLETED',
                                    'Out for Delivery': 'OUT_FOR_DELIVERY',
                                    'Delivered': 'DELIVERED',
                                  };
                                } else {
                                  // No Pickup flow (Merchant location)
                                  statusFlow = [
                                    'CREATED',
                                    'ASSIGNED',
                                    'ACCEPTED',
                                    'SERVICE_STARTED',
                                    'SERVICE_COMPLETED',
                                    'DELIVERED',
                                  ];
                                  labels = [
                                    'Booking Confirmed',
                                    'Assigned',
                                    'Accepted',
                                    'Service Started',
                                    'Service Completed',
                                    'Delivered',
                                  ];
                                  labelToStatus = {
                                    'Booking Confirmed': 'CREATED',
                                    'Assigned': 'ASSIGNED',
                                    'Accepted': 'ACCEPTED',
                                    'Service Started': 'SERVICE_STARTED',
                                    'Service Completed': 'SERVICE_COMPLETED',
                                    'Delivered': 'DELIVERED',
                                  };
                                }

                                // Determine active index based on status flow
                                int activeIndex = statusFlow.indexOf(
                                  booking.status.toUpperCase(),
                                );
                                if (activeIndex == -1) {
                                  // Handle some aliases or special cases
                                  if (booking.status.toUpperCase() ==
                                          'COMPLETED' &&
                                      statusFlow.contains('DELIVERED')) {
                                    activeIndex = statusFlow.indexOf(
                                      'DELIVERED',
                                    );
                                  } else if (booking.status.toUpperCase() ==
                                          'DELIVERED' &&
                                      statusFlow.contains('COMPLETED')) {
                                    activeIndex = statusFlow.indexOf(
                                      'COMPLETED',
                                    );
                                  } else {
                                    activeIndex = 0;
                                  }
                                }

                                return _VerticalStepper(
                                  labels: labels,
                                  activeIndex: activeIndex,
                                  statusHistory: booking.statusHistory,
                                  labelToStatus: labelToStatus,
                                );
                              },
                            ),
                          ],
                        ),
                      ),
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
                                  const Icon(
                                    Icons.payment,
                                    color: Color(0xFF4F46E5),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Payment Required',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall
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
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: const Color(0xFF4B5563)),
                              ),
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: _isPaymentLoading
                                      ? null
                                      : _handlePayment,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF4F46E5),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 14,
                                    ),
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
                      // Inspection Photos Section (Frontend Parity)
                      if (booking.inspection != null &&
                          (booking.inspection!.frontPhoto != null ||
                              booking.inspection!.backPhoto != null ||
                              booking.inspection!.leftPhoto != null ||
                              booking.inspection!.rightPhoto != null)) ...[
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            const Icon(
                              Icons.shield_outlined,
                              size: 18,
                              color: Color(0xFF2563EB),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Vehicle Inspection',
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Photos of your vehicle taken by the service center before starting the service.',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: isDark ? Colors.white70 : Colors.black54,
                              ),
                        ),
                        const SizedBox(height: 12),
                        GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: 1.2,
                          children: [
                            if (booking.inspection!.frontPhoto != null)
                              _buildInspectionPhoto(
                                context,
                                'Front',
                                booking.inspection!.frontPhoto!,
                                isDark,
                              ),
                            if (booking.inspection!.backPhoto != null)
                              _buildInspectionPhoto(
                                context,
                                'Back',
                                booking.inspection!.backPhoto!,
                                isDark,
                              ),
                            if (booking.inspection!.leftPhoto != null)
                              _buildInspectionPhoto(
                                context,
                                'Left',
                                booking.inspection!.leftPhoto!,
                                isDark,
                              ),
                            if (booking.inspection!.rightPhoto != null)
                              _buildInspectionPhoto(
                                context,
                                'Right',
                                booking.inspection!.rightPhoto!,
                                isDark,
                              ),
                          ],
                        ),
                      ],

                      // Replaced Parts Section (Frontend Parity)
                      if (booking.serviceParts.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Text(
                          'Replaced Parts',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 12),
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: booking.serviceParts.length,
                          separatorBuilder: (context, _) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final part = booking.serviceParts[index];
                            return Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.black
                                    : const Color(0xFFF9FAFB),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isDark
                                      ? Colors.grey.shade900
                                      : const Color(0xFFE5E7EB),
                                ),
                              ),
                              child: Row(
                                children: [
                                  if (part.image != null)
                                    Container(
                                      width: 50,
                                      height: 50,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: isDark
                                              ? Colors.grey.shade900
                                              : const Color(0xFFE5E7EB),
                                        ),
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(7),
                                        child: CachedNetworkImage(
                                          imageUrl: _resolveImageUrl(
                                            part.image,
                                          )!,
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          part.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                        ),
                                        Text(
                                          'Qty: ${part.quantity} • Price: ₹${part.price}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: isDark
                                                ? Colors.white60
                                                : Colors.black54,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: part.fromInspection
                                                ? const Color(0xFFDCFCE7)
                                                : const Color(0xFFDBEAFE),
                                            borderRadius: BorderRadius.circular(
                                              99,
                                            ),
                                          ),
                                          child: Text(
                                            part.fromInspection
                                                ? 'From inspection'
                                                : 'New discovery',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                              color: part.fromInspection
                                                  ? const Color(0xFF166534)
                                                  : const Color(0xFF1E40AF),
                                            ),
                                          ),
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
                      if (booking.prePickupPhotos.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        Text(
                          isBatteryTire
                              ? 'Pickup & Installation'
                              : 'Pre-Pickup Photos',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 120,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: booking.prePickupPhotos.length,
                            separatorBuilder: (context, _) =>
                                const SizedBox(width: 10),
                            itemBuilder: (context, index) {
                              final url = _resolveImageUrl(
                                booking.prePickupPhotos[index],
                              );
                              if (url == null) return const SizedBox.shrink();
                              String photoLabel = '';
                              if (isBatteryTire) {
                                if (index == 0) photoLabel = 'New Part';
                                if (index == 1) photoLabel = 'Old Part';
                              } else {
                                photoLabel = 'Photo ${index + 1}';
                              }

                              return Column(
                                children: [
                                  GestureDetector(
                                    onTap: () => _showImagePreview(url),
                                    child: Container(
                                      width: 100,
                                      height: 100,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: isDark
                                              ? Colors.white.withValues(
                                                  alpha: 0.1,
                                                )
                                              : const Color(0xFFE5E7EB),
                                        ),
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(11),
                                        child: CachedNetworkImage(
                                          imageUrl: url,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) =>
                                              const Center(
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                    ),
                                              ),
                                          errorWidget: (context, url, error) =>
                                              const Icon(
                                                Icons.broken_image,
                                                size: 20,
                                              ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  if (photoLabel.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        photoLabel,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                        ),
                      ],
                      if (booking.beforeServicePhotos.isNotEmpty ||
                          booking.duringServicePhotos.isNotEmpty ||
                          booking.postServicePhotos.isNotEmpty ||
                          (isCarWash &&
                              ((booking.carWash != null &&
                                      booking
                                          .carWash!
                                          .beforeWashPhotos
                                          .isNotEmpty) ||
                                  (booking.carWash != null &&
                                      booking
                                          .carWash!
                                          .afterWashPhotos
                                          .isNotEmpty)))) ...[
                        const SizedBox(height: 24),
                        Text(
                          'Service Photos',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 12),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (isCarWash &&
                                  booking.carWash?.beforeWashPhotos != null &&
                                  booking.carWash!.beforeWashPhotos.isNotEmpty)
                                _buildHorizontalPhotoCategory(
                                  context,
                                  const SizedBox.shrink(),
                                  title: 'Before Wash',
                                  photos: booking.carWash!.beforeWashPhotos,
                                  isDark: isDark,
                                ),
                              if (isCarWash &&
                                  booking.carWash?.afterWashPhotos != null &&
                                  booking.carWash!.afterWashPhotos.isNotEmpty)
                                _buildHorizontalPhotoCategory(
                                  context,
                                  (booking
                                              .carWash
                                              ?.beforeWashPhotos
                                              .isNotEmpty ??
                                          false)
                                      ? const SizedBox(width: 16)
                                      : const SizedBox.shrink(),
                                  title: 'After Wash',
                                  photos: booking.carWash!.afterWashPhotos,
                                  isDark: isDark,
                                ),
                              if (!isCarWash &&
                                  booking.beforeServicePhotos.isNotEmpty)
                                _buildHorizontalPhotoCategory(
                                  context,
                                  const SizedBox.shrink(),
                                  title: 'Before Service',
                                  photos: booking.beforeServicePhotos,
                                  isDark: isDark,
                                ),
                              if (!isCarWash &&
                                  booking.duringServicePhotos.isNotEmpty)
                                _buildHorizontalPhotoCategory(
                                  context,
                                  booking.beforeServicePhotos.isNotEmpty
                                      ? const SizedBox(width: 16)
                                      : const SizedBox.shrink(),
                                  title: 'During Service',
                                  photos: booking.duringServicePhotos,
                                  isDark: isDark,
                                ),
                              if (!isCarWash &&
                                  booking.postServicePhotos.isNotEmpty)
                                _buildHorizontalPhotoCategory(
                                  context,
                                  (booking.beforeServicePhotos.isNotEmpty ||
                                          booking
                                              .duringServicePhotos
                                              .isNotEmpty)
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
                      // Warranty Information - Only for battery/tire
                      if (isBatteryTire &&
                          booking.batteryTire?.warrantyName != null) ...[
                        const SizedBox(height: 24),
                        Text(
                          'Warranty Information',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.black
                                : const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark
                                  ? Colors.grey.shade900
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (booking.batteryTire?.warrantyImage != null)
                                Container(
                                  width: 80,
                                  height: 80,
                                  margin: const EdgeInsets.only(right: 12),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isDark
                                          ? Colors.grey.shade900
                                          : const Color(0xFFE5E7EB),
                                    ),
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(11),
                                    child: CachedNetworkImage(
                                      imageUrl: _resolveImageUrl(
                                        booking.batteryTire!.warrantyImage,
                                      )!,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      booking.batteryTire!.warrantyName!,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Warranty: ${booking.batteryTire!.warrantyMonths} Months',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: isDark
                                                ? Colors.white70
                                                : Colors.black54,
                                          ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Price: ₹${booking.batteryTire!.warrantyPrice}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF2563EB),
                                          ),
                                    ),
                                  ],
                                ),
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
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
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
                              color: isDark ? Colors.black : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isDark
                                    ? Colors.grey.shade900
                                    : const Color(0xFFE5E7EB),
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    s.name,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                ),
                                Text(
                                  '₹${s.price}',
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(
                                        color: isDark
                                            ? Colors.white70
                                            : Colors.black54,
                                        fontWeight: FontWeight.w600,
                                      ),
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  );
                },
              ),
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
                final url = _resolveImageUrl(photos[index]);
                if (url == null) return const SizedBox.shrink();
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
                      child: CachedNetworkImage(
                        imageUrl: url,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => const Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        errorWidget: (context, url, error) =>
                            const Icon(Icons.broken_image, size: 20),
                      ),
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

  Widget _buildInspectionPhoto(
    BuildContext context,
    String label,
    String photoPath,
    bool isDark,
  ) {
    final url = _resolveImageUrl(photoPath);
    if (url == null) return const SizedBox.shrink();

    return Column(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => _showImagePreview(url),
            child: Container(
              width: double.infinity,
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
                child: CachedNetworkImage(
                  imageUrl: url,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  errorWidget: (context, url, error) =>
                      const Icon(Icons.broken_image, size: 20),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white70 : Colors.black87,
          ),
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
        color: isDark ? Colors.black : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.grey.shade900 : const Color(0xFFE5E7EB),
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

class _VerticalStepper extends StatelessWidget {
  final List<String> labels;
  final int activeIndex;
  final List<Map<String, String>> statusHistory;
  final Map<String, String> labelToStatus;

  const _VerticalStepper({
    required this.labels,
    required this.activeIndex,
    required this.statusHistory,
    required this.labelToStatus,
  });

  String? _getTimeForStep(String label) {
    final statusKey = labelToStatus[label];
    if (statusKey == null) return null;

    try {
      final historyEntry = statusHistory.firstWhere(
        (entry) => entry['status'] == statusKey,
      );
      final timestamp = historyEntry['timestamp'];
      if (timestamp != null) {
        final dt = DateTime.parse(timestamp).toLocal();
        final date =
            '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
        final hour = dt.hour > 12
            ? dt.hour - 12
            : (dt.hour == 0 ? 12 : dt.hour);
        final ampm = dt.hour >= 12 ? 'PM' : 'AM';
        final min = dt.minute.toString().padLeft(2, '0');
        return '$date • $hour:$min $ampm';
      }
    } catch (_) {
      // Status not found in history
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final barColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);
    final inactiveDotFill = isDark ? const Color(0xFF9CA3AF) : Colors.white;
    final inactiveDotBorder = isDark
        ? const Color(0xFF9CA3AF)
        : const Color(0xFFE5E7EB);

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: labels.length,
      itemBuilder: (context, index) {
        final isCompleted = index <= activeIndex;
        final isActive = index == activeIndex;
        final isLast = index == labels.length - 1;
        final timeStr = _getTimeForStep(labels[index]);

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Timeline Column
              SizedBox(
                width: 40,
                child: Column(
                  children: [
                    // Dot
                    Container(
                      width: 24,
                      height: 24,
                      margin: const EdgeInsets.only(top: 4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isCompleted
                            ? const Color(0xFF4F46E5)
                            : inactiveDotFill,
                        border: Border.all(
                          color: isCompleted
                              ? const Color(0xFF4F46E5)
                              : inactiveDotBorder,
                          width: 2,
                        ),
                      ),
                      child: isCompleted
                          ? const Icon(
                              Icons.check,
                              size: 14,
                              color: Colors.white,
                            )
                          : null,
                    ),
                    // Line
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 2,
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          color: isCompleted
                              ? const Color(0xFF4F46E5)
                              : barColor,
                          constraints: const BoxConstraints(minHeight: 30),
                        ),
                      ),
                  ],
                ),
              ),
              // Content Column
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24.0, top: 4.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        labels[index],
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: isActive
                              ? FontWeight.bold
                              : FontWeight.w600,
                          color: isCompleted
                              ? (isDark
                                    ? Colors.white
                                    : const Color(0xFF0F172A))
                              : (isDark
                                    ? Colors.white60
                                    : const Color(0xFF94A3B8)),
                        ),
                      ),
                      if (timeStr != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            timeStr,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
