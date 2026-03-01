import 'package:flutter/material.dart';
import '../../models/booking.dart';
import '../../services/booking_service.dart';
import '../../services/socket_service.dart';

class MerchantOrdersPage extends StatefulWidget {
  const MerchantOrdersPage({super.key});

  @override
  State<MerchantOrdersPage> createState() => _MerchantOrdersPageState();
}

class _MerchantOrdersPageState extends State<MerchantOrdersPage> {
  final BookingService _service = BookingService();
  final SocketService _socketService = SocketService();
  List<BookingSummary> _bookings = [];
  bool _isLoading = true;
  String _filter = 'active';

  @override
  void initState() {
    super.initState();
    _load();
    _socketService.addListener(_onSocketUpdate);
  }

  @override
  void dispose() {
    _socketService.removeListener(_onSocketUpdate);
    super.dispose();
  }

  void _onSocketUpdate() {
    if (_isLoading) return;
    _load();
  }

  Future<void> _load() async {
    // Only show full loading if we have no bookings yet
    final shouldShowFullLoading = _bookings.isEmpty;

    if (shouldShowFullLoading) {
      if (mounted) setState(() => _isLoading = true);
    }

    try {
      final data = await _service.getMyBookings();
      if (mounted) {
        setState(() {
          _bookings = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to load orders')));
      }
    }
  }

  List<BookingSummary> get _filteredBookings {
    final activeStatuses = [
      'CREATED',
      'ASSIGNED',
      'ACCEPTED',
      'REACHED_CUSTOMER',
      'VEHICLE_PICKED',
      'REACHED_MERCHANT',
      'VEHICLE_AT_MERCHANT',
      'JOB_CARD',
      'SERVICE_STARTED',
      'SERVICE_COMPLETED',
      'OUT_FOR_DELIVERY',
    ];

    if (_filter == 'active') {
      return _bookings.where((b) => activeStatuses.contains(b.status)).toList();
    } else if (_filter == 'completed') {
      return _bookings.where((b) => b.status == 'DELIVERED').toList();
    }
    return _bookings;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Service Orders'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _FilterChip(
                  label: 'Active',
                  selected: _filter == 'active',
                  onSelected: (v) => setState(() => _filter = 'active'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Completed',
                  selected: _filter == 'completed',
                  onSelected: (v) => setState(() => _filter = 'completed'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'All',
                  selected: _filter == 'all',
                  onSelected: (v) => setState(() => _filter = 'all'),
                ),
              ],
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _filteredBookings.isEmpty
            ? const Center(child: Text('No orders found'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _filteredBookings.length,
                itemBuilder: (context, index) {
                  final booking = _filteredBookings[index];
                  return _OrderCard(
                    booking: booking,
                    onTap: () {
                      Navigator.of(context).pushNamed(
                        '/merchant-order-detail',
                        arguments: booking.id,
                      );
                    },
                  );
                },
              ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      selectedColor: Colors.deepPurple.withValues(alpha: 0.2),
      checkmarkColor: Colors.deepPurple,
      labelStyle: TextStyle(
        color: selected ? Colors.deepPurple : Colors.black87,
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final BookingSummary booking;
  final VoidCallback onTap;

  const _OrderCard({required this.booking, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Order #${booking.orderNumber ?? booking.id.substring(booking.id.length - 6).toUpperCase()}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  _StatusBadge(status: booking.status),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(
                    Icons.directions_car_filled_outlined,
                    size: 18,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      booking.vehicleName ?? 'Unknown Vehicle',
                      style: const TextStyle(fontSize: 15),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 18,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    booking.date != null
                        ? DateTime.parse(
                            booking.date!,
                          ).toLocal().toString().split(' ')[0]
                        : 'N/A',
                    style: const TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color = Colors.grey;
    switch (status) {
      case 'CREATED':
      case 'ASSIGNED':
        color = Colors.blue;
        break;
      case 'ACCEPTED':
      case 'REACHED_CUSTOMER':
      case 'VEHICLE_PICKED':
        color = Colors.orange;
        break;
      case 'REACHED_MERCHANT':
      case 'VEHICLE_AT_MERCHANT':
      case 'JOB_CARD':
      case 'SERVICE_STARTED':
        color = Colors.deepPurple;
        break;
      case 'SERVICE_COMPLETED':
        color = Colors.indigo;
        break;
      case 'OUT_FOR_DELIVERY':
        color = Colors.teal;
        break;
      case 'DELIVERED':
      case 'COMPLETED':
        color = Colors.green;
        break;
      case 'CANCELLED':
        color = Colors.red;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
