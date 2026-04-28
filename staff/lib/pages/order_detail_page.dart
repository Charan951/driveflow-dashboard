import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../core/app_colors.dart';
import '../core/api_client.dart';
import '../models/booking.dart';
import '../services/booking_service.dart';
import '../services/tracking_service.dart';
import '../services/socket_service.dart';

class StaffOrderDetailPage extends StatefulWidget {
  const StaffOrderDetailPage({super.key});

  @override
  State<StaffOrderDetailPage> createState() => _StaffOrderDetailPageState();
}

class _StaffOrderDetailPageState extends State<StaffOrderDetailPage> {
  final BookingService _service = BookingService();
  final StaffTrackingService _tracking = StaffTrackingService.instance;
  final SocketService _socketService = SocketService();

  BookingDetail? _booking;
  bool _loading = true;
  String? _error;
  bool _updatingStatus = false;
  bool _uploadingPhotos = false;
  bool _showFullWorkflow = false;
  int _detailsTabIndex = 0;
  List<XFile> _selectedPhotos = const [];
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _socketService.addListener(_onSocketUpdate);
  }

  @override
  void dispose() {
    if (_booking != null) {
      _socketService.leaveRoom('booking_${_booking!.id}');
    }
    _socketService.removeListener(_onSocketUpdate);
    super.dispose();
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

  BookingLocation? _destinationLocation(BookingDetail booking) {
    BookingLocation? loc = booking.location;
    final s = booking.status.toUpperCase();
    if (s == 'VEHICLE_PICKED' ||
        s == 'REACHED_MERCHANT' ||
        s == 'VEHICLE_AT_MERCHANT' ||
        s == 'SERVICE_STARTED' ||
        s == 'SERVICE_COMPLETED') {
      loc = booking.merchantLocation ?? booking.location;
    }
    return loc;
  }

  Future<void> _capturePrePickupPhoto() async {
    final booking = _booking;
    if (booking == null || _uploadingPhotos) return;
    if (!booking.pickupRequired) return;
    final maxPhotos = _requiredPhotoCountForCurrentFlow(booking);
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
    final maxPhotos = _requiredPhotoCountForCurrentFlow(booking);
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
    final dest = _destinationLocation(booking);
    final targetLat = dest?.lat;
    final targetLng = dest?.lng;
    if (targetLat == null || targetLng == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Destination location not available')),
      );
      return;
    }
    final info = _tracking.info.value;
    final query = <String, String>{
      'api': '1',
      'destination': '$targetLat,$targetLng',
      'travelmode': 'driving',
    };
    if (info.lat != null && info.lng != null) {
      query['origin'] = '${info.lat},${info.lng}';
    }
    final uri = Uri.https('www.google.com', '/maps/dir/', query);
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
    final isDark = theme.brightness == Brightness.dark;

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

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
        foregroundColor: isDark ? Colors.white : Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order #$orderNum',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: isDark ? Colors.white : Colors.black,
              ),
            ),
            Row(
              children: [
                Text(
                  DateFormat(
                    'dd MMM yyyy',
                  ).format(DateTime.parse(booking.date)),
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '•',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  BookingDetail.getStatusLabel(
                    booking.status,
                    services: booking.services,
                  ),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isDark
                        ? AppColors.primaryPurple
                        : const Color(0xFF7C3AED),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailsTabs(booking),
            const SizedBox(height: 24),
            _buildStatusControl(booking),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusControl(BookingDetail booking) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isCarWash = booking.carWash?.isCarWashService == true;
    final isBatteryTire = booking.batteryTire?.isBatteryTireService == true;
    final nextAction = _getNextStatusAction(booking);
    final normalizedStatus = _normalizeStatus(booking.status);
    final allowedStatuses = <String>{
      'ASSIGNED',
      'ACCEPTED',
      'REACHED_CUSTOMER',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
      'CAR_WASH_STARTED',
      'CAR_WASH_COMPLETED',
      'STAFF_REACHED_MERCHANT',
      'PICKUP_BATTERY_TIRE',
      'INSTALLATION',
      'DELIVERY',
    };

    final requiredPhotos = _requiredPhotoCountForCurrentFlow(booking);
    final hasRequiredPhotos = booking.prePickupPhotos.length >= requiredPhotos;
    final shouldShowUpload =
        allowedStatuses.contains(normalizedStatus) && !hasRequiredPhotos;
    final canShowPrimary = nextAction != null;

    final isWaitingForPayment =
        !isCarWash &&
        !isBatteryTire &&
        normalizedStatus == 'SERVICE_COMPLETED' &&
        booking.paymentStatus != 'paid';

    final shouldDisablePrimaryAction =
        _updatingStatus ||
        isWaitingForPayment ||
        (nextAction?.status == 'VEHICLE_PICKED' &&
            booking.prePickupPhotos.length <
                requiredPhotos) ||
        (isBatteryTire &&
            (nextAction?.status == 'INSTALLATION' ||
                nextAction?.status == 'DELIVERY') &&
            booking.prePickupPhotos.length <
                requiredPhotos) ||
        (isCarWash &&
            (nextAction?.status == 'CAR_WASH_STARTED' ||
                nextAction?.status == 'CAR_WASH_COMPLETED') &&
            booking.prePickupPhotos.length <
                requiredPhotos);

    // Always add directions button if it makes sense for current status
    final canShowDirections =
        booking.status != 'DELIVERED' &&
        booking.status != 'COMPLETED' &&
        booking.status != 'CAR_WASH_COMPLETED' &&
        booking.status != 'SERVICE_COMPLETED';

    if (!canShowPrimary && !canShowDirections && !shouldShowUpload) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isWaitingForPayment) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.warning.withValues(alpha: 0.12)
                    : const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? AppColors.warning.withValues(alpha: 0.35)
                      : const Color(0xFFF59E0B),
                ),
              ),
              child: Text(
                'Waiting for customer payment before vehicle pickup for delivery.',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.warning : const Color(0xFF92400E),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (canShowPrimary)
            _statusButton(
              nextAction.status,
              nextAction.label,
              disabled: shouldDisablePrimaryAction,
            ),
          if (canShowDirections && (canShowPrimary || shouldShowUpload))
            const SizedBox(height: 12),
          if (canShowDirections)
            SizedBox(width: double.infinity, child: _directionsButton(booking)),
          if (shouldShowUpload) ...[
            if (canShowDirections || canShowPrimary) const SizedBox(height: 12),
            SizedBox(width: double.infinity, child: _photoUploadButton(booking)),
          ],
        ],
      ),
    );
  }

  String _normalizeStatus(String value) {
    return value.trim().toUpperCase().replaceAll(' ', '_');
  }

  _NextStatusAction? _getNextStatusAction(BookingDetail booking) {
    final status = _normalizeStatus(booking.status);
    final isCarWash = booking.carWash?.isCarWashService == true;
    final isBattery = booking.batteryTire?.isBatteryTireService == true;
    final isEssentials =
        booking.services?.any(
          (s) =>
              s['category']?.toString().toLowerCase().contains('essentials') ??
              false,
        ) ??
        false;

    if (isCarWash) {
      switch (status) {
        case 'ASSIGNED':
          return const _NextStatusAction('REACHED_CUSTOMER', 'Reached Customer');
        case 'REACHED_CUSTOMER':
          return _NextStatusAction(
            'CAR_WASH_STARTED',
            isEssentials ? 'Start Service' : 'Start Car Wash',
          );
        case 'CAR_WASH_STARTED':
          return _NextStatusAction(
            'CAR_WASH_COMPLETED',
            isEssentials ? 'Complete Service' : 'Complete Car Wash',
          );
        case 'CAR_WASH_COMPLETED':
          return const _NextStatusAction('DELIVERED', 'Complete Delivery');
        default:
          return null;
      }
    }

    if (isBattery) {
      switch (status) {
        case 'ASSIGNED':
          return const _NextStatusAction(
            'STAFF_REACHED_MERCHANT',
            'Reached Merchant',
          );
        case 'STAFF_REACHED_MERCHANT':
          return const _NextStatusAction(
            'PICKUP_BATTERY_TIRE',
            'Pickup Battery/Tire',
          );
        case 'PICKUP_BATTERY_TIRE':
          return const _NextStatusAction('REACHED_CUSTOMER', 'Reached Customer');
        case 'REACHED_CUSTOMER':
          return const _NextStatusAction('INSTALLATION', 'Start Installation');
        case 'INSTALLATION':
          return const _NextStatusAction('DELIVERY', 'Complete and Deliver');
        case 'DELIVERY':
          return const _NextStatusAction('COMPLETED', 'Verify OTP and Complete');
        default:
          return null;
      }
    }

    switch (status) {
      case 'ASSIGNED':
      case 'ACCEPTED':
        return const _NextStatusAction('REACHED_CUSTOMER', 'Reached Customer');
      case 'REACHED_CUSTOMER':
        return const _NextStatusAction(
          'VEHICLE_PICKED',
          'Pickup Vehicle from Customer',
        );
      case 'VEHICLE_PICKED':
        return const _NextStatusAction(
          'REACHED_MERCHANT',
          'Reached Service Center',
        );
      case 'SERVICE_COMPLETED':
        return const _NextStatusAction(
          'OUT_FOR_DELIVERY',
          'Pickup Vehicle from Workshop',
        );
      case 'OUT_FOR_DELIVERY':
        return const _NextStatusAction('DELIVERED', 'Complete Delivery');
      default:
        return null;
    }
  }

  int _requiredPhotoCountForCurrentFlow(BookingDetail booking) {
    final isCarWash = booking.carWash?.isCarWashService == true;
    final isBattery = booking.batteryTire?.isBatteryTireService == true;
    if (isCarWash || isBattery) return 2;
    return 4;
  }

  Widget _buildWorkflowCard(BookingDetail booking) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final flow = _statusFlowForBooking(booking);
    final normalizedStatus = booking.status.toUpperCase();
    final isCompletedOrDelivered =
        normalizedStatus == 'COMPLETED' || normalizedStatus == 'DELIVERED';
    final int currentIndex = flow.indexOf(booking.status.toUpperCase());
    final visibleCount = isCompletedOrDelivered
        ? flow.length
        : (_showFullWorkflow ? flow.length : (flow.length < 3 ? flow.length : 3));
    final visibleStatuses = flow.take(visibleCount).toList();
    final hasMore = !isCompletedOrDelivered && flow.length > 3;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.03),
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
              Icon(
                Icons.show_chart,
                size: 20,
                color: isDark
                    ? AppColors.primaryPurple
                    : const Color(0xFF7C3AED),
              ),
              const SizedBox(width: 8),
              Text(
                'Status & Workflow',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.backgroundSurface
                      : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'STEP ${currentIndex + 1}/${flow.length}',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isDark
                        ? AppColors.textSecondary
                        : const Color(0xFF6B7280),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          ...visibleStatuses.asMap().entries.map((entry) {
            final index = entry.key;
            final actualIndex = index;
            return _buildWorkflowStep(
              status: entry.value,
              index: actualIndex,
              currentIndex: currentIndex,
              isLast: index == visibleStatuses.length - 1,
              isDark: isDark,
            );
          }),
          if (hasMore) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {
                setState(() {
                  _showFullWorkflow = !_showFullWorkflow;
                });
              },
              icon: Icon(
                _showFullWorkflow ? Icons.expand_less : Icons.expand_more,
                size: 18,
              ),
              label: Text(_showFullWorkflow ? 'Show Less' : 'Show All Statuses'),
              style: OutlinedButton.styleFrom(
                foregroundColor: isDark ? Colors.white : const Color(0xFF111827),
                side: BorderSide(
                  color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailsTabs(BookingDetail booking) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.25)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _tabButton(
                  label: 'Status & Workflow',
                  selected: _detailsTabIndex == 0,
                  onTap: () {
                    setState(() {
                      _detailsTabIndex = 0;
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _tabButton(
                  label: 'Order Details',
                  selected: _detailsTabIndex == 1,
                  onTap: () {
                    setState(() {
                      _detailsTabIndex = 1;
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_detailsTabIndex == 0) _buildWorkflowCard(booking) else _buildOrderDetailsCard(booking),
        ],
      ),
    );
  }

  Widget _tabButton({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      height: 44,
      child: FilledButton(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          backgroundColor: selected
              ? (isDark ? AppColors.primaryPurple : const Color(0xFF7C3AED))
              : (isDark ? AppColors.backgroundSurface : const Color(0xFFF3F4F6)),
          foregroundColor: selected
              ? Colors.white
              : (isDark ? Colors.grey[300] : const Color(0xFF4B5563)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }

  List<String> _statusFlowForBooking(BookingDetail booking) {
    final bool isBattery = booking.batteryTire?.isBatteryTireService == true;
    final bool isCarWash = booking.carWash?.isCarWashService == true;

    if (isCarWash) {
      return [
        'CREATED',
        'ASSIGNED',
        'REACHED_CUSTOMER',
        'CAR_WASH_STARTED',
        'CAR_WASH_COMPLETED',
        'DELIVERED',
      ];
    }

    if (isBattery) {
      return [
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

    return [
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
  }

  Widget _buildWorkflowStep({
    required String status,
    required int index,
    required int currentIndex,
    required bool isLast,
    required bool isDark,
  }) {
    final isCompleted = index <= currentIndex;
    final isActive = index == currentIndex;
    final accent = isCompleted
        ? const Color(0xFF10B981)
        : (isDark ? AppColors.primaryPurple : const Color(0xFF7C3AED));

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: isCompleted
                    ? const Color(0xFF10B981)
                    : (isActive
                        ? accent
                        : (isDark
                            ? AppColors.backgroundSurface
                            : const Color(0xFFF3F4F6))),
                shape: BoxShape.circle,
                border: Border.all(
                  color: isActive
                      ? accent.withValues(alpha: 0.25)
                      : Colors.transparent,
                  width: 4,
                ),
              ),
              child: Center(
                child: isCompleted
                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                    : Text(
                        '${index + 1}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isActive ? Colors.white : const Color(0xFF9CA3AF),
                        ),
                      ),
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 42,
                color: isCompleted
                    ? const Color(0xFF10B981)
                    : (isDark ? AppColors.borderColor : const Color(0xFFE5E7EB)),
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  BookingDetail.getStatusLabel(status, services: _booking?.services),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                    color: isCompleted || isActive
                        ? (isDark ? Colors.white : const Color(0xFF111827))
                        : (isDark ? AppColors.textMuted : const Color(0xFF9CA3AF)),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isActive
                      ? 'Current step'
                      : isCompleted
                      ? 'Completed'
                      : 'Upcoming',
                  style: TextStyle(
                    fontSize: 12,
                    color: isCompleted
                        ? const Color(0xFF10B981)
                        : (isDark ? Colors.grey[500] : const Color(0xFF9CA3AF)),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _statusButton(String status, String label, {bool disabled = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      height: 54,
      child: FilledButton(
        onPressed: (_updatingStatus || disabled) ? null : () => _updateStatus(status),
        style: FilledButton.styleFrom(
          backgroundColor: isDark
              ? AppColors.primaryPurple
              : const Color(0xFF7C3AED),
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
                  color: Colors.white,
                ),
              ),
      ),
    );
  }

  Widget _photoUploadButton(BookingDetail booking) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final normalizedStatus = _normalizeStatus(booking.status);
    final requiredPhotos = _requiredPhotoCountForCurrentFlow(booking);
    String label = booking.prePickupPhotos.length >= requiredPhotos
        ? 'Photos Done'
        : 'Upload Photos';

    if (booking.carWash?.isCarWashService == true) {
      if (normalizedStatus == 'REACHED_CUSTOMER') {
        label = 'Upload Before Wash Photos';
      } else if (normalizedStatus == 'CAR_WASH_STARTED') {
        label = 'Upload After Wash Photos';
      }
    } else if (booking.batteryTire?.isBatteryTireService == true) {
      if (normalizedStatus == 'REACHED_CUSTOMER') {
        label = 'Upload Old and New Part Photos';
      } else {
        label = 'Upload Photos';
      }
    } else if (normalizedStatus == 'REACHED_CUSTOMER') {
      const prePickupLabels = ['Upload Front Photo', 'Upload Right Photo', 'Upload Back Photo', 'Upload Left Photo'];
      final idx = booking.prePickupPhotos.length.clamp(0, 3);
      label = booking.prePickupPhotos.length < requiredPhotos
          ? prePickupLabels[idx]
          : 'Upload Photos';
    }

    return SizedBox(
      height: 54,
      child: FilledButton.tonal(
        onPressed: _uploadingPhotos ? null : _showPrePickupPhotoOptions,
        style: FilledButton.styleFrom(
          backgroundColor: isDark
              ? AppColors.primaryPurple.withValues(alpha: 0.1)
              : const Color(0xFFF5F3FF),
          foregroundColor: isDark
              ? AppColors.primaryPurple
              : const Color(0xFF7C3AED),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          side: BorderSide(
            color: isDark
                ? AppColors.primaryPurple.withValues(alpha: 0.2)
                : const Color(0xFFEDE9FE),
            width: 1.5,
          ),
        ),
        child: _uploadingPhotos
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: isDark
                      ? AppColors.primaryPurple
                      : const Color(0xFF7C3AED),
                ),
              )
            : Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
      ),
    );
  }

  Widget _directionsButton(BookingDetail booking) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
          backgroundColor: isDark
              ? AppColors.backgroundSurface
              : const Color(0xFF1E293B),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
      ),
    );
  }

  Widget _buildOrderDetailsCard(BookingDetail booking) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.3)
                : Colors.black.withValues(alpha: 0.03),
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
              Icon(
                Icons.receipt_long_outlined,
                size: 20,
                color: isDark ? AppColors.primaryPurple : const Color(0xFF7C3AED),
              ),
              const SizedBox(width: 8),
              Text(
                'Order Details',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : const Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _buildDetailRow('Order ID', '#${booking.orderNumber ?? booking.id}'),
          const SizedBox(height: 14),
          _buildDetailRow('Vehicle', booking.vehicleName ?? 'Booking'),
          const SizedBox(height: 14),
          _buildDetailRow(
            'Status',
            BookingDetail.getStatusLabel(booking.status, services: booking.services),
            valueColor: isDark ? AppColors.primaryPurple : const Color(0xFF2563EB),
          ),
          const SizedBox(height: 14),
          _buildDetailRow(
            'Date',
            DateFormat('dd MMM yyyy').format(DateTime.parse(booking.date)),
          ),
          if (booking.location?.address != null) ...[
            const SizedBox(height: 14),
            _buildDetailRow('Address', booking.location!.address!),
          ],
          if (booking.pickupRequired) ...[
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 92,
                  child: Text(
                    'Photos',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Expanded(child: Align(alignment: Alignment.centerLeft, child: _buildPhotoBadge(booking))),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 92,
          child: Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: valueColor ?? (isDark ? Colors.white : const Color(0xFF111827)),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPhotoBadge(BookingDetail booking, {bool compact = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final required = _requiredPhotoCountForCurrentFlow(booking);
    final completed = booking.prePickupPhotos.length >= required;
    final borderColor = completed
        ? (isDark ? AppColors.success : const Color(0xFF16A34A))
        : (isDark ? AppColors.warning : const Color(0xFFF59E0B));
    final bgColor = completed
        ? (isDark
            ? AppColors.success.withValues(alpha: 0.1)
            : const Color(0xFFBBF7D0))
        : (isDark
            ? AppColors.warning.withValues(alpha: 0.1)
            : const Color(0xFFFEF3C7));
    final textColor = completed
        ? (isDark ? AppColors.success : const Color(0xFF166534))
        : (isDark ? AppColors.warning : const Color(0xFF92400E));

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
        color: bgColor,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            completed ? Icons.check_circle : Icons.warning_amber_rounded,
            size: compact ? 13 : 14,
            color: textColor,
          ),
          const SizedBox(width: 4),
          Text(
            completed
                ? '$required/$required photos'
                : '${booking.prePickupPhotos.length}/$required photos',
            style: TextStyle(
              fontSize: compact ? 10 : 11,
              color: textColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

}

class _NextStatusAction {
  final String status;
  final String label;

  const _NextStatusAction(this.status, this.label);
}
