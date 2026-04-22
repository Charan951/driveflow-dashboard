import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../models/booking.dart';
import '../../core/storage.dart';
import '../../services/booking_service.dart';
import '../../services/socket_service.dart';

class MerchantOrderDetailPage extends StatefulWidget {
  const MerchantOrderDetailPage({super.key});

  @override
  State<MerchantOrderDetailPage> createState() =>
      _MerchantOrderDetailPageState();
}

class _MerchantOrderDetailPageState extends State<MerchantOrderDetailPage>
    with SingleTickerProviderStateMixin {
  final BookingService _service = BookingService();
  final SocketService _socketService = SocketService();
  final ImagePicker _picker = ImagePicker();

  BookingDetail? _booking;
  bool _isLoading = true;
  bool _isSaving = false;
  TabController? _tabController;

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
    super.dispose();
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
      final data = await _service.getBookingById(id);
      if (mounted) {
        // If payment is completed, go back to home page for merchant
        if (data.paymentStatus == 'paid' &&
            (data.status == 'SERVICE_COMPLETED' ||
                data.status == 'CAR_WASH_COMPLETED' ||
                data.status == 'COMPLETED' ||
                data.status == 'DELIVERED')) {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment completed. Returning to home.'),
            ),
          );
          return;
        }

        setState(() {
          _booking = data;
          _isLoading = false;

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

        final int desiredLength = isCarWash ? 1 : (isBattery ? 2 : 5);
        if (_tabController == null || _tabController!.length != desiredLength) {
          _tabController?.dispose();
          _tabController = TabController(length: desiredLength, vsync: this);

          // Initial tab selection
          if (!isCarWash && !isBattery) {
            if (data.qc?.completedAt != null) {
              _tabController!.index = 4; // Billing
            } else if (data.inspection?.completedAt != null) {
              _tabController!.index = 2; // Service
            } else if (data.status == 'SERVICE_STARTED') {
              _tabController!.index = 1; // Inspection
            }
          }
        } else {
          // Auto-switch tabs on status updates
          if (!isCarWash && !isBattery) {
            // Check if status changed to SERVICE_STARTED
            if (data.status == 'SERVICE_STARTED' &&
                _booking?.status != 'SERVICE_STARTED') {
              _tabController!.index = 1; // Inspection
            }
            // New condition: After service data is saved, go to QC CHECK
            if (data.inspection?.completedAt != null &&
                data.serviceExecution != null &&
                data.qc?.completedAt == null &&
                _tabController!.index != 3) {
              // Ensure we are not already on QC CHECK
              _tabController!.index = 3; // QC CHECK
            }
            // Also check for QC completion -> Billing
            if (data.qc?.completedAt != null &&
                _booking?.qc?.completedAt == null) {
              _tabController!.index = 4; // Billing
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
        _showChatDialog();
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
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_booking == null) {
      return const Scaffold(body: Center(child: Text('Order not found')));
    }

    final bool isBattery = _booking!.batteryTire?.isBatteryTireService == true;
    final bool isCarWash = _booking!.carWash?.isCarWashService == true;

    final String orderNum =
        _booking!.orderNumber?.toString() ??
        _booking!.id.substring(_booking!.id.length - 6).toUpperCase();

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
                  ).format(DateTime.parse(_booking!.date)),
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(width: 8),
                const Text(
                  '•',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(width: 8),
                Text(
                  _booking!.status.replaceAll('_', ' '),
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
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: TabBar(
                    controller: _tabController!,
                    isScrollable: !isCarWash && !isBattery,
                    indicator: BoxDecoration(
                      color: const Color(0xFF7C3AED),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF7C3AED).withValues(alpha: 0.2),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    labelColor: Colors.white,
                    unselectedLabelColor: const Color(0xFF6B7280),
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
                    tabs: isCarWash
                        ? const [Tab(text: 'OVERVIEW')]
                        : (isBattery
                              ? const [
                                  Tab(text: 'OVERVIEW'),
                                  Tab(text: 'WARRANTY'),
                                ]
                              : [
                                  const Tab(text: 'OVERVIEW'),
                                  const Tab(text: 'INSPECTION'),
                                  Tab(
                                    child: Opacity(
                                      opacity:
                                          _booking?.inspectionCompletedAt !=
                                              null
                                          ? 1.0
                                          : 0.5,
                                      child: const Text('SERVICE'),
                                    ),
                                  ),
                                  Tab(
                                    child: Opacity(
                                      opacity:
                                          _booking?.inspectionCompletedAt !=
                                              null
                                          ? 1.0
                                          : 0.5,
                                      child: const Text('QC CHECK'),
                                    ),
                                  ),
                                  Tab(
                                    child: Opacity(
                                      opacity: _booking?.qcCompletedAt != null
                                          ? 1.0
                                          : 0.5,
                                      child: const Text('BILLING'),
                                    ),
                                  ),
                                ]),
                    onTap: (index) {
                      if (isCarWash || isBattery) return;
                      if (index >= 2 && index <= 3) {
                        if (_booking?.inspectionCompletedAt == null) {
                          _tabController!.index = _tabController!.previousIndex;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please complete inspection first'),
                            ),
                          );
                        }
                      } else if (index == 4) {
                        if (_booking?.qcCompletedAt == null) {
                          _tabController!.index = _tabController!.previousIndex;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please complete QC check first'),
                            ),
                          );
                        }
                      }
                    },
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController!,
                    children: isCarWash
                        ? [_buildOverview()]
                        : (isBattery
                              ? [_buildOverview(), _buildWarranty()]
                              : [
                                  _buildOverview(),
                                  _buildInspection(),
                                  _buildServiceExecution(),
                                  _buildQC(),
                                  _buildBilling(),
                                ]),
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

    return FloatingActionButton(
      onPressed: _showChatDialog,
      backgroundColor: const Color(0xFF7C3AED),
      child: const Icon(Icons.chat_bubble_outline, color: Colors.white),
    );
  }

  Widget _buildOverview() {
    final bool isBattery = _booking!.batteryTire?.isBatteryTireService == true;
    final bool isCarWash = _booking!.carWash?.isCarWashService == true;

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
                    const Icon(
                      Icons.show_chart,
                      size: 20,
                      color: Color(0xFF7C3AED),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Status & Workflow',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
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
                                  BookingDetail.getStatusLabel(status),
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
          ),
          const SizedBox(height: 24),

          if (_booking!.revisit?.isRevisit == true)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red[100]!),
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
                            color: Colors.red[700],
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
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange[100]!),
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
                            color: Colors.orange[700],
                            fontSize: 12,
                          ),
                        ),
                        if (_booking!.delay?.note != null &&
                            _booking!.delay!.note!.isNotEmpty)
                          Text(
                            _booking!.delay!.note!,
                            style: TextStyle(
                              color: Colors.orange[600],
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
              _buildInfoRow('Status', _booking!.status),
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
                  style: const TextStyle(fontSize: 14, color: Colors.black87),
                ),
              ],
            ),
          _buildInfoCard(
            title: 'Location',
            icon: Icons.location_on,
            children: [
              Text(
                _booking!.location?.address ?? 'No address provided',
                style: const TextStyle(fontSize: 14, color: Colors.black87),
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
    final additionalParts = inspection?.additionalParts ?? [];

    final canAddParts =
        _booking!.status == 'VEHICLE_AT_MERCHANT' ||
        _booking!.status == 'INSPECTION_COMPLETED' ||
        _booking!.status == 'SERVICE_STARTED' ||
        _booking!.status == 'SERVICE_COMPLETED';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header matching frontend
          Container(
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
                    const Icon(
                      Icons.warning_amber_rounded,
                      size: 20,
                      color: Color(0xFFD97706),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Vehicle Inspection',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
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
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.check_circle,
                              size: 14,
                              color: Color(0xFF166534),
                            ),
                            SizedBox(width: 4),
                            Text(
                              'Confirmed',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF166534),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                const Text(
                  'Damage Report / Findings',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF374151),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _damageReportController,
                  maxLines: 4,
                  enabled: !isCompleted,
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText:
                        'Describe any damages or findings from the initial inspection...',
                    hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                    filled: isCompleted,
                    fillColor: isCompleted
                        ? const Color(0xFFF9FAFB)
                        : Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Vehicle Photos (4 Sides Required)',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF374151),
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
                            side: const BorderSide(color: Color(0xFFE5E7EB)),
                          ),
                          child: Text(
                            _isSaving ? 'Saving...' : 'Save Draft',
                            style: const TextStyle(
                              color: Color(0xFF374151),
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

          const SizedBox(height: 24),

          // Additional Parts Section
          if (canAddParts) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Additional Parts',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                if (!isCompleted)
                  TextButton.icon(
                    onPressed: _addNewPart,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text(
                      'Add Part',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF7C3AED),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (additionalParts.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFE5E7EB),
                    style: BorderStyle.solid,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.handyman_outlined,
                      color: Colors.grey[400],
                      size: 32,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'No additional parts added',
                      style: TextStyle(color: Colors.grey[500], fontSize: 13),
                    ),
                  ],
                ),
              ),
            ...additionalParts.map((part) => _buildPartItem(part)),
          ],
        ],
      ),
    );
  }

  Future<void> _addNewPart() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) =>
          _AddPartDialog(bookingId: _booking!.id, service: _service),
    );

    if (result == true) {
      await _load(_booking!.id);
    }
  }

  Widget _buildPartItem(AdditionalPart part) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    part.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                Text('Qty: ${part.quantity}'),
                const SizedBox(width: 12),
                Text('₹${part.price}'),
                const SizedBox(width: 8),
                _buildApprovalBadge(part.approvalStatus),
              ],
            ),
            if (part.oldImage != null || part.image != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    if (part.oldImage != null)
                      _buildThumbnail(part.oldImage!, 'Old'),
                    if (part.image != null) ...[
                      const SizedBox(width: 8),
                      _buildThumbnail(part.image!, 'New'),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  // _buildNewPartItem is no longer needed

  Widget _buildSidePhotoSlot(
    String side,
    String? url,
    Function(String) onUpload,
  ) {
    final isCompleted = _booking?.inspection?.completedAt != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          '$side side',
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: Color(0xFF6B7280),
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
                  color: const Color(0xFFE5E7EB),
                  width: 1.5,
                  // Dashing is not natively supported in BoxDecoration, but we can simulate or use a package.
                  // For now, a solid border is fine, matching the card style.
                ),
                borderRadius: BorderRadius.circular(12),
                color: const Color(0xFFF9FAFB),
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
                          color: Colors.grey[400],
                          size: 24,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'UPLOAD ${side.toUpperCase()}',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[500],
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

  Widget _buildApprovalBadge(String? status) {
    Color color = Colors.grey;
    IconData icon = Icons.help_outline;
    if (status == 'Approved') {
      color = Colors.green;
      icon = Icons.check_circle;
    } else if (status == 'Rejected') {
      color = Colors.red;
      icon = Icons.cancel;
    } else {
      color = Colors.orange;
      icon = Icons.access_time;
    }
    return Icon(icon, color: color, size: 20);
  }

  Widget _buildThumbnail(String url, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: CachedNetworkImage(
            imageUrl: url,
            width: 60,
            height: 60,
            fit: BoxFit.cover,
            placeholder: (context, url) =>
                const Center(child: CircularProgressIndicator(strokeWidth: 2)),
            errorWidget: (context, url, error) =>
                const Icon(Icons.broken_image),
          ),
        ),
      ],
    );
  }

  Widget _buildUploadButton({
    required String label,
    String? url,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
          color: Colors.white,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              url != null ? Icons.image : Icons.camera_alt,
              size: 16,
              color: url != null ? Colors.blue : Colors.grey,
            ),
            const SizedBox(width: 8),
            Text(
              url != null ? 'Uploaded' : label,
              style: TextStyle(
                fontSize: 12,
                color: url != null ? Colors.blue : Colors.black87,
              ),
            ),
          ],
        ),
      ),
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

          // 4. Extra Cost Request
          _buildExtraCostSection(isReadOnly),

          const SizedBox(height: 32),

          // 5. Save Button
          if (!isReadOnly)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveServiceData,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFBBF7D0)),
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
              const Text(
                'Approved Inspection Parts',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Color(0xFF166534),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Customer approved these. Send to service and upload after images.',
            style: TextStyle(fontSize: 12, color: Color(0xFF15803D)),
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
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFDCFCE7)),
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
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.image, color: Colors.grey),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          part.name,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Qty: ${part.quantity} • ₹${part.price}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
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
                          ? Colors.grey[200]
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

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Service Parts',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              if (!isReadOnly)
                TextButton.icon(
                  onPressed: _addNewDiscovery,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('New Discovery'),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF7C3AED),
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
                    Icon(Icons.camera_alt, color: Colors.grey[300], size: 48),
                    const SizedBox(height: 8),
                    Text(
                      'No service parts yet',
                      style: TextStyle(color: Colors.grey[400], fontSize: 12),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: part.fromInspection == true
            ? const Color(0xFFF0FDF4)
            : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: part.fromInspection == true
              ? const Color(0xFFDCFCE7)
              : const Color(0xFFE2E8F0),
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
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Qty: ${part.quantity} • ₹${part.price}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
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
                      ? Colors.green[100]
                      : Colors.yellow[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  part.approvalStatus ?? 'Pending',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: part.approvalStatus == 'Approved'
                        ? Colors.green[800]
                        : Colors.yellow[800],
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
                      const Text('Before', style: TextStyle(fontSize: 10)),
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
                      const Text('After', style: TextStyle(fontSize: 10)),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF7C3AED).withValues(alpha: 0.3),
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
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      )
                    : TextField(
                        decoration: const InputDecoration(
                          hintText: 'Part Name',
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
                        style: const TextStyle(fontSize: 12),
                      )
                    : TextField(
                        decoration: const InputDecoration(
                          hintText: 'Price',
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
                        style: const TextStyle(fontSize: 12),
                      )
                    : TextField(
                        decoration: const InputDecoration(
                          hintText: 'Qty',
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
                      const Text('Before', style: TextStyle(fontSize: 10)),
                    ],
                  ),
                ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final XFile? file = await _picker.pickImage(
                      source: ImageSource.camera,
                    );
                    if (file != null) {
                      setState(() => part['image'] = file);
                    }
                  },
                  child: Container(
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey[300]!),
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
                        : const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.camera_alt, color: Colors.grey),
                              Text(
                                'After Image',
                                style: TextStyle(fontSize: 10),
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
    final existingAfter = execution?.afterPhotos ?? [];
    final totalPhotos = existingAfter.length + _newAfterPhotos.length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'After Service Photos',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Text(
                '$totalPhotos/4 Photos',
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
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
                      final XFile? file = await _picker.pickImage(
                        source: ImageSource.camera,
                      );
                      if (file != null) {
                        setState(() => _newAfterPhotos.add(file));
                      }
                    },
                    child: Container(
                      width: 100,
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: const Icon(Icons.add_a_photo, color: Colors.grey),
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
                decoration: const BoxDecoration(
                  color: Colors.black54,
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Request Extra Cost Approval',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextField(
                  controller: _extraCostReasonController,
                  enabled: !isReadOnly,
                  decoration: InputDecoration(
                    hintText: 'Reason',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
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
                  decoration: InputDecoration(
                    hintText: 'Amount',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
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

      // 2. Upload new after photos
      List<String> afterPhotoUrls = [];
      if (_newAfterPhotos.isNotEmpty) {
        afterPhotoUrls = await _service.uploadFiles(_newAfterPhotos);
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

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Quality Check (QC)',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
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
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'QC Completed at: ${DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.parse(qc!.completedAt!))}',
                style: const TextStyle(
                  color: Colors.green,
                  fontWeight: FontWeight.bold,
                ),
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
                      : Colors.grey,
                  foregroundColor: Colors.white,
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
    return CheckboxListTile(
      title: Text(
        label,
        style: TextStyle(color: isCompleted ? Colors.grey : null),
      ),
      value: value,
      onChanged: isCompleted ? null : (v) => onChanged(v ?? false),
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

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Invoice Details',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _invoiceNumberController,
            decoration: const InputDecoration(
              labelText: 'Invoice Number',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _partsCostController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Parts Cost',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: TextField(
                  controller: _labourCostController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Labour Cost',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _gstController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'GST',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Bill / Invoice File',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 8),
          if (isUploaded && _billFile == null)
            Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.file_present, color: Colors.blue),
                      const SizedBox(width: 12),
                      const Expanded(child: Text('Invoice document uploaded')),
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
                    color: Colors.grey[300]!,
                    style: BorderStyle.solid,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.grey[50],
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
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
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
    // Logic for status transitions
    List<String> nextStatuses = [];
    bool isWaitingForPayment = false;
    String? warningMessage;

    final bool isBattery = _booking!.batteryTire?.isBatteryTireService == true;
    final bool isCarWash = _booking!.carWash?.isCarWashService == true;
    final bool isOnHold =
        _booking!.status == 'On Hold' || _booking!.status == 'ON HOLD';

    if (isOnHold) {
      return Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange[100]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.pause_circle_filled, color: Colors.orange),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Order is On Hold: ${_booking!.delay?.reason ?? 'No reason provided'}',
                      style: TextStyle(color: Colors.orange[900], fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _resumeWork,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text('Resume Work'),
              ),
            ),
          ],
        ),
      );
    }

    switch (_booking!.status) {
      case 'VEHICLE_PICKED':
      case 'REACHED_CUSTOMER':
        if (isCarWash) {
          nextStatuses = ['CAR_WASH_STARTED'];
        } else {
          nextStatuses = ['REACHED_MERCHANT'];
        }
        break;
      case 'VEHICLE_AT_MERCHANT':
      case 'REACHED_MERCHANT':
      case 'JOB_CARD':
        if (isCarWash) {
          nextStatuses = ['CAR_WASH_STARTED'];
        } else {
          nextStatuses = ['SERVICE_STARTED'];
        }
        break;
      case 'SERVICE_STARTED':
        if (isBattery) {
          nextStatuses = ['INSTALLATION'];
        } else if (isCarWash) {
          nextStatuses = ['CAR_WASH_COMPLETED'];
        } else {
          // For general service, transition to SERVICE_COMPLETED is handled via Billing
        }
        break;
      case 'CAR_WASH_STARTED':
        nextStatuses = ['CAR_WASH_COMPLETED'];
        break;
      case 'SERVICE_COMPLETED':
      case 'CAR_WASH_COMPLETED':
        if (_booking!.paymentStatus != 'paid') {
          isWaitingForPayment = true;
          warningMessage =
              'Waiting for Customer Payment (₹${_booking!.totalAmount}). Cannot move to Out For Delivery.';
        } else {
          nextStatuses = ['OUT_FOR_DELIVERY'];
        }
        break;
      case 'OUT_FOR_DELIVERY':
        nextStatuses = ['DELIVERED'];
        break;
      case 'INSTALLATION':
        nextStatuses = ['DELIVERY'];
        break;
      case 'DELIVERY':
        nextStatuses = ['COMPLETED'];
        break;
    }

    final bool canMarkDelay = ![
      'COMPLETED',
      'DELIVERED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
      'CANCELLED',
    ].contains(_booking!.status.toUpperCase());

    if (nextStatuses.isEmpty && warningMessage == null && !canMarkDelay) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
          if (warningMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFFEDD5)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline_rounded,
                    color: Color(0xFFC2410C),
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      warningMessage,
                      style: const TextStyle(
                        color: Color(0xFF9A3412),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Row(
            children: [
              if (nextStatuses.isNotEmpty)
                ...nextStatuses.map((status) {
                  return Expanded(
                    child: SizedBox(
                      height: 54,
                      child: ElevatedButton(
                        onPressed: isWaitingForPayment || _isSaving
                            ? null
                            : () => _updateStatus(status),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7C3AED),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: _isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                'Move to ${status == 'SERVICE_STARTED' ? 'JOB CARD' : status.replaceAll('_', ' ')}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                ),
                              ),
                      ),
                    ),
                  );
                }),
              if (canMarkDelay) ...[
                if (nextStatuses.isNotEmpty) const SizedBox(width: 12),
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
                      'Delay',
                      style: TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFFEE2E2)),
                      backgroundColor: const Color(0xFFFEF2F2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (_booking!.status == 'SERVICE_STARTED' && !isBattery && !isCarWash)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.arrow_right_alt,
                    size: 16,
                    color: Colors.blue[600],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Go to Billing tab to complete service',
                    style: TextStyle(
                      color: Colors.blue[700],
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
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
                value: selectedReason,
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
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: const Color(0xFF7C3AED)),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildWarranty() {
    final warranty = _booking!.batteryTire?.warranty;
    if (warranty?.name != null && warranty!.name!.isNotEmpty) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.green[200]!),
          ),
          color: Colors.green[50],
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Warranty Information',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      warranty.addedAt ?? '',
                      style: TextStyle(color: Colors.green[700], fontSize: 12),
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
                _kv('Product', warranty.name ?? '-'),
                _kv('Price', '₹${warranty.price ?? 0}'),
                _kv('Warranty', '${warranty.warrantyMonths ?? 0} months'),
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
          const Text(
            'Add Warranty Information',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _warrantyNameController,
            decoration: const InputDecoration(labelText: 'Product Name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _warrantyPriceController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Price (₹)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _warrantyMonthsController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Warranty Months'),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: _isUploading ? null : _pickWarrantyImage,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey[300]!),
                borderRadius: BorderRadius.circular(12),
                color: Colors.grey[50],
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
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(_isSaving ? 'Submitting...' : 'Add Warranty'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: const TextStyle(color: Colors.grey)),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
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

  void _showChatDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: _ChatDialog(
            bookingId: _booking!.id,
            merchantId: _booking!.merchant?.id ?? '',
            merchantName: _booking!.merchant?.name ?? 'Merchant',
            service: _service,
          ),
        ),
      ),
    );
  }
}

