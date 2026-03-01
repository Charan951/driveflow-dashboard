import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';
import '../../core/env.dart';
import '../../models/booking.dart';
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
  final MapController _mapController = MapController();

  BookingDetail? _booking;
  bool _isLoading = true;
  bool _isSaving = false;
  late TabController _tabController;

  // Live Tracking
  LatLng? _staffLocation;

  // Inspection State
  final List<Map<String, dynamic>> _newParts = [];

  // Service Execution State
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _extraCostReasonController =
      TextEditingController();
  final TextEditingController _extraCostAmountController =
      TextEditingController();

  // Billing State
  final TextEditingController _invoiceNumberController =
      TextEditingController();
  final TextEditingController _partsCostController = TextEditingController();
  final TextEditingController _labourCostController = TextEditingController();
  final TextEditingController _gstController = TextEditingController();
  File? _billFile;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _socketService.addListener(_onSocketUpdate);

    _socketService.on('liveLocation', (data) {
      if (!mounted) return;
      if (data is Map<String, dynamic>) {
        final lat = data['lat'];
        final lng = data['lng'];
        if (lat is num && lng is num) {
          final next = LatLng(lat.toDouble(), lng.toDouble());
          setState(() {
            _staffLocation = next;
          });
          _mapController.move(next, 16.0);
        }
      }
    });
  }

  @override
  void dispose() {
    if (_booking != null) {
      _socketService.leaveRoom('booking_${_booking!.id}');
    }
    _socketService.removeListener(_onSocketUpdate);
    _socketService.off('liveLocation');
    _tabController.dispose();
    _notesController.dispose();
    _extraCostReasonController.dispose();
    _extraCostAmountController.dispose();
    _invoiceNumberController.dispose();
    _partsCostController.dispose();
    _labourCostController.dispose();
    _gstController.dispose();
    super.dispose();
  }

  void _onSocketUpdate() {
    if (_isLoading || _booking == null) {
      return;
    }
    _load(_booking!.id);
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
        setState(() {
          _booking = data;
          _isLoading = false;

          // Sync controllers with loaded data
          _notesController.text = data.serviceExecution?.notes ?? '';
          _invoiceNumberController.text = data.billing?.invoiceNumber ?? '';
          _partsCostController.text =
              data.billing?.partsTotal.toString() ?? '0';
          _labourCostController.text =
              data.billing?.labourCost.toString() ?? '0';
          _gstController.text = data.billing?.gst.toString() ?? '0';
        });
        _socketService.joinRoom('booking_$id');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load order details')),
        );
      }
    }
  }

  Future<String?> _pickAndUploadImage(ImageSource source) async {
    final XFile? photo = await _picker.pickImage(
      source: source,
      imageQuality: 70,
    );
    if (photo == null) {
      return null;
    }

    if (!mounted) {
      return null;
    }
    setState(() => _isSaving = true);
    try {
      final files = await _service.uploadFiles([File(photo.path)]);
      if (files.isNotEmpty) {
        return files.first;
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to upload image')));
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
      imageQuality: 80,
    );
    if (photo != null) {
      setState(() => _billFile = File(photo.path));
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    if (_booking == null) {
      return;
    }
    try {
      await _service.updateBookingStatus(_booking!.id, newStatus);
      await _load(_booking!.id);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Status updated to $newStatus')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update status')),
        );
      }
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

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Order #${_booking!.orderNumber ?? _booking!.id.substring(_booking!.id.length - 6).toUpperCase()}',
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Inspection'),
            Tab(text: 'Service'),
            Tab(text: 'QC'),
            Tab(text: 'Billing'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverview(),
          _buildInspection(),
          _buildService(),
          _buildQC(),
          _buildBilling(),
        ],
      ),
      bottomNavigationBar: _buildStatusControl(),
    );
  }

  Widget _buildOverview() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          const SizedBox(height: 24),
          const Text(
            'Live Tracking',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 8),
          Container(
            height: 300,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter:
                      _staffLocation ??
                      LatLng(
                        _booking!.location?.lat ?? 17.3850,
                        _booking!.location?.lng ?? 78.4867,
                      ),
                  initialZoom: 16,
                ),
                children: [
                  TileLayer(
                    urlTemplate: Env.mapTileUrlTemplate,
                    subdomains: Env.mapTileSubdomains,
                    userAgentPackageName: 'com.speshway.staff',
                  ),
                  if (_staffLocation != null)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _staffLocation!,
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.directions_car,
                            color: Colors.blue,
                            size: 36,
                          ),
                        ),
                      ],
                    ),
                  if (_booking!.location?.lat != null &&
                      _booking!.location?.lng != null)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(
                            _booking!.location!.lat!,
                            _booking!.location!.lng!,
                          ),
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.location_on,
                            color: Colors.red,
                            size: 36,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInspection() {
    final inspection = _booking!.inspection;
    final isCompleted = inspection?.completedAt != null;
    final additionalParts = inspection?.additionalParts ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Additional Parts',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (!isCompleted)
                TextButton.icon(
                  onPressed: _addNewPart,
                  icon: const Icon(Icons.add),
                  label: const Text('Add Part'),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (isCompleted)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green[100]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green),
                  const SizedBox(width: 8),
                  Text(
                    'Inspection Completed at: ${DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.parse(inspection!.completedAt!))}',
                    style: const TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),
          ...additionalParts.map((part) => _buildPartItem(part)),
          ..._newParts.asMap().entries.map(
            (entry) => _buildNewPartItem(entry.key, entry.value),
          ),

          if (!isCompleted &&
              (additionalParts.isNotEmpty || _newParts.isNotEmpty))
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSaving
                          ? null
                          : () => _saveInspection(isFinal: false),
                      child: Text(_isSaving ? 'Saving...' : 'Save Draft'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isSaving
                          ? null
                          : () => _saveInspection(isFinal: true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                      child: Text(
                        _isSaving ? 'Processing...' : 'Confirm Inspection',
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

  void _addNewPart() {
    setState(() {
      _newParts.add({
        'name': '',
        'price': 0.0,
        'quantity': 1,
        'image': null,
        'oldImage': null,
        'approved': false,
        'approvalStatus': 'Pending',
      });
    });
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
            if (part.image != null || part.oldImage != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    if (part.image != null) _buildThumbnail(part.image!, 'New'),
                    const SizedBox(width: 8),
                    if (part.oldImage != null)
                      _buildThumbnail(part.oldImage!, 'Old'),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildNewPartItem(int index, Map<String, dynamic> part) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Colors.blue[50],
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Part Name',
                      isDense: true,
                    ),
                    onChanged: (v) => part['name'] = v,
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 50,
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Qty',
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (v) => part['quantity'] = int.tryParse(v) ?? 1,
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 80,
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Price',
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (v) => part['price'] = double.tryParse(v) ?? 0.0,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red),
                  onPressed: () => setState(() => _newParts.removeAt(index)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildUploadButton(
                  label: 'New Part',
                  url: part['image'],
                  onTap: () async {
                    final url = await _showImageSourceSheet();
                    if (url != null) setState(() => part['image'] = url);
                  },
                ),
                const SizedBox(width: 12),
                _buildUploadButton(
                  label: 'Old Part',
                  url: part['oldImage'],
                  onTap: () async {
                    final url = await _showImageSourceSheet();
                    if (url != null) setState(() => part['oldImage'] = url);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
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
          child: Image.network(url, width: 60, height: 60, fit: BoxFit.cover),
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
    return showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () async {
                final url = await _pickAndUploadImage(ImageSource.camera);
                if (context.mounted) {
                  Navigator.pop(context, url);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () async {
                final url = await _pickAndUploadImage(ImageSource.gallery);
                if (context.mounted) {
                  Navigator.pop(context, url);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveInspection({required bool isFinal}) async {
    if (_booking == null) return;
    setState(() => _isSaving = true);
    try {
      final existingParts = _booking!.inspection?.additionalParts ?? [];
      final List<Map<String, dynamic>> allParts = [
        ...existingParts.map((p) => p.toJson()),
        ..._newParts,
      ];

      final Map<String, dynamic> inspectionData = {'additionalParts': allParts};

      if (isFinal) {
        inspectionData['completedAt'] = DateTime.now().toIso8601String();
      }

      // Create approvals for new parts
      for (var part in _newParts) {
        if (part['name'].isNotEmpty && part['price'] > 0) {
          await _service.createApproval({
            'type': 'PartReplacement',
            'relatedId': _booking!.id,
            'relatedModel': 'Booking',
            'data': {
              'name': part['name'],
              'price': part['price'],
              'quantity': part['quantity'],
              'image': part['image'],
              'oldImage': part['oldImage'],
            },
          });
        }
      }

      await _service.updateBookingDetails(_booking!.id, {
        'inspection': inspectionData,
      });

      setState(() => _newParts.clear());
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
      setState(() => _isSaving = false);
    }
  }

  Widget _buildService() {
    final execution = _booking!.serviceExecution;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoCard(
            title: 'Service Execution',
            icon: Icons.build,
            children: [
              _buildInfoRow(
                'Start Time',
                execution?.jobStartTime != null
                    ? DateFormat(
                        'dd MMM yyyy, hh:mm a',
                      ).format(DateTime.parse(execution!.jobStartTime!))
                    : 'Not Started',
              ),
              _buildInfoRow(
                'End Time',
                execution?.jobEndTime != null
                    ? DateFormat(
                        'dd MMM yyyy, hh:mm a',
                      ).format(DateTime.parse(execution!.jobEndTime!))
                    : 'In Progress',
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text(
            'Service Notes',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _notesController,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Add service notes here...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _updateServiceNotes,
              child: Text(_isSaving ? 'Updating...' : 'Update Notes'),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Service Photos',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 16),
          _buildPhotoSection(
            'Before Service',
            execution?.beforePhotos ?? [],
            'before',
          ),
          const SizedBox(height: 16),
          _buildPhotoSection(
            'During Service',
            execution?.duringPhotos ?? [],
            'during',
          ),
          const SizedBox(height: 16),
          _buildPhotoSection(
            'After Service',
            execution?.afterPhotos ?? [],
            'after',
          ),
          const SizedBox(height: 24),
          const Text(
            'Request Extra Cost',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: TextField(
                  controller: _extraCostReasonController,
                  decoration: const InputDecoration(
                    hintText: 'Reason',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _extraCostAmountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'Amount',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _requestExtraCost,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
              ),
              child: const Text('Request Approval'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoSection(String title, List<String> photos, String type) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 100,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              ...photos.map(
                (url) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      url,
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
              InkWell(
                onTap: () => _uploadServicePhoto(type),
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.grey[50],
                  ),
                  child: const Icon(Icons.add_a_photo, color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _updateServiceNotes() async {
    if (_booking == null) return;
    setState(() => _isSaving = true);
    try {
      await _service.updateBookingDetails(_booking!.id, {
        'notes': _notesController.text,
      });
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Notes updated')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to update notes')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _uploadServicePhoto(String type) async {
    final url = await _showImageSourceSheet();
    if (url == null || _booking == null) {
      return;
    }

    setState(() => _isSaving = true);
    try {
      final currentExecution = _booking!.serviceExecution;
      final key = '${type}Photos';
      final List<String> currentPhotos = [];
      if (type == 'before') {
        currentPhotos.addAll(currentExecution?.beforePhotos ?? []);
      }
      if (type == 'during') {
        currentPhotos.addAll(currentExecution?.duringPhotos ?? []);
      }
      if (type == 'after') {
        currentPhotos.addAll(currentExecution?.afterPhotos ?? []);
      }

      currentPhotos.add(url);

      await _service.updateBookingDetails(_booking!.id, {
        'serviceExecution': {
          if (currentExecution != null) ...{
            'jobStartTime': currentExecution.jobStartTime,
            'jobEndTime': currentExecution.jobEndTime,
            'beforePhotos': currentExecution.beforePhotos,
            'duringPhotos': currentExecution.duringPhotos,
            'afterPhotos': currentExecution.afterPhotos,
          },
          key: currentPhotos,
        },
      });
      await _load(_booking!.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update photos')),
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

  Widget _buildQC() {
    final qc = _booking!.qc;
    final isCompleted = qc?.completedAt != null;

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
            qc?.testRide ?? false,
            (v) => _updateQC('testRide', v),
          ),
          _buildQCCheckbox(
            'Safety Checks',
            qc?.safetyChecks ?? false,
            (v) => _updateQC('safetyChecks', v),
          ),
          _buildQCCheckbox(
            'No Leaks',
            qc?.noLeaks ?? false,
            (v) => _updateQC('noLeaks', v),
          ),
          _buildQCCheckbox(
            'No Error Lights',
            qc?.noErrorLights ?? false,
            (v) => _updateQC('noErrorLights', v),
          ),
          const SizedBox(height: 16),
          if (isCompleted)
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
                onPressed: _isSaving ? null : _confirmQC,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
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
      title: Text(label),
      value: value,
      onChanged: isCompleted ? null : (v) => onChanged(v ?? false),
    );
  }

  Future<void> _updateQC(String field, bool value) async {
    if (_booking == null) {
      return;
    }
    try {
      final currentQC = _booking!.qc;
      await _service.updateBookingDetails(_booking!.id, {
        'qc': {
          'testRide': field == 'testRide'
              ? value
              : (currentQC?.testRide ?? false),
          'safetyChecks': field == 'safetyChecks'
              ? value
              : (currentQC?.safetyChecks ?? false),
          'noLeaks': field == 'noLeaks' ? value : (currentQC?.noLeaks ?? false),
          'noErrorLights': field == 'noErrorLights'
              ? value
              : (currentQC?.noErrorLights ?? false),
        },
      });
      await _load(_booking!.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to update QC')));
      }
    }
  }

  Future<void> _confirmQC() async {
    if (_booking == null) return;
    setState(() => _isSaving = true);
    try {
      final qc = _booking!.qc;
      await _service.updateBookingDetails(_booking!.id, {
        'qc': {
          'testRide': qc?.testRide ?? false,
          'safetyChecks': qc?.safetyChecks ?? false,
          'noLeaks': qc?.noLeaks ?? false,
          'noErrorLights': qc?.noErrorLights ?? false,
          'completedAt': DateTime.now().toIso8601String(),
        },
      });
      await _load(_booking!.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to confirm QC')));
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
                          ? 'File Selected: ${_billFile!.path.split('/').last}'
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
                backgroundColor: Colors.deepPurple,
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please complete inspection first')),
        );
      }
      return;
    }
    if (!(_booking!.qc?.completedAt != null)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please complete QC first')),
        );
      }
      return;
    }
    if (_billFile == null && _booking!.billing?.fileUrl == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please upload invoice file')),
        );
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
      });

      // Move to SERVICE_COMPLETED
      await _service.updateBookingStatus(_booking!.id, 'SERVICE_COMPLETED');

      // Set end time if not set
      if (_booking!.serviceExecution?.jobEndTime == null) {
        await _service.updateBookingDetails(_booking!.id, {
          'serviceExecution': {
            ...(_booking!.serviceExecution != null
                ? {
                    'jobStartTime': _booking!.serviceExecution!.jobStartTime,
                    'beforePhotos': _booking!.serviceExecution!.beforePhotos,
                    'duringPhotos': _booking!.serviceExecution!.duringPhotos,
                    'afterPhotos': _booking!.serviceExecution!.afterPhotos,
                  }
                : {}),
            'jobEndTime': DateTime.now().toIso8601String(),
          },
        });
      }

      await _load(_booking!.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bill submitted and service completed')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to submit bill')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildStatusControl() {
    // Logic for status transitions
    List<String> nextStatuses = [];
    switch (_booking!.status) {
      case 'REACHED_MERCHANT':
        nextStatuses = ['VEHICLE_AT_MERCHANT'];
        break;
      case 'VEHICLE_AT_MERCHANT':
        nextStatuses = ['JOB_CARD'];
        break;
      case 'JOB_CARD':
        nextStatuses = ['SERVICE_STARTED'];
        break;
      case 'SERVICE_STARTED':
        nextStatuses = ['SERVICE_COMPLETED'];
        break;
    }

    if (nextStatuses.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        children: nextStatuses.map((status) {
          return Expanded(
            child: ElevatedButton(
              onPressed: () => _updateStatus(status),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.deepPurple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text('Move to ${status.replaceAll('_', ' ')}'),
            ),
          );
        }).toList(),
      ),
    );
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
                Icon(icon, size: 20, color: Colors.deepPurple),
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
}
