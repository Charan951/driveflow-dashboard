import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../core/app_colors.dart';
import '../../models/booking.dart';
import '../../core/storage.dart';
import '../../services/booking_service.dart';
import '../../services/socket_service.dart';
import '../../services/vehicle_service.dart';

class MerchantOrderDetailPage extends StatefulWidget {
  const MerchantOrderDetailPage({super.key});

  @override
  State<MerchantOrderDetailPage> createState() =>
      _MerchantOrderDetailPageState();
}

class _MerchantOrderDetailPageState extends State<MerchantOrderDetailPage>
    with SingleTickerProviderStateMixin {
  final BookingService _service = BookingService();
  final VehicleService _vehicleService = VehicleService();
  final SocketService _socketService = SocketService();
  final ImagePicker _picker = ImagePicker();

  BookingDetail? _booking;
  bool _isLoading = true;
  bool _isSaving = false;
  TabController? _tabController;
  bool _serviceStartedLocally = false;

  // Inspection State
  String? _frontPhoto;
  String? _backPhoto;
  String? _leftPhoto;
  String? _rightPhoto;
  final TextEditingController _damageReportController = TextEditingController();

  // Service Execution State
  final TextEditingController _extraCostReasonController =
      TextEditingController();
  final TextEditingController _extraCostAmountController =
      TextEditingController();
  final List<Map<String, dynamic>> _newServiceParts = [];
  final List<String> _sentInspectionPartIds = [];
  final List<XFile> _newAfterPhotos = [];

  // Billing State
  final TextEditingController _invoiceNumberController =
      TextEditingController();
  final TextEditingController _partsCostController = TextEditingController();
  final TextEditingController _labourCostController = TextEditingController();
  final TextEditingController _gstController = TextEditingController();
  XFile? _billFile;

  // QC State
  bool _testRideChecked = false;
  bool _safetyChecksChecked = false;
  bool _noLeaksChecked = false;
  bool _noErrorLightsChecked = false;

  // Warranty State (Battery/Tire)
  final TextEditingController _warrantyNameController = TextEditingController();
  final TextEditingController _warrantyPriceController =
      TextEditingController();
  final TextEditingController _warrantyMonthsController =
      TextEditingController();
  String? _warrantyImage;
  bool _isUploading = false;
  final Map<String, _HealthDraft> _healthDraft = {};
  int _unreadChatCount = 0;
  bool _isChatOpen = false;

  @override
  void initState() {
    super.initState();
    _socketService.addListener(_onSocketUpdate);
    _socketService.on('receiveMessage', _handleIncomingChatForBadge);
  }

  @override
  void dispose() {
    if (_booking != null) {
      _socketService.leaveRoom('booking_${_booking!.id}');
    }
    _socketService.removeListener(_onSocketUpdate);
    _tabController?.dispose();
    _extraCostReasonController.dispose();
    _extraCostAmountController.dispose();
    _invoiceNumberController.dispose();
    _partsCostController.dispose();
    _labourCostController.dispose();
    _gstController.dispose();
    _warrantyNameController.dispose();
    _warrantyPriceController.dispose();
    _warrantyMonthsController.dispose();
    _socketService.off('receiveMessage', _handleIncomingChatForBadge);
    super.dispose();
  }

  void _handleIncomingChatForBadge(dynamic data) {
    if (!mounted || _booking == null || _isChatOpen) return;
    if (data == null || data is! Map) return;
    final bookingId = data['bookingId']?.toString();
    if (bookingId != _booking!.id) return;
    setState(() => _unreadChatCount += 1);
  }

  void _onSocketUpdate() {
    final event = _socketService.value;
    if (event == null) return;

    if (event.startsWith('booking_updated') ||
        event.startsWith('booking_cancelled') ||
        event.startsWith('notification')) {
      if (_isLoading || _booking == null) {
        return;
      }
      _load(_booking!.id);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is String && _booking == null) {
      _load(args);
    }
  }

  Future<void> _load(String id) async {
    // Only show full loading if we don't have a booking yet
    if (_booking == null) {
      if (mounted) {
        setState(() => _isLoading = true);
      }
    }

    try {
      final previousBooking = _booking;
      final data = await _service.getBookingById(id);
      if (mounted) {
        // Auto-return only when payment completion happens while this page is open.
        final shouldAutoReturnToPrevious =
            _booking != null &&
            !_isPaidAndCompleted(_booking!) &&
            _isPaidAndCompleted(data);

        if (shouldAutoReturnToPrevious) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment completed. Returning to home.')),
          );
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/merchant-dashboard',
            (route) => false,
          );
          return;
        }

        setState(() {
          _booking = data;
          _isLoading = false;
          _syncHealthDraft(data);
          if (data.status.trim().toUpperCase() == 'SERVICE_STARTED') {
            _serviceStartedLocally = true;
          }

          // Sync inspection data
          _frontPhoto = data.inspection?.frontPhoto;
          _backPhoto = data.inspection?.backPhoto;
          _leftPhoto = data.inspection?.leftPhoto;
          _rightPhoto = data.inspection?.rightPhoto;
          _damageReportController.text = data.inspection?.damageReport ?? '';

          // Sync controllers with loaded data
          _invoiceNumberController.text = data.billing?.invoiceNumber ?? '';
          _partsCostController.text =
              data.billing?.partsTotal.toString() ?? '0';
          _labourCostController.text =
              data.billing?.labourCost.toString() ?? '0';
          _gstController.text = data.billing?.gst.toString() ?? '0';

          // Sync QC checklist
          _testRideChecked = data.qc?.testRide ?? false;
          _safetyChecksChecked = data.qc?.safetyChecks ?? false;
          _noLeaksChecked = data.qc?.noLeaks ?? false;
          _noErrorLightsChecked = data.qc?.noErrorLights ?? false;

          // Sync warranty fields
          _warrantyNameController.text = data.batteryTire?.warranty?.name ?? '';
          _warrantyPriceController.text =
              data.batteryTire?.warranty?.price?.toString() ?? '';
          _warrantyMonthsController.text =
              data.batteryTire?.warranty?.warrantyMonths?.toString() ?? '';
          _warrantyImage = data.batteryTire?.warranty?.image;

          // Sync sent inspection parts
          _sentInspectionPartIds.clear();
          if (data.serviceExecution?.serviceParts != null) {
            _sentInspectionPartIds.addAll(
              data.serviceExecution!.serviceParts
                  .where((part) => part.fromInspection == true)
                  .map((part) => part.inspectionPartId ?? '')
                  .where((id) => id.isNotEmpty),
            );
          }
        });
        final bool isBattery =
            _booking?.batteryTire?.isBatteryTireService == true;
        final bool isCarWash = _booking?.carWash?.isCarWashService == true;
        final bool hasApprovedParts = _hasApprovedParts(data);
        final bool showFullTabs = !isBattery && (!isCarWash || hasApprovedParts);

        final int desiredLength = isBattery ? 2 : (showFullTabs ? 6 : 1);
        final int maxUnlockedIndex = _maxUnlockedTabIndex(data);

        if (_tabController == null || _tabController!.length != desiredLength) {
          _tabController?.dispose();
          _tabController = TabController(length: desiredLength, vsync: this);
          if (showFullTabs) {
            _tabController!.index = maxUnlockedIndex;
          }
        } else {
          if (showFullTabs) {
            final hadInspectionCompleted =
                previousBooking?.inspection?.completedAt != null;
            final hasInspectionCompleted = data.inspection?.completedAt != null;
            final hadServiceSaved =
                previousBooking != null && _hasServiceDataSaved(previousBooking);
            final hasServiceSaved = _hasServiceDataSaved(data);
            final hadQcCompleted = previousBooking?.qc?.completedAt != null;
            final hasQcCompleted = data.qc?.completedAt != null;

            if (!hadInspectionCompleted && hasInspectionCompleted) {
              _tabController!.index = 2; // Service
            } else if (!hadServiceSaved && hasServiceSaved && !hasQcCompleted) {
              _tabController!.index = 3; // QC CHECK
            } else if (!hadQcCompleted && hasQcCompleted) {
              _tabController!.index = 4; // Health after final confirmation
            } else if (_tabController!.index > maxUnlockedIndex) {
              _tabController!.index = maxUnlockedIndex;
            }
          }
        }
        _socketService.joinRoom('booking_$id');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Failed to load order details')),
          );
        }
      }
    }
  }

  bool _isPaidAndCompleted(BookingDetail booking) {
    return booking.paymentStatus == 'paid' &&
        (booking.status == 'SERVICE_COMPLETED' ||
            booking.status == 'CAR_WASH_COMPLETED' ||
            booking.status == 'COMPLETED' ||
            booking.status == 'DELIVERED');
  }

  bool _hasApprovedParts(BookingDetail booking) {
    final parts = booking.inspection?.additionalParts ?? const <AdditionalPart>[];
    return parts.any(
      (p) => p.approved || p.approvalStatus?.toLowerCase() == 'approved',
    );
  }

  bool _hasServiceDataSaved(BookingDetail booking) {
    final execution = booking.serviceExecution;
    if (execution == null) return false;
    return execution.afterPhotos.isNotEmpty ||
        execution.serviceParts.isNotEmpty ||
        (execution.jobEndTime != null && execution.jobEndTime!.isNotEmpty);
  }

  int _maxUnlockedTabIndex(BookingDetail booking) {
    if (booking.qc?.completedAt != null) return 5;
    if (_hasServiceDataSaved(booking)) return 3; // Unlock QC
    if (booking.inspection?.completedAt != null) return 2; // Unlock Service
    final normalizedStatus = booking.status.trim().toUpperCase();
    if (_serviceStartedLocally || normalizedStatus == 'SERVICE_STARTED') {
      return 1; // Unlock Inspection
    }
    return 0; // Only Overview
  }

  void _syncHealthDraft(BookingDetail booking) {
    const keys = ['generalService', 'brakePads', 'tires', 'battery', 'wiperBlade'];
    _healthDraft.clear();
    for (final key in keys) {
      final data = booking.vehicleHealthIndicators?[key];
      final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
      _healthDraft[key] = _HealthDraft(
        value: (map['value'] is num) ? (map['value'] as num).toDouble() : 0,
        fixedKm: (map['fixedKm'] is num) ? (map['fixedKm'] as num).toInt() : 0,
        fixedDays: (map['fixedDays'] is num) ? (map['fixedDays'] as num).toInt() : 0,
        lastUpdated: map['lastUpdated']?.toString(),
      );
    }
  }

  Future<void> _saveHealthIndicators() async {
    if (_booking == null || (_booking!.vehicleId ?? '').isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vehicle not found for this booking')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final nowIso = DateTime.now().toIso8601String();
      final payload = <String, dynamic>{};
      _healthDraft.forEach((key, draft) {
        payload[key] = {
          'value': draft.value.round().clamp(0, 100),
          'fixedKm': draft.fixedKm,
          'fixedDays': draft.fixedDays,
          'lastUpdated': draft.lastUpdated ?? nowIso,
        };
      });

      await _vehicleService.updateVehicleHealth(_booking!.vehicleId!, payload);
      await _load(_booking!.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehicle health updated')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update vehicle health')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<String?> _pickAndUploadImage(ImageSource source) async {
    final XFile? photo = await _picker.pickImage(
      source: source,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 50,
    );
    if (photo == null) {
      return null;
    }

    if (!mounted) {
      return null;
    }
    setState(() => _isSaving = true);
    try {
      final files = await _service.uploadFiles([photo]);
      if (files.isNotEmpty) {
        return files.first;
      }
    } catch (e) {
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Failed to upload image')),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
    return null;
  }

  Future<XFile?> _pickImageFileSafely(ImageSource source) async {
    try {
      return await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 55,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to open image picker. Please try Gallery.'),
          ),
        );
      }
      return null;
    }
  }

  Future<void> _pickBillFile() async {
    final XFile? photo = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 50,
    );
    if (photo != null) {
      setState(() => _billFile = photo);
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    if (_booking == null) {
      return;
    }

    // Validation
    if (newStatus == 'SERVICE_COMPLETED') {
      if (!(_booking!.inspection?.completedAt != null)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please complete inspection first')),
        );
        return;
      }
      if (!(_booking!.qc?.completedAt != null)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please complete QC first')),
        );
        return;
      }
      if (_booking!.billing?.fileUrl == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please upload invoice in Billing tab')),
        );
        return;
      }
    }

    if (newStatus == 'OUT_FOR_DELIVERY') {
      if (_booking!.paymentStatus != 'paid') {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Waiting for customer payment')),
        );
        return;
      }
    }

    setState(() => _isSaving = true);
    try {
      await _service.updateBookingStatus(_booking!.id, newStatus);

      // specific logic for SERVICE_STARTED to set start time and send parts to chat
      if (newStatus == 'SERVICE_STARTED' &&
          _booking!.serviceExecution?.jobStartTime == null) {
        await _service.updateBookingDetails(_booking!.id, {
          'serviceExecution': {
            'jobStartTime': DateTime.now().toIso8601String(),
          },
        });

        // Send additional parts to chat
        final inspectionParts = _booking!.inspection?.additionalParts ?? [];
        if (inspectionParts.isNotEmpty) {
          final partsMessage = inspectionParts
              .where((part) => part.approvalStatus == 'Approved')
              .map(
                (part) =>
                    '${part.name} (Qty: ${part.quantity}, Price: ₹${part.price})',
              )
              .join(', ');
          if (partsMessage.isNotEmpty) {
            _socketService.emit('chat_message', {
              'bookingId': _booking!.id,
              'senderId':
                  _booking!.merchant?.id, // Assuming merchant is the sender
              'senderType': 'merchant',
              'message':
                  'Service started. Approved additional parts: $partsMessage',
              'type': 'system',
            });
          }
        }

        // Open chat automatically when service is started
        _showChatDialog(openEmpty: true);
      }

      // Set jobEndTime when moving to SERVICE_COMPLETED
      if (newStatus == 'SERVICE_COMPLETED' &&
          _booking!.serviceExecution?.jobEndTime == null) {
        await _service.updateBookingDetails(_booking!.id, {
          'serviceExecution': {'jobEndTime': DateTime.now().toIso8601String()},
        });
      }

      await _load(_booking!.id);
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            SnackBar(content: Text('Status updated to $newStatus')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Failed to update status')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_booking == null) {
      return Scaffold(
        backgroundColor: isDark ? AppColors.backgroundPrimary : Colors.white,
        body: const Center(child: Text('Order not found')),
      );
    }

    final bool isBattery = _booking!.batteryTire?.isBatteryTireService == true;
    final bool isCarWash = _booking!.carWash?.isCarWashService == true;
    final bool hasApprovedParts = _hasApprovedParts(_booking!);
    final bool showFullTabs = !isBattery && (!isCarWash || hasApprovedParts);
    final int maxUnlockedIndex = showFullTabs ? _maxUnlockedTabIndex(_booking!) : 0;

    final String orderNum =
        _booking!.orderNumber?.toString() ??
        _booking!.id.substring(_booking!.id.length - 6).toUpperCase();

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
                  ).format(DateTime.parse(_booking!.date)),
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
                    _booking!.status,
                    services: _booking?.services,
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
      body: _tabController == null
          ? const SizedBox.shrink()
          : Column(
              children: [
                _buildStatusControl(),
                Container(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.backgroundSecondary
                        : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: TabBar(
                    controller: _tabController!,
                    isScrollable: showFullTabs,
                    padding: EdgeInsets.zero,
                    tabAlignment: showFullTabs
                        ? TabAlignment.start
                        : TabAlignment.fill,
                    indicator: BoxDecoration(
                      color: isDark
                          ? AppColors.primaryPurple
                          : const Color(0xFF7C3AED),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color:
                              (isDark
                                      ? AppColors.primaryPurple
                                      : const Color(0xFF7C3AED))
                                  .withValues(alpha: 0.2),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    labelColor: Colors.white,
                    unselectedLabelColor: isDark
                        ? Colors.grey[400]
                        : const Color(0xFF6B7280),
                    labelStyle: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                    unselectedLabelStyle: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    tabs: isBattery
                        ? const [Tab(text: 'OVERVIEW'), Tab(text: 'WARRANTY')]
                        : (showFullTabs
                              ? [
                                  const Tab(text: 'OVERVIEW'),
                                  const Tab(text: 'INSPECTION'),
                                  Tab(
                                    child: Opacity(
                                      opacity:
                                          maxUnlockedIndex >= 2
                                          ? 1.0
                                          : 0.5,
                                      child: const Text('SERVICE'),
                                    ),
                                  ),
                                  Tab(
                                    child: Opacity(
                                      opacity:
                                          maxUnlockedIndex >= 3
                                          ? 1.0
                                          : 0.5,
                                      child: const Text('QC CHECK'),
                                    ),
                                  ),
                                  Tab(
                                    child: Opacity(
                                      opacity: maxUnlockedIndex >= 4 ? 1.0 : 0.5,
                                      child: const Text('HEALTH'),
                                    ),
                                  ),
                                  Tab(
                                    child: Opacity(
                                      opacity: maxUnlockedIndex >= 5 ? 1.0 : 0.5,
                                      child: const Text('BILLING'),
                                    ),
                                  ),
                                ]
                              : const [Tab(text: 'OVERVIEW')]),
                    onTap: (index) {
                      if (!showFullTabs) return;
                      if (index > maxUnlockedIndex) {
                        _tabController!.index = _tabController!.previousIndex
                            .clamp(0, maxUnlockedIndex)
                            .toInt();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              maxUnlockedIndex == 0
                                  ? 'Start service to unlock Inspection tab.'
                                  : maxUnlockedIndex == 1
                                  ? 'Confirm inspection to unlock Service tab.'
                                  : maxUnlockedIndex == 2
                                  ? 'Save service data to unlock QC Check tab.'
                                  : 'Confirm QC to unlock remaining tabs.',
                            ),
                          ),
                        );
                        return;
                      }
                    },
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController!,
                    physics: const NeverScrollableScrollPhysics(),
                    children: isBattery
                        ? [_buildOverview(), _buildWarranty()]
                        : (showFullTabs
                              ? [
                                  _buildOverview(),
                                  _buildInspection(),
                                  _buildServiceExecution(),
                                  _buildQC(),
                                  _buildHealth(),
                                  _buildBilling(),
                                ]
                              : [_buildOverview()]),
                  ),
                ),
              ],
            ),
      floatingActionButton: _buildChatButton(),
    );
  }

  Widget _buildChatButton() {
    final bool isChatEnabled = [
      'SERVICE_STARTED',
      'CAR_WASH_STARTED',
      'INSTALLATION',
      'ON HOLD',
      'On Hold',
    ].contains(_booking?.status.toUpperCase());

    if (!isChatEnabled) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        FloatingActionButton(
          heroTag: null,
          onPressed: _showChatDialog,
          backgroundColor: isDark
              ? AppColors.primaryPurple
              : const Color(0xFF7C3AED),
          child: const Icon(Icons.chat_bubble_outline, color: Colors.white),
        ),
        if (_unreadChatCount > 0)
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                borderRadius: BorderRadius.all(Radius.circular(999)),
              ),
              constraints: const BoxConstraints(minWidth: 18),
              child: Text(
                _unreadChatCount > 99 ? '99+' : '$_unreadChatCount',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHealth() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final health = _booking?.vehicleHealthIndicators;

    final indicators = [
      _HealthIndicatorMeta(
        keyName: 'generalService',
        label: 'General Service (Oil and Filter)',
        icon: Icons.build_circle_outlined,
      ),
      _HealthIndicatorMeta(
        keyName: 'brakePads',
        label: 'Brake Pads',
        icon: Icons.car_repair_outlined,
      ),
      _HealthIndicatorMeta(
        keyName: 'tires',
        label: 'Tire Condition',
        icon: Icons.tire_repair_outlined,
      ),
      _HealthIndicatorMeta(
        keyName: 'battery',
        label: 'Battery Health',
        icon: Icons.battery_charging_full_rounded,
      ),
      _HealthIndicatorMeta(
        keyName: 'wiperBlade',
        label: 'Wiper Blade',
        icon: Icons.opacity_outlined,
      ),
    ];

    if (health == null || health.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? AppColors.backgroundSecondary : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
              ),
            ),
            child: Text(
              'No health indicators available for this vehicle.',
              style: TextStyle(
                color: isDark ? Colors.grey[300] : const Color(0xFF6B7280),
                fontSize: 14,
              ),
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isDark ? AppColors.backgroundSecondary : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.health_and_safety_outlined,
                    color: isDark ? AppColors.primaryPurple : const Color(0xFF7C3AED),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Vehicle Health Indicators',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF111827),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ...indicators.map((meta) {
                final data = health[meta.keyName];
                final map = data is Map ? Map<String, dynamic>.from(data) : <String, dynamic>{};
                final draft =
                    _healthDraft[meta.keyName] ??
                    _HealthDraft(
                      value: (map['value'] is num)
                          ? (map['value'] as num).toDouble()
                          : 0,
                      fixedKm: (map['fixedKm'] is num) ? (map['fixedKm'] as num).toInt() : 0,
                      fixedDays: (map['fixedDays'] is num) ? (map['fixedDays'] as num).toInt() : 0,
                      lastUpdated: map['lastUpdated']?.toString(),
                    );
                _healthDraft[meta.keyName] = draft;

                final normalized = (draft.value.clamp(0, 100)) / 100;
                final valueColor = draft.value > 80
                    ? AppColors.error
                    : draft.value > 50
                    ? AppColors.warning
                    : AppColors.success;

                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.backgroundSurface : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(meta.icon, size: 20, color: valueColor),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              meta.label,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : const Color(0xFF111827),
                              ),
                            ),
                          ),
                          Text(
                            '${draft.value.toStringAsFixed(0)}%',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: valueColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: normalized,
                          minHeight: 7,
                          backgroundColor: isDark
                              ? Colors.white.withValues(alpha: 0.08)
                              : const Color(0xFFE5E7EB),
                          valueColor: AlwaysStoppedAnimation<Color>(valueColor),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: draft.fixedKm.toString(),
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                              decoration: const InputDecoration(
                                labelText: 'Fixed KM',
                                isDense: true,
                              ),
                              onChanged: (v) {
                                _healthDraft[meta.keyName] = draft.copyWith(
                                  fixedKm: int.tryParse(v) ?? 0,
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              initialValue: draft.fixedDays.toString(),
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                              decoration: const InputDecoration(
                                labelText: 'Fixed Days',
                                isDense: true,
                              ),
                              onChanged: (v) {
                                _healthDraft[meta.keyName] = draft.copyWith(
                                  fixedDays: int.tryParse(v) ?? 0,
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 14,
                        runSpacing: 6,
                        children: [
                          Text(
                            'Fixed KM: ${draft.fixedKm}',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                            ),
                          ),
                          Text(
                            'Fixed Days: ${draft.fixedDays}',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                            ),
                          ),
                          Text(
                            'Updated: ${_formatHealthDate(draft.lastUpdated)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveHealthIndicators,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isDark
                        ? AppColors.primaryPurple
                        : const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                  ),
                  child: Text(_isSaving ? 'Saving...' : 'Save Health Stats'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatHealthDate(String? raw) {
    if (raw == null || raw.isEmpty) return 'Never';
    final dt = DateTime.tryParse(raw);
    if (dt == null) return 'Never';
    final d = dt.toLocal();
    final day = d.day.toString().padLeft(2, '0');
    final month = d.month.toString().padLeft(2, '0');
    final year = d.year.toString();
    return '$day/$month/$year';
  }

  Widget _buildOverview() {
    final bool isBattery = _booking!.batteryTire?.isBatteryTireService == true;
    final bool isCarWash = _booking!.carWash?.isCarWashService == true;
    final isDark = Theme.of(context).brightness == Brightness.dark;

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

    final int currentIndex = flow.indexOf(_booking!.status.toUpperCase());

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status & Workflow Timeline
          Container(
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
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
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
                              ? Colors.grey[400]
                              : const Color(0xFF6B7280),
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
                                            ? (isDark
                                                  ? AppColors.primaryPurple
                                                  : const Color(0xFF7C3AED))
                                            : (isDark
                                                  ? AppColors.backgroundSurface
                                                  : const Color(0xFFF3F4F6))),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isActive
                                        ? (isDark
                                                  ? AppColors.primaryPurple
                                                  : const Color(0xFF7C3AED))
                                              .withValues(alpha: 0.2)
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
                                        ? (isDark
                                              ? Colors.white
                                              : const Color(0xFF111827))
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
                                  : (isDark
                                        ? AppColors.borderColor
                                        : const Color(0xFFE5E7EB)),
                            ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          if (_booking!.revisit?.isRevisit == true)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.red.withValues(alpha: 0.1)
                    : Colors.red[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.red.withValues(alpha: 0.2)
                      : Colors.red[100]!,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.red),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Revisit Order',
                          style: TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          _booking!.revisit?.reason ?? 'No reason provided',
                          style: TextStyle(
                            color: isDark ? Colors.red[300] : Colors.red[700],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          if (_booking!.delay?.isDelayed == true)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.orange.withValues(alpha: 0.1)
                    : Colors.orange[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.orange.withValues(alpha: 0.2)
                      : Colors.orange[100]!,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.pause_circle_filled, color: Colors.orange),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Order On Hold',
                          style: TextStyle(
                            color: Colors.orange,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          _booking!.delay?.reason ?? 'No reason provided',
                          style: TextStyle(
                            color: isDark
                                ? Colors.orange[300]
                                : Colors.orange[700],
                            fontSize: 12,
                          ),
                        ),
                        if (_booking!.delay?.note != null &&
                            _booking!.delay!.note!.isNotEmpty)
                          Text(
                            _booking!.delay!.note!,
                            style: TextStyle(
                              color: isDark
                                  ? Colors.orange[200]
                                  : Colors.orange[600],
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          _buildInfoCard(
            title: 'Vehicle Details',
            icon: Icons.directions_car,
            children: [
              _buildInfoRow('Vehicle', _booking!.vehicleName ?? 'N/A'),
              _buildInfoRow(
                'Status',
                BookingDetail.getStatusLabel(
                  _booking!.status,
                  services: _booking?.services,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoCard(
            title: 'Customer Details',
            icon: Icons.person,
            children: [
              _buildInfoRow('Name', _booking!.user?.name ?? 'Guest'),
              _buildInfoRow('Phone', _booking!.user?.phone ?? 'N/A'),
            ],
          ),
          if (_booking!.notes != null && _booking!.notes!.isNotEmpty)
            _buildInfoCard(
              title: 'Customer Notes',
              icon: Icons.note,
              children: [
                Text(
                  _booking!.notes!,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.grey[300] : Colors.black87,
                  ),
                ),
              ],
            ),
          _buildInfoCard(
            title: 'Location',
            icon: Icons.location_on,
            children: [
              Text(
                _booking!.location?.address ?? 'No address provided',
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey[300] : Colors.black87,
                ),
              ),
              if (_booking!.location?.lat != null &&
                  _booking!.location?.lng != null) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final lat = _booking!.location!.lat!;
                      final lng = _booking!.location!.lng!;
                      final uri = Uri.parse("google.navigation:q=$lat,$lng");
                      launchUrl(uri, mode: LaunchMode.externalApplication);
                    },
                    icon: const Icon(Icons.directions),
                    label: const Text('Get Directions'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[700],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInspection() {
    final inspection = _booking!.inspection;
    final isCompleted = inspection?.completedAt != null;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header matching frontend
          Container(
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
                    const Icon(
                      Icons.warning_amber_rounded,
                      size: 20,
                      color: Color(0xFFD97706),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Vehicle Inspection',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    const Spacer(),
                    if (isCompleted)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFF166534).withValues(alpha: 0.2)
                              : const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle,
                              size: 14,
                              color: Color(0xFF166534),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Confirmed',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isDark
                                    ? Colors.green[300]
                                    : const Color(0xFF166534),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'Damage Report / Findings',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.grey[300] : const Color(0xFF374151),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _damageReportController,
                  maxLines: 4,
                  enabled: !isCompleted,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                  decoration: InputDecoration(
                    hintText:
                        'Describe any damages or findings from the initial inspection...',
                    hintStyle: TextStyle(
                      color: isDark ? Colors.grey[600] : Colors.grey[400],
                      fontSize: 13,
                    ),
                    filled: true,
                    fillColor: isCompleted
                        ? (isDark
                              ? AppColors.backgroundSurface
                              : const Color(0xFFF9FAFB))
                        : (isDark ? AppColors.backgroundSurface : Colors.white),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? AppColors.borderColor
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? AppColors.borderColor
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                    disabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? AppColors.borderColor
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Vehicle Photos (4 Sides Required)',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.grey[300] : const Color(0xFF374151),
                  ),
                ),
                const SizedBox(height: 12),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.3,
                  children: [
                    _buildSidePhotoSlot(
                      'Front',
                      _frontPhoto,
                      (url) => setState(() => _frontPhoto = url),
                    ),
                    _buildSidePhotoSlot(
                      'Back',
                      _backPhoto,
                      (url) => setState(() => _backPhoto = url),
                    ),
                    _buildSidePhotoSlot(
                      'Left',
                      _leftPhoto,
                      (url) => setState(() => _leftPhoto = url),
                    ),
                    _buildSidePhotoSlot(
                      'Right',
                      _rightPhoto,
                      (url) => setState(() => _rightPhoto = url),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (!isCompleted)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isSaving
                              ? null
                              : () => _saveInspection(isFinal: false),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            side: BorderSide(
                              color: isDark
                                  ? Colors.white.withValues(alpha: 0.2)
                                  : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: Text(
                            _isSaving ? 'Saving...' : 'Save Draft',
                            style: TextStyle(
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF374151),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _isSaving
                              ? null
                              : () => _saveInspection(isFinal: true),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF16A34A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text(
                            _isSaving ? 'Processing...' : 'Confirm Inspection',
                            style: const TextStyle(fontWeight: FontWeight.w600),
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
  }

  Widget _buildSidePhotoSlot(
    String side,
    String? url,
    Function(String) onUpload,
  ) {
    final isCompleted = _booking?.inspection?.completedAt != null;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          '$side side',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.grey[400] : const Color(0xFF6B7280),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 6),
        Expanded(
          child: InkWell(
            onTap: isCompleted
                ? null
                : () async {
                    final newUrl = await _showImageSourceSheet();
                    if (newUrl != null) onUpload(newUrl);
                  },
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                border: Border.all(
                  color: isDark
                      ? AppColors.borderColor
                      : const Color(0xFFE5E7EB),
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(12),
                color: isDark
                    ? AppColors.backgroundSurface
                    : const Color(0xFFF9FAFB),
              ),
              child: url != null && url.isNotEmpty
                  ? Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: CachedNetworkImage(
                            imageUrl: url,
                            fit: BoxFit.cover,
                          ),
                        ),
                        if (!isCompleted)
                          Positioned(
                            top: 6,
                            right: 6,
                            child: InkWell(
                              onTap: () => onUpload(''),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Color(0xFFEF4444),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.delete_outline,
                                  size: 14,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                      ],
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.cloud_upload_outlined,
                          color: isDark ? Colors.grey[600] : Colors.grey[400],
                          size: 24,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'UPLOAD ${side.toUpperCase()}',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.grey[500] : Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Future<String?> _showImageSourceSheet() async {
    final ImageSource? source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source != null) {
      return _pickAndUploadImage(source);
    }
    return null;
  }

  Future<void> _saveInspection({required bool isFinal}) async {
    if (_booking == null) return;

    if (isFinal) {
      if (_frontPhoto == null ||
          _backPhoto == null ||
          _leftPhoto == null ||
          _rightPhoto == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please upload all 4 sides of photos')),
        );
        return;
      }
    }

    setState(() => _isSaving = true);
    try {
      final existingParts = _booking!.inspection?.additionalParts ?? [];

      final Map<String, dynamic> inspectionData = {
        'additionalParts': existingParts.map((p) => p.toJson()).toList(),
        'frontPhoto': _frontPhoto,
        'backPhoto': _backPhoto,
        'leftPhoto': _leftPhoto,
        'rightPhoto': _rightPhoto,
        'damageReport': _damageReportController.text,
      };

      if (isFinal) {
        inspectionData['completedAt'] = DateTime.now().toIso8601String();
      }

      await _service.updateBookingDetails(_booking!.id, {
        'inspection': inspectionData,
      });

      await _load(_booking!.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isFinal ? 'Inspection completed' : 'Inspection saved as draft',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save inspection')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _requestExtraCost() async {
    if (_booking == null ||
        _extraCostAmountController.text.isEmpty ||
        _extraCostReasonController.text.isEmpty) {
      return;
    }
    setState(() => _isSaving = true);
    try {
      await _service.createApproval({
        'type': 'ExtraCost',
        'relatedId': _booking!.id,
        'relatedModel': 'Booking',
        'data': {
          'amount': double.tryParse(_extraCostAmountController.text) ?? 0.0,
          'reason': _extraCostReasonController.text,
        },
      });
      _extraCostAmountController.clear();
      _extraCostReasonController.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Extra cost approval requested')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to request approval')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildServiceExecution() {
    final execution = _booking!.serviceExecution;
    final status = _booking!.status;
    final isReadOnly =
        status == 'SERVICE_COMPLETED' ||
        status == 'OUT_FOR_DELIVERY' ||
        status == 'DELIVERED' ||
        status == 'COMPLETED' ||
        _booking!.paymentStatus == 'paid';

    final approvedInspectionParts =
        _booking!.inspection?.additionalParts
            .where((part) => part.approvalStatus == 'Approved' || part.approved)
            .toList() ??
        [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Approved Inspection Parts
          if (!isReadOnly && approvedInspectionParts.isNotEmpty)
            _buildApprovedInspectionPartsSection(approvedInspectionParts),

          const SizedBox(height: 24),

          // 2. Service Parts Section
          _buildServicePartsSection(execution, isReadOnly),

          const SizedBox(height: 24),

          // 3. After Service Photos
          _buildAfterServicePhotosSection(execution, isReadOnly),

          const SizedBox(height: 24),

          _buildExtraCostSection(isReadOnly),

          const SizedBox(height: 32),

          // 5. Save Button
          if (!isReadOnly)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveServiceData,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryPurple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(_isSaving ? 'Saving...' : 'Save Service Data'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildApprovedInspectionPartsSection(List<AdditionalPart> parts) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF166534).withValues(alpha: 0.1)
            : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? const Color(0xFF166534).withValues(alpha: 0.3)
              : const Color(0xFFBBF7D0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.check_circle,
                color: Color(0xFF16A34A),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Approved Inspection Parts',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? Colors.green[300] : const Color(0xFF166534),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Customer approved these. Send to service and upload after images.',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.green[200] : const Color(0xFF15803D),
            ),
          ),
          const SizedBox(height: 16),
          ...parts.asMap().entries.map((entry) {
            final index = entry.key;
            final part = entry.value;
            final inspectionPartId = 'inspection_$index';
            final alreadySent = _sentInspectionPartIds.contains(
              inspectionPartId,
            );

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.backgroundSurface : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFFDCFCE7),
                ),
              ),
              child: Row(
                children: [
                  if (part.image != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: CachedNetworkImage(
                        imageUrl: part.image!,
                        width: 50,
                        height: 50,
                        fit: BoxFit.cover,
                      ),
                    )
                  else
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.image,
                        color: isDark ? Colors.grey[600] : Colors.grey,
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          part.name,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                        Text(
                          'Qty: ${part.quantity} • ₹${part.price}',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: alreadySent
                        ? null
                        : () => _sendInspectionPartToService(
                            part,
                            inspectionPartId,
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: alreadySent
                          ? (isDark ? Colors.grey[800] : Colors.grey[200])
                          : Colors.green,
                      foregroundColor: alreadySent ? Colors.grey : Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      alreadySent ? 'Sent' : 'Send',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  void _sendInspectionPartToService(AdditionalPart part, String id) {
    if (_sentInspectionPartIds.contains(id)) return;

    setState(() {
      _newServiceParts.add({
        'name': part.name,
        'price': part.price,
        'quantity': part.quantity,
        'oldImage': part.image,
        'fromInspection': true,
        'inspectionPartId': id,
        'approved': true,
        'approvalStatus': 'Approved',
        'needsNewImage': true,
      });
      _sentInspectionPartIds.add(id);
    });

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('${part.name} sent to service')));
  }

  Widget _buildServicePartsSection(
    ServiceExecutionData? execution,
    bool isReadOnly,
  ) {
    final existingParts = execution?.serviceParts ?? [];
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : const Color(0xFFE5E7EB),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Service Parts',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              if (!isReadOnly)
                TextButton.icon(
                  onPressed: _addNewDiscovery,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('New Discovery'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primaryPurple,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (existingParts.isEmpty && _newServiceParts.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    Icon(
                      Icons.camera_alt,
                      color: isDark ? Colors.grey[800] : Colors.grey[300],
                      size: 48,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'No service parts yet',
                      style: TextStyle(
                        color: isDark ? Colors.grey[600] : Colors.grey[400],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Existing Parts
          ...existingParts.map(
            (part) => _buildExistingServicePartItem(part, isReadOnly),
          ),

          // New Parts
          ..._newServiceParts.asMap().entries.map(
            (entry) => _buildNewServicePartItem(entry.key, entry.value),
          ),
        ],
      ),
    );
  }

  Widget _buildExistingServicePartItem(AdditionalPart part, bool isReadOnly) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: part.fromInspection == true
            ? (isDark
                  ? const Color(0xFF166534).withValues(alpha: 0.1)
                  : const Color(0xFFF0FDF4))
            : (isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : const Color(0xFFF8FAFC)),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: part.fromInspection == true
              ? (isDark
                    ? const Color(0xFF166534).withValues(alpha: 0.3)
                    : const Color(0xFFDCFCE7))
              : (isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : const Color(0xFFE2E8F0)),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      part.name,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    Text(
                      'Qty: ${part.quantity} • ₹${part.price}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    Text(
                      part.fromInspection == true
                          ? '✓ From Inspection'
                          : '⚡ New Discovery',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: part.fromInspection == true
                            ? Colors.green
                            : Colors.blue,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: part.approvalStatus == 'Approved'
                      ? (isDark
                            ? Colors.green[900]?.withValues(alpha: 0.3)
                            : Colors.green[100])
                      : (isDark
                            ? Colors.yellow[900]?.withValues(alpha: 0.3)
                            : Colors.yellow[100]),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  part.approvalStatus ?? 'Pending',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: part.approvalStatus == 'Approved'
                        ? (isDark ? Colors.green[300] : Colors.green[800])
                        : (isDark ? Colors.yellow[300] : Colors.yellow[800]),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (part.oldImage != null)
                Expanded(
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: CachedNetworkImage(
                          imageUrl: part.oldImage!,
                          height: 80,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Text(
                        'Before',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? Colors.grey[400] : Colors.black,
                        ),
                      ),
                    ],
                  ),
                ),
              if (part.oldImage != null) const SizedBox(width: 8),
              if (part.image != null)
                Expanded(
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: CachedNetworkImage(
                          imageUrl: part.image!,
                          height: 80,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Text(
                        'After',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? Colors.grey[400] : Colors.black,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNewServicePartItem(int index, Map<String, dynamic> part) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.borderColor : const Color(0xFFE5E7EB),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: part['fromInspection'] == true
                    ? Text(
                        part['name'],
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black,
                        ),
                      )
                    : TextField(
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Part Name',
                          hintStyle: TextStyle(
                            color: isDark ? Colors.grey[600] : Colors.grey[400],
                          ),
                          isDense: true,
                        ),
                        onChanged: (v) => part['name'] = v,
                        controller: TextEditingController(text: part['name']),
                      ),
              ),
              IconButton(
                onPressed: () {
                  setState(() {
                    if (part['fromInspection'] == true) {
                      _sentInspectionPartIds.remove(part['inspectionPartId']);
                    }
                    _newServiceParts.removeAt(index);
                  });
                },
                icon: const Icon(
                  Icons.delete_outline,
                  color: Colors.red,
                  size: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: part['fromInspection'] == true
                    ? Text(
                        'Price: ₹${part['price']}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.black,
                        ),
                      )
                    : TextField(
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Price',
                          hintStyle: TextStyle(
                            color: isDark ? Colors.grey[600] : Colors.grey[400],
                          ),
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (v) =>
                            part['price'] = double.tryParse(v) ?? 0.0,
                        controller: TextEditingController(
                          text: part['price'].toString(),
                        ),
                      ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: part['fromInspection'] == true
                    ? Text(
                        'Qty: ${part['quantity']}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.black,
                        ),
                      )
                    : TextField(
                        style: TextStyle(
                          color: isDark ? Colors.white : Colors.black,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Qty',
                          hintStyle: TextStyle(
                            color: isDark ? Colors.grey[600] : Colors.grey[400],
                          ),
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (v) =>
                            part['quantity'] = int.tryParse(v) ?? 1,
                        controller: TextEditingController(
                          text: part['quantity'].toString(),
                        ),
                      ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (part['oldImage'] != null)
                Expanded(
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: part['oldImage'] is String
                            ? CachedNetworkImage(
                                imageUrl: part['oldImage'],
                                height: 80,
                                width: double.infinity,
                                fit: BoxFit.cover,
                              )
                            : (part['oldImage'] is XFile
                                  ? (kIsWeb
                                        ? Image.network(
                                            (part['oldImage'] as XFile).path,
                                            height: 80,
                                            width: double.infinity,
                                            fit: BoxFit.cover,
                                          )
                                        : Image.file(
                                            File(
                                              (part['oldImage'] as XFile).path,
                                            ),
                                            height: 80,
                                            width: double.infinity,
                                            fit: BoxFit.cover,
                                          ))
                                  : const SizedBox.shrink()),
                      ),
                      Text(
                        'Before',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? Colors.grey[400] : Colors.black,
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final XFile? file = await _pickImageFileSafely(
                      ImageSource.gallery,
                    );
                    if (file != null) {
                      setState(() => part['image'] = file);
                    }
                  },
                  child: Container(
                    height: 80,
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.05)
                          : Colors.grey[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.grey[300]!,
                      ),
                    ),
                    child: part['image'] != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: kIsWeb
                                ? Image.network(
                                    (part['image'] as XFile).path,
                                    fit: BoxFit.cover,
                                  )
                                : Image.file(
                                    File((part['image'] as XFile).path),
                                    fit: BoxFit.cover,
                                  ),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.camera_alt,
                                color: isDark ? Colors.grey[600] : Colors.grey,
                              ),
                              Text(
                                'After Image',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isDark
                                      ? Colors.grey[600]
                                      : Colors.grey,
                                ),
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
    );
  }

  void _addNewDiscovery() {
    setState(() {
      _newServiceParts.add({
        'name': '',
        'price': 0.0,
        'quantity': 1,
        'approved': false,
        'approvalStatus': 'Pending',
        'addedDuringService': true,
        'fromInspection': false,
      });
    });
  }

  Widget _buildAfterServicePhotosSection(
    ServiceExecutionData? execution,
    bool isReadOnly,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final existingAfter = execution?.afterPhotos ?? [];
    final totalPhotos = existingAfter.length + _newAfterPhotos.length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : const Color(0xFFE5E7EB),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'After Service Photos',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              Text(
                '$totalPhotos/4 Photos',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[600] : Colors.grey[500],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 100,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                ...existingAfter.map((url) => _buildPhotoItem(url)),
                ..._newAfterPhotos.map((file) => _buildFilePhotoItem(file)),
                if (!isReadOnly && totalPhotos < 4)
                  InkWell(
                    onTap: () async {
                      final XFile? file = await _pickImageFileSafely(
                        ImageSource.gallery,
                      );
                      if (file != null) {
                        setState(() => _newAfterPhotos.add(file));
                      }
                    },
                    child: Container(
                      width: 100,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.05)
                            : Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.grey[300]!,
                        ),
                      ),
                      child: Icon(
                        Icons.add_a_photo,
                        color: isDark ? Colors.grey[600] : Colors.grey,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoItem(String url) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: url,
          width: 100,
          height: 100,
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  Widget _buildFilePhotoItem(XFile file) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: kIsWeb
                ? Image.network(
                    file.path,
                    width: 100,
                    height: 100,
                    fit: BoxFit.cover,
                  )
                : Image.file(
                    File(file.path),
                    width: 100,
                    height: 100,
                    fit: BoxFit.cover,
                  ),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: InkWell(
              onTap: () => setState(() => _newAfterPhotos.remove(file)),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.black.withValues(alpha: 0.7)
                      : Colors.black54,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, size: 12, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExtraCostSection(bool isReadOnly) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : const Color(0xFFE5E7EB),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Request Extra Cost Approval',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextField(
                  controller: _extraCostReasonController,
                  enabled: !isReadOnly,
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                  decoration: InputDecoration(
                    hintText: 'Reason',
                    hintStyle: TextStyle(
                      color: isDark ? Colors.grey[600] : Colors.grey[400],
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _extraCostAmountController,
                  enabled: !isReadOnly,
                  keyboardType: TextInputType.number,
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                  decoration: InputDecoration(
                    hintText: 'Amount',
                    hintStyle: TextStyle(
                      color: isDark ? Colors.grey[600] : Colors.grey[400],
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (!isReadOnly)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _requestExtraCost,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Request Approval'),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _saveServiceData() async {
    if (_booking == null) return;

    setState(() => _isSaving = true);
    try {
      // 1. Upload images for new service parts
      final List<Map<String, dynamic>> processedParts = [];
      for (final part in _newServiceParts) {
        String? imageUrl;
        if (part['image'] != null) {
          final uploadedFiles = await _service.uploadFiles([part['image']]);
          if (uploadedFiles.isNotEmpty) {
            imageUrl = uploadedFiles.first;
          }
        }

        processedParts.add({
          'name': part['name'],
          'price': part['price'],
          'quantity': part['quantity'],
          'image': imageUrl,
          'oldImage': part['oldImage'],
          'approved': part['approved'],
          'approvalStatus': part['approvalStatus'],
          'addedDuringService': part['addedDuringService'],
          'fromInspection': part['fromInspection'],
          'inspectionPartId': part['inspectionPartId'],
        });
      }

      // 2. Upload new after photos one-by-one (prevents 413 payload too large)
      List<String> afterPhotoUrls = [];
      if (_newAfterPhotos.isNotEmpty) {
        for (final file in _newAfterPhotos) {
          final uploaded = await _service.uploadFiles([file]);
          if (uploaded.isNotEmpty) {
            afterPhotoUrls.addAll(uploaded);
          }
        }
      }

      final existingExecution = _booking!.serviceExecution;
      final finalAfterPhotos = [
        ...existingExecution?.afterPhotos ?? [],
        ...afterPhotoUrls,
      ];
      final finalServiceParts = [
        ...existingExecution?.serviceParts.map((p) => p.toJson()) ?? [],
        ...processedParts,
      ];

      await _service.updateBookingDetails(_booking!.id, {
        'serviceExecution': {
          if (existingExecution != null) ...{
            'jobStartTime': existingExecution.jobStartTime,
            'jobEndTime': existingExecution.jobEndTime,
            'beforePhotos': existingExecution.beforePhotos,
            'duringPhotos': existingExecution.duringPhotos,
          },
          'afterPhotos': finalAfterPhotos,
          'serviceParts': finalServiceParts,
        },
      });

      // Clear local state
      setState(() {
        _newServiceParts.clear();
        _newAfterPhotos.clear();
      });

      await _load(_booking!.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Service data updated successfully')),
        );
      }
    } catch (e) {
      debugPrint('Save error: $e');
      if (mounted) {
        String msg = 'Failed to save service data';
        if (e.toString().contains('400')) {
          msg = 'Validation error. Please check your inputs.';
        } else if (e.toString().contains('413')) {
          msg = 'Files are too large. Please upload smaller images.';
        }
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildQC() {
    final qc = _booking!.qc;
    final isQCCompleted = qc?.completedAt != null;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quality Check (QC)',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 16),
          _buildQCCheckbox(
            'Test Ride',
            _testRideChecked,
            (v) => setState(() => _testRideChecked = v),
          ),
          _buildQCCheckbox(
            'Safety Checks',
            _safetyChecksChecked,
            (v) => setState(() => _safetyChecksChecked = v),
          ),
          _buildQCCheckbox(
            'No Leaks',
            _noLeaksChecked,
            (v) => setState(() => _noLeaksChecked = v),
          ),
          _buildQCCheckbox(
            'No Error Lights',
            _noErrorLightsChecked,
            (v) => setState(() => _noErrorLightsChecked = v),
          ),
          const SizedBox(height: 16),
          if (isQCCompleted)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.green.withValues(alpha: 0.1)
                    : Colors.green[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isDark
                      ? Colors.green.withValues(alpha: 0.2)
                      : Colors.green[100]!,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'QC Completed at: ${DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.parse(qc!.completedAt!))}',
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed:
                    (_isSaving ||
                        !(_testRideChecked &&
                            _safetyChecksChecked &&
                            _noLeaksChecked &&
                            _noErrorLightsChecked))
                    ? null
                    : _confirmQC,
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      (_testRideChecked &&
                          _safetyChecksChecked &&
                          _noLeaksChecked &&
                          _noErrorLightsChecked)
                      ? Colors.green
                      : (isDark ? Colors.grey[800] : Colors.grey),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Confirm QC Completion'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQCCheckbox(String label, bool value, Function(bool) onChanged) {
    final isCompleted = _booking!.qc?.completedAt != null;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return CheckboxListTile(
      title: Text(
        label,
        style: TextStyle(
          color: isCompleted
              ? (isDark ? Colors.grey[600] : Colors.grey)
              : (isDark ? Colors.white : Colors.black),
        ),
      ),
      value: value,
      onChanged: isCompleted ? null : (v) => onChanged(v ?? false),
      activeColor: AppColors.primaryPurple,
      checkColor: Colors.white,
    );
  }

  Future<void> _confirmQC() async {
    if (_booking == null) return;

    if (!(_testRideChecked &&
        _safetyChecksChecked &&
        _noLeaksChecked &&
        _noErrorLightsChecked)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please complete all QC checks')),
        );
      }
      return;
    }

    setState(() => _isSaving = true);
    try {
      await _service.updateBookingDetails(_booking!.id, {
        'qc': {
          'testRide': _testRideChecked,
          'safetyChecks': _safetyChecksChecked,
          'noLeaks': _noLeaksChecked,
          'noErrorLights': _noErrorLightsChecked,
          'completedAt': DateTime.now().toIso8601String(),
        },
      });
      await _load(_booking!.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('QC completed successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to complete QC')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildBilling() {
    final billing = _booking!.billing;
    final isUploaded = billing?.fileUrl != null;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Invoice Details',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _invoiceNumberController,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
              labelText: 'Invoice Number',
              labelStyle: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[700],
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFFE5E7EB),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _partsCostController,
                  keyboardType: TextInputType.number,
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                  decoration: InputDecoration(
                    labelText: 'Parts Cost',
                    labelStyle: TextStyle(
                      color: isDark ? Colors.grey[400] : Colors.grey[700],
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: TextField(
                  controller: _labourCostController,
                  keyboardType: TextInputType.number,
                  style: TextStyle(color: isDark ? Colors.white : Colors.black),
                  decoration: InputDecoration(
                    labelText: 'Labour Cost',
                    labelStyle: TextStyle(
                      color: isDark ? Colors.grey[400] : Colors.grey[700],
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _gstController,
            keyboardType: TextInputType.number,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
              labelText: 'GST',
              labelStyle: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[700],
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFFE5E7EB),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Bill / Invoice File',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 8),
          if (isUploaded && _billFile == null)
            Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.blue.withValues(alpha: 0.1)
                        : Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDark
                          ? Colors.blue.withValues(alpha: 0.2)
                          : Colors.blue[100]!,
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.file_present, color: Colors.blue),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Invoice document uploaded',
                          style: TextStyle(
                            color: isDark ? Colors.blue[200] : Colors.blue[800],
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => _pickBillFile(),
                        child: const Text('Change'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () => launchUrl(Uri.parse(billing!.fileUrl!)),
                  icon: const Icon(Icons.visibility),
                  label: const Text('View Document'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primaryPurple,
                  ),
                ),
              ],
            )
          else
            InkWell(
              onTap: _pickBillFile,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 32),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : Colors.grey[300]!,
                    style: BorderStyle.solid,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.05)
                      : Colors.grey[50],
                ),
                child: Column(
                  children: [
                    Icon(
                      _billFile != null
                          ? Icons.check_circle
                          : Icons.upload_file,
                      size: 48,
                      color: _billFile != null ? Colors.green : Colors.grey,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _billFile != null
                          ? 'File Selected: ${_billFile!.name}'
                          : 'Tap to select Invoice (Image/PDF)',
                      style: TextStyle(
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _submitBilling,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryPurple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                _isSaving ? 'Submitting...' : 'Submit Bill & Complete Service',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitBilling() async {
    if (_booking == null) return;

    // Validate
    if (!(_booking!.inspection?.completedAt != null)) {
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Please complete inspection first')),
          );
        }
      }
      return;
    }
    if (!(_booking!.qc?.completedAt != null)) {
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Please complete QC first')),
          );
        }
      }
      return;
    }
    if (_billFile == null && _booking!.billing?.fileUrl == null) {
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Please upload invoice file')),
          );
        }
      }
      return;
    }

    setState(() => _isSaving = true);
    try {
      String? fileUrl = _booking!.billing?.fileUrl;
      if (_billFile != null) {
        final uploaded = await _service.uploadFiles([_billFile!]);
        if (uploaded.isNotEmpty) fileUrl = uploaded.first;
      }

      final partsCost = double.tryParse(_partsCostController.text) ?? 0.0;
      final labourCost = double.tryParse(_labourCostController.text) ?? 0.0;
      final gst = double.tryParse(_gstController.text) ?? 0.0;
      final total = partsCost + labourCost + gst;

      await _service.updateBookingDetails(_booking!.id, {
        'billing': {
          'invoiceNumber': _invoiceNumberController.text,
          'invoiceDate': DateTime.now().toIso8601String(),
          'partsTotal': partsCost,
          'labourCost': labourCost,
          'gst': gst,
          'total': total,
          'fileUrl': fileUrl,
        },
        'serviceExecution': {'jobEndTime': DateTime.now().toIso8601String()},
      });

      await _service.updateBookingStatus(_booking!.id, 'SERVICE_COMPLETED');

      await _load(_booking!.id);
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Bill submitted and service completed'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Failed to submit bill')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildStatusControl() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final String status = _booking!.status.toUpperCase();
    final bool isOnHold = status == 'ON HOLD';
    final bool showMoveToServiceStarted =
        status == 'REACHED_MERCHANT' && !_serviceStartedLocally;
    final bool showBillingHint = status == 'SERVICE_STARTED';
    final bool canMarkDelay = ![
      'COMPLETED',
      'DELIVERED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
      'ON HOLD',
      'CANCELLED',
    ].contains(status);

    if (!isOnHold && !showMoveToServiceStarted && !showBillingHint && !canMarkDelay) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.12 : 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isOnHold)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF7C2D12).withValues(alpha: 0.2)
                    : Colors.orange[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFFF59E0B).withValues(alpha: 0.35)
                      : Colors.orange[100]!,
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.pause_circle_filled, color: Colors.orange),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Order is On Hold: ${_booking!.delay?.reason ?? 'No reason provided'}',
                      style: TextStyle(
                        color: isDark ? const Color(0xFFFCD34D) : Colors.orange[900],
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (showBillingHint)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF1E3A8A).withValues(alpha: 0.25)
                    : const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF60A5FA).withValues(alpha: 0.35)
                      : const Color(0xFFBFDBFE),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 18,
                    color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Go to Billing tab to upload bill and complete service.',
                      style: TextStyle(
                        color: isDark ? const Color(0xFFBFDBFE) : const Color(0xFF1D4ED8),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Row(
            children: [
              if (showMoveToServiceStarted)
                Expanded(
                  child: SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isSaving
                          ? null
                          : () async {
                              await _updateStatus('SERVICE_STARTED');
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Start Service',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ),
              if (canMarkDelay) ...[
                if (showMoveToServiceStarted) const SizedBox(width: 12),
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _isSaving ? null : _showDelayDialog,
                    icon: const Icon(
                      Icons.timer_outlined,
                      color: Colors.red,
                      size: 18,
                    ),
                    label: const Text(
                      'Mark Delay / Hold',
                      style: TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFFECACA)),
                      backgroundColor: isDark
                          ? const Color(0xFF7F1D1D).withValues(alpha: 0.25)
                          : const Color(0xFFFEF2F2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
              if (isOnHold) ...[
                if (showMoveToServiceStarted || canMarkDelay) const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _resumeWork,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Resume Work',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _showDelayDialog() async {
    final List<String> reasons = [
      'Waiting for parts',
      'Customer approval pending',
      'Other',
    ];
    String selectedReason = reasons[0];
    final noteController = TextEditingController();

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Mark Order as Delayed'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                items: reasons
                    .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                    .toList(),
                onChanged: (v) => setState(() => selectedReason = v!),
                decoration: const InputDecoration(labelText: 'Reason'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: noteController,
                decoration: const InputDecoration(
                  labelText: 'Notes (Optional)',
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await _markDelay(selectedReason, noteController.text);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
              ),
              child: const Text('Mark Delay'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _markDelay(String reason, String note) async {
    setState(() => _isSaving = true);
    try {
      await _service.updateBookingDetails(_booking!.id, {
        'delay': {
          'isDelayed': true,
          'reason': reason,
          'note': note,
          'startTime': DateTime.now().toIso8601String(),
          'previousStatus': _booking!.status,
        },
      });
      await _service.updateBookingStatus(_booking!.id, 'On Hold');
      await _load(_booking!.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order marked as On Hold')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to mark delay')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _resumeWork() async {
    setState(() => _isSaving = true);
    try {
      final previousStatus =
          _booking!.delay?.previousStatus ?? 'SERVICE_STARTED';
      await _service.updateBookingStatus(_booking!.id, previousStatus);
      // Clear delay info?
      await _service.updateBookingDetails(_booking!.id, {
        'delay': {'isDelayed': false},
      });
      await _load(_booking!.id);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Work resumed')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to resume work')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.backgroundSecondary : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderColor : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                icon,
                size: 20,
                color: isDark
                    ? AppColors.primaryPurple
                    : const Color(0xFF7C3AED),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          Divider(
            height: 24,
            color: isDark ? AppColors.borderColor : Colors.grey[200],
          ),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWarranty() {
    final warranty = _booking!.batteryTire?.warranty;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (warranty?.name != null && warranty!.name!.isNotEmpty) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: isDark
                  ? Colors.green.withValues(alpha: 0.2)
                  : Colors.green[200]!,
            ),
          ),
          color: isDark
              ? Colors.green.withValues(alpha: 0.1)
              : Colors.green[50],
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Warranty Information',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    Text(
                      warranty.addedAt ?? '',
                      style: TextStyle(
                        color: isDark ? Colors.green[300] : Colors.green[700],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (warranty.image != null && warranty.image!.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      warranty.image!,
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                const SizedBox(height: 12),
                _kv('Product', warranty.name ?? '-', isDark),
                _kv('Price', '₹${warranty.price ?? 0}', isDark),
                _kv(
                  'Warranty',
                  '${warranty.warrantyMonths ?? 0} months',
                  isDark,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Add Warranty Information',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _warrantyNameController,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
              labelText: 'Product Name',
              labelStyle: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[700],
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFFE5E7EB),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _warrantyPriceController,
            keyboardType: TextInputType.number,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
              labelText: 'Price (₹)',
              labelStyle: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[700],
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFFE5E7EB),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _warrantyMonthsController,
            keyboardType: TextInputType.number,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
              labelText: 'Warranty Months',
              labelStyle: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[700],
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : const Color(0xFFE5E7EB),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: _isUploading ? null : _pickWarrantyImage,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.grey[300]!,
                ),
                borderRadius: BorderRadius.circular(12),
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.grey[50],
              ),
              child: Column(
                children: [
                  Icon(
                    _warrantyImage != null
                        ? Icons.check_circle
                        : Icons.image_outlined,
                    size: 40,
                    color: _warrantyImage != null ? Colors.green : Colors.grey,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _warrantyImage != null
                        ? 'Image Selected'
                        : 'Tap to upload product image',
                    style: TextStyle(
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving || _isUploading ? null : _submitWarranty,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryPurple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(_isSaving ? 'Submitting...' : 'Add Warranty'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            k,
            style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey),
          ),
          Text(
            v,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickWarrantyImage() async {
    final XFile? photo = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 60,
    );
    if (photo == null) return;
    setState(() => _isUploading = true);
    try {
      final urls = await _service.uploadFiles([photo]);
      if (urls.isNotEmpty) {
        setState(() => _warrantyImage = urls.first);
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _submitWarranty() async {
    if (_booking == null) return;
    if (_warrantyNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter product name')),
      );
      return;
    }
    final price = double.tryParse(_warrantyPriceController.text);
    final months = int.tryParse(_warrantyMonthsController.text);
    if (price == null || price <= 0 || months == null || months <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter valid price and months')),
      );
      return;
    }
    setState(() => _isSaving = true);
    try {
      await _service.addWarranty(
        _booking!.id,
        name: _warrantyNameController.text.trim(),
        price: price,
        warrantyMonths: months,
        image: _warrantyImage,
      );
      await _load(_booking!.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Warranty added successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to add warranty')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showChatDialog({bool openEmpty = false}) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    setState(() {
      _isChatOpen = true;
      _unreadChatCount = 0;
    });
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.backgroundSecondary : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: _ChatDialog(
            bookingId: _booking!.id,
            merchantId: _booking!.merchant?.id ?? '',
            merchantName: _booking!.merchant?.name ?? 'Merchant',
            service: _service,
            openEmpty: openEmpty,
          ),
        ),
      ),
    );
    if (!mounted) return;
    setState(() => _isChatOpen = false);
  }
}

class _ChatDialog extends StatefulWidget {
  final String bookingId;
  final String merchantId;
  final String merchantName;
  final BookingService service;
  final bool openEmpty;

  const _ChatDialog({
    required this.bookingId,
    required this.merchantId,
    required this.merchantName,
    required this.service,
    this.openEmpty = false,
  });

  @override
  State<_ChatDialog> createState() => _ChatDialogState();
}

class _ChatDialogState extends State<_ChatDialog> {
  final SocketService _socketService = SocketService();
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  String? _currentUserId;

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _socketService.on('receiveMessage', _handleReceiveMessage);
    _socketService.on('loadMessages', _handleLoadMessages);
    _socketService.on('newApproval', (data) {
      if (mounted) {
        _socketService.emit('getMessages', {'bookingId': widget.bookingId});
      }
    });
    _socketService.joinRoom('booking_${widget.bookingId}');
    if (widget.openEmpty) {
      _isLoading = false;
    } else {
      _socketService.emit('getMessages', {'bookingId': widget.bookingId});
    }
  }

  Future<void> _loadCurrentUser() async {
    final userJson = await AppStorage().getUserJson();
    if (userJson != null) {
      final user = jsonDecode(userJson);
      if (mounted) {
        setState(() {
          _currentUserId = user['_id'] ?? user['id'];
        });
      }
    }
  }

  @override
  void dispose() {
    _socketService.off('receiveMessage', _handleReceiveMessage);
    _socketService.off('loadMessages', _handleLoadMessages);
    _socketService.off('newApproval');
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleReceiveMessage(dynamic data) {
    if (widget.openEmpty) return;
    if (data == null) return;
    if (data['bookingId'] == widget.bookingId) {
      if (mounted) {
        setState(() {
          // Check if message already exists
          final existingIndex = _messages.indexWhere(
            (m) => m['_id'] == data['_id'],
          );
          if (existingIndex != -1) {
            _messages[existingIndex] = data;
          } else {
            // Check if it's an update for an optimistic message
            final tempIndex = _messages.indexWhere(
              (m) =>
                  m['_id'].toString().startsWith('temp_') &&
                  m['text'] == data['text'] &&
                  (m['sender']?['_id'] == data['sender']?['_id'] ||
                      m['senderId'] == data['sender']?['_id']),
            );

            if (tempIndex != -1) {
              _messages[tempIndex] = data;
            } else {
              _messages.add(data);
            }
          }
        });
        _scrollToBottom();
      }
    }
  }

  void _handleLoadMessages(dynamic data) {
    if (widget.openEmpty) return;
    if (data is List) {
      if (mounted) {
        setState(() {
          _messages.clear();
          _messages.addAll(List<Map<String, dynamic>>.from(data));
          _isLoading = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() {
    if (_controller.text.trim().isEmpty) return;

    final text = _controller.text.trim();

    _socketService.emit('sendMessage', {
      'bookingId': widget.bookingId,
      'text': text,
    });

    // Optimistic update
    if (mounted) {
      setState(() {
        _messages.add({
          '_id': 'temp_${DateTime.now().millisecondsSinceEpoch}',
          'bookingId': widget.bookingId,
          'text': text,
          'sender': {'_id': _currentUserId, 'name': 'You', 'role': 'merchant'},
          'createdAt': DateTime.now().toIso8601String(),
        });
      });
      _scrollToBottom();
    }

    _controller.clear();
  }

  Future<void> _showAddPartDialog() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) =>
          _AddPartDialog(bookingId: widget.bookingId, service: widget.service),
    );

    if (result == true) {
      // Refresh messages or wait for socket?
      // Socket should push the new message automatically.
    }
  }

  Widget _buildApprovalMessage(Map<String, dynamic> msg, bool isMe) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final approval = msg['approval'];
    if (approval == null) return const SizedBox.shrink();

    final status = approval['status'] ?? 'pending';
    final partName = approval['partName'] ?? 'Part';
    final amount = approval['amount'] ?? 0;
    final image = approval['image'];

    Color statusColor = Colors.orange;
    if (status == 'approved') statusColor = Colors.green;
    if (status == 'rejected') statusColor = Colors.red;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: isMe
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Container(
            width: 240,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.backgroundSurface : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : statusColor.withValues(alpha: 0.3),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (image != null && image.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: CachedNetworkImage(
                        imageUrl: image,
                        height: 120,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                Text(
                  partName,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                Text(
                  'Amount: ₹$amount',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                Divider(
                  height: 16,
                  color: isDark ? Colors.white.withValues(alpha: 0.1) : null,
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: statusColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
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
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.grey[200]!,
              ),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color:
                      (isDark
                              ? AppColors.primaryPurple
                              : const Color(0xFF7C3AED))
                          .withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    Icons.support_agent,
                    color: isDark
                        ? AppColors.primaryPurple
                        : const Color(0xFF7C3AED),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Support Chat',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: isDark ? Colors.white : Colors.black,
                      ),
                    ),
                    Text(
                      'Order #${widget.bookingId.substring(widget.bookingId.length - 6).toUpperCase()}',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  Icons.close,
                  color: isDark ? Colors.white : Colors.black,
                ),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: _isLoading
              ? Center(
                  child: CircularProgressIndicator(
                    color: isDark
                        ? AppColors.primaryPurple
                        : const Color(0xFF7C3AED),
                  ),
                )
              : _messages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.chat_bubble_outline,
                        size: 48,
                        color: isDark ? Colors.grey[700] : Colors.grey[300],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No messages yet',
                        style: TextStyle(
                          color: isDark ? Colors.grey[500] : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    final bool isMe =
                        msg['sender']?['_id'] == _currentUserId ||
                        msg['senderId'] == _currentUserId;
                    final String text = msg['text'] ?? '';
                    final String time = msg['createdAt'] != null
                        ? DateFormat(
                            'hh:mm a',
                          ).format(DateTime.parse(msg['createdAt']))
                        : '';
                    final String senderName =
                        msg['sender']?['name'] ?? msg['senderName'] ?? '';

                    if (msg['type'] == 'approval') {
                      return _buildApprovalMessage(msg, isMe);
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: isMe
                            ? CrossAxisAlignment.end
                            : CrossAxisAlignment.start,
                        children: [
                          if (!isMe)
                            Padding(
                              padding: const EdgeInsets.only(
                                left: 4,
                                bottom: 4,
                              ),
                              child: Text(
                                senderName,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isDark
                                      ? Colors.grey[400]
                                      : Colors.grey,
                                ),
                              ),
                            ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: isMe
                                  ? (isDark
                                        ? AppColors.primaryPurple
                                        : const Color(0xFF7C3AED))
                                  : (isDark
                                        ? AppColors.backgroundSurface
                                        : const Color(0xFFF3F4F6)),
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(16),
                                topRight: const Radius.circular(16),
                                bottomLeft: isMe
                                    ? const Radius.circular(16)
                                    : Radius.zero,
                                bottomRight: isMe
                                    ? Radius.zero
                                    : const Radius.circular(16),
                              ),
                              border: isMe || !isDark
                                  ? null
                                  : Border.all(
                                      color: Colors.white.withValues(
                                        alpha: 0.1,
                                      ),
                                    ),
                            ),
                            child: Text(
                              text,
                              style: TextStyle(
                                color: isMe
                                    ? Colors.white
                                    : (isDark ? Colors.white : Colors.black87),
                                fontSize: 14,
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(
                              top: 4,
                              left: 4,
                              right: 4,
                            ),
                            child: Text(
                              time,
                              style: TextStyle(
                                fontSize: 9,
                                color: isDark ? Colors.grey[500] : Colors.grey,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),

        // Input
        Container(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 12,
            bottom: MediaQuery.of(context).padding.bottom + 12,
          ),
          decoration: BoxDecoration(
            color: isDark ? AppColors.backgroundSecondary : Colors.white,
            border: Border(
              top: BorderSide(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.grey[200]!,
              ),
            ),
          ),
          child: Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.add_circle_outline,
                  color: isDark
                      ? AppColors.primaryPurple
                      : const Color(0xFF7C3AED),
                ),
                onPressed: _showAddPartDialog,
              ),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.backgroundSurface
                        : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: TextField(
                    controller: _controller,
                    style: TextStyle(
                      color: isDark ? Colors.white : Colors.black,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: InputBorder.none,
                      hintStyle: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.grey[600] : Colors.grey,
                      ),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.primaryPurple
                      : const Color(0xFF7C3AED),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: const Icon(Icons.send, color: Colors.white, size: 20),
                  onPressed: _sendMessage,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AddPartDialog extends StatefulWidget {
  final String bookingId;
  final BookingService service;

  const _AddPartDialog({required this.bookingId, required this.service});

  @override
  State<_AddPartDialog> createState() => _AddPartDialogState();
}

class _AddPartDialogState extends State<_AddPartDialog> {
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  final _qtyController = TextEditingController(text: '1');
  String? _imageUrl;
  bool _loading = false;
  final _picker = ImagePicker();

  Future<void> _pickImage() async {
    final XFile? photo = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 60,
    );
    if (photo == null) return;
    setState(() => _loading = true);
    try {
      final urls = await widget.service.uploadFiles([photo]);
      if (urls.isNotEmpty) {
        setState(() => _imageUrl = urls.first);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if (_nameController.text.isEmpty || _priceController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await widget.service.createApproval({
        'type': 'PartReplacement',
        'relatedId': widget.bookingId,
        'relatedModel': 'Booking',
        'data': {
          'name': _nameController.text,
          'price': double.tryParse(_priceController.text) ?? 0,
          'quantity': int.tryParse(_qtyController.text) ?? 1,
          'image': _imageUrl,
        },
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send approval request')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Additional Part'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Part Name',
                floatingLabelBehavior: FloatingLabelBehavior.always,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _qtyController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Qty',
                      floatingLabelBehavior: FloatingLabelBehavior.always,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    controller: _priceController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Price (₹)',
                      floatingLabelBehavior: FloatingLabelBehavior.always,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: _loading ? null : _pickImage,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[300]!),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: _imageUrl != null
                    ? Column(
                        children: [
                          const Icon(Icons.check_circle, color: Colors.green),
                          const SizedBox(height: 4),
                          const Text(
                            'Image Selected',
                            style: TextStyle(fontSize: 12),
                          ),
                        ],
                      )
                    : Column(
                        children: [
                          const Icon(Icons.add_a_photo, color: Colors.grey),
                          const SizedBox(height: 4),
                          const Text(
                            'Upload Part Image (Optional)',
                            style: TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _loading ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF7C3AED),
            foregroundColor: Colors.white,
          ),
          child: Text(_loading ? 'Sending...' : 'Send for Approval'),
        ),
      ],
    );
  }
}

class _HealthIndicatorMeta {
  final String keyName;
  final String label;
  final IconData icon;

  const _HealthIndicatorMeta({
    required this.keyName,
    required this.label,
    required this.icon,
  });
}

class _HealthDraft {
  final double value;
  final int fixedKm;
  final int fixedDays;
  final String? lastUpdated;

  const _HealthDraft({
    required this.value,
    required this.fixedKm,
    required this.fixedDays,
    this.lastUpdated,
  });

  _HealthDraft copyWith({
    double? value,
    int? fixedKm,
    int? fixedDays,
    String? lastUpdated,
  }) {
    return _HealthDraft(
      value: value ?? this.value,
      fixedKm: fixedKm ?? this.fixedKm,
      fixedDays: fixedDays ?? this.fixedDays,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}