class _ChatDialog extends StatefulWidget {
  final String bookingId;
  final String merchantId;
  final String merchantName;
  final BookingService service;

  const _ChatDialog({
    required this.bookingId,
    required this.merchantId,
    required this.merchantName,
    required this.service,
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
    _socketService.emit('getMessages', {'bookingId': widget.bookingId});
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

  void _onSocketUpdate() {
    // Keep for other possible updates if needed, but not for chat messages anymore
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
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: statusColor.withValues(alpha: 0.3)),
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
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  'Amount: ₹$amount',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const Divider(height: 16),
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
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(Icons.support_agent, color: Color(0xFF7C3AED)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Support Chat',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
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
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.chat_bubble_outline,
                        size: 48,
                        color: Colors.grey[300],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No messages yet',
                        style: TextStyle(color: Colors.grey),
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
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey,
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
                                  ? const Color(0xFF7C3AED)
                                  : const Color(0xFFF3F4F6),
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
                            ),
                            child: Text(
                              text,
                              style: TextStyle(
                                color: isMe ? Colors.white : Colors.black87,
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
                              style: const TextStyle(
                                fontSize: 9,
                                color: Colors.grey,
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
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey[200]!)),
          ),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(
                  Icons.add_circle_outline,
                  color: Color(0xFF7C3AED),
                ),
                onPressed: _showAddPartDialog,
              ),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: 'Type a message...',
                      border: InputBorder.none,
                      hintStyle: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: const BoxDecoration(
                  color: Color(0xFF7C3AED),
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
